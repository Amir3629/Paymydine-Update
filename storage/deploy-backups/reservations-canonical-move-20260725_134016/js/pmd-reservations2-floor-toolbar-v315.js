(function () {
  'use strict';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var TOOLBAR_ID =
    'pmd-r2-floor-toolbar-v315';

  var running = false;
  var observer = null;

  var iconPaths = {
    edit:
      '<path d="M12 20h9"></path>' +
      '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',

    zoomOut:
      '<circle cx="11" cy="11" r="8"></circle>' +
      '<path d="m21 21-4.35-4.35"></path>' +
      '<path d="M8 11h6"></path>',

    fit:
      '<path d="M8 3H5a2 2 0 0 0-2 2v3"></path>' +
      '<path d="M16 3h3a2 2 0 0 1 2 2v3"></path>' +
      '<path d="M8 21H5a2 2 0 0 1-2-2v-3"></path>' +
      '<path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>',

    zoomIn:
      '<circle cx="11" cy="11" r="8"></circle>' +
      '<path d="m21 21-4.35-4.35"></path>' +
      '<path d="M11 8v6"></path>' +
      '<path d="M8 11h6"></path>',

    strip:
      '<rect width="18" height="14" x="3" y="5" rx="2"></rect>' +
      '<path d="M3 10h18"></path>',

    save:
      '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>' +
      '<path d="M17 21v-8H7v8"></path>' +
      '<path d="M7 3v5h8"></path>'
  };

  function floor() {
    return document.getElementById(
      FLOOR_ID
    );
  }

  function svg(name) {
    return (
      '<svg ' +
        'viewBox="0 0 24 24" ' +
        'aria-hidden="true" ' +
        'focusable="false" ' +
        'fill="none" ' +
        'stroke="currentColor" ' +
        'stroke-width="2" ' +
        'stroke-linecap="round" ' +
        'stroke-linejoin="round">' +
        iconPaths[name] +
      '</svg>'
    );
  }

  function removeUnwanted(pageFloor) {
    pageFloor
      .querySelectorAll(
        [
          '[data-floor-mother-action]',
          '[data-floor-merge]',
          '[data-floor-fullscreen]',
          '[data-floor-refresh]'
        ].join(',')
      )
      .forEach(function (button) {
        button.remove();
      });
  }

  function removeOldToolbars(
    pageFloor,
    finalToolbar
  ) {
    pageFloor
      .querySelectorAll(
        [
          '[data-floor-secondary-toolbar]',
          '.pmd-floor-v1__secondary-toolbar',
          '[data-pmd-r2-floor-toolbar-v313]'
        ].join(',')
      )
      .forEach(function (toolbar) {
        if (toolbar !== finalToolbar) {
          toolbar.remove();
        }
      });

    pageFloor
      .querySelectorAll(
        '#' + TOOLBAR_ID
      )
      .forEach(function (
        toolbar,
        index
      ) {
        if (index > 0) {
          toolbar.remove();
        }
      });
  }

  function originalControl(
    pageFloor,
    selector
  ) {
    return pageFloor.querySelector(
      selector
    );
  }

  function clickOriginal(
    pageFloor,
    selector
  ) {
    var original =
      originalControl(
        pageFloor,
        selector
      );

    if (original) {
      original.click();
    }
  }

  function makeButton(options) {
    var button =
      document.createElement(
        'button'
      );

    button.type = 'button';
    button.className =
      'pmd-r2-floor-tool-v315';

    button.setAttribute(
      'data-pmd-r2-tool',
      options.key
    );

    button.setAttribute(
      'title',
      options.title
    );

    button.setAttribute(
      'aria-label',
      options.title
    );

    button.innerHTML =
      svg(options.icon) +
      (
        options.text
          ? '<span>' +
              options.text +
            '</span>'
          : ''
      );

    button.addEventListener(
      'click',
      options.onClick
    );

    return button;
  }

  function ensureToolbar(pageFloor) {
    var statusbar =
      pageFloor.querySelector(
        '.pmd-floor-v1__statusbar'
      );

    if (!statusbar) {
      return null;
    }

    var toolbar =
      document.getElementById(
        TOOLBAR_ID
      );

    if (
      toolbar &&
      toolbar.parentElement !==
        statusbar
    ) {
      toolbar.remove();
      toolbar = null;
    }

    if (!toolbar) {
      toolbar =
        document.createElement(
          'div'
        );

      toolbar.id =
        TOOLBAR_ID;

      toolbar.setAttribute(
        'role',
        'toolbar'
      );

      toolbar.setAttribute(
        'aria-label',
        'Floor map controls'
      );

      toolbar.appendChild(
        makeButton({
          key: 'edit',
          icon: 'edit',
          text: 'Edit',
          title: 'Edit layout',

          onClick: function () {
            clickOriginal(
              pageFloor,
              '[data-floor-edit]'
            );
          }
        })
      );

      toolbar.appendChild(
        makeButton({
          key: 'save',
          icon: 'save',
          text: 'Save',
          title: 'Save layout',

          onClick: function () {
            clickOriginal(
              pageFloor,
              '[data-floor-save]'
            );
          }
        })
      );

      toolbar.appendChild(
        makeButton({
          key: 'zoom-out',
          icon: 'zoomOut',
          text: '',
          title: 'Zoom out',

          onClick: function () {
            clickOriginal(
              pageFloor,
              '[data-floor-zoom-out]'
            );
          }
        })
      );

      toolbar.appendChild(
        makeButton({
          key: 'fit',
          icon: 'fit',
          text: '',
          title: 'Full Floor',

          onClick: function () {
            clickOriginal(
              pageFloor,
              '[data-floor-fit]'
            );
          }
        })
      );

      toolbar.appendChild(
        makeButton({
          key: 'zoom-in',
          icon: 'zoomIn',
          text: '',
          title: 'Zoom in',

          onClick: function () {
            clickOriginal(
              pageFloor,
              '[data-floor-zoom-in]'
            );
          }
        })
      );

      toolbar.appendChild(
        makeButton({
          key: 'strip',
          icon: 'strip',
          text: 'One row',
          title: 'One row tables',

          onClick: function () {
            clickOriginal(
              pageFloor,
              '[data-floor-strip]'
            );
          }
        })
      );

      statusbar.appendChild(
        toolbar
      );
    }

    return toolbar;
  }

  function syncToolbarState(
    pageFloor,
    toolbar
  ) {
    if (!toolbar) {
      return;
    }

    var originalEdit =
      originalControl(
        pageFloor,
        '[data-floor-edit]'
      );

    var originalSave =
      originalControl(
        pageFloor,
        '[data-floor-save]'
      );

    var originalStrip =
      originalControl(
        pageFloor,
        '[data-floor-strip]'
      );

    var edit =
      toolbar.querySelector(
        '[data-pmd-r2-tool="edit"]'
      );

    var save =
      toolbar.querySelector(
        '[data-pmd-r2-tool="save"]'
      );

    var strip =
      toolbar.querySelector(
        '[data-pmd-r2-tool="strip"]'
      );

    var editing =
      originalEdit &&
      originalEdit.getAttribute(
        'aria-pressed'
      ) === 'true';

    if (edit) {
      edit.hidden = editing;
    }

    if (save) {
      save.hidden =
        !editing &&
        (
          !originalSave ||
          originalSave.hidden
        );
    }

    if (strip && originalStrip) {
      var pressed =
        originalStrip.getAttribute(
          'aria-pressed'
        ) === 'true';

      strip.setAttribute(
        'aria-pressed',
        pressed ? 'true' : 'false'
      );

      var label =
        strip.querySelector('span');

      if (label) {
        label.textContent =
          pressed
            ? 'Floor'
            : 'One row';
      }
    }
  }

  function run() {
    if (running) {
      return;
    }

    var pageFloor = floor();

    if (!pageFloor) {
      return;
    }

    running = true;

    try {
      var toolbar =
        ensureToolbar(
          pageFloor
        );

      removeUnwanted(
        pageFloor
      );

      removeOldToolbars(
        pageFloor,
        toolbar
      );

      syncToolbarState(
        pageFloor,
        toolbar
      );

      pageFloor.setAttribute(
        'data-pmd-r2-toolbar-authority',
        'v315'
      );
    } finally {
      running = false;
    }
  }

  function boot() {
    run();

    var pageFloor = floor();

    if (!pageFloor) {
      return;
    }

    observer =
      new MutationObserver(
        function () {
          window.requestAnimationFrame(
            run
          );
        }
      );

    observer.observe(
      pageFloor,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'hidden',
          'aria-pressed',
          'class'
        ]
      }
    );

    [
      0,
      50,
      150,
      300,
      700,
      1200,
      2000,
      3500,
      5000,
      8000
    ].forEach(function (delay) {
      setTimeout(
        run,
        delay
      );
    });

    console.info(
      '[PMD Reservations2 Final Floor Toolbar V3.1.5] Ready',
      {
        toolbar:
          Boolean(
            document.getElementById(
              TOOLBAR_ID
            )
          ),

        unwantedActions:
          pageFloor.querySelectorAll(
            '[data-floor-mother-action]'
          ).length
      }
    );
  }

  window.PMDReservations2FloorToolbarV315 = {
    version: '3.1.5',
    refresh: run
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();
