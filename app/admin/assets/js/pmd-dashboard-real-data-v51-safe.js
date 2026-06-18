(function () {
  'use strict';

  var runCount = 0;
  var maxRuns = 10;
  var updateTimer = null;
  var lastSnapshot = '';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function container() {
    return document.querySelector('[data-control="dashboard-container"]');
  }

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function sourceText() {
    var c = container();
    if (!c) return '';

    var clone = c.cloneNode(true);

    clone.querySelectorAll('.pmd-dashboard-modern').forEach(function (el) {
      el.remove();
    });

    return clean(clone.textContent || '');
  }

  function numberPattern() {
    return '([€$£]?\\s*-?\\d[\\d.,]*\\s*(?:€|\\$|£)?)';
  }

  function findNumber(source, labels) {
    if (!source) return null;

    for (var i = 0; i < labels.length; i++) {
      var label = escapeRegExp(labels[i]);

      var before = new RegExp(numberPattern() + '\\s+' + label, 'i');
      var beforeMatch = source.match(before);
      if (beforeMatch && beforeMatch[1]) return clean(beforeMatch[1]);

      var after = new RegExp(label + '\\s+' + numberPattern(), 'i');
      var afterMatch = source.match(after);
      if (afterMatch && afterMatch[1]) return clean(afterMatch[1]);
    }

    return null;
  }

  function parseNumber(value) {
    if (!value) return null;

    var raw = clean(value)
      .replace(/[€$£\s]/g, '')
      .replace(',', '.');

    var parsed = parseFloat(raw);
    return isNaN(parsed) ? null : parsed;
  }

  function formatEuro(value) {
    if (value === null || value === undefined || isNaN(value)) return null;
    return '€' + value.toFixed(2);
  }

  function setText(r, selector, value) {
    r.querySelectorAll(selector).forEach(function (el) {
      var finalValue = value || '—';
      if (el.textContent !== finalValue) {
        el.textContent = finalValue;
      }

      if (value && value !== '—') {
        el.classList.add('pmd-real-loaded');
      }
    });
  }

  function update() {
    var r = root();
    if (!r) return;

    var source = sourceText();
    if (!source) return;

    // Avoid reprocessing same text forever.
    if (source === lastSnapshot && runCount > 2) return;
    lastSnapshot = source;
    runCount++;

    var revenue = findNumber(source, [
      'Total Delivery Orders',
      'Delivery Orders',
      'Revenue Today',
      'Revenue'
    ]);

    var orders = findNumber(source, [
      'Total Orders',
      'Orders'
    ]);

    var reservations = findNumber(source, [
      'Total Reservations',
      'Reservations'
    ]);

    var customers = findNumber(source, [
      'Total Customers',
      'Customers',
      'Guests Today',
      'Guests'
    ]);

    var pendingPayments = findNumber(source, [
      'Pending Payments',
      'Unpaid bills',
      'Unpaid',
      'Due today',
      'Overdue'
    ]);

    var revenueNum = parseNumber(revenue);
    var orderNum = parseNumber(orders);
    var avgTicket = revenueNum !== null && orderNum && orderNum > 0
      ? formatEuro(revenueNum / orderNum)
      : null;

    setText(r, '[data-pmd-kpi="revenue"]', revenue);
    setText(r, '[data-pmd-card="revenue"]', revenue);
    setText(r, '[data-pmd-card="revenue2"]', revenue);

    setText(r, '[data-pmd-kpi="orders"]', orders);
    setText(r, '[data-pmd-card="orders"]', orders);
    setText(r, '[data-pmd-mini="orders"]', orders);

    setText(r, '[data-pmd-kpi="reservations"]', reservations);
    setText(r, '[data-pmd-card="reservations"]', reservations);
    setText(r, '[data-pmd-mini="reservations"]', reservations);
    setText(r, '[data-pmd-mini="reservations2"]', reservations);

    setText(r, '[data-pmd-kpi="customers"]', customers);
    setText(r, '[data-pmd-card="customers"]', customers);

    setText(r, '[data-pmd-kpi="avg"]', avgTicket);
    setText(r, '[data-pmd-mini="avg"]', avgTicket);

    setText(r, '[data-pmd-kpi="payments"]', pendingPayments);

    var subs = r.querySelectorAll('.pmd-dashboard-kpi-sub');
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
        avgTicket: avgTicket || 'missing',
        runCount: runCount
      },
      sourceText: source,
      run: function () {
        console.group('PMD Dashboard Real Data v5.1 SAFE');
        console.table(this.values);
        console.log('Source text used:', this.sourceText);
        console.groupEnd();
      }
    };
  }

  function schedule(delay) {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(function () {
      if (runCount < maxRuns) update();
    }, delay || 150);
  }

  function init() {
    schedule(150);
    schedule(700);

    window.setTimeout(update, 1400);
    window.setTimeout(update, 2600);
    window.setTimeout(update, 5000);

    // Observe only original dashboard widgets, not whole document.
    window.setTimeout(function () {
      var widgets = document.querySelector('.dashboard-widgets');
      if (!widgets) return;

      var observer = new MutationObserver(function () {
        if (runCount < maxRuns) schedule(400);
      });

      observer.observe(widgets, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Stop observer after 12 seconds to avoid long-term performance issues.
      window.setTimeout(function () {
        observer.disconnect();
      }, 12000);
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
