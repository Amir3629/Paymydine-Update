(function () {
  'use strict';

  if (
    !/\/admin\/(?:dashboardwaiternewfinal2|waiter-final2)(?:$|[/?#])/
      .test(location.pathname + location.search + location.hash)
  ) {
    return;
  }

  var VERSION = 'pmd-waiter-final-v2.1.2-loader-race-fix';
  var state = {
    active: true,
    armedRuns: 0,
    recoveries: 0,
    failures: 0,
    timerActive: false,
    startedAt: 0,
    lastReason: '',
    lastTable: '',
    lastDurationMs: 0
  };

  var timer = null;
  var deadlineTimer = null;
  var startedAt = 0;

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isOpeningLabel(element) {
    if (!element || element.nodeType !== 1) return false;

    var ownText = Array.prototype
      .slice.call(element.childNodes || [])
      .filter(function (node) {
        return node.nodeType === Node.TEXT_NODE;
      })
      .map(function (node) {
        return node.textContent || '';
      })
      .join(' ');

    return clean(ownText).toUpperCase().indexOf('OPENING TABLE') !== -1;
  }

  function openingLabels() {
    return Array.prototype
      .slice.call(document.querySelectorAll('body *'))
      .filter(isOpeningLabel);
  }

  function findLoaderPanel(label) {
    if (!label) return null;

    var current = label;
    var fallback = label;

    for (var depth = 0; depth < 7 && current; depth += 1) {
      fallback = current;

      var text = clean(current.textContent).toUpperCase();
      var hasCancel =
        !!current.querySelector('button') &&
        text.indexOf('CANCEL') !== -1;

      var containsMountedPOS =
        !!current.querySelector(
          '[data-pmd-pos-root], [data-pos-root], .pmd-pos-root'
        );

      if (hasCancel && !containsMountedPOS) {
        return current;
      }

      current = current.parentElement;

      if (
        !current ||
        current === document.body ||
        current === document.documentElement
      ) {
        break;
      }
    }

    return fallback;
  }

  function posObjectReady() {
    if (!window.PMDWaiterPOS) return false;

    try {
      if (typeof window.PMDWaiterPOS.debug === 'function') {
        var debug = window.PMDWaiterPOS.debug();

        if (debug && debug.version) {
          return true;
        }
      }
    } catch (error) {
      // The object may exist slightly before debug becomes available.
    }

    return typeof window.PMDWaiterPOS === 'object';
  }

  function posDOMReady() {
    var root = document.querySelector(
      [
        '[data-pmd-pos-root]',
        '[data-pos-root]',
        '.pmd-pos-root',
        '.pmd-waiter-pos-root',
        '.pmd-pos-shell',
        '[data-pmd-waiter-pos]'
      ].join(',')
    );

    if (!root) return false;

    var style = getComputedStyle(root);

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function orderingUIReady() {
    return posObjectReady() || posDOMReady();
  }

  function restoreDocumentInteraction() {
    document.documentElement.classList.remove(
      'pmd-final2-opening-table'
    );

    document.body.classList.remove(
      'pmd-final2-opening-table'
    );

    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');
  }

  function removeOpeningLoader() {
    var labels = openingLabels();
    var removed = [];

    labels.forEach(function (label) {
      var panel = findLoaderPanel(label);

      if (!panel) return;

      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');

      panel.style.setProperty(
        'display',
        'none',
        'important'
      );

      panel.style.setProperty(
        'visibility',
        'hidden',
        'important'
      );

      panel.style.setProperty(
        'pointer-events',
        'none',
        'important'
      );

      removed.push({
        tag: panel.tagName,
        id: panel.id || '',
        className: clean(panel.className).slice(0, 180)
      });
    });

    restoreDocumentInteraction();

    return removed;
  }

  function stopTimers() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (deadlineTimer) {
      clearTimeout(deadlineTimer);
      deadlineTimer = null;
    }

    state.timerActive = false;
  }

  function completeRecovery(reason) {
    var removed = removeOpeningLoader();

    stopTimers();

    state.recoveries += 1;
    state.lastReason = reason;
    state.lastDurationMs = Date.now() - startedAt;

    console.info(
      '[PMD] Final2 loader removed after POS mount',
      {
        reason: reason,
        durationMs: state.lastDurationMs,
        removed: removed
      }
    );

    return true;
  }

  function check() {
    var labels = openingLabels();

    if (!labels.length) {
      if (orderingUIReady()) {
        stopTimers();
      }

      return false;
    }

    if (orderingUIReady()) {
      return completeRecovery('pos-mounted');
    }

    return false;
  }

  function arm(reason, table) {
    stopTimers();

    state.armedRuns += 1;
    state.lastReason = reason || 'unknown';
    state.lastTable = clean(table || '');
    state.startedAt = Date.now();

    startedAt = state.startedAt;
    state.timerActive = true;

    /*
     * Fast polling is bounded to 15 seconds.
     * It is stopped immediately after POS mounts.
     */
    timer = setInterval(check, 50);

    deadlineTimer = setTimeout(function () {
      if (check()) return;

      stopTimers();
      state.failures += 1;
      state.lastReason = 'mount-timeout';
      state.lastDurationMs = Date.now() - startedAt;

      /*
       * Do not leave an infinite blocking screen.
       * Keep the user able to cancel or retry normally.
       */
      restoreDocumentInteraction();

      console.warn(
        '[PMD] Final2 POS did not mount before loader deadline',
        {
          durationMs: state.lastDurationMs,
          openingLabels: openingLabels().length
        }
      );
    }, 15000);

    check();
  }

  function possibleTableElement(target) {
    if (!target || !target.closest) return null;

    return target.closest(
      [
        '[data-final-table]',
        '[data-final-table-id]',
        '[data-table-id]',
        '[data-table]',
        '.pmd-final-table',
        '.pmd-waiter-table-card'
      ].join(',')
    );
  }

  document.addEventListener(
    'click',
    function (event) {
      var table = possibleTableElement(event.target);

      if (!table) return;

      var tableValue =
        table.getAttribute('data-final-table-id') ||
        table.getAttribute('data-table-id') ||
        table.getAttribute('data-final-table') ||
        table.getAttribute('data-table') ||
        clean(table.textContent).slice(0, 40);

      /*
       * Let the native click handler begin mounting first.
       */
      setTimeout(function () {
        arm('table-click', tableValue);
      }, 0);
    },
    true
  );

  /*
   * Recovery for a page already stuck before this script executes.
   */
  if (openingLabels().length) {
    arm('existing-opening-loader', '');
  }

  window.PMDWaiterFinalV212LoaderRecovery = {
    version: VERSION,
    active: true,

    arm: function () {
      arm('manual', '');
      return this.debug();
    },

    recover: function () {
      if (!orderingUIReady()) {
        return {
          recovered: false,
          reason: 'POS is not mounted yet'
        };
      }

      return {
        recovered: completeRecovery('manual-recovery')
      };
    },

    debug: function () {
      return {
        version: VERSION,
        active: state.active,
        timerActive: state.timerActive,
        armedRuns: state.armedRuns,
        recoveries: state.recoveries,
        failures: state.failures,
        lastReason: state.lastReason,
        lastTable: state.lastTable,
        lastDurationMs: state.lastDurationMs,
        openingLabels: openingLabels().length,
        posObjectReady: posObjectReady(),
        posDOMReady: posDOMReady(),
        waiterPOS:
          typeof window.PMDWaiterPOS === 'object'
            ? 'available'
            : typeof window.PMDWaiterPOS
      };
    },

    stop: function () {
      stopTimers();
      return this.debug();
    }
  };

  /*
   * Preserve the previous console name so old checks do not fail.
   */
  window.PMDWaiterFinalV211LoaderRecovery =
    window.PMDWaiterFinalV212LoaderRecovery;

  console.info(
    '[PMD] Final2 V2.1.2 delayed POS mount loader repair active'
  );
})();
