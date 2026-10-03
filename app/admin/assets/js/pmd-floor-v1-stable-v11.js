(function () {
  'use strict';

  if (!/^\/admin\/floor\/?$/.test(location.pathname)) {
    return;
  }

  if (window.PMDFloorStableV11) {
    return;
  }

  function boot() {
    var root =
      document.querySelector(
        '.pmd-floor-v1[data-pmd-floor]'
      );

    if (!root) {
      return;
    }

    var canvas =
      root.querySelector(
        '[data-floor-canvas]'
      );

    var loading =
      root.querySelector(
        '[data-floor-loading]'
      );

    var empty =
      root.querySelector(
        '[data-floor-empty]'
      );

    var search =
      root.querySelector(
        '[data-floor-search]'
      );

    var allButton =
      root.querySelector(
        '[data-floor-filter="all"]'
      );

    var scheduled = 0;
    var observer = null;

    function tables() {
      return Array.prototype.slice.call(
        root.querySelectorAll(
          '[data-floor-table]'
        )
      );
    }

    function visibleTables() {
      return tables().filter(
        function (table) {
          return !table.classList.contains(
            'is-filtered'
          );
        }
      );
    }

    function activeFilter() {
      var active =
        root.querySelector(
          '[data-floor-filter].is-active'
        );

      return active
        ? active.getAttribute(
            'data-floor-filter'
          ) || 'all'
        : 'all';
    }

    function setFilterMarker() {
      root.setAttribute(
        'data-pmd-filter',
        activeFilter()
      );
    }

    function repairOverlay() {
      var rows = tables();
      var visible = visibleTables();

      setFilterMarker();

      /*
       * Once actual tables exist, the loading overlay cannot
       * remain visible.
       */
      if (rows.length && loading) {
        loading.hidden = true;
        loading.setAttribute(
          'aria-hidden',
          'true'
        );
      }

      /*
       * The empty overlay is visible only when:
       * - loading has finished
       * - and no table matches the selected filter/search.
       */
      if (empty) {
        var shouldShow =
          rows.length > 0 &&
          visible.length === 0;

        empty.hidden = !shouldShow;
        empty.setAttribute(
          'aria-hidden',
          shouldShow ? 'false' : 'true'
        );
      }

      root.setAttribute(
        'data-pmd-table-count',
        String(rows.length)
      );

      root.setAttribute(
        'data-pmd-visible-count',
        String(visible.length)
      );

      root.setAttribute(
        'aria-busy',
        rows.length ? 'false' : 'true'
      );
    }

    function scheduleRepair() {
      window.clearTimeout(scheduled);

      scheduled =
        window.setTimeout(
          repairOverlay,
          30
        );
    }

    /*
     * First load must always begin in All mode unless the user
     * actively chooses another filter afterward.
     */
    if (allButton) {
      root.querySelectorAll(
        '[data-floor-filter]'
      ).forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button === allButton
        );
      });

      root.setAttribute(
        'data-pmd-filter',
        'all'
      );
    }

    root.addEventListener(
      'click',
      function (event) {
        if (
          event.target.closest(
            '[data-floor-filter]'
          )
        ) {
          window.setTimeout(
            repairOverlay,
            0
          );
        }

        if (
          event.target.closest(
            '[data-floor-refresh]'
          )
        ) {
          window.setTimeout(
            repairOverlay,
            150
          );
        }
      },
      false
    );

    if (search) {
      search.addEventListener(
        'input',
        function () {
          window.setTimeout(
            repairOverlay,
            0
          );
        }
      );
    }

    /*
     * Observe only actual canvas updates.
     * No polling, class repaint loops or page-wide observers.
     */
    if (canvas) {
      observer =
        new MutationObserver(
          scheduleRepair
        );

      observer.observe(
        canvas,
        {
          childList: true,
          subtree: false
        }
      );
    }

    repairOverlay();

    window.setTimeout(
      repairOverlay,
      250
    );

    window.setTimeout(
      repairOverlay,
      900
    );

    window.PMDFloorStableV11 = {
      version: '1.1.0',

      refresh: repairOverlay,

      getState: function () {
        return {
          filter: activeFilter(),
          tables: tables().length,
          visibleTables:
            visibleTables().length,
          loadingVisible:
            Boolean(
              loading &&
              !loading.hidden
            ),
          emptyVisible:
            Boolean(
              empty &&
              !empty.hidden
            )
        };
      },

      destroy: function () {
        window.clearTimeout(
          scheduled
        );

        if (observer) {
          observer.disconnect();
        }
      }
    };

    console.info(
      '[PMD Floor Stable V1.1] Ready',
      window.PMDFloorStableV11.getState()
    );
  }

  if (
    document.readyState === 'loading'
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
