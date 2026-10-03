/* PMD_SETTINGS_POLISH_R5_CANONICAL_AUTHORITY */
/* PMD_SETTINGS_POLISH_R4 */
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');

  // PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4
  function localized(value) {
    var clean = String(value == null ? '' : value);

    if (window.PMDAdminI18n && typeof window.PMDAdminI18n.translate === 'function') {
      var translated = window.PMDAdminI18n.translate(clean);
      if (translated && translated !== clean) return translated;
    }

    var current = window.PMD_PLATFORM_MESSAGES || {};
    var english = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
    var keys = Object.keys(english);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (english[key] === clean && typeof current[key] === 'string' && current[key].trim()) {
        return current[key];
      }
    }

    return clean;
  }

  // PMD_SETTINGS_DIRECT_CANONICAL_I18N_R5
  // R4 used reverse English-value lookup. That is fragile when another runtime
  // writes the same English copy later. R5 makes the canonical key the owner.
  var PMD_CANONICAL_KEY_BY_ENGLISH_R5 = Object.freeze({
    'PNG, JPG or WEBP · max 5 MB.': 'r4.settings.png_help',
    'Shown on your digital menu.': 'r4.settings.shown_menu',
    'Shown to guests on your digital menu.': 'r4.settings.shown_guests',
    'Choose the look of your digital menu.': 'r4.settings.choose_look',
    'Choose a theme for your digital menu.': 'r4.settings.choose_theme',
    'Add staff and manage who can sign in.': 'r4.settings.add_staff',
    'Built-in roles for your team.': 'r4.settings.builtin_roles',
    'Payment terminals, kitchen displays and cash drawers.': 'r4.devices.overview_help',
    'See your connected devices in one place.': 'r4.devices.connected_help',
    'POS screens used by your team.': 'r4.devices.pos_help',
    'Card readers connected to PayMyDine.': 'r4.devices.card_reader_help',
    'Kitchen screens for your orders.': 'r4.devices.kitchen_help',
    'Cash drawers connected to your POS.': 'r4.devices.cash_drawer_help',
    'Devices used for staff sign-in.': 'r4.devices.staff_signin_help',
    'Extra device connections and setup.': 'r4.devices.extra_setup_help',
    'Choose how guests can pay.': 'r4.finance.choose_pay',
    'Set VAT, receipts and invoice details.': 'r4.finance.tax_invoice',
    'Set up Fiskaly and TSE for Germany.': 'r4.finance.fiskaly',
    'Remove logo': 'r4.settings.remove_logo',
    'No restaurant logo selected': 'r4.settings.no_logo',
    'Selected restaurant logo preview': 'r4.settings.logo_preview'
  });

  function canonical(value) {
    var clean = String(value == null ? '' : value);
    var key = PMD_CANONICAL_KEY_BY_ENGLISH_R5[clean] || '';

    if (key && window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {
      var direct = window.PMDPlatformMessages.t(key, {}, clean);
      if (typeof direct === 'string' && direct.trim() && direct !== key) return direct;
    }

    var current = window.PMD_PLATFORM_MESSAGES || {};
    if (key && typeof current[key] === 'string' && current[key].trim()) {
      return current[key];
    }

    return localized(clean);
  }

  function text(node, value) {
    value = canonical(value);
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }

  function simplifyOwnerCopy() {
    var root;

    if (path === '/admin/pmdsettings/restaurant') {
      root = document.getElementById('pmd-restaurant-profile');
      if (!root) return;

      Array.prototype.slice.call(root.querySelectorAll(
        '.pmd-profile-customer-menu-note-r19, .pmd-profile-logo-authority-r21, .pmd-profile-logo-source-r20'
      )).forEach(function (node) {
        node.remove();
      });

      text(root.querySelector('.pmd-profile-logo-help-r19'), 'PNG, JPG or WEBP · max 5 MB.');
      text(root.querySelector('.pmd-profile-section--blue .pmd-profile-card__header p'), 'Shown on your digital menu.');
      text(root.querySelector('.pmd-profile-section--cyan .pmd-profile-card__header p'), 'Shown to guests on your digital menu.');
      return;
    }

    if (path === '/admin/pmdsettings/frontend') {
      root = document.getElementById('pmd-frontend-settings');
      if (!root) return;
      text(root.querySelector('.pmd-frontend-header__left p'), 'Choose the look of your digital menu.');
      text(root.querySelector('.pmd-frontend-form > .pmd-frontend-section:first-child .pmd-frontend-card__header p'), 'Choose a theme for your digital menu.');
      return;
    }

    if (path === '/admin/pmdteam') {
      root = document.getElementById('pmd-team-access');
      if (!root) return;
      text(root.querySelector('#pmd-team-members-section .pmd-team-card__header p'), 'Add staff and manage who can sign in.');
      text(root.querySelector('#pmd-team-roles-section .pmd-team-card__header p'), 'Built-in roles for your team.');
      return;
    }

    // PMD_SETTINGS_DEVICES_CLEAN_ALIAS_R4
    if (path === '/admin/pmddevices' || path === '/admin/settings/devices') {
      root = document.getElementById('pmd-devices-page');
      if (!root) return;

      [
        ['#hardware-overview', 'Payment terminals, kitchen displays and cash drawers.'],
        ['#pos-devices', 'POS screens used by your team.'],
        ['#payment-terminals', 'Card readers connected to PayMyDine.'],
        ['#kds', 'Kitchen screens for your orders.'],
        ['#cash-drawers', 'Cash drawers connected to your POS.'],
        ['#biometric', 'Devices used for staff sign-in.'],
        ['#device-configuration', 'Extra device connections and setup.']
      ].forEach(function (entry) {
        text(root.querySelector(entry[0] + ' .pmd-owner-card__title p'), entry[1]);
      });
      return;
    }

    if (path === '/admin/pmdfinance') {
      root = document.getElementById('pmd-finance-page');
      if (!root) return;
      text(root.querySelector('#payment-methods .pmd-owner-card__title p'), 'Choose how guests can pay.');
      text(root.querySelector('#tax-invoicing .pmd-owner-card__title p'), 'Set VAT, receipts and invoice details.');
      text(root.querySelector('#fiskaly .pmd-owner-card__title p'), 'Set up Fiskaly and TSE for Germany.');
    }
  }

  function bindRestaurantLogo() {
    if (path !== '/admin/pmdsettings/restaurant') return;

    var root = document.getElementById('pmd-restaurant-profile');
    if (!root) return;

    var uploader = root.querySelector('.pmd-profile-logo-uploader-r19');
    var preview = root.querySelector('#pmd-restaurant-logo-preview-r19');
    var checkbox = root.querySelector('input[name="profile[remove_logo]"]');
    var fileInput = root.querySelector('input[type="file"][name="pmd_restaurant_logo"], input[type="file"][name="profile[logo]"]');

    if (!uploader || !preview || !checkbox) return;

    var label = checkbox.closest('.pmd-profile-logo-remove-r20') || checkbox.closest('label');
    if (!label) return;

    label.classList.add('pmd-profile-logo-remove-r20');
    checkbox.disabled = false;
    checkbox.removeAttribute('disabled');

    var copy = label.querySelector('span');
    if (copy) text(copy, 'Remove logo');

    if (typeof preview.__pmdOriginalLogoR4 === 'undefined') {
      preview.__pmdOriginalLogoR4 = preview.innerHTML;
    }

    function showRemoved() {
      label.classList.add('is-pmd-remove-selected-r4');
      preview.setAttribute('data-pmd-logo-remove-pending-r4', '1');
      preview.innerHTML = '<span class="pmd-profile-logo-empty-r19">' + canonical('No restaurant logo selected') + '</span>';
    }

    function restoreOriginal() {
      label.classList.remove('is-pmd-remove-selected-r4');
      preview.removeAttribute('data-pmd-logo-remove-pending-r4');
      preview.innerHTML = preview.__pmdOriginalLogoR4 || '<span class="pmd-profile-logo-empty-r19">' + canonical('No restaurant logo selected') + '</span>';
    }

    function sync() {
      if (checkbox.checked) showRemoved();
      else restoreOriginal();
    }

    /* Own the click explicitly. Legacy label/checkbox CSS has changed several
     * times; preventDefault avoids browser-label + legacy-handler double toggles. */
    if (!label.__pmdRemoveR4ClickBound) {
      label.__pmdRemoveR4ClickBound = true;
      label.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', {bubbles: true}));
      }, false);
    }

    if (!checkbox.__pmdRemoveR4ChangeBound) {
      checkbox.__pmdRemoveR4ChangeBound = true;
      checkbox.addEventListener('change', sync, false);
    }

    if (fileInput && !fileInput.__pmdRemoveR4FileBound) {
      fileInput.__pmdRemoveR4FileBound = true;
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) {
          sync();
          return;
        }

        checkbox.checked = false;
        label.classList.remove('is-pmd-remove-selected-r4');
        preview.removeAttribute('data-pmd-logo-remove-pending-r4');

        if (!window.URL || typeof window.URL.createObjectURL !== 'function') return;

        var objectUrl = window.URL.createObjectURL(file);
        preview.innerHTML = '';

        var image = document.createElement('img');
        image.src = objectUrl;
        image.alt = canonical('Selected restaurant logo preview');
        image.addEventListener('load', function () {
          try { window.URL.revokeObjectURL(objectUrl); } catch (error) {}
        }, {once: true});

        preview.appendChild(image);
      }, false);
    }

    sync();
  }

  function boot() {
    simplifyOwnerCopy();
    bindRestaurantLogo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  document.addEventListener('pageContentLoaded', boot, false);
  window.addEventListener('pageshow', boot, false);

  // PMD_SETTINGS_POLISH_LATE_I18N_R4_1
  // Global assets may execute before the platform message catalogue is ready.
  // Re-run catalogue-driven copy after the full page lifecycle settles.
  window.addEventListener('load', boot, {once: true});
  window.setTimeout(boot, 250);
})();
