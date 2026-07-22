(function () {
  'use strict';

  if (!/^\/admin\/reservations2\/?$/.test(location.pathname)) {
    return;
  }

  if (window.PMDReservations2StableReservationV3) {
    return;
  }

  var page =
    document.querySelector('#pmd-reservations2');

  var waiter =
    document.querySelector('#pmd-waiter-dashboard-root');

  if (!page || !waiter) {
    return;
  }

  var boot =
    window.PMD_RESERVATIONS2_BOOT || {};

  var reservations =
    Array.isArray(boot.reservations)
      ? boot.reservations
      : [];

  var selected = '';
  var currentMap = null;
  var currentTables = [];
  var lastTableSignature = '';

  function value(input) {
    return input === null ||
      input === undefined
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

  function forTable(number) {
    var normalized =
      normalizeTable(number);

    return reservations.filter(
      function (reservation) {
        return (
          reservationTable(reservation) ===
          normalized
        );
      }
    );
  }

  function tableNumber(table) {
    return normalizeTable(
      table.getAttribute('data-table') ||
      table.getAttribute('data-table-number') ||
      table.getAttribute('data-table-id') ||
      ''
    );
  }

  function isBusy(table) {
    var state = [
      table.className,
      table.getAttribute('data-status'),
      table.getAttribute('data-order-state'),
      table.getAttribute('data-payment-state')
    ].join(' ').toLowerCase();

    return /occupied|busy|active|open|payment|urgent|has-order|has_orders/.test(
      state
    );
  }

  function stateFor(table) {
    var number = tableNumber(table);

    if (isBusy(table)) {
      return 'busy';
    }

    if (forTable(number).length) {
      return 'reserved';
    }

    return 'free';
  }

  function applyTableState(table) {
    var number = tableNumber(table);

    if (!number) {
      return;
    }

    var nextState =
      stateFor(table);

    var previousState =
      table.getAttribute(
        'data-pmd-rsv3-state'
      );

    /*
     * Only update classes when the state actually changed.
     * This prevents flashing and animation restarts.
     */
    if (previousState !== nextState) {
      table.classList.remove(
        'pmd-rsv3-free',
        'pmd-rsv3-reserved',
        'pmd-rsv3-busy'
      );

      table.classList.add(
        'pmd-rsv3-' + nextState
      );

      table.setAttribute(
        'data-pmd-rsv3-state',
        nextState
      );
    }

    table.classList.toggle(
      'pmd-rsv3-selected',
      number === selected
    );

    table.setAttribute(
      'data-pmd-rsv3-table',
      number
    );
  }

  function applyAllTableStates(tables) {
    tables.forEach(applyTableState);
  }

  function tableSignature(tables) {
    return tables
      .map(function (table) {
        return (
          tableNumber(table) +
          ':' +
          table.getAttribute('data-status') +
          ':' +
          table.getAttribute('data-order-state') +
          ':' +
          table.getAttribute('data-payment-state')
        );
      })
      .join('|');
  }

  function findExactText(text) {
    var target =
      text.toLowerCase();

    var nodes =
      waiter.querySelectorAll(
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

  function hideOrderingSection() {
    var title =
      findExactText('Active Order Cards');

    if (!title) {
      return;
    }

    var section =
      title.closest(
        'section,article,' +
        '[class*="order-cards"],' +
        '[class*="orders-grid"]'
      );

    if (section) {
      section.setAttribute(
        'data-pmd-rsv3-hide-ordering',
        'true'
      );
    }
  }

  function ensureSection() {
    var existing =
      page.querySelector(
        '[data-pmd-rsv3-section]'
      );

    if (existing) {
      return existing;
    }

    var section =
      document.createElement('section');

    section.className =
      'pmd-rsv3-section';

    section.setAttribute(
      'data-pmd-rsv3-section',
      ''
    );

    section.innerHTML = [
      '<header class="pmd-rsv3-header">',

        '<div class="pmd-rsv3-title">',
          '<h2 data-pmd-rsv3-title>',
            'Select a table',
          '</h2>',
          '<p data-pmd-rsv3-subtitle>',
            'Click a table to view its reservations.',
          '</p>',
        '</div>',

        '<a class="pmd-rsv3-create"',
          ' data-pmd-rsv3-create',
          ' aria-disabled="true"',
          ' href="#">',
          '＋ New reservation',
        '</a>',

      '</header>',

      '<div class="pmd-rsv3-body"',
        ' data-pmd-rsv3-body>',

        '<div class="pmd-rsv3-empty">',
          'No table selected.',
        '</div>',

      '</div>'
    ].join('');

    waiter.insertAdjacentElement(
      'afterend',
      section
    );

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

    var editBase =
      value(
        boot.editBaseUrl || ''
      ).replace(/\/$/, '');

    return [
      '<a class="pmd-rsv3-card"',
        ' href="',
        escapeHtml(
          editBase + '/' + value(id)
        ),
        '">',

        '<div class="pmd-rsv3-card-top">',

          '<span class="pmd-rsv3-name">',
            escapeHtml(name),
          '</span>',

          '<span class="pmd-rsv3-status">',
            escapeHtml(status),
          '</span>',

        '</div>',

        '<div class="pmd-rsv3-meta">',

          '<span>',
            guests !== null &&
            guests !== undefined
              ? escapeHtml(guests) +
                ' guests'
              : 'Guests —',
          '</span>',

          '<span>',
            date
              ? escapeHtml(date)
              : 'Date —',
          '</span>',

          '<span>',
            time
              ? escapeHtml(time)
              : 'Time —',
          '</span>',

        '</div>',

      '</a>'
    ].join('');
  }

  function renderSelection() {
    var section =
      ensureSection();

    var title =
      section.querySelector(
        '[data-pmd-rsv3-title]'
      );

    var subtitle =
      section.querySelector(
        '[data-pmd-rsv3-subtitle]'
      );

    var body =
      section.querySelector(
        '[data-pmd-rsv3-body]'
      );

    var create =
      section.querySelector(
        '[data-pmd-rsv3-create]'
      );

    if (!selected) {
      title.textContent =
        'Select a table';

      subtitle.textContent =
        'Click a table to view its reservations.';

      body.innerHTML =
        '<div class="pmd-rsv3-empty">' +
        'No table selected.' +
        '</div>';

      create.href = '#';

      create.setAttribute(
        'aria-disabled',
        'true'
      );

      return;
    }

    var matching =
      forTable(selected);

    title.textContent =
      'Table ' + selected;

    subtitle.textContent =
      matching.length
        ? matching.length +
          (
            matching.length === 1
              ? ' reservation'
              : ' reservations'
          )
        : 'This table has no reservations';

    var createUrl =
      value(
        boot.createUrl || '#'
      );

    create.href =
      createUrl +
      (
        createUrl.indexOf('?') === -1
          ? '?'
          : '&'
      ) +
      'table=' +
      encodeURIComponent(selected) +
      '&table_number=' +
      encodeURIComponent(selected);

    create.removeAttribute(
      'aria-disabled'
    );

    if (!matching.length) {
      body.innerHTML =
        '<div class="pmd-rsv3-empty">' +
        'Table ' +
        escapeHtml(selected) +
        ' is free and has no reservations.' +
        '</div>';

      return;
    }

    body.innerHTML =
      '<div class="pmd-rsv3-cards">' +
      matching
        .map(reservationCard)
        .join('') +
      '</div>';
  }

  function selectTable(number) {
    var normalized =
      normalizeTable(number);

    if (!normalized) {
      return;
    }

    if (selected === normalized) {
      return;
    }

    var previous =
      waiter.querySelector(
        '.pmd-w5-table.pmd-rsv3-selected'
      );

    if (previous) {
      previous.classList.remove(
        'pmd-rsv3-selected'
      );
    }

    selected = normalized;

    var current =
      waiter.querySelector(
        '.pmd-w5-table[data-pmd-rsv3-table="' +
        CSS.escape(selected) +
        '"]'
      );

    if (current) {
      current.classList.add(
        'pmd-rsv3-selected'
      );
    }

    renderSelection();
  }

  waiter.addEventListener(
    'click',
    function (event) {
      var table =
        event.target.closest(
          '.pmd-w5-floor-map-real ' +
          '.pmd-w5-table[data-table]'
        );

      if (!table) {
        return;
      }

      selectTable(
        tableNumber(table)
      );
    },
    true
  );

  function checkMap() {
    var map =
      waiter.querySelector(
        '.pmd-w5-floor-map-real'
      );

    if (!map) {
      return;
    }

    var tables =
      Array.prototype.slice.call(
        map.querySelectorAll(
          '.pmd-w5-table[data-table]'
        )
      );

    if (!tables.length) {
      return;
    }

    var signature =
      tableSignature(tables);

    var mapChanged =
      map !== currentMap;

    var nodesChanged =
      tables.length !== currentTables.length ||
      tables.some(function (table, index) {
        return table !== currentTables[index];
      });

    var stateChanged =
      signature !== lastTableSignature;

    if (
      mapChanged ||
      nodesChanged ||
      stateChanged
    ) {
      currentMap = map;
      currentTables = tables;
      lastTableSignature = signature;

      applyAllTableStates(tables);
    }
  }

  hideOrderingSection();
  ensureSection();
  renderSelection();

  /*
   * Slow state check:
   * it does nothing unless the map nodes or actual table state changed.
   */
  var timer =
    window.setInterval(
      checkMap,
      1500
    );

  checkMap();

  window.PMDReservations2StableReservationV3 = {
    version: '3.0.0',
    checkMap: checkMap,
    selectTable: selectTable,
    getSelectedTable: function () {
      return selected;
    },
    stop: function () {
      window.clearInterval(timer);
    },
    reservations: reservations.length,
    mutationObserver: false
  };

  console.info(
    '[PMD Reservations2 Stable Reservation V3] Ready',
    {
      reservations: reservations.length,
      mutationObserver: false,
      duplicatedWaiterAssets: false,
      iframe: false,
      clonedMap: false
    }
  );
})();
