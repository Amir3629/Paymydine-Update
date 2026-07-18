(function () {
  'use strict';

  if (window.PMDReservations2V1) return;

  var boot = window.PMD_RESERVATIONS2_BOOT || {};
  var root = document.getElementById('pmd-reservations2');
  if (!root) return;

  var PAGE_SIZE = 4;
  var page = 0;
  var query = '';

  var TABLES = [
    { number: 5, x: 15, y: 26, seats: 2 },
    { number: 6, x: 38, y: 26, seats: 3 },
    { number: 20, x: 60, y: 26, seats: 2 },
    { number: 8, x: 83, y: 26, seats: 2 },
    { number: 7, x: 86, y: 52, seats: 3 },
    { number: 1, x: 38, y: 60, seats: 5 },
    { number: 10, x: 64, y: 59, seats: 2 },
    { number: 16, x: 58, y: 84, seats: 4 },
    { number: 17, x: 86, y: 84, seats: 1 }
  ];

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return clean(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function first(record, keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
      if (record && record[keys[i]] != null && record[keys[i]] !== '') {
        return record[keys[i]];
      }
    }
    return fallback;
  }

  function normalize(record) {
    var id = Number(first(record, ['reservation_id', 'id'], 0)) || 0;
    var guestName = first(record, ['guest_name', 'first_name', 'customer_name', 'name'], 'Reservation #' + id);
    var guests = Number(first(record, ['guest_num', 'guest_count', 'guests'], 0)) || 0;
    var table = first(record, ['table_name', 'table_number', 'table_id'], '');
    var status = clean(first(record, ['status_name', 'status', 'status_name_text'], 'pending')).toLowerCase();
    var date = clean(first(record, ['reserve_date', 'date'], ''));
    var time = clean(first(record, ['reserve_time', 'time'], ''));

    if (record && record.status && typeof record.status === 'object') {
      status = clean(first(record.status, ['status_name', 'name'], status)).toLowerCase();
    }

    return {
      id: id,
      name: clean(guestName),
      guests: guests,
      table: clean(table).replace(/^table\s*/i, ''),
      status: status || 'pending',
      date: date,
      time: time,
      editUrl: (boot.editBaseUrl || '/admin/reservations/edit') + '/' + id
    };
  }

  var reservations = Array.isArray(boot.reservations)
    ? boot.reservations.map(normalize)
    : [];

  function todayIso() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function isActive(status) {
    return !/complete|cancel|declin|no.show/.test(status);
  }

  function updateKpis() {
    var today = todayIso();
    var todayRows = reservations.filter(function (r) {
      return !r.date || r.date.slice(0, 10) === today;
    });

    var assigned = new Set(
      reservations.filter(function (r) { return r.table; })
        .map(function (r) { return r.table; })
    );

    var values = {
      today: todayRows.length,
      guests: todayRows.reduce(function (sum, r) { return sum + r.guests; }, 0),
      active: reservations.filter(function (r) { return isActive(r.status); }).length,
      tables: assigned.size
    };

    Object.keys(values).forEach(function (key) {
      var node = root.querySelector('[data-pmd-r2-kpi="' + key + '"]');
      if (node) node.textContent = String(values[key]);
    });
  }

  function filteredReservations() {
    if (!query) return reservations.slice();

    return reservations.filter(function (r) {
      return [r.name, r.status, r.table, r.date, r.time, String(r.id)]
        .join(' ')
        .toLowerCase()
        .indexOf(query) !== -1;
    });
  }

  function renderCards() {
    var target = root.querySelector('[data-pmd-r2-cards]');
    var count = root.querySelector('[data-pmd-r2-count]');
    var dots = root.querySelector('[data-pmd-r2-page-dots]');
    if (!target) return;

    var rows = filteredReservations();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (page >= pages) page = 0;

    var visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    if (count) count.textContent = rows.length + (rows.length === 1 ? ' reservation' : ' reservations');
    if (dots) {
      dots.textContent = Array.from({ length: Math.min(pages, 5) }, function (_, index) {
        return index === page ? '●' : '○';
      }).join(' ');
    }

    if (!visible.length) {
      target.innerHTML = '<div class="pmd-r2-card__empty">No reservations found.</div>';
      return;
    }

    target.innerHTML = visible.map(function (r) {
      return [
        '<a class="pmd-r2-card" href="', esc(r.editUrl), '">',
          '<div class="pmd-r2-card__top">',
            '<span class="pmd-r2-card__name">', esc(r.name || ('Reservation #' + r.id)), '</span>',
            '<span class="pmd-r2-card__status">', esc(r.status), '</span>',
          '</div>',
          '<div class="pmd-r2-card__meta">',
            '<span>#', esc(r.id), '</span>',
            r.guests ? '<span>' + esc(r.guests) + ' guests</span>' : '',
            r.table ? '<span>Table ' + esc(r.table) + '</span>' : '<span>No table</span>',
            r.time ? '<span>' + esc(r.time) + '</span>' : '',
            r.date ? '<span>' + esc(r.date) + '</span>' : '',
          '</div>',
        '</a>'
      ].join('');
    }).join('');
  }

  function reservationForTable(number) {
    return reservations.find(function (r) {
      return Number(String(r.table).match(/\d+/)) === number && isActive(r.status);
    });
  }

  function tableStatus(number) {
    var reservation = reservationForTable(number);
    if (!reservation) return 'free';
    if (/seated|occupied/.test(reservation.status)) return 'occupied';
    return 'reserved';
  }

  function renderFloor() {
    var floor = root.querySelector('[data-pmd-r2-floor]');
    if (!floor) return;

    floor.innerHTML = TABLES.map(function (table) {
      var status = tableStatus(table.number);
      return [
        '<button type="button" class="pmd-r2-table" ',
          'data-status="', status, '" ',
          'data-table="', table.number, '" ',
          'style="left:', table.x, '%;top:', table.y, '%" ',
          'aria-label="Table ', table.number, '">',
          '<span>', table.number, '</span>',
          '<small>', table.seats, '</small>',
        '</button>'
      ].join('');
    }).join('');
  }

  function bind() {
    root.querySelectorAll('[data-pmd-r2-refresh]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.location.reload();
      });
    });

    var search = root.querySelector('[data-pmd-r2-search]');
    if (search) {
      search.addEventListener('input', function () {
        query = clean(search.value).toLowerCase();
        page = 0;
        renderCards();
      });
    }

    var clear = root.querySelector('[data-pmd-r2-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        query = '';
        if (search) search.value = '';
        page = 0;
        renderCards();
      });
    }

    var next = root.querySelector('[data-pmd-r2-next]');
    if (next) {
      next.addEventListener('click', function () {
        var pages = Math.max(1, Math.ceil(filteredReservations().length / PAGE_SIZE));
        page = (page + 1) % pages;
        renderCards();
      });
    }

    root.addEventListener('click', function (event) {
      var table = event.target.closest('.pmd-r2-table');
      if (!table) return;

      var number = Number(table.dataset.table);
      var reservation = reservationForTable(number);

      if (reservation) {
        window.location.href = reservation.editUrl;
      } else {
        window.location.href = (boot.createUrl || '/admin/reservations/create') + '?table=' + number;
      }
    });
  }

  function init() {
    updateKpis();
    renderCards();
    renderFloor();
    bind();
    root.setAttribute('aria-busy', 'false');

    window.PMDReservations2V1 = {
      version: '1.0.0',
      reservations: reservations.length,
      tables: TABLES.length,
      route: location.pathname,
      cleanPage: true
    };

    console.info('[PMD Reservations2 V1] Ready', window.PMDReservations2V1);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
