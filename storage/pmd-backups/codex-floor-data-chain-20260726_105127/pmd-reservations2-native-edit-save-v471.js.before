(function () {
  'use strict';

  var route = String(
    window.location.pathname || ''
  ).replace(/\/+$/, '');

  if (
    route !== '/admin/reservations' &&
    route !== '/admin/reservations2'
  ) {
    return;
  }

  if (
    window.PMDReservations2NativeEditSaveV471
  ) {
    return;
  }

  var VERSION = '4.7.1';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var TOOLBAR_ID =
    'pmd-r2-floor-toolbar-v316';

  var boundButton = null;
  var nativeEventBound = false;


  function floor() {
    return document.getElementById(
      FLOOR_ID
    );
  }


  function toolbar() {
    return document.getElementById(
      TOOLBAR_ID
    );
  }


  function proxyEdit() {
    var root = toolbar();

    return root
      ? root.querySelector(
          '[data-pmd-r2-tool="edit"]'
        )
      : null;
  }


  function proxySave() {
    var root = toolbar();

    return root
      ? root.querySelector(
          '[data-pmd-r2-tool="save"]'
        )
      : null;
  }


  function nativeControl(selector) {
    var root = floor();

    if (!root) {
      return null;
    }

    return Array.prototype.slice.call(
      root.querySelectorAll(selector)
    ).find(function (element) {
      return !element.closest(
        '#' + TOOLBAR_ID
      );
    }) || null;
  }


  function nativeEdit() {
    return nativeControl(
      '[data-floor-edit]'
    );
  }


  function nativeSave() {
    return nativeControl(
      '[data-floor-save]'
    );
  }


  function nativeSaveIsActive() {
    var save = nativeSave();

    if (!save) {
      return false;
    }

    var style =
      window.getComputedStyle(save);

    return (
      save.hidden === false &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }


  function nativeEditing() {
    var root = floor();
    var edit = nativeEdit();

    return Boolean(
      nativeSaveIsActive() ||
      (
        root &&
        root.classList.contains(
          'is-editing'
        )
      ) ||
      (
        edit &&
        edit.getAttribute(
          'aria-pressed'
        ) === 'true'
      )
    );
  }


  function german() {
    var lang = String(
      document.documentElement.lang || ''
    ).toLowerCase();

    return (
      lang.indexOf('de') === 0 ||
      document.body.textContent
        .indexOf('Reservierungen') !== -1
    );
  }


  function text(mode) {
    if (mode === 'save') {
      return german()
        ? 'Speichern'
        : 'Save';
    }

    return german()
      ? 'Bearbeiten'
      : 'Edit';
  }


  function hideSeparateSave() {
    var button = proxySave();

    if (!button) {
      return;
    }

    button.hidden = true;

    button.style.setProperty(
      'display',
      'none',
      'important'
    );

    button.style.setProperty(
      'visibility',
      'hidden',
      'important'
    );

    button.setAttribute(
      'aria-hidden',
      'true'
    );

    button.setAttribute(
      'tabindex',
      '-1'
    );
  }


  function syncButton() {
    hideSeparateSave();

    var button = proxyEdit();

    if (!button) {
      return;
    }

    var editing =
      nativeEditing();

    /*
     * Only update text and accessibility state.
     * Do not change background, border, color,
     * className or inline visual styles.
     */
    button.textContent =
      text(
        editing
          ? 'save'
          : 'edit'
      );

    button.setAttribute(
      'data-pmd-native-mode',
      editing
        ? 'save'
        : 'edit'
    );

    button.setAttribute(
      'aria-pressed',
      editing
        ? 'true'
        : 'false'
    );

    button.disabled = false;
  }


  function syncSoon() {
    [
      0,
      30,
      100,
      250,
      700
    ].forEach(function (delay) {
      window.setTimeout(
        syncButton,
        delay
      );
    });
  }


  function activateNativeControl(control) {
    if (!control) {
      return false;
    }

    /*
     * Use the Floor engine’s existing click handler.
     * This preserves its private state.tables,
     * drag logic and saveLayout implementation.
     */
    control.click();

    return true;
  }


  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (nativeEditing()) {
      var save = nativeSave();

      if (!save) {
        console.error(
          '[PMD Native Edit/Save V4.7.1] ' +
          'Native Save button was not found.'
        );

        return;
      }

      console.info(
        '[PMD Native Edit/Save V4.7.1] ' +
        'Executing native saveLayout()'
      );

      activateNativeControl(save);
    } else {
      var edit = nativeEdit();

      if (!edit) {
        console.error(
          '[PMD Native Edit/Save V4.7.1] ' +
          'Native Edit button was not found.'
        );

        return;
      }

      console.info(
        '[PMD Native Edit/Save V4.7.1] ' +
        'Entering native edit mode'
      );

      activateNativeControl(edit);
    }

    syncSoon();
  }


  function bindButton() {
    var current = proxyEdit();

    if (!current) {
      return false;
    }

    if (boundButton === current) {
      syncButton();
      return true;
    }

    /*
     * Clone once to remove the old V316 proxy listener.
     * All original classes and visual styling are retained.
     */
    var replacement =
      current.cloneNode(true);

    replacement.removeAttribute(
      'onclick'
    );

    replacement.setAttribute(
      'data-pmd-native-edit-save-v471',
      'true'
    );

    current.parentNode.replaceChild(
      replacement,
      current
    );

    replacement.addEventListener(
      'click',
      handleClick,
      true
    );

    boundButton = replacement;

    syncButton();

    return true;
  }


  function bindNativeEvents() {
    if (nativeEventBound) {
      return;
    }

    var root = floor();

    if (!root) {
      return;
    }

    /*
     * The native engine emits this after a successful
     * floor update. No polling or observer is required.
     */
    window.addEventListener(
      'pmd:floor:updated',
      function (event) {
        console.info(
          '[PMD Native Edit/Save V4.7.1] ' +
          'Floor update received',
          event.detail || {}
        );

        syncSoon();
      }
    );

    var edit = nativeEdit();
    var save = nativeSave();

    [edit, save]
      .filter(Boolean)
      .forEach(function (button) {
        button.addEventListener(
          'click',
          syncSoon
        );
      });

    nativeEventBound = true;
  }


  function install() {
    hideSeparateSave();
    bindButton();
    bindNativeEvents();
    syncButton();
  }


  function audit() {
    var edit = nativeEdit();
    var save = nativeSave();
    var proxy = proxyEdit();

    return {
      version: VERSION,

      floorFound:
        Boolean(floor()),

      toolbarFound:
        Boolean(toolbar()),

      proxyFound:
        Boolean(proxy),

      nativeEditFound:
        Boolean(edit),

      nativeSaveFound:
        Boolean(save),

      nativeEditing:
        nativeEditing(),

      nativeSaveHidden:
        save
          ? Boolean(save.hidden)
          : null,

      proxyMode:
        proxy
          ? proxy.getAttribute(
              'data-pmd-native-mode'
            )
          : null,

      separateSaveVisible:
        proxySave()
          ? (
              getComputedStyle(
                proxySave()
              ).display !== 'none'
            )
          : false,

      layoutUrl:
        floor()
          ? floor().getAttribute(
              'data-layout-url'
            )
          : null
    };
  }


  function boot() {
    /*
     * Limited startup retries only.
     * No MutationObserver, no setInterval.
     */
    [
      0,
      150,
      500,
      1200,
      2500
    ].forEach(function (delay) {
      window.setTimeout(
        install,
        delay
      );
    });

    window
      .PMDReservations2NativeEditSaveV471 = {
        version: VERSION,
        refresh: install,
        audit: audit
      };

    window.setTimeout(
      function () {
        console.info(
          '[PMD Reservations2 Native Edit/Save V4.7.1] Ready',
          audit()
        );
      },
      700
    );
  }


  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
