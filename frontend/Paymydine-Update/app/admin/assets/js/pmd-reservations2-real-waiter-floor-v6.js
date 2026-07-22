(function () {
  'use strict';

  if (!/^\/admin\/reservations2\/?$/.test(location.pathname)) {
    return;
  }

  if (window.PMDReservations2RealWaiterFloorV6) {
    return;
  }

  var page =
    document.getElementById('pmd-reservations2');

  var root =
    document.getElementById(
      'pmd-waiter-dashboard-root'
    );

  if (!page || !root) {
    return;
  }

  var boot =
    window.PMD_RESERVATIONS2_BOOT || {};

  var reservations =
    Array.isArray(boot.reservations)
      ? boot.reservations
      : [];

  var selectedTable = '';

  function value(input) {
    return input == null
      ? ''
      : String(input);
  }

  function tableKey(input) {
    return value(input)
      .trim()
      .replace(
        /^table[\s#:_-]*/i,
        ''
      )
      .toLowerCase();
  }

  function pick(object, keys) {
    if (!object) {
      return null;
    }

    for (
      var index = 0;
      index < keys.length;
      index++
    ) {
      var key = keys[index];

      if (
        Object.prototype.hasOwnProperty.call(
          object,
          key
        ) &&
        object[key] != null &&
        object[key] !== ''
      ) {
        return object[key];
      }
    }

    return null;
  }

  function reservationTable(reservation) {
    return tableKey(
      pick(reservation, [
        'table_number',
        'tableNumber',
        'table_no',
        'tableNo',
        'table_name',
        'tableName',
        'table_id',
        'tableId',
        'table'
      ])
    );
  }

  function rowsForTable(number) {
    var key = tableKey(number);

    return reservations.filter(
      function (reservation) {
        return (
          reservationTable(reservation) ===
          key
        );
      }
    );
  }

  function floorTables() {
    return Array.prototype.slice.call(
      root.querySelectorAll(
        '.pmd-w5-floor-map-real ' +
        '.pmd-w5-table[data-table]'
      )
    );
  }

  function numberOf(table) {
    return tableKey(
      table.getAttribute('data-table')
    );
  }

  function waiterState(table) {
    return value(
      table.getAttribute(
        'data-pmd-v155-table-state'
      ) ||
      table.getAttribute(
        'data-pmd-v154-table-state'
      ) ||
      table.getAttribute('data-status')
    ).toLowerCase();
  }

  function reservationState(table) {
    var number = numberOf(table);
    var state = waiterState(table);

    if (
      /occupied|busy|seated|active/.test(
        state
      )
    ) {
      return 'occupied';
    }

    if (rowsForTable(number).length) {
      return 'reserved';
    }

    return 'free';
  }

  function applyReservationState(table) {
    var number = numberOf(table);

    if (!number) {
      return;
    }

    var state = reservationState(table);

    table.classList.remove(
      'pmd-rsv5-free',
      'pmd-rsv5-reserved',
      'pmd-rsv5-occupied',
      'pmd-rsv4-free',
      'pmd-rsv4-reserved',
      'pmd-rsv4-occupied',
      'pmd-rsv6-free',
      'pmd-rsv6-reserved',
      'pmd-rsv6-occupied'
    );

    table.classList.add(
      'pmd-rsv6-' + state
    );

    table.classList.toggle(
      'pmd-rsv6-selected',
      selectedTable === number
    );

    table.setAttribute(
      'data-pmd-rsv6-state',
      state
    );

    table.setAttribute(
      'title',
      'Table ' +
        number +
        ' · ' +
        (
          state === 'occupied'
            ? 'Occupied'
            : state === 'reserved'
              ? 'Reserved'
              : 'Free'
        )
    );
  }

  function hideOrderSection() {
    var headings =
      root.querySelectorAll(
        'h1,h2,h3,h4'
      );

    Array.prototype.forEach.call(
      headings,
      function (heading) {
        var title =
          value(heading.textContent)
            .trim()
            .toLowerCase();

        if (
          title !== 'active order cards'
        ) {
          return;
        }

        var section =
          heading.closest(
            'section,article'
          ) ||
          heading.parentElement;

        if (section) {
          section.setAttribute(
            'data-pmd-rsv5-order-section',
            '1'
          );

          section.style.setProperty(
            'display',
            'none',
            'important'
          );
        }
      }
    );
  }

  function sync() {
    floorTables().forEach(
      applyReservationState
    );

    hideOrderSection();
  }

  /*
   * In normal mode, table click is Reservations only.
   * In edit mode, V160 receives drag/resize interaction.
   */
  root.addEventListener(
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

      var shell =
        table.closest(
          '.pmd-v191-floor-shell'
        );

      var editing =
        shell &&
        (
          shell.classList.contains(
            'is-editing'
          ) ||
          shell.getAttribute(
            'data-editing'
          ) === 'true' ||
          document.documentElement
            .classList.contains(
              'pmd-v160-editing'
            )
        );

      if (editing) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      selectedTable =
        numberOf(table);

      sync();

      var oldAuthority =
        window
          .PMDReservations2ExactFloorV5;

      if (
        oldAuthority &&
        typeof oldAuthority.selectTable ===
          'function'
      ) {
        oldAuthority.selectTable(
          selectedTable
        );
      }
    },
    true
  );

  sync();

  setTimeout(sync, 300);
  setTimeout(sync, 1000);
  setTimeout(sync, 2200);

  var timer =
    setInterval(sync, 1800);

  window.PMDReservations2RealWaiterFloorV6 = {
    version: '6.0.0',

    sync: sync,

    stop: function () {
      clearInterval(timer);
    },

    getSelectedTable:
      function () {
        return selectedTable;
      },

    reservations:
      reservations.length,

    realWaiterAssets: true,
    reservationClickAuthority: true
  };

  console.info(
    '[PMD Reservations2 Real Waiter Floor V6] Ready',
    {
      reservations:
        reservations.length,

      v153:
        Boolean(
          window
            .PMDWaiterFloorStabilityV153
        ),

      v154:
        Boolean(
          window
            .PMDWaiterTableStateV154
        ),

      v155:
        Boolean(
          window.PMDWaiterFloorUXV155
        ),

      v160:
        Boolean(
          window.PMDWaiterFloorEditV160
        )
    }
  );
})();
