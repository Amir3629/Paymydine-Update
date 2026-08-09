(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');

  if (route !== '/admin/dashboardwaiternew' && route !== '/admin/waiter') {
    return;
  }

  if (window.PMDWaiterZeroShiftV1) {
    return;
  }

  var body = document.body;
  var root = document.querySelector('[data-pmd-waiter-v2-root]');

  if (!body || !root) {
    return;
  }

  var grid = root.querySelector('[data-v2-table-grid]');
  var loading = root.querySelector('[data-v2-loading]');
  var empty = root.querySelector('[data-v2-empty]');
  var areas = root.querySelector('[data-v2-areas]');
  var topActions = root.querySelector('.pmd-v2-top-actions');
  var userSource = root.querySelector('[data-v2-user]');

  var startedAt = performance.now();
  var frameId = 0;
  var timeoutId = 0;
  var done = false;
  var stableFrames = 0;
  var firstStableAt = 0;
  var lastSignature = '';
  var reason = 'booting';

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

  function cards() {
    if (!grid) return [];

    return Array.prototype.slice.call(
      grid.querySelectorAll('[data-v2-open-table]')
    );
  }

  function baseDataReady() {
    if (!grid || !loading) return false;

    var rows = cards();
    var emptyVisible = Boolean(
      empty &&
      !empty.hidden
    );

    return loading.hidden && (rows.length > 0 || emptyVisible);
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

  function v221Ready() {
    if (!requiresV221) return true;

    return Boolean(
      topActions &&
      topActions.querySelector('[data-v221-theme-toggle]')
    );
  }

  function sourceUserReady() {
    if (!requiresV23) return true;
    if (!userSource) return false;

    var value = String(userSource.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return Boolean(
      value &&
      value !== 'live service' &&
      value.indexOf('live service') !== -1
    );
  }

  function v23Ready() {
    if (!requiresV23) return true;

    return Boolean(
      sourceUserReady() &&
      topActions &&
      topActions.querySelector('[data-v23-online-user]')
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

  function signature() {
    if (!baseDataReady() || !v21Ready() || !v221Ready() || !v23Ready()) {
      return null;
    }

    var rows = cards();
    var parts = [
      'root=' + rect(root),
      'top=' + rect(root.querySelector('.pmd-v2-topbar')),
      'actions=' + rect(topActions),
      'command=' + rect(root.querySelector('.pmd-v2-command')),
      'areas=' + rect(areas),
      'stage=' + rect(root.querySelector('.pmd-v2-table-stage')),
      'grid=' + rect(grid),
      'areaButtons=' + (areas ? areas.querySelectorAll('[data-v2-area]').length : 0),
      'cards=' + rows.length
    ];

    rows.forEach(function (card, index) {
      parts.push(
        index + ':' +
        String(card.getAttribute('data-v2-open-table') || '') + ':' +
        String(card.getAttribute('data-v21-priority') || '') + ':' +
        rect(card)
      );
    });

    return parts.join('|');
  }

  function reveal(nextReason) {
    if (done) return;

    done = true;
    reason = nextReason || 'stable-launcher';

    if (frameId) {
      cancelAnimationFrame(frameId);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    body.classList.add('pmd-waiter-zero-shift-ready-v1');
    root.setAttribute('data-pmd-waiter-zero-shift-ready', '1');

    console.info('[PMD Waiter Zero Shift V1] Launcher released', {
      route: route,
      reason: reason,
      stableFrames: stableFrames,
      elapsedMs: Math.round(performance.now() - startedAt),
      cards: cards().length,
      requiresV21: requiresV21,
      requiresV221: requiresV221,
      requiresV23: requiresV23
    });
  }

  function tick(now) {
    if (done) return;

    var current = signature();

    if (!current) {
      stableFrames = 0;
      firstStableAt = 0;
      lastSignature = '';
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
      stableFrames >= 4 &&
      firstStableAt &&
      now - firstStableAt >= 48
    ) {
      reveal('stable-final-launcher-geometry');
      return;
    }

    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);

  timeoutId = setTimeout(function () {
    reveal('safety-timeout');
  }, 5500);

  window.PMDWaiterZeroShiftV1 = {
    version: '1.0.0',
    reveal: reveal,
    audit: function () {
      return {
        version: '1.0.0',
        route: route,
        ready: done,
        reason: reason,
        stableFrames: stableFrames,
        baseDataReady: baseDataReady(),
        v21Ready: v21Ready(),
        v221Ready: v221Ready(),
        v23Ready: v23Ready(),
        cards: cards().length,
        areaButtons: areas
          ? areas.querySelectorAll('[data-v2-area]').length
          : 0,
        elapsedMs: Math.round(performance.now() - startedAt)
      };
    }
  };
})();
