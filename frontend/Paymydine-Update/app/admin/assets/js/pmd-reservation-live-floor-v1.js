(function () {
  'use strict';

  if (window.PMDReservationLiveFloorV1)
    return;

  window.PMDReservationLiveFloorV1 = {
    version: '1.0.0'
  };

  var FRAME_WIDTH = 1600;
  var FRAME_HEIGHT = 900;

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function svgRefresh() {
    return (
      '<svg viewBox="0 0 24 24">' +
        '<path d="M20 11a8 8 0 1 0 2 5"/>' +
        '<path d="M20 4v7h-7"/>' +
      '</svg>'
    );
  }

  function findFloorPanel() {
    return document.querySelector(
      '#pmd-res-v3-workspace ' +
      '.pmd-res-v3-floor-panel'
    );
  }

  function createShell(panel) {
    var old = panel.querySelector(
      '.pmd-res-live-floor-v1'
    );

    if (old)
      old.remove();

    var shell = document.createElement('section');

    shell.className =
      'pmd-res-live-floor-v1';

    shell.innerHTML = [
      '<header class="pmd-res-live-floor-head">',

        '<div class="pmd-res-live-floor-title">',
          '<strong>Restaurant Floor</strong>',
          '<span>',
            'Live floor from the waiter dashboard. ',
            'Click a table to manage reservations.',
          '</span>',
        '</div>',

        '<button ',
          'type="button" ',
          'class="pmd-res-live-floor-reload"',
        '>',
          svgRefresh(),
          '<span>Reload floor</span>',
        '</button>',

      '</header>',

      '<div class="pmd-res-live-floor-stage">',

        '<div class="pmd-res-live-floor-loading">',
          'Loading the restaurant floor…',
        '</div>',

        '<div class="pmd-res-live-floor-frame-shell">',
          '<iframe ',
            'class="pmd-res-live-floor-frame" ',
            'title="Restaurant floor" ',
            'src="about:blank"',
          '></iframe>',
        '</div>',

        '<aside ',
          'class="pmd-res-live-table-panel" ',
          'hidden',
        '>',
          '<header>',
            '<div>',
              '<small>Selected table</small>',
              '<strong data-live-table-title>Table</strong>',
            '</div>',

            '<button ',
              'type="button" ',
              'class="pmd-res-live-table-close"',
            '>×</button>',
          '</header>',

          '<div class="pmd-res-live-table-body">',
            '<div class="pmd-res-live-table-empty">',
              'Choose a table to view or create a reservation.',
            '</div>',
          '</div>',

          '<a ',
            'class="pmd-res-live-create" ',
            'href="/admin/reservations/create"',
          '>',
            'Create reservation',
          '</a>',
        '</aside>',

      '</div>'
    ].join('');

    panel.appendChild(shell);

    return shell;
  }

  function scaleFrame(shell) {
    var stage = shell.querySelector(
      '.pmd-res-live-floor-stage'
    );

    var frameShell = shell.querySelector(
      '.pmd-res-live-floor-frame-shell'
    );

    if (!stage || !frameShell)
      return;

    var availableWidth =
      Math.max(stage.clientWidth, 1);

    var availableHeight =
      Math.max(stage.clientHeight, 1);

    var scale = Math.min(
      availableWidth / FRAME_WIDTH,
      availableHeight / FRAME_HEIGHT
    );

    /*
     * The floor should remain readable.
     * Small screens may scroll inside the overall page.
     */
    scale = Math.max(scale, 0.5);

    frameShell.style.transform =
      'scale(' + scale + ')';

    frameShell.style.left =
      Math.max(
        0,
        (availableWidth - FRAME_WIDTH * scale) / 2
      ) + 'px';

    frameShell.style.top =
      Math.max(
        0,
        (availableHeight - FRAME_HEIGHT * scale) / 2
      ) + 'px';
  }

  function showTablePanel(shell, tableNumber) {
    var panel = shell.querySelector(
      '.pmd-res-live-table-panel'
    );

    var title = shell.querySelector(
      '[data-live-table-title]'
    );

    var create = shell.querySelector(
      '.pmd-res-live-create'
    );

    if (!panel || !title || !create)
      return;

    title.textContent =
      'Table ' + tableNumber;

    create.href =
      '/admin/reservations/create' +
      '?table=' +
      encodeURIComponent(tableNumber);

    create.textContent =
      'Create reservation for Table ' +
      tableNumber;

    panel.hidden = false;
  }

  function installFrameGuards(shell, frame) {
    var frameWindow = frame.contentWindow;
    var frameDocument = frame.contentDocument;

    if (!frameWindow || !frameDocument)
      return false;

    var floor =
      frameDocument.querySelector(
        '.pmd-w5-floor-map-real' +
        '[data-pmd-v159-full-floor="1"]'
      ) ||
      frameDocument.querySelector(
        '.pmd-w5-floor-map-real'
      );

    if (!floor)
      return false;

    var style =
      frameDocument.createElement('style');

    style.id =
      'pmd-reservation-live-floor-frame-style';

    style.textContent = [
      'html,body{',
        'width:1600px!important;',
        'min-width:1600px!important;',
        'height:900px!important;',
        'min-height:900px!important;',
        'margin:0!important;',
        'padding:0!important;',
        'overflow:hidden!important;',
        'background:#fff!important;',
      '}',

      'body>*{',
        'display:none!important;',
      '}',

      '.pmd-w5-floor-map-real,',
      '.pmd-w5-floor-map-real *{',
        'box-sizing:border-box;',
      '}',

      '.pmd-w5-floor-map-real{',
        'position:absolute!important;',
        'display:block!important;',
        'visibility:visible!important;',
        'opacity:1!important;',
        'top:0!important;',
        'left:0!important;',
        'width:1600px!important;',
        'min-width:1600px!important;',
        'height:900px!important;',
        'min-height:900px!important;',
        'margin:0!important;',
        'overflow:hidden!important;',
        'background:#fff!important;',
      '}',

      '.pmd-w5-floor-map-real,',
      '.pmd-w5-floor-map-real ' +
      '.pmd-w5-table[data-table]{',
        'pointer-events:auto!important;',
      '}',

      '.pmd-w19-tools,',
      '.pmd-v191-floor-control-dock,',
      '.pmd-v191-control-reserve,',
      '[data-w19-edit],',
      '[data-w19-save],',
      '[data-w19-merge],',
      '[data-w19-compact],',
      '.pmd-v155-table-actions{',
        'display:none!important;',
      '}'
    ].join('');

    frameDocument.head.appendChild(style);

    /*
     * Move the real Floor directly under body.
     * The same element stays live; it is not cloned.
     */
    frameDocument.body.appendChild(floor);

    Array.prototype.forEach.call(
      frameDocument.body.children,
      function (child) {
        if (child === floor)
          child.style.setProperty(
            'display',
            'block',
            'important'
          );
      }
    );

    /*
     * Prevent every ordering/navigation action.
     */
    frameDocument.addEventListener(
      'click',
      function (event) {
        var table =
          event.target.closest(
            '.pmd-w5-table[data-table]'
          );

        if (!table)
          return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        var number =
          table.getAttribute('data-table') ||
          clean(table.textContent).match(/\d+/)?.[0];

        if (!number)
          return;

        showTablePanel(
          shell,
          number
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
      frameDocument.addEventListener(
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

    var loading = shell.querySelector(
      '.pmd-res-live-floor-loading'
    );

    if (loading)
      loading.hidden = true;

    console.info(
      '[PMD Reservations Live Floor V1] Ready',
      {
        source: '/admin/dashboardwaiter',
        tables:
          floor.querySelectorAll(
            '.pmd-w5-table[data-table]'
          ).length,
        cloneUsed: false,
        orderingBlocked: true
      }
    );

    return true;
  }

  function loadFrame(shell) {
    var frame = shell.querySelector(
      '.pmd-res-live-floor-frame'
    );

    var loading = shell.querySelector(
      '.pmd-res-live-floor-loading'
    );

    if (!frame)
      return;

    if (loading) {
      loading.hidden = false;
      loading.textContent =
        'Loading the restaurant floor…';
    }

    frame.src =
      '/admin/dashboardwaiter' +
      '?reservationLiveFloor=' +
      Date.now();

    frame.addEventListener(
      'load',
      function onLoad() {
        var attempts = 0;

        var timer = setInterval(
          function () {
            attempts += 1;

            try {
              if (
                installFrameGuards(
                  shell,
                  frame
                )
              ) {
                clearInterval(timer);
                return;
              }
            }
            catch (error) {
              clearInterval(timer);

              console.error(
                '[PMD Reservations Live Floor V1] ' +
                'Could not initialize frame',
                error
              );

              if (loading) {
                loading.hidden = false;
                loading.textContent =
                  'The restaurant floor could not be loaded.';
              }

              return;
            }

            if (attempts >= 140) {
              clearInterval(timer);

              if (loading) {
                loading.hidden = false;
                loading.textContent =
                  'The waiter floor did not become ready.';
              }
            }
          },
          120
        );
      },
      { once: true }
    );
  }

  function boot() {
    var floorPanel =
      findFloorPanel();

    if (!floorPanel)
      return false;

    var shell =
      createShell(floorPanel);

    var reload = shell.querySelector(
      '.pmd-res-live-floor-reload'
    );

    var close = shell.querySelector(
      '.pmd-res-live-table-close'
    );

    if (reload) {
      reload.addEventListener(
        'click',
        function () {
          loadFrame(shell);
        }
      );
    }

    if (close) {
      close.addEventListener(
        'click',
        function () {
          var panel =
            shell.querySelector(
              '.pmd-res-live-table-panel'
            );

          if (panel)
            panel.hidden = true;
        }
      );
    }

    var resizeObserver =
      new ResizeObserver(function () {
        scaleFrame(shell);
      });

    resizeObserver.observe(
      shell.querySelector(
        '.pmd-res-live-floor-stage'
      )
    );

    scaleFrame(shell);
    loadFrame(shell);

    return true;
  }

  var attempts = 0;

  var timer = setInterval(function () {
    attempts += 1;

    if (boot() || attempts >= 120) {
      clearInterval(timer);
    }
  }, 100);
})();
