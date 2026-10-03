(function () {
  'use strict';

  if (window.PMDNewReservationFloorV1)
    return;

  window.PMDNewReservationFloorV1 = {
    version: '1.0.0',
    native: true,
    iframe: false,
    clonedMap: false
  };

  var TABLES = [
    { number: 5,  x: 11, y: 25, seats: 2 },
    { number: 6,  x: 25, y: 25, seats: 3 },
    { number: 20, x: 39, y: 25, seats: 2 },
    { number: 8,  x: 53, y: 25, seats: 2 },

    { number: 4,  x: 73, y: 7,  seats: 3 },
    { number: 14, x: 84, y: 5,  seats: 3 },
    { number: 13, x: 94, y: 5,  seats: 3 },

    { number: 19, x: 74, y: 22, seats: 1 },
    { number: 3,  x: 85, y: 24, seats: 4 },

    { number: 7,  x: 6,  y: 52, seats: 3 },
    { number: 11, x: 20, y: 53, seats: 1 },
    { number: 1,  x: 37, y: 51, seats: 5 },
    { number: 18, x: 52, y: 50, seats: 2 },

    { number: 9,  x: 85, y: 46, seats: 7 },
    { number: 15, x: 85, y: 65, seats: 2 },

    { number: 16, x: 20, y: 76, seats: 4 },
    { number: 17, x: 38, y: 76, seats: 1 },
    { number: 12, x: 54, y: 77, seats: 3 },
    { number: 2,  x: 74, y: 76, seats: 3 },
    { number: 10, x: 91, y: 88, seats: 4 }
  ];

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function refreshIcon() {
    return [
      '<svg viewBox="0 0 24 24">',
        '<path d="M20 11a8 8 0 1 0 2 5"/>',
        '<path d="M20 4v7h-7"/>',
      '</svg>'
    ].join('');
  }

  function floorPanel() {
    return document.querySelector(
      '#pmd-res-v3-workspace ' +
      '.pmd-res-v3-floor-panel'
    );
  }

  /*
   * Reads the existing Reservation cards.
   * It does not depend on any old Floor map.
   */
  function extractReservations() {
    var reservations = [];

    var editLinks = Array.prototype.slice.call(
      document.querySelectorAll(
        'a[href*="/admin/reservations/"][href*="/edit"],' +
        'a[href*="/admin/reservations/edit"],' +
        'a[href*="reservations/edit"]'
      )
    );

    var usedContainers = new Set();

    editLinks.forEach(function (link) {
      var container =
        link.closest(
          [
            '.pmd-res-v3-reservation-card',
            '.card',
            '[class*="reservation"]',
            'article',
            'li'
          ].join(',')
        ) ||
        link.parentElement;

      if (!container || usedContainers.has(container))
        return;

      usedContainers.add(container);

      var text = clean(container.textContent);

      var idMatch =
        text.match(
          /reservation\s*id\s*[:#]?\s*(\d+)/i
        ) ||
        link.href.match(
          /reservations\/(?:edit\/)?(\d+)/i
        );

      var tableMatch =
        text.match(
          /\btable\s*[:#]?\s*(\d{1,3})\b/i
        );

      var guestMatch =
        text.match(
          /guest(?:s|\(s\))?\s*[:#]?\s*(\d+)/i
        );

      var timeMatch =
        text.match(
          /\b(?:0?[1-9]|1[0-2]):[0-5]\d\s*(?:am|pm)\b/i
        );

      var statusMatch =
        text.match(
          /\b(complete|pending|confirmed|seated|cancelled|canceled)\b/i
        );

      var nameNode =
        container.querySelector(
          'h1,h2,h3,h4,h5,h6,' +
          '[data-name],' +
          '.name,' +
          '[class*="title"]'
        );

      var name =
        clean(nameNode && nameNode.textContent);

      if (
        !name ||
        /reservation|guest|table|status/i.test(name)
      ) {
        name = 'Reservation';
      }

      reservations.push({
        id: idMatch ? idMatch[1] : '',
        table: tableMatch
          ? Number(tableMatch[1])
          : null,
        guests: guestMatch
          ? Number(guestMatch[1])
          : null,
        time: timeMatch
          ? timeMatch[0]
          : '',
        status: statusMatch
          ? statusMatch[1].toLowerCase()
          : '',
        name: name,
        editUrl: link.href
      });
    });

    return reservations;
  }

  function statusForTable(tableNumber, reservations) {
    var matches = reservations.filter(
      function (reservation) {
        return reservation.table === tableNumber;
      }
    );

    if (!matches.length)
      return 'free';

    var seated = matches.some(function (reservation) {
      return reservation.status === 'seated';
    });

    if (seated)
      return 'occupied';

    return 'reserved';
  }

  function createShell(panel) {
    panel
      .querySelectorAll(
        '.pmd-new-res-floor'
      )
      .forEach(function (node) {
        node.remove();
      });

    panel
      .querySelectorAll('iframe')
      .forEach(function (frame) {
        frame.remove();
      });

    var shell =
      document.createElement('section');

    shell.className =
      'pmd-new-res-floor';

    shell.innerHTML = [
      '<header class="pmd-new-res-floor__header">',

        '<div class="pmd-new-res-floor__title">',
          '<strong>Restaurant Floor</strong>',
          '<span>',
            'Select a table to view or create reservations',
          '</span>',
        '</div>',

        '<div class="pmd-new-res-floor__actions">',
          '<button ',
            'type="button" ',
            'class="pmd-new-res-floor__button" ',
            'data-pmd-new-floor-refresh',
          '>',
            refreshIcon(),
            '<span>Refresh</span>',
          '</button>',
        '</div>',

      '</header>',

      '<div class="pmd-new-res-floor__workspace">',

        '<div class="pmd-new-res-floor__canvas"></div>',

        '<div class="pmd-new-res-floor__legend">',

          '<span class="' +
            'pmd-new-res-floor__legend-item ' +
            'pmd-new-res-floor__legend-item--free' +
          '">',
            '<i class="pmd-new-res-floor__legend-dot"></i>',
            'Free',
          '</span>',

          '<span class="' +
            'pmd-new-res-floor__legend-item ' +
            'pmd-new-res-floor__legend-item--reserved' +
          '">',
            '<i class="pmd-new-res-floor__legend-dot"></i>',
            'Reserved',
          '</span>',

          '<span class="' +
            'pmd-new-res-floor__legend-item ' +
            'pmd-new-res-floor__legend-item--occupied' +
          '">',
            '<i class="pmd-new-res-floor__legend-dot"></i>',
            'Occupied',
          '</span>',

          '<span class="' +
            'pmd-new-res-floor__legend-item ' +
            'pmd-new-res-floor__legend-item--cleaning' +
          '">',
            '<i class="pmd-new-res-floor__legend-dot"></i>',
            'Needs cleaning',
          '</span>',

        '</div>',

        '<aside class="pmd-new-res-drawer" hidden>',

          '<div class="pmd-new-res-drawer__header">',
            '<div>',
              '<small>Selected table</small>',
              '<strong data-pmd-new-floor-title>',
                'Table',
              '</strong>',
            '</div>',

            '<button ',
              'type="button" ',
              'class="pmd-new-res-drawer__close"',
            '>×</button>',
          '</div>',

          '<div class="pmd-new-res-drawer__body"></div>',

          '<div class="pmd-new-res-drawer__actions"></div>',

        '</aside>',

      '</div>'
    ].join('');

    panel.appendChild(shell);

    return shell;
  }

  function renderTables(shell) {
    var canvas =
      shell.querySelector(
        '.pmd-new-res-floor__canvas'
      );

    if (!canvas)
      return;

    var reservations =
      extractReservations();

    canvas.innerHTML = '';

    TABLES.forEach(function (table) {
      var button =
        document.createElement('button');

      var status =
        statusForTable(
          table.number,
          reservations
        );

      button.type = 'button';

      button.className =
        'pmd-new-res-table';

      button.dataset.table =
        String(table.number);

      button.dataset.status =
        status;

      button.setAttribute(
        'aria-label',
        'Table ' + table.number
      );

      button.style.left =
        'clamp(0px, ' +
        table.x +
        '%, calc(100% - 92px))';

      button.style.top =
        'clamp(0px, ' +
        table.y +
        '%, calc(100% - 76px))';

      button.innerHTML = [
        '<span class="pmd-new-res-table__number">',
          table.number,
        '</span>',

        '<span class="pmd-new-res-table__capacity">',
          table.seats,
        '</span>',

        '<i class="pmd-new-res-table__status-dot"></i>'
      ].join('');

      button.addEventListener(
        'click',
        function () {
          openDrawer(
            shell,
            table,
            reservations
          );
        }
      );

      canvas.appendChild(button);
    });

    console.info(
      '[PMD New Reservation Floor V1] Rendered',
      {
        tables: TABLES.length,
        reservations:
          reservations.length,
        iframeCount:
          document.querySelectorAll(
            '#pmd-res-v3-workspace iframe'
          ).length,
        independent:
          true
      }
    );
  }

  function openDrawer(
    shell,
    table,
    reservations
  ) {
    var drawer =
      shell.querySelector(
        '.pmd-new-res-drawer'
      );

    var title =
      shell.querySelector(
        '[data-pmd-new-floor-title]'
      );

    var body =
      shell.querySelector(
        '.pmd-new-res-drawer__body'
      );

    var actions =
      shell.querySelector(
        '.pmd-new-res-drawer__actions'
      );

    if (
      !drawer ||
      !title ||
      !body ||
      !actions
    ) {
      return;
    }

    var matches =
      reservations.filter(
        function (reservation) {
          return reservation.table ===
            table.number;
        }
      );

    title.textContent =
      'Table ' + table.number;

    if (!matches.length) {
      body.innerHTML = [
        '<div class="pmd-new-res-drawer__state">',
          'No reservation is assigned to this table.',
        '</div>'
      ].join('');
    }
    else {
      body.innerHTML = [
        '<div class="pmd-new-res-drawer__state">',
          matches.length,
          matches.length === 1
            ? ' reservation found.'
            : ' reservations found.',
        '</div>',

        matches.map(function (reservation) {
          return [
            '<div class="pmd-new-res-drawer__reservation">',

              '<strong>',
                escapeHtml(reservation.name),
              '</strong>',

              '<span>',
                reservation.guests
                  ? reservation.guests + ' guests'
                  : 'Guest count unavailable',

                reservation.time
                  ? ' · ' + escapeHtml(reservation.time)
                  : '',
              '</span>',

            '</div>'
          ].join('');
        }).join('')
      ].join('');
    }

    var createUrl =
      '/admin/reservations/create' +
      '?table=' +
      encodeURIComponent(table.number);

    actions.innerHTML = [
      '<a ',
        'class="pmd-new-res-drawer__create" ',
        'href="' + createUrl + '"',
      '>',
        '+ Create reservation for Table ',
        table.number,
      '</a>',

      matches.length && matches[0].editUrl
        ? [
            '<a ',
              'class="pmd-new-res-drawer__edit" ',
              'href="' +
                escapeHtml(
                  matches[0].editUrl
                ) +
              '"',
            '>',
              'Edit reservation',
            '</a>'
          ].join('')
        : ''
    ].join('');

    drawer.hidden = false;
  }

  function boot() {
    var panel = floorPanel();

    if (!panel)
      return false;

    /*
     * Remove every obsolete Floor node and iframe.
     */
    panel
      .querySelectorAll(
        [
          '.pmd-res-v4',
          '.pmd-res-v33-exact-waiter-floor',
          '.pmd-res-v33-floor-viewport',
          '.pmd-owner-floor-v60',
          '.pmd-owner-floor-v60--reservation',
          'iframe'
        ].join(',')
      )
      .forEach(function (node) {
        node.remove();
      });

    var shell = createShell(panel);

    var close =
      shell.querySelector(
        '.pmd-new-res-drawer__close'
      );

    var refresh =
      shell.querySelector(
        '[data-pmd-new-floor-refresh]'
      );

    if (close) {
      close.addEventListener(
        'click',
        function () {
          var drawer =
            shell.querySelector(
              '.pmd-new-res-drawer'
            );

          if (drawer)
            drawer.hidden = true;
        }
      );
    }

    if (refresh) {
      refresh.addEventListener(
        'click',
        function () {
          renderTables(shell);
        }
      );
    }

    renderTables(shell);

    return true;
  }

  var attempts = 0;

  var timer = setInterval(function () {
    attempts += 1;

    if (
      boot() ||
      attempts >= 150
    ) {
      clearInterval(timer);
    }
  }, 100);
})();
