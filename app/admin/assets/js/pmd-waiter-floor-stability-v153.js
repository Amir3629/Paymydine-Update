(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_FLOOR_STABILITY_V153) return;
  window.PMD_WAITER_FLOOR_STABILITY_V153 = true;

  var SAVE_SELECTOR = '[data-w19-save]';
  var shield = null;

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
   * Old V50/V61 save listeners are document-capture listeners and call private
   * snapAll closures. A short-lived compact marker makes those closures return
   * before changing positions. It is removed before the real save serialises.
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

  window.addEventListener('click', beginSaveShield, true);
  document.addEventListener('click', endSaveShield, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', disableSmartSnapApi, true);

  disableSmartSnapApi();
  setTimeout(disableSmartSnapApi, 200);
  setTimeout(disableSmartSnapApi, 900);

  window.PMDWaiterFloorStabilityV153 = {
    run: disableSmartSnapApi,
    debug: function () {
      return {
        version: 'pmd-waiter-floor-stability-v153',
        active: true,
        saveShieldActive: !!shield,
        smartSnapDisabled: !!(
          window.PMDWaiterV61StableKioskNoJump &&
          window.PMDWaiterV61StableKioskNoJump.__pmdV153SnapDisabled
        )
      };
    }
  };

  console.info('[PMD] Waiter floor stability v153 active');
})();
