(function () {
  'use strict';

  if (!/^\/admin\/reservations\/?$/.test(location.pathname))
    return;

  if (window.PMDReservationLayoutV3)
    return;

  var state = {
    reservations: [],
    tables: [],
    areas: [],
    area: 'all',
    selectedReservation: null,
    selectedTable: null,
    query: '',
    index: 0,
    installed: false,
    installing: false
  };

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character];
    });
  }

  function numberFromText(value, fallback) {
    var match = clean(value).match(/-?\d+(?:[.,]\d+)?/);

    return match
      ? Number(match[0].replace(',', '.'))
      : fallback;
  }

  function findTextNode(pattern) {
    return Array.prototype.find.call(
      document.querySelectorAll('body *'),
      function (node) {
        if (node.children.length)
          return false;

        return pattern.test(clean(node.textContent));
      }
    );
  }

  function closestCard(node) {
    if (!node)
      return null;

    var candidate = node.closest(
      '.card,' +
      '.panel,' +
      '[class*="card"],' +
      '[class*="widget"],' +
      '.col,' +
      '[class*="col-"]'
    );

    return candidate || node.parentElement;
  }

  function extractKpi(labelPattern) {
    var labelNode = findTextNode(labelPattern);
    var card = closestCard(labelNode);

    if (!card)
      return 0;

    var text = clean(card.textContent);
    var numbers = text.match(/\d+/g) || [];

    return numbers.length
      ? Number(numbers[numbers.length - 1])
      : 0;
  }

  function extractReservationCards() {
    var elements = Array.prototype.filter.call(
      document.querySelectorAll(
        '.card,' +
        '[class*="reservation-card"],' +
        '[class*="dashboard-card"],' +
        '[class*="widget-card"]'
      ),
      function (node) {
        var text = clean(node.textContent);

        return (
          /guest\(s\)|guests?/i.test(text) &&
          /table/i.test(text) &&
          /status|complete|pending|active/i.test(text)
        );
      }
    );

    var seen = new Set();

    return elements.map(function (card, index) {
      var text = clean(card.textContent);

      var idMatch = text.match(/\bID\s*(\d+)/i);
      var guestMatch = text.match(/GUEST(?:\(S\)|S)?\s*(\d+)/i);
      var tableMatch = text.match(/TABLE\s*([^\n]+?)(?:STATUS|$)/i);
      var timeMatch = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:am|pm)?\b/i);

      var nameMatch = text.match(
        /NAME\s+(.+?)(?:GUEST(?:\(S\)|S)?|TABLE|STATUS|EDIT|$)/i
      );

      var editLink = card.querySelector(
        'a[href*="/reservations/edit/"]'
      );

      var id = idMatch
        ? idMatch[1]
        : editLink
          ? clean(editLink.href).split('/').pop()
          : String(index + 1);

      if (seen.has(id))
        return null;

      seen.add(id);

      var tableText = tableMatch
        ? clean(tableMatch[1])
        : 'Incomplete';

      var tableNumberMatch = tableText.match(/\d+/);

      return {
        id: id,
        name: nameMatch
          ? clean(nameMatch[1])
          : 'Reservation ' + id,
        guests: guestMatch
          ? Number(guestMatch[1])
          : 1,
        table: tableText,
        tableNumber: tableNumberMatch
          ? tableNumberMatch[0]
          : '',
        status: /complete/i.test(text)
          ? 'Complete'
          : /active/i.test(text)
            ? 'Active'
            : /pending/i.test(text)
              ? 'Pending'
              : 'Reservation',
        time: timeMatch
          ? clean(timeMatch[0])
          : '--:--',
        editUrl: editLink
          ? editLink.href
          : '/admin/reservations/edit/' + id
      };
    }).filter(Boolean);
  }

  async function loadFloorTables() {
    var endpoints = [
      '/admin/pmd-waiter-floor-v106-data',
      '/admin/pmd-floor-plan-stable-data',
      '/admin/pmd-waiter-dashboard-v9-tenant-data',
      '/admin/pmd-waiter-dashboard-v2-data'
    ];

    for (var index = 0; index < endpoints.length; index += 1) {
      try {
        var response = await fetch(
          endpoints[index] + '?reservationV3=' + Date.now(),
          {
            credentials: 'same-origin',
            headers: {
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            cache: 'no-store'
          }
        );

        if (!response.ok)
          continue;

        var payload = await response.json();

        var rows =
          payload.tables ||
          (payload.data && payload.data.tables) ||
          (payload.payload && payload.payload.tables) ||
          [];

        if (!Array.isArray(rows) || !rows.length)
          continue;

        state.tables = rows.map(function (row, tableIndex) {
          var floor = row.floor || {};

          var id =
            row.id ||
            row.table_id ||
            tableIndex + 1;

          var number =
            row.number ||
            row.table_no ||
            row.table_number ||
            row.name ||
            row.table_name ||
            id;

          number = clean(number).replace(/^table\s*/i, '');

          var area =
            row.area ||
            row.area_name ||
            row.section ||
            row.table_section ||
            'Main dining';

          var due = Number(
            row.due_amount ||
            row.amount_due ||
            row.balance_due ||
            (row.order && row.order.due) ||
            0
          );

          var status = clean(
            row.floor_status ||
            row.status ||
            (row.order && row.order.status) ||
            ''
          ).toLowerCase();

          return {
            id: String(id),
            number: String(number),
            area: clean(area) || 'Main dining',
            capacity: Number(
              row.capacity ||
              row.max_capacity ||
              row.preferred_capacity ||
              4
            ),
            x: Number(
              row.x ||
              row.floor_x ||
              floor.x ||
              0
            ),
            y: Number(
              row.y ||
              row.floor_y ||
              floor.y ||
              0
            ),
            shape: clean(
              row.shape ||
              row.floor_shape ||
              floor.shape ||
              (
                tableIndex % 3 === 0
                  ? 'square'
                  : 'round'
              )
            ).toLowerCase(),
            status: due > 0
              ? 'due'
              : /reserved/.test(status)
                ? 'reserved'
                : 'free'
          };
        });

        state.areas = Array.from(
          new Set(
            state.tables.map(function (table) {
              return table.area;
            })
          )
        );

        return;
      }
      catch (error) {
        console.warn(
          '[PMD Reservations V3] floor endpoint failed',
          endpoints[index],
          error
        );
      }
    }

    state.tables = Array.from(
      { length: 20 },
      function (_, index) {
        return {
          id: String(index + 1),
          number: String(index + 1),
          area: index > 13
            ? 'Outdoor'
            : 'Main dining',
          capacity: [2, 4, 4, 6, 8][index % 5],
          x: 0,
          y: 0,
          shape: index % 3 === 0
            ? 'square'
            : 'round',
          status: 'free'
        };
      }
    );

    state.areas = ['Main dining', 'Outdoor'];
  }

  function hideLegacyPage(workspace) {
    Array.prototype.forEach.call(
      document.body.children,
      function (child) {
        if (
          child !== workspace &&
          child.tagName !== 'SCRIPT' &&
          child.tagName !== 'STYLE'
        ) {
          child.classList.add('pmd-res-v3-hidden');
        }
      }
    );
  }

  function reservationStats() {
    var today = extractKpi(/TODAY RESERVATIONS/i);
    var guests = extractKpi(/GUESTS TODAY/i);
    var active = extractKpi(/PENDING\s*\/\s*ACTIVE/i);
    var assigned = extractKpi(/ASSIGNED TABLES/i);

    if (!today)
      today = state.reservations.length;

    if (!guests) {
      guests = state.reservations.reduce(
        function (sum, reservation) {
          return sum + Number(reservation.guests || 0);
        },
        0
      );
    }

    if (!active)
      active = state.reservations.length;

    if (!assigned) {
      assigned = state.reservations.filter(
        function (reservation) {
          return Boolean(reservation.tableNumber);
        }
      ).length;
    }

    return {
      today: today,
      guests: guests,
      active: active,
      assigned: assigned
    };
  }

  function buildWorkspace() {
    var previous = document.getElementById('pmd-res-v3-workspace');

    if (previous)
      previous.remove();

    var stats = reservationStats();

    var workspace = document.createElement('section');
    workspace.id = 'pmd-res-v3-workspace';

    workspace.innerHTML = [
      '<header class="pmd-res-v3-header">',
        '<div class="pmd-res-v3-heading">',
          '<strong>Reservations</strong>',
          '<span>Bookings and live floor assignments</span>',
        '</div>',

        '<div class="pmd-res-v3-header-actions">',
          '<button type="button" data-rv3-refresh>Refresh</button>',
          '<a href="/admin/reservations/create">+ New reservation</a>',
        '</div>',
      '</header>',

      '<div class="pmd-res-v3-content">',
        '<section class="pmd-res-v3-kpis">',
          kpi(
            'Today reservations',
            stats.today,
            '▣'
          ),
          kpi(
            'Guests today',
            stats.guests,
            '♟'
          ),
          kpi(
            'Pending / active',
            stats.active,
            '◉'
          ),
          kpi(
            'Assigned tables',
            stats.assigned,
            '▦'
          ),
        '</section>',

        '<section class="pmd-res-v3-main">',
          '<aside class="pmd-res-v3-reservations">',
            '<header class="pmd-res-v3-section-header">',
              '<strong>Reservations</strong>',
              '<span data-rv3-count></span>',
            '</header>',

            '<div class="pmd-res-v3-filter-row">',
              '<input ',
                'class="pmd-res-v3-search" ',
                'data-rv3-search ',
                'placeholder="Search guest, table or status…"',
              '>',
              '<button type="button" data-rv3-clear>×</button>',
            '</div>',

            '<div class="pmd-res-v3-carousel-shell">',
              '<div ',
                'class="pmd-res-v3-carousel" ',
                'data-rv3-carousel',
              '></div>',
            '</div>',

            '<footer class="pmd-res-v3-carousel-nav">',
              '<button type="button" data-rv3-prev>‹</button>',
              '<div class="pmd-res-v3-dots" data-rv3-dots></div>',
              '<button type="button" data-rv3-next>›</button>',
            '</footer>',
          '</aside>',

          '<main class="pmd-res-v3-floor-panel">',
            '<nav ',
              'class="pmd-res-v3-area-tabs" ',
              'data-rv3-areas',
            '></nav>',

            '<div class="pmd-res-v3-floor-scroll">',
              '<div ',
                'class="pmd-res-v3-floor-canvas" ',
                'data-rv3-floor',
              '></div>',
            '</div>',

            '<footer class="pmd-res-v3-floor-legend">',
              '<span><i></i>Available</span>',
              '<span><i class="is-reserved"></i>Reserved</span>',
              '<span><i class="is-due"></i>Payment due</span>',
              '<span><i class="is-selected"></i>Selected</span>',
            '</footer>',
          '</main>',
        '</section>',
      '</div>'
    ].join('');

    document.body.appendChild(workspace);
    document.body.classList.add('pmd-res-v3-active');

    hideLegacyPage(workspace);
    bindEvents(workspace);
    renderAll();

    state.installed = true;
  }

  function kpi(label, value, icon) {
    return [
      '<article class="pmd-res-v3-kpi">',
        '<span class="pmd-res-v3-kpi-label">',
        escapeHtml(label),
        '</span>',

        '<strong class="pmd-res-v3-kpi-value">',
        escapeHtml(value),
        '</strong>',

        '<span class="pmd-res-v3-kpi-icon">',
        escapeHtml(icon),
        '</span>',
      '</article>'
    ].join('');
  }

  function filteredReservations() {
    var query = state.query.toLowerCase();

    if (!query)
      return state.reservations;

    return state.reservations.filter(function (reservation) {
      return [
        reservation.name,
        reservation.guests,
        reservation.table,
        reservation.status,
        reservation.time
      ].join(' ').toLowerCase().includes(query);
    });
  }

  function reservationSlide(reservation) {
    var selected =
      state.selectedReservation === reservation.id;

    return [
      '<div class="pmd-res-v3-slide">',
        '<article class="pmd-res-v3-card',
        selected ? ' is-selected' : '',
        '" data-rv3-reservation="',
        escapeHtml(reservation.id),
        '">',

          '<div class="pmd-res-v3-card-top">',
            '<div class="pmd-res-v3-card-name">',
              '<strong>',
              escapeHtml(reservation.name),
              '</strong>',

              '<span>',
              'Reservation ID ',
              escapeHtml(reservation.id),
              '</span>',
            '</div>',

            '<span class="pmd-res-v3-status">',
            escapeHtml(reservation.status),
            '</span>',
          '</div>',

          '<div class="pmd-res-v3-fields">',
            field('Guest(s)', reservation.guests),
            field('Table', reservation.table || 'Incomplete'),
            field('Time', reservation.time || '--:--'),
            field('Status', reservation.status),
          '</div>',

          '<div class="pmd-res-v3-card-actions">',
            '<a href="',
            escapeHtml(reservation.editUrl),
            '">Edit reservation</a>',
          '</div>',
        '</article>',
      '</div>'
    ].join('');
  }

  function field(label, value) {
    return [
      '<div class="pmd-res-v3-field">',
        '<label>', escapeHtml(label), '</label>',
        '<strong>', escapeHtml(value), '</strong>',
      '</div>'
    ].join('');
  }

  function renderReservations() {
    var reservations = filteredReservations();
    var carousel = document.querySelector('[data-rv3-carousel]');
    var count = document.querySelector('[data-rv3-count]');

    count.textContent =
      reservations.length + ' reservation' +
      (reservations.length === 1 ? '' : 's');

    if (!reservations.length) {
      carousel.innerHTML =
        '<div class="pmd-res-v3-empty">' +
        '<div>' +
        '<strong>No reservations found.</strong><br>' +
        'Create a reservation or clear the current search.' +
        '</div>' +
        '</div>';

      renderDots([]);
      return;
    }

    if (state.index >= reservations.length)
      state.index = reservations.length - 1;

    if (state.index < 0)
      state.index = 0;

    carousel.innerHTML =
      reservations.map(reservationSlide).join('');

    renderDots(reservations);

    requestAnimationFrame(function () {
      var slides = carousel.children;
      var slide = slides[state.index];

      if (slide) {
        carousel.scrollTo({
          left: slide.offsetLeft,
          behavior: 'auto'
        });
      }
    });
  }

  function renderDots(reservations) {
    var dots = document.querySelector('[data-rv3-dots]');

    dots.innerHTML = reservations.map(
      function (_, index) {
        return [
          '<button ',
            'type="button" ',
            'class="pmd-res-v3-dot',
            index === state.index
              ? ' is-active'
              : '',
            '" ',
            'data-rv3-dot="',
            index,
            '" ',
            'aria-label="Reservation ',
            index + 1,
            '">',
          '</button>'
        ].join('');
      }
    ).join('');
  }

  function renderAreas() {
    var areaContainer =
      document.querySelector('[data-rv3-areas]');

    var areas = ['all'].concat(state.areas);

    areaContainer.innerHTML = areas.map(
      function (area) {
        return [
          '<button ',
            'type="button" ',
            'class="',
            state.area === area
              ? 'is-active'
              : '',
            '" ',
            'data-rv3-area="',
            escapeHtml(area),
            '">',
            escapeHtml(
              area === 'all'
                ? 'All areas'
                : area
            ),
          '</button>'
        ].join('');
      }
    ).join('');
  }

  function assignedReservation(table) {
    return state.reservations.find(function (reservation) {
      return (
        reservation.tableNumber &&
        String(reservation.tableNumber) ===
        String(table.number)
      );
    });
  }

  function tablePosition(table, index) {
    if (
      Number(table.x) > 0 ||
      Number(table.y) > 0
    ) {
      return {
        left: Math.max(35, Number(table.x)),
        top: Math.max(35, Number(table.y))
      };
    }

    var column = index % 5;
    var row = Math.floor(index / 5);

    return {
      left:
        80 +
        column * 150 +
        (row % 2 ? 35 : 0),

      top:
        65 +
        row * 140
    };
  }

  function renderFloor() {
    var floor =
      document.querySelector('[data-rv3-floor]');

    var visibleTables = state.tables.filter(
      function (table) {
        return (
          state.area === 'all' ||
          table.area === state.area
        );
      }
    );

    floor.innerHTML = visibleTables.map(
      function (table, index) {
        var reservation = assignedReservation(table);
        var position = tablePosition(table, index);

        var selected =
          String(state.selectedTable) ===
          String(table.id);

        var statusClass = reservation
          ? 'is-reserved'
          : table.status === 'due'
            ? 'is-due'
            : table.status === 'reserved'
              ? 'is-reserved'
              : '';

        var square =
          /square|diamond/i.test(table.shape);

        return [
          '<button ',
            'type="button" ',
            'class="pmd-res-v3-table ',
            square ? 'is-square ' : 'is-round ',
            statusClass, ' ',
            selected ? 'is-selected' : '',
            '" ',
            'data-rv3-table="',
            escapeHtml(table.id),
            '" ',
            'style="',
              'left:', position.left, 'px;',
              'top:', position.top, 'px;',
            '">',

            '<span class="pmd-res-v3-table-inner">',
              '<span class="pmd-res-v3-table-number">',
              escapeHtml(table.number),
              '</span>',

              '<span class="pmd-res-v3-table-capacity">',
              escapeHtml(table.capacity),
              ' seats',
              '</span>',
            '</span>',

            reservation
              ? '<span class="pmd-res-v3-table-label">' +
                escapeHtml(reservation.name) +
                '</span>'
              : '',

          '</button>'
        ].join('');
      }
    ).join('');
  }

  function selectReservation(reservation) {
    state.selectedReservation = reservation.id;

    var table = state.tables.find(function (candidate) {
      return (
        reservation.tableNumber &&
        String(candidate.number) ===
        String(reservation.tableNumber)
      );
    });

    state.selectedTable =
      table ? table.id : null;

    renderReservations();
    renderFloor();
  }

  function changeIndex(direction) {
    var reservations = filteredReservations();

    if (!reservations.length)
      return;

    state.index =
      (state.index + direction + reservations.length) %
      reservations.length;

    selectReservation(reservations[state.index]);
  }

  function bindEvents(workspace) {
    workspace.addEventListener('input', function (event) {
      if (event.target.matches('[data-rv3-search]')) {
        state.query = clean(event.target.value);
        state.index = 0;
        renderReservations();
      }
    });

    workspace.addEventListener('click', function (event) {
      if (event.target.closest('[data-rv3-refresh]')) {
        location.reload();
        return;
      }

      if (event.target.closest('[data-rv3-prev]')) {
        changeIndex(-1);
        return;
      }

      if (event.target.closest('[data-rv3-next]')) {
        changeIndex(1);
        return;
      }

      if (event.target.closest('[data-rv3-clear]')) {
        var search =
          workspace.querySelector('[data-rv3-search]');

        search.value = '';
        state.query = '';
        state.index = 0;

        renderReservations();
        return;
      }

      var dot = event.target.closest('[data-rv3-dot]');

      if (dot) {
        state.index =
          Number(dot.getAttribute('data-rv3-dot')) || 0;

        var reservations = filteredReservations();

        if (reservations[state.index])
          selectReservation(reservations[state.index]);

        return;
      }

      var reservationNode =
        event.target.closest('[data-rv3-reservation]');

      if (reservationNode) {
        var id =
          reservationNode.getAttribute('data-rv3-reservation');

        var reservations = filteredReservations();

        var reservation = reservations.find(
          function (candidate) {
            return String(candidate.id) === String(id);
          }
        );

        if (reservation) {
          state.index = reservations.indexOf(reservation);
          selectReservation(reservation);
        }

        return;
      }

      var tableNode =
        event.target.closest('[data-rv3-table]');

      if (tableNode) {
        state.selectedTable =
          tableNode.getAttribute('data-rv3-table');

        renderFloor();
        return;
      }

      var areaNode =
        event.target.closest('[data-rv3-area]');

      if (areaNode) {
        state.area =
          areaNode.getAttribute('data-rv3-area');

        renderAreas();
        renderFloor();
      }
    });
  }

  function renderAll() {
    renderReservations();
    renderAreas();
    renderFloor();
  }

  async function install() {
    if (state.installing)
      return;

    state.installing = true;

    /*
     * The current PMD Reservation dashboard is rendered by
     * another asynchronous layer. Wait until that final layer
     * has finished before extracting and reorganising it.
     */
    await new Promise(function (resolve) {
      setTimeout(resolve, 2300);
    });

    var reservations = extractReservationCards();

    if (!reservations.length) {
      state.installing = false;

      console.warn(
        '[PMD Reservations V3] Existing reservation cards not ready yet.'
      );

      setTimeout(install, 1200);
      return;
    }

    state.reservations = reservations;

    await loadFloorTables();

    buildWorkspace();

    if (state.reservations.length) {
      selectReservation(state.reservations[0]);
    }

    state.installing = false;

    console.info(
      '[PMD] Reservation Layout V3 active',
      {
        reservations: state.reservations.length,
        tables: state.tables.length,
        areas: state.areas.length
      }
    );
  }

  window.PMDReservationLayoutV3 = {
    version: '3.0.0',
    state: state,
    reinstall: install,
    render: renderAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      install,
      { once: true }
    );
  }
  else {
    install();
  }
})();
