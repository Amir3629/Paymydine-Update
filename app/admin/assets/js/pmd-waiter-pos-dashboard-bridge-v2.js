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
  var tablePicker = null;
  var tablePickerLastFocused = null;
  var tablePickerKeyHandler = null;

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

  function floorTableButtons() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]'
    ));
  }

  function selectedDashboardTable() {
    try {
      if (window.PMDWaiterDashboard && typeof window.PMDWaiterDashboard.debug === 'function') {
        var debug = window.PMDWaiterDashboard.debug();
        if (debug && debug.selectedTable != null && String(debug.selectedTable).trim()) {
          return String(debug.selectedTable).trim();
        }
      }
    } catch (e) {}

    var selected = document.querySelector(
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table.is-selected[data-table]'
    );
    return selected ? String(selected.getAttribute('data-table') || '').trim() : '';
  }

  function posUrl(tableNo) {
    return '/admin/waiter-pos/' + encodeURIComponent(String(tableNo || '').trim());
  }

  function overlayUrl(tableNo) {
    return '/admin/pmd-waiter-pos-v1/overlay/' + encodeURIComponent(String(tableNo || '').trim());
  }

  function loadCssOnce(selector, href, datasetKey) {
    if (document.querySelector(selector)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset[datasetKey] = '1';
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function ensureCss() {
    return Promise.all([
      loadCssOnce(
        'link[data-pmd-waiter-pos-v2-css]',
        '/app/admin/assets/css/pmd-waiter-pos-v1.css?v=3',
        'pmdWaiterPosV2Css'
      ),
      loadCssOnce(
        'link[data-pmd-waiter-pos-product-details-v3-css]',
        '/app/admin/assets/css/pmd-waiter-pos-product-details-v3.css?v=3',
        'pmdWaiterPosProductDetailsV3Css'
      )
    ]);
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
      '/app/admin/assets/js/pmd-waiter-pos-payment-v2.js?v=3',
      'pmdWaiterPosPaymentV2Js',
      function () { return !!window.PMDWaiterPOSPaymentV2; }
    ).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-payment-policy-v2-js]',
        '/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js?v=3',
        'pmdWaiterPosPaymentPolicyV2Js',
        function () { return !!(window.PMDWaiterPOSPaymentV2 && window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped); }
      );
    }).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-v2-js]',
        '/app/admin/assets/js/pmd-waiter-pos-v1.js?v=3',
        'pmdWaiterPosV2Js',
        function () { return !!window.PMDWaiterPOSApp; }
      );
    }).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-product-details-v3-js]',
        '/app/admin/assets/js/pmd-waiter-pos-product-details-v3.js?v=3',
        'pmdWaiterPosProductDetailsV3Js',
        function () { return !!window.PMDWaiterPOSProductDetailsV3; }
      );
    });
  }

  function ensureTablePickerStyles() {
    if (document.getElementById('pmd-waiter-pos-table-picker-v22-style')) return;
    var style = document.createElement('style');
    style.id = 'pmd-waiter-pos-table-picker-v22-style';
    style.textContent = '' +
      '.pmd-pos-table-picker{position:fixed;inset:0;z-index:2147482999;background:rgba(6,17,38,.58);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px;font-family:Inter,Roboto,system-ui,sans-serif}' +
      '.pmd-pos-table-picker-card{width:min(760px,100%);max-height:min(760px,90dvh);overflow:hidden;background:#fff;border:1px solid #d7e0ea;border-radius:24px;box-shadow:0 28px 80px rgba(6,17,38,.28);display:grid;grid-template-rows:auto minmax(0,1fr)}' +
      '.pmd-pos-table-picker-head{padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #d7e0ea}' +
      '.pmd-pos-table-picker-head h2{margin:0;color:#061126;font-size:24px;letter-spacing:-.03em}' +
      '.pmd-pos-table-picker-head p{margin:6px 0 0;color:#64748b;font-weight:700;font-size:13px}' +
      '.pmd-pos-table-picker-close{width:42px;height:42px;border:1px solid #d7e0ea;border-radius:12px;background:#f8fafc;color:#061126;font-size:22px;font-weight:900;cursor:pointer}' +
      '.pmd-pos-table-picker-body{overflow:auto;padding:18px 22px 24px}' +
      '.pmd-pos-table-picker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:12px}' +
      '.pmd-pos-table-choice{min-height:84px;border:1px solid #d7e0ea;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc);color:#061126;cursor:pointer;display:grid;place-items:center;padding:12px;transition:.14s ease}' +
      '.pmd-pos-table-choice:hover,.pmd-pos-table-choice:focus-visible{border-color:#ff7a00;box-shadow:0 10px 24px rgba(255,122,0,.14);transform:translateY(-1px);outline:none}' +
      '.pmd-pos-table-choice strong{display:block;font-size:22px;line-height:1}' +
      '.pmd-pos-table-choice small{display:block;margin-top:6px;color:#16a34a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}' +
      '.pmd-pos-table-picker-empty{padding:32px 12px;text-align:center;color:#64748b;font-weight:800}' +
      '@media(max-width:640px){.pmd-pos-table-picker{padding:0;align-items:end}.pmd-pos-table-picker-card{width:100%;max-height:88dvh;border-radius:24px 24px 0 0}.pmd-pos-table-picker-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pmd-pos-table-picker-head{padding:18px}.pmd-pos-table-picker-body{padding:16px 18px calc(22px + env(safe-area-inset-bottom))}}';
    document.head.appendChild(style);
  }

  function closeTablePicker() {
    if (!tablePicker) return;
    var current = tablePicker;
    tablePicker = null;
    document.documentElement.classList.remove('pmd-pos-table-picker-open');
    document.body.classList.remove('pmd-pos-table-picker-open');
    if (tablePickerKeyHandler) {
      window.removeEventListener('keydown', tablePickerKeyHandler, true);
      tablePickerKeyHandler = null;
    }
    current.remove();
    if (tablePickerLastFocused && typeof tablePickerLastFocused.focus === 'function') {
      try { tablePickerLastFocused.focus({preventScroll:true}); } catch (e) { try { tablePickerLastFocused.focus(); } catch (_) {} }
    }
    tablePickerLastFocused = null;
  }

  function openTablePicker() {
    if (overlay || loadingTable || tablePicker) return;
    ensureTablePickerStyles();

    var freeTables = floorTableButtons().filter(function (button) {
      return !tableHasOrders(button);
    });

    tablePickerLastFocused = document.activeElement;
    tablePicker = document.createElement('div');
    tablePicker.className = 'pmd-pos-table-picker';
    tablePicker.dataset.pmdPosTablePicker = '1';
    tablePicker.setAttribute('role', 'dialog');
    tablePicker.setAttribute('aria-modal', 'true');
    tablePicker.setAttribute('aria-labelledby', 'pmd-pos-table-picker-title');

    var choices = freeTables.map(function (button) {
      var tableNo = String(button.getAttribute('data-table') || '').trim();
      if (!tableNo) return '';
      return '<button type="button" class="pmd-pos-table-choice" data-pos-pick-table="' + tableNo.replace(/[^0-9A-Za-z_-]/g, '') + '">' +
        '<span><strong>Table ' + tableNo.replace(/[<>&"']/g, '') + '</strong><small>Available</small></span>' +
      '</button>';
    }).join('');

    tablePicker.innerHTML = '' +
      '<section class="pmd-pos-table-picker-card">' +
        '<header class="pmd-pos-table-picker-head">' +
          '<div><h2 id="pmd-pos-table-picker-title">Start a new order</h2><p>Choose an available table. Occupied tables stay on the floor for order management.</p></div>' +
          '<button type="button" class="pmd-pos-table-picker-close" data-pos-close-table-picker aria-label="Close">×</button>' +
        '</header>' +
        '<div class="pmd-pos-table-picker-body">' +
          (choices ? '<div class="pmd-pos-table-picker-grid">' + choices + '</div>' : '<div class="pmd-pos-table-picker-empty">No free tables are currently available.</div>') +
        '</div>' +
      '</section>';

    document.body.appendChild(tablePicker);
    document.documentElement.classList.add('pmd-pos-table-picker-open');
    document.body.classList.add('pmd-pos-table-picker-open');

    tablePicker.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;
      if (target === tablePicker || target.closest('[data-pos-close-table-picker]')) {
        closeTablePicker();
        return;
      }
      var choice = target.closest('[data-pos-pick-table]');
      if (!choice) return;
      var tableNo = String(choice.getAttribute('data-pos-pick-table') || '').trim();
      closeTablePicker();
      openOverlay(tableNo);
    });

    tablePickerKeyHandler = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeTablePicker();
      }
    };
    window.addEventListener('keydown', tablePickerKeyHandler, true);

    var firstChoice = tablePicker.querySelector('[data-pos-pick-table]');
    var closeButton = tablePicker.querySelector('[data-pos-close-table-picker]');
    setTimeout(function () {
      try { (firstChoice || closeButton).focus({preventScroll:true}); } catch (e) {}
    }, 0);
  }

  function showLoading(tableNo) {
    closeTablePicker();
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
      if (window.PMDWaiterPOSProductDetailsV3) {
        window.PMDWaiterPOSProductDetailsV3.install(root, posInstance);
      }
      loadingTable = null;
    } catch (error) {
      console.error('[PMD] Waiter POS overlay failed', error);
      closeOverlay(true);
      if (confirm('The integrated POS could not open. Open the standalone POS page instead?')) {
        location.href = posUrl(tableNo);
      }
    }
  }

  function swallowDashboardClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function openNewOrder() {
    var selected = selectedDashboardTable();
    if (selected) {
      openOverlay(selected);
      return;
    }
    openTablePicker();
  }

  function interceptDashboardClick(event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || rootIsEditing() || overlay || tablePicker) return;
    if (!target.closest('#pmd-waiter-dashboard-root')) return;

    var addButton = target.closest('#pmd-waiter-dashboard-root [data-add-table]');
    if (addButton) {
      var addTable = String(addButton.getAttribute('data-add-table') || '').trim();
      if (!addTable) return;
      swallowDashboardClick(event);
      openOverlay(addTable);
      return;
    }

    var newOrderButton = target.closest('#pmd-waiter-dashboard-root [data-new-order]');
    if (newOrderButton) {
      swallowDashboardClick(event);
      openNewOrder();
      return;
    }

    var tableButton = target.closest('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]');
    if (!tableButton || tableHasOrders(tableButton)) return;

    var tableNo = String(tableButton.getAttribute('data-table') || '').trim();
    if (!tableNo) return;
    swallowDashboardClick(event);
    openOverlay(tableNo);
  }

  // Window capture runs before the legacy target listeners installed by the V5 dashboard.
  // This prevents the old /table/{id}/menu redirect from being scheduled before the POS bridge.
  window.addEventListener('click', interceptDashboardClick, true);

  window.addEventListener('pmd:waiter-pos-order-updated', function () {
    // Existing dashboard polling will reconcile cards. This event is intentionally
    // non-destructive and only exposes a hook for later real-time refresh work.
  });

  window.PMDWaiterPOSBridge = {
    version: 'pmd-waiter-pos-dashboard-bridge-v2.2',
    urlForTable: posUrl,
    overlayUrlForTable: overlayUrl,
    tableHasOrders: tableHasOrders,
    selectedTable: selectedDashboardTable,
    open: openOverlay,
    openNewOrder: openNewOrder,
    openTablePicker: openTablePicker,
    closeTablePicker: closeTablePicker,
    close: closeOverlay,
    debug: function () {
      var tables = floorTableButtons();
      return {
        version: 'pmd-waiter-pos-dashboard-bridge-v2.2',
        active: true,
        route: location.pathname,
        interceptor: 'window-capture',
        overlayOpen: !!overlay,
        tablePickerOpen: !!tablePicker,
        loadingTable: loadingTable,
        selectedTable: selectedDashboardTable() || null,
        productDetailsModule: !!window.PMDWaiterPOSProductDetailsV3,
        tableCount: tables.length,
        freeTables: tables.filter(function (table) { return !tableHasOrders(table); }).map(function (table) { return table.dataset.table; }),
        occupiedTables: tables.filter(tableHasOrders).map(function (table) { return table.dataset.table; })
      };
    }
  };

  console.info('[PMD] Waiter POS dashboard bridge v2.2 active');
})();