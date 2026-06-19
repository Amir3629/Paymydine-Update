(function () {
  'use strict';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function findHref(needles, fallback) {
    var links = Array.from(document.querySelectorAll('#side-nav-menu a.nav-link[href]'));

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute('href');
      if (!href || href === '#') continue;

      var hay = clean((link.innerText || '') + ' ' + href + ' ' + link.className).toLowerCase();

      if (needles.some(function (needle) {
        return hay.indexOf(String(needle).toLowerCase()) !== -1;
      })) {
        return href;
      }
    }

    return fallback || '#';
  }

  function routes() {
    return {
      dashboard: findHref(['dashboard'], '/admin/dashboard'),
      orders: findHref(['orders'], '/admin/orders'),
      reservations: findHref(['reservations'], '/admin/reservations'),
      tables: findHref(['tables'], '/admin/tables'),
      kds: findHref(['kitchen display', 'kds'], '/admin/kitchendisplay'),
      payments: findHref(['payments'], '/admin/payments'),
      customers: findHref(['customers'], '/admin/customers'),
      reports: findHref(['reports'], '/admin/reports'),
      settings: findHref(['settings', 'system'], '/admin/settings'),
      menu: findHref(['menu items', 'menu'], '/admin/menus'),
      staff: findHref(['staff'], '/admin/staffs')
    };
  }

  function liveValue(selector, fallback) {
    var el = document.querySelector(selector);
    var value = clean(el ? el.textContent : '');
    return value && value !== '—' ? value : fallback;
  }

  function chip(label, icon, href) {
    return '<a class="pmd-role-chip" href="' + href + '"><i class="fa ' + icon + '"></i>' + label + '</a>';
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

  function card(title, value, icon, color, href, lines, demo) {
    return [
      '<div class="pmd-role-card" data-pmd-role-href="' + href + '">',
        '<div class="pmd-role-card-head">',
          '<div class="pmd-role-icon ' + (color || '') + '"><i class="fa ' + icon + '"></i></div>',
          '<div>',
            '<div class="pmd-role-card-title">' + title + '</div>',
            '<div class="pmd-role-card-value">' + value + '</div>',
          '</div>',
        '</div>',
        '<div class="pmd-role-lines">',
          lines.map(function (line) {
            return '<div class="pmd-role-line"><span>' + line[0] + '</span><span>' + line[1] + '</span></div>';
          }).join(''),
        '</div>',
        demo ? '<div class="pmd-role-demo">Preview data</div>' : '',
      '</div>'
    ].join('');
  }

  function ownerLine(label, value) {
    return '<div class="pmd-owner-line"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  function ownerCard(title, value, icon, color, href, body, demo) {
    return [
      '<div class="pmd-owner-card" data-pmd-role-href="' + href + '">',
        '<div class="pmd-owner-card-head">',
          '<div class="pmd-owner-icon ' + (color || '') + '"><i class="fa ' + icon + '"></i></div>',
          '<div>',
            '<div class="pmd-owner-title">' + title + '</div>',
            value ? '<div class="pmd-owner-value">' + value + '</div>' : '',
          '</div>',
        '</div>',
        body,
        demo ? '<div class="pmd-owner-demo">Preview data</div>' : '',
      '</div>'
    ].join('');
  }

  function ownerInsightsHtml() {
    var r = routes();
    var sales = liveValue('[data-pmd-kpi="revenue"]', '€38,090.60');
    var cash = liveValue('[data-pmd-kpi="payments"]', '€31.98');

    return [
      '<div class="pmd-owner-insights">',
        '<div class="pmd-owner-insights-grid">',

          ownerCard(
            'Revenue Breakdown Today',
            sales,
            'fa-pie-chart',
            'gold',
            r.reports,
            '<div class="pmd-donut-wrap">' +
              '<div class="pmd-donut"></div>' +
              '<div class="pmd-owner-lines">' +
                ownerLine('Dine In', '€8,400 · 65%') +
                ownerLine('Takeaway', '€2,700 · 21%') +
                ownerLine('Delivery', '€1,750 · 14%') +
              '</div>' +
            '</div>',
            true
          ),

          ownerCard(
            'Top Selling Items Today',
            '',
            'fa-list-ol',
            '',
            r.menu,
            '<div class="pmd-owner-lines">' +
              ownerLine('1 · Sushi Combo', '47') +
              ownerLine('2 · Salmon Roll', '31') +
              ownerLine('3 · Dragon Roll', '24') +
              ownerLine('4 · Spicy Tuna Roll', '22') +
              ownerLine('5 · Miso Soup', '18') +
            '</div>',
            true
          ),

          ownerCard(
            'Staff Performance Today',
            '',
            'fa-users',
            '',
            r.reports,
            '<div class="pmd-owner-lines">' +
              ownerLine('Emma Johnson', '€2,850 · 28 orders') +
              ownerLine('John Smith', '€2,440 · 24 orders') +
              ownerLine('Alex Brown', '€2,120 · 19 orders') +
              ownerLine('Sophia Lee', '€1,890 · 17 orders') +
            '</div>',
            true
          ),

          ownerCard(
            'Revenue Trend Last 7 Days',
            '€12,850',
            'fa-line-chart',
            'gold',
            r.reports,
            '<div class="pmd-trend-chart"></div>' +
            '<div class="pmd-owner-lines">' +
              ownerLine('Best day', 'May 17') +
              ownerLine('Trend', '+18.6%') +
            '</div>',
            true
          ),

          ownerCard(
            'Payment Overview',
            cash,
            'fa-credit-card',
            '',
            r.payments,
            '<div class="pmd-owner-lines">' +
              ownerLine('Unpaid Bills', '€535 · 14') +
              ownerLine('Due Today', '€1,240 · 23') +
              ownerLine('Paid Today', '€11,615 · 149') +
            '</div>',
            true
          ),

          ownerCard(
            'Quick Actions',
            '',
            'fa-bolt',
            'gold',
            r.dashboard,
            '<div class="pmd-quick-grid">' +
              '<a class="pmd-quick-action" href="' + r.payments + '"><i class="fa fa-credit-card"></i><span>Collect Payments<small>14 open bills</small></span></a>' +
              '<a class="pmd-quick-action" href="' + r.orders + '"><i class="fa fa-columns"></i><span>Split Bill<small>Quick split</small></span></a>' +
              '<a class="pmd-quick-action" href="' + r.staff + '"><i class="fa fa-user-plus"></i><span>Add Staff<small>4 on shift</small></span></a>' +
              '<a class="pmd-quick-action" href="' + r.menu + '"><i class="fa fa-book"></i><span>Manage Menus<small>32 items</small></span></a>' +
              '<a class="pmd-quick-action" href="' + r.dashboard + '"><i class="fa fa-tag"></i><span>Add Coupon<small>Create new</small></span></a>' +
              '<a class="pmd-quick-action" href="' + r.settings + '"><i class="fa fa-cog"></i><span>Settings<small>General</small></span></a>' +
            '</div>',
            true
          ),

        '</div>',
      '</div>'
    ].join('');
  }

  function roleContent(role) {
    var r = routes();
    var cash = liveValue('[data-pmd-kpi="payments"]', '€31.98');

    var demo = {
      orders: '23',
      reservations: '5',
      tables: '17',
      calls: '3',
      preparing: '9',
      ready: '4',
      completed: '18',
      late: '2',
      waiterBill: '€64.20'
    };

    var configs = {
      owner: { kpis: [], chips: [], cards: [] },

      manager: {
        kpis: [
          kpi('Open Orders', demo.orders, 'live order queue', 'fa-shopping-bag', r.orders),
          kpi('Reservations', demo.reservations, 'today schedule', 'fa-calendar-check-o', r.reservations),
          kpi('Table Status', demo.tables, 'available / occupied', 'fa-th-large', r.tables),
          kpi('KDS Status', 'Active', 'kitchen live', 'fa-desktop', r.kds),
          kpi('Waiter Calls', demo.calls, 'needs attention', 'fa-bell', r.tables)
        ],
        chips: [
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Reservations', 'fa-calendar-check-o', r.reservations),
          chip('Tables', 'fa-th-large', r.tables),
          chip('Menu Rules', 'fa-clock-o', r.menu)
        ],
        cards: [
          card('Open Orders', demo.orders, 'fa-shopping-bag', 'red', r.orders, [['Dine in', '15'], ['Takeaway', '6'], ['Delivery', '2']], true),
          card('Reservations', demo.reservations, 'fa-calendar-check-o', '', r.reservations, [['Upcoming', '5'], ['Seated', '0'], ['Cancelled', '0']], true),
          card('Table Status', demo.tables, 'fa-th-large', '', r.tables, [['Available', '7'], ['Occupied', '8'], ['Reserved', '2']], true),
          card('KDS Status', 'Active', 'fa-desktop', 'gold', r.kds, [['Preparing', demo.preparing], ['Ready', demo.ready], ['Completed', demo.completed]], true),
          card('Top Items', '32', 'fa-list-ol', '', r.menu, [['Sushi Combo', '47'], ['Salmon Roll', '31'], ['Miso Soup', '18']], true),
          card('Staff Today', '4', 'fa-users', '', r.reports, [['Waiter 1', '28 orders'], ['Waiter 2', '24 orders'], ['Kitchen', 'Active']], true),
          card('Waiter Calls', demo.calls, 'fa-bell', 'red', r.tables, [['Table 3', '2 calls'], ['Table 6', '1 call'], ['Oldest', '4 min']], true),
          card('Payments Due', cash, 'fa-credit-card', '', r.payments, [['Unpaid bills', '8'], ['Due today', cash], ['Overdue', '€0.00']], true)
        ]
      },

      waiter1: {
        kpis: [
          kpi('My Tables', 'T1/T5/T9', 'assigned section', 'fa-th-large', r.tables),
          kpi('Ready to Serve', '2', 'go to table', 'fa-check-circle', r.kds),
          kpi('My Orders', '4', 'active tickets', 'fa-shopping-bag', r.orders),
          kpi('Guest Notes', '3', 'allergy / request', 'fa-sticky-note-o', r.orders),
          kpi('Payments Due', demo.waiterBill, 'my tables only', 'fa-credit-card', r.payments)
        ],
        chips: [
          chip('My Tables', 'fa-th-large', r.tables),
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Reservations', 'fa-calendar-check-o', r.reservations),
          chip('Payments', 'fa-credit-card', r.payments)
        ],
        cards: [
          card('My Tables', 'T1/T5/T9', 'fa-th-large', '', r.tables, [['Needs attention', '1'], ['Waiting payment', '1'], ['New call', '1']], true),
          card('Ready to Serve', '2', 'fa-check-circle', 'gold', r.kds, [['Table 1', 'Koobideh'], ['Table 5', 'Drinks'], ['Priority', 'Normal']], true),
          card('My Orders', '4', 'fa-shopping-bag', 'red', r.orders, [['Preparing', '2'], ['Ready', '2'], ['Delivered', '8']], true),
          card('Guest Notes', '3', 'fa-sticky-note-o', 'gold', r.orders, [['Allergy', '1'], ['Special request', '1'], ['VIP/Birthday', '1']], true),
          card('Payments Due', demo.waiterBill, 'fa-credit-card', '', r.payments, [['Unpaid tables', '1'], ['Split bill', '1'], ['Cash request', '0']], true),
          card('Quick Actions', 'Fast', 'fa-bolt', 'gold', r.orders, [['Print bill', 'Ready'], ['Call kitchen', 'Ready'], ['Move table', 'Manager']], true)
        ]
      },

      waiter2: {
        kpis: [
          kpi('My Tables', 'T2/T6/T10', 'assigned section', 'fa-th-large', r.tables),
          kpi('Ready to Serve', '1', 'go to table', 'fa-check-circle', r.kds),
          kpi('My Orders', '3', 'active tickets', 'fa-shopping-bag', r.orders),
          kpi('Guest Notes', '2', 'allergy / request', 'fa-sticky-note-o', r.orders),
          kpi('Payments Due', '€0.00', 'my tables only', 'fa-credit-card', r.payments)
        ],
        chips: [
          chip('My Tables', 'fa-th-large', r.tables),
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Reservations', 'fa-calendar-check-o', r.reservations),
          chip('Payments', 'fa-credit-card', r.payments)
        ],
        cards: [
          card('My Tables', 'T2/T6/T10', 'fa-th-large', '', r.tables, [['Needs attention', '2'], ['Waiting payment', '0'], ['New call', '1']], true),
          card('Ready to Serve', '1', 'fa-check-circle', 'gold', r.kds, [['Table 2', 'Tea'], ['Table 6', 'Kebab'], ['Priority', 'Normal']], true),
          card('My Orders', '3', 'fa-shopping-bag', 'red', r.orders, [['Preparing', '2'], ['Ready', '1'], ['Delivered', '6']], true),
          card('Guest Notes', '2', 'fa-sticky-note-o', 'gold', r.orders, [['Allergy', '0'], ['Special request', '2'], ['VIP/Birthday', '0']], true),
          card('Payments Due', '€0.00', 'fa-credit-card', '', r.payments, [['Unpaid tables', '0'], ['Split bill', '0'], ['Cash request', '0']], true),
          card('Quick Actions', 'Fast', 'fa-bolt', 'gold', r.orders, [['Print bill', 'Ready'], ['Call kitchen', 'Ready'], ['Move table', 'Manager']], true)
        ]
      },

      kitchen: {
        kpis: [
          kpi('Preparing', demo.preparing, 'active tickets', 'fa-fire', r.kds),
          kpi('Ready', demo.ready, 'serve now', 'fa-check-circle', r.kds),
          kpi('Late Tickets', demo.late, 'needs priority', 'fa-exclamation-triangle', r.kds),
          kpi('Completed', demo.completed, 'last hour', 'fa-list', r.kds),
          kpi('Sold Out', '3', 'menu attention', 'fa-ban', r.menu)
        ],
        chips: [
          chip('Open KDS', 'fa-desktop', r.kds),
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Menu Items', 'fa-book', r.menu),
          chip('Sold Out', 'fa-ban', r.menu)
        ],
        cards: [
          card('Preparing', demo.preparing, 'fa-fire', 'red', r.kds, [['Main kitchen', '6'], ['Grill', '2'], ['Drinks', '1']], true),
          card('Ready', demo.ready, 'fa-check-circle', 'gold', r.kds, [['Table 1', '2 items'], ['Table 5', '1 item'], ['Table 12', '1 item']], true),
          card('Late Tickets', demo.late, 'fa-exclamation-triangle', 'red', r.kds, [['Over 10 min', '2'], ['Over 20 min', '0'], ['Priority', 'Table 3']], true),
          card('Completed', demo.completed, 'fa-list', '', r.kds, [['Last hour', '18'], ['Avg prep', '14m'], ['Fastest', '6m']], true),
          card('Stations', '3', 'fa-cutlery', '', r.kds, [['Main Kitchen', 'Active'], ['Bar / Drinks', 'Active'], ['Dessert', 'Preview']], true),
          card('Sold Out', '3', 'fa-ban', 'red', r.menu, [['Joojeh', 'Low'], ['Soup', 'Sold out'], ['Dessert', 'Low']], true)
        ]
      }
    };

    return configs[role] || configs.owner;
  }

  function fillOwnerFallbacks() {
    var r = root();
    if (!r) return;

    var defaults = [
      ['[data-pmd-kpi="orders"]', '23'],
      ['[data-pmd-kpi="reservations"]', '5'],
      ['[data-pmd-kpi="avg"]', '€49.20'],
      ['[data-pmd-card="orders"]', '23'],
      ['[data-pmd-card="reservations"]', '5'],
      ['[data-pmd-card="customers"]', '87'],
      ['[data-pmd-mini="orders"]', '23'],
      ['[data-pmd-mini="reservations"]', '5'],
      ['[data-pmd-mini="reservations2"]', '5'],
      ['[data-pmd-mini="avg"]', '€49.20']
    ];

    defaults.forEach(function (pair) {
      r.querySelectorAll(pair[0]).forEach(function (el) {
        if (!clean(el.textContent) || clean(el.textContent) === '—') {
          el.textContent = pair[1];
          el.classList.add('pmd-preview-loaded');
        }
      });
    });
  }

  function ensureOwnerInsights() {
    var rt = root();
    if (!rt) return;

    var grid = rt.querySelector('.pmd-dashboard-grid');
    if (!grid) return;

    var existing = rt.querySelector('.pmd-owner-insights');
    if (existing) {
      existing.outerHTML = ownerInsightsHtml();
      return;
    }

    grid.insertAdjacentHTML('afterend', ownerInsightsHtml());
  }

  function renderRole(role) {
    var rt = root();
    if (!rt) return;

    var panel = rt.querySelector('.pmd-role-panel');
    if (!panel) return;

    var data = roleContent(role);

    rt.setAttribute('data-pmd-role', role);
    localStorage.setItem('pmdDashboardPreviewRole', role);

    document.querySelectorAll('.pmd-role-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-pmd-role-btn') === role);
    });

    if (role === 'owner') {
      panel.innerHTML = '';
      fillOwnerFallbacks();
      ensureOwnerInsights();
      return;
    }

    panel.innerHTML = [
      '<div class="pmd-role-kpi-bar">',
        data.kpis.join(''),
      '</div>',
      '<div class="pmd-role-action-row">',
        data.chips.join(''),
      '</div>',
      '<div class="pmd-role-grid">',
        data.cards.join(''),
      '</div>'
    ].join('');
  }

  function inject() {
    var rt = root();
    if (!rt) return;

    document.querySelectorAll('.pmd-role-switcher, .pmd-role-panel').forEach(function (el) {
      el.remove();
    });

    var kpiBar = rt.querySelector('.pmd-dashboard-kpi-bar');
    if (!kpiBar) return;

    var switcher = document.createElement('div');
    switcher.className = 'pmd-role-switcher';
    switcher.innerHTML = [
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="owner" title="Owner / Main Admin"><i class="fa fa-key"></i>O</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="manager" title="Manager"><i class="fa fa-users"></i>M</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter1" title="Waiter 1"><i class="fa fa-user"></i>W1</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter2" title="Waiter 2"><i class="fa fa-user"></i>W2</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="kitchen" title="Kitchen"><i class="fa fa-desktop"></i>K</button>'
    ].join('');

    var panel = document.createElement('div');
    panel.className = 'pmd-role-panel';

    document.body.appendChild(switcher);
    kpiBar.parentNode.insertBefore(panel, kpiBar.nextSibling);

    switcher.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-pmd-role-btn]');
      if (!btn) return;
      renderRole(btn.getAttribute('data-pmd-role-btn'));
    });

    rt.addEventListener('click', function (event) {
      if (event.target.closest('a')) return;

      var card = event.target.closest('[data-pmd-role-href]');
      if (!card) return;

      var href = card.getAttribute('data-pmd-role-href');
      if (href && href !== '#') {
        window.location.href = href;
      }
    });

    var saved = localStorage.getItem('pmdDashboardPreviewRole') || 'owner';
    renderRole(saved);

    window.PMDDashboardRolePreview = {
      current: function () {
        return root() ? root().getAttribute('data-pmd-role') : null;
      },
      setRole: renderRole,
      refreshOwner: function () {
        fillOwnerFallbacks();
        ensureOwnerInsights();
      },
      roles: ['owner', 'manager', 'waiter1', 'waiter2', 'kitchen']
    };

    [600, 1800, 4200, 9000].forEach(function (delay) {
      setTimeout(function () {
        if (root() && root().getAttribute('data-pmd-role') === 'owner') {
          fillOwnerFallbacks();
          ensureOwnerInsights();
        }
      }, delay);
    });
  }

  function schedule() {
    [150, 700, 1500, 3000].forEach(function (delay) {
      setTimeout(function () {
        if (!document.querySelector('.pmd-role-switcher')) inject();
      }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
