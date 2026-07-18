(function () {
  'use strict';

  var root = document.querySelector('[data-reservation-workspace]');
  if (!root) return;

  var dataNode = root.querySelector('[data-reservation-workspace-data]');
  var data = {};

  try {
    data = JSON.parse(dataNode.textContent || '{}');
  }
  catch (error) {
    console.error('[PMD Reservations] Invalid workspace data', error);
    data = {};
  }

  var state = {
    date: String(data.date || new Date().toISOString().slice(0, 10)),
    query: '',
    area: 'all',
    selectedReservation: null,
    selectedTable: null,
    tab: 'reservations'
  };

  var reservations = Array.isArray(data.reservations)
    ? data.reservations
    : [];

  var tables = Array.isArray(data.tables)
    ? data.tables
    : [];

  var areas = Array.isArray(data.areas)
    ? data.areas
    : [];

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

  function reservationMatchesDate(reservation) {
    return !reservation.date || reservation.date === state.date;
  }

  function filteredReservations() {
    var query = state.query.toLowerCase();

    return reservations.filter(function (reservation) {
      if (!reservationMatchesDate(reservation))
        return false;

      if (!query)
        return true;

      return [
        reservation.name,
        reservation.time,
        reservation.notes,
        reservation.status,
        (reservation.table_ids || []).join(' ')
      ].join(' ').toLowerCase().includes(query);
    });
  }

  function reservationTableLabels(reservation) {
    var ids = Array.isArray(reservation.table_ids)
      ? reservation.table_ids
      : [];

    return ids.map(function (id) {
      var table = tables.find(function (candidate) {
        return String(candidate.id) === String(id);
      });

      return table ? table.number : id;
    });
  }

  function renderReservationCard(reservation) {
    var tableLabels = reservationTableLabels(reservation);
    var isSelected =
      state.selectedReservation === String(reservation.id);

    var seated = reservation.group === 'seated';

    return [
      '<button type="button" class="pmd-rv2-card',
      isSelected ? ' is-selected' : '',
      seated ? ' is-seated' : '',
      '" data-rv2-reservation="',
      escapeHtml(reservation.id),
      '">',

        '<span class="pmd-rv2-time">',
          escapeHtml(reservation.time || '--:--'),
          '<small>',
          seated ? 'SEATED' : 'BOOKED',
          '</small>',
        '</span>',

        '<span>',
          '<span class="pmd-rv2-name">',
          escapeHtml(reservation.name || 'Guest'),
          '</span>',

          '<span class="pmd-rv2-meta">',
            '<span>👥 ',
            escapeHtml(reservation.guests || 1),
            '</span>',

            '<span>▦ ',
            tableLabels.length
              ? 'Table ' + escapeHtml(tableLabels.join(', '))
              : 'Table TBD',
            '</span>',
          '</span>',

          reservation.notes
            ? '<span class="pmd-rv2-note">📝 ' +
              escapeHtml(reservation.notes) +
              '</span>'
            : '',
        '</span>',

        '<span class="pmd-rv2-status">',
        seated ? '●' : '↪',
        '</span>',

      '</button>'
    ].join('');
  }

  function renderReservationList() {
    var list = root.querySelector('[data-rv2-reservation-list]');
    var filtered = filteredReservations();

    var groups = [
      {
        key: 'upcoming',
        label: 'Upcoming'
      },
      {
        key: 'seated',
        label: 'Seated'
      },
      {
        key: 'completed',
        label: 'Completed / Cancelled'
      }
    ];

    var html = '';

    groups.forEach(function (group) {
      var items = filtered.filter(function (reservation) {
        return reservation.group === group.key;
      });

      html +=
        '<div class="pmd-rv2-group-title">' +
        '<span>' + escapeHtml(group.label) + '</span>' +
        '<span>' + items.length + '</span>' +
        '</div>';

      html += items.map(renderReservationCard).join('');
    });

    if (!filtered.length) {
      html +=
        '<div class="pmd-rv2-empty">' +
        '<div>' +
        '<strong>No reservations for this date.</strong><br>' +
        'Create a reservation or add a walk-in guest.' +
        '</div>' +
        '</div>';
    }

    list.innerHTML = html;
  }

  function renderAreas() {
    var areaTabs = root.querySelector('[data-rv2-area-tabs]');
    var values = ['all'].concat(areas);

    areaTabs.innerHTML = values.map(function (area) {
      return [
        '<button type="button" class="',
        state.area === area ? 'is-active' : '',
        '" data-rv2-area="',
        escapeHtml(area),
        '">',
        escapeHtml(area === 'all' ? 'All areas' : area),
        '</button>'
      ].join('');
    }).join('');
  }

  function reservationForTable(tableId) {
    return filteredReservations().find(function (reservation) {
      return (reservation.table_ids || []).some(function (id) {
        return String(id) === String(tableId);
      });
    });
  }

  function renderFloor() {
    var floor = root.querySelector('[data-rv2-floor]');

    var visibleTables = tables.filter(function (table) {
      return state.area === 'all' || table.area === state.area;
    });

    if (!visibleTables.length) {
      floor.innerHTML =
        '<div class="pmd-rv2-empty">No tables found for this area.</div>';
      return;
    }

    floor.innerHTML = visibleTables.map(function (table) {
      var reservation = reservationForTable(table.id);
      var selected =
        String(state.selectedTable) === String(table.id);

      var statusClass = reservation
        ? reservation.group === 'seated'
          ? 'is-seated'
          : 'is-reserved'
        : 'is-free';

      var shape =
        /round|circle/i.test(table.shape)
          ? 'is-round'
          : /square|diamond/i.test(table.shape)
            ? 'is-square'
            : '';

      return [
        '<button type="button" class="pmd-rv2-table ',
        shape, ' ', statusClass,
        selected ? ' is-selected' : '',
        '" data-rv2-table="',
        escapeHtml(table.id),
        '" style="',
        'left:', Number(table.x || 0), 'px;',
        'top:', Number(table.y || 0), 'px;',
        'width:', Number(table.width || 86), 'px;',
        'height:', Number(table.height || 86), 'px;',
        '">',

          '<span class="pmd-rv2-table-content">',
            '<span class="pmd-rv2-table-number">',
            escapeHtml(table.number),
            '</span>',

            '<span class="pmd-rv2-table-capacity">',
            escapeHtml(table.capacity || 4),
            ' seats</span>',
          '</span>',

          reservation
            ? '<span class="pmd-rv2-table-label">' +
              escapeHtml(reservation.name) +
              '</span>'
            : '',

        '</button>'
      ].join('');
    }).join('');
  }

  function renderAll() {
    renderReservationList();
    renderAreas();
    renderFloor();
  }

  root.addEventListener('input', function (event) {
    if (event.target.matches('[data-rv2-search]')) {
      state.query = clean(event.target.value);
      renderReservationList();
      renderFloor();
    }

    if (event.target.matches('[data-rv2-date]')) {
      state.date = event.target.value;
      renderReservationList();
      renderFloor();
    }
  });

  root.addEventListener('click', function (event) {
    var reservationButton =
      event.target.closest('[data-rv2-reservation]');

    if (reservationButton) {
      state.selectedReservation =
        reservationButton.getAttribute('data-rv2-reservation');

      var reservation = reservations.find(function (item) {
        return String(item.id) === String(state.selectedReservation);
      });

      state.selectedTable =
        reservation &&
        Array.isArray(reservation.table_ids) &&
        reservation.table_ids.length
          ? String(reservation.table_ids[0])
          : null;

      renderReservationList();
      renderFloor();

      if (
        event.detail === 2 &&
        reservation &&
        reservation.edit_url
      ) {
        location.href = reservation.edit_url;
      }

      return;
    }

    var tableButton = event.target.closest('[data-rv2-table]');

    if (tableButton) {
      state.selectedTable =
        tableButton.getAttribute('data-rv2-table');

      renderFloor();
      return;
    }

    var areaButton = event.target.closest('[data-rv2-area]');

    if (areaButton) {
      state.area =
        areaButton.getAttribute('data-rv2-area');

      renderAreas();
      renderFloor();
      return;
    }

    if (event.target.closest('[data-rv2-clear-search]')) {
      var search = root.querySelector('[data-rv2-search]');
      search.value = '';
      state.query = '';
      renderReservationList();
      renderFloor();
      return;
    }

    if (event.target.closest('[data-rv2-refresh]')) {
      location.reload();
      return;
    }

    if (event.target.closest('[data-rv2-today]')) {
      state.date = new Date().toISOString().slice(0, 10);
      root.querySelector('[data-rv2-date]').value = state.date;
      renderReservationList();
      renderFloor();
      return;
    }

    if (
      event.target.closest('[data-rv2-prev-date]') ||
      event.target.closest('[data-rv2-next-date]')
    ) {
      var direction = event.target.closest('[data-rv2-prev-date]')
        ? -1
        : 1;

      var date = new Date(state.date + 'T12:00:00');
      date.setDate(date.getDate() + direction);

      state.date = date.toISOString().slice(0, 10);
      root.querySelector('[data-rv2-date]').value = state.date;

      renderReservationList();
      renderFloor();
      return;
    }

    var tabButton = event.target.closest('[data-rv2-tab]');

    if (tabButton) {
      root.querySelectorAll('[data-rv2-tab]').forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button === tabButton
        );
      });

      state.tab = tabButton.getAttribute('data-rv2-tab');

      if (state.tab !== 'reservations') {
        alert(
          state.tab === 'waitlist'
            ? 'Waitlist workspace will be connected in the next step.'
            : 'Server assignment workspace will be connected in the next step.'
        );
      }

      return;
    }

    if (event.target.closest('[data-rv2-waitlist]')) {
      alert(
        'Waitlist creation will be connected to the existing reservation form.'
      );
    }
  });

  renderAll();

  window.PMDReservationWorkspaceV2 = {
    version: '2.0.0',
    data: data,
    state: state,
    refresh: renderAll
  };

  console.info('[PMD] Reservation Workspace V2 active', {
    reservations: reservations.length,
    tables: tables.length,
    areas: areas.length,
    date: state.date
  });
})();
