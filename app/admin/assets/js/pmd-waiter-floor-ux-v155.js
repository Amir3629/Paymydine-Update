(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_FLOOR_UX_V155) return;
  window.PMD_WAITER_FLOOR_UX_V155 = true;

  var ENDPOINT = '/admin/pmd-waiter-table-states-v154';
  var state = {
    loading: false,
    updates: 0,
    lastError: null,
    tables: [],
    byNumber: new Map(),
    confirmTimer: null
  };

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }

  function tableNumber(el) {
    return clean(el && el.getAttribute('data-table')).replace(/^table\s*/i, '');
  }

  function selectedTableNumber() {
    var r = root();
    if (!r) return '';

    var selected = r.querySelector(
      '.pmd-w5-floor-map-real .pmd-w5-table[data-table].is-selected,' +
      '.pmd-w5-floor-map-real .pmd-w5-table[data-table].pmd-w12-selected,' +
      '.pmd-w5-floor-map-real .pmd-w5-table[data-table].pmd-w19-selected'
    );
    if (selected) return tableNumber(selected);

    var note = r.querySelector('.pmd-w5-selected-note.is-show');
    var match = clean(note && note.textContent).match(/selected table:\s*table\s*([^\s]+)/i);
    return match ? clean(match[1]) : '';
  }

  function rebuildIndex(tables) {
    state.tables = Array.isArray(tables) ? tables : [];
    state.byNumber = new Map();
    state.tables.forEach(function (info) {
      state.byNumber.set(clean(info.table_number), info);
    });
  }

  function shortOrder(value) {
    var text = clean(value || '');
    if (!text || /no active order|no order/i.test(text)) return '';
    if (/received|new/i.test(text)) return 'NEW';
    if (/prepar|cook|kitchen/i.test(text)) return 'PREPARING';
    if (/ready/i.test(text)) return 'READY';
    if (/served/i.test(text)) return 'SERVED';
    return text.toUpperCase().slice(0, 12);
  }

  function decorateTable(table, info) {
    if (!table || !info) return;

    table.setAttribute('data-pmd-v155-ready', '1');
    table.setAttribute('data-pmd-v155-table-state', info.table_status || 'available');
    table.setAttribute('data-pmd-v155-payment-state', info.payment_status || 'none');
    table.setAttribute('data-pmd-v155-order-state', info.order_status || 'none');
    table.title = [
      info.table_label || ('Table ' + info.table_number),
      'Table: ' + (info.table_status_label || 'Available'),
      info.order_status_label && info.order_status !== 'none' ? 'Order: ' + info.order_status_label : '',
      info.payment_status && info.payment_status !== 'none' ? 'Payment: ' + info.payment_status_label : ''
    ].filter(Boolean).join(' · ');

    var stack = table.querySelector(':scope > .pmd-v154-state-stack');
    if (!stack) return;

    var tableChip = stack.querySelector('.pmd-v154-table-chip');
    var paymentChip = stack.querySelector('.pmd-v154-payment-chip');
    var orderChip = stack.querySelector('.pmd-v154-order-chip');

    if (tableChip) {
      tableChip.tabIndex = -1;
      tableChip.setAttribute('aria-hidden', 'true');
    }

    if (paymentChip) {
      var payment = clean(info.payment_status).toLowerCase();
      paymentChip.textContent = payment === 'paid' ? 'PAID' : (payment === 'partial' ? 'PARTIAL' : '');
      paymentChip.hidden = payment !== 'paid' && payment !== 'partial';
    }

    if (orderChip) {
      var label = shortOrder(info.order_status_label);
      orderChip.textContent = label;
      orderChip.hidden = !label;
    }
  }

  function decorateTables() {
    var r = root();
    if (!r) return;

    r.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (table) {
      var info = state.byNumber.get(tableNumber(table));
      if (info) decorateTable(table, info);
    });

    document.querySelectorAll('.pmd-v154-modal').forEach(function (modal) { modal.remove(); });
    decorateLegend();
    renderQuickActions();
  }

  function decorateLegend() {
    var legend = document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-legend');
    var button = document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-info-btn');
    if (button) {
      button.textContent = 'i';
      button.title = 'Floor status guide';
    }
    if (!legend || legend.getAttribute('data-pmd-v155-legend') === '1') return;

    legend.setAttribute('data-pmd-v155-legend', '1');
    legend.innerHTML = [
      '<h4>Floor status</h4>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-available"></span><div><b>Available</b><br>Ready for a guest.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-occupied"></span><div><b>Occupied</b><br>Guest is using the table.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-cleaning"></span><div><b>Needs cleaning</b><br>Not ready for seating.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-reserved"></span><div><b>Reserved</b><br>Held for an arrival.</div></div>',
      '<div class="pmd-v155-legend-ribbon"><span>PAID</span><span>PARTIAL</span> Payment ribbon appears only after money is recorded.</div>'
    ].join('');
  }

  function actionsFor(info) {
    if (!info) return [];
    if (info.table_status === 'occupied') {
      return [
        {status:'cleaning', label:'Needs cleaning', reason:'customer_left'},
        {status:'available', label:'Mark available', reason:'customer_left_skip_cleaning', skip_cleaning:true, confirm:true}
      ];
    }
    if (info.table_status === 'cleaning') {
      return [
        {status:'available', label:'Cleaning complete', reason:'cleaning_complete'},
        {status:'occupied', label:'Seat guest', reason:'guest_seated'}
      ];
    }
    if (info.table_status === 'reserved') {
      return [
        {status:'occupied', label:'Guests arrived', reason:'reserved_guests_seated'},
        {status:'available', label:'Release table', reason:'reservation_cancelled', confirm:true}
      ];
    }
    return [
      {status:'occupied', label:'Mark occupied', reason:'guest_seated'},
      {status:'reserved', label:'Reserve', reason:'table_reserved'}
    ];
  }

  function statusTone(status) {
    return ['available','occupied','cleaning','reserved'].indexOf(status) >= 0 ? status : 'available';
  }

  function renderQuickActions() {
    var r = root();
    if (!r) return;

    var tabs = r.querySelector('section.pmd-w5-board .pmd-w5-tabs') || r.querySelector('.pmd-w5-tabs');
    if (!tabs) return;

    tabs.querySelectorAll(':scope > .pmd-v155-table-actions').forEach(function (node) { node.remove(); });

    var number = selectedTableNumber();
    var info = state.byNumber.get(number);
    if (!number || !info) return;

    var holder = document.createElement('div');
    holder.className = 'pmd-v155-table-actions';
    holder.setAttribute('data-table-number', number);
    holder.innerHTML = [
      '<span class="pmd-v155-selected-status is-' + esc(statusTone(info.table_status)) + '">',
        '<b>Table ' + esc(number) + '</b>',
        '<small>' + esc(info.table_status_label || info.table_status) + '</small>',
      '</span>',
      actionsFor(info).map(function (action, index) {
        return '<button type="button" class="pmd-v155-status-action" data-pmd-v155-action="' + index + '">' + esc(action.label) + '</button>';
      }).join(''),
      '<span class="pmd-v155-action-message" aria-live="polite"></span>'
    ].join('');

    tabs.appendChild(holder);
    var actions = actionsFor(info);
    holder.querySelectorAll('[data-pmd-v155-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = actions[Number(button.getAttribute('data-pmd-v155-action'))];
        if (!action) return;

        if (action.confirm && button.getAttribute('data-confirm-ready') !== '1') {
          holder.querySelectorAll('[data-confirm-ready]').forEach(function (other) {
            other.removeAttribute('data-confirm-ready');
            other.textContent = actions[Number(other.getAttribute('data-pmd-v155-action'))].label;
          });
          button.setAttribute('data-confirm-ready', '1');
          button.textContent = 'Confirm ' + action.label.toLowerCase();
          clearTimeout(state.confirmTimer);
          state.confirmTimer = setTimeout(function () {
            button.removeAttribute('data-confirm-ready');
            button.textContent = action.label;
          }, 4000);
          return;
        }

        updateStatus(info, action, holder);
      });
    });
  }

  function updateStatus(info, action, holder) {
    var message = holder.querySelector('.pmd-v155-action-message');
    var buttons = holder.querySelectorAll('button');
    buttons.forEach(function (button) { button.disabled = true; });
    message.textContent = 'Updating…';
    message.classList.remove('is-error', 'is-success');

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
        message.textContent = 'Updated';
        message.classList.add('is-success');
        return refresh(true);
      })
      .catch(function (error) {
        message.textContent = clean(error && error.message ? error.message : error);
        message.classList.add('is-error');
      })
      .finally(function () {
        buttons.forEach(function (button) { button.disabled = false; });
      });
  }

  function refresh(force) {
    if (state.loading) return Promise.resolve(null);
    if (!force && document.hidden) return Promise.resolve(null);
    state.loading = true;

    return fetch(ENDPOINT + '?v155=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {Accept:'application/json','X-Requested-With':'XMLHttpRequest'}
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
        decorateTables();
        return data;
      })
      .catch(function (error) {
        state.lastError = clean(error && error.message ? error.message : error);
        console.warn('[PMD] Waiter floor UX v155 refresh failed:', state.lastError);
        decorateTables();
        return null;
      })
      .finally(function () { state.loading = false; });
  }

  // V154's large modal is replaced by inline actions. Its trigger is made
  // non-interactive by CSS; this capture guard also protects against cached CSS.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || !target.closest('.pmd-v154-table-chip')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    var table = target.closest('.pmd-w5-table[data-table]');
    if (table) table.click();
  }, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    setTimeout(function () { decorateTables(); refresh(false); }, 90);
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh(true);
  });

  window.PMDWaiterFloorUXV155 = {
    refresh: function () { return refresh(true); },
    apply: decorateTables,
    debug: function () {
      return {
        version: 'pmd-waiter-floor-ux-v155',
        active: true,
        tableCount: state.tables.length,
        selectedTable: selectedTableNumber(),
        updates: state.updates,
        lastError: state.lastError,
        modalCount: document.querySelectorAll('.pmd-v154-modal').length,
        quickActionBars: document.querySelectorAll('.pmd-v155-table-actions').length,
        visibleUnpaidChips: Array.from(document.querySelectorAll('.pmd-v154-payment-chip[data-payment-state="unpaid"]')).filter(function (el) {
          return getComputedStyle(el).display !== 'none';
        }).length
      };
    }
  };

  refresh(true);
  setTimeout(function () { refresh(true); }, 700);
  setInterval(function () { refresh(false); }, 15000);
  console.info('[PMD] Waiter floor UX v155 active');
})();
