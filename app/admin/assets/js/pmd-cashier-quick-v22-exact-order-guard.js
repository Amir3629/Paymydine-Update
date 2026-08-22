(function () {
  'use strict';

  // PMD_CASHIER_QUICK_EXACT_ORDER_GUARD_R43
  // Waiter POS restores a table draft after reading boot.active_order_id. Keep
  // that draft's activeOrderId aligned with the exact check chosen in Quick
  // Mode so Open/Edit and Pay cannot silently fall back to another check.
  if (window.PMDCashierQuickExactOrderGuardR43) return;
  if (window.location.pathname !== '/admin/cashierlab') return;

  var pending = null;

  function positiveId(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function rememberFromButton(button) {
    if (!button) return;
    var orderId = positiveId(
      button.getAttribute('data-cq22-open')
      || button.getAttribute('data-cq22-pay')
    );
    var tableId = positiveId(button.getAttribute('data-table-id'));
    if (!orderId || !tableId) return;
    pending = {orderId: orderId, tableId: tableId};
  }

  window.addEventListener('click', function (event) {
    var target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-cq22-open], [data-cq22-pay]')
      : null;
    if (target) rememberFromButton(target);
  }, true);

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    var tableId = positiveId(detail.tableId || (detail.pos && detail.pos.state && detail.pos.state.table && detail.pos.state.table.id));
    if (!pending || !tableId || tableId !== pending.tableId) return;

    var key = 'pmd-waiter-pos-v2:' + location.host + ':table:' + String(tableId);
    try {
      var raw = JSON.parse(localStorage.getItem(key) || 'null');
      if (raw && typeof raw === 'object') {
        raw.activeOrderId = pending.orderId;
        raw.savedAt = Date.now();
        localStorage.setItem(key, JSON.stringify(raw));
      }
    } catch (error) {}
  });

  window.PMDCashierQuickExactOrderGuardR43 = {
    version: '1.0.0-r43',
    inspect: function () {
      return {pending: pending, polling: false, mutationObserver: false};
    }
  };
})();
