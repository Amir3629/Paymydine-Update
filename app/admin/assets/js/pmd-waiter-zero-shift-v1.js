(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');

  if (route !== '/admin/dashboardwaiternew' && route !== '/admin/waiter') {
    return;
  }

  if (window.PMDWaiterZeroShiftV3) {
    return;
  }

  var body = document.body;
  var root = document.querySelector('[data-pmd-waiter-v2-root]');

  if (!body || !root) {
    return;
  }

  /* Never allow an older cached ready class to bypass the current guard. */
  body.classList.remove(
    'pmd-waiter-zero-shift-ready-v1',
    'pmd-waiter-zero-shift-ready-v2',
    'pmd-waiter-zero-shift-ready-v3'
  );
  root.removeAttribute('data-pmd-waiter-zero-shift-ready');

  var grid = root.querySelector('[data-v2-table-grid]');
  var loading = root.querySelector('[data-v2-loading]');
  var empty = root.querySelector('[data-v2-empty]');
  var areas = root.querySelector('[data-v2-areas]');
  var leftRail = root.querySelector('.pmd-v2-mode-keys');

  var startedAt = performance.now();
  var frameId = 0;
  var timeoutId = 0;
  var done = false;
  var stableFrames = 0;
  var firstStableAt = 0;
  var lastSignature = '';
  var reason = 'booting';
  var serviceEventSeen = false;

  var MIN_BOOT_MS = 1100;
  var MIN_STABLE_MS = 120;
  var REQUIRED_STABLE_FRAMES = 8;
  var SAFETY_TIMEOUT_MS = 5000;

  function hasScript(fragment) {
    return Boolean(
      document.querySelector(
        'script[src*="' + fragment.replace(/"/g, '\\"') + '"]'
      )
    );
  }

  var requiresV21 = hasScript('pmd-waiter-standard-v21.js');
  var requiresV221 = hasScript('pmd-waiter-standard-v221-theme.js');
  var requiresV23 = hasScript('pmd-waiter-standard-v23-operational-polish.js');
  var requiresV233 = hasScript('pmd-waiter-launcher-v233-unified-ui.js');
  var requiresV241 = hasScript('pmd-waiter-v241-table-lifecycle-safe.js');
  var requiresV257 = hasScript('pmd-waiter-v257-operations-rail.js');
  var requiresV263 = hasScript('pmd-waiter-v263-area-search-calls.js');
  var requiresV265 = hasScript('pmd-waiter-v265-header-dark-logout.js');
  var requiresV267 = hasScript('pmd-waiter-v266-theme-rails-nohover.js');
  var requiresV271 = hasScript('pmd-waiter-v271-service-inbox.js');
  var requiresV274 = hasScript('pmd-waiter-v274-single-service-source.js');
  var requiresV280 = hasScript('pmd-waiter-v280-exact-neutral-right-rail.js');
  var requiresV281 = hasScript('pmd-waiter-v281-exact-edge-width.js');

  if (requiresV271 || requiresV274) {
    document.addEventListener('pmd:v274-service-data-ready', function () {
      serviceEventSeen = true;
    });
  }

  function cards() {
    if (!grid) return [];

    return Array.prototype.slice.call(
      grid.querySelectorAll('[data-v2-open-table]')
    );
  }

  function baseDataReady() {
    if (!grid || !loading) return false;

    var rows = cards();
    var realEmpty = Boolean(empty && !empty.hidden);

    return loading.hidden && (rows.length > 0 || realEmpty);
  }

  function v21Ready() {
    if (!requiresV21) return true;

    var rows = cards();

    if (!rows.length) {
      return Boolean(empty && !empty.hidden);
    }

    return rows.every(function (card) {
      return (
        card.classList.contains('pmd-v21-table-key') &&
        card.hasAttribute('data-v21-priority') &&
        card.hasAttribute('data-v21-number')
      );
    });
  }

  function v265Ready() {
    if (!requiresV265) return true;

    return Boolean(
      window.PMDWaiterV265 &&
      !document.querySelector('.pmd-v2-topbar') &&
      document.querySelector('.pmd-v265-logout')
    );
  }

  function v267Ready() {
    if (!requiresV267) return true;

    var theme = document.documentElement.getAttribute('data-pmd-pos-theme');

    return Boolean(
      window.PMDWaiterV267 &&
      (theme === 'light' || theme === 'dark')
    );
  }

  function v221Ready() {
    if (!requiresV221) return true;

    /* V2.6.5 intentionally removes the complete topbar, including the V2.2.1
     * theme control. In the final production DOM, absence is therefore READY. */
    if (requiresV265 && v265Ready()) {
      return true;
    }

    var actions = root.querySelector('.pmd-v2-top-actions');

    return Boolean(
      window.PMDWaiterStandardV221 &&
      actions &&
      actions.querySelector('[data-v221-theme-toggle]')
    );
  }

  function v23Ready() {
    if (!requiresV23) return true;

    /* V2.3 decorates a temporary topbar pill; V2.3.3/V2.6.5 later remove it.
     * The stable signal is the production runtime itself, not temporary DOM. */
    return Boolean(window.PMDWaiterStandardV23);
  }

  function v233Ready() {
    if (!requiresV233) return true;

    var footerGone = !root.querySelector('.pmd-v2-footer');

    if (requiresV265 && v265Ready()) {
      return Boolean(window.PMDWaiterLauncherV233 && footerGone);
    }

    return Boolean(
      window.PMDWaiterLauncherV233 &&
      footerGone &&
      root.querySelector('.pmd-v233-header-search')
    );
  }

  function v241Ready() {
    if (!requiresV241) return true;

    var rows = cards();
    var filters = leftRail
      ? leftRail.querySelectorAll('[data-v241-filter]')
      : [];

    if (!window.PMDWaiterV241SafeLifecycle || filters.length < 5) {
      return false;
    }

    if (!rows.length) {
      return Boolean(empty && !empty.hidden);
    }

    return rows.every(function (card) {
      return (
        card.classList.contains('v241-card') &&
        card.hasAttribute('data-v241-signature') &&
        card.hasAttribute('data-v241-status') &&
        card.hasAttribute('data-v241-payment')
      );
    });
  }

  function v257Ready() {
    if (!requiresV257) return true;

    return Boolean(
      window.PMDWaiterV257OperationsRail &&
      document.querySelector('.v257-operations-rail')
    );
  }

  function v263Ready() {
    if (!requiresV263) return true;

    var areaButtons = areas
      ? areas.querySelectorAll('[data-v2-area]')
      : [];

    var headerSearch = root.querySelector('.pmd-v233-header-search');
    var clonedSearch = areas && areas.querySelector('.pmd-v263-area-search');

    return Boolean(
      window.PMDWaiterV263 &&
      areaButtons.length > 0 &&
      (!headerSearch || clonedSearch)
    );
  }

  function v271Ready() {
    if (!requiresV271) return true;

    return Boolean(
      window.PMDWaiterV271 &&
      window.PMDWaiterV271.dashboard !== null
    );
  }

  function v274Ready() {
    if (!requiresV274) return true;

    var rows = cards();

    if (!window.PMDWaiterV274) {
      return false;
    }

    if (!rows.length) return true;

    /* These attributes are written only after the final service renderer has
     * processed each card. This is a stronger observable signal than relying on
     * an event that could theoretically fire before this guard attaches. */
    return rows.every(function (card) {
      return (
        card.hasAttribute('data-v274-call-count') &&
        card.hasAttribute('data-v274-note-count')
      );
    });
  }

  function v280Ready() {
    if (!requiresV280) return true;

    var rail = document.querySelector('.pmd-v280-right-rail');

    return Boolean(
      window.PMDWaiterV280 &&
      rail &&
      rail.getAttribute('data-v280-exact-rail') === '1' &&
      rail.querySelectorAll('.pmd-v280-operation').length >= 5
    );
  }

  function v281Ready() {
    if (!requiresV281) return true;

    return Boolean(
      window.PMDWaiterV281 &&
      document.querySelector('.pmd-v280-right-rail')
    );
  }

  function allLayersReady() {
    return (
      baseDataReady() &&
      v21Ready() &&
      v221Ready() &&
      v23Ready() &&
      v233Ready() &&
      v241Ready() &&
      v257Ready() &&
      v263Ready() &&
      v265Ready() &&
      v267Ready() &&
      v271Ready() &&
      v274Ready() &&
      v280Ready() &&
      v281Ready()
    );
  }

  function rounded(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  function rect(node) {
    if (!node) return 'none';

    var box = node.getBoundingClientRect();

    return [
      rounded(box.left),
      rounded(box.top),
      rounded(box.width),
      rounded(box.height)
    ].join(',');
  }

  function cleanText(node) {
    if (!node) return '';

    return String(node.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
  }

  function auditLayers() {
    return {
      base: baseDataReady(),
      v21: v21Ready(),
      v221: v221Ready(),
      v23: v23Ready(),
      v233: v233Ready(),
      v241: v241Ready(),
      v257: v257Ready(),
      v263: v263Ready(),
      v265: v265Ready(),
      v267: v267Ready(),
      v271: v271Ready(),
      v274: v274Ready(),
      v280: v280Ready(),
      v281: v281Ready()
    };
  }

  function signature() {
    if (!allLayersReady()) {
      return null;
    }

    var rows = cards();
    var rightRail = document.querySelector('.pmd-v280-right-rail');
    var logout = document.querySelector('.pmd-v265-logout');
    var theme = document.documentElement.getAttribute('data-pmd-pos-theme') || '';
    var parts = [
      'root=' + rect(root),
      'command=' + rect(root.querySelector('.pmd-v2-command')),
      'left=' + rect(leftRail) + ':' + cleanText(leftRail),
      'areas=' + rect(areas) + ':' + cleanText(areas),
      'stage=' + rect(root.querySelector('.pmd-v2-table-stage')),
      'grid=' + rect(grid),
      'right=' + rect(rightRail) + ':' + cleanText(rightRail),
      'logout=' + rect(logout),
      'theme=' + theme,
      'areaButtons=' + (areas ? areas.querySelectorAll('[data-v2-area]').length : 0),
      'filters=' + (leftRail ? leftRail.querySelectorAll('[data-v241-filter]').length : 0),
      'cards=' + rows.length
    ];

    rows.forEach(function (card, index) {
      parts.push([
        index,
        String(card.getAttribute('data-v2-open-table') || ''),
        String(card.getAttribute('data-v21-priority') || ''),
        String(card.getAttribute('data-v241-status') || ''),
        String(card.getAttribute('data-v241-payment') || ''),
        String(card.getAttribute('data-v274-call-count') || ''),
        String(card.getAttribute('data-v274-note-count') || ''),
        rect(card),
        cleanText(card)
      ].join(':'));
    });

    return parts.join('|');
  }

  function reveal(nextReason) {
    if (done) return;

    done = true;
    reason = nextReason || 'stable-final-production-dom';

    if (frameId) cancelAnimationFrame(frameId);
    if (timeoutId) clearTimeout(timeoutId);

    body.classList.remove(
      'pmd-waiter-zero-shift-ready-v1',
      'pmd-waiter-zero-shift-ready-v2'
    );
    body.classList.add('pmd-waiter-zero-shift-ready-v3');
    root.setAttribute('data-pmd-waiter-zero-shift-ready', '3');

    console.info('[PMD Waiter Zero Shift V3] Final launcher released', {
      route: route,
      reason: reason,
      stableFrames: stableFrames,
      elapsedMs: Math.round(performance.now() - startedAt),
      cards: cards().length,
      serviceEventSeen: serviceEventSeen,
      layers: auditLayers()
    });
  }

  function audit() {
    return {
      version: '3.0.0-final-dom-aware',
      route: route,
      ready: done,
      reason: reason,
      stableFrames: stableFrames,
      requiredStableFrames: REQUIRED_STABLE_FRAMES,
      minBootMs: MIN_BOOT_MS,
      minStableMs: MIN_STABLE_MS,
      serviceEventSeen: serviceEventSeen,
      layers: auditLayers(),
      cards: cards().length,
      areaButtons: areas
        ? areas.querySelectorAll('[data-v2-area]').length
        : 0,
      lifecycleFilters: leftRail
        ? leftRail.querySelectorAll('[data-v241-filter]').length
        : 0,
      topbarPresent: Boolean(document.querySelector('.pmd-v2-topbar')),
      logoutPresent: Boolean(document.querySelector('.pmd-v265-logout')),
      rightRail: Boolean(document.querySelector('.pmd-v280-right-rail')),
      theme: document.documentElement.getAttribute('data-pmd-pos-theme') || '',
      elapsedMs: Math.round(performance.now() - startedAt)
    };
  }

  window.PMDWaiterZeroShiftV3 = {
    version: '3.0.0-final-dom-aware',
    reveal: reveal,
    audit: audit
  };

  console.info('[PMD Waiter Zero Shift V3] Final-DOM guard active', {
    route: route,
    requiresV265: requiresV265,
    requiresV267: requiresV267
  });

  function tick(now) {
    if (done) return;

    var current = signature();

    if (!current || now - startedAt < MIN_BOOT_MS) {
      stableFrames = 0;
      firstStableAt = 0;
      lastSignature = current || '';
    } else if (current === lastSignature) {
      stableFrames += 1;

      if (!firstStableAt) {
        firstStableAt = now;
      }
    } else {
      lastSignature = current;
      stableFrames = 1;
      firstStableAt = now;
    }

    if (
      stableFrames >= REQUIRED_STABLE_FRAMES &&
      firstStableAt &&
      now - firstStableAt >= MIN_STABLE_MS
    ) {
      reveal('stable-final-production-dom');
      return;
    }

    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);

  timeoutId = setTimeout(function () {
    console.warn('[PMD Waiter Zero Shift V3] Safety release', audit());
    reveal('safety-timeout');
  }, SAFETY_TIMEOUT_MS);
})();
