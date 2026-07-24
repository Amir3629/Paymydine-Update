(function () {
  'use strict';

  if (window.PMDReservations2PruneV305) {
    window.PMDReservations2PruneV305.run();
    return;
  }

  var ROOT_ID =
    'pmd-reservations2';

  var HEADER_ID =
    'pmd-r2-clean-header';

  var EMPTY_ID =
    'pmd-r2-empty-content-v305';

  var KPI_ID =
    'pmd-r2-reservation-kpis-v307';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  /* PMD_R2_PRESERVE_RESERVATION_CARDS_V321 */
  var CARDS_ID =
    'pmd-r2-reservation-cards-v320';

  var pruning = false;

  function root() {
    return document.getElementById(
      ROOT_ID
    );
  }

  function header() {
    return document.getElementById(
      HEADER_ID
    );
  }

  /*
   * Return the direct child of ancestor that contains descendant.
   */
  function directBranch(
    ancestor,
    descendant
  ) {
    if (
      !ancestor ||
      !descendant ||
      !ancestor.contains(descendant)
    ) {
      return null;
    }

    var branch = descendant;

    while (
      branch.parentElement &&
      branch.parentElement !== ancestor
    ) {
      branch = branch.parentElement;
    }

    return branch.parentElement === ancestor
      ? branch
      : null;
  }

  /*
   * Inside the preserved header branch, retain only the ancestry
   * leading to the header. This removes KPI/floor siblings while
   * preserving required header wrappers.
   */
  function pruneBranch(
    ancestor,
    preserved
  ) {
    if (
      !ancestor ||
      !preserved ||
      ancestor === preserved
    ) {
      return;
    }

    var branch =
      directBranch(
        ancestor,
        preserved
      );

    if (!branch) {
      return;
    }

    Array.from(
      ancestor.children
    ).forEach(function (child) {
      if (child !== branch) {
        child.remove();
      }
    });

    pruneBranch(
      branch,
      preserved
    );
  }

  function ensureEmptySpace(
    pageRoot,
    preservedBranch
  ) {
    var empty =
      document.getElementById(
        EMPTY_ID
      );

    if (
      empty &&
      empty.parentElement !== pageRoot
    ) {
      empty.remove();
      empty = null;
    }

    if (!empty) {
      empty =
        document.createElement(
          'div'
        );

      empty.id = EMPTY_ID;

      empty.setAttribute(
        'aria-hidden',
        'true'
      );

      pageRoot.appendChild(
        empty
      );
    }

    /*
     * Empty area appears after the reservation KPI row.
     */
    var kpis =
      document.getElementById(
        KPI_ID
      );

    var floor =
      document.getElementById(
        FLOOR_ID
      );

    var cards =
      document.getElementById(
        CARDS_ID
      );

    var anchor =
      (
        cards &&
        cards.parentElement === pageRoot
      )
        ? cards
        : (
            floor &&
            floor.parentElement === pageRoot
          )
            ? floor
            : (
                kpis &&
                kpis.parentElement === pageRoot
              )
                ? kpis
                : preservedBranch;

    if (
      anchor &&
      anchor.nextElementSibling !==
        empty
    ) {
      anchor.insertAdjacentElement(
        'afterend',
        empty
      );
    }
  }

  function run() {
    if (pruning) {
      return;
    }

    var pageRoot = root();
    var cleanHeader = header();

    if (
      !pageRoot ||
      !cleanHeader ||
      !pageRoot.contains(cleanHeader)
    ) {
      return;
    }

    pruning = true;

    try {
      var preservedBranch =
        directBranch(
          pageRoot,
          cleanHeader
        );

      if (!preservedBranch) {
        return;
      }

      /*
       * Remove every direct page child except:
       * - the branch containing the clean header;
       * - the empty content placeholder.
       */
      Array.from(
        pageRoot.children
      ).forEach(function (child) {
        if (
          child === preservedBranch ||
          child.id === KPI_ID ||
          child.id === FLOOR_ID ||
          child.id === CARDS_ID ||
          child.id === EMPTY_ID
        ) {
          return;
        }

        child.remove();
      });

      /*
       * Remove siblings nested between the branch and header.
       */
      pruneBranch(
        preservedBranch,
        cleanHeader
      );

      ensureEmptySpace(
        pageRoot,
        preservedBranch
      );

      /*
       * Extra protection against legacy content injected outside
       * the normal branch.
       */
      [
        '.pmd-w5-kpis',
        '.pmd-w5-floor-shell',
        '.pmd-w5-floor',
        '#pmd-waiter-dashboard-root',
        '.pmd-waiter-dashboard',
        '[data-pmd-waiter-floor]',
        '[class*="floor-controls"]',
        '[class*="floor-panel"]'
      ].forEach(function (selector) {
        pageRoot
          .querySelectorAll(selector)
          .forEach(function (node) {
            if (
              cleanHeader.contains(node) ||
              node.contains(cleanHeader)
            ) {
              return;
            }

            node.remove();
          });
      });

      pageRoot.setAttribute(
        'data-pmd-r2-pruned',
        'v305'
      );
    } finally {
      pruning = false;
    }
  }

  function boot() {
    run();

    var pageRoot = root();

    if (pageRoot) {
      new MutationObserver(function () {
        run();
      }).observe(
        pageRoot,
        {
          childList: true,
          subtree: true
        }
      );
    }

    [
      0,
      50,
      150,
      300,
      700,
      1500,
      3000,
      5000
    ].forEach(function (delay) {
      setTimeout(
        run,
        delay
      );
    });

    console.info(
      '[PMD Reservations2 Prune V3.0.5] Ready',
      {
        header:
          Boolean(header()),

        sideMenu:
          Boolean(
            document.getElementById(
              'pmd-side-menu2'
            )
          ),

        rootChildren:
          root()
            ? root().children.length
            : 0
      }
    );
  }

  window.PMDReservations2PruneV305 = {
    version: '3.0.5',
    run: run
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
