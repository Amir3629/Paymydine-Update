(function () {
  'use strict';

  if (window.PMDWaiterFinalV11) return;

  var root = document.querySelector('[data-pmd-waiter-final-root]');
  if (!root) return;

  var drawer = root.querySelector('[data-final-drawer]');
  var alertsButton = root.querySelector('[data-final-alerts]');
  var repairedMounts = 0;
  var repairedOrders = 0;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function firstOrderId(orders) {
    if (!Array.isArray(orders)) return null;
    for (var index = 0; index < orders.length; index += 1) {
      var order = orders[index] || {};
      var candidate = order.order_id || order.id;
      if (candidate != null && clean(candidate) !== '') return candidate;
    }
    return null;
  }

  function normalizeBootstrap(boot) {
    boot = boot || {};
    if (!boot.active_order_id) {
      var orderId = firstOrderId(boot.open_orders);
      if (orderId) {
        boot.active_order_id = orderId;
        repairedOrders += 1;
      }
    }
    return boot;
  }

  function repairMountedInstance(instance, table) {
    if (!instance || !instance.state) return;

    var state = instance.state;
    var candidate = state.activeOrderId || firstOrderId(state.openOrders);
    var latest = table && table.latestOrder ? table.latestOrder : null;

    if (!candidate && latest) candidate = latest.order_id || latest.id;

    if (candidate && !state.activeOrderId) {
      state.activeOrderId = candidate;
      repairedOrders += 1;
    }

    var posRoot = state.root || document;
    var payment = posRoot.querySelector && posRoot.querySelector('[data-pos-payment]');
    var edit = posRoot.querySelector && posRoot.querySelector('[data-pos-edit-order]');
    var print = posRoot.querySelector && posRoot.querySelector('[data-pos-print]');
    var hasUnsentItems = Array.isArray(state.cart) && state.cart.length > 0;

    if (state.activeOrderId) {
      if (payment) payment.disabled = hasUnsentItems;
      if (edit) edit.disabled = false;
      if (print) print.disabled = false;
    }
  }

  function installMountGuard() {
    var app = window.PMDWaiterPOSApp;
    if (!app || typeof app.mount !== 'function' || app.__pmdFinalV11Wrapped) return false;

    var originalMount = app.mount;
    app.mount = function (posRoot, boot, options) {
      var instance = originalMount.call(app, posRoot, normalizeBootstrap(boot), options || {});
      repairedMounts += 1;
      repairMountedInstance(instance, null);
      return instance;
    };
    app.__pmdFinalV11Wrapped = true;
    return true;
  }

  function setDrawerInteractive(open) {
    if (!drawer) return;

    if (open) {
      drawer.removeAttribute('inert');
      drawer.setAttribute('aria-hidden', 'false');
      return;
    }

    if (drawer.contains(document.activeElement) && alertsButton) alertsButton.focus();
    drawer.setAttribute('inert', '');
    drawer.setAttribute('aria-hidden', 'true');
  }

  function openAuthenticatedWindow(url, name) {
    var popup = window.open(url, name || '_blank');
    if (popup && typeof popup.focus === 'function') popup.focus();
  }

  if (drawer && !drawer.classList.contains('is-open')) setDrawerInteractive(false);
  installMountGuard();

  root.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;

    if (target.closest('[data-final-alerts]')) {
      setDrawerInteractive(true);
      return;
    }

    if (target.closest('[data-final-close-drawer]')) {
      setTimeout(function () { setDrawerInteractive(false); }, 0);
      return;
    }

    if (target.closest('[data-final-reservations]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAuthenticatedWindow(root.getAttribute('data-reservations-url') || '/admin/reservations', 'pmdReservations');
      return;
    }

    if (target.closest('[data-final-floor-operations]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAuthenticatedWindow(root.getAttribute('data-floor-operations-url') || '/admin/dashboardwaiter', 'pmdTableOperations');
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && drawer && drawer.classList.contains('is-open')) {
      setTimeout(function () { setDrawerInteractive(false); }, 0);
    }
  }, true);

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    repairMountedInstance(detail.pos || window.PMDWaiterPOS, detail.table || null);
  });

  setTimeout(function () {
    installMountGuard();

    var api = window.PMDWaiterFinalV1;
    if (api && typeof api.openAlerts === 'function' && !api.__pmdFinalV11Wrapped) {
      var originalOpenAlerts = api.openAlerts;
      api.openAlerts = function () {
        setDrawerInteractive(true);
        return originalOpenAlerts.apply(api, arguments);
      };
      api.__pmdFinalV11Wrapped = true;
    }
  }, 0);

  window.PMDWaiterFinalV11 = {
    version: 'pmd-waiter-final-v1.1',
    active: true,
    repair: function () {
      installMountGuard();
      repairMountedInstance(window.PMDWaiterPOS, null);
      setDrawerInteractive(!!(drawer && drawer.classList.contains('is-open')));
    },
    debug: function () {
      var pos = window.PMDWaiterPOS;
      return {
        version: 'pmd-waiter-final-v1.1',
        active: true,
        drawerInert: !!(drawer && drawer.hasAttribute('inert')),
        drawerOpen: !!(drawer && drawer.classList.contains('is-open')),
        mountGuard: !!(window.PMDWaiterPOSApp && window.PMDWaiterPOSApp.__pmdFinalV11Wrapped),
        repairedMounts: repairedMounts,
        repairedOrders: repairedOrders,
        activeOrderId: pos && pos.state ? pos.state.activeOrderId : null,
        openOrders: pos && pos.state && Array.isArray(pos.state.openOrders) ? pos.state.openOrders.length : null
      };
    }
  };

  console.info('[PMD] Waiter Final V1.1 QA fixes active');
})();
