(function () {
  'use strict';

  if (!/^\/admin\/reservations2\/?$/.test(location.pathname)) {
    return;
  }

  if (window.PMDReservations2ExactFloorV5) {
    return;
  }

  var page = document.querySelector('#pmd-reservations2');
  var waiter = document.querySelector('#pmd-waiter-dashboard-root');

  if (!page || !waiter) {
    return;
  }

  var boot = window.PMD_RESERVATIONS2_BOOT || {};

  var reservations = Array.isArray(boot.reservations)
    ? boot.reservations
    : [];

  var selectedTable = '';
  var lastSignature = '';
  var tableClickBound = false;

  function value(input) {
    return input === null || input === undefined
      ? ''
      : String(input);
  }

  function escapeHtml(input) {
    return value(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function pick(object, keys) {
    if (!object || typeof object !== 'object') {
      return null;
    }

    for (var index = 0; index < keys.length; index++) {
      var key = keys[index];

      if (
        Object.prototype.hasOwnProperty.call(object, key) &&
        object[key] !== null &&
        object[key] !== undefined &&
        object[key] !== ''
      ) {
        return object[key];
      }
    }

    return null;
  }

  function normalizeTable(input) {
    return value(input)
      .trim()
      .replace(/^table[\s#:_-]*/i, '')
      .toLowerCase();
  }

  function reservationTable(reservation) {
    return normalizeTable(
      pick(reservation, [
        'table_id',
        'tableId',
        'table_number',
        'tableNumber',
        'table_no',
        'tableNo',
        'table',
        'table_name',
        'tableName'
      ])
    );
  }

  function reservationsForTable(number) {
    var normalized = normalizeTable(number);

    return reservations.filter(function (reservation) {
      return reservationTable(reservation) === normalized;
    });
  }

  function tableNumber(table) {
    return normalizeTable(
      table.getAttribute('data-table') ||
      table.getAttribute('data-table-number') ||
      table.getAttribute('data-table-id') ||
      ''
    );
  }

  /*
   * Occupied comes from live Waiter state.
   * Reserved comes from reservation records.
   * Free means neither is true.
   */
  function isOccupied(table) {
    var state = [
      table.className,
      table.getAttribute('data-status'),
      table.getAttribute('data-order-state'),
      table.getAttribute('data-payment-state')
    ].join(' ').toLowerCase();

    return /is-payment|is-urgent|occupied|busy|active|open|has-order|has_orders/.test(
      state
    );
  }

  function desiredState(table) {
    var number = tableNumber(table);

    if (isOccupied(table)) {
      return 'occupied';
    }

    if (reservationsForTable(number).length) {
      return 'reserved';
    }

    return 'free';
  }

  function applyInlineState(table, state) {
    /*
     * Inline !important wins over every late V175c authority
     * without repeatedly changing layout or geometry.
     */
    if (state === 'free') {
      table.style.setProperty(
        'background',
        '#ffffff',
        'important'
      );

      table.style.setProperty(
        'background-color',
        '#ffffff',
        'important'
      );

      table.style.setProperty(
        'border-color',
        '#63a99f',
        'important'
      );

      table.style.setProperty(
        'color',
        '#103b37',
        'important'
      );
    }

    if (state === 'reserved') {
      table.style.setProperty(
        'background',
        '#ffd15c',
        'important'
      );

      table.style.setProperty(
        'background-color',
        '#ffd15c',
        'important'
      );

      table.style.setProperty(
        'border-color',
        '#b77a00',
        'important'
      );

      table.style.setProperty(
        'color',
        '#493200',
        'important'
      );
    }

    if (state === 'occupied') {
      table.style.setProperty(
        'background',
        'rgb(255, 51, 71)',
        'important'
      );

      table.style.setProperty(
        'background-color',
        'rgb(255, 51, 71)',
        'important'
      );

      table.style.setProperty(
        'border-color',
        'rgb(184, 15, 36)',
        'important'
      );

      table.style.setProperty(
        'color',
        '#ffffff',
        'important'
      );
    }
  }

  function applyState(table) {
    var number = tableNumber(table);

    if (!number) {
      return;
    }

    var state = desiredState(table);
    var previous = table.getAttribute('data-pmd-rsv5-state');

    if (state !== previous) {
      table.classList.remove(
        'pmd-rsv5-free',
        'pmd-rsv5-reserved',
        'pmd-rsv5-occupied'
      );

      table.classList.add(
        'pmd-rsv5-' + state
      );

      table.setAttribute(
        'data-pmd-rsv5-state',
        state
      );

      applyInlineState(table, state);
    }

    table.classList.toggle(
      'pmd-rsv5-selected',
      number === selectedTable
    );

    table.setAttribute(
      'data-pmd-rsv5-table',
      number
    );
  }

  function floorTables() {
    return Array.prototype.slice.call(
      waiter.querySelectorAll(
        '.pmd-w5-floor-map-real ' +
        '.pmd-w5-table[data-table]'
      )
    );
  }

  function signature(tables) {
    return tables.map(function (table) {
      return [
        tableNumber(table),
        table.className,
        table.getAttribute('data-status'),
        table.getAttribute('data-order-state'),
        table.getAttribute('data-payment-state')
      ].join(':');
    }).join('|');
  }

  function findExactText(text) {
    var target = text.toLowerCase();

    var nodes = waiter.querySelectorAll(
      'h1,h2,h3,h4,strong,span,p,div'
    );

    for (var index = 0; index < nodes.length; index++) {
      if (
        value(nodes[index].textContent)
          .trim()
          .toLowerCase() === target
      ) {
        return nodes[index];
      }
    }

    return null;
  }

  function hideOrderingCards() {
    var title = findExactText('Active Order Cards');

    if (!title) {
      return;
    }

    var section = title.closest(
      'section,article,' +
      '[class*="order-cards"],' +
      '[class*="orders-grid"]'
    );

    if (section) {
      section.setAttribute(
        'data-pmd-rsv5-order-section',
        ''
      );
    }
  }

  function ensureReservationSection() {
    var existing = page.querySelector(
      '[data-pmd-rsv5-section]'
    );

    if (existing) {
      return existing;
    }

    var section = document.createElement('section');

    section.className = 'pmd-rsv5-section';
    section.setAttribute('data-pmd-rsv5-section', '');

    section.innerHTML = [
      '<header class="pmd-rsv5-header">',

        '<div>',
          '<h2 data-pmd-rsv5-title>Select a table</h2>',
          '<p data-pmd-rsv5-subtitle>',
            'Click a table to view its reservations.',
          '</p>',
        '</div>',

        '<a class="pmd-rsv5-create"',
          ' data-pmd-rsv5-create',
          ' aria-disabled="true"',
          ' href="#">',
          '＋ New reservation',
        '</a>',

      '</header>',

      '<div class="pmd-rsv5-body"',
        ' data-pmd-rsv5-body>',

        '<div class="pmd-rsv5-empty">',
          'No table selected.',
        '</div>',

      '</div>'
    ].join('');

    waiter.insertAdjacentElement('afterend', section);

    return section;
  }

  function reservationCard(reservation) {
    var id = pick(reservation, [
      'reservation_id',
      'reservationId',
      'id'
    ]);

    var name = pick(reservation, [
      'guest_name',
      'guestName',
      'customer_name',
      'customerName',
      'name'
    ]) || 'Guest';

    var status = pick(reservation, [
      'status_name',
      'statusName',
      'status'
    ]) || 'pending';

    var guests = pick(reservation, [
      'guest_num',
      'guestNum',
      'guests',
      'covers',
      'party_size',
      'partySize'
    ]);

    var date = pick(reservation, [
      'reserve_date',
      'reserveDate',
      'reservation_date',
      'reservationDate',
      'date'
    ]);

    var time = pick(reservation, [
      'reserve_time',
      'reserveTime',
      'reservation_time',
      'reservationTime',
      'time'
    ]);

    var editBase = value(
      boot.editBaseUrl || ''
    ).replace(/\/$/, '');

    return [
      '<a class="pmd-rsv5-card"',
        ' href="',
        escapeHtml(editBase + '/' + value(id)),
        '">',

        '<div class="pmd-rsv5-card-top">',

          '<span class="pmd-rsv5-name">',
            escapeHtml(name),
          '</span>',

          '<span class="pmd-rsv5-status">',
            escapeHtml(status),
          '</span>',

        '</div>',

        '<div class="pmd-rsv5-meta">',

          '<span>',
            guests !== null && guests !== undefined
              ? escapeHtml(guests) + ' guests'
              : 'Guests —',
          '</span>',

          '<span>',
            date ? escapeHtml(date) : 'Date —',
          '</span>',

          '<span>',
            time ? escapeHtml(time) : 'Time —',
          '</span>',

        '</div>',

      '</a>'
    ].join('');
  }

  function renderSelection() {
    var section = ensureReservationSection();

    var title = section.querySelector(
      '[data-pmd-rsv5-title]'
    );

    var subtitle = section.querySelector(
      '[data-pmd-rsv5-subtitle]'
    );

    var body = section.querySelector(
      '[data-pmd-rsv5-body]'
    );

    var create = section.querySelector(
      '[data-pmd-rsv5-create]'
    );

    if (!selectedTable) {
      title.textContent = 'Select a table';

      subtitle.textContent =
        'Click a table to view its reservations.';

      body.innerHTML =
        '<div class="pmd-rsv5-empty">' +
        'No table selected.' +
        '</div>';

      create.href = '#';
      create.setAttribute('aria-disabled', 'true');

      return;
    }

    var matching = reservationsForTable(selectedTable);

    title.textContent = 'Table ' + selectedTable;

    subtitle.textContent = matching.length
      ? matching.length +
        (matching.length === 1
          ? ' reservation'
          : ' reservations')
      : 'This table currently has no reservations';

    var createUrl = value(boot.createUrl || '#');

    create.href =
      createUrl +
      (createUrl.indexOf('?') === -1 ? '?' : '&') +
      'table=' +
      encodeURIComponent(selectedTable) +
      '&table_number=' +
      encodeURIComponent(selectedTable);

    create.removeAttribute('aria-disabled');

    if (!matching.length) {
      body.innerHTML =
        '<div class="pmd-rsv5-empty">' +
        'Table ' +
        escapeHtml(selectedTable) +
        ' is available. Create a new reservation for this table.' +
        '</div>';

      return;
    }

    body.innerHTML =
      '<div class="pmd-rsv5-cards">' +
      matching.map(reservationCard).join('') +
      '</div>';
  }

  function selectTable(number) {
    var normalized = normalizeTable(number);

    if (!normalized) {
      return;
    }

    selectedTable = normalized;

    floorTables().forEach(applyState);

    renderSelection();
  }

  /*
   * Capture before every Waiter order/POS handler.
   * Clicking a table cannot place or open an order.
   */
  waiter.addEventListener(
    'click',
    function (event) {
      var table = event.target.closest(
        '.pmd-w5-floor-map-real ' +
        '.pmd-w5-table[data-table]'
      );

      if (!table) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      selectTable(tableNumber(table));
    },
    true
  );

  function checkFloor() {
    var tables = floorTables();

    if (!tables.length) {
      return;
    }

    var nextSignature = signature(tables);

    if (nextSignature !== lastSignature) {
      lastSignature = nextSignature;

      tables.forEach(applyState);
    }
  }

  hideOrderingCards();
  ensureReservationSection();
  renderSelection();

  checkFloor();

  /*
   * Slow check only. No MutationObserver and no layout rewrites.
   */
  var timer = window.setInterval(checkFloor, 1800);

  window.PMDReservations2ExactFloorV5 = {
    version: '5.0.0',
    checkFloor: checkFloor,
    selectTable: selectTable,
    getSelectedTable: function () {
      return selectedTable;
    },
    stop: function () {
      window.clearInterval(timer);
    },
    reservations: reservations.length,
    orderClicksBlocked: true,
    mutationObserver: false
  };

  console.info(
    '[PMD Reservations2 Exact Floor V5] Ready',
    {
      reservations: reservations.length,
      orderClicksBlocked: true,
      mutationObserver: false,
      exactLatestWaiterAuthorities: true
    }
  );
})();
