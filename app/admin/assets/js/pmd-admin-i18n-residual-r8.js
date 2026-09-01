/* PMD_ADMIN_I18N_RESIDUAL_R8
 * Final direct-key authority for the four crawler leftovers after R7.
 * No locale-specific words live here: all target copy comes from the central
 * PMD platform catalogue by canonical key.
 */
(function () {
  'use strict';

  if (window.PMDAdminResidualI18nR8) {
    window.PMDAdminResidualI18nR8.run();
    return;
  }

  var VERSION = '8.0.0';
  var scheduled = false;
  var observer = null;

  function platform() {
    return window.PMDPlatformMessages || null;
  }

  function locale() {
    var p = platform();
    if (p && typeof p.locale === 'function') {
      try { return String(p.locale() || '').toLowerCase().split(/[-_]/)[0]; } catch (error) {}
    }
    return String(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase().split(/[-_]/)[0];
  }

  function t(key, fallback) {
    var p = platform();
    if (!p || typeof p.t !== 'function') return String(fallback || '');
    try {
      var value = String(p.t(key, {}, fallback) || '').trim();
      return value || String(fallback || '');
    } catch (error) {
      return String(fallback || '');
    }
  }

  function setExact(el, attr, source, key) {
    if (!el || !el.hasAttribute || !el.hasAttribute(attr)) return 0;
    var current = String(el.getAttribute(attr) || '').trim();
    if (current !== source) return 0;
    var target = t(key, source);
    if (!target || target === current) return 0;
    el.setAttribute(attr, target);
    return 1;
  }

  function fixSettingsTooltip(root) {
    var changed = 0;
    var selector = '[data-pmd-tooltip-label="Settings"], [aria-label="Settings"], [title="Settings"]';
    try {
      root.querySelectorAll(selector).forEach(function (el) {
        changed += setExact(el, 'data-pmd-tooltip-label', 'Settings', 'nav.settings');
        changed += setExact(el, 'aria-label', 'Settings', 'nav.settings');
        changed += setExact(el, 'title', 'Settings', 'nav.settings');
      });
    } catch (error) {}
    return changed;
  }

  function fixBarControls(root) {
    var changed = 0;
    var selector = '[aria-label="Bar"], [title="Bar"]';
    try {
      root.querySelectorAll(selector).forEach(function (el) {
        changed += setExact(el, 'aria-label', 'Bar', 'reports.ui.bar');
        changed += setExact(el, 'title', 'Bar', 'reports.ui.bar');
      });
    } catch (error) {}
    return changed;
  }

  function setData(el, name, key, fallback) {
    if (!el) return 0;
    var target = t(key, fallback);
    if (!target) return 0;
    if (el.getAttribute(name) === target) return 0;
    el.setAttribute(name, target);
    return 1;
  }

  function fixCustomerMenu() {
    var page = document.getElementById('pmd-frontend-settings');
    if (!page) return 0;
    var changed = 0;

    var title = page.querySelector('.pmd-frontend-header h1');
    var look = page.querySelector('.pmd-frontend-header__left p');
    var themeHelp = page.querySelector('.pmd-frontend-form > .pmd-frontend-section:first-of-type .pmd-frontend-card__header p');

    changed += setData(title, 'data-pmd-r8-theme-title', 'r3.customer_menu_theme', 'Customer menu theme');
    changed += setData(look, 'data-pmd-r8-choose-look', 'r4.settings.choose_look', 'Choose the look of your digital menu.');
    changed += setData(themeHelp, 'data-pmd-r8-choose-theme', 'r4.settings.choose_theme', 'Choose a theme for your digital menu.');

    return changed;
  }

  function run() {
    if (!document.documentElement || locale() === 'en') return 0;
    var changed = 0;
    changed += fixSettingsTooltip(document);
    changed += fixBarControls(document);
    changed += fixCustomerMenu();
    return changed;
  }

  function inspect() {
    var leftovers = [];
    try {
      document.querySelectorAll('[data-pmd-tooltip-label="Settings"], [aria-label="Settings"], [title="Settings"]')
        .forEach(function (el) { leftovers.push({kind: 'settings-attribute', tag: el.tagName}); });
      document.querySelectorAll('[aria-label="Bar"], [title="Bar"]')
        .forEach(function (el) { leftovers.push({kind: 'bar-attribute', tag: el.tagName}); });
    } catch (error) {}

    var page = document.getElementById('pmd-frontend-settings');
    if (page) {
      [
        ['.pmd-frontend-header h1', '::before', 'Customer menu theme'],
        ['.pmd-frontend-header__left p', '::after', 'Choose the look of your digital menu.'],
        ['.pmd-frontend-form > .pmd-frontend-section:first-of-type .pmd-frontend-card__header p', '::after', 'Choose a theme for your digital menu.']
      ].forEach(function (item) {
        var el = page.querySelector(item[0]);
        if (!el) return;
        try {
          var value = String(getComputedStyle(el, item[1]).content || '').replace(/^['"]|['"]$/g, '');
          if (value === item[2]) leftovers.push({kind: item[1], source: value, tag: el.tagName});
        } catch (error) {}
      });
    }

    return {
      version: VERSION,
      locale: locale(),
      count: leftovers.length,
      leftovers: leftovers
    };
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      run();
    }, 20);
  }

  function bind() {
    run();

    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'childList') return mutation.addedNodes && mutation.addedNodes.length > 0;
        if (mutation.type !== 'attributes') return false;
        return ['aria-label', 'title', 'data-pmd-tooltip-label'].indexOf(mutation.attributeName) !== -1;
      });
      if (relevant) schedule();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'data-pmd-tooltip-label']
    });

    [60, 200, 600, 1400, 3000, 7000].forEach(function (ms) {
      setTimeout(run, ms);
    });
  }

  window.PMDAdminResidualI18nR8 = Object.freeze({
    version: VERSION,
    locale: locale,
    run: run,
    inspect: inspect,
    disconnect: function () {
      if (observer) observer.disconnect();
      observer = null;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, {once: true});
  } else {
    bind();
  }

  console.info('[PMD Admin Residual I18n R8] Ready', {
    version: VERSION,
    locale: locale()
  });
})();
