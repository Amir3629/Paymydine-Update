(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_TABLE_STATE_V154) return;
  window.PMD_WAITER_TABLE_STATE_V154 = true;

  var ENDPOINT = '/admin/pmd-waiter-table-states-v154';
  var TABLE_SELECTOR = '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]';
  var state = {
    loading: false,
    updates: 0,
    lastError: null,
    lastUpdatedAt: null,
    tables: [],
    byNumber: new Map(),
    modal: null
  };

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function isEditing() {
    var r = root();
    return !!(r && r.classList.contains('pmd-w19-editing'));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }

  function tableNumber(el) {
    return String(el && el.getAttribute('data-table') || '').replace(/^table\s*/i, '').trim();
  }

  function money(value) {
    var amount = Number(value || 0);
    return '€' + (isFinite(amount) ? amount : 0).toFixed(2);
  }

  function shortOrderLabel(value) {
    var text = String(value || 'No order').trim();
    if (/no active order|no order/i.test(text)) return 'No order';
    if (/received|new/i.test(text)) return 'New';
    if (/prepar|cook|kitchen/i.test(text)) return 'Preparing';
    if (/ready|serve/i.test(text)) return 'Ready';
    if (/served/i.test(text)) return 'Served';
    if (/cancel|void/i.test(text)) return 'Cancelled';
    return text.length > 11 ? text.slice(0, 10) + '…' : text;
  }

  function paymentTitle(info) {
    if (!info || info.payment_status === 'none') return 'Payment: no bill';
    return [
      'Payment: ' + info.payment_status_label,
      'Total ' + money(info.order_total),
      'Paid ' + money(info.settled_amount),
      'Due ' + money(info.amount_due)
    ].join(' · ');
  }

  function ensureStack(table, info) {
    var stack = table.querySelector(':scope > .pmd-v154-state-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'pmd-v154-state-stack';
      stack.innerHTML = [
        '<button type="button" class="pmd-v154-table-chip" aria-label="Change table status"></button>',
        '<span class="pmd-v154-payment-chip"></span>',
        '<span class="pmd-v154-order-chip"></span>'
      ].join('');
      table.appendChild(stack);
    }

    var tableChip = stack.querySelector('.pmd-v154-table-chip');
    var paymentChip = stack.querySelector('.pmd-v154-payment-chip');
    var orderChip = stack.querySelector('.pmd-v154-order-chip');

    tableChip.textContent = info.table_status_label;
    tableChip.title = 'Table status: ' + info.table_status_label + '. Click to change.';
    tableChip.setAttribute('data-table-id', String(info.table_id || ''));
    tableChip.setAttribute('data-table-number', String(info.table_number || ''));

    paymentChip.textContent = info.payment_status_label;
    paymentChip.title = paymentTitle(info);
    paymentChip.setAttribute('data-payment-state', info.payment_status || 'none');

    orderChip.textContent = shortOrderLabel(info.order_status_label);
    orderChip.title = 'Order status: ' + String(info.order_status_label || 'No active order');
    orderChip.setAttribute('data-order-state', info.order_status || 'none');

    if (!tableChip.__pmdV154Bound) {
      tableChip.__pmdV154Bound = true;
      tableChip.addEventListener('pointerdown', function (event) {
        event.stopPropagation();
      }, true);
      tableChip.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (isEditing()) return;
        var current = state.byNumber.get(String(tableChip.getAttribute('data-table-number') || ''));
        if (current) openModal(current);
      }, true);
    }
  }

  function apply() {
    document.querySelectorAll(TABLE_SELECTOR).forEach(function (table) {
      var number = tableNumber(table);
      var info = state.byNumber.get(number);
      if (!info) return;

      table.setAttribute('data-pmd-v154-table-state', info.table_status || 'available');
      table.setAttribute('data-pmd-v154-payment-state', info.payment_status || 'none');
      table.setAttribute('data-pmd-v154-order-state', info.order_status || 'none');
      table.setAttribute('data-pmd-v154-table-id', String(info.table_id || ''));
      table.classList.add('pmd-v154-table-state-ready');

      ensureStack(table, info);
    });

    updateLegend();
  }

  function updateLegend() {
    var legend = document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-legend');
    if (!legend) return;

    legend.setAttribute('data-pmd-v154-legend', '1');
    legend.innerHTML = [
      '<h4>Floor status guide</h4>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-available"></span><div><b>Green · Available</b><br>Ready for a new guest.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-occupied"></span><div><b>Red · Occupied</b><br>Guest is still using the table.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-cleaning"></span><div><b>Orange · Needs Cleaning</b><br>Customer left; table is not ready.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-reserved"></span><div><b>Blue · Reserved</b><br>Held for an upcoming guest.</div></div>',
      '<div class="pmd-v154-legend-note"><b>Payment is separate.</b> Paid does not make a table available.</div>'
    ].join('');
  }

  function rebuildIndex(tables) {
    state.tables = Array.isArray(tables) ? tables : [];
    state.byNumber = new Map();
    state.tables.forEach(function (info) {
      state.byNumber.set(String(info.table_number || ''), info);
    });
  }

  function refresh(force) {
    if (state.loading || (isEditing() && !force)) return Promise.resolve(null);
    state.loading = true;

    return fetch(ENDPOINT + '?_=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error(data && data.message ? data.message : 'Invalid table-state response');
        rebuildIndex(data.tables);
        state.updates++;
        state.lastError = null;
        state.lastUpdatedAt = new Date().toISOString();
        apply();
        return data;
      })
      .catch(function (error) {
        state.lastError = String(error && error.message ? error.message : error);
        console.warn('[PMD] Waiter table state v154 refresh failed:', state.lastError);
        return null;
      })
      .finally(function () {
        state.loading = false;
      });
  }

  function transitionActions(info) {
    var current = info.table_status;
    if (current === 'available') {
      return [
        { status: 'occupied', label: 'Seat guest · Mark Occupied', reason: 'guest_seated' },
        { status: 'reserved', label: 'Reserve Table', reason: 'table_reserved' }
      ];
    }
    if (current === 'occupied') {
      return [
        { status: 'cleaning', label: 'Customer Left · Needs Cleaning', reason: 'customer_left' },
        { status: 'available', label: 'Customer Left · Available', reason: 'customer_left_skip_cleaning', skip_cleaning: true, confirm: 'Skip cleaning and mark this table available?' }
      ];
    }
    if (current === 'cleaning') {
      return [
        { status: 'available', label: 'Cleaning Complete · Available', reason: 'cleaning_complete' },
        { status: 'occupied', label: 'Guest Seated Again · Occupied', reason: 'guest_seated' }
      ];
    }
    if (current === 'reserved') {
      return [
        { status: 'occupied', label: 'Guests Arrived · Occupied', reason: 'reserved_guests_seated' },
        { status: 'available', label: 'Cancel Reservation · Available', reason: 'reservation_cancelled' }
      ];
    }
    return [];
  }

  function ensureModal() {
    if (state.modal && document.body.contains(state.modal)) return state.modal;

    var modal = document.createElement('div');
    modal.className = 'pmd-v154-modal';
    modal.innerHTML = [
      '<div class="pmd-v154-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-v154-modal-title">',
        '<button type="button" class="pmd-v154-modal-close" aria-label="Close">×</button>',
        '<div class="pmd-v154-modal-kicker">TABLE OPERATIONS</div>',
        '<h3 id="pmd-v154-modal-title">Table</h3>',
        '<div class="pmd-v154-modal-summary"></div>',
        '<div class="pmd-v154-modal-actions"></div>',
        '<div class="pmd-v154-modal-message" aria-live="polite"></div>',
      '</div>'
    ].join('');

    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('.pmd-v154-modal-close')) {
        closeModal();
      }
    });

    document.body.appendChild(modal);
    state.modal = modal;
    return modal;
  }

  function openModal(info) {
    var modal = ensureModal();
    modal.__pmdV154TableInfo = info;
    modal.querySelector('#pmd-v154-modal-title').textContent = info.table_label || ('Table ' + info.table_number);
    modal.querySelector('.pmd-v154-modal-summary').innerHTML = [
      '<div><small>Table status</small><strong class="is-table">' + esc(info.table_status_label) + '</strong></div>',
      '<div><small>Order status</small><strong>' + esc(info.order_status_label) + '</strong></div>',
      '<div><small>Payment</small><strong class="is-payment">' + esc(info.payment_status_label) + '</strong></div>',
      '<div><small>Amount due</small><strong>' + esc(money(info.amount_due)) + '</strong></div>'
    ].join('');

    var actions = transitionActions(info);
    var holder = modal.querySelector('.pmd-v154-modal-actions');
    holder.innerHTML = actions.map(function (action, index) {
      return '<button type="button" data-action-index="' + index + '" class="pmd-v154-modal-action">' + esc(action.label) + '</button>';
    }).join('');

    holder.querySelectorAll('[data-action-index]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = actions[Number(button.getAttribute('data-action-index'))];
        if (!action) return;
        if (action.confirm && !window.confirm(action.confirm)) return;
        updateStatus(info, action, modal);
      });
    });

    modal.querySelector('.pmd-v154-modal-message').textContent = 'Payment and table availability are independent.';
    modal.classList.add('is-open');
  }

  function closeModal() {
    if (state.modal) state.modal.classList.remove('is-open');
  }

  function updateStatus(info, action, modal) {
    var message = modal.querySelector('.pmd-v154-modal-message');
    var buttons = modal.querySelectorAll('button');
    buttons.forEach(function (button) { button.disabled = true; });
    message.textContent = 'Updating table status…';

    fetch(ENDPOINT + '/' + encodeURIComponent(info.table_id), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      },
      body: JSON.stringify({
        status: action.status,
        reason: action.reason,
        skip_cleaning: !!action.skip_cleaning
      })
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || ('HTTP ' + response.status));
          return data;
        });
      })
      .then(function () {
        message.textContent = 'Table status updated.';
        return refresh(true);
      })
      .then(function () {
        setTimeout(closeModal, 250);
      })
      .catch(function (error) {
        message.textContent = String(error && error.message ? error.message : error);
      })
      .finally(function () {
        buttons.forEach(function (button) { button.disabled = false; });
      });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    setTimeout(function () {
      apply();
      refresh(false);
    }, 80);
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh(false);
  });

  refresh(true);
  setTimeout(function () { refresh(true); }, 700);
  setInterval(function () { refresh(false); }, 15000);

  window.PMDWaiterTableStateV154 = {
    refresh: function () { return refresh(true); },
    apply: apply,
    debug: function () {
      return {
        version: 'pmd-waiter-table-state-v154',
        active: true,
        loading: state.loading,
        updates: state.updates,
        lastError: state.lastError,
        lastUpdatedAt: state.lastUpdatedAt,
        tableCount: state.tables.length,
        states: state.tables.map(function (info) {
          return {
            table: info.table_number,
            tableStatus: info.table_status,
            storedTableStatus: info.stored_table_status,
            orderStatus: info.order_status_label,
            paymentStatus: info.payment_status,
            due: info.amount_due
          };
        })
      };
    }
  };

  console.info('[PMD] Waiter table/order/payment states v154 active');
})();
