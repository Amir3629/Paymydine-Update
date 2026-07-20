(function () {
  'use strict';

  if (window.PMDWaiterV242Stability) return;
  window.PMDWaiterV242Stability = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var STATE_URL = '/admin/pmd-waiter-table-states-v154';
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  var rows = [];
  var map = {};
  var loading = false;
  var toastTimer = null;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, options || {}));

    var payload = await response.json().catch(function () { return {}; });

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
    }

    return payload;
  }

  function showToast(message, error) {
    var toast = document.querySelector('.v242-toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'v242-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.toggle('error', !!error);
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2800);
  }

  function cardRow(card) {
    var id = clean(card.getAttribute('data-v2-open-table'));
    return map[id] || null;
  }

  function statusOf(row) {
    return clean(row && row.table_status || 'available').toLowerCase();
  }

  function quickAction(row) {
    var status = statusOf(row);

    if (status === 'occupied') {
      return {
        label: 'CUSTOMER LEFT',
        next: 'cleaning'
      };
    }

    if (status === 'cleaning') {
      return {
        label: 'CLEANING DONE',
        next: 'available'
      };
    }

    if (status === 'reserved') {
      return {
        label: 'GUESTS ARRIVED',
        next: 'occupied'
      };
    }

    return {
      label: 'SEAT GUESTS',
      next: 'occupied'
    };
  }

  function triggerOldDrawer(card) {
    var old = card.querySelector('.v241-status-btn');

    if (old) {
      old.click();
      return;
    }

    showToast('Status options are still loading. Try again.', true);
  }

  async function updateStatus(card, row, next) {
    if (card.classList.contains('v242-updating')) return;

    card.classList.add('v242-updating');

    try {
      await fetchJson(
        STATE_URL + '/' + encodeURIComponent(String(row.table_id)),
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrf
          },
          body: JSON.stringify({
            status: next,
            reason: 'waiter_pos_v242_quick_action'
          })
        }
      );

      showToast('TABLE STATUS UPDATED');
      await loadStates();
      decorateGrid();
    } catch (error) {
      showToast(error.message || 'COULD NOT UPDATE TABLE', true);
    } finally {
      card.classList.remove('v242-updating');
    }
  }

  function addActions(card, row) {
    var actions = card.querySelector('.v242-card-actions');

    if (actions) actions.remove();

    actions = document.createElement('span');
    actions.className = 'v242-card-actions';

    var quick = quickAction(row);

    var quickButton = document.createElement('span');
    quickButton.className = 'v242-action is-primary';
    quickButton.setAttribute('role', 'button');
    quickButton.setAttribute('tabindex', '0');
    quickButton.textContent = quick.label;

    var moreButton = document.createElement('span');
    moreButton.className = 'v242-action';
    moreButton.setAttribute('role', 'button');
    moreButton.setAttribute('tabindex', '0');
    moreButton.textContent = 'MORE';

    function activateQuick(event) {
      event.preventDefault();
      event.stopPropagation();
      updateStatus(card, row, quick.next);
    }

    function activateMore(event) {
      event.preventDefault();
      event.stopPropagation();
      triggerOldDrawer(card);
    }

    quickButton.addEventListener('click', activateQuick);
    moreButton.addEventListener('click', activateMore);

    quickButton.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') activateQuick(event);
    });

    moreButton.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') activateMore(event);
    });

    actions.appendChild(quickButton);
    actions.appendChild(moreButton);
    card.appendChild(actions);
  }

  function decorateCard(card) {
    var row = cardRow(card);

    if (!row) {
      /*
       * Do not leave a legitimate table permanently invisible if lifecycle
       * data is momentarily missing.
       */
      card.classList.add('v242-ready');
      return;
    }

    /*
     * V2.4.1 usually applies the lifecycle presentation first. When the core
     * replaces a card, V2.4.2 waits one animation frame and then adds its
     * explicit controls before revealing the card.
     */
    if (!card.classList.contains('v241-card')) {
      card.removeAttribute('data-v241-signature');
    }

    addActions(card, row);
    card.classList.add('v242-ready');
  }

  function decorateGrid() {
    var grid = root.querySelector('[data-v2-table-grid]');
    if (!grid) return;

    Array.prototype.slice.call(
      grid.querySelectorAll(':scope > [data-v2-open-table]')
    ).forEach(decorateCard);
  }

  function observeGrid() {
    var grid = root.querySelector('[data-v2-table-grid]');
    if (!grid || grid.getAttribute('data-v242-observed') === '1') return;

    grid.setAttribute('data-v242-observed', '1');

    /*
     * Observe only direct grid children. Changes inside a decorated card do
     * not retrigger this observer, so there is no recursive DOM loop.
     */
    var observer = new MutationObserver(function (mutations) {
      var added = [];

      mutations.forEach(function (mutation) {
        Array.prototype.slice.call(mutation.addedNodes).forEach(function (node) {
          if (
            node &&
            node.nodeType === 1 &&
            node.matches &&
            node.matches('[data-v2-open-table]')
          ) {
            added.push(node);
          }
        });
      });

      if (!added.length) return;

      requestAnimationFrame(function () {
        added.forEach(decorateCard);
      });
    });

    observer.observe(grid, {
      childList: true,
      subtree: false
    });
  }

  async function loadStates() {
    if (loading) return;
    loading = true;

    try {
      var payload = await fetchJson(STATE_URL + '?_=' + Date.now());
      rows = Array.isArray(payload.tables) ? payload.tables : [];
      map = {};

      rows.forEach(function (row) {
        map[String(row.table_id)] = row;

        if (row.table_number != null) {
          map[String(row.table_number)] = row;
        }
      });
    } catch (error) {
      console.error('[PMD V2.4.2] lifecycle load failed', error);
    } finally {
      loading = false;
    }
  }

  async function boot() {
    await loadStates();
    observeGrid();
    decorateGrid();

    /*
     * Keep team status current without touching or rebuilding the table DOM.
     */
    setInterval(async function () {
      await loadStates();
      decorateGrid();
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  console.info('[PMD] Waiter V2.4.2 lifecycle stability active');
})();
