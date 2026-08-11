(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (path !== '/admin/dashboard2') return;

  var map = {
    salesOverTime: '/admin/pmdreports/sales',
    salesByHour: '/admin/pmdreports/hourly',
    categorySales: '/admin/pmdreports/categories',
    paymentMethods: '/admin/pmdreports/payments',
    recentTransactions: '/admin/pmdreports/transactions',
    alerts: '/admin/pmdreports/alerts',
    liveOperations: '/admin/pmdreports/liveorders',
    channelSplit: '/admin/pmdreportchannels',
    topItems: '/admin/pmdreports/topitems',
    tips: '/admin/pmdreporttips',
    reviews: '/admin/pmdreports/reviews',
    calendarEvents: '/admin/pmdreports/reservations'
  };

  var expected = Object.keys(map).length;
  var observer = null;

  function makeLink(widget) {
    var link = document.createElement('a');
    link.className = 'pmd-dashboard2-detail-link';
    link.href = map[widget];
    link.dataset.pmdReportWidget = widget;
    link.setAttribute('aria-label', 'Open detailed ' + widget + ' report');
    link.title = 'Open detailed report';
    link.innerHTML = '<span>Details</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"></path><path d="M8 7h9v9"></path></svg>';
    return link;
  }

  /*
   * PMD_DASHBOARD2_DETAIL_HEADER_HOST_V1
   *
   * Details must never be a direct child of the analytics <article>.
   * Dashboard2 has chart/layout authorities for the first analytics cards
   * which legitimately manipulate direct card children. A direct <a> was
   * therefore interpreted as chart workspace and stretched to card size.
   *
   * The existing card <header> is the stable presentation host. The link
   * remains absolutely positioned by the dedicated CSS, but it is no longer
   * part of the card's direct-child chart/layout contract.
   */
  function detailHost(card) {
    if (!card) return null;
    return card.querySelector(':scope > header') || card.querySelector('header');
  }

  function install() {
    var root = document.getElementById('pmd-dashboard2-analytics-v1');
    if (!root) return 0;

    Object.keys(map).forEach(function (widget) {
      var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
      if (!card) return;

      var host = detailHost(card);
      if (!host) return;

      host.dataset.pmdDetailLinkHost = 'header';

      var existing = card.querySelector('.pmd-dashboard2-detail-link[data-pmd-report-widget="' + widget + '"]');

      if (existing) {
        existing.href = map[widget];
        if (existing.parentElement !== host) {
          host.appendChild(existing);
        }
        return;
      }

      host.appendChild(makeLink(widget));
    });

    var count = root.querySelectorAll('.pmd-dashboard2-detail-link').length;

    if (count >= expected && observer) {
      observer.disconnect();
      observer = null;
    }

    return count;
  }

  function schedule() {
    [0, 50, 150, 350, 700, 1200, 2000].forEach(function (delay) {
      window.setTimeout(install, delay);
    });
  }

  install();
  schedule();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, {once: true});
  }

  window.addEventListener('load', schedule, {once: true});

  observer = new MutationObserver(function () {
    install();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.setTimeout(function () {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }, 5000);

  window.PMDDashboard2DetailLinksV1 = {
    version: '1.2.1-header-host',
    install: install,
    routes: map,
    audit: function () {
      var root = document.getElementById('pmd-dashboard2-analytics-v1');
      var links = root ? Array.from(root.querySelectorAll('.pmd-dashboard2-detail-link')) : [];
      var badDirectChildren = links.filter(function (link) {
        return !!(link.parentElement && link.parentElement.matches('[data-pmd-analytics-widget]'));
      }).length;
      var headerHosted = links.filter(function (link) {
        return !!(link.parentElement && link.parentElement.matches('header'));
      }).length;

      return {
        version: '1.2.1-header-host',
        path: path,
        root: !!root,
        expected: expected,
        found: links.length,
        headerHosted: headerHosted,
        badDirectChildren: badDirectChildren,
        ok: links.length === expected && headerHosted === expected && badDirectChildren === 0
      };
    }
  };

  console.info('[PMD Dashboard2 Detail Links V1.2.1] active', window.PMDDashboard2DetailLinksV1.audit());
})();
