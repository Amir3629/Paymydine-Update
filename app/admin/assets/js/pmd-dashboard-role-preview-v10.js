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

  function owner2Html() {
    var r = routes();

    var sales = liveValue('[data-pmd-kpi="revenue"]', '€38,090.60');
    var cash = liveValue('[data-pmd-kpi="payments"]', '€31.98');
    var orders = liveValue('[data-pmd-kpi="orders"]', '23');
    var reservations = liveValue('[data-pmd-kpi="reservations"]', '5');
    var avg = liveValue('[data-pmd-kpi="avg"]', '€49.20');

    return [
      '<div class="pmd-owner2-shell">',

        '<div class="pmd-owner2-command">',
          '<div>',
            '<div class="pmd-owner2-eyebrow"><i class="fa fa-sparkles"></i> Owner 2 · 2027 Command Center</div>',
            '<div class="pmd-owner2-title">One clean screen for the things that matter.</div>',
            '<div class="pmd-owner2-subtitle">Less crowded than Owner 1. Focus on money, open work, staff pressure, and actions.</div>',
            '<div class="pmd-owner2-hero-actions">',
              '<a class="pmd-owner2-hero-action" href="' + r.reports + '"><i class="fa fa-line-chart"></i>Reports</a>',
              '<a class="pmd-owner2-hero-action" href="' + r.payments + '"><i class="fa fa-credit-card"></i>Payments</a>',
              '<a class="pmd-owner2-hero-action" href="' + r.orders + '"><i class="fa fa-shopping-bag"></i>Orders</a>',
              '<a class="pmd-owner2-hero-action" href="' + r.settings + '"><i class="fa fa-cog"></i>Settings</a>',
            '</div>',
          '</div>',

          '<div class="pmd-owner2-pulse">',
            '<div class="pmd-owner2-pulse-card" data-pmd-role-href="' + r.reports + '">',
              '<div class="pmd-owner2-pulse-label">Today Sales</div>',
              '<div class="pmd-owner2-pulse-value">' + sales + '</div>',
              '<div class="pmd-owner2-pulse-sub">real / preview mix</div>',
            '</div>',
            '<div class="pmd-owner2-pulse-card" data-pmd-role-href="' + r.orders + '">',
              '<div class="pmd-owner2-pulse-label">Open Orders</div>',
              '<div class="pmd-owner2-pulse-value">' + orders + '</div>',
              '<div class="pmd-owner2-pulse-sub">live queue</div>',
            '</div>',
            '<div class="pmd-owner2-pulse-card" data-pmd-role-href="' + r.reservations + '">',
              '<div class="pmd-owner2-pulse-label">Reservations</div>',
              '<div class="pmd-owner2-pulse-value">' + reservations + '</div>',
              '<div class="pmd-owner2-pulse-sub">today schedule</div>',
            '</div>',
            '<div class="pmd-owner2-pulse-card" data-pmd-role-href="' + r.payments + '">',
              '<div class="pmd-owner2-pulse-label">Cash / Avg</div>',
              '<div class="pmd-owner2-pulse-value">' + cash + '</div>',
              '<div class="pmd-owner2-pulse-sub">avg ' + avg + '</div>',
            '</div>',
          '</div>',
        '</div>',

        '<div class="pmd-owner2-strip">',
          '<div class="pmd-owner2-mini"><div class="pmd-owner2-mini-label">Floor Load</div><div class="pmd-owner2-mini-value">8 / 17</div><div class="pmd-owner2-mini-sub">occupied tables</div></div>',
          '<div class="pmd-owner2-mini"><div class="pmd-owner2-mini-label">Kitchen Pressure</div><div class="pmd-owner2-mini-value">9</div><div class="pmd-owner2-mini-sub">preparing now</div></div>',
          '<div class="pmd-owner2-mini"><div class="pmd-owner2-mini-label">Waiter Calls</div><div class="pmd-owner2-mini-value">3</div><div class="pmd-owner2-mini-sub">needs attention</div></div>',
          '<div class="pmd-owner2-mini"><div class="pmd-owner2-mini-label">Top Item</div><div class="pmd-owner2-mini-value">Sushi Combo</div><div class="pmd-owner2-mini-sub">47 orders</div></div>',
        '</div>',

        '<div class="pmd-owner2-board">',
          '<div class="pmd-owner2-panel">',
            '<div class="pmd-owner2-panel-title"><i class="fa fa-bolt"></i> Today Focus</div>',
            '<div class="pmd-owner2-focus-list">',
              '<div class="pmd-owner2-focus" data-pmd-role-href="' + r.payments + '"><div class="pmd-owner2-focus-icon"><i class="fa fa-credit-card"></i></div><div><div class="pmd-owner2-focus-main">Collect unpaid bills</div><div class="pmd-owner2-focus-sub">Keep checkout clean before peak time</div></div><div class="pmd-owner2-focus-value">8 bills</div></div>',
              '<div class="pmd-owner2-focus" data-pmd-role-href="' + r.kds + '"><div class="pmd-owner2-focus-icon"><i class="fa fa-desktop"></i></div><div><div class="pmd-owner2-focus-main">Kitchen queue active</div><div class="pmd-owner2-focus-sub">Watch preparing and ready tickets</div></div><div class="pmd-owner2-focus-value">9 now</div></div>',
              '<div class="pmd-owner2-focus" data-pmd-role-href="' + r.tables + '"><div class="pmd-owner2-focus-icon"><i class="fa fa-bell"></i></div><div><div class="pmd-owner2-focus-main">Waiter calls waiting</div><div class="pmd-owner2-focus-sub">Tables asking for help</div></div><div class="pmd-owner2-focus-value">3 calls</div></div>',
              '<div class="pmd-owner2-focus" data-pmd-role-href="' + r.menu + '"><div class="pmd-owner2-focus-icon"><i class="fa fa-clock-o"></i></div><div><div class="pmd-owner2-focus-main">Dinner menu timing</div><div class="pmd-owner2-focus-sub">Switch items by admin-set time</div></div><div class="pmd-owner2-focus-value">18:00</div></div>',
            '</div>',
          '</div>',

          '<div class="pmd-owner2-panel">',
            '<div class="pmd-owner2-panel-title"><i class="fa fa-magic"></i> Smart Actions</div>',
            '<div class="pmd-owner2-actions">',
              '<a class="pmd-owner2-action" href="' + r.payments + '"><i class="fa fa-credit-card"></i><span>Collect Payments<small>14 open bills</small></span></a>',
              '<a class="pmd-owner2-action" href="' + r.orders + '"><i class="fa fa-columns"></i><span>Split Bill<small>Quick split</small></span></a>',
              '<a class="pmd-owner2-action" href="' + r.menu + '"><i class="fa fa-book"></i><span>Menu Control<small>Time rules</small></span></a>',
              '<a class="pmd-owner2-action" href="' + r.reports + '"><i class="fa fa-line-chart"></i><span>Full Report<small>Owner view</small></span></a>',
            '</div>',
          '</div>',
        '</div>',

      '</div>'
    ].join('');
  }

  function renderRole(role) {
    var rt = root();
    if (!rt) return;

    var panel = rt.querySelector('.pmd-role-panel');
    if (!panel) return;

    rt.setAttribute('data-pmd-role', role);
    localStorage.setItem('pmdDashboardPreviewRole', role);

    document.querySelectorAll('.pmd-role-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-pmd-role-btn') === role);
    });

    if (role === 'owner2') {
      panel.innerHTML = owner2Html();
      return;
    }

    if (window.PMDDashboardRolePreviewV9Render && role !== 'owner2') {
      window.PMDDashboardRolePreviewV9Render(role);
      return;
    }

    if (role === 'owner') {
      panel.innerHTML = '';
    }
  }

  function installV9Bridge() {
    var oldSetRole = window.PMDDashboardRolePreview && window.PMDDashboardRolePreview.setRole;
    if (oldSetRole && !window.PMDDashboardRolePreviewV9Render) {
      window.PMDDashboardRolePreviewV9Render = oldSetRole;
    }
  }

  function inject() {
    var rt = root();
    if (!rt) return;

    installV9Bridge();

    document.querySelectorAll('.pmd-role-switcher').forEach(function (el) {
      el.remove();
    });

    var kpiBar = rt.querySelector('.pmd-dashboard-kpi-bar');
    if (!kpiBar) return;

    var panel = rt.querySelector('.pmd-role-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'pmd-role-panel';
      kpiBar.parentNode.insertBefore(panel, kpiBar.nextSibling);
    }

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

    document.body.appendChild(switcher);

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
      roles: ['owner', 'owner2', 'manager', 'waiter1', 'waiter2', 'kitchen']
    };
  }

  function schedule() {
    [200, 900, 1800, 3500].forEach(function (delay) {
      setTimeout(function () {
        if (!document.querySelector('.pmd-role-switcher [data-pmd-role-btn="owner2"]')) {
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
