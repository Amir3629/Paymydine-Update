(function () {
  'use strict';

  if (window.PMDWaiterV240Lifecycle) return;
  window.PMDWaiterV240Lifecycle = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var STATE_URL = '/admin/pmd-waiter-table-states-v154';
  var OPS_URL = '/admin/dashboardwaiter-final-operations';
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  var state = {
    payload: null,
    rows: [],
    map: {},
    filter: 'all',
    selected: null,
    busy: false,
    timer: null
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  async function json(url, options) {
    var response = await fetch(url, Object.assign({
      credentials:'same-origin',
      cache:'no-store',
      headers:{
        'Accept':'application/json',
        'X-Requested-With':'XMLHttpRequest',
        'X-CSRF-TOKEN':csrf
      }
    }, options || {}));

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
    }
    return payload;
  }

  function tableIdFromCard(card) {
    return clean(card.getAttribute('data-v2-open-table'));
  }

  function rowForCard(card) {
    var id = tableIdFromCard(card);
    return state.map[id] || null;
  }

  function normalizePayment(row) {
    var value = clean(row.payment_status || '').toLowerCase();
    if (/partial/.test(value)) return 'partial';
    if (/paid|settled|closed/.test(value)) return 'paid';
    if (Number(row.amount_due || 0) > 0) return 'unpaid';
    return value || 'none';
  }

  function primaryLabel(row) {
    return clean(row.table_status_label || row.table_status || 'Available').toUpperCase();
  }

  function badgeMarkup(row, card) {
    var badges = [];
    var payment = normalizePayment(row);
    var orderLabel = clean(row.order_status_label || row.order_status || '');
    var hasCall =
      card.getAttribute('data-pmd-waiter-call') === '1' ||
      /waiter call/i.test(card.textContent);
    var hasNote = card.getAttribute('data-pmd-has-note') === '1';

    if (Number(row.open_order_count || 0) > 0) {
      badges.push('<span class="pmd-v240-badge">OPEN ORDER</span>');
    }

    if (/ready/i.test(orderLabel)) {
      badges.push('<span class="pmd-v240-badge is-ready">READY</span>');
    }

    if (payment === 'unpaid') {
      badges.push('<span class="pmd-v240-badge is-unpaid">UNPAID</span>');
    } else if (payment === 'partial') {
      badges.push('<span class="pmd-v240-badge is-unpaid">PARTIAL</span>');
    } else if (payment === 'paid') {
      badges.push('<span class="pmd-v240-badge is-paid">PAID</span>');
    }

    if (hasCall) {
      badges.push('<span class="pmd-v240-badge is-call">WAITER CALL</span>');
    }

    if (hasNote) {
      badges.push('<span class="pmd-v240-badge is-note">NOTE</span>');
    }

    return badges.join('');
  }

  function decorateCard(card) {
    var row = rowForCard(card);
    if (!row) return;

    card.classList.add('pmd-v240-card');
    card.setAttribute('data-v240-status', clean(row.table_status || 'available'));
    card.setAttribute('data-v240-payment', normalizePayment(row));

    if (/waiter call/i.test(card.textContent)) {
      card.setAttribute('data-v240-waiter-call', '1');
    }

    var stateNode = card.querySelector('.pmd-v240-primary-state');
    if (!stateNode) {
      stateNode = document.createElement('span');
      stateNode.className = 'pmd-v240-primary-state';
      card.insertBefore(stateNode, card.firstChild);
    }
    stateNode.textContent = primaryLabel(row);

    var badgeBox = card.querySelector('.pmd-v240-badges');
    if (!badgeBox) {
      badgeBox = document.createElement('span');
      badgeBox.className = 'pmd-v240-badges';
      card.appendChild(badgeBox);
    }
    badgeBox.innerHTML = badgeMarkup(row, card);

    var statusButton = card.querySelector('.pmd-v240-status-key');
    if (!statusButton) {
      statusButton = document.createElement('button');
      statusButton.type = 'button';
      statusButton.className = 'pmd-v240-status-key';
      statusButton.textContent = 'STATUS';
      statusButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openDrawer(row);
      });
      card.appendChild(statusButton);
    }
  }

  function decorateCards() {
    root.querySelectorAll('[data-v2-open-table]').forEach(decorateCard);
    applyFilter();
  }

  function counts() {
    var result = {
      all:state.rows.length,
      available:0,
      occupied:0,
      cleaning:0,
      reserved:0,
      unpaid:0,
      call:0,
      note:0
    };

    state.rows.forEach(function (row) {
      var status = clean(row.table_status || 'available');
      if (result[status] != null) result[status] += 1;
      if (['unpaid','partial'].indexOf(normalizePayment(row)) !== -1) result.unpaid += 1;
    });

    root.querySelectorAll('[data-v2-open-table]').forEach(function (card) {
      if (
        card.getAttribute('data-pmd-waiter-call') === '1' ||
        /waiter call/i.test(card.textContent)
      ) result.call += 1;
      if (card.getAttribute('data-pmd-has-note') === '1') result.note += 1;
    });

    return result;
  }

  function rebuildRail() {
    var rail = root.querySelector('.pmd-v2-mode-keys');
    if (!rail) return;

    var c = counts();
    var filters = [
      ['all','ALL TABLES',c.all],
      ['available','AVAILABLE',c.available],
      ['occupied','OCCUPIED',c.occupied],
      ['cleaning','CLEANING',c.cleaning],
      ['reserved','RESERVED',c.reserved],
      ['unpaid','UNPAID',c.unpaid],
      ['call','WAITER CALLS',c.call],
      ['note','NOTES',c.note]
    ];

    rail.innerHTML = filters.map(function (row) {
      return '<button type="button" data-v240-filter="' + row[0] + '"' +
        (state.filter === row[0] ? ' class="is-active"' : '') + '>' +
        '<span>' + row[1] + '</span><b>' + row[2] + '</b></button>';
    }).join('');

    rail.querySelectorAll('[data-v240-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.filter = button.getAttribute('data-v240-filter') || 'all';
        rebuildRail();
        applyFilter();
      });
    });
  }

  function cardMatches(card) {
    if (state.filter === 'all') return true;

    if (['available','occupied','cleaning','reserved'].indexOf(state.filter) !== -1) {
      return card.getAttribute('data-v240-status') === state.filter;
    }

    if (state.filter === 'unpaid') {
      return ['unpaid','partial'].indexOf(card.getAttribute('data-v240-payment')) !== -1;
    }

    if (state.filter === 'call') {
      return card.getAttribute('data-v240-waiter-call') === '1';
    }

    if (state.filter === 'note') {
      return card.getAttribute('data-pmd-has-note') === '1';
    }

    return true;
  }

  function applyFilter() {
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-v2-open-table]'));
    cards.forEach(function (card) {
      card.hidden = !cardMatches(card);
    });

    var empty = root.querySelector('[data-v2-empty]');
    if (empty) empty.hidden = cards.some(function (card) { return !card.hidden; });
  }

  function ensureDrawer() {
    var drawer = document.querySelector('.pmd-v240-drawer');
    if (drawer) return drawer;

    drawer = document.createElement('div');
    drawer.className = 'pmd-v240-drawer';
    drawer.innerHTML =
      '<button type="button" class="pmd-v240-backdrop" aria-label="Close"></button>' +
      '<section class="pmd-v240-panel">' +
        '<header class="pmd-v240-head">' +
          '<div><small>TABLE LIFECYCLE</small><strong data-v240-title>TABLE</strong></div>' +
          '<button type="button" class="pmd-v240-close">×</button>' +
        '</header>' +
        '<div class="pmd-v240-body">' +
          '<div class="pmd-v240-current"><small>CURRENT STATUS</small><strong data-v240-current>—</strong></div>' +
          '<div class="pmd-v240-section-title">CHANGE TABLE STATUS</div>' +
          '<div class="pmd-v240-actions" data-v240-actions></div>' +
          '<div class="pmd-v240-section-title">TABLE OPERATIONS</div>' +
          '<div class="pmd-v240-operations">' +
            '<button type="button" data-v240-operation="merge">MERGE TABLES</button>' +
            '<button type="button" data-v240-operation="transfer">TRANSFER TABLE</button>' +
          '</div>' +
          '<div class="pmd-v240-message" data-v240-message></div>' +
        '</div>' +
      '</section>';

    document.body.appendChild(drawer);

    drawer.querySelector('.pmd-v240-backdrop').addEventListener('click', closeDrawer);
    drawer.querySelector('.pmd-v240-close').addEventListener('click', closeDrawer);

    drawer.querySelectorAll('[data-v240-operation]').forEach(function (button) {
      button.addEventListener('click', function () {
        openOperations(button.getAttribute('data-v240-operation'));
      });
    });

    return drawer;
  }

  function actionLabel(status, current) {
    if (status === 'occupied') return current === 'reserved' ? 'GUESTS ARRIVED' : 'SEAT GUESTS';
    if (status === 'cleaning') return 'CUSTOMER LEFT — NEEDS CLEANING';
    if (status === 'available') return current === 'cleaning' ? 'CLEANING COMPLETE' : 'MARK AVAILABLE';
    if (status === 'reserved') return 'RESERVE TABLE';
    return status.toUpperCase();
  }

  function openDrawer(row) {
    state.selected = row;
    var drawer = ensureDrawer();
    drawer.querySelector('[data-v240-title]').textContent =
      'TABLE ' + clean(row.table_number || row.table_id);
    drawer.querySelector('[data-v240-current]').textContent = primaryLabel(row);

    var actions = drawer.querySelector('[data-v240-actions]');
    var allowed = Array.isArray(row.available_transitions)
      ? row.available_transitions
      : [];

    actions.innerHTML = allowed.map(function (status) {
      return '<button type="button" data-status="' + esc(status) + '">' +
        esc(actionLabel(status, clean(row.table_status))) + '</button>';
    }).join('');

    if (!allowed.length) {
      actions.innerHTML = '<div>No status transitions are currently available.</div>';
    }

    actions.querySelectorAll('[data-status]').forEach(function (button) {
      button.addEventListener('click', function () {
        updateStatus(button.getAttribute('data-status'));
      });
    });

    drawer.querySelector('[data-v240-message]').textContent = '';
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var drawer = document.querySelector('.pmd-v240-drawer');
    if (drawer) drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  async function updateStatus(next) {
    if (!state.selected || state.busy) return;

    var message = document.querySelector('[data-v240-message]');
    state.busy = true;
    if (message) {
      message.className = 'pmd-v240-message';
      message.textContent = 'UPDATING TABLE STATUS…';
    }

    var payload = {
      status:next,
      reason:'waiter_pos_v240'
    };

    if (
      clean(state.selected.table_status) === 'occupied' &&
      next === 'available'
    ) {
      var confirmed = window.confirm(
        'This skips cleaning and marks the table immediately available. Continue?'
      );
      if (!confirmed) {
        state.busy = false;
        if (message) message.textContent = '';
        return;
      }
      payload.skip_cleaning = true;
    }

    try {
      await json(
        STATE_URL + '/' + encodeURIComponent(String(state.selected.table_id)),
        {
          method:'POST',
          headers:{
            'Accept':'application/json',
            'Content-Type':'application/json',
            'X-Requested-With':'XMLHttpRequest',
            'X-CSRF-TOKEN':csrf
          },
          body:JSON.stringify(payload)
        }
      );

      if (message) {
        message.className = 'pmd-v240-message is-ok';
        message.textContent = 'TABLE STATUS UPDATED';
      }

      await loadStates();
      var fresh = state.map[String(state.selected.table_id)];
      if (fresh) openDrawer(fresh);
    } catch (error) {
      if (message) {
        message.className = 'pmd-v240-message is-error';
        message.textContent = error.message || 'COULD NOT UPDATE TABLE';
      }
    } finally {
      state.busy = false;
    }
  }

  function ensureOperations() {
    var workspace = document.querySelector('.pmd-v240-ops');
    if (workspace) return workspace;

    workspace = document.createElement('section');
    workspace.className = 'pmd-v240-ops';
    workspace.innerHTML =
      '<header class="pmd-v240-ops-head">' +
        '<strong data-v240-ops-title>TABLE OPERATIONS</strong>' +
        '<button type="button" aria-label="Close">×</button>' +
      '</header>' +
      '<iframe title="Table operations"></iframe>';

    document.body.appendChild(workspace);
    workspace.querySelector('button').addEventListener('click', function () {
      workspace.classList.remove('is-open');
      workspace.querySelector('iframe').src = 'about:blank';
      document.body.style.overflow = '';
    });

    return workspace;
  }

  function openOperations(action) {
    if (!state.selected) return;

    closeDrawer();

    var workspace = ensureOperations();
    var tableId = state.selected.table_id;
    var tableNumber = state.selected.table_number;
    var separator = OPS_URL.indexOf('?') === -1 ? '?' : '&';
    var url = OPS_URL + separator +
      'table=' + encodeURIComponent(String(tableId)) +
      '&table_number=' + encodeURIComponent(String(tableNumber)) +
      '&action=' + encodeURIComponent(action);

    workspace.querySelector('[data-v240-ops-title]').textContent =
      (action === 'merge' ? 'MERGE TABLES' : 'TRANSFER TABLE') +
      ' · TABLE ' + tableNumber;

    workspace.querySelector('iframe').src = url;
    workspace.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  async function loadStates() {
    try {
      var payload = await json(STATE_URL + '?_=' + Date.now());
      var rows = Array.isArray(payload.tables) ? payload.tables : [];
      var map = {};

      rows.forEach(function (row) {
        map[String(row.table_id)] = row;
        if (row.table_number != null) map[String(row.table_number)] = row;
      });

      state.payload = payload;
      state.rows = rows;
      state.map = map;

      decorateCards();
      rebuildRail();
    } catch (error) {
      console.error('[PMD V2.4] table lifecycle load failed', error);
    }
  }

  var observer = new MutationObserver(function () {
    if (state.rows.length) decorateCards();
  });

  observer.observe(root, {childList:true, subtree:true});

  loadStates();
  state.timer = setInterval(loadStates, 15000);

  console.info('[PMD] Waiter V2.4.0 operational table lifecycle active');
})();
