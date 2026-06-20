(function () {
  'use strict';

  function svg(name) {
    var icons = {
      arrow: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
      money: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>',
      card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
      table: '<rect x="4" y="5" width="16" height="12" rx="2"/><path d="M8 17v3"/><path d="M16 17v3"/>',
      calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
      alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      plusUser: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      bag: '<path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      split: '<path d="M4 6h7v12H4z"/><path d="M13 6h7v12h-7z"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      map: '<path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-.9.8-1 1.6-1 3H9c0-1.4-.1-2.2-1-3Z"/>',
      fire: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 .2 2-1 3-2 4 0-4-2-7-5-9 1 5-4 6-4 12 0 4 3 7 8 7Z"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      magic: '<path d="m15 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/><path d="M5 15l4 4"/><path d="m9 15-4 4"/><path d="M19 15l-4 4"/><path d="m15 15 4 4"/>'
    };
    return '<svg class="pmd-svg-v30" viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || icons.alert) + '</svg>';
  }

  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function root() { return document.querySelector('.pmd-dashboard-modern'); }
  function panel() { return document.querySelector('.pmd-role-panel'); }

  function findHref(needles, fallback) {
    var links = Array.prototype.slice.call(document.querySelectorAll('#side-nav-menu a.nav-link[href], #side-nav-menu a[href], .nav-sidebar a[href]'));
    for (var i = 0; i < links.length; i++) {
      var link = links[i], href = link.getAttribute('href');
      if (!href || href === '#') continue;
      var hay = clean((link.innerText || '') + ' ' + href + ' ' + link.className).toLowerCase();
      for (var j = 0; j < needles.length; j++) if (hay.indexOf(String(needles[j]).toLowerCase()) !== -1) return href;
    }
    return fallback || '#';
  }

  function routes() {
    return {
      orders: findHref(['orders'], '/admin/orders'),
      orderCreate: '/admin/orders/create',
      reservations: findHref(['reservations'], '/admin/reservations'),
      reservationCreate: '/admin/reservations/create',
      tables: findHref(['tables'], '/admin/tables'),
      kds: findHref(['kitchen display', 'kds'], '/admin/kitchendisplay/main-kitchen'),
      payments: findHref(['payments'], '/admin/payments'),
      customers: findHref(['customers'], '/admin/customers'),
      reports: findHref(['reports'], '/admin/reports'),
      staff: findHref(['staff'], '/admin/staffs'),
      messaging: findHref(['customers', 'messages'], '/admin/customers')
    };
  }

  function liveValue(selector, fallback) {
    var el = document.querySelector(selector);
    var value = clean(el ? el.textContent : '');
    return value && value !== '—' && value !== '-' ? value : fallback;
  }

  function kpi(label, value, sub, icon, href, tone) {
    return [
      '<div class="pmd-role-kpi ' + (tone || '') + '" data-pmd-role-href="' + href + '">',
        '<div class="pmd-role-kpi-label">' + label + '</div>',
        '<div class="pmd-role-kpi-value">' + value + '</div>',
        '<div class="pmd-role-kpi-sub">' + svg('arrow') + sub + '</div>',
        '<div class="pmd-role-kpi-icon">' + svg(icon) + '</div>',
      '</div>'
    ].join('');
  }

  function action(label, icon, href) {
    return '<a class="pmd-manager-action-v30" href="' + href + '">' + svg(icon) + '<span>' + label + '</span></a>';
  }

  function card(cls, icon, tone, title, sub, body, pill) {
    return [
      '<section class="pmd-manager-card-v30 ' + cls + '">',
        '<div class="pmd-manager-card-head-v30">',
          '<div class="pmd-manager-title-v30">',
            '<div class="pmd-manager-title-icon-v30 ' + (tone || '') + '">' + svg(icon) + '</div>',
            '<div><div class="pmd-manager-card-title-v30">' + title + '</div>',
            sub ? '<div class="pmd-manager-card-sub-v30">' + sub + '</div>' : '',
            '</div>',
          '</div>',
          pill ? '<div class="pmd-manager-live-pill-v30">' + svg('arrow') + pill + '</div>' : '',
        '</div>',
        body,
      '</section>'
    ].join('');
  }

  function financeItem(label, value, note) {
    return '<div class="pmd-manager-finance-item-v30"><div class="pmd-manager-finance-label-v30">' + label + '</div><div class="pmd-manager-finance-value-v30">' + value + '</div>' + (note ? '<div class="pmd-manager-finance-note-v30">' + note + '</div>' : '') + '</div>';
  }

  function tableTile(name, status, guests, label) {
    return '<div class="pmd-manager-table-v30 ' + status + '"><span>' + name + '</span><small>' + guests + ' · ' + label + '</small></div>';
  }

  function alertItem(icon, title, detail, badge) {
    return '<div class="pmd-manager-alert-v30"><div class="pmd-alert-icon-v30">' + svg(icon) + '</div><div><strong>' + title + '</strong><span>' + detail + '</span></div><em class="pmd-manager-badge-v30">' + badge + '</em></div>';
  }

  function eventItem(icon, title, detail, time) {
    return '<div class="pmd-manager-event-v30"><div class="pmd-event-icon-v30">' + svg(icon) + '</div><div><strong>' + title + '</strong><span>' + detail + '</span></div><time>' + time + '</time></div>';
  }

  function row(label, value, note) {
    return '<div class="pmd-manager-row-v30"><div>' + label + (note ? '<span> · ' + note + '</span>' : '') + '</div><strong>' + value + '</strong></div>';
  }

  function insight(icon, title, detail, badge) {
    return '<div class="pmd-manager-insight-v30"><div class="pmd-insight-icon-v30">' + svg(icon) + '</div><div><strong>' + title + '</strong><span>' + detail + '</span></div><em class="pmd-manager-badge-v30">' + badge + '</em></div>';
  }

  function managerHtml() {
    var r = routes();

    var revenue = liveValue('[data-pmd-kpi="revenue"]', '$242.93');
    var reservations = liveValue('[data-pmd-card="reservations"], [data-pmd-kpi="reservations"]', '2');
    var avg = liveValue('[data-pmd-kpi="avg"], [data-pmd-mini="avg"]', '$48.59');
    var openChecks = '8';
    var activeTables = '17';
    var alerts = '4';

    return [
      '<div class="pmd-manager-ops-v30" data-pmd-manager-ops="v30">',

        '<div class="pmd-role-kpi-bar pmd-manager-hero-v30">',
          kpi('Revenue Today', revenue, '18.6% vs yesterday', 'money', r.reports, 'tone-money'),
          kpi('Open Checks', openChecks, 'waiting payment', 'card', r.payments, ''),
          kpi('Active Tables', activeTables, 'live floor load', 'table', r.tables, 'tone-green'),
          kpi('Reservations Today', reservations, 'today schedule', 'calendar', r.reservations, 'tone-gold'),
          kpi('AI Alerts', alerts, 'needs attention', 'alert', r.reports, 'tone-red'),
        '</div>',

        '<div class="pmd-manager-quick-actions-v30">',
          action('Walk-in', 'plusUser', r.reservationCreate),
          action('New Order', 'bag', r.orderCreate),
          action('Split Bill', 'split', r.payments),
          action('Customer Messaging', 'message', r.messaging),
        '</div>',

        '<div class="pmd-manager-grid-v30">',

          card('full', 'money', 'green', 'Revenue & Financial KPIs', 'Money, open checks, table usage and reservations in one strip.',
            '<div class="pmd-manager-finance-v30">' +
              financeItem('Revenue Today', revenue, '+18.6% vs yesterday') +
              financeItem('Open Checks', openChecks, '$640.00 pending') +
              financeItem('Active Tables', activeTables, '8 dining · 2 reserved') +
              financeItem('Reservations Today', reservations, '$1,840 forecast') +
            '</div>', 'Live'),

          card('wide', 'map', 'green', 'Live Restaurant Floor', 'Live status of every table: available, reserved, dining, waiting payment and delayed.',
            '<div class="pmd-manager-floor-grid-v30">' +
              tableTile('T1', 'available', '2', 'Available') +
              tableTile('T2', 'dining', '4', 'Dining') +
              tableTile('T3', 'delayed', '4', 'Delayed') +
              tableTile('T4', 'available', '2', 'Available') +
              tableTile('T5', 'payment', '2', 'Payment') +
              tableTile('T6', 'dining', '6', 'Dining') +
              tableTile('T7', 'available', '2', 'Available') +
              tableTile('T8', 'reserved', '4', 'Reserved') +
              tableTile('T9', 'available', '2', 'Available') +
              tableTile('T10', 'payment', '2', 'Payment') +
              tableTile('T11', 'reserved', '4', 'Reserved') +
              tableTile('T12', 'delayed', '6', 'Delayed') +
              tableTile('T13', 'available', '2', 'Available') +
              tableTile('T14', 'dining', '2', 'Dining') +
              tableTile('T15', 'available', '4', 'Available') +
            '</div>' +
            '<div class="pmd-manager-legend-v30">' +
              '<span><i class="pmd-manager-dot-v30 available"></i>Available</span>' +
              '<span><i class="pmd-manager-dot-v30 reserved"></i>Reserved</span>' +
              '<span><i class="pmd-manager-dot-v30 dining"></i>Dining</span>' +
              '<span><i class="pmd-manager-dot-v30 payment"></i>Waiting Payment</span>' +
              '<span><i class="pmd-manager-dot-v30 delayed"></i>Delayed</span>' +
            '</div>', 'Live'),

          card('side', 'alert', 'red', 'AI Alerts', 'Immediate operational risks that need manager attention.',
            '<div class="pmd-manager-alert-list-v30">' +
              alertItem('fire', 'Kitchen delay', 'Table 3 has waited 18 min for mains.', 'High') +
              alertItem('card', 'Waiting payment', '2 tables are done but not paid yet.', 'Money') +
              alertItem('calendar', 'Upcoming reservation', 'VIP party in 18 min, table not ready.', 'Soon') +
              alertItem('users', 'Staff workload', 'Waiter 1 is overloaded vs section average.', 'AI') +
            '</div>', '4 alerts'),

          card('half', 'clock', 'purple', 'Live Timeline', 'Real-time stream: new orders, payments, reservations, check-ins and service actions.',
            '<div class="pmd-manager-timeline-v30">' +
              eventItem('bag', 'New order created', 'Table 3 · 4 items · Kitchen notified', '2m') +
              eventItem('card', 'Payment received', 'Table 6 · $85.00 · Card', '5m') +
              eventItem('calendar', 'Reservation check-in', 'Table 12 · 4 guests seated', '9m') +
              eventItem('plusUser', 'Walk-in added', '2 guests · waiting 6 min', '12m') +
              eventItem('check', 'Order completed', 'Table 1 · $120.00 closed', '20m') +
            '</div>', 'Live'),

          card('half', 'chart', 'gold', 'Performance Analytics', 'Revenue by hour, payment breakdown, average guest spend and lost revenue.',
            '<div class="pmd-manager-analytics-grid-v30">' +
              '<div><div class="pmd-manager-card-sub-v30">Revenue by Hour</div><div class="pmd-manager-chart-bars-v30">' +
                '<i style="height:34%"></i><i style="height:48%"></i><i style="height:42%"></i><i style="height:62%"></i><i style="height:78%"></i><i style="height:58%"></i><i style="height:88%"></i><i style="height:72%"></i>' +
              '</div></div>' +
              '<div class="pmd-manager-metric-list-v30">' +
                '<div class="pmd-manager-mini-metric-v30"><span>Payment Breakdown</span><strong>58% card</strong><div class="pmd-manager-payment-bar-v30"><i></i><i></i><i></i></div></div>' +
                '<div class="pmd-manager-mini-metric-v30"><span>Average Guest Spend</span><strong>' + avg + '</strong></div>' +
                '<div class="pmd-manager-mini-metric-v30"><span>Lost Revenue</span><strong>$120.00</strong></div>' +
              '</div></div>', 'Today'),

          card('third', 'users', 'green', 'Team Performance', 'Waiter output, kitchen performance and order preparation time.',
            '<div class="pmd-manager-list-v30">' +
              row('Waiter 1', '28 orders', '$2,850') +
              row('Waiter 2', '24 orders', '$2,440') +
              row('Kitchen', '14m avg', 'prep time') +
              row('Late tickets', '2', 'needs check') +
              row('Service load', '82%', 'busy but safe') +
            '</div>', 'Team'),

          card('third', 'calendar', 'purple', 'Reservation Management', 'Upcoming reservations, reservation revenue forecast and no-show tracking.',
            '<div class="pmd-manager-list-v30">' +
              row('Upcoming today', '5', 'next: 18 min') +
              row('Forecast revenue', '$1,840', 'booked covers') +
              row('No-show tracking', '1', 'watch list') +
              row('VIP / notes', '2', 'prepare table') +
              row('Waitlist', '3', 'walk-in demand') +
            '</div>', 'Booking'),

          card('third', 'bulb', 'gold', 'AI Insights', 'Smart actions to increase revenue and find weak operational points.',
            '<div>' +
              insight('magic', 'Upsell opportunity', 'Recommend dessert to Tables 2, 6 and 14.', '+$68') +
              insight('chart', 'Increase revenue', 'Push early-bird offer before 18:30.', '+9%') +
              insight('search', 'Weak point found', 'Payment wait is causing table turnover loss.', 'Fix') +
              insight('fire', 'Kitchen bottleneck', 'Main station slows after 20:00.', 'Watch') +
            '</div>', 'AI'),

        '</div>',
      '</div>'
    ].join('');
  }

  var applying = false;

  function applyManagerDashboard(force) {
    var rt = root();
    var pn = panel();

    if (!rt || !pn || rt.getAttribute('data-pmd-role') !== 'manager') return;
    if (applying) return;
    if (!force && pn.getAttribute('data-pmd-manager-ops-v30') === '1') return;

    applying = true;
    pn.innerHTML = managerHtml();
    pn.setAttribute('data-pmd-manager-ops-v29', '0');
    pn.setAttribute('data-pmd-manager-ops-v30', '1');
    applying = false;
  }

  function bindRoleButtons() {
    document.querySelectorAll('[data-pmd-role-btn="manager"]').forEach(function (btn) {
      if (btn.getAttribute('data-pmd-manager-v30-bound')) return;
      btn.setAttribute('data-pmd-manager-v30-bound', '1');
      btn.addEventListener('click', function () {
        setTimeout(function () { applyManagerDashboard(true); }, 20);
        setTimeout(function () { applyManagerDashboard(true); }, 160);
      }, true);
    });
  }

  function watch() {
    bindRoleButtons();
    applyManagerDashboard(false);

    var obs = new MutationObserver(function () {
      bindRoleButtons();
      applyManagerDashboard(false);
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-pmd-role']
    });

    [250, 700, 1500, 3000].forEach(function (delay) {
      setTimeout(function () {
        bindRoleButtons();
        applyManagerDashboard(false);
      }, delay);
    });

    window.PMDManagerOpsDashboardV30 = {
      refresh: function () { applyManagerDashboard(true); },
      render: managerHtml
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch, { once: true });
  } else {
    watch();
  }
})();
