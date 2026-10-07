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
        if (title) title.textContent = 'Customer Experience';
        if (description) description.textContent = 'Themes, QR designs and guest-facing settings.';
      }
    });
  }

  function simplifyFrontend() {
    if (path !== '/admin/pmdsettings/frontend') return;

    var root = document.getElementById('pmd-frontend-settings');
    if (!root) return;

    // PMD_SETTINGS_CUSTOMER_EXPERIENCE_R39
    // This page is no longer theme-only. Theme, QR designs and guest-facing
    // options intentionally remain visible together.
    root.removeAttribute('data-pmd-theme-only-r1');
    root.setAttribute('data-pmd-customer-experience-r39', '1');

    Array.prototype.slice.call(
      root.querySelectorAll('.pmd-frontend-form > .pmd-frontend-section[hidden], .pmd-frontend-advanced[hidden]')
    ).forEach(function (node) {
      node.hidden = false;
      node.removeAttribute('aria-hidden');
    });

    var heading = root.querySelector('.pmd-frontend-header h1');
    var subtitle = root.querySelector('.pmd-frontend-header__left p');
    if (heading) heading.textContent = 'Customer Experience & Design';
    if (subtitle) subtitle.textContent = 'Themes, QR designs and guest-facing settings in one place.';

    var saveCopy = root.querySelector('.pmd-frontend-bottom-save .pmd-frontend-primary-button span');
    if (saveCopy) saveCopy.textContent = 'Save customer experience';
  }

  function cleanLogoRemoveControl() {
    if (path !== '/admin/pmdsettings/restaurant') return;

    var root = document.getElementById('pmd-restaurant-profile');
    if (!root) return;

    // PMD_RESTAURANT_PUBLIC_BOOKING_CONTACT_R27
    // The Restaurant Profile now owns guest-facing contact/address settings.
    // Do not hide those fields or any section by historic visual position.
    var bookingSection = root.querySelector('.pmd-profile-section--booking');
    if (bookingSection) {
      bookingSection.hidden = false;
      bookingSection.removeAttribute('hidden');
      bookingSection.removeAttribute('aria-hidden');

      Array.prototype.slice.call(
        bookingSection.querySelectorAll('.pmd-profile-field')
      ).forEach(function (field) {
        field.hidden = false;
        field.removeAttribute('hidden');
        field.removeAttribute('aria-hidden');
      });
    }

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
