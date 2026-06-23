(function () {
  'use strict';

  function data() {
    if (window.PMDRealDashboardData && window.PMDRealDashboardData.metrics) return window.PMDRealDashboardData;
    if (window.PMDRealDashboardAPI && typeof window.PMDRealDashboardAPI.last === 'function' && window.PMDRealDashboardAPI.last()) return window.PMDRealDashboardAPI.last();
    return null;
  }

  function metric(key, prop, fallback) {
    var d = data();
    if (!d || !d.metrics || !d.metrics[key]) return fallback;
    var value = d.metrics[key][prop];
    return value === undefined || value === null || value === '' ? fallback : value;
  }

  function card(label, value, sub, icon, href) {
    return [
      '<div class="pmd-role-kpi" data-pmd-role-href="' + href + '">',
        '<div class="pmd-role-kpi-label">' + label + '</div>',
        '<div class="pmd-role-kpi-value">' + value + '</div>',
        '<div class="pmd-role-kpi-sub"><i class="fa fa-arrow-up"></i> ' + sub + '</div>',
        '<div class="pmd-role-kpi-icon"><i class="fa ' + icon + '"></i></div>',
      '</div>'
    ].join('');
  }

  function buildRoleBar() {
    var orders = metric('orders', 'value', '0');
    var ready = metric('kitchen_status', 'ready', '0');
    var calls = metric('live_alerts', 'value', '0');
    var payments = metric('pending_payments', 'value', '€0.00');

    return [
      '<div class="pmd-role-kpi-bar pmd-w3-role-kpi-bar" data-pmd-stable-rolebar-v77="1">',
        card('My Tables', 'T2/T6/T10', 'assigned section', 'fa-th-large', '/admin/tables'),
        card('Ready to Serve', ready, 'go to table', 'fa-check-circle', '/admin/kitchendisplay/main-kitchen'),
        card('My Orders', orders, 'active tickets', 'fa-shopping-bag', '/admin/orders'),
        card('Guest Notes', calls, 'calls / allergy / request', 'fa-sticky-note-o', '/admin/notifications'),
        card('Payments Due', payments, 'my tables only', 'fa-credit-card', '/admin/payments'),
      '</div>'
    ].join('');
  }

  function applyW3RoleBar() {
    var root = document.querySelector('.pmd-dashboard-modern[data-pmd-role="waiter3"]');
    if (!root) return;

    var panel = root.querySelector('.pmd-role-panel');
    if (!panel) return;

    var existing = panel.querySelector('.pmd-w3-role-kpi-bar');
    if (existing) {
      existing.setAttribute('data-pmd-stable-rolebar-v77', '1');
      return;
    }

    var hero = panel.querySelector('.pmd-w3-hero');
    var quick = panel.querySelector('.pmd-w3-quick-shell');

    if (hero) hero.insertAdjacentHTML('afterend', buildRoleBar());
    else if (quick) quick.insertAdjacentHTML('beforebegin', buildRoleBar());
    else panel.insertAdjacentHTML('afterbegin', buildRoleBar());
  }

  document.addEventListener('click', function (event) {
    var card = event.target.closest('.pmd-w3-role-kpi-bar [data-pmd-role-href]');
    if (!card) return;
    var href = card.getAttribute('data-pmd-role-href');
    if (href && href !== '#') window.location.href = href;
  }, true);

  function schedule() {
    [80, 180, 350, 700, 1000, 1600, 2600].forEach(function (delay) {
      setTimeout(applyW3RoleBar, delay);
    });
  }

  document.addEventListener('pmd:dashboard-real-data-v3', schedule);
  document.addEventListener('pmd:dashboard-real-data-v2', schedule);
  document.addEventListener('pmd:dashboard-real-data', schedule);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();

  window.PMDWaiter3RoleBar = { refresh: applyW3RoleBar };
})();
