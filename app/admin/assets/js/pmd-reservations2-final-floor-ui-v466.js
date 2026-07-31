(function () {
  'use strict';

  var route = String(
    window.location.pathname || ''
  ).replace(/\/+$/, '');

  if (
    route !== '/admin/reservations' &&
    route !== '/admin/reservations2'
  ) {
    return;
  }

  if (window.PMDReservations2FinalFloorUIV466) {
    return;
  }

  var VERSION = '4.6.6';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var TOOLBAR_ID =
    'pmd-r2-floor-toolbar-v316';

  var STYLE_ID =
    'pmd-reservations2-final-floor-ui-v466-style';

  var observer = null;
  var queued = false;
  var applying = false;


  function clean(value) {
    return String(
      value == null ? '' : value
    )
      .replace(/\s+/g, ' ')
      .trim();
  }


  function pageRoot() {
    return (
      document.getElementById(
        'pmd-reservations2'
      ) ||
      document.body
    );
  }


  function floorRoot() {
    return document.getElementById(
      FLOOR_ID
    );
  }


  function toolbar() {
    return document.getElementById(
      TOOLBAR_ID
    );
  }


  /*
   * -------------------------------------------------------
   * Area selector
   * -------------------------------------------------------
   */

  function removeAreaSelector() {
    var selectors = [
      '.pmd-floor-v1__filters.is-area-selector',
      '.is-area-selector[role="group"]',
      '[aria-label="Select restaurant area"]',
      '[aria-label*="restaurant area" i]'
    ];

    document.querySelectorAll(
      selectors.join(',')
    ).forEach(function (element) {
      var parent = element.parentElement;

      element.remove();

      if (parent) {
        parent.setAttribute(
          'data-pmd-area-selector-removed',
          'v466'
        );
      }
    });
  }


  /*
   * Keep the native status bar.
   * Do not move the Floor, toolbar or page sections.
   */

  function normalizeToolbarRow() {
    var tool = toolbar();

    if (!tool) {
      return;
    }

    var statusbar = tool.closest(
      '.pmd-floor-v1__statusbar'
    ) || tool.parentElement;

    if (!statusbar) {
      return;
    }

    statusbar.setAttribute(
      'data-pmd-toolbar-only-row',
      'v466'
    );

    tool.setAttribute(
      'data-pmd-toolbar-authority',
      'v466'
    );
  }


  /*
   * -------------------------------------------------------
   * Floor tables
   * -------------------------------------------------------
   */

  function parseRgb(value) {
    var match = String(
      value || ''
    ).match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
    );

    if (!match) {
      return null;
    }

    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3])
    };
  }


  function numericTableCandidates() {
    var root = floorRoot();

    if (!root) {
      return [];
    }

    var candidates =
      Array.prototype.slice.call(
        root.querySelectorAll(
          [
            '[data-floor-table]',
            '[data-floor-table-id]',
            '[data-table-id]',
            '[data-table-number]',
            '.pmd-floor-v1__table',
            '.pmd-floor-table',
            'button',
            '[role="button"]'
          ].join(',')
        )
      );

    return candidates.filter(
      function (element, index) {
        if (
          candidates.indexOf(element) !== index
        ) {
          return false;
        }

        var text = clean(
          element.textContent
        );

        if (!/^\d+$/.test(text)) {
          return false;
        }

        var rect =
          element.getBoundingClientRect();

        return (
          rect.width >= 45 &&
          rect.width <= 190 &&
          rect.height >= 45 &&
          rect.height <= 190
        );
      }
    );
  }


  function originalTableState(element) {
    var remembered =
      element.getAttribute(
        'data-pmd-original-table-state'
      );

    if (remembered) {
      return remembered;
    }

    var source = [
      element.className,
      element.getAttribute(
        'data-status'
      ),
      element.getAttribute(
        'data-state'
      ),
      element.getAttribute(
        'data-table-status'
      ),
      element.getAttribute(
        'aria-label'
      )
    ].join(' ').toLowerCase();

    var state = 'unknown';

    if (
      /free|available|vacant|frei/.test(
        source
      )
    ) {
      state = 'free';
    } else if (
      /reserved|booked|occupied|busy|belegt/.test(
        source
      )
    ) {
      state = 'reserved';
    } else {
      var style =
        window.getComputedStyle(element);

      var rgb =
        parseRgb(
          style.backgroundColor
        );

      if (rgb) {
        if (
          rgb.g > rgb.r + 25 &&
          rgb.g > rgb.b + 10
        ) {
          state = 'free';
        } else if (
          rgb.r > rgb.g + 30 &&
          rgb.r > rgb.b + 20
        ) {
          state = 'reserved';
        }
      }
    }

    element.setAttribute(
      'data-pmd-original-table-state',
      state
    );

    return state;
  }


  function updateTableColors() {
    var counts = {
      total: 0,
      free: 0,
      reserved: 0,
      unknown: 0
    };

    numericTableCandidates().forEach(
      function (element) {
        var state =
          originalTableState(element);

        counts.total += 1;

        element.removeAttribute(
          'data-pmd-table-free'
        );

        element.removeAttribute(
          'data-pmd-table-reserved'
        );

        if (state === 'free') {
          counts.free += 1;

          element.setAttribute(
            'data-pmd-table-free',
            'v466'
          );
        } else if (
          state === 'reserved'
        ) {
          counts.reserved += 1;

          element.setAttribute(
            'data-pmd-table-reserved',
            'v466'
          );
        } else {
          counts.unknown += 1;
        }
      }
    );

    return counts;
  }


  /*
   * -------------------------------------------------------
   * KPI detection
   * -------------------------------------------------------
   */

  function textNodes() {
    return document.querySelectorAll(
      [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'b',
        'span',
        'p',
        'div'
      ].join(',')
    );
  }


  function findExactText(patterns) {
    var nodes = textNodes();

    for (
      var index = 0;
      index < nodes.length;
      index += 1
    ) {
      var element = nodes[index];

      if (
        element.children.length > 2
      ) {
        continue;
      }

      var text = clean(
        element.textContent
      ).toLowerCase();

      var matched =
        patterns.some(
          function (pattern) {
            return text === pattern ||
              text.indexOf(pattern) !== -1;
          }
        );

      if (matched) {
        return element;
      }
    }

    return null;
  }


  function findKpiCard(label) {
    if (!label) {
      return null;
    }

    var node = label;

    for (
      var depth = 0;
      depth < 8 && node;
      depth += 1
    ) {
      var rect =
        node.getBoundingClientRect();

      var text = clean(
        node.textContent
      );

      if (
        rect.width >= 220 &&
        rect.width <= 700 &&
        rect.height >= 90 &&
        rect.height <= 260 &&
        text.length <= 400
      ) {
        return node;
      }

      node = node.parentElement;
    }

    return null;
  }


  function replaceElementText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    if (element.children.length === 0) {
      element.textContent = value;
      return;
    }

    var changed = false;

    Array.prototype.forEach.call(
      element.childNodes,
      function (node) {
        if (
          !changed &&
          node.nodeType === 3 &&
          clean(node.textContent)
        ) {
          node.textContent = value;
          changed = true;
        }
      }
    );

    if (!changed) {
      element.textContent = value;
    }
  }


  function findKpiValue(card) {
    if (!card) {
      return null;
    }

    var candidates =
      Array.prototype.slice.call(
        card.querySelectorAll(
          [
            '[data-kpi-value]',
            '[class*="value"]',
            '[class*="number"]',
            'strong',
            'b',
            'span',
            'div'
          ].join(',')
        )
      );

    candidates = candidates.filter(
      function (element) {
        return /^\s*(?:\d+|—|-)\s*$/.test(
          clean(element.textContent)
        );
      }
    );

    candidates.sort(
      function (first, second) {
        var firstSize = parseFloat(
          getComputedStyle(first).fontSize
        ) || 0;

        var secondSize = parseFloat(
          getComputedStyle(second).fontSize
        ) || 0;

        return secondSize - firstSize;
      }
    );

    return candidates[0] || null;
  }


  function findKpiDescription(card) {
    if (!card) {
      return null;
    }

    var candidates =
      Array.prototype.slice.call(
        card.querySelectorAll(
          'p,small,span,div'
        )
      );

    return candidates.find(
      function (element) {
        var text = clean(
          element.textContent
        ).toLowerCase();

        return (
          text.indexOf(
            'requiring confirmation'
          ) !== -1 ||
          text.indexOf(
            'bestätigt werden'
          ) !== -1
        );
      }
    ) || null;
  }


  function languageIsGerman() {
    return (
      document.documentElement.lang
        .toLowerCase()
        .indexOf('de') === 0 ||
      clean(document.body.textContent)
        .indexOf(
          'Heutige Reservierungen'
        ) !== -1
    );
  }


  function updateKpis(counts) {
    var todayLabel =
      findExactText([
        "today's reservations",
        'today’s reservations',
        'heutige reservierungen'
      ]);

    var todayCard =
      findKpiCard(todayLabel);

    if (todayCard) {
      todayCard.setAttribute(
        'data-pmd-kpi-today-blue',
        'v466'
      );
    }

    var pendingLabel =
      findExactText([
        'pending confirmations',
        'ausstehende bestätigungen'
      ]);

    var pendingCard =
      findKpiCard(pendingLabel);

    if (!pendingCard) {
      return;
    }

    var german =
      languageIsGerman();

    replaceElementText(
      pendingLabel,
      german
        ? 'Freie Tische'
        : 'Free Tables'
    );

    var value =
      findKpiValue(pendingCard);

    if (value) {
      value.textContent =
        String(counts.free);

      value.setAttribute(
        'data-pmd-free-table-count',
        'v466'
      );
    }

    var description =
      findKpiDescription(pendingCard);

    if (description) {
      replaceElementText(
        description,
        german
          ? 'Aktuell verfügbare Tische'
          : 'Tables currently available'
      );
    }

    pendingCard.setAttribute(
      'data-pmd-kpi-free-green',
      'v466'
    );
  }


  /*
   * -------------------------------------------------------
   * Style
   * -------------------------------------------------------
   */

  function installStyle() {
    var previous =
      document.getElementById(
        STYLE_ID
      );

    if (previous) {
      previous.remove();
    }

    var style =
      document.createElement('style');

    style.id = STYLE_ID;

    style.textContent = `
/* The Area selector is removed at runtime and hidden as fallback. */
.pmd-floor-v1__filters.is-area-selector,
.is-area-selector[role="group"],
[aria-label="Select restaurant area"],
[aria-label*="restaurant area" i] {
  display: none !important;
}

/*
 * Keep the original native status bar.
 * Do not create another header and do not move the Floor.
 */
.pmd-floor-v1__statusbar[data-pmd-toolbar-only-row="v466"] {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: nowrap !important;

  width: 100% !important;
  min-height: 66px !important;
  padding: 10px 14px !important;
  gap: 10px !important;

  overflow-x: auto !important;
}

/* Only the operational toolbar remains. */
#${TOOLBAR_ID} {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: nowrap !important;

  width: auto !important;
  min-width: max-content !important;

  margin: 0 0 0 auto !important;
  gap: 10px !important;
}

#${TOOLBAR_ID}
.pmd-r2-floor-tool-v316 {
  flex: 0 0 auto !important;
  white-space: nowrap !important;
}

/* Today's Reservations uses the former blue KPI family. */
[data-pmd-kpi-today-blue="v466"] {
  background: #32b2d8 !important;
  border-color: #087aa5 !important;
  color: #061725 !important;
}

[data-pmd-kpi-today-blue="v466"] * {
  color: #061725 !important;
}

/* Free Tables KPI is green. */
[data-pmd-kpi-free-green="v466"] {
  background: #22c96f !important;
  border-color: #087c4d !important;
  color: #061b14 !important;
}

[data-pmd-kpi-free-green="v466"] * {
  color: #061b14 !important;
}

/* Free Floor tables remain green. */
[data-pmd-table-free="v466"] {
  background: #22c96f !important;
  background-color: #22c96f !important;
  border-color: #087c4d !important;
  color: #061b14 !important;
}

/* Reserved Floor tables become blue. */
[data-pmd-table-reserved="v466"] {
  background: #32b2d8 !important;
  background-color: #32b2d8 !important;
  border-color: #087aa5 !important;
  color: #061725 !important;
}

[data-pmd-table-free="v466"] *,
[data-pmd-table-reserved="v466"] * {
  color: inherit !important;
}

/* Preserve the selected-table outline. */
[data-pmd-table-free="v466"].is-selected,
[data-pmd-table-reserved="v466"].is-selected,
[data-pmd-table-free="v466"][aria-selected="true"],
[data-pmd-table-reserved="v466"][aria-selected="true"] {
  outline: 3px solid #153b5a !important;
  outline-offset: 3px !important;
}

@media (max-width: 900px) {
  .pmd-floor-v1__statusbar[data-pmd-toolbar-only-row="v466"] {
    justify-content: flex-start !important;
  }

  #${TOOLBAR_ID} {
    margin-left: 0 !important;
  }
}
`;

    document.head.appendChild(style);
  }


  function apply() {
    if (applying) {
      return;
    }

    applying = true;

    try {
      removeAreaSelector();
      normalizeToolbarRow();

      var counts =
        updateTableColors();

      updateKpis(counts);
    } finally {
      applying = false;
    }
  }


  function schedule() {
    if (queued) {
      return;
    }

    queued = true;

    window.requestAnimationFrame(
      function () {
        queued = false;
        apply();
      }
    );
  }


  function boot() {
    installStyle();
    apply();

    [
      150,
      450,
      1000,
      2000
    ].forEach(function (delay) {
      window.setTimeout(
        apply,
        delay
      );
    });

    observer =
      new MutationObserver(schedule);

    observer.observe(
      pageRoot(),
      {
        childList: true,
        subtree: true
      }
    );

    window.PMDReservations2FinalFloorUIV466 = {
      version: VERSION,

      refresh: apply,

      audit: function () {
        return {
          version: VERSION,

          areaSelectors:
            document.querySelectorAll(
              [
                '.pmd-floor-v1__filters.is-area-selector',
                '.is-area-selector[role="group"]',
                '[aria-label="Select restaurant area"]'
              ].join(',')
            ).length,

          toolbar:
            Boolean(toolbar()),

          toolbarParent:
            toolbar() &&
            toolbar().parentElement
              ? toolbar()
                  .parentElement
                  .className
              : null,

          freeTables:
            document.querySelectorAll(
              '[data-pmd-table-free="v466"]'
            ).length,

          reservedTables:
            document.querySelectorAll(
              '[data-pmd-table-reserved="v466"]'
            ).length,

          todayBlue:
            Boolean(
              document.querySelector(
                '[data-pmd-kpi-today-blue="v466"]'
              )
            ),

          freeKpiGreen:
            Boolean(
              document.querySelector(
                '[data-pmd-kpi-free-green="v466"]'
              )
            )
        };
      }
    };

    console.info(
      '[PMD Reservations2 Final Floor UI V4.6.6] Ready',
      window
        .PMDReservations2FinalFloorUIV466
        .audit()
    );
  }


  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
