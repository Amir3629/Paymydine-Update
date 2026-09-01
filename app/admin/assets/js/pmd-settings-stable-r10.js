/* PMD_SETTINGS_STABLE_R10_CANONICAL_AUTHORITY */
/* PMD_SETTINGS_STABLE_R9
 * Lightweight Settings runtime.
 *
 * - PayMyDine visible copy is CSS first-paint authority; JS changes only href/semantics.
 * - Frontend remains theme-only.
 * - Programmatic Remove Logo changes participate in Restaurant dirty/save state.
 * - No MutationObserver.
 */
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');

  // PMD_SETTINGS_STABLE_CLEAN_ROUTE_NORMALIZER_R10
  var pmdStableAliasesR10 = Object.freeze({
    '/admin/settings': '/admin/pmdsettings',
    '/admin/settings/restaurant': '/admin/pmdsettings/restaurant',
    '/admin/settings/frontend': '/admin/pmdsettings/frontend',
    '/admin/settings/theme': '/admin/pmdsettings/frontend',
    '/admin/settings/customer-menu': '/admin/pmdsettings/frontend',
    '/admin/settings/customer-menu-theme': '/admin/pmdsettings/frontend'
  });
  path = pmdStableAliasesR10[path] || path;

  function setText(node, value) {
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }
  // PMD_SETTINGS_STABLE_CANONICAL_COPY_R10
  function pmdStableT(key, fallback) {
    if (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {
      var value = window.PMDPlatformMessages.t(key, {}, fallback);
      if (typeof value === 'string' && value.trim() && value !== key) return value;
    }
    var messages = window.PMD_PLATFORM_MESSAGES || {};
    return typeof messages[key] === 'string' && messages[key].trim() ? messages[key] : fallback;
  }


  function finalizePayMyDineLink() {
    if (path !== '/admin/pmdsettings') return;

    var group = document.getElementById('pmd-settings-brand');
    if (!group) return;

    group.setAttribute('data-pmd-searchable', 'paymydine landing page');

    var card = group.querySelector('a[data-pmd-settings-card]');
    if (!card) return;

    card.setAttribute('href', 'https://paymydine.com/');
    card.setAttribute('aria-label', 'PayMyDine');
    card.setAttribute('data-pmd-searchable', 'paymydine landing page');
    card.setAttribute('data-pmd-paymydine-ready-r9', '1');
  }

  function simplifyFrontend() {
    if (path !== '/admin/pmdsettings/frontend') return;

    var root = document.getElementById('pmd-frontend-settings');
    if (!root) return;

    root.setAttribute('data-pmd-theme-only-r1', '1');

    setText(
      root.querySelector('.pmd-frontend-header h1'),
      pmdStableT('r3.customer_menu_theme', 'Customer menu theme')
    );
    setText(
      root.querySelector('.pmd-frontend-header__left p'),
      pmdStableT('r4.settings.choose_look', 'Choose the look of your digital menu.')
    );
    setText(
      root.querySelector('.pmd-frontend-bottom-save .pmd-frontend-primary-button span'),
      pmdStableT('settings.frontend.save_theme', 'Save theme')
    );
  }

  function installRemoveLogoDirtyBridge() {
    if (path !== '/admin/pmdsettings/restaurant') return;

    var root = document.getElementById('pmd-restaurant-profile');
    var form = document.getElementById('pmd-restaurant-profile-form');
    if (!root || !form) return;

    var checkbox = form.querySelector('input[name="profile[remove_logo]"]');
    var button = root.querySelector('.pmd-profile-save-icon');
    if (!checkbox || !button) return;

    var baseline = serializeFormState();
    var removeTouched = false;

    function serializeFormState() {
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

    function setSaveVisible(visible) {
      button.classList.toggle('is-visible', Boolean(visible));
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
      button.tabIndex = visible ? 0 : -1;
    }

    function syncDirty() {
      setSaveVisible(serializeFormState() !== baseline);
    }

    /*
     * Existing Restaurant dirty tracking intentionally ignores synthetic events.
     * R4 owns Remove Logo by toggling the checkbox in JS, so this one control
     * needs an explicit bridge into the same header Save state.
     */
    form.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || target.name !== 'profile[remove_logo]') return;

      removeTouched = true;

      window.setTimeout(function () {
        syncDirty();
      }, 0);
    }, true);

    /* Let browser autofill/global boot settle, but never overwrite a baseline
     * after the owner has already touched Remove Logo. */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.setTimeout(function () {
          if (!removeTouched && !button.classList.contains('is-visible')) {
            baseline = serializeFormState();
          }
        }, 120);
      });
    });
  }

  function boot() {
    finalizePayMyDineLink();
    simplifyFrontend();
    installRemoveLogoDirtyBridge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  document.addEventListener('pageContentLoaded', boot, false);
  window.addEventListener('pageshow', boot, false);
})();
