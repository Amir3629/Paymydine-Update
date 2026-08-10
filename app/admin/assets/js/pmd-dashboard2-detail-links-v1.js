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

  function install() {
    var root = document.getElementById('pmd-dashboard2-analytics-v1');
    if (!root) return 0;

    Object.keys(map).forEach(function (widget) {
      var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
      if (!card) return;

      var existing = card.querySelector('.pmd-dashboard2-detail-link[data-pmd-report-widget="' + widget + '"]');
      if (!existing) card.appendChild(makeLink(widget));
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
    version: '1.2.0-dedicated-report-routes',
    install: install,
    routes: map,
    audit: function () {
      var root = document.getElementById('pmd-dashboard2-analytics-v1');
      var found = root ? root.querySelectorAll('.pmd-dashboard2-detail-link').length : 0;
      return {
        version: '1.2.0-dedicated-report-routes',
        path: path,
        root: !!root,
        expected: expected,
        found: found,
        ok: found === expected
      };
    }
  };

  console.info('[PMD Dashboard2 Detail Links V1.2] active', window.PMDDashboard2DetailLinksV1.audit());
})();
