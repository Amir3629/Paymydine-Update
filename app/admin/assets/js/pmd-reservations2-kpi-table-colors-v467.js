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

  var VERSION = '4.6.8';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var STYLE_ID =
    'pmd-reservations2-kpi-table-colors-v468-style';

  var observer = null;
  var queued = false;
  var running = false;


  function clean(value) {
    return String(
      value == null ? '' : value
    )
      .replace(/\s+/g, ' ')
      .trim();
  }


  function normalize(value) {
    return clean(value)
      .toLowerCase()
      .replace(/[’‘]/g, "'");
  }


  function visible(element) {
    if (!element) {
      return false;
    }

    var style =
      window.getComputedStyle(element);

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getClientRects().length > 0
    );
  }


  function rgb(value) {
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


  /*
   * =====================================================
   * FLOOR TABLES
   * =====================================================
   */

  function floorRoot() {
    return document.getElementById(
      FLOOR_ID
    );
  }


  function floorTables() {
    var root = floorRoot();

    if (!root) {
      return [];
    }

    return Array.prototype.slice.call(
      root.querySelectorAll(
        '.pmd-floor-v1__table'
      )
    ).filter(visible);
  }


  function detectOriginalState(table) {
    var existing =
      table.getAttribute(
        'data-pmd-v468-original-state'
      );

    if (existing) {
      return existing;
    }

    var color = rgb(
      getComputedStyle(table)
        .backgroundColor
    );

    var state = 'unknown';

    if (color) {
      /*
       * Original reserved red:
       * rgb(255, 61, 82)
       */
      if (
        color.r > 210 &&
        color.g < 120 &&
        color.b < 140
      ) {
        state = 'reserved';
      }

      /*
       * Original free green:
       * rgb(34, 206, 112)
       */
      else if (
        color.g > 150 &&
        color.r < 120 &&
        color.b < 170
      ) {
        state = 'free';
      }
    }

    table.setAttribute(
      'data-pmd-v468-original-state',
      state
    );

    return state;
  }


  function updateTables() {
    var counts = {
      total: 0,
      free: 0,
      reserved: 0,
      unknown: 0
    };

    floorTables().forEach(
      function (table) {
        var state =
          detectOriginalState(table);

        counts.total += 1;

        table.removeAttribute(
          'data-pmd-v468-free'
        );

        table.removeAttribute(
          'data-pmd-v468-reserved'
        );

        if (state === 'free') {
          counts.free += 1;

          table.setAttribute(
            'data-pmd-v468-free',
            'true'
          );
        } else if (
          state === 'reserved'
        ) {
          counts.reserved += 1;

          table.setAttribute(
            'data-pmd-v468-reserved',
            'true'
          );
        } else {
          counts.unknown += 1;
        }
      }
    );

    return counts;
  }


  /*
   * =====================================================
   * EXACT KPI TEXT DETECTION
   * =====================================================
   */

  function findExactTextElement(values) {
    var wanted = values.map(normalize);

    var walker =
      document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            var value =
              normalize(node.nodeValue);

            if (!value) {
              return NodeFilter
                .FILTER_REJECT;
            }

            return wanted.indexOf(value) !== -1
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );

    var node = walker.nextNode();

    if (!node) {
      return null;
    }

    return node.parentElement;
  }


  function findKpiCard(label) {
    if (!label) {
      return null;
    }

    var node = label;

    for (
      var level = 0;
      level < 8 && node;
      level += 1
    ) {
      var rect =
        node.getBoundingClientRect();

      var color = rgb(
        getComputedStyle(node)
          .backgroundColor
      );

      if (
        color &&
        rect.width >= 240 &&
        rect.width <= 700 &&
        rect.height >= 90 &&
        rect.height <= 260 &&
        (
          color.r > 120 ||
          color.g > 120 ||
          color.b > 120
        )
      ) {
        return node;
      }

      node = node.parentElement;
    }

    return null;
  }


  function replaceTextNode(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    var changed = false;

    Array.prototype.forEach.call(
      element.childNodes,
      function (node) {
        if (
          !changed &&
          node.nodeType === Node.TEXT_NODE &&
          clean(node.nodeValue)
        ) {
          node.nodeValue = value;
          changed = true;
        }
      }
    );

    if (!changed) {
      element.textContent = value;
    }
  }


  function findLargestNumber(card) {
    if (!card) {
      return null;
    }

    var candidates =
      Array.prototype.slice.call(
        card.querySelectorAll(
          'strong,b,span,div'
        )
      ).filter(
        function (element) {
          return (
            visible(element) &&
            /^\s*(?:\d+|—|-)\s*$/.test(
              clean(element.textContent)
            ) &&
            element.children.length === 0
          );
        }
      );

    candidates.sort(
      function (first, second) {
        var firstSize = parseFloat(
          getComputedStyle(first)
            .fontSize
        ) || 0;

        var secondSize = parseFloat(
          getComputedStyle(second)
            .fontSize
        ) || 0;

        return secondSize - firstSize;
      }
    );

    return candidates[0] || null;
  }


  function findExactDescription(
    values
  ) {
    return findExactTextElement(values);
  }


  function germanMode() {
    var language = String(
      document.documentElement.lang || ''
    ).toLowerCase();

    return (
      language.indexOf('de') === 0 ||
      Boolean(
        findExactTextElement([
          'Heutige Reservierungen'
        ])
      )
    );
  }


  function updateKpis(counts) {
    var todayLabel =
      findExactTextElement([
        "Today's Reservations",
        'Today’s Reservations',
        'Heutige Reservierungen'
      ]);

    var todayCard =
      findKpiCard(todayLabel);

    if (todayCard) {
      todayCard.setAttribute(
        'data-pmd-v468-today-blue',
        'true'
      );
    }

    var pendingLabel =
      findExactTextElement([
        'Pending Confirmations',
        'Ausstehende Bestätigungen'
      ]);

    var pendingCard =
      findKpiCard(pendingLabel);

    if (!pendingLabel || !pendingCard) {
      return;
    }

    var german = germanMode();

    replaceTextNode(
      pendingLabel,
      german
        ? 'Freie Tische'
        : 'Free Tables'
    );

    var number =
      findLargestNumber(pendingCard);

    if (number) {
      number.textContent =
        String(counts.free);

      number.setAttribute(
        'data-pmd-v468-free-count',
        'true'
      );
    }

    var description =
      findExactDescription([
        'Bookings requiring confirmation',
        'Reservierungen, die bestätigt werden müssen'
      ]);

    if (
      description &&
      pendingCard.contains(description)
    ) {
      replaceTextNode(
        description,
        german
          ? 'Aktuell verfügbare Tische'
          : 'Tables currently available'
      );
    }

    pendingCard.setAttribute(
      'data-pmd-v468-free-green',
      'true'
    );
  }


  /*
   * =====================================================
   * STYLING
   * =====================================================
   */

  function installStyle() {
    var old =
      document.getElementById(
        STYLE_ID
      );

    if (old) {
      old.remove();
    }

    var style =
      document.createElement('style');

    style.id = STYLE_ID;

    style.textContent = `
/* Today’s Reservations: Pending-style blue */
[data-pmd-v468-today-blue="true"] {
  background: #32b2d8 !important;
  background-color: #32b2d8 !important;
  border-color: #087aa5 !important;
  color: #061725 !important;
}

[data-pmd-v468-today-blue="true"] * {
  color: #061725 !important;
}

/* Free Tables KPI: green */
[data-pmd-v468-free-green="true"] {
  background: #22ce70 !important;
  background-color: #22ce70 !important;
  border-color: #087c4d !important;
  color: #061b14 !important;
}

[data-pmd-v468-free-green="true"] * {
  color: #061b14 !important;
}

/* Free tables remain green */
.pmd-floor-v1__table[data-pmd-v468-free="true"] {
  background: #22ce70 !important;
  background-color: #22ce70 !important;
  border-color: #087c4d !important;
  color: #061b14 !important;
}

/* Reserved tables become blue */
.pmd-floor-v1__table[data-pmd-v468-reserved="true"] {
  background: #32b2d8 !important;
  background-color: #32b2d8 !important;
  border-color: #087aa5 !important;
  color: #061725 !important;
}

.pmd-floor-v1__table[data-pmd-v468-free="true"] *,
.pmd-floor-v1__table[data-pmd-v468-reserved="true"] * {
  color: inherit !important;
}

/* Preserve selected-table visual state */
.pmd-floor-v1__table[data-pmd-v468-free="true"].is-selected,
.pmd-floor-v1__table[data-pmd-v468-reserved="true"].is-selected,
.pmd-floor-v1__table[data-pmd-v468-free="true"][aria-selected="true"],
.pmd-floor-v1__table[data-pmd-v468-reserved="true"][aria-selected="true"] {
  outline: 3px solid #153b5a !important;
  outline-offset: 3px !important;
}
`;

    document.head.appendChild(style);
  }


  function apply() {
    if (running) {
      return;
    }

    running = true;

    try {
      var counts =
        updateTables();

      updateKpis(counts);
    } finally {
      running = false;
    }
  }


  function schedule() {
    if (queued) {
      return;
    }

    queued = true;

    requestAnimationFrame(
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
      100,
      350,
      800,
      1600
    ].forEach(function (delay) {
      setTimeout(apply, delay);
    });

    observer =
      new MutationObserver(schedule);

    observer.observe(
      document.getElementById(
        'pmd-reservations2'
      ) || document.body,
      {
        childList: true,
        subtree: true
      }
    );

    window
      .PMDReservations2KpiTableColorsV467 = {
        version: VERSION,

        refresh: apply,

        audit: function () {
          return {
            version: VERSION,

            detectedTables:
              floorTables().length,

            freeTables:
              document.querySelectorAll(
                '.pmd-floor-v1__table[data-pmd-v468-free="true"]'
              ).length,

            reservedTables:
              document.querySelectorAll(
                '.pmd-floor-v1__table[data-pmd-v468-reserved="true"]'
              ).length,

            todayBlue:
              Boolean(
                document.querySelector(
                  '[data-pmd-v468-today-blue="true"]'
                )
              ),

            freeKpiGreen:
              Boolean(
                document.querySelector(
                  '[data-pmd-v468-free-green="true"]'
                )
              ),

            freeCount:
              document.querySelector(
                '[data-pmd-v468-free-count="true"]'
              )
                ? clean(
                    document.querySelector(
                      '[data-pmd-v468-free-count="true"]'
                    ).textContent
                  )
                : null
          };
        }
      };

    console.info(
      '[PMD KPI + Table Colors V4.6.8] Ready',
      window
        .PMDReservations2KpiTableColorsV467
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

/* PMD_KPI_ORDER_SAFE_V3
 * فقط خود چهار کارت جابه‌جا می‌شوند؛
 * محتوا و data binding سالم می‌ماند.
 */
(function () {
  'use strict';

  var attempts = 0;

  function cardFromValue(node) {
    if (!node) {
      return null;
    }

    var current = node;

    while (
      current.parentElement &&
      current.parentElement !==
        document.body
    ) {
      var parent =
        current.parentElement;

      var count =
        parent.querySelectorAll(
          '[data-r2-v308-value]'
        ).length;

      if (count !== 1) {
        break;
      }

      current = parent;
    }

    return current;
  }

  function applyOrder() {
    attempts += 1;

    var free =
      cardFromValue(
        document.querySelector(
          '[data-r2-v308-value="pending"]'
        )
      );

    var upcoming =
      cardFromValue(
        document.querySelector(
          '[data-r2-v308-value="upcoming"]'
        )
      );

    var today =
      cardFromValue(
        document.querySelector(
          '[data-r2-v308-value="today"]'
        )
      );

    var tables =
      cardFromValue(
        document.querySelector(
          '[data-r2-v308-value="tables"]'
        )
      );

    var cards = [
      free,
      upcoming,
      today,
      tables
    ];

    if (
      cards.some(
        function (card) {
          return !card;
        }
      )
    ) {
      if (attempts < 20) {
        window.setTimeout(
          applyOrder,
          120
        );
      }

      return;
    }

    var parent =
      cards[0].parentElement;

    if (
      !parent ||
      cards.some(
        function (card) {
          return (
            card.parentElement !==
            parent
          );
        }
      )
    ) {
      return;
    }

    cards.forEach(
      function (card) {
        parent.appendChild(card);
      }
    );

    parent.setAttribute(
      'data-pmd-kpi-order-safe-v3',
      'true'
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      applyOrder,
      {
        once: true
      }
    );
  } else {
    applyOrder();
  }

  window.setTimeout(
    applyOrder,
    250
  );

  window.setTimeout(
    applyOrder,
    900
  );
})();

/* PMD_KPI_INLINE_SEMANTIC_COLORS_V1
 *
 * رنگ‌ها مستقیماً روی Article واقعی KPI با !important
 * اعمال می‌شوند تا هیچ CSS قبلی یا اسکریپت رنگ دیگری
 * نتواند آن‌ها را دوباره عوض کند.
 */
(function () {
  'use strict';

  var retries = 0;

  var palette = {
    pending: {
      background: '#22ce70',
      border: '#087c4d',
      color: '#061b14'
    },

    upcoming: {
      background: '#ff8913',
      border: '#a94b00',
      color: '#171006'
    },

    today: {
      background: '#32b2d8',
      border: '#087aa5',
      color: '#061725'
    },

    tables: {
      background: '#ff3d52',
      border: '#a90f2b',
      color: '#19060a'
    }
  };

  function cardFor(key) {
    var value =
      document.querySelector(
        '[data-r2-v308-value="' +
        key +
        '"]'
      );

    return value
      ? value.closest(
          'article.pmd-r2-v308-card'
        )
      : null;
  }

  function applyCardColor(
    card,
    colors,
    key
  ) {
    if (!card) {
      return;
    }

    card.setAttribute(
      'data-pmd-semantic-kpi',
      key
    );

    card.style.setProperty(
      'background',
      colors.background,
      'important'
    );

    card.style.setProperty(
      'background-color',
      colors.background,
      'important'
    );

    card.style.setProperty(
      'border-color',
      colors.border,
      'important'
    );

    card.style.setProperty(
      'color',
      colors.color,
      'important'
    );

    /*
     * متون داخلی نیز رنگ صحیح را می‌گیرند.
     */
    Array.prototype.forEach.call(
      card.querySelectorAll(
        '.pmd-r2-v308-copy, ' +
        '.pmd-r2-v308-copy *, ' +
        '.pmd-r2-v308-value'
      ),
      function (node) {
        node.style.setProperty(
          'color',
          colors.color,
          'important'
        );
      }
    );
  }

  function apply() {
    retries += 1;

    var missing = false;

    Object.keys(palette)
      .forEach(function (key) {
        var card =
          cardFor(key);

        if (!card) {
          missing = true;
          return;
        }

        applyCardColor(
          card,
          palette[key],
          key
        );
      });

    /*
     * فقط برای بارگذاری اولیه چند بار تلاش می‌شود.
     * Observer دائمی یا Loop سراسری نداریم.
     */
    if (
      missing &&
      retries < 20
    ) {
      window.setTimeout(
        apply,
        120
      );
    }
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      apply,
      {
        once: true
      }
    );
  } else {
    apply();
  }

  /*
   * پس از اجرای سایر اسکریپت‌های KPI دوباره تثبیت می‌کنیم.
   */
  [
    100,
    300,
    700,
    1400
  ].forEach(function (delay) {
    window.setTimeout(
      apply,
      delay
    );
  });

  window
    .PMDApplySemanticKpiColors =
    apply;
})();
