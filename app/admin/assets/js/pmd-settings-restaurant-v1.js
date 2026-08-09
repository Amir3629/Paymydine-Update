(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-restaurant-profile]');
  if (!root) return;

  function installHeaderButtonAuthority() {
    if (document.getElementById('pmd-profile-header-button-authority-v3')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'pmd-profile-header-button-authority-v3';
    style.textContent = [
      '/* PMD_RESTAURANT_PROFILE_HEADER_BUTTON_FIX_V3 */',
      '#pmd-profile-header .pmd-profile-header__actions {',
      '  display:flex !important;',
      '  align-items:center !important;',
      '  justify-content:flex-end !important;',
      '  gap:8px !important;',
      '  min-height:42px !important;',
      '}',
      '#pmd-profile-header .pmd-profile-header-button,',
      '#pmd-profile-header button.pmd-profile-save-icon,',
      '#pmd-profile-header #notifDropdown {',
      '  box-sizing:border-box !important;',
      '  width:42px !important;',
      '  height:42px !important;',
      '  min-width:42px !important;',
      '  max-width:42px !important;',
      '  min-height:42px !important;',
      '  max-height:42px !important;',
      '  flex:0 0 42px !important;',
      '  display:inline-flex !important;',
      '  align-items:center !important;',
      '  justify-content:center !important;',
      '  padding:0 !important;',
      '  margin:0 !important;',
      '  line-height:1 !important;',
      '  font-size:0 !important;',
      '  vertical-align:middle !important;',
      '  border-radius:11px !important;',
      '  box-shadow:none !important;',
      '  -webkit-appearance:none !important;',
      '  appearance:none !important;',
      '}',
      '#pmd-profile-header button.pmd-profile-save-icon {',
      '  border:1px solid #0d4d42 !important;',
      '  background:#0d4d42 !important;',
      '  color:#fff !important;',
      '}',
      '#pmd-profile-header button.pmd-profile-save-icon:hover {',
      '  border-color:#0a4138 !important;',
      '  background:#0a4138 !important;',
      '}',
      '#pmd-profile-header #notif-root {',
      '  width:42px !important;',
      '  height:42px !important;',
      '  min-width:42px !important;',
      '  flex:0 0 42px !important;',
      '  display:block !important;',
      '  position:relative !important;',
      '  padding:0 !important;',
      '  margin:0 !important;',
      '  list-style:none !important;',
      '}',
      '#pmd-profile-header #notifDropdown {',
      '  border:1px solid #c9e0ef !important;',
      '  background:#fff !important;',
      '  color:#17231f !important;',
      '}',
      '#pmd-profile-header #notifDropdown > i {',
      '  display:none !important;',
      '}',
      '#pmd-profile-header .pmd-profile-notification-bell,',
      '#pmd-profile-header .pmd-profile-notification-bell svg,',
      '#pmd-profile-header .pmd-profile-save-icon svg {',
      '  width:18px !important;',
      '  height:18px !important;',
      '  min-width:18px !important;',
      '  max-width:18px !important;',
      '  min-height:18px !important;',
      '  max-height:18px !important;',
      '  display:block !important;',
      '  flex:0 0 18px !important;',
      '}',
      '#pmd-profile-header .pmd-profile-notification-bell svg,',
      '#pmd-profile-header .pmd-profile-save-icon svg {',
      '  fill:none !important;',
      '  stroke:currentColor !important;',
      '  stroke-width:2 !important;',
      '  stroke-linecap:round !important;',
      '  stroke-linejoin:round !important;',
      '}',
      '#pmd-profile-header #notifDropdown:after {',
      '  display:none !important;',
      '  content:none !important;',
      '}',
      '#pmd-profile-header #notification-count {',
      '  position:absolute !important;',
      '  top:-7px !important;',
      '  right:-8px !important;',
      '  z-index:5 !important;',
      '  font-size:9px !important;',
      '  line-height:14px !important;',
      '  min-width:20px !important;',
      '  height:16px !important;',
      '  padding:0 5px !important;',
      '  border-radius:999px !important;',
      '}',
      '#pmd-profile-header #pmd-profile-save-status:empty {',
      '  display:none !important;',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function normalizeNotificationIcon(notificationRoot) {
    if (!notificationRoot) return;

    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (!toggle) return;

    /* Remove the legacy FontAwesome bell before installing the mother-kit SVG. */
    Array.prototype.forEach.call(
      toggle.querySelectorAll('i.fa, i.fas, i.far, i.fal, i.fab'),
      function (legacyIcon) {
        legacyIcon.remove();
      }
    );

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

    toggle.classList.add('pmd-profile-notification-toggle');
  }

  function installNotification() {
    var actions = root.querySelector('[data-pmd-profile-header-actions]');
    var notificationRoot = document.getElementById('notif-root');

    if (!actions || !notificationRoot) return;

    notificationRoot.classList.remove('show');
    notificationRoot.classList.add('pmd-profile-notification-root');

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

  installHeaderButtonAuthority();
  installNotification();

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

  document.documentElement.classList.remove('pmd-restaurant-profile-booting');
  document.documentElement.classList.add('pmd-restaurant-profile-ready');

  window.PMDRestaurantProfileV3 = {
    version: '3.1.0',
    notificationMoved: Boolean(document.querySelector('#pmd-profile-header #notif-root')),
    notificationNormalized: Boolean(document.querySelector('#pmd-profile-header .pmd-profile-notification-bell')),
    legacyNotificationIconRemoved: !Boolean(document.querySelector('#pmd-profile-header #notifDropdown i.fa')),
    headerButtonAuthority: Boolean(document.getElementById('pmd-profile-header-button-authority-v3'))
  };
})();