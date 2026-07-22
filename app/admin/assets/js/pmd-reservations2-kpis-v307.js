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

  function sourceData() {
    return (
      window.PMDReservations2V1 ||
      window.PMDReservations2 ||
      {}
    );
  }

  function firstDefined(
    values,
    fallback
  ) {
    for (
      var index = 0;
      index < values.length;
      index += 1
    ) {
      var value = values[index];

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        return value;
      }
    }

    return fallback;
  }

  function metrics() {
    var source = sourceData();

    return {
      today:
        firstDefined(
          [
            source.todayReservations,
            source.reservationsToday,
            source.reservations
          ],
          '—'
        ),

      upcoming:
        firstDefined(
          [
            source.upcomingArrivals,
            source.upcomingReservations,
            source.upcoming
          ],
          '—'
        ),

      pending:
        firstDefined(
          [
            source.pendingConfirmations,
            source.pendingReservations,
            source.pending
          ],
          '—'
        ),

      tables:
        firstDefined(
          [
            source.reservationTables,
            source.availableTables,
            source.tables
          ],
          '—'
        )
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

  function updateValues(section) {
    var data = metrics();

    Object.keys(data)
      .forEach(function (key) {
        var value =
          section.querySelector(
            '[data-r2-v308-value="' +
            key +
            '"]'
          );

        if (value) {
          value.textContent =
            String(data[key]);
        }
      });
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

      updateValues(section);

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

    /*
     * Rebuild only when the KPI structure is actually altered.
     */
    new MutationObserver(
      function () {
        var section =
          document.getElementById(
            KPI_ID
          );

        if (!validSection(section)) {
          refresh();
        }
      }
    ).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    [
      0,
      100,
      300,
      700,
      1500,
      3000
    ].forEach(function (delay) {
      setTimeout(
        refresh,
        delay
      );
    });

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
