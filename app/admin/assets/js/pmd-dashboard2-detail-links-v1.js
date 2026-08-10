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
    channelSplit: '/admin/pmdreports/channels',
    topItems: '/admin/pmdreports/topitems',
    tips: '/admin/pmdreports/tips',
    reviews: '/admin/pmdreports/reviews',
    calendarEvents: '/admin/pmdreports/reservations'
  };

  function install() {
    var root = document.getElementById('pmd-dashboard2-analytics-v1');
    if (!root) return false;

    Object.keys(map).forEach(function (widget) {
      var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
      if (!card || card.querySelector('.pmd-dashboard2-detail-link')) return;

      var link = document.createElement('a');
      link.className = 'pmd-dashboard2-detail-link';
      link.href = map[widget];
      link.setAttribute('aria-label', 'Open detailed report');
      link.title = 'Open detailed report';
      link.innerHTML = '<span>Details</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"></path><path d="M8 7h9v9"></path></svg>';
      card.appendChild(link);
    });

    return true;
  }

  if (!install()) {
    document.addEventListener('DOMContentLoaded', install, {once: true});
  }

  window.PMDDashboard2DetailLinksV1 = {
    version: '1.0.0',
    install: install,
    routes: map
  };
})();
