(function () {
  'use strict';

  var busy = false;
  var lastMarkupKey = '';
  var renderTimer = null;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function isOwnerRole(rt) {
    var role = rt.getAttribute('data-pmd-role') || localStorage.getItem('pmdDashboardPreviewRole') || 'owner';
    return !role || role === 'owner';
  }

  function getText(rt, selector, fallback) {
    var el = rt.querySelector(selector);
    var text = clean(el ? el.textContent : '');
    return text && text !== '—' ? text : fallback;
  }

  function routes() {
    function findHref(needles, fallback) {
      var links = Array.from(document.querySelectorAll('#side-nav-menu a.nav-link[href]'));
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var href = link.getAttribute('href');
        if (!href || href === '#') continue;
        var hay = clean((link.innerText || '') + ' ' + href + ' ' + link.className).toLowerCase();
        if (needles.some(function (needle) { return hay.indexOf(String(needle).toLowerCase()) !== -1; })) return href;
      }
      return fallback;
    }
    return {
      orders: findHref(['orders'], '/admin/orders'),
      reservations: findHref(['reservations'], '/admin/reservations'),
      tables: findHref(['tables', 'floor'], '/admin/tables'),
      kds: findHref(['kitchen display', 'kds'], '/admin/kitchendisplay'),
      payments: findHref(['payments'], '/admin/payments'),
      customers: findHref(['customers', 'guests'], '/admin/customers'),
      reports: findHref(['reports'], '/admin/reports'),
      upgrade: findHref(['settings', 'system'], '/admin/settings')
    };
  }

  function snapshot(rt) {
    return {
      revenue: getText(rt, '[data-pmd-kpi="revenue"]', '$ 4,280.50'),
      payments: getText(rt, '[data-pmd-kpi="payments"]', '$ 640.00'),
      orders: getText(rt, '[data-pmd-kpi="orders"], [data-pmd-card="orders"]', '23'),
      reservations: getText(rt, '[data-pmd-kpi="reservations"], [data-pmd-card="reservations"]', '5'),
      guests: getText(rt, '[data-pmd-card="customers"]', '87'),
      avg: getText(rt, '[data-pmd-kpi="avg"], [data-pmd-mini="avg"]', '$ 49.20')
    };
  }

  function kpi(label, value, sub, icon, tone, dataAttr, info) {
    return [
      '<div class="pmd-dashboard-kpi pmd-kpi-' + tone + '">',
        '<div class="pmd-dashboard-kpi-label">' + label + (info ? ' <i class="fa fa-info-circle pmd-kpi-info"></i>' : '') + '</div>',
        '<div class="pmd-dashboard-kpi-value" data-pmd-kpi="' + dataAttr + '"' + (dataAttr === 'customers' ? ' data-pmd-card="customers"' : '') + '>' + value + '</div>',
        '<div class="pmd-dashboard-kpi-sub">' + sub + '</div>',
        '<div class="pmd-dashboard-kpi-icon"><i class="fa ' + icon + '"></i></div>',
      '</div>'
    ].join('');
  }

  function line(label, value, tone) {
    return '<div class="pmd-dashboard-line ' + (tone ? 'tone-' + tone : '') + '"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  function card(icon, tone, title, value, lines, href, action, extraClass, extraBody) {
    return [
      '<div class="pmd-dashboard-card ' + (extraClass || '') + '">',
        '<div class="pmd-dashboard-card-head">',
          '<div class="pmd-dashboard-card-icon ' + (tone || '') + '"><i class="fa ' + icon + '"></i></div>',
          '<div class="pmd-dashboard-card-copy">',
            '<div class="pmd-dashboard-card-title">' + title + '</div>',
            '<div class="pmd-dashboard-card-value">' + value + '</div>',
          '</div>',
        '</div>',
        extraBody || '',
        '<div class="pmd-dashboard-lines">' + lines.join('') + '</div>',
        '<a class="pmd-dashboard-link" href="' + href + '"><span>' + action + '</span><i class="fa fa-chevron-right"></i></a>',
      '</div>'
    ].join('');
  }

  function floorPlan(r) {
    var tables = [
      ['T1', '2', 'available'], ['T2', '4', 'available'], ['T3', '4', 'occupied'], ['T4', '2', 'closed'],
      ['T5', '2', 'available'], ['T6', '6', 'occupied'], ['T7', '2', 'available'], ['T8', '4', 'closed'],
      ['T9', '2', 'available'], ['T10', '2', 'closed'], ['T11', '4', 'reserved'], ['T12', '6', 'occupied'],
      ['T13', '2', 'closed wide'], ['T14', '2', 'available wide']
    ];
    return [
      '<div class="pmd-dashboard-card pmd-floor-card">',
        '<div class="pmd-floor-head"><div class="pmd-dashboard-card-title">Floor Plan</div><span class="pmd-live-pill">Live</span></div>',
        '<div class="pmd-floor-grid">',
          tables.map(function (t) {
            return '<div class="pmd-table-tile ' + t[2] + '"><span>' + t[0] + '</span><small><i class="fa fa-user-o"></i> ' + t[1] + '</small></div>';
          }).join(''),
        '</div>',
        '<div class="pmd-floor-legend">',
          '<span><i class="available"></i>Available</span>',
          '<span><i class="occupied"></i>Occupied</span>',
          '<span><i class="reserved"></i>Reserved</span>',
          '<span><i class="closed"></i>Closed</span>',
        '</div>',
        '<a class="pmd-dashboard-link pmd-floor-link" href="' + r.tables + '"><span>Manage Tables</span><i class="fa fa-chevron-right"></i></a>',
      '</div>'
    ].join('');
  }

  function salesChart() {
    return [
      '<div class="pmd-sales-mini-head"><strong data-pmd-card="revenue2">$ 28,650.00</strong><span><i class="fa fa-arrow-up"></i> 16.5% vs last week</span></div>',
      '<div class="pmd-sales-chart" aria-hidden="true">',
        '<svg viewBox="0 0 260 94" preserveAspectRatio="none">',
          '<defs><linearGradient id="pmdOwnerV12Grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-opacity=".20"/><stop offset="1" stop-opacity="0"/></linearGradient></defs>',
          '<path class="area" d="M10,76 C35,58 50,54 72,61 C95,68 104,42 126,44 C148,46 153,77 177,66 C199,54 201,28 220,38 C239,48 242,22 252,27 L252,94 L10,94 Z"></path>',
          '<path class="line" d="M10,76 C35,58 50,54 72,61 C95,68 104,42 126,44 C148,46 153,77 177,66 C199,54 201,28 220,38 C239,48 242,22 252,27"></path>',
          '<g class="dots"><circle cx="10" cy="76" r="4"/><circle cx="72" cy="61" r="4"/><circle cx="126" cy="44" r="4"/><circle cx="177" cy="66" r="4"/><circle cx="220" cy="38" r="4"/><circle cx="252" cy="27" r="4"/></g>',
        '</svg>',
      '</div>',
      '<div class="pmd-sales-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>'
    ].join('');
  }

  function footer(r) {
    return [
      '<div class="pmd-owner-match-footer">',
        '<div class="pmd-recent-activity">',
          '<div class="pmd-footer-head"><div>Recent Activity</div><a href="' + r.reports + '">View all activity <i class="fa fa-chevron-right"></i></a></div>',
          '<div class="pmd-activity-row">',
            activity('fa-calendar-check-o', 'green', 'Payment received', 'Table 6 • $85.00', '2 min ago'),
            activity('fa-clipboard', 'red', 'New order', 'Table 3 • 4 items', '5 min ago'),
            activity('fa-calendar-o', 'gold', 'Reservation', 'Table 12 • 4 guests', '15 min ago'),
            activity('fa-check-square-o', 'green', 'Order completed', 'Table 1 • $120.00', '20 min ago'),
          '</div>',
        '</div>',
        '<a class="pmd-premium-card" href="' + r.upgrade + '">',
          '<div class="pmd-premium-icon"><i class="fa fa-diamond"></i></div>',
          '<div class="pmd-premium-copy"><strong>Upgrade to Premium</strong><span>Unlock advanced reports,<br>marketing tools and more.</span></div>',
          '<span class="pmd-premium-button">Upgrade Now</span>',
        '</a>',
      '</div>'
    ].join('');
  }

  function activity(icon, tone, title, sub, time) {
    return [
      '<div class="pmd-activity-item">',
        '<div class="pmd-activity-icon ' + tone + '"><i class="fa ' + icon + '"></i></div>',
        '<div><strong>' + title + '</strong><span>' + sub + '</span><small>' + time + '</small></div>',
      '</div>'
    ].join('');
  }

  function render() {
    var rt = root();
    if (!rt || !isOwnerRole(rt) || busy) return;

    busy = true;
    try {
      var data = snapshot(rt);
      var r = routes();
      var key = JSON.stringify(data);

      document.querySelectorAll('.pmd-owner-insights').forEach(function (el) { el.remove(); });

      var alreadyRendered = rt.classList.contains('pmd-owner-match-v12-rendered') &&
        rt.querySelector('.pmd-dashboard-kpi-bar .pmd-kpi-revenue') &&
        rt.querySelector('.pmd-dashboard-grid .pmd-sales-card') &&
        rt.querySelector('.pmd-owner-match-footer');

      if (alreadyRendered && key === lastMarkupKey) return;

      rt.classList.add('pmd-owner-match-v12');

      var kpiBar = rt.querySelector('.pmd-dashboard-kpi-bar');
      if (!kpiBar) {
        kpiBar = document.createElement('div');
        kpiBar.className = 'pmd-dashboard-kpi-bar';
        rt.prepend(kpiBar);
      }

      kpiBar.innerHTML = [
        kpi('Revenue Today', data.revenue, '<i class="fa fa-arrow-up"></i> 18.6% vs yesterday', 'fa-money', 'revenue', 'revenue', true),
        kpi('Pending Payments', data.payments, '8 bills', 'fa-clock-o', 'payments', 'payments', false),
        kpi('Open Orders', data.orders, '12 new', 'fa-clipboard', 'orders', 'orders', false),
        kpi('Guests Today', data.guests, '<i class="fa fa-arrow-up"></i> 12% vs yesterday', 'fa-users', 'guests', 'customers', false),
        kpi('Avg Ticket', data.avg, '<i class="fa fa-arrow-up"></i> 7% vs yesterday', 'fa-usd', 'avg', 'avg', false)
      ].join('');

      var grid = rt.querySelector('.pmd-dashboard-grid');
      if (!grid) {
        grid = document.createElement('div');
        grid.className = 'pmd-dashboard-grid';
        rt.appendChild(grid);
      }

      grid.innerHTML = [
        '<div class="pmd-dashboard-cards">',
          card('fa-clipboard', 'red', 'Open Orders', '<span data-pmd-card="orders">' + data.orders + '</span>', [line('Dine In', '15', 'red'), line('Takeaway', '6', 'gold'), line('Delivery', '2', 'green')], r.orders, 'View all orders'),
          card('fa-th-large', 'green', 'Tables Status', '17', [line('Available', '7', 'green'), line('Occupied', '8', 'red'), line('Reserved', '2', 'gold')], r.tables, 'View floor plan'),
          card('fa-cutlery', 'gold', 'Kitchen Display System', 'Active', [line('Preparing', '9', 'red'), line('Ready', '4', 'green'), line('Completed', '18', 'green')], r.kds, 'Open KDS'),
          card('fa-usd', 'green', 'Payments', '<span data-pmd-card="revenue">' + data.payments + '</span>', [line('Overdue', '$ 240.00', 'red'), line('Due today', '$ 400.00', 'gold')], r.payments, 'View all payments'),
          card('fa-calendar', 'purple', 'Reservations', '<span data-pmd-card="reservations">' + data.reservations + '</span>', [line('Upcoming', '5'), line('Seated', '0'), line('Cancelled', '0')], r.reservations, 'View all reservations'),
          card('fa-line-chart', '', 'Sales Overview', '', [], r.reports, 'View full report', 'pmd-sales-card', salesChart()),
        '</div>',
        floorPlan(r)
      ].join('');

      var oldFooter = rt.querySelector('.pmd-owner-match-footer');
      if (!oldFooter) {
        grid.insertAdjacentHTML('afterend', footer(r));
      }

      lastMarkupKey = key;
      rt.classList.add('pmd-owner-match-v12-rendered');
      (document.body||document.documentElement).classList.add('pmd-dashboard-owner-match-v12-ready');
    } finally {
      busy = false;
    }
  }

  function schedule(delay) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, delay || 80);
  }

  function boot() {
    [120, 450, 900, 1600, 3000, 5200, 7600, 10000].forEach(function (delay) {
      setTimeout(render, delay);
    });

    document.addEventListener('pmd:dashboard-real-data-v3', function () { schedule(30); });
    window.addEventListener('ajaxUpdateComplete', function () { schedule(120); });
    document.addEventListener('click', function (event) {
      if (event.target.closest('.pmd-role-btn')) setTimeout(render, 160);
    }, true);

    var target = document.querySelector('[data-control="dashboard-container"]');
    if (target && window.MutationObserver) {
      new MutationObserver(function () { schedule(140); }).observe(target, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

