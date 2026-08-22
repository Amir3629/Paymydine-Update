/* PMD_SETTINGS_POLISH_R3 */
(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');

  function setText(node, value) {
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }

  function finalizeSettingsCenter() {
    if (path !== '/admin/pmdsettings') return;

    var root = document.getElementById('pmd-settings-center');
    if (!root) return;

    var restaurant = root.querySelector('a[data-pmd-settings-card][href*="/admin/pmdsettings/restaurant"]');
    if (restaurant) {
      setText(restaurant.querySelector('.pmd-settings-card__title-row strong'), 'Restaurant profile');
      setText(restaurant.querySelector('.pmd-settings-card__description'), 'Name, logo, opening hours, website and social links.');
      restaurant.setAttribute('data-pmd-searchable', 'restaurant profile name logo opening hours website social links');
    }

    var frontend = root.querySelector('a[data-pmd-settings-card][href*="/admin/pmdsettings/frontend"]');
    if (frontend) {
      setText(frontend.querySelector('.pmd-settings-card__title-row strong'), 'Customer menu theme');
      setText(frontend.querySelector('.pmd-settings-card__description'), 'Choose the active QR menu theme.');
      frontend.setAttribute('data-pmd-searchable', 'customer menu theme qr menu theme');
    }

    var payMyDineGroup = document.getElementById('pmd-settings-brand');
    if (!payMyDineGroup) return;

    setText(payMyDineGroup.querySelector('.pmd-settings-group__head h2'), 'PayMyDine');
    payMyDineGroup.setAttribute('data-pmd-searchable', 'paymydine website landing page');

    var card = payMyDineGroup.querySelector('a[data-pmd-settings-card]');
    if (!card) return;

    card.setAttribute('href', 'https://paymydine.com/');
    card.setAttribute('aria-label', 'Open PayMyDine website');
    card.setAttribute('data-pmd-searchable', 'paymydine website landing page');
    card.setAttribute('data-pmd-paymydine-ready-r3', '1');

    setText(card.querySelector('.pmd-settings-card__title-row strong'), 'PayMyDine');
    setText(card.querySelector('.pmd-settings-card__description'), 'Visit the PayMyDine website.');
  }

  function positionRemoveLogo() {
    if (path !== '/admin/pmdsettings/restaurant') return;

    var root = document.getElementById('pmd-restaurant-profile');
    if (!root) return;

    var preview = root.querySelector('#pmd-restaurant-logo-preview-r19');
    var checkbox = root.querySelector('input[name="profile[remove_logo]"]');
    if (!preview || !checkbox) return;

    var label = checkbox.closest('.pmd-profile-logo-remove-r20') || checkbox.closest('label');
    if (!label) return;

    label.classList.add('pmd-profile-logo-remove-r20');
    checkbox.disabled = false;
    checkbox.removeAttribute('disabled');

    var copy = label.querySelector('span');
    if (copy) copy.textContent = 'Remove logo';

    var stack = preview.closest('.pmd-profile-logo-preview-stack-r3');
    if (!stack) {
      var parent = preview.parentNode;
      if (!parent) return;

      stack = document.createElement('div');
      stack.className = 'pmd-profile-logo-preview-stack-r3';
      stack.setAttribute('data-pmd-logo-preview-stack-r3', '1');

      parent.insertBefore(stack, preview);
      stack.appendChild(preview);
    }

    if (label.parentNode !== stack || label.previousElementSibling !== preview) {
      stack.appendChild(label);
    }
  }

  function boot() {
    finalizeSettingsCenter();
    positionRemoveLogo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  document.addEventListener('pageContentLoaded', boot, false);
  window.addEventListener('pageshow', boot, false);
})();
