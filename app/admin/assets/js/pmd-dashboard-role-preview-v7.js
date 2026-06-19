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
      design: findHref(['themes', 'design'], '/admin/themes')
    };
  }

  function chip(label, icon, href) {
    return '<a class="pmd-role-chip" href="' + href + '"><i class="fa ' + icon + '"></i>' + label + '</a>';
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

  function liveValue(selector, fallback) {
    var el = document.querySelector(selector);
    var value = clean(el ? el.textContent : '');
    return value && value !== '—' ? value : fallback;
  }

  function roleContent(role) {
    var r = routes();

    var sales = liveValue('[data-pmd-kpi="revenue"]', '€38,090.60');
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
      waiterBill: '€64.20',
      guests: '87',
      avg: '€49.20'
    };

    var configs = {
      owner: {
        title: 'Owner Dashboard',
        subtitle: 'Full business view: sales, payments, operations, reports, settings.',
        badge: 'Full access',
        chips: [
          chip('Reports', 'fa-line-chart', r.reports),
          chip('Payments', 'fa-credit-card', r.payments),
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Settings', 'fa-cog', r.settings)
        ],
        cards: []
      },

      manager: {
        title: 'Manager Dashboard',
        subtitle: 'Shift overview: live orders, reservations, table flow, staff and menu availability.',
        badge: 'Operations access',
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
          card('Staff / Shift', 'Live', 'fa-users', '', r.settings, [['Waiter 1', 'Active'], ['Waiter 2', 'Active'], ['Kitchen', 'Active']], true),
          card('Menu Time Rules', 'Active', 'fa-clock-o', 'gold', r.menu, [['Lunch menu', '11:30–15:00'], ['Dinner menu', '18:00–23:00'], ['Sold out', 'Quick toggle']], true),
          card('Waiter Calls', demo.calls, 'fa-bell', 'red', r.tables, [['Table 3', '2 calls'], ['Table 6', '1 call'], ['Oldest', '4 min']], true),
          card('Payments Due', cash, 'fa-credit-card', '', r.payments, [['Unpaid bills', '8'], ['Due today', cash], ['Overdue', '€0.00']], true)
        ]
      },

      waiter1: {
        title: 'Waiter 1 Dashboard',
        subtitle: 'Personal service view: assigned tables, ready orders, notes and payments.',
        badge: 'Service access',
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
        title: 'Waiter 2 Dashboard',
        subtitle: 'Personal service view for another section: assigned tables, ready orders and guest notes.',
        badge: 'Service access',
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
        title: 'Kitchen / KDS Dashboard',
        subtitle: 'Kitchen-only view: ticket queue, ready orders, late tickets, stations and sold-out items.',
        badge: 'Kitchen access',
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
          card('Completed', demo.completed, 'fa-list-check', '', r.kds, [['Last hour', '18'], ['Avg prep', '14m'], ['Fastest', '6m']], true),
          card('Stations', '3', 'fa-cutlery', '', r.kds, [['Main Kitchen', 'Active'], ['Bar / Drinks', 'Active'], ['Dessert', 'Preview']], true),
          card('Sold Out', '3', 'fa-ban', 'red', r.menu, [['Joojeh', 'Low'], ['Soup', 'Sold out'], ['Dessert', 'Low']], true)
        ]
      }
    };

    return configs[role] || configs.owner;
  }

  function renderRole(role) {
    if (role === 'admin') role = 'owner';

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
      return;
    }

    panel.innerHTML = [
      '<div class="pmd-role-hero">',
        '<div>',
          '<div class="pmd-role-title">' + data.title + '</div>',
          '<div class="pmd-role-subtitle">' + data.subtitle + '</div>',
          '<div class="pmd-role-quick">' + data.chips.join('') + '</div>',
        '</div>',
        '<div class="pmd-role-badge"><i class="fa fa-circle"></i>' + data.badge + '</div>',
      '</div>',
      '<div class="pmd-role-grid">',
        data.cards.join(''),
      '</div>'
    ].join('');
  }

  function inject() {
    var rt = root();
    if (!rt) return;

    // Remove old v6 duplicated elements, if any.
    document.querySelectorAll('.pmd-role-switcher, .pmd-role-panel').forEach(function (el) {
      el.remove();
    });

    var kpi = rt.querySelector('.pmd-dashboard-kpi-bar');
    if (!kpi) return;

    var switcher = document.createElement('div');
    switcher.className = 'pmd-role-switcher';
    switcher.innerHTML = [
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="owner" title="Owner / Main Admin"><i class="fa fa-key"></i>O</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="manager" title="Manager"><i class="fa fa-users"></i>M</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter1" title="Waiter 1"><i class="fa fa-user"></i>W1</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter2" title="Waiter 2"><i class="fa fa-user"></i>W2</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="kitchen" title="Kitchen / KDS"><i class="fa fa-desktop"></i>K</button>'
    ].join('');

    var panel = document.createElement('div');
    panel.className = 'pmd-role-panel';

    document.body.appendChild(switcher);
    kpi.parentNode.insertBefore(panel, kpi.nextSibling);

    switcher.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-pmd-role-btn]');
      if (!btn) return;
      renderRole(btn.getAttribute('data-pmd-role-btn'));
    });

    rt.addEventListener('click', function (event) {
      var card = event.target.closest('[data-pmd-role-href]');
      if (!card) return;

      var href = card.getAttribute('data-pmd-role-href');
      if (href && href !== '#') {
        window.location.href = href;
      }
    });

    var saved = localStorage.getItem('pmdDashboardPreviewRole') || 'owner';
    if (saved === 'admin') saved = 'owner';
    renderRole(saved);

    window.PMDDashboardRolePreview = {
      current: function () {
        return root() ? root().getAttribute('data-pmd-role') : null;
      },
      setRole: renderRole,
      roles: ['owner', 'manager', 'waiter1', 'waiter2', 'kitchen']
    };
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
