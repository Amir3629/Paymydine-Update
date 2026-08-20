(function () {
  'use strict';

  var VERSION = '18.3.0';


  function cleanPath(value) {
    return String(value || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '') || '/';
  }


  function allowed(path) {
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

    return path.indexOf('/admin/pmddevices/') === 0;
  }


  var path =
    cleanPath(window.location.pathname);

  if (!allowed(path)) {
    return;
  }


  function findHeader() {
    if (path === '/admin/pmdsettings/restaurant') {
      return document.getElementById(
        'pmd-profile-header'
      );
    }

    if (path === '/admin/pmdsettings/frontend') {
      return document.querySelector(
        '.pmd-frontend-header'
      );
    }

    if (path === '/admin/pmdmenu') {
      return document.getElementById(
        'pmd-menu-header'
      );
    }

    if (path === '/admin/pmdteam') {
      return document.getElementById(
        'pmd-team-header'
      );
    }

    if (
      path === '/admin/pmddevices' ||
      path.indexOf('/admin/pmddevices/') === 0
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
      '.pmd-owner-header'
    );
  }


  function findActions(header) {
    if (!header) {
      return null;
    }

    return (
      header.querySelector(
        '[data-pmd-profile-header-actions]'
      ) ||
      header.querySelector(
        '[data-pmd-menu-header-actions]'
      ) ||
      header.querySelector(
        '[data-pmd-team-actions]'
      ) ||
      header.querySelector(
        '[data-pmd-owner-header-actions]'
      ) ||
      header.querySelector(
        '.pmd-frontend-header__actions'
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
        '.pmd-owner-header__actions'
      )
    );
  }


  function normalizeBell(root) {
    if (!root) {
      return;
    }

    /*
     * Legacy top-menu inline geometry must not remain the owner
     * after the node enters the V18 slot.
     */
    root.removeAttribute('style');

    root.classList.remove('show');

    root
      .querySelectorAll(
        '[data-pmd-main-header-notification-divider-r66],' +
        '[data-pmd-main-header-notification-divider-r67]'
      )
      .forEach(function (node) {
        node.remove();
      });

    root
      .querySelectorAll(
        '.dropdown-menu.show'
      )
      .forEach(function (menu) {
        menu.classList.remove('show');
        menu.style.removeProperty('display');
      });

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

    toggle
      .querySelectorAll(
        'i.fa, i.fas, i.far, i.fal, i.fab'
      )
      .forEach(function (icon) {
        icon.remove();
      });

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

    bells
      .slice(1)
      .forEach(function (duplicate) {
        duplicate.remove();
      });

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

    if (
      count &&
      bell.contains(count)
    ) {
      toggle.appendChild(count);
    }

    bell.removeAttribute('style');

    bell.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
        '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' +
      '</svg>';

    root.setAttribute(
      'data-pmd-settings-family-real-notif-v18',
      '1'
    );
  }


  function removeOldGeometry(actions) {
    if (!actions) {
      return;
    }

    actions
      .querySelectorAll(
        '[data-pmd-main-header-notification-gap-r67],' +
        '[data-pmd-main-header-notification-gap-r66],' +
        '[data-pmd-settings-header-gap-v11],' +
        '[data-pmd-settings-gap-v15],' +
        '[data-pmd-owner-header-notif-divider-v1]'
      )
      .forEach(function (node) {
        if (!node.closest('#notif-root')) {
          node.remove();
        }
      });
  }


  function mount() {
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

    var slot =
      actions.querySelector(
        '[data-pmd-settings-family-notif-slot-v18]'
      );

    if (!slot) {
      return false;
    }

    var root =
      document.getElementById(
        'notif-root'
      );

    if (!root) {
      return false;
    }

    removeOldGeometry(actions);
    normalizeBell(root);

    // PMD_SETTINGS_FAMILY_PERMANENT_COUNT_V18_3
    /*
     * Permanent server-visible counter.
     *
     * Do NOT move #notification-count into the visible Bell.
     * That was the final remaining refresh-size change.
     *
     * Keep the real count node inside #notif-root so the original
     * notification engine remains its sole data owner.
     */
    var visual =
      slot.querySelector(
        '[data-pmd-settings-family-notif-visual-v18]'
      );

    var liveCount =
      document.getElementById(
        'notification-count'
      );

    var visualCount =
      visual
        ? visual.querySelector(
            '[data-pmd-settings-family-notification-count-v18]'
          )
        : null;

    if (visual) {
      visual.setAttribute(
        'aria-hidden',
        'false'
      );
    }

    /*
     * One immediate synchronization in case API count changed
     * between server render and this runtime pass.
     */
    if (
      liveCount &&
      visualCount
    ) {
      var initialValue =
        Math.max(
          0,
          Number(
            liveCount.textContent
          ) || 0
        );

      visualCount.textContent =
        String(initialValue);

      visualCount.classList.toggle(
        'd-none',
        initialValue <= 0
      );
    }

    if (!slot.contains(root)) {
      slot.appendChild(root);
    }

    if (slot !== actions.lastElementChild) {
      actions.appendChild(slot);
    }

    root.removeAttribute('hidden');

    header.setAttribute(
      'data-pmd-settings-family-header-v18',
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

    var slot =
      header
        ? header.querySelector(
            '[data-pmd-settings-family-notif-slot-v18]'
          )
        : null;

    var root =
      document.getElementById(
        'notif-root'
      );

    var toggle =
      document.getElementById(
        'notifDropdown'
      );

    var wrapper =
      document.querySelector(
        '.page-wrapper'
      );

    var content =
      document.querySelector(
        '.page-content'
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
      route: path,

      header: rect(header),
      actions: rect(actions),
      slot: rect(slot),
      notification: rect(toggle),
      wrapper: rect(wrapper),

      exactLayoutBypassed:
        Boolean(
          window.PMDSettingsFamilyStaticShellV18 &&
          window.PMDSettingsFamilyStaticShellV18
            .settingsFamilyV18
        ),

      realInsideSlot:
        Boolean(
          root &&
          slot &&
          slot.contains(root)
        ),

      directRoot:
        Boolean(
          root &&
          actions &&
          root.parentElement === actions
        ),

      shell: {
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
        slot:
          header
            ? header.querySelectorAll(
                '[data-pmd-settings-family-notif-slot-v18]'
              ).length
            : 0,

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

        notificationCount:
          document.querySelectorAll(
            '#notification-count'
          ).length,

        oldV17Header:
          document.querySelectorAll(
            '[data-pmd-settings-family-header-v17]'
          ).length
      }
    };
  }


  /*
   * First ownership pass at end of BODY.
   */
  mount();


  /*
   * Legacy deferred page scripts execute before DOMContentLoaded.
   * One event-driven reclaim is enough.
   *
   * No timeout.
   * No observer.
   * No polling.
   */
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      mount,
      { once: true }
    );
  }


  window.PMDSettingsFamilyHeaderV18 = {
    version: VERSION,
    mount: mount,
    audit: audit
  };


  console.info(
    '[PMD Settings Family Header V18] Ready',
    audit()
  );
})();
