(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_FLOOR_STABILITY_V153) return;
  window.PMD_WAITER_FLOOR_STABILITY_V153 = true;

  var TABLE_SELECTOR = '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]';
  var SAVE_SELECTOR = '[data-w19-save]';
  var shield = null;
  var observer = null;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function map() {
    return document.querySelector('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real');
  }

  function eventElement(e) {
    return e && e.target && e.target.nodeType === 1 ? e.target : null;
  }

  function isSaveClick(e) {
    var target = eventElement(e);
    return !!(target && target.closest(SAVE_SELECTOR));
  }

  /*
   * V61 previously ran collision resolution over every table three times on
   * every save. V50 also called the public alias after each drop. Keep the
   * existing drag boundary clamp, but disable automatic collision movement.
   * The waiter must be able to place a table exactly where it was dropped.
   */
  function disableSmartSnapApi() {
    [
      window.PMDWaiterV60No404SmartSnap,
      window.PMDWaiterV61StableKioskNoJump
    ].forEach(function (api) {
      if (!api || api.__pmdV153SnapDisabled) return;

      api.__pmdV153OriginalSnapTable = api.snapTable;
      api.__pmdV153OriginalSnapAll = api.snapAll;
      api.snapTable = function () { return false; };
      api.snapAll = function () { return 0; };
      api.__pmdV153SnapDisabled = true;
    });
  }

  /*
   * The old V50/V61 save listeners are document-capture listeners and call
   * their private snapAll closures. A short-lived compact marker makes those
   * closures return before changing positions. It is added at window capture
   * (before document listeners) and removed by our later document listener,
   * before the real save handler serialises the layout.
   */
  function beginSaveShield(e) {
    if (!isSaveClick(e)) return;

    var floorMap = map();
    if (!floorMap || shield) return;

    shield = {
      map: floorMap,
      hadCompact: floorMap.classList.contains('pmd-v40-compact-authority')
    };

    if (!shield.hadCompact) {
      floorMap.classList.add('pmd-v40-compact-authority');
    }

    floorMap.setAttribute('data-pmd-v153-save-shield', '1');
  }

  function endSaveShield(e) {
    if (!shield || !isSaveClick(e)) return;

    if (!shield.hadCompact && shield.map) {
      shield.map.classList.remove('pmd-v40-compact-authority');
    }

    if (shield.map) {
      shield.map.removeAttribute('data-pmd-v153-save-shield');
    }

    shield = null;
  }

  function hasOrder(table) {
    if (!table) return false;

    if (table.matches('.is-active, .is-ready, .is-payment, .is-urgent')) {
      return true;
    }

    var rawStatus = String(
      table.getAttribute('data-status') ||
      table.getAttribute('data-state') ||
      ''
    ).toLowerCase();

    if (rawStatus && !/^(free|available|empty|normal)$/.test(rawStatus)) {
      return true;
    }

    var badge = table.querySelector('small');
    if (badge) {
      var count = parseInt(String(badge.textContent || '').replace(/[^0-9]/g, ''), 10);
      if (isFinite(count) && count > 0) return true;
    }

    return false;
  }

  function applyTableStates() {
    document.querySelectorAll(TABLE_SELECTOR).forEach(function (table) {
      table.setAttribute('data-pmd-v153-state', hasOrder(table) ? 'order' : 'free');
    });

    var legend = document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-legend');
    if (legend && legend.getAttribute('data-pmd-v153-legend') !== '1') {
      legend.setAttribute('data-pmd-v153-legend', '1');
      legend.innerHTML = [
        '<h4>Floor color guide</h4>',
        '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v61-dot-green"></span><div><b>Green</b><br>Free table.</div></div>',
        '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v61-dot-red"></span><div><b>Red</b><br>New or active order on this table.</div></div>'
      ].join('');
    }
  }

  function bindObserver() {
    var dashboardRoot = root();
    if (!dashboardRoot || observer) return;

    observer = new MutationObserver(function (mutations) {
      var needsApply = mutations.some(function (mutation) {
        return mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length);
      });

      if (needsApply) {
        requestAnimationFrame(applyTableStates);
      }
    });

    observer.observe(dashboardRoot, {
      childList: true,
      subtree: true
    });
  }

  window.addEventListener('click', beginSaveShield, true);
  document.addEventListener('click', endSaveShield, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    disableSmartSnapApi();
    applyTableStates();
    bindObserver();
  }, true);

  disableSmartSnapApi();
  applyTableStates();
  bindObserver();

  setTimeout(function () {
    disableSmartSnapApi();
    applyTableStates();
    bindObserver();
  }, 200);

  setTimeout(function () {
    disableSmartSnapApi();
    applyTableStates();
    bindObserver();
  }, 900);

  window.PMDWaiterFloorStabilityV153 = {
    run: function () {
      disableSmartSnapApi();
      applyTableStates();
      bindObserver();
    },
    debug: function () {
      return {
        version: 'pmd-waiter-floor-stability-v153',
        active: true,
        saveShieldActive: !!shield,
        smartSnapDisabled: !!(
          window.PMDWaiterV61StableKioskNoJump &&
          window.PMDWaiterV61StableKioskNoJump.__pmdV153SnapDisabled
        ),
        tables: Array.from(document.querySelectorAll(TABLE_SELECTOR)).map(function (table) {
          return {
            table: table.getAttribute('data-table'),
            state: table.getAttribute('data-pmd-v153-state'),
            left: table.style.left,
            top: table.style.top
          };
        })
      };
    }
  };

  console.info('[PMD] Waiter floor stability v153 active');
})();
