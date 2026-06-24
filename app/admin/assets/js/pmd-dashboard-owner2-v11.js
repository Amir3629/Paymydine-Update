(function () {
  'use strict';

  var v9SetRole = null;
  var installed = false;

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

  function signal(label, value, sub, icon, href) {
    return [
      '<div class="pmd-o2-signal" data-pmd-role-href="' + href + '">',
        '<div class="pmd-o2-signal-label">' + label + '</div>',
        '<div class="pmd-o2-signal-value">' + value + '</div>',
        '<div class="pmd-o2-signal-sub">' + sub + '</div>',
        '<div class="pmd-o2-signal-icon"><i class="fa ' + icon + '"></i></div>',
      '</div>'
    ].join('');
  }

  function priority(icon, title, sub, value, href) {
    return [
      '<div class="pmd-o2-priority" data-pmd-role-href="' + href + '">',
        '<div class="pmd-o2-priority-icon"><i class="fa ' + icon + '"></i></div>',
        '<div>',
          '<div class="pmd-o2-priority-main">' + title + '</div>',
          '<div class="pmd-o2-priority-sub">' + sub + '</div>',
        '</div>',
        '<div class="pmd-o2-priority-value">' + value + '</div>',
      '</div>'
    ].join('');
  }

  function action(icon, title, sub, href) {
    return [
      '<a class="pmd-o2-action" href="' + href + '">',
        '<i class="fa ' + icon + '"></i>',
        '<span>' + title + '<small>' + sub + '</small></span>',
      '</a>'
    ].join('');
  }

  function mini(label, value, sub, href) {
    return [
      '<div class="pmd-o2-mini" data-pmd-role-href="' + href + '">',
        '<div class="pmd-o2-mini-label">' + label + '</div>',
        '<div class="pmd-o2-mini-value">' + value + '</div>',
        '<div class="pmd-o2-mini-sub">' + sub + '</div>',
      '</div>'
    ].join('');
  }

  function owner2Html() {
    var r = routes();

    var revenue = liveValue('[data-pmd-kpi="revenue"]', '€38,090.60');
    var cash = liveValue('[data-pmd-kpi="payments"]', '€31.98');
    var orders = liveValue('[data-pmd-kpi="orders"]', '23');
    var reservations = liveValue('[data-pmd-kpi="reservations"]', '5');
    var avg = liveValue('[data-pmd-kpi="avg"]', '€49.20');

    return [
      '<div class="pmd-o2">',

        '<div class="pmd-o2-hero">',
          '<div class="pmd-o2-hero-top">',
            '<div>',
              '<div class="pmd-o2-badge"><i class="fa fa-diamond"></i> Owner 2 · 2027 Command Center</div>',
              '<div class="pmd-o2-title">Owner overview without the noise.</div>',
              '<div class="pmd-o2-subtitle">The owner sees only what needs a decision: money, payments, alerts, tables, kitchen, orders, reservations and reports.</div>',
            '</div>',
            '<div class="pmd-o2-live">Live Preview</div>',
          '</div>',

          '<div class="pmd-o2-signal-grid">',
            signal('Revenue Today', revenue, 'real sales source', 'fa-money', r.reports),
            signal('Pending Payments', '€535', '14 open bills', 'fa-credit-card', r.payments),
            signal('Live Alerts', '3', 'calls / late tickets', 'fa-exclamation-triangle', r.tables),
            signal('Active Tables', '8 / 17', 'occupied now', 'fa-th-large', r.tables),
            signal('Kitchen Status', 'Active', '9 preparing · 4 ready', 'fa-desktop', r.kds),
            signal('Orders', orders, 'live order queue', 'fa-shopping-bag', r.orders),
            signal('Reservations', reservations, 'today schedule', 'fa-calendar-check-o', r.reservations),
            signal('Reports', avg, 'avg ticket snapshot', 'fa-line-chart', r.reports),
          '</div>',
        '</div>',

        '<div class="pmd-o2-strip">',
          mini('Top Item', 'Sushi Combo', '47 orders today', r.menu),
          mini('Best Staff', 'Emma', '€2,850 · 28 orders', r.reports),
          mini('Kitchen Pressure', 'Medium', '2 late tickets', r.kds),
          mini('Cash Snapshot', cash, 'real cash widget', r.payments),
        '</div>',

        '<div class="pmd-o2-board">',
          '<div class="pmd-o2-panel">',
            '<div class="pmd-o2-panel-title"><i class="fa fa-bolt"></i> Owner Priority Queue</div>',
            '<div class="pmd-o2-priority-list">',
              priority('fa-credit-card', 'Collect pending payments', 'Close unpaid bills before peak time', '14 bills', r.payments),
              priority('fa-exclamation-triangle', 'Handle live alerts', 'Waiter calls and kitchen delays need action', '3 alerts', r.tables),
              priority('fa-desktop', 'Watch kitchen load', 'Preparing queue is active now', '9 tickets', r.kds),
              priority('fa-clock-o', 'Dinner menu timing', 'Menu should switch based on admin-set time', '18:00', r.menu),
            '</div>',
          '</div>',

          '<div class="pmd-o2-panel">',
            '<div class="pmd-o2-panel-title"><i class="fa fa-magic"></i> Smart Quick Actions</div>',
            '<div class="pmd-o2-actions">',
              action('fa-credit-card', 'Collect Payments', '14 open bills', r.payments),
              action('fa-columns', 'Split Bill', 'quick split flow', r.orders),
              action('fa-book', 'Manage Menus', 'items and time rules', r.menu),
              action('fa-line-chart', 'Open Reports', 'owner analytics', r.reports),
              action('fa-user-plus', 'Add Staff', 'roles and shifts', r.staff),
              action('fa-cog', 'Settings', 'system configuration', r.settings),
            '</div>',
          '</div>',
        '</div>',

      '</div>'
    ].join('');
  }

  function captureV9() {
    if (
      window.PMDDashboardRolePreview &&
      typeof window.PMDDashboardRolePreview.setRole === 'function' &&
      window.PMDDashboardRolePreview.roles &&
      window.PMDDashboardRolePreview.roles.indexOf('owner2') === -1
    ) {
      v9SetRole = window.PMDDashboardRolePreview.setRole;
      return true;
    }

    return !!v9SetRole;
  }

  function renderRole(role) {
    var rt = root();
    if (!rt) return;

    var panel = rt.querySelector('.pmd-role-panel');
    if (!panel) return;

    document.querySelectorAll('.pmd-role-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-pmd-role-btn') === role);
    });

    if (role === 'owner2') {
      rt.setAttribute('data-pmd-role', 'owner2');
      localStorage.setItem('pmdDashboardPreviewRole', 'owner2');
      panel.innerHTML = owner2Html();
      return;
    }

    if (v9SetRole) {
      v9SetRole(role);
      localStorage.setItem('pmdDashboardPreviewRole', role);
    }
  }

  function buildSwitcher() {
    var old = document.querySelector('.pmd-role-switcher');
    if (old) old.remove();

    var switcher = document.createElement('div');
    switcher.className = 'pmd-role-switcher';
    switcher.innerHTML = [
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="owner" title="Owner 1"><i class="fa fa-key"></i>O</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="owner2" title="Owner 2"><i class="fa fa-diamond"></i>O2</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="manager" title="Manager"><i class="fa fa-users"></i>M</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter1" title="Waiter 1"><i class="fa fa-user"></i>W1</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter2" title="Waiter 2"><i class="fa fa-user"></i>W2</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="kitchen" title="Kitchen"><i class="fa fa-desktop"></i>K</button>'
    ].join('');

    (document.body||document.documentElement).appendChild(switcher);

    switcher.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-pmd-role-btn]');
      if (!btn) return;
      renderRole(btn.getAttribute('data-pmd-role-btn'));
    });
  }

  function ensurePanel() {
    var rt = root();
    if (!rt) return null;

    var kpiBar = rt.querySelector('.pmd-dashboard-kpi-bar');
    if (!kpiBar) return null;

    var panel = rt.querySelector('.pmd-role-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'pmd-role-panel';
      kpiBar.parentNode.insertBefore(panel, kpiBar.nextSibling);
    }

    return panel;
  }

  function installClickRouter() {
    var rt = root();
    if (!rt || rt.dataset.pmdOwner2ClickRouter === '1') return;

    rt.dataset.pmdOwner2ClickRouter = '1';

    rt.addEventListener('click', function (event) {
      if (event.target.closest('a')) return;

      var card = event.target.closest('[data-pmd-role-href]');
      if (!card) return;

      var href = card.getAttribute('data-pmd-role-href');
      if (href && href !== '#') window.location.href = href;
    });
  }

  function inject() {
    if (!captureV9()) return;
    if (!ensurePanel()) return;

    buildSwitcher();
    installClickRouter();

    var saved = localStorage.getItem('pmdDashboardPreviewRole') || 'owner';
    if (saved === 'owner2') {
      renderRole('owner2');
    } else {
      renderRole(saved);
    }

    window.PMDDashboardRolePreview = {
      current: function () {
        return root() ? root().getAttribute('data-pmd-role') : null;
      },
      setRole: renderRole,
      roles: ['owner', 'owner2', 'manager', 'waiter1', 'waiter2', 'kitchen']
    };

    installed = true;
  }

  function schedule() {
    [500, 1200, 2400, 4200, 6200].forEach(function (delay) {
      setTimeout(function () {
        if (!installed || !document.querySelector('.pmd-role-switcher [data-pmd-role-btn="owner2"]')) {
          inject();
        }
      }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
