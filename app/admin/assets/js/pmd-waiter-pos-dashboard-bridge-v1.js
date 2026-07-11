(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V1) return;
  window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V1 = true;

  function rootIsEditing() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    return !!(root && (
      root.classList.contains('pmd-w19-editing') ||
      root.classList.contains('pmd-v50-floor-dragging')
    ));
  }

  function tableHasOrders(button) {
    if (!button) return false;
    if (button.querySelector('small')) return true;
    return [
      'is-active', 'active', 'has-orders', 'busy', 'is-busy',
      'is-ready', 'ready', 'is-payment', 'payment', 'waiting',
      'is-urgent', 'urgent', 'needs', 'attention'
    ].some(function (name) { return button.classList.contains(name); });
  }

  function posUrl(tableNo) {
    return '/admin/waiter-pos/' + encodeURIComponent(String(tableNo || '').trim());
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || rootIsEditing()) return;

    var addButton = target.closest('#pmd-waiter-dashboard-root [data-add-table]');
    if (addButton) {
      var addTable = addButton.getAttribute('data-add-table');
      if (!addTable) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      location.href = posUrl(addTable);
      return;
    }

    var tableButton = target.closest('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]');
    if (!tableButton || tableHasOrders(tableButton)) return;

    var tableNo = tableButton.getAttribute('data-table');
    if (!tableNo) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    location.href = posUrl(tableNo);
  }, true);

  window.PMDWaiterPOSBridge = {
    urlForTable: posUrl,
    tableHasOrders: tableHasOrders,
    debug: function () {
      var tables = Array.prototype.slice.call(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]'));
      return {
        version: 'pmd-waiter-pos-dashboard-bridge-v1',
        active: true,
        route: location.pathname,
        tableCount: tables.length,
        freeTables: tables.filter(function (table) { return !tableHasOrders(table); }).map(function (table) { return table.dataset.table; }),
        occupiedTables: tables.filter(tableHasOrders).map(function (table) { return table.dataset.table; })
      };
    }
  };

  console.info('[PMD] Waiter POS dashboard bridge v1 active');
})();
