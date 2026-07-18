(function () {
  'use strict';

  if (!/^\/admin\/reservations\/?$/.test(location.pathname)) return;
  if (window.PMDReservationWorkspaceV1) return;

  var state = {
    reservations: [],
    tables: [],
    areas: [],
    area: 'all',
    query: '',
    selectedReservation: null,
    selectedTable: null
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

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function sampleReservations() {
    return [
      {
        id: 'preview-1',
        group: 'upcoming',
        time: '18:30',
        name: 'Daniel Schneider',
        guests: 4,
        table: '12',
        area: 'Inside',
        note: 'Window seat',
        status: 'confirmed',
        tags: ['Confirmed']
      },
      {
        id: 'preview-2',
        group: 'upcoming',
        time: '19:00',
        name: 'Sophia Martinez',
        guests: 2,
        table: '8',
        area: 'Terrace',
        note: 'Birthday',
        status: 'confirmed',
        tags: ['Birthday', 'VIP']
      },
      {
        id: 'preview-3',
        group: 'upcoming',
        time: '19:30',
        name: 'Alexander Weber',
        guests: 6,
        table: '17',
        area: 'Inside',
        note: 'High chair',
        status: 'confirmed',
        tags: ['Note']
      },
      {
        id: 'preview-4',
        group: 'seated',
        time: '18:00',
        name: 'Emma Fischer',
        guests: 4,
        table: '11',
        area: 'Inside',
        note: '',
        status: 'seated',
        tags: ['Seated']
      },
      {
        id: 'preview-5',
        group: 'seated',
        time: '18:15',
        name: 'Lukas Hoffmann',
        guests: 3,
        table: '14',
        area: 'Terrace',
        note: '',
        status: 'seated',
        tags: ['Seated']
      }
    ];
  }

  function extractExistingReservations() {
    var rows = Array.prototype.slice.call(
      document.querySelectorAll(
        '.list-table tbody tr,' +
        '[data-reservation-id],' +
        '.reservation-card,' +
        '.reservation-item'
      )
    );

    var reservations = rows.map(function (row, index) {
      var text = clean(row.textContent);
      if (!text || /no reservations/i.test(text)) return null;

      var timeMatch = text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
      var guestMatch = text.match(/(?:guest|covers?|people)\D*(\d+)/i);
      var tableMatch = text.match(/table\D*(\d+)/i);

      var nameNode = row.querySelector(
        '[data-name], .name, .reservation-name, strong, td:nth-child(2)'
      );

      return {
        id:
          row.getAttribute('data-reservation-id') ||
          'existing-' + index,
        group: /seated/i.test(text) ? 'seated' : 'upcoming',
        time: timeMatch ? timeMatch[0] : '--:--',
        name: clean(nameNode && nameNode.textContent) || 'Reservation',
        guests: guestMatch ? Number(guestMatch[1]) : 2,
        table: tableMatch ? tableMatch[1] : '',
        area: '',
        note: '',
        status: /seated/i.test(text) ? 'seated' : 'confirmed',
        tags: /vip/i.test(text) ? ['VIP'] : []
      };
    }).filter(Boolean);

    return reservations;
  }

  async function loadTables() {
    var urls = [
      '/admin/pmd-waiter-dashboard-v9-tenant-data',
      '/admin/pmd-waiter-dashboard-v2-data',
      '/admin/pmd-waiter-dashboard-v9-data'
    ];

    for (var index = 0; index < urls.length; index += 1) {
      try {
        var response = await fetch(
          urls[index] + '?reservationWorkspace=' + Date.now(),
          {
            credentials: 'same-origin',
            headers: {
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            cache: 'no-store'
          }
        );

        if (!response.ok) continue;

        var payload = await response.json();

        var tables =
          payload.tables ||
          (payload.data && payload.data.tables) ||
          (payload.payload && payload.payload.tables) ||
          [];

        if (Array.isArray(tables) && tables.length) {
          state.tables = tables.map(function (table, index) {
            var number =
              table.table_name ||
              table.name ||
              table.table_number ||
              table.number ||
              table.id ||
              index + 1;

            var area =
              table.area_name ||
              table.area ||
              table.location_name ||
              'Main dining';

            var statusText = clean(
              table.status ||
              table.service_status ||
              table.state ||
              ''
            ).toLowerCase();

            var orderTotal = Number(
              table.amount_due ||
              table.balance_due ||
              table.order_total ||
              0
            );

            return {
              id: String(table.id || table.table_id || index + 1),
              number: String(number).replace(/^table\s*/i, ''),
              area: clean(area) || 'Main dining',
              capacity: Number(
                table.capacity ||
                table.table_capacity ||
                table.max_guests ||
                4
              ),
              shape: index % 3 === 0 ? 'square' : 'round',
              status:
                orderTotal > 0
                  ? 'due'
                  : /seated|occupied|open|kitchen|served/.test(statusText)
                    ? 'seated'
                    : /reserved/.test(statusText)
                      ? 'reserved'
                      : 'free',
              x: Number(table.x || table.position_x || 0),
              y: Number(table.y || table.position_y || 0)
            };
          });

          return;
        }
      } catch (error) {
        console.warn('[PMD Reservations] table endpoint failed', urls[index], error);
      }
    }

    state.tables = Array.from({ length: 18 }, function (_, index) {
      return {
        id: String(index + 1),
        number: String(index + 1),
        area: index > 11 ? 'Terrace' : 'Main dining',
        capacity: [2, 4, 4, 6][index % 4],
        shape: index % 3 === 0 ? 'square' : 'round',
        status: index === 3 || index === 8
          ? 'reserved'
          : index === 10 || index === 13
            ? 'seated'
            : index === 16
              ? 'due'
              : 'free',
        x: 0,
        y: 0
      };
    });
  }

  function buildWorkspace() {
    var existing = document.getElementById('pmd-reservation-workspace');
    if (existing) existing.remove();

    var workspace = document.createElement('section');
    workspace.id = 'pmd-reservation-workspace';

    workspace.innerHTML = [
      '<header class="pmd-res-topbar">',
        '<div class="pmd-res-heading">',
          '<strong>Reservations & Floor</strong>',
          '<span>Manage bookings, walk-ins and table assignments</span>',
        '</div>',
        '<div class="pmd-res-date-nav">',
          '<button class="pmd-res-button" data-res-date-prev>‹</button>',
          '<div class="pmd-res-date-label" data-res-date-label></div>',
          '<button class="pmd-res-button" data-res-date-next>›</button>',
          '<button class="pmd-res-button" data-res-today>Today</button>',
        '</div>',
        '<div class="pmd-res-top-actions">',
          '<button class="pmd-res-button" data-res-refresh>Refresh</button>',
          '<button class="pmd-res-button is-primary" data-res-new>+ New reservation</button>',
        '</div>',
      '</header>',

      '<div class="pmd-res-body">',
        '<aside class="pmd-res-list-panel">',
          '<nav class="pmd-res-tabs">',
            '<button class="pmd-res-tab is-active" data-res-tab="reservations">Reservations</button>',
            '<button class="pmd-res-tab" data-res-tab="waitlist">Waitlist</button>',
            '<button class="pmd-res-tab" data-res-tab="servers">Servers</button>',
          '</nav>',

          '<div class="pmd-res-tools">',
            '<input class="pmd-res-search" data-res-search placeholder="Search guest, table or note…">',
            '<button class="pmd-res-button" data-res-filter>Filter</button>',
          '</div>',

          '<div class="pmd-res-scroll" data-res-list></div>',

          '<div class="pmd-res-walkin">',
            '<button class="pmd-res-button is-primary" data-res-walkin>Add walk-in</button>',
            '<button class="pmd-res-button" data-res-waitlist>Add to waitlist</button>',
          '</div>',
        '</aside>',

        '<main class="pmd-res-map-panel">',
          '<div class="pmd-res-map-toolbar" data-res-areas></div>',
          '<div class="pmd-res-map">',
            '<div class="pmd-res-map-canvas" data-res-map></div>',
          '</div>',
        '</main>',
      '</div>'
    ].join('');

    document.body.appendChild(workspace);
    document.body.classList.add('pmd-reservation-workspace-active');

    bindEvents(workspace);
    renderAll();
  }

  function renderAll() {
    renderDate();
    renderReservations();
    renderAreas();
    renderMap();
  }

  function renderDate() {
    var label = document.querySelector('[data-res-date-label]');
    if (!label) return;

    label.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    }).format(new Date());
  }

  function filteredReservations() {
    var query = state.query.toLowerCase();

    return state.reservations.filter(function (reservation) {
      if (!query) return true;

      return [
        reservation.name,
        reservation.table,
        reservation.area,
        reservation.note,
        reservation.time
      ].join(' ').toLowerCase().includes(query);
    });
  }

  function reservationCard(reservation) {
    var badges = (reservation.tags || []).map(function (tag) {
      var lower = tag.toLowerCase();
      var modifier =
        lower.includes('birthday')
          ? ' is-birthday'
          : lower.includes('vip')
            ? ' is-vip'
            : lower.includes('note')
              ? ' is-note'
              : '';

      return (
        '<span class="pmd-res-badge' + modifier + '">' +
        escapeHtml(tag) +
        '</span>'
      );
    }).join('');

    return [
      '<button class="pmd-res-card',
      state.selectedReservation === reservation.id ? ' is-selected' : '',
      '" data-reservation-card="', escapeHtml(reservation.id), '">',
        '<div class="pmd-res-time">',
          escapeHtml(reservation.time),
          '<small>', reservation.group === 'seated' ? 'SEATED' : 'BOOKED', '</small>',
        '</div>',
        '<div class="pmd-res-card-main">',
          '<div class="pmd-res-guest-name">', escapeHtml(reservation.name), '</div>',
          '<div class="pmd-res-meta">',
            '<span>👥 ', escapeHtml(reservation.guests), '</span>',
            '<span>▦ Table ', escapeHtml(reservation.table || 'TBD'), '</span>',
            reservation.area
              ? '<span>⌖ ' + escapeHtml(reservation.area) + '</span>'
              : '',
          '</div>',
          reservation.note
            ? '<div class="pmd-res-meta"><span>📝 ' +
              escapeHtml(reservation.note) +
              '</span></div>'
            : '',
          '<div class="pmd-res-badges">', badges, '</div>',
        '</div>',
        '<div>',
          '<button class="pmd-res-status',
          reservation.status === 'seated' ? ' is-seated' : '',
          '" type="button">',
          reservation.status === 'seated' ? '●' : '↪',
          '</button>',
        '</div>',
      '</button>'
    ].join('');
  }

  function renderReservations() {
    var container = document.querySelector('[data-res-list]');
    if (!container) return;

    var reservations = filteredReservations();

    var upcoming = reservations.filter(function (item) {
      return item.group !== 'seated';
    });

    var seated = reservations.filter(function (item) {
      return item.group === 'seated';
    });

    var html = '';

    html +=
      '<div class="pmd-res-group-header">' +
      '<span>Upcoming</span><span>' + upcoming.length + '</span>' +
      '</div>';

    html += upcoming.map(reservationCard).join('');

    html +=
      '<div class="pmd-res-group-header">' +
      '<span>Seated</span><span>' + seated.length + '</span>' +
      '</div>';

    html += seated.map(reservationCard).join('');

    if (!reservations.length) {
      html +=
        '<div class="pmd-res-map-empty">' +
        'No reservations match this filter.' +
        '</div>';
    }

    container.innerHTML = html;
  }

  function renderAreas() {
    var container = document.querySelector('[data-res-areas]');
    if (!container) return;

    state.areas = unique(state.tables.map(function (table) {
      return table.area;
    }));

    var areas = ['all'].concat(state.areas);

    container.innerHTML = areas.map(function (area) {
      return (
        '<button class="pmd-res-area-button' +
        (state.area === area ? ' is-active' : '') +
        '" data-res-area="' + escapeHtml(area) + '">' +
        escapeHtml(area === 'all' ? 'All areas' : area) +
        '</button>'
      );
    }).join('');
  }

  function tablePosition(table, index, total) {
    if (table.x > 0 || table.y > 0) {
      return {
        left: Math.max(25, table.x),
        top: Math.max(25, table.y)
      };
    }

    var columns = total > 12 ? 5 : 4;
    var column = index % columns;
    var row = Math.floor(index / columns);

    return {
      left: 80 + column * 150 + (row % 2 ? 36 : 0),
      top: 70 + row * 145
    };
  }

  function assignedReservation(table) {
    return state.reservations.find(function (reservation) {
      return String(reservation.table) === String(table.number);
    });
  }

  function renderMap() {
    var container = document.querySelector('[data-res-map]');
    if (!container) return;

    var tables = state.tables.filter(function (table) {
      return state.area === 'all' || table.area === state.area;
    });

    if (!tables.length) {
      container.innerHTML =
        '<div class="pmd-res-map-empty">No tables found for this area.</div>';
      return;
    }

    container.innerHTML = tables.map(function (table, index) {
      var reservation = assignedReservation(table);
      var position = tablePosition(table, index, tables.length);

      var status = reservation
        ? reservation.status === 'seated'
          ? 'seated'
          : reservation.tags.some(function (tag) {
              return tag.toLowerCase().includes('birthday');
            })
            ? 'birthday'
            : 'reserved'
        : table.status;

      var label = reservation ? reservation.name : '';

      return [
        '<button class="pmd-res-table is-', table.shape,
        ' is-', status,
        state.selectedTable === table.id ? ' is-selected' : '',
        '" data-res-table="', escapeHtml(table.id),
        '" style="left:', position.left, 'px;top:', position.top, 'px">',
          '<span class="pmd-res-table-inner">',
            '<span class="pmd-res-table-number">', escapeHtml(table.number), '</span>',
            '<span class="pmd-res-table-capacity">', escapeHtml(table.capacity), ' seats</span>',
          '</span>',
          label
            ? '<span class="pmd-res-table-label">' +
              escapeHtml(label) +
              '</span>'
            : '',
        '</button>'
      ].join('');
    }).join('');
  }

  function bindEvents(workspace) {
    workspace.addEventListener('input', function (event) {
      if (event.target.matches('[data-res-search]')) {
        state.query = clean(event.target.value);
        renderReservations();
      }
    });

    workspace.addEventListener('click', function (event) {
      var reservationCard = event.target.closest('[data-reservation-card]');

      if (reservationCard) {
        state.selectedReservation =
          reservationCard.getAttribute('data-reservation-card');

        var reservation = state.reservations.find(function (item) {
          return item.id === state.selectedReservation;
        });

        state.selectedTable = reservation
          ? state.tables.find(function (table) {
              return String(table.number) === String(reservation.table);
            })?.id || null
          : null;

        renderReservations();
        renderMap();
        return;
      }

      var tableButton = event.target.closest('[data-res-table]');

      if (tableButton) {
        state.selectedTable = tableButton.getAttribute('data-res-table');
        renderMap();
        return;
      }

      var areaButton = event.target.closest('[data-res-area]');

      if (areaButton) {
        state.area = areaButton.getAttribute('data-res-area');
        renderAreas();
        renderMap();
        return;
      }

      if (event.target.closest('[data-res-refresh]')) {
        location.reload();
        return;
      }

      if (event.target.closest('[data-res-new]')) {
        var existingNewButton = Array.prototype.find.call(
          document.querySelectorAll('a,button'),
          function (node) {
            return node !== event.target &&
              /new reservation|create reservation|add reservation/i.test(
                clean(node.textContent)
              );
          }
        );

        if (existingNewButton) {
          existingNewButton.click();
        } else {
          alert(
            'The new reservation form will be connected to the existing reservation backend in the next step.'
          );
        }

        return;
      }

      if (event.target.closest('[data-res-walkin]')) {
        alert('Select a free table, then create or seat a walk-in guest.');
      }

      if (event.target.closest('[data-res-waitlist]')) {
        alert('Waitlist workflow will use the existing reservation backend.');
      }
    });
  }

  async function init() {
    var existingReservations = extractExistingReservations();

    state.reservations = existingReservations.length
      ? existingReservations
      : sampleReservations();

    await loadTables();
    buildWorkspace();

    console.info('[PMD] Reservation Workspace V1 active', {
      reservations: state.reservations.length,
      tables: state.tables.length,
      previewReservations: !existingReservations.length
    });
  }

  window.PMDReservationWorkspaceV1 = {
    version: '1.0.0',
    state: state,
    refresh: renderAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
