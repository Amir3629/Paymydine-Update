(function () {
  'use strict';

  if (window.PMDWaiterV241SafeLifecycle) return;
  window.PMDWaiterV241SafeLifecycle = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var STATE_URL = '/admin/pmd-waiter-table-states-v154';
  var OPS_URL = '/admin/dashboardwaiter-final-operations';
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  var state = {
    rows: [],
    map: {},
    filter: 'all',
    selected: null,
    busy: false,
    lastGridHtml: '',
    lastStateHash: '',
    booted: false
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({
      credentials:'same-origin',
      cache:'no-store',
      headers:{
        'Accept':'application/json',
        'X-Requested-With':'XMLHttpRequest'
      }
    }, options || {}));

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
    }
    return payload;
  }

  function forceCoreAllOnce() {
    if (state.booted) return;
    var all = root.querySelector('[data-v2-filter="all"]');
    if (all) {
      all.click();
      localStorage.setItem('pmd-waiter-standard-v2-filter', 'all');
    }
    state.booted = true;
  }

  function rowForCard(card) {
    var id = clean(card.getAttribute('data-v2-open-table'));
    return state.map[id] || null;
  }

  function paymentState(row) {
    var value = clean(row.payment_status || '').toLowerCase();
    if (/partial/.test(value)) return 'partial';
    if (/paid|settled|closed/.test(value)) return 'paid';
    if (Number(row.amount_due || 0) > 0) return 'unpaid';
    return 'none';
  }

  function tableStatus(row) {
    return clean(row.table_status || 'available').toLowerCase();
  }

  function primaryLabel(row) {
    return clean(row.table_status_label || row.table_status || 'Available').toUpperCase();
  }

  function cardFlags(card) {
    var text = clean(card.textContent).toLowerCase();
    return {
      call: card.getAttribute('data-pmd-waiter-call') === '1' || /waiter call/.test(text),
      note: card.getAttribute('data-pmd-has-note') === '1' || /order note/.test(text),
      ready: /\bready\b/.test(text)
    };
  }

  function badges(row, card) {
    var list = [];
    var payment = paymentState(row);
    var flags = cardFlags(card);
    var orderLabel = clean(row.order_status_label || row.order_status || '');

    if (Number(row.open_order_count || 0) > 0) {
      list.push('<span class="v241-badge">OPEN ORDER</span>');
    }

    if (flags.ready || /ready/i.test(orderLabel)) {
      list.push('<span class="v241-badge ready">READY</span>');
    }

    if (payment === 'unpaid') {
      list.push('<span class="v241-badge unpaid">UNPAID</span>');
    } else if (payment === 'partial') {
      list.push('<span class="v241-badge unpaid">PARTIAL</span>');
    } else if (payment === 'paid') {
      list.push('<span class="v241-badge paid">PAID</span>');
    }

    if (flags.call) list.push('<span class="v241-badge call">WAITER CALL</span>');
    if (flags.note) list.push('<span class="v241-badge note">NOTE</span>');

    return list.join('');
  }

  function decorateCard(card) {
    var row = rowForCard(card);
    if (!row) return;

    var signature = [
      tableStatus(row),
      paymentState(row),
      row.open_order_count || 0,
      row.order_status || '',
      card.getAttribute('data-pmd-has-note') || '0',
      card.getAttribute('data-pmd-waiter-call') || '0'
    ].join('|');

    if (card.getAttribute('data-v241-signature') === signature) return;
    card.setAttribute('data-v241-signature', signature);
    card.classList.add('v241-card');
    card.setAttribute('data-v241-status', tableStatus(row));
    card.setAttribute('data-v241-payment', paymentState(row));

    var flags = cardFlags(card);
    card.setAttribute('data-v241-call', flags.call ? '1' : '0');
    card.setAttribute('data-v241-note', flags.note ? '1' : '0');

    var oldPrimary = card.querySelector('.v241-primary');
    if (oldPrimary) oldPrimary.remove();

    var primary = document.createElement('span');
    primary.className = 'v241-primary';
    primary.textContent = primaryLabel(row);
    card.insertBefore(primary, card.firstChild);

    var badgeBox = card.querySelector('.v241-badges');
    if (!badgeBox) {
      badgeBox = document.createElement('span');
      badgeBox.className = 'v241-badges';
      card.appendChild(badgeBox);
    }
    badgeBox.innerHTML = badges(row, card);

    var statusBtn = card.querySelector('.v241-status-btn');
    if (!statusBtn) {
      statusBtn = document.createElement('button');
      statusBtn.type = 'button';
      statusBtn.className = 'v241-status-btn';
      statusBtn.textContent = 'STATUS';
      statusBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var fresh = rowForCard(card);
        if (fresh) openDrawer(fresh);
      });
      card.appendChild(statusBtn);
    }
  }

  function decorateAllCards() {
    root.querySelectorAll('[data-v2-open-table]').forEach(decorateCard);
    applyFilter();
  }

  function counts() {
    var out = {
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
      var status = tableStatus(row);
      if (out[status] != null) out[status] += 1;
      if (['unpaid','partial'].indexOf(paymentState(row)) !== -1) out.unpaid += 1;
    });

    root.querySelectorAll('[data-v2-open-table]').forEach(function (card) {
      if (card.getAttribute('data-v241-call') === '1') out.call += 1;
      if (card.getAttribute('data-v241-note') === '1') out.note += 1;
    });

    return out;
  }

  function buildRail() {
    var rail = root.querySelector('.pmd-v2-mode-keys');
    if (!rail) return;

    var c = counts();
    var rows = [
      ['all','ALL TABLES',c.all],
      ['available','AVAILABLE',c.available],
      ['occupied','OCCUPIED',c.occupied],
      ['cleaning','CLEANING',c.cleaning],
      ['reserved','RESERVED',c.reserved],
      ['unpaid','UNPAID',c.unpaid],
      ['call','WAITER CALLS',c.call],
      ['note','NOTES',c.note]
    ];

    var html = rows.map(function (row) {
      return '<button type="button" data-v241-filter="' + row[0] + '"' +
        (state.filter === row[0] ? ' class="is-active"' : '') + '>' +
        '<span>' + row[1] + '</span><b>' + row[2] + '</b></button>';
    }).join('');

    if (rail.getAttribute('data-v241-html') === html) return;
    rail.setAttribute('data-v241-html', html);
    rail.innerHTML = html;

    rail.querySelectorAll('[data-v241-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.filter = button.getAttribute('data-v241-filter') || 'all';
        rail.removeAttribute('data-v241-html');
        buildRail();
        applyFilter();
      });
    });
  }

  function matches(card) {
    if (state.filter === 'all') return true;
    if (['available','occupied','cleaning','reserved'].indexOf(state.filter) !== -1) {
      return card.getAttribute('data-v241-status') === state.filter;
    }
    if (state.filter === 'unpaid') {
      return ['unpaid','partial'].indexOf(card.getAttribute('data-v241-payment')) !== -1;
    }
    if (state.filter === 'call') return card.getAttribute('data-v241-call') === '1';
    if (state.filter === 'note') return card.getAttribute('data-v241-note') === '1';
    return true;
  }

  function applyFilter() {
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-v2-open-table]'));
    cards.forEach(function (card) {
      card.hidden = !matches(card);
    });

    var empty = root.querySelector('[data-v2-empty]');
    if (empty) empty.hidden = cards.some(function (card) { return !card.hidden; });
  }

  function ensureDrawer() {
    var drawer = document.querySelector('.v241-drawer');
    if (drawer) return drawer;

    drawer = document.createElement('div');
    drawer.className = 'v241-drawer';
    drawer.innerHTML =
      '<button type="button" class="v241-backdrop" aria-label="Close"></button>' +
      '<section class="v241-panel">' +
        '<header class="v241-head">' +
          '<div><small>TABLE LIFECYCLE</small><strong data-v241-title>TABLE</strong></div>' +
          '<button type="button" class="v241-close">×</button>' +
        '</header>' +
        '<div class="v241-body">' +
          '<div class="v241-current"><small>CURRENT STATUS</small><strong data-v241-current>—</strong></div>' +
          '<div class="v241-title">CHANGE TABLE STATUS</div>' +
          '<div class="v241-actions" data-v241-actions></div>' +
          '<div class="v241-title">TABLE OPERATIONS</div>' +
          '<div class="v241-ops-buttons">' +
            '<button type="button" data-v241-op="merge">MERGE TABLES</button>' +
            '<button type="button" data-v241-op="transfer">TRANSFER TABLE</button>' +
          '</div>' +
          '<div class="v241-message" data-v241-message></div>' +
        '</div>' +
      '</section>';

    document.body.appendChild(drawer);
    drawer.querySelector('.v241-backdrop').addEventListener('click', closeDrawer);
    drawer.querySelector('.v241-close').addEventListener('click', closeDrawer);

    drawer.querySelectorAll('[data-v241-op]').forEach(function (button) {
      button.addEventListener('click', function () {
        openOperations(button.getAttribute('data-v241-op'));
      });
    });

    return drawer;
  }

  function actionLabel(next, current) {
    if (next === 'occupied') return current === 'reserved' ? 'GUESTS ARRIVED' : 'SEAT GUESTS';
    if (next === 'cleaning') return 'CUSTOMER LEFT — NEEDS CLEANING';
    if (next === 'available') return current === 'cleaning' ? 'CLEANING COMPLETE' : 'MARK AVAILABLE';
    if (next === 'reserved') return 'RESERVE TABLE';
    return next.toUpperCase();
  }

  function openDrawer(row) {
    state.selected = row;
    var drawer = ensureDrawer();

    drawer.querySelector('[data-v241-title]').textContent =
      'TABLE ' + clean(row.table_number || row.table_id);
    drawer.querySelector('[data-v241-current]').textContent = primaryLabel(row);

    var actions = drawer.querySelector('[data-v241-actions]');
    var allowed = Array.isArray(row.available_transitions) ? row.available_transitions : [];

    actions.innerHTML = allowed.length
      ? allowed.map(function (next) {
          return '<button type="button" data-status="' + esc(next) + '">' +
            esc(actionLabel(next, tableStatus(row))) + '</button>';
        }).join('')
      : '<div>No transitions available.</div>';

    actions.querySelectorAll('[data-status]').forEach(function (button) {
      button.addEventListener('click', function () {
        updateStatus(button.getAttribute('data-status'));
      });
    });

    drawer.querySelector('[data-v241-message]').textContent = '';
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var drawer = document.querySelector('.v241-drawer');
    if (drawer) drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function updateStatus(next) {
    if (!state.selected || state.busy) return;

    var message = document.querySelector('[data-v241-message]');
    state.busy = true;

    if (message) {
      message.className = 'v241-message';
      message.textContent = 'UPDATING TABLE STATUS…';
    }

    var payload = {status:next, reason:'waiter_pos_v241'};

    if (tableStatus(state.selected) === 'occupied' && next === 'available') {
      if (!window.confirm('Skip cleaning and mark the table immediately available?')) {
        state.busy = false;
        if (message) message.textContent = '';
        return;
      }
      payload.skip_cleaning = true;
    }

    try {
      await fetchJson(
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
        message.className = 'v241-message ok';
        message.textContent = 'TABLE STATUS UPDATED';
      }

      await loadStates();
      var fresh = state.map[String(state.selected.table_id)];
      if (fresh) openDrawer(fresh);
    } catch (error) {
      if (message) {
        message.className = 'v241-message error';
        message.textContent = error.message || 'COULD NOT UPDATE TABLE';
      }
    } finally {
      state.busy = false;
    }
  }

  function ensureOperations() {
    var workspace = document.querySelector('.v241-ops');
    if (workspace) return workspace;

    workspace = document.createElement('section');
    workspace.className = 'v241-ops';
    workspace.innerHTML =
      '<header class="v241-ops-head">' +
        '<strong data-v241-ops-title>TABLE OPERATIONS</strong>' +
        '<button type="button" aria-label="Close">×</button>' +
      '</header>' +
      '<iframe title="Table operations"></iframe>';

    document.body.appendChild(workspace);
    workspace.querySelector('button').addEventListener('click', function () {
      workspace.classList.remove('open');
      workspace.querySelector('iframe').src = 'about:blank';
      document.body.style.overflow = '';
    });

    return workspace;
  }

  function openOperations(action) {
    if (!state.selected) return;
    closeDrawer();

    var workspace = ensureOperations();
    var separator = OPS_URL.indexOf('?') === -1 ? '?' : '&';
    var url = OPS_URL + separator +
      'table=' + encodeURIComponent(String(state.selected.table_id)) +
      '&table_number=' + encodeURIComponent(String(state.selected.table_number || '')) +
      '&action=' + encodeURIComponent(action);

    workspace.querySelector('[data-v241-ops-title]').textContent =
      (action === 'merge' ? 'MERGE TABLES' : 'TRANSFER TABLE') +
      ' · TABLE ' + clean(state.selected.table_number || state.selected.table_id);

    workspace.querySelector('iframe').src = url;
    workspace.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  async function loadStates() {
    try {
      var payload = await fetchJson(STATE_URL + '?_=' + Date.now());
      var rows = Array.isArray(payload.tables) ? payload.tables : [];
      var map = {};

      rows.forEach(function (row) {
        map[String(row.table_id)] = row;
        if (row.table_number != null) map[String(row.table_number)] = row;
      });

      var hash = rows.map(function (row) {
        return [
          row.table_id,
          row.table_status,
          row.payment_status,
          row.open_order_count,
          row.order_status
        ].join(':');
      }).join('|');

      state.rows = rows;
      state.map = map;

      if (hash !== state.lastStateHash) {
        state.lastStateHash = hash;
        root.querySelectorAll('[data-v2-open-table]').forEach(function (card) {
          card.removeAttribute('data-v241-signature');
        });
      }

      decorateAllCards();
      buildRail();
    } catch (error) {
      console.error('[PMD V2.4.1] lifecycle load failed', error);
    }
  }

  function safeTick() {
    forceCoreAllOnce();

    var grid = root.querySelector('[data-v2-table-grid]');
    var html = grid ? grid.innerHTML : '';

    if (html !== state.lastGridHtml) {
      state.lastGridHtml = html;
      decorateAllCards();
      buildRail();
    } else {
      applyFilter();
    }
  }

  setTimeout(function () {
    forceCoreAllOnce();
    loadStates();
  }, 250);

  setInterval(safeTick, 1200);
  setInterval(loadStates, 15000);

  console.info('[PMD] Waiter V2.4.1 safe lifecycle active');
})();
