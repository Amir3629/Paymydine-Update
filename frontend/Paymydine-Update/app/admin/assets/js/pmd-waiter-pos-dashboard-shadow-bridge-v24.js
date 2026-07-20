(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_POS_DASHBOARD_SHADOW_BRIDGE_V24) return;

  window.PMD_WAITER_POS_DASHBOARD_SHADOW_BRIDGE_V24 = true;
  // Prevent the superseded bridge from attaching its legacy capture listener.
  window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V2 = true;
  window.PMD_WAITER_POS_DASHBOARD_BRIDGE_V1 = true;

  var overlayHost = null;
  var overlayShadow = null;
  var posInstance = null;
  var loadingTable = null;
  var lastFocused = null;
  var pickerHost = null;
  var pickerShadow = null;
  var pickerLastFocused = null;

  function cleanDiagnosticQuery() {
    try {
      var url = new URL(window.location.href);
      if (!url.searchParams.has('pos_hotfix')) return;
      url.searchParams.delete('pos_hotfix');
      var query = url.searchParams.toString();
      history.replaceState(history.state, document.title, url.pathname + (query ? '?' + query : '') + url.hash);
    } catch (e) {}
  }

  function setImportantStyle(element, name, value) {
    element.style.setProperty(name, value, 'important');
  }

  function makeViewportHost(kind) {
    var host = document.createElement('div');
    host.dataset.pmdPosViewportHost = kind;
    setImportantStyle(host, 'position', 'fixed');
    setImportantStyle(host, 'inset', '0');
    setImportantStyle(host, 'width', '100vw');
    setImportantStyle(host, 'height', '100dvh');
    setImportantStyle(host, 'max-width', 'none');
    setImportantStyle(host, 'max-height', 'none');
    setImportantStyle(host, 'margin', '0');
    setImportantStyle(host, 'padding', '0');
    setImportantStyle(host, 'border', '0');
    setImportantStyle(host, 'overflow', 'hidden');
    setImportantStyle(host, 'z-index', kind === 'picker' ? '2147483646' : '2147483645');
    setImportantStyle(host, 'display', 'block');
    setImportantStyle(host, 'transform', 'none');
    setImportantStyle(host, 'contain', 'layout style paint');
    document.documentElement.appendChild(host);
    return host;
  }

  function tableButtons() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]'
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

  function selectedTable() {
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

  function fetchText(url) {
    return fetch(url, {credentials: 'same-origin', cache: 'no-store'}).then(function (response) {
      if (!response.ok) throw new Error('Asset HTTP ' + response.status + ': ' + url);
      return response.text();
    });
  }

  function loadScriptOnce(selector, src, datasetKey, ready) {
    if (ready()) return Promise.resolve();
    var existing = document.querySelector(selector);
    if (existing) {
      return new Promise(function (resolve, reject) {
        if (ready()) return resolve();
        existing.addEventListener('load', resolve, {once: true});
        existing.addEventListener('error', reject, {once: true});
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
      '/app/admin/assets/js/pmd-waiter-pos-payment-v2.js?v=4',
      'pmdWaiterPosPaymentV2Js',
      function () { return !!window.PMDWaiterPOSPaymentV2; }
    ).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-payment-policy-v2-js]',
        '/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js?v=4',
        'pmdWaiterPosPaymentPolicyV2Js',
        function () { return !!(window.PMDWaiterPOSPaymentV2 && window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped); }
      );
    }).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-v2-js]',
        '/app/admin/assets/js/pmd-waiter-pos-v1.js?v=4',
        'pmdWaiterPosV2Js',
        function () { return !!window.PMDWaiterPOSApp; }
      );
    }).then(function () {
      return loadScriptOnce(
        'script[data-pmd-waiter-pos-product-details-v3-js]',
        '/app/admin/assets/js/pmd-waiter-pos-product-details-v3.js?v=4',
        'pmdWaiterPosProductDetailsV3Js',
        function () { return !!window.PMDWaiterPOSProductDetailsV3; }
      );
    });
  }

  function shadowBaseCss() {
    return ':host{all:initial;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;display:block!important;overflow:hidden!important;z-index:2147483645!important}' +
      '*,*::before,*::after{box-sizing:border-box}' +
      'html,body{margin:0;padding:0}' +
      '[data-pmd-pos-root]{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important}' +
      '.pmd-pos-app{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important}' +
      '.pmd-pos-dashboard-overlay{position:static!important;inset:auto!important;width:auto!important;height:auto!important}' +
      '@media(max-width:820px){.pmd-pos-workspace{width:100%!important}.pmd-pos-catalog{width:100%!important}}';
  }

  function loadingHtml(tableNo) {
    var safeTable = String(tableNo || '').replace(/[<>&"']/g, '');
    return '<style>' + shadowBaseCss() + '</style>' +
      '<div style="width:100vw;height:100dvh;display:grid;place-items:center;background:#eef3f8;color:#061126;font-family:Inter,Roboto,system-ui,sans-serif">' +
        '<div style="text-align:center">' +
          '<div style="width:48px;height:48px;border:5px solid #d7e0ea;border-top-color:#ff7a00;border-radius:50%;margin:0 auto 15px;animation:pmdShadowSpin .8s linear infinite"></div>' +
          '<b style="font-size:18px">Opening Table ' + safeTable + '</b>' +
          '<div style="margin-top:7px;color:#64748b;font-size:12px">Loading the isolated waiter workspace…</div>' +
        '</div>' +
      '</div><style>@keyframes pmdShadowSpin{to{transform:rotate(360deg)}}</style>';
  }

  function setPageLocked(locked) {
    document.documentElement.classList.toggle('pmd-pos-overlay-open', locked);
    document.body.classList.toggle('pmd-pos-overlay-open', locked);
    if (locked) {
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
    } else {
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
    }
    window.PMD_WAITER_POS_OVERLAY_OPEN = locked;
  }

  function closeOverlay() {
    if (posInstance && typeof posInstance.destroy === 'function') {
      try { posInstance.destroy(); } catch (e) {}
    }
    posInstance = null;
    loadingTable = null;
    if (overlayHost) overlayHost.remove();
    overlayHost = null;
    overlayShadow = null;
    setPageLocked(false);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus({preventScroll: true}); } catch (e) { try { lastFocused.focus(); } catch (_) {} }
    }
    lastFocused = null;
  }

  function renderOverlayError(tableNo, error) {
    if (!overlayShadow) return;
    var message = String(error && error.message || error || 'Unknown error').replace(/[<>&"']/g, '');
    overlayShadow.innerHTML = '<style>' + shadowBaseCss() + '</style>' +
      '<div style="width:100vw;height:100dvh;display:grid;place-items:center;padding:24px;background:#eef3f8;font-family:Inter,Roboto,system-ui,sans-serif;color:#061126">' +
        '<div style="width:min(520px,100%);padding:24px;border:1px solid #fecaca;border-radius:22px;background:#fff;box-shadow:0 24px 70px rgba(6,17,38,.18)">' +
          '<div style="font-size:28px">⚠️</div><h2 style="margin:10px 0 8px">Waiter POS could not open</h2>' +
          '<p style="margin:0;color:#64748b;line-height:1.5">' + message + '</p>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px">' +
            '<button data-shadow-retry style="min-height:44px;padding:0 17px;border:0;border-radius:12px;background:#ff7a00;color:#fff;font-weight:900;cursor:pointer">Retry</button>' +
            '<button data-shadow-close style="min-height:44px;padding:0 17px;border:1px solid #d7e0ea;border-radius:12px;background:#fff;color:#061126;font-weight:900;cursor:pointer">Back to floor</button>' +
            '<a href="' + posUrl(tableNo) + '" style="min-height:44px;padding:0 17px;border:1px solid #d7e0ea;border-radius:12px;display:inline-flex;align-items:center;text-decoration:none;color:#061126;font-weight:900">Open standalone</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    var retry = overlayShadow.querySelector('[data-shadow-retry]');
    var close = overlayShadow.querySelector('[data-shadow-close]');
    if (retry) retry.addEventListener('click', function () { closeOverlay(); openOverlay(tableNo); });
    if (close) close.addEventListener('click', closeOverlay);
  }

  async function openOverlay(tableNo) {
    tableNo = String(tableNo || '').trim();
    if (!tableNo || loadingTable) return;
    closePicker();
    closeOverlay();
    loadingTable = tableNo;
    lastFocused = document.activeElement;
    overlayHost = makeViewportHost('overlay');
    overlayShadow = overlayHost.attachShadow({mode: 'open'});
    overlayShadow.innerHTML = loadingHtml(tableNo);
    setPageLocked(true);

    try {
      var results = await Promise.all([
        fetchText('/app/admin/assets/css/pmd-waiter-pos-v1.css?v=4'),
        fetchText('/app/admin/assets/css/pmd-waiter-pos-product-details-v3.css?v=4'),
        fetchText('/app/admin/assets/css/pmd-waiter-pos-v286-dashboard-rebuild.css?v=287'),
        ensureScripts(),
        fetch(overlayUrl(tableNo) + '?_=' + Date.now(), {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
        }).then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok || !json.ok || !json.html || !json.bootstrap) {
              throw new Error(json.message || ('Overlay HTTP ' + response.status));
            }
            return json;
          });
        })
      ]);

      if (!overlayShadow || loadingTable !== tableNo) return;
      var posCss = results[0];
      var detailsCss = results[1];
      var dashboardCss = results[2];
      var json = results[4];
      overlayShadow.innerHTML =
        '<style>' +
        shadowBaseCss() + '\n' +
        posCss + '\n' +
        detailsCss + '\n' +
        dashboardCss +
        '</style>' +
        json.html;

      var root = overlayShadow.querySelector('[data-pmd-pos-root]');
      if (!root || !window.PMDWaiterPOSApp) throw new Error('The isolated POS application did not mount.');
      posInstance = window.PMDWaiterPOSApp.mount(root, json.bootstrap, {
        embedded: true,
        onClose: closeOverlay
      });
      if (window.PMDWaiterPOSProductDetailsV3) {
        window.PMDWaiterPOSProductDetailsV3.install(root, posInstance);
      }

      if (
        window.PMDWaiterPOSV286 &&
        typeof window.PMDWaiterPOSV286.install === 'function'
      ) {
        window.PMDWaiterPOSV286.install(root);
      } else {
        console.error('[PMD] V286 installer is unavailable inside shadow POS');
      }

      loadingTable = null;
      console.info('[PMD] Waiter POS shadow workspace mounted', {table: tableNo, isolated: true});
    } catch (error) {
      console.error('[PMD] Waiter POS shadow workspace failed', error);
      loadingTable = null;
      renderOverlayError(tableNo, error);
    }
  }

  function closePicker() {
    if (pickerHost) pickerHost.remove();
    pickerHost = null;
    pickerShadow = null;
    if (pickerLastFocused && typeof pickerLastFocused.focus === 'function') {
      try { pickerLastFocused.focus({preventScroll: true}); } catch (e) {}
    }
    pickerLastFocused = null;
  }

  function openPicker() {
    closePicker();
    var freeTables = tableButtons().filter(function (button) { return !tableHasOrders(button); });
    pickerLastFocused = document.activeElement;
    pickerHost = makeViewportHost('picker');
    pickerShadow = pickerHost.attachShadow({mode: 'open'});

    var choices = freeTables.map(function (button) {
      var no = String(button.getAttribute('data-table') || '').trim();
      if (!no) return '';
      var safe = no.replace(/[<>&"']/g, '');
      return '<button data-pick-table="' + safe + '"><b>Table ' + safe + '</b><small>Available</small></button>';
    }).join('');

    pickerShadow.innerHTML = '<style>' + shadowBaseCss() +
      '.picker{width:100vw;height:100dvh;display:grid;place-items:center;padding:20px;background:rgba(6,17,38,.62);font-family:Inter,Roboto,system-ui,sans-serif}.card{width:min(760px,100%);max-height:88dvh;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 28px 90px rgba(6,17,38,.32)}header{padding:20px 22px;display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #d7e0ea}h2{margin:0;color:#061126}p{margin:6px 0 0;color:#64748b;font-weight:700}.close{width:42px;height:42px;border:1px solid #d7e0ea;border-radius:12px;background:#f8fafc;font-size:22px;font-weight:900;cursor:pointer}.grid{padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;max-height:65dvh;overflow:auto}.grid button{min-height:84px;border:1px solid #d7e0ea;border-radius:16px;background:#fff;color:#061126;cursor:pointer}.grid button:hover{border-color:#ff7a00;box-shadow:0 10px 24px rgba(255,122,0,.14)}.grid b,.grid small{display:block}.grid b{font-size:19px}.grid small{margin-top:6px;color:#16a34a;font-weight:900}.empty{padding:36px;text-align:center;color:#64748b;font-weight:800}@media(max-width:640px){.picker{padding:0;align-items:end}.card{width:100%;border-radius:24px 24px 0 0}.grid{grid-template-columns:repeat(3,1fr);padding-bottom:calc(20px + env(safe-area-inset-bottom))}}</style>' +
      '<div class="picker"><section class="card"><header><div><h2>Start a new order</h2><p>Choose an available table.</p></div><button class="close" data-picker-close>×</button></header>' +
      (choices ? '<div class="grid">' + choices + '</div>' : '<div class="empty">No free tables are currently available.</div>') +
      '</section></div>';

    pickerShadow.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;
      if (target.closest('[data-picker-close]')) { closePicker(); return; }
      var choice = target.closest('[data-pick-table]');
      if (!choice) return;
      var tableNo = choice.getAttribute('data-pick-table');
      closePicker();
      openOverlay(tableNo);
    });
  }

  function openNewOrder() {
    var tableNo = selectedTable();
    if (tableNo) openOverlay(tableNo);
    else openPicker();
  }

  cleanDiagnosticQuery();

  window.PMDWaiterPOSBridge = {
    version: 'pmd-waiter-pos-dashboard-shadow-bridge-v2.4',
    urlForTable: posUrl,
    overlayUrlForTable: overlayUrl,
    tableHasOrders: tableHasOrders,
    selectedTable: selectedTable,
    open: openOverlay,
    openNewOrder: openNewOrder,
    openTablePicker: openPicker,
    closeTablePicker: closePicker,
    close: closeOverlay,
    debug: function () {
      var tables = tableButtons();
      return {
        version: 'pmd-waiter-pos-dashboard-shadow-bridge-v2.4',
        active: true,
        isolated: true,
        route: location.pathname,
        overlayOpen: !!overlayHost,
        pickerOpen: !!pickerHost,
        loadingTable: loadingTable,
        selectedTable: selectedTable() || null,
        tableCount: tables.length,
        freeTables: tables.filter(function (table) { return !tableHasOrders(table); }).map(function (table) { return table.dataset.table; }),
        occupiedTables: tables.filter(tableHasOrders).map(function (table) { return table.dataset.table; })
      };
    }
  };

  console.info('[PMD] Waiter POS dashboard shadow bridge v2.4 active');
})();