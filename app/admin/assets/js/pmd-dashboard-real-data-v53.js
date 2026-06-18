(function () {
  'use strict';

  var attempts = 0;
  var maxAttempts = 8;
  var lastJson = '';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function container() {
    return document.querySelector('[data-control="dashboard-container"]');
  }

  function modernRoot() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function sourceText() {
    var c = container();
    if (!c) return '';

    var clone = c.cloneNode(true);

    // Remove our modern dashboard so only real old dashboard widgets remain.
    clone.querySelectorAll('.pmd-dashboard-modern').forEach(function (el) {
      el.remove();
    });

    // Remove scripts so JS code text does not pollute parsing.
    clone.querySelectorAll('script, style').forEach(function (el) {
      el.remove();
    });

    return clean(clone.textContent || '');
  }

  function moneyNumberPattern() {
    return '([€$£]?\\s*-?\\d[\\d.,]*\\s*(?:€|\\$|£)?)';
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function rejectFake(value) {
    var v = clean(value);
    if (!v) return null;

    // Reject grid width numbers and dates.
    if (/^(1|2|3|4|5|6|7|8|9|10|11|12)$/.test(v)) return null;
    if (/^20\d{2}$/.test(v)) return null;

    return v;
  }

  function findValue(labelList) {
    var text = sourceText();
    if (!text) return null;

    for (var i = 0; i < labelList.length; i++) {
      var label = escapeRegExp(labelList[i]);

      // Main pattern from current dashboard: "€38,090.60 Total Sales"
      var before = new RegExp(moneyNumberPattern() + '\\s+' + label + '(?=\\s|$)', 'i');
      var bm = text.match(before);
      if (bm && bm[1]) return rejectFake(bm[1]);

      // Fallback: "Total Sales €38,090.60"
      var after = new RegExp(label + '\\s+' + moneyNumberPattern(), 'i');
      var am = text.match(after);
      if (am && am[1]) return rejectFake(am[1]);
    }

    return null;
  }

  function parseNumeric(value) {
    if (!value) return null;

    var raw = clean(value)
      .replace(/[€$£\s]/g, '')
      .replace(/,/g, '');

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

  function setKpiLabel(root, index, label) {
    var labels = root.querySelectorAll('.pmd-dashboard-kpi-label');
    if (labels[index]) labels[index].textContent = label;
  }

  function setSub(root, index, html) {
    var subs = root.querySelectorAll('.pmd-dashboard-kpi-sub');
    if (subs[index]) subs[index].innerHTML = html;
  }

  function updateCardTitles(root) {
    // Keep reference layout, but make labels honest to available real data.
    setKpiLabel(root, 0, 'TOTAL SALES');
    setKpiLabel(root, 1, 'CASH PAYMENTS');
    setKpiLabel(root, 2, 'ORDERS');
    setKpiLabel(root, 3, 'RESERVATIONS');
    setKpiLabel(root, 4, 'AVG TICKET');

    var paymentsTitle = Array.from(root.querySelectorAll('.pmd-dashboard-card-title')).find(function (el) {
      return clean(el.textContent).toLowerCase() === 'payments';
    });
    if (paymentsTitle) paymentsTitle.textContent = 'Cash Payments';

    var salesTitle = Array.from(root.querySelectorAll('.pmd-dashboard-card-title')).find(function (el) {
      return clean(el.textContent).toLowerCase() === 'sales overview';
    });
    if (salesTitle) salesTitle.textContent = 'Sales Overview';
  }

  function update() {
    attempts++;

    var root = modernRoot();
    if (!root) return;

    var totalSales = findValue(['Total Sales']);
    var lostSales = findValue(['Total Lost Sales']);
    var cashPayments = findValue(['Total Cash Payments']);

    // These will only fill if the real widget exists/rendered.
    var totalOrders = findValue(['Total Orders']);
    var deliveryOrders = findValue(['Total Delivery Orders']);
    var pickupOrders = findValue(['Total Pick-up Orders', 'Total Pickup Orders']);
    var completedOrders = findValue(['Total Orders Completed']);

    var totalReservations = findValue(['Total Reservations']);
    var reservedTables = findValue(['Total Table(s) Reserved', 'Total Tables Reserved']);
    var completedReservations = findValue(['Total Reservations Completed']);

    var totalCustomers = findValue(['Total Customers']);
    var totalGuests = findValue(['Total Guests']);

    var orderNumber = parseNumeric(totalOrders);
    var salesNumber = parseNumeric(totalSales);
    var avgTicket = salesNumber !== null && orderNumber && orderNumber > 0
      ? formatEuro(salesNumber / orderNumber)
      : null;

    var values = {
      totalSales: totalSales,
      lostSales: lostSales,
      cashPayments: cashPayments,
      totalOrders: totalOrders,
      deliveryOrders: deliveryOrders,
      pickupOrders: pickupOrders,
      completedOrders: completedOrders,
      totalReservations: totalReservations,
      reservedTables: reservedTables,
      completedReservations: completedReservations,
      totalCustomers: totalCustomers,
      totalGuests: totalGuests,
      avgTicket: avgTicket,
      attempts: attempts
    };

    var json = JSON.stringify(values);
    if (json === lastJson && attempts > 2) return;
    lastJson = json;

    updateCardTitles(root);

    // KPI bar
    setText(root, '[data-pmd-kpi="revenue"]', totalSales);
    setText(root, '[data-pmd-kpi="payments"]', cashPayments);
    setText(root, '[data-pmd-kpi="orders"]', totalOrders);
    setText(root, '[data-pmd-kpi="reservations"]', totalReservations);
    setText(root, '[data-pmd-kpi="avg"]', avgTicket);

    // Cards
    setText(root, '[data-pmd-card="revenue"]', cashPayments);
    setText(root, '[data-pmd-card="revenue2"]', totalSales);
    setText(root, '[data-pmd-card="orders"]', totalOrders);
    setText(root, '[data-pmd-card="reservations"]', totalReservations);
    setText(root, '[data-pmd-card="customers"]', totalGuests || totalCustomers);

    // Mini values
    setText(root, '[data-pmd-mini="orders"]', totalOrders);
    setText(root, '[data-pmd-mini="reservations"]', totalReservations);
    setText(root, '[data-pmd-mini="reservations2"]', totalReservations);
    setText(root, '[data-pmd-mini="avg"]', avgTicket);

    // More detailed lines where possible.
    var lines = root.querySelectorAll('.pmd-dashboard-line');
    lines.forEach(function (line) {
      var label = clean(line.querySelector('span:first-child') ? line.querySelector('span:first-child').textContent : '').toLowerCase();
      var valueEl = line.querySelector('span:last-child');
      if (!valueEl) return;

      if (label === 'delivery' && deliveryOrders) valueEl.textContent = deliveryOrders;
      if (label === 'takeaway' && pickupOrders) valueEl.textContent = pickupOrders;
      if (label === 'orders' && totalOrders) valueEl.textContent = totalOrders;
      if (label === 'reservations' && totalReservations) valueEl.textContent = totalReservations;
      if (label === 'today' && totalReservations) valueEl.textContent = totalReservations;
      if (label === 'unpaid bills' && cashPayments) valueEl.textContent = cashPayments;
      if (label === 'due today' && lostSales) valueEl.textContent = lostSales;
      if (label === 'guests today' && totalGuests) valueEl.textContent = totalGuests;
      if (label === 'avg ticket' && avgTicket) valueEl.textContent = avgTicket;
    });

    setSub(root, 0, '<i class="fa fa-arrow-up"></i> real total sales');
    setSub(root, 1, '<i class="fa fa-arrow-up"></i> real cash payments');
    setSub(root, 2, totalOrders ? '<i class="fa fa-arrow-up"></i> real total orders' : '<i class="fa fa-arrow-up"></i> add orders stat');
    setSub(root, 3, totalReservations ? '<i class="fa fa-arrow-up"></i> real reservations' : '<i class="fa fa-arrow-up"></i> add reservation stat');
    setSub(root, 4, avgTicket ? '<i class="fa fa-arrow-up"></i> calculated avg' : '<i class="fa fa-arrow-up"></i> needs orders value');

    window.PMDDashboardRealDataDebug = {
      version: 'v5.3-current-widgets',
      values: values,
      sourceText: sourceText(),
      run: function () {
        console.group('PMD Dashboard Real Data v5.3');
        console.table(this.values);
        console.log('Source text:', this.sourceText);
        console.groupEnd();
      }
    };
  }

  function schedule() {
    [200, 800, 1800, 3200, 5500, 8000].forEach(function (delay) {
      setTimeout(function () {
        if (attempts < maxAttempts) update();
      }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
