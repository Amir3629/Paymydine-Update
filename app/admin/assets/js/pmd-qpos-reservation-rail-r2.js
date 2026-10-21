/* PMD_QPOS_RESERVATION_RAIL_R2
 * Read-only reservation color overlay for the Quick POS *table rail*.
 * The "Map" view already uses the shared Floor engine; the separate POS rail
 * previously used only physical table statuses and never loaded booking windows.
 *
 * This module does not mutate orders, status, payment, selection, or Floor maps.
 * The same location-scoped windows + notice from /admin/pos/reservation-busy
 * drive the visual state. Physical occupied/disabled/cleaning stays authoritative.
 */
(function (global, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global && global.document) api.mount(global);
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  function tablePhase(baseStatus, tableId, windows, nowMs, noticeMinutes, helper) {
    if (!helper || !Number.isInteger(Number(tableId)) || Number(tableId) < 1) {
      return 'none';
    }

    var base = String(baseStatus || 'available').toLowerCase().trim();
    if (base === 'free') base = 'available';
    var phase = helper.classify(
      windows,
      Number(tableId),
      '', // POS IDs are canonical: never collide with a visible table number.
      nowMs,
      noticeMinutes
    );
    if (base === 'available' && phase === 'upcoming') return 'upcoming';
    if ((base === 'available' || base === 'reserved' || base === 'attention')
        && phase === 'busy') return 'busy';
    return 'none';
  }

  function mount(env) {
    var doc = env.document;
    var app = doc && doc.getElementById('pmd-quick-pos');
    var helper = env.PMDFloorReservationStateR1;
    if (!app || !helper || app.__pmdQposReservationRailR2) {
      return app ? app.__pmdQposReservationRailR2 || null : null;
    }

    var windows = [];
    var noticeMinutes = 15;
    var refreshPromise = null;
    var lastRequestAt = 0;
    var boundaryTimer = null;
    var stopped = false;

    function applyColors() {
      var rail = app.querySelector('[data-qpos-tables]');
      if (!rail) return;
      var now = Date.now();
      Array.prototype.forEach.call(
        rail.querySelectorAll('[data-qpos-table]'),
        function (button) {
          var phase = tablePhase(
            button.getAttribute('data-status'),
            button.getAttribute('data-qpos-table'),
            windows, now, noticeMinutes, helper
          );
          if (phase === 'none') {
            button.removeAttribute('data-pmd-qpos-reservation-phase');
          } else if (button.getAttribute('data-pmd-qpos-reservation-phase') !== phase) {
            button.setAttribute('data-pmd-qpos-reservation-phase', phase);
          }
        }
      );
    }

    function scheduleBoundary() {
      if (boundaryTimer !== null) {
        env.clearTimeout(boundaryTimer);
        boundaryTimer = null;
      }
      if (stopped) return;
      var now = Date.now();
      var boundary = helper.nextBoundary(windows, now, noticeMinutes);
      if (!boundary) return;
      boundaryTimer = env.setTimeout(function () {
        boundaryTimer = null;
        applyColors();
        scheduleBoundary();
        // Re-read a changed/canceled booking at a real phase boundary.
        refresh(true);
      }, Math.min(2147483647, Math.max(50, boundary - now + 40)));
    }

    function refresh(force) {
      if (stopped || doc.visibilityState === 'hidden'
          || env.__PMD_NATIVE_OFFLINE__ === true
          || (env.navigator && env.navigator.onLine === false)) {
        return Promise.resolve(false);
      }
      if (refreshPromise) return refreshPromise;
      var now = Date.now();
      if (!force && now - lastRequestAt < 60000) {
        return Promise.resolve(false);
      }
      lastRequestAt = now;

      // Existing authenticated, location-scoped, read-only endpoint.
      // It is POST-only and requires the normal session CSRF token.
      var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };
      var csrf = doc.querySelector('meta[name="csrf-token"]');
      if (csrf && csrf.content) headers['X-CSRF-TOKEN'] = csrf.content;

      refreshPromise = env.fetch('/admin/pos/reservation-busy', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: headers,
        body: '{}'
      }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      }).then(function (data) {
        if (!data || !Array.isArray(data.windows)) return false;
        windows = data.windows;
        if (data.notice_minutes != null) {
          noticeMinutes = helper.safeMinutes(data.notice_minutes);
        }
        applyColors();
        scheduleBoundary();
        return true;
      }).catch(function (error) {
        // Keep the last known colors rather than inventing fresh status.
        if (env.console && env.console.warn) {
          env.console.warn('[PMD POS reservation rail] Refresh failed:', error.message);
        }
        return false;
      }).then(function (ok) {
        refreshPromise = null;
        return ok;
      });
      return refreshPromise;
    }

    function onTablesRendered() {
      applyColors();
      // QPOS has an existing live heartbeat. Refresh reservation windows at
      // most once per minute, NOT on every few-second table rail redraw.
      refresh(false);
    }

    function onVisible() {
      if (doc.visibilityState !== 'hidden') refresh(true);
    }

    env.addEventListener('pmd:qpos:tables-rendered', onTablesRendered);
    env.addEventListener('pmd:reservation-saved', function () { refresh(true); });
    doc.addEventListener('visibilitychange', onVisible);
    env.addEventListener('focus', onVisible);
    env.addEventListener('online', function () { refresh(true); });
    env.addEventListener('beforeunload', function () {
      stopped = true;
      if (boundaryTimer !== null) env.clearTimeout(boundaryTimer);
    });

    var instance = {
      paint: applyColors,
      refresh: function () { return refresh(true); }
    };
    app.__pmdQposReservationRailR2 = instance;
    applyColors();
    refresh(true);
    return instance;
  }

  return { tablePhase: tablePhase, mount: mount };
});


/* PMD_ZCS_CUSTOMER_DISPLAY_LIVE_HOTFIX_V120
 * Server-loaded compatibility layer for Android Local-First POS.
 * The core Quick POS runtime can be bundled inside the APK; this patch runs
 * afterward, keeps the staff UI simple, and feeds cached food photos to ZCS.
 */
(function (w, d) {
  'use strict';
  if (!w || !d || w.__PMDZcsDisplayHotfixV120) return;
  w.__PMDZcsDisplayHotfixV120 = true;

  function api() {
    return w.PMDQuickPOSV1 || null;
  }

  function state() {
    var instance = api();
    return instance && instance.state ? instance.state : null;
  }

  function bridge() {
    var value = w.PayMyDineHardware;
    return value && typeof value.pushCustomerDisplay === 'function' ? value : null;
  }

  function cachedImage(menuId) {
    var local = w.PayMyDineOffline;
    if (!local || typeof local.image !== 'function' || !menuId) return '';
    try {
      var value = String(local.image(String(menuId)) || '');
      return value.indexOf('data:image/') === 0 ? value : '';
    } catch (ignored) {
      return '';
    }
  }

  function hydrateMenuImage(menuId) {
    var st = state();
    if (!st || !menuId) return '';
    var row = (st.menu || []).find(function (item) {
      return Number(item && item.id || 0) === Number(menuId);
    });
    if (!row) return '';

    var current = String(row.image || '');
    if (current.indexOf('data:image/') === 0) return current;

    var data = cachedImage(menuId);
    if (data) row.image = data;
    return data || current;
  }

  function hydrateCurrentHighlight(refresh) {
    var st = state();
    if (!st || !st.customerDisplayHighlight) return false;
    var highlight = st.customerDisplayHighlight;
    var id = Number(highlight.menu_id || 0);
    if (!id) return false;

    var image = hydrateMenuImage(id);
    if (!image || image.indexOf('data:image/') !== 0) return false;
    if (String(highlight.image || '') === image) return true;

    highlight.image = image;
    if (
      refresh !== false &&
      api() &&
      api().customerDisplay &&
      typeof api().customerDisplay.refresh === 'function'
    ) {
      try { api().customerDisplay.refresh(); } catch (ignored) {}
    }
    return true;
  }

  function currency(st) {
    return String(
      st && st.boot && st.boot.settings && st.boot.settings.currency ||
      st && st.settings && st.settings.currency ||
      '€'
    );
  }

  function tableLabel(st, demo) {
    if (st && st.selectedTable) {
      var table = st.selectedTable;
      var number = String(table.number == null ? '' : table.number).trim();
      var name = String(table.name || '').trim();
      return number ? ('Table ' + number) : (name || 'Table');
    }
    if (!demo && st && st.serviceMode === 'takeaway') return 'Pickup';
    return demo ? 'Demo order' : '';
  }

  function testOrderPayload() {
    var st = state() || {};
    var rows = Array.isArray(st.cart) ? st.cart : [];
    var source = rows.length ? rows[rows.length - 1] : null;
    var menuItem = null;

    if (source && source.menu_id) {
      menuItem = (st.menu || []).find(function (item) {
        return Number(item && item.id || 0) === Number(source.menu_id);
      }) || null;
    }
    if (!menuItem) {
      menuItem = (st.menu || []).find(function (item) {
        return item && Number(item.id || 0) > 0 && Number(item.price || 0) > 0;
      }) || null;
    }

    var id = Number(
      source && source.menu_id ||
      menuItem && menuItem.id ||
      0
    );
    var name = String(
      source && source.name ||
      menuItem && menuItem.name ||
      'Sample item'
    );
    var quantity = Math.max(1, Number(source && source.quantity || 1));
    var unit = Number(source && source.price || menuItem && menuItem.price || 9.9);
    var image = id ? hydrateMenuImage(id) : '';

    return {
      phase: 'order',
      currency: currency(st),
      total: Math.round(unit * quantity * 100) / 100,
      amount_due: Math.round(unit * quantity * 100) / 100,
      table_label: tableLabel(st, true),
      order_label: 'Display test',
      headline: 'Your order',
      highlight_name: name,
      highlight_image: image,
      items: [{
        menu_id: id || null,
        name: name,
        quantity: quantity,
        unit_price: unit,
        line_total: Math.round(unit * quantity * 100) / 100,
        image: image
      }]
    };
  }

  function send(payload) {
    var hw = bridge();
    if (!hw) return false;
    try {
      hw.pushCustomerDisplay(JSON.stringify(payload));
      return true;
    } catch (ignored) {
      return false;
    }
  }

  function capabilities() {
    var hw = bridge();
    if (!hw || typeof hw.customerDisplayCapabilities !== 'function') {
      return { customer_display: false };
    }
    try {
      return JSON.parse(String(hw.customerDisplayCapabilities() || '{}'));
    } catch (ignored) {
      return { customer_display: false };
    }
  }

  function installCleanUi() {
    var hw = bridge();
    var profile = d.querySelector('[data-qpos-profile-menu]');
    if (!hw || !profile) return false;

    var old = d.getElementById('pmd-customer-display-control');
    if (old) old.remove();
    var previousOverlay = d.querySelector('[data-pmd-cd-v120-overlay]');
    if (previousOverlay) previousOverlay.remove();

    if (!d.getElementById('pmd-cd-v120-style')) {
      var style = d.createElement('style');
      style.id = 'pmd-cd-v120-style';
      style.textContent =
        '.pmd-cd-v120{border-top:1px solid rgba(148,163,184,.22);margin-top:9px;padding-top:9px}' +
        '.pmd-cd-v120__row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 1px}' +
        '.pmd-cd-v120__copy{display:grid;gap:2px}.pmd-cd-v120__copy strong{font-size:14px}.pmd-cd-v120__copy small{font-size:11px;opacity:.68}' +
        '.pmd-cd-v120__open{border:1px solid rgba(17,86,116,.18);background:#f2f8fb;color:#0a4a68;border-radius:10px;padding:8px 11px;font:inherit;font-weight:750}' +
        '.pmd-cd-v120__overlay[hidden]{display:none!important}.pmd-cd-v120__overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.42)}' +
        '.pmd-cd-v120__card{width:min(420px,calc(100vw - 28px));background:#fff;color:#0b4059;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.28);overflow:hidden}' +
        '.pmd-cd-v120__head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:19px;border-bottom:1px solid #e6eef2}.pmd-cd-v120__head h3{margin:0;font-size:21px}' +
        '.pmd-cd-v120__status{font-size:12px;font-weight:800;color:#0a8058}.pmd-cd-v120__close{width:38px;height:38px;border:1px solid #d9e5ea;border-radius:11px;background:#fff;font-size:23px;color:#0b4059}' +
        '.pmd-cd-v120__body{padding:18px 19px 20px;display:grid;gap:14px}.pmd-cd-v120__note{margin:0;background:#f2f8fb;border-left:4px solid #0b79aa;padding:11px 13px;font-size:13px;line-height:1.4}' +
        '.pmd-cd-v120__opt{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid #edf2f4}.pmd-cd-v120__opt span{display:grid;gap:2px}.pmd-cd-v120__opt small{color:#718894;font-size:11px}.pmd-cd-v120__opt input{width:22px;height:22px;accent-color:#0879ad}' +
        '.pmd-cd-v120__tests{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pmd-cd-v120__tests button{min-height:44px;border:1px solid #d6e7ef;border-radius:11px;background:#f8fbfd;color:#0b4059;font:inherit;font-weight:750}';
      d.head.appendChild(style);
    }

    var wrap = d.createElement('div');
    wrap.id = 'pmd-customer-display-control';
    wrap.className = 'pmd-cd-v120';
    wrap.innerHTML =
      '<div class="pmd-cd-v120__row">' +
        '<div class="pmd-cd-v120__copy"><strong>Customer display</strong><small data-pmd-cd-v120-status>Connected</small></div>' +
        '<button type="button" class="pmd-cd-v120__open" data-pmd-cd-v120-open>Settings</button>' +
      '</div>';
    profile.appendChild(wrap);

    var overlay = d.createElement('div');
    overlay.className = 'pmd-cd-v120__overlay';
    overlay.setAttribute('data-pmd-cd-v120-overlay', '');
    overlay.hidden = true;
    overlay.innerHTML =
      '<section class="pmd-cd-v120__card" role="dialog" aria-modal="true">' +
        '<div class="pmd-cd-v120__head"><div><h3>Customer display</h3><div class="pmd-cd-v120__status" data-pmd-cd-v120-card-status>Connected</div></div><button class="pmd-cd-v120__close" type="button" data-pmd-cd-v120-close>×</button></div>' +
        '<div class="pmd-cd-v120__body">' +
          '<p class="pmd-cd-v120__note">Shows the current order and payment status to the customer.</p>' +
          '<label class="pmd-cd-v120__opt"><span><strong>Enabled</strong><small>Use the customer screen.</small></span><input type="checkbox" data-pmd-cd-v120-enabled></label>' +
          '<label class="pmd-cd-v120__opt"><span><strong>Show food images</strong><small>Use cached menu photos when available.</small></span><input type="checkbox" data-pmd-cd-v120-images></label>' +
          '<div class="pmd-cd-v120__tests">' +
            '<button type="button" data-pmd-cd-v120-test="order">Test order</button>' +
            '<button type="button" data-pmd-cd-v120-test="payment">Test payment</button>' +
            '<button type="button" data-pmd-cd-v120-test="success">Test success</button>' +
            '<button type="button" data-pmd-cd-v120-test="idle">Show idle</button>' +
          '</div>' +
        '</div>' +
      '</section>';
    d.body.appendChild(overlay);

    var cap = capabilities();
    var enabled = overlay.querySelector('[data-pmd-cd-v120-enabled]');
    var images = overlay.querySelector('[data-pmd-cd-v120-images]');
    if (enabled) enabled.checked = cap.enabled !== false;
    if (images) images.checked = cap.images_enabled !== false;

    function close() { overlay.hidden = true; }
    wrap.querySelector('[data-pmd-cd-v120-open]').onclick = function () {
      var current = capabilities();
      if (enabled) enabled.checked = current.enabled !== false;
      if (images) images.checked = current.images_enabled !== false;
      overlay.hidden = false;
    };
    overlay.querySelector('[data-pmd-cd-v120-close]').onclick = close;
    overlay.onclick = function (event) { if (event.target === overlay) close(); };

    enabled.onchange = function () {
      try { hw.setCustomerDisplayEnabled(!!enabled.checked); } catch (ignored) {}
    };
    images.onchange = function () {
      try { hw.setCustomerDisplayImages(!!images.checked); } catch (ignored) {}
      hydrateCurrentHighlight(true);
    };

    Array.prototype.forEach.call(
      overlay.querySelectorAll('[data-pmd-cd-v120-test]'),
      function (button) {
        button.onclick = function () {
          var kind = button.getAttribute('data-pmd-cd-v120-test');
          var st = state() || {};
          if (kind === 'order') {
            send(testOrderPayload());
            return;
          }
          if (kind === 'idle') {
            try { hw.showCustomerDisplayIdle(); } catch (ignored) {}
            return;
          }
          var amount = 18;
          if (Array.isArray(st.cart) && st.cart.length) {
            amount = st.cart.reduce(function (sum, row) {
              return sum + Number(row.price || 0) * Number(row.quantity || 0);
            }, 0) || 18;
          }
          if (kind === 'success') {
            send({
              phase:'success', currency:currency(st), total:amount, amount_due:0,
              headline:'Paid', message:'Thank you!', items:[]
            });
          } else {
            send({
              phase:'payment', currency:currency(st), total:amount, amount_due:amount,
              table_label:tableLabel(st, false), headline:'Please pay',
              message:'Please follow the cashier', items:[]
            });
          }
        };
      }
    );

    return true;
  }

  function boot() {
    if (!api() || !bridge()) {
      w.setTimeout(boot, 350);
      return;
    }

    installCleanUi();

    d.addEventListener('pointerdown', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[data-qpos-product]')
        : null;
      if (!target) return;
      hydrateMenuImage(Number(target.getAttribute('data-qpos-product') || 0));
    }, true);

    w.setInterval(function () {
      hydrateCurrentHighlight(true);

      var control = d.getElementById('pmd-customer-display-control');
      if (
        !control ||
        control.querySelector('[data-pmd-customer-display-diagnostic]')
      ) {
        installCleanUi();
      }
    }, 1200);
  }

  boot();
})(window, document);
