(function () {
  'use strict';

  var busy = false;
  var lastKey = '';
  var renderTimer = null;
  var enforcedTicks = 0;

  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function root() { return document.querySelector('.pmd-dashboard-modern'); }
  function isOwnerRole(rt) {
    var role = rt.getAttribute('data-pmd-role') || localStorage.getItem('pmdDashboardPreviewRole') || 'owner';
    return !role || role === 'owner';
  }

  function svg(name) {
    var map = {
      info: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke-width="2"/></svg>',
      up: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M12 7v6l4 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      clipboard: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 5h6M9 5a3 3 0 0 1 6 0M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12h6M9 16h4" stroke-width="2" stroke-linecap="round"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none"><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" stroke-width="2" stroke-linecap="round"/><circle cx="9.5" cy="7.5" r="3.5" stroke-width="2"/><path d="M20.5 19v-1a4 4 0 0 0-3-3.87M16.5 4.3a3.5 3.5 0 0 1 0 6.4" stroke-width="2" stroke-linecap="round"/></svg>',
      dollarCircle: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M14.5 8.5c-.7-.6-1.55-.9-2.55-.9-1.45 0-2.45.7-2.45 1.75 0 2.7 5.5 1.25 5.5 4.7 0 1.25-1.05 2.35-3 2.35-1.2 0-2.2-.35-3-1.1M12 6v12" stroke-width="2" stroke-linecap="round"/></svg>',
      table: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9h16M6 9v9M18 9v9M8 18h8M7 5h10a3 3 0 0 1 3 3v1H4V8a3 3 0 0 1 3-3Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      chef: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 11.5C4.8 11 3.5 9.5 3.5 7.8A3.3 3.3 0 0 1 7 4.5c.6-1.5 2.2-2.5 4-2.5s3.4 1 4 2.5a3.3 3.3 0 0 1 3.5 3.3c0 1.7-1.3 3.2-3.5 3.7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8M7 16h10" stroke-width="2" stroke-linecap="round"/></svg>',
      calendar: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      line: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 19V5M4 19h16M7 15l4-4 3 3 5-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      money: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="2.5" stroke-width="2"/><path d="M6 10h.01M18 15h.01" stroke-width="3" stroke-linecap="round"/></svg>',
      crown: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 18h16M6 18l-1-9 5 4 2-6 2 6 5-4-1 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" stroke-width="2"/><path d="M6 20a6 6 0 0 1 12 0" stroke-width="2" stroke-linecap="round"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return map[name] || '';
  }

  function normalizeCurrency(text, fallback) {
    var raw = clean(text);
    if (!raw || raw === '—' || raw === '-') raw = fallback || '$ 0.00';
    raw = raw.replace(/−/g, '-').replace(/€/g, '$');
    raw = raw.replace(/-\s*\$\s*0(?:[\.,]00)?/g, '$ 0.00').replace(/\$-\s*0(?:[\.,]00)?/g, '$ 0.00');
    if (/^\$\s*/.test(raw)) raw = raw.replace(/^\$\s*/, '$ ');
    return raw;
  }
  function normalizeNumber(text, fallback) {
    var raw = clean(text);
    if (!raw || raw === '—' || raw === '-') return fallback;
    return raw;
  }
  function getText(rt, selectors, fallback) {
    for (var i = 0; i < selectors.length; i++) {
      var el = rt.querySelector(selectors[i]);
      var text = clean(el ? el.textContent : '');
      if (text && text !== '—' && text !== '-') return text;
    }
    return fallback;
  }

  function routes() {
    function findHref(needles, fallback) {
      var links = Array.prototype.slice.call(document.querySelectorAll('#side-nav-menu a.nav-link[href], a[href]'));
      for (var i = 0; i < links.length; i++) {
        var link = links[i], href = link.getAttribute('href');
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
      reports: findHref(['reports'], '/admin/reports'),
      upgrade: findHref(['settings', 'system'], '/admin/settings')
    };
  }

  function snapshot(rt) {
    var data = {
      revenue: normalizeCurrency(getText(rt, ['[data-pmd-kpi="revenue"]', '[data-pmd-card="revenue2"]', '.pmd-kpi-revenue .pmd-dashboard-kpi-value'], '$ 4,280.50'), '$ 4,280.50'),
      payments: normalizeCurrency(getText(rt, ['[data-pmd-kpi="payments"]', '.pmd-kpi-payments .pmd-dashboard-kpi-value'], '$ 640.00'), '$ 640.00'),
      orders: normalizeNumber(getText(rt, ['[data-pmd-kpi="orders"]', '[data-pmd-card="orders"]', '.pmd-kpi-orders .pmd-dashboard-kpi-value'], '23'), '23'),
      reservations: normalizeNumber(getText(rt, ['[data-pmd-kpi="reservations"]', '[data-pmd-card="reservations"]'], '5'), '5'),
      guests: normalizeNumber(getText(rt, ['[data-pmd-kpi="customers"]', '[data-pmd-card="customers"]', '.pmd-kpi-guests .pmd-dashboard-kpi-value'], '87'), '87'),
      avg: normalizeCurrency(getText(rt, ['[data-pmd-kpi="avg"]', '[data-pmd-mini="avg"]', '.pmd-kpi-avg .pmd-dashboard-kpi-value'], '$ 49.20'), '$ 49.20')
    };
    return data;
  }

  function upLine(text) { return svg('up') + '<span>' + text + '</span>'; }
  function kpi(label, value, sub, iconName, tone, dataAttr, info) {
    return [
      '<div class="pmd-dashboard-kpi pmd-kpi-' + tone + '">',
        '<div class="pmd-dashboard-kpi-label">' + label + (info ? '<span class="pmd-kpi-info">i</span>' : '') + '</div>',
        '<div class="pmd-dashboard-kpi-value" data-pmd-kpi="' + dataAttr + '">' + value + '</div>',
        '<div class="pmd-dashboard-kpi-sub">' + sub + '</div>',
        '<div class="pmd-dashboard-kpi-icon">' + svg(iconName) + '</div>',
      '</div>'
    ].join('');
  }
  function line(label, value, tone) {
    return '<div class="pmd-dashboard-line ' + (tone ? 'tone-' + tone : '') + '"><span>' + label + '</span><span>' + value + '</span></div>';
  }
  function card(iconName, tone, title, value, sub, lines, href, action, extraClass, extraBody) {
    return [
      '<div class="pmd-dashboard-card ' + (extraClass || '') + '">',
        '<div class="pmd-dashboard-card-head">',
          '<div class="pmd-dashboard-card-icon ' + (tone || '') + '">' + svg(iconName) + '</div>',
          '<div class="pmd-dashboard-card-copy">',
            '<div class="pmd-dashboard-card-title">' + title + '</div>',
            value ? '<div class="pmd-dashboard-card-value">' + value + '</div>' : '',
            sub ? '<div class="pmd-card-sub">' + sub + '</div>' : '',
          '</div>',
        '</div>',
        extraBody || '',
        '<div class="pmd-dashboard-lines">' + lines.join('') + '</div>',
        '<a class="pmd-dashboard-link" href="' + href + '"><span>' + action + '</span>' + svg('chevron') + '</a>',
      '</div>'
    ].join('');
  }
  function salesCard(r, data) {
    return [
      '<div class="pmd-dashboard-card pmd-sales-card">',
        '<div class="pmd-sales-top">',
          '<div class="pmd-dashboard-card-icon">' + svg('line') + '</div>',
          '<div class="pmd-dashboard-card-title">Sales Overview</div>',
          '<button type="button" class="pmd-sales-period">This Week⌄</button>',
        '</div>',
        '<div class="pmd-sales-mini-head"><strong data-pmd-card="revenue2">' + data.revenue + '</strong><span>' + svg('up') + ' 16.5% vs last week</span></div>',
        '<div class="pmd-sales-chart" aria-hidden="true">',
          '<svg viewBox="0 0 260 94" preserveAspectRatio="none">',
            '<path class="area" d="M10,76 C35,58 50,54 72,61 C95,68 104,42 126,44 C148,46 153,77 177,66 C199,54 201,28 220,38 C239,48 242,22 252,27 L252,94 L10,94 Z"></path>',
            '<path class="line" d="M10,76 C35,58 50,54 72,61 C95,68 104,42 126,44 C148,46 153,77 177,66 C199,54 201,28 220,38 C239,48 242,22 252,27"></path>',
            '<g class="dots"><circle cx="10" cy="76" r="4"/><circle cx="72" cy="61" r="4"/><circle cx="126" cy="44" r="4"/><circle cx="177" cy="66" r="4"/><circle cx="220" cy="38" r="4"/><circle cx="252" cy="27" r="4"/></g>',
          '</svg>',
        '</div>',
        '<div class="pmd-sales-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>',
        '<a class="pmd-dashboard-link" href="' + r.reports + '"><span>View full report</span>' + svg('chevron') + '</a>',
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
          tables.map(function (t) { return '<div class="pmd-table-tile ' + t[2] + '"><span>' + t[0] + '</span><small>' + svg('user') + t[1] + '</small></div>'; }).join(''),
        '</div>',
        '<div class="pmd-floor-legend">',
          '<span><i class="available"></i>Available</span>',
          '<span><i class="occupied"></i>Occupied</span>',
          '<span><i class="reserved"></i>Reserved</span>',
          '<span><i class="closed"></i>Closed</span>',
        '</div>',
        '<a class="pmd-dashboard-link pmd-floor-link" href="' + r.tables + '"><span>Manage Tables</span>' + svg('chevron') + '</a>',
      '</div>'
    ].join('');
  }
  function activity(iconName, tone, title, sub, time) {
    return '<div class="pmd-activity-item"><div class="pmd-activity-icon ' + tone + '">' + svg(iconName) + '</div><div><strong>' + title + '</strong><span>' + sub + '</span><small>' + time + '</small></div></div>';
  }
  function footer(r) {
    return [
      '<div class="pmd-owner-match-footer pmd-owner-match-footer-v13">',
        '<div class="pmd-recent-activity">',
          '<div class="pmd-footer-head"><div>Recent Activity</div><a href="' + r.reports + '">View all activity ' + svg('chevron') + '</a></div>',
          '<div class="pmd-activity-row">',
            activity('calendar', 'green', 'Payment received', 'Table 6 • $85.00', '2 min ago'),
            activity('clipboard', 'red', 'New order', 'Table 3 • 4 items', '5 min ago'),
            activity('calendar', 'gold', 'Reservation', 'Table 12 • 4 guests', '15 min ago'),
            activity('check', 'green', 'Order completed', 'Table 1 • $120.00', '20 min ago'),
          '</div>',
        '</div>',
        '<a class="pmd-premium-card" href="' + r.upgrade + '">',
          '<div class="pmd-premium-icon">' + svg('crown') + '</div>',
          '<div class="pmd-premium-copy"><strong>Upgrade to Premium</strong><span>Unlock advanced reports,<br>marketing tools and more.</span></div>',
          '<span class="pmd-premium-button">Upgrade Now</span>',
        '</a>',
      '</div>'
    ].join('');
  }

  function expectedLabelsOk(rt) {
    var labels = clean(Array.prototype.map.call(rt.querySelectorAll('.pmd-dashboard-kpi-label'), function (el) { return el.textContent; }).join(' ')).toLowerCase();
    return labels.indexOf('revenue today') !== -1 && labels.indexOf('guests today') !== -1 && labels.indexOf('open orders') !== -1;
  }

  function render(force) {
    var rt = root();
    if (!rt || !isOwnerRole(rt) || busy) return;
    busy = true;
    try {
      var data = snapshot(rt);
      var r = routes();
      var key = JSON.stringify(data) + '|' + window.location.pathname;
      var ok = rt.classList.contains('pmd-owner-match-v13-rendered') && expectedLabelsOk(rt) && rt.querySelector('.pmd-owner-match-footer-v13') && rt.querySelector('.pmd-sales-period');
      if (!force && ok) return;

      rt.classList.add('pmd-owner-match-v13');
      rt.classList.remove('pmd-owner-match-v12');
      (document.body||document.documentElement).classList.add('pmd-dashboard-owner-match-v13-ready');
      (document.body||document.documentElement).classList.remove('pmd-dashboard-owner-match-v12-ready');
      document.querySelectorAll('.pmd-owner-insights').forEach(function (el) { el.remove(); });

      var kpiBar = rt.querySelector('.pmd-dashboard-kpi-bar');
      if (!kpiBar) { kpiBar = document.createElement('div'); kpiBar.className = 'pmd-dashboard-kpi-bar'; rt.prepend(kpiBar); }
      kpiBar.innerHTML = [
        kpi('Revenue Today', data.revenue, upLine('18.6% vs yesterday'), 'money', 'revenue', 'revenue', true),
        kpi('Pending Payments', data.payments, '8 bills', 'clock', 'payments', 'payments', false),
        kpi('Open Orders', data.orders, '12 new', 'clipboard', 'orders', 'orders', false),
        kpi('Guests Today', data.guests, upLine('12% vs yesterday'), 'users', 'guests', 'customers', false),
        kpi('Avg Ticket', data.avg, upLine('7% vs yesterday'), 'dollarCircle', 'avg', 'avg', false)
      ].join('');

      var grid = rt.querySelector('.pmd-dashboard-grid');
      if (!grid) { grid = document.createElement('div'); grid.className = 'pmd-dashboard-grid'; kpiBar.insertAdjacentElement('afterend', grid); }
      grid.innerHTML = [
        '<div class="pmd-dashboard-cards">',
          card('clipboard', 'red', 'Open Orders', '<span data-pmd-card="orders">' + data.orders + '</span>', '', [line('Dine In', '15', 'red'), line('Takeaway', '6', 'gold'), line('Delivery', '2', 'green')], r.orders, 'View all orders'),
          card('table', 'green', 'Tables Status', '17', '', [line('Available', '7', 'green'), line('Occupied', '8', 'red'), line('Reserved', '2', 'gold')], r.tables, 'View floor plan'),
          card('chef', 'gold', 'Kitchen Display System', 'Active', '', [line('Preparing', '9', 'red'), line('Ready', '4', 'green'), line('Completed', '18', 'green')], r.kds, 'Open KDS'),
          card('dollarCircle', 'green', 'Payments', '<span data-pmd-card="revenue">' + data.payments + '</span>', '8 unpaid bills', [line('Overdue', '$ 240.00', 'red'), line('Due today', '$ 400.00', 'gold')], r.payments, 'View all payments'),
          card('calendar', 'purple', 'Reservations', '<span data-pmd-card="reservations">' + data.reservations + '</span>', 'Today', [line('Upcoming', '5'), line('Seated', '0'), line('Cancelled', '0')], r.reservations, 'View all reservations'),
          salesCard(r, data),
        '</div>',
        floorPlan(r)
      ].join('');

      rt.querySelectorAll('.pmd-owner-match-footer').forEach(function (el) { el.remove(); });
      grid.insertAdjacentHTML('afterend', footer(r));
      lastKey = key;
      rt.classList.add('pmd-owner-match-v13-rendered');
    } finally {
      busy = false;
    }
  }
  function schedule(delay, force) { clearTimeout(renderTimer); renderTimer = setTimeout(function () { render(!!force); }, delay || 80); }
  function boot() {
    [80, 220, 500, 950, 1600, 2600, 4200].forEach(function (delay) { setTimeout(function () { render(false); }, delay); });
    var interval = setInterval(function () {
      enforcedTicks += 1;
      render(false);
      if (enforcedTicks > 90) clearInterval(interval);
    }, 1000);
    document.addEventListener('pmd:dashboard-real-data-v3', function () { schedule(30, false); });
    window.addEventListener('ajaxUpdateComplete', function () { schedule(120, false); });
    window.addEventListener('load', function () { schedule(100, false); });
    document.addEventListener('click', function (event) { if (event.target.closest('.pmd-role-btn')) setTimeout(function () { render(true); }, 180); }, true);
    var target = document.querySelector('[data-control="dashboard-container"]') || document.body;
    if (target && window.MutationObserver) {
      new MutationObserver(function () { schedule(160, false); }).observe(target, { childList: true, subtree: true, characterData: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
