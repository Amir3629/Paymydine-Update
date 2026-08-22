(function () {
  'use strict';

  var menu =
    document.querySelector('#pmd-side-menu2');

  if (!menu) return;

  /* PMD_DEFAULT_ROLE_SIDE_MENU_V1_START */
  var roleDashboardLink =
    menu.querySelector('[data-pmd-dashboard-route]');

  var roleDashboardRoute =
    roleDashboardLink
      ? String(
          roleDashboardLink.getAttribute(
            'data-pmd-dashboard-route'
          ) || ''
        ).replace(/^\/+|\/+$/g, '')
      : '';

  /* Manager keeps the full operational menu, but Settings is not a Manager
     workspace. Server authorization independently rejects the URL. */
  if (roleDashboardRoute === 'managerlab') {
    Array.prototype.slice.call(
      menu.querySelectorAll('a[href]')
    ).forEach(function (link) {
      var path = '';
      try {
        path = new URL(
          link.href,
          window.location.origin
        ).pathname;
      } catch (error) {
        path = link.getAttribute('href') || '';
      }

      if (/\/admin\/pmdsettings\/?$/.test(path)) {
        (link.closest('li') || link).remove();
      }
    });
  }

  /* A station-specific KDS role gets no side menu at all. Owner/Manager KDS
     pages still keep their normal menu because their dashboard route differs. */
  if (
    roleDashboardRoute.indexOf(
      'kitchendisplay/'
    ) === 0
  ) {
    document.documentElement.classList.add(
      'pmd-sm2-role-standalone'
    );

    document.documentElement.classList.remove(
      'pmd-side-menu2-global-page',
      'pmd-sm2-expanded',
      'pmd-sm2-collapsed'
    );

    var reset =
      document.createElement('style');

    reset.id =
      'pmd-kds-role-standalone-layout';

    reset.textContent =
      'html.pmd-sm2-role-standalone #pmd-side-menu2{display:none!important}'
      + 'html.pmd-sm2-role-standalone .page-wrapper{left:0!important;margin-left:0!important;width:100%!important;max-width:100%!important}'
      + 'html.pmd-sm2-role-standalone .page-content{margin-left:0!important;padding-left:0!important;width:100%!important;max-width:100%!important}';

    document.head.appendChild(reset);

    menu.hidden = true;
    menu.style.setProperty(
      'display',
      'none',
      'important'
    );

    return;
  }
  /* PMD_DEFAULT_ROLE_SIDE_MENU_V1_END */

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
      /*
       * PMD_MOBILE_MENU_BLUR_ONLY_V2427
       *
       * The brand toggle is desktop-only. On mobile retain the
       * Pay My Dine branding but ignore its collapse action.
       */
      if (
        window.innerWidth <= 820 &&
        toggle.querySelector(
          '.pmd-sm2__brand-collapse-icon'
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      var nextState =
        getState() === 'expanded'
          ? 'collapsed'
          : 'expanded';

      armRuntimeTransitionsForUserAction();
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
        armRuntimeTransitionsForUserAction();
        applyState('expanded');
      }

      setDropdown(
        name,
        willOpen
      );
    }
  }

  function refresh() {
    /*
     * PMD_SM2_REFRESH_STATIC_BOOT_CONSOLIDATION_V1
     *
     * A page load/refresh is never a user animation. Keep the shared
     * transition gate OFF while restoring persisted state. This prevents
     * the entire page wrapper (including ReservationsLab Floor) from
     * animating after first paint.
     */
    document.documentElement.classList.remove(
      'pmd-sm2-runtime-ready'
    );

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

function armRuntimeTransitionsForUserAction() {
    /*
     * PMD_SM2_USER_ACTION_TRANSITIONS_ONLY_V1
     *
     * The old implementation armed transitions automatically two RAFs
     * after every boot. That contradicted the first-paint contract and
     * could animate the page shell/Floor during refresh. The SAME existing
     * pmd-sm2-runtime-ready gate is now armed only immediately before an
     * actual user-driven expand/collapse action.
     */
    lockVerticalGeometry();
    document.documentElement.classList.add(
      'pmd-sm2-runtime-ready'
    );
  }

window.PMDSideMenu2GlobalV3 = {
    version: '3.0.1-refresh-static',
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

  /* Initial boot intentionally leaves pmd-sm2-runtime-ready absent. */
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
