/* PMD_ADMIN_I18N_RESIDUAL_R7
 * Late canonical attribute authority for Admin UI chrome.
 * It translates only exact catalogue-known UI strings; restaurant/user data
 * is not guessed or machine-translated.
 */
(function () {
  'use strict';

  if (window.PMDAdminResidualI18nR7) return;

  var VERSION = '7.0.0';
  var ATTRS = [
    'aria-label',
    'title',
    'placeholder',
    'data-pmd-tooltip-label',
    'data-bs-original-title',
    'data-original-title'
  ];
  var scheduled = false;
  var observer = null;

  function api() {
    return window.PMDAdminI18n || null;
  }

  function locale() {
    var i18n = api();
    if (i18n && typeof i18n.locale === 'function') {
      try { return String(i18n.locale() || '').toLowerCase(); } catch (error) {}
    }
    return String(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase().split(/[-_]/)[0];
  }

  function translated(value) {
    var source = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!source || locale() === 'en') return source;

    var i18n = api();
    if (!i18n || typeof i18n.translate !== 'function') return source;

    try {
      var target = String(i18n.translate(source) || '').trim();
      return target || source;
    } catch (error) {
      return source;
    }
  }

  function translateElement(el) {
    if (!el || el.nodeType !== 1) return 0;
    var changed = 0;

    ATTRS.forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;
      var current = String(el.getAttribute(attr) || '').trim();
      if (!current) return;
      var target = translated(current);
      if (target && target !== current) {
        el.setAttribute(attr, target);
        changed += 1;
      }
    });

    return changed;
  }

  function run(root) {
    root = root || document;
    var i18n = api();

    /* CSS R7 exposes real text nodes that older CSS had hidden. Ask the
     * canonical runtime to translate those nodes before attribute cleanup. */
    if (i18n && typeof i18n.run === 'function') {
      try { i18n.run(); } catch (error) {}
    }

    var changed = 0;
    if (root.nodeType === 1) changed += translateElement(root);

    var selector = ATTRS.map(function (attr) {
      return '[' + attr + ']';
    }).join(',');

    try {
      root.querySelectorAll(selector).forEach(function (el) {
        changed += translateElement(el);
      });
    } catch (error) {}

    return changed;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      run(document);
    }, 40);
  }

  function bind() {
    run(document);

    if (observer) observer.disconnect();
    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'childList') return mutation.addedNodes && mutation.addedNodes.length;
        return mutation.type === 'attributes' && ATTRS.indexOf(mutation.attributeName) !== -1;
      });
      if (relevant) schedule();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ATTRS
    });

    [100, 350, 900, 1800, 4000, 8000].forEach(function (ms) {
      setTimeout(function () { run(document); }, ms);
    });
  }

  window.PMDAdminResidualI18nR7 = Object.freeze({
    version: VERSION,
    locale: locale,
    run: function () { return run(document); },
    disconnect: function () {
      if (observer) observer.disconnect();
      observer = null;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  console.info('[PMD Admin Residual I18n R7] Ready', {
    version: VERSION,
    locale: locale()
  });
})();
