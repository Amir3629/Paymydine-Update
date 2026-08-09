(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-restaurant-profile]');
  if (!root) return;

  var form = document.getElementById('pmd-restaurant-profile-form');
  var initialFormState = '';
  var dirtyTrackingArmed = false;

  function installHeaderButtonAuthority() {
    var oldStyle = document.getElementById('pmd-profile-header-button-authority-v3');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'pmd-profile-header-button-authority-v6';
    style.textContent = [
      '/* PMD_RESTAURANT_PROFILE_ACTION_STATE_V6 */',
      '#pmd-profile-header .pmd-profile-header__actions {',
      '  display:flex !important;',
      '  flex-direction:row !important;',
      '  direction:ltr !important;',
      '  align-items:center !important;',
      '  justify-content:flex-end !important;',
      '  gap:8px !important;',
      '  min-height:42px !important;',
      '}',
      '#pmd-profile-header #notif-root {',
      '  order:20 !important;',
      '  width:42px !important;',
      '  height:42px !important;',
      '  min-width:42px !important;',
      '  max-width:42px !important;',
      '  flex:0 0 42px !important;',
      '  display:block !important;',
      '  position:relative !important;',
      '  padding:0 !important;',
      '  margin:0 !important;',
      '  list-style:none !important;',
      '}',
      '#pmd-profile-header #notifDropdown {',
      '  box-sizing:border-box !important;',
      '  width:42px !important;',
      '  height:42px !important;',
      '  min-width:42px !important;',
      '  max-width:42px !important;',
      '  min-height:42px !important;',
      '  max-height:42px !important;',
      '  display:inline-flex !important;',
      '  align-items:center !important;',
      '  justify-content:center !important;',
      '  padding:0 !important;',
      '  margin:0 !important;',
      '  border:1px solid #c9e0ef !important;',
      '  border-radius:12px !important;',
      '  background:#fff !important;',
      '  color:#17231f !important;',
      '  box-shadow:none !important;',
      '  -webkit-appearance:none !important;',
      '  appearance:none !important;',
      '}',
      '#pmd-profile-header #notifDropdown > i {',
      '  display:none !important;',
      '}',
      '#pmd-profile-header #notifDropdown:after {',
      '  display:none !important;',
      '  content:none !important;',
      '}',
      '#pmd-profile-header .pmd-profile-notification-bell,',
      '#pmd-profile-header .pmd-profile-notification-bell svg {',
      '  width:20px !important;',
      '  height:20px !important;',
      '  min-width:20px !important;',
      '  max-width:20px !important;',
      '  min-height:20px !important;',
      '  max-height:20px !important;',
      '  display:block !important;',
      '}',
      '#pmd-profile-header .pmd-profile-notification-bell svg {',
      '  fill:none !important;',
      '  stroke:currentColor !important;',
      '  stroke-width:2 !important;',
      '  stroke-linecap:round !important;',
      '  stroke-linejoin:round !important;',
      '}',
      '#pmd-profile-header #notification-count {',
      '  position:absolute !important;',
      '  top:-6px !important;',
      '  right:-7px !important;',
      '  z-index:5 !important;',
      '  min-width:18px !important;',
      '  height:18px !important;',
      '  padding:0 4px !important;',
      '  border:2px solid #fff !important;',
      '  border-radius:999px !important;',
      '  background:#d83a31 !important;',
      '  color:#fff !important;',
      '  font-size:9px !important;',
      '  font-weight:800 !important;',
      '  line-height:14px !important;',
      '  text-align:center !important;',
      '}',
      '#pmd-profile-header button.pmd-profile-save-icon {',
      '  order:10 !important;',
      '  box-sizing:border-box !important;',
      '  overflow:hidden !important;',
      '  opacity:0 !important;',
      '  visibility:hidden !important;',
      '  pointer-events:none !important;',
      '  width:0 !important;',
      '  min-width:0 !important;',
      '  max-width:0 !important;',
      '  height:42px !important;',
      '  min-height:42px !important;',
      '  max-height:42px !important;',
      '  flex:0 0 0 !important;',
      '  margin:0 -8px 0 0 !important;',
      '  padding:0 !important;',
      '  border:0 solid #c9e0ef !important;',
      '  border-radius:12px !important;',
      '  background:#fff !important;',
      '  color:#075f4f !important;',
      '  box-shadow:none !important;',
      '  transform:translateX(8px) scale(.9) !important;',
      '  transition:width .2s cubic-bezier(.2,.8,.2,1), min-width .2s cubic-bezier(.2,.8,.2,1), max-width .2s cubic-bezier(.2,.8,.2,1), flex-basis .2s cubic-bezier(.2,.8,.2,1), margin .2s cubic-bezier(.2,.8,.2,1), opacity .16s ease, transform .2s cubic-bezier(.2,.8,.2,1), border-width .15s ease !important;',
      '  -webkit-appearance:none !important;',
      '  appearance:none !important;',
      '}',
      '#pmd-profile-header button.pmd-profile-save-icon.is-visible {',
      '  opacity:1 !important;',
      '  visibility:visible !important;',
      '  pointer-events:auto !important;',
      '  width:42px !important;',
      '  min-width:42px !important;',
      '  max-width:42px !important;',
      '  flex:0 0 42px !important;',
      '  margin:0 !important;',
      '  border-width:1px !important;',
      '  transform:translateX(0) scale(1) !important;',
      '}',
      '#pmd-profile-header button.pmd-profile-save-icon svg {',
      '  width:20px !important;',
      '  height:20px !important;',
      '  display:block !important;',
      '  fill:none !important;',
      '  stroke:currentColor !important;',
      '  stroke-width:2 !important;',
      '  stroke-linecap:round !important;',
      '  stroke-linejoin:round !important;',
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

    /* Canonical visual order is always: contextual Save, then Notification. */
    actions.appendChild(notificationRoot);
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

  function serializeFormState() {
    if (!form) return '';

    var state = [];

    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field || !field.name || field.type === 'submit' || field.type === 'button') {
        return;
      }

      var type = String(field.type || '').toLowerCase();
      var value;

      if (type === 'checkbox' || type === 'radio') {
        value = field.checked ? '1' : '0';
      } else if (field.tagName === 'SELECT' && field.multiple) {
        value = Array.prototype.filter.call(field.options, function (option) {
          return option.selected;
        }).map(function (option) {
          return option.value;
        }).join(',');
      } else {
        value = String(field.value == null ? '' : field.value);
      }

      state.push(field.name + '=' + value);
    });

    return state.join('&');
  }

  function saveButton() {
    return root.querySelector('.pmd-profile-save-icon');
  }

  function setSaveVisible(visible) {
    var button = saveButton();
    if (!button) return;

    button.classList.toggle('is-visible', Boolean(visible));
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.tabIndex = visible ? 0 : -1;
  }

  function refreshDirtyState() {
    if (!dirtyTrackingArmed) {
      setSaveVisible(false);
      return;
    }

    setSaveVisible(serializeFormState() !== initialFormState);
  }

  function establishCleanBaseline() {
    initialFormState = serializeFormState();
    setSaveVisible(false);
  }

  function armDirtyTracking() {
    establishCleanBaseline();
    dirtyTrackingArmed = true;
  }

  function installDirtyState() {
    if (!form) return;

    /*
     * PMD_RESTAURANT_PROFILE_ACTION_STATE_V6
     * Keep Save hard-hidden during boot. Some admin/autofill scripts normalize
     * fields after DOM ready; they must become part of the clean baseline.
     */
    dirtyTrackingArmed = false;
    setSaveVisible(false);

    form.addEventListener('input', function (event) {
      if (!dirtyTrackingArmed || event.isTrusted !== true) {
        return;
      }
      refreshDirtyState();
    }, true);

    form.addEventListener('change', function (event) {
      var hoursRow = event.target && event.target.closest
        ? event.target.closest('[data-pmd-hours-row]')
        : null;

      if (hoursRow) {
        updateHoursRow(hoursRow);
      }

      if (!dirtyTrackingArmed || event.isTrusted !== true) {
        return;
      }

      refreshDirtyState();
    }, true);

    if (window.jQuery) {
      window.jQuery(form).on('ajaxDone', function () {
        dirtyTrackingArmed = false;
        setSaveVisible(false);
        window.setTimeout(armDirtyTracking, 60);
      });
    }

    form.addEventListener('ajaxDone', function () {
      dirtyTrackingArmed = false;
      setSaveVisible(false);
      window.setTimeout(armDirtyTracking, 60);
    });

    /* Two paints + a short settle window capture browser autofill/global UI normalization. */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.setTimeout(armDirtyTracking, 80);
      });
    });
  }

  installHeaderButtonAuthority();
  installNotification();

  Array.prototype.forEach.call(
    root.querySelectorAll('[data-pmd-hours-row]'),
    function (row) {
      updateHoursRow(row);
    }
  );

  installDirtyState();

  document.documentElement.classList.remove('pmd-restaurant-profile-booting');
  document.documentElement.classList.add('pmd-restaurant-profile-ready');

  window.PMDRestaurantProfileV6 = {
    version: '6.0.0',
    notificationMoved: Boolean(document.querySelector('#pmd-profile-header #notif-root')),
    notificationRightmost: Boolean(
      document.querySelector('[data-pmd-profile-header-actions] #notif-root:last-child')
    ),
    dirtySaveEnabled: true,
    dirtyTrackingArmed: function () { return dirtyTrackingArmed; },
    notificationNormalized: Boolean(document.querySelector('#pmd-profile-header .pmd-profile-notification-bell')),
    legacyNotificationIconRemoved: !Boolean(document.querySelector('#pmd-profile-header #notifDropdown i.fa')),
    actionAuthority: Boolean(document.getElementById('pmd-profile-header-button-authority-v6'))
  };
})();