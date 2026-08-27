/*
 * PMD_LOCATION_LIVE_CLOCK_R9
 *
 * Global Admin live clock.
 * - HH:MM:SS only; no date.
 * - Timezone + epoch come from a read-only server endpoint.
 * - Browser timezone is never used as a fallback.
 * - Server/client offset keeps the clock correct even if the device clock is wrong.
 * - No shared Blade/header partial performs timezone or database work.
 */
(function () {
  'use strict';

  if (window.PMDLocationLiveClockR9) return;

  var VERSION = '9.0.0';
  var ROOT_ID = 'pmd-location-live-clock-r9';
  var state = null;
  var formatter = null;
  var syncClientEpochMs = 0;
  var syncServerEpochMs = 0;
  var tickTimer = null;
  var resyncTimer = null;
  var classObserver = null;

  function pathIsAdmin() {
    var path = String(window.location.pathname || '');
    return /^\/[^/]+(?:\/|$)/.test(path) && /\/admin(?:\/|$)/.test(path) || /^\/admin(?:\/|$)/.test(path);
  }

  function excludedPath() {
    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    return /\/(?:admin\/)?(?:login|logout)$/.test(path) || path === '/admin/login' || path === '/admin/logout';
  }

  function adminPrefix() {
    var parts = String(window.location.pathname || '').split('/').filter(Boolean);
    if (!parts.length) return '/admin';
    if (parts[0] === 'admin') return '/admin';
    var adminIndex = parts.indexOf('admin');
    if (adminIndex >= 0) return '/' + parts.slice(0, adminIndex + 1).join('/');
    return '/' + parts[0];
  }

  function endpoint() {
    return adminPrefix().replace(/\/+$/, '') + '/location-clock/state';
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
    root.className = 'pmd-location-live-clock-r9';
    root.setAttribute('role', 'timer');
    root.setAttribute('aria-live', 'off');
    root.setAttribute('data-pmd-location-live-clock-r9', VERSION);
    root.setAttribute('data-ready', '0');

    var dot = document.createElement('span');
    dot.className = 'pmd-location-live-clock-r9__dot';
    dot.setAttribute('aria-hidden', 'true');

    var time = document.createElement('time');
    time.className = 'pmd-location-live-clock-r9__time';
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

    tickTimer = window.setTimeout(function () {
      scheduleTick();
    }, delay);
  }

  function refreshPositionClass() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    var html = document.documentElement;
    root.classList.toggle(
      'pmd-location-live-clock-r9--sidebar-collapsed',
      html.classList.contains('pmd-side-menu2-global-page') &&
      html.classList.contains('pmd-sm2-collapsed')
    );
    root.classList.toggle(
      'pmd-location-live-clock-r9--sidebar-expanded',
      html.classList.contains('pmd-side-menu2-global-page') &&
      html.classList.contains('pmd-sm2-expanded')
    );
  }

  function applyState(payload) {
    var clock = payload && payload.ok ? payload.clock : null;
    if (!clock || !clock.timezone || !Number(clock.server_epoch_ms)) return false;

    var nextFormatter = makeFormatter(String(clock.timezone));
    if (!nextFormatter) return false;

    state = clock;
    formatter = nextFormatter;
    syncClientEpochMs = Date.now();
    syncServerEpochMs = Number(clock.server_epoch_ms);

    var root = createRoot();
    root.setAttribute('data-timezone', String(clock.timezone));
    if (clock.location_id != null) root.setAttribute('data-location-id', String(clock.location_id));

    var locationName = String(clock.location_name || '').trim();
    var title = (locationName ? locationName + ' local time' : 'Restaurant local time') + ' (' + clock.timezone + ')';
    root.setAttribute('title', title);
    root.setAttribute('aria-label', title);

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
      return applyState(payload);
    } catch (error) {
      return false;
    }
  }

  function scheduleResync() {
    if (resyncTimer) window.clearInterval(resyncTimer);
    resyncTimer = window.setInterval(function () {
      sync();
    }, 5 * 60 * 1000);
  }

  async function boot() {
    if (!pathIsAdmin() || excludedPath()) return;

    var ok = await sync();
    if (!ok) return;

    scheduleResync();

    if (!classObserver) {
      classObserver = new MutationObserver(function () {
        refreshPositionClass();
      });
      classObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) sync();
    });
    window.addEventListener('focus', function () {
      sync();
    });
  }

  window.PMDLocationLiveClockR9 = {
    version: VERSION,
    sync: sync,
    state: function () { return state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
}());
