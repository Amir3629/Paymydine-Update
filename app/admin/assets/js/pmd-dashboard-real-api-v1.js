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
    var card = cards.find(function (card) {
      return (card.querySelector('.pmd-dashboard-card-title')?.textContent || '').trim().toLowerCase() === cardTitle.toLowerCase();
    });

    if (!card) return;

    Array.from(card.querySelectorAll('.pmd-dashboard-line')).forEach(function (line) {
      var left = line.querySelector('span:first-child');
      var right = line.querySelector('span:last-child');
      if ((left?.textContent || '').trim().toLowerCase() === lineLabel.toLowerCase() && right) {
        right.textContent = value;
      }
    });
  }

  function updateOwner2IfOpen() {
    try {
      if (
        window.PMDDashboardRolePreview &&
        typeof window.PMDDashboardRolePreview.current === 'function' &&
        typeof window.PMDDashboardRolePreview.setRole === 'function' &&
        window.PMDDashboardRolePreview.current() === 'owner2'
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

    setSub(0, 'from ' + m.revenue_today.source);
    setSub(1, m.pending_payments.count + ' pending');
    setSub(2, 'today from ' + m.orders.source);
    setSub(3, 'today from ' + m.reservations.source);
    setSub(4, 'calculated from revenue/orders');

    if (m.orders.dine_in !== null) setLine('Open Orders', 'Dine In', m.orders.dine_in);
    if (m.orders.takeaway !== null) setLine('Open Orders', 'Takeaway', m.orders.takeaway);
    if (m.orders.delivery !== null) setLine('Open Orders', 'Delivery', m.orders.delivery);

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

    document.dispatchEvent(new CustomEvent('pmd:dashboard-real-data', { detail: data }));
    updateOwner2IfOpen();

    console.log('✅ PMD real dashboard API data applied:', data);
  }

  function fetchData() {
    if (loading) return;
    loading = true;

    fetch('/admin/pmd-dashboard-data', {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(apply)
      .catch(function (err) {
        console.warn('⚠️ PMD real dashboard API failed:', err);
      })
      .finally(function () {
        loading = false;
      });
  }

  function schedule() {
    [400, 1200, 2600, 5200].forEach(function (delay) {
      setTimeout(fetchData, delay);
    });
  }

  window.PMDRealDashboardAPI = {
    refresh: fetchData,
    last: function () { return lastData; },
    apply: apply
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
