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

  /*
   * PMD_CHROME_FLOOR_PRESERVATION_V2418
   *
   * The Blade initially renders the canonical Floor inside the
   * legacy waiter root. Chrome can execute this removal before
   * another authority reparents the Floor.
   *
   * Move the canonical Floor to the Reservations2 root first.
   */
  function reservationsRoot() {
    return document.getElementById(
      'pmd-reservations2'
    );
  }

  function canonicalFloor(waiterRoot) {
    if (!waiterRoot) {
      return null;
    }

    return (
      waiterRoot.querySelector(
        '#pmd-r2-shared-floor-canvas-v310'
      ) ||
      waiterRoot.querySelector(
        '[data-pmd-floor]'
      )
    );
  }

  function rescueCanonicalFloor(waiterRoot) {
    var floor =
      canonicalFloor(waiterRoot);

    if (!floor) {
      return {
        floorFound: false,
        rescued: true
      };
    }

    var pageRoot =
      reservationsRoot();

    if (!pageRoot) {
      return {
        floorFound: true,
        rescued: false
      };
    }

    var cards =
      document.getElementById(
        'pmd-r2-reservation-cards-v320'
      );

    var empty =
      document.getElementById(
        'pmd-r2-empty-content-v305'
      );

    var reference =
      (
        cards &&
        cards.parentElement === pageRoot
      )
        ? cards
        : (
            empty &&
            empty.parentElement === pageRoot
          )
            ? empty
            : null;

    if (reference) {
      pageRoot.insertBefore(
        floor,
        reference
      );
    } else {
      pageRoot.appendChild(
        floor
      );
    }

    floor.setAttribute(
      'data-pmd-r2-floor-rescued',
      'v2418'
    );

    return {
      floorFound: true,
      rescued:
        floor.parentElement === pageRoot
    };
  }

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

          var rescue =
            rescueCanonicalFloor(node);

          /*
           * Never delete a wrapper while it still contains the
           * canonical Floor. A failed rescue is safer than losing
           * the entire workspace.
           */
          if (
            rescue.floorFound &&
            !rescue.rescued
          ) {
            console.error(
              '[PMD Chrome Floor Preservation V2.4.1.8] ' +
              'Waiter root retained because Floor rescue failed.'
            );

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
          ),

        floorPresent:
          Boolean(
            document.getElementById(
              'pmd-r2-shared-floor-canvas-v310'
            ) ||
            document.querySelector(
              '[data-pmd-floor]'
            )
          ),

        floorRescued:
          Boolean(
            document.querySelector(
              '[data-pmd-r2-floor-rescued="v2418"]'
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
