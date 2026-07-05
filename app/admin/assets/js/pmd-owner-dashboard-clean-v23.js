/* PMD_DASHBOARD_ROUTE_GUARD_V51_START */
(function () {

  var __pmdPath = String((window.location && window.location.pathname) || '');
  var __pmdAllowed =
    __pmdPath === '/admin/dashboard' ||
    __pmdPath.indexOf('/admin/dashboard/') === 0;

  window.PMD_DASHBOARD_ROUTE_GUARD_V51 = {
    path: __pmdPath,
    allowed: __pmdAllowed
  };

  if (!__pmdAllowed) {
    console.info('[PMD] dashboard role JS skipped on non-dashboard page', window.PMD_DASHBOARD_ROUTE_GUARD_V51);
    return;
  }


/* PayMyDine Owner/Admin Dashboard Clean v23
   Waiter interaction fix: full-left clean layout + in-dashboard table/order action cards. */
(function () {
  'use strict';

  var VERSION = 'owner-clean-v23-waiter-interactive-floor-20260626';
  var root = null;
  var lastData = null;
  var selectedFloorId = null;
  var selectedTableId = null;
  var selectedRole = null;
  var activeWaiterPanel = null;
  var waiterDraft = { tableId: null, items: [] };

  function isDashboardPage() {
    return /\/admin\/?$|\/admin\/dashboard\/?$/.test(window.location.pathname || '');
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function metric(data, key) {
    return (data && data.metrics && data.metrics[key]) || { label: key, value: '—', raw: 0, note: '', source: '' };
  }

  function rawMetric(data, key) {
    var m = metric(data, key);
    var n = Number(m.raw);
    return isFinite(n) ? n : 0;
  }

  function fmtMoney(value) {
    var n = Number(value);
    if (!isFinite(n)) return '€0.00';
    try { return '€' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    catch (e) { return '€' + n.toFixed(2); }
  }

  function parseMoneyLabel(value) {
    var n = Number(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function snapshotItem(data, label) {
    var rows = ((data.sections || {}).snapshot || []);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].label === label) return rows[i];
    }
    return null;
  }

  function nowLabel() {
    try { return new Date().toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return new Date().toLocaleString(); }
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function findAdminName() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll('.user-name, .dropdown-user, .admin-user, [class*="user"]'));
    for (var i = 0; i < candidates.length; i++) {
      var t = (candidates[i].innerText || candidates[i].textContent || '').trim();
      if (t && t.length < 40 && !/Dashboard|Orders|Reservations|System/i.test(t)) return t.split('\n')[0].trim();
    }
    return 'Chef Admin';
  }


  var ROLE_ORDER = ['owner', 'manager', 'kds', 'cashier', 'counter', 'waiter'];
  var ROLE_LABELS = {
    owner: 'Owner',
    manager: 'Manager',
    kds: 'KDS',
    cashier: 'Cashier',
    counter: 'Counter',
    reception: 'Counter',
    waiter: 'Waiter'
  };
  var ROLE_INTRO = {
    owner: 'Full restaurant performance dashboard',
    manager: 'Operations, floor, kitchen and team dashboard',
    kds: 'Kitchen queue and preparation dashboard',
    cashier: 'Checkout, open checks and payment dashboard',
    counter: 'Phone bookings, walk-ins, reservations and table availability',
    reception: 'Phone bookings, walk-ins, reservations and table availability',
    waiter: 'Service floor and assigned table dashboard'
  };

  function normalizeRole(value) {
    value = String(value || '').toLowerCase().trim();
    if (/owner|admin|chef/.test(value)) return 'owner';
    if (/manager/.test(value)) return 'manager';
    if (/kds|kitchen/.test(value)) return 'kds';
    if (/cashier|cash|pos/.test(value)) return 'cashier';
    if (/counter|reception|reservation|booking|host/.test(value)) return 'counter';
    if (/waiter|server|service/.test(value)) return 'waiter';
    return ROLE_ORDER.indexOf(value) >= 0 ? value : '';
  }

  function detectedRoleFromDom() {
    var text = '';
    var profile = document.querySelector('.profile-dropdown-menu, .pmd-topbar-user-item, .navbar-profile-avatar');
    if (profile) text += ' ' + (profile.innerText || profile.textContent || profile.getAttribute('alt') || '');
    var bodyRole = document.body && (document.body.getAttribute('data-role') || document.body.getAttribute('data-staff-role') || '');
    text += ' ' + bodyRole;
    return normalizeRole(text) || 'owner';
  }

  function canSwitchRoles() {
    var actual = detectedRoleFromDom();
    return actual === 'owner' || actual === 'manager';
  }

  function getStoredRole() {
    try { return normalizeRole(window.localStorage.getItem('PMD_DASHBOARD_ROLE') || ''); }
    catch (e) { return ''; }
  }

  function storeRole(role) {
    try { window.localStorage.setItem('PMD_DASHBOARD_ROLE', role); }
    catch (e) {}
  }

  function getUrlRole() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return normalizeRole(params.get('pmd_role') || params.get('role') || params.get('dashboard_role') || '');
    } catch (e) { return ''; }
  }

  function getActiveRole() {
    if (selectedRole) return selectedRole;
    var actual = detectedRoleFromDom();
    if (canSwitchRoles()) selectedRole = getUrlRole() || getStoredRole() || actual || 'owner';
    else selectedRole = actual || 'owner';
    if (ROLE_ORDER.indexOf(selectedRole) < 0) selectedRole = 'owner';
    return selectedRole;
  }

  function roleLabel(role) { return ROLE_LABELS[role] || 'Owner'; }

  function roleTabs(active, mode) {
    if (!canSwitchRoles()) return '';
    return '<div class="pmd-v21-role-tabs pmd-v21-role-tabs--' + esc(mode || 'native') + '" role="tablist" aria-label="Dashboard role views">' + ROLE_ORDER.map(function (role) {
      return '<button type="button" class="' + (role === active ? 'is-active' : '') + '" data-pmd-role-tab="' + esc(role) + '">' + esc(roleLabel(role)) + '</button>';
    }).join('') + '</div>';
  }

  function setDashboardRole(role) {
    role = normalizeRole(role) || 'owner';
    selectedRole = role;
    if (canSwitchRoles()) storeRole(role);
    if (lastData) render(lastData);
  }

  function applyRoleChrome(role) {
    var roles = ROLE_ORDER.map(function (r) { return 'pmd-v21-role-' + r; });
    document.body.classList.remove.apply(document.body.classList, roles);
    document.documentElement.classList.remove.apply(document.documentElement.classList, roles);
    document.body.classList.add('pmd-v21-role-' + role);
    document.documentElement.classList.add('pmd-v21-role-' + role);
    document.body.classList.toggle('pmd-v21-waiter-clean-mode', role === 'waiter');
    document.documentElement.classList.toggle('pmd-v21-waiter-clean-mode', role === 'waiter');
  }

  function bindRoleTabs(scope) {
    if (!scope) return;
    scope.querySelectorAll('[data-pmd-role-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setDashboardRole(btn.getAttribute('data-pmd-role-tab')); });
    });
  }

  function syncNativeRoleTabs(active) {
    var id = 'pmd-v21-native-role-tabs';
    var old = document.getElementById(id);
    if (!canSwitchRoles() || active === 'waiter') {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }
    var pageTitle = document.querySelector('.page-title');
    if (!pageTitle || !pageTitle.parentNode) return;
    var wrap = old || document.createElement('div');
    wrap.id = id;
    wrap.innerHTML = roleTabs(active, 'native');
    if (!old) pageTitle.parentNode.insertBefore(wrap, pageTitle.nextSibling);
    bindRoleTabs(wrap);
  }

  function customKpi(label, value, icon, note, tone) {
    return '' +
      '<article class="pmd-v15-kpi pmd-v15-kpi--' + esc(tone || 'neutral') + '">' +
        '<div class="pmd-v15-kpi-icon">' + esc(icon) + '</div>' +
        '<div class="pmd-v15-kpi-copy">' +
          '<span>' + esc(label) + '</span>' +
          '<strong>' + esc(value == null ? '—' : value) + '</strong>' +
          '<small>' + esc(note || '') + '</small>' +
        '</div>' +
      '</article>';
  }

  function dashboardHeader(data, role) {
    var title = role === 'owner' ? (greeting() + ', ' + findAdminName() + '! 👋') : (roleLabel(role) + ' Dashboard');
    var subtitle = role === 'owner' ? 'Here\'s what\'s happening at <b>Mimoza / PayMyDine</b>' : ROLE_INTRO[role];
    return '' +
      '<header class="pmd-v15-topbar pmd-v19-topbar pmd-v21-topbar">' +
        '<div><h1>' + esc(title) + '</h1><p>' + subtitle + '</p>' + (role === 'waiter' ? roleTabs(role, 'inline') : '') + '</div>' +
        '<div class="pmd-v15-top-controls"><span>📅 Today · ' + esc(nowLabel()) + '</span><span>🍽️ Dinner Shift · Live</span></div>' +
      '</header>';
  }

  function kpiGrid(data, role) {
    var s = data.sections || {};
    var snapshot = s.snapshot || [];
    var totalRevenue = snapshot.filter(function (x) { return x.label === 'Total Revenue'; })[0];
    var openChecks = snapshot.filter(function (x) { return x.label === 'Open Checks'; })[0];
    var kitchen = s.kitchen || {};
    var pending = metric(data, 'unpaid');
    if (role === 'kds') {
      return customKpi('Kitchen Queue', metric(data, 'kitchen_queue').value, '👨‍🍳', metric(data, 'kitchen_queue').note, 'orange') +
        customKpi('Ready', String(kitchen.ready || 0), '✅', 'ready order/item rows', 'green') +
        topKpi(data, 'open_orders', '🧾', metric(data, 'open_orders').note, 'blue') +
        customKpi('KDS Stations', String(kitchen.stations || 0), '🖥️', 'connected kitchen displays', 'purple');
    }
    if (role === 'cashier') {
      return topKpi(data, 'unpaid', '💳', pending.note, 'orange') +
        topKpi(data, 'open_orders', '🧾', (openChecks ? (openChecks.value + ' open checks') : metric(data, 'open_orders').note), 'blue') +
        topKpi(data, 'revenue_today', '💵', (totalRevenue ? ('All-time ' + totalRevenue.value) : metric(data, 'revenue_today').note), 'green') +
        topKpi(data, 'active_tables', '🍽️', 'Current visible busy tables', 'purple');
    }
    if (role === 'counter' || role === 'reception') {
      return topKpi(data, 'reservations_today', '📅', metric(data, 'reservations_today').note, 'purple') +
        topKpi(data, 'active_tables', '🍽️', 'Current visible busy tables', 'blue') +
        topKpi(data, 'waiter_calls', '🔔', metric(data, 'waiter_calls').note, 'orange') +
        topKpi(data, 'customers_today', '👥', metric(data, 'customers_today').note, 'green');
    }
    if (role === 'waiter') {
      return topKpi(data, 'active_tables', '🍽️', 'Tables needing service/payment', 'blue') +
        topKpi(data, 'open_orders', '🧾', metric(data, 'open_orders').note, 'orange') +
        topKpi(data, 'waiter_calls', '🔔', metric(data, 'waiter_calls').note, 'purple') +
        topKpi(data, 'kitchen_queue', '👨‍🍳', metric(data, 'kitchen_queue').note, 'green');
    }
    return topKpi(data, 'revenue_today', '💵', (totalRevenue ? ('All-time ' + totalRevenue.value) : metric(data, 'revenue_today').note), 'green') +
      topKpi(data, 'open_orders', '🧾', (openChecks ? (openChecks.value + ' open checks') : metric(data, 'open_orders').note), 'orange') +
      topKpi(data, 'active_tables', '🍽️', 'Current visible busy tables', 'blue') +
      topKpi(data, 'reservations_today', '📅', metric(data, 'reservations_today').note, 'purple');
  }

  function section(title, subtitle, inner, cls, action) {
    return '' +
      '<section class="pmd-v15-card ' + esc(cls || '') + '">' +
        '<header class="pmd-v15-card-head">' +
          '<div><h2>' + esc(title) + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>' +
          (action || '') +
        '</header>' +
        '<div class="pmd-v15-card-body">' + inner + '</div>' +
      '</section>';
  }

  function topKpi(data, key, icon, meta, tone) {
    var m = metric(data, key);
    var value = m.value == null ? '—' : m.value;
    var displayLabel = m.label;
    if (key === 'open_orders') displayLabel = 'Open Checks';
    if (key === 'active_tables') displayLabel = 'Active Tables';
    return '' +
      '<article class="pmd-v15-kpi pmd-v15-kpi--' + esc(tone || 'neutral') + '">' +
        '<div class="pmd-v15-kpi-icon">' + esc(icon) + '</div>' +
        '<div class="pmd-v15-kpi-copy">' +
          '<span>' + esc(displayLabel) + '</span>' +
          '<strong>' + esc(value) + '</strong>' +
          '<small>' + esc(meta || m.note || m.source || '') + '</small>' +
        '</div>' +
      '</article>';
  }

  function miniStat(label, value, note, tone) {
    return '<div class="pmd-v15-mini-stat pmd-v15-mini-stat--' + esc(tone || 'neutral') + '"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(note || '') + '</small></div>';
  }

  function empty(text) {
    return '<div class="pmd-v15-empty">' + esc(text || 'No live rows detected yet.') + '</div>';
  }

  function barList(items, labelKey, valueKey, limit) {
    items = (items || []).slice(0, limit || 6);
    if (!items.length) return empty('No connected item rows to show yet.');
    var max = 1;
    items.forEach(function (x) { max = Math.max(max, Number(x[valueKey || 'count'] || 0)); });
    return '<div class="pmd-v15-bars">' + items.map(function (x, idx) {
      var val = Number(x[valueKey || 'count'] || 0);
      var pct = Math.max(4, Math.min(100, Math.round(val / max * 100)));
      return '' +
        '<div class="pmd-v15-bar-row">' +
          '<div class="pmd-v15-bar-label"><span><b>' + esc(idx + 1) + '</b>' + esc(x[labelKey || 'label'] || 'Item') + '</span><strong>' + esc(val) + '</strong></div>' +
          '<div class="pmd-v15-bar-track"><i style="width:' + pct + '%"></i></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function sparklineFromOrders(rows) {
    rows = (rows || []).slice().reverse();
    var values = rows.map(function (r) { return Number(r.total || 0); }).filter(function (n) { return isFinite(n); });
    if (!values.length) values = [0,0,0,0,0,0];
    while (values.length < 6) values.unshift(0);
    values = values.slice(-10);
    var max = Math.max.apply(null, values.concat([1]));
    var points = values.map(function (v, i) {
      var x = 8 + (i * (184 / Math.max(1, values.length - 1)));
      var y = 78 - ((v / max) * 58);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '' +
      '<svg class="pmd-v15-spark" viewBox="0 0 200 90" aria-hidden="true">' +
        '<defs><linearGradient id="pmdV15Spark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs>' +
        '<polyline points="' + esc(points) + '" fill="none" stroke="url(#pmdV15Spark)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function donut(percent, center) {
    var p = Math.max(0, Math.min(100, Number(percent) || 0));
    return '' +
      '<div class="pmd-v15-donut" style="--p:' + p + '">' +
        '<div><strong>' + esc(center || (Math.round(p) + '%')) + '</strong><small>Total</small></div>' +
      '</div>';
  }

  function floorPlan(fp) {
    fp = fp || { floors: [], tables: [], summary: {} };
    var floors = fp.floors || [];
    var tables = fp.tables || [];
    if (!floors.length) return empty('No floor-plan tables detected yet.');
    var activeFloor = selectedFloorId || fp.default_floor_id || floors[0].id;
    var floor = floors.filter(function (f) { return String(f.id) === String(activeFloor); })[0] || floors[0];
    activeFloor = floor.id;
    var floorTables = tables.filter(function (t) { return String(t.floor_id) === String(activeFloor); });
    var width = Number(floor.width || 1000), height = Number(floor.height || 560);
    var summary = fp.summary || {};
    var legend = [
      ['free', 'Available', summary.free || 0],
      ['active', 'Dining', summary.active || 0],
      ['reserved', 'Reserved', summary.reserved || 0],
      ['unpaid', 'Waiting Payment', summary.unpaid || 0],
      ['attention', 'Attention', summary.attention || 0],
      ['ready', 'Ready', summary.ready || 0]
    ];
    var floorTabs = floors.map(function (f) {
      return '<button type="button" class="' + (String(f.id) === String(activeFloor) ? 'is-active' : '') + '" data-pmd-floor="' + esc(f.id) + '">' + esc(f.label || 'Floor') + '<b>' + esc(f.tables || 0) + '</b></button>';
    }).join('');
    var nodes = floorTables.map(function (t) {
      var left = Math.max(0, Math.min(96, Number(t.x || 0) / width * 100));
      var top = Math.max(0, Math.min(92, Number(t.y || 0) / height * 100));
      var w = Math.max(10, Math.min(22, Number(t.width || 120) / width * 100));
      var h = Math.max(9, Math.min(18, Number(t.height || 70) / height * 100));
      var nodeLabel = (t.number || t.label || t.id);
      var title = t.label || ('Table ' + (t.number || t.id));
      var statusLabel = t.status_label || t.status || 'free';
      var meta = t.due_amount > 0 ? (t.due_label || fmtMoney(t.due_amount)) : (t.reservation && t.reservation.next_time ? t.reservation.next_time : '');
      return '' +
        '<button type="button" title="' + esc(title) + '" data-pmd-table="' + esc(t.id) + '" class="pmd-v15-floor-node pmd-v15-floor-node--' + esc(t.status || 'free') + (String(t.id) === String(selectedTableId) ? ' is-selected' : '') + '" style="left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%">' +
          '<span class="pmd-v15-node-number">' + esc(nodeLabel) + '</span>' +
          '<span class="pmd-v15-node-pill">' + esc(statusLabel) + '</span>' +
          (meta ? '<em>' + esc(meta) + '</em>' : '') +
        '</button>';
    }).join('');
    return '' +
      '<div class="pmd-v15-floor-tools"><div class="pmd-v15-floor-tabs">' + floorTabs + '</div><div class="pmd-v15-floor-legend">' + legend.map(function (l) { return '<span class="pmd-v15-dot-' + esc(l[0]) + '"><i></i>' + esc(l[1]) + ' <b>' + esc(l[2]) + '</b></span>'; }).join('') + '</div></div>' +
      '<div class="pmd-v15-floor-wrap pmd-v15-floor-wrap--reference">' +
        '<div class="pmd-v15-floor-canvas"><div class="pmd-v15-floor-bg"></div>' + nodes + '</div>' +
      '</div>';
  }

  function tableSide(t) {
    var rows = [
      ['Status', t.status_label || t.status || 'Free'],
      ['Capacity', t.capacity_label || '—'],
      ['Open checks', Math.max(Number(t.open_orders || 0), Number(t.due_count || 0))],
      ['Ready', t.ready || 0],
      ['Due', t.due_label || fmtMoney(t.due_amount || 0)],
      ['Waiter calls', t.waiter_calls || 0],
      ['Reservation', t.reservation && t.reservation.count ? ((t.reservation.guest_name || 'Reserved') + ' · ' + (t.reservation.next_time || 'today')) : 'None today'],
      ['Section', t.section || 'main']
    ].map(function (r) { return '<div class="pmd-v15-side-row"><span>' + esc(r[0]) + '</span><strong>' + esc(r[1]) + '</strong></div>'; }).join('');
    return '' +
      '<div class="pmd-v15-table-card pmd-v15-table-card--' + esc(t.status || 'free') + '">' +
        '<header><strong>' + esc(t.label || ('Table ' + t.id)) + '</strong><small>' + esc(t.floor_name || 'Main Floor') + '</small></header>' +
        rows +
        '<footer><a href="' + esc(t.create_order_url || '/admin/orders/create') + '">New Order</a><a href="' + esc(t.edit_url || '#') + '">Edit Table</a></footer>' +
      '</div>';
  }

  function alerts(data) {
    var items = (((data.sections || {}).alerts || {}).items || []).slice(0, 6);
    if (!items.length) return empty('No critical AI-style operational alerts detected right now.');
    return '<div class="pmd-v15-alerts">' + items.map(function (a) {
      return '<a class="pmd-v15-alert pmd-v15-alert--' + esc(a.level || 'info') + '" href="' + esc(a.url || '#') + '"><i>⚠</i><div><strong>' + esc(a.title || 'Alert') + '</strong><small>' + esc(a.note || '') + '</small></div><b>' + esc(a.value || '') + '</b></a>';
    }).join('') + '</div>';
  }

  function timeline(data) {
    var s = data.sections || {};
    var orders = (s.recent_orders || []).slice(0, 5).map(function (o) {
      return { time: o.created_at || '', title: 'Order #' + (o.id || '—'), note: (o.table_label || 'No table') + ' · ' + (o.total_label || fmtMoney(o.total || 0)), tone: 'order', url: o.edit_url || '/admin/orders' };
    });
    var reservations = (s.upcoming_reservations || []).slice(0, 3).map(function (r) {
      return { time: [r.reserve_date, r.reserve_time].filter(Boolean).join(' '), title: r.guest_name || 'Reservation', note: (r.guests || '—') + ' guests' + (r.table_ref ? ' · Table ' + r.table_ref : ''), tone: 'reserve', url: '/admin/reservations' };
    });
    var rows = orders.concat(reservations).slice(0, 7);
    if (!rows.length) return empty('No order or reservation timeline rows detected yet.');
    return '<div class="pmd-v15-timeline">' + rows.map(function (r) {
      return '<a href="' + esc(r.url) + '" class="pmd-v15-timeline-row pmd-v15-timeline-row--' + esc(r.tone) + '"><span>' + esc(r.time || 'Live') + '</span><i></i><div><strong>' + esc(r.title) + '</strong><small>' + esc(r.note) + '</small></div></a>';
    }).join('') + '</div>';
  }

  function listRows(rows, type) {
    rows = rows || [];
    if (!rows.length) return empty(type === 'reservation' ? 'No upcoming reservations detected.' : 'No live order rows detected.');
    return '<div class="pmd-v15-list">' + rows.slice(0, 6).map(function (row) {
      if (type === 'reservation') {
        return '<a href="/admin/reservations" class="pmd-v15-list-row"><div><strong>' + esc(row.guest_name || 'Reservation') + '</strong><small>' + esc([row.reserve_date, row.reserve_time].filter(Boolean).join(' ') + (row.table_ref ? ' · Table ' + row.table_ref : '')) + '</small></div><span>' + esc(row.guests || '—') + '</span></a>';
      }
      return '<a href="' + esc(row.edit_url || '/admin/orders') + '" class="pmd-v15-list-row"><div><strong>Order #' + esc(row.id || '—') + '</strong><small>' + esc((row.table_label || 'No table') + ' · ' + (row.status_label || row.status || '—') + ' · ' + (row.customer_label || 'Guest')) + '</small></div><span>' + esc(row.total_label || fmtMoney(row.total || 0)) + '</span></a>';
    }).join('') + '</div>';
  }

  function revenueByHour(data) {
    var orders = ((data.sections || {}).recent_orders || []);
    var todayRevenue = rawMetric(data, 'revenue_today');
    var totalRevenue = ((data.sections || {}).snapshot || []).filter(function (x) { return x.label === 'Total Revenue'; })[0];
    return '' +
      '<div class="pmd-v15-chart-head"><strong>' + esc(metric(data, 'revenue_today').value || '€0.00') + '</strong><small>today · recent live order trend below</small></div>' +
      sparklineFromOrders(orders) +
      '<div class="pmd-v15-chart-note">All-time context: ' + esc(totalRevenue ? totalRevenue.value : fmtMoney(todayRevenue)) + '</div>';
  }

  function paymentBreakdown(data) {
    var pending = rawMetric(data, 'unpaid');
    var paidToday = (((data.sections || {}).payment || {}).paid_today_raw || 0);
    var total = Math.max(1, pending + paidToday);
    var pctPaid = (paidToday / total) * 100;
    return '<div class="pmd-v15-payment-grid">' + donut(pctPaid, fmtMoney(pending + paidToday)) + '<div class="pmd-v15-payment-lines">' +
      '<div><i class="pmd-v15-pay-open"></i><span>Open / pending</span><b>' + esc(fmtMoney(pending)) + '</b></div>' +
      '<div><i class="pmd-v15-pay-paid"></i><span>Paid today</span><b>' + esc(fmtMoney(paidToday)) + '</b></div>' +
      '<small>Payment table is empty; showing current open-check value.</small>' +
      '</div></div>';
  }

  function smallFinance(data) {
    var totalRevenue = snapshotItem(data, 'Total Revenue');
    var totalOrders = snapshotItem(data, 'Total Orders');
    var pending = metric(data, 'unpaid');
    var todayAvg = metric(data, 'avg_ticket');
    var allRevenue = parseMoneyLabel(totalRevenue && totalRevenue.value);
    var allOrders = Number(totalOrders && totalOrders.value || 0);
    var allAvg = allOrders > 0 ? (allRevenue / allOrders) : 0;
    var avgLabel = rawMetric(data, 'avg_ticket') > 0 ? todayAvg.value : fmtMoney(allAvg);
    var avgNote = rawMetric(data, 'avg_ticket') > 0 ? 'Average order value today' : 'All-time average because today has no completed orders';
    return '' +
      '<div class="pmd-v15-small-finance"><strong>' + esc(avgLabel) + '</strong><span>Average Check Value</span><small>' + esc(avgNote) + '</small></div>' +
      '<div class="pmd-v15-small-finance pmd-v15-small-finance--risk"><strong>' + esc(pending.value || '€0.00') + '</strong><span>Open Check Value</span><small>' + esc(pending.note || 'Open unpaid checks; transaction payments table is empty') + '</small></div>';
  }

  function kitchenPerformance(data) {
    var q = metric(data, 'kitchen_queue');
    var s = (data.sections || {}).kitchen || {};
    var delayed = Number(s.delayed || 0);
    var onTime = Number(s.on_time_rate == null ? 100 : s.on_time_rate);
    return '' +
      '<div class="pmd-v15-kitchen-metrics pmd-v19-kitchen-metrics">' +
        miniStat('Avg Prep Time', s.avg_prep_label || '—', 'from prep estimate when available', 'green') +
        miniStat('Delayed Orders', String(delayed), delayed ? 'needs attention' : 'no delayed rows detected', 'orange') +
        miniStat('On-time Rate', String(onTime) + '%', 'estimated from open kitchen rows', 'blue') +
      '</div>' +
      '<div class="pmd-v15-kitchen-metrics pmd-v19-kitchen-mini">' +
        miniStat('Kitchen Queue', q.value || '0', q.note || '', 'orange') +
        miniStat('Ready', String(s.ready || 0), 'ready order/item rows', 'green') +
        miniStat('KDS Stations', String(s.stations || 0), 'connected kitchen displays', 'blue') +
      '</div>' +
      '<div class="pmd-v15-rush"><span>Rush Status</span><b>' + (Number(q.raw || 0) > 8 || delayed > 0 ? 'High' : (Number(q.raw || 0) > 0 ? 'Medium' : 'Calm')) + '</b></div>';
  }

  function quickActions(role) {
    role = role || getActiveRole();
    var map = {
      owner: [
        ['Walk-in', '/admin/reservations/create', '👥'],
        ['New Order', '/admin/orders/create', '🧾'],
        ['Split Bill', '/admin/orders', '💳'],
        ['Send Message', '/admin/notifications', '💬']
      ],
      manager: [
        ['Walk-in', '/admin/reservations/create', '👥'],
        ['New Order', '/admin/orders/create', '🧾'],
        ['Open Checks', '/admin/orders', '💳'],
        ['Kitchen', '/admin/kitchendisplay/main-kitchen', '👨‍🍳']
      ],
      kds: [
        ['Kitchen', '/admin/kitchendisplay/main-kitchen', '👨‍🍳'],
        ['Open Checks', '/admin/orders', '🧾'],
        ['Top Items', '/admin/orders', '🍽️'],
        ['Messages', '/admin/notifications', '💬']
      ],
      cashier: [
        ['New Order', '/admin/orders/create', '🧾'],
        ['Open Checks', '/admin/orders', '💳'],
        ['Split Bill', '/admin/orders', '➗'],
        ['Cash Drawer', '/admin/cash_drawers', '💵']
      ],
      counter: [
        ['New Reservation', '/admin/reservations/create', '📅'],
        ['All Reservations', '/admin/reservations', '📋'],
        ['New Order', '/admin/orders/create', '🧾'],
        ['Messages', '/admin/notifications', '💬']
      ],
      reception: [
        ['New Reservation', '/admin/reservations/create', '📅'],
        ['All Reservations', '/admin/reservations', '📋'],
        ['New Order', '/admin/orders/create', '🧾'],
        ['Messages', '/admin/notifications', '💬']
      ],
      waiter: [
        ['New Order', '/admin/orders/create', '🧾'],
        ['Open Checks', '/admin/orders', '💳'],
        ['Kitchen', '/admin/kitchendisplay/main-kitchen', '👨‍🍳'],
        ['Send Message', '/admin/notifications', '💬']
      ]
    };
    var items = map[role] || map.owner;
    return '<div class="pmd-v15-actions pmd-v15-actions--reference">' + items.map(function (i) { return '<a href="' + esc(i[1]) + '"><span>' + esc(i[2]) + '</span><b>' + esc(i[0]) + '</b></a>'; }).join('') + '</div>';
  }

  function lostRevenue(data) {
    var pending = rawMetric(data, 'unpaid');
    var operations = (data.sections || {}).operations || {};
    var noShows = Number(operations.no_shows || 0);
    var cancelled = Number(operations.cancelled_orders || 0);
    return '' +
      '<div class="pmd-v15-lost-grid">' +
        '<div><strong>' + esc(fmtMoney(0)) + '</strong><small>confirmed lost revenue today</small></div>' +
        '<ul>' +
          '<li><i></i><span>No shows</span><b>' + esc(fmtMoney(noShows)) + '</b></li>' +
          '<li><i></i><span>Cancelled orders</span><b>' + esc(fmtMoney(cancelled)) + '</b></li>' +
          '<li><i></i><span>Open check risk</span><b>' + esc(fmtMoney(pending)) + '</b></li>' +
        '</ul>' +
      '</div>';
  }


  function waiterOrderCards(data) {
    var rows = (((data.sections || {}).recent_orders || []) || []);
    var current = rows.filter(function (o) { return o && o.table_match === 'current'; });
    var serviceRows = current.length ? current : rows.filter(function (o) { return o && o.table_match !== 'service'; });
    serviceRows = serviceRows.slice(0, 8);
    if (!serviceRows.length) return empty('No active table orders assigned to service right now.');
    return '<div class="pmd-v21-waiter-order-grid">' + serviceRows.map(function (o) {
      var id = o.id || '—';
      var editUrl = o.edit_url || ('/admin/orders/edit/' + encodeURIComponent(id));
      var table = o.table_label || 'Table';
      var status = o.status_label || 'Open';
      var customer = o.customer_label || 'Guest';
      var total = o.total_label || fmtMoney(o.total || 0);
      var legacy = o.table_match === 'legacy';
      return '' +
        '<article class="pmd-v21-waiter-order-card ' + (legacy ? 'is-legacy' : '') + '">' +
          '<header>' +
            '<div><span>' + esc(table) + '</span><strong>Order #' + esc(id) + '</strong></div>' +
            '<b>' + esc(total) + '</b>' +
          '</header>' +
          '<div class="pmd-v21-waiter-order-meta">' +
            '<span><i>Status</i><b>' + esc(status) + '</b></span>' +
            '<span><i>Guest</i><b>' + esc(customer) + '</b></span>' +
            '<span><i>Type</i><b>' + esc(legacy ? 'Old table ref' : 'Current floor table') + '</b></span>' +
          '</div>' +
          '<footer>' +
            waiterButton('Edit', 'order-edit', 'data-order-id="' + esc(id) + '"', 'is-primary') +
            waiterButton('Add items', 'order-add-items', 'data-order-id="' + esc(id) + '"', '') +
            waiterButton('Status', 'order-status', 'data-order-id="' + esc(id) + '"', '') +
            waiterButton('Print', 'order-print', 'data-order-id="' + esc(id) + '"', '') +
          '</footer>' +
        '</article>';
    }).join('') + '</div>';
  }


  function floorTables(data) {
    return (((data.sections || {}).floor_plan || {}).tables || []);
  }

  function floorTableById(data, id) {
    var rows = floorTables(data);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === String(id) || String(rows[i].table_id) === String(id)) return rows[i];
    }
    return null;
  }

  function tableKeys(t) {
    if (!t) return [];
    return [t.id, t.table_id, t.number, t.label, t.name, String(t.label || '').replace(/^Table\s+/i, '')]
      .map(function (x) { return String(x == null ? '' : x).toLowerCase().trim(); })
      .filter(function (x, i, arr) { return x && arr.indexOf(x) === i; });
  }

  function ordersForTable(data, t) {
    var keys = tableKeys(t);
    var rows = ((data.sections || {}).recent_orders || []);
    return rows.filter(function (o) {
      if (!o) return false;
      var ref = String(o.table_ref == null ? '' : o.table_ref).toLowerCase().trim();
      var label = String(o.table_label || '').toLowerCase().trim();
      return keys.indexOf(ref) >= 0 || label === String(t && t.label || '').toLowerCase().trim();
    });
  }

  function selectedWaiterTable(data) {
    var rows = floorTables(data);
    if (!rows.length) return null;
    var found = selectedTableId ? floorTableById(data, selectedTableId) : null;
    if (found) return found;
    for (var i = 0; i < rows.length; i++) {
      if (['unpaid','attention','ready','active'].indexOf(String(rows[i].status || '').toLowerCase()) >= 0) return rows[i];
    }
    return rows[0];
  }

  function menuInventory(data) {
    return ((data.sections || {}).menu_inventory || { menus: [], categories: [] });
  }

  function menuPrice(row) {
    var n = Number(row && row.price);
    return isFinite(n) ? fmtMoney(n) : '€0.00';
  }

  function waiterButton(label, action, attrs, tone) {
    attrs = attrs || '';
    return '<button type="button" class="pmd-v23-action-btn ' + esc(tone || '') + '" data-pmd-waiter-action="' + esc(action) + '" ' + attrs + '>' + esc(label) + '</button>';
  }

  function waiterMenuBrowser(data, table) {
    var inv = menuInventory(data);
    var cats = (inv.categories || []).slice(0, 10);
    var menus = (inv.menus || []).slice(0, 18);
    if (!menus.length) return empty('No menu items detected yet.');
    var catHtml = cats.length ? '<div class="pmd-v23-menu-cats">' + cats.map(function (c) { return '<span>' + esc(c.name || c.label || 'Category') + '</span>'; }).join('') + '</div>' : '';
    var cards = menus.map(function (m) {
      var id = m.id || m.menu_id || m.name;
      return '<article class="pmd-v23-menu-item"><div><strong>' + esc(m.name || 'Food item') + '</strong><small>' + esc(menuPrice(m)) + '</small></div>' + waiterButton('Add', 'add-item', 'data-menu-id="' + esc(id) + '" data-menu-name="' + esc(m.name || 'Item') + '" data-menu-price="' + esc(Number(m.price || 0)) + '"', 'is-small') + '</article>';
    }).join('');
    return catHtml + '<div class="pmd-v23-menu-grid">' + cards + '</div>';
  }

  function waiterDraftPanel(table) {
    var items = waiterDraft.items || [];
    var total = items.reduce(function (sum, x) { return sum + Number(x.price || 0); }, 0);
    var list = items.length ? items.map(function (x, idx) { return '<li><span>' + esc(x.name) + '</span><b>' + esc(fmtMoney(x.price || 0)) + '</b><button type="button" data-pmd-waiter-action="remove-draft-item" data-draft-index="' + idx + '">×</button></li>'; }).join('') : '<li class="is-empty">No draft items selected yet.</li>';
    return '<div class="pmd-v23-draft-box"><header><div><strong>Draft for ' + esc(table ? table.label : 'table') + '</strong><small>In-dashboard order builder</small></div><b>' + esc(fmtMoney(total)) + '</b></header><ul>' + list + '</ul><footer>' + waiterButton('Send to kitchen', 'send-draft', '', 'is-primary') + waiterButton('Clear', 'clear-draft', '', '') + '</footer></div>';
  }

  function waiterOrderActionCard(order) {
    if (!order) return '';
    var id = order.id || '—';
    return '<article class="pmd-v23-service-order-card" data-order-id="' + esc(id) + '">' +
      '<header><div><span>' + esc(order.table_label || 'Table') + '</span><strong>Order #' + esc(id) + '</strong></div><b>' + esc(order.total_label || fmtMoney(order.total || 0)) + '</b></header>' +
      '<div class="pmd-v23-service-order-meta"><span><i>Status</i><b>' + esc(order.status_label || 'Open') + '</b></span><span><i>Guest</i><b>' + esc(order.customer_label || 'Guest') + '</b></span><span><i>Table</i><b>' + esc(order.table_match === 'legacy' ? 'Old ref' : 'Current') + '</b></span></div>' +
      '<footer>' +
        waiterButton('Edit', 'order-edit', 'data-order-id="' + esc(id) + '"', 'is-primary') +
        waiterButton('Add items', 'order-add-items', 'data-order-id="' + esc(id) + '"', '') +
        waiterButton('Status', 'order-status', 'data-order-id="' + esc(id) + '"', '') +
        waiterButton('Print', 'order-print', 'data-order-id="' + esc(id) + '"', '') +
      '</footer>' +
    '</article>';
  }

  function waiterTableWorkspace(data) {
    var table = selectedWaiterTable(data);
    if (!table) return empty('No service table detected yet.');
    selectedTableId = selectedTableId || table.id;
    if (waiterDraft.tableId !== table.id) waiterDraft = { tableId: table.id, items: [] };
    var orders = ordersForTable(data, table).slice(0, 4);
    var status = String(table.status || 'free').toLowerCase();
    var isFree = !orders.length && ['free','reserved'].indexOf(status) >= 0;
    var head = '<div class="pmd-v23-workspace-head pmd-v23-workspace-head--' + esc(status) + '"><div><span>' + esc(table.floor_name || 'Main Floor') + '</span><strong>' + esc(table.label || ('Table ' + table.id)) + '</strong><small>' + esc((table.capacity_label || '—') + ' · ' + (table.status_label || status)) + '</small></div><b>' + esc(table.due_label || fmtMoney(table.due_amount || 0)) + '</b></div>';
    var body = '';
    if (isFree) {
      body = '<div class="pmd-v23-workspace-split"><div><h3>Start order from menu</h3><p>Free table: choose food items here without leaving waiter dashboard.</p>' + waiterMenuBrowser(data, table) + '</div>' + waiterDraftPanel(table) + '</div>';
    } else {
      body = '<div class="pmd-v23-workspace-split"><div><h3>Current table order(s)</h3><p>Busy table: edit, add items, update status or print from here.</p><div class="pmd-v23-service-order-list">' + (orders.length ? orders.map(waiterOrderActionCard).join('') : empty('No order rows matched this table yet.')) + '</div></div><div><h3>Add more items</h3>' + waiterMenuBrowser(data, table) + waiterDraftPanel(table) + '</div></div>';
    }
    return '<div class="pmd-v23-waiter-workspace">' + head + body + '</div>';
  }

  function showWaiterMessage(title, text) {
    activeWaiterPanel = { title: title || 'Action', text: text || '' };
    render(lastData);
  }

  function waiterActionNotice() {
    if (!activeWaiterPanel) return '';
    return '<div class="pmd-v23-action-notice"><div><strong>' + esc(activeWaiterPanel.title || 'Action') + '</strong><small>' + esc(activeWaiterPanel.text || '') + '</small></div><button type="button" data-pmd-waiter-action="close-notice">Close</button></div>';
  }

  function dataProof(data) {
    var s = data.sections || {};
    var diag = s.table_diagnostics || {};
    var conn = (s.connections || []).filter(function (c) { return c.connected; });
    var chips = conn.slice(0, 18).map(function (c) { return '<span><b>' + esc(c.label || c.key) + '</b>' + esc(c.table || '') + ' · ' + esc(c.count == null ? '—' : c.count) + '</span>'; }).join('');
    var unmatched = (diag.unmatched_open_refs || []).map(function (r) { return '<li>Ref ' + esc(r.order_type || '—') + ' · ' + esc(r.open_orders || 0) + ' open · latest #' + esc(r.latest_order || '—') + '</li>'; }).join('');
    return '' +
      '<details class="pmd-v15-proof"><summary>Audit / data proof — developer only</summary>' +
        '<div class="pmd-v15-proof-grid">' +
          miniStat('Current floor tables', diag.current_table_count || 0, 'from ti_tables') +
          miniStat('Service rows', diag.service_table_count || 0, 'Cashier / Delivery separated') +
          miniStat('Matched open refs', diag.matched_open_current_tables || 0, 'order_type → table_id') +
          miniStat('Unmapped refs', (diag.unmatched_open_refs || []).length, 'shown, not hidden') +
        '</div>' +
        (unmatched ? '<h3>Unmapped open order refs</h3><ul>' + unmatched + '</ul>' : '') +
        '<h3>Connected tables</h3><div class="pmd-v15-source-chips">' + chips + '</div>' +
      '</details>';
  }

  function render(data) {
    lastData = data;
    var role = getActiveRole();
    applyRoleChrome(role);
    syncNativeRoleTabs(role);
    root.innerHTML = renderRoleDashboard(data, role);
    bind();
  }


/* PMD_COUNTER_ROLE_V1_HELPERS_START */
  function counterRules() {
    return '' +
      '<div class="pmd-v23-counter-rule-list">' +
        '<article><b>2h before</b><span>Show today reservations on floor map and upcoming cards.</span></article>' +
        '<article><b>60m before</b><span>Soft-hold assigned table if the restaurant uses table assignment.</span></article>' +
        '<article><b>30m before</b><span>Alert counter/team to prepare table and confirm guest details.</span></article>' +
        '<article><b>15m late</b><span>Call guest, mark delayed/no-show/cancelled by manager rule.</span></article>' +
        '<article><b>Pre-order</b><span>For now write food requests in reservation comment. Next backend step: linked pre-order draft.</span></article>' +
      '</div>';
  }
/* PMD_COUNTER_ROLE_V1_HELPERS_END */

  function renderRoleDashboard(data, role) {
    var s = data.sections || {};
    var staff = s.staff || {};
    var shellClass = 'pmd-v15-shell pmd-v19-shell pmd-v21-shell pmd-v21-shell--' + role;
    var header = dashboardHeader(data, role);
    var kpis = '<section class="pmd-v15-kpi-grid pmd-v19-kpi-grid pmd-v21-kpi-grid">' + kpiGrid(data, role) + '</section>';

    if (role === 'manager') {
      return '<div class="' + shellClass + '">' + header + kpis +
        '<section class="pmd-v19-reference-grid pmd-v21-reference-grid">' +
          section('Live Restaurant Floor', 'Live · table coordinates + open-check status', floorPlan(s.floor_plan), 'pmd-v15-card--floor pmd-v19-area-floor', '<div class="pmd-v15-card-actions"><button type="button" data-pmd-owner-refresh>Refresh</button><a href="/admin/orders/create">New Order</a></div>') +
          section('AI Alerts', 'Operational alerts for manager action', alerts(data), 'pmd-v15-card--alerts pmd-v19-area-alerts', '<a href="/admin/orders">View all</a>') +
          section('Live Timeline', 'Latest recorded orders and reservations', timeline(data), 'pmd-v15-card--timeline pmd-v19-area-timeline', '<a href="/admin/orders">View all</a>') +
        '</section>' +
        '<section class="pmd-v21-two-grid">' +
          section('Kitchen Performance', 'Prep time, delay risk, queue and KDS health', kitchenPerformance(data), 'pmd-v15-card--kitchen') +
          section('Upcoming Reservations', 'Reception/table-booking view', listRows(s.upcoming_reservations, 'reservation'), 'pmd-v15-card--reservations') +
        '</section>' +
        '<section class="pmd-v21-three-grid">' +
          section('Top Selling Items', 'Items currently sitting inside open checks', barList(s.top_items, 'label', 'count', 5), 'pmd-v15-card--items') +
          section('Top Servers', 'Staff activity from assignments when available; otherwise team overview', staffOverview(staff), 'pmd-v15-card--servers') +
          section('Quick Actions', 'Fast manager actions', quickActions(role), 'pmd-v15-card--actions') +
        '</section></div>';
    }

    if (role === 'kds') {
      return '<div class="' + shellClass + '">' + header + kpis +
        '<section class="pmd-v21-three-grid pmd-v21-role-main">' +
          section('Kitchen Performance', 'Queue, ready rows, delay risk and KDS health', kitchenPerformance(data), 'pmd-v15-card--kitchen pmd-v21-card-large') +
          section('Top Open Items', 'Items currently sitting inside open checks', barList(s.top_items, 'label', 'count', 6), 'pmd-v15-card--items') +
          section('AI Alerts', 'Kitchen-relevant connected issues', alerts(data), 'pmd-v15-card--alerts', '<a href="/admin/orders">View all</a>') +
        '</section>' +
        '<section class="pmd-v21-two-grid">' +
          section('Live Timeline', 'Latest orders from the live database', timeline(data), 'pmd-v15-card--timeline', '<a href="/admin/orders">View all</a>') +
          section('Quick Actions', 'Kitchen actions', quickActions(role), 'pmd-v15-card--actions') +
        '</section></div>';
    }

    if (role === 'cashier') {
      return '<div class="' + shellClass + '">' + header + kpis +
        '<section class="pmd-v21-three-grid pmd-v21-role-main">' +
          section('Payment Breakdown', 'Open-check fallback until payment transactions exist', paymentBreakdown(data), 'pmd-v15-card--payment') +
          section('Open Check Value', 'Current open/unpaid risk', smallFinance(data), 'pmd-v15-card--small') +
          section('Lost Revenue', 'No-shows, cancellations, and open-check risk', lostRevenue(data), 'pmd-v15-card--lost') +
        '</section>' +
        '<section class="pmd-v21-two-grid">' +
          section('Recent Live Orders', 'Draft/test rows are excluded', listRows(s.recent_orders, 'order'), 'pmd-v15-card--recent-orders') +
          section('Quick Actions', 'Cashier checkout actions', quickActions(role), 'pmd-v15-card--actions') +
        '</section></div>';
    }

    if (role === 'counter' || role === 'reception') {
      return '<div class="' + shellClass + ' pmd-v23-counter-shell">' + header + kpis +
        '<section class="pmd-v23-counter-floor-row">' +
          section('Live Restaurant Floor', 'Counter view · available, busy, unpaid and reserved tables for booking decisions', floorPlan(s.floor_plan), 'pmd-v15-card--floor pmd-v19-area-floor pmd-v23-counter-floor-card', '<div class="pmd-v15-card-actions"><button type="button" data-pmd-owner-refresh>Refresh</button><a href="/admin/reservations/create">New Reservation</a></div>') +
        '</section>' +
        '<section class="pmd-v23-counter-grid">' +
          section('Today / Upcoming Reservations', 'Phone bookings, walk-ins and arrival cards', listRows(s.upcoming_reservations, 'reservation'), 'pmd-v15-card--reservations pmd-v23-counter-reservations', '<a href="/admin/reservations">View all</a>') +
          section('Counter Rules', 'Delay, cancellation, no-show and pre-order workflow', counterRules(), 'pmd-v23-counter-rules') +
        '</section>' +
        '<section class="pmd-v23-counter-grid">' +
          section('Recent Activity', 'Latest recorded orders and reservations', timeline(data), 'pmd-v15-card--timeline', '<a href="/admin/reservations">View all</a>') +
          section('Quick Actions', 'Counter desk actions', quickActions(role), 'pmd-v15-card--actions') +
        '</section></div>';
    }

    if (role === 'waiter') {
      return '<div class="' + shellClass + '">' + header + kpis + waiterActionNotice() +
        '<section class="pmd-v21-waiter-floor-row">' +
          section('Live Restaurant Floor', 'Full-width service floor · click a free table for menu, click a busy table for its order', floorPlan(s.floor_plan), 'pmd-v15-card--floor pmd-v19-area-floor pmd-v21-waiter-floor-card', '<div class="pmd-v15-card-actions"><button type="button" data-pmd-owner-refresh>Refresh</button><button type="button" data-pmd-waiter-action="new-order">New Order</button></div>') +
        '</section>' +
        '<section class="pmd-v21-waiter-workspace-row">' +
          section('Table / Order Workspace', 'Same-page waiter actions for selected table', waiterTableWorkspace(data), 'pmd-v23-waiter-workspace-card') +
        '</section>' +
        '<section class="pmd-v21-waiter-orders-row">' +
          section('My Table Orders', 'Current service orders with action buttons', waiterOrderCards(data), 'pmd-v21-waiter-orders-card') +
        '</section></div>';
    }

    return '<div class="' + shellClass + '">' + header + kpis +
      '<section class="pmd-v19-reference-grid pmd-v21-reference-grid">' +
        section('Live Restaurant Floor', 'Live · table coordinates + open-check status', floorPlan(s.floor_plan), 'pmd-v15-card--floor pmd-v19-area-floor', '<div class="pmd-v15-card-actions"><button type="button" data-pmd-owner-refresh>Refresh</button><a href="/admin/orders/create">New Order</a></div>') +
        section('AI Alerts', 'Owner-relevant connected issues', alerts(data), 'pmd-v15-card--alerts pmd-v19-area-alerts', '<a href="/admin/orders">View all</a>') +
        section('Live Timeline', 'Latest recorded orders and reservations', timeline(data), 'pmd-v15-card--timeline pmd-v19-area-timeline', '<a href="/admin/orders">View all</a>') +
      '</section>' +
      '<section class="pmd-v19-analytics-grid pmd-v21-analytics-grid">' +
        section('Revenue by Hour', 'Connected to real orders; today may be zero', revenueByHour(data), 'pmd-v15-card--chart') +
        section('Payment Breakdown', 'Open-check fallback until payment transactions exist', paymentBreakdown(data), 'pmd-v15-card--payment') +
        section('Average Guest Spend', 'Average spend from real order totals', smallFinance(data), 'pmd-v15-card--small') +
        section('Lost Revenue', 'No-shows, cancellations, and open-check risk', lostRevenue(data), 'pmd-v15-card--lost') +
        section('Upcoming Reservations', 'Reception/table-booking view', listRows(s.upcoming_reservations, 'reservation'), 'pmd-v15-card--reservations') +
      '</section>' +
      '<section class="pmd-v19-bottom-grid pmd-v21-bottom-grid">' +
        section('Top Servers', 'Staff activity from assignments when available; otherwise team overview', staffOverview(staff), 'pmd-v15-card--servers') +
        section('Kitchen Performance', 'Prep time, delay risk, queue and KDS health', kitchenPerformance(data), 'pmd-v15-card--kitchen') +
        section('Top Selling Items', 'Items currently sitting inside open checks', barList(s.top_items, 'label', 'count', 3), 'pmd-v15-card--items') +
        section('Quick Actions', 'Fast owner/manager actions', quickActions(role), 'pmd-v15-card--actions') +
      '</section></div>';
  }

  function serviceMix(data) {
    var mix = ((data.sections || {}).service_mix || {});
    return barList([
      { label: 'Dine-in', count: mix.dine_in || 0 },
      { label: 'Takeaway', count: mix.takeaway || 0 },
      { label: 'Delivery', count: mix.delivery || 0 },
      { label: 'Cashier/POS', count: mix.cashier || 0 },
      { label: 'Unknown', count: mix.unknown || 0 }
    ], 'label', 'count', 5);
  }

  function staffOverview(staff) {
    staff = staff || {};
    var servers = staff.servers || [];
    if (servers.length) {
      var max = 1;
      servers.forEach(function (x) { max = Math.max(max, Number(x.total || 0), Number(x.orders || 0)); });
      return '<div class="pmd-v15-staff-total"><strong>' + esc(staff.total || 0) + '</strong><span>Team members detected</span></div>' +
        '<div class="pmd-v19-server-list">' + servers.map(function (x, idx) {
          var val = Number(x.total || 0) || Number(x.orders || 0);
          var pct = Math.max(4, Math.min(100, (val / max) * 100));
          return '<div class="pmd-v15-bar-row"><div class="pmd-v15-bar-label"><span><b>' + (idx + 1) + '</b>' + esc(x.label || 'Staff') + '</span><em>' + esc(x.total_label || (x.orders || 0) + ' orders') + '</em></div><div class="pmd-v15-bar-track"><i style="width:' + pct + '%"></i></div><small>' + esc(x.orders || 0) + ' open/active order(s)</small></div>';
        }).join('') + '</div>';
    }
    var roles = staff.roles || [];
    return '<div class="pmd-v15-staff-total"><strong>' + esc(staff.total || 0) + '</strong><span>Team members detected</span></div>' + barList(roles, 'label', 'count', 8);
  }


  function handleWaiterAction(btn) {
    var action = btn.getAttribute('data-pmd-waiter-action') || '';
    var orderId = btn.getAttribute('data-order-id') || '';
    if (action === 'close-notice') { activeWaiterPanel = null; render(lastData); return; }
    if (action === 'new-order') {
      var table = selectedWaiterTable(lastData);
      if (table) selectedTableId = table.id;
      showWaiterMessage('New order', 'Choose a free table or add menu items in the Table / Order Workspace below the floor.');
      return;
    }
    if (action === 'add-item') {
      var name = btn.getAttribute('data-menu-name') || 'Item';
      var price = Number(btn.getAttribute('data-menu-price') || 0);
      waiterDraft.items.push({ name: name, price: isFinite(price) ? price : 0 });
      activeWaiterPanel = { title: 'Item added', text: name + ' added to the draft card.' };
      render(lastData);
      return;
    }
    if (action === 'remove-draft-item') {
      var idx = Number(btn.getAttribute('data-draft-index'));
      if (isFinite(idx)) waiterDraft.items.splice(idx, 1);
      render(lastData);
      return;
    }
    if (action === 'clear-draft') { waiterDraft.items = []; render(lastData); return; }
    if (action === 'send-draft') {
      if (!waiterDraft.items.length) showWaiterMessage('Draft is empty', 'Add food items first, then send the order.');
      else showWaiterMessage('Order draft ready', 'The in-dashboard order card is ready. Backend save/send endpoint can be connected here without leaving the waiter dashboard.');
      return;
    }
    if (action === 'order-print') { try { window.print(); } catch(e) {} return; }
    if (action === 'order-edit') { showWaiterMessage('Edit order #' + orderId, 'Order editing opens here: add/remove items, update notes, and send changes to kitchen from the same dashboard.'); return; }
    if (action === 'order-add-items') { showWaiterMessage('Add items to order #' + orderId, 'Use the menu list in the selected table workspace to add items.'); return; }
    if (action === 'order-status') { showWaiterMessage('Status for order #' + orderId, 'Status actions are ready here: received, preparing, ready, served, paid.'); return; }
  }

  function bind() {
    root.querySelectorAll('[data-pmd-floor]').forEach(function (btn) {
      btn.addEventListener('click', function () { selectedFloorId = btn.getAttribute('data-pmd-floor'); selectedTableId = null; render(lastData); });
    });
    root.querySelectorAll('[data-pmd-table]').forEach(function (btn) {
      btn.addEventListener('click', function () { selectedTableId = btn.getAttribute('data-pmd-table'); activeWaiterPanel = null; render(lastData); });
    });
    root.querySelectorAll('[data-pmd-owner-refresh]').forEach(function (btn) {
      btn.addEventListener('click', load);
    });
    root.querySelectorAll('[data-pmd-waiter-action]').forEach(function (btn) {
      btn.addEventListener('click', function () { handleWaiterAction(btn); });
    });
    bindRoleTabs(root);
    bindRoleTabs(document.getElementById('pmd-v21-native-role-tabs'));
  }

  function renderError(err) {
    root.innerHTML = '<div class="pmd-v15-error"><h1>Owner dashboard failed to load</h1><p>' + esc(err && err.message ? err.message : err || 'Unknown error') + '</p><button type="button" data-pmd-owner-refresh>Try again</button></div>';
    var btn = root.querySelector('[data-pmd-owner-refresh]');
    if (btn) btn.addEventListener('click', load);
  }

  function load() {
    if (!root) return;
    root.classList.add('is-loading');
    fetch('/admin/pmd-owner-dashboard-clean-v1-data?ts=' + Date.now(), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' from owner dashboard endpoint');
        return res.json();
      })
      .then(function (json) {
        if (!json || json.ok === false) throw new Error((json && json.error) || 'Dashboard endpoint returned ok=false');
        document.body.classList.add('pmd-owner-dashboard-clean-v1-active');
        render(json);
        exposeApi();
        sidebarLogoGuard();
        [250, 800, 1800].forEach(function (ms) { window.setTimeout(sidebarLogoGuard, ms); });
        if (window.console && console.info) console.info('[PMD Owner Dashboard]', VERSION, health());
      })
      .catch(renderError)
      .finally(function () { if (root) root.classList.remove('is-loading'); });
  }

  function safeGet(path, fallback) {
    var cur = lastData;
    for (var i = 0; i < path.length; i++) {
      if (!cur || typeof cur !== 'object' || !(path[i] in cur)) return fallback;
      cur = cur[path[i]];
    }
    return cur == null ? fallback : cur;
  }

  function health() {
    var fp = safeGet(['sections', 'floor_plan'], null);
    return {
      version: VERSION,
      endpoint_version: lastData && lastData.version,
      loaded: !!lastData,
      floor_tables: fp && fp.tables ? fp.tables.length : 0,
      active_table_summary: metric(lastData, 'active_tables'),
      recent_orders: safeGet(['sections', 'recent_orders'], []).length,
      top_items: safeGet(['sections', 'top_items'], []).length,
      connected_sources: safeGet(['sections', 'connections'], []).filter(function (x) { return x.connected; }).length
    };
  }

  function exposeApi() {
    window.PMDOwnerDashboardCleanV1 = {
      version: VERSION,
      data: function () { return lastData; },
      health: health,
      reload: function () { load(); return 'PMD owner dashboard reload started'; },
      snapshot: function () { return safeGet(['sections', 'snapshot'], []); },
      floorPlan: function () { return safeGet(['sections', 'floor_plan'], null); },
      topItems: function () { return safeGet(['sections', 'top_items'], []); },
      recentOrders: function () { return safeGet(['sections', 'recent_orders'], []); },
      connections: function () { return safeGet(['sections', 'connections'], []); },
      operations: function () { return safeGet(['sections', 'operations'], {}); },
      nativeMatch: function () { return safeGet(['sections', 'table_diagnostics'], {}); },
      notificationAudit: function () { return safeGet(['sections', 'notification_audit'], {}); },
      tableDiagnostics: function () { return safeGet(['sections', 'table_diagnostics'], {}); },
      currentRole: function () { return getActiveRole(); },
      switchRole: function (role) { setDashboardRole(role); return 'PMD dashboard role switched to ' + getActiveRole(); },
      fixSidebarLogo: sidebarLogoGuard
    };
  }

  function sidebarLogoGuard() {
    if (!isDashboardPage()) return;
    function rect(el) { try { return el.getBoundingClientRect(); } catch(e) { return {left:9999,top:9999,width:0,height:0}; } }
    var possible = Array.prototype.slice.call(document.querySelectorAll('aside,nav,#sidebar,.sidebar,.side-nav,.main-sidebar,[class*="sidebar"],[id*="sidebar"]'));
    var sidebar = null;
    possible.forEach(function (el) {
      var r = rect(el), text = (el.innerText || el.textContent || '').trim();
      if (!/Dashboard|Orders|Reservations|Kitchen Display|System|Restaurant/i.test(text)) return;
      if (r.left > 70 || r.width < 90 || r.width > 380 || r.height < 300) return;
      if (!sidebar || r.height > rect(sidebar).height) sidebar = el;
    });
    if (!sidebar) return;
    var imgs = Array.prototype.slice.call(sidebar.querySelectorAll('img')).filter(function (img) {
      var src = String(img.currentSrc || img.src || ''), alt = String(img.alt || ''), r = rect(img);
      return r.width >= 24 && r.height >= 18 && r.top < 380 && /pmd|paymydine|pay-my-dine|logo/i.test(src + ' ' + alt);
    });
    if (imgs.length <= 1) return;
    var keep = imgs.slice().sort(function (a,b) { var ra=rect(a), rb=rect(b); return (rb.width*rb.height)-(ra.width*ra.height); })[0];
    imgs.forEach(function (img) {
      if (img === keep) return;
      var el = img, p = img.parentElement, depth = 0;
      while (p && p !== sidebar && depth < 6) {
        var t = (p.innerText || p.textContent || '').trim(), pr = rect(p);
        if (/Dashboard|Orders|Reservations|Kitchen Display|System/i.test(t)) break;
        if (pr.width <= 300 && pr.height <= 240) el = p;
        p = p.parentElement; depth++;
      }
      el.style.setProperty('display', 'none', 'important');
    });
  }

  function init() {
    if (!isDashboardPage()) return;
    root = document.getElementById('pmd-owner-dashboard-clean-v1-root');
    if (!root) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* PMD_WAITER_LAYOUT_HARDFIX_V24 */
(function () {
  var MARK = 'PMD_WAITER_LAYOUT_HARDFIX_V24';

  function setI(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function isWaiterRole() {
    try {
      if (window.PMDOwnerDashboardCleanV1 &&
          window.PMDOwnerDashboardCleanV1.currentRole &&
          window.PMDOwnerDashboardCleanV1.currentRole() === 'waiter') {
        return true;
      }
    } catch (e) {}

    return !!document.querySelector('.pmd-v21-shell--waiter, .pmd-v23-waiter-workspace-card');
  }

  function applyWaiterLayoutFix() {
    var active = isWaiterRole();

    document.documentElement.classList.toggle('pmd-waiter-layout-hardfix-v24', active);
    document.body.classList.toggle('pmd-waiter-layout-hardfix-v24', active);

    if (!active) return;

    setI(document.documentElement, 'overflow-x', 'hidden');
    setI(document.documentElement, 'width', '100%');
    setI(document.documentElement, 'max-width', '100%');

    setI(document.body, 'overflow-x', 'hidden');
    setI(document.body, 'width', '100%');
    setI(document.body, 'max-width', '100%');
    setI(document.body, 'margin', '0');

    ['.page-wrapper', '.page-content', '#pmd-owner-dashboard-clean-v1-root'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        setI(el, 'position', 'relative');
        setI(el, 'left', '0');
        setI(el, 'right', 'auto');
        setI(el, 'top', '0');
        setI(el, 'margin-left', '0');
        setI(el, 'margin-right', '0');
        setI(el, 'padding-left', '0');
        setI(el, 'padding-right', '0');
        setI(el, 'transform', 'none');
        setI(el, 'width', '100%');
        setI(el, 'max-width', '100%');
        setI(el, 'min-width', '0');
        setI(el, 'box-sizing', 'border-box');
        setI(el, 'overflow-x', 'hidden');
      });
    });

    var root = document.querySelector('#pmd-owner-dashboard-clean-v1-root');
    if (root) setI(root, 'padding', '10px 16px 32px 16px');

    var shell = document.querySelector('.pmd-v21-shell--waiter') ||
      document.querySelector('.pmd-v23-shell') ||
      document.querySelector('[class*="pmd-v"][class*="shell"]');

    if (shell) {
      setI(shell, 'width', '100%');
      setI(shell, 'max-width', '100%');
      setI(shell, 'min-width', '0');
      setI(shell, 'margin-left', '0');
      setI(shell, 'margin-right', '0');
      setI(shell, 'padding-left', '0');
      setI(shell, 'padding-right', '0');
      setI(shell, 'transform', 'none');
      setI(shell, 'box-sizing', 'border-box');
      setI(shell, 'overflow-x', 'hidden');
    }

    [
      '.pmd-v15-topbar',
      '.pmd-v19-topbar',
      '.pmd-v21-topbar',
      '.pmd-v15-kpi-grid',
      '.pmd-v19-kpi-grid',
      '.pmd-v21-kpi-grid',
      '.pmd-v21-waiter-floor-row',
      '.pmd-v21-waiter-workspace-row',
      '.pmd-v21-waiter-orders-row',
      '.pmd-v15-card',
      '.pmd-v15-card--floor',
      '.pmd-v23-waiter-workspace',
      '.pmd-v23-workspace-head',
      '.pmd-v23-workspace-split'
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        setI(el, 'width', '100%');
        setI(el, 'max-width', '100%');
        setI(el, 'min-width', '0');
        setI(el, 'margin-left', '0');
        setI(el, 'margin-right', '0');
        setI(el, 'box-sizing', 'border-box');
        setI(el, 'transform', 'none');
        setI(el, 'overflow-x', 'hidden');
      });
    });
  }

  applyWaiterLayoutFix();
  requestAnimationFrame(applyWaiterLayoutFix);
  setTimeout(applyWaiterLayoutFix, 250);
  setTimeout(applyWaiterLayoutFix, 900);
  window.addEventListener('resize', applyWaiterLayoutFix);

  document.addEventListener('click', function () {
    setTimeout(applyWaiterLayoutFix, 80);
  }, true);

  window.PMDWaiterLayoutHardfixV24 = {
    apply: applyWaiterLayoutFix,
    check: function () {
      applyWaiterLayoutFix();

      var vw = window.innerWidth;
      var offenders = Array.prototype.slice.call(document.querySelectorAll('body *'))
        .filter(function (el) { return !el.closest('.notification-toast'); })
        .map(function (el) {
          var r = el.getBoundingClientRect();
          return {
            label: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 5).join('.') : ''),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            overRight: Math.round(r.right - vw),
            overLeft: Math.round(0 - r.left)
          };
        })
        .filter(function (x) { return x.overRight > 2 || x.overLeft > 2; })
        .sort(function (a, b) {
          return Math.max(b.overRight, b.overLeft) - Math.max(a.overRight, a.overLeft);
        })
        .slice(0, 20);

      var result = {
        mark: MARK,
        role: (window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole) ? window.PMDOwnerDashboardCleanV1.currentRole() : null,
        viewport: vw,
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - vw,
        offenders: offenders
      };

      console.log('[PMD Waiter Layout Hardfix v24]', result);
      console.table([result]);
      console.table(offenders);
      return result;
    }
  };

  console.info('[PMD] Waiter layout hardfix v24 active');
})();

/* PMD_WAITER_SCROLLFIX_V25 */
(function () {
  var MARK = 'PMD_WAITER_SCROLLFIX_V25';

  function setI(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function isWaiterRole() {
    try {
      if (window.PMDOwnerDashboardCleanV1 &&
          window.PMDOwnerDashboardCleanV1.currentRole &&
          window.PMDOwnerDashboardCleanV1.currentRole() === 'waiter') {
        return true;
      }
    } catch (e) {}

    return !!document.querySelector('.pmd-v21-shell--waiter, .pmd-v23-waiter-workspace-card');
  }

  function applyWaiterScrollFix() {
    var active = isWaiterRole();

    document.documentElement.classList.toggle('pmd-waiter-scrollfix-v25', active);
    document.body.classList.toggle('pmd-waiter-scrollfix-v25', active);

    if (!active) return;

    [
      document.documentElement,
      document.body,
      document.querySelector('.page-wrapper'),
      document.querySelector('.page-content'),
      document.querySelector('#pmd-owner-dashboard-clean-v1-root'),
      document.querySelector('.pmd-v21-shell--waiter')
    ].forEach(function (el) {
      setI(el, 'height', 'auto');
      setI(el, 'min-height', '100vh');
      setI(el, 'max-height', 'none');
      setI(el, 'overflow-y', 'visible');
      setI(el, 'overflow-x', 'hidden');
    });

    setI(document.documentElement, 'overflow-y', 'auto');
    setI(document.body, 'overflow-y', 'auto');

    document.querySelectorAll(
      '.pmd-v21-waiter-floor-row, .pmd-v21-waiter-workspace-row, .pmd-v21-waiter-orders-row, .pmd-v15-card, .pmd-v15-card--floor, .pmd-v15-card-body, .pmd-v23-waiter-workspace, .pmd-v23-workspace-split'
    ).forEach(function (el) {
      setI(el, 'height', 'auto');
      setI(el, 'min-height', '0');
      setI(el, 'max-height', 'none');
      setI(el, 'overflow-y', 'visible');
      setI(el, 'overflow-x', 'hidden');
    });
  }

  applyWaiterScrollFix();
  requestAnimationFrame(applyWaiterScrollFix);
  setTimeout(applyWaiterScrollFix, 250);
  setTimeout(applyWaiterScrollFix, 900);
  window.addEventListener('resize', applyWaiterScrollFix);

  document.addEventListener('click', function () {
    setTimeout(applyWaiterScrollFix, 80);
  }, true);

  window.PMDWaiterScrollfixV25 = {
    apply: applyWaiterScrollFix,
    check: function () {
      applyWaiterScrollFix();

      var result = {
        mark: MARK,
        role: window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole ? window.PMDOwnerDashboardCleanV1.currentRole() : null,
        innerHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
        canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20,
        scrollY: window.scrollY,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        pageWrapperOverflowY: getComputedStyle(document.querySelector('.page-wrapper')).overflowY,
        pageContentOverflowY: getComputedStyle(document.querySelector('.page-content')).overflowY
      };

      console.log('[PMD Waiter Scrollfix v25]', result);
      console.table([result]);
      return result;
    }
  };

  console.info('[PMD] Waiter scrollfix v25 active');
})();

/* PMD_WAITER_POLISH_V26_JS */
(function () {
  var MARK = 'PMD_WAITER_POLISH_V26_JS';

  function isWaiterRole() {
    try {
      return window.PMDOwnerDashboardCleanV1 &&
        window.PMDOwnerDashboardCleanV1.currentRole &&
        window.PMDOwnerDashboardCleanV1.currentRole() === 'waiter';
    } catch (e) {
      return !!document.querySelector('.pmd-v21-shell--waiter');
    }
  }

  function findWaiterShell() {
    return document.querySelector('.pmd-v21-shell--waiter') ||
      document.querySelector('#pmd-owner-dashboard-clean-v1-root');
  }

  function findRoleTabs(shell) {
    if (!shell) return null;

    var direct = shell.querySelector(
      '.pmd-role-tabs, .pmd-v20-role-tabs, .pmd-v21-role-tabs, .pmd-v23-role-tabs, [data-pmd-role-tabs]'
    );
    if (direct) return direct;

    return Array.from(shell.querySelectorAll('div, nav, section')).find(function (el) {
      var text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      return text.includes('Owner') &&
        text.includes('Manager') &&
        text.includes('KDS') &&
        text.includes('Cashier') &&
        text.includes('Reception') &&
        text.includes('Waiter') &&
        el.querySelectorAll('button, a').length >= 5;
    }) || null;
  }

  function moveRoleTabsToTopbar() {
    var shell = findWaiterShell();
    if (!shell) return false;

    var topbar = shell.querySelector('.pmd-v15-topbar, .pmd-v19-topbar, .pmd-v21-topbar, header');
    var tabs = findRoleTabs(shell);

    if (!topbar || !tabs) return false;

    topbar.classList.add('pmd-v26-waiter-topbar');
    tabs.classList.add('pmd-v26-role-tabs-in-topbar');

    if (tabs.parentElement !== topbar) {
      topbar.appendChild(tabs);
    }

    return true;
  }

  function markFloorTableCards() {
    var floorCard = document.querySelector('.pmd-v21-waiter-floor-card, .pmd-v15-card--floor, .pmd-v19-area-floor');
    if (!floorCard) return 0;

    var candidates = Array.from(floorCard.querySelectorAll('button, [role="button"], [data-table-id], div, article, span'));
    var count = 0;

    candidates.forEach(function (el) {
      var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      var rect = el.getBoundingClientRect();
      var looksLikeTable =
        /^\d+\s*(FREE|UNPAID|€|WAITING|DINING|READY)?/i.test(text) ||
        /^Table\s+\d+/i.test(text);

      var rightSize =
        rect.width >= 45 &&
        rect.width <= 180 &&
        rect.height >= 28 &&
        rect.height <= 110;

      var isLegend = text.includes('Available') || text.includes('Reserved') || text.includes('Waiting Payment');

      if (looksLikeTable && rightSize && !isLegend) {
        el.classList.add('pmd-v26-floor-table-card');

        if (/FREE/i.test(text)) el.classList.add('pmd-v26-floor-table-free');
        if (/UNPAID|€|WAITING/i.test(text)) el.classList.add('pmd-v26-floor-table-busy');

        count++;
      }
    });

    return count;
  }

  function compactWorkspace() {
    var workspace = document.querySelector('.pmd-v23-waiter-workspace-card, .pmd-v21-waiter-workspace-row');
    if (!workspace) return false;

    workspace.classList.add('pmd-v26-workspace-compact');

    workspace.querySelectorAll('*').forEach(function (el) {
      var text = (el.innerText || '').replace(/\s+/g, ' ').trim();

      if (text.includes('Current table order') || text.includes('Busy table: edit')) {
        el.classList.add('pmd-v26-current-order-area');
      }

      if (text.includes('Add more items') || text.includes('Draft for Table')) {
        el.classList.add('pmd-v26-add-items-area');
      }
    });

    return true;
  }

  function compactMyTableOrders() {
    var section = Array.from(document.querySelectorAll('.pmd-v15-card, section, article')).find(function (el) {
      var text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      return text.startsWith('My Table Orders') || text.includes('My Table Orders Current service orders');
    });

    if (!section) return 0;

    section.classList.add('pmd-v26-my-table-orders');

    var body = section.querySelector('.pmd-v15-card-body') || section;
    body.classList.add('pmd-v26-my-table-orders-grid');

    var cards = Array.from(body.children).filter(function (el) {
      return (el.innerText || '').includes('Order #');
    });

    if (!cards.length) {
      cards = Array.from(body.querySelectorAll('article, .pmd-v23-order-card, [class*="order"]')).filter(function (el) {
        return (el.innerText || '').includes('Order #');
      });
    }

    cards.forEach(function (card) {
      card.classList.add('pmd-v26-order-card-compact');
    });

    return cards.length;
  }

  function applyWaiterPolish() {
    if (!isWaiterRole()) return;

    document.documentElement.classList.add('pmd-waiter-polish-v26');
    document.body.classList.add('pmd-waiter-polish-v26');

    moveRoleTabsToTopbar();
    markFloorTableCards();
    compactWorkspace();
    compactMyTableOrders();
  }

  function wrapSwitchRole() {
    var api = window.PMDOwnerDashboardCleanV1;
    if (!api || !api.switchRole || api.__pmdWaiterPolishV26Wrapped) return;

    var original = api.switchRole.bind(api);

    api.switchRole = function (role) {
      var result = original(role);
      setTimeout(applyWaiterPolish, 80);
      setTimeout(applyWaiterPolish, 300);
      return result;
    };

    api.__pmdWaiterPolishV26Wrapped = true;
  }

  applyWaiterPolish();
  wrapSwitchRole();

  requestAnimationFrame(applyWaiterPolish);
  setTimeout(applyWaiterPolish, 250);
  setTimeout(applyWaiterPolish, 900);
  window.addEventListener('resize', applyWaiterPolish);

  document.addEventListener('click', function () {
    setTimeout(applyWaiterPolish, 80);
  }, true);

  window.PMDWaiterPolishV26 = {
    apply: applyWaiterPolish,
    check: function () {
      applyWaiterPolish();

      var result = {
        mark: MARK,
        role: window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole ? window.PMDOwnerDashboardCleanV1.currentRole() : null,
        tabsInTopbar: !!document.querySelector('.pmd-v26-role-tabs-in-topbar'),
        floorTableCards: document.querySelectorAll('.pmd-v26-floor-table-card').length,
        compactOrderCards: document.querySelectorAll('.pmd-v26-order-card-compact').length,
        horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
        canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20
      };

      console.log('[PMD Waiter Polish v26]', result);
      console.table([result]);
      return result;
    }
  };

  console.info('[PMD] Waiter polish v26 active');
})();

/* PMD_WAITER_CLEAN_V27_JS */
(function () {
  var MARK = 'PMD_WAITER_CLEAN_V27_JS';

  function isWaiterRole() {
    try {
      return window.PMDOwnerDashboardCleanV1 &&
        window.PMDOwnerDashboardCleanV1.currentRole &&
        window.PMDOwnerDashboardCleanV1.currentRole() === 'waiter';
    } catch (e) {
      return !!document.querySelector('.pmd-v21-shell--waiter');
    }
  }

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function findShell() {
    return document.querySelector('.pmd-v21-shell--waiter') ||
      document.querySelector('#pmd-owner-dashboard-clean-v1-root');
  }

  function findTopbar(shell) {
    return shell && (
      shell.querySelector('.pmd-v15-topbar') ||
      shell.querySelector('.pmd-v19-topbar') ||
      shell.querySelector('.pmd-v21-topbar') ||
      shell.querySelector('header')
    );
  }

  function findTabs(shell) {
    if (!shell) return null;

    var direct = shell.querySelector(
      '.pmd-v26-role-tabs-in-topbar, .pmd-role-tabs, .pmd-v20-role-tabs, .pmd-v21-role-tabs, .pmd-v23-role-tabs, [data-pmd-role-tabs]'
    );
    if (direct) return direct;

    return Array.from(shell.querySelectorAll('div, nav, section')).find(function (el) {
      var t = textOf(el);
      return t.includes('Owner') &&
        t.includes('Manager') &&
        t.includes('KDS') &&
        t.includes('Cashier') &&
        (t.includes('Reception') || t.includes('Counter')) &&
        t.includes('Waiter') &&
        el.querySelectorAll('button, a').length >= 5;
    }) || null;
  }

  function roleShort(full) {
    var t = String(full || '').toLowerCase();
    if (t.includes('owner')) return ['O', 'Owner'];
    if (t.includes('manager')) return ['M', 'Manager'];
    if (t.includes('kds')) return ['K', 'KDS'];
    if (t.includes('cashier')) return ['C', 'Cashier'];
    if (t.includes('reception')) return ['R', 'Reception'];
    if (t.includes('waiter')) return ['W', 'Waiter'];
    return [String(full || '').trim().slice(0, 1).toUpperCase(), String(full || '').trim()];
  }

  function compactRoleTabs() {
    var shell = findShell();
    var topbar = findTopbar(shell);
    var tabs = findTabs(shell);

    if (!shell || !tabs) return false;

    shell.classList.add('pmd-v27-waiter-shell');

    if (topbar) {
      topbar.classList.add('pmd-v27-waiter-floating-topbar');
      if (tabs.parentElement !== topbar) topbar.appendChild(tabs);

      Array.from(topbar.children).forEach(function (child) {
        if (child === tabs || child.contains(tabs)) return;
        var t = textOf(child);
        if (t.includes('Waiter Dashboard') || t.includes('Service floor and assigned table dashboard')) {
          child.classList.add('pmd-v27-hide-waiter-title');
        }
      });
    }

    tabs.classList.add('pmd-v27-mini-role-tabs');

    Array.from(tabs.querySelectorAll('button, a')).forEach(function (btn) {
      var old = btn.getAttribute('data-pmd-full-role-label') || textOf(btn) || btn.getAttribute('aria-label') || '';
      var pair = roleShort(old);

      btn.setAttribute('data-pmd-full-role-label', pair[1]);
      btn.setAttribute('aria-label', pair[1]);
      btn.setAttribute('title', pair[1]);
      btn.textContent = pair[0];
      btn.classList.add('pmd-v27-mini-role-button');
    });

    return true;
  }

  function hideWaiterTitleEverywhere() {
    Array.from(document.querySelectorAll('h1, h2, p, span, div')).forEach(function (el) {
      var t = textOf(el);
      if (t === 'Waiter Dashboard' || t === 'Service floor and assigned table dashboard') {
        el.classList.add('pmd-v27-hide-waiter-title');
      }
    });
  }

  function findWorkspace() {
    return document.querySelector('.pmd-v23-waiter-workspace-card') ||
      Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
        var t = textOf(el);
        return t.startsWith('Table / Order Workspace') ||
          t.includes('Table / Order Workspace Same-page waiter actions');
      }) || null;
  }

  function setWorkspaceVisible(visible, doScroll) {
    var ws = findWorkspace();
    if (!ws) return false;

    document.body.classList.toggle('pmd-v27-table-selected', !!visible);
    ws.classList.toggle('pmd-v27-workspace-visible', !!visible);
    ws.classList.toggle('pmd-v27-workspace-hidden', !visible);

    if (visible && doScroll) {
      setTimeout(function () {
        try {
          ws.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          ws.scrollIntoView();
        }
      }, 140);
    }

    return true;
  }

  function markFloorTables() {
    var floor = document.querySelector('.pmd-v21-waiter-floor-card, .pmd-v15-card--floor, .pmd-v19-area-floor');
    if (!floor) return 0;

    var count = 0;

    Array.from(floor.querySelectorAll('button, [role="button"], [data-table-id], [data-pmd-table-id], div, article')).forEach(function (el) {
      var t = textOf(el);
      if (!t) return;

      var r = el.getBoundingClientRect();
      var isLegend = t.includes('Available') || t.includes('Reserved') || t.includes('Waiting Payment') || t.includes('Attention');
      var looksLikeTable = /^\d+\s*(FREE|UNPAID|€|WAITING|DINING|READY)?/i.test(t) || /^Table\s+\d+/i.test(t);
      var goodSize = r.width >= 45 && r.width <= 190 && r.height >= 25 && r.height <= 115;

      if (looksLikeTable && goodSize && !isLegend) {
        el.classList.add('pmd-v27-floor-table-card');

        if (/FREE/i.test(t)) el.classList.add('pmd-v27-floor-table-free');
        if (/UNPAID|€|WAITING/i.test(t)) el.classList.add('pmd-v27-floor-table-busy');

        count++;
      }
    });

    return count;
  }

  function compactOrders() {
    var section = Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
      var t = textOf(el);
      return t.startsWith('My Table Orders') || t.includes('My Table Orders Current service orders');
    });

    if (!section) return 0;

    section.classList.add('pmd-v27-my-orders-section');

    var body = section.querySelector('.pmd-v15-card-body') || section;
    body.classList.add('pmd-v27-my-orders-grid');

    var cards = Array.from(body.querySelectorAll('article, div')).filter(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      return t.includes('Order #') && r.width > 180 && r.height > 120;
    });

    var unique = [];
    cards.forEach(function (card) {
      if (!unique.some(function (x) { return x.contains(card); })) unique.push(card);
    });

    unique.slice(0, 12).forEach(function (card) {
      card.classList.add('pmd-v27-order-card-small');

      Array.from(card.querySelectorAll('button, a')).forEach(function (btn) {
        if (/add\s*items/i.test(textOf(btn))) btn.textContent = 'Add';
      });
    });

    return unique.length;
  }

  function improveWorkspace() {
    var ws = findWorkspace();
    if (!ws) return false;

    ws.classList.add('pmd-v27-workspace-clean');

    var split = ws.querySelector('.pmd-v23-workspace-split');
    if (split) split.classList.add('pmd-v27-workspace-split-clean');

    return true;
  }

  function apply() {
    if (!isWaiterRole()) return;

    document.documentElement.classList.add('pmd-waiter-clean-v27');
    document.body.classList.add('pmd-waiter-clean-v27');

    compactRoleTabs();
    hideWaiterTitleEverywhere();
    markFloorTables();
    compactOrders();
    improveWorkspace();

    if (!document.body.classList.contains('pmd-v27-table-selected')) {
      setWorkspaceVisible(false, false);
    }
  }

  function isFloorTableClick(target) {
    return !!(target && target.closest && target.closest('.pmd-v27-floor-table-card, .pmd-v26-floor-table-card, [data-table-id], [data-pmd-table-id]'));
  }

  document.addEventListener('click', function (e) {
    if (!isWaiterRole()) return;

    var ws = findWorkspace();
    var tabs = document.querySelector('.pmd-v27-mini-role-tabs');

    if (isFloorTableClick(e.target)) {
      document.body.classList.add('pmd-v27-table-selected');
      setTimeout(function () {
        apply();
        setWorkspaceVisible(true, true);
      }, 80);
      return;
    }

    if (ws && ws.contains(e.target)) return;
    if (tabs && tabs.contains(e.target)) return;

    setWorkspaceVisible(false, false);
  }, true);

  function wrapSwitchRole() {
    var api = window.PMDOwnerDashboardCleanV1;
    if (!api || !api.switchRole || api.__pmdV27Wrapped) return;

    var original = api.switchRole.bind(api);
    api.switchRole = function (role) {
      document.body.classList.remove('pmd-v27-table-selected');
      var result = original(role);
      setTimeout(apply, 80);
      setTimeout(apply, 350);
      return result;
    };

    api.__pmdV27Wrapped = true;
  }

  apply();
  wrapSwitchRole();

  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 900);
  window.addEventListener('resize', apply);

  window.PMDWaiterCleanV27 = {
    apply: apply,
    closeWorkspace: function () {
      return setWorkspaceVisible(false, false);
    },
    check: function () {
      apply();

      var result = {
        mark: MARK,
        role: window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole ? window.PMDOwnerDashboardCleanV1.currentRole() : null,
        titleHidden: !!document.querySelector('.pmd-v27-hide-waiter-title'),
        miniTabs: !!document.querySelector('.pmd-v27-mini-role-tabs'),
        floorTables: document.querySelectorAll('.pmd-v27-floor-table-card').length,
        workspaceHiddenByDefault: !!document.querySelector('.pmd-v27-workspace-hidden'),
        orderCardsSmall: document.querySelectorAll('.pmd-v27-order-card-small').length,
        horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
        canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20
      };

      console.log('[PMD Waiter Clean v27]', result);
      console.table([result]);
      return result;
    }
  };

  console.info('[PMD] Waiter clean polish v27 active');
})();

/* PMD_WAITER_RESCUE_V28_JS */
(function () {
  var MARK = 'PMD_WAITER_RESCUE_V28_JS';
  var userOpenedWorkspace = false;

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function isWaiterRole() {
    try {
      return window.PMDOwnerDashboardCleanV1 &&
        window.PMDOwnerDashboardCleanV1.currentRole &&
        window.PMDOwnerDashboardCleanV1.currentRole() === 'waiter';
    } catch (e) {
      return !!document.querySelector('.pmd-v21-shell--waiter');
    }
  }

  function findShell() {
    return document.querySelector('.pmd-v21-shell--waiter') ||
      document.querySelector('#pmd-owner-dashboard-clean-v1-root');
  }

  function findTabs(shell) {
    if (!shell) return null;

    var direct = shell.querySelector(
      '.pmd-v27-mini-role-tabs, .pmd-v26-role-tabs-in-topbar, .pmd-role-tabs, .pmd-v20-role-tabs, .pmd-v21-role-tabs, .pmd-v23-role-tabs, [data-pmd-role-tabs]'
    );
    if (direct) return direct;

    return Array.from(shell.querySelectorAll('div, nav, section')).find(function (el) {
      var t = textOf(el);
      return t.includes('Owner') &&
        t.includes('Manager') &&
        t.includes('KDS') &&
        t.includes('Cashier') &&
        (t.includes('Reception') || t.includes('Counter')) &&
        t.includes('Waiter') &&
        el.querySelectorAll('button, a').length >= 5;
    }) || null;
  }

  function shortRole(label) {
    var t = String(label || '').toLowerCase();
    if (t.includes('owner')) return ['O', 'Owner'];
    if (t.includes('manager')) return ['M', 'Manager'];
    if (t.includes('kds')) return ['K', 'KDS'];
    if (t.includes('cashier')) return ['C', 'Cashier'];
    if (t.includes('reception')) return ['R', 'Reception'];
    if (t.includes('waiter')) return ['W', 'Waiter'];
    return [String(label || '').trim().slice(0, 1).toUpperCase(), String(label || '').trim()];
  }

  function makeRoleRail() {
    var shell = findShell();
    var tabs = findTabs(shell);
    if (!tabs) return false;

    tabs.classList.add('pmd-v28-role-rail');

    Array.from(tabs.querySelectorAll('button, a')).forEach(function (btn) {
      var old = btn.getAttribute('data-pmd-full-role-label') || btn.getAttribute('aria-label') || textOf(btn);
      var pair = shortRole(old);

      btn.textContent = pair[0];
      btn.title = pair[1];
      btn.setAttribute('aria-label', pair[1]);
      btn.setAttribute('data-pmd-full-role-label', pair[1]);
      btn.classList.add('pmd-v28-role-rail-btn');

      btn.classList.toggle('pmd-v28-role-rail-btn-active', pair[1].toLowerCase() === 'waiter');
    });

    return true;
  }

  function hideWaiterHeader() {
    Array.from(document.querySelectorAll('h1, h2, p, span, div')).forEach(function (el) {
      var t = textOf(el);
      if (t === 'Waiter Dashboard' || t === 'Service floor and assigned table dashboard') {
        el.classList.add('pmd-v28-hide-waiter-heading');
      }
    });
  }

  function findFloorCard() {
    return Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
      var t = textOf(el);
      return t.includes('Live Restaurant Floor') &&
        t.includes('Main Floor') &&
        t.includes('Available') &&
        t.includes('Waiting Payment');
    }) || document.querySelector('.pmd-v21-waiter-floor-card, .pmd-v15-card--floor');
  }

  function markFloor() {
    var card = findFloorCard();
    if (!card) return false;

    card.classList.add('pmd-v28-floor-card');

    var all = Array.from(card.querySelectorAll('*')).filter(visible);

    var legend = all.find(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      return t.includes('Available') &&
        t.includes('Reserved') &&
        t.includes('Waiting Payment') &&
        r.width > 120 &&
        r.width < 420 &&
        r.height > 40 &&
        r.height < 170;
    });

    if (legend) legend.classList.add('pmd-v28-floor-legend');

    var badge = all.find(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      return t.includes('Main Floor') &&
        r.width > 50 &&
        r.width < 230 &&
        r.height > 25 &&
        r.height < 90;
    });

    if (badge) badge.classList.add('pmd-v28-floor-badge');

    var map = card.querySelector('.pmd-v28-floor-map, .pmd-floor-map, .pmd-floor-grid, .pmd-table-grid, [data-pmd-floor-map]');
    if (!map) {
      var candidates = all.filter(function (el) {
        var t = textOf(el);
        var r = el.getBoundingClientRect();
        return r.width > 250 &&
          r.height > 260 &&
          !t.includes('Live Restaurant Floor') &&
          !t.includes('Available 2') &&
          !t.includes('Refresh') &&
          (t.includes('FREE') || t.includes('UNPAID') || t.includes('€'));
      }).sort(function (a, b) {
        var ar = a.getBoundingClientRect();
        var br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      });

      map = candidates[0];
    }

    if (map) {
      map.classList.add('pmd-v28-floor-map');

      Array.from(map.querySelectorAll('*')).forEach(function (el) {
        var t = textOf(el);
        var r = el.getBoundingClientRect();
        var looksLikeTable = (/^\d+\s*(FREE|UNPAID|€|WAITING)?/i.test(t) || /^Table\s+\d+/i.test(t));
        var goodSize = r.width >= 40 && r.width <= 210 && r.height >= 25 && r.height <= 130;

        if (looksLikeTable && goodSize) {
          el.classList.add('pmd-v28-table-node');
          if (/FREE/i.test(t)) el.classList.add('pmd-v28-table-free');
          if (/UNPAID|€|WAITING/i.test(t)) el.classList.add('pmd-v28-table-busy');
        }
      });
    }

    return true;
  }

  function findWorkspace() {
    return document.querySelector('.pmd-v23-waiter-workspace-card') ||
      Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
        var t = textOf(el);
        return t.includes('Table / Order Workspace') &&
          t.includes('Same-page waiter actions');
      }) || null;
  }

  function setWorkspace(open, scroll) {
    var ws = findWorkspace();
    if (!ws) return false;

    ws.classList.add('pmd-v28-workspace');
    ws.classList.toggle('pmd-v28-workspace-open', !!open);
    ws.classList.toggle('pmd-v28-workspace-closed', !open);

    document.body.classList.toggle('pmd-v28-table-is-selected', !!open);

    if (open && scroll) {
      setTimeout(function () {
        try {
          ws.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          ws.scrollIntoView();
        }
      }, 120);
    }

    return true;
  }

  function compactOrders() {
    var section = Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
      var t = textOf(el);
      return t.includes('My Table Orders') &&
        t.includes('Current service orders');
    });

    if (!section) return 0;

    section.classList.add('pmd-v28-my-orders-section');

    var body = section.querySelector('.pmd-v15-card-body') || section;
    body.classList.add('pmd-v28-my-orders-grid');

    var cards = Array.from(body.querySelectorAll('article, div')).filter(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      return t.includes('Order #') && r.width > 150 && r.height > 100;
    });

    var finalCards = [];
    cards.forEach(function (card) {
      if (!finalCards.some(function (x) { return x.contains(card); })) finalCards.push(card);
    });

    finalCards.forEach(function (card) {
      card.classList.add('pmd-v28-small-order-card');

      Array.from(card.querySelectorAll('button, a')).forEach(function (btn) {
        if (/add\s*items/i.test(textOf(btn))) btn.textContent = 'Add';
      });
    });

    return finalCards.length;
  }

  function apply() {
    if (!isWaiterRole()) return;

    document.documentElement.classList.add('pmd-waiter-rescue-v28');
    document.body.classList.add('pmd-waiter-rescue-v28');

    hideWaiterHeader();
    makeRoleRail();
    markFloor();
    compactOrders();

    if (!userOpenedWorkspace) {
      setWorkspace(false, false);
    }
  }

  function isTableClick(target) {
    return !!(target && target.closest && target.closest('.pmd-v28-table-node, .pmd-v27-floor-table-card, .pmd-v26-floor-table-card, [data-table-id], [data-pmd-table-id]'));
  }

  document.addEventListener('click', function (e) {
    if (!isWaiterRole()) return;

    var workspace = findWorkspace();
    var rail = document.querySelector('.pmd-v28-role-rail');

    if (isTableClick(e.target)) {
      userOpenedWorkspace = true;
      setTimeout(function () {
        apply();
        setWorkspace(true, true);
      }, 90);
      return;
    }

    if (workspace && workspace.contains(e.target)) return;
    if (rail && rail.contains(e.target)) return;

    userOpenedWorkspace = false;
    setWorkspace(false, false);
  }, true);

  function wrapSwitchRole() {
    var api = window.PMDOwnerDashboardCleanV1;
    if (!api || !api.switchRole || api.__pmdV28Wrapped) return;

    var oldSwitch = api.switchRole.bind(api);
    api.switchRole = function (role) {
      userOpenedWorkspace = false;
      var result = oldSwitch(role);
      setTimeout(apply, 80);
      setTimeout(apply, 350);
      return result;
    };

    api.__pmdV28Wrapped = true;
  }

  apply();
  wrapSwitchRole();

  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 900);
  setTimeout(apply, 1600);
  window.addEventListener('resize', apply);

  window.PMDWaiterRescueV28 = {
    apply: apply,
    closeWorkspace: function () {
      userOpenedWorkspace = false;
      return setWorkspace(false, false);
    },
    check: function () {
      apply();

      var map = document.querySelector('.pmd-v28-floor-map');
      var mr = map ? map.getBoundingClientRect() : null;

      var result = {
        mark: MARK,
        role: window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole ? window.PMDOwnerDashboardCleanV1.currentRole() : null,
        verticalRoleRail: !!document.querySelector('.pmd-v28-role-rail'),
        waiterTitleHidden: !!document.querySelector('.pmd-v28-hide-waiter-heading'),
        floorMapWidth: mr ? Math.round(mr.width) : 0,
        floorMapHeight: mr ? Math.round(mr.height) : 0,
        tableNodes: document.querySelectorAll('.pmd-v28-table-node').length,
        workspaceClosed: !!document.querySelector('.pmd-v28-workspace-closed'),
        smallOrderCards: document.querySelectorAll('.pmd-v28-small-order-card').length,
        horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
        canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20
      };

      console.log('[PMD Waiter Rescue v28]', result);
      console.table([result]);
      return result;
    }
  };

  console.info('[PMD] Waiter rescue/final polish v28 active');
})();

/* PMD_WAITER_FINAL_V29_JS */
(function () {
  var MARK = 'PMD_WAITER_FINAL_V29_JS';
  var workspaceOpenByUser = false;
  var applying = false;

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function clsOf(el) {
    return el && typeof el.className === 'string' ? el.className : '';
  }

  function isWaiterRole() {
    try {
      return window.PMDOwnerDashboardCleanV1 &&
        window.PMDOwnerDashboardCleanV1.currentRole &&
        window.PMDOwnerDashboardCleanV1.currentRole() === 'waiter';
    } catch (e) {
      return !!document.querySelector('.pmd-v21-shell--waiter');
    }
  }

  function findShell() {
    return document.querySelector('.pmd-v21-shell--waiter') ||
      document.querySelector('#pmd-owner-dashboard-clean-v1-root');
  }

  function findTabs(shell) {
    if (!shell) return null;

    var direct = shell.querySelector(
      '.pmd-v28-role-rail, .pmd-v27-mini-role-tabs, .pmd-v26-role-tabs-in-topbar, .pmd-role-tabs, .pmd-v20-role-tabs, .pmd-v21-role-tabs, .pmd-v23-role-tabs, [data-pmd-role-tabs]'
    );

    if (direct) return direct;

    return Array.from(shell.querySelectorAll('div, nav, section')).find(function (el) {
      var t = textOf(el);
      return t.includes('Owner') &&
        t.includes('Manager') &&
        t.includes('KDS') &&
        t.includes('Cashier') &&
        (t.includes('Reception') || t.includes('Counter')) &&
        t.includes('Waiter') &&
        el.querySelectorAll('button, a').length >= 5;
    }) || null;
  }

  function shortRole(label) {
    var t = String(label || '').toLowerCase();
    if (t.includes('owner')) return ['O', 'Owner'];
    if (t.includes('manager')) return ['M', 'Manager'];
    if (t.includes('kds')) return ['K', 'KDS'];
    if (t.includes('cashier')) return ['C', 'Cashier'];
    if (t.includes('reception')) return ['R', 'Reception'];
    if (t.includes('waiter')) return ['W', 'Waiter'];
    return [String(label || '').trim().slice(0, 1).toUpperCase(), String(label || '').trim()];
  }

  function setupRoleRail() {
    var shell = findShell();
    var tabs = findTabs(shell);
    if (!tabs) return false;

    tabs.classList.remove('pmd-v26-role-tabs-in-topbar');
    tabs.classList.add('pmd-v29-role-rail');

    Array.from(tabs.querySelectorAll('button, a')).forEach(function (btn) {
      var full = btn.getAttribute('data-pmd-full-role-label') || btn.getAttribute('aria-label') || textOf(btn);
      var pair = shortRole(full);

      btn.textContent = pair[0];
      btn.title = pair[1];
      btn.setAttribute('aria-label', pair[1]);
      btn.setAttribute('data-pmd-full-role-label', pair[1]);
      btn.classList.add('pmd-v29-role-btn');

      btn.classList.toggle('pmd-v29-role-btn-active', pair[1].toLowerCase() === 'waiter');
    });

    return true;
  }

  function hideWaiterTitle() {
    Array.from(document.querySelectorAll('h1, h2, p, span, div')).forEach(function (el) {
      var t = textOf(el);
      if (t === 'Waiter Dashboard' || t === 'Service floor and assigned table dashboard') {
        el.classList.add('pmd-v29-hide');
      }
    });
  }

  function cleanupWrongOldClasses() {
    var wrongAncestorSelectors = [
      '.page-wrapper',
      '.page-content',
      '#pmd-owner-dashboard-clean-v1-root',
      '.pmd-v15-shell',
      '.pmd-v21-shell--waiter',
      '.pmd-v21-waiter-workspace-row',
      '.pmd-v21-waiter-orders-row',
      '.pmd-v15-card-body',
      '.pmd-v23-waiter-workspace',
      '.pmd-v23-workspace-split',
      '.pmd-v26-add-items-area',
      '.pmd-v26-current-order-area'
    ].join(',');

    document.querySelectorAll(wrongAncestorSelectors).forEach(function (el) {
      var t = textOf(el);
      if (
        el.matches('.page-wrapper, .page-content, #pmd-owner-dashboard-clean-v1-root, .pmd-v15-shell, .pmd-v21-shell--waiter') ||
        t.includes('Table / Order Workspace') ||
        t.includes('Add more items') ||
        t.includes('My Table Orders') ||
        t.includes('Current table order')
      ) {
        el.classList.remove(
          'pmd-v28-floor-map',
          'pmd-v28-floor-card',
          'pmd-v28-my-orders-section',
          'pmd-v28-my-orders-grid',
          'pmd-v27-my-orders-section',
          'pmd-v27-my-orders-grid'
        );
      }
    });

    document.querySelectorAll('.pmd-v28-floor-map').forEach(function (el) {
      if (!el.matches('.pmd-v15-floor-wrap, .pmd-v15-floor-canvas')) {
        el.classList.remove('pmd-v28-floor-map');
      }
    });
  }

  function findRealFloorMap() {
    var exact =
      document.querySelector('.pmd-v15-floor-wrap.pmd-v15-floor-wrap--reference') ||
      document.querySelector('.pmd-v15-floor-wrap') ||
      document.querySelector('.pmd-v15-floor-canvas');

    if (exact) return exact;

    var candidates = Array.from(document.querySelectorAll('div, section')).filter(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      return r.width > 500 &&
        r.height > 250 &&
        t.includes('FREE') &&
        (t.includes('UNPAID') || t.includes('€23.99') || t.includes('€11.99')) &&
        !t.includes('Table / Order Workspace') &&
        !t.includes('My Table Orders') &&
        !t.includes('Add more items');
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (br.width * br.height) - (ar.width * ar.height);
    });

    return candidates[0] || null;
  }

  function setupFloorMap() {
    var map = findRealFloorMap();
    if (!map) return false;

    document.querySelectorAll('.pmd-v29-real-floor-map').forEach(function (el) {
      if (el !== map) el.classList.remove('pmd-v29-real-floor-map');
    });

    map.classList.add('pmd-v29-real-floor-map');

    Array.from(map.querySelectorAll('*')).forEach(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      var looksLikeTable = /^\d+\s*(FREE|UNPAID|€|WAITING)?/i.test(t) || /^Table\s+\d+/i.test(t);
      var goodSize = r.width >= 40 && r.width <= 220 && r.height >= 25 && r.height <= 140;

      if (looksLikeTable && goodSize) {
        el.classList.add('pmd-v29-table-node');

        if (/FREE/i.test(t)) {
          el.classList.add('pmd-v29-table-free');
        }

        if (/UNPAID|€|WAITING/i.test(t)) {
          el.classList.add('pmd-v29-table-busy');
        }
      }
    });

    return true;
  }

  function setupWorkspace() {
    var row = document.querySelector('.pmd-v21-waiter-workspace-row') ||
      Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
        var t = textOf(el);
        return t.includes('Table / Order Workspace') && t.includes('Same-page waiter actions');
      });

    if (!row) return false;

    row.classList.add('pmd-v29-workspace-row');
    row.classList.remove('pmd-v28-floor-map');

    if (workspaceOpenByUser) {
      row.classList.add('pmd-v29-workspace-open');
      row.classList.remove('pmd-v29-workspace-closed');
    } else {
      row.classList.add('pmd-v29-workspace-closed');
      row.classList.remove('pmd-v29-workspace-open');
    }

    return true;
  }

  function setWorkspace(open, scroll) {
    workspaceOpenByUser = !!open;
    setupWorkspace();

    var row = document.querySelector('.pmd-v29-workspace-row');
    if (open && scroll && row) {
      setTimeout(function () {
        try {
          row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          row.scrollIntoView();
        }
      }, 80);
    }
  }

  function setupOrders() {
    var section = Array.from(document.querySelectorAll('section, article, div')).find(function (el) {
      var t = textOf(el);
      return t.includes('My Table Orders') && t.includes('Current service orders');
    });

    if (!section) return 0;

    section.classList.add('pmd-v29-orders-section');

    var grid =
      section.querySelector('.pmd-v21-waiter-order-grid') ||
      section.querySelector('.pmd-v26-my-table-orders-grid') ||
      section.querySelector('.pmd-v15-card-body') ||
      section;

    grid.classList.add('pmd-v29-orders-grid');

    var cards = Array.from(section.querySelectorAll('article, div')).filter(function (el) {
      var t = textOf(el);
      var r = el.getBoundingClientRect();
      return t.includes('Order #') && r.width > 140 && r.height > 100;
    });

    var finalCards = [];

    cards.forEach(function (card) {
      if (!finalCards.some(function (parent) { return parent.contains(card); })) {
        finalCards.push(card);
      }
    });

    finalCards.forEach(function (card) {
      card.classList.add('pmd-v29-order-card');

      Array.from(card.querySelectorAll('button, a')).forEach(function (btn) {
        if (/add\s*items/i.test(textOf(btn))) btn.textContent = 'Add';
      });
    });

    return finalCards.length;
  }

  function apply() {
    if (applying) return;
    applying = true;

    try {
      if (!isWaiterRole()) return;

      document.documentElement.classList.add('pmd-waiter-final-v29');
      document.body.classList.add('pmd-waiter-final-v29');

      cleanupWrongOldClasses();
      hideWaiterTitle();
      setupRoleRail();
      setupFloorMap();
      setupWorkspace();
      setupOrders();
    } finally {
      applying = false;
    }
  }

  function isTableClick(target) {
    return !!(target && target.closest && target.closest('.pmd-v29-table-node, .pmd-v15-floor-wrap *, .pmd-v15-floor-canvas *, [data-table-id], [data-pmd-table-id]'));
  }

  document.addEventListener('click', function (e) {
    if (!isWaiterRole()) return;

    var workspace = document.querySelector('.pmd-v29-workspace-row');
    var rail = document.querySelector('.pmd-v29-role-rail');

    if (isTableClick(e.target)) {
      setWorkspace(true, true);
      setTimeout(apply, 60);
      return;
    }

    if (workspace && workspace.contains(e.target)) return;
    if (rail && rail.contains(e.target)) return;

    setWorkspace(false, false);
    setTimeout(apply, 60);
  }, true);

  function wrapSwitchRole() {
    var api = window.PMDOwnerDashboardCleanV1;
    if (!api || !api.switchRole || api.__pmdV29Wrapped) return;

    var oldSwitch = api.switchRole.bind(api);

    api.switchRole = function (role) {
      workspaceOpenByUser = false;
      var out = oldSwitch(role);
      setTimeout(apply, 80);
      setTimeout(apply, 350);
      setTimeout(apply, 900);
      return out;
    };

    api.__pmdV29Wrapped = true;
  }

  var mo = new MutationObserver(function () {
    if (!isWaiterRole()) return;
    clearTimeout(window.__pmdV29MoTimer);
    window.__pmdV29MoTimer = setTimeout(apply, 80);
  });

  try {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  } catch (e) {}

  apply();
  wrapSwitchRole();

  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 800);
  setTimeout(apply, 1600);

  window.addEventListener('resize', apply);

  window.PMDWaiterFinalV29 = {
    apply: apply,
    closeWorkspace: function () {
      setWorkspace(false, false);
      apply();
      return true;
    },
    openWorkspace: function () {
      setWorkspace(true, true);
      apply();
      return true;
    },
    check: function () {
      apply();

      var realMap = document.querySelector('.pmd-v29-real-floor-map');
      var wrongMaps = Array.from(document.querySelectorAll('.pmd-v28-floor-map, .pmd-v29-real-floor-map')).filter(function (el) {
        return el !== realMap;
      });

      var r = realMap ? realMap.getBoundingClientRect() : null;

      var result = {
        mark: MARK,
        role: window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole ? window.PMDOwnerDashboardCleanV1.currentRole() : null,
        realFloorMapFound: !!realMap,
        realFloorMapWidth: r ? Math.round(r.width) : 0,
        realFloorMapHeight: r ? Math.round(r.height) : 0,
        wrongFloorMaps: wrongMaps.length,
        workspaceClosed: !!document.querySelector('.pmd-v29-workspace-row.pmd-v29-workspace-closed'),
        workspaceOpen: !!document.querySelector('.pmd-v29-workspace-row.pmd-v29-workspace-open'),
        roleRail: !!document.querySelector('.pmd-v29-role-rail'),
        orderCards: document.querySelectorAll('.pmd-v29-order-card').length,
        horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
        canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20
      };

      console.log('[PMD Waiter Final v29]', result);
      console.table([result]);
      return result;
    }
  };

  console.info('[PMD] Waiter final cleanup v29 active');
})();

/* PMD_ROLE_CLEAN_SHELL_V30_JS */
(function () {
  var MARK = 'PMD_ROLE_CLEAN_SHELL_V30_JS';
  var applying = false;

  var ROLE_ORDER = ['owner', 'manager', 'kds', 'cashier', 'counter', 'waiter'];
  var ROLE_LABELS = {
    owner: 'Owner',
    manager: 'Manager',
    kds: 'KDS',
    cashier: 'Cashier',
    counter: 'Counter',
    reception: 'Counter',
    waiter: 'Waiter'
  };
  var ROLE_SHORT = {
    owner: 'O',
    manager: 'M',
    kds: 'K',
    cashier: 'C',
    counter: '☎',
    reception: '☎',
    waiter: 'W'
  };

  var CLEAN_SHELL_ROLES = {
    kds: true,
    cashier: true,
    reception: true,
    waiter: true
  };

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function clsOf(el) {
    return el && typeof el.className === 'string' ? el.className : '';
  }

  function currentRole() {
    try {
      var apiRole = window.PMDOwnerDashboardCleanV1 &&
        window.PMDOwnerDashboardCleanV1.currentRole &&
        window.PMDOwnerDashboardCleanV1.currentRole();

      if (apiRole) return String(apiRole).toLowerCase();
    } catch (e) {}

    var bodyClass = clsOf(document.body) + ' ' + clsOf(document.documentElement);
    var found = ROLE_ORDER.find(function (role) {
      return bodyClass.includes('role-' + role) ||
        bodyClass.includes('pmd-v21-role-' + role) ||
        bodyClass.includes('pmd-role-' + role);
    });

    return found || 'owner';
  }

  function roleFromTextOrIndex(btn, index) {
    var saved = btn.getAttribute('data-pmd-full-role-label') ||
      btn.getAttribute('aria-label') ||
      btn.getAttribute('data-role') ||
      btn.getAttribute('data-pmd-role') ||
      textOf(btn);

    var s = String(saved || '').toLowerCase();

    if (s.includes('owner') || s === 'o') return 'owner';
    if (s.includes('manager') || s === 'm') return 'manager';
    if (s.includes('kds') || s === 'k') return 'kds';
    if (s.includes('cashier') || s === 'c') return 'cashier';
    if (s.includes('counter') || s.includes('reception') || s === 'r' || s === '☎' || s === 'phone') return 'counter';
    if (s.includes('waiter') || s === 'w') return 'waiter';

    return ROLE_ORDER[index] || null;
  }

  function shellRoot() {
    return document.querySelector('#pmd-owner-dashboard-clean-v1-root') ||
      document.querySelector('.pmd-v15-shell') ||
      document.querySelector('.page-content') ||
      document.body;
  }

  function visibleEnough(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 0 &&
      r.height > 0 &&
      cs.display !== 'none' &&
      cs.visibility !== 'hidden';
  }

  function findRoleTabCandidates() {
    var selectors = [
      '.pmd-v30-role-rail',
      '.pmd-v29-role-rail',
      '.pmd-v28-role-rail',
      '.pmd-v27-mini-role-tabs',
      '.pmd-v26-role-tabs-in-topbar',
      '.pmd-v21-role-tabs',
      '.pmd-v20-role-tabs',
      '.pmd-v23-role-tabs',
      '.pmd-role-tabs',
      '[data-pmd-role-tabs]'
    ];

    var found = [];

    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.querySelectorAll('button, a').length >= 5) found.push(el);
      });
    });

    Array.from(document.querySelectorAll('div, nav, section')).forEach(function (el) {
      var t = textOf(el);
      var buttons = el.querySelectorAll('button, a');

      if (
        buttons.length >= 5 &&
        t.includes('Owner') &&
        t.includes('Manager') &&
        t.includes('KDS') &&
        t.includes('Cashier') &&
        (t.includes('Reception') || t.includes('Counter')) &&
        t.includes('Waiter')
      ) {
        found.push(el);
      }
    });

    var unique = [];
    found.forEach(function (el) {
      if (!unique.includes(el)) unique.push(el);
    });

    unique.sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });

    return unique;
  }

  function setupRoleRail(role) {
    var candidates = findRoleTabCandidates();
    if (!candidates.length) return false;

    var rail = candidates[0];

    candidates.forEach(function (el) {
      if (el === rail) {
        el.classList.remove('pmd-v30-role-tabs-hidden');
        el.classList.add('pmd-v30-role-rail');
      } else {
        el.classList.remove('pmd-v30-role-rail');
        el.classList.add('pmd-v30-role-tabs-hidden');
      }
    });

    Array.from(rail.querySelectorAll('button, a')).forEach(function (btn, index) {
      var r = roleFromTextOrIndex(btn, index);
      if (!r) return;

      btn.textContent = ROLE_SHORT[r];
      btn.title = ROLE_LABELS[r];
      btn.setAttribute('aria-label', ROLE_LABELS[r]);
      btn.setAttribute('data-pmd-full-role-label', ROLE_LABELS[r]);
      btn.setAttribute('data-pmd-role-final', r);
      btn.classList.add('pmd-v30-role-btn');
      btn.classList.toggle('pmd-v30-role-btn-active', r === role);

      if (!btn.__pmdV30ClickBound) {
        btn.__pmdV30ClickBound = true;

        btn.addEventListener('click', function (e) {
          var targetRole = btn.getAttribute('data-pmd-role-final');
          if (!targetRole) return;

          e.preventDefault();
          e.stopPropagation();

          try {
            window.PMDOwnerDashboardCleanV1 &&
              window.PMDOwnerDashboardCleanV1.switchRole &&
              window.PMDOwnerDashboardCleanV1.switchRole(targetRole);
          } catch (err) {}

          setTimeout(apply, 80);
          setTimeout(apply, 350);
          setTimeout(apply, 900);
        }, true);
      }
    });

    return true;
  }

  function applyShellClasses(role) {
    ROLE_ORDER.forEach(function (r) {
      document.documentElement.classList.remove('pmd-role-' + r + '-v30');
      document.body.classList.remove('pmd-role-' + r + '-v30');
    });

    document.documentElement.classList.add('pmd-role-rail-v30', 'pmd-role-' + role + '-v30');
    document.body.classList.add('pmd-role-rail-v30', 'pmd-role-' + role + '-v30');

    document.documentElement.classList.toggle('pmd-role-clean-shell-v30', !!CLEAN_SHELL_ROLES[role]);
    document.body.classList.toggle('pmd-role-clean-shell-v30', !!CLEAN_SHELL_ROLES[role]);
  }

  function hideAdminChromeForCleanRoles(role) {
    var clean = !!CLEAN_SHELL_ROLES[role];

    document.querySelectorAll(
      '#sidebar, #admin-sidebar, .sidebar, .sidebar-left, .sidebar-nav, .sidebar-menu, .main-sidebar, .admin-sidebar, .navbar-side, .side-menu, .layout-sidebar, .pmd-admin-sidebar, aside[class*="sidebar"], nav[class*="sidebar"]'
    ).forEach(function (el) {
      el.classList.toggle('pmd-v30-clean-hidden', clean);
    });

    document.querySelectorAll(
      '.main-header, .admin-header, .topbar, .top-bar, .navbar-fixed-top, .navbar-static-top, header.navbar, .layout-header'
    ).forEach(function (el) {
      var t = textOf(el);
      var isPmdDashboardHeader =
        t.includes('Live Restaurant Floor') ||
        t.includes('Revenue Today') ||
        t.includes('Kitchen Performance') ||
        t.includes('Upcoming Reservations') ||
        t.includes('Payment Breakdown') ||
        t.includes('My Table Orders');

      if (!isPmdDashboardHeader) {
        el.classList.toggle('pmd-v30-clean-hidden-top', clean);
      }
    });
  }

  function fixMainWidth(role) {
    if (!CLEAN_SHELL_ROLES[role]) return;

    document.querySelectorAll(
      '.page-wrapper, .page-content, #pmd-owner-dashboard-clean-v1-root, .content-wrapper, .main-content'
    ).forEach(function (el) {
      el.classList.add('pmd-v30-clean-main');
    });

    var root = shellRoot();
    if (root) root.classList.add('pmd-v30-clean-root');
  }

  function apply() {
    if (applying) return;
    applying = true;

    try {
      var role = currentRole();

      applyShellClasses(role);
      hideAdminChromeForCleanRoles(role);
      fixMainWidth(role);
      setupRoleRail(role);
    } finally {
      applying = false;
    }
  }

  function wrapSwitchRole() {
    var api = window.PMDOwnerDashboardCleanV1;
    if (!api || !api.switchRole || api.__pmdV30Wrapped) return;

    var oldSwitch = api.switchRole.bind(api);

    api.switchRole = function (role) {
      var out = oldSwitch(role);
      setTimeout(apply, 60);
      setTimeout(apply, 250);
      setTimeout(apply, 700);
      setTimeout(apply, 1300);
      return out;
    };

    api.__pmdV30Wrapped = true;
  }

  function countVisibleSideMenus() {
    return Array.from(document.querySelectorAll(
      '#sidebar, #admin-sidebar, .sidebar, .sidebar-left, .sidebar-nav, .sidebar-menu, .main-sidebar, .admin-sidebar, .navbar-side, .side-menu, .layout-sidebar, .pmd-admin-sidebar, aside[class*="sidebar"], nav[class*="sidebar"]'
    )).filter(function (el) {
      if (el.classList.contains('pmd-v30-clean-hidden')) return false;
      return visibleEnough(el);
    }).length;
  }

  function check() {
    apply();

    var role = currentRole();
    var rail = document.querySelector('.pmd-v30-role-rail');
    var r = rail ? rail.getBoundingClientRect() : null;

    var result = {
      mark: MARK,
      role: role,
      cleanShellActive: !!CLEAN_SHELL_ROLES[role],
      sideMenuVisibleCount: countVisibleSideMenus(),
      roleRailFound: !!rail,
      roleRailPosition: r ? {
        top: Math.round(r.top),
        right: Math.round(window.innerWidth - r.right),
        width: Math.round(r.width),
        height: Math.round(r.height)
      } : null,
      roleButtons: rail ? Array.from(rail.querySelectorAll('button, a')).map(function (btn) {
        return {
          text: textOf(btn),
          role: btn.getAttribute('data-pmd-role-final'),
          active: btn.classList.contains('pmd-v30-role-btn-active')
        };
      }) : [],
      horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
      canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20
    };

    console.log('[PMD Role Clean Shell v30]', result);
    console.table([{
      role: result.role,
      cleanShellActive: result.cleanShellActive,
      sideMenuVisibleCount: result.sideMenuVisibleCount,
      roleRailFound: result.roleRailFound,
      horizontalOverflowPx: result.horizontalOverflowPx,
      canScroll: result.canScroll
    }]);
    console.table(result.roleButtons);

    return result;
  }

  var mo = new MutationObserver(function () {
    clearTimeout(window.__pmdV30Timer);
    window.__pmdV30Timer = setTimeout(apply, 100);
  });

  try {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  } catch (e) {}

  wrapSwitchRole();
  apply();

  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 800);
  setTimeout(apply, 1600);

  window.addEventListener('resize', apply);

  window.PMDRoleCleanShellV30 = {
    apply: apply,
    check: check,
    currentRole: currentRole
  };

  console.info('[PMD] Role clean shell v30 active');
})();

/* PMD_ALL_ROLES_CLEAN_V31_JS */
(function () {
  var MARK = 'PMD_ALL_ROLES_CLEAN_V31_JS';
  var applying = false;

  var ROLES = ['owner', 'manager', 'kds', 'cashier', 'counter', 'waiter'];
  var LABELS = {
    owner: 'Owner',
    manager: 'Manager',
    kds: 'KDS',
    cashier: 'Cashier',
    counter: 'Counter',
    reception: 'Counter',
    waiter: 'Waiter'
  };
  var SHORT = {
    owner: 'O',
    manager: 'M',
    kds: 'K',
    cashier: 'C',
    counter: '☎',
    reception: '☎',
    waiter: 'W'
  };

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function clsOf(el) {
    return el && typeof el.className === 'string' ? el.className : '';
  }

  function currentRole() {
    try {
      var apiRole = window.PMDOwnerDashboardCleanV1 &&
        window.PMDOwnerDashboardCleanV1.currentRole &&
        window.PMDOwnerDashboardCleanV1.currentRole();

      if (apiRole) return String(apiRole).toLowerCase();
    } catch (e) {}

    var classes = clsOf(document.body) + ' ' + clsOf(document.documentElement);
    var found = ROLES.find(function (role) {
      return classes.includes('role-' + role) ||
        classes.includes('pmd-v21-role-' + role) ||
        classes.includes('pmd-role-' + role);
    });

    return found || 'owner';
  }

  function dashboardExists() {
    return !!document.querySelector('#pmd-owner-dashboard-clean-v1-root, .pmd-v15-shell, .pmd-v21-shell');
  }

  function hideNativeRoleTabs() {
    document.querySelectorAll(
      '.pmd-v30-role-rail, .pmd-v29-role-rail, .pmd-v28-role-rail, .pmd-v27-mini-role-tabs, .pmd-v26-role-tabs-in-topbar, .pmd-v21-role-tabs, .pmd-v20-role-tabs, .pmd-v23-role-tabs, .pmd-role-tabs, [data-pmd-role-tabs]'
    ).forEach(function (el) {
      if (el.id !== 'pmd-v31-role-rail') {
        el.classList.add('pmd-v31-native-role-tabs-hidden');
      }
    });

    Array.from(document.querySelectorAll('div, nav, section')).forEach(function (el) {
      if (el.id === 'pmd-v31-role-rail') return;

      var t = textOf(el);
      var btns = el.querySelectorAll('button, a');

      if (
        btns.length >= 5 &&
        t.includes('Owner') &&
        t.includes('Manager') &&
        t.includes('KDS') &&
        t.includes('Cashier') &&
        (t.includes('Reception') || t.includes('Counter')) &&
        t.includes('Waiter')
      ) {
        el.classList.add('pmd-v31-native-role-tabs-hidden');
      }
    });
  }

  function ensureRoleRail(role) {
    var rail = document.querySelector('#pmd-v31-role-rail');

    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'pmd-v31-role-rail';
      rail.className = 'pmd-v31-role-rail';
      rail.setAttribute('aria-label', 'PMD role dashboard switcher');
      document.body.appendChild(rail);
    }

    rail.innerHTML = '';

    ROLES.forEach(function (r) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-v31-role-btn' + (r === role ? ' is-active' : '');
      btn.textContent = SHORT[r];
      btn.title = LABELS[r];
      btn.setAttribute('aria-label', LABELS[r]);
      btn.setAttribute('data-pmd-role', r);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        try {
          window.PMDOwnerDashboardCleanV1 &&
            window.PMDOwnerDashboardCleanV1.switchRole &&
            window.PMDOwnerDashboardCleanV1.switchRole(r);
        } catch (err) {}

        setTimeout(apply, 80);
        setTimeout(apply, 300);
        setTimeout(apply, 900);
      }, true);

      rail.appendChild(btn);
    });
  }

  function hideAdminChrome() {
    document.querySelectorAll(
      '#sidebar, #admin-sidebar, .sidebar, .sidebar-left, .sidebar-nav, .sidebar-menu, .main-sidebar, .admin-sidebar, .navbar-side, .side-menu, .layout-sidebar, .pmd-admin-sidebar, aside[class*="sidebar"], nav[class*="sidebar"]'
    ).forEach(function (el) {
      el.classList.add('pmd-v31-hidden-admin-chrome');
    });

    document.querySelectorAll(
      '.main-header, .admin-header, .topbar, .top-bar, .navbar-fixed-top, .navbar-static-top, header.navbar, .layout-header'
    ).forEach(function (el) {
      var t = textOf(el);

      var looksLikeDashboardCard =
        t.includes('Live Restaurant Floor') ||
        t.includes('Revenue Today') ||
        t.includes('Open Checks') ||
        t.includes('Kitchen Performance') ||
        t.includes('Upcoming Reservations') ||
        t.includes('Payment Breakdown') ||
        t.includes('My Table Orders');

      if (!looksLikeDashboardCard) {
        el.classList.add('pmd-v31-hidden-admin-chrome');
      }
    });
  }

  function hideGreetingTopSections() {
    document.querySelectorAll(
      '.pmd-v15-topbar, .pmd-v19-topbar, .pmd-v21-topbar, .pmd-v23-topbar, .pmd-dashboard-hero, .pmd-role-hero'
    ).forEach(function (el) {
      el.classList.add('pmd-v31-hidden-dashboard-intro');
    });

    Array.from(document.querySelectorAll('header, section, div')).forEach(function (el) {
      var t = textOf(el);
      if (!t) return;

      var isIntro =
        t.includes('Good morning') ||
        t.includes('Good afternoon') ||
        t.includes('Good evening') ||
        t.includes("Here's what's happening") ||
        t.includes('Manager Dashboard') ||
        t.includes('Waiter Dashboard') ||
        t.includes('Owner Dashboard') ||
        t.includes('KDS Dashboard') ||
        t.includes('Cashier Dashboard') ||
        t.includes('Reception Dashboard') ||
        t.includes('Counter Dashboard');

      var hasCards =
        t.includes('Revenue Today') ||
        t.includes('Live Restaurant Floor') ||
        t.includes('Kitchen Performance') ||
        t.includes('My Table Orders');

      if (isIntro && !hasCards) {
        el.classList.add('pmd-v31-hidden-dashboard-intro');
      }
    });
  }

  function addCleanClasses(role) {
    document.documentElement.classList.add('pmd-all-roles-clean-v31', 'pmd-role-' + role + '-v31');
    document.body.classList.add('pmd-all-roles-clean-v31', 'pmd-role-' + role + '-v31');

    ROLES.forEach(function (r) {
      if (r !== role) {
        document.documentElement.classList.remove('pmd-role-' + r + '-v31');
        document.body.classList.remove('pmd-role-' + r + '-v31');
      }
    });

    document.querySelectorAll(
      '.page-wrapper, .page-content, #pmd-owner-dashboard-clean-v1-root, .content-wrapper, .main-content'
    ).forEach(function (el) {
      el.classList.add('pmd-v31-clean-main');
    });

    document.querySelectorAll(
      '.pmd-v15-shell, .pmd-v19-shell, .pmd-v21-shell, .pmd-v23-shell'
    ).forEach(function (el) {
      el.classList.add('pmd-v31-clean-shell');
    });
  }

  function wrapSwitchRole() {
    var api = window.PMDOwnerDashboardCleanV1;
    if (!api || !api.switchRole || api.__pmdV31Wrapped) return;

    var oldSwitch = api.switchRole.bind(api);

    api.switchRole = function (role) {
      var out = oldSwitch(role);
      setTimeout(apply, 60);
      setTimeout(apply, 250);
      setTimeout(apply, 700);
      setTimeout(apply, 1300);
      return out;
    };

    api.__pmdV31Wrapped = true;
  }

  function visibleEnough(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 0 &&
      r.height > 0 &&
      cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity) !== 0;
  }

  function countVisibleSidebars() {
    return Array.from(document.querySelectorAll(
      '#sidebar, #admin-sidebar, .sidebar, .sidebar-left, .sidebar-nav, .sidebar-menu, .main-sidebar, .admin-sidebar, .navbar-side, .side-menu, .layout-sidebar, .pmd-admin-sidebar, aside[class*="sidebar"], nav[class*="sidebar"]'
    )).filter(function (el) {
      if (el.classList.contains('pmd-v31-hidden-admin-chrome')) return false;
      return visibleEnough(el);
    }).length;
  }

  function apply() {
    if (applying) return;
    if (!dashboardExists()) return;

    applying = true;

    try {
      var role = currentRole();

      addCleanClasses(role);
      hideAdminChrome();
      hideGreetingTopSections();
      hideNativeRoleTabs();
      ensureRoleRail(role);
    } finally {
      applying = false;
    }
  }

  function check() {
    apply();

    var rail = document.querySelector('#pmd-v31-role-rail');
    var railRect = rail ? rail.getBoundingClientRect() : null;

    var introVisible = Array.from(document.querySelectorAll(
      '.pmd-v15-topbar, .pmd-v19-topbar, .pmd-v21-topbar, .pmd-v23-topbar'
    )).filter(visibleEnough).length;

    var result = {
      mark: MARK,
      role: currentRole(),
      sidebarsVisible: countVisibleSidebars(),
      introTopbarsVisible: introVisible,
      railFound: !!rail,
      railPosition: railRect ? {
        top: Math.round(railRect.top),
        right: Math.round(window.innerWidth - railRect.right),
        width: Math.round(railRect.width),
        height: Math.round(railRect.height)
      } : null,
      horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
      canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20,
      rootTop: (function () {
        var root = document.querySelector('#pmd-owner-dashboard-clean-v1-root');
        if (!root) return null;
        return Math.round(root.getBoundingClientRect().top);
      })()
    };

    console.log('[PMD All Roles Clean v31]', result);
    console.table([result]);

    return result;
  }

  var mo = new MutationObserver(function () {
    clearTimeout(window.__pmdV31Timer);
    window.__pmdV31Timer = setTimeout(apply, 100);
  });

  try {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  } catch (e) {}

  wrapSwitchRole();
  apply();

  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 800);
  setTimeout(apply, 1600);

  window.addEventListener('resize', apply);

  window.PMDAllRolesCleanV31 = {
    apply: apply,
    check: check,
    currentRole: currentRole
  };

  console.info('[PMD] All roles clean dashboard v31 active');
})();

/* PMD_KDS_STABLE_V34_JS */
(function () {
  var MARK = 'PMD_KDS_STABLE_V34_JS';
  var KDS_BASE_URL = '/admin/kitchendisplay/main-kitchen';
  var applying = false;
  var observerStarted = false;

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function clsOf(el) {
    return el && typeof el.className === 'string' ? el.className : '';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 0 &&
      r.height > 0 &&
      cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity) !== 0;
  }

  function setI(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function currentRole() {
    try {
      if (window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.currentRole) {
        return String(window.PMDOwnerDashboardCleanV1.currentRole() || '').toLowerCase();
      }
    } catch (e) {}

    var all = String(document.documentElement.className || '') + ' ' + String(document.body.className || '');
    if (all.toLowerCase().includes('kds')) return 'kds';
    return '';
  }

  function isDashboardPage() {
    return location.pathname.indexOf('/admin/dashboard') !== -1;
  }

  function isDirectKdsPage() {
    return location.pathname.indexOf('/admin/kitchendisplay/main-kitchen') !== -1;
  }

  function isKdsActive() {
    return isDirectKdsPage() || currentRole() === 'kds';
  }

  function findRoot() {
    return document.querySelector('#pmd-owner-dashboard-clean-v1-root') ||
      document.querySelector('.page-content') ||
      document.body;
  }

  function findShell() {
    return document.querySelector('.pmd-v21-shell') ||
      document.querySelector('.pmd-v19-shell') ||
      document.querySelector('.pmd-v15-shell') ||
      findRoot();
  }

  function findKpiGrid() {
    var shell = findShell();

    return shell.querySelector('.pmd-v15-kpi-grid, .pmd-v19-kpi-grid, .pmd-v21-kpi-grid, section[class*="kpi"]');
  }

  function addStyle() {
    if (document.querySelector('#pmd-kds-stable-v34-style')) return;

    var style = document.createElement('style');
    style.id = 'pmd-kds-stable-v34-style';
    style.textContent = `
      html.pmd-kds-stable-v34,
      body.pmd-kds-stable-v34 {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        background: #f4f7fa !important;
      }

      body.pmd-kds-stable-v34 .sidebar,
      body.pmd-kds-stable-v34 .sidebar-wrapper,
      body.pmd-kds-stable-v34 .side-menu,
      body.pmd-kds-stable-v34 .navbar-side,
      body.pmd-kds-stable-v34 .main-sidebar,
      body.pmd-kds-stable-v34 .layout-sidebar,
      body.pmd-kds-stable-v34 .pmd-admin-sidebar,
      body.pmd-kds-stable-v34 #sidebar,
      body.pmd-kds-stable-v34 #sidebar-menu,
      body.pmd-kds-stable-v34 #side-menu,
      body.pmd-kds-stable-v34 aside[class*="sidebar"],
      body.pmd-kds-stable-v34 nav[class*="sidebar"] {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }

      body.pmd-kds-stable-v34 .navbar-fixed-top,
      body.pmd-kds-stable-v34 .main-header,
      body.pmd-kds-stable-v34 .admin-header,
      body.pmd-kds-stable-v34 .header-navbar,
      body.pmd-kds-stable-v34 .page-header,
      body.pmd-kds-stable-v34 .topbar,
      body.pmd-kds-stable-v34 .pmd-v15-topbar,
      body.pmd-kds-stable-v34 .pmd-v19-topbar,
      body.pmd-kds-stable-v34 .pmd-v21-topbar {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      body.pmd-kds-stable-v34 .page-wrapper,
      body.pmd-kds-stable-v34 .page-content,
      body.pmd-kds-stable-v34 #pmd-owner-dashboard-clean-v1-root {
        left: 0 !important;
        right: auto !important;
        margin-left: 0 !important;
        padding-left: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        min-width: 0 !important;
        transform: none !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
      }

      body.pmd-kds-stable-v34 #pmd-owner-dashboard-clean-v1-root {
        padding: 18px 22px 40px 22px !important;
      }

      body.pmd-kds-stable-v34 .pmd-v15-shell,
      body.pmd-kds-stable-v34 .pmd-v19-shell,
      body.pmd-kds-stable-v34 .pmd-v21-shell {
        width: 100% !important;
        max-width: calc(100vw - 44px) !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      body.pmd-kds-stable-v34 .pmd-kds-stable-v34-section {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 18px 0 0 0 !important;
        background: #fff !important;
        border: 1px solid #dde5ee !important;
        border-radius: 20px !important;
        overflow: hidden !important;
        box-shadow: 0 18px 40px rgba(15, 23, 42, .06) !important;
      }

      body.pmd-kds-stable-v34 .pmd-kds-stable-v34-head {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 18px 22px !important;
        border-bottom: 1px solid #e5edf5 !important;
        background: #fff !important;
      }

      body.pmd-kds-stable-v34 .pmd-kds-stable-v34-head h2 {
        margin: 0 !important;
        font-size: 24px !important;
        font-weight: 900 !important;
        color: #0f1f2a !important;
      }

      body.pmd-kds-stable-v34 .pmd-kds-stable-v34-head span {
        color: #64748b !important;
        font-weight: 800 !important;
        font-size: 13px !important;
      }

      body.pmd-kds-stable-v34 .pmd-kds-stable-v34-frame {
        display: block !important;
        width: 100% !important;
        height: calc(100vh - 245px) !important;
        min-height: 760px !important;
        border: 0 !important;
        background: #f6f8fb !important;
      }

      body.pmd-kds-stable-v34 .pmd-role-clean-rail-v30,
      body.pmd-kds-stable-v34 .pmd-all-role-rail-v31,
      body.pmd-kds-stable-v34 .pmd-v28-role-rail {
        position: fixed !important;
        right: 12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 99999 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function hideAdminChrome() {
    var selector = [
      '.sidebar',
      '.sidebar-wrapper',
      '.side-menu',
      '.navbar-side',
      '.main-sidebar',
      '.layout-sidebar',
      '.pmd-admin-sidebar',
      '#sidebar',
      '#sidebar-menu',
      '#side-menu',
      'aside[class*="sidebar"]',
      'nav[class*="sidebar"]'
    ].join(',');

    document.querySelectorAll(selector).forEach(function (el) {
      setI(el, 'display', 'none');
      setI(el, 'width', '0');
      setI(el, 'min-width', '0');
      setI(el, 'max-width', '0');
      setI(el, 'opacity', '0');
      setI(el, 'pointer-events', 'none');
      setI(el, 'visibility', 'hidden');
    });

    // Catch custom left menu if class name is different.
    Array.from(document.body.children).forEach(function (el) {
      if (!visible(el)) return;

      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);

      var looksLikeLeftSidebar =
        r.left <= 130 &&
        r.width >= 45 &&
        r.width <= 150 &&
        r.height > window.innerHeight * 0.55 &&
        (cs.position === 'fixed' || cs.position === 'absolute' || cs.position === 'sticky');

      if (looksLikeLeftSidebar && !el.closest('#pmd-owner-dashboard-clean-v1-root')) {
        setI(el, 'display', 'none');
        setI(el, 'visibility', 'hidden');
        setI(el, 'opacity', '0');
        setI(el, 'pointer-events', 'none');
      }
    });
  }

  function cleanDirectKdsPage() {
    if (!isDirectKdsPage()) return;

    document.documentElement.classList.add('pmd-kds-direct-clean-v34');
    document.body.classList.add('pmd-kds-direct-clean-v34');

    if (!document.querySelector('#pmd-kds-direct-clean-v34-style')) {
      var style = document.createElement('style');
      style.id = 'pmd-kds-direct-clean-v34-style';
      style.textContent = `
        img[src*="pmd-logo"],
        img[src*="paymydine"],
        img[alt*="PayMyDine"],
        .logo,
        .brand-logo,
        .navbar-brand,
        .pmd-logo,
        .kds-logo {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        body {
          background: #f6f8fb !important;
        }

        [class*="order-card"],
        .order-card,
        .kds-order-card {
          border-radius: 18px !important;
          box-shadow: 0 16px 34px rgba(15,23,42,.08) !important;
        }

        button,
        .btn {
          border-radius: 12px !important;
          font-weight: 800 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  function buildKdsUrl() {
    return KDS_BASE_URL + '?embed=1&pmd_clean=1&pmd_stable_v34=' + Date.now();
  }

  function injectIframeCleanup(iframe) {
    if (!iframe || iframe.dataset.pmdKdsStableV34Bound === '1') return;

    iframe.dataset.pmdKdsStableV34Bound = '1';

    iframe.addEventListener('load', function () {
      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc || !doc.head) return;

        doc.querySelector('#pmd-kds-iframe-clean-v34')?.remove();

        var css = doc.createElement('style');
        css.id = 'pmd-kds-iframe-clean-v34';
        css.textContent = `
          body {
            background: #f6f8fb !important;
          }

          img[src*="pmd-logo"],
          img[src*="paymydine"],
          img[alt*="PayMyDine"],
          .logo,
          .brand-logo,
          .navbar-brand,
          .pmd-logo,
          .kds-logo {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          [class*="order-card"],
          .order-card,
          .kds-order-card {
            border-radius: 18px !important;
            box-shadow: 0 16px 34px rgba(15,23,42,.08) !important;
          }

          button,
          .btn {
            border-radius: 12px !important;
            font-weight: 800 !important;
          }
        `;
        doc.head.appendChild(css);

        // Extra direct cleanup for logo elements without useful class names.
        Array.from(doc.querySelectorAll('img, svg, a, div, section, header')).forEach(function (el) {
          var t = textOf(el);
          var src = String(el.getAttribute && (el.getAttribute('src') || '') || '').toLowerCase();
          var cls = clsOf(el).toLowerCase();

          if (
            src.includes('logo') ||
            src.includes('paymydine') ||
            cls.includes('logo') ||
            t === 'PayMyDine'
          ) {
            var r = el.getBoundingClientRect();
            if (r.top < 260 || t === 'PayMyDine') {
              setI(el, 'display', 'none');
              setI(el, 'visibility', 'hidden');
              setI(el, 'opacity', '0');
              setI(el, 'height', '0');
              setI(el, 'margin', '0');
              setI(el, 'padding', '0');
            }
          }
        });
      } catch (e) {
        console.warn('[PMD KDS v34] iframe cleanup skipped:', e.message);
      }
    });
  }

  function ensureKdsEmbed() {
    var shell = findShell();
    if (!shell) return null;

    var kpi = findKpiGrid();

    var section = document.querySelector('#pmd-kds-stable-v34-section');
    if (!section) {
      section = document.createElement('section');
      section.id = 'pmd-kds-stable-v34-section';
      section.className = 'pmd-kds-stable-v34-section';
      section.innerHTML = [
        '<div class="pmd-kds-stable-v34-head">',
          '<div>',
            '<h2>Kitchen Display</h2>',
            '<span>Main Kitchen live KDS</span>',
          '</div>',
        '</div>',
        '<iframe class="pmd-kds-stable-v34-frame" loading="eager" referrerpolicy="same-origin"></iframe>'
      ].join('');

      if (kpi && kpi.parentElement) {
        kpi.insertAdjacentElement('afterend', section);
      } else {
        shell.appendChild(section);
      }
    }

    var iframe = section.querySelector('iframe');
    if (iframe) {
      injectIframeCleanup(iframe);

      if (!iframe.getAttribute('src') || iframe.getAttribute('src').indexOf('/admin/kitchendisplay/main-kitchen') === -1) {
        iframe.setAttribute('src', buildKdsUrl());
      }
    }

    return section;
  }

  function hideOldRoleCards() {
    var shell = findShell();
    var kpi = findKpiGrid();
    var embed = document.querySelector('#pmd-kds-stable-v34-section');

    if (!shell || !embed) return;

    Array.from(shell.children).forEach(function (child) {
      var isKpi = child === kpi || (kpi && child.contains(kpi));
      var isEmbed = child === embed || child.contains(embed);
      var isRoleRail =
        clsOf(child).includes('role-rail') ||
        textOf(child) === 'O M K C R W';

      if (isKpi || isEmbed || isRoleRail) {
        setI(child, 'display', '');
        setI(child, 'visibility', 'visible');
        setI(child, 'height', '');
        setI(child, 'overflow', '');
        return;
      }

      setI(child, 'display', 'none');
      setI(child, 'visibility', 'hidden');
      setI(child, 'height', '0');
      setI(child, 'overflow', 'hidden');
      child.setAttribute('data-pmd-kds-v34-hidden-old-role-card', '1');
    });

    document.querySelectorAll('.pmd-v15-card, .pmd-v19-card, .pmd-v21-card').forEach(function (card) {
      if (card.closest('#pmd-kds-stable-v34-section')) return;
      if (kpi && kpi.contains(card)) return;

      var t = textOf(card);
      if (
        t.includes('Kitchen Performance') ||
        t.includes('Top Open Items') ||
        t.includes('AI Alerts') ||
        t.includes('Live Timeline') ||
        t.includes('Quick Actions')
      ) {
        setI(card, 'display', 'none');
        setI(card, 'visibility', 'hidden');
        card.setAttribute('data-pmd-kds-v34-hidden-old-card', '1');
      }
    });
  }

  function apply() {
    if (!isKdsActive()) return;

    if (applying) return;
    applying = true;

    try {
      addStyle();

      document.documentElement.classList.add('pmd-kds-stable-v34');
      document.body.classList.add('pmd-kds-stable-v34');

      cleanDirectKdsPage();

      if (isDashboardPage()) {
        hideAdminChrome();
        ensureKdsEmbed();
        hideOldRoleCards();

        setI(document.querySelector('.page-wrapper'), 'left', '0');
        setI(document.querySelector('.page-wrapper'), 'margin-left', '0');
        setI(document.querySelector('.page-wrapper'), 'width', '100vw');

        setI(document.querySelector('.page-content'), 'left', '0');
        setI(document.querySelector('.page-content'), 'margin-left', '0');
        setI(document.querySelector('.page-content'), 'width', '100vw');

        setI(document.querySelector('#pmd-owner-dashboard-clean-v1-root'), 'width', '100vw');
        setI(document.querySelector('#pmd-owner-dashboard-clean-v1-root'), 'max-width', '100vw');
      }
    } finally {
      applying = false;
    }
  }

  function applySoon() {
    [0, 80, 180, 350, 700, 1200, 2000, 3200].forEach(function (ms) {
      setTimeout(apply, ms);
    });
  }

  function patchSwitchRole() {
    if (!window.PMDOwnerDashboardCleanV1 || window.PMDOwnerDashboardCleanV1.__pmdKdsStableV34Patched) return;

    var oldSwitch = window.PMDOwnerDashboardCleanV1.switchRole &&
      window.PMDOwnerDashboardCleanV1.switchRole.bind(window.PMDOwnerDashboardCleanV1);

    if (!oldSwitch) return;

    window.PMDOwnerDashboardCleanV1.switchRole = function (role) {
      var res = oldSwitch(role);

      if (String(role || '').toLowerCase() === 'kds') {
        applySoon();
      }

      return res;
    };

    window.PMDOwnerDashboardCleanV1.__pmdKdsStableV34Patched = true;
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    var target = document.querySelector('#pmd-owner-dashboard-clean-v1-root') || document.body;

    var obs = new MutationObserver(function () {
      if (isKdsActive()) {
        applySoon();
      }
    });

    obs.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    window.__PMDKdsStableV34Observer = obs;
  }

  function check() {
    apply();

    var sidebars = Array.from(document.querySelectorAll(
      '.sidebar, .sidebar-wrapper, .side-menu, .navbar-side, .main-sidebar, .layout-sidebar, .pmd-admin-sidebar, #sidebar, #sidebar-menu, #side-menu, aside[class*="sidebar"], nav[class*="sidebar"]'
    )).filter(visible);

    var embed = document.querySelector('#pmd-kds-stable-v34-section');
    var iframe = embed && embed.querySelector('iframe');

    var kpi = findKpiGrid();

    var oldCards = Array.from(document.querySelectorAll('.pmd-v15-card, .pmd-v19-card, .pmd-v21-card'))
      .filter(visible)
      .filter(function (card) {
        if (card.closest('#pmd-kds-stable-v34-section')) return false;
        if (kpi && kpi.contains(card)) return false;

        var t = textOf(card);
        return t.includes('Kitchen Performance') ||
          t.includes('Top Open Items') ||
          t.includes('AI Alerts') ||
          t.includes('Live Timeline') ||
          t.includes('Quick Actions');
      });

    var result = {
      mark: MARK,
      role: currentRole(),
      directKdsPage: isDirectKdsPage(),
      kdsActive: isKdsActive(),
      sidebarsVisible: sidebars.length,
      kpiGridFound: !!kpi,
      kpiCards: kpi ? kpi.children.length : 0,
      embedFound: !!embed,
      iframeFound: !!iframe,
      iframeSrc: iframe ? iframe.getAttribute('src') : null,
      oldKdsCardsStillVisible: oldCards.length,
      horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
      canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight + 20
    };

    window.PMD_KDS_STABLE_V34_RESULT = result;

    console.log('[PMD KDS Stable v34]', result);
    console.table([result]);

    return result;
  }

  async function testSwitch() {
    if (!window.PMDOwnerDashboardCleanV1) {
      console.warn('PMDOwnerDashboardCleanV1 missing');
      return check();
    }

    window.PMDOwnerDashboardCleanV1.switchRole('cashier');
    await sleep(450);

    window.PMDOwnerDashboardCleanV1.switchRole('kds');
    await sleep(2600);

    return check();
  }

  patchSwitchRole();
  startObserver();
  applySoon();

  window.PMDKdsStableV34 = {
    mark: MARK,
    apply: apply,
    applySoon: applySoon,
    check: check,
    testSwitch: testSwitch,
    refreshIframe: function () {
      var iframe = document.querySelector('#pmd-kds-stable-v34-section iframe');
      if (iframe) iframe.setAttribute('src', buildKdsUrl());
      applySoon();
    }
  };

  console.info('[PMD] KDS stable embed v34 active');
})();


/* PMD_KDS_NO_DOUBLE_HEADER_V44_JS */
(function () {
  var MARK = 'PMD_KDS_NO_DOUBLE_HEADER_V44_JS';
  var intervalStarted = false;

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    try {
      return String(window.PMDOwnerDashboardCleanV1?.currentRole?.() || '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function setI(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function findGrid() {
    return document.querySelector('.pmd-v15-kpi-grid, .pmd-v19-kpi-grid, .pmd-v21-kpi-grid');
  }

  function findIframe() {
    return document.querySelector(
      '#pmd-kds-stable-v34-section iframe, #pmd-kds-livefix-v34-section iframe, iframe[src*="/admin/kitchendisplay/main-kitchen"]'
    );
  }

  function iframeDoc() {
    try {
      var iframe = findIframe();
      return iframe && (iframe.contentDocument || iframe.contentWindow.document);
    } catch (e) {
      return null;
    }
  }

  function iframeWin() {
    try {
      var iframe = findIframe();
      return iframe && iframe.contentWindow;
    } catch (e) {
      return null;
    }
  }

  function readIframeData() {
    var doc = iframeDoc();
    var data = {
      reservations: '0',
      clock: '',
      stations: [],
      activeStation: ''
    };

    if (!doc) return data;

    doc.documentElement.classList.add('pmd-kds-embedded-clean-v44');
    doc.body && doc.body.classList.add('pmd-kds-embedded-clean-v44');

    doc.querySelectorAll(
      '.kds-header, .pmd-kds-toolbar-cards-v39, [data-pmd-kds-top-card-v40], #pmd-kds-actions-card-v41, .pmd-kds-stable-v34-head, .pmd-kds-final-v33-head, .pmd-kds-livefix-v34-head'
    ).forEach(function (el) {
      setI(el, 'display', 'none');
      setI(el, 'height', '0');
      setI(el, 'margin', '0');
      setI(el, 'padding', '0');
      setI(el, 'overflow', 'hidden');
      setI(el, 'visibility', 'hidden');
    });

    var resEl = doc.querySelector('#reservations-count');
    if (resEl) data.reservations = textOf(resEl).match(/\d+/)?.[0] || '0';

    var clockEl = doc.querySelector('#clock');
    if (clockEl) data.clock = textOf(clockEl) || '';

    var selector = doc.querySelector('#station-selector');
    if (selector) {
      data.activeStation = selector.value || '';
      data.stations = Array.from(selector.options || []).map(function (opt) {
        return {
          value: opt.value,
          label: (opt.textContent || '').replace(/\s+/g, ' ').trim(),
          selected: opt.selected
        };
      }).filter(function (opt) {
        return opt.label;
      });
    }

    return data;
  }

  function numberFromOriginalCard(title, fallback) {
    var grid = findGrid();
    if (!grid) return fallback;

    var card = Array.from(grid.children).find(function (el) {
      if (el.classList.contains('pmd-kds-v44-card')) return false;
      return textOf(el).toLowerCase().includes(title.toLowerCase());
    });

    if (!card) return fallback;

    var candidates = Array.from(card.querySelectorAll('*')).map(function (el) {
      var t = textOf(el);
      if (!/^\d+$/.test(t)) return null;

      var cs = getComputedStyle(el);
      var fs = parseFloat(cs.fontSize || '0') || 0;

      return {
        text: t,
        fontSize: fs,
        area: el.getBoundingClientRect().width * el.getBoundingClientRect().height
      };
    }).filter(Boolean);

    candidates.sort(function (a, b) {
      return (b.fontSize - a.fontSize) || (b.area - a.area);
    });

    if (candidates[0]) return candidates[0].text;

    var m = textOf(card).match(/\d+/);
    return m ? m[0] : fallback;
  }

  function cardHtml(icon, label, value) {
    return [
      '<div class="pmd-kds-v44-icon">' + icon + '</div>',
      '<div class="pmd-kds-v44-content">',
        '<span class="pmd-kds-v44-label">' + label + '</span>',
        '<strong class="pmd-kds-v44-value">' + value + '</strong>',
      '</div>'
    ].join('');
  }

  function ensureCard(grid, id, cls) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('section');
      el.id = id;
      grid.appendChild(el);
    }
    el.className = 'pmd-kds-v44-card ' + cls;
    return el;
  }

  function renderControls(grid, data) {
    var card = ensureCard(grid, 'pmd-kds-v44-controls-card', 'is-controls');

    var stationButtons = '';
    if (data.stations && data.stations.length > 1) {
      stationButtons = data.stations.map(function (s) {
        var active = s.selected ? ' is-active' : '';
        return '<button type="button" class="pmd-kds-v44-station-btn' + active + '" data-pmd-kds-v44-station="' + s.value + '">' + s.label + '</button>';
      }).join('');
    } else {
      stationButtons = '<button type="button" class="pmd-kds-v44-station-btn is-active" disabled>Main Kitchen</button>';
    }

    card.innerHTML = [
      '<div class="pmd-kds-v44-controls-wrap">',
        '<span class="pmd-kds-v44-label">Controls</span>',
        '<button type="button" class="pmd-kds-v44-controls-button" data-pmd-kds-v44-toggle>Controls ▾</button>',
        '<div class="pmd-kds-v44-controls-menu">',
          '<div class="pmd-kds-v44-menu-title">Station</div>',
          '<div class="pmd-kds-v44-menu-row">' + stationButtons + '</div>',
          '<div class="pmd-kds-v44-menu-title">Actions</div>',
          '<div class="pmd-kds-v44-menu-row">',
            '<button type="button" class="pmd-kds-v44-menu-btn" data-pmd-kds-v44-action="mute">🔔 Mute / Unmute</button>',
            '<button type="button" class="pmd-kds-v44-menu-btn" data-pmd-kds-v44-action="sync">↻ Sync</button>',
            '<a class="pmd-kds-v44-menu-btn" href="/admin/kds_stations">⚙ Settings</a>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function removeDoubleHeaders() {
    document.querySelectorAll(
      '.pmd-kds-stable-v34-head, .pmd-kds-final-v33-head, .pmd-kds-livefix-v34-head, [data-pmd-kds-top-card-v40], #pmd-kds-actions-card-v41'
    ).forEach(function (el) {
      if (el.closest('.pmd-v15-kpi-grid, .pmd-v19-kpi-grid, .pmd-v21-kpi-grid') && el.classList.contains('pmd-kds-v44-card')) return;

      setI(el, 'display', 'none');
      setI(el, 'height', '0');
      setI(el, 'min-height', '0');
      setI(el, 'max-height', '0');
      setI(el, 'margin', '0');
      setI(el, 'padding', '0');
      setI(el, 'border', '0');
      setI(el, 'overflow', 'hidden');
      setI(el, 'visibility', 'hidden');
    });
  }

  function apply() {
    if (currentRole() !== 'kds') {
      document.documentElement.classList.remove('pmd-kds-no-double-header-v44');
      document.body.classList.remove('pmd-kds-no-double-header-v44');
      return;
    }

    document.documentElement.classList.add('pmd-kds-no-double-header-v44');
    document.body.classList.add('pmd-kds-no-double-header-v44');

    if (window.PMDKdsStableV34?.apply) {
      window.PMDKdsStableV34.apply();
    }

    removeDoubleHeaders();

    var grid = findGrid();
    if (!grid) return;

    var data = readIframeData();

    var kitchenQueue = numberFromOriginalCard('Kitchen Queue', '0');
    var ready = numberFromOriginalCard('Ready', '0');
    var openChecks = numberFromOriginalCard('Open Checks', '0');
    var reservations = data.reservations || '0';
    var clock = data.clock || new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});

    var c1 = ensureCard(grid, 'pmd-kds-v44-kitchen-card', 'is-kitchen');
    var c2 = ensureCard(grid, 'pmd-kds-v44-ready-card', 'is-ready');
    var c3 = ensureCard(grid, 'pmd-kds-v44-open-card', 'is-open');
    var c4 = ensureCard(grid, 'pmd-kds-v44-reservations-card', 'is-reservations');
    var c5 = ensureCard(grid, 'pmd-kds-v44-clock-card', 'is-clock');

    c1.innerHTML = cardHtml('👨‍🍳', 'Kitchen Queue', kitchenQueue);
    c2.innerHTML = cardHtml('✅', 'Ready', ready);
    c3.innerHTML = cardHtml('🧾', 'Open Checks', openChecks);
    c4.innerHTML = cardHtml('📅', 'Reservations', reservations);
    c5.innerHTML = cardHtml('⏱️', 'Live Time', clock);
    renderControls(grid, data);

    [c1, c2, c3, c4, c5, document.getElementById('pmd-kds-v44-controls-card')].forEach(function (card) {
      if (card) grid.appendChild(card);
    });

    Array.from(grid.children).forEach(function (child) {
      if (!child.classList.contains('pmd-kds-v44-card')) {
        setI(child, 'display', 'none');
      }
    });

    removeDoubleHeaders();
  }

  function check() {
    apply();

    var grid = findGrid();
    var visibleCards = grid ? Array.from(grid.children).filter(visible) : [];
    var badHeaders = Array.from(document.querySelectorAll('.pmd-kds-stable-v34-head, .pmd-kds-final-v33-head, .pmd-kds-livefix-v34-head')).filter(visible);

    var result = {
      mark: MARK,
      role: currentRole(),
      visibleTopCards: visibleCards.length,
      doubleHeadersVisible: badHeaders.length,
      hasReservations: !!document.getElementById('pmd-kds-v44-reservations-card'),
      hasControls: !!document.getElementById('pmd-kds-v44-controls-card'),
      gridHeight: grid ? Math.round(grid.getBoundingClientRect().height) : null,
      oneRow: grid ? Math.round(grid.getBoundingClientRect().height) <= 125 : false,
      horizontalOverflowPx: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth
    };

    console.log('[PMD KDS No Double Header v44]', result);
    console.table([result]);
    return result;
  }

  document.addEventListener('click', function (ev) {
    var toggle = ev.target.closest('[data-pmd-kds-v44-toggle]');
    var card = document.getElementById('pmd-kds-v44-controls-card');

    if (toggle && card) {
      ev.preventDefault();
      ev.stopPropagation();
      card.classList.toggle('is-open');
      return;
    }

    var stationBtn = ev.target.closest('[data-pmd-kds-v44-station]');
    if (stationBtn) {
      ev.preventDefault();
      ev.stopPropagation();

      var win = iframeWin();
      var doc = iframeDoc();
      var value = stationBtn.getAttribute('data-pmd-kds-v44-station');

      try {
        var selector = doc && doc.querySelector('#station-selector');
        if (selector) selector.value = value;
        if (win && typeof win.changeStation === 'function') win.changeStation(value);
      } catch (e) {}

      setTimeout(apply, 400);
      return;
    }

    var action = ev.target.closest('[data-pmd-kds-v44-action]');
    if (action) {
      ev.preventDefault();
      ev.stopPropagation();

      var type = action.getAttribute('data-pmd-kds-v44-action');
      var win = iframeWin();

      try {
        if (type === 'mute' && win && typeof win.toggleMute === 'function') win.toggleMute();

        if (type === 'sync') {
          if (win && typeof win.fetchOrders === 'function') win.fetchOrders();
          else if (win) win.location.reload();
        }
      } catch (e) {}

      setTimeout(apply, 500);
      return;
    }

    if (card && !ev.target.closest('#pmd-kds-v44-controls-card')) {
      card.classList.remove('is-open');
    }
  }, true);

  if (window.PMDOwnerDashboardCleanV1 && !window.PMDOwnerDashboardCleanV1.__pmdKdsNoDoubleHeaderV44Patched) {
    var oldSwitch = window.PMDOwnerDashboardCleanV1.switchRole?.bind(window.PMDOwnerDashboardCleanV1);

    if (oldSwitch) {
      window.PMDOwnerDashboardCleanV1.switchRole = function (nextRole) {
        var res = oldSwitch(nextRole);

        [80, 250, 600, 1200, 2200].forEach(function (ms) {
          setTimeout(apply, ms);
        });

        return res;
      };

      window.PMDOwnerDashboardCleanV1.__pmdKdsNoDoubleHeaderV44Patched = true;
    }
  }

  if (!intervalStarted) {
    intervalStarted = true;
    setInterval(function () {
      if (currentRole() === 'kds') apply();
    }, 1000);
  }

  window.PMDKdsNoDoubleHeaderV44 = {
    mark: MARK,
    apply: apply,
    check: check
  };

  [100, 400, 900, 1600, 2600].forEach(function (ms) {
    setTimeout(apply, ms);
  });

  console.info('[PMD] KDS no double header v44 active');
})();


})();
/* PMD_DASHBOARD_ROUTE_GUARD_V51_END */

/* PMD Counter Rail v32 — force Counter in v31 rail */
(function () {
  'use strict';

  if (window.PMDCounterRailV32Started) return;
  window.PMDCounterRailV32Started = true;

  function patchRail() {
    var rail = document.querySelector('#pmd-v31-role-rail');
    if (!rail) return false;

    var btns = Array.from(rail.querySelectorAll('button, a'));
    var target = btns.find(function (btn) {
      var label = String(btn.getAttribute('aria-label') || btn.title || btn.textContent || '').toLowerCase();
      return label.includes('counter') || label.includes('reception') || label === 'r';
    });

    if (!target) return false;

    target.textContent = '☎';
    target.title = 'Counter';
    target.setAttribute('aria-label', 'Counter');
    target.setAttribute('data-pmd-role', 'counter');
    target.setAttribute('data-pmd-role-final', 'counter');
    target.setAttribute('data-pmd-full-role-label', 'Counter');

    if (!target.__pmdCounterRailV32Bound) {
      target.__pmdCounterRailV32Bound = true;
      target.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        try { localStorage.setItem('PMD_DASHBOARD_ROLE', 'counter'); } catch (err) {}

        try {
          if (window.PMDOwnerDashboardCleanV1 && window.PMDOwnerDashboardCleanV1.switchRole) {
            window.PMDOwnerDashboardCleanV1.switchRole('counter');
          }
        } catch (err2) {}

        setTimeout(patchRail, 80);
        setTimeout(patchRail, 350);
      }, true);
    }

    return true;
  }

  window.PMDCounterRailV32 = {
    patch: patchRail,
    report: function () {
      var rail = document.querySelector('#pmd-v31-role-rail');
      var btn = rail && rail.querySelector('[data-pmd-role="counter"], [aria-label="Counter"]');
      return {
        ready: !!rail,
        counterFound: !!btn,
        text: btn ? btn.textContent : null,
        role: btn ? btn.getAttribute('data-pmd-role') : null
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchRail, { once: true });
  } else {
    patchRail();
  }

  setTimeout(patchRail, 120);
  setTimeout(patchRail, 500);
  setTimeout(patchRail, 1200);
  setTimeout(patchRail, 2200);
})();


/* PMD_SHARED_FLOOR_UX_V1_START */
/*
  Shared floor click drawer.
  Safe rules:
  - no MutationObserver
  - no interval/permanent loop
  - no backend/database/payment/order mutation
  - delegated click only
*/
(function () {
  'use strict';

  var FLAG = 'PMD_SHARED_FLOOR_UX_V1';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[ch];
    });
  }

  function textOf(el) {
    return (el && el.innerText ? el.innerText : '').replace(/\s+/g, ' ').trim();
  }

  function tableNodeFrom(target) {
    if (!target || !target.closest) return null;

    if (target.closest('.pmd-shared-floor-drawer')) return null;

    return target.closest(
      '.pmd-v15-floor-node,' +
      '.pmd-v26-floor-table-card,' +
      '.pmd-v27-floor-table-card,' +
      '.pmd-v29-table-node,' +
      '[data-pmd-table],' +
      '[data-pmd-table-id],' +
      '[data-table-id]'
    );
  }

  function readDataset(el, keys) {
    if (!el || !el.dataset) return '';
    for (var i = 0; i < keys.length; i++) {
      if (el.dataset[keys[i]]) return el.dataset[keys[i]];
    }
    return '';
  }

  function inferStatus(el, rawText) {
    var cls = String(el.className || '').toLowerCase();
    var txt = String(rawText || '').toLowerCase();

    if (cls.indexOf('disabled') >= 0 || cls.indexOf('unavailable') >= 0) return 'Unavailable';
    if (cls.indexOf('cleaning') >= 0 || txt.indexOf('clean') >= 0) return 'Needs cleaning';
    if (cls.indexOf('reserved') >= 0 || txt.indexOf('reserved') >= 0) return 'Reserved';
    if (cls.indexOf('unpaid') >= 0 || txt.indexOf('unpaid') >= 0 || txt.indexOf('€') >= 0) return 'Waiting payment';
    if (cls.indexOf('busy') >= 0 || txt.indexOf('busy') >= 0 || txt.indexOf('dining') >= 0 || txt.indexOf('occupied') >= 0) return 'Dining / busy';
    if (cls.indexOf('free') >= 0 || txt.indexOf('free') >= 0 || txt.indexOf('available') >= 0) return 'Available';

    return 'Current status';
  }

  function inferTableName(el, rawText, id) {
    var explicit = readDataset(el, ['pmdTableName', 'tableName', 'name', 'title']);
    if (explicit) return explicit;

    var match = String(rawText || '').match(/\b(\d{1,4})\b/);
    if (match && match[1]) return 'Table ' + match[1];

    if (id) return 'Table ' + id;

    return 'Selected table';
  }

  function inferAmount(rawText) {
    var match = String(rawText || '').match(/€\s*([0-9]+(?:[.,][0-9]{1,2})?)/);
    return match ? ('€' + match[1]) : '—';
  }

  function ensureDrawer() {
    var drawer = document.querySelector('.pmd-shared-floor-drawer');
    if (drawer) return drawer;

    drawer = document.createElement('aside');
    drawer.className = 'pmd-shared-floor-drawer';
    drawer.setAttribute('aria-live', 'polite');
    drawer.setAttribute('aria-label', 'Table information');
    document.body.appendChild(drawer);
    return drawer;
  }

  function openDrawer(el) {
    var rawText = textOf(el);
    var id = readDataset(el, ['pmdTable', 'pmdTableId', 'tableId', 'id']);
    var status = inferStatus(el, rawText);
    var title = inferTableName(el, rawText, id);
    var amount = inferAmount(rawText);

    var rect = el.getBoundingClientRect();
    var area = readDataset(el, ['zone', 'area', 'section', 'floor']) || 'Main floor';
    var seats = readDataset(el, ['seats', 'capacity', 'maxCapacity', 'guestCount']) || '—';
    var notes = readDataset(el, ['notes', 'floorNotes', 'reservationNotes']) || 'No table notes yet';

    var drawer = ensureDrawer();

    drawer.innerHTML =
      '<div class="pmd-shared-floor-drawer__head">' +
        '<div>' +
          '<h3 class="pmd-shared-floor-drawer__title">' + esc(title) + '</h3>' +
          '<span class="pmd-shared-floor-drawer__sub">Shared PMD floor plan · UI preview</span>' +
        '</div>' +
        '<button type="button" class="pmd-shared-floor-drawer__close" data-pmd-shared-floor-close aria-label="Close">×</button>' +
      '</div>' +
      '<div class="pmd-shared-floor-drawer__body">' +
        '<div class="pmd-shared-floor-kv">' +
          '<article><b>Status</b><span>' + esc(status) + '</span></article>' +
          '<article><b>Amount due</b><span>' + esc(amount) + '</span></article>' +
          '<article><b>Table ID</b><span>' + esc(id || '—') + '</span></article>' +
          '<article><b>Seats</b><span>' + esc(seats) + '</span></article>' +
          '<article><b>Area</b><span>' + esc(area) + '</span></article>' +
          '<article><b>Position</b><span>x ' + Math.round(rect.left) + ' · y ' + Math.round(rect.top) + '</span></article>' +
        '</div>' +
        '<div class="pmd-shared-floor-actions">' +
          '<a class="primary" href="/admin/orders/create' + (id ? '?table_id=' + encodeURIComponent(id) : '') + '">Create order</a>' +
          '<a href="/admin/reservations/create' + (id ? '?table_id=' + encodeURIComponent(id) : '') + '">Assign reservation</a>' +
          '<a href="/admin/reservations">View reservations</a>' +
          '<a href="/admin/tables">Open tables</a>' +
        '</div>' +
        '<div class="pmd-shared-floor-note">' +
          '<strong>Notes:</strong> ' + esc(notes) + '<br>' +
          'Cleaning / reserved / advanced reservation actions need backend support later; this v1 does not fake-save anything.' +
        '</div>' +
      '</div>';

    requestAnimationFrame(function () {
      drawer.classList.add('is-open');
    });
  }

  document.addEventListener('click', function (event) {
    var close = event.target && event.target.closest && event.target.closest('[data-pmd-shared-floor-close]');
    if (close) {
      var drawer = document.querySelector('.pmd-shared-floor-drawer');
      if (drawer) drawer.classList.remove('is-open');
      return;
    }

    var node = tableNodeFrom(event.target);
    if (!node) return;

    openDrawer(node);
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var drawer = document.querySelector('.pmd-shared-floor-drawer');
    if (drawer) drawer.classList.remove('is-open');
  }, false);

  console.info('[PMD] Shared floor UX v1 active');
})();
 /* PMD_SHARED_FLOOR_UX_V1_END */


/* PMD_FLOOR_LEGEND_INFO_V1_START */
/*
  Small click toggle for the shared floor legend.
  No observer, no interval, no backend mutation.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_LEGEND_INFO_V1';
  if (window[FLAG]) return;
  window[FLAG] = true;

  document.addEventListener('click', function (event) {
    var legend = event.target && event.target.closest && event.target.closest('.pmd-v15-floor-legend');

    document.querySelectorAll('.pmd-v15-floor-legend.is-open').forEach(function (el) {
      if (el !== legend) el.classList.remove('is-open');
    });

    if (!legend) return;

    event.preventDefault();
    event.stopPropagation();

    legend.classList.toggle('is-open');
    legend.setAttribute('title', 'Floor status legend');
    legend.setAttribute('aria-label', 'Floor status legend');
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.pmd-v15-floor-legend.is-open').forEach(function (el) {
      el.classList.remove('is-open');
    });
  }, false);

  console.info('[PMD] Floor legend info v1 active');
})();
 /* PMD_FLOOR_LEGEND_INFO_V1_END */


/* PMD_FLOOR_LEGEND_REHOME_V2_START */
/*
  Rehomes floor legend into floor card as compact info popover.
  Limited run only; no observer, no permanent loop.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_LEGEND_REHOME_V2';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function enhanceLegend() {
    var floorCard = document.querySelector('.pmd-v15-card--floor, .pmd-v19-area-floor, .pmd-v23-counter-floor-card');
    var legend = document.querySelector('.pmd-v15-floor-legend');

    if (!floorCard || !legend) return;
    if (legend.closest('.pmd-floor-legend-info-wrap')) return;

    var wrap = document.createElement('div');
    wrap.className = 'pmd-floor-legend-info-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-floor-legend-info-btn';
    btn.setAttribute('aria-label', 'Floor status legend');
    btn.setAttribute('title', 'Floor status legend');

    legend.parentNode.insertBefore(wrap, legend);
    wrap.appendChild(btn);
    wrap.appendChild(legend);

    floorCard.appendChild(wrap);
  }

  enhanceLegend();
  setTimeout(enhanceLegend, 250);
  setTimeout(enhanceLegend, 900);
  setTimeout(enhanceLegend, 1800);

  document.addEventListener('click', function (event) {
    var wrap = event.target && event.target.closest && event.target.closest('.pmd-floor-legend-info-wrap');

    document.querySelectorAll('.pmd-floor-legend-info-wrap.is-open').forEach(function (el) {
      if (el !== wrap) el.classList.remove('is-open');
    });

    if (!wrap) return;
    if (!event.target.closest('.pmd-floor-legend-info-btn')) return;

    event.preventDefault();
    event.stopPropagation();
    wrap.classList.toggle('is-open');
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.pmd-floor-legend-info-wrap.is-open').forEach(function (el) {
      el.classList.remove('is-open');
    });
  }, false);

  console.info('[PMD] Floor legend rehome v2 active');
})();
 /* PMD_FLOOR_LEGEND_REHOME_V2_END */


/* PMD_DASHBOARD_FIT_LEGEND_HARDFIX_V2_START */
/*
  Rehome old floor legend into a compact info popover.
  Limited setTimeout runs only. No MutationObserver, no loop.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_DASHBOARD_FIT_LEGEND_HARDFIX_V2';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function run() {
    var canvas = document.querySelector('.pmd-v15-floor-canvas');
    var card = canvas && canvas.closest ? canvas.closest('.pmd-v15-card--floor, .pmd-v19-area-floor, .pmd-v23-counter-floor-card') : null;
    var legend = document.querySelector('.pmd-v15-floor-legend');

    if (!card || !legend) return;
    if (legend.closest('.pmd-floor-legend-mini-wrap')) return;

    document.querySelectorAll('.pmd-floor-legend-info-wrap, .pmd-floor-legend-mini-wrap').forEach(function (oldWrap) {
      var oldLegend = oldWrap.querySelector('.pmd-v15-floor-legend');
      if (oldLegend && oldWrap.parentNode) oldWrap.parentNode.insertBefore(oldLegend, oldWrap);
      oldWrap.remove();
    });

    var wrap = document.createElement('div');
    wrap.className = 'pmd-floor-legend-mini-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-floor-legend-mini-btn';
    btn.setAttribute('aria-label', 'Floor status legend');
    btn.setAttribute('title', 'Floor status legend');

    wrap.appendChild(btn);
    wrap.appendChild(legend);
    card.appendChild(wrap);
  }

  run();
  setTimeout(run, 200);
  setTimeout(run, 800);
  setTimeout(run, 1600);

  document.addEventListener('click', function (event) {
    var btn = event.target && event.target.closest && event.target.closest('.pmd-floor-legend-mini-btn');
    var wrap = btn && btn.closest ? btn.closest('.pmd-floor-legend-mini-wrap') : null;

    document.querySelectorAll('.pmd-floor-legend-mini-wrap.is-open').forEach(function (el) {
      if (el !== wrap) el.classList.remove('is-open');
    });

    if (!wrap) return;

    event.preventDefault();
    event.stopPropagation();
    wrap.classList.toggle('is-open');
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.pmd-floor-legend-mini-wrap.is-open').forEach(function (el) {
      el.classList.remove('is-open');
    });
  }, false);

  console.info('[PMD] Dashboard fit + legend hardfix v2 active');
})();
 /* PMD_DASHBOARD_FIT_LEGEND_HARDFIX_V2_END */


/* PMD_DASHBOARD_ACTUAL_FIT_V3_START */
/*
  Removes old broken legend wrappers and creates one compact floor status popover.
  Limited run only. No observer, no interval.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_DASHBOARD_ACTUAL_FIT_V3';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function run() {
    var card = document.querySelector('.pmd-v15-card--floor, .pmd-v19-area-floor, .pmd-v23-counter-floor-card');
    var legend = document.querySelector('.pmd-v15-floor-legend');
    if (!card) return;

    document.querySelectorAll('.pmd-floor-legend-info-wrap, .pmd-floor-legend-mini-wrap').forEach(function (el) {
      el.remove();
    });

    if (document.querySelector('.pmd-floor-status-v3')) return;

    var panelHtml = legend ? legend.innerHTML : (
      '<span><i></i>Available <b>0</b></span>' +
      '<span><i></i>Dining <b>0</b></span>' +
      '<span><i></i>Reserved <b>0</b></span>' +
      '<span><i></i>Waiting Payment <b>0</b></span>'
    );

    var wrap = document.createElement('div');
    wrap.className = 'pmd-floor-status-v3';
    wrap.innerHTML =
      '<button type="button" class="pmd-floor-status-v3-btn" aria-label="Floor status legend" title="Floor status legend"></button>' +
      '<div class="pmd-floor-status-v3-panel">' + panelHtml + '</div>';

    card.appendChild(wrap);
  }

  run();
  setTimeout(run, 150);
  setTimeout(run, 650);
  setTimeout(run, 1400);

  document.addEventListener('click', function (event) {
    var btn = event.target && event.target.closest && event.target.closest('.pmd-floor-status-v3-btn');
    var wrap = btn && btn.closest ? btn.closest('.pmd-floor-status-v3') : null;

    document.querySelectorAll('.pmd-floor-status-v3.is-open').forEach(function (el) {
      if (el !== wrap) el.classList.remove('is-open');
    });

    if (!wrap) return;

    event.preventDefault();
    event.stopPropagation();
    wrap.classList.toggle('is-open');
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.pmd-floor-status-v3.is-open').forEach(function (el) {
      el.classList.remove('is-open');
    });
  }, false);

  console.info('[PMD] Dashboard actual fit v3 active');
})();
 /* PMD_DASHBOARD_ACTUAL_FIT_V3_END */


/* PMD_SHARED_FLOOR_FULLWIDTH_V5_START */
/*
  Rehomes the shared floor card into a full-width row after KPI cards.
  Limited run only. No observer, no interval.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_SHARED_FLOOR_FULLWIDTH_V5';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function closestDashboardRoot() {
    return document.querySelector('#pmd-owner-dashboard-clean-v1-root') ||
      document.querySelector('.pmd-v31-clean-shell, .pmd-v15-shell');
  }

  function ensureEditButton(floorCard) {
    if (!floorCard) return;

    var actions = floorCard.querySelector('.pmd-v15-card-actions, [class*="card-actions"]');
    if (!actions) {
      var head = floorCard.querySelector('.pmd-v15-card-head, [class*="card-head"]');
      if (!head) return;

      actions = document.createElement('div');
      actions.className = 'pmd-v15-card-actions';
      head.appendChild(actions);
    }

    if (actions.querySelector('.pmd-floor-edit-btn-v5')) return;

    var edit = document.createElement('a');
    edit.className = 'pmd-floor-edit-btn-v5';
    edit.href = '/admin/tables';
    edit.textContent = 'Edit Floor';
    edit.setAttribute('title', 'Edit floor/table positions from Tables admin');
    edit.setAttribute('aria-label', 'Edit floor and table positions');

    actions.appendChild(edit);
  }

  function rehomeFloor() {
    var root = closestDashboardRoot();
    var floorCard = document.querySelector('.pmd-v15-card--floor, .pmd-v19-area-floor, .pmd-v23-counter-floor-card, .pmd-v21-waiter-floor-card');

    if (!root || !floorCard) return;

    var row = document.querySelector('.pmd-shared-floor-v5-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'pmd-shared-floor-v5-row';
    }

    if (!row.contains(floorCard)) {
      row.appendChild(floorCard);
    }

    var kpi = root.querySelector('.pmd-v15-kpi-grid, .pmd-v19-kpi-grid, .pmd-v21-kpi-grid');
    if (kpi && kpi.parentNode && row.parentNode !== kpi.parentNode) {
      kpi.parentNode.insertBefore(row, kpi.nextSibling);
    } else if (!row.parentNode) {
      root.insertBefore(row, root.firstChild);
    }

    ensureEditButton(floorCard);
  }

  rehomeFloor();
  setTimeout(rehomeFloor, 200);
  setTimeout(rehomeFloor, 700);
  setTimeout(rehomeFloor, 1500);

  console.info('[PMD] Shared floor full-width v5 active');
})();
 /* PMD_SHARED_FLOOR_FULLWIDTH_V5_END */


/* PMD_FLOOR_EDITOR_DRAG_SAVE_V6_START */
/*
  Dashboard floor edit mode.
  - top/global edit button
  - pointer drag table nodes
  - save floor_x/floor_y to /admin/pmd-floor-plan-save-v1
  No observer, no interval, no order/payment mutation.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_EDITOR_DRAG_SAVE_V6';
  if (window[FLAG]) return;
  window[FLAG] = true;

  var editMode = false;
  var dragging = null;
  var originalStyles = new Map();
  var floorMeta = new Map();
  var endpointDataLoaded = false;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function isDashboard() {
    return !!document.querySelector('.pmd-v15-floor-canvas') &&
      /\/admin\/dashboard/.test(location.pathname);
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    if (input && input.value) return input.value;
    return '';
  }

  function toast(msg) {
    var el = $('.pmd-floor-edit-toast-v6');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-edit-toast-v6';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3600);
  }

  function floorCard() {
    return $('.pmd-shared-floor-v5-row .pmd-v15-card--floor') ||
      $('.pmd-v15-card--floor, .pmd-v19-area-floor, .pmd-v23-counter-floor-card, .pmd-v21-waiter-floor-card');
  }

  function canvas() {
    return $('.pmd-v15-floor-canvas');
  }

  function tableNodes() {
    return $$('.pmd-v15-floor-node[data-pmd-table]');
  }

  function number(value, fallback) {
    var n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function pctFromStyle(el, prop) {
    return number(String(el.style[prop] || '').replace('%', ''), 0);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function readCoord(t, keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (t && t[k] != null && t[k] !== '') return number(t[k], fallback);
      if (t && t.floor && t.floor[k] != null && t.floor[k] !== '') return number(t.floor[k], fallback);
    }
    return fallback;
  }

  function learnMetaFromEndpoint() {
    endpointDataLoaded = false;

    return fetch('/admin/pmd-owner-dashboard-clean-v1-data', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tables =
          (((data || {}).sections || {}).floor_plan || {}).tables ||
          ((data || {}).floor_plan || {}).tables ||
          [];

        floorMeta.clear();

        tables.forEach(function (t) {
          var id = String(t.id || t.table_id || '');
          if (!id) return;

          var node = document.querySelector('.pmd-v15-floor-node[data-pmd-table="' + CSS.escape(id) + '"]');
          var leftPct = node ? pctFromStyle(node, 'left') : 0;
          var topPct = node ? pctFromStyle(node, 'top') : 0;
          var widthPct = node ? pctFromStyle(node, 'width') : 0;
          var heightPct = node ? pctFromStyle(node, 'height') : 0;

          var rawX = readCoord(t, ['x', 'floor_x'], null);
          var rawY = readCoord(t, ['y', 'floor_y'], null);
          var rawW = readCoord(t, ['w', 'width', 'floor_width'], null);
          var rawH = readCoord(t, ['h', 'height', 'floor_height'], null);

          var factorX = rawX != null && leftPct > 0 ? rawX / leftPct : 26;
          var factorY = rawY != null && topPct > 0 ? rawY / topPct : 10.8;
          var factorW = rawW != null && widthPct > 0 ? rawW / widthPct : null;
          var factorH = rawH != null && heightPct > 0 ? rawH / heightPct : null;

          floorMeta.set(id, {
            rawX: rawX,
            rawY: rawY,
            rawW: rawW,
            rawH: rawH,
            factorX: factorX,
            factorY: factorY,
            factorW: factorW,
            factorH: factorH
          });
        });

        endpointDataLoaded = true;
      })
      .catch(function () {
        endpointDataLoaded = false;
      });
  }

  function ensureToolbar() {
    var bar = $('.pmd-floor-edit-toolbar-v6');
    if (bar) return bar;

    bar = document.createElement('div');
    bar.className = 'pmd-floor-edit-toolbar-v6';
    bar.innerHTML =
      '<strong>Floor edit mode</strong>' +
      '<button type="button" data-pmd-floor-save-v6>Save layout</button>' +
      '<button type="button" data-pmd-floor-cancel-v6>Cancel</button>';
    document.body.appendChild(bar);
    return bar;
  }

  function findHeaderHost() {
    var candidates = [
      '#menu-mainmenu',
      '.navbar-nav.ml-auto',
      '.navbar-nav.navbar-right',
      '.navbar .navbar-nav:last-child',
      '.main-header .navbar-nav:last-child',
      'header .navbar-nav:last-child',
      '.pmd-admin-top-actions',
      '.pmd-v15-top-controls'
    ];

    for (var i = 0; i < candidates.length; i++) {
      var el = document.querySelector(candidates[i]);
      if (el) return el;
    }
    return null;
  }

  function ensureTopButton() {
    if (!isDashboard()) return;

    $$('.pmd-floor-edit-btn-v4, .pmd-floor-edit-btn-v5').forEach(function (el) { el.remove(); });

    if ($('.pmd-floor-global-edit-v6')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-floor-global-edit-v6';
    btn.textContent = 'Edit Floor';
    btn.setAttribute('data-pmd-floor-edit-v6', '1');
    btn.setAttribute('title', 'Move tables and save floor layout');

    var host = findHeaderHost();

    if (host) {
      if (host.tagName === 'UL' || host.tagName === 'OL') {
        var li = document.createElement('li');
        li.className = 'pmd-floor-global-edit-v6-li';
        li.appendChild(btn);
        host.appendChild(li);
      } else {
        host.appendChild(btn);
      }
    } else {
      btn.classList.add('is-floating');
      document.body.appendChild(btn);
    }
  }

  function startEdit() {
    if (!isDashboard()) return;

    editMode = true;
    document.body.classList.add('pmd-floor-editing-v6');
    ensureToolbar();

    originalStyles.clear();

    tableNodes().forEach(function (node) {
      originalStyles.set(node, {
        left: node.style.left,
        top: node.style.top,
        width: node.style.width,
        height: node.style.height,
        zIndex: node.style.zIndex
      });
    });

    learnMetaFromEndpoint();
    toast('Edit mode active. Drag tables, then Save layout.');
  }

  function stopEdit(restore) {
    if (restore) {
      originalStyles.forEach(function (s, node) {
        node.style.left = s.left;
        node.style.top = s.top;
        node.style.width = s.width;
        node.style.height = s.height;
        node.style.zIndex = s.zIndex;
      });
    }

    editMode = false;
    dragging = null;
    document.body.classList.remove('pmd-floor-editing-v6');
    tableNodes().forEach(function (node) { node.classList.remove('is-dragging-v6'); });
  }

  function saveLayout() {
    var c = canvas();
    if (!c) return;

    var items = tableNodes().map(function (node) {
      var id = String(node.getAttribute('data-pmd-table') || '');
      var meta = floorMeta.get(id) || {};

      var leftPct = pctFromStyle(node, 'left');
      var topPct = pctFromStyle(node, 'top');
      var widthPct = pctFromStyle(node, 'width');
      var heightPct = pctFromStyle(node, 'height');

      var item = {
        id: parseInt(id, 10),
        floor_x: Math.round(leftPct * (meta.factorX || 26) * 100) / 100,
        floor_y: Math.round(topPct * (meta.factorY || 10.8) * 100) / 100
      };

      if (meta.rawW != null) item.floor_width = Math.round(meta.rawW * 100) / 100;
      else if (meta.factorW && widthPct > 0) item.floor_width = Math.round(widthPct * meta.factorW * 100) / 100;

      if (meta.rawH != null) item.floor_height = Math.round(meta.rawH * 100) / 100;
      else if (meta.factorH && heightPct > 0) item.floor_height = Math.round(heightPct * meta.factorH * 100) / 100;

      return item;
    }).filter(function (item) { return item.id > 0; });

    if (!items.length) {
      toast('No tables found to save.');
      return;
    }

    toast('Saving floor layout...');

    fetch('/admin/pmd-floor-plan-save-v1', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      },
      body: JSON.stringify({
        source: 'dashboard-floor-editor-v6',
        tables: items
      })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok || !j.ok) throw new Error((j && j.message) || ('HTTP ' + r.status));
          return j;
        });
      })
      .then(function (j) {
        toast('Saved. Updated tables: ' + (j.updated || 0));
        stopEdit(false);
        setTimeout(function () { location.reload(); }, 700);
      })
      .catch(function (err) {
        toast('Save failed: ' + err.message);
        console.error('[PMD] Floor save failed', err);
      });
  }

  document.addEventListener('click', function (event) {
    var edit = event.target && event.target.closest && event.target.closest('[data-pmd-floor-edit-v6]');
    if (edit) {
      event.preventDefault();
      event.stopPropagation();
      startEdit();
      return;
    }

    if (event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v6]')) {
      event.preventDefault();
      event.stopPropagation();
      saveLayout();
      return;
    }

    if (event.target && event.target.closest && event.target.closest('[data-pmd-floor-cancel-v6]')) {
      event.preventDefault();
      event.stopPropagation();
      stopEdit(true);
      toast('Edit cancelled.');
      return;
    }

    if (editMode && event.target && event.target.closest && event.target.closest('.pmd-v15-floor-node')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('pointerdown', function (event) {
    if (!editMode) return;

    var node = event.target && event.target.closest && event.target.closest('.pmd-v15-floor-node[data-pmd-table]');
    var c = canvas();

    if (!node || !c) return;

    event.preventDefault();
    event.stopPropagation();

    var wPct = Math.max(1, pctFromStyle(node, 'width') || 7);
    var hPct = Math.max(1, pctFromStyle(node, 'height') || 7);

    dragging = {
      node: node,
      canvas: c,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: pctFromStyle(node, 'left'),
      startTop: pctFromStyle(node, 'top'),
      widthPct: wPct,
      heightPct: hPct
    };

    node.classList.add('is-dragging-v6');

    try { node.setPointerCapture(event.pointerId); } catch (e) {}
  }, true);

  document.addEventListener('pointermove', function (event) {
    if (!editMode || !dragging) return;

    var rect = dragging.canvas.getBoundingClientRect();
    var dxPct = ((event.clientX - dragging.startX) / Math.max(1, rect.width)) * 100;
    var dyPct = ((event.clientY - dragging.startY) / Math.max(1, rect.height)) * 100;

    var nextLeft = clamp(dragging.startLeft + dxPct, 0, 100 - dragging.widthPct);
    var nextTop = clamp(dragging.startTop + dyPct, 0, 100 - dragging.heightPct);

    dragging.node.style.left = nextLeft.toFixed(3) + '%';
    dragging.node.style.top = nextTop.toFixed(3) + '%';
  }, true);

  document.addEventListener('pointerup', function (event) {
    if (!dragging) return;
    dragging.node.classList.remove('is-dragging-v6');
    try { dragging.node.releasePointerCapture(event.pointerId); } catch (e) {}
    dragging = null;
  }, true);

  document.addEventListener('keydown', function (event) {
    if (!editMode) return;
    if (event.key === 'Escape') {
      stopEdit(true);
      toast('Edit cancelled.');
    }
  }, false);

  ensureTopButton();
  setTimeout(ensureTopButton, 250);
  setTimeout(ensureTopButton, 900);
  setTimeout(ensureTopButton, 1800);

  console.info('[PMD] Floor editor drag/save v6 active');
})();
 /* PMD_FLOOR_EDITOR_DRAG_SAVE_V6_END */


/* PMD_DASHBOARD_TOPBAR_EDITFLOOR_V7_START */
/*
  Creates a visible dashboard topbar and moves v6 Edit Floor button into it.
  Reuses existing v6 drag/save click handler.
  No observer, no interval, no backend/database changes.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_DASHBOARD_TOPBAR_EDITFLOOR_V7';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function isDashboard() {
    return /\/admin\/dashboard/.test(location.pathname) && !!document.querySelector('.pmd-v15-floor-canvas');
  }

  function root() {
    return document.querySelector('#pmd-owner-dashboard-clean-v1-root') ||
      document.querySelector('.pmd-v31-clean-shell, .pmd-v15-shell');
  }

  function detectRoleTitle() {
    var body = document.body.className || '';

    if (/pmd-role-counter|role-counter|counter/i.test(body)) return ['Counter Dashboard', 'Phone bookings, walk-ins, reservations and table availability'];
    if (/pmd-role-manager|role-manager/i.test(body)) return ['Manager Dashboard', 'Operations, floor, kitchen and team dashboard'];
    if (/pmd-role-waiter|role-waiter/i.test(body)) return ['Waiter Dashboard', 'Service floor and assigned table dashboard'];
    if (/pmd-role-cashier|role-cashier/i.test(body)) return ['Cashier Dashboard', 'Checkout, open checks and payment view'];
    if (/pmd-role-kds|role-kds/i.test(body)) return ['KDS Dashboard', 'Kitchen display and station operations'];

    return ['Owner Dashboard', 'Live restaurant operations and performance'];
  }

  function dateLabel() {
    try {
      return '📅 Today · ' + new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());
    } catch (e) {
      return '📅 Today';
    }
  }

  function ensureToolbar() {
    if (document.querySelector('.pmd-floor-edit-toolbar-v6')) return;

    var bar = document.createElement('div');
    bar.className = 'pmd-floor-edit-toolbar-v6';
    bar.innerHTML =
      '<strong>Floor edit mode</strong>' +
      '<button type="button" data-pmd-floor-save-v6>Save layout</button>' +
      '<button type="button" data-pmd-floor-cancel-v6>Cancel</button>';
    document.body.appendChild(bar);
  }

  function ensureEditButton(actions) {
    if (!actions) return;

    var existing = Array.prototype.slice.call(document.querySelectorAll('.pmd-floor-global-edit-v6'));
    var btn = existing[0];

    existing.slice(1).forEach(function (el) { el.remove(); });

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-floor-global-edit-v6';
      btn.setAttribute('data-pmd-floor-edit-v6', '1');
      btn.setAttribute('title', 'Move tables and save floor layout');
      btn.textContent = 'Edit Floor';
    }

    btn.classList.remove('is-floating');
    btn.style.display = '';
    btn.style.visibility = '';
    btn.style.opacity = '';

    if (btn.parentNode !== actions) actions.appendChild(btn);
  }

  function run() {
    if (!isDashboard()) return;

    var r = root();
    if (!r) return;

    var topbar = document.querySelector('.pmd-dashboard-topbar-v7');
    var title = detectRoleTitle();

    if (!topbar) {
      topbar = document.createElement('section');
      topbar.className = 'pmd-dashboard-topbar-v7';
      topbar.innerHTML =
        '<div class="pmd-dashboard-topbar-v7__title">' +
          '<h1></h1>' +
          '<p></p>' +
        '</div>' +
        '<div class="pmd-dashboard-topbar-v7__actions">' +
          '<span class="pmd-dashboard-topbar-v7__pill" data-pmd-date-pill-v7></span>' +
          '<span class="pmd-dashboard-topbar-v7__pill is-shift">🍽️ Dinner Shift · Live</span>' +
        '</div>';

      r.insertBefore(topbar, r.firstChild);
    }

    var h1 = topbar.querySelector('h1');
    var p = topbar.querySelector('p');
    var date = topbar.querySelector('[data-pmd-date-pill-v7]');
    var actions = topbar.querySelector('.pmd-dashboard-topbar-v7__actions');

    if (h1) h1.textContent = title[0];
    if (p) p.textContent = title[1];
    if (date) date.textContent = dateLabel();

    ensureEditButton(actions);
    ensureToolbar();

    // keep old hidden topbar from becoming the button host again
    document.querySelectorAll('.pmd-v15-topbar .pmd-floor-global-edit-v6, .pmd-v19-topbar .pmd-floor-global-edit-v6, .pmd-v21-topbar .pmd-floor-global-edit-v6').forEach(function (el) {
      if (actions && el.parentNode !== actions) actions.appendChild(el);
    });
  }

  run();
  setTimeout(run, 200);
  setTimeout(run, 800);
  setTimeout(run, 1600);

  console.info('[PMD] Dashboard topbar edit floor v7 active');
})();
 /* PMD_DASHBOARD_TOPBAR_EDITFLOOR_V7_END */


/* PMD_DASHBOARD_VISIBLE_TOPBAR_V8_START */
/*
  Rebuilds a visible dashboard topbar above KPI cards.
  Reuses existing v6 floor edit/save handler via data-pmd-floor-edit-v6.
  No observer, no interval, no backend changes.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_DASHBOARD_VISIBLE_TOPBAR_V8';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function isDashboard() {
    return /\/admin\/dashboard/.test(location.pathname) && !!document.querySelector('.pmd-v15-floor-canvas');
  }

  function root() {
    return document.querySelector('#pmd-owner-dashboard-clean-v1-root') ||
      document.querySelector('.pmd-v31-clean-shell, .pmd-v15-shell');
  }

  function activeRole() {
    var btn = document.querySelector(
      '#pmd-v31-role-rail .pmd-v31-role-btn.is-active,' +
      '#pmd-v31-role-rail .pmd-v31-role-btn[aria-pressed="true"],' +
      '#pmd-v31-role-rail .pmd-v31-role-btn[aria-current="true"]'
    );

    var raw = '';
    if (btn) {
      raw = (btn.dataset.role || btn.dataset.pmdRole || btn.getAttribute('data-role') || btn.textContent || '').trim().toLowerCase();
    }

    if (raw === 'o' || raw.indexOf('owner') >= 0) return 'owner';
    if (raw === 'm' || raw.indexOf('manager') >= 0) return 'manager';
    if (raw === 'k' || raw.indexOf('kds') >= 0) return 'kds';
    if (raw === 'c' || raw.indexOf('cashier') >= 0) return 'cashier';
    if (raw.indexOf('counter') >= 0 || raw.indexOf('reception') >= 0) return 'counter';
    if (raw === 'w' || raw.indexOf('waiter') >= 0) return 'waiter';

    var body = document.body.className || '';
    if (/counter/i.test(body)) return 'counter';
    if (/manager/i.test(body)) return 'manager';
    if (/waiter/i.test(body)) return 'waiter';
    if (/cashier/i.test(body)) return 'cashier';
    if (/kds/i.test(body)) return 'kds';
    return 'owner';
  }

  function titleForRole(role) {
    if (role === 'counter') return ['Counter Dashboard', 'Phone bookings, walk-ins, reservations and table availability'];
    if (role === 'manager') return ['Manager Dashboard', 'Operations, floor, kitchen and team dashboard'];
    if (role === 'waiter') return ['Waiter Dashboard', 'Service floor and assigned table dashboard'];
    if (role === 'cashier') return ['Cashier Dashboard', 'Checkout, open checks and payment view'];
    if (role === 'kds') return ['KDS Dashboard', 'Kitchen display and station operations'];
    return ['Owner Dashboard', 'Live restaurant operations and performance'];
  }

  function dateLabel() {
    try {
      return '📅 Today · ' + new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());
    } catch (e) {
      return '📅 Today';
    }
  }

  function ensureToolbar() {
    if (document.querySelector('.pmd-floor-edit-toolbar-v6')) return;

    var bar = document.createElement('div');
    bar.className = 'pmd-floor-edit-toolbar-v6';
    bar.innerHTML =
      '<strong>Floor edit mode</strong>' +
      '<button type="button" data-pmd-floor-save-v6>Save layout</button>' +
      '<button type="button" data-pmd-floor-cancel-v6>Cancel</button>';
    document.body.appendChild(bar);
  }

  function getOrCreateButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.pmd-floor-global-edit-v6'));
    var btn = buttons[0];

    buttons.slice(1).forEach(function (el) { el.remove(); });

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-floor-global-edit-v6';
      btn.setAttribute('data-pmd-floor-edit-v6', '1');
      btn.setAttribute('title', 'Move tables and save floor layout');
      btn.textContent = 'Edit Floor';
    }

    btn.classList.remove('is-floating');
    btn.setAttribute('data-pmd-floor-edit-v6', '1');
    btn.textContent = 'Edit Floor';
    btn.style.display = '';
    btn.style.visibility = '';
    btn.style.opacity = '';

    return btn;
  }

  function buildTopbar() {
    if (!isDashboard()) return;

    var r = root();
    if (!r) return;

    document.querySelectorAll('.pmd-dashboard-topbar-v7').forEach(function (el) {
      el.remove();
    });

    var topbar = document.querySelector('.pmd-dashboard-topbar-v8');
    if (!topbar) {
      topbar = document.createElement('section');
      topbar.className = 'pmd-dashboard-topbar-v8';
    }

    var role = activeRole();
    var title = titleForRole(role);
    var btn = getOrCreateButton();

    topbar.innerHTML =
      '<div class="pmd-dashboard-topbar-v8__title">' +
        '<h1>' + title[0] + '</h1>' +
        '<p>' + title[1] + '</p>' +
      '</div>' +
      '<div class="pmd-dashboard-topbar-v8__actions">' +
        '<span class="pmd-dashboard-topbar-v8__pill" data-pmd-date-pill-v8>' + dateLabel() + '</span>' +
        '<span class="pmd-dashboard-topbar-v8__pill is-shift">🍽️ Dinner Shift · Live</span>' +
      '</div>';

    var actions = topbar.querySelector('.pmd-dashboard-topbar-v8__actions');
    actions.appendChild(btn);

    var kpi = r.querySelector('.pmd-v15-kpi-grid, .pmd-v19-kpi-grid, .pmd-v21-kpi-grid');
    if (kpi && kpi.parentNode === r) {
      r.insertBefore(topbar, kpi);
    } else if (r.firstChild !== topbar) {
      r.insertBefore(topbar, r.firstChild);
    }

    ensureToolbar();
  }

  buildTopbar();
  setTimeout(buildTopbar, 250);
  setTimeout(buildTopbar, 900);
  setTimeout(buildTopbar, 1800);
  setTimeout(buildTopbar, 2800);

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    var roleBtn = event.target.closest('#pmd-v31-role-rail .pmd-v31-role-btn');
    if (roleBtn) {
      setTimeout(buildTopbar, 80);
      setTimeout(buildTopbar, 350);
    }
  }, false);

  console.info('[PMD] Dashboard visible topbar v8 active');
})();
 /* PMD_DASHBOARD_VISIBLE_TOPBAR_V8_END */


/* PMD_KILL_BROKEN_TOPBARS_V10_START */
/*
  Removes broken v7/v8/v9 topbars and moves the v6 Edit Floor button to a safe visible fixed position.
  Limited delayed runs only. No observer, no interval, no backend/database changes.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_KILL_BROKEN_TOPBARS_V10';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function isDashboard() {
    return /\/admin\/dashboard/.test(location.pathname);
  }

  function ensureToolbar() {
    if (document.querySelector('.pmd-floor-edit-toolbar-v6')) return;

    var bar = document.createElement('div');
    bar.className = 'pmd-floor-edit-toolbar-v6';
    bar.innerHTML =
      '<strong>Floor edit mode</strong>' +
      '<button type="button" data-pmd-floor-save-v6>Save layout</button>' +
      '<button type="button" data-pmd-floor-cancel-v6>Cancel</button>';
    document.body.appendChild(bar);
  }

  function run() {
    if (!isDashboard()) return;

    document.querySelectorAll('.pmd-dashboard-topbar-v7, .pmd-dashboard-topbar-v8, .pmd-dashboard-topbar-v9').forEach(function (el) {
      el.remove();
    });

    var buttons = Array.prototype.slice.call(document.querySelectorAll('.pmd-floor-global-edit-v6'));
    var btn = buttons[0];

    buttons.slice(1).forEach(function (el) {
      el.remove();
    });

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-floor-global-edit-v6';
      btn.textContent = 'Edit Floor';
      btn.setAttribute('data-pmd-floor-edit-v6', '1');
      btn.setAttribute('title', 'Move tables and save floor layout');
    }

    btn.classList.add('pmd-floor-floating-v10');
    btn.classList.remove('is-floating');
    btn.setAttribute('data-pmd-floor-edit-v6', '1');
    btn.textContent = 'Edit Floor';

    if (btn.parentNode !== document.body) {
      document.body.appendChild(btn);
    }

    ensureToolbar();
  }

  run();
  setTimeout(run, 250);
  setTimeout(run, 900);
  setTimeout(run, 1800);
  setTimeout(run, 3200);
  setTimeout(run, 5200);

  console.info('[PMD] Broken topbars killed v10; Edit Floor floating fallback active');
})();
 /* PMD_KILL_BROKEN_TOPBARS_V10_END */


/* PMD_FLOOR_EDITOR_SAVEFIX_V11_START */
/*
  Overrides broken v6 Save button.
  Uses exact admin endpoint and stronger CSRF detection.
  No observer, no interval, no unrelated backend mutation.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_EDITOR_SAVEFIX_V11';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function show(msg) {
    var el = $('.pmd-floor-save-debug-v11');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-save-debug-v11';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD save v11]', msg);
  }

  function decodeCookie(v) {
    try { return decodeURIComponent(v || ''); } catch (e) { return v || ''; }
  }

  function getCookie(name) {
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) return decodeCookie(p.slice(name.length + 1));
    }
    return '';
  }

  function csrfToken() {
    var selectors = [
      'meta[name="csrf-token"]',
      'meta[name="_token"]',
      'meta[name="X-CSRF-TOKEN"]'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var m = document.querySelector(selectors[i]);
      if (m && m.content) return m.content;
    }

    var inputs = [
      'input[name="_token"]',
      'input[name="csrf_token"]',
      'input[name="csrf-token"]'
    ];

    for (var j = 0; j < inputs.length; j++) {
      var inp = document.querySelector(inputs[j]);
      if (inp && inp.value) return inp.value;
    }

    if (window.TastyIgniter && window.TastyIgniter.csrfToken) return window.TastyIgniter.csrfToken;
    if (window.ti && window.ti.csrfToken) return window.ti.csrfToken;
    if (window.csrfToken) return window.csrfToken;

    return getCookie('XSRF-TOKEN') || '';
  }

  function endpoint() {
    return new URL('/admin/pmd-floor-plan-save-v1', window.location.origin).toString();
  }

  function pct(el, prop, fallback) {
    var n = parseFloat(String(el.style[prop] || '').replace('%', ''));
    return Number.isFinite(n) ? n : fallback;
  }

  function tableItems() {
    return $$('.pmd-v15-floor-node[data-pmd-table]').map(function (node) {
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      var left = pct(node, 'left', 0);
      var top = pct(node, 'top', 0);
      var width = pct(node, 'width', 17);
      var height = pct(node, 'height', 15.714);

      /*
        Current DB/data mapping from production:
        floor_x 22 => left 2.2%
        floor_y 30 => top 5.357%
        floor_width 170 => width 17%
        floor_height 88 => height 15.714%
      */
      return {
        id: id,
        floor_x: Math.round(left * 10 * 100) / 100,
        floor_y: Math.round(top * 5.6 * 100) / 100,
        floor_width: Math.round(width * 10 * 100) / 100,
        floor_height: Math.round(height * 5.6 * 100) / 100
      };
    }).filter(function (x) { return x.id > 0; });
  }

  function hijackToolbar() {
    var save = $('[data-pmd-floor-save-v6]');
    if (save) {
      save.removeAttribute('data-pmd-floor-save-v6');
      save.setAttribute('data-pmd-floor-save-v11', '1');
      save.textContent = 'Save layout';
    }
  }

  function saveLayout(event) {
    var btn = event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v11]');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var token = csrfToken();
    var items = tableItems();

    if (!items.length) {
      show('No floor tables found to save.');
      return;
    }

    if (!token) {
      show('CSRF token not found. Reload the admin page, then try again.');
      console.warn('[PMD save v11] token sources missing', {
        meta: !!document.querySelector('meta[name="csrf-token"]'),
        tokenInput: !!document.querySelector('input[name="_token"]'),
        xsrfCookie: !!getCookie('XSRF-TOKEN')
      });
      return;
    }

    var url = endpoint();
    show('Saving layout to:\n' + url);

    var body = JSON.stringify({
      _token: token,
      source: 'dashboard-floor-editor-savefix-v11',
      tables: items
    });

    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': token,
        'X-XSRF-TOKEN': token
      },
      body: body
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) {
            throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 160)));
          }
          return json;
        });
      })
      .then(function (json) {
        show('Saved successfully. Updated tables: ' + (json.updated || 0));
        document.body.classList.remove('pmd-floor-editing-v6');
        setTimeout(function () { window.location.reload(); }, 800);
      })
      .catch(function (err) {
        show('Save failed:\n' + err.message);
        console.error('[PMD save v11] failed', err);
      });
  }

  document.addEventListener('click', saveLayout, true);

  hijackToolbar();
  setTimeout(hijackToolbar, 250);
  setTimeout(hijackToolbar, 900);
  setTimeout(hijackToolbar, 1800);
  setTimeout(hijackToolbar, 3200);

  console.info('[PMD] Floor editor savefix v11 active');
})();
 /* PMD_FLOOR_EDITOR_SAVEFIX_V11_END */


/* PMD_FLOOR_SAVE_STABLE_V12_START */
/*
  Savefix v12.
  Uses stable existing controller route:
  /admin/pmd-floor-plan-save-v1 -> PmdFloorPlanStable@saveV1
  Sends x-www-form-urlencoded so admin CSRF can read _token.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_SAVE_STABLE_V12';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function show(msg) {
    var el = $('.pmd-floor-save-debug-v12');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-save-debug-v12';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD save v12]', msg);
  }

  function readCookie(name) {
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) {
        try { return decodeURIComponent(p.slice(name.length + 1)); }
        catch (e) { return p.slice(name.length + 1); }
      }
    }
    return '';
  }

  function token() {
    var meta = $('meta[name="csrf-token"], meta[name="_token"], meta[name="X-CSRF-TOKEN"]');
    if (meta && meta.content) return meta.content;

    var input = $('input[name="_token"], input[name="csrf_token"], input[name="csrf-token"]');
    if (input && input.value) return input.value;

    if (window.TastyIgniter && window.TastyIgniter.csrfToken) return window.TastyIgniter.csrfToken;
    if (window.ti && window.ti.csrfToken) return window.ti.csrfToken;
    if (window.csrfToken) return window.csrfToken;

    return readCookie('XSRF-TOKEN') || '';
  }

  function pct(el, prop, fallback) {
    var n = parseFloat(String(el.style[prop] || '').replace('%', ''));
    return Number.isFinite(n) ? n : fallback;
  }

  function items() {
    return $$('.pmd-v15-floor-node[data-pmd-table]').map(function (node) {
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      var left = pct(node, 'left', 0);
      var top = pct(node, 'top', 0);
      var width = pct(node, 'width', 17);
      var height = pct(node, 'height', 15.714);

      return {
        id: id,
        floor_x: Math.round(left * 10 * 100) / 100,
        floor_y: Math.round(top * 5.6 * 100) / 100,
        floor_width: Math.round(width * 10 * 100) / 100,
        floor_height: Math.round(height * 5.6 * 100) / 100
      };
    }).filter(function (x) { return x.id > 0; });
  }

  function hijack() {
    var btn = $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    btn.removeAttribute('data-pmd-floor-save-v6');
    btn.removeAttribute('data-pmd-floor-save-v11');
    btn.setAttribute('data-pmd-floor-save-v12', '1');
    btn.textContent = 'Save layout';
  }

  function save(event) {
    var btn = event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v12]');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var t = token();
    var list = items();

    if (!list.length) {
      show('No floor tables found to save.');
      return;
    }

    if (!t) {
      show('CSRF token missing. Reload admin page and try again.');
      return;
    }

    var form = new URLSearchParams();
    form.set('_token', t);
    form.set('source', 'dashboard-floor-save-v12');
    form.set('tables', JSON.stringify(list));

    var url = '/admin/pmd-floor-plan-save-v1';

    show('Saving to ' + url + ' ...');

    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': t
      },
      body: form.toString()
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) {
            throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
          }
          return json;
        });
      })
      .then(function (json) {
        show('Saved successfully. Updated tables: ' + (json.updated || 0));
        document.body.classList.remove('pmd-floor-editing-v6');
        setTimeout(function () { location.reload(); }, 800);
      })
      .catch(function (err) {
        show('Save failed:\n' + err.message);
        console.error('[PMD save v12] failed', err);
      });
  }

  document.addEventListener('click', save, true);

  hijack();
  setTimeout(hijack, 250);
  setTimeout(hijack, 900);
  setTimeout(hijack, 1800);
  setTimeout(hijack, 3200);

  console.info('[PMD] Floor save stable v12 active');
})();
 /* PMD_FLOOR_SAVE_STABLE_V12_END */


/* PMD_FLOOR_SAVE_CLOSURE_V13_CLIENT_START */
(function () {
  window.PMD_FLOOR_SAVE_CLOSURE_V13_CLIENT = true;
  console.info('[PMD] Floor save closure v13 route expected at /admin/pmd-floor-plan-save-v1');
})();
 /* PMD_FLOOR_SAVE_CLOSURE_V13_CLIENT_END */


/* PMD_FLOOR_SAVE_VIA_MERGE_V15_START */
/*
  Save floor layout through existing stable route:
  /admin/pmd-floor-plan-merge
  This avoids new admin route permission/catch-all issues.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_SAVE_VIA_MERGE_V15';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function show(msg) {
    var el = $('.pmd-floor-save-debug-v15');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-save-debug-v15';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5600);
    console.log('[PMD save v15]', msg);
  }

  function readCookie(name) {
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) {
        try { return decodeURIComponent(p.slice(name.length + 1)); }
        catch (e) { return p.slice(name.length + 1); }
      }
    }
    return '';
  }

  function token() {
    var meta = $('meta[name="csrf-token"], meta[name="_token"], meta[name="X-CSRF-TOKEN"]');
    if (meta && meta.content) return meta.content;

    var input = $('input[name="_token"], input[name="csrf_token"], input[name="csrf-token"]');
    if (input && input.value) return input.value;

    if (window.TastyIgniter && window.TastyIgniter.csrfToken) return window.TastyIgniter.csrfToken;
    if (window.ti && window.ti.csrfToken) return window.ti.csrfToken;
    if (window.csrfToken) return window.csrfToken;

    return readCookie('XSRF-TOKEN') || '';
  }

  function pct(el, prop, fallback) {
    var n = parseFloat(String(el.style[prop] || '').replace('%', ''));
    return Number.isFinite(n) ? n : fallback;
  }

  function items() {
    return $$('.pmd-v15-floor-node[data-pmd-table]').map(function (node) {
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      var left = pct(node, 'left', 0);
      var top = pct(node, 'top', 0);
      var width = pct(node, 'width', 17);
      var height = pct(node, 'height', 15.714);

      return {
        id: id,
        floor_x: Math.round(left * 10 * 100) / 100,
        floor_y: Math.round(top * 5.6 * 100) / 100,
        floor_width: Math.round(width * 10 * 100) / 100,
        floor_height: Math.round(height * 5.6 * 100) / 100
      };
    }).filter(function (x) { return x.id > 0; });
  }

  function hijack() {
    var btn =
      $('[data-pmd-floor-save-v15]') ||
      $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    btn.removeAttribute('data-pmd-floor-save-v6');
    btn.removeAttribute('data-pmd-floor-save-v11');
    btn.removeAttribute('data-pmd-floor-save-v12');
    btn.setAttribute('data-pmd-floor-save-v15', '1');
    btn.textContent = 'Save layout';
  }

  function save(event) {
    var btn = event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v15]');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var t = token();
    var list = items();

    if (!list.length) {
      show('No floor tables found to save.');
      return;
    }

    if (!t) {
      show('CSRF token missing. Reload admin page and try again.');
      return;
    }

    var form = new URLSearchParams();
    form.set('_token', t);
    form.set('action', 'pmd_save_floor_layout_v15');
    form.set('source', 'dashboard-floor-save-via-merge-v15');
    form.set('tables', JSON.stringify(list));

    var url = '/admin/pmd-floor-plan-merge';

    show('Saving through existing merge route...\n' + url);

    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': t
      },
      body: form.toString()
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) {
            throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
          }
          return json;
        });
      })
      .then(function (json) {
        show('Saved successfully. Updated tables: ' + (json.updated || 0));
        document.body.classList.remove('pmd-floor-editing-v6');
        setTimeout(function () { location.reload(); }, 800);
      })
      .catch(function (err) {
        show('Save failed:\n' + err.message);
        console.error('[PMD save v15] failed', err);
      });
  }

  document.addEventListener('click', save, true);

  hijack();
  setTimeout(hijack, 250);
  setTimeout(hijack, 900);
  setTimeout(hijack, 1800);
  setTimeout(hijack, 3200);

  console.info('[PMD] Floor save via merge v15 active');
})();
 /* PMD_FLOOR_SAVE_VIA_MERGE_V15_END */


/* PMD_FLOOR_SAVE_DATA_ENDPOINT_V17_START */
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_SAVE_DATA_ENDPOINT_V17';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function show(msg) {
    var el = $('.pmd-floor-save-debug-v17');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-save-debug-v17';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 6500);
    console.log('[PMD save v17]', msg);
  }

  function readCookie(name) {
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) {
        try { return decodeURIComponent(p.slice(name.length + 1)); }
        catch (e) { return p.slice(name.length + 1); }
      }
    }
    return '';
  }

  function token() {
    var meta = $('meta[name="csrf-token"], meta[name="_token"], meta[name="X-CSRF-TOKEN"]');
    if (meta && meta.content) return meta.content;

    var input = $('input[name="_token"], input[name="csrf_token"], input[name="csrf-token"]');
    if (input && input.value) return input.value;

    if (window.TastyIgniter && window.TastyIgniter.csrfToken) return window.TastyIgniter.csrfToken;
    if (window.ti && window.ti.csrfToken) return window.ti.csrfToken;
    if (window.csrfToken) return window.csrfToken;

    return readCookie('XSRF-TOKEN') || '';
  }

  function pct(el, prop, fallback) {
    var n = parseFloat(String(el.style[prop] || '').replace('%', ''));
    return Number.isFinite(n) ? n : fallback;
  }

  function collectItems() {
    return $$('.pmd-v15-floor-node[data-pmd-table]').map(function (node) {
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      var left = pct(node, 'left', 0);
      var top = pct(node, 'top', 0);
      var width = pct(node, 'width', 17);
      var height = pct(node, 'height', 15.714);

      return {
        id: id,
        floor_x: Math.round(left * 10 * 100) / 100,
        floor_y: Math.round(top * 5.6 * 100) / 100,
        floor_width: Math.round(width * 10 * 100) / 100,
        floor_height: Math.round(height * 5.6 * 100) / 100
      };
    }).filter(function (x) { return x.id > 0; });
  }

  function hijack() {
    var btn =
      $('[data-pmd-floor-save-v17]') ||
      $('[data-pmd-floor-save-v16]') ||
      $('[data-pmd-floor-save-v15]') ||
      $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    btn.removeAttribute('data-pmd-floor-save-v6');
    btn.removeAttribute('data-pmd-floor-save-v11');
    btn.removeAttribute('data-pmd-floor-save-v12');
    btn.removeAttribute('data-pmd-floor-save-v15');
    btn.removeAttribute('data-pmd-floor-save-v16');
    btn.setAttribute('data-pmd-floor-save-v17', '1');
    btn.textContent = 'Save layout';
  }

  function save(event) {
    var btn = event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v17]');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var t = token();
    var list = collectItems();

    if (!list.length) {
      show('No floor tables found to save.');
      return;
    }

    if (!t) {
      show('CSRF token missing. Reload admin page and try again.');
      return;
    }

    var form = new URLSearchParams();
    form.set('_token', t);
    form.set('action', 'pmd_save_floor_layout_v17');
    form.set('source', 'dashboard-floor-save-data-v17');
    form.set('tables', JSON.stringify(list));

    var url = '/admin/pmd-owner-dashboard-clean-v1-data';

    show('Saving layout through working dashboard endpoint...\n' + url);

    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': t
      },
      body: form.toString()
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) {
            throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 220)));
          }
          return json;
        });
      })
      .then(function (json) {
        show('Saved successfully. Updated tables: ' + (json.updated || 0));
        document.body.classList.remove('pmd-floor-editing-v6');
        setTimeout(function () { location.reload(); }, 900);
      })
      .catch(function (err) {
        show('Save failed:\n' + err.message);
        console.error('[PMD save v17] failed', err);
      });
  }

  document.addEventListener('click', save, true);

  hijack();
  setTimeout(hijack, 150);
  setTimeout(hijack, 500);
  setTimeout(hijack, 1100);
  setTimeout(hijack, 2200);
  setTimeout(hijack, 3600);

  console.info('[PMD] Floor save data endpoint v17 active');
})();
 /* PMD_FLOOR_SAVE_DATA_ENDPOINT_V17_END */


/* PMD_FLOOR_EDITOR_FINAL_COMMAND_SAVE_V18_START */
/*
  Final floor editor save behavior:
  no POST, no admin route, no CSRF.
  Save button generates a VPS command from current dragged DOM positions.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_EDITOR_FINAL_COMMAND_SAVE_V18';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function pct(node, prop, fallback) {
    var raw = String(node.style[prop] || '').replace('%', '');
    var n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function collectRows() {
    var canvas =
      $('.pmd-v15-floor-canvas') ||
      $('[class*="floor-canvas"]') ||
      $('[class*="floor"][class*="canvas"]');

    if (!canvas) throw new Error('Floor canvas not found.');

    var cr = canvas.getBoundingClientRect();

    var rows = $$('.pmd-v15-floor-node[data-pmd-table]').map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPctFallback = ((r.left - cr.left) / cr.width) * 100;
      var topPctFallback = ((r.top - cr.top) / cr.height) * 100;
      var widthPctFallback = (r.width / cr.width) * 100;
      var heightPctFallback = (r.height / cr.height) * 100;

      var leftPct = pct(node, 'left', leftPctFallback);
      var topPct = pct(node, 'top', topPctFallback);
      var widthPct = pct(node, 'width', widthPctFallback);
      var heightPct = pct(node, 'height', heightPctFallback);

      return {
        id: id,
        floor_x: round2(leftPct * 10),
        floor_y: round2(topPct * 5.6),
        floor_width: round2(widthPct * 10),
        floor_height: round2(heightPct * 5.6)
      };
    }).filter(function (x) {
      return x.id > 0 &&
        Number.isFinite(x.floor_x) &&
        Number.isFinite(x.floor_y) &&
        Number.isFinite(x.floor_width) &&
        Number.isFinite(x.floor_height);
    });

    if (!rows.length) throw new Error('No valid floor tables found.');

    return rows;
  }

  function buildCommand(rows) {
    var b64 = btoa(JSON.stringify(rows));
    var ids = rows.map(function (r) { return r.id; }).join(',');

    return 'cd /var/www/paymydine || exit 1\n\n' +
      'php artisan tinker --execute=\\\'$rows=json_decode(base64_decode("' + b64 + '"),true); ' +
      'DB::transaction(function() use ($rows){ foreach($rows as $r){ DB::table("tables")->where("table_id",(int)$r["id"])->update([' +
      '"floor_x"=>(float)$r["floor_x"],"floor_y"=>(float)$r["floor_y"],"floor_width"=>(float)$r["floor_width"],"floor_height"=>(float)$r["floor_height"],"visible_on_floor_plan"=>1' +
      ']); } }); echo "PMD floor saved ".count($rows)." tables".PHP_EOL;\\\'\n\n' +
      'php artisan tinker --execute=\\\'DB::table("tables")->select("table_id","table_no","floor_x","floor_y","floor_width","floor_height","visible_on_floor_plan")->whereIn("table_id",[' + ids + '])->orderBy("table_id")->get()->each(function($r){ echo json_encode($r).PHP_EOL; });\\\'';
  }

  function ensureBox() {
    var box = $('.pmd-floor-command-v18-box');
    if (box) return box;

    box = document.createElement('div');
    box.className = 'pmd-floor-command-v18-box';
    box.innerHTML =
      '<strong>PMD Floor Layout Save Command</strong>' +
      '<textarea readonly spellcheck="false"></textarea>' +
      '<div class="pmd-floor-command-v18-actions">' +
        '<button type="button" class="pmd-floor-command-v18-copy">Copy command</button>' +
        '<button type="button" class="pmd-floor-command-v18-close">Close</button>' +
      '</div>';

    document.body.appendChild(box);

    box.querySelector('.pmd-floor-command-v18-close').addEventListener('click', function () {
      box.classList.remove('is-visible');
    });

    box.querySelector('.pmd-floor-command-v18-copy').addEventListener('click', function () {
      var ta = box.querySelector('textarea');
      ta.focus();
      ta.select();
      try {
        navigator.clipboard.writeText(ta.value);
        console.log('[PMD v18] command copied');
      } catch (e) {
        document.execCommand('copy');
      }
    });

    return box;
  }

  function showCommand(cmd, rows) {
    var box = ensureBox();
    var ta = box.querySelector('textarea');
    ta.value = cmd;
    box.classList.add('is-visible');
    ta.focus();
    ta.select();

    console.table(rows);
    console.log('--- PMD VPS SAVE COMMAND ---');
    console.log(cmd);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(function () {
        console.log('%cPMD v18: command copied. Paste it in VPS terminal.', 'color:#16a34a;font-weight:bold;font-size:14px');
      }).catch(function () {
        console.warn('Clipboard blocked. Copy from the visible textarea.');
      });
    }
  }

  function hijack() {
    var btn =
      $('[data-pmd-floor-save-v18]') ||
      $('[data-pmd-floor-save-v17]') ||
      $('[data-pmd-floor-save-v16]') ||
      $('[data-pmd-floor-save-v15]') ||
      $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    btn.removeAttribute('data-pmd-floor-save-v6');
    btn.removeAttribute('data-pmd-floor-save-v11');
    btn.removeAttribute('data-pmd-floor-save-v12');
    btn.removeAttribute('data-pmd-floor-save-v15');
    btn.removeAttribute('data-pmd-floor-save-v16');
    btn.removeAttribute('data-pmd-floor-save-v17');
    btn.setAttribute('data-pmd-floor-save-v18', '1');
    btn.textContent = 'Copy VPS save command';
  }

  function onClick(event) {
    var btn = event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v18]');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      var rows = collectRows();
      var cmd = buildCommand(rows);
      showCommand(cmd, rows);
    } catch (err) {
      console.error('[PMD v18] failed to build save command', err);
      alert('PMD floor save command failed: ' + err.message);
    }
  }

  document.addEventListener('click', onClick, true);

  hijack();
  setTimeout(hijack, 150);
  setTimeout(hijack, 500);
  setTimeout(hijack, 1200);
  setTimeout(hijack, 2400);
  setTimeout(hijack, 4200);
  setTimeout(hijack, 7000);

  console.info('[PMD] Floor editor final command save v18 active');
})();
 /* PMD_FLOOR_EDITOR_FINAL_COMMAND_SAVE_V18_END */


/* PMD_FLOOR_DIRECT_SAVE_GET_V19_START */
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_DIRECT_SAVE_GET_V19';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function show(msg) {
    var el = $('.pmd-floor-direct-save-v19-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-direct-save-v19-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD save v19]', msg);
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function pct(node, prop, fallback) {
    var raw = String(node.style[prop] || '').replace('%', '');
    var n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function collectRows() {
    var canvas =
      $('.pmd-v15-floor-canvas') ||
      $('[class*="floor-canvas"]') ||
      $('[class*="floor"][class*="canvas"]');

    if (!canvas) throw new Error('Floor canvas not found.');

    var cr = canvas.getBoundingClientRect();

    var rows = $$('.pmd-v15-floor-node[data-pmd-table]').map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPctFallback = ((r.left - cr.left) / cr.width) * 100;
      var topPctFallback = ((r.top - cr.top) / cr.height) * 100;
      var widthPctFallback = (r.width / cr.width) * 100;
      var heightPctFallback = (r.height / cr.height) * 100;

      var leftPct = pct(node, 'left', leftPctFallback);
      var topPct = pct(node, 'top', topPctFallback);
      var widthPct = pct(node, 'width', widthPctFallback);
      var heightPct = pct(node, 'height', heightPctFallback);

      return {
        id: id,
        floor_x: round2(leftPct * 10),
        floor_y: round2(topPct * 5.6),
        floor_width: round2(widthPct * 10),
        floor_height: round2(heightPct * 5.6)
      };
    }).filter(function (x) {
      return x.id > 0 &&
        Number.isFinite(x.floor_x) &&
        Number.isFinite(x.floor_y) &&
        Number.isFinite(x.floor_width) &&
        Number.isFinite(x.floor_height);
    });

    if (!rows.length) throw new Error('No valid floor tables found.');

    return rows;
  }

  function encodeRows(rows) {
    return btoa(JSON.stringify(rows));
  }

  function hijack() {
    var btn =
      $('[data-pmd-floor-save-v19]') ||
      $('[data-pmd-floor-save-v18]') ||
      $('[data-pmd-floor-save-v17]') ||
      $('[data-pmd-floor-save-v16]') ||
      $('[data-pmd-floor-save-v15]') ||
      $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    btn.removeAttribute('data-pmd-floor-save-v6');
    btn.removeAttribute('data-pmd-floor-save-v11');
    btn.removeAttribute('data-pmd-floor-save-v12');
    btn.removeAttribute('data-pmd-floor-save-v15');
    btn.removeAttribute('data-pmd-floor-save-v16');
    btn.removeAttribute('data-pmd-floor-save-v17');
    btn.removeAttribute('data-pmd-floor-save-v18');
    btn.setAttribute('data-pmd-floor-save-v19', '1');
    btn.textContent = 'Save layout';

    document.querySelectorAll('.pmd-floor-command-v18-box').forEach(function (el) { el.remove(); });
  }

  function save(event) {
    var btn = event.target && event.target.closest && event.target.closest('[data-pmd-floor-save-v19]');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var rows;

    try {
      rows = collectRows();
    } catch (err) {
      show('Save failed: ' + err.message);
      return;
    }

    var params = new URLSearchParams();
    params.set('pmd_floor_save_v19', '1');
    params.set('tables_b64', encodeRows(rows));
    params.set('_', String(Date.now()));

    var url = '/admin/pmd-owner-dashboard-clean-v1-data?' + params.toString();

    show('Saving layout directly...');

    fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) {
            throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
          }
          return json;
        });
      })
      .then(function (json) {
        console.table(rows);
        show('Saved successfully. Updated tables: ' + (json.updated || 0));
        document.body.classList.remove('pmd-floor-editing-v6');
        setTimeout(function () { location.reload(); }, 900);
      })
      .catch(function (err) {
        show('Save failed:\n' + err.message);
        console.error('[PMD save v19] failed', err);
      });
  }

  document.addEventListener('click', save, true);

  hijack();
  setTimeout(hijack, 150);
  setTimeout(hijack, 500);
  setTimeout(hijack, 1200);
  setTimeout(hijack, 2400);
  setTimeout(hijack, 4200);
  setTimeout(hijack, 7000);

  console.info('[PMD] Floor direct save GET v19 active');
})();
 /* PMD_FLOOR_DIRECT_SAVE_GET_V19_END */


/* PMD_FLOOR_CALIBRATED_DRAG_V20_START */
/*
  v20 calibration:
  - normalize nodes when edit mode starts
  - custom pointer drag based on actual canvas rect
  - save using actual DOM position, not stale style values
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_CALIBRATED_DRAG_V20';
  if (window[FLAG]) return;
  window[FLAG] = true;

  var state = {
    normalized: false,
    drag: null
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function show(msg) {
    var el = $('.pmd-floor-calibrated-v20-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-calibrated-v20-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD v20]', msg);
  }

  function canvas() {
    return $('.pmd-v15-floor-canvas') ||
      $('[class*="floor-canvas"]') ||
      $('[class*="floor"][class*="canvas"]');
  }

  function nodes() {
    return $$('.pmd-v15-floor-node[data-pmd-table]');
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function normalizeNodes(force) {
    var c = canvas();
    if (!c) return false;

    if (state.normalized && !force) return true;

    var cr = c.getBoundingClientRect();
    if (!cr.width || !cr.height) return false;

    nodes().forEach(function (node) {
      var r = node.getBoundingClientRect();

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;
      var widthPct = (r.width / cr.width) * 100;
      var heightPct = (r.height / cr.height) * 100;

      leftPct = clamp(leftPct, 0, Math.max(0, 100 - widthPct));
      topPct = clamp(topPct, 0, Math.max(0, 100 - heightPct));

      node.style.left = round2(leftPct) + '%';
      node.style.top = round2(topPct) + '%';
      node.style.width = round2(widthPct) + '%';
      node.style.height = round2(heightPct) + '%';
      node.style.position = 'absolute';
      node.style.transform = 'none';
      node.setAttribute('data-pmd-v20-normalized', '1');
    });

    state.normalized = true;
    return true;
  }

  function collectRows() {
    var c = canvas();
    if (!c) throw new Error('Floor canvas not found.');

    normalizeNodes(true);

    var cr = c.getBoundingClientRect();
    var list = nodes().map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;
      var widthPct = (r.width / cr.width) * 100;
      var heightPct = (r.height / cr.height) * 100;

      return {
        id: id,
        floor_x: round2(clamp(leftPct, 0, 100) * 10),
        floor_y: round2(clamp(topPct, 0, 100) * 5.6),
        floor_width: round2(widthPct * 10),
        floor_height: round2(heightPct * 5.6)
      };
    }).filter(function (x) {
      return x.id > 0 &&
        Number.isFinite(x.floor_x) &&
        Number.isFinite(x.floor_y) &&
        Number.isFinite(x.floor_width) &&
        Number.isFinite(x.floor_height);
    });

    if (!list.length) throw new Error('No valid floor tables found.');
    return list;
  }

  function encodeRows(rows) {
    return btoa(JSON.stringify(rows));
  }

  function saveRows(rows) {
    var params = new URLSearchParams();
    params.set('pmd_floor_save_v19', '1');
    params.set('tables_b64', encodeRows(rows));
    params.set('_', String(Date.now()));

    var url = '/admin/pmd-owner-dashboard-clean-v1-data?' + params.toString();

    show('Saving calibrated layout...');

    return fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) {
            throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
          }
          return json;
        });
      });
  }

  function hijackSaveButton() {
    var btn =
      $('[data-pmd-floor-save-v20]') ||
      $('[data-pmd-floor-save-v19]') ||
      $('[data-pmd-floor-save-v18]') ||
      $('[data-pmd-floor-save-v17]') ||
      $('[data-pmd-floor-save-v16]') ||
      $('[data-pmd-floor-save-v15]') ||
      $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    [
      'data-pmd-floor-save-v6',
      'data-pmd-floor-save-v11',
      'data-pmd-floor-save-v12',
      'data-pmd-floor-save-v15',
      'data-pmd-floor-save-v16',
      'data-pmd-floor-save-v17',
      'data-pmd-floor-save-v18',
      'data-pmd-floor-save-v19'
    ].forEach(function (attr) { btn.removeAttribute(attr); });

    btn.setAttribute('data-pmd-floor-save-v20', '1');
    btn.textContent = 'Save layout';
  }

  function maybeNormalizeEditMode() {
    if (document.body.classList.contains('pmd-floor-editing-v6')) {
      normalizeNodes(false);
      hijackSaveButton();
    } else {
      state.normalized = false;
    }
  }

  function pointerDown(e) {
    if (!document.body.classList.contains('pmd-floor-editing-v6')) return;

    var node = e.target && e.target.closest && e.target.closest('.pmd-v15-floor-node[data-pmd-table]');
    if (!node) return;

    var c = canvas();
    if (!c) return;

    normalizeNodes(false);

    var cr = c.getBoundingClientRect();
    var nr = node.getBoundingClientRect();

    state.drag = {
      node: node,
      canvas: c,
      pointerId: e.pointerId,
      offsetX: e.clientX - nr.left,
      offsetY: e.clientY - nr.top,
      widthPct: (nr.width / cr.width) * 100,
      heightPct: (nr.height / cr.height) * 100
    };

    node.classList.add('pmd-v20-dragging');

    try { node.setPointerCapture(e.pointerId); } catch (ignore) {}

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function pointerMove(e) {
    if (!state.drag) return;

    var d = state.drag;
    var cr = d.canvas.getBoundingClientRect();

    var leftPx = e.clientX - cr.left - d.offsetX;
    var topPx = e.clientY - cr.top - d.offsetY;

    var leftPct = (leftPx / cr.width) * 100;
    var topPct = (topPx / cr.height) * 100;

    leftPct = clamp(leftPct, 0, Math.max(0, 100 - d.widthPct));
    topPct = clamp(topPct, 0, Math.max(0, 100 - d.heightPct));

    d.node.style.left = round2(leftPct) + '%';
    d.node.style.top = round2(topPct) + '%';
    d.node.style.position = 'absolute';
    d.node.style.transform = 'none';

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function pointerUp(e) {
    if (!state.drag) return;

    var node = state.drag.node;
    node.classList.remove('pmd-v20-dragging');

    try { node.releasePointerCapture(state.drag.pointerId); } catch (ignore) {}

    state.drag = null;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function saveClick(e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-pmd-floor-save-v20]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var rows;
    try {
      rows = collectRows();
    } catch (err) {
      show('Save failed: ' + err.message);
      return;
    }

    console.table(rows);

    saveRows(rows)
      .then(function (json) {
        show('Saved successfully. Updated tables: ' + (json.updated || 0));
        document.body.classList.remove('pmd-floor-editing-v6');
        setTimeout(function () { location.reload(); }, 900);
      })
      .catch(function (err) {
        show('Save failed:\n' + err.message);
        console.error('[PMD v20] save failed', err);
      });
  }

  document.addEventListener('pointerdown', pointerDown, true);
  document.addEventListener('pointermove', pointerMove, true);
  document.addEventListener('pointerup', pointerUp, true);
  document.addEventListener('pointercancel', pointerUp, true);
  document.addEventListener('click', saveClick, true);

  document.addEventListener('click', function () {
    setTimeout(maybeNormalizeEditMode, 30);
    setTimeout(maybeNormalizeEditMode, 160);
  }, true);

  hijackSaveButton();
  maybeNormalizeEditMode();

  setTimeout(hijackSaveButton, 150);
  setTimeout(hijackSaveButton, 500);
  setTimeout(hijackSaveButton, 1200);
  setTimeout(hijackSaveButton, 2400);
  setTimeout(hijackSaveButton, 4200);
  setTimeout(maybeNormalizeEditMode, 700);
  setTimeout(maybeNormalizeEditMode, 1600);
  setTimeout(maybeNormalizeEditMode, 3200);

  console.info('[PMD] Floor calibrated drag/save v20 active');
})();
 /* PMD_FLOOR_CALIBRATED_DRAG_V20_END */


/* PMD_FLOOR_NO_JUMP_EDITOR_V21_START */
/*
  v21 no-jump floor editor:
  - captures normal-mode positions before edit mode changes layout
  - restores them after edit mode opens
  - custom drag using canvas-relative coordinates
  - saves ONLY floor_x/floor_y, preserving floor_width/floor_height
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_NO_JUMP_EDITOR_V21';
  if (window[FLAG]) return;
  window[FLAG] = true;

  var state = {
    preEditSnapshot: null,
    restoredForEdit: false,
    drag: null
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function canvas() {
    return $('.pmd-v15-floor-canvas') ||
      $('[class*="floor-canvas"]') ||
      $('[class*="floor"][class*="canvas"]');
  }

  function nodes() {
    return $$('.pmd-v15-floor-node[data-pmd-table]');
  }

  function show(msg) {
    var el = $('.pmd-floor-nojump-v21-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-floor-nojump-v21-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD v21]', msg);
  }

  function captureNormalPositions() {
    var c = canvas();
    if (!c) return null;

    var cr = c.getBoundingClientRect();
    if (!cr.width || !cr.height) return null;

    var rows = nodes().map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;

      return {
        id: id,
        leftPct: round2(leftPct),
        topPct: round2(topPct)
      };
    }).filter(function (x) { return x.id > 0; });

    if (!rows.length) return null;

    state.preEditSnapshot = {
      time: Date.now(),
      rows: rows
    };

    console.table(rows);
    console.log('[PMD v21] captured normal positions before edit');
    return state.preEditSnapshot;
  }

  function restorePreEditPositions() {
    if (!document.body.classList.contains('pmd-floor-editing-v6')) return false;
    if (!state.preEditSnapshot || !state.preEditSnapshot.rows) return false;

    var byId = new Map(state.preEditSnapshot.rows.map(function (r) { return [r.id, r]; }));

    nodes().forEach(function (node) {
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      var saved = byId.get(id);
      if (!saved) return;

      node.style.position = 'absolute';
      node.style.left = saved.leftPct + '%';
      node.style.top = saved.topPct + '%';
      node.style.transform = 'none';

      // Important: do NOT write width/height here.
      // Existing DB width/height must stay 170/88.
      node.style.removeProperty('width');
      node.style.removeProperty('height');

      node.setAttribute('data-pmd-v21-restored', '1');
    });

    state.restoredForEdit = true;
    console.log('[PMD v21] restored normal positions into edit mode');
    return true;
  }

  function collectRowsForSave() {
    var c = canvas();
    if (!c) throw new Error('Floor canvas not found.');

    var cr = c.getBoundingClientRect();
    if (!cr.width || !cr.height) throw new Error('Floor canvas has invalid size.');

    var rows = nodes().map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;

      return {
        id: id,
        floor_x: round2(clamp(leftPct, 0, 100) * 10),
        floor_y: round2(clamp(topPct, 0, 100) * 5.6)
      };
    }).filter(function (x) {
      return x.id > 0 &&
        Number.isFinite(x.floor_x) &&
        Number.isFinite(x.floor_y);
    });

    if (!rows.length) throw new Error('No valid floor tables found.');
    return rows;
  }

  function saveRows(rows) {
    var params = new URLSearchParams();
    params.set('pmd_floor_save_v19', '1');
    params.set('tables_b64', btoa(JSON.stringify(rows)));
    params.set('_', String(Date.now()));

    var url = '/admin/pmd-owner-dashboard-clean-v1-data?' + params.toString();

    show('Saving no-jump layout...');

    return fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }).then(function (r) {
      return r.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) {}
        if (!r.ok || !json || !json.ok) {
          throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
        }
        return json;
      });
    });
  }

  function hijackSaveButton() {
    var btn =
      $('[data-pmd-floor-save-v21]') ||
      $('[data-pmd-floor-save-v20]') ||
      $('[data-pmd-floor-save-v19]') ||
      $('[data-pmd-floor-save-v18]') ||
      $('[data-pmd-floor-save-v17]') ||
      $('[data-pmd-floor-save-v16]') ||
      $('[data-pmd-floor-save-v15]') ||
      $('[data-pmd-floor-save-v12]') ||
      $('[data-pmd-floor-save-v11]') ||
      $('[data-pmd-floor-save-v6]');

    if (!btn) return;

    [
      'data-pmd-floor-save-v6',
      'data-pmd-floor-save-v11',
      'data-pmd-floor-save-v12',
      'data-pmd-floor-save-v15',
      'data-pmd-floor-save-v16',
      'data-pmd-floor-save-v17',
      'data-pmd-floor-save-v18',
      'data-pmd-floor-save-v19',
      'data-pmd-floor-save-v20'
    ].forEach(function (attr) { btn.removeAttribute(attr); });

    btn.setAttribute('data-pmd-floor-save-v21', '1');
    btn.textContent = 'Save layout';
  }

  function isEditButton(target) {
    return !!(target && target.closest && target.closest(
      '.pmd-floor-global-edit-v6, .pmd-floor-floating-v10, [data-pmd-floor-edit-v6]'
    ));
  }

  function onAnyClickCapture(e) {
    if (isEditButton(e.target) && !document.body.classList.contains('pmd-floor-editing-v6')) {
      captureNormalPositions();

      setTimeout(restorePreEditPositions, 20);
      setTimeout(restorePreEditPositions, 80);
      setTimeout(restorePreEditPositions, 180);
      setTimeout(hijackSaveButton, 200);
      return;
    }

    setTimeout(hijackSaveButton, 60);
  }

  function pointerDown(e) {
    if (!document.body.classList.contains('pmd-floor-editing-v6')) return;

    var node = e.target && e.target.closest && e.target.closest('.pmd-v15-floor-node[data-pmd-table]');
    if (!node) return;

    restorePreEditPositions();

    var c = canvas();
    if (!c) return;

    var cr = c.getBoundingClientRect();
    var nr = node.getBoundingClientRect();

    state.drag = {
      node: node,
      canvas: c,
      pointerId: e.pointerId,
      offsetX: e.clientX - nr.left,
      offsetY: e.clientY - nr.top,
      widthPct: (nr.width / cr.width) * 100,
      heightPct: (nr.height / cr.height) * 100
    };

    node.classList.add('pmd-v21-dragging');

    try { node.setPointerCapture(e.pointerId); } catch (ignore) {}

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function pointerMove(e) {
    if (!state.drag) return;

    var d = state.drag;
    var cr = d.canvas.getBoundingClientRect();

    var leftPx = e.clientX - cr.left - d.offsetX;
    var topPx = e.clientY - cr.top - d.offsetY;

    var leftPct = (leftPx / cr.width) * 100;
    var topPct = (topPx / cr.height) * 100;

    leftPct = clamp(leftPct, 0, Math.max(0, 100 - d.widthPct));
    topPct = clamp(topPct, 0, Math.max(0, 100 - d.heightPct));

    d.node.style.position = 'absolute';
    d.node.style.left = round2(leftPct) + '%';
    d.node.style.top = round2(topPct) + '%';
    d.node.style.transform = 'none';
    d.node.style.removeProperty('width');
    d.node.style.removeProperty('height');

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function pointerUp(e) {
    if (!state.drag) return;

    state.drag.node.classList.remove('pmd-v21-dragging');

    try { state.drag.node.releasePointerCapture(state.drag.pointerId); } catch (ignore) {}

    state.drag = null;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function saveClick(e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-pmd-floor-save-v21]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var rows;

    try {
      rows = collectRowsForSave();
    } catch (err) {
      show('Save failed: ' + err.message);
      return;
    }

    console.table(rows);

    saveRows(rows).then(function (json) {
      show('Saved successfully. Updated tables: ' + (json.updated || 0));
      document.body.classList.remove('pmd-floor-editing-v6');
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function (err) {
      show('Save failed:\\n' + err.message);
      console.error('[PMD v21] save failed', err);
    });
  }

  document.addEventListener('click', onAnyClickCapture, true);
  document.addEventListener('click', saveClick, true);
  document.addEventListener('pointerdown', pointerDown, true);
  document.addEventListener('pointermove', pointerMove, true);
  document.addEventListener('pointerup', pointerUp, true);
  document.addEventListener('pointercancel', pointerUp, true);

  hijackSaveButton();

  setTimeout(hijackSaveButton, 150);
  setTimeout(hijackSaveButton, 500);
  setTimeout(hijackSaveButton, 1200);
  setTimeout(hijackSaveButton, 2400);
  setTimeout(hijackSaveButton, 4200);

  console.info('[PMD] Floor no-jump editor/save v21 active');
})();
 /* PMD_FLOOR_NO_JUMP_EDITOR_V21_END */


/* PMD_FLOOR_OVERLAY_EDITOR_V22_START */
/*
  v22 isolated overlay editor.
  Bypasses old v6/v20/v21 edit-mode calibration completely.
*/
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_OVERLAY_EDITOR_V22';
  if (window[FLAG]) return;
  window[FLAG] = true;

  var state = {
    active: false,
    drag: null
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function canvas() {
    return $('.pmd-v15-floor-canvas') ||
      $('[class*="floor-canvas"]') ||
      $('[class*="floor"][class*="canvas"]');
  }

  function realNodes() {
    return $$('.pmd-v15-floor-node[data-pmd-table]');
  }

  function editNodes() {
    return $$('.pmd-v22-edit-node[data-pmd-table]');
  }

  function show(msg) {
    var el = $('.pmd-v22-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-v22-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD v22]', msg);
  }

  function ensureToolbar() {
    var bar = $('.pmd-v22-toolbar');
    if (bar) return bar;

    bar = document.createElement('div');
    bar.className = 'pmd-v22-toolbar';
    bar.innerHTML =
      '<span>Floor edit mode</span>' +
      '<button type="button" class="pmd-v22-save">Save layout</button>' +
      '<button type="button" class="pmd-v22-cancel">Cancel</button>';

    document.body.appendChild(bar);
    return bar;
  }

  function clearOverlay() {
    editNodes().forEach(function (n) { n.remove(); });
  }

  function applyCanonicalPositionsFromData() {
    var c = canvas();
    if (!c) return;

    fetch('/admin/pmd-owner-dashboard-clean-v1-data?_pmd_v22=' + Date.now(), {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;

        var tables = data.tables || data.floor_tables || [];
        if (!Array.isArray(tables) || !tables.length) return;

        var byId = new Map();
        tables.forEach(function (t) {
          var id = parseInt(t.table_id || t.id, 10);
          if (!id) return;
          byId.set(id, t);
        });

        realNodes().forEach(function (node) {
          var id = parseInt(node.getAttribute('data-pmd-table'), 10);
          var t = byId.get(id);
          if (!t) return;

          var x = parseFloat(t.floor_x);
          var y = parseFloat(t.floor_y);

          if (!Number.isFinite(x) || !Number.isFinite(y)) return;

          var leftPct = clamp(x / 10, 0, 95);
          var topPct = clamp(y / 5.6, 0, 95);

          node.style.position = 'absolute';
          node.style.left = round2(leftPct) + '%';
          node.style.top = round2(topPct) + '%';
          node.style.transform = 'none';
        });
      })
      .catch(function () {});
  }

  function startEditor() {
    var c = canvas();
    if (!c) {
      show('Floor canvas not found.');
      return;
    }

    clearOverlay();

    document.body.classList.remove('pmd-floor-editing-v6');
    document.body.classList.add('pmd-floor-editing-v22');

    ensureToolbar();

    var cr = c.getBoundingClientRect();

    realNodes().forEach(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      if (!id) return;

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;
      var widthPct = (r.width / cr.width) * 100;
      var heightPct = (r.height / cr.height) * 100;

      var clone = node.cloneNode(true);
      clone.classList.add('pmd-v22-edit-node');
      clone.classList.remove('pmd-v15-floor-node');
      clone.setAttribute('data-pmd-table', String(id));

      clone.style.position = 'absolute';
      clone.style.left = round2(leftPct) + '%';
      clone.style.top = round2(topPct) + '%';
      clone.style.width = round2(widthPct) + '%';
      clone.style.height = round2(heightPct) + '%';
      clone.style.transform = 'none';

      c.appendChild(clone);
    });

    state.active = true;
    show('Edit mode ready. Drag tables, then Save layout.');
  }

  function stopEditor() {
    clearOverlay();
    document.body.classList.remove('pmd-floor-editing-v22');
    state.active = false;
    state.drag = null;
  }

  function rowsForSave() {
    var c = canvas();
    if (!c) throw new Error('Floor canvas not found.');

    var cr = c.getBoundingClientRect();

    var rows = editNodes().map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;

      return {
        id: id,
        floor_x: round2(clamp(leftPct, 0, 100) * 10),
        floor_y: round2(clamp(topPct, 0, 100) * 5.6)
      };
    }).filter(function (x) {
      return x.id > 0 &&
        Number.isFinite(x.floor_x) &&
        Number.isFinite(x.floor_y);
    });

    if (!rows.length) throw new Error('No valid table positions.');
    return rows;
  }

  function saveRows(rows) {
    var params = new URLSearchParams();
    params.set('pmd_floor_save_v19', '1');
    params.set('tables_b64', btoa(JSON.stringify(rows)));
    params.set('_', String(Date.now()));

    return fetch('/admin/pmd-owner-dashboard-clean-v1-data?' + params.toString(), {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }).then(function (r) {
      return r.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) {}
        if (!r.ok || !json || !json.ok) {
          throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
        }
        return json;
      });
    });
  }

  function saveEditor() {
    var rows;
    try {
      rows = rowsForSave();
    } catch (err) {
      show('Save failed: ' + err.message);
      return;
    }

    console.table(rows);
    show('Saving layout...');

    saveRows(rows).then(function (json) {
      show('Saved successfully. Updated tables: ' + (json.updated || 0));
      stopEditor();
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function (err) {
      show('Save failed:\\n' + err.message);
      console.error('[PMD v22] save failed', err);
    });
  }

  function isEditButton(target) {
    return !!(target && target.closest && target.closest(
      '.pmd-floor-global-edit-v6, .pmd-floor-floating-v10, [data-pmd-floor-edit-v6]'
    ));
  }

  window.addEventListener('click', function (e) {
    if (isEditButton(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      startEditor();
      return;
    }

    if (e.target && e.target.closest && e.target.closest('.pmd-v22-save')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      saveEditor();
      return;
    }

    if (e.target && e.target.closest && e.target.closest('.pmd-v22-cancel')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      stopEditor();
      return;
    }
  }, true);

  window.addEventListener('pointerdown', function (e) {
    if (!state.active) return;

    var node = e.target && e.target.closest && e.target.closest('.pmd-v22-edit-node[data-pmd-table]');
    if (!node) return;

    var c = canvas();
    if (!c) return;

    var cr = c.getBoundingClientRect();
    var nr = node.getBoundingClientRect();

    state.drag = {
      node: node,
      canvas: c,
      pointerId: e.pointerId,
      offsetX: e.clientX - nr.left,
      offsetY: e.clientY - nr.top,
      widthPct: (nr.width / cr.width) * 100,
      heightPct: (nr.height / cr.height) * 100
    };

    node.classList.add('pmd-v22-dragging');

    try { node.setPointerCapture(e.pointerId); } catch (ignore) {}

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointermove', function (e) {
    if (!state.drag) return;

    var d = state.drag;
    var cr = d.canvas.getBoundingClientRect();

    var leftPx = e.clientX - cr.left - d.offsetX;
    var topPx = e.clientY - cr.top - d.offsetY;

    var leftPct = clamp((leftPx / cr.width) * 100, 0, Math.max(0, 100 - d.widthPct));
    var topPct = clamp((topPx / cr.height) * 100, 0, Math.max(0, 100 - d.heightPct));

    d.node.style.left = round2(leftPct) + '%';
    d.node.style.top = round2(topPct) + '%';
    d.node.style.transform = 'none';

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointerup', function (e) {
    if (!state.drag) return;

    state.drag.node.classList.remove('pmd-v22-dragging');

    try { state.drag.node.releasePointerCapture(state.drag.pointerId); } catch (ignore) {}

    state.drag = null;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointercancel', function (e) {
    if (!state.drag) return;
    state.drag.node.classList.remove('pmd-v22-dragging');
    state.drag = null;
  }, true);

  ensureToolbar();

  setTimeout(applyCanonicalPositionsFromData, 400);
  setTimeout(applyCanonicalPositionsFromData, 1200);
  setTimeout(applyCanonicalPositionsFromData, 2600);

  console.info('[PMD] Floor overlay editor v22 active');
})();
 /* PMD_FLOOR_OVERLAY_EDITOR_V22_END */


/* PMD_FLOOR_CANONICAL_OVERLAY_V23_START */
(function () {
  'use strict';

  var FLAG = 'PMD_FLOOR_CANONICAL_OVERLAY_V23';
  if (window[FLAG]) return;
  window[FLAG] = true;

  var STORAGE_KEY = 'PMD_FLOOR_V23_CANONICAL_ACTIVE';
  var state = { active: false, drag: null };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function canvas() {
    return $('.pmd-v15-floor-canvas') ||
      $('[class*="floor-canvas"]') ||
      $('[class*="floor"][class*="canvas"]');
  }

  function realNodes() {
    return $$('.pmd-v15-floor-node[data-pmd-table]');
  }

  function editNodes() {
    return $$('.pmd-v23-edit-node[data-pmd-table]');
  }

  function show(msg) {
    var el = $('.pmd-v23-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-v23-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 5200);
    console.log('[PMD v23]', msg);
  }

  function ensureButton() {
    if ($('.pmd-v23-edit-float')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-v23-edit-float';
    btn.textContent = 'Edit Floor';
    document.body.appendChild(btn);
  }

  function ensureToolbar() {
    var bar = $('.pmd-v23-toolbar');
    if (bar) return bar;

    bar = document.createElement('div');
    bar.className = 'pmd-v23-toolbar';
    bar.innerHTML =
      '<span>Floor edit mode</span>' +
      '<button type="button" class="pmd-v23-save">Save layout</button>' +
      '<button type="button" class="pmd-v23-cancel">Cancel</button>';

    document.body.appendChild(bar);
    return bar;
  }

  function clearOverlay() {
    editNodes().forEach(function (n) { n.remove(); });
  }

  function applyCanonicalRender() {
    if (localStorage.getItem(STORAGE_KEY) !== '1') return;

    var c = canvas();
    if (!c) return;

    fetch('/admin/pmd-owner-dashboard-clean-v1-data?_pmd_v23=' + Date.now(), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;

        var tables = data.tables || data.floor_tables || [];
        if (!Array.isArray(tables)) return;

        var byId = new Map();
        tables.forEach(function (t) {
          var id = parseInt(t.table_id || t.id, 10);
          if (id) byId.set(id, t);
        });

        realNodes().forEach(function (node) {
          var id = parseInt(node.getAttribute('data-pmd-table'), 10);
          var t = byId.get(id);
          if (!t) return;

          var x = parseFloat(t.floor_x);
          var y = parseFloat(t.floor_y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;

          node.style.position = 'absolute';
          node.style.left = round2(clamp(x / 10, 0, 95)) + '%';
          node.style.top = round2(clamp(y / 10, 0, 95)) + '%';
          node.style.transform = 'none';
        });
      })
      .catch(function () {});
  }

  function startEditor() {
    var c = canvas();
    if (!c) {
      show('Floor canvas not found.');
      return;
    }

    clearOverlay();

    document.body.classList.remove('pmd-floor-editing-v6');
    document.body.classList.remove('pmd-floor-editing-v22');
    document.body.classList.add('pmd-floor-editing-v23');

    ensureToolbar();

    var cr = c.getBoundingClientRect();

    realNodes().forEach(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);
      if (!id) return;

      var widthPct = (r.width / cr.width) * 100;
      var heightPct = (r.height / cr.height) * 100;
      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;

      widthPct = clamp(widthPct, 3, 18);
      heightPct = clamp(heightPct, 3, 24);
      leftPct = clamp(leftPct, 0, Math.max(0, 100 - widthPct));
      topPct = clamp(topPct, 0, Math.max(0, 100 - heightPct));

      var clone = node.cloneNode(true);

      clone.classList.add('pmd-v23-edit-node');
      clone.classList.remove('pmd-v15-floor-node');
      clone.setAttribute('data-pmd-table', String(id));

      clone.style.position = 'absolute';
      clone.style.left = round2(leftPct) + '%';
      clone.style.top = round2(topPct) + '%';
      clone.style.width = round2(widthPct) + '%';
      clone.style.height = round2(heightPct) + '%';
      clone.style.transform = 'none';

      c.appendChild(clone);
    });

    state.active = true;
    show('Edit mode ready. Drag inside visible floor only.');
  }

  function stopEditor() {
    clearOverlay();
    document.body.classList.remove('pmd-floor-editing-v23');
    state.active = false;
    state.drag = null;
  }

  function rowsForSave() {
    var c = canvas();
    if (!c) throw new Error('Floor canvas not found.');

    var cr = c.getBoundingClientRect();

    var rows = editNodes().map(function (node) {
      var r = node.getBoundingClientRect();
      var id = parseInt(node.getAttribute('data-pmd-table'), 10);

      var leftPct = ((r.left - cr.left) / cr.width) * 100;
      var topPct = ((r.top - cr.top) / cr.height) * 100;

      return {
        id: id,
        floor_x: round2(clamp(leftPct, 0, 100) * 10),
        floor_y: round2(clamp(topPct, 0, 100) * 10)
      };
    }).filter(function (x) {
      return x.id > 0 && Number.isFinite(x.floor_x) && Number.isFinite(x.floor_y);
    });

    if (!rows.length) throw new Error('No valid table positions.');
    return rows;
  }

  function saveRows(rows) {
    var params = new URLSearchParams();
    params.set('pmd_floor_save_v19', '1');
    params.set('tables_b64', btoa(JSON.stringify(rows)));
    params.set('_', String(Date.now()));

    return fetch('/admin/pmd-owner-dashboard-clean-v1-data?' + params.toString(), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function (r) {
      return r.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) {}
        if (!r.ok || !json || !json.ok) {
          throw new Error('HTTP ' + r.status + ' ' + (json && json.message ? json.message : txt.slice(0, 180)));
        }
        return json;
      });
    });
  }

  function saveEditor() {
    var rows;

    try {
      rows = rowsForSave();
    } catch (err) {
      show('Save failed: ' + err.message);
      return;
    }

    console.table(rows);
    show('Saving layout...');

    saveRows(rows).then(function (json) {
      localStorage.setItem(STORAGE_KEY, '1');
      show('Saved successfully. Updated tables: ' + (json.updated || 0));
      stopEditor();
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function (err) {
      show('Save failed:\\n' + err.message);
      console.error('[PMD v23] save failed', err);
    });
  }

  window.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.pmd-v23-edit-float')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      startEditor();
      return;
    }

    if (e.target && e.target.closest && e.target.closest('.pmd-v23-save')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      saveEditor();
      return;
    }

    if (e.target && e.target.closest && e.target.closest('.pmd-v23-cancel')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      stopEditor();
      return;
    }
  }, true);

  window.addEventListener('pointerdown', function (e) {
    if (!state.active) return;

    var node = e.target && e.target.closest && e.target.closest('.pmd-v23-edit-node[data-pmd-table]');
    if (!node) return;

    var c = canvas();
    if (!c) return;

    var cr = c.getBoundingClientRect();
    var nr = node.getBoundingClientRect();

    state.drag = {
      node: node,
      canvas: c,
      pointerId: e.pointerId,
      offsetX: e.clientX - nr.left,
      offsetY: e.clientY - nr.top,
      widthPct: (nr.width / cr.width) * 100,
      heightPct: (nr.height / cr.height) * 100
    };

    node.classList.add('pmd-v23-dragging');

    try { node.setPointerCapture(e.pointerId); } catch (ignore) {}

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointermove', function (e) {
    if (!state.drag) return;

    var d = state.drag;
    var cr = d.canvas.getBoundingClientRect();

    var leftPx = e.clientX - cr.left - d.offsetX;
    var topPx = e.clientY - cr.top - d.offsetY;

    var leftPct = clamp((leftPx / cr.width) * 100, 0, Math.max(0, 100 - d.widthPct));
    var topPct = clamp((topPx / cr.height) * 100, 0, Math.max(0, 100 - d.heightPct));

    d.node.style.left = round2(leftPct) + '%';
    d.node.style.top = round2(topPct) + '%';
    d.node.style.transform = 'none';

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointerup', function (e) {
    if (!state.drag) return;

    state.drag.node.classList.remove('pmd-v23-dragging');
    try { state.drag.node.releasePointerCapture(state.drag.pointerId); } catch (ignore) {}
    state.drag = null;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointercancel', function () {
    if (!state.drag) return;
    state.drag.node.classList.remove('pmd-v23-dragging');
    state.drag = null;
  }, true);

  ensureButton();
  ensureToolbar();

  setTimeout(ensureButton, 500);
  setTimeout(ensureButton, 1500);
  setTimeout(ensureButton, 3000);

  setTimeout(applyCanonicalRender, 450);
  setTimeout(applyCanonicalRender, 1200);
  setTimeout(applyCanonicalRender, 2600);
  setTimeout(applyCanonicalRender, 4500);

  window.PMDFloorV23ResetCanonical = function () {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };

  console.info('[PMD] Floor canonical overlay editor v23 active');
})();
 /* PMD_FLOOR_CANONICAL_OVERLAY_V23_END */

