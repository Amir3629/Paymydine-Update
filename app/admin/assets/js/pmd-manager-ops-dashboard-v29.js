(function () {
  'use strict';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function panel() {
    return document.querySelector('.pmd-role-panel');
  }

  function findHref(needles, fallback) {
    var links = Array.prototype.slice.call(document.querySelectorAll('#side-nav-menu a.nav-link[href], #side-nav-menu a[href], .nav-sidebar a[href]'));
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute('href');
      if (!href || href === '#') continue;
      var hay = clean((link.innerText || '') + ' ' + href + ' ' + link.className).toLowerCase();
      for (var j = 0; j < needles.length; j++) {
        if (hay.indexOf(String(needles[j]).toLowerCase()) !== -1) return href;
      }
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

  function kpi(label, value, sub, icon, href) {
    return [
      '<div class="pmd-role-kpi" data-pmd-role-href="' + href + '">',
        '<div class="pmd-role-kpi-label">' + label + '</div>',
        '<div class="pmd-role-kpi-value">' + value + '</div>',
        '<div class="pmd-role-kpi-sub"><i class="fa fa-arrow-up"></i> ' + sub + '</div>',
        '<div class="pmd-role-kpi-icon"><i class="fa ' + icon + '"></i></div>',
      '</div>'
    ].join('');
  }

  function action(label, icon, href) {
    return '<a class="pmd-manager-action-v29" href="' + href + '"><i class="fa ' + icon + '"></i><span>' + label + '</span></a>';
  }

  function card(cls, icon, tone, title, sub, body, pill) {
    return [
      '<section class="pmd-manager-card-v29 ' + cls + '">',
        '<div class="pmd-manager-card-head-v29">',
          '<div class="pmd-manager-title-v29">',
            '<div class="pmd-manager-title-icon-v29 ' + (tone || '') + '"><i class="fa ' + icon + '"></i></div>',
            '<div>',
              '<div class="pmd-manager-card-title-v29">' + title + '</div>',
              sub ? '<div class="pmd-manager-card-sub-v29">' + sub + '</div>' : '',
            '</div>',
          '</div>',
          pill ? '<div class="pmd-manager-live-pill-v29"><i class="fa fa-circle"></i>' + pill + '</div>' : '',
        '</div>',
        body,
      '</section>'
    ].join('');
  }

  function financeItem(label, value, note) {
    return [
      '<div class="pmd-manager-finance-item-v29">',
        '<div class="pmd-manager-finance-label-v29">' + label + '</div>',
        '<div class="pmd-manager-finance-value-v29">' + value + '</div>',
        note ? '<div class="pmd-manager-finance-note-v29">' + note + '</div>' : '',
      '</div>'
    ].join('');
  }

  function tableTile(name, status, guests, label) {
    return '<div class="pmd-manager-table-v29 ' + status + '"><span>' + name + '</span><small>' + guests + ' · ' + label + '</small></div>';
  }

  function alertItem(icon, title, detail, badge) {
    return [
      '<div class="pmd-manager-alert-v29">',
        '<i class="fa ' + icon + '"></i>',
        '<div><strong>' + title + '</strong><span>' + detail + '</span></div>',
        '<em class="pmd-manager-badge-v29">' + badge + '</em>',
      '</div>'
    ].join('');
  }

  function eventItem(icon, title, detail, time) {
    return [
      '<div class="pmd-manager-event-v29">',
        '<i class="fa ' + icon + '"></i>',
        '<div><strong>' + title + '</strong><span>' + detail + '</span></div>',
        '<time>' + time + '</time>',
      '</div>'
    ].join('');
  }

  function row(label, value, note) {
    return '<div class="pmd-manager-row-v29"><div>' + label + (note ? '<span> · ' + note + '</span>' : '') + '</div><strong>' + value + '</strong></div>';
  }

  function insight(icon, title, detail, badge) {
    return [
      '<div class="pmd-manager-insight-v29">',
        '<i class="fa ' + icon + '"></i>',
        '<div><strong>' + title + '</strong><span>' + detail + '</span></div>',
        '<em class="pmd-manager-badge-v29">' + badge + '</em>',
      '</div>'
    ].join('');
  }

  function managerHtml() {
    var r = routes();

    var revenue = liveValue('[data-pmd-kpi="revenue"]', '$4,280.50');
    var reservations = liveValue('[data-pmd-card="reservations"], [data-pmd-kpi="reservations"]', '5');
    var avg = liveValue('[data-pmd-kpi="avg"], [data-pmd-mini="avg"]', '$49.20');
    var openChecks = '8';
    var activeTables = '17';
    var alerts = '4';

    return [
      '<div class="pmd-manager-ops-v29" data-pmd-manager-ops="v29">',

        '<div class="pmd-role-kpi-bar pmd-manager-hero-v29">',
          kpi('Revenue Today', revenue, '18.6% vs yesterday', 'fa-line-chart', r.reports),
          kpi('Open Checks', openChecks, 'waiting payment', 'fa-credit-card', r.payments),
          kpi('Active Tables', activeTables, 'live floor load', 'fa-th-large', r.tables),
          kpi('Reservations Today', reservations, 'today schedule', 'fa-calendar-check-o', r.reservations),
          kpi('AI Alerts', alerts, 'needs attention', 'fa-exclamation-triangle', r.reports),
        '</div>',

        '<div class="pmd-manager-quick-actions-v29">',
          action('Walk-in', 'fa-user-plus', r.reservationCreate),
          action('New Order', 'fa-shopping-bag', r.orderCreate),
          action('Split Bill', 'fa-columns', r.payments),
          action('Customer Messaging', 'fa-commenting-o', r.messaging),
        '</div>',

        '<div class="pmd-manager-grid-v29">',

          card(
            'full',
            'fa-eur',
            'green',
            'Revenue & Financial KPIs',
            'Money, open checks, table usage and reservations in one strip.',
            '<div class="pmd-manager-finance-v29">' +
              financeItem('Revenue Today', revenue, '+18.6% vs yesterday') +
              financeItem('Open Checks', openChecks, '$640.00 pending') +
              financeItem('Active Tables', activeTables, '8 dining · 2 reserved') +
              financeItem('Reservations Today', reservations, '$1,840 forecast') +
            '</div>',
            'Live'
          ),

          card(
            'wide',
            'fa-map-o',
            'green',
            'Live Restaurant Floor',
            'Live status of every table: available, reserved, dining, waiting payment and delayed.',
            '<div class="pmd-manager-floor-grid-v29">' +
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
            '<div class="pmd-manager-legend-v29">' +
              '<span><i class="pmd-manager-dot-v29 available"></i>Available</span>' +
              '<span><i class="pmd-manager-dot-v29 reserved"></i>Reserved</span>' +
              '<span><i class="pmd-manager-dot-v29 dining"></i>Dining</span>' +
              '<span><i class="pmd-manager-dot-v29 payment"></i>Waiting Payment</span>' +
              '<span><i class="pmd-manager-dot-v29 delayed"></i>Delayed</span>' +
            '</div>',
            'Live'
          ),

          card(
            'side',
            'fa-exclamation-triangle',
            'red',
            'AI Alerts',
            'Immediate operational risks that need manager attention.',
            '<div class="pmd-manager-alert-list-v29">' +
              alertItem('fa-fire', 'Kitchen delay', 'Table 3 has waited 18 min for mains.', 'High') +
              alertItem('fa-credit-card', 'Waiting payment', '2 tables are done but not paid yet.', 'Money') +
              alertItem('fa-calendar', 'Upcoming reservation', 'VIP party in 18 min, table not ready.', 'Soon') +
              alertItem('fa-users', 'Staff workload', 'Waiter 1 is overloaded vs section average.', 'AI') +
            '</div>',
            '4 alerts'
          ),

          card(
            'half',
            'fa-clock-o',
            'purple',
            'Live Timeline',
            'Real-time stream: new orders, payments, reservations, check-ins and service actions.',
            '<div class="pmd-manager-timeline-v29">' +
              eventItem('fa-shopping-bag', 'New order created', 'Table 3 · 4 items · Kitchen notified', '2m') +
              eventItem('fa-credit-card', 'Payment received', 'Table 6 · $85.00 · Card', '5m') +
              eventItem('fa-calendar-check-o', 'Reservation check-in', 'Table 12 · 4 guests seated', '9m') +
              eventItem('fa-user-plus', 'Walk-in added', '2 guests · waiting 6 min', '12m') +
              eventItem('fa-check', 'Order completed', 'Table 1 · $120.00 closed', '20m') +
            '</div>',
            'Live'
          ),

          card(
            'half',
            'fa-bar-chart',
            'gold',
            'Performance Analytics',
            'Revenue by hour, payment breakdown, average guest spend and lost revenue.',
            '<div class="pmd-manager-analytics-grid-v29">' +
              '<div>' +
                '<div class="pmd-manager-card-sub-v29">Revenue by Hour</div>' +
                '<div class="pmd-manager-chart-bars-v29">' +
                  '<i style="height:34%"></i><i style="height:48%"></i><i style="height:42%"></i><i style="height:62%"></i><i style="height:78%"></i><i style="height:58%"></i><i style="height:88%"></i><i style="height:72%"></i>' +
                '</div>' +
              '</div>' +
              '<div class="pmd-manager-metric-list-v29">' +
                '<div class="pmd-manager-mini-metric-v29"><span>Payment Breakdown</span><strong>58% card</strong><div class="pmd-manager-payment-bar-v29"><i></i><i></i><i></i></div></div>' +
                '<div class="pmd-manager-mini-metric-v29"><span>Average Guest Spend</span><strong>' + avg + '</strong></div>' +
                '<div class="pmd-manager-mini-metric-v29"><span>Lost Revenue</span><strong>$120.00</strong></div>' +
              '</div>' +
            '</div>',
            'Today'
          ),

          card(
            'third',
            'fa-users',
            'green',
            'Team Performance',
            'Waiter output, kitchen performance and order preparation time.',
            '<div class="pmd-manager-list-v29">' +
              row('Waiter 1', '28 orders', '$2,850') +
              row('Waiter 2', '24 orders', '$2,440') +
              row('Kitchen', '14m avg', 'prep time') +
              row('Late tickets', '2', 'needs check') +
              row('Service load', '82%', 'busy but safe') +
            '</div>',
            'Team'
          ),

          card(
            'third',
            'fa-calendar-check-o',
            'purple',
            'Reservation Management',
            'Upcoming reservations, reservation revenue forecast and no-show tracking.',
            '<div class="pmd-manager-list-v29">' +
              row('Upcoming today', '5', 'next: 18 min') +
              row('Forecast revenue', '$1,840', 'booked covers') +
              row('No-show tracking', '1', 'watch list') +
              row('VIP / notes', '2', 'prepare table') +
              row('Waitlist', '3', 'walk-in demand') +
            '</div>',
            'Booking'
          ),

          card(
            'third',
            'fa-lightbulb-o',
            'gold',
            'AI Insights',
            'Smart actions to increase revenue and find weak operational points.',
            '<div>' +
              insight('fa-magic', 'Upsell opportunity', 'Recommend dessert to Tables 2, 6 and 14.', '+$68') +
              insight('fa-line-chart', 'Increase revenue', 'Push early-bird offer before 18:30.', '+9%') +
              insight('fa-search', 'Weak point found', 'Payment wait is causing table turnover loss.', 'Fix') +
              insight('fa-cutlery', 'Kitchen bottleneck', 'Main station slows after 20:00.', 'Watch') +
            '</div>',
            'AI'
          ),

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
    if (!force && pn.getAttribute('data-pmd-manager-ops-v29') === '1') return;

    applying = true;
    pn.innerHTML = managerHtml();
    pn.setAttribute('data-pmd-manager-ops-v29', '1');
    applying = false;
  }

  function bindRoleButtons() {
    document.querySelectorAll('[data-pmd-role-btn="manager"]').forEach(function (btn) {
      if (btn.getAttribute('data-pmd-manager-v29-bound')) return;
      btn.setAttribute('data-pmd-manager-v29-bound', '1');
      btn.addEventListener('click', function () {
        setTimeout(function () { applyManagerDashboard(true); }, 20);
        setTimeout(function () { applyManagerDashboard(true); }, 120);
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

    window.PMDManagerOpsDashboardV29 = {
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
