/*
 * PMD_LOCATION_LIVE_CLOCK_R8
 *
 * One global Admin clock authority.
 * - Visible value is time only: HH:MM:SS.
 * - Timezone comes from server-rendered PMDLocationClockConfigR8.
 * - Never uses the browser timezone as a location fallback.
 * - Fixed in the visual centre of the page header/content area.
 */
(function () {
  'use strict';

  if (window.PMDLocationLiveClockR8) return;

  var VERSION = '8.0.0';
  var ROOT_ID = 'pmd-location-live-clock-r8';
  var timer = null;
  var formatter = null;
  var config = window.PMDLocationClockConfigR8 || {};

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function adminPath() {
    return /^\/admin(?:\/|$)/.test(window.location.pathname || '');
  }

  function excludedPath() {
    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    return path === '/admin/login' || path === '/admin/logout';
  }

  function validFormatter(timezone) {
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
    root.className = 'pmd-location-live-clock-r8';
    root.setAttribute('role', 'timer');
    root.setAttribute('aria-live', 'off');
    root.setAttribute('data-pmd-location-live-clock-r8', VERSION);

    var dot = document.createElement('span');
    dot.className = 'pmd-location-live-clock-r8__dot';
    dot.setAttribute('aria-hidden', 'true');

    var time = document.createElement('time');
    time.className = 'pmd-location-live-clock-r8__time';
    time.setAttribute('data-pmd-location-live-clock-time', '');
    time.textContent = '--:--:--';

    root.appendChild(dot);
    root.appendChild(time);

    (document.body || document.documentElement).appendChild(root);
    return root;
  }

  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root || !formatter) return;

    var time = root.querySelector('[data-pmd-location-live-clock-time]');
    if (!time) return;

    var text = formatter.format(new Date());
    if (time.textContent !== text) time.textContent = text;
  }

  function scheduleNextTick() {
    if (timer) window.clearTimeout(timer);

    render();

    var delay = 1020 - (Date.now() % 1000);
    if (delay < 40 || delay > 1020) delay = 1000;

    timer = window.setTimeout(function tick() {
      render();
      scheduleNextTick();
    }, delay);
  }

  function refreshPositionClass() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    var html = document.documentElement;
    root.classList.toggle(
      'pmd-location-live-clock-r8--sidebar-collapsed',
      html.classList.contains('pmd-side-menu2-global-page') &&
      html.classList.contains('pmd-sm2-collapsed')
    );
    root.classList.toggle(
      'pmd-location-live-clock-r8--sidebar-expanded',
      html.classList.contains('pmd-side-menu2-global-page') &&
      html.classList.contains('pmd-sm2-expanded')
    );
  }

  function boot() {
    if (!adminPath() || excludedPath()) return;

    config = window.PMDLocationClockConfigR8 || config || {};
    var timezone = clean(config.timezone);
    formatter = timezone ? validFormatter(timezone) : null;

    // A wrong clock is worse than no clock. Never fall back to browser timezone.
    if (!formatter) return;

    var root = createRoot();
    root.setAttribute('data-timezone', timezone);

    var locationName = clean(config.locationName);
    var title = locationName
      ? locationName + ' local time (' + timezone + ')'
      : 'Restaurant local time (' + timezone + ')';
    root.setAttribute('title', title);
    root.setAttribute('aria-label', title);

    refreshPositionClass();
    scheduleNextTick();

    // Side Menu 2 changes class when expanded/collapsed. Re-centre without
    // reading layout dimensions or causing a paint-time text swap.
    var classObserver = new MutationObserver(function () {
      refreshPositionClass();
    });
    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) scheduleNextTick();
    });
  }

  window.PMDLocationLiveClockR8 = {
    version: VERSION,
    refresh: function () {
      config = window.PMDLocationClockConfigR8 || config || {};
      formatter = validFormatter(clean(config.timezone));
      if (!formatter) return false;
      if (!document.getElementById(ROOT_ID)) createRoot();
      refreshPositionClass();
      scheduleNextTick();
      return true;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
}());
