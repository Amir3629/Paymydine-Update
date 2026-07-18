(function () {
  'use strict';

  if (window.PMDReservationFloorV4)
    return;

  window.PMDReservationFloorV4 = {
    version: '4.3.0',
    authority: true
  };

  window.PMDReservationFloorV41Authority = true;

  var FRAME_WIDTH = 1700;
  var FRAME_HEIGHT = 900;

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
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

  function ensureLegacyDummy(panel) {
    if (
      panel.querySelector(
        '.pmd-res-v4-legacy-floor-dummy'
      )
    ) {
      return;
    }

    var dummy = document.createElement('div');

    dummy.className =
      'pmd-res-v3-floor ' +
      'pmd-res-v4-legacy-floor-dummy';

    panel.appendChild(dummy);
  }

  function build(panel) {
    var previous =
      panel.querySelector('.pmd-res-v4');

    if (previous)
      previous.remove();

    ensureLegacyDummy(panel);

    var shell = document.createElement('section');

    shell.className = 'pmd-res-v4';

    shell.innerHTML = [
      '<header class="pmd-res-v4-head">',

        '<div class="pmd-res-v4-title">',
          '<strong>Restaurant Floor</strong>',
          '<span>',
            'Click a table to view or create reservations',
          '</span>',
        '</div>',

        '<button ',
          'type="button" ',
          'class="pmd-res-v4-reload"',
        '>',
          refreshIcon(),
          '<span>Reload floor</span>',
        '</button>',

      '</header>',

      '<div class="pmd-res-v4-stage">',

        '<div class="pmd-res-v4-loading">',
          'Loading the restaurant floor…',
        '</div>',

        '<div class="pmd-res-v4-frame-shell">',
          '<iframe ',
            'class="pmd-res-v4-frame" ',
            'title="Restaurant floor" ',
            'src="about:blank"',
          '></iframe>',
        '</div>',

        '<aside ',
          'class="pmd-res-v4-table-panel" ',
          'hidden',
        '>',
          '<div class="pmd-res-v4-table-head">',

            '<div>',
              '<small>Selected table</small>',
              '<strong data-pmd-v4-table-title>',
                'Table',
              '</strong>',
            '</div>',

            '<button ',
              'type="button" ',
              'class="pmd-res-v4-close"',
            '>×</button>',

          '</div>',

          '<div class="pmd-res-v4-table-message">',
            'No reservation assigned to this table.',
          '</div>',

          '<a ',
            'class="pmd-res-v4-create" ',
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

  function scale(shell, width, height) {
    var stage =
      shell.querySelector('.pmd-res-v4-stage');

    var frameShell =
      shell.querySelector(
        '.pmd-res-v4-frame-shell'
      );

    if (!stage || !frameShell)
      return;

    width = Math.max(width || FRAME_WIDTH, 1);
    height = Math.max(height || FRAME_HEIGHT, 1);

    frameShell.style.width = width + 'px';
    frameShell.style.height = height + 'px';

    var availableWidth =
      Math.max(stage.clientWidth, 1);

    var availableHeight =
      Math.max(stage.clientHeight, 1);

    var factor = Math.min(
      availableWidth / width,
      availableHeight / height
    );

    factor = Math.max(
      Math.min(factor, 1),
      0.35
    );

    frameShell.style.transform =
      'scale(' + factor + ')';

    frameShell.style.left =
      Math.max(
        0,
        (availableWidth - width * factor) / 2
      ) + 'px';

    frameShell.style.top =
      Math.max(
        0,
        (availableHeight - height * factor) / 2
      ) + 'px';
  }

  function showTable(shell, number) {
    var panel =
      shell.querySelector(
        '.pmd-res-v4-table-panel'
      );

    var title =
      shell.querySelector(
        '[data-pmd-v4-table-title]'
      );

    var create =
      shell.querySelector(
        '.pmd-res-v4-create'
      );

    if (!panel || !title || !create)
      return;

    title.textContent =
      'Table ' + number;

    create.href =
      '/admin/reservations/create' +
      '?table=' +
      encodeURIComponent(number);

    create.textContent =
      'Create reservation for Table ' +
      number;

    panel.hidden = false;
  }

  function freezeRealFloor(shell, frame) {
    var frameWindow = frame.contentWindow;
    var frameDocument = frame.contentDocument;

    if (!frameWindow || !frameDocument)
      return false;

    var map =
      frameDocument.querySelector(
        '.pmd-w5-floor-map-real' +
        '[data-pmd-v159-full-floor="1"]' +
        '[data-pmd-v160-layout-authority="1"]'
      ) ||
      frameDocument.querySelector(
        '.pmd-w5-floor-map-real' +
        '[data-pmd-v159-full-floor="1"]'
      ) ||
      frameDocument.querySelector(
        '.pmd-w5-floor-map-real'
      );

    if (!map)
      return false;

    var tables = Array.prototype.slice.call(
      map.querySelectorAll(
        '.pmd-w5-table[data-table]'
      )
    );

    if (tables.length < 20)
      return false;

    var mapRect =
      map.getBoundingClientRect();

    if (
      mapRect.width < 800 ||
      mapRect.height < 400
    ) {
      return false;
    }

    /*
     * Freeze every table using its real rendered rectangle.
     * Percentage rules, transforms and parent dependencies
     * are removed after this point.
     */
    var frozen = tables.map(function (table) {
      var rect =
        table.getBoundingClientRect();

      return {
        table: table,
        number:
          table.getAttribute('data-table'),

        left:
          rect.left - mapRect.left,

        top:
          rect.top - mapRect.top,

        width:
          rect.width,

        height:
          rect.height
      };
    });

    /*
     * Reject a broken one-row result.
     */
    var verticalRange =
      Math.max.apply(
        Math,
        frozen.map(function (item) {
          return item.top;
        })
      ) -
      Math.min.apply(
        Math,
        frozen.map(function (item) {
          return item.top;
        })
      );

    if (verticalRange < 250)
      return false;

    /*
     * V4.2:
     * Crop the source Canvas to the real table bounds.
     * This removes large blank areas above/below the tables.
     */
    var cropPadding = 42;

    var minimumLeft = Math.min.apply(
      Math,
      frozen.map(function (item) {
        return item.left;
      })
    );

    var minimumTop = Math.min.apply(
      Math,
      frozen.map(function (item) {
        return item.top;
      })
    );

    var maximumRight = Math.max.apply(
      Math,
      frozen.map(function (item) {
        return item.left + item.width;
      })
    );

    var maximumBottom = Math.max.apply(
      Math,
      frozen.map(function (item) {
        return item.top + item.height;
      })
    );

    var cropLeft = Math.max(
      0,
      minimumLeft - cropPadding
    );

    var cropTop = Math.max(
      0,
      minimumTop - cropPadding
    );

    var cropRight = Math.min(
      mapRect.width,
      maximumRight + cropPadding
    );

    var cropBottom = Math.min(
      mapRect.height,
      maximumBottom + cropPadding
    );

    var croppedWidth = Math.max(
      400,
      Math.ceil(cropRight - cropLeft)
    );

    var croppedHeight = Math.max(
      300,
      Math.ceil(cropBottom - cropTop)
    );

    frozen.forEach(function (item) {
      var table = item.table;

      /*
       * V4.3:
       * Reservation Floor only needs the physical table,
       * its table number and small visual badges.
       *
       * Remove waiter/order workflow labels that overlap
       * the number when the Floor is scaled.
       */
      Array.prototype.slice.call(
        table.querySelectorAll('*')
      )
        .reverse()
        .forEach(function (node) {
          if (
            node.querySelector &&
            node.querySelector(
              '.pmd-w5-table[data-table]'
            )
          ) {
            return;
          }

          var nodeText = clean(
            node.textContent
          );

          if (!nodeText)
            return;

          if (
            /^(occupied|available|reserved|seated)$/i.test(
              nodeText
            ) ||
            /^(unpaid|paid|partial|payment due)$/i.test(
              nodeText
            ) ||
            /^(new|received|accepted|preparing|ready|served)$/i.test(
              nodeText
            ) ||
            /^(needs cleaning|cleaning|not ready)$/i.test(
              nodeText
            ) ||
            /^\d+\s*-\s*\d+$/.test(
              nodeText
            )
          ) {
            node.remove();
          }
        });

      /*
       * Also remove plain text nodes containing operational
       * words, while preserving numeric table/capacity badges.
       */
      Array.prototype.slice.call(
        table.childNodes
      ).forEach(function (node) {
        if (node.nodeType !== 3)
          return;

        var nodeText = clean(
          node.textContent
        );

        if (
          /occupied|unpaid|paid|partial|new|received|preparing|ready|served|cleaning/i.test(
            nodeText
          )
        ) {
          node.remove();
        }
      });

      table.style.setProperty(
        'position',
        'absolute',
        'important'
      );

      table.style.setProperty(
        'left',
        (item.left - cropLeft) + 'px',
        'important'
      );

      table.style.setProperty(
        'top',
        (item.top - cropTop) + 'px',
        'important'
      );

      table.style.setProperty(
        'width',
        item.width + 'px',
        'important'
      );

      table.style.setProperty(
        'height',
        item.height + 'px',
        'important'
      );

      table.style.setProperty(
        'transform',
        'none',
        'important'
      );

      table.style.setProperty(
        'margin',
        '0',
        'important'
      );

      table.style.removeProperty(
        'display'
      );

      table.style.setProperty(
        'visibility',
        'visible',
        'important'
      );

      table.style.setProperty(
        'opacity',
        '1',
        'important'
      );

      table.style.setProperty(
        'pointer-events',
        'auto',
        'important'
      );
    });

    var naturalWidth =
      croppedWidth;

    var naturalHeight =
      croppedHeight;

    /*
     * Remove document-level layout dependencies.
     */
    map.style.setProperty(
      'position',
      'relative',
      'important'
    );

    map.style.setProperty(
      'display',
      'block',
      'important'
    );

    map.style.setProperty(
      'visibility',
      'visible',
      'important'
    );

    map.style.setProperty(
      'opacity',
      '1',
      'important'
    );

    map.style.setProperty(
      'left',
      '0',
      'important'
    );

    map.style.setProperty(
      'top',
      '0',
      'important'
    );

    map.style.setProperty(
      'width',
      naturalWidth + 'px',
      'important'
    );

    map.style.setProperty(
      'min-width',
      naturalWidth + 'px',
      'important'
    );

    map.style.setProperty(
      'height',
      naturalHeight + 'px',
      'important'
    );

    map.style.setProperty(
      'min-height',
      naturalHeight + 'px',
      'important'
    );

    map.style.setProperty(
      'margin',
      '0',
      'important'
    );

    map.style.setProperty(
      'transform',
      'none',
      'important'
    );

    map.style.setProperty(
      'overflow',
      'hidden',
      'important'
    );

    /*
     * Remove source-only messages and legends.
     * Never remove an element containing an actual table.
     */
    Array.prototype.slice.call(
      map.querySelectorAll('*')
    )
      .reverse()
      .forEach(function (node) {
        if (
          node.matches(
            '.pmd-w5-table[data-table]'
          ) ||
          node.querySelector(
            '.pmd-w5-table[data-table]'
          )
        ) {
          return;
        }

        var nodeText = clean(
          node.textContent
        );

        if (
          /no tables found in ti_tables/i.test(
            nodeText
          ) ||
          /floor status/i.test(
            nodeText
          ) ||
          /ready for a guest/i.test(
            nodeText
          ) ||
          /guest is using the table/i.test(
            nodeText
          ) ||
          /not ready for seating/i.test(
            nodeText
          ) ||
          /held for an arrival/i.test(
            nodeText
          ) ||
          /payment ribbon appears/i.test(
            nodeText
          )
        ) {
          node.remove();
        }
      });

    /*
     * Remove naked text nodes that are not inside table cards.
     */
    Array.prototype.slice.call(
      map.childNodes
    ).forEach(function (node) {
      if (
        node.nodeType === 3 &&
        clean(node.textContent)
      ) {
        node.remove();
      }
    });

    var isolationStyle =
      frameDocument.createElement('style');

    isolationStyle.id =
      'pmd-reservation-floor-v4-isolation';

    isolationStyle.textContent = [
      'html,body{',
        'width:', naturalWidth, 'px!important;',
        'min-width:', naturalWidth, 'px!important;',
        'height:', naturalHeight, 'px!important;',
        'min-height:', naturalHeight, 'px!important;',
        'margin:0!important;',
        'padding:0!important;',
        'overflow:hidden!important;',
        'background:#fff!important;',
      '}',

      'body>*{',
        'display:none!important;',
      '}',

      'body>.pmd-w5-floor-map-real{',
        'display:block!important;',
      '}',

      '.pmd-v191-floor-control-dock,',
      '.pmd-w19-tools,',
      '[data-w19-edit],',
      '[data-w19-save],',
      '[data-w19-merge],',
      '[data-w19-compact],',
      '.pmd-v155-table-actions{',
        'display:none!important;',
      '}'
    ].join('');

    frameDocument.head.appendChild(
      isolationStyle
    );

    frameDocument.body.appendChild(map);

    /*
     * Reservation-safe click interception.
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
          table.getAttribute('data-table');

        if (number)
          showTable(shell, number);
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

    frame.style.width =
      naturalWidth + 'px';

    frame.style.height =
      naturalHeight + 'px';

    scale(
      shell,
      naturalWidth,
      naturalHeight
    );

    var loading =
      shell.querySelector(
        '.pmd-res-v4-loading'
      );

    if (loading)
      loading.hidden = true;

    console.info(
      '[PMD Reservations Floor V4.3] Ready',
      {
        source:
          '/admin/dashboardwaiter',

        tables:
          tables.length,

        mapWidth:
          naturalWidth,

        mapHeight:
          naturalHeight,

        verticalRange:
          Math.round(verticalRange),

        crop: {
          left: Math.round(cropLeft),
          top: Math.round(cropTop),
          width: naturalWidth,
          height: naturalHeight
        },

        cloneUsed:
          false,

        coordinatesFrozen:
          true,

        orderingBlocked:
          true
      }
    );

    return true;
  }

  function load(shell) {
    var frame =
      shell.querySelector(
        '.pmd-res-v4-frame'
      );

    var loading =
      shell.querySelector(
        '.pmd-res-v4-loading'
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
      '?reservationFloorV4=' +
      Date.now();

    frame.addEventListener(
      'load',
      function onLoad() {
        var authorityObserver =
    new MutationObserver(function () {
      removeLegacyFloorInstances();

      var shell =
        document.querySelector(
          '#pmd-res-v3-workspace .pmd-res-v4'
        );

      if (shell) {
        shell.style.setProperty(
          'display',
          'grid',
          'important'
        );

        shell.style.setProperty(
          'visibility',
          'visible',
          'important'
        );

        shell.style.setProperty(
          'opacity',
          '1',
          'important'
        );

        shell.style.setProperty(
          'z-index',
          '50',
          'important'
        );
      }
    });

  authorityObserver.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  var attempts = 0;

        var timer = setInterval(
          function () {
            attempts += 1;

            try {
              if (
                freezeRealFloor(
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
                '[PMD Reservations Floor V4] ' +
                'Initialization failed',
                error
              );

              if (loading) {
                loading.hidden = false;
                loading.textContent =
                  'The restaurant floor could not be initialized.';
              }

              return;
            }

            if (attempts >= 180) {
              clearInterval(timer);

              if (loading) {
                loading.hidden = false;
                loading.textContent =
                  'The correct 20-table floor did not become ready.';
              }

              console.error(
                '[PMD Reservations Floor V4] ' +
                'Timed out waiting for the full floor.'
              );
            }
          },
          120
        );
      },
      { once: true }
    );
  }

  function removeLegacyFloorInstances() {
    var keepFrame = document.querySelector(
      '.pmd-res-v4-frame'
    );

    Array.prototype.forEach.call(
      document.querySelectorAll('iframe'),
      function (frame) {
        if (frame === keepFrame)
          return;

        var src =
          frame.getAttribute('src') || '';

        if (
          /\/admin\/dashboardwaiter/i.test(src) &&
          (
            /reservation/i.test(src) ||
            frame.closest(
              '#pmd-res-v3-workspace'
            )
          )
        ) {
          frame.remove();
        }
      }
    );

    var panel = document.querySelector(
      '#pmd-res-v3-workspace ' +
      '.pmd-res-v3-floor-panel'
    );

    if (!panel)
      return;

    Array.prototype.forEach.call(
      panel.children,
      function (child) {
        if (
          child.classList.contains(
            'pmd-res-v4'
          )
        ) {
          return;
        }

        if (
          child.matches(
            [
              '.pmd-res-v33-exact-waiter-floor',
              '.pmd-res-v33-floor-viewport',
              '.pmd-res-v3-floor-scroll',
              '.pmd-owner-floor-v60',
              '.pmd-owner-floor-v60--reservation'
            ].join(',')
          )
        ) {
          child.remove();
        }
      }
    );
  }

  function boot() {
    removeLegacyFloorInstances();

    var panel = floorPanel();

    if (!panel)
      return false;

    var existing =
      panel.querySelector('.pmd-res-v4');

    if (existing) {
      existing.style.setProperty(
        'display',
        'grid',
        'important'
      );

      return true;
    }

    var shell = build(panel);

    var reload =
      shell.querySelector(
        '.pmd-res-v4-reload'
      );

    var close =
      shell.querySelector(
        '.pmd-res-v4-close'
      );

    if (reload) {
      reload.addEventListener(
        'click',
        function () {
          load(shell);
        }
      );
    }

    if (close) {
      close.addEventListener(
        'click',
        function () {
          var tablePanel =
            shell.querySelector(
              '.pmd-res-v4-table-panel'
            );

          if (tablePanel)
            tablePanel.hidden = true;
        }
      );
    }

    var resizeObserver =
      new ResizeObserver(function () {
        var frame =
          shell.querySelector(
            '.pmd-res-v4-frame'
          );

        var width =
          parseFloat(frame.style.width) ||
          FRAME_WIDTH;

        var height =
          parseFloat(frame.style.height) ||
          FRAME_HEIGHT;

        scale(
          shell,
          width,
          height
        );
      });

    resizeObserver.observe(
      shell.querySelector(
        '.pmd-res-v4-stage'
      )
    );

    load(shell);

    return true;
  }

  var attempts = 0;

  var timer = setInterval(function () {
    attempts += 1;

    if (boot() || attempts >= 150) {
      clearInterval(timer);
    }
  }, 100);
})();
