(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V2) return;
  window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V2 = true;
  window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V1 = true;

  var overlay = null;
  var posInstance = null;
  var loadingTable = null;
  var lastFocused = null;

  function rootIsEditing() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    return !!(root && (
      root.classList.contains('pmd-w19-editing') ||
      root.classList.contains('pmd-v50-floor-dragging') ||
      root.querySelector('[data-w19-save]:not([hidden])')
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

  function overlayUrl(tableNo) {
    return '/admin/pmd-waiter-pos-v1/overlay/' + encodeURIComponent(String(tableNo || '').trim());
  }

  function ensureCss() {
    if (document.querySelector('link[data-pmd-waiter-pos-v2-css]')) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/app/admin/assets/css/pmd-waiter-pos-v1.css?v=2';
      link.dataset.pmdWaiterPosV2Css = '1';
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function loadScriptOnce(selector, src, datasetKey, ready) {
    if (ready()) return Promise.resolve();
    var existing = document.querySelector(selector);
    if (existing) {
      return new Promise(function (resolve, reject) {
        if (ready()) return resolve();
        existing.addEventListener('load', resolve, {once:true});
        existing.addEventListener('error', reject, {once:true});
      });
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.dataset[datasetKey] = '1';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ensureScripts() {
    return loadScriptOnce(
      'script[data-pmd-waiter-pos-payment-v2-js]',
      '/app/admin/assets/js/pmd-waiter-pos-payment-v2.js?v=2',
      'pmdWaiterPosPaymentV2Js',
      function () { return !!window.PMDWaiterPOSPaymentV2; }
    ).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-v2-js]',
        '/app/admin/assets/js/pmd-waiter-pos-v1.js?v=2',
        'pmdWaiterPosV2Js',
        function () { return !!window.PMDWaiterPOSApp; }
      );
    });
  }

  function showLoading(tableNo) {
    closeOverlay(true);
    lastFocused = document.activeElement;
    overlay = document.createElement('div');
    overlay.className = 'pmd-pos-dashboard-overlay';
    overlay.dataset.pmdPosOverlay = '1';
    overlay.innerHTML = '<div style="height:100dvh;display:grid;place-items:center;background:#eef3f8;color:#061126;font-family:Inter,Roboto,sans-serif"><div style="text-align:center"><div style="width:48px;height:48px;border:5px solid #d7e0ea;border-top-color:#ff7a00;border-radius:50%;margin:0 auto 15px;animation:pmd-pos-spin .8s linear infinite"></div><b style="font-size:18px">Opening Table ' + String(tableNo).replace(/[<>&]/g, '') + '</b><div style="margin-top:7px;color:#64748b;font-size:12px">Loading menu and active order…</div></div></div><style>@keyframes pmd-pos-spin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(overlay);
    document.documentElement.classList.add('pmd-pos-overlay-open');
    document.body.classList.add('pmd-pos-overlay-open');
    window.PMD_WAITER_POS_OVERLAY_OPEN = true;
  }

  function closeOverlay(immediate) {
    if (!overlay) return;
    if (posInstance && typeof posInstance.destroy === 'function') {
      try { posInstance.destroy(); } catch (e) {}
    }
    posInstance = null;
    var current = overlay;
    overlay = null;
    loadingTable = null;
    window.PMD_WAITER_POS_OVERLAY_OPEN = false;
    document.documentElement.classList.remove('pmd-pos-overlay-open');
    document.body.classList.remove('pmd-pos-overlay-open');
    if (immediate) current.remove();
    else {
      current.classList.add('is-closing');
      setTimeout(function () { current.remove(); }, 160);
    }
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus({preventScroll:true}); } catch (e) { try { lastFocused.focus(); } catch (_) {} }
    }
    lastFocused = null;
  }

  async function openOverlay(tableNo) {
    tableNo = String(tableNo || '').trim();
    if (!tableNo || loadingTable) return;
    loadingTable = tableNo;
    showLoading(tableNo);

    try {
      var assets = Promise.all([ensureCss(), ensureScripts()]);
      var response = await fetch(overlayUrl(tableNo) + '?_=' + Date.now(), {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok || !json.ok || !json.html || !json.bootstrap) {
        throw new Error(json.message || ('HTTP ' + response.status));
      }
      await assets;
      if (!overlay || loadingTable !== tableNo) return;
      overlay.innerHTML = json.html;
      var root = overlay.querySelector('[data-pmd-pos-root]');
      if (!root || !window.PMDWaiterPOSApp) throw new Error('Waiter POS application did not load.');
      posInstance = window.PMDWaiterPOSApp.mount(root, json.bootstrap, {
        embedded: true,
        onClose: function () { closeOverlay(false); }
      });
      loadingTable = null;
    } catch (error) {
      console.error('[PMD] Waiter POS overlay failed', error);
      closeOverlay(true);
      if (confirm('The integrated POS could not open. Open the standalone POS page instead?')) {
        location.href = posUrl(tableNo);
      }
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || rootIsEditing() || overlay) return;

    var addButton = target.closest('#pmd-waiter-dashboard-root [data-add-table]');
    if (addButton) {
      var addTable = addButton.getAttribute('data-add-table');
      if (!addTable) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openOverlay(addTable);
      return;
    }

    var tableButton = target.closest('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]');
    if (!tableButton || tableHasOrders(tableButton)) return;

    var tableNo = tableButton.getAttribute('data-table');
    if (!tableNo) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    openOverlay(tableNo);
  }, true);

  window.addEventListener('pmd:waiter-pos-order-updated', function () {
    // Existing dashboard polling will reconcile cards. This event is intentionally
    // non-destructive and only exposes a hook for later real-time refresh work.
  });

  window.PMDWaiterPOSBridge = {
    version: 'pmd-waiter-pos-dashboard-bridge-v2',
    urlForTable: posUrl,
    overlayUrlForTable: overlayUrl,
    tableHasOrders: tableHasOrders,
    open: openOverlay,
    close: closeOverlay,
    debug: function () {
      var tables = Array.prototype.slice.call(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]'));
      return {
        version: 'pmd-waiter-pos-dashboard-bridge-v2',
        active: true,
        route: location.pathname,
        overlayOpen: !!overlay,
        loadingTable: loadingTable,
        tableCount: tables.length,
        freeTables: tables.filter(function (table) { return !tableHasOrders(table); }).map(function (table) { return table.dataset.table; }),
        occupiedTables: tables.filter(tableHasOrders).map(function (table) { return table.dataset.table; })
      };
    }
  };

  console.info('[PMD] Waiter POS dashboard bridge v2 active');
})();
