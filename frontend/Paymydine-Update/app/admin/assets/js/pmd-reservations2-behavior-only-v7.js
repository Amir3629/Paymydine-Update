(function () {
  'use strict';

  if (!/^\/admin\/reservations2\/?$/.test(location.pathname)) {
    return;
  }

  if (
    window.PMDReservations2BehaviorOnlyV7 &&
    typeof window.PMDReservations2BehaviorOnlyV7.stop ===
      'function'
  ) {
    try {
      window.PMDReservations2BehaviorOnlyV7.stop();
    } catch (error) {}
  }

  var page =
    document.getElementById('pmd-reservations2');

  var waiter =
    document.getElementById(
      'pmd-waiter-dashboard-root'
    );

  if (!page || !waiter) {
    return;
  }

  var boot =
    window.PMD_RESERVATIONS2_BOOT || {};

  var reservations =
    Array.isArray(boot.reservations)
      ? boot.reservations
      : [];

  var selectedTable = '';
  var observer = null;
  var syncTimer = 0;
  var stopped = false;

  function value(input) {
    return input == null
      ? ''
      : String(input);
  }

  function normalizeTable(input) {
    return value(input)
      .trim()
      .replace(/^table[\s#:_-]*/i, '')
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
    return normalizeTable(
      pick(reservation, [
        'table_number',
        'tableNumber',
        'table_no',
        'tableNo',
        'table',
        'table_name',
        'tableName',
        'table_id',
        'tableId'
      ])
    );
  }

  function reservationsFor(number) {
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

  function floorTables() {
    return Array.prototype.slice.call(
      waiter.querySelectorAll(
        '.pmd-w5-floor-map-real ' +
        '.pmd-w5-table[data-table]'
      )
    );
  }

  function numberOf(table) {
    return normalizeTable(
      table.getAttribute('data-table')
    );
  }

  function realWaiterState(table) {
    return value(
      table.getAttribute(
        'data-pmd-v155-table-state'
      ) ||
      table.getAttribute(
        'data-pmd-v154-table-state'
      ) ||
      table.getAttribute('data-status') ||
      ''
    ).toLowerCase();
  }

  function stateOf(table) {
    var number = numberOf(table);
    var waiterState =
      realWaiterState(table);

    if (
      /occupied|busy|active|seated/.test(
        waiterState
      )
    ) {
      return 'occupied';
    }

    if (reservationsFor(number).length) {
      return 'reserved';
    }

    return 'free';
  }

  /*
   * Critical stability change:
   * Never remove and re-add classes when state is unchanged.
   */
  function applyState(table) {
    var number = numberOf(table);

    if (!number) {
      return;
    }

    var state = stateOf(table);
    var previous =
      table.getAttribute(
        'data-pmd-rsv7-state'
      );

    if (previous !== state) {
      table.classList.remove(
        'pmd-rsv4-free',
        'pmd-rsv4-reserved',
        'pmd-rsv4-occupied',

        'pmd-rsv5-free',
        'pmd-rsv5-reserved',
        'pmd-rsv5-occupied',

        'pmd-rsv7-free',
        'pmd-rsv7-reserved',
        'pmd-rsv7-occupied'
      );

      table.classList.add(
        'pmd-rsv7-' + state
      );

      table.setAttribute(
        'data-pmd-rsv7-state',
        state
      );
    }

    var shouldSelect =
      selectedTable === number;

    if (
      table.classList.contains(
        'pmd-rsv7-selected'
      ) !== shouldSelect
    ) {
      table.classList.toggle(
        'pmd-rsv7-selected',
        shouldSelect
      );
    }
  }

  function isEditing(table) {
    var root =
      table.closest(
        '#pmd-waiter-dashboard-root'
      );

    var shell =
      table.closest(
        '.pmd-v191-floor-shell,' +
        '.pmd-w5-floor'
      );

    return Boolean(
      root &&
      (
        root.classList.contains(
          'pmd-w19-editing'
        ) ||
        root.classList.contains(
          'pmd-v21-editing'
        ) ||
        root.classList.contains(
          'pmd-v160-editing'
        ) ||
        root.getAttribute(
          'data-pmd-v160-editing'
        ) === '1'
      )
    ) || Boolean(
      shell &&
      (
        shell.classList.contains(
          'is-editing'
        ) ||
        shell.getAttribute(
          'data-editing'
        ) === 'true'
      )
    );
  }

  function ensurePanel() {
    var panel =
      page.querySelector(
        '[data-pmd-rsv7-panel]'
      );

    if (panel) {
      return panel;
    }

    panel =
      document.createElement('section');

    panel.className =
      'pmd-rsv7-panel';

    panel.setAttribute(
      'data-pmd-rsv7-panel',
      ''
    );

    panel.innerHTML =
      '<h2 data-pmd-rsv7-title>' +
      'Select a table' +
      '</h2>' +

      '<p data-pmd-rsv7-subtitle>' +
      'Click a table to view reservations.' +
      '</p>' +

      '<div class="pmd-rsv7-empty" ' +
      'data-pmd-rsv7-content>' +
      'No table selected.' +
      '</div>';

    waiter.insertAdjacentElement(
      'afterend',
      panel
    );

    return panel;
  }

  function renderPanel() {
    var panel = ensurePanel();

    var title =
      panel.querySelector(
        '[data-pmd-rsv7-title]'
      );

    var subtitle =
      panel.querySelector(
        '[data-pmd-rsv7-subtitle]'
      );

    var content =
      panel.querySelector(
        '[data-pmd-rsv7-content]'
      );

    if (!selectedTable) {
      title.textContent =
        'Select a table';

      subtitle.textContent =
        'Click a table to view reservations.';

      content.textContent =
        'No table selected.';

      return;
    }

    var rows =
      reservationsFor(selectedTable);

    title.textContent =
      'Table ' + selectedTable;

    subtitle.textContent =
      rows.length
        ? rows.length +
          (
            rows.length === 1
              ? ' reservation'
              : ' reservations'
          )
        : 'No reservation currently assigned';

    content.textContent =
      rows.length
        ? rows.map(function (row) {
            return (
              pick(row, [
                'guest_name',
                'guestName',
                'customer_name',
                'customerName',
                'name'
              ]) || 'Guest'
            );
          }).join(' · ')
        : (
          'Table ' +
          selectedTable +
          ' is available for a new reservation.'
        );
  }

  function hideActiveOrders() {
    var headings =
      waiter.querySelectorAll(
        'h1,h2,h3,h4'
      );

    Array.prototype.forEach.call(
      headings,
      function (heading) {
        var text =
          value(heading.textContent)
            .trim()
            .toLowerCase();

        if (
          text !== 'active order cards'
        ) {
          return;
        }

        var section =
          heading.closest(
            'section,article'
          ) ||
          heading.parentElement;

        if (
          section &&
          !section.hasAttribute(
            'data-pmd-rsv7-order-section'
          )
        ) {
          section.setAttribute(
            'data-pmd-rsv7-order-section',
            ''
          );
        }
      }
    );
  }

  function syncNow() {
    if (stopped) {
      return;
    }

    floorTables().forEach(
      applyState
    );

    hideActiveOrders();
  }

  function scheduleSync(delay) {
    if (stopped) {
      return;
    }

    window.clearTimeout(syncTimer);

    syncTimer =
      window.setTimeout(
        syncNow,
        typeof delay === 'number'
          ? delay
          : 80
      );
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

      if (isEditing(table)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var next =
        numberOf(table);

      if (selectedTable !== next) {
        selectedTable = next;
        syncNow();
        renderPanel();
      }
    },
    true
  );

  waiter.addEventListener(
    'dblclick',
    function (event) {
      var table =
        event.target.closest(
          '.pmd-w5-floor-map-real ' +
          '.pmd-w5-table[data-table]'
        );

      if (!table || isEditing(table)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    },
    true
  );

  ensurePanel();
  renderPanel();

  /*
   * One initial stabilization sequence only.
   * No permanent repaint interval.
   */
  syncNow();
  scheduleSync(250);

  window.setTimeout(
    function () {
      scheduleSync(0);
    },
    900
  );

  /*
   * Observe meaningful DOM updates from the Waiter workflow.
   * Changes generated by this script are ignored.
   */
  observer =
    new MutationObserver(
      function (mutations) {
        var meaningful =
          mutations.some(
            function (mutation) {
              if (
                mutation.type ===
                'childList'
              ) {
                return (
                  mutation.addedNodes.length ||
                  mutation.removedNodes.length
                );
              }

              if (
                mutation.type ===
                  'attributes' &&
                mutation.target &&
                mutation.target.matches &&
                mutation.target.matches(
                  '.pmd-w5-table[data-table]'
                )
              ) {
                return (
                  mutation.attributeName !==
                    'data-pmd-rsv7-state' &&
                  mutation.attributeName !==
                    'class'
                );
              }

              return false;
            }
          );

        if (meaningful) {
          scheduleSync(90);
        }
      }
    );

  observer.observe(
    waiter,
    {
      childList: true,
      subtree: true,

      attributes: true,

      attributeFilter: [
        'data-status',
        'data-pmd-v154-table-state',
        'data-pmd-v155-table-state',
        'data-table'
      ]
    }
  );

  window.PMDReservations2BehaviorOnlyV7 = {
    version: '7.1.0',

    sync: syncNow,

    stop: function () {
      stopped = true;

      window.clearTimeout(
        syncTimer
      );

      if (observer) {
        observer.disconnect();
      }
    },

    getSelectedTable:
      function () {
        return selectedTable;
      },

    reservations:
      reservations.length,

    geometryOverrides: false,
    orderClicksBlocked: true,
    permanentInterval: false,
    legacyAuthoritiesDisabled: true
  };

  console.info(
    '[PMD Reservations2 Behavior Only V7.1] Ready',
    {
      reservations:
        reservations.length,

      geometryOverrides:
        false,

      permanentInterval:
        false,

      legacyAuthoritiesDisabled:
        true
    }
  );
})();
