(function () {
  'use strict';

  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var applying = false;
  var observer = null;

  var icons = {
    edit:
      '<path d="M12 20h9"></path>' +
      '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',

    save:
      '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>' +
      '<path d="M17 21v-8H7v8"></path>' +
      '<path d="M7 3v5h8"></path>',

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
      '<path d="M3 10h18"></path>'
  };

  function floor() {
    return document.getElementById(FLOOR_ID);
  }

  function svg(name) {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
      'fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      icons[name] +
      '</svg>'
    );
  }

  function nativeControl(root, selector) {
    var controls = Array.prototype.slice.call(
      root.querySelectorAll(selector)
    );

    return controls.find(function (control) {
      return !control.closest('#' + TOOLBAR_ID);
    }) || null;
  }

  function activateNative(root, selector, fallback) {
    var nativeButton = nativeControl(root, selector);

    if (nativeButton) {
      nativeButton.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })
      );

      return true;
    }

    if (typeof fallback === 'function') {
      fallback();
      return true;
    }

    console.warn(
      '[PMD Reservations2 Toolbar V316] Native control not found:',
      selector
    );

    return false;
  }

  function makeButton(options) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className = 'pmd-r2-floor-tool-v316';
    button.setAttribute('data-pmd-r2-tool', options.key);
    button.setAttribute('title', options.title);
    button.setAttribute('aria-label', options.title);

    button.innerHTML =
      svg(options.icon) +
      (options.text ? '<span>' + options.text + '</span>' : '');

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      var root = floor();

      if (!root) {
        return;
      }

      options.onClick(root);
      window.requestAnimationFrame(refresh);
    });

    return button;
  }

  function createToolbar(root) {
    var statusbar = root.querySelector('.pmd-floor-v1__statusbar');

    if (!statusbar) {
      return null;
    }

    var toolbar = document.getElementById(TOOLBAR_ID);

    if (toolbar && toolbar.parentElement !== statusbar) {
      toolbar.remove();
      toolbar = null;
    }

    if (toolbar) {
      return toolbar;
    }

    toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;
    toolbar.className = 'pmd-r2-floor-toolbar-v316';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Floor map controls');

    toolbar.appendChild(
      makeButton({
        key: 'edit',
        icon: 'edit',
        text: 'Edit',
        title: 'Edit layout',

        onClick: function (root) {
          activateNative(root, '[data-floor-edit]');
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        key: 'save',
        icon: 'save',
        text: 'Save',
        title: 'Save layout',

        onClick: function (root) {
          activateNative(root, '[data-floor-save]');
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        key: 'zoom-out',
        icon: 'zoomOut',
        title: 'Zoom out',

        onClick: function (root) {
          activateNative(root, '[data-floor-zoom-out]');
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        key: 'fit',
        icon: 'fit',
        title: 'Full Floor',

        onClick: function (root) {
          activateNative(
            root,
            '[data-floor-fit]',
            function () {
              if (
                root.__pmdFloorV1 &&
                typeof root.__pmdFloorV1.fit === 'function'
              ) {
                root.__pmdFloorV1.fit();
              }
            }
          );
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        key: 'zoom-in',
        icon: 'zoomIn',
        title: 'Zoom in',

        onClick: function (root) {
          activateNative(root, '[data-floor-zoom-in]');
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        key: 'strip',
        icon: 'strip',
        text: 'One row',
        title: 'One row tables',

        onClick: function (root) {
          activateNative(root, '[data-floor-strip]');
        }
      })
    );

    statusbar.appendChild(toolbar);

    return toolbar;
  }

  function preserveAndHideNativeControls(root) {
    root.querySelectorAll(
      [
        '[data-floor-secondary-toolbar]',
        '.pmd-floor-v1__secondary-toolbar',
        '[data-pmd-r2-floor-toolbar-v313]'
      ].join(',')
    ).forEach(function (nativeToolbar) {
      if (nativeToolbar.id === TOOLBAR_ID) {
        return;
      }

      nativeToolbar.classList.add(
        'pmd-r2-native-toolbar-v316-hidden'
      );

      nativeToolbar.setAttribute(
        'data-pmd-native-toolbar-preserved',
        'true'
      );
    });

    root.querySelectorAll(
      [
        '[data-floor-mother-action]',
        '[data-floor-merge]',
        '[data-floor-fullscreen]',
        '[data-floor-refresh]'
      ].join(',')
    ).forEach(function (button) {
      if (button.closest('#' + TOOLBAR_ID)) {
        return;
      }

      button.classList.add(
        'pmd-r2-native-action-v316-hidden'
      );
    });
  }

  function syncState(root, toolbar) {
    if (!toolbar) {
      return;
    }

    var nativeEdit =
      nativeControl(root, '[data-floor-edit]');

    var nativeSave =
      nativeControl(root, '[data-floor-save]');

    var nativeStrip =
      nativeControl(root, '[data-floor-strip]');

    var edit =
      toolbar.querySelector('[data-pmd-r2-tool="edit"]');

    var save =
      toolbar.querySelector('[data-pmd-r2-tool="save"]');

    var strip =
      toolbar.querySelector('[data-pmd-r2-tool="strip"]');

    var state =
      root.__pmdFloorV1 &&
      typeof root.__pmdFloorV1.getState === 'function'
        ? root.__pmdFloorV1.getState()
        : null;

    var editing =
      Boolean(state && state.editing) ||
      Boolean(
        nativeEdit &&
        nativeEdit.getAttribute('aria-pressed') === 'true'
      );

    if (edit) {
      edit.hidden = editing;
    }

    if (save) {
      save.hidden = !editing;
    }

    if (strip) {
      var stripPressed =
        Boolean(state && state.stripMode) ||
        Boolean(
          nativeStrip &&
          nativeStrip.getAttribute('aria-pressed') === 'true'
        );

      strip.setAttribute(
        'aria-pressed',
        stripPressed ? 'true' : 'false'
      );

      var label = strip.querySelector('span');

      if (label) {
        label.textContent =
          stripPressed ? 'Floor' : 'One row';
      }
    }

    [
      ['edit', nativeEdit],
      ['save', nativeSave],
      ['strip', nativeStrip]
    ].forEach(function (entry) {
      var custom =
        toolbar.querySelector(
          '[data-pmd-r2-tool="' + entry[0] + '"]'
        );

      if (custom) {
        custom.disabled = !entry[1];
      }
    });
  }

  function removeV315Toolbar() {
    var oldToolbar =
      document.getElementById(
        'pmd-r2-floor-toolbar-v315'
      );

    if (oldToolbar) {
      oldToolbar.remove();
    }
  }

  function refresh() {
    if (applying) {
      return;
    }

    var root = floor();

    if (!root) {
      return;
    }

    applying = true;

    try {
      removeV315Toolbar();

      var toolbar =
        createToolbar(root);

      preserveAndHideNativeControls(root);
      syncState(root, toolbar);

      root.setAttribute(
        'data-pmd-r2-toolbar-authority',
        'v316'
      );
    } finally {
      applying = false;
    }
  }

  function boot() {
    refresh();

    var root = floor();

    if (!root) {
      return;
    }

    observer = new MutationObserver(function () {
      window.requestAnimationFrame(refresh);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'hidden',
        'aria-pressed',
        'class',
        'style'
      ]
    });

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
      setTimeout(refresh, delay);
    });

    console.info(
      '[PMD Reservations2 Working Floor Toolbar V3.1.6] Ready',
      {
        nativeEdit:
          Boolean(
            nativeControl(root, '[data-floor-edit]')
          ),

        nativeSave:
          Boolean(
            nativeControl(root, '[data-floor-save]')
          ),

        nativeZoomOut:
          Boolean(
            nativeControl(root, '[data-floor-zoom-out]')
          ),

        nativeFit:
          Boolean(
            nativeControl(root, '[data-floor-fit]')
          ),

        nativeZoomIn:
          Boolean(
            nativeControl(root, '[data-floor-zoom-in]')
          ),

        nativeStrip:
          Boolean(
            nativeControl(root, '[data-floor-strip]')
          ),

        floorInstance:
          Boolean(root.__pmdFloorV1)
      }
    );
  }

  window.PMDReservations2FloorToolbarV316 = {
    version: '3.1.6',
    refresh: refresh,

    audit: function () {
      var root = floor();

      if (!root) {
        return {
          floor: false
        };
      }

      return {
        floor: true,
        instance: Boolean(root.__pmdFloorV1),
        editing:
          Boolean(
            root.__pmdFloorV1 &&
            root.__pmdFloorV1.getState &&
            root.__pmdFloorV1.getState().editing
          ),
        edit:
          Boolean(nativeControl(root, '[data-floor-edit]')),
        save:
          Boolean(nativeControl(root, '[data-floor-save]')),
        zoomOut:
          Boolean(nativeControl(root, '[data-floor-zoom-out]')),
        fit:
          Boolean(nativeControl(root, '[data-floor-fit]')),
        zoomIn:
          Boolean(nativeControl(root, '[data-floor-zoom-in]')),
        strip:
          Boolean(nativeControl(root, '[data-floor-strip]'))
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
