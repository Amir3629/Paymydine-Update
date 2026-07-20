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

  function pmdV32LeafTextNodes(container) {
    return Array.prototype.filter.call(
      container.querySelectorAll('*'),
      function (node) {
        return (
          node.children.length === 0 &&
          clean(node.textContent)
        );
      }
    );
  }

  function pmdV32FieldValue(container, labelPattern) {
    if (!container)
      return '';

    var leaves = pmdV32LeafTextNodes(container);

    var labelNode = leaves.find(function (node) {
      return labelPattern.test(clean(node.textContent));
    });

    if (!labelNode)
      return '';

    /*
     * Common dashboard structure:
     *
     * field wrapper
     *   label
     *   value
     */
    var wrapper = labelNode.parentElement;

    if (wrapper) {
      var wrapperLeaves = pmdV32LeafTextNodes(wrapper);
      var labelIndex = wrapperLeaves.indexOf(labelNode);

      for (
        var index = labelIndex + 1;
        index < wrapperLeaves.length;
        index += 1
      ) {
        var value = clean(wrapperLeaves[index].textContent);

        if (
          value &&
          !labelPattern.test(value) &&
          !/^(edit|complete|pending|active)$/i.test(value)
        ) {
          return value;
        }
      }
    }

    /*
     * Fallback: inspect following visible siblings.
     */
    var node = labelNode.nextElementSibling;

    while (node) {
      var siblingValue = clean(node.textContent);

      if (siblingValue && !labelPattern.test(siblingValue))
        return siblingValue;

      node = node.nextElementSibling;
    }

    return '';
  }

  function pmdV32CleanTableValue(value) {
    var text = clean(value);

    if (
      !text ||
      /incomplete/i.test(text)
    ) {
      return 'Incomplete';
    }

    /*
     * Reject the concatenated full-card text that the old
     * regular expression accidentally captured.
     */
    if (
      text.length > 40 ||
      /reservations|complete|guest\(s\)|name|status|default/i.test(text)
    ) {
      var numberMatch = text.match(
        /(?:table\s*)?(\d{1,4})\b/i
      );

      return numberMatch
        ? 'Table ' + numberMatch[1]
        : 'Incomplete';
    }

    var numericMatch = text.match(/^\s*(?:table\s*)?(\d+)\s*$/i);

    return numericMatch
      ? 'Table ' + numericMatch[1]
      : text;
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
    var editLinks = Array.prototype.slice.call(
      document.querySelectorAll(
        'a[href*="/admin/reservations/edit/"],' +
        'a[href*="/reservations/edit/"]'
      )
    );

    var results = [];
    var seen = new Set();

    editLinks.forEach(function (editLink, index) {
      var node = editLink;
      var card = null;

      /*
       * Find the smallest ancestor containing all reservation
       * labels. This avoids selecting the whole dashboard.
       */
      for (
        var depth = 0;
        node && depth < 14;
        depth += 1
      ) {
        var text = clean(node.textContent);

        if (
          /\bID\b/i.test(text) &&
          /\bNAME\b/i.test(text) &&
          /GUEST(?:\(S\)|S)?/i.test(text) &&
          /\bTABLE\b/i.test(text) &&
          /\bSTATUS\b/i.test(text)
        ) {
          card = node;
          break;
        }

        node = node.parentElement;
      }

      if (!card)
        return;

      var href =
        editLink.getAttribute('href') ||
        editLink.href ||
        '';

      var hrefIdMatch =
        href.match(/\/reservations\/edit\/(\d+)/i);

      var idValue =
        pmdV32FieldValue(card, /^ID$/i);

      var id =
        hrefIdMatch
          ? hrefIdMatch[1]
          : clean(idValue).match(/\d+/)
            ? clean(idValue).match(/\d+/)[0]
            : String(index + 1);

      if (seen.has(id))
        return;

      seen.add(id);

      var name =
        pmdV32FieldValue(card, /^NAME$/i);

      var guestsValue =
        pmdV32FieldValue(
          card,
          /^GUEST(?:\(S\)|S)?$/i
        );

      var tableValue =
        pmdV32FieldValue(card, /^TABLE$/i);

      var statusField =
        pmdV32FieldValue(card, /^STATUS$/i);

      var fullText = clean(card.textContent);

      var badge = Array.prototype.find.call(
        card.querySelectorAll(
          '.badge,' +
          '[class*="badge"],' +
          '[class*="status"],' +
          '[class*="pill"]'
        ),
        function (candidate) {
          return /complete|pending|active|confirmed|cancelled|seated/i.test(
            clean(candidate.textContent)
          );
        }
      );

      var status =
        clean(badge && badge.textContent) ||
        (
          /complete/i.test(fullText)
            ? 'Complete'
            : /active/i.test(fullText)
              ? 'Active'
              : /pending/i.test(fullText)
                ? 'Pending'
                : 'Reservation'
        );

      var table =
        pmdV32CleanTableValue(tableValue);

      var tableNumberMatch =
        table.match(/\d+/);

      var time =
        clean(statusField).match(
          /\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:am|pm)?\b/i
        );

      if (!time) {
        time = fullText.match(
          /\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:am|pm)?\b/i
        );
      }

      results.push({
        id: id,

        name:
          name &&
          !/^guest(?:\(s\)|s)?$/i.test(name)
            ? name
            : 'Reservation ' + id,

        guests:
          Math.max(
            1,
            numberFromText(guestsValue, 1)
          ),

        table: table,

        tableNumber:
          tableNumberMatch
            ? tableNumberMatch[0]
            : '',

        status: status,

        time:
          time
            ? clean(
                Array.isArray(time)
                  ? time[0]
                  : time
              )
            : '--:--',

        editUrl:
          editLink.href ||
          '/admin/reservations/edit/' + id,

        sourceElement: card
      });
    });

    console.info(
      '[PMD Reservations V3.2] Reservation extraction completed',
      {
        editLinks: editLinks.length,
        reservations: results.length,
        rows: results.map(function (row) {
          return {
            id: row.id,
            name: row.name,
            guests: row.guests,
            table: row.table,
            time: row.time,
            status: row.status
          };
        })
      }
    );

    return results;
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

    /*
     * V3.2 finishing layer.
     */
    pmdV32FixIcons(workspace);
    pmdV32WaitForSharedFloor(workspace, 0);

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

  function pmdV32ReservationForFloorNumber(number) {
    return state.reservations.filter(function (reservation) {
      return (
        reservation.tableNumber &&
        String(reservation.tableNumber) === String(number)
      );
    });
  }

  function pmdV32Svg(name) {
    var icons = {
      refresh:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7"/>' +
        '</svg>',

      calendar:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="3" y="5" width="18" height="16" rx="2"/>' +
        '<path d="M16 3v4M8 3v4M3 10h18"/>' +
        '</svg>',

      users:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>' +
        '<circle cx="9" cy="7" r="4"/>' +
        '<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' +
        '</svg>',

      table:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="4" y="5" width="16" height="14" rx="2"/>' +
        '<path d="M8 5v14M16 5v14M4 10h16M4 14h16"/>' +
        '</svg>',

      active:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9"/>' +
        '<circle cx="12" cy="12" r="4"/>' +
        '</svg>',

      plus:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 5v14M5 12h14"/>' +
        '</svg>',

      left:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="m15 18-6-6 6-6"/>' +
        '</svg>',

      right:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="m9 18 6-6-6-6"/>' +
        '</svg>'
    };

    return icons[name] || '';
  }

  function pmdV32FixIcons(workspace) {
    var refresh = workspace.querySelector(
      '[data-rv3-refresh]'
    );

    if (refresh) {
      refresh.innerHTML =
        pmdV32Svg('refresh') +
        '<span>Refresh</span>';
    }

    var newReservation = workspace.querySelector(
      '.pmd-res-v3-header-actions a'
    );

    if (newReservation) {
      newReservation.innerHTML =
        pmdV32Svg('plus') +
        '<span>New reservation</span>';
    }

    var previous =
      workspace.querySelector('[data-rv3-prev]');

    var next =
      workspace.querySelector('[data-rv3-next]');

    if (previous) {
      previous.innerHTML =
        pmdV32Svg('left');

      previous.setAttribute(
        'aria-label',
        'Previous reservation'
      );
    }

    if (next) {
      next.innerHTML =
        pmdV32Svg('right');

      next.setAttribute(
        'aria-label',
        'Next reservation'
      );
    }

    var icons = workspace.querySelectorAll(
      '.pmd-res-v3-kpi-icon'
    );

    var iconNames = [
      'calendar',
      'users',
      'active',
      'table'
    ];

    Array.prototype.forEach.call(
      icons,
      function (node, index) {
        node.innerHTML =
          pmdV32Svg(
            iconNames[index] || 'calendar'
          );
      }
    );
  }

  function pmdV32CreateTablePanel(sharedFloor) {
    var previous =
      sharedFloor.querySelector(
        '.pmd-res-v32-table-panel'
      );

    if (previous)
      previous.remove();

    var panel = document.createElement('aside');
    panel.className = 'pmd-res-v32-table-panel';
    panel.hidden = true;

    sharedFloor.appendChild(panel);

    return panel;
  }

  function pmdV32ShowTablePanel(
    sharedFloor,
    tableElement
  ) {
    var panel =
      sharedFloor.querySelector(
        '.pmd-res-v32-table-panel'
      ) ||
      pmdV32CreateTablePanel(sharedFloor);

    var tableId =
      tableElement.dataset.id || '';

    var tableNumber =
      tableElement.dataset.no ||
      clean(tableElement.textContent).match(/\d+/)?.[0] ||
      tableId;

    var reservations =
      pmdV32ReservationForFloorNumber(
        tableNumber
      );

    state.selectedTable = String(tableId);

    sharedFloor
      .querySelectorAll(
        '.pmd-owner-floor-v60__table.is-reservation-selected'
      )
      .forEach(function (node) {
        node.classList.remove(
          'is-reservation-selected'
        );
      });

    tableElement.classList.add(
      'is-reservation-selected'
    );

    var reservationRows = reservations.length
      ? reservations.map(function (reservation) {
          return [
            '<a class="pmd-res-v32-table-reservation" href="',
            escapeHtml(reservation.editUrl),
            '">',

              '<span>',
                '<strong>',
                escapeHtml(reservation.name),
                '</strong>',

                '<small>',
                escapeHtml(reservation.time),
                ' · ',
                escapeHtml(reservation.guests),
                ' guest',
                Number(reservation.guests) === 1
                  ? ''
                  : 's',
                '</small>',
              '</span>',

              '<b>',
              escapeHtml(reservation.status),
              '</b>',

            '</a>'
          ].join('');
        }).join('')
      : (
          '<div class="pmd-res-v32-no-reservation">' +
          'No reservation currently assigned to this table.' +
          '</div>'
        );

    var createUrl =
      '/admin/reservations/create' +
      '?table_id=' +
      encodeURIComponent(tableId) +
      '&table=' +
      encodeURIComponent(tableNumber) +
      '&reserve_date=' +
      encodeURIComponent(
        new Date().toISOString().slice(0, 10)
      );

    panel.hidden = false;

    panel.innerHTML = [
      '<div class="pmd-res-v32-table-panel-head">',
        '<div>',
          '<small>Selected table</small>',
          '<strong>Table ',
          escapeHtml(tableNumber),
          '</strong>',
        '</div>',

        '<button ',
          'type="button" ',
          'data-rv32-close-table-panel ',
          'aria-label="Close table details"',
        '>×</button>',
      '</div>',

      '<div class="pmd-res-v32-table-panel-body">',
        reservationRows,
      '</div>',

      '<a class="pmd-res-v32-create-for-table" href="',
      createUrl,
      '">',
        pmdV32Svg('plus'),
        '<span>Create reservation for Table ',
        escapeHtml(tableNumber),
        '</span>',
      '</a>'
    ].join('');
  }

  function pmdV32MakeFloorReservationSafe(sharedFloor) {
    if (
      !sharedFloor ||
      sharedFloor.dataset.pmdReservationSafe === '1'
    ) {
      return;
    }

    sharedFloor.dataset.pmdReservationSafe = '1';

    /*
     * Reservation users consume the exact same Floor component,
     * but do not edit layout from this page.
     *
     * Dashboard remains the single layout editing location.
     */
    sharedFloor
      .querySelectorAll(
        '.pmd-owner-floor-v60__edit,' +
        '.pmd-owner-floor-v60__save,' +
        '.pmd-owner-floor-v60__cancel,' +
        '.pmd-owner-floor-v60__toggle'
      )
      .forEach(function (button) {
        button.remove();
      });

    var title =
      sharedFloor.querySelector(
        '.pmd-owner-floor-v60__title span'
      );

    if (title)
      title.textContent = 'Restaurant Floor';

    pmdV32CreateTablePanel(sharedFloor);

    /*
     * Capture phase is intentional:
     * prevent any older waiter/order click handlers from firing.
     */
    sharedFloor.addEventListener(
      'click',
      function (event) {
        var closeButton =
          event.target.closest(
            '[data-rv32-close-table-panel]'
          );

        if (closeButton) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          var panel =
            sharedFloor.querySelector(
              '.pmd-res-v32-table-panel'
            );

          if (panel)
            panel.hidden = true;

          sharedFloor
            .querySelectorAll(
              '.pmd-owner-floor-v60__table.is-reservation-selected'
            )
            .forEach(function (node) {
              node.classList.remove(
                'is-reservation-selected'
              );
            });

          return;
        }

        var table =
          event.target.closest(
            '.pmd-owner-floor-v60__table'
          );

        if (!table)
          return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        pmdV32ShowTablePanel(
          sharedFloor,
          table
        );
      },
      true
    );

    /*
     * Also block pointer/mouse events from reaching any ordering
     * layer while preserving the reservation selection click.
     */
    [
      'dblclick',
      'auxclick',
      'contextmenu'
    ].forEach(function (type) {
      sharedFloor.addEventListener(
        type,
        function (event) {
          if (
            event.target.closest(
              '.pmd-owner-floor-v60__table'
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
          }
        },
        true
      );
    });
  }

  function pmdV35FindLargestFinalFloor(frameDocument) {
    if (!frameDocument)
      return null;

    var candidates = Array.prototype.slice.call(
      frameDocument.querySelectorAll(
        '.pmd-w5-floor-map-real'
      )
    );

    var ranked = candidates.map(function (map, index) {
      var tables = map.querySelectorAll(
        '.pmd-w5-table[data-table]'
      );

      var rect = map.getBoundingClientRect();

      var finalFloor =
        map.getAttribute(
          'data-pmd-v159-full-floor'
        ) === '1';

      var layoutAuthority =
        map.getAttribute(
          'data-pmd-v160-layout-authority'
        ) === '1';

      var visible =
        rect.width > 100 &&
        rect.height > 100 &&
        getComputedStyle(map).display !== 'none' &&
        getComputedStyle(map).visibility !== 'hidden';

      /*
       * Number of real tables is the strongest signal.
       * Final/layout/visible status only helps break ties.
       */
      var score =
        tables.length * 1000 +
        (finalFloor ? 100 : 0) +
        (layoutAuthority ? 50 : 0) +
        (visible ? 10 : 0);

      return {
        map: map,
        index: index,
        tableCount: tables.length,
        finalFloor: finalFloor,
        layoutAuthority: layoutAuthority,
        visible: visible,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        score: score
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    console.info(
      '[PMD Reservations V3.5] Dashboard2 floor candidates',
      ranked.map(function (candidate) {
        return {
          index: candidate.index,
          tableCount: candidate.tableCount,
          finalFloor: candidate.finalFloor,
          layoutAuthority: candidate.layoutAuthority,
          visible: candidate.visible,
          width: candidate.width,
          height: candidate.height,
          score: candidate.score
        };
      })
    );

    return ranked.length
      ? ranked[0].map
      : null;
  }

  function pmdV33CopyWaiterFloorStyles(frameDocument) {
    var links = Array.prototype.slice.call(
      frameDocument.querySelectorAll(
        'link[rel="stylesheet"][href]'
      )
    );

    links.forEach(function (link) {
      var href = link.href || '';

      if (
        !/pmd-waiter|waiter-floor|waiter-dashboard|table-state/i.test(href)
      ) {
        return;
      }

      var alreadyLoaded =
        Array.prototype.some.call(
          document.querySelectorAll(
            'link[rel="stylesheet"][href]'
          ),
          function (current) {
            return current.href === href;
          }
        );

      if (alreadyLoaded)
        return;

      var copy = document.createElement('link');
      copy.rel = 'stylesheet';
      copy.href = href;
      copy.setAttribute(
        'data-pmd-res-v33-waiter-style',
        '1'
      );

      document.head.appendChild(copy);
    });
  }

  function pmdV33ReservationForTableNumber(number) {
    return state.reservations.filter(function (reservation) {
      return (
        reservation.tableNumber &&
        String(reservation.tableNumber) ===
        String(number)
      );
    });
  }

  function pmdV33ShowReservationTablePanel(
    holder,
    tableElement
  ) {
    var tableNumber = clean(
      tableElement.getAttribute('data-table') ||
      tableElement.dataset.table ||
      tableElement.textContent
    ).replace(/^table\s*/i, '');

    var numberMatch = tableNumber.match(/\d+/);

    if (numberMatch)
      tableNumber = numberMatch[0];

    var reservations =
      pmdV33ReservationForTableNumber(
        tableNumber
      );

    holder
      .querySelectorAll(
        '.pmd-w5-table.is-reservation-selected'
      )
      .forEach(function (node) {
        node.classList.remove(
          'is-reservation-selected'
        );
      });

    tableElement.classList.add(
      'is-reservation-selected'
    );

    var oldPanel =
      holder.querySelector(
        '.pmd-res-v33-table-panel'
      );

    if (oldPanel)
      oldPanel.remove();

    var panel = document.createElement('aside');
    panel.className = 'pmd-res-v33-table-panel';

    var reservationHtml = reservations.length
      ? reservations.map(function (reservation) {
          return [
            '<a class="pmd-res-v33-reservation-row" href="',
            escapeHtml(reservation.editUrl),
            '">',

              '<span>',
                '<strong>',
                escapeHtml(reservation.name),
                '</strong>',

                '<small>',
                escapeHtml(reservation.time),
                ' · ',
                escapeHtml(reservation.guests),
                ' guest',
                Number(reservation.guests) === 1
                  ? ''
                  : 's',
                '</small>',
              '</span>',

              '<b>',
              escapeHtml(reservation.status),
              '</b>',

            '</a>'
          ].join('');
        }).join('')
      : (
          '<div class="pmd-res-v33-empty-table">' +
          'No reservation assigned to this table.' +
          '</div>'
        );

    var createUrl =
      '/admin/reservations/create' +
      '?table=' +
      encodeURIComponent(tableNumber) +
      '&reserve_date=' +
      encodeURIComponent(
        new Date().toISOString().slice(0, 10)
      );

    panel.innerHTML = [
      '<header>',
        '<div>',
          '<small>Selected table</small>',
          '<strong>Table ',
          escapeHtml(tableNumber),
          '</strong>',
        '</div>',

        '<button type="button" data-rv33-close>×</button>',
      '</header>',

      '<div class="pmd-res-v33-table-body">',
      reservationHtml,
      '</div>',

      '<a class="pmd-res-v33-create" href="',
      createUrl,
      '">',
        pmdV32Svg('plus'),
        '<span>Create reservation for Table ',
        escapeHtml(tableNumber),
        '</span>',
      '</a>'
    ].join('');

    holder.appendChild(panel);
  }

  function pmdV33SanitizeWaiterFloor(clone) {
    /*
     * cloneNode does not copy JavaScript event listeners.
     * Remove URLs and ordering-related controls as an additional guard.
     */
    clone
      .querySelectorAll(
        'a,' +
        '[data-w19-edit],' +
        '[data-w19-save],' +
        '[data-w19-compact],' +
        '.pmd-w19-tools,' +
        '.pmd-v191-floor-control-dock,' +
        '.pmd-v191-control-reserve,' +
        '[data-pmd-v191-control-dock],' +
        '[data-pmd-v191-control-reserve],' +
        '[data-w19-edit],' +
        '[data-w19-save],' +
        '[data-w19-merge],' +
        '[data-w19-compact],' +
        '.pmd-v155-table-actions,' +
        '.pmd-w5-selected-note,' +
        '.pmd-v61-map-info-btn,' +
        '.pmd-v61-map-legend'
      )
      .forEach(function (node) {
        node.remove();
      });

    clone
      .querySelectorAll(
        '.pmd-w5-floor-map-real > div'
      )
      .forEach(function (node) {
        if (
          /no tables found in ti_tables/i.test(
            clean(node.textContent)
          )
        ) {
          node.remove();
        }
      });

    clone
      .querySelectorAll(
        '.pmd-w5-table[data-table]'
      )
      .forEach(function (table) {
        table.type = 'button';

        table.removeAttribute('onclick');
        table.removeAttribute('formaction');
        table.removeAttribute('href');

        table
          .querySelectorAll(
            'a,button,input,select,textarea'
          )
          .forEach(function (control) {
            if (control !== table)
              control.remove();
          });

        table.setAttribute(
          'data-pmd-reservation-only',
          '1'
        );
      });

    clone.classList.remove(
      'pmd-v40-compact-authority'
    );

    clone.removeAttribute(
      'data-pmd-v153-save-shield'
    );
  }

  function pmdV33MountWaiterFloor(
    workspace,
    frameDocument
  ) {
    var sourceMap =
      pmdV35FindLargestFinalFloor(
        frameDocument
      );

    if (!sourceMap)
      return false;

    var targetPanel =
      workspace.querySelector(
        '.pmd-res-v3-floor-panel'
      );

    if (!targetPanel)
      return false;

    pmdV33CopyWaiterFloorStyles(
      frameDocument
    );

    var clone =
      sourceMap.cloneNode(true);

    pmdV33SanitizeWaiterFloor(clone);

    var holder =
      document.createElement('section');

    holder.className =
      'pmd-res-v33-exact-waiter-floor';

    holder.innerHTML = [
      '<header class="pmd-res-v33-floor-head">',
        '<div>',
          '<strong>Restaurant Floor</strong>',
          '<span>Click a table to view or create reservations</span>',
        '</div>',

        '<button type="button" data-rv33-reload-floor>',
          pmdV32Svg('refresh'),
          '<span>Reload floor</span>',
        '</button>',
      '</header>',

      '<div class="pmd-res-v33-floor-viewport"></div>'
    ].join('');

    var viewport =
      holder.querySelector(
        '.pmd-res-v33-floor-viewport'
      );

    viewport.appendChild(clone);

    targetPanel.innerHTML = '';
    targetPanel.appendChild(holder);

    /*
     * Capture-phase protection:
     * no table click can reach any ordering/navigation handler.
     */
    holder.addEventListener(
      'click',
      function (event) {
        var reload =
          event.target.closest(
            '[data-rv33-reload-floor]'
          );

        if (reload) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          pmdV33ReloadExactFloor(
            workspace
          );

          return;
        }

        var close =
          event.target.closest(
            '[data-rv33-close]'
          );

        if (close) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          var panel =
            holder.querySelector(
              '.pmd-res-v33-table-panel'
            );

          if (panel)
            panel.remove();

          holder
            .querySelectorAll(
              '.pmd-w5-table.is-reservation-selected'
            )
            .forEach(function (node) {
              node.classList.remove(
                'is-reservation-selected'
              );
            });

          return;
        }

        var table =
          event.target.closest(
            '.pmd-w5-table[data-table]'
          );

        if (!table)
          return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        pmdV33ShowReservationTablePanel(
          holder,
          table
        );
      },
      true
    );

    [
      'dblclick',
      'auxclick',
      'contextmenu',
      'submit'
    ].forEach(function (type) {
      holder.addEventListener(
        type,
        function (event) {
          if (
            event.target.closest(
              '.pmd-w5-table[data-table]'
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
          }
        },
        true
      );
    });

    console.info(
      '[PMD Reservations V3.5] Largest Dashboard2 floor mounted',
      {
        source: '/admin/dashboard2',
        mapClass: 'pmd-w5-floor-map-real',
        finalFloor:
          clone.getAttribute(
            'data-pmd-v159-full-floor'
          ),
        layoutAuthority:
          clone.getAttribute(
            'data-pmd-v160-layout-authority'
          ),
        tables:
          clone.querySelectorAll(
            '.pmd-w5-table[data-table]'
          ).length,
        tableNumbers:
          Array.prototype.map.call(
            clone.querySelectorAll(
              '.pmd-w5-table[data-table]'
            ),
            function (table) {
              return table.getAttribute(
                'data-table'
              );
            }
          ),
        orderingNavigationBlocked: true
      }
    );

    return true;
  }

  function pmdV33LoadExactFloor(
    workspace,
    attempt
  ) {
    attempt = attempt || 0;

    var oldFrame =
      document.getElementById(
        'pmd-res-v33-floor-source'
      );

    if (oldFrame)
      oldFrame.remove();

    var frame =
      document.createElement('iframe');

    frame.id =
      'pmd-res-v33-floor-source';

    frame.src =
      '/admin/dashboard2' +
      '?reservationFloorSource=' +
      Date.now();

    frame.setAttribute(
      'aria-hidden',
      'true'
    );

    frame.style.cssText =
      'position:fixed;' +
      'width:1px;' +
      'height:1px;' +
      'left:-10000px;' +
      'top:-10000px;' +
      'visibility:hidden;' +
      'pointer-events:none;';

    document.body.appendChild(frame);

    frame.addEventListener(
      'load',
      function () {
        var checks = 0;

        var timer = setInterval(
          function () {
            checks += 1;

            try {
              var frameDocument =
                frame.contentDocument;

              var map =
                frameDocument
                  ? pmdV35FindLargestFinalFloor(
                      frameDocument
                    )
                  : null;

              var tableCount =
                map
                  ? map.querySelectorAll(
                      '.pmd-w5-table[data-table]'
                    ).length
                  : 0;

              /*
               * Dashboard2 may briefly render an older/partial map.
               * Wait for the final full-floor renderer and several
               * real tables before cloning it.
               */
              var isFinalFloor =
                map &&
                map.getAttribute(
                  'data-pmd-v159-full-floor'
                ) === '1';

              var hasLayoutAuthority =
                map &&
                (
                  map.getAttribute(
                    'data-pmd-v160-layout-authority'
                  ) === '1' ||
                  tableCount >= 5
                );

              /*
               * The Dashboard2 floor is rendered progressively.
               * Wait until its table count remains unchanged for
               * several checks before cloning it.
               */
              frame.__pmdLastTableCount =
                frame.__pmdLastTableCount || 0;

              frame.__pmdStableChecks =
                frame.__pmdStableChecks || 0;

              if (
                tableCount > 0 &&
                tableCount === frame.__pmdLastTableCount
              ) {
                frame.__pmdStableChecks += 1;
              }
              else {
                frame.__pmdStableChecks = 0;
              }

              frame.__pmdLastTableCount =
                tableCount;

              if (
                map &&
                tableCount >= 5 &&
                frame.__pmdStableChecks >= 5
              ) {
                clearInterval(timer);

                pmdV33MountWaiterFloor(
                  workspace,
                  frameDocument
                );

                frame.remove();
                return;
              }
            }
            catch (error) {
              clearInterval(timer);

              console.error(
                '[PMD Reservations V3.4] ' +
                'Could not read waiter floor iframe',
                error
              );

              frame.remove();
              return;
            }

            if (checks >= 100) {
              clearInterval(timer);

              console.warn(
                '[PMD Reservations V3.4] ' +
                'Waiter floor did not become ready.'
              );

              frame.remove();
            }
          },
          120
        );
      }
    );
  }

  function pmdV33ReloadExactFloor(
    workspace
  ) {
    pmdV33LoadExactFloor(
      workspace,
      0
    );
  }

  function pmdV32AdoptSharedFloor(workspace) {
    /*
     * V3.3 replaces the wrong Owner Dashboard compact floor
     * with the exact /admin/dashboardwaiter floor.
     */
    pmdV33LoadExactFloor(
      workspace,
      0
    );

    return true;
  }

  function pmdV32WaitForSharedFloor(
    workspace,
    attempt
  ) {
    attempt = attempt || 0;

    if (pmdV32AdoptSharedFloor(workspace))
      return;

    if (attempt >= 80) {
      console.warn(
        '[PMD Reservations V3.2] Shared floor did not mount; ' +
        'keeping the local fallback floor.'
      );
      return;
    }

    setTimeout(function () {
      pmdV32WaitForSharedFloor(
        workspace,
        attempt + 1
      );
    }, 125);
  }

  function renderAll() {
    renderReservations();

    /*
     * Keep fallback floor available until the shared Dashboard
     * floor mounts. Once mounted, it replaces this local floor.
     */
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
      setTimeout(resolve, 900);
    });

    var reservations = extractReservationCards();

    /*
     * V3.1:
     * Build the workspace even when the selected date contains
     * no reservations. The Floor Plan must remain available.
     */
    state.reservations = reservations;

    if (!reservations.length) {
      console.info(
        '[PMD Reservations V3.1] No reservation cards found; ' +
        'continuing with an empty carousel and live floor map.'
      );
    }

    await loadFloorTables();

    buildWorkspace();

    if (state.reservations.length) {
      selectReservation(state.reservations[0]);
    }

    state.installing = false;

    console.info(
      '[PMD] Reservation Layout V3.5 active',
      {
        reservations: state.reservations.length,
        tables: state.tables.length,
        areas: state.areas.length
      }
    );
  }

  window.PMDReservationLayoutV3 = {
    version: '3.5.0',
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
