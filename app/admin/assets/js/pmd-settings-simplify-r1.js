/* PMD_SETTINGS_SIMPLIFY_R1 */
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');

  function hideNode(node) {
    if (!node) return;
    node.hidden = true;
    node.setAttribute('aria-hidden', 'true');
  }

  function simplifySettingsCenter() {
    if (path !== '/admin/pmdsettings') return;

    Array.prototype.slice.call(
      document.querySelectorAll('#pmd-settings-center a[data-pmd-settings-card]')
    ).forEach(function (card) {
      var href = String(card.getAttribute('href') || '');
      var title = card.querySelector('.pmd-settings-card__title-row strong');
      var description = card.querySelector('.pmd-settings-card__description');

      // Keep /admin/pmdmenu route alive; remove only its Settings button/card.
      if (/\/admin\/pmdmenu(?:\/|$|\?)/.test(href)) {
        hideNode(card);
        return;
      }

      if (/\/admin\/pmdsettings\/restaurant(?:$|\?)/.test(href)) {
        if (description) {
          description.textContent = 'Name, logo, opening hours, website and social links.';
        }
      }

      if (/\/admin\/pmdsettings\/frontend(?:$|\?)/.test(href)) {
        if (title) title.textContent = 'Customer menu theme';
        if (description) description.textContent = 'Choose the active QR menu theme.';
      }
    });
  }

  function simplifyFrontend() {
    if (path !== '/admin/pmdsettings/frontend') return;

    var root = document.getElementById('pmd-frontend-settings');
    if (!root) return;
    root.setAttribute('data-pmd-theme-only-r1', '1');

    var sections = Array.prototype.slice.call(root.querySelectorAll('.pmd-frontend-form > .pmd-frontend-section'));
    sections.forEach(function (section, index) {
      if (index > 0) hideNode(section);
    });

    Array.prototype.slice.call(root.querySelectorAll('.pmd-frontend-advanced')).forEach(hideNode);

    var heading = root.querySelector('.pmd-frontend-header h1');
    var subtitle = root.querySelector('.pmd-frontend-header__left p');
    if (heading) heading.textContent = 'Customer menu theme';
    if (subtitle) subtitle.textContent = 'Choose the active QR menu design.';

    var saveCopy = root.querySelector('.pmd-frontend-bottom-save .pmd-frontend-primary-button span');
    if (saveCopy) saveCopy.textContent = 'Save theme';
  }

  function cleanLogoRemoveControl() {
    if (path !== '/admin/pmdsettings/restaurant') return;

    var root = document.getElementById('pmd-restaurant-profile');
    if (!root) return;

    // UI removal only: keep stored contact/address values untouched by leaving
    // their existing form controls in the form but out of the visible UI.
    ['profile[email]', 'profile[telephone]'].forEach(function (name) {
      var input = root.querySelector('[name="' + name + '"]');
      if (input) hideNode(input.closest('label'));
    });

    Array.prototype.slice.call(root.querySelectorAll('.pmd-profile-section')).forEach(function (section) {
      var heading = section.querySelector('.pmd-profile-card__header h2');
      if (heading && String(heading.textContent || '').trim().toLowerCase() === 'address') {
        hideNode(section);
      }
    });

    var container = root.querySelector('.pmd-profile-logo-input-r19') || root;
    var inputs = Array.prototype.slice.call(container.querySelectorAll('input[name="profile[remove_logo]"]'));
    if (!inputs.length) return;

    var keep = inputs[0];
    var keepLabel = keep.closest('.pmd-profile-logo-remove-r20') || keep.closest('label');

    inputs.slice(1).forEach(function (input) {
      var label = input.closest('.pmd-profile-logo-remove-r20') || input.closest('label');
      if (label && label !== keepLabel) label.remove();
      else input.remove();
    });

    Array.prototype.slice.call(container.querySelectorAll('.pmd-profile-logo-remove-r20')).forEach(function (label) {
      if (label !== keepLabel) label.remove();
    });

    Array.prototype.slice.call(container.children || []).forEach(function (node) {
      if (node === keepLabel) return;
      if (node.tagName === 'SPAN' && String(node.textContent || '').trim() === 'Remove the current restaurant logo') {
        node.remove();
      }
    });

    if (!keepLabel) return;
    keepLabel.classList.add('pmd-profile-logo-remove-r20');
    keep.disabled = false;
    keep.removeAttribute('disabled');

    if (keep.__pmdRemoveR1Bound) return;
    keep.__pmdRemoveR1Bound = true;

    var preview = root.querySelector('#pmd-restaurant-logo-preview-r19');
    var originalPreview = preview ? preview.innerHTML : '';

    keep.addEventListener('change', function () {
      if (!preview) return;
      if (keep.checked) {
        preview.setAttribute('data-pmd-logo-remove-pending-r1', '1');
        preview.innerHTML = '<span>Current logo will be removed when you save.</span>';
      } else {
        preview.removeAttribute('data-pmd-logo-remove-pending-r1');
        preview.innerHTML = originalPreview;
      }
    });
  }

  function boot() {
    simplifySettingsCenter();
    simplifyFrontend();
    cleanLogoRemoveControl();

    if (path === '/admin/pmdsettings/restaurant') {
      var root = document.getElementById('pmd-restaurant-profile');
      if (root && window.MutationObserver && !root.__pmdSettingsSimplifyObserver) {
        var queued = false;
        var observer = new MutationObserver(function () {
          if (queued) return;
          queued = true;
          Promise.resolve().then(function () {
            queued = false;
            cleanLogoRemoveControl();
          });
        });
        observer.observe(root, {childList: true, subtree: true});
        root.__pmdSettingsSimplifyObserver = observer;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  document.addEventListener('pageContentLoaded', boot, false);
})();
