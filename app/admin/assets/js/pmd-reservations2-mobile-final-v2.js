(function () {
  'use strict';

  function backIcon() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true">',
      '<path d="M15 6l-6 6l6 6"></path>',
      '</svg>'
    ].join('');
  }

  function menuIcon() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true">',
      '<path d="M4 7h16"></path>',
      '<path d="M4 12h16"></path>',
      '<path d="M4 17h16"></path>',
      '</svg>'
    ].join('');
  }

  function ensureHeaderControls() {
    var header = document.getElementById(
      'pmd-r2-clean-header'
    );

    if (!header) return false;

    var title = header.querySelector(
      '.pmd-r2-clean-title'
    );

    var actions = header.querySelector(
      '.pmd-r2-clean-actions'
    );

    var back = header.querySelector(
      '.pmd-r2-mobile-back'
    );

    if (!back) {
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'pmd-r2-mobile-back';
      back.innerHTML = backIcon();

      back.addEventListener('click', function () {
        if (
          document.referrer &&
          document.referrer.indexOf(
            window.location.origin
          ) === 0
        ) {
          window.history.back();
          return;
        }

        window.location.href =
          '/admin/dashboard';
      });
    }

    back.setAttribute(
      'aria-label',
      'Go back'
    );

    back.setAttribute(
      'title',
      'Back'
    );

    var menu = header.querySelector(
      '[data-pmd-r2-mobile-menu], ' +
      '.pmd-r2-mobile-toggle, ' +
      '.pmd-r2-mobile-menu'
    );

    if (menu) {
      menu.classList.add(
        'pmd-r2-mobile-toggle'
      );

      menu.setAttribute(
        'data-pmd-r2-mobile-menu',
        ''
      );

      menu.setAttribute(
        'aria-label',
        'Open navigation'
      );

      menu.setAttribute(
        'title',
        'Menu'
      );

      menu.innerHTML = menuIcon();
    }

    /*
     * Exact DOM order:
     * Back, Hamburger, hidden title, actions.
     */
    if (title) {
      header.insertBefore(back, title);

      if (menu) {
        header.insertBefore(menu, title);
      }
    } else {
      header.insertBefore(
        back,
        header.firstChild
      );

      if (menu) {
        header.insertBefore(
          menu,
          back.nextSibling
        );
      }
    }

    /*
     * Right-side order:
     * Notification, then Plus.
     */
    if (actions) {
      var notification =
        header.querySelector('#notif-root');

      var plus =
        actions.querySelector(
          '.pmd-r2-clean-action'
        );

      if (notification) {
        actions.appendChild(notification);
      }

      if (plus) {
        actions.appendChild(plus);
      }
    }

    header.classList.add(
      'pmd-r2-back-v5-ready'
    );

    return true;
  }

  function boot() {
    var attempts = 0;

    var timer = window.setInterval(
      function () {
        attempts += 1;

        if (
          ensureHeaderControls() ||
          attempts >= 60
        ) {
          window.clearInterval(timer);
        }
      },
      100
    );

    ensureHeaderControls();
  }

  window.PMDReservations2MobileFinalV2 = {
    version: '5.0.0',
    refresh: ensureHeaderControls
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
