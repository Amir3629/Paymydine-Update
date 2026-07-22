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

  /* PMD_SM2_CLOSE_DROPDOWN_ON_NAV_V1_START */

/*
 * Dropdown openness is temporary UI state.
 * It must not follow the user to another admin page.
 */
function clearDropdownState() {
  closeAllDropdowns();

  writeStorage(
    DROPDOWN_KEY,
    ''
  );
}

function handleNavigationDropdownReset(event) {
  var link = event.target.closest(
    '#pmd-side-menu2 a[href]'
  );

  if (!link || !menu.contains(link)) {
    return;
  }

  /*
   * Ignore placeholder links and modified clicks.
   * Real navigation—normal links and submenu links—closes
   * every dropdown before the browser changes page.
   */
  var href = link.getAttribute('href');

  if (
    !href ||
    href === '#' ||
    href.indexOf('javascript:') === 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  clearDropdownState();
}

/* PMD_SM2_CLOSE_DROPDOWN_ON_NAV_V1_END */

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
    handleNavigationDropdownReset,
    true
  );

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

/* PMD_SM2_DROPDOWN_CLOSE_V16_START */
(function () {
  'use strict';

  var menu = document.getElementById('pmd-side-menu2');
  var html = document.documentElement;

  if (!menu || window.PMDSideMenu2DropdownCloseV16) return;

  var KEY = 'pmd.sideMenu2.openDropdown';

  function closeAll() {
    menu.querySelectorAll('[data-pmd-sm2-dropdown]').forEach(function (item) {
      item.classList.remove('is-open');

      var toggle = item.querySelector('[data-pmd-sm2-dropdown-toggle]');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }

      item.querySelectorAll('.pmd-sm2__submenu').forEach(function (submenu) {
        submenu.classList.remove('show');
        submenu.hidden = true;
        submenu.setAttribute('aria-hidden', 'true');
      });
    });

    try {
      localStorage.removeItem(KEY);
    } catch (error) {}
  }

  function openDropdown(dropdown) {
    var submenu = dropdown.querySelector('.pmd-sm2__submenu');

    if (submenu) {
      submenu.hidden = false;
      submenu.removeAttribute('aria-hidden');
    }
  }

  /*
   * اجازه بده dropdown هنگام کلیک باز شود.
   */
  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-pmd-sm2-dropdown-toggle]');

    if (toggle && menu.contains(toggle)) {
      var dropdown = toggle.closest('[data-pmd-sm2-dropdown]');

      requestAnimationFrame(function () {
        if (dropdown && dropdown.classList.contains('is-open')) {
          openDropdown(dropdown);
        }
      });

      return;
    }

    if (
      event.target.closest('[data-pmd-sm2-toggle]') ||
      event.target.closest('#pmd-side-menu2-backdrop') ||
      event.target.closest('#pmd-side-menu2 a[href]')
    ) {
      closeAll();
    }
  }, true);

  /*
   * با collapsed شدن desktop یا بسته شدن mobile drawer،
   * dropdown فوراً بسته شود.
   */
  new MutationObserver(function () {
    var desktopClosed =
      html.classList.contains('pmd-sm2-collapsed') ||
      menu.classList.contains('is-collapsed');

    var mobileClosed =
      window.innerWidth <= 820 &&
      !html.classList.contains('pmd-sm2-mobile-open');

    if (desktopClosed || mobileClosed) {
      closeAll();
    }
  }).observe(html, {
    attributes: true,
    attributeFilter: ['class']
  });

  new MutationObserver(function () {
    if (menu.classList.contains('is-collapsed')) {
      closeAll();
    }
  }).observe(menu, {
    attributes: true,
    attributeFilter: ['class']
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAll();
  });

  window.addEventListener('pmd:side-menu2-state', function (event) {
    var detail = event.detail || {};

    if (
      detail.expanded === false ||
      detail.state === 'collapsed'
    ) {
      closeAll();
    }
  });

  closeAll();

  window.PMDSideMenu2DropdownCloseV16 = {
    closeAll: closeAll
  };
})();
/* PMD_SM2_DROPDOWN_CLOSE_V16_END */
