(function () {
  'use strict';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function dashboardContainer() {
    return document.querySelector('[data-control="dashboard-container"]');
  }

  function sourceText() {
    var container = dashboardContainer();
    if (!container) return '';

    var clone = container.cloneNode(true);

    // Remove our modern dashboard so we read only original/real widget data.
    clone.querySelectorAll('.pmd-dashboard-modern').forEach(function (el) {
      el.remove();
    });

    return clean(clone.textContent || '');
  }

  function numberPattern() {
    return '([€$£]?\\s*-?\\d[\\d.,]*\\s*(?:€|\\$|£)?)';
  }

  function findNumber(labels) {
    var text = sourceText();
    if (!text) return null;

    for (var i = 0; i < labels.length; i++) {
      var label = escapeRegExp(labels[i]);

      // Most current widgets are like: €363.90 Total Delivery Orders
      var before = new RegExp(numberPattern() + '\\s+' + label, 'i');
      var beforeMatch = text.match(before);
      if (beforeMatch && beforeMatch[1]) return clean(beforeMatch[1]);

      // Fallback: Total Orders 568
      var after = new RegExp(label + '\\s+' + numberPattern(), 'i');
      var afterMatch = text.match(after);
      if (afterMatch && afterMatch[1]) return clean(afterMatch[1]);
    }

    return null;
  }

  function parseMoney(value) {
    if (!value) return null;
    var raw = clean(value)
      .replace(/[€$£\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    // If value was like 363.90 and dots got removed, recover common euro format.
    var normal = clean(value).replace(/[€$£\s]/g, '').replace(',', '.');
    var parsed = parseFloat(normal);

    if (!isNaN(parsed)) return parsed;

    parsed = parseFloat(raw);
    return isNaN(parsed) ? null : parsed;
  }

  function parseNumber(value) {
    if (!value) return null;
    var raw = clean(value).replace(/[^\d.,-]/g, '').replace(',', '.');
    var parsed = parseFloat(raw);
    return isNaN(parsed) ? null : parsed;
  }

  function formatEuro(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return '€' + value.toFixed(2);
  }

  function setText(root, selector, value) {
    root.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value || '—';
      if (value && value !== '—') el.classList.add('pmd-real-loaded');
    });
  }

  function setSub(root, selector, value) {
    var el = root.querySelector(selector);
    if (el) el.innerHTML = value;
  }

  function updateDashboardRealData() {
    var root = document.querySelector('.pmd-dashboard-modern');
    if (!root) return;

    var revenue = findNumber([
      'Total Delivery Orders',
      'Delivery Orders',
      'Revenue Today',
      'Revenue'
    ]);

    var orders = findNumber([
      'Total Orders',
      'Orders'
    ]);

    var reservations = findNumber([
      'Total Reservations',
      'Reservations'
    ]);

    var customers = findNumber([
      'Total Customers',
      'Customers',
      'Guests Today',
      'Guests'
    ]);

    var pendingPayments = findNumber([
      'Pending Payments',
      'Unpaid bills',
      'Unpaid',
      'Due today',
      'Overdue'
    ]);

    var revenueNum = parseMoney(revenue);
    var orderNum = parseNumber(orders);
    var avgTicket = revenueNum !== null && orderNum && orderNum > 0
      ? formatEuro(revenueNum / orderNum)
      : null;

    setText(root, '[data-pmd-kpi="revenue"]', revenue);
    setText(root, '[data-pmd-card="revenue"]', revenue);
    setText(root, '[data-pmd-card="revenue2"]', revenue);

    setText(root, '[data-pmd-kpi="orders"]', orders);
    setText(root, '[data-pmd-card="orders"]', orders);
    setText(root, '[data-pmd-mini="orders"]', orders);

    setText(root, '[data-pmd-kpi="reservations"]', reservations);
    setText(root, '[data-pmd-card="reservations"]', reservations);
    setText(root, '[data-pmd-mini="reservations"]', reservations);
    setText(root, '[data-pmd-mini="reservations2"]', reservations);

    setText(root, '[data-pmd-kpi="customers"]', customers);
    setText(root, '[data-pmd-card="customers"]', customers);

    setText(root, '[data-pmd-kpi="avg"]', avgTicket);
    setText(root, '[data-pmd-mini="avg"]', avgTicket);

    // Only fill pending payments when real source exists. No fake number.
    setText(root, '[data-pmd-kpi="payments"]', pendingPayments);

    // Better subtitles, no long clipped text.
    var subs = root.querySelectorAll('.pmd-dashboard-kpi-sub');
    if (subs[0]) subs[0].innerHTML = '<i class="fa fa-arrow-up"></i> real dashboard value';
    if (subs[1]) subs[1].innerHTML = '<i class="fa fa-arrow-up"></i> real payment source';
    if (subs[2]) subs[2].innerHTML = '<i class="fa fa-arrow-up"></i> real total orders';
    if (subs[3]) subs[3].innerHTML = '<i class="fa fa-arrow-up"></i> real reservations';
    if (subs[4]) subs[4].innerHTML = '<i class="fa fa-arrow-up"></i> calculated avg';

    window.PMDDashboardRealDataDebug = {
      values: {
        revenue: revenue || 'missing',
        pendingPayments: pendingPayments || 'missing',
        orders: orders || 'missing',
        reservations: reservations || 'missing',
        customers: customers || 'missing',
        avgTicket: avgTicket || 'missing'
      },
      sourceText: sourceText(),
      run: function () {
        console.group('PMD Dashboard Real Data v5');
        console.table(this.values);
        console.log('Source text used:', this.sourceText);
        console.groupEnd();
      }
    };

    console.log('✅ PMD real dashboard data updated. Run PMDDashboardRealDataDebug.run()');
  }

  function schedule() {
    setTimeout(updateDashboardRealData, 100);
    setTimeout(updateDashboardRealData, 500);
    setTimeout(updateDashboardRealData, 1200);
    setTimeout(updateDashboardRealData, 2500);
    setTimeout(updateDashboardRealData, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
