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
      var ok = needles.some(function (needle) {
        return hay.indexOf(String(needle).toLowerCase()) !== -1;
      });

      if (ok) return href;
    }

    return fallback || '#';
  }

  function read(selector) {
    var el = document.querySelector(selector);
    var txt = clean(el ? el.textContent : '');
    return txt && txt !== '—' ? txt : '—';
  }

  function realValues() {
    return {
      totalSales: read('[data-pmd-kpi="revenue"]'),
      cashPayments: read('[data-pmd-kpi="payments"]'),
      orders: read('[data-pmd-kpi="orders"]'),
      reservations: read('[data-pmd-kpi="reservations"]'),
      avgTicket: read('[data-pmd-kpi="avg"]')
    };
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
      staff: findHref(['staff'], '/admin/staffs'),
      reports: findHref(['reports'], '/admin/reports'),
      settings: findHref(['settings', 'system'], '/admin/settings'),
      menu: findHref(['menu items', 'menu'], '/admin/menus'),
      design: findHref(['themes', 'design'], '/admin/themes')
    };
  }

  function chip(label, icon, href, action) {
    if (action) {
      return '<button type="button" class="pmd-role-chip" data-pmd-role-action="' + action + '"><i class="fa ' + icon + '"></i>' + label + '</button>';
    }

    return '<a class="pmd-role-chip" href="' + href + '"><i class="fa ' + icon + '"></i>' + label + '</a>';
  }

  function card(title, value, icon, color, lines, note) {
    return [
      '<div class="pmd-role-card">',
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
        note ? '<div class="pmd-role-note">' + note + '</div>' : '',
      '</div>'
    ].join('');
  }

  function roleContent(role) {
    var r = routes();
    var v = realValues();

    var dataMissing = 'Needs backend endpoint';
    var connected = 'Connected when real data exists';

    var config = {
      owner: {
        title: 'Owner / Main Admin Dashboard',
        subtitle: 'Full business view: sales, payments, orders, reservations, floor, reports.',
        badge: 'Full access',
        chips: [
          chip('Reports', 'fa-line-chart', r.reports),
          chip('Payments', 'fa-credit-card', r.payments),
          chip('Settings', 'fa-cog', r.settings),
          chip('Calendar', 'fa-calendar', '#', 'calendar')
        ],
        cards: [
          card('Total Sales', v.totalSales, 'fa-line-chart', 'gold', [['Cash Payments', v.cashPayments], ['Avg Ticket', v.avgTicket], ['Status', connected]]),
          card('Operations', v.orders, 'fa-shopping-bag', 'red', [['Reservations', v.reservations], ['KDS', 'Active'], ['Floor', 'Live preview']]),
          card('Owner Controls', 'Ready', 'fa-cog', '', [['Staff roles', 'Owner/Manager/Waiter'], ['Menu visibility', 'By time'], ['Reports', 'Full access']], 'This role can see financial information.')
        ]
      },

      manager: {
        title: 'Manager Dashboard',
        subtitle: 'For restaurant shift manager: operations, table flow, staff, reservations. Less finance than owner.',
        badge: 'Operations access',
        chips: [
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Reservations', 'fa-calendar-check-o', r.reservations),
          chip('Tables', 'fa-th-large', r.tables),
          chip('Calendar / Shifts', 'fa-calendar', '#', 'calendar')
        ],
        cards: [
          card('Live Operations', v.orders, 'fa-shopping-bag', 'red', [['Open orders', v.orders], ['Reservations', v.reservations], ['Issue queue', 'Needs backend']]),
          card('Floor & Tables', 'Live', 'fa-th-large', '', [['Available', 'Preview'], ['Occupied', 'Preview'], ['Reserved', 'Preview']], 'Later this should read real table status endpoint.'),
          card('Staff & Shift', 'Today', 'fa-users', '', [['Waiter 1', 'Active'], ['Waiter 2', 'Active'], ['Kitchen', 'Active']]),
          card('Menu Time Rules', 'Active', 'fa-clock-o', 'gold', [['Breakfast/Lunch/Dinner', 'Admin-set time'], ['Hidden items', 'By schedule'], ['Sold out', 'Quick toggle']]),
          card('KDS Control', 'Active', 'fa-desktop', 'gold', [['Preparing', dataMissing], ['Ready', dataMissing], ['Delayed tickets', dataMissing]]),
          card('Customer Service', 'Live', 'fa-comments', '', [['Waiter calls', dataMissing], ['Notes', dataMissing], ['Complaints', dataMissing]])
        ]
      },

      waiter1: {
        title: 'Waiter 1 Dashboard',
        subtitle: 'No sales analytics. Focus on assigned tables, active orders, notes, payment, waiter calls.',
        badge: 'Service access',
        chips: [
          chip('My Tables', 'fa-th-large', r.tables),
          chip('New Order', 'fa-shopping-bag', r.orders),
          chip('Reservations', 'fa-calendar-check-o', r.reservations),
          chip('Calendar / Shift', 'fa-clock-o', '#', 'calendar')
        ],
        cards: [
          card('My Tables', 'T1 / T5 / T9', 'fa-th-large', '', [['Needs attention', dataMissing], ['Waiting payment', dataMissing], ['New call', dataMissing]]),
          card('My Orders', 'Active', 'fa-shopping-bag', 'red', [['Preparing', dataMissing], ['Ready to serve', dataMissing], ['Delivered', dataMissing]]),
          card('Guest Notes', 'Important', 'fa-sticky-note-o', 'gold', [['Allergies', dataMissing], ['Special request', dataMissing], ['Birthday/VIP', dataMissing]]),
          card('Payments Due', 'Check', 'fa-credit-card', '', [['Unpaid tables', dataMissing], ['Cash request', dataMissing], ['Split bill', dataMissing]]),
          card('Shift Tasks', 'Today', 'fa-check-square-o', '', [['Opening checklist', 'Preview'], ['Cleaning task', 'Preview'], ['Manager note', 'Preview']]),
          card('Quick Actions', 'Fast', 'fa-bolt', 'gold', [['Call kitchen', 'Button later'], ['Print bill', 'Button later'], ['Move table', 'Button later']])
        ]
      },

      waiter2: {
        title: 'Waiter 2 Dashboard',
        subtitle: 'Same waiter logic, different assigned section/tables. Good for comparing waiter-specific view.',
        badge: 'Service access',
        chips: [
          chip('My Tables', 'fa-th-large', r.tables),
          chip('New Order', 'fa-shopping-bag', r.orders),
          chip('Reservations', 'fa-calendar-check-o', r.reservations),
          chip('Calendar / Shift', 'fa-clock-o', '#', 'calendar')
        ],
        cards: [
          card('My Tables', 'T2 / T6 / T10', 'fa-th-large', '', [['Needs attention', dataMissing], ['Waiting payment', dataMissing], ['New call', dataMissing]]),
          card('My Orders', 'Active', 'fa-shopping-bag', 'red', [['Preparing', dataMissing], ['Ready to serve', dataMissing], ['Delivered', dataMissing]]),
          card('Guest Notes', 'Important', 'fa-sticky-note-o', 'gold', [['Allergies', dataMissing], ['Special request', dataMissing], ['Birthday/VIP', dataMissing]]),
          card('Payments Due', 'Check', 'fa-credit-card', '', [['Unpaid tables', dataMissing], ['Cash request', dataMissing], ['Split bill', dataMissing]]),
          card('Shift Tasks', 'Today', 'fa-check-square-o', '', [['Opening checklist', 'Preview'], ['Cleaning task', 'Preview'], ['Manager note', 'Preview']]),
          card('Quick Actions', 'Fast', 'fa-bolt', 'gold', [['Call kitchen', 'Button later'], ['Print bill', 'Button later'], ['Move table', 'Button later']])
        ]
      },

      kitchen: {
        title: 'Kitchen / KDS Dashboard',
        subtitle: 'No finance. Focus on tickets, station queue, preparation time, ready orders.',
        badge: 'Kitchen access',
        chips: [
          chip('Open KDS', 'fa-desktop', r.kds),
          chip('Orders', 'fa-shopping-bag', r.orders),
          chip('Menu Items', 'fa-book', r.menu),
          chip('Calendar / Shift', 'fa-clock-o', '#', 'calendar')
        ],
        cards: [
          card('Ticket Queue', 'Active', 'fa-desktop', 'gold', [['Preparing', dataMissing], ['Ready', dataMissing], ['Completed', dataMissing]]),
          card('Late Tickets', 'Watch', 'fa-exclamation-triangle', 'red', [['Over 10 min', dataMissing], ['Over 20 min', dataMissing], ['Priority', dataMissing]]),
          card('Stations', 'Kitchen', 'fa-cutlery', '', [['Main Kitchen', 'Active'], ['Bar / Drinks', 'Preview'], ['Dessert', 'Preview']]),
          card('Sold Out', 'Quick', 'fa-ban', 'red', [['Unavailable items', dataMissing], ['Low stock', dataMissing], ['Toggle item', 'Button later']]),
          card('Prep Time', 'Live', 'fa-clock-o', '', [['Avg prep', dataMissing], ['Fastest', dataMissing], ['Slowest', dataMissing]]),
          card('Kitchen Notes', 'Important', 'fa-sticky-note-o', 'gold', [['Allergies', dataMissing], ['No onion/no nuts', dataMissing], ['VIP order', dataMissing]])
        ]
      },

      admin: {
        title: 'System Admin Dashboard',
        subtitle: 'Technical/admin view: settings, staff roles, permissions, payment providers, integrations.',
        badge: 'System access',
        chips: [
          chip('Settings', 'fa-cog', r.settings),
          chip('Staff', 'fa-users', r.staff),
          chip('Design', 'fa-paint-brush', r.design),
          chip('Calendar', 'fa-calendar', '#', 'calendar')
        ],
        cards: [
          card('Role Management', 'Setup', 'fa-users', '', [['Owner', 'Full'], ['Manager', 'Limited finance'], ['Waiter/Kitchen', 'No finance']]),
          card('Menu Visibility', 'Time-based', 'fa-clock-o', 'gold', [['Lunch menu', 'Admin-set time'], ['Dinner menu', 'Admin-set time'], ['Hidden items', 'By schedule']]),
          card('Payments Setup', 'Providers', 'fa-credit-card', '', [['Terminal devices', 'System'], ['Cash', 'Enabled'], ['Online payments', 'Provider config']]),
          card('System Health', 'Monitor', 'fa-heartbeat', 'red', [['Notifications', 'Polling'], ['Cache', 'Dashboard widget'], ['Logs', 'System']]),
          card('Design / Branding', 'Themes', 'fa-paint-brush', 'gold', [['Logo', 'Tenant'], ['Colors', 'Theme'], ['Menu style', 'Per restaurant']]),
          card('Security', 'Permissions', 'fa-lock', '', [['Role rules', 'Backend later'], ['Dashboard visibility', 'Backend later'], ['Audit log', 'Later']])
        ]
      }
    };

    return config[role] || config.owner;
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

    panel.innerHTML = [
      '<div class="pmd-role-header">',
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

    window.PMDDashboardRolePreview = {
      currentRole: role,
      roles: ['owner', 'manager', 'waiter1', 'waiter2', 'kitchen', 'admin'],
      setRole: renderRole
    };
  }

  function inject() {
    var rt = root();
    if (!rt || rt.dataset.pmdRolePreviewReady === '1') return;

    var kpi = rt.querySelector('.pmd-dashboard-kpi-bar');
    if (!kpi) return;

    var switcher = document.createElement('div');
    switcher.className = 'pmd-role-switcher';
    switcher.innerHTML = [
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="owner"><i class="fa fa-crown"></i>Owner</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="manager"><i class="fa fa-user-tie"></i>Manager</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter1"><i class="fa fa-user"></i>Waiter 1</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter2"><i class="fa fa-user"></i>Waiter 2</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="kitchen"><i class="fa fa-desktop"></i>Kitchen</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="admin"><i class="fa fa-cog"></i>Admin</button>'
    ].join('');

    var panel = document.createElement('div');
    panel.className = 'pmd-role-panel';

    kpi.parentNode.insertBefore(switcher, kpi);
    kpi.parentNode.insertBefore(panel, kpi.nextSibling);

    rt.dataset.pmdRolePreviewReady = '1';

    switcher.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-pmd-role-btn]');
      if (!btn) return;
      renderRole(btn.getAttribute('data-pmd-role-btn'));
    });

    rt.addEventListener('click', function (event) {
      var action = event.target.closest('[data-pmd-role-action]');
      if (!action) return;

      var name = action.getAttribute('data-pmd-role-action');
      if (name === 'calendar') {
        var dateBtn = document.querySelector('[data-control="daterange"]');
        if (dateBtn) dateBtn.click();
      }
    });

    renderRole(localStorage.getItem('pmdDashboardPreviewRole') || 'owner');
  }

  function schedule() {
    [100, 500, 1200, 2500, 5000].forEach(function (delay) {
      setTimeout(inject, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
