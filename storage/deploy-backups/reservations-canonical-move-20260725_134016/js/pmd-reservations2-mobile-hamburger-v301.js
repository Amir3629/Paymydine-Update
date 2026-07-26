(function () {
  'use strict';

  if (window.PMDReservations2MobileMenuV303) {
    window.PMDReservations2MobileMenuV303.refresh();
    return;
  }

  var BUTTON_CLASS =
    'pmd-r2-mobile-hamburger-v301';

  var BACKDROP_CLASS =
    'pmd-r2-mobile-menu-backdrop-v302';

  function isReservations2() {
    return Boolean(
      document.getElementById(
        'pmd-reservations2'
      )
    );
  }

  function isMobile() {
    return window.matchMedia(
      '(max-width: 820px)'
    ).matches;
  }

  function getHeader() {
    return (
      document.getElementById(
        'pmd-r2-clean-header'
      ) ||
      document.querySelector(
        '#pmd-reservations2 header'
      ) ||
      document.querySelector(
        '#pmd-reservations2 .pmd-r2__hero'
      )
    );
  }

  function getMenu() {
    return document.getElementById(
      'pmd-side-menu2'
    );
  }

  function isOpen() {
    return document.documentElement
      .classList.contains(
        'pmd-sm2-expanded'
      );
  }

  function iconHtml() {
    return (
      '<svg ' +
      'viewBox="0 0 24 24" ' +
      'aria-hidden="true" ' +
      'focusable="false">' +

        '<path d="M4 6h16" ' +
        'stroke="currentColor" ' +
        'stroke-width="2" ' +
        'stroke-linecap="round"/>' +

        '<path d="M4 12h16" ' +
        'stroke="currentColor" ' +
        'stroke-width="2" ' +
        'stroke-linecap="round"/>' +

        '<path d="M4 18h16" ' +
        'stroke="currentColor" ' +
        'stroke-width="2" ' +
        'stroke-linecap="round"/>' +

      '</svg>'
    );
  }

  function setOpen(open) {
    var api =
      window.PMDSideMenu2GlobalV3;

    if (
      api &&
      typeof api.applyState ===
        'function'
    ) {
      api.applyState(
        open
          ? 'expanded'
          : 'collapsed'
      );
    }

    /*
     * Also set the classes directly because old page
     * authorities may interfere with the API state.
     */
    document.documentElement
      .classList.toggle(
        'pmd-sm2-expanded',
        open
      );

    document.documentElement
      .classList.toggle(
        'pmd-sm2-collapsed',
        !open
      );

    document.body.classList.toggle(
      'pmd-r2-mobile-drawer-open',
      open
    );

    refreshState();
  }

  function ensureButton() {
    if (
      !isReservations2() ||
      !isMobile()
    ) {
      return null;
    }

    var header = getHeader();

    if (!header) {
      return null;
    }

    var button =
      document.querySelector(
        '.' + BUTTON_CLASS
      );

    if (!button) {
      button =
        document.createElement(
          'button'
        );

      button.type = 'button';
      button.className = BUTTON_CLASS;

      button.setAttribute(
        'data-pmd-r2-mobile-menu',
        'v303'
      );

      button.setAttribute(
        'title',
        'Menu'
      );

      button.innerHTML =
        iconHtml();

      /*
       * Keep it as the first left-side mobile control.
       */
      var back =
        header.querySelector(
          '.pmd-r2-mobile-back'
        );

      if (back) {
        back.insertAdjacentElement(
          'afterend',
          button
        );
      } else {
        header.insertBefore(
          button,
          header.firstChild
        );
      }
    }

    if (
      button.getAttribute(
        'data-v303-connected'
      ) !== 'true'
    ) {
      button.setAttribute(
        'data-v303-connected',
        'true'
      );

      button.addEventListener(
        'click',
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          setOpen(
            !isOpen()
          );
        },
        true
      );
    }

    return button;
  }

  function ensureBackdrop() {
    var backdrop =
      document.querySelector(
        '.' + BACKDROP_CLASS
      );

    if (!backdrop) {
      backdrop =
        document.createElement(
          'div'
        );

      backdrop.className =
        BACKDROP_CLASS;

      backdrop.setAttribute(
        'aria-hidden',
        'true'
      );

      backdrop.addEventListener(
        'click',
        function () {
          setOpen(false);
        }
      );

      document.body.appendChild(
        backdrop
      );
    }

    return backdrop;
  }

  function refreshState() {
    var button =
      document.querySelector(
        '.' + BUTTON_CLASS
      );

    if (!button) {
      return;
    }

    var open = isOpen();

    button.setAttribute(
      'aria-expanded',
      open ? 'true' : 'false'
    );

    button.setAttribute(
      'aria-label',
      open
        ? 'Close navigation'
        : 'Open navigation'
    );
  }

  function refresh() {
    if (!isReservations2()) {
      return;
    }

    ensureBackdrop();
    ensureButton();
    refreshState();
  }

  function boot() {
    refresh();

    document.addEventListener(
      'keydown',
      function (event) {
        if (
          event.key === 'Escape' &&
          isOpen()
        ) {
          setOpen(false);
        }
      }
    );

    document.addEventListener(
      'click',
      function (event) {
        var link =
          event.target.closest(
            '#pmd-side-menu2 a[href]'
          );

        if (link && isMobile()) {
          setOpen(false);
        }
      },
      true
    );

    window.addEventListener(
      'resize',
      function () {
        if (!isMobile()) {
          setOpen(false);
        }

        refresh();
      }
    );

    /*
     * Recreate the button only if another legacy authority
     * removes or rebuilds the header.
     */
    new MutationObserver(
      function () {
        if (
          isMobile() &&
          !document.querySelector(
            '.' + BUTTON_CLASS
          )
        ) {
          refresh();
        }
      }
    ).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    [
      0,
      100,
      300,
      700,
      1500,
      3000
    ].forEach(function (delay) {
      setTimeout(
        refresh,
        delay
      );
    });

    console.info(
      '[PMD Reservations2 Mobile Menu V3.0.3] Ready',
      {
        button:
          Boolean(
            document.querySelector(
              '.' + BUTTON_CLASS
            )
          ),

        menu:
          Boolean(getMenu()),

        mobile:
          isMobile()
      }
    );
  }

  window.PMDReservations2MobileMenuV303 = {
    version: '3.0.3',

    refresh: refresh,

    open: function () {
      setOpen(true);
    },

    close: function () {
      setOpen(false);
    },

    toggle: function () {
      setOpen(
        !isOpen()
      );
    }
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
