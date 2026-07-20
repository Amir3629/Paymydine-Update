(function () {
  'use strict';

  if (window.PMDWaiterV245DirectMerge) return;
  window.PMDWaiterV245DirectMerge = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';
  var STATE_URL = '/admin/pmd-waiter-table-states-v154';

  var state = {
    lifecycle: [],
    map: {},
    mode: '',
    target: null,
    source: null,
    busy: false,
    toastTimer: null
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  async function json(url, options) {
    var opts = options || {};
    opts.credentials = 'same-origin';
    opts.cache = 'no-store';
    opts.headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }, opts.headers || {});

    if (opts.body && typeof opts.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['X-CSRF-TOKEN'] = csrf;
      opts.body = JSON.stringify(opts.body);
    }

    var response = await fetch(url, opts);
    var payload = await response.json().catch(function () { return {}; });

    if (!response.ok || payload.ok === false) {
      var error = new Error(payload.message || payload.error || ('HTTP ' + response.status));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function toast(message, error) {
    var node = document.querySelector('.v245-toast');

    if (!node) {
      node = document.createElement('div');
      node.className = 'v245-toast';
      document.body.appendChild(node);
    }

    node.textContent = message;
    node.classList.toggle('error', !!error);
    node.classList.add('show');

    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      node.classList.remove('show');
    }, 3200);
  }

  async function loadLifecycle() {
    var payload = await json(STATE_URL + '?_=' + Date.now());
    state.lifecycle = Array.isArray(payload.tables) ? payload.tables : [];
    state.map = {};

    state.lifecycle.forEach(function (row) {
      state.map[String(row.table_id)] = row;
      if (row.table_number != null) state.map[String(row.table_number)] = row;
    });
  }

  function cardData(card) {
    var id = clean(card.getAttribute('data-v2-open-table'));
    var number =
      clean(card.getAttribute('data-v21-number')) ||
      clean((card.querySelector('strong') || {}).textContent) ||
      id;

    return state.map[id] || state.map[number] || {
      table_id: id,
      table_number: number,
      latest_order_id: 0,
      open_order_count: 0
    };
  }

  function ensureBar() {
    var bar = document.querySelector('.v245-merge-bar');
    if (bar) return bar;

    bar = document.createElement('div');
    bar.className = 'v245-merge-bar';
    bar.innerHTML =
      '<div>' +
        '<small>DIRECT TABLE MERGE</small>' +
        '<strong data-v245-title>SELECT DESTINATION TABLE</strong>' +
        '<span data-v245-help>The source check will be moved into this table.</span>' +
      '</div>' +
      '<button type="button" aria-label="Cancel">×</button>';

    document.body.appendChild(bar);
    bar.querySelector('button').addEventListener('click', cancel);
    return bar;
  }

  function ensureConfirm() {
    var modal = document.querySelector('.v245-confirm');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'v245-confirm';
    modal.innerHTML =
      '<section class="v245-confirm-dialog">' +
        '<header class="v245-confirm-head">' +
          '<small>DIRECT MERGE</small>' +
          '<h2>Confirm table merge</h2>' +
        '</header>' +
        '<div class="v245-confirm-body">' +
          '<div class="v245-merge-route">' +
            '<div class="v245-merge-table"><small>SOURCE CHECK</small><strong data-v245-source></strong></div>' +
            '<div class="v245-merge-arrow">→</div>' +
            '<div class="v245-merge-table"><small>DESTINATION CHECK</small><strong data-v245-target></strong></div>' +
          '</div>' +
          '<div class="v245-warning">All unpaid items from the source check will be moved into the destination check. This operation is audited and cannot be treated like a visual table grouping.</div>' +
        '</div>' +
        '<footer class="v245-confirm-actions">' +
          '<button type="button" data-v245-cancel>CANCEL</button>' +
          '<button type="button" data-v245-confirm-merge>MERGE CHECKS</button>' +
        '</footer>' +
      '</section>';

    document.body.appendChild(modal);

    modal.querySelector('[data-v245-cancel]').addEventListener('click', function () {
      modal.classList.remove('is-open');
      cancel();
    });

    modal.querySelector('[data-v245-confirm-merge]').addEventListener('click', performMerge);
    return modal;
  }

  function setGuide(title, help) {
    var bar = ensureBar();
    bar.querySelector('[data-v245-title]').textContent = title;
    bar.querySelector('[data-v245-help]').textContent = help;
  }

  function beginMerge() {
    state.mode = 'target';
    state.target = null;
    state.source = null;

    document.querySelectorAll('.v245-merge-target').forEach(function (node) {
      node.classList.remove('v245-merge-target');
    });

    var bar = ensureBar();
    setGuide(
      'SELECT DESTINATION TABLE',
      'Choose the table/check that should remain after the merge.'
    );

    bar.classList.add('is-open');
    document.body.classList.add('v245-merge-selecting');
  }

  function cancel() {
    state.mode = '';
    state.target = null;
    state.source = null;

    var bar = document.querySelector('.v245-merge-bar');
    if (bar) bar.classList.remove('is-open');

    document.body.classList.remove('v245-merge-selecting');

    document.querySelectorAll('.v245-merge-target').forEach(function (node) {
      node.classList.remove('v245-merge-target');
    });

    var controls = document.querySelector('.v243-ops-controls');
    var merge = controls && controls.querySelector('[data-v243-mode="merge"]');
    if (merge) merge.classList.remove('is-active');
  }

  function validOpenCheck(row) {
    return Number(row && row.latest_order_id || 0) > 0 &&
      Number(row && row.open_order_count || 0) > 0;
  }

  function selectCard(card) {
    var row = cardData(card);

    if (!validOpenCheck(row)) {
      toast('THIS TABLE HAS NO ACTIVE CHECK TO MERGE', true);
      return;
    }

    if (state.mode === 'target') {
      state.target = row;
      card.classList.add('v245-merge-target');
      state.mode = 'source';

      setGuide(
        'SELECT SOURCE TABLE',
        'Choose the table/check that will be moved into Table ' + clean(row.table_number) + '.'
      );

      return;
    }

    if (state.mode === 'source') {
      if (String(row.table_id) === String(state.target.table_id)) {
        toast('SOURCE AND DESTINATION MUST BE DIFFERENT TABLES', true);
        return;
      }

      if (Number(row.latest_order_id) === Number(state.target.latest_order_id)) {
        toast('THESE TABLES POINT TO THE SAME CHECK', true);
        return;
      }

      state.source = row;
      showConfirmation();
    }
  }

  function showConfirmation() {
    var modal = ensureConfirm();

    modal.querySelector('[data-v245-source]').textContent =
      'TABLE ' + clean(state.source.table_number) +
      ' · ORDER #' + Number(state.source.latest_order_id);

    modal.querySelector('[data-v245-target]').textContent =
      'TABLE ' + clean(state.target.table_number) +
      ' · ORDER #' + Number(state.target.latest_order_id);

    modal.classList.add('is-open');
  }

  async function performMerge() {
    if (!state.source || !state.target || state.busy) return;

    var button = document.querySelector('[data-v245-confirm-merge]');
    state.busy = true;
    button.disabled = true;
    button.textContent = 'MERGING…';

    try {
      /*
       * Load the destination operation summary first. This provides the
       * expected_updated_at concurrency token required by the V2.2 API.
       */
      var destinationOrderId = Number(state.target.latest_order_id);
      var sourceOrderId = Number(state.source.latest_order_id);

      var summary = await json(
        '/admin/pmd-waiter-pos-v22/operations/' +
        destinationOrderId + '?_=' + Date.now()
      );

      var order = summary.order || {};
      var validSources = Array.isArray(summary.open_checks)
        ? summary.open_checks.map(function (row) { return Number(row.order_id); })
        : [];

      if (validSources.length && validSources.indexOf(sourceOrderId) === -1) {
        throw new Error('The source check is no longer available for merging.');
      }

      var result = await json(
        '/admin/pmd-waiter-pos-v22/operations/' +
        destinationOrderId + '/merge',
        {
          method: 'POST',
          body: {
            source_order_id: sourceOrderId,
            expected_updated_at: order.updated_at || null
          }
        }
      );

      document.querySelector('.v245-confirm').classList.remove('is-open');
      cancel();

      toast(result.message || 'TABLE CHECKS MERGED SUCCESSFULLY');

      window.dispatchEvent(new CustomEvent('pmd:waiter-pos-order-updated', {
        detail: {source: 'v245-direct-merge'}
      }));

      /*
       * A single controlled reload guarantees that launcher counts, physical
       * table lifecycle and order badges are all refreshed together.
       */
      setTimeout(function () {
        window.location.reload();
      }, 900);
    } catch (error) {
      toast(error.message || 'MERGE FAILED', true);
      button.disabled = false;
      button.textContent = 'MERGE CHECKS';
    } finally {
      state.busy = false;
    }
  }

  function interceptMergeButton() {
    var controls = document.querySelector('.v243-ops-controls');
    if (!controls || controls.getAttribute('data-v245-merge-bound') === '1') return;

    var merge = controls.querySelector('[data-v243-mode="merge"]');
    if (!merge) return;

    controls.setAttribute('data-v245-merge-bound', '1');

    /*
     * Capture before V2.4.3 so the old iframe operation flow is not opened.
     */
    merge.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (state.mode) {
        cancel();
      } else {
        merge.classList.add('is-active');
        beginMerge();
      }
    }, true);
  }

  function interceptCardSelection(event) {
    if (!state.mode) return;

    var card = event.target.closest('[data-v2-open-table]');
    if (!card || !root.contains(card)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    selectCard(card);
  }

  async function boot() {
    try {
      await loadLifecycle();
    } catch (error) {
      toast('COULD NOT LOAD TABLE CHECKS FOR MERGE', true);
    }

    interceptMergeButton();
    root.addEventListener('click', interceptCardSelection, true);

    setInterval(interceptMergeButton, 700);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.mode) cancel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  console.info('[PMD] Waiter V2.4.5 direct merge active');
})();
