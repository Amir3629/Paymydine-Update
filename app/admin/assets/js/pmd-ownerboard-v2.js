/* ==========================================================
   PMD OWNERBOARD V2 — CLEAN FINAL RUNTIME
   Route: /admin/ownerboard

   No boot observers.
   No polling.
   No root hide/reveal.
   One owner for KPI + analytics UI.
   Canonical pmd-floor-v1.js remains the Floor owner.
   ========================================================== */
(function () {
  'use strict';

  var route =
    String(window.location.pathname || '')
      .replace(/\/+$/, '');

  if (route !== '/admin/ownerboard') {
    return;
  }

  var root =
    document.getElementById(
      'pmd-ownerboard'
    );

  if (!root) {
    return;
  }

  var VERSION =
    '2.0.0-exact-clean';

  var locale =
    String(
      root.getAttribute('data-locale') ||
      'en'
    ).toLowerCase();

  var isDe =
    locale === 'de';

  var endpoints = {
    kpis:
      root.getAttribute(
        'data-kpis-endpoint'
      ) ||
      '/admin/dashboard2?pmd_kpis=1',

    analytics:
      root.getAttribute(
        'data-analytics-endpoint'
      ) ||
      '/admin/dashboard2?pmd_analytics=1'
  };

  var KPI_ORDER = [
    'revenue',
    'guests',
    'turnover',
    'channels',
    'kitchen',
    'occupancy',
    'menu',
    'tips'
  ];

  var KPI_DEFAULTS = [
    'revenue',
    'guests',
    'turnover',
    'channels'
  ];

  /*
   * Reuse Dashboard2's exact saved KPI choices.
   * Switching between Dashboard2 and Ownerboard therefore does not
   * silently reset the four user-selected metrics.
   */
  var KPI_SELECTION_KEY =
    'pmd.dashboard2.kpiSelection.v3';

  var KPI_PERIOD_KEY =
    'pmd.dashboard2.kpi.periods.v3';

  var SALES_MODE_KEY =
    'pmd.dashboard2.salesChartMode.v1';

  var TOP_ITEMS_PERIOD_KEY =
    'pmd.dashboard2.topItemsPeriod.v1';

  var DONUT_PERIOD_PREFIX =
    'pmd.dashboard2.donutPeriod.';

  /*
   * Match the CURRENT final Dashboard2 title authority exactly.
   * The German catalog currently translates Revenue only, while
   * Channels has a dedicated server-side German title. The other KPI
   * labels intentionally remain the same English strings visible on the
   * accepted Dashboard2, so Ownerboard does not invent a new language mix.
   */
  var KPI_TITLES = {
    revenue: isDe ? 'Umsatz' : 'Revenue',
    guests: 'Guests Served',
    turnover: 'Table Turnover',
    channels: isDe ? 'Vor Ort / Zum Mitnehmen' : 'Dine In / Take Away',
    kitchen: 'Kitchen Ticket Time',
    occupancy: 'Table Occupancy',
    menu: 'Menu Availability',
    tips: 'Tips'
  };

  var TEXT = {
    connected:
      isDe ? 'Verbunden' : 'Connected',

    unavailable:
      isDe
        ? 'Quelle nicht verfügbar'
        : 'Source unavailable',

    samples:
      isDe ? 'Datensätze' : 'samples',

    today:
      isDe ? 'Heute' : 'Today',

    month:
      isDe ? 'Dieser Monat' : 'This month',

    current:
      isDe ? 'Aktuell' : 'Current',

    noData:
      isDe ? 'Keine Daten' : 'No data',

    chooseKpi:
      isDe ? 'KPI auswählen' : 'Choose KPI',

    save:
      isDe ? 'Speichern' : 'Save',

    edit:
      isDe ? 'Bearbeiten' : 'Edit',

    floor:
      isDe ? 'Tischplan' : 'Floor plan',

    oneRow:
      isDe ? 'Eine Reihe' : 'One row',

    liveOrders:
      isDe ? 'Live-Bestellungen' : 'live orders',

    reservationToday:
      isDe ? 'Reservierung heute' : 'reservation today',

    reservationsToday:
      isDe ? 'Reservierungen heute' : 'reservations today',

    reviewsToday:
      isDe ? 'Bewertungen heute' : 'reviews today',

    reviewToday:
      isDe ? 'Bewertung heute' : 'review today',

    orders:
      isDe ? 'Bestellungen' : 'orders',

    revenue:
      isDe ? 'Umsatz' : 'Revenue'
  };

  var kpiPayload = null;
  var activeKpiMenu = null;

  /*
   * Cache promises, not only finished payloads.
   * Multiple cards asking for the same period share one request.
   */
  var analyticsRequests = Object.create(null);

  var chartMode =
    readStorage(
      SALES_MODE_KEY,
      'line'
    ) === 'bar'
      ? 'bar'
      : 'line';

  var chartWindow = {
    salesOverTime: 31,
    salesByHour: 20
  };

  var counters = {
    kpiRequests: 0,
    analyticsRequests: 0
  };

  function readStorage(key, fallback) {
    try {
      var value =
        localStorage.getItem(key);

      return value == null
        ? fallback
        : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(
        key,
        value
      );
    } catch (error) {
      // Storage is optional.
    }
  }

  function esc(value) {
    return String(
      value == null ? '' : value
    ).replace(
      /[&<>"']/g,
      function (character) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        }[character];
      }
    );
  }

  function requestJson(url) {
    return fetch(
      url,
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Requested-With':
            'XMLHttpRequest'
        }
      }
    ).then(function (response) {
      if (!response.ok) {
        throw new Error(
          'HTTP ' + response.status
        );
      }

      return response.json();
    });
  }

  function number(value, digits) {
    var numeric =
      Number(value || 0);

    try {
      return new Intl.NumberFormat(
        isDe ? 'de-DE' : 'en-US',
        {
          minimumFractionDigits:
            Number(digits || 0),

          maximumFractionDigits:
            Number(digits || 0)
        }
      ).format(numeric);
    } catch (error) {
      return numeric.toFixed(
        Number(digits || 0)
      );
    }
  }

  function money(value, currency) {
    var code =
      currency ||
      (
        kpiPayload &&
        kpiPayload.currency
      ) ||
      'EUR';

    try {
      return new Intl.NumberFormat(
        isDe ? 'de-DE' : 'en-US',
        {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 2
        }
      ).format(
        Number(value || 0)
      );
    } catch (error) {
      return (
        Number(value || 0)
          .toFixed(2) +
        ' ' +
        code
      );
    }
  }

  function iconSvg(name) {
    var paths = {
      money:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-6M12 6v2M12 16v2"></path>',

      users:
        '<circle cx="9" cy="8" r="3"></circle>' +
        '<path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',

      timer:
        '<circle cx="12" cy="13" r="8"></circle>' +
        '<path d="M12 9v4l2 2M9 2h6M12 2v3"></path>',

      utensils:
        '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"></path>',

      flame:
        '<path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1 -10 0c0 -2.3 1.2 -4.4 3.5 -6.5c.2 2 1 3 1.5 3.5c1.2 -1.4 1.2 -3.7 0 -6z"></path>',

      table:
        '<path d="M3 10h18M5 10v8M19 10v8"></path>' +
        '<path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>',

      menu:
        '<path d="M4 6h16M4 12h16M4 18h16"></path>',

      star:
        '<path d="M12 3l2.8 5.7l6.2 .9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.2 -.9z"></path>'
    };

    return (
      '<svg viewBox="0 0 24 24" ' +
      'aria-hidden="true">' +
      (
        paths[name] ||
        paths.money
      ) +
      '</svg>'
    );
  }

  /* ========================================================
     KPI
     ======================================================== */

  function selectedKpis() {
    var keys = [];

    try {
      keys =
        JSON.parse(
          readStorage(
            KPI_SELECTION_KEY,
            '[]'
          )
        ) || [];
    } catch (error) {
      keys = [];
    }

    keys = keys.filter(
      function (key, index) {
        return (
          KPI_ORDER.indexOf(key) !== -1 &&
          keys.indexOf(key) === index
        );
      }
    );

    KPI_ORDER.forEach(
      function (key) {
        if (
          keys.length < 4 &&
          keys.indexOf(key) === -1
        ) {
          keys.push(key);
        }
      }
    );

    return keys.slice(0, 4);
  }

  function saveSelectedKpis(keys) {
    writeStorage(
      KPI_SELECTION_KEY,
      JSON.stringify(keys)
    );
  }

  function selectedKpiPeriods() {
    var stored = {};

    try {
      stored =
        JSON.parse(
          readStorage(
            KPI_PERIOD_KEY,
            '{}'
          )
        ) || {};
    } catch (error) {
      stored = {};
    }

    var result = {};

    KPI_ORDER.forEach(
      function (key) {
        result[key] =
          (
            key === 'occupancy' ||
            key === 'menu'
          )
            ? 'current'
            : (
                stored[key] === 'month'
                  ? 'month'
                  : 'today'
              );
      }
    );

    return result;
  }

  function metricPeriod(card, period) {
    if (!card) {
      return null;
    }

    if (period === 'current') {
      return card.periods || null;
    }

    return (
      card.periods &&
      card.periods[period]
        ? card.periods[period]
        : null
    );
  }

  function formatKpiValue(
    card,
    aggregate
  ) {
    if (
      !aggregate ||
      aggregate.available !== true
    ) {
      return '—';
    }

    var value =
      aggregate.value;

    if (value === null) {
      return '—';
    }

    if (card.format === 'money') {
      return money(
        value,
        card.currency &&
        card.currency.code
      );
    }

    if (card.format === 'minutes') {
      return (
        Math.round(
          Number(value)
        ) +
        ' min'
      );
    }

    if (card.format === 'channels') {
      value = value || {};

      return (
        Number(
          value.dine_in || 0
        ) +
        ' / ' +
        Number(
          value.takeaway || 0
        )
      );
    }

    if (card.format === 'percent') {
      return (
        Number(value || 0) +
        '%'
      );
    }

    if (card.format === 'menu') {
      value = value || {};

      return (
        Number(
          value.available_now || 0
        ) +
        ' / ' +
        Number(
          value.total || 0
        )
      );
    }

    return String(
      value == null ? 0 : value
    );
  }

  function kpiDescription(
    aggregate,
    period
  ) {
    var periodLabel =
      period === 'month'
        ? TEXT.month
        : (
            period === 'today'
              ? TEXT.today
              : TEXT.current
          );

    if (
      !aggregate ||
      aggregate.available !== true
    ) {
      return (
        periodLabel +
        ' · ' +
        TEXT.unavailable
      );
    }

    var count =
      typeof aggregate.sample_count ===
        'number'
        ? aggregate.sample_count
        : null;

    return (
      periodLabel +
      ' · ' +
      TEXT.connected +
      (
        count === null
          ? ''
          : (
              ' · ' +
              count +
              ' ' +
              TEXT.samples
            )
      )
    );
  }

  function closeKpiMenu() {
    if (!activeKpiMenu) {
      return;
    }

    var menu =
      activeKpiMenu;

    activeKpiMenu = null;
    menu.hidden = true;

    var button =
      menu.parentElement &&
      menu.parentElement.querySelector(
        '[data-ownerboard-kpi-menu-button]'
      );

    if (button) {
      button.setAttribute(
        'aria-expanded',
        'false'
      );
    }
  }

  function createKpiMenu(
    slot,
    currentKey
  ) {
    var menu =
      document.createElement('div');

    menu.className =
      'pmd-ob-kpi-menu';

    menu.hidden = true;
    menu.setAttribute(
      'role',
      'menu'
    );

    var heading =
      document.createElement('span');

    heading.className =
      'pmd-ob-kpi-menu-heading';

    heading.textContent =
      TEXT.chooseKpi;

    menu.appendChild(heading);

    var visibleKeys =
      selectedKpis();

    KPI_ORDER.forEach(
      function (choice) {
        var option =
          document.createElement(
            'button'
          );

        var unavailable =
          (
            visibleKeys.indexOf(
              choice
            ) !== -1 &&
            choice !== currentKey
          );

        option.type = 'button';

        option.className =
          'pmd-ob-kpi-option' +
          (
            choice === currentKey
              ? ' is-selected'
              : ''
          );

        option.disabled =
          unavailable;

        option.innerHTML =
          '<strong>' +
          esc(
            KPI_TITLES[choice] ||
            choice
          ) +
          '</strong>' +
          '<span class="pmd-ob-kpi-check">' +
          (
            choice === currentKey
              ? '✓'
              : ''
          ) +
          '</span>';

        option.addEventListener(
          'click',
          function () {
            var selected =
              selectedKpis();

            if (
              selected.indexOf(choice) !== -1 &&
              selected[slot] !== choice
            ) {
              return;
            }

            selected[slot] =
              choice;

            saveSelectedKpis(
              selected
            );

            closeKpiMenu();
            renderKpis();
          }
        );

        menu.appendChild(
          option
        );
      }
    );

    return menu;
  }

  function createKpiCard(
    key,
    slot
  ) {
    var source =
      (
        kpiPayload &&
        kpiPayload.cards &&
        kpiPayload.cards[key]
      ) || {
        key: key,
        title: key,
        tone: 'green',
        icon: 'money',
        format: 'number',
        periods: null
      };

    var period =
      selectedKpiPeriods()[key];

    var aggregate =
      metricPeriod(
        source,
        period
      );

    var card =
      document.createElement(
        'article'
      );

    card.className =
      'pmd-ob-kpi-card';

    card.setAttribute(
      'data-ownerboard-kpi',
      key
    );

    card.setAttribute(
      'data-pmd-kpi-v2401-key',
      key
    );

    card.setAttribute(
      'data-pmd-kpi-v2401-tone',
      source.tone || 'green'
    );

    card.setAttribute(
      'data-pmd-kpi-v2401-slot',
      String(slot)
    );

    card.innerHTML =
      '<div class="pmd-ob-kpi-icon">' +
      iconSvg(source.icon) +
      '</div>' +

      '<div class="pmd-ob-kpi-copy">' +
        '<span class="pmd-ob-kpi-title">' +
          esc(
            KPI_TITLES[key] ||
            source.title ||
            key
          ) +
        '</span>' +

        '<strong class="pmd-ob-kpi-value">' +
          esc(
            formatKpiValue(
              source,
              aggregate
            )
          ) +
        '</strong>' +

        '<span class="pmd-ob-kpi-description">' +
          esc(
            kpiDescription(
              aggregate,
              period
            )
          ) +
        '</span>' +
      '</div>';

    var button =
      document.createElement(
        'button'
      );

    button.type = 'button';

    button.className =
      'pmd-ob-kpi-more';

    button.setAttribute(
      'data-ownerboard-kpi-menu-button',
      ''
    );

    button.setAttribute(
      'aria-label',
      TEXT.chooseKpi
    );

    button.setAttribute(
      'aria-haspopup',
      'menu'
    );

    button.setAttribute(
      'aria-expanded',
      'false'
    );

    button.innerHTML =
      '<span></span>' +
      '<span></span>' +
      '<span></span>';

    var menu =
      createKpiMenu(
        slot,
        key
      );

    button.addEventListener(
      'click',
      function (event) {
        event.stopPropagation();

        var shouldOpen =
          menu.hidden;

        closeKpiMenu();

        menu.hidden =
          !shouldOpen;

        button.setAttribute(
          'aria-expanded',
          shouldOpen
            ? 'true'
            : 'false'
        );

        if (shouldOpen) {
          activeKpiMenu =
            menu;
        }
      }
    );

    card.appendChild(button);
    card.appendChild(menu);

    return card;
  }

  function renderKpis() {
    if (
      !kpiPayload ||
      !kpiPayload.cards
    ) {
      return;
    }

    var section =
      document.getElementById(
        'pmd-ownerboard-kpis-v2'
      );

    if (!section) {
      return;
    }

    closeKpiMenu();

    var fragment =
      document.createDocumentFragment();

    selectedKpis().forEach(
      function (key, slot) {
        fragment.appendChild(
          createKpiCard(
            key,
            slot
          )
        );
      }
    );

    section.replaceChildren(
      fragment
    );
  }

  function loadKpis() {
    counters.kpiRequests += 1;

    return requestJson(
      endpoints.kpis
    ).then(
      function (payload) {
        if (
          !payload ||
          payload.success !== true ||
          !payload.cards
        ) {
          throw new Error(
            'Invalid KPI payload'
          );
        }

        kpiPayload =
          payload;

        renderKpis();

        return payload;
      }
    ).catch(
      function (error) {
        console.warn(
          '[PMD Ownerboard V2] KPI request failed',
          error
        );

        return null;
      }
    );
  }

  /* ========================================================
     Analytics
     ======================================================== */

  function normalizePeriod(value) {
    value =
      String(value || '');

    return [
      'today',
      'week',
      'month',
      'last30'
    ].indexOf(value) !== -1
      ? value
      : 'month';
  }

  function analyticsUrl(period) {
    var separator =
      endpoints.analytics.indexOf('?') === -1
        ? '?'
        : '&';

    return (
      endpoints.analytics +
      separator +
      'period=' +
      encodeURIComponent(
        normalizePeriod(period)
      )
    );
  }

  function loadAnalytics(period) {
    period =
      normalizePeriod(period);

    if (
      analyticsRequests[period]
    ) {
      return analyticsRequests[
        period
      ];
    }

    counters.analyticsRequests += 1;

    analyticsRequests[period] =
      requestJson(
        analyticsUrl(period)
      ).then(
        function (payload) {
          if (
            !payload ||
            payload.success !== true
          ) {
            throw new Error(
              (
                payload &&
                payload.reason
              ) ||
              'Analytics unavailable'
            );
          }

          return payload;
        }
      ).catch(
        function (error) {
          /*
           * A failed request should be retryable.
           */
          delete analyticsRequests[
            period
          ];

          throw error;
        }
      );

    return analyticsRequests[
      period
    ];
  }

  function widgetSource(
    widgetKey,
    payload
  ) {
    if (!payload) {
      return null;
    }

    var map = {
      salesOverTime:
        'sales_over_time',

      salesByHour:
        'sales_by_hour',

      topItems:
        'top_items',

      categorySales:
        'sales_by_category',

      paymentMethods:
        'payment_methods',

      channelSplit:
        'channels',

      liveOperations:
        'live_operations',

      recentTransactions:
        'recent_transactions',

      alerts:
        'alerts',

      reviews:
        'reviews',

      tips:
        'tips',

      calendarEvents:
        'calendar_events'
    };

    return payload[
      map[widgetKey]
    ] || null;
  }

  function emptyHtml(source) {
    return (
      '<div class="pmd-ownerboard-v2-empty">' +
      esc(
        (
          source &&
          (
            source.reason ||
            source.source
          )
        ) ||
        TEXT.noData
      ) +
      '</div>'
    );
  }

  function listHtml(
    rows,
    renderer
  ) {
    rows =
      Array.isArray(rows)
        ? rows
        : [];

    return (
      '<ul class="pmd-ownerboard-v2-data-list">' +
      rows.map(renderer).join('') +
      '</ul>'
    );
  }

  function chartScale(maximum) {
    maximum =
      Math.max(
        1,
        Number(maximum || 0)
      );

    var magnitude =
      Math.pow(
        10,
        Math.floor(
          Math.log10(maximum)
        )
      );

    var normalized =
      maximum / magnitude;

    var nice =
      normalized <= 1
        ? 1
        : (
            normalized <= 2
              ? 2
              : (
                  normalized <= 5
                    ? 5
                    : 10
                )
          );

    var max =
      nice * magnitude;

    return {
      max: max,
      ticks: [
        0,
        max * .25,
        max * .5,
        max * .75,
        max
      ]
    };
  }

  function shortBucketLabel(row) {
    if (!row) {
      return '';
    }

    if (
      row.hour !== undefined &&
      row.hour !== null
    ) {
      return (
        String(row.hour)
          .padStart(2, '0') +
        ':00'
      );
    }

    var raw =
      String(
        row.bucket ||
        row.date ||
        ''
      );

    if (!raw) {
      return '';
    }

    try {
      var date =
        new Date(
          raw.length === 10
            ? raw + 'T12:00:00'
            : raw.replace(' ', 'T')
        );

      return new Intl.DateTimeFormat(
        isDe
          ? 'de-DE'
          : 'en-US',
        {
          day: '2-digit',
          month: 'short'
        }
      ).format(date);
    } catch (error) {
      return raw.slice(5, 10);
    }
  }

  function windowRows(
    rows,
    requested,
    hourly
  ) {
    rows =
      Array.isArray(rows)
        ? rows
        : [];

    if (!rows.length) {
      return rows;
    }

    requested =
      Math.max(
        1,
        Math.min(
          Number(requested || rows.length),
          rows.length
        )
      );

    if (
      requested >= rows.length
    ) {
      return rows.slice();
    }

    if (hourly) {
      return rows.slice(
        rows.length - requested
      );
    }

    /*
     * Match Dashboard2's useful sales window behavior:
     * center a reduced window around the strongest sales point.
     */
    var peakIndex = 0;
    var peakValue = -Infinity;

    rows.forEach(
      function (row, index) {
        var value =
          Number(row.sales || 0);

        if (value > peakValue) {
          peakValue = value;
          peakIndex = index;
        }
      }
    );

    var start =
      Math.max(
        0,
        Math.min(
          peakIndex -
            Math.floor(requested / 2),

          rows.length -
            requested
        )
      );

    return rows.slice(
      start,
      start + requested
    );
  }

  function chartGrid(
    scale,
    dimensions
  ) {
    return scale.ticks.map(
      function (value, index) {
        var y =
          dimensions.top +
          dimensions.plotH -
          dimensions.plotH *
            index /
            (
              scale.ticks.length -
              1
            );

        return (
          '<line ' +
          'class="pmd-ownerboard-v2-chart-grid-line" ' +
          'x1="' +
          dimensions.left +
          '" y1="' +
          y +
          '" x2="' +
          (
            dimensions.w -
            dimensions.right
          ) +
          '" y2="' +
          y +
          '"></line>' +

          '<text ' +
          'class="pmd-ownerboard-v2-chart-label" ' +
          'x="' +
          (
            dimensions.left -
            12
          ) +
          '" y="' +
          (
            y + 4
          ) +
          '" text-anchor="end">' +
          esc(
            money(value)
          ) +
          '</text>'
        );
      }
    ).join('');
  }

  function svgLine(rows) {
    rows =
      Array.isArray(rows)
        ? rows
        : [];

    if (!rows.length) {
      return emptyHtml();
    }

    var visible =
      windowRows(
        rows,
        chartWindow.salesOverTime,
        false
      );

    var values =
      visible.map(
        function (row) {
          return Number(
            row.sales || 0
          );
        }
      );

    var scale =
      chartScale(
        Math.max.apply(
          null,
          values.concat([1])
        )
      );

    var d = {
      w: 900,
      h: 330,
      left: 78,
      right: 18,
      top: 12,
      bottom: 46
    };

    d.plotW =
      d.w - d.left - d.right;

    d.plotH =
      d.h - d.top - d.bottom;

    var points =
      visible.map(
        function (row, index) {
          return {
            x:
              d.left +
              d.plotW *
              (
                visible.length === 1
                  ? .5
                  : (
                      index /
                      (
                        visible.length -
                        1
                      )
                    )
              ),

            y:
              d.top +
              d.plotH -
              d.plotH *
              Number(
                row.sales || 0
              ) /
              scale.max,

            row: row
          };
        }
      );

    var baseline =
      d.top + d.plotH;

    var linePoints =
      points.map(
        function (point) {
          return (
            point.x +
            ',' +
            point.y
          );
        }
      ).join(' ');

    var labels =
      points.map(
        function (point, index) {
          var every =
            Math.max(
              1,
              Math.ceil(
                points.length / 7
              )
            );

          if (
            index % every !== 0 &&
            index !== points.length - 1
          ) {
            return '';
          }

          return (
            '<text ' +
            'class="pmd-ownerboard-v2-chart-label" ' +
            'x="' +
            point.x +
            '" y="' +
            (
              d.h - 14
            ) +
            '" text-anchor="middle">' +
            esc(
              shortBucketLabel(
                point.row
              )
            ) +
            '</text>'
          );
        }
      ).join('');

    var circles =
      points.map(
        function (point) {
          if (
            Number(
              point.row.sales || 0
            ) <= 0
          ) {
            return '';
          }

          return (
            '<circle ' +
            'class="pmd-ownerboard-v2-chart-point" ' +
            'cx="' +
            point.x +
            '" cy="' +
            point.y +
            '" r="3.5">' +
            '<title>' +
            esc(
              money(
                point.row.sales
              )
            ) +
            '</title>' +
            '</circle>'
          );
        }
      ).join('');

    var range =
      chartRangeHtml(
        'salesOverTime',
        rows.length,
        chartWindow.salesOverTime,
        7
      );

    return (
      '<div class="pmd-ownerboard-v2-chart-frame">' +
      '<svg ' +
      'class="pmd-ownerboard-v2-chart" ' +
      'viewBox="0 0 ' +
      d.w +
      ' ' +
      d.h +
      '" role="img" aria-label="Sales over time">' +

      chartGrid(
        scale,
        d
      ) +

      '<line ' +
      'class="pmd-ownerboard-v2-chart-axis" ' +
      'x1="' +
      d.left +
      '" y1="' +
      baseline +
      '" x2="' +
      (
        d.w - d.right
      ) +
      '" y2="' +
      baseline +
      '"></line>' +

      '<polygon ' +
      'class="pmd-ownerboard-v2-chart-area" ' +
      'points="' +
      d.left +
      ',' +
      baseline +
      ' ' +
      linePoints +
      ' ' +
      (
        d.w - d.right
      ) +
      ',' +
      baseline +
      '"></polygon>' +

      '<polyline ' +
      'class="pmd-ownerboard-v2-chart-line" ' +
      'points="' +
      linePoints +
      '"></polyline>' +

      circles +
      labels +
      '</svg>' +
      range +
      '</div>'
    );
  }

  function svgBars(
    rows,
    widgetKey,
    hourly
  ) {
    rows =
      Array.isArray(rows)
        ? rows
        : [];

    if (!rows.length) {
      return emptyHtml();
    }

    var currentWindow =
      chartWindow[widgetKey] ||
      rows.length;

    var visible =
      windowRows(
        rows,
        currentWindow,
        Boolean(hourly)
      );

    var values =
      visible.map(
        function (row) {
          return Number(
            row.sales || 0
          );
        }
      );

    var peak =
      Math.max.apply(
        null,
        values.concat([0])
      );

    var scale =
      chartScale(
        Math.max.apply(
          null,
          values.concat([1])
        )
      );

    var d = {
      w: 900,
      h: 310,
      left: 78,
      right: 18,
      top: 12,
      bottom: 46
    };

    d.plotW =
      d.w - d.left - d.right;

    d.plotH =
      d.h - d.top - d.bottom;

    var gap =
      d.plotW /
      Math.max(
        1,
        visible.length
      );

    var barW =
      Math.max(
        10,
        Math.min(
          40,
          gap * .64
        )
      );

    var baseline =
      d.top + d.plotH;

    var bars =
      visible.map(
        function (row, index) {
          var value =
            Number(
              row.sales || 0
            );

          var height =
            d.plotH *
            value /
            scale.max;

          var x =
            d.left +
            index * gap +
            (
              gap - barW
            ) / 2;

          var y =
            baseline - height;

          return (
            '<rect ' +
            'class="pmd-ownerboard-v2-chart-bar' +
            (
              value === peak &&
              value > 0
                ? ' is-peak'
                : ''
            ) +
            '" x="' +
            x +
            '" y="' +
            (
              value === 0
                ? baseline - 1
                : y
            ) +
            '" width="' +
            barW +
            '" height="' +
            (
              value === 0
                ? 1
                : Math.max(
                    3,
                    height
                  )
            ) +
            '">' +
            '<title>' +
            esc(
              money(value)
            ) +
            '</title>' +
            '</rect>'
          );
        }
      ).join('');

    var labels =
      visible.map(
        function (row, index) {
          var every =
            Math.max(
              1,
              Math.ceil(
                visible.length / 7
              )
            );

          if (
            index % every !== 0 &&
            index !== visible.length - 1
          ) {
            return '';
          }

          var x =
            d.left +
            index * gap +
            gap / 2;

          return (
            '<text ' +
            'class="pmd-ownerboard-v2-chart-label" ' +
            'x="' +
            x +
            '" y="' +
            (
              d.h - 14
            ) +
            '" text-anchor="middle">' +
            esc(
              shortBucketLabel(row)
            ) +
            '</text>'
          );
        }
      ).join('');

    var range =
      chartRangeHtml(
        widgetKey,
        rows.length,
        currentWindow,
        hourly ? 5 : 7
      );

    return (
      '<div class="pmd-ownerboard-v2-chart-frame">' +
      '<svg ' +
      'class="pmd-ownerboard-v2-chart" ' +
      'viewBox="0 0 ' +
      d.w +
      ' ' +
      d.h +
      '" role="img">' +

      chartGrid(
        scale,
        d
      ) +

      '<line ' +
      'class="pmd-ownerboard-v2-chart-axis" ' +
      'x1="' +
      d.left +
      '" y1="' +
      baseline +
      '" x2="' +
      (
        d.w - d.right
      ) +
      '" y2="' +
      baseline +
      '"></line>' +

      bars +
      labels +
      '</svg>' +
      range +
      '</div>'
    );
  }

  function chartRangeHtml(
    widgetKey,
    maximum,
    value,
    minimum
  ) {
    maximum =
      Math.max(
        1,
        Number(maximum || 1)
      );

    minimum =
      Math.max(
        1,
        Math.min(
          Number(minimum || 1),
          maximum
        )
      );

    value =
      Math.max(
        minimum,
        Math.min(
          Number(value || maximum),
          maximum
        )
      );

    if (
      maximum <= minimum
    ) {
      return '';
    }

    return (
      '<div class="pmd-ownerboard-v2-chart-range-wrap">' +
      '<input ' +
      'class="pmd-ownerboard-v2-chart-range" ' +
      'type="range" ' +
      'min="' +
      minimum +
      '" max="' +
      maximum +
      '" value="' +
      value +
      '" step="1" ' +
      'data-owner-chart-window="' +
      widgetKey +
      '" aria-label="Chart density">' +
      '</div>'
    );
  }

  function svgDonut(
    rows,
    nameKey,
    valueKey,
    labelFormatter
  ) {
    rows =
      Array.isArray(rows)
        ? rows.slice(0, 6)
        : [];

    if (!rows.length) {
      return emptyHtml();
    }

    var total =
      rows.reduce(
        function (sum, row) {
          return (
            sum +
            Number(
              row[valueKey] || 0
            )
          );
        },
        0
      );

    var colors = [
      '#00A676',
      '#2563EB',
      '#FF8A00',
      '#D946EF',
      '#06B6D4',
      '#EF4444'
    ];

    var offset = 0;

    var circles =
      total > 0
        ? rows.map(
            function (row, index) {
              var percentage =
                Number(
                  row[valueKey] || 0
                ) /
                total *
                100;

              var html =
                '<circle ' +
                'cx="60" cy="60" r="45" ' +
                'pathLength="100" ' +
                'fill="none" ' +
                'stroke="' +
                colors[
                  index %
                  colors.length
                ] +
                '" stroke-width="18" ' +
                'stroke-dasharray="' +
                percentage +
                ' ' +
                (
                  100 -
                  percentage
                ) +
                '" stroke-dashoffset="' +
                (
                  -offset
                ) +
                '">' +
                '<title>' +
                esc(
                  row[nameKey]
                ) +
                ' · ' +
                percentage.toFixed(1) +
                '%' +
                '</title>' +
                '</circle>';

              offset +=
                percentage;

              return html;
            }
          ).join('')
        : '';

    var legend =
      '<ul class="pmd-ownerboard-v2-donut-legend">' +
      rows.map(
        function (row, index) {
          var percentage =
            total > 0
              ? (
                  Number(
                    row[valueKey] || 0
                  ) /
                  total *
                  100
                )
              : 0;

          return (
            '<li>' +
            '<i style="background:' +
            colors[
              index %
              colors.length
            ] +
            '"></i>' +

            '<span>' +
            esc(
              row[nameKey]
            ) +
            '</span>' +

            '<b>' +
            esc(
              labelFormatter(row)
            ) +
            ' · ' +
            percentage.toFixed(1) +
            '%' +
            '</b>' +
            '</li>'
          );
        }
      ).join('') +
      '</ul>';

    return (
      '<div class="pmd-ownerboard-v2-donut">' +
      '<svg viewBox="0 0 120 120" ' +
      'role="img" aria-label="Breakdown chart">' +
      '<circle cx="60" cy="60" r="45" ' +
      'pathLength="100" fill="none" ' +
      'stroke="#edf1ef" stroke-width="18"></circle>' +
      circles +
      '</svg>' +
      legend +
      '</div>'
    );
  }

  function cleanReservationTitle(
    value
  ) {
    var text =
      String(value || '')
        .replace(
          /[\u00A0\u2007\u202F]/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    return text
      .replace(
        /^Tische? +Tische? +/iu,
        function (match) {
          return /^Tische /iu.test(
            match
          )
            ? 'Tische '
            : 'Tisch ';
        }
      )
      .replace(
        /^Tables? +Tables? +/iu,
        function (match) {
          return /^Tables /iu.test(
            match
          )
            ? 'Tables '
            : 'Table ';
        }
      );
  }

  function renderWidget(
    card,
    payload
  ) {
    if (!card) {
      return;
    }

    var key =
      card.getAttribute(
        'data-ownerboard-widget'
      );

    var body =
      card.querySelector(
        '[data-ownerboard-widget-body]'
      );

    if (!body) {
      return;
    }

    var source =
      widgetSource(
        key,
        payload
      );

    if (
      !source ||
      source.available !== true
    ) {
      body.innerHTML =
        emptyHtml(source);

      return;
    }

    if (key === 'salesOverTime') {
      var rows =
        Array.isArray(source.buckets)
          ? source.buckets
          : [];

      chartWindow.salesOverTime =
        Math.min(
          Math.max(
            7,
            chartWindow.salesOverTime
          ),
          Math.max(
            7,
            rows.length
          )
        );

      body.innerHTML =
        chartMode === 'bar'
          ? svgBars(
              rows,
              'salesOverTime',
              false
            )
          : svgLine(rows);

      return;
    }

    if (key === 'salesByHour') {
      var hours =
        Array.isArray(source.hours)
          ? source.hours
          : [];

      chartWindow.salesByHour =
        Math.min(
          Math.max(
            5,
            chartWindow.salesByHour
          ),
          Math.max(
            5,
            hours.length
          )
        );

      body.innerHTML =
        svgBars(
          hours,
          'salesByHour',
          true
        );

      return;
    }

    if (key === 'topItems') {
      body.innerHTML =
        source.empty === true
          ? emptyHtml(source)
          : listHtml(
              source.items || [],
              function (row) {
                return (
                  '<li>' +
                  '<span>' +
                  esc(row.name) +
                  '</span>' +
                  '<b>' +
                  esc(
                    row.quantity
                  ) +
                  ' · ' +
                  esc(
                    money(
                      row.revenue,
                      payload.currency
                    )
                  ) +
                  '</b>' +
                  '</li>'
                );
              }
            );

      return;
    }

    if (key === 'categorySales') {
      body.innerHTML =
        source.empty === true
          ? emptyHtml(source)
          : svgDonut(
              source.categories || [],
              'category',
              'revenue',
              function (row) {
                return money(
                  row.revenue,
                  payload.currency
                );
              }
            );

      return;
    }

    if (key === 'paymentMethods') {
      body.innerHTML =
        source.empty === true
          ? emptyHtml(source)
          : svgDonut(
              source.methods || [],
              'method',
              'total',
              function (row) {
                return (
                  money(
                    row.total,
                    payload.currency
                  ) +
                  ' · ' +
                  Number(
                    row.transactions || 0
                  )
                );
              }
            );

      return;
    }

    if (key === 'channelSplit') {
      body.innerHTML =
        source.empty === true
          ? emptyHtml(source)
          : svgDonut(
              source.channels || [],
              'channel',
              'revenue',
              function (row) {
                return (
                  Number(
                    row.orders || 0
                  ) +
                  ' · ' +
                  money(
                    row.revenue,
                    payload.currency
                  )
                );
              }
            );

      return;
    }

    if (key === 'liveOperations') {
      body.innerHTML =
        '<div class="pmd-ownerboard-v2-live-summary">' +
        '<b>' +
        esc(
          source.live_order_count || 0
        ) +
        '</b>' +
        '<span>' +
        TEXT.liveOrders +
        '</span>' +
        '</div>' +

        listHtml(
          source.orders || [],
          function (row) {
            return (
              '<li>' +
              '<span>#' +
              esc(row.order_id) +
              ' · ' +
              esc(row.channel) +
              '</span>' +
              '<b>' +
              esc(row.status) +
              '</b>' +
              '</li>'
            );
          }
        );

      return;
    }

    if (key === 'recentTransactions') {
      body.innerHTML =
        source.empty === true
          ? emptyHtml(source)
          : listHtml(
              (
                source.transactions ||
                []
              ).slice(0, 5),
              function (row) {
                var method =
                  row.method
                    ? (
                        ' · ' +
                        esc(row.method)
                      )
                    : '';

                var timestamp =
                  String(
                    row.timestamp || ''
                  );

                var match =
                  timestamp.match(
                    /(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/
                  );

                var time =
                  match
                    ? match[1]
                    : timestamp.slice(0, 5);

                return (
                  '<li>' +
                  '<span>#' +
                  esc(row.order_id) +
                  method +
                  ' · ' +
                  esc(time) +
                  '</span>' +

                  '<b>' +
                  esc(
                    money(
                      row.amount,
                      payload.currency
                    )
                  ) +
                  '</b>' +
                  '</li>'
                );
              }
            );

      return;
    }

    if (key === 'alerts') {
      var types =
        source.types || {};

      body.innerHTML =
        listHtml(
          Object.keys(types).map(
            function (name) {
              return {
                name:
                  name.replace(
                    /_/g,
                    ' '
                  ),

                value:
                  types[name]
              };
            }
          ),
          function (row) {
            return (
              '<li>' +
              '<span>' +
              esc(row.name) +
              '</span>' +
              '<b>' +
              esc(
                row.value === null
                  ? TEXT.unavailable
                  : row.value
              ) +
              '</b>' +
              '</li>'
            );
          }
        );

      return;
    }

    if (key === 'reviews') {
      body.innerHTML =
        '<div class="pmd-ownerboard-v2-review-score">' +
        '<b>' +
        (
          source.average === null
            ? '—'
            : esc(source.average)
        ) +
        '</b>' +
        '<span>' +
        esc(source.count || 0) +
        ' ' +
        (
          Number(
            source.count || 0
          ) === 1
            ? TEXT.reviewToday
            : TEXT.reviewsToday
        ) +
        '</span>' +
        '</div>' +

        listHtml(
          (
            source.latest ||
            []
          ).slice(0, 4),
          function (row) {
            var stars =
              row.stars ||
              Array(
                Math.max(
                  1,
                  Math.min(
                    5,
                    Math.round(
                      Number(
                        row.rating || 0
                      )
                    )
                  )
                ) + 1
              ).join('★');

            return (
              '<li>' +
              '<span style="' +
              'color:#d4a017;' +
              'font-size:20px;' +
              'font-weight:700;' +
              'letter-spacing:1px">' +
              esc(stars) +
              '</span>' +
              '<b>' +
              esc(row.time || '') +
              '</b>' +
              '</li>'
            );
          }
        );

      return;
    }

    if (key === 'tips') {
      body.innerHTML =
        '<dl class="pmd-ownerboard-v2-stats">' +

        '<div><dt>' +
        (
          isDe
            ? 'Heute'
            : 'Today'
        ) +
        '</dt><dd>' +
        esc(
          money(
            source.today,
            payload.currency
          )
        ) +
        '</dd></div>' +

        '<div><dt>' +
        (
          isDe
            ? 'Dieser Monat'
            : 'This month'
        ) +
        '</dt><dd>' +
        esc(
          money(
            source.month,
            payload.currency
          )
        ) +
        '</dd></div>' +

        '<div><dt>' +
        (
          isDe
            ? 'Durchschnitt'
            : 'Average'
        ) +
        '</dt><dd>' +
        esc(
          money(
            source.average_tip,
            payload.currency
          )
        ) +
        '</dd></div>' +

        '<div><dt>' +
        (
          isDe
            ? 'Bestellungen mit Trinkgeld'
            : 'Tipped orders'
        ) +
        '</dt><dd>' +
        esc(
          source.tipped_orders || 0
        ) +
        '</dd></div>' +

        '</dl>';

      return;
    }

    if (key === 'calendarEvents') {
      body.innerHTML =
        '<div class="pmd-ownerboard-v2-review-score">' +
        '<b>' +
        esc(
          source.count || 0
        ) +
        '</b>' +

        '<span>' +
        (
          Number(
            source.count || 0
          ) === 1
            ? TEXT.reservationToday
            : TEXT.reservationsToday
        ) +
        '</span>' +
        '</div>' +

        listHtml(
          (
            source.events ||
            []
          ).slice(0, 4),
          function (row) {
            return (
              '<li>' +
              '<span>' +
              esc(
                cleanReservationTitle(
                  row.title ||
                  row.table_label ||
                  ''
                )
              ) +
              (
                row.guests
                  ? (
                      ' · ' +
                      esc(row.guests) +
                      ' ' +
                      (
                        isDe
                          ? 'Gäste'
                          : 'guests'
                      )
                    )
                  : ''
              ) +
              '</span>' +

              '<b>' +
              esc(
                row.time || ''
              ) +
              '</b>' +
              '</li>'
            );
          }
        );

      return;
    }

    body.innerHTML =
      emptyHtml(source);
  }

  function widgetPeriodKey(key) {
    if (key === 'salesOverTime') {
      return 'last30';
    }

    if (
      key === 'recentTransactions' ||
      key === 'alerts' ||
      key === 'liveOperations' ||
      key === 'reviews' ||
      key === 'calendarEvents'
    ) {
      return 'today';
    }

    if (key === 'salesByHour') {
      return 'today';
    }

    if (key === 'tips') {
      return 'month';
    }

    if (key === 'topItems') {
      return normalizePeriod(
        readStorage(
          TOP_ITEMS_PERIOD_KEY,
          'month'
        )
      );
    }

    if (
      key === 'categorySales' ||
      key === 'paymentMethods' ||
      key === 'channelSplit'
    ) {
      return normalizePeriod(
        readStorage(
          DONUT_PERIOD_PREFIX +
          key +
          '.v1',
          'month'
        )
      );
    }

    return normalizePeriod(
      cardFor(key)
        ?.getAttribute(
          'data-ownerboard-period'
        ) || 'month'
    );
  }

  function cardFor(key) {
    return root.querySelector(
      '[data-ownerboard-widget="' +
      key +
      '"]'
    );
  }

  function setPeriodUi(
    key,
    period
  ) {
    var card =
      cardFor(key);

    if (!card) {
      return;
    }

    card.setAttribute(
      'data-ownerboard-period',
      period
    );

    card
      .querySelectorAll(
        '[data-owner-period]'
      )
      .forEach(
        function (button) {
          var active =
            button.getAttribute(
              'data-owner-period'
            ) === period;

          button.classList.toggle(
            'is-active',
            active
          );

          button.setAttribute(
            'aria-pressed',
            active
              ? 'true'
              : 'false'
          );
        }
      );
  }

  function renderWidgetForPeriod(
    key,
    period
  ) {
    var card =
      cardFor(key);

    if (!card) {
      return Promise.resolve();
    }

    period =
      normalizePeriod(period);

    setPeriodUi(
      key,
      period
    );

    return loadAnalytics(
      period
    ).then(
      function (payload) {
        renderWidget(
          card,
          payload
        );
      }
    ).catch(
      function (error) {
        var body =
          card.querySelector(
            '[data-ownerboard-widget-body]'
          );

        if (body) {
          body.innerHTML =
            emptyHtml({
              reason:
                TEXT.unavailable
            });
        }

        console.warn(
          '[PMD Ownerboard V2] analytics request failed',
          key,
          period,
          error
        );
      }
    );
  }

  function renderInitialAnalytics() {
    var cards =
      root.querySelectorAll(
        '[data-ownerboard-widget]'
      );

    var tasks = [];

    Array.prototype.forEach.call(
      cards,
      function (card) {
        var key =
          card.getAttribute(
            'data-ownerboard-widget'
          );

        var period =
          widgetPeriodKey(key);

        tasks.push(
          renderWidgetForPeriod(
            key,
            period
          )
        );
      }
    );

    return Promise.allSettled(
      tasks
    );
  }

  function setInitialToolbarState() {
    root
      .querySelectorAll(
        '[data-owner-chart-mode]'
      )
      .forEach(
        function (button) {
          var active =
            button.getAttribute(
              'data-owner-chart-mode'
            ) === chartMode;

          button.classList.toggle(
            'is-active',
            active
          );

          button.setAttribute(
            'aria-pressed',
            active
              ? 'true'
              : 'false'
          );
        }
      );

    [
      'categorySales',
      'paymentMethods',
      'channelSplit',
      'topItems'
    ].forEach(
      function (key) {
        setPeriodUi(
          key,
          widgetPeriodKey(key)
        );
      }
    );
  }

  function bindAnalytics() {
    root.addEventListener(
      'click',
      function (event) {
        var modeButton =
          event.target.closest(
            '[data-owner-chart-mode]'
          );

        if (
          modeButton &&
          root.contains(modeButton)
        ) {
          event.preventDefault();

          chartMode =
            modeButton.getAttribute(
              'data-owner-chart-mode'
            ) === 'bar'
              ? 'bar'
              : 'line';

          writeStorage(
            SALES_MODE_KEY,
            chartMode
          );

          root
            .querySelectorAll(
              '[data-owner-chart-mode]'
            )
            .forEach(
              function (button) {
                var active =
                  button === modeButton;

                button.classList.toggle(
                  'is-active',
                  active
                );

                button.setAttribute(
                  'aria-pressed',
                  active
                    ? 'true'
                    : 'false'
                );
              }
            );

          renderWidgetForPeriod(
            'salesOverTime',
            'last30'
          );

          return;
        }

        var periodButton =
          event.target.closest(
            '[data-owner-period]'
          );

        if (
          periodButton &&
          root.contains(
            periodButton
          )
        ) {
          event.preventDefault();

          var card =
            periodButton.closest(
              '[data-ownerboard-widget]'
            );

          if (!card) {
            return;
          }

          var key =
            card.getAttribute(
              'data-ownerboard-widget'
            );

          var period =
            normalizePeriod(
              periodButton.getAttribute(
                'data-owner-period'
              )
            );

          if (key === 'topItems') {
            writeStorage(
              TOP_ITEMS_PERIOD_KEY,
              period
            );
          } else {
            writeStorage(
              DONUT_PERIOD_PREFIX +
              key +
              '.v1',
              period
            );
          }

          renderWidgetForPeriod(
            key,
            period
          );
        }
      }
    );

    root.addEventListener(
      'input',
      function (event) {
        var range =
          event.target.closest(
            '[data-owner-chart-window]'
          );

        if (
          !range ||
          !root.contains(range)
        ) {
          return;
        }

        var key =
          range.getAttribute(
            'data-owner-chart-window'
          );

        if (
          key !== 'salesOverTime' &&
          key !== 'salesByHour'
        ) {
          return;
        }

        chartWindow[key] =
          Number(
            range.value ||
            chartWindow[key]
          );

        renderWidgetForPeriod(
          key,
          key === 'salesOverTime'
            ? 'last30'
            : 'today'
        );
      }
    );
  }

  /* ========================================================
     Canonical Floor proxy
     ======================================================== */

  function floorRoot() {
    return document.getElementById(
      'pmd-r2-shared-floor-canvas-v310'
    );
  }

  function nativeFloorControl(selector) {
    var floor =
      floorRoot();

    return floor
      ? floor.querySelector(selector)
      : null;
  }

  function clickNativeFloor(selector) {
    var control =
      nativeFloorControl(
        selector
      );

    if (
      control &&
      typeof control.click ===
        'function'
    ) {
      control.click();
      return true;
    }

    return false;
  }

  function updateFloorProxy() {
    var floor =
      floorRoot();

    if (!floor) {
      return;
    }

    var strip =
      floor.classList.contains(
        'is-strip-mode'
      );

    var editing =
      floor.classList.contains(
        'is-editing'
      ) ||
      (
        nativeFloorControl(
          '[data-floor-edit]'
        ) &&
        nativeFloorControl(
          '[data-floor-edit]'
        ).getAttribute(
          'aria-pressed'
        ) === 'true'
      );

    var modeButton =
      root.querySelector(
        '[data-owner-floor-action="mode"]'
      );

    var modeLabel =
      root.querySelector(
        '[data-owner-floor-mode-label]'
      );

    if (modeButton) {
      modeButton.setAttribute(
        'aria-pressed',
        strip
          ? 'true'
          : 'false'
      );
    }

    if (modeLabel) {
      modeLabel.textContent =
        strip
          ? TEXT.floor
          : TEXT.oneRow;
    }

    var editLabel =
      root.querySelector(
        '[data-owner-floor-edit-label]'
      );

    if (editLabel) {
      editLabel.textContent =
        editing
          ? TEXT.save
          : TEXT.edit;
    }
  }

  function bindFloorProxy() {
    root.addEventListener(
      'click',
      function (event) {
        var button =
          event.target.closest(
            '[data-owner-floor-action]'
          );

        if (
          !button ||
          !root.contains(button)
        ) {
          return;
        }

        event.preventDefault();

        var action =
          button.getAttribute(
            'data-owner-floor-action'
          );

        if (action === 'zoom-out') {
          clickNativeFloor(
            '[data-floor-zoom-out]'
          );
          return;
        }

        if (action === 'zoom-in') {
          clickNativeFloor(
            '[data-floor-zoom-in]'
          );
          return;
        }

        if (action === 'mode') {
          clickNativeFloor(
            '[data-floor-strip]'
          );

          /*
           * Native mode change is synchronous.
           */
          updateFloorProxy();
          return;
        }

        if (action === 'guide') {
          clickNativeFloor(
            '[data-floor-guide]'
          );
          return;
        }

        if (action === 'edit') {
          var save =
            nativeFloorControl(
              '[data-floor-save]'
            );

          if (
            save &&
            !save.hidden
          ) {
            save.click();
          } else {
            clickNativeFloor(
              '[data-floor-edit]'
            );
          }

          updateFloorProxy();
        }
      }
    );

    /*
     * pmd-floor-v1.js loads before this runtime, but the Floor may
     * mount on DOMContentLoaded. Calling mount is idempotent and gives
     * Ownerboard one deterministic canonical Floor instance.
     */
    if (
      window.PMDFloorMapV1 &&
      typeof window.PMDFloorMapV1.mount ===
        'function'
    ) {
      window.PMDFloorMapV1.mount(
        root
      );
    }

    updateFloorProxy();
  }

  /* ========================================================
     Notification bridge
     ======================================================== */

  function bindNotifications() {
    var ownButton =
      root.querySelector(
        '[data-ownerboard-notifications]'
      );

    if (!ownButton) {
      return;
    }

    var candidates = [
      '#notification-button',
      '#notif-root > a',
      '#notif-root > span > a',
      '[data-notification-toggle]',
      '.navbar .dropdown-notifications > a'
    ];

    var original = null;

    candidates.some(
      function (selector) {
        var candidate =
          document.querySelector(
            selector
          );

        if (
          candidate &&
          candidate !== ownButton
        ) {
          original =
            candidate.closest(
              'button,a'
            ) ||
            candidate;

          return true;
        }

        return false;
      }
    );

    ownButton.addEventListener(
      'click',
      function () {
        if (
          original &&
          typeof original.click ===
            'function'
        ) {
          original.click();
        }
      }
    );

    var badge =
      root.querySelector(
        '[data-ownerboard-notification-badge]'
      );

    if (!badge) {
      return;
    }

    var sourceBadge =
      document.querySelector(
        '#notif-root .badge, ' +
        '.navbar .badge, ' +
        '.notification-badge, ' +
        '[data-notification-count]'
      );

    if (sourceBadge) {
      var text =
        String(
          sourceBadge.textContent || ''
        ).trim();

      if (
        text &&
        text !== '0'
      ) {
        badge.textContent = text;
        badge.hidden = false;
      }
    }
  }

  function audit() {
    var floor =
      floorRoot();

    var floorInstance =
      floor &&
      floor.__pmdFloorV1
        ? floor.__pmdFloorV1
        : null;

    return {
      version: VERSION,
      route: route,

      cleanSurface: true,

      kpiSlots:
        root.querySelectorAll(
          '[data-ownerboard-kpi]'
        ).length,

      analyticsCards:
        root.querySelectorAll(
          '[data-ownerboard-widget]'
        ).length,

      floorRoot:
        Boolean(floor),

      floorEngine:
        Boolean(
          window.PMDFloorMapV1
        ),

      floorInstance:
        Boolean(floorInstance),

      floorTables:
        floor
          ? floor.querySelectorAll(
              '[data-floor-table]'
            ).length
          : 0,

      floorMode:
        floor &&
        floor.classList.contains(
          'is-strip-mode'
        )
          ? 'row'
          : 'full',

      legacyDashboard2Root:
        Boolean(
          document.getElementById(
            'pmd-reservations2'
          )
        ),

      legacyDashboard2AnalyticsRoot:
        Boolean(
          document.getElementById(
            'pmd-dashboard2-analytics-v1'
          )
        ),

      ownerRuntime: {
        mutationObservers: 0,
        intervals: 0,
        polling: 0
      },

      requests: {
        kpi: counters.kpiRequests,
        analytics:
          counters.analyticsRequests
      },

      chartMode: chartMode,
      selectedKpis:
        selectedKpis()
    };
  }

  function boot() {
    /*
     * Toolbar state is localStorage-only and is applied synchronously
     * before network payloads arrive.
     */
    setInitialToolbarState();

    bindAnalytics();
    bindFloorProxy();
    bindNotifications();

    document.addEventListener(
      'click',
      function (event) {
        if (
          activeKpiMenu &&
          !activeKpiMenu.contains(
            event.target
          ) &&
          !event.target.closest(
            '[data-ownerboard-kpi-menu-button]'
          )
        ) {
          closeKpiMenu();
        }
      }
    );

    /*
     * KPI and analytics can load in parallel.
     * Card/Floor geometry is already final, so their completion changes
     * content only — never page placement.
     */
    loadKpis();

    renderInitialAnalytics();

    window.PMDOwnerboardV2 = {
      version: VERSION,
      audit: audit,
      refreshKpis: loadKpis,
      refreshAnalytics:
        renderInitialAnalytics,

      floor: {
        refresh: function () {
          return clickNativeFloor(
            '[data-floor-refresh]'
          );
        },

        fit: function () {
          return clickNativeFloor(
            '[data-floor-fit]'
          );
        },

        audit: function () {
          updateFloorProxy();

          return audit();
        }
      }
    };

    /*
     * Backward-friendly alias for the user's existing audit habit.
     */
    window.PMDOwnerboardV1 =
      window.PMDOwnerboardV2;

    console.info(
      '[PMD Ownerboard V2] Ready',
      audit()
    );
  }

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

