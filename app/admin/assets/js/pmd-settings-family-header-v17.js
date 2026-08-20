(function () {
  'use strict';

  var VERSION = '17.0.0';

  function cleanPath(value) {
    var path = String(value || '');

    try {
      if (
        path.indexOf('http://') === 0 ||
        path.indexOf('https://') === 0
      ) {
        path = new URL(
          path,
          window.location.href
        ).pathname;
      }
    } catch (error) {}

    path = path.split('?')[0].split('#')[0];

    return path.replace(/\/+$/, '') || '/';
  }


  function isDetailPath(path) {
    path = cleanPath(path);

    if (
      path === '/admin/pmdsettings/restaurant' ||
      path === '/admin/pmdsettings/frontend' ||
      path === '/admin/pmdmenu' ||
      path === '/admin/pmdcustomer' ||
      path === '/admin/pmdteam' ||
      path === '/admin/pmdfinance' ||
      path === '/admin/pmdbrand' ||
      path === '/admin/pmdadvanced' ||
      path === '/admin/pmddevices'
    ) {
      return true;
    }

    return (
      path.indexOf('/admin/pmddevices/') === 0
    );
  }


  function isSettingsNavigationPath(path) {
    path = cleanPath(path);

    return (
      path === '/admin/pmdsettings' ||
      path.indexOf('/admin/pmdsettings/') === 0 ||
      path === '/admin/pmdmenu' ||
      path === '/admin/pmdcustomer' ||
      path === '/admin/pmdteam' ||
      path === '/admin/pmdfinance' ||
      path === '/admin/pmdbrand' ||
      path === '/admin/pmdadvanced' ||
      path === '/admin/pmddevices' ||
      path.indexOf('/admin/pmddevices/') === 0
    );
  }


  /*
   * SETTINGS NAVIGATION IS FULL-PAGE NAVIGATION.
   *
   * The global SmoothPageTransitions object attaches its handler
   * directly to sidebar links.
   *
   * This capture listener stops propagation BEFORE that target
   * listener receives the click. We intentionally DO NOT call
   * preventDefault(), therefore the browser performs a normal
   * navigation with no opacity/translate animation.
   */
  document.addEventListener(
    'click',
    function (event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      var link =
        event.target &&
        event.target.closest
          ? event.target.closest(
              '#navSidebar a[href], #pmd-side-menu2 a[href]'
            )
          : null;

      if (!link) {
        return;
      }

      var currentPath =
        cleanPath(window.location.pathname);

      var targetPath =
        cleanPath(link.href);

      if (
        !isSettingsNavigationPath(currentPath) &&
        !isSettingsNavigationPath(targetPath)
      ) {
        return;
      }

      /*
       * Do not cancel the native anchor action.
       * Only stop JS SPA interception.
       */
      event.stopPropagation();
    },
    true
  );


  var currentPath =
    cleanPath(window.location.pathname);

  if (!isDetailPath(currentPath)) {
    return;
  }


  function findHeader() {
    if (
      currentPath ===
      '/admin/pmdsettings/restaurant'
    ) {
      return (
        document.getElementById(
          'pmd-profile-header'
        ) ||
        document.querySelector(
          '.pmd-owner-header'
        )
      );
    }

    if (
      currentPath ===
      '/admin/pmdsettings/frontend'
    ) {
      return (
        document.querySelector(
          '.pmd-frontend-header'
        ) ||
        document.querySelector(
          '.pmd-owner-header'
        )
      );
    }

    if (currentPath === '/admin/pmdmenu') {
      return (
        document.getElementById(
          'pmd-menu-header'
        ) ||
        document.querySelector(
          '.pmd-owner-header'
        )
      );
    }

    if (currentPath === '/admin/pmdteam') {
      return (
        document.getElementById(
          'pmd-team-header'
        ) ||
        document.querySelector(
          '.pmd-owner-header'
        )
      );
    }

    if (
      currentPath === '/admin/pmddevices' ||
      currentPath.indexOf(
        '/admin/pmddevices/'
      ) === 0
    ) {
      return (
        document.querySelector(
          '.pmd-device-suite-header'
        ) ||
        document.querySelector(
          '.pmd-owner-header'
        )
      );
    }

    return document.querySelector(
      '.pmd-owner-header:not(#pmd-settings-clean-header)'
    );
  }


  function findActions(header) {
    if (!header) {
      return null;
    }

    return (
      header.querySelector(
        '.pmd-owner-header__actions'
      ) ||
      header.querySelector(
        '.pmd-profile-header__actions'
      ) ||
      header.querySelector(
        '.pmd-menu-header__actions'
      ) ||
      header.querySelector(
        '.pmd-team-header__actions'
      ) ||
      header.querySelector(
        '.pmd-frontend-header__actions'
      ) ||
      header.querySelector(
        '[data-pmd-owner-header-actions]'
      ) ||
      header.querySelector(
        '[data-pmd-profile-header-actions]'
      ) ||
      header.querySelector(
        '[data-pmd-menu-header-actions]'
      )
    );
  }


  function isLegacyGap(node) {
    if (
      !node ||
      node.nodeType !== 1
    ) {
      return false;
    }

    return (
      node.hasAttribute(
        'data-pmd-main-header-notification-gap-r67'
      ) ||
      node.hasAttribute(
        'data-pmd-main-header-notification-gap-r66'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-header-gap-v11'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-gap-v15'
      ) ||
      node.hasAttribute(
        'data-pmd-owner-header-notif-divider-v1'
      )
    );
  }


  function isNotificationSlot(node) {
    if (
      !node ||
      node.nodeType !== 1
    ) {
      return false;
    }

    var className =
      typeof node.className === 'string'
        ? node.className
        : '';

    return (
      node.classList.contains(
        'pmd-settings-family-notif-slot-v17'
      ) ||
      node.classList.contains(
        'pmd-owner-notif-slot'
      ) ||
      className.indexOf('notif-slot') !== -1 ||
      node.hasAttribute(
        'data-pmd-owner-notif-slot'
      ) ||
      node.hasAttribute(
        'data-pmd-menu-notif-slot'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-notif-slot'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-notif-slot-v10'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-notif-slot-v11'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-notification-fallback'
      ) ||
      node.hasAttribute(
        'data-pmd-settings-family-notif-slot-v17'
      )
    );
  }


  function createSlot() {
    var slot =
      document.createElement('span');

    slot.className =
      'pmd-settings-family-notif-slot-v17';

    slot.setAttribute(
      'data-pmd-settings-family-notif-slot-v17',
      '1'
    );

    slot.setAttribute(
      'aria-label',
      'Notifications'
    );

    return slot;
  }


  function normalizeBell(root) {
    if (!root) {
      return;
    }

    var toggle =
      root.querySelector(
        '#notifDropdown'
      );

    if (!toggle) {
      return;
    }

    toggle.classList.remove('show');

    toggle.setAttribute(
      'aria-expanded',
      'false'
    );

    var count =
      toggle.querySelector(
        '#notification-count'
      );

    var bells =
      Array.prototype.slice.call(
        toggle.querySelectorAll(
          '#bell-icon'
        )
      );

    var bell =
      bells.length
        ? bells[0]
        : null;

    bells.slice(1).forEach(
      function (duplicate) {
        duplicate.remove();
      }
    );

    if (!bell) {
      bell =
        document.createElement('span');

      bell.id = 'bell-icon';

      if (count) {
        toggle.insertBefore(
          bell,
          count
        );
      } else {
        toggle.insertBefore(
          bell,
          toggle.firstChild
        );
      }
    }

    /*
     * Never delete the real count if an old Bell implementation
     * accidentally nested it inside bell-icon.
     */
    if (
      count &&
      bell.contains(count)
    ) {
      toggle.appendChild(count);
    }

    toggle
      .querySelectorAll(
        'i.fa, i.fas, i.far, i.fal, i.fab'
      )
      .forEach(function (icon) {
        icon.remove();
      });

    bell.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
        '<path d="M10 21h4"></path>' +
      '</svg>';

    root.setAttribute(
      'data-pmd-settings-family-real-notif-v17',
      '1'
    );
  }


  function normalize() {
    var header =
      findHeader();

    if (!header) {
      return false;
    }

    var actions =
      findActions(header);

    if (!actions) {
      return false;
    }

    header.classList.add(
      'pmd-settings-family-header-v17'
    );

    actions.classList.add(
      'pmd-settings-family-header-v17__actions'
    );

    /*
     * Delete geometry-only legacy gaps.
     * No Back/Save/Search/business action is touched.
     */
    Array.prototype.slice
      .call(actions.children)
      .forEach(function (node) {
        if (isLegacyGap(node)) {
          node.remove();
        }
      });

    var root =
      document.getElementById(
        'notif-root'
      );

    var slots =
      Array.prototype.slice
        .call(actions.children)
        .filter(isNotificationSlot);

    var slot = null;

    /*
     * Prefer the slot already containing the REAL root.
     */
    slots.some(function (candidate) {
      if (
        root &&
        candidate.contains(root)
      ) {
        slot = candidate;
        return true;
      }

      return false;
    });

    /*
     * Otherwise reuse the first existing placeholder.
     */
    if (!slot && slots.length) {
      slot = slots[0];
    }

    /*
     * Pages such as Frontend currently render no notification
     * placeholder server-side. Create exactly one.
     */
    if (!slot) {
      slot = createSlot();
      actions.appendChild(slot);
    }

    slot.classList.add(
      'pmd-settings-family-notif-slot-v17'
    );

    slot.setAttribute(
      'data-pmd-settings-family-notif-slot-v17',
      '1'
    );

    /*
     * Move the REAL global root.
     * Never clone it, so its dropdown/API/event ownership remains intact.
     */
    if (root) {
      if (!slot.contains(root)) {
        /*
         * Existing children in a notification placeholder are
         * fallback-only. Remove those before mounting the real root.
         */
        while (slot.firstChild) {
          slot.removeChild(
            slot.firstChild
          );
        }

        slot.appendChild(root);
      }

      root.removeAttribute('hidden');

      root.classList.remove('show');

      root
        .querySelectorAll(
          '.dropdown-menu.show'
        )
        .forEach(function (menu) {
          menu.classList.remove('show');
          menu.style.removeProperty(
            'display'
          );
        });

      normalizeBell(root);
    }

    /*
     * Delete duplicate notification placeholders only.
     */
    Array.prototype.slice
      .call(actions.children)
      .forEach(function (node) {
        if (
          node === slot ||
          node === root
        ) {
          return;
        }

        if (
          isNotificationSlot(node) &&
          !(root && node.contains(root))
        ) {
          node.remove();
        }
      });

    /*
     * Notification is always the final Header rail.
     */
    if (
      slot.parentNode === actions &&
      slot !== actions.lastElementChild
    ) {
      actions.appendChild(slot);
    }

    header.setAttribute(
      'data-pmd-settings-family-header-v17',
      VERSION
    );

    return true;
  }


  function rect(node) {
    if (!node) {
      return null;
    }

    var value =
      node.getBoundingClientRect();

    return {
      x: Math.round(value.x),
      y: Math.round(value.y),
      width: Math.round(value.width),
      height: Math.round(value.height)
    };
  }


  function audit() {
    var header =
      findHeader();

    var actions =
      findActions(header);

    var wrapper =
      document.querySelector(
        '.page-wrapper'
      );

    var content =
      document.querySelector(
        '.page-content'
      );

    var root =
      document.getElementById(
        'notif-root'
      );

    var toggle =
      document.getElementById(
        'notifDropdown'
      );

    var wrapperStyle =
      wrapper
        ? getComputedStyle(wrapper)
        : null;

    var contentStyle =
      content
        ? getComputedStyle(content)
        : null;

    return {
      version: VERSION,

      route:
        cleanPath(
          window.location.pathname
        ),

      header:
        rect(header),

      actions:
        rect(actions),

      notification:
        rect(toggle),

      shell: {
        wrapper:
          rect(wrapper),

        position:
          wrapperStyle
            ? wrapperStyle.position
            : null,

        marginLeft:
          wrapperStyle
            ? wrapperStyle.marginLeft
            : null,

        transition:
          wrapperStyle
            ? wrapperStyle.transition
            : null,

        contentTransition:
          contentStyle
            ? contentStyle.transition
            : null,

        contentTransform:
          contentStyle
            ? contentStyle.transform
            : null,

        contentOpacity:
          contentStyle
            ? contentStyle.opacity
            : null
      },

      counts: {
        header:
          document.querySelectorAll(
            '.pmd-settings-family-header-v17'
          ).length,

        notifRoot:
          document.querySelectorAll(
            '#notif-root'
          ).length,

        notifDropdown:
          document.querySelectorAll(
            '#notifDropdown'
          ).length,

        bell:
          document.querySelectorAll(
            '#bell-icon'
          ).length,

        count:
          document.querySelectorAll(
            '#notification-count'
          ).length,

        v17Slots:
          header
            ? header.querySelectorAll(
                '[data-pmd-settings-family-notif-slot-v17]'
              ).length
            : 0,

        legacyGaps:
          header
            ? header.querySelectorAll(
                '[data-pmd-main-header-notification-gap-r67],' +
                '[data-pmd-main-header-notification-gap-r66],' +
                '[data-pmd-settings-header-gap-v11],' +
                '[data-pmd-settings-gap-v15],' +
                '[data-pmd-owner-header-notif-divider-v1]'
              ).length
            : 0
      },

      realNotificationMounted:
        Boolean(
          root &&
          header &&
          header.contains(root)
        )
    };
  }


  /*
   * Run once immediately at the bottom of the document.
   * This normally completes before first visual paint.
   */
  normalize();


  /*
   * Run once again after deferred scripts have completed.
   * This is event-driven only: no polling and no delayed geometry pass.
   */
  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      normalize,
      { once: true }
    );
  }


  window.PMDSettingsFamilyHeaderV17 = {
    version: VERSION,
    normalize: normalize,
    audit: audit
  };


  console.info(
    '[PMD Settings Family Header V17] Ready',
    audit()
  );
})();
