/* PMD_ADMIN_CANONICAL_VISIBLE_AUDIT_R5
 * On-demand audit of visible English UI copy that already has a different
 * canonical translation in the active locale. This runtime does NOT translate
 * business/menu data; it only reports candidates so source ownership can be
 * fixed without mutating restaurant content.
 */
(function () {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function locale() {
    return String(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase().split('-')[0];
  }

  function reverseCatalogue() {
    var english = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
    var active = window.PMD_PLATFORM_MESSAGES || {};
    var reverse = Object.create(null);

    Object.keys(english).forEach(function (key) {
      var source = clean(english[key]);
      var translated = clean(active[key]);
      if (!source || !translated || source === translated) return;
      if (!reverse[source]) {
        reverse[source] = {key: key, translated: translated};
      }
    });

    return reverse;
  }

  function excluded(element) {
    if (!element || !element.closest) return false;
    return Boolean(element.closest([
      'script',
      'style',
      'textarea',
      'code',
      'pre',
      '[contenteditable="true"]',
      '#pmd-menu-manager-main [data-pmd-menu-card] h2',
      '#pmd-menu-manager-main [data-pmd-menu-card] .pmd-menu-card__description',
      '#pmd-menu-manager-main .pmd-menu-manager__category-label'
    ].join(',')));
  }

  function descriptor(element) {
    if (!element) return {tag: null, id: null, className: null};
    return {
      tag: element.tagName || null,
      id: element.id || null,
      className: typeof element.className === 'string' ? element.className : null
    };
  }

  function audit() {
    var lang = locale();
    var reverse = reverseCatalogue();
    var leftovers = [];
    var seen = Object.create(null);

    if (lang === 'en') {
      return {version: '5.0.0-canonical-visible', locale: lang, count: 0, leftovers: []};
    }

    function add(source, element, kind) {
      source = clean(source);
      var match = reverse[source];
      if (!source || !match || excluded(element)) return;

      var info = descriptor(element);
      var signature = [kind, match.key, info.tag, info.id, info.className].join('|');
      if (seen[signature]) return;
      seen[signature] = true;

      leftovers.push({
        key: match.key,
        source: source,
        translated: match.translated,
        kind: kind,
        tag: info.tag,
        id: info.id,
        className: info.className
      });
    }

    document.querySelectorAll('body *').forEach(function (element) {
      if (excluded(element)) return;

      if (element.children.length === 0) {
        add(element.textContent || '', element, 'text');
      }

      ['title', 'aria-label', 'placeholder', 'data-original-title', 'data-title'].forEach(function (attribute) {
        if (element.hasAttribute(attribute)) {
          add(element.getAttribute(attribute) || '', element, attribute);
        }
      });

      ['::before', '::after'].forEach(function (pseudo) {
        try {
          var value = window.getComputedStyle(element, pseudo).getPropertyValue('content');
          if (value && value !== 'none' && value !== 'normal' && value !== '""') {
            add(value.replace(/^['"]|['"]$/g, ''), element, pseudo);
          }
        } catch (error) {}
      });
    });

    return {
      version: '5.0.0-canonical-visible',
      locale: lang,
      catalogueCandidates: Object.keys(reverse).length,
      count: leftovers.length,
      leftovers: leftovers
    };
  }

  window.PMDCanonicalVisibleAuditR5 = Object.freeze({
    version: '5.0.0-canonical-visible',
    audit: audit
  });

  function bridge() {
    if (!window.PMDAdminCoverageR3) return false;
    if (!window.PMDAdminCoverageR3.auditLegacy && typeof window.PMDAdminCoverageR3.audit === 'function') {
      window.PMDAdminCoverageR3.auditLegacy = window.PMDAdminCoverageR3.audit;
    }
    window.PMDAdminCoverageR3.auditCanonical = audit;
    window.PMDAdminCoverageR3.audit = audit;
    return true;
  }

  if (!bridge()) {
    window.addEventListener('load', bridge, {once: true});
    window.setTimeout(bridge, 300);
  }

  console.info('[PMD Canonical Visible Audit R5] Ready');
})();