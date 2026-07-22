(function () {
  'use strict';

  if (!/^\/admin\/reservations2\/?$/.test(location.pathname)) {
    return;
  }

  if (window.PMDReservations2RealWaiterEmbedV1) {
    return;
  }

  var reservationsRoot =
    document.querySelector('#pmd-reservations2');

  var waiterRoot =
    document.querySelector('#pmd-waiter-dashboard-root');

  if (!reservationsRoot || !waiterRoot) {
    console.error(
      '[PMD Reservations2 Real Waiter V1] Required roots missing.'
    );

    return;
  }

  var loader = waiterRoot.querySelector(
    '.pmd-r2-waiter-boot'
  );

  function protectShell() {
    var sideMenu =
      document.querySelector(
        '#pmd-side-menu2,' +
        '.pmd-side-menu2,' +
        '[data-pmd-side-menu2]'
      );

    if (sideMenu) {
      sideMenu.style.removeProperty('display');
      sideMenu.style.setProperty(
        'visibility',
        'visible',
        'important'
      );
      sideMenu.style.setProperty(
        'opacity',
        '1',
        'important'
      );
    }

    document.documentElement.style.setProperty(
      'overflow-y',
      'auto',
      'important'
    );

    document.body.style.setProperty(
      'overflow-y',
      'auto',
      'important'
    );
  }

  function hasRealWaiterContent() {
    return !!waiterRoot.querySelector([
      '.pmd-w5-floor-map-real',
      '.pmd-w5-floor',
      '.pmd-w5-table[data-table]',
      '[class*="pmd-w5-kpi"]',
      '[class*="pmd-w5-stat"]',
      '[class*="pmd-w5-order"]'
    ].join(','));
  }

  function finalize() {
    protectShell();

    if (!hasRealWaiterContent()) {
      return false;
    }

    if (loader && loader.isConnected) {
      loader.remove();
    }

    waiterRoot.setAttribute(
      'aria-busy',
      'false'
    );

    reservationsRoot.setAttribute(
      'aria-busy',
      'false'
    );

    return true;
  }

  var attempts = 0;

  var timer = window.setInterval(
    function () {
      attempts += 1;

      if (finalize()) {
        window.clearInterval(timer);

        console.info(
          '[PMD Reservations2 Real Waiter V1] Ready',
          {
            root:
              '#pmd-waiter-dashboard-root',
            iframe: false,
            clone: false,
            sameWaiterRuntime: true,
            sideMenuPreserved: true,
            headerPreserved: true
          }
        );

        return;
      }

      if (attempts >= 300) {
        window.clearInterval(timer);

        if (loader) {
          loader.textContent =
            'Waiter workstation could not initialize.';
        }

        console.error(
          '[PMD Reservations2 Real Waiter V1] ' +
          'Waiter content did not initialize.'
        );
      }
    },
    100
  );

  var refresh =
    reservationsRoot.querySelector(
      '[data-pmd-r2-waiter-refresh]'
    );

  if (refresh) {
    refresh.addEventListener(
      'click',
      function () {
        refresh.disabled = true;

        /*
         * Use the same page/runtime again rather than building a
         * second renderer. This refreshes all Waiter APIs cleanly.
         */
        location.replace(
          '/admin/reservations2' +
          '?real_waiter_refresh=' +
          Date.now()
        );
      }
    );
  }

  /*
   * Some legacy Waiter scripts repeatedly alter body geometry.
   * Re-assert only shell safety without touching Waiter content.
   */
  var shellObserver =
    new MutationObserver(function () {
      protectShell();
      finalize();
    });

  shellObserver.observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: [
        'class',
        'style'
      ]
    }
  );

  shellObserver.observe(
    document.body,
    {
      attributes: true,
      childList: true,
      subtree: false,
      attributeFilter: [
        'class',
        'style'
      ]
    }
  );

  window.PMDReservations2RealWaiterEmbedV1 = {
    version: '1.0.0',
    finalize: finalize,
    protectShell: protectShell,
    hasRealWaiterContent: hasRealWaiterContent,
    iframe: false,
    clone: false
  };
})();
