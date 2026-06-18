(function () {
  'use strict';

  var attempts = 0;
  var maxAttempts = 12;
  var lastValuesJson = '';
  var observer = null;
  var timer = null;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function container() {
    return document.querySelector('[data-control="dashboard-container"]');
  }

  function modernRoot() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function isModernElement(el) {
    return !!(el && el.closest && el.closest('.pmd-dashboard-modern'));
  }

  function getSourceText() {
    var c = container();
    if (!c) return '';

    var clone = c.cloneNode(true);
    clone.querySelectorAll('.pmd-dashboard-modern').forEach(function (el) {
      el.remove();
    });

    return clean(clone.textContent || '');
  }

  function moneyOrNumberRegex() {
    return '([€$£]?\\s*-?\\d[\\d.,]*\\s*(?:€|\\$|£)?)';
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeNumberCandidate(value) {
    var v = clean(value);
    if (!v) return null;

    // reject years/dates that can appear in charts
    if (/^20\d{2}$/.test(v)) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;

    return v;
  }

  function findByWholeText(labels) {
    var source = getSourceText();
    if (!source) return null;

    for (var i = 0; i < labels.length; i++) {
      var label = escapeRegExp(labels[i]);

      var before = new RegExp(moneyOrNumberRegex() + '\\s+' + label, 'i');
      var bm = source.match(before);
      if (bm && bm[1]) return normalizeNumberCandidate(bm[1]);

      var after = new RegExp(label + '\\s+' + moneyOrNumberRegex(), 'i');
      var am = source.match(after);
      if (am && am[1]) return normalizeNumberCandidate(am[1]);
    }

    return null;
  }

  function findByNearbyDom(labels) {
    var c = container();
    if (!c) return null;

    var all = Array.from(c.querySelectorAll('*')).filter(function (el) {
      if (isModernElement(el)) return false;
      var text = clean(el.textContent);
      if (!text) return false;

      return labels.some(function (label) {
        return text.toLowerCase().indexOf(label.toLowerCase()) !== -1;
      });
    });

    for (var i = 0; i < all.length; i++) {
      var el = all[i];

      var current = el;
      for (var depth = 0; depth < 6 && current; depth++) {
        var text = clean(current.textContent);
        if (!text) {
          current = current.parentElement;
          continue;
        }

        for (var l = 0; l < labels.length; l++) {
          var label = escapeRegExp(labels[l]);

          var before = new RegExp(moneyOrNumberRegex() + '\\s+' + label, 'i');
          var bm = text.match(before);
          if (bm && bm[1]) return normalizeNumberCandidate(bm[1]);

          var after = new RegExp(label + '\\s+' + moneyOrNumberRegex(), 'i');
          var am = text.match(after);
          if (am && am[1]) return normalizeNumberCandidate(am[1]);
        }

        current = current.parentElement;
      }
    }

    return null;
  }

  function findRealNumber(labels) {
    return findByNearbyDom(labels) || findByWholeText(labels);
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

  function setText(root, selector, value) {
    root.querySelectorAll(selector).forEach(function (el) {
      var next = value || '—';
      if (el.textContent !== next) {
        el.textContent = next;
      }

      if (value && value !== '—') {
        el.classList.add('pmd-real-loaded');
      }
    });
  }

  function updateDashboard() {
    var root = modernRoot();
    if (!root) return;

    attempts++;

    var revenue = findRealNumber([
      'Total Delivery Orders',
      'Delivery Orders',
      'Revenue Today',
      'Revenue'
    ]);

    var orders = findRealNumber([
      'Total Orders'
    ]);

    var reservations = findRealNumber([
      'Total Reservations'
    ]);

    var customers = findRealNumber([
      'Total Customers',
      'Customers',
      'Guests Today',
      'Guests'
    ]);

    var pendingPayments = findRealNumber([
      'Pending Payments',
      'Unpaid bills',
      'Unpaid',
      'Due today',
      'Overdue'
    ]);

    var revenueNumber = parseNumber(revenue);
    var orderNumber = parseNumber(orders);
    var avgTicket = revenueNumber !== null && orderNumber && orderNumber > 0
      ? formatEuro(revenueNumber / orderNumber)
      : null;

    var values = {
      revenue: revenue || null,
      pendingPayments: pendingPayments || null,
      orders: orders || null,
      reservations: reservations || null,
      customers: customers || null,
      avgTicket: avgTicket || null,
      attempts: attempts
    };

    var json = JSON.stringify(values);
    if (json !== lastValuesJson) {
      lastValuesJson = json;

      setText(root, '[data-pmd-kpi="revenue"]', values.revenue);
      setText(root, '[data-pmd-card="revenue"]', values.revenue);
      setText(root, '[data-pmd-card="revenue2"]', values.revenue);

      setText(root, '[data-pmd-kpi="orders"]', values.orders);
      setText(root, '[data-pmd-card="orders"]', values.orders);
      setText(root, '[data-pmd-mini="orders"]', values.orders);

      setText(root, '[data-pmd-kpi="reservations"]', values.reservations);
      setText(root, '[data-pmd-card="reservations"]', values.reservations);
      setText(root, '[data-pmd-mini="reservations"]', values.reservations);
      setText(root, '[data-pmd-mini="reservations2"]', values.reservations);

      setText(root, '[data-pmd-kpi="customers"]', values.customers);
      setText(root, '[data-pmd-card="customers"]', values.customers);

      setText(root, '[data-pmd-kpi="payments"]', values.pendingPayments);

      setText(root, '[data-pmd-kpi="avg"]', values.avgTicket);
      setText(root, '[data-pmd-mini="avg"]', values.avgTicket);
    }

    var subs = root.querySelectorAll('.pmd-dashboard-kpi-sub');
    if (subs[0]) subs[0].innerHTML = '<i class="fa fa-arrow-up"></i> dashboard value';
    if (subs[1]) subs[1].innerHTML = values.pendingPayments ? '<i class="fa fa-arrow-up"></i> payment value' : '<i class="fa fa-arrow-up"></i> no payment source yet';
    if (subs[2]) subs[2].innerHTML = '<i class="fa fa-arrow-up"></i> total orders';
    if (subs[3]) subs[3].innerHTML = '<i class="fa fa-arrow-up"></i> reservations';
    if (subs[4]) subs[4].innerHTML = '<i class="fa fa-arrow-up"></i> calculated avg';

    window.PMDDashboardRealDataDebug = {
      values: values,
      sourceText: getSourceText(),
      run: function () {
        console.group('PMD Dashboard Real Data v5.2');
        console.table(this.values);
        console.log('Source text:', this.sourceText);
        console.groupEnd();
      }
    };

    if (attempts >= maxAttempts && observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (attempts < maxAttempts) updateDashboard();
    }, delay || 250);
  }

  function init() {
    [150, 600, 1200, 2200, 4000, 7000].forEach(function (delay) {
      setTimeout(function () {
        if (attempts < maxAttempts) updateDashboard();
      }, delay);
    });

    setTimeout(function () {
      var widgets = document.querySelector('.dashboard-widgets');
      if (!widgets) return;

      observer = new MutationObserver(function () {
        if (attempts < maxAttempts) schedule(500);
      });

      observer.observe(widgets, {
        childList: true,
        subtree: true,
        characterData: true
      });

      setTimeout(function () {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }, 15000);
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
