(function () {
  'use strict';

  if (
    window.PMDReservations2RemoveWaiterRootV306
  ) {
    window
      .PMDReservations2RemoveWaiterRootV306
      .run();

    return;
  }

  var ROOT_ID =
    'pmd-waiter-dashboard-root';

  var removing = false;

  function onReservations2() {
    return Boolean(
      document.getElementById(
        'pmd-reservations2'
      )
    );
  }

  function removeWaiterRoot() {
    if (
      removing ||
      !onReservations2()
    ) {
      return;
    }

    removing = true;

    try {
      document
        .querySelectorAll(
          '#' + ROOT_ID
        )
        .forEach(function (node) {
          /*
           * Never touch the Reservations header or Side Menu.
           */
          if (
            node.closest(
              '#pmd-r2-clean-header'
            ) ||
            node.closest(
              '#pmd-side-menu2'
            )
          ) {
            return;
          }

          node.remove();
        });

      document.documentElement
        .classList.remove(
          'pmd-waiter-dashboard-active'
        );

      document.body.classList.remove(
        'pmd-waiter-dashboard-active'
      );

      document.body.setAttribute(
        'data-pmd-r2-waiter-root-removed',
        'v306'
      );
    } finally {
      removing = false;
    }
  }

  function boot() {
    removeWaiterRoot();

    /*
     * The old waiter runtime may recreate the root after API
     * refreshes. Watch BODY and remove only that exact root.
     */
    new MutationObserver(
      function (mutations) {
        var found = false;

        mutations.forEach(
          function (mutation) {
            mutation.addedNodes
              .forEach(function (node) {
                if (
                  node.nodeType !== 1
                ) {
                  return;
                }

                if (
                  node.id === ROOT_ID ||
                  (
                    node.querySelector &&
                    node.querySelector(
                      '#' + ROOT_ID
                    )
                  )
                ) {
                  found = true;
                }
              });
          }
        );

        if (found) {
          removeWaiterRoot();
        }
      }
    ).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    /*
     * Extra delayed passes for legacy timers.
     */
    [
      0,
      50,
      150,
      300,
      700,
      1500,
      3000,
      5000,
      10000
    ].forEach(function (delay) {
      setTimeout(
        removeWaiterRoot,
        delay
      );
    });

    console.info(
      '[PMD Reservations2 Remove Waiter Root V3.0.6] Ready',
      {
        header:
          Boolean(
            document.getElementById(
              'pmd-r2-clean-header'
            )
          ),

        sideMenu:
          Boolean(
            document.getElementById(
              'pmd-side-menu2'
            )
          ),

        waiterRoot:
          Boolean(
            document.getElementById(
              ROOT_ID
            )
          )
      }
    );
  }

  window.PMDReservations2RemoveWaiterRootV306 = {
    version: '3.0.6',
    run: removeWaiterRoot
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();
