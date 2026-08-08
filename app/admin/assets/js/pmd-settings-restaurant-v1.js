(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-restaurant-profile]');
  if (!root) return;

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

    var saveStatus = document.getElementById('pmd-profile-save-status');
    if (saveStatus && saveStatus.parentNode === actions) {
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

  window.PMDRestaurantProfileV1 = {
    version: '1.0.0',
    locationId: Number(root.getAttribute('data-location-id') || 0),
    notificationMoved: Boolean(document.querySelector('#pmd-profile-header #notif-root'))
  };
})();
