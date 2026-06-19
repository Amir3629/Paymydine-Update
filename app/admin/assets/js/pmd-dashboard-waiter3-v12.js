(function () {
  'use strict';

  var baseSetRole = null;
  var installed = false;

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
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
      quick: '/admin/quick-mode?preview=pmdquick2026',
      orders: findHref(['orders'], '/admin/orders'),
      reservations: findHref(['reservations'], '/admin/reservations'),
      tables: findHref(['tables'], '/admin/tables'),
      kds: findHref(['kitchen display', 'kds'], '/admin/kitchendisplay'),
      payments: findHref(['payments'], '/admin/payments'),
      notes: findHref(['notes', 'notifications'], '/admin/notifications'),
      dashboard: findHref(['dashboard'], '/admin/dashboard')
    };
  }

  function realData() {
    if (window.PMDRealDashboardData && window.PMDRealDashboardData.metrics) return window.PMDRealDashboardData;

    if (
      window.PMDRealDashboardAPI &&
      typeof window.PMDRealDashboardAPI.last === 'function' &&
      window.PMDRealDashboardAPI.last()
    ) {
      return window.PMDRealDashboardAPI.last();
    }

    return null;
  }

  function metric(key, prop, fallback) {
    var data = realData();
    if (!data || !data.metrics || !data.metrics[key]) return fallback;
    var value = data.metrics[key][prop];
    return value === undefined || value === null || value === '' ? fallback : value;
  }

  function signal(label, value, sub, icon, href) {
    return [
      '<div class="pmd-w3-signal" data-pmd-w3-href="' + href + '">',
        '<div class="pmd-w3-signal-label">' + label + '</div>',
        '<div class="pmd-w3-signal-value">' + value + '</div>',
        '<div class="pmd-w3-signal-sub">' + sub + '</div>',
        '<div class="pmd-w3-signal-icon"><i class="fa ' + icon + '"></i></div>',
      '</div>'
    ].join('');
  }

  function quick(icon, title, sub, href, primary) {
    return [
      '<a class="pmd-w3-quick-card ' + (primary ? 'primary' : '') + '" href="' + href + '">',
        '<div>',
          '<div class="pmd-w3-quick-icon"><i class="fa ' + icon + '"></i></div>',
          '<div class="pmd-w3-quick-main">' + title + '</div>',
          '<div class="pmd-w3-quick-sub">' + sub + '</div>',
        '</div>',
      '</a>'
    ].join('');
  }

  function row(icon, main, sub, value) {
    return [
      '<div class="pmd-w3-row">',
        '<i class="fa ' + icon + '"></i>',
        '<div>',
          '<div class="pmd-w3-row-main">' + main + '</div>',
          '<div class="pmd-w3-row-sub">' + sub + '</div>',
        '</div>',
        '<div class="pmd-w3-row-value">' + value + '</div>',
      '</div>'
    ].join('');
  }

  function waiter3Html() {
    var r = routes();

    var orders = metric('orders', 'value', '0');
    var reservations = metric('reservations', 'value', '0');
    var waiterCalls = metric('live_alerts', 'value', '0');
    var payments = metric('pending_payments', 'value', '€0.00');
    var pendingCount = metric('pending_payments', 'count', '0');
    var activeTables = metric('active_tables', 'value', '0 / 0');
    var preparing = metric('kitchen_status', 'preparing', '0');
    var ready = metric('kitchen_status', 'ready', '0');

    return [
      '<div class="pmd-w3">',

        '<div class="pmd-w3-hero">',
          '<div class="pmd-w3-hero-top">',
            '<div>',
              '<div class="pmd-w3-badge"><i class="fa fa-bolt"></i> W3 · Waiter Quick Control</div>',
              '<div class="pmd-w3-title">Everything a waiter needs, fast.</div>',
              '<div class="pmd-w3-subtitle">Orders, table actions, waiter calls, notes, payments and reservations in one clean service dashboard.</div>',
            '</div>',
            '<div class="pmd-w3-live">Service Live</div>',
          '</div>',

          '<div class="pmd-w3-signal-grid">',
            signal('Orders', orders, 'open / total service orders', 'fa-list', r.orders),
            signal('Reservations', reservations, 'today and upcoming guests', 'fa-calendar-check-o', r.reservations),
            signal('Waiter Calls', waiterCalls, 'guest requests / alerts', 'fa-bell', r.notes),
            signal('Table Notes', 'Notes', 'allergies / guest requests', 'fa-sticky-note', r.notes),
            signal('Payments Due', payments, pendingCount + ' unpaid bills', 'fa-credit-card', r.payments),
            signal('Kitchen Ready', ready, preparing + ' preparing', 'fa-cutlery', r.kds),
          '</div>',
        '</div>',

        '<div class="pmd-w3-quick-shell">',
          '<div class="pmd-w3-quick-head">',
            '<div class="pmd-w3-quick-title"><i class="fa fa-bolt"></i> Quick Mode Actions</div>',
            '<div class="pmd-w3-quick-actions-top">',
              '<a class="pmd-w3-pill green" href="' + r.quick + '">Open Quick Mode</a>',
              '<a class="pmd-w3-pill" href="' + r.dashboard + '">Admin Panel</a>',
            '</div>',
          '</div>',

          '<div class="pmd-w3-quick-grid">',
            quick('fa-plus', 'New Order', 'Select table → add items', r.quick, true),
            quick('fa-list', 'Open Orders', orders + ' active', r.orders, false),
            quick('fa-th-large', 'Tables', activeTables + ' active', r.tables, false),
            quick('fa-clock-o', 'KDS', 'Kitchen screen · ' + ready + ' ready', r.kds, false),
            quick('fa-eur', 'Payments', pendingCount + ' unpaid', r.payments, false),
            quick('fa-calendar', 'Reservations', reservations + ' today', r.reservations, false),
          '</div>',
        '</div>',

        '<div class="pmd-w3-bottom">',
          '<div class="pmd-w3-panel">',
            '<div class="pmd-w3-panel-title">Next Waiter Actions</div>',
            row('fa-bell', 'Check waiter calls', 'Guest requests need attention', waiterCalls),
            row('fa-cutlery', 'Serve ready orders', 'Kitchen items ready to deliver', ready),
            row('fa-credit-card', 'Collect payments', 'Close unpaid bills before guests leave', pendingCount),
          '</div>',

          '<div class="pmd-w3-panel">',
            '<div class="pmd-w3-panel-title">Service Focus</div>',
            row('fa-th-large', 'Active tables', 'Keep table status updated', activeTables),
            row('fa-sticky-note', 'Guest notes', 'Allergies, requests, table notes', 'Open'),
            row('fa-calendar-check-o', 'Reservations', 'Prepare arriving guests', reservations),
          '</div>',
        '</div>',

      '</div>'
    ].join('');
  }

  function captureBase() {
    var current = window.PMDDashboardRolePreview;

    if (current && current.__pmdWaiter3 && current.__pmdBaseSetRole) {
      baseSetRole = current.__pmdBaseSetRole;
      return true;
    }

    if (
      current &&
      typeof current.setRole === 'function' &&
      (!current.roles || current.roles.indexOf('waiter3') === -1)
    ) {
      baseSetRole = current.setRole;
      return true;
    }

    return !!baseSetRole;
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

  function updateActive(role) {
    document.querySelectorAll('.pmd-role-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-pmd-role-btn') === role);
    });
  }

  function renderRole(role) {
    var rt = root();
    var panel = ensurePanel();

    if (!rt || !panel) return;

    updateActive(role);

    if (role === 'waiter3') {
      rt.setAttribute('data-pmd-role', 'waiter3');
      localStorage.setItem('pmdDashboardPreviewRole', 'waiter3');
      panel.innerHTML = waiter3Html();
      return;
    }

    if (baseSetRole) {
      baseSetRole(role);
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
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="waiter3" title="Waiter 3 Quick Mode"><i class="fa fa-bolt"></i>W3</button>',
      '<button type="button" class="pmd-role-btn" data-pmd-role-btn="kitchen" title="Kitchen"><i class="fa fa-desktop"></i>K</button>'
    ].join('');

    document.body.appendChild(switcher);

    switcher.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-pmd-role-btn]');
      if (!btn) return;
      renderRole(btn.getAttribute('data-pmd-role-btn'));
    });
  }

  function installClickRouter() {
    var rt = root();
    if (!rt || rt.dataset.pmdW3ClickRouter === '1') return;

    rt.dataset.pmdW3ClickRouter = '1';

    rt.addEventListener('click', function (event) {
      if (event.target.closest('a')) return;

      var card = event.target.closest('[data-pmd-w3-href]');
      if (!card) return;

      var href = card.getAttribute('data-pmd-w3-href');
      if (href && href !== '#') window.location.href = href;
    });
  }

  function inject() {
    if (!captureBase()) return;
    if (!ensurePanel()) return;

    buildSwitcher();
    installClickRouter();

    window.PMDDashboardRolePreview = {
      __pmdWaiter3: true,
      __pmdBaseSetRole: baseSetRole,
      current: function () {
        return root() ? root().getAttribute('data-pmd-role') : null;
      },
      setRole: renderRole,
      roles: ['owner', 'owner2', 'manager', 'waiter1', 'waiter2', 'waiter3', 'kitchen']
    };

    var saved = localStorage.getItem('pmdDashboardPreviewRole') || 'owner';

    if (saved === 'waiter3') {
      renderRole('waiter3');
    } else {
      renderRole(saved);
    }

    installed = true;
  }

  function refreshIfW3() {
    var rt = root();
    if (rt && rt.getAttribute('data-pmd-role') === 'waiter3') {
      renderRole('waiter3');
    }
  }

  document.addEventListener('pmd:dashboard-real-data-v3', refreshIfW3);
  document.addEventListener('pmd:dashboard-real-data-v2', refreshIfW3);
  document.addEventListener('pmd:dashboard-real-data', refreshIfW3);

  function schedule() {
    [800, 1800, 3200, 5200, 7600].forEach(function (delay) {
      setTimeout(function () {
        if (!installed || !document.querySelector('.pmd-role-switcher [data-pmd-role-btn="waiter3"]')) {
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
