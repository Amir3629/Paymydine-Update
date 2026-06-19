(function () {
  'use strict';

  var lastData = null;
  var loading = false;

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function setText(selector, value) {
    var r = root();
    if (!r) return;

    r.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
      el.classList.add('pmd-real-loaded');
    });
  }

  function setLabel(index, label) {
    var r = root();
    if (!r) return;

    var labels = r.querySelectorAll('.pmd-dashboard-kpi-label');
    if (labels[index]) labels[index].textContent = label;
  }

  function setSub(index, text) {
    var r = root();
    if (!r) return;

    var subs = r.querySelectorAll('.pmd-dashboard-kpi-sub');
    if (subs[index]) subs[index].innerHTML = '<i class="fa fa-database"></i> ' + text;
  }

  function setLine(cardTitle, lineLabel, value) {
    var r = root();
    if (!r) return;

    var cards = Array.from(r.querySelectorAll('.pmd-dashboard-card'));
    var card = cards.find(function (c) {
      return ((c.querySelector('.pmd-dashboard-card-title') || {}).textContent || '').trim().toLowerCase() === cardTitle.toLowerCase();
    });

    if (!card) return;

    Array.from(card.querySelectorAll('.pmd-dashboard-line')).forEach(function (line) {
      var spans = line.querySelectorAll('span');
      if (spans.length < 2) return;
      if ((spans[0].textContent || '').trim().toLowerCase() === lineLabel.toLowerCase()) {
        spans[1].textContent = value;
      }
    });
  }

  function refreshOwner2() {
    try {
      if (
        window.PMDDashboardRolePreview &&
        typeof window.PMDDashboardRolePreview.current === 'function' &&
        window.PMDDashboardRolePreview.current() === 'owner2' &&
        typeof window.PMDDashboardRolePreview.setRole === 'function'
      ) {
        window.PMDDashboardRolePreview.setRole('owner2');
      }
    } catch (e) {}
  }

  function apply(data) {
    if (!data || !data.ok || !data.metrics) return;

    lastData = data;
    var m = data.metrics;

    setLabel(0, 'REVENUE TODAY');
    setLabel(1, 'PENDING PAYMENTS');
    setLabel(2, 'ORDERS');
    setLabel(3, 'RESERVATIONS');
    setLabel(4, 'AVG TICKET');

    setText('[data-pmd-kpi="revenue"]', m.revenue_today.value);
    setText('[data-pmd-kpi="payments"]', m.pending_payments.value);
    setText('[data-pmd-kpi="orders"]', m.orders.value);
    setText('[data-pmd-kpi="reservations"]', m.reservations.value);
    setText('[data-pmd-kpi="avg"]', m.reports.value);

    setText('[data-pmd-card="orders"]', m.orders.value);
    setText('[data-pmd-card="reservations"]', m.reservations.value);
    setText('[data-pmd-card="revenue"]', m.pending_payments.value);
    setText('[data-pmd-card="revenue2"]', m.revenue_today.value);
    setText('[data-pmd-card="customers"]', m.customers.value);

    setText('[data-pmd-mini="orders"]', m.orders.value);
    setText('[data-pmd-mini="reservations"]', m.reservations.value);
    setText('[data-pmd-mini="reservations2"]', m.reservations.value);
    setText('[data-pmd-mini="avg"]', m.reports.value);

    setSub(0, 'source: ' + m.revenue_today.source);
    setSub(1, (m.pending_payments.count || 0) + ' pending');
    setSub(2, 'source: ' + m.orders.source);
    setSub(3, 'source: ' + m.reservations.source);
    setSub(4, 'revenue / orders');

    if (m.orders.dine_in !== null) setLine('Open Orders', 'Dine In', String(m.orders.dine_in));
    if (m.orders.takeaway !== null) setLine('Open Orders', 'Takeaway', String(m.orders.takeaway));
    if (m.orders.delivery !== null) setLine('Open Orders', 'Delivery', String(m.orders.delivery));

    setLine('Reservations', 'Today', m.reservations.value);
    setLine('Reservations', 'Upcoming', String(m.reservations.upcoming || 0));
    setLine('Payments', 'Unpaid bills', String(m.pending_payments.count || 0));
    setLine('Payments', 'Due today', m.pending_payments.value);
    setLine('Sales Overview', 'Orders', m.orders.value);
    setLine('Sales Overview', 'Reservations', m.reservations.value);
    setLine('Guests / Customers', 'Guests Today', String(m.customers.today || 0));
    setLine('Guests / Customers', 'Avg Ticket', m.reports.value);
    setLine('Kitchen Display', 'Preparing', String(m.kitchen_status.preparing || 0));
    setLine('Kitchen Display', 'Ready', String(m.kitchen_status.ready || 0));
    setLine('Kitchen Display', 'Completed', String(m.kitchen_status.completed || 0));

    window.PMDRealDashboardData = data;
    document.dispatchEvent(new CustomEvent('pmd:dashboard-real-data-v2', { detail: data }));
    refreshOwner2();

    console.log('✅ PMD real dashboard v2 applied', data);
  }

  function fetchData() {
    if (loading) return;
    loading = true;

    fetch('/admin/pmd-dashboard-data-v2', {
      credentials: 'same-origin',
      headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(apply)
      .catch(function (e) {
        console.warn('⚠️ PMD dashboard real API v2 failed', e);
      })
      .finally(function () {
        loading = false;
      });
  }

  window.PMDRealDashboardAPI = {
    refresh: fetchData,
    apply: apply,
    last: function () { return lastData; }
  };

  function schedule() {
    [500, 1500, 3000, 6000].forEach(function (delay) {
      setTimeout(fetchData, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
