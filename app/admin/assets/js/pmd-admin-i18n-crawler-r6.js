/* PMD_ADMIN_I18N_CRAWLER_R6
 * Same-origin authenticated Admin crawler.
 * It performs GET-only navigation in a hidden iframe and runs the canonical
 * visible-English audit inside each loaded page. No forms are submitted and
 * no restaurant/business data is changed.
 */
(function () {
  'use strict';

  if (window.PMDAdminI18nCrawlerR6) return;

  var VERSION = '6.0.0';
  var DEFAULT_ROUTES = [
    '/admin/dashboard',
    '/admin/manager',
    '/admin/accountant',
    '/admin/cashier',
    '/admin/orders',
    '/admin/reservations',
    '/admin/shifts',
    '/admin/coupons',
    '/admin/menu',
    '/admin/settings',
    '/admin/settings/restaurant',
    '/admin/settings/frontend',
    '/admin/settings/devices',
    '/admin/settings/payments'
  ];

  function normalizeUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      if (url.pathname.indexOf('/admin') !== 0) return '';
      if (/\/(logout|login|auth|api)(\/|$)/i.test(url.pathname)) return '';
      if (/\/(delete|destroy|remove)(\/|$)/i.test(url.pathname)) return '';
      url.hash = '';
      url.search = '';
      return url.pathname.replace(/\/+$/, '') || '/admin';
    } catch (error) {
      return '';
    }
  }

  function discover(documentRef) {
    var routes = [];
    try {
      documentRef.querySelectorAll('a[href]').forEach(function (anchor) {
        var path = normalizeUrl(anchor.href || anchor.getAttribute('href') || '');
        if (!path) return;
        if (/\/\d+(\/|$)/.test(path)) return;
        if (/\/(edit|create|new)(\/|$)/i.test(path)) return;
        routes.push(path);
      });
    } catch (error) {}
    return routes;
  }

  function unique(values) {
    var seen = Object.create(null);
    return values.filter(function (value) {
      value = normalizeUrl(value);
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function frameLoad(route, timeoutMs) {
    return new Promise(function (resolve) {
      var frame = document.createElement('iframe');
      var settled = false;
      var timer;

      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.cssText = 'position:fixed!important;width:1px!important;height:1px!important;left:-10000px!important;top:-10000px!important;opacity:0!important;pointer-events:none!important;border:0!important;';

      function finish(result) {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        try { frame.remove(); } catch (error) {}
        resolve(result);
      }

      timer = window.setTimeout(function () {
        finish({route: route, status: 'timeout', count: null, leftovers: [], discovered: []});
      }, timeoutMs || 15000);

      frame.addEventListener('load', function () {
        window.setTimeout(function () {
          try {
            var win = frame.contentWindow;
            var doc = frame.contentDocument;
            if (!win || !doc) {
              finish({route: route, status: 'unavailable', count: null, leftovers: [], discovered: []});
              return;
            }

            var actual = normalizeUrl(win.location.href) || route;
            if (/\/admin\/(login|auth)/i.test(actual)) {
              finish({route: route, actual: actual, status: 'auth-redirect', count: null, leftovers: [], discovered: []});
              return;
            }

            var audit = null;
            if (win.PMDCanonicalVisibleAuditR5 && typeof win.PMDCanonicalVisibleAuditR5.audit === 'function') {
              audit = win.PMDCanonicalVisibleAuditR5.audit();
            } else if (win.PMDAdminCoverageR3 && typeof win.PMDAdminCoverageR3.audit === 'function') {
              audit = win.PMDAdminCoverageR3.audit();
            }

            finish({
              route: route,
              actual: actual,
              status: audit ? 'ok' : 'audit-missing',
              version: audit && audit.version ? audit.version : null,
              locale: audit && audit.locale ? audit.locale : null,
              count: audit && typeof audit.count === 'number' ? audit.count : null,
              leftovers: audit && Array.isArray(audit.leftovers) ? audit.leftovers : [],
              discovered: discover(doc)
            });
          } catch (error) {
            finish({route: route, status: 'error', error: String(error && error.message || error), count: null, leftovers: [], discovered: []});
          }
        }, 900);
      }, {once: true});

      frame.src = route + (route.indexOf('?') === -1 ? '?' : '&') + 'pmd_i18n_crawl_r6=1&_=' + Date.now();
      document.body.appendChild(frame);
    });
  }

  async function run(options) {
    options = options || {};
    var maxPages = Math.max(1, Math.min(Number(options.maxPages || 35), 60));
    var timeoutMs = Math.max(4000, Math.min(Number(options.timeoutMs || 15000), 30000));
    var queue = unique(DEFAULT_ROUTES.concat(discover(document), options.routes || []));
    var visited = Object.create(null);
    var pages = [];

    console.info('[PMD I18n Crawler R6] Starting', {routes: queue.length, maxPages: maxPages});

    while (queue.length && pages.length < maxPages) {
      var route = normalizeUrl(queue.shift());
      if (!route || visited[route]) continue;
      visited[route] = true;

      console.info('[PMD I18n Crawler R6] Auditing', route);
      var result = await frameLoad(route, timeoutMs);
      pages.push(result);

      (result.discovered || []).forEach(function (next) {
        next = normalizeUrl(next);
        if (!next || visited[next] || queue.indexOf(next) !== -1) return;
        queue.push(next);
      });
    }

    var leftovers = [];
    pages.forEach(function (page) {
      (page.leftovers || []).forEach(function (item) {
        leftovers.push(Object.assign({route: page.actual || page.route}, item));
      });
    });

    var report = {
      version: VERSION,
      origin: window.location.origin,
      locale: String(window.PMD_PLATFORM_MESSAGES_LOCALE || window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'unknown'),
      auditedPages: pages.length,
      pagesWithLeftovers: pages.filter(function (page) { return Number(page.count || 0) > 0; }).length,
      totalLeftovers: leftovers.length,
      pages: pages.map(function (page) {
        return {
          route: page.route,
          actual: page.actual || page.route,
          status: page.status,
          version: page.version || null,
          locale: page.locale || null,
          count: page.count,
          leftovers: page.leftovers || [],
          error: page.error || null
        };
      }),
      leftovers: leftovers
    };

    console.info('[PMD I18n Crawler R6] Complete', report);
    if (leftovers.length) {
      try { console.table(leftovers); } catch (error) {}
    }
    window.PMD_LAST_I18N_CRAWL_R6 = report;
    return report;
  }

  window.PMDAdminI18nCrawlerR6 = Object.freeze({
    version: VERSION,
    run: run,
    defaults: function () { return DEFAULT_ROUTES.slice(); }
  });

  console.info('[PMD I18n Crawler R6] Ready');
})();