(function () {
  'use strict';

  if (window.PMDReservations2PolishFinalV6) return;

  function menuIcon() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true">',
      '<path d="M4 7h16"></path>',
      '<path d="M4 12h16"></path>',
      '<path d="M4 17h16"></path>',
      '</svg>'
    ].join('');
  }

  function applyHeader() {
    var header =
      document.getElementById(
        'pmd-r2-clean-header'
      );

    if (!header) return false;

    /*
     * Remove every old Back button instead of only hiding it.
     */
    header
      .querySelectorAll(
        '.pmd-r2-mobile-back'
      )
      .forEach(function (button) {
        button.remove();
      });

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

    var actions =
      header.querySelector(
        '.pmd-r2-clean-actions'
      );

    var notification =
      header.querySelector(
        '#notif-root'
      );

    var plus =
      actions
        ? actions.querySelector(
            '.pmd-r2-clean-action'
          )
        : null;

    /*
     * DOM order:
     * Plus then Notification.
     *
     * Notification therefore becomes the far-right control.
     */
    if (actions) {
      if (plus) {
        actions.appendChild(plus);
      }

      if (notification) {
        actions.appendChild(notification);
      }
    }

    header.classList.add(
      'pmd-r2-polish-v6-ready'
    );

    return true;
  }

  function removeFloor() {
    var root =
      document.getElementById(
        'pmd-reservations2'
      );

    if (!root) return false;

    root
      .querySelectorAll(
        '.pmd-r2__floor-panel'
      )
      .forEach(function (panel) {
        panel.setAttribute('data-pmd-r2-polish-floor-preserved', 'true');
      });

    return true;
  }

  function apply() {
    var headerReady = applyHeader();
    var rootReady = removeFloor();

    return headerReady && rootReady;
  }

  function boot() {
    var attempts = 0;

    var timer =
      window.setInterval(
        function () {
          attempts += 1;

          if (
            apply() ||
            attempts >= 60
          ) {
            window.clearInterval(timer);
          }
        },
        100
      );

    apply();
  }

  window.PMDReservations2PolishFinalV6 = {
    version: '6.0.0',
    refresh: apply,
    removesFloor: true,
    removesBackButton: true,
    notificationIsFarRight: true
  };

  if (
    document.readyState ===
    'loading'
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
