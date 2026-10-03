(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_POS_DASHBOARD_DIRECT_GUARD_V23) return;
  window.PMD_WAITER_POS_DASHBOARD_DIRECT_GUARD_V23 = true;

  var guardedCount = 0;
  var lastAction = null;
  var bindTimer = null;

  function visible(element) {
    if (!element || !element.getBoundingClientRect) return false;
    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0.01 &&
      rect.width > 1 && rect.height > 1;
  }

  function floorIsActuallyEditing() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return false;
    if (root.classList.contains('pmd-w19-editing')) return true;
    if (root.classList.contains('pmd-v50-floor-dragging')) return true;
    if (document.documentElement.classList.contains('pmd-waiter-floor-editing')) return true;

    var save = root.querySelector('[data-w19-save]');
    var cancel = root.querySelector('[data-w19-cancel]');
    return visible(save) || visible(cancel);
  }

  function bridge() {
    return window.PMDWaiterPOSBridge || null;
  }

  function tableHasOrders(button) {
    var api = bridge();
    if (api && typeof api.tableHasOrders === 'function') {
      try { return !!api.tableHasOrders(button); } catch (e) {}
    }
    if (!button) return false;
    if (button.querySelector('small')) return true;
    return [
      'is-active', 'active', 'has-orders', 'busy', 'is-busy',
      'is-ready', 'ready', 'is-payment', 'payment', 'waiting',
      'is-urgent', 'urgent', 'needs', 'attention'
    ].some(function (name) { return button.classList.contains(name); });
  }

  function selectedTable() {
    var api = bridge();
    if (api && typeof api.selectedTable === 'function') {
      try {
        var selected = api.selectedTable();
        if (selected != null && String(selected).trim()) return String(selected).trim();
      } catch (e) {}
    }

    try {
      if (window.PMDWaiterDashboard && typeof window.PMDWaiterDashboard.debug === 'function') {
        var debug = window.PMDWaiterDashboard.debug();
        if (debug && debug.selectedTable != null && String(debug.selectedTable).trim()) {
          return String(debug.selectedTable).trim();
        }
      }
    } catch (e) {}

    var node = document.querySelector(
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table.is-selected[data-table]'
    );
    return node ? String(node.getAttribute('data-table') || '').trim() : '';
  }

  function stopLegacy(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function openTable(tableNo, source) {
    tableNo = String(tableNo || '').trim();
    if (!tableNo) return;
    lastAction = {type: 'table', table: tableNo, source: source, at: new Date().toISOString()};

    var api = bridge();
    if (api && typeof api.open === 'function') {
      api.open(tableNo);
      return;
    }

    // Safe fallback: use the authenticated standalone admin POS, never the customer menu.
    window.location.href = '/admin/waiter-pos/' + encodeURIComponent(tableNo);
  }

  function openNewOrder(source) {
    lastAction = {type: 'new-order', source: source, at: new Date().toISOString()};
    var api = bridge();
    if (api && typeof api.openNewOrder === 'function') {
      api.openNewOrder();
      return;
    }

    var tableNo = selectedTable();
    if (tableNo) {
      openTable(tableNo, source + ':selected');
      return;
    }

    console.error('[PMD] Waiter POS bridge is unavailable; New Order was blocked to prevent customer-menu navigation.');
    alert('The Waiter POS is still loading. Please try New Order again in a moment.');
  }

  function classify(element) {
    if (!element || !element.matches) return null;
    if (element.matches('#pmd-waiter-dashboard-root [data-new-order]')) {
      return {type: 'new-order'};
    }
    if (element.matches('#pmd-waiter-dashboard-root [data-add-table]')) {
      return {type: 'add-order', table: element.getAttribute('data-add-table')};
    }
    if (element.matches('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]')) {
      if (tableHasOrders(element)) return {type: 'occupied-table'};
      return {type: 'free-table', table: element.getAttribute('data-table')};
    }
    return null;
  }

  function guard(element) {
    if (!element || element.__pmdWaiterPosDirectGuardV23) return;
    element.__pmdWaiterPosDirectGuardV23 = true;
    element.dataset.pmdPosDirectGuard = 'v23';
    guardedCount += 1;

    element.addEventListener('click', function (event) {
      var action = classify(element);
      if (!action || action.type === 'occupied-table') return;
      if (floorIsActuallyEditing()) return;

      stopLegacy(event);

      if (action.type === 'new-order') {
        openNewOrder('direct-guard');
        return;
      }

      openTable(action.table, 'direct-guard:' + action.type);
    }, true);
  }

  function bind() {
    if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    root.querySelectorAll(
      '[data-new-order], [data-add-table], .pmd-w5-floor-map-real .pmd-w5-table[data-table]'
    ).forEach(guard);
  }

  function scheduleBind() {
    if (bindTimer) window.clearTimeout(bindTimer);
    bindTimer = window.setTimeout(function () {
      bindTimer = null;
      bind();
    }, 0);
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', scheduleBind, true);
  document.addEventListener('DOMContentLoaded', scheduleBind, {once: true});
  scheduleBind();
  window.setTimeout(bind, 250);
  window.setTimeout(bind, 1000);

  window.PMDWaiterPOSDashboardDirectGuardV23 = {
    version: 'pmd-waiter-pos-dashboard-direct-guard-v23',
    bind: bind,
    isEditing: floorIsActuallyEditing,
    debug: function () {
      var root = document.querySelector('#pmd-waiter-dashboard-root');
      return {
        version: 'pmd-waiter-pos-dashboard-direct-guard-v23',
        active: true,
        bridgeVersion: bridge() && bridge().version || null,
        actuallyEditing: floorIsActuallyEditing(),
        guardedCount: guardedCount,
        liveGuardedElements: root ? root.querySelectorAll('[data-pmd-pos-direct-guard="v23"]').length : 0,
        selectedTable: selectedTable() || null,
        lastAction: lastAction
      };
    }
  };

  console.info('[PMD] Waiter POS dashboard direct guard v23 active');
})();
