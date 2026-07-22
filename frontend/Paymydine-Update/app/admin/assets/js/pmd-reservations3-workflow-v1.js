(function () {
  'use strict';

  if (!/^\/admin\/reservations3\/?$/.test(location.pathname)) {
    return;
  }

  if (window.PMDReservations3WorkflowV1) {
    return;
  }

  var root = document.querySelector('#pmd-reservations2');

  if (!root) {
    return;
  }

  var boot = window.PMD_RESERVATIONS2_BOOT || {};
  var reservations = Array.isArray(boot.reservations)
    ? boot.reservations
    : [];

  var selectedTable = '';

  function value(input) {
    return input === null || input === undefined
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

  function reservationsForTable(table) {
    var normalized = normalizeTable(table);

    return reservations.filter(function (reservation) {
      return reservationTable(reservation) === normalized;
    });
  }

  function tableNode(target) {
    if (!target || target.nodeType !== 1) {
      return null;
    }

    return target.closest([
      '#pmd-reservations2 [data-pmd-r2-floor] [data-table]',
      '#pmd-reservations2 [data-pmd-r2-floor] [data-table-id]',
      '#pmd-reservations2 [data-pmd-r2-floor] [data-table-number]',
      '#pmd-reservations2 [data-pmd-r2-floor] .pmd-r2-table',
      '#pmd-reservations2 [data-pmd-r2-floor] button'
    ].join(','));
  }

  function tableNumber(node) {
    if (!node) {
      return '';
    }

    var result =
      node.getAttribute('data-table') ||
      node.getAttribute('data-table-id') ||
      node.getAttribute('data-table-number') ||
      '';

    if (!result) {
      var match = value(node.textContent).match(
        /(?:table\s*)?#?\s*(\d+)/i
      );

      result = match ? match[1] : '';
    }

    return normalizeTable(result);
  }

  function busy(node) {
    var status = [
      node.className,
      node.getAttribute('data-status'),
      node.getAttribute('data-state')
    ].join(' ').toLowerCase();

    return /busy|occupied|active|open|has-order|has_orders/.test(
      status
    );
  }

  function decorate() {
    var floor = root.querySelector(
      '[data-pmd-r2-floor]'
    );

    if (!floor) {
      return;
    }

    var nodes = Array.prototype.slice.call(
      floor.querySelectorAll([
        '[data-table]',
        '[data-table-id]',
        '[data-table-number]',
        '.pmd-r2-table',
        'button'
      ].join(','))
    );

    nodes.forEach(function (node) {
      var number = tableNumber(node);

      if (!number) {
        return;
      }

      var matching = reservationsForTable(number);

      node.classList.remove(
        'pmd-r3-table-free',
        'pmd-r3-table-reserved',
        'pmd-r3-table-busy',
        'pmd-r3-table-selected'
      );

      if (busy(node)) {
        node.classList.add('pmd-r3-table-busy');
      } else if (matching.length) {
        node.classList.add('pmd-r3-table-reserved');
      } else {
        node.classList.add('pmd-r3-table-free');
      }

      if (selectedTable === number) {
        node.classList.add('pmd-r3-table-selected');
      }

      node.setAttribute(
        'data-pmd-r3-table',
        number
      );
    });
  }

  function selectionPanel() {
    var panel = root.querySelector(
      '[data-pmd-r3-selection]'
    );

    if (panel) {
      return panel;
    }

    panel = document.createElement('section');
    panel.className = 'pmd-r3-selection';
    panel.setAttribute(
      'data-pmd-r3-selection',
      ''
    );

    panel.innerHTML = [
      '<div class="pmd-r3-selection__header">',
        '<div class="pmd-r3-selection__title">',
          '<h2 data-pmd-r3-title>Select a table</h2>',
          '<p data-pmd-r3-subtitle>',
            'Click a table on the floor to view its reservations.',
          '</p>',
        '</div>',
        '<a class="pmd-r3-create"',
          ' data-pmd-r3-create',
          ' aria-disabled="true"',
          ' href="#">',
          '＋ New reservation',
        '</a>',
      '</div>',
      '<div class="pmd-r3-selection__body"',
        ' data-pmd-r3-body>',
        '<div class="pmd-r3-empty">',
          'No table selected.',
        '</div>',
      '</div>'
    ].join('');

    var workspace = root.querySelector(
      '.pmd-r2__workspace'
    );

    if (workspace) {
      workspace.insertAdjacentElement(
        'afterend',
        panel
      );
    } else {
      root.appendChild(panel);
    }

    return panel;
  }

  function escapeHtml(input) {
    return value(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
      'party_size'
    ]);

    var date = pick(reservation, [
      'reserve_date',
      'reservation_date',
      'date'
    ]);

    var time = pick(reservation, [
      'reserve_time',
      'reservation_time',
      'time'
    ]);

    var editBase = value(
      boot.editBaseUrl || ''
    ).replace(/\/$/, '');

    var meta = [];

    if (id !== null && id !== undefined) {
      meta.push('#' + escapeHtml(id));
    }

    if (guests !== null && guests !== undefined) {
      meta.push(
        escapeHtml(guests) + ' guests'
      );
    }

    if (date) {
      meta.push(escapeHtml(date));
    }

    if (time) {
      meta.push(escapeHtml(time));
    }

    return [
      '<a class="pmd-r3-card"',
        ' href="',
        escapeHtml(
          editBase + '/' + value(id)
        ),
        '">',

        '<div class="pmd-r3-card__top">',
          '<span class="pmd-r3-card__name">',
            escapeHtml(name),
          '</span>',
          '<span class="pmd-r3-card__status">',
            escapeHtml(status),
          '</span>',
        '</div>',

        '<div class="pmd-r3-card__meta">',
          meta.map(function (item) {
            return '<span>' + item + '</span>';
          }).join(''),
        '</div>',

      '</a>'
    ].join('');
  }

  function renderSelection() {
    var panel = selectionPanel();

    var title = panel.querySelector(
      '[data-pmd-r3-title]'
    );

    var subtitle = panel.querySelector(
      '[data-pmd-r3-subtitle]'
    );

    var body = panel.querySelector(
      '[data-pmd-r3-body]'
    );

    var create = panel.querySelector(
      '[data-pmd-r3-create]'
    );

    if (!selectedTable) {
      title.textContent = 'Select a table';

      subtitle.textContent =
        'Click a table on the floor to view its reservations.';

      body.innerHTML =
        '<div class="pmd-r3-empty">' +
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
      reservationsForTable(selectedTable);

    title.textContent =
      'Table ' + selectedTable;

    subtitle.textContent = matching.length
      ? matching.length +
        (
          matching.length === 1
            ? ' reservation'
            : ' reservations'
        )
      : 'No reservations assigned to this table';

    var createUrl = value(
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
      encodeURIComponent(selectedTable) +
      '&table_number=' +
      encodeURIComponent(selectedTable);

    create.removeAttribute('aria-disabled');

    if (!matching.length) {
      body.innerHTML =
        '<div class="pmd-r3-empty">' +
        'Table ' +
        escapeHtml(selectedTable) +
        ' has no reservations.' +
        '</div>';

      return;
    }

    body.innerHTML =
      '<div class="pmd-r3-cards">' +
      matching.map(reservationCard).join('') +
      '</div>';
  }

  root.addEventListener(
    'click',
    function (event) {
      var node = tableNode(event.target);

      if (!node) {
        return;
      }

      var number = tableNumber(node);

      if (!number) {
        return;
      }

      selectedTable = number;

      decorate();
      renderSelection();
    },
    true
  );

  var observer = new MutationObserver(function () {
    window.clearTimeout(
      window.PMDReservations3WorkflowV1
        .mutationTimer
    );

    window.PMDReservations3WorkflowV1
      .mutationTimer = window.setTimeout(
        decorate,
        40
      );
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });

  window.PMDReservations3WorkflowV1 = {
    version: '1.0.0',
    decorate: decorate,
    selectTable: function (number) {
      selectedTable = normalizeTable(number);
      decorate();
      renderSelection();
    },
    getSelectedTable: function () {
      return selectedTable;
    },
    mutationTimer: null
  };

  selectionPanel();

  window.setTimeout(decorate, 100);
  window.setTimeout(decorate, 350);
  window.setTimeout(decorate, 900);

  console.info(
    '[PMD Reservations3 Workflow V1] Ready',
    {
      reservations: reservations.length,
      iframe: false,
      waiterDomClone: false,
      sideMenuChanged: false,
      headerChanged: false
    }
  );
})();
