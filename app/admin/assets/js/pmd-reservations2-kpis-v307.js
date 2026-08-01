(function () {
  'use strict';

  if (window.PMDReservations2KpisV309) {
    window.PMDReservations2KpisV309.refresh();
    return;
  }

  var ROOT_ID =
    'pmd-reservations2';

  var HEADER_ID =
    'pmd-r2-clean-header';

  var KPI_ID =
    'pmd-r2-reservation-kpis-v307';

  var EMPTY_ID =
    'pmd-r2-empty-content-v305';

  var rebuilding = false;

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

  function metrics() {
    return {
      today: '—',
      upcoming: '—',
      pending: '—',
      tables: '—'
    };
  }

  function icon(name) {
    var paths = {
      'calendar-event':
        '<path d="M4 5a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"></path>' +
        '<path d="M16 3v4"></path>' +
        '<path d="M8 3v4"></path>' +
        '<path d="M4 11h16"></path>' +
        '<path d="M8 15h2v2h-2z"></path>',

      'clock-hour-4':
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M12 7v5l3 2"></path>',

      'circle-dashed-check':
        '<path d="M8.56 3.69a9 9 0 0 0 -2.92 1.95"></path>' +
        '<path d="M3.69 8.56a9 9 0 0 0 -.69 3.44"></path>' +
        '<path d="M3.69 15.44a9 9 0 0 0 1.95 2.92"></path>' +
        '<path d="M8.56 20.31a9 9 0 0 0 3.44 .69"></path>' +
        '<path d="M15.44 20.31a9 9 0 0 0 2.92 -1.95"></path>' +
        '<path d="M20.31 15.44a9 9 0 0 0 .69 -3.44"></path>' +
        '<path d="M20.31 8.56a9 9 0 0 0 -1.95 -2.92"></path>' +
        '<path d="M15.44 3.69a9 9 0 0 0 -3.44 -.69"></path>' +
        '<path d="M9 12l2 2l4 -4"></path>',

      'table':
        '<path d="M3 10h18"></path>' +
        '<path d="M5 10v8"></path>' +
        '<path d="M19 10v8"></path>' +
        '<path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>'
    };

    var namespace =
      'http://www.w3.org/2000/svg';

    var svg =
      document.createElementNS(
        namespace,
        'svg'
      );

    svg.setAttribute(
      'viewBox',
      '0 0 24 24'
    );

    svg.setAttribute(
      'aria-hidden',
      'true'
    );

    svg.setAttribute(
      'focusable',
      'false'
    );

    svg.setAttribute(
      'class',
      'pmd-r2-v309-tabler'
    );

    svg.innerHTML =
      paths[name] ||
      paths['calendar-event'];

    return svg;
  }

  function createCard(config) {
    /*
     * PMD_KPI_AUTHORITY_COLORS_V2403
     * The configurable KPI section owns this DOM.
     * Prevent the legacy V3 writer from replacing 14 with
     * the old future-guest value such as 192.
     */
    var pmdKpiAuthoritySection =
      document.getElementById(
        'pmd-r2-reservation-kpis-v307'
      );

    if (
      pmdKpiAuthoritySection &&
      pmdKpiAuthoritySection.getAttribute(
        'data-pmd-kpi-authority'
      ) === 'configurable-v2401'
    ) {
      return;
    }

    var card =
      document.createElement(
        'article'
      );

    card.className =
      'pmd-r2-v308-card';

    /*
     * Unique attribute prevents old Reservations scripts
     * from rewriting the card.
     */
    card.setAttribute(
      'data-r2-v308-card',
      config.key
    );

    var iconBox =
      document.createElement(
        'div'
      );

    iconBox.className =
      'pmd-r2-v308-icon';

    iconBox.appendChild(
      icon(config.icon)
    );

    var copy =
      document.createElement(
        'div'
      );

    copy.className =
      'pmd-r2-v308-copy';

    var title =
      document.createElement(
        'span'
      );

    title.className =
      'pmd-r2-v308-title';

    title.textContent =
      config.title;

    var value =
      document.createElement(
        'strong'
      );

    value.className =
      'pmd-r2-v308-value';

    value.setAttribute(
      'data-r2-v308-value',
      config.key
    );

    value.setAttribute(
      'aria-busy',
      'true'
    );

    value.textContent =
      String(config.value);

    var description =
      document.createElement(
        'span'
      );

    description.className =
      'pmd-r2-v308-description';

    description.textContent =
      config.description;

    copy.appendChild(title);
    copy.appendChild(value);
    copy.appendChild(description);

    card.appendChild(iconBox);
    card.appendChild(copy);

    return card;
  }

  function cardsConfiguration() {
    var data = metrics();

    return [
      {
        key: 'today',
        icon: 'calendar-event',
        title: 'Today’s Reservations',
        value: data.today,
        description:
          'Bookings scheduled for today'
      },

      {
        key: 'upcoming',
        icon: 'clock-hour-4',
        title: 'Upcoming Arrivals',
        value: data.upcoming,
        description:
          'Guests expected to arrive soon'
      },

      {
        key: 'pending',
        icon: 'circle-dashed-check',
        title: 'Pending Confirmations',
        value: data.pending,
        description:
          'Bookings requiring confirmation'
      },

      {
        key: 'tables',
        icon: 'table',
        title: 'Reservation Tables',
        value: data.tables,
        description:
          'Tables enabled for reservations'
      }
    ];
  }

  function validSection(section) {
    /*
     * PMD_KPI_AUTHORITY_COLORS_V2403
     * The configurable KPI section owns this DOM.
     * Prevent the legacy V3 writer from replacing 14 with
     * the old future-guest value such as 192.
     */
    var pmdKpiAuthoritySection =
      document.getElementById(
        'pmd-r2-reservation-kpis-v307'
      );

    if (
      pmdKpiAuthoritySection &&
      pmdKpiAuthoritySection.getAttribute(
        'data-pmd-kpi-authority'
      ) === 'configurable-v2401'
    ) {
      return;
    }

    if (!section) {
      return false;
    }

    var cards =
      section.querySelectorAll(
        '.pmd-r2-v308-card'
      );

    if (cards.length !== 4) {
      return false;
    }

    return cardsConfiguration()
      .every(function (config) {
        var card =
          section.querySelector(
            '[data-r2-v308-card="' +
            config.key +
            '"]'
          );

        return Boolean(
          card &&
          card.querySelector(
            '.pmd-r2-v308-icon'
          ) &&
          card.querySelector(
            '.pmd-r2-v308-title'
          ) &&
          card.querySelector(
            '[data-r2-v308-value="' +
            config.key +
            '"]'
          ) &&
          card.querySelector(
            '.pmd-r2-v308-description'
          )
        );
      });
  }

  function buildSection() {
    var section =
      document.createElement(
        'section'
      );

    section.id = KPI_ID;

    section.setAttribute(
      'aria-label',
      'Reservation overview'
    );

    cardsConfiguration()
      .forEach(function (config) {
        section.appendChild(
          createCard(config)
        );
      });

    return section;
  }

  function refresh() {
    if (rebuilding) {
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

    rebuilding = true;

    try {
      var headerBranch =
        directBranch(
          pageRoot,
          cleanHeader
        );

      if (!headerBranch) {
        return;
      }

      var section =
        document.getElementById(
          KPI_ID
        );

      if (!validSection(section)) {
        if (section) {
          section.remove();
        }

        section = buildSection();
      }

      if (
        section.parentElement !== pageRoot ||
        headerBranch.nextElementSibling !==
          section
      ) {
        headerBranch.insertAdjacentElement(
          'afterend',
          section
        );
      }

      var empty =
        document.getElementById(
          EMPTY_ID
        );

      if (
        empty &&
        section.nextElementSibling !== empty
      ) {
        section.insertAdjacentElement(
          'afterend',
          empty
        );
      }

      pageRoot.setAttribute(
        'data-pmd-r2-kpis',
        'v308'
      );
    } finally {
      rebuilding = false;
    }
  }

  function boot() {
    refresh();

    console.info(
      '[PMD Reservations2 KPIs V3.0.9] Ready',
      {
        cards:
          document.querySelectorAll(
            '#' + KPI_ID +
            ' .pmd-r2-v308-card'
          ).length,

        tablerIcons:
          document.querySelectorAll(
            '#' + KPI_ID +
            ' .pmd-r2-v309-tabler'
          ).length
      }
    );
  }

  window.PMDReservations2KpisV309 = {
    version: '3.0.9',
    refresh: refresh
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

/* PMD_CONFIGURABLE_RESERVATION_KPIS_V2401_BEGIN */
(function () {
  'use strict';

  var VERSION = '2.4.0.1';
  var SECTION_ID = 'pmd-r2-reservation-kpis-v307';
  var ROOT_ID = 'pmd-reservations2';
  var HEADER_ID = 'pmd-r2-clean-header';

  var DEFAULTS = [
    'reservations_today',
    'upcoming_arrivals',
    'table_occupancy',
    'average_party_size'
  ];

  var activeMenu = null;

  /*
   * PMD_KPI_STABLE_VALUES_UNIQUE_COLORS_V2404
   *
   * Changing the displayed KPI must never recalculate or repaint
   * the values of the other three visible cards.
   */
  var stableMetricValues = null;

  /*
   * PMD_KPI_IDENTITY_MENU_AUDIT_V2405
   *
   * Each KPI owns its title, menu label, color identity and
   * documented data source independently from its visible slot.
   */
  var KPI_DATA_AUDIT_VERSION = '2.4.0.5';

  var DEFINITIONS = [
    {
      key: 'reservations_today',
      title: 'Reservations Today',
      icon: 'calendar',
      tone: 'green',
      available: true
    },
    {
      key: 'upcoming_arrivals',
      title: 'Upcoming Arrivals',
      icon: 'clock',
      tone: 'orange',
      available: true
    },
    {
      key: 'pending_confirmations',
      title: 'Pending Confirmations',
      icon: 'pending',
      tone: 'blue',
      available: true
    },
    {
      key: 'available_tables',
      title: 'Available Tables',
      icon: 'table',
      tone: 'green',
      available: true
    },
    {
      key: 'no_show_rate',
      title: 'No-show Rate',
      icon: 'user-off',
      tone: 'red',
      available: true
    },
    {
      key: 'cancellation_rate',
      title: 'Cancellation Rate',
      icon: 'cancel',
      tone: 'red',
      available: true
    },
    {
      key: 'table_occupancy',
      title: 'Table Occupancy',
      icon: 'occupancy',
      tone: 'blue',
      available: true
    },
    {
      key: 'average_party_size',
      title: 'Average Party Size',
      icon: 'users',
      tone: 'purple',
      available: true
    },
    {
      key: 'reservation_tables',
      title: 'Reservation Tables',
      icon: 'table',
      tone: 'orange',
      available: true
    },
    {
      key: 'total_seats',
      title: 'Total Seats',
      icon: 'seats',
      tone: 'purple',
      available: true
    },
    {
      key: 'average_turn_time',
      title: 'Average Table Turn Time',
      icon: 'timer',
      tone: 'orange',
      available: false
    },
    {
      key: 'waiting_list',
      title: 'Waiting List',
      icon: 'list',
      tone: 'blue',
      available: false
    },
    {
      key: 'revpash',
      title: 'RevPASH',
      menuTitle: 'Revenue per available seat hour',
      icon: 'money',
      tone: 'green',
      available: false
    }
  ];

  function bootData() {
    return (
      window.PMD_RESERVATIONS2_BOOT ||
      window.PMDReservations2Boot ||
      {}
    );
  }

  function reservations() {
    var boot = bootData();

    var candidates = [
      boot.reservations,
      boot.items,
      boot.bookings,
      window.PMD_RESERVATIONS,
      window.PMDReservations
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      if (Array.isArray(candidates[index])) {
        return candidates[index];
      }
    }

    return [];
  }

  function tables() {
    var boot = bootData();

    var candidates = [
      boot.tables,
      boot.floorTables,
      boot.floor_tables,
      window.PMD_TABLES,
      window.PMDFloorTables
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      if (Array.isArray(candidates[index])) {
        return candidates[index];
      }
    }

    return [];
  }

  function clean(value) {
    return String(
      value === undefined || value === null
        ? ''
        : value
    )
      .replace(/\s+/g, ' ')
      .trim();
  }

  function numeric(value, fallback) {
    var result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }

  function dateKey(date) {
    if (
      !(date instanceof Date) ||
      Number.isNaN(date.getTime())
    ) {
      return '';
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function reservationDate(item) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    var direct =
      item.reservation_datetime ||
      item.start_at ||
      item.starts_at;

    if (direct) {
      var parsedDirect = new Date(direct);

      if (!Number.isNaN(parsedDirect.getTime())) {
        return parsedDirect;
      }
    }

    var rawDate =
      item.reserve_date ||
      item.reservation_date ||
      item.booking_date ||
      item.date;

    if (!rawDate) {
      return null;
    }

    var dateParts = clean(rawDate)
      .slice(0, 10)
      .split(/[-/]/)
      .map(Number);

    if (dateParts.length !== 3) {
      return null;
    }

    var year = dateParts[0];
    var month = dateParts[1];
    var day = dateParts[2];

    if (year < 1000) {
      day = dateParts[0];
      month = dateParts[1];
      year = dateParts[2];
    }

    var rawTime =
      item.reserve_time ||
      item.reservation_time ||
      item.booking_time ||
      item.time ||
      '00:00';

    var timeParts = clean(rawTime)
      .split(':')
      .map(Number);

    var result = new Date(
      year,
      month - 1,
      day,
      timeParts[0] || 0,
      timeParts[1] || 0,
      0,
      0
    );

    return Number.isNaN(result.getTime())
      ? null
      : result;
  }

  function status(item) {
    if (!item || typeof item !== 'object') {
      return '';
    }

    var value =
      item.status_name ||
      item.reservation_status ||
      item.status;

    if (value && typeof value === 'object') {
      value =
        value.status_name ||
        value.name ||
        value.label;
    }

    return clean(value).toLowerCase();
  }

  function cancelled(item) {
    return /cancel|declin|reject|storniert/.test(
      status(item)
    );
  }

  function noShow(item) {
    return /no[\s_-]?show|nicht erschienen/.test(
      status(item)
    );
  }

  function pending(item) {
    return /pending|received|await|unconfirmed|offen/.test(
      status(item)
    );
  }

  function percentage(part, total) {
    if (!total) {
      return '0%';
    }

    return (
      (
        part /
        total *
        100
      )
        .toFixed(1)
        .replace(/\.0$/, '') +
      '%'
    );
  }

  function enabledTable(table) {
    return (
      table &&
      (
        table.table_status === undefined ||
        table.table_status === null ||
        table.table_status === true ||
        Number(table.table_status) === 1
      )
    );
  }

  function occupiedTable(table) {
    var state = clean(
      table &&
      (
        table.operational_status ||
        table.status
      )
    ).toLowerCase();

    return /occupied|reserved|busy|booked|belegt/.test(
      state
    );
  }

  function availableTable(table) {
    if (!enabledTable(table)) {
      return false;
    }

    var state = clean(
      table.operational_status ||
      table.status
    ).toLowerCase();

    return !(
      /occupied|reserved|busy|booked|blocked|merged|unavailable|belegt/
        .test(state)
    );
  }

  function calculate() {
    var all = reservations();
    var allTables = tables();
    var now = new Date();
    var today = dateKey(now);

    var todayItems = all.filter(function (item) {
      var start = reservationDate(item);

      return (
        start &&
        dateKey(start) === today
      );
    });

    var activeToday = todayItems.filter(function (item) {
      return !cancelled(item);
    });

    var upcoming = all.filter(function (item) {
      var start = reservationDate(item);

      return (
        start &&
        start >= now &&
        !cancelled(item)
      );
    });

    var noShows = all.filter(noShow).length;
    var cancellations = all.filter(cancelled).length;
    var pendingCount = all.filter(pending).length;

    var guestTotal = activeToday.reduce(function (sum, item) {
      return sum + Math.max(
        0,
        numeric(
          item.guest_num ||
          item.guests ||
          item.party_size ||
          item.covers,
          0
        )
      );
    }, 0);

    var enabledTables = allTables.filter(enabledTable);
    var occupiedTables = enabledTables.filter(occupiedTable);
    var freeTables = enabledTables.filter(availableTable);

    var seats = enabledTables.reduce(function (sum, table) {
      return sum + Math.max(
        0,
        numeric(
          table.max_capacity ||
          table.preferred_capacity ||
          table.capacity,
          0
        )
      );
    }, 0);

    return {
      reservations_today: {
        value: String(activeToday.length),
        description: 'Active bookings scheduled today'
      },

      upcoming_arrivals: {
        value: String(upcoming.length),
        description: 'Future active reservations'
      },

      pending_confirmations: {
        value: String(pendingCount),
        description: 'Reservations awaiting confirmation'
      },

      available_tables: {
        value: String(freeTables.length),
        description:
          freeTables.length +
          ' of ' +
          enabledTables.length +
          ' tables available'
      },

      no_show_rate: {
        value: percentage(noShows, all.length),
        description:
          noShows +
          ' no-shows from ' +
          all.length +
          ' reservations'
      },

      cancellation_rate: {
        value: percentage(
          cancellations,
          all.length
        ),
        description:
          cancellations +
          ' cancelled from ' +
          all.length +
          ' reservations'
      },

      table_occupancy: {
        value: percentage(
          occupiedTables.length,
          enabledTables.length
        ),
        description:
          occupiedTables.length +
          ' of ' +
          enabledTables.length +
          ' tables occupied'
      },

      average_party_size: {
        value: activeToday.length
          ? (
              guestTotal /
              activeToday.length
            ).toFixed(1)
          : '0',
        description: 'Average guests per booking today'
      },

      reservation_tables: {
        value: String(enabledTables.length),
        description: 'Tables enabled for reservations'
      },

      total_seats: {
        value: String(seats),
        description: 'Combined enabled table capacity'
      },

      average_turn_time: {
        value: '—',
        description:
          'Data required: seated and completed timestamps'
      },

      waiting_list: {
        value: '—',
        description:
          'Data required: waiting-list records'
      },

      revpash: {
        value: '—',
        description:
          'Data required: linked revenue and service hours'
      }
    };
  }

  function icon(name) {
    var paths = {
      calendar:
        '<rect x="3" y="5" width="18" height="16" rx="2"></rect>' +
        '<path d="M16 3v4M8 3v4M3 11h18"></path>',

      clock:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M12 7v5l3 2"></path>',

      pending:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M12 7v5M12 16h.01"></path>',

      table:
        '<path d="M3 10h18M5 10v8M19 10v8"></path>' +
        '<path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>',

      'user-off':
        '<circle cx="9" cy="8" r="3"></circle>' +
        '<path d="M3 20a6 6 0 0 1 9 -5.2M15 15a6 6 0 0 1 3 5M3 3l18 18"></path>',

      cancel:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M9 9l6 6M15 9l-6 6"></path>',

      occupancy:
        '<rect x="3" y="4" width="18" height="16" rx="2"></rect>' +
        '<path d="M7 8h3v3h-3zM14 8h3v3h-3zM7 14h3v2h-3zM14 14h3v2h-3z"></path>',

      users:
        '<circle cx="9" cy="8" r="3"></circle>' +
        '<path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',

      timer:
        '<circle cx="12" cy="13" r="8"></circle>' +
        '<path d="M12 9v4l2 2M9 2h6M12 2v3"></path>',

      list:
        '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"></path>',

      money:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-6M12 6v2M12 16v2"></path>',

      seats:
        '<path d="M6 11v-4a3 3 0 0 1 6 0v4M4 11h10v6h-10zM6 17v3M12 17v3"></path>'
    };

    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (
        paths[name] ||
        paths.calendar
      ) +
      '</svg>'
    );
  }

  function definition(key) {
    return DEFINITIONS.find(function (item) {
      return item.key === key;
    }) || DEFINITIONS[0];
  }

  function storageKey() {
    var boot = bootData();

    var locationId =
      boot.locationId ||
      boot.location_id ||
      (
        boot.location &&
        (
          boot.location.location_id ||
          boot.location.id
        )
      ) ||
      'default';

    return (
      'pmd:reservations2:kpis:v2401:' +
      String(locationId)
    );
  }

  function readSelection() {
    try {
      var parsed = JSON.parse(
        localStorage.getItem(storageKey()) ||
        'null'
      );

      if (
        Array.isArray(parsed) &&
        parsed.length === 4 &&
        parsed.every(function (key) {
          return DEFINITIONS.some(function (item) {
            return item.key === key;
          });
        })
      ) {
        return parsed;
      }
    } catch (error) {
      // Defaults are used.
    }

    return DEFAULTS.slice();
  }

  function writeSelection(selection) {
    try {
      localStorage.setItem(
        storageKey(),
        JSON.stringify(selection)
      );
    } catch (error) {
      // Persistence is optional.
    }
  }

  function metricValues(forceRefresh) {
    if (
      forceRefresh === true ||
      !stableMetricValues
    ) {
      stableMetricValues = calculate();
    }

    return stableMetricValues;
  }

  function replaceVisibleSlot(slot, key) {
    var section = document.getElementById(
      SECTION_ID
    );

    if (!section) {
      return;
    }

    var currentCard = section.querySelector(
      '.pmd-r2-kpi-v2401-card' +
      '[data-pmd-kpi-v2401-slot="' +
      String(slot) +
      '"]'
    );

    var replacement = createCard(
      slot,
      key,
      metricValues(false)
    );

    if (currentCard) {
      currentCard.replaceWith(replacement);
    } else {
      section.appendChild(replacement);
    }
  }

  function closeMenu() {
    if (!activeMenu) {
      return;
    }

    var menuToClose = activeMenu;
    var parentCard = menuToClose.closest(
      '.pmd-r2-kpi-v2401-card'
    );

    var menuButton = parentCard
      ? parentCard.querySelector(
          '[data-pmd-kpi-v2401-menu-button]'
        )
      : null;

    activeMenu = null;

    menuToClose.classList.add('is-closing');

    if (parentCard) {
      parentCard.classList.remove('is-menu-open');
    }

    if (menuButton) {
      menuButton.setAttribute(
        'aria-expanded',
        'false'
      );
    }

    window.setTimeout(
      function () {
        /*
         * The menu may have been reopened before the closing
         * animation completed. Do not hide a reopened menu.
         */
        if (
          menuToClose.classList.contains('is-closing')
        ) {
          menuToClose.hidden = true;
          menuToClose.classList.remove('is-closing');
        }
      },
      135
    );
  }


  function selectMetric(slot, key) {
    var selection = readSelection();
    var previousKey = selection[slot];
    var duplicateSlot = selection.indexOf(key);

    /*
     * Each KPI can be visible only once.
     * Selecting an existing KPI swaps the two positions.
     */
    if (
      duplicateSlot !== -1 &&
      duplicateSlot !== slot
    ) {
      selection[duplicateSlot] = previousKey;
    }

    selection[slot] = key;

    writeSelection(selection);
    closeMenu();

    /*
     * Do not call render() here.
     * Only replace the affected card or swapped cards.
     * Therefore values such as 14 cannot flash to 192.
     */
    replaceVisibleSlot(
      slot,
      selection[slot]
    );

    if (
      duplicateSlot !== -1 &&
      duplicateSlot !== slot
    ) {
      replaceVisibleSlot(
        duplicateSlot,
        selection[duplicateSlot]
      );
    }
  }

  function createMenu(slot, selectedKey) {
    var menu = document.createElement('div');

    menu.className =
      'pmd-r2-kpi-v2401-menu';

    menu.hidden = true;
    menu.setAttribute('role', 'menu');

    DEFINITIONS.forEach(function (item) {
      var option = document.createElement('button');

      option.type = 'button';
      option.className =
        'pmd-r2-kpi-v2401-option';

      option.dataset.pmdKpiV2401Key =
        item.key;

      option.setAttribute(
        'role',
        'menuitemradio'
      );

      option.setAttribute(
        'aria-checked',
        item.key === selectedKey
          ? 'true'
          : 'false'
      );

      if (item.key === selectedKey) {
        option.classList.add('is-selected');
      }

      option.innerHTML =
        '<span class="pmd-r2-kpi-v2401-option-icon">' +
          icon(item.icon) +
        '</span>' +
        '<span class="pmd-r2-kpi-v2401-option-copy">' +
          '<strong>' +
            (
              item.menuTitle ||
              item.title
            ) +
          '</strong>' +
          '<small>' +
            (
              item.available
                ? 'Available now'
                : 'Data connection required'
            ) +
          '</small>' +
        '</span>' +
        '<span class="pmd-r2-kpi-v2401-check">' +
          (
            item.key === selectedKey
              ? '✓'
              : ''
          ) +
        '</span>';

      option.addEventListener(
        'click',
        function (event) {
          event.preventDefault();
          event.stopPropagation();

          selectMetric(
            slot,
            item.key
          );
        }
      );

      menu.appendChild(option);
    });

    return menu;
  }

  function createCard(slot, key, values) {
    var config = definition(key);

    var metric = values[key] || {
      value: '—',
      description: 'No data available'
    };

    var card = document.createElement('article');

    card.className =
      'pmd-r2-kpi-v2401-card';

    card.dataset.pmdKpiV2401Key = key;
    card.dataset.pmdKpiV2401Tone = config.tone;
    card.dataset.pmdKpiV2401Slot = String(slot);

    card.innerHTML =
      '<div class="pmd-r2-kpi-v2401-icon">' +
        icon(config.icon) +
      '</div>' +
      '<div class="pmd-r2-kpi-v2401-copy">' +
        '<span class="pmd-r2-kpi-v2401-title">' +
          config.title +
        '</span>' +
        '<strong class="pmd-r2-kpi-v2401-value">' +
          metric.value +
        '</strong>' +
        '<span class="pmd-r2-kpi-v2401-description">' +
          metric.description +
        '</span>' +
      '</div>' +
      '<button type="button"' +
        ' class="pmd-r2-kpi-v2401-more"' +
        ' data-pmd-kpi-v2401-menu-button' +
        ' aria-label="Change KPI"' +
        ' aria-haspopup="menu"' +
        ' aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
      '</button>';

    var menu = createMenu(slot, key);

    card.appendChild(menu);

    var menuButton = card.querySelector(
      '[data-pmd-kpi-v2401-menu-button]'
    );

    menuButton.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        var wasOpen = !menu.hidden;

        closeMenu();

        if (!wasOpen) {
          menu.classList.remove('is-closing');
          menu.hidden = false;
          activeMenu = menu;
          card.classList.add('is-menu-open');

          menuButton.setAttribute(
            'aria-expanded',
            'true'
          );
        }
      }
    );

    return card;
  }

  function directBranch(ancestor, descendant) {
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

  function ensureSection() {
    var pageRoot = document.getElementById(
      ROOT_ID
    );

    var cleanHeader = document.getElementById(
      HEADER_ID
    );

    if (!pageRoot || !cleanHeader) {
      return null;
    }

    var headerBranch = directBranch(
      pageRoot,
      cleanHeader
    );

    if (!headerBranch) {
      return null;
    }

    var section = document.getElementById(
      SECTION_ID
    );

    if (!section) {
      section = document.createElement(
        'section'
      );

      section.id = SECTION_ID;
    }

    section.className =
      'pmd-r2-kpis-v2401';

    section.dataset.pmdKpiAuthority =
      'configurable-v2401';

    section.setAttribute(
      'aria-label',
      'Configurable reservation KPIs'
    );

    if (
      section.parentElement !== pageRoot ||
      headerBranch.nextElementSibling !== section
    ) {
      headerBranch.insertAdjacentElement(
        'afterend',
        section
      );
    }

    return section;
  }

  function render() {
    var section = ensureSection();

    if (!section) {
      return;
    }

    closeMenu();

    var selection = readSelection();
    var values = metricValues(false);

    section.replaceChildren();

    selection.forEach(function (key, slot) {
      section.appendChild(
        createCard(
          slot,
          key,
          values
        )
      );
    });

    document.documentElement.setAttribute(
      'data-pmd-configurable-kpis',
      'v2401'
    );
  }

  function reset() {
    try {
      localStorage.removeItem(
        storageKey()
      );
    } catch (error) {
      // Ignore storage failure.
    }

    render();
  }

  function metricDataAudit() {
    var values = metricValues(false);
    var reservationItems = reservations();
    var tableItems = tables();

    var report = {
      version: KPI_DATA_AUDIT_VERSION,

      sourceSnapshot: {
        reservationsLoaded: reservationItems.length,
        tablesLoaded: tableItems.length,
        reservationSource:
          'PMD Reservations2 browser Boot Data',
        tableSource:
          'PMD Reservations2 browser table/floor Boot Data'
      },

      metrics: {
        reservations_today: {
          connected: true,
          real: true,
          scope: 'Loaded reservations dated today, excluding cancelled',
          value: values.reservations_today.value
        },

        upcoming_arrivals: {
          connected: true,
          real: true,
          scope: 'Loaded future reservations, excluding cancelled',
          value: values.upcoming_arrivals.value
        },

        pending_confirmations: {
          connected: true,
          real: true,
          scope: 'Loaded reservations with pending/open/received status',
          value: values.pending_confirmations.value
        },

        available_tables: {
          connected: true,
          real: true,
          scope: 'Enabled loaded tables whose operational status is available',
          value: values.available_tables.value
        },

        no_show_rate: {
          connected: true,
          real: true,
          scope: 'No-show statuses divided by all loaded reservations',
          value: values.no_show_rate.value
        },

        cancellation_rate: {
          connected: true,
          real: true,
          scope: 'Cancelled statuses divided by all loaded reservations',
          value: values.cancellation_rate.value
        },

        table_occupancy: {
          connected: true,
          real: true,
          scope: 'Occupied enabled loaded tables divided by enabled loaded tables',
          value: values.table_occupancy.value
        },

        average_party_size: {
          connected: true,
          real: true,
          scope: 'Guest total divided by active reservations dated today',
          value: values.average_party_size.value
        },

        reservation_tables: {
          connected: true,
          real: true,
          scope: 'Count of enabled loaded reservation tables',
          value: values.reservation_tables.value
        },

        total_seats: {
          connected: true,
          real: true,
          scope: 'Combined capacity of enabled loaded tables',
          value: values.total_seats.value
        },

        average_turn_time: {
          connected: false,
          real: false,
          required:
            'Seated-at and completed-at timestamps',
          value: values.average_turn_time.value
        },

        waiting_list: {
          connected: false,
          real: false,
          required:
            'Waiting-list records or Waiting List API',
          value: values.waiting_list.value
        },

        revpash: {
          connected: false,
          real: false,
          required:
            'Linked revenue, seat count and configured service opening hours',
          cardTitle: 'RevPASH',
          menuTitle:
            'Revenue per available seat hour',
          value: values.revpash.value
        }
      }
    };

    return report;
  }

  function audit() {
    var section = document.getElementById(
      SECTION_ID
    );

    return {
      version: VERSION,
      ready: Boolean(section),
      visibleCards: section
        ? section.querySelectorAll(
            '.pmd-r2-kpi-v2401-card'
          ).length
        : 0,
      selection: readSelection(),
      availableChoices: DEFINITIONS.filter(function (item) {
        return item.available;
      }).length,
      dataRequiredChoices: DEFINITIONS.filter(function (item) {
        return !item.available;
      }).map(function (item) {
        return item.key;
      }),
      storageKey: storageKey()
    };
  }

  document.addEventListener(
    'click',
    function (event) {
      if (
        activeMenu &&
        !activeMenu.contains(event.target) &&
        !event.target.closest(
          '[data-pmd-kpi-v2401-menu-button]'
        )
      ) {
        closeMenu();
      }
    }
  );

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }
  );

  [
    'pmd:reservation:saved',
    'pmd:reservations:updated',
    'pmd:floor:updated',
    'pmd:table-status:updated'
  ].forEach(function (eventName) {
    window.addEventListener(
      eventName,
      function () {
        /*
         * Only genuine reservation/table updates refresh numbers.
         * Opening a menu or choosing another KPI does not.
         */
        stableMetricValues = null;
        render();
      }
    );
  });

  window.PMDConfigurableReservationKpisV2401 = {
    version: VERSION,

    refresh: function () {
      stableMetricValues = null;
      render();
    },

    render: render,
    reset: reset,
    audit: audit,
    auditData: metricDataAudit,

    logDataAudit: function () {
      var report = metricDataAudit();

      console.table(
        Object.keys(report.metrics).map(
          function (key) {
            var metric = report.metrics[key];

            return {
              key: key,
              connected: metric.connected,
              real: metric.real,
              value: metric.value,
              scope:
                metric.scope ||
                metric.required ||
                ''
            };
          }
        )
      );

      return report;
    }
  };

  function boot() {
    stableMetricValues = calculate();
    render();

    console.info(
      '[PMD Configurable Reservation KPIs V2.4.0.1] Ready',
      audit()
    );
  }

  if (document.readyState === 'loading') {
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
/* PMD_CONFIGURABLE_RESERVATION_KPIS_V2401_END */

/* ============================================================
   PMD_KPI_MENU_OUTSIDE_STACK_V2406
   Capture-phase outside close + date-control stacking authority
   ============================================================ */

(function () {
  'use strict';

  if (window.PMDKpiMenuOutsideStackV2406) {
    return;
  }

  var VERSION = '2.4.0.6';

  var ROOT_SELECTOR =
    '#pmd-r2-reservation-kpis-v307';

  var MENU_SELECTOR =
    '.pmd-r2-kpi-v2401-menu';

  var MENU_BUTTON_SELECTOR =
    '[data-pmd-kpi-v2401-menu-button]';

  var OPEN_ATTRIBUTE =
    'data-pmd-kpi-menu-open';

  var closeTimer = null;

  function menus() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        ROOT_SELECTOR + ' ' + MENU_SELECTOR
      )
    );
  }

  function visibleMenu() {
    return menus().find(function (menu) {
      return (
        !menu.hidden &&
        menu.getClientRects().length > 0
      );
    }) || null;
  }

  function setPageOpenState(open) {
    var root = document.documentElement;

    if (open) {
      root.setAttribute(
        OPEN_ATTRIBUTE,
        'true'
      );
    } else {
      root.removeAttribute(
        OPEN_ATTRIBUTE
      );
    }
  }

  function syncPageOpenState() {
    var openMenu = visibleMenu();

    setPageOpenState(Boolean(openMenu));

    return openMenu;
  }

  function scheduleSync(delay) {
    window.setTimeout(
      syncPageOpenState,
      typeof delay === 'number'
        ? delay
        : 0
    );
  }

  function requestExistingSmoothClose() {
    /*
     * Reuse the existing V2.4.0.5 Escape handler so its
     * 135ms closing animation and internal activeMenu state
     * remain authoritative.
     */
    document.dispatchEvent(
      new KeyboardEvent(
        'keydown',
        {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true
        }
      )
    );

    setPageOpenState(true);

    if (closeTimer) {
      window.clearTimeout(closeTimer);
    }

    closeTimer = window.setTimeout(
      function () {
        syncPageOpenState();
        closeTimer = null;
      },
      175
    );
  }

  /*
   * Capture phase is intentional.
   *
   * Other Reservation-page controls may stop click propagation.
   * pointerdown capture runs before those handlers, therefore
   * any click outside the active KPI menu closes it first.
   */
  document.addEventListener(
    'pointerdown',
    function (event) {
      var openMenu = visibleMenu();

      if (!openMenu) {
        setPageOpenState(false);
        return;
      }

      var target = event.target;

      if (!(target instanceof Element)) {
        requestExistingSmoothClose();
        return;
      }

      if (
        openMenu.contains(target) ||
        target.closest(MENU_BUTTON_SELECTOR)
      ) {
        return;
      }

      requestExistingSmoothClose();
    },
    true
  );

  /*
   * Runs after the original KPI click handler.
   * It detects newly opened menus and activates page-level
   * stacking rules immediately.
   */
  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;

      if (
        target instanceof Element &&
        target.closest(MENU_BUTTON_SELECTOR)
      ) {
        scheduleSync(0);
        scheduleSync(20);
      }
    }
  );

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key !== 'Escape') {
        return;
      }

      setPageOpenState(true);
      scheduleSync(175);
    },
    true
  );

  window.addEventListener(
    'blur',
    function () {
      if (visibleMenu()) {
        requestExistingSmoothClose();
      }
    }
  );

  window.PMDKpiMenuOutsideStackV2406 = {
    version: VERSION,

    close: function () {
      if (visibleMenu()) {
        requestExistingSmoothClose();
      }
    },

    audit: function () {
      var menu = visibleMenu();
      var dateButton = document.getElementById(
        'pmd-r2-date-button-v430'
      );

      return {
        version: VERSION,
        ready: true,
        menuOpen: Boolean(menu),
        pageOpenAttribute:
          document.documentElement.getAttribute(
            OPEN_ATTRIBUTE
          ),
        dateButtonExists:
          Boolean(dateButton),
        dateButtonVisibility:
          dateButton
            ? getComputedStyle(dateButton).visibility
            : null,
        dateButtonOpacity:
          dateButton
            ? getComputedStyle(dateButton).opacity
            : null
      };
    }
  };

  syncPageOpenState();

  console.info(
    '[PMD KPI Menu Outside + Stack V2.4.0.6] Ready',
    window.PMDKpiMenuOutsideStackV2406.audit()
  );
})();

/* ============================================================
   PMD_KPI_MENU_DATE_OVERLAY_V2407
   Reliable KPI-menu state and date-button suppression
   ============================================================ */

(function () {
  'use strict';

  if (window.PMDKpiMenuDateOverlayV2407) {
    return;
  }

  var VERSION = '2.4.0.7';

  var ROOT_SELECTOR =
    '#pmd-r2-reservation-kpis-v307';

  var PAGE_ATTRIBUTE =
    'data-pmd-kpi-dropdown-active';

  var closeTimer = null;

  function root() {
    return document.querySelector(ROOT_SELECTOR);
  }

  function menuTriggers() {
    var targetRoot = root();

    if (!targetRoot) {
      return [];
    }

    return Array.prototype.slice.call(
      targetRoot.querySelectorAll([
        '[data-pmd-kpi-v2401-menu-button]',
        '[data-pmd-kpi-menu-button]',
        '[aria-haspopup="menu"]',
        '[aria-haspopup="listbox"]',
        '.pmd-r2-kpi-v2401-menu-button',
        '.pmd-r2-kpi-menu-button',
        'button'
      ].join(','))
    ).filter(function (button) {
      if (!(button instanceof HTMLElement)) {
        return false;
      }

      if (
        button.matches(
          '[data-pmd-kpi-v2401-menu-button], ' +
          '[data-pmd-kpi-menu-button], ' +
          '[aria-haspopup="menu"], ' +
          '[aria-haspopup="listbox"], ' +
          '.pmd-r2-kpi-v2401-menu-button, ' +
          '.pmd-r2-kpi-menu-button'
        )
      ) {
        return true;
      }

      var text = String(
        button.textContent || ''
      ).replace(/\s+/g, '');

      var label = String(
        button.getAttribute('aria-label') || ''
      ).toLowerCase();

      var title = String(
        button.getAttribute('title') || ''
      ).toLowerCase();

      return (
        text === '⋮' ||
        text === '...' ||
        /menu|options|kpi/.test(label) ||
        /menu|options|kpi/.test(title)
      );
    });
  }

  function menuElements() {
    var targetRoot = root();

    if (!targetRoot) {
      return [];
    }

    return Array.prototype.slice.call(
      targetRoot.querySelectorAll([
        '.pmd-r2-kpi-v2401-menu',
        '.pmd-r2-kpi-menu',
        '[data-pmd-kpi-menu]',
        '[role="menu"]',
        '[role="listbox"]'
      ].join(','))
    );
  }

  function elementIsVisible(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    var style = window.getComputedStyle(element);

    return (
      !element.hidden &&
      element.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0
    );
  }

  function triggerIsOpen(trigger) {
    if (!(trigger instanceof HTMLElement)) {
      return false;
    }

    return (
      trigger.getAttribute('aria-expanded') === 'true' ||
      trigger.classList.contains('is-open') ||
      trigger.classList.contains('is-active') ||
      trigger.closest('.is-menu-open') !== null
    );
  }

  function detectOpenState() {
    var openByTrigger =
      menuTriggers().some(triggerIsOpen);

    var openByMenu =
      menuElements().some(elementIsVisible);

    return openByTrigger || openByMenu;
  }

  function setActive(active) {
    var html = document.documentElement;
    var body = document.body;

    if (active) {
      html.setAttribute(
        PAGE_ATTRIBUTE,
        'true'
      );

      if (body) {
        body.setAttribute(
          PAGE_ATTRIBUTE,
          'true'
        );
      }
    } else {
      html.removeAttribute(PAGE_ATTRIBUTE);

      if (body) {
        body.removeAttribute(PAGE_ATTRIBUTE);
      }
    }
  }

  function syncState() {
    var active = detectOpenState();

    setActive(active);

    return active;
  }

  function scheduleSync() {
    [0, 20, 60, 140].forEach(function (delay) {
      window.setTimeout(syncState, delay);
    });
  }

  function isTrigger(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    return menuTriggers().find(function (trigger) {
      return (
        trigger === target ||
        trigger.contains(target)
      );
    }) || null;
  }

  function isInsideOpenMenu(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return menuElements().some(function (menu) {
      return (
        elementIsVisible(menu) &&
        menu.contains(target)
      );
    });
  }

  function closeExistingMenu() {
    if (!detectOpenState()) {
      setActive(false);
      return;
    }

    document.dispatchEvent(
      new KeyboardEvent(
        'keydown',
        {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true
        }
      )
    );

    setActive(true);

    if (closeTimer) {
      window.clearTimeout(closeTimer);
    }

    closeTimer = window.setTimeout(
      function () {
        setActive(false);
        syncState();
        closeTimer = null;
      },
      190
    );
  }

  /*
   * Runs before every other click handler.
   *
   * Clicking a KPI three-dot button activates the overlay
   * protection immediately, before the menu is rendered.
   */
  document.addEventListener(
    'pointerdown',
    function (event) {
      var trigger = isTrigger(event.target);

      if (trigger) {
        setActive(true);
        scheduleSync();
        return;
      }

      if (!detectOpenState()) {
        setActive(false);
        return;
      }

      if (isInsideOpenMenu(event.target)) {
        return;
      }

      closeExistingMenu();
    },
    true
  );

  document.addEventListener(
    'click',
    function (event) {
      if (isTrigger(event.target)) {
        setActive(true);
        scheduleSync();
      }
    },
    true
  );

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key !== 'Escape') {
        return;
      }

      window.setTimeout(function () {
        setActive(false);
        syncState();
      }, 180);
    },
    true
  );

  window.addEventListener(
    'blur',
    closeExistingMenu
  );

  window.PMDKpiMenuDateOverlayV2407 = {
    version: VERSION,

    sync: syncState,

    close: closeExistingMenu,

    audit: function () {
      var dateButton = document.getElementById(
        'pmd-r2-date-button-v430'
      );

      var openTriggers = menuTriggers()
        .filter(triggerIsOpen)
        .length;

      var visibleMenus = menuElements()
        .filter(elementIsVisible)
        .length;

      return {
        version: VERSION,
        ready: true,
        detectedOpen:
          detectOpenState(),
        openTriggers:
          openTriggers,
        visibleMenus:
          visibleMenus,
        htmlActive:
          document.documentElement
            .getAttribute(PAGE_ATTRIBUTE),
        bodyActive:
          document.body
            ? document.body.getAttribute(
                PAGE_ATTRIBUTE
              )
            : null,
        dateButtonExists:
          Boolean(dateButton),
        dateButtonDisplay:
          dateButton
            ? getComputedStyle(dateButton).display
            : null,
        dateButtonVisibility:
          dateButton
            ? getComputedStyle(dateButton).visibility
            : null,
        dateButtonOpacity:
          dateButton
            ? getComputedStyle(dateButton).opacity
            : null,
        dateButtonPointerEvents:
          dateButton
            ? getComputedStyle(dateButton).pointerEvents
            : null
      };
    }
  };

  setActive(false);

  console.info(
    '[PMD KPI Menu Date Overlay V2.4.0.7] Ready',
    window.PMDKpiMenuDateOverlayV2407.audit()
  );
})();
