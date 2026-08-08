(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-restaurant-profile]');
  if (!root) return;

  function normalizeNotificationIcon(notificationRoot) {
    if (!notificationRoot) return;

    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (!toggle) return;

    var bell = toggle.querySelector('#bell-icon');

    if (!bell) {
      bell = document.createElement('span');
      bell.id = 'bell-icon';
      bell.className = 'pmd-profile-notification-bell';
      toggle.insertBefore(bell, toggle.firstChild || null);
    }

    bell.classList.add('pmd-profile-notification-bell');
    bell.innerHTML = [
      '<svg viewBox="0 0 24 24" aria-hidden="true">',
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>',
      '<path d="M10 21h4"></path>',
      '</svg>'
    ].join('');
  }

  function installNotification() {
    var actions = root.querySelector('[data-pmd-profile-header-actions]');
    var notificationRoot = document.getElementById('notif-root');

    if (!actions || !notificationRoot) return;

    notificationRoot.classList.remove('show');

    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (toggle) {
      toggle.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    }

    Array.prototype.forEach.call(
      notificationRoot.querySelectorAll('.dropdown-menu.show'),
      function (menu) {
        menu.classList.remove('show');
        menu.style.removeProperty('display');
      }
    );

    normalizeNotificationIcon(notificationRoot);

    var saveStatus = document.getElementById('pmd-profile-save-status');
    var saveButton = actions.querySelector('.pmd-profile-save-icon');

    if (saveButton) {
      actions.insertBefore(notificationRoot, saveButton);
    } else if (saveStatus && saveStatus.parentNode === actions) {
      actions.insertBefore(notificationRoot, saveStatus);
    } else {
      actions.appendChild(notificationRoot);
    }
  }

  function updateHoursRow(row) {
    var enabled = row.querySelector('[data-pmd-hours-enabled]');
    var state = row.querySelector('[data-pmd-hours-state]');
    var times = row.querySelectorAll('[data-pmd-hours-time]');
    var open = Boolean(enabled && enabled.checked);

    row.classList.toggle('is-closed', !open);

    if (state) {
      state.textContent = open ? 'Open' : 'Closed';
    }

    Array.prototype.forEach.call(times, function (input) {
      input.disabled = !open;
    });
  }

  Array.prototype.forEach.call(
    root.querySelectorAll('[data-pmd-hours-row]'),
    function (row) {
      updateHoursRow(row);

      var enabled = row.querySelector('[data-pmd-hours-enabled]');
      if (enabled) {
        enabled.addEventListener('change', function () {
          updateHoursRow(row);
        });
      }
    }
  );

  installNotification();

  document.documentElement.classList.remove('pmd-restaurant-profile-booting');
  document.documentElement.classList.add('pmd-restaurant-profile-ready');

  window.PMDRestaurantProfileV2 = {
    version: '2.0.0',
    notificationMoved: Boolean(document.querySelector('#pmd-profile-header #notif-root')),
    notificationNormalized: Boolean(document.querySelector('#pmd-profile-header .pmd-profile-notification-bell'))
  };
})();
