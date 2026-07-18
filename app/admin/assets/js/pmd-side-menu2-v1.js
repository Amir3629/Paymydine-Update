(function () {
  'use strict';

  var menu =
    document.querySelector('#pmd-side-menu2');

  if (!menu) return;

  if (window.PMDSideMenu2GlobalV3) {
    window.PMDSideMenu2GlobalV3.refresh();
    return;
  }

  var STATE_KEY = 'pmd.sideMenu2.state';
  var DROPDOWN_KEY = 'pmd.sideMenu2.openDropdown';

  function readStorage(key, fallback) {
    try {
      var value = localStorage.getItem(key);

      return value === null
        ? fallback
        : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {}
  }

  function getState() {
    return readStorage(
      STATE_KEY,
      'collapsed'
    ) === 'expanded'
      ? 'expanded'
      : 'collapsed';
  }

  function applyState(state) {
    var expanded =
      state === 'expanded';

    document.documentElement.classList.toggle(
      'pmd-sm2-expanded',
      expanded
    );

    document.documentElement.classList.toggle(
      'pmd-sm2-collapsed',
      !expanded
    );

    menu.classList.toggle(
      'is-expanded',
      expanded
    );

    menu.classList.toggle(
      'is-collapsed',
      !expanded
    );

    menu
      .querySelectorAll('[data-pmd-sm2-toggle]')
      .forEach(function (button) {
        button.setAttribute(
          'aria-expanded',
          expanded ? 'true' : 'false'
        );

        var label =
          button.querySelector('span');

        if (label) {
          label.textContent =
            expanded
              ? 'Collapse menu'
              : 'Expand menu';
        }
      });

    writeStorage(
      STATE_KEY,
      state
    );

    lockVerticalGeometry();

  window.dispatchEvent(
      new CustomEvent(
        'pmd:side-menu2-state',
        {
          detail: {
            state: state,
            expanded: expanded
          }
        }
      )
    );
  }

  function closeAllDropdowns(exceptName) {
    menu
      .querySelectorAll(
        '[data-pmd-sm2-dropdown]'
      )
      .forEach(function (dropdown) {
        var name =
          dropdown.getAttribute(
            'data-pmd-sm2-dropdown'
          );

        if (
          exceptName &&
          name === exceptName
        ) {
          return;
        }

        dropdown.classList.remove(
          'is-open'
        );

        var button =
          dropdown.querySelector(
            '[data-pmd-sm2-dropdown-toggle]'
          );

        if (button) {
          button.setAttribute(
            'aria-expanded',
            'false'
          );
        }
      });
  }

  function setDropdown(name, open) {
    var dropdown =
      menu.querySelector(
        '[data-pmd-sm2-dropdown="' +
          CSS.escape(name) +
        '"]'
      );

    if (!dropdown) return;

    if (open) {
      closeAllDropdowns(name);
    }

    dropdown.classList.toggle(
      'is-open',
      open
    );

    var button =
      dropdown.querySelector(
        '[data-pmd-sm2-dropdown-toggle]'
      );

    if (button) {
      button.setAttribute(
        'aria-expanded',
        open ? 'true' : 'false'
      );
    }

    writeStorage(
      DROPDOWN_KEY,
      open ? name : ''
    );
  }

  function restoreDropdown() {
    var name =
      readStorage(
        DROPDOWN_KEY,
        ''
      );

    if (name) {
      setDropdown(name, true);
    }
  }

  function onClick(event) {
    var toggle =
      event.target.closest(
        '[data-pmd-sm2-toggle]'
      );

    if (toggle && menu.contains(toggle)) {
      event.preventDefault();
      event.stopPropagation();

      var nextState =
        getState() === 'expanded'
          ? 'collapsed'
          : 'expanded';

      applyState(nextState);
      return;
    }

    var dropdownButton =
      event.target.closest(
        '[data-pmd-sm2-dropdown-toggle]'
      );

    if (
      dropdownButton &&
      menu.contains(dropdownButton)
    ) {
      event.preventDefault();
      event.stopPropagation();

      var dropdown =
        dropdownButton.closest(
          '[data-pmd-sm2-dropdown]'
        );

      if (!dropdown) return;

      var name =
        dropdown.getAttribute(
          'data-pmd-sm2-dropdown'
        );

      var willOpen =
        !dropdown.classList.contains(
          'is-open'
        );

      if (
        getState() !== 'expanded'
      ) {
        applyState('expanded');
      }

      setDropdown(
        name,
        willOpen
      );
    }
  }

  function refresh() {
    menu.style.setProperty(
      'pointer-events',
      'auto',
      'important'
    );

    menu.style.setProperty(
      'visibility',
      'visible',
      'important'
    );

    menu.style.setProperty(
      'opacity',
      '1',
      'important'
    );

    menu
      .querySelectorAll(
        'a, button, [role="button"]'
      )
      .forEach(function (element) {
        element.style.setProperty(
          'pointer-events',
          'auto',
          'important'
        );
      });

    applyState(getState());
    restoreDropdown();
  }

  /*
   * Capture phase is intentional.
   * Some old admin scripts stop bubbling clicks.
   */
  document.addEventListener(
    'click',
    onClick,
    true
  );

  
  /*
   * PMD_SIDE_MENU2_RUNTIME_READY_V4
   *
   * Initial page paint must be static. The ready class is
   * applied only after the saved state and page geometry are
   * already stable. User-triggered expand/collapse remains smooth.
   */
  
  /*
   * PMD_SIDE_MENU2_VERTICAL_JS_GUARD_V5
   *
   * CSS permanently owns top, bottom and height.
   * Remove accidental runtime mutations after any state change.
   */
  function lockVerticalGeometry() {
    var menu =
      document.querySelector(
        '#pmd-side-menu2'
      );

    if (!menu) return;

    [
      'top',
      'bottom',
      'height',
      'min-height',
      'max-height',
      'margin-top',
      'margin-bottom',
      'transform',
      'translate'
    ].forEach(function (property) {
      menu.style.removeProperty(property);
    });
  }

function enableRuntimeTransitions() {
    lockVerticalGeometry();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.add(
          'pmd-sm2-runtime-ready'
        );
      });
    });
  }

window.PMDSideMenu2GlobalV3 = {
    version: '3.0.0',
    refresh: refresh,
    applyState: applyState,
    setDropdown: setDropdown,
    getState: getState
  };

  refresh();

  console.info(
    '[PMD Side Menu 2 Global V3] Ready',
    window.PMDSideMenu2GlobalV3
  );

  enableRuntimeTransitions();
})();
