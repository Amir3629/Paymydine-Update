/*
 * PMD_LOCATION_LIVE_CLOCK_R10
 *
 * Zero-delay Admin location clock.
 * - HH:MM:SS only; no date.
 * - First paint restores the last verified server/timezone state from sessionStorage.
 * - Background sync immediately verifies active location/timezone from the R9 endpoint.
 * - Browser timezone is never used as restaurant-time truth.
 * - Cached server/client offset keeps refreshes instant without trusting device timezone.
 */
(function () {
  'use strict';

  if (window.PMDLocationLiveClockR10) return;

  var VERSION = '10.0.0';
  var ROOT_ID = 'pmd-location-live-clock-r10';
  var CACHE_VERSION = 1;
  var CACHE_TTL_MS = 30 * 60 * 1000;
  var state = null;
  var formatter = null;
  var syncClientEpochMs = 0;
  var syncServerEpochMs = 0;
  var tickTimer = null;
  var resyncTimer = null;
  var classObserver = null;
  var booted = false;

  function pathIsAdmin() {
    var path = String(window.location.pathname || '');
    return /(^|\/)admin(?:\/|$)/.test(path);
  }

  function excludedPath() {
    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    return /\/admin\/(?:login|logout)$/.test(path) || path === '/admin/login' || path === '/admin/logout';
  }

  function adminPrefix() {
    var parts = String(window.location.pathname || '').split('/').filter(Boolean);
    var adminIndex = parts.indexOf('admin');
    if (adminIndex >= 0) return '/' + parts.slice(0, adminIndex + 1).join('/');
    return '/admin';
  }

  function endpoint() {
    return adminPrefix().replace(/\/+$/, '') + '/location-clock/state';
  }

  function cacheKey() {
    return 'pmd:location-clock:r10:' + String(window.location.host || '') + ':' + adminPrefix();
  }

  function makeFormatter(timezone) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      });
    } catch (error) {
      return null;
    }
  }

  function createRoot() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) return existing;

    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'pmd-location-live-clock-r10';
    root.setAttribute('role', 'timer');
    root.setAttribute('aria-live', 'off');
    root.setAttribute('data-pmd-location-live-clock-r10', VERSION);
    root.setAttribute('data-ready', '0');

    var dot = document.createElement('span');
    dot.className = 'pmd-location-live-clock-r10__dot';
    dot.setAttribute('aria-hidden', 'true');

    var time = document.createElement('time');
    time.className = 'pmd-location-live-clock-r10__time';
    time.setAttribute('data-pmd-clock-value', '');
    time.textContent = '--:--:--';

    root.appendChild(dot);
    root.appendChild(time);
    (document.body || document.documentElement).appendChild(root);
    return root;
  }

  function virtualNowMs() {
    if (!syncServerEpochMs || !syncClientEpochMs) return 0;
    return syncServerEpochMs + (Date.now() - syncClientEpochMs);
  }

  function render() {
    if (!formatter || !state) return;
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var value = root.querySelector('[data-pmd-clock-value]');
    if (!value) return;

    var nowMs = virtualNowMs();
    if (!nowMs) return;

    var text = formatter.format(new Date(nowMs));
    if (value.textContent !== text) value.textContent = text;
    if (root.getAttribute('data-ready') !== '1') root.setAttribute('data-ready', '1');
  }

  function scheduleTick() {
    if (tickTimer) window.clearTimeout(tickTimer);
    render();

    var nowMs = virtualNowMs() || Date.now();
    var delay = 1015 - (nowMs % 1000);
    if (delay < 45 || delay > 1015) delay = 1000;

    tickTimer = window.setTimeout(scheduleTick, delay);
  }

  function refreshPositionClass() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    var html = document.documentElement;
    root.classList.toggle(
      'pmd-location-live-clock-r10--sidebar-collapsed',
      html.classList.contains('pmd-side-menu2-global-page') &&
      html.classList.contains('pmd-sm2-collapsed')
    );
    root.classList.toggle(
      'pmd-location-live-clock-r10--sidebar-expanded',
      html.classList.contains('pmd-side-menu2-global-page') &&
      html.classList.contains('pmd-sm2-expanded')
    );
  }

  function decorateRoot(clock, source) {
    var root = createRoot();
    root.setAttribute('data-timezone', String(clock.timezone));
    root.setAttribute('data-state-source', source || 'server');

    if (clock.location_id != null) {
      root.setAttribute('data-location-id', String(clock.location_id));
    } else {
      root.removeAttribute('data-location-id');
    }

    var locationName = String(clock.location_name || '').trim();
    var title = (locationName ? locationName + ' local time' : 'Restaurant local time') + ' (' + clock.timezone + ')';
    root.setAttribute('title', title);
    root.setAttribute('aria-label', title);
    return root;
  }

  function persistVerifiedState(clock, clientEpochMs) {
    try {
      var serverEpochMs = Number(clock.server_epoch_ms);
      if (!serverEpochMs || !clientEpochMs) return;

      window.sessionStorage.setItem(cacheKey(), JSON.stringify({
        cache_version: CACHE_VERSION,
        saved_at_ms: Date.now(),
        timezone: String(clock.timezone || ''),
        location_id: clock.location_id == null ? null : Number(clock.location_id),
        location_name: String(clock.location_name || ''),
        timezone_source: String(clock.timezone_source || ''),
        server_client_offset_ms: serverEpochMs - clientEpochMs
      }));
    } catch (error) {
      // Storage is an optimisation only; the server endpoint remains authority.
    }
  }

  function restoreCachedState() {
    try {
      var raw = window.sessionStorage.getItem(cacheKey());
      if (!raw) return false;

      var cached = JSON.parse(raw);
      if (!cached || Number(cached.cache_version) !== CACHE_VERSION) return false;
      if (!Number(cached.saved_at_ms) || Date.now() - Number(cached.saved_at_ms) > CACHE_TTL_MS) return false;
      if (!cached.timezone || !Number.isFinite(Number(cached.server_client_offset_ms))) return false;

      var cachedFormatter = makeFormatter(String(cached.timezone));
      if (!cachedFormatter) return false;

      var clientNowMs = Date.now();
      state = {
        version: VERSION,
        location_id: cached.location_id == null ? null : Number(cached.location_id),
        location_name: String(cached.location_name || ''),
        timezone: String(cached.timezone),
        timezone_source: String(cached.timezone_source || 'verified-cache'),
        server_epoch_ms: clientNowMs + Number(cached.server_client_offset_ms),
        restored_from_cache: true
      };
      formatter = cachedFormatter;
      syncClientEpochMs = clientNowMs;
      syncServerEpochMs = Number(state.server_epoch_ms);

      decorateRoot(state, 'verified-session-cache');
      refreshPositionClass();
      scheduleTick();
      return true;
    } catch (error) {
      return false;
    }
  }

  function applyServerState(payload) {
    var clock = payload && payload.ok ? payload.clock : null;
    if (!clock || !clock.timezone || !Number(clock.server_epoch_ms)) return false;

    var nextFormatter = makeFormatter(String(clock.timezone));
    if (!nextFormatter) return false;

    var clientEpochMs = Date.now();
    state = clock;
    formatter = nextFormatter;
    syncClientEpochMs = clientEpochMs;
    syncServerEpochMs = Number(clock.server_epoch_ms);

    decorateRoot(clock, 'server');
    persistVerifiedState(clock, clientEpochMs);
    refreshPositionClass();
    scheduleTick();
    return true;
  }

  async function sync() {
    try {
      var response = await window.fetch(endpoint(), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) return false;
      var payload = await response.json();
      return applyServerState(payload);
    } catch (error) {
      return false;
    }
  }

  function scheduleResync() {
    if (resyncTimer) window.clearInterval(resyncTimer);
    resyncTimer = window.setInterval(sync, 5 * 60 * 1000);
  }

  function installObservers() {
    if (!classObserver) {
      classObserver = new MutationObserver(refreshPositionClass);
      classObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) sync();
    });
    window.addEventListener('focus', sync);
  }

  async function boot() {
    if (booted || !pathIsAdmin() || excludedPath()) return;
    booted = true;

    // Usually already rendered synchronously from verified cache below.
    // The endpoint remains authority and corrects location/timezone immediately.
    await sync();
    scheduleResync();
    installObservers();
  }

  window.PMDLocationLiveClockR10 = {
    version: VERSION,
    sync: sync,
    state: function () { return state; },
    clearCache: function () {
      try { window.sessionStorage.removeItem(cacheKey()); } catch (error) {}
    }
  };

  // Zero-delay refresh path: do not wait for DOMContentLoaded or the network.
  if (pathIsAdmin() && !excludedPath()) {
    restoreCachedState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
}());
