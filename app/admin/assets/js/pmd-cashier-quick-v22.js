(function () {
  'use strict';

  // PMD_CASHIER_QUICK_V22_R43
  // V2.1 remains the floor/table authority. This layer is event-driven and
  // reuses the existing Waiter POS, Payment Center and R45 table-free route.
  if (window.PMDCashierQuickV22R43) return;
  if (window.location.pathname !== '/admin/cashierlab') return;
  if (window.matchMedia && !window.matchMedia('(max-width: 767px)').matches) return;

  var launcher = document.querySelector('[data-pmd-cashier-quick-launcher-v21]');
  var waiterRoot = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!launcher || !waiterRoot) return;

  var dataUrl = waiterRoot.getAttribute('data-data-url') || '/admin/pmd-waiter-dashboard-v9-tenant-data';
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';
  var pendingOpen = null;
  var activePos = null;
  var activeTableId = 0;
  var originalMobileBar = null;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function num(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
  }

  function positiveId(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function money(value) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(num(value, 0));
    } catch (error) {
      return '€' + num(value, 0).toFixed(2);
    }
  }

  function fetchJson(url, options) {
    return fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf
      }
    }, options || {})).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (json) {
        if (!response.ok || json.ok === false || json.success === false) {
          throw new Error(clean(json.message || json.error || ('HTTP ' + response.status)));
        }
        return json;
      });
    });
  }

  function canonicalBoot() {
    var node = document.getElementById('pmd-cashier-quick-canonical-bootstrap-v21');
    if (!node) return {};
    try { return JSON.parse(node.textContent || '{}'); }
    catch (error) { return {}; }
  }

  function canonicalTable(tableId) {
    var boot = canonicalBoot();
    var rows = Array.isArray(boot.tables) ? boot.tables : [];
    return rows.find(function (row) {
      var raw = row && row.raw && typeof row.raw === 'object' ? row.raw : {};
      return [
        row && row.id,
        row && row.table_id,
        row && row.dbTableId,
        row && row.db_table_id,
        raw.id,
        raw.table_id
      ].some(function (value) { return positiveId(value) === positiveId(tableId); });
    }) || {};
  }

  function tableIdentity(tableId) {
    var row = canonicalTable(tableId);
    var raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
    var number = clean(
      row.number || row.table_number || row.table_no || raw.table_number || raw.table_no || tableId
    );
    var name = clean(
      row.name || row.label || row.table_label || row.table_name || raw.table_name || ('Table ' + number)
    );
    return {id: positiveId(tableId), number: number, name: name};
  }

  function orderRows(payload) {
    var candidates = [
      payload && payload.orders,
      payload && payload.current_orders,
      payload && payload.open_orders,
      payload && payload.active_orders,
      payload && payload.sections && payload.sections.open_orders,
      payload && payload.sections && payload.sections.active_orders
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }
    return [];
  }

  function orderTokens(order) {
    var values = [
      order.table_id,
      order.location_table_id,
      order.table,
      order.table_no,
      order.table_number,
      order.table_ref,
      order.table_name,
      order.table_label,
      order.table_display
    ];
    var tokens = [];
    values.forEach(function (value) {
      var text = clean(value).toLowerCase();
      if (!text) return;
      tokens.push(text);
      var match = text.match(/(?:table|tisch)?\s*#?\s*(\d+)$/i);
      if (match) tokens.push(match[1]);
    });
    return tokens;
  }

  function ordersForTable(payload, tableId) {
    var table = tableIdentity(tableId);
    var wanted = [
      String(table.id),
      clean(table.number).toLowerCase(),
      clean(table.name).toLowerCase()
    ].filter(Boolean);

    return orderRows(payload).filter(function (order) {
      var tokens = orderTokens(order || {});
      return wanted.some(function (value) { return tokens.indexOf(value) !== -1; });
    }).sort(function (a, b) {
      return positiveId(b.order_id || b.id) - positiveId(a.order_id || a.id);
    });
  }

  function orderTotal(order) {
    return num(order.total != null ? order.total : order.order_total, 0);
  }

  function orderPaid(order) {
    return Math.max(0, num(order.settled_amount != null ? order.settled_amount : order.paid_amount, 0));
  }

  function orderDue(order) {
    if (order.remaining_amount != null) return Math.max(0, num(order.remaining_amount, 0));
    if (order.amount_due != null) return Math.max(0, num(order.amount_due, 0));
    return Math.max(0, orderTotal(order) - orderPaid(order));
  }

  function orderState(order) {
    var raw = clean(order.settlement_status || order.payment_status || '').toLowerCase();
    var due = orderDue(order);
    var paid = orderPaid(order);
    if (due <= 0.009 && orderTotal(order) > 0) return 'Paid';
    if (paid > 0 || /partial/.test(raw)) return 'Part paid';
    return 'Unpaid';
  }

  function itemRows(order) {
    var items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) return '';
    return '<div class="pmd-cq22__items">' + items.slice(0, 8).map(function (item) {
      var qty = num(item.quantity != null ? item.quantity : item.qty, 1);
      var name = clean(item.name || item.menu_name || item.item_name || 'Item');
      var note = clean(item.note || item.comment || '');
      return '<div><span>' + esc(qty + ' × ' + name) + (note ? '<small>' + esc(note) + '</small>' : '') + '</span></div>';
    }).join('') + '</div>';
  }

  function ensureChecksSheet() {
    var sheet = document.querySelector('[data-pmd-cq22-checks]');
    if (sheet) return sheet;

    sheet = document.createElement('div');
    sheet.className = 'pmd-cq22';
    sheet.setAttribute('data-pmd-cq22-checks', '1');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = [
      '<button type="button" class="pmd-cq22__backdrop" data-cq22-close aria-label="Close"></button>',
      '<section class="pmd-cq22__sheet" role="dialog" aria-modal="true">',
        '<header><div><small>TABLE</small><h2 data-cq22-title>Current checks</h2></div><button type="button" data-cq22-close aria-label="Close">×</button></header>',
        '<div class="pmd-cq22__body" data-cq22-body></div>',
      '</section>'
    ].join('');
    document.body.appendChild(sheet);
    return sheet;
  }

  function closeChecks() {
    var sheet = document.querySelector('[data-pmd-cq22-checks]');
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pmd-cq22-sheet-open');
  }

  function renderChecks(tableId, orders) {
    var sheet = ensureChecksSheet();
    var table = tableIdentity(tableId);
    var title = sheet.querySelector('[data-cq22-title]');
    var body = sheet.querySelector('[data-cq22-body]');
    if (title) title.textContent = table.name + ' · Current checks';

    if (!orders.length) {
      body.innerHTML = '<div class="pmd-cq22__empty"><strong>No open checks</strong><span>This table has no current order to open.</span></div>';
    } else {
      body.innerHTML = orders.map(function (order) {
        var orderId = positiveId(order.order_id || order.id);
        var note = clean(order.note || order.comment || '');
        return [
          '<article class="pmd-cq22__check" data-cq22-order="', esc(orderId), '">',
            '<div class="pmd-cq22__check-head"><strong>#', esc(orderId), '</strong><span class="', orderState(order) === 'Paid' ? 'is-paid' : 'is-due', '">', esc(orderState(order)), '</span></div>',
            '<div class="pmd-cq22__money">',
              '<div><span>Total</span><strong>', esc(money(orderTotal(order))), '</strong></div>',
              '<div><span>Paid</span><strong>', esc(money(orderPaid(order))), '</strong></div>',
              '<div><span>Due</span><strong>', esc(money(orderDue(order))), '</strong></div>',
            '</div>',
            itemRows(order),
            note ? '<div class="pmd-cq22__note"><b>Note</b><span>' + esc(note) + '</span></div>' : '',
            '<div class="pmd-cq22__actions">',
              '<button type="button" data-cq22-open="', esc(orderId), '" data-table-id="', esc(tableId), '">Open / edit</button>',
              orderDue(order) > 0.009 ? '<button type="button" class="is-primary" data-cq22-pay="' + esc(orderId) + '" data-table-id="' + esc(tableId) + '">Pay</button>' : '',
            '</div>',
          '</article>'
        ].join('');
      }).join('');
    }

    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-cq22-sheet-open');
  }

  function openChecks(tableId) {
    var sheet = ensureChecksSheet();
    var body = sheet.querySelector('[data-cq22-body]');
    var title = sheet.querySelector('[data-cq22-title]');
    var table = tableIdentity(tableId);
    if (title) title.textContent = table.name + ' · Current checks';
    body.innerHTML = '<div class="pmd-cq22__loading">Loading current checks…</div>';
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-cq22-sheet-open');

    var separator = dataUrl.indexOf('?') === -1 ? '?' : '&';
    fetchJson(dataUrl + separator + '_=' + Date.now())
      .then(function (payload) { renderChecks(tableId, ordersForTable(payload, tableId)); })
      .catch(function (error) {
        body.innerHTML = '<div class="pmd-cq22__empty is-error"><strong>Could not load checks</strong><span>' + esc(error.message || 'Please try again.') + '</span></div>';
      });
  }

  function openExactOrder(tableId, orderId, payment) {
    if (!window.PMDWaiterStandardV2 || typeof window.PMDWaiterStandardV2.openTable !== 'function') {
      window.alert('The existing Waiter POS is not ready.');
      return;
    }

    pendingOpen = {
      tableId: positiveId(tableId),
      orderId: positiveId(orderId),
      payment: Boolean(payment)
    };
    closeChecks();
    window.PMDWaiterStandardV2.openTable(String(tableId));
  }

  function remountExactOrder(detail, request) {
    var pos = detail && detail.pos;
    if (!pos || !pos.state || !request || !request.orderId) return pos;
    if (!window.PMDWaiterPOSApp || typeof window.PMDWaiterPOSApp.mount !== 'function') return pos;

    var root = document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]');
    var boot = pos.state.boot || {};
    var orders = Array.isArray(boot.open_orders) ? boot.open_orders.slice() : [];
    var exists = orders.some(function (order) {
      return positiveId(order.order_id || order.id) === request.orderId;
    });
    if (!root || !exists) return pos;

    var exactBoot = Object.assign({}, boot, {active_order_id: request.orderId});
    var exact = window.PMDWaiterPOSApp.mount(root, exactBoot, {
      embedded: true,
      onClose: function () {
        if (window.PMDWaiterStandardV2 && typeof window.PMDWaiterStandardV2.closeTable === 'function') {
          window.PMDWaiterStandardV2.closeTable();
        }
      }
    });

    return exact || pos;
  }

  function installPosHeader(pos, tableId) {
    activePos = pos || window.PMDWaiterPOS || null;
    activeTableId = positiveId(tableId);
    if (!activePos || !activePos.state) return;

    var root = document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]');
    if (!root) return;

    var old = root.querySelector('[data-pmd-cq22-pos-header]');
    if (old) old.remove();

    var hasChecks = Array.isArray(activePos.state.openOrders) && activePos.state.openOrders.length > 0;
    var header = document.createElement('div');
    header.className = 'pmd-cq22-pos-header';
    header.setAttribute('data-pmd-cq22-pos-header', '1');
    header.innerHTML = [
      '<button type="button" data-cq22-pos-back>‹ <span>Tables</span></button>',
      hasChecks ? '<button type="button" data-cq22-pos-note>Note</button>' : '',
      hasChecks ? '<button type="button" data-cq22-pos-pay>Pay</button>' : '',
      hasChecks ? '<button type="button" class="is-danger" data-cq22-pos-free>Free table</button>' : ''
    ].join('');

    root.insertBefore(header, root.firstChild);
  }

  function openNote() {
    var root = document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]');
    if (!root) return;
    var mobile = root.querySelector('[data-pos-mobile-cart]');
    if (mobile) mobile.click();
    requestAnimationFrame(function () {
      var note = root.querySelector('[data-pos-table-note]');
      if (note) {
        note.scrollIntoView({block: 'center'});
        note.focus();
      }
    });
  }

  function freeTable(tableId) {
    tableId = positiveId(tableId);
    if (!tableId) return;
    var table = tableIdentity(tableId);
    if (!window.confirm('Set ' + table.name + ' as FREE?\n\nThe server will refuse this while any check is unpaid or part-paid.')) return;

    fetchJson('/admin/pmd-waiter-pos-v22/tables/' + encodeURIComponent(String(tableId)) + '/free', {
      method: 'POST'
    }).then(function (json) {
      var status = clean(json && json.table && json.table.operational_status).toLowerCase();
      if (status !== 'available' && status !== 'free') {
        throw new Error('Table release was not confirmed by the server.');
      }
      window.dispatchEvent(new CustomEvent('pmd:cashier-table-freed', {detail: json}));
      window.location.replace('/admin/cashierlab?pmd_cashier_quick=1');
    }).catch(function (error) {
      window.alert(error.message || 'Could not set the table free.');
    });
  }

  function modifierOpen() {
    return document.querySelector('[data-v2-pos-host] [data-pos-modifier-modal].is-show');
  }

  function syncMobileAddBridge() {
    var root = document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]');
    if (!root) return;
    var bar = root.querySelector('[data-pos-mobile-cart]');
    if (!bar) return;

    if (modifierOpen()) {
      if (originalMobileBar == null) originalMobileBar = bar.innerHTML;
      bar.setAttribute('data-cq22-add-selected', '1');
      bar.innerHTML = '<span><b>Add selected</b><small>Confirm item options</small></span><span class="pmd-pos-mobile-cart-total">＋</span>';
    } else if (bar.hasAttribute('data-cq22-add-selected')) {
      bar.removeAttribute('data-cq22-add-selected');
      if (originalMobileBar != null) bar.innerHTML = originalMobileBar;
      originalMobileBar = null;
    }
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    var request = pendingOpen;
    pendingOpen = null;
    var pos = detail.pos || window.PMDWaiterPOS;

    if (request && request.orderId) {
      pos = remountExactOrder(detail, request);
    }

    installPosHeader(pos, detail.tableId || (request && request.tableId));

    if (request && request.payment && pos && typeof pos.openPayment === 'function') {
      requestAnimationFrame(function () { pos.openPayment(); });
    }
  });

  window.addEventListener('click', function (event) {
    var target = event.target && typeof event.target.closest === 'function' ? event.target : null;
    if (!target) return;

    var tableButton = target.closest('[data-pmd-cashier-quick-launcher-v21] [data-cql-table]');
    if (tableButton && tableButton.classList.contains('is-open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openChecks(positiveId(tableButton.getAttribute('data-cql-table')));
      return;
    }

    if (target.closest('[data-cq22-close]')) {
      event.preventDefault();
      closeChecks();
      return;
    }

    var open = target.closest('[data-cq22-open]');
    if (open) {
      event.preventDefault();
      openExactOrder(open.getAttribute('data-table-id'), open.getAttribute('data-cq22-open'), false);
      return;
    }

    var pay = target.closest('[data-cq22-pay]');
    if (pay) {
      event.preventDefault();
      openExactOrder(pay.getAttribute('data-table-id'), pay.getAttribute('data-cq22-pay'), true);
      return;
    }

    if (target.closest('[data-cq22-pos-back]')) {
      event.preventDefault();
      if (window.PMDWaiterStandardV2 && typeof window.PMDWaiterStandardV2.closeTable === 'function') {
        window.PMDWaiterStandardV2.closeTable();
      }
      return;
    }

    if (target.closest('[data-cq22-pos-note]')) {
      event.preventDefault();
      openNote();
      return;
    }

    if (target.closest('[data-cq22-pos-pay]')) {
      event.preventDefault();
      if (activePos && typeof activePos.openPayment === 'function') activePos.openPayment();
      return;
    }

    if (target.closest('[data-cq22-pos-free]')) {
      event.preventDefault();
      freeTable(activeTableId);
      return;
    }

    var mobileBar = target.closest('[data-v2-pos-host] [data-pos-mobile-cart]');
    if (mobileBar && modifierOpen()) {
      var modalAdd = document.querySelector('[data-v2-pos-host] [data-pos-modal-add]');
      if (modalAdd) {
        event.preventDefault();
        event.stopImmediatePropagation();
        modalAdd.click();
        requestAnimationFrame(syncMobileAddBridge);
      }
      return;
    }

    if (
      target.closest('[data-v2-pos-host] [data-menu-item], [data-v2-pos-host] [data-pos-menu-item], [data-v2-pos-host] [data-pos-modal-close], [data-v2-pos-host] [data-pos-modal-cancel], [data-v2-pos-host] [data-pos-modal-add]')
    ) {
      requestAnimationFrame(syncMobileAddBridge);
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.body.classList.contains('pmd-cq22-sheet-open')) {
      closeChecks();
    }
  });

  window.PMDCashierQuickV22R43 = {
    version: '2.2.0-r43',
    inspect: function () {
      return {
        route: window.location.pathname,
        v21Launcher: Boolean(document.querySelector('[data-pmd-cashier-quick-launcher-v21]')),
        currentChecks: true,
        exactOrderOpen: true,
        exactPaymentOpen: true,
        waiterPaymentAuthority: 'Admin.Payments fixed-role permission',
        freeTableAuthority: '/admin/pmd-waiter-pos-v22/tables/{id}/free',
        quickPoller: false,
        quickMutationObserver: false
      };
    }
  };

  console.info('[PMD] Cashier Quick V2.2 R43 ready', window.PMDCashierQuickV22R43.inspect());
})();
