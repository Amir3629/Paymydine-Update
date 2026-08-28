/* PMD_SETTINGS_STABLE_R8
 * Lightweight final Settings runtime.
 *
 * No Restaurant MutationObserver.
 * No Restaurant DOM movement.
 * Restaurant logo interaction remains owned by pmd-settings-polish-r4.js.
 */
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');

  function setText(node, value) {
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }

  function finalizeSettingsCenter() {
    if (path !== '/admin/pmdsettings') return;

    var root = document.getElementById('pmd-settings-center');
    if (!root) return;

    var restaurant = root.querySelector(
      'a[data-pmd-settings-card][href*="/admin/pmdsettings/restaurant"]'
    );
    if (restaurant) {
      setText(
        restaurant.querySelector('.pmd-settings-card__title-row strong'),
        'Restaurant profile'
      );
      setText(
        restaurant.querySelector('.pmd-settings-card__description'),
        'Manage your restaurant details.'
      );
      restaurant.setAttribute(
        'data-pmd-searchable',
        'restaurant profile name logo opening hours website social links'
      );
    }

    var frontend = root.querySelector(
      'a[data-pmd-settings-card][href*="/admin/pmdsettings/frontend"]'
    );
    if (frontend) {
      setText(
        frontend.querySelector('.pmd-settings-card__title-row strong'),
        'Customer menu theme'
      );
      setText(
        frontend.querySelector('.pmd-settings-card__description'),
        'Choose your digital menu theme.'
      );
      frontend.setAttribute(
        'data-pmd-searchable',
        'customer menu theme qr digital menu'
      );
    }

    var payMyDineGroup = document.getElementById('pmd-settings-brand');
    if (!payMyDineGroup) return;

    setText(
      payMyDineGroup.querySelector('.pmd-settings-group__head h2'),
      'PayMyDine'
    );
    payMyDineGroup.setAttribute(
      'data-pmd-searchable',
      'paymydine landing page'
    );

    var card = payMyDineGroup.querySelector('a[data-pmd-settings-card]');
    if (!card) return;

    card.setAttribute('href', 'https://paymydine.com/');
    card.setAttribute('aria-label', 'PayMyDine');
    card.setAttribute('data-pmd-searchable', 'paymydine landing page');
    card.setAttribute('data-pmd-paymydine-ready-r3', '1');
    card.setAttribute('data-pmd-paymydine-ready-r8', '1');

    setText(
      card.querySelector('.pmd-settings-card__title-row strong'),
      'PayMyDine'
    );

    var description = card.querySelector('.pmd-settings-card__description');
    if (description) description.textContent = '';
  }

  function simplifyFrontend() {
    if (path !== '/admin/pmdsettings/frontend') return;

    var root = document.getElementById('pmd-frontend-settings');
    if (!root) return;

    root.setAttribute('data-pmd-theme-only-r1', '1');

    var heading = root.querySelector('.pmd-frontend-header h1');
    var subtitle = root.querySelector('.pmd-frontend-header__left p');
    var saveCopy = root.querySelector(
      '.pmd-frontend-bottom-save .pmd-frontend-primary-button span'
    );

    setText(heading, 'Customer menu theme');
    setText(subtitle, 'Choose the look of your digital menu.');
    setText(saveCopy, 'Save theme');
  }

  function boot() {
    finalizeSettingsCenter();
    simplifyFrontend();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  document.addEventListener('pageContentLoaded', boot, false);
  window.addEventListener('pageshow', boot, false);
})();
