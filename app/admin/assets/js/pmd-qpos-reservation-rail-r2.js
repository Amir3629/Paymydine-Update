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
