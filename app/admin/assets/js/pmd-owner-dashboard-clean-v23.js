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


/* PMD_SHARED_ROLE_FLOOR_V32_START */
(function () {
  'use strict';

  if (window.PMD_SHARED_ROLE_FLOOR_V32) return;
  window.PMD_SHARED_ROLE_FLOOR_V32 = true;

  if (!/\/admin\/dashboard\/?$|\/admin\/?$/.test(location.pathname || '')) return;

  var ENDPOINT = '/admin/pmd-owner-dashboard-floor-layout';
  var state = {
    card: null,
    root: null,
    surface: null,
    drawer: null,
    tables: [],
    editing: false,
    expanded: false,
    drag: null,
    role: 'owner'
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function round(n) { return Math.round(Number(n)); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
  }

  function activeRole() {
    var q = new URLSearchParams(location.search || '');
    var fromQuery = q.get('role');
    if (fromQuery) return fromQuery.toLowerCase();

    var btn = $('#pmd-v31-role-rail .pmd-v31-role-btn.is-active, #pmd-v31-role-rail .pmd-v31-role-btn.active');
    if (btn) {
      var data = (btn.getAttribute('data-pmd-v28-role') || btn.getAttribute('data-role') || '').toLowerCase();
      if (data) return data;

      var txt = (btn.textContent || '').trim().toLowerCase();
      if (txt === 'o') return 'owner';
      if (txt === 'm') return 'manager';
      if (txt === 'w') return 'waiter';
      if (txt === 'c') return 'cashier';
      if (txt === 'k') return 'kds';
      if (txt.indexOf('☎') !== -1 || txt.indexOf('phone') !== -1) return 'reception';
    }

    return 'owner';
  }

  function shouldShowFloor(role) {
    return !/kds|kitchen/.test(role || '');
  }

  function isBigRole(role) {
    return /waiter|reception|counter|cashier|manager/.test(role || '');
  }

  function roleLabel(role) {
    if (/waiter/.test(role)) return 'Waiter Floor';
    if (/reception|counter/.test(role)) return 'Reception Floor';
    if (/cashier/.test(role)) return 'Cashier Floor';
    if (/manager/.test(role)) return 'Manager Floor';
    return 'Live Restaurant Floor';
  }

  function toast(msg) {
    var el = $('.pmd-shared-role-floor-v32-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-shared-role-floor-v32-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 4200);
    console.log('[PMD floor v32]', msg);
  }

  function dashboardRoot() {
    return $('#pmd-owner-dashboard-clean-v1-root') ||
      $('.pmd-v31-clean-main') ||
      $('.page-content') ||
      document.body;
  }

  function findExistingFloorCard() {
    var canvas = $('.pmd-v15-floor-canvas');
    if (canvas) {
      return canvas.closest('.pmd-v15-card, .pmd-v15-panel, .card, section, article') || canvas.parentElement;
    }

    var own = $('.pmd-shared-role-floor-v32-card');
    if (own) return own;

    var cards = $$('.pmd-v15-card, .card, section, article, div');
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      if (el.classList && el.classList.contains('pmd-shared-role-floor-v32-card')) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width < 250 || rect.height < 60) continue;
      var txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/Live Restaurant Floor|Waiter Floor|Reception Floor|Floor/i.test(txt) && /table|floor/i.test(txt)) {
        return el.closest('.pmd-v15-card, .card, section, article') || el;
      }
    }

    return null;
  }

  function createCard() {
    var root = dashboardRoot();
    var card = $('.pmd-shared-role-floor-v32-card', root);

    if (!card) {
      card = document.createElement('section');
      card.className = 'pmd-v15-card pmd-shared-role-floor-v32-card';
      card.style.gridColumn = '1 / -1';

      var kpi =
        $('.pmd-v15-kpi-grid', root) ||
        $('.pmd-v31-kpi-grid', root) ||
        $('.pmd-kpi-grid', root) ||
        root.firstElementChild;

      if (kpi && kpi.parentElement) {
        kpi.parentElement.insertBefore(card, kpi.nextSibling);
      } else {
        root.insertBefore(card, root.firstChild);
      }
    }

    return card;
  }

  function hideOldFloor(card) {
    if (!card) return;

    $$('.pmd-v15-floor-canvas,.pmd-v15-floor-tabs,.pmd-v15-floor-legend,.pmd-v15-floor-node,.pmd-shared-floor-v5-row', card)
      .forEach(function (el) {
        if (!el.closest('.pmd-shared-role-floor-v32')) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
        }
      });
  }

  function ensure() {
    var role = activeRole();

    if (role !== state.role) {
      state.expanded = false;
      state.editing = false;
      state.drag = null;
    }

    state.role = role;

    if (!shouldShowFloor(role)) {
      var existing = $('.pmd-shared-role-floor-v32-card');
      if (existing) existing.style.display = 'none';
      document.body.classList.remove('pmd-shared-role-floor-v32-editing');
      return false;
    }

    var card = findExistingFloorCard() || createCard();
    if (!card) return false;

    card.classList.add('pmd-shared-role-floor-v32-card');
    card.style.display = '';

    hideOldFloor(card);

    var root = $('.pmd-shared-role-floor-v32', card);
    if (!root) {
      var body = $('.pmd-v15-card-body', card) || card;
      root = document.createElement('div');
      root.className = 'pmd-shared-role-floor-v32';
      root.innerHTML =
        '<div class="pmd-shared-role-floor-v32__head">' +
          '<div class="pmd-shared-role-floor-v32__title">' +
            '<strong data-pmd-v32-floor-title>Live Restaurant Floor</strong>' +
            '<small>Editable table positions inside the visible floor</small>' +
          '</div>' +
          '<div class="pmd-shared-role-floor-v32__actions">' +
            '<button type="button" data-pmd-v32-floor-edit class="pmd-v32-primary">Edit Floor</button>' +
            '<button type="button" data-pmd-v32-floor-save class="pmd-v32-primary" hidden>Save layout</button>' +
            '<button type="button" data-pmd-v32-floor-cancel class="pmd-v32-dark" hidden>Cancel</button>' +
            '<button type="button" data-pmd-v32-floor-refresh>Refresh</button>' +
            '<a href="/admin/tables">Manage Tables</a>' +
          '</div>' +
        '</div>' +
        '<p class="pmd-shared-role-floor-v32__status" data-pmd-v32-floor-status>Loading floor…</p>' +
        '<div class="pmd-shared-role-floor-v32__surface" data-pmd-v32-floor-surface></div>' +
        '<aside class="pmd-shared-role-floor-v32__drawer" data-pmd-v32-floor-drawer hidden></aside>';

      body.appendChild(root);
    }

    root.classList.toggle('is-big', isBigRole(role));
    root.classList.toggle('is-expanded', !isBigRole(role) && !!state.expanded);
    root.classList.toggle('is-owner', role === 'owner');

    var title = $('[data-pmd-v32-floor-title]', root);
    if (title) title.textContent = roleLabel(role);

    state.card = card;
    state.root = root;
    state.surface = $('[data-pmd-v32-floor-surface]', root);
    state.drawer = $('[data-pmd-v32-floor-drawer]', root);

    return true;
  }

  function setStatus(msg) {
    var n = state.root && $('[data-pmd-v32-floor-status]', state.root);
    if (n) n.textContent = msg;
  }

  function normalize(t, i) {
    var id = parseInt(t.id || t.table_id, 10);
    var no = t.table_no || t.table_number || t.number || id;

    var w = parseFloat(t.floor_width || t.width || 92);
    var h = parseFloat(t.floor_height || t.height || 92);
    var x = parseFloat(t.floor_x);
    var y = parseFloat(t.floor_y);

    if (!Number.isFinite(w)) w = 92;
    if (!Number.isFinite(h)) h = 92;
    if (!Number.isFinite(x)) x = 32 + ((i % 4) * 130);
    if (!Number.isFinite(y)) y = 34 + (Math.floor(i / 4) * 120);

    return {
      id: id,
      table_no: String(no),
      floor_x: x,
      floor_y: y,
      floor_width: clamp(w, 64, 180),
      floor_height: clamp(h, 58, 160),
      status: t.status || (Number(t.open_orders || 0) > 0 ? 'active' : 'free'),
      open_orders: Number(t.open_orders || 0),
      open_check_value: t.open_check_value || 0,
      due_label: t.due_label || ''
    };
  }

  function fetchTables() {
    return fetch(ENDPOINT + '?ts=' + Date.now(), {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) throw new Error('HTTP ' + r.status + ' ' + txt.slice(0, 140));
          return (json.tables || []).map(normalize).filter(function (t) { return t.id > 0; });
        });
      });
  }

  function render() {
    if (!ensure() || !state.surface) return;

    var sw = state.surface.clientWidth || state.surface.getBoundingClientRect().width || 900;
    var sh = state.surface.clientHeight || state.surface.getBoundingClientRect().height || 390;

    state.surface.innerHTML = '';

    state.tables.forEach(function (t) {
      t.floor_x = clamp(Number(t.floor_x) || 0, 0, Math.max(0, sw - t.floor_width));
      t.floor_y = clamp(Number(t.floor_y) || 0, 0, Math.max(0, sh - t.floor_height));

      var node = document.createElement('button');
      node.type = 'button';
      node.className = 'pmd-shared-role-floor-v32__table ' + (t.status === 'free' ? 'is-free' : 'is-active');
      node.setAttribute('data-pmd-v32-floor-table', String(t.id));
      node.style.left = round(t.floor_x) + 'px';
      node.style.top = round(t.floor_y) + 'px';
      node.style.width = round(t.floor_width) + 'px';
      node.style.height = round(t.floor_height) + 'px';
      node.innerHTML = '<div><strong>T' + esc(t.table_no) + '</strong><small>' + esc(t.status || 'free') + '</small></div>';
      state.surface.appendChild(node);
    });

    if (!isBigRole(state.role)) {
      var exp = document.createElement('button');
      exp.type = 'button';
      exp.className = 'pmd-shared-role-floor-v32__expand';
      exp.setAttribute('data-pmd-v32-floor-expand', '1');
      exp.title = state.expanded ? 'Collapse floor' : 'Expand floor';
      exp.textContent = state.expanded ? '↙' : '↗';
      state.surface.appendChild(exp);
    }

    document.body.classList.toggle('pmd-shared-role-floor-v32-editing', !!state.editing);
    $('[data-pmd-v32-floor-edit]', state.root).hidden = state.editing;
    $('[data-pmd-v32-floor-save]', state.root).hidden = !state.editing;
    $('[data-pmd-v32-floor-cancel]', state.root).hidden = !state.editing;

    setStatus(state.tables.length + ' visible table(s) · ' + (state.editing ? 'edit mode' : 'normal mode') + ' · ' + roleLabel(state.role) + (state.expanded ? ' · expanded' : ''));
  }

  function load() {
    if (!ensure()) return;
    setStatus('Loading floor…');

    return fetchTables()
      .then(function (tables) {
        state.tables = tables;
        state.editing = false;
        state.drag = null;
        render();
      })
      .catch(function (err) {
        console.error('[PMD floor v32] load failed', err);
        setStatus('Floor failed: ' + err.message);
      });
  }

  function saveRows(rows) {
    function postSave() {
      return fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') || {}).content || ''
        },
        body: JSON.stringify({ tables: rows })
      });
    }

    function getSave() {
      var p = new URLSearchParams();
      p.set('tables_b64', btoa(JSON.stringify(rows)));
      p.set('_', Date.now());
      return fetch(ENDPOINT + '?' + p.toString(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });
    }

    return postSave()
      .then(function (r) {
        if (r.ok) return r;
        return getSave();
      })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          if (!r.ok || !json || !json.ok) throw new Error('HTTP ' + r.status + ' ' + txt.slice(0, 140));
          return json;
        });
      });
  }

  function save() {
    if (!state.surface) return;

    var rows = state.tables.map(function (t) {
      return {
        id: t.id,
        floor_x: round(t.floor_x),
        floor_y: round(t.floor_y),
        floor_width: round(t.floor_width),
        floor_height: round(t.floor_height)
      };
    });

    setStatus('Saving layout…');

    saveRows(rows)
      .then(function (json) {
        toast('Saved successfully. Updated tables: ' + (json.updated || 0));
        state.editing = false;
        state.drag = null;
        return load();
      })
      .catch(function (err) {
        console.error('[PMD floor v32] save failed', err);
        setStatus('Save failed: ' + err.message);
      });
  }

  function tableById(id) {
    return state.tables.filter(function (t) { return String(t.id) === String(id); })[0];
  }

  function openDrawer(t) {
    if (!state.drawer || !t) return;

    state.drawer.hidden = false;
    state.drawer.innerHTML =
      '<button type="button" data-pmd-v32-floor-drawer-close>×</button>' +
      '<h3>Table ' + esc(t.table_no) + '</h3>' +
      '<p>Status: <b>' + esc(t.status || 'free') + '</b></p>' +
      '<p>Open orders: ' + esc(t.open_orders || 0) + '</p>' +
      '<p>Open check value: ' + esc(t.due_label || t.open_check_value || '—') + '</p>' +
      '<div class="pmd-v32-drawer-actions">' +
        '<a href="/admin/orders/create?table_id=' + esc(t.id) + '">Create / New Order</a>' +
        '<a href="/admin/tables/edit/' + esc(t.id) + '">View / Edit Table</a>' +
        '<a href="/admin/tables">Open Tables page</a>' +
      '</div>';
  }

  document.addEventListener('click', function (e) {
    var roleBtn = e.target.closest('#pmd-v31-role-rail .pmd-v31-role-btn');
    if (roleBtn) {
      setTimeout(load, 350);
      setTimeout(load, 1200);
      setTimeout(load, 2400);
      return;
    }

    if (!ensure()) return;

    if (e.target.closest('[data-pmd-v32-floor-expand]')) {
      e.preventDefault();
      state.expanded = !state.expanded;
      render();
      setTimeout(render, 460);
      return;
    }

    if (e.target.closest('[data-pmd-v32-floor-edit]')) {
      e.preventDefault();
      state.editing = true;
      render();
      toast('Edit mode ready.');
      return;
    }

    if (e.target.closest('[data-pmd-v32-floor-cancel]')) {
      e.preventDefault();
      load();
      return;
    }

    if (e.target.closest('[data-pmd-v32-floor-save]')) {
      e.preventDefault();
      save();
      return;
    }

    if (e.target.closest('[data-pmd-v32-floor-refresh]')) {
      e.preventDefault();
      load();
      return;
    }

    if (e.target.closest('[data-pmd-v32-floor-drawer-close]')) {
      e.preventDefault();
      if (state.drawer) state.drawer.hidden = true;
      return;
    }

    var node = e.target.closest('[data-pmd-v32-floor-table]');
    if (node && !state.editing && !state.drag) {
      e.preventDefault();
      openDrawer(tableById(node.getAttribute('data-pmd-v32-floor-table')));
    }
  }, true);

  document.addEventListener('pointerdown', function (e) {
    if (!state.editing || !state.surface) return;

    var node = e.target.closest('[data-pmd-v32-floor-table]');
    if (!node) return;

    var id = node.getAttribute('data-pmd-v32-floor-table');
    var t = tableById(id);
    if (!t) return;

    var nr = node.getBoundingClientRect();

    state.drag = {
      id: id,
      node: node,
      pointerId: e.pointerId,
      grabX: e.clientX - nr.left,
      grabY: e.clientY - nr.top,
      w: nr.width,
      h: nr.height
    };

    node.classList.add('is-dragging');
    try { node.setPointerCapture(e.pointerId); } catch (ignore) {}

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  document.addEventListener('pointermove', function (e) {
    if (!state.drag || !state.surface) return;

    var d = state.drag;
    var t = tableById(d.id);
    if (!t) return;

    var sr = state.surface.getBoundingClientRect();

    var x = e.clientX - sr.left - d.grabX;
    var y = e.clientY - sr.top - d.grabY;

    x = clamp(x, 0, Math.max(0, sr.width - d.w));
    y = clamp(y, 0, Math.max(0, sr.height - d.h));

    t.floor_x = round(x);
    t.floor_y = round(y);

    d.node.style.left = t.floor_x + 'px';
    d.node.style.top = t.floor_y + 'px';

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  document.addEventListener('pointerup', function (e) {
    if (!state.drag) return;

    state.drag.node.classList.remove('is-dragging');
    try { state.drag.node.releasePointerCapture(state.drag.pointerId); } catch (ignore) {}
    state.drag = null;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  window.PMDSharedRoleFloorV32 = {
    load: load,
    debug: function () {
      return {
        active: true,
        role: activeRole(),
        expanded: state.expanded,
        root: !!state.root,
        surface: !!state.surface,
        isBig: !!(state.root && state.root.classList.contains('is-big')),
        isExpanded: !!(state.root && state.root.classList.contains('is-expanded')),
        tables: state.tables,
        tableNodes: $$('[data-pmd-v32-floor-table]').length,
        oldV31: !!window.PMD_SHARED_ROLE_FLOOR_V31,
        oldV30: !!window.PMD_OWNER_FLOOR_CLEAN_V30,
        roleRailButtons: $$('#pmd-v31-role-rail .pmd-v31-role-btn').length,
        bodyOverflowX: getComputedStyle(document.body).overflowX
      };
    }
  };

  [500, 1400, 2800, 5200].forEach(function (ms) {
    setTimeout(load, ms);
  });

  console.info('[PMD] Shared role floor v32 active');
})();
 /* PMD_SHARED_ROLE_FLOOR_V32_END */


/* PMD_FLOOR_V33_OWNER_EXPAND_FIT_POLISH_START */
(function () {
  'use strict';

  if (window.PMD_FLOOR_V33_OWNER_EXPAND_FIT_POLISH) return;
  window.PMD_FLOOR_V33_OWNER_EXPAND_FIT_POLISH = true;

  if (!/\/admin\/dashboard\/?$|\/admin\/?$/.test(location.pathname || '')) return;

  function $(s, r) {
    return (r || document).querySelector(s);
  }

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function fitDashboardWidth() {
    var root = $('#pmd-owner-dashboard-clean-v1-root');
    if (!root) return;

    var rr =
      $('#pmd-v31-role-rail') ||
      $('.pmd-role-rail-v30') ||
      $('[class*="role-rail"]');

    var rootRect = root.getBoundingClientRect();
    var left = Math.max(0, Math.round(rootRect.left || 0));

    var rightReserve = 86;
    if (rr) {
      var r = rr.getBoundingClientRect();
      if (r.width > 0) {
        rightReserve = Math.max(78, Math.round(window.innerWidth - r.left + 18));
      }
    }

    var safe = Math.max(720, Math.round(window.innerWidth - left - rightReserve));

    document.documentElement.style.setProperty('--pmd-v33-dashboard-safe-width', safe + 'px');

    root.style.width = safe + 'px';
    root.style.maxWidth = safe + 'px';
    root.style.minWidth = '0';
    root.style.overflowX = 'clip';

    $$('.pmd-shared-role-floor-v32-card, .pmd-shared-role-floor-v32, .pmd-shared-role-floor-v32__surface').forEach(function (el) {
      el.style.maxWidth = '100%';
      el.style.minWidth = '0';
      el.style.overflowX = 'hidden';
    });
  }

  function pinExpandButton() {
    var exp = $('.pmd-shared-role-floor-v32__expand');
    var surface = $('.pmd-shared-role-floor-v32__surface');

    if (!exp || !surface) return;

    surface.style.position = 'relative';
    surface.style.overflow = 'hidden';

    exp.style.position = 'absolute';
    exp.style.left = 'auto';
    exp.style.top = 'auto';
    exp.style.right = '16px';
    exp.style.bottom = '16px';
    exp.style.transform = 'none';
    exp.style.zIndex = '120';
  }

  function polish() {
    fitDashboardWidth();
    pinExpandButton();
  }

  document.addEventListener('click', function (e) {
    if (
      e.target.closest('[data-pmd-v32-floor-expand]') ||
      e.target.closest('#pmd-v31-role-rail .pmd-v31-role-btn') ||
      e.target.closest('[data-pmd-v32-floor-refresh]') ||
      e.target.closest('[data-pmd-v32-floor-edit]') ||
      e.target.closest('[data-pmd-v32-floor-save]') ||
      e.target.closest('[data-pmd-v32-floor-cancel]')
    ) {
      setTimeout(polish, 60);
      setTimeout(polish, 450);
      setTimeout(polish, 900);
    }
  }, true);

  window.addEventListener('resize', function () {
    setTimeout(polish, 80);
    setTimeout(polish, 420);
  });

  window.PMDFloorV33Polish = {
    run: polish,
    debug: function () {
      var root = $('#pmd-owner-dashboard-clean-v1-root');
      var exp = $('.pmd-shared-role-floor-v32__expand');
      var surface = $('.pmd-shared-role-floor-v32__surface');
      var html = document.documentElement;

      return {
        active: true,
        v32: !!window.PMD_SHARED_ROLE_FLOOR_V32,
        root: !!root,
        rootRect: root ? root.getBoundingClientRect().toJSON() : null,
        safeWidth: getComputedStyle(html).getPropertyValue('--pmd-v33-dashboard-safe-width').trim(),
        docOverflowPx: Math.max(0, html.scrollWidth - window.innerWidth),
        expandExists: !!exp,
        expandRect: exp ? exp.getBoundingClientRect().toJSON() : null,
        surfaceRect: surface ? surface.getBoundingClientRect().toJSON() : null,
        bodyOverflowX: getComputedStyle(document.body).overflowX
      };
    }
  };

  [120, 500, 1200, 2400, 5200].forEach(function (ms) {
    setTimeout(polish, ms);
  });

  console.info('[PMD] Floor v33 owner expand + dashboard fit polish active');
})();
 /* PMD_FLOOR_V33_OWNER_EXPAND_FIT_POLISH_END */
/* PMD_FLOOR_CLEAN_CARD_V35_START */
(function () {
  'use strict';

  if (window.PMD_FLOOR_CLEAN_CARD_V35) return;
  window.PMD_FLOOR_CLEAN_CARD_V35 = true;

  if (!/\/admin\/dashboard\/?$|\/admin\/?$/.test(location.pathname || '')) return;

  function $(s, r) {
    return (r || document).querySelector(s);
  }

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function cleanTableNumbers() {
    $$('[data-pmd-v32-floor-table] strong, .pmd-shared-role-floor-v32__table strong').forEach(function (el) {
      var txt = (el.textContent || '').trim();
      var m = txt.match(/^T\s*(\d+)$/i) || txt.match(/^Table\s*(\d+)$/i);
      if (m) el.textContent = m[1];
    });
  }

  function markHostCard() {
    var floor = $('.pmd-shared-role-floor-v32');
    if (!floor) return;

    var host =
      floor.closest('.pmd-v15-card') ||
      floor.closest('.card') ||
      floor.parentElement;

    if (!host) return;

    host.classList.add('pmd-v35-floor-host-card');

    /* Keep only our new floor actions, hide old duplicated outer buttons */
    $$('header button, header a, .pmd-v15-card-head button, .pmd-v15-card-head a', host).forEach(function (el) {
      var txt = (el.textContent || '').trim().toLowerCase();
      if (txt === 'refresh' || txt === 'new order') {
        el.setAttribute('aria-hidden', 'true');
        el.style.display = 'none';
      }
    });
  }

  function run() {
    markHostCard();
    cleanTableNumbers();
  }

  document.addEventListener('click', function (e) {
    if (
      e.target.closest('[data-pmd-v32-floor-expand]') ||
      e.target.closest('[data-pmd-v32-floor-refresh]') ||
      e.target.closest('[data-pmd-v32-floor-edit]') ||
      e.target.closest('[data-pmd-v32-floor-save]') ||
      e.target.closest('[data-pmd-v32-floor-cancel]') ||
      e.target.closest('#pmd-v31-role-rail .pmd-v31-role-btn')
    ) {
      setTimeout(run, 80);
      setTimeout(run, 450);
      setTimeout(run, 1100);
    }
  }, true);

  window.PMDFloorV35CleanCard = {
    run: run,
    debug: function () {
      var floor = $('.pmd-shared-role-floor-v32');
      var host = floor ? floor.closest('.pmd-v35-floor-host-card') : null;

      return {
        active: true,
        v32: !!window.PMD_SHARED_ROLE_FLOOR_V32,
        v34: !!window.PMD_OWNER_FLOOR_MINI_OVERVIEW_V34,
        floor: !!floor,
        hostCleaned: !!host,
        visibleOldRefreshNewOrder: $$('button,a').filter(function (el) {
          var txt = (el.textContent || '').trim().toLowerCase();
          if (txt !== 'refresh' && txt !== 'new order') return false;
          var r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && !el.closest('.pmd-shared-role-floor-v32');
        }).map(function (el) { return el.textContent.trim(); }),
        tableLabels: $$('[data-pmd-v32-floor-table] strong, .pmd-shared-role-floor-v32__table strong').map(function (el) {
          return el.textContent.trim();
        })
      };
    }
  };

  [120, 500, 1300, 2600, 5200].forEach(function (ms) {
    setTimeout(run, ms);
  });

  console.info('[PMD] Floor clean card v35 active');
})();
 /* PMD_FLOOR_CLEAN_CARD_V35_END */


/* PMD_DASHBOARD_CARD_GRID_RULES_V36_START */
(function () {
  'use strict';

  if (window.PMD_DASHBOARD_CARD_GRID_RULES_V36) return;
  window.PMD_DASHBOARD_CARD_GRID_RULES_V36 = true;

  if (!/\/admin\/dashboard\/?$|\/admin\/?$/.test(location.pathname || '')) return;

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function titleOf(card) {
    var h = card.querySelector('h1,h2,h3,h4,.pmd-v15-card-title,.pmd-v15-card-head strong,strong');
    return textOf(h || card).toLowerCase();
  }

  function directCardChildren(parent) {
    return Array.prototype.slice.call(parent.children || []).filter(function (el) {
      return (
        el.classList.contains('pmd-v15-card') ||
        el.classList.contains('pmd-shared-role-floor-v32-card') ||
        el.classList.contains('pmd-shared-role-floor-v31-card') ||
        el.querySelector('.pmd-shared-role-floor-v32')
      );
    });
  }

  function directKpiChildren(parent) {
    return Array.prototype.slice.call(parent.children || []).filter(function (el) {
      return el.classList && el.classList.contains('pmd-v15-kpi');
    });
  }

  function classifyCard(card) {
    var t = titleOf(card);
    card.setAttribute('data-pmd-v36-card', '1');

    card.classList.remove('pmd-v36-span-1', 'pmd-v36-span-2', 'pmd-v36-span-3', 'pmd-v36-span-4', 'pmd-v36-floor-card');

    if (
      card.classList.contains('pmd-shared-role-floor-v32-card') ||
      card.querySelector('.pmd-shared-role-floor-v32') ||
      t.indexOf('live restaurant floor') !== -1
    ) {
      card.classList.add('pmd-v36-span-2', 'pmd-v36-floor-card');
      return;
    }

    if (
      t.indexOf('ai alerts') !== -1 ||
      t.indexOf('live timeline') !== -1 ||
      t.indexOf('recent activity') !== -1
    ) {
      card.classList.add('pmd-v36-span-2');
      return;
    }

    card.classList.add('pmd-v36-span-1');
  }

  function markGrids() {
    $$('.pmd-v15-kpi').forEach(function (kpi) {
      var parent = kpi.parentElement;
      if (!parent) return;
      var kpies = directKpiChildren(parent);
      if (kpies.length >= 2) {
        parent.classList.add('pmd-v36-kpi-grid');
      }
    });

    $$('.pmd-v15-card, .pmd-shared-role-floor-v32-card').forEach(function (card) {
      classifyCard(card);

      var parent = card.parentElement;
      if (!parent) return;

      var cards = directCardChildren(parent);
      var childCount = (parent.children || []).length || 0;

      if (cards.length >= 2 && cards.length >= Math.ceil(childCount * 0.55)) {
        parent.classList.add('pmd-v36-card-grid');
      }
    });
  }

  function run() {
    markGrids();
  }

  document.addEventListener('click', function (e) {
    if (
      e.target.closest('#pmd-v31-role-rail .pmd-v31-role-btn') ||
      e.target.closest('[data-pmd-v32-floor-expand]') ||
      e.target.closest('[data-pmd-v32-floor-refresh]') ||
      e.target.closest('[data-pmd-v32-floor-edit]') ||
      e.target.closest('[data-pmd-v32-floor-save]') ||
      e.target.closest('[data-pmd-v32-floor-cancel]')
    ) {
      setTimeout(run, 80);
      setTimeout(run, 500);
      setTimeout(run, 1200);
    }
  }, true);

  window.PMDDashboardGridV36 = {
    run: run,
    debug: function () {
      var grids = $$('.pmd-v36-card-grid').map(function (g, i) {
        var r = g.getBoundingClientRect();
        return {
          index: i,
          children: g.children.length,
          cards: directCardChildren(g).length,
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          gap: getComputedStyle(g).gap,
          cols: getComputedStyle(g).gridTemplateColumns
        };
      });

      var kpis = $$('.pmd-v15-kpi').map(function (c) {
        var r = c.getBoundingClientRect();
        return {
          title: textOf(c.querySelector('span') || c).slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      });

      var cards = $$('.pmd-v15-card, .pmd-shared-role-floor-v32-card').map(function (c) {
        var r = c.getBoundingClientRect();
        return {
          title: titleOf(c).slice(0, 48),
          span2: c.classList.contains('pmd-v36-span-2'),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      });

      var overflow = document.documentElement.scrollWidth - window.innerWidth;

      console.table(grids);
      console.table(kpis);
      console.table(cards);

      return {
        active: true,
        v32: !!window.PMD_SHARED_ROLE_FLOOR_V32,
        v34: !!window.PMD_OWNER_FLOOR_MINI_OVERVIEW_V34,
        v35: !!window.PMD_FLOOR_CLEAN_CARD_V35,
        gridCount: grids.length,
        kpiGridCount: $$('.pmd-v36-kpi-grid').length,
        overflowX: overflow,
        grids: grids,
        kpis: kpis,
        cards: cards
      };
    }
  };

  [120, 500, 1300, 2600, 5200].forEach(function (ms) {
    setTimeout(run, ms);
  });

  console.info('[PMD] Dashboard card grid rules v36 active');
})();
 /* PMD_DASHBOARD_CARD_GRID_RULES_V36_END */


/* PMD_OWNER_FLOOR_FULLWIDTH_SHORT_V37_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_FLOOR_FULLWIDTH_SHORT_V37) return;
  window.PMD_OWNER_FLOOR_FULLWIDTH_SHORT_V37 = true;

  if (!/\/admin\/dashboard\/?$|\/admin\/?$/.test(location.pathname || '')) return;

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function markOwnerFloor() {
    $$('.pmd-shared-role-floor-v32.is-owner').forEach(function (floor) {
      var card =
        floor.closest('.pmd-shared-role-floor-v32-card') ||
        floor.closest('.pmd-v15-card') ||
        floor.parentElement;

      if (!card) return;

      card.classList.add('pmd-v37-owner-floor-card');
      card.classList.remove('pmd-v36-span-2');
      card.classList.add('pmd-v36-span-4');

      var surface = floor.querySelector('.pmd-shared-role-floor-v32__surface');
      if (surface) {
        surface.setAttribute('data-pmd-v37-owner-floor-surface', '1');
      }

      var expand =
        floor.querySelector('[data-pmd-v32-floor-expand]') ||
        floor.querySelector('[data-pmd-floor-expand]') ||
        floor.querySelector('.pmd-shared-role-floor-v32__expand');

      if (expand) {
        expand.setAttribute('title', floor.classList.contains('is-expanded') || floor.classList.contains('is-big') ? 'Shrink floor' : 'Expand floor');
      }
    });
  }

  function run() {
    markOwnerFloor();
  }

  document.addEventListener('click', function (e) {
    if (
      e.target.closest('[data-pmd-v32-floor-expand]') ||
      e.target.closest('[data-pmd-floor-expand]') ||
      e.target.closest('#pmd-v31-role-rail .pmd-v31-role-btn')
    ) {
      setTimeout(run, 50);
      setTimeout(run, 350);
      setTimeout(run, 900);
    }
  }, true);

  window.PMDOwnerFloorV37 = {
    run: run,
    debug: function () {
      run();

      var floor = document.querySelector('.pmd-shared-role-floor-v32.is-owner');
      var card = document.querySelector('.pmd-v37-owner-floor-card');
      var surface = document.querySelector('[data-pmd-v37-owner-floor-surface]');
      var root = document.querySelector('#pmd-owner-dashboard-clean-v1-root');

      function rect(el) {
        if (!el) return null;
        var r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      }

      return {
        active: true,
        v32: !!window.PMD_SHARED_ROLE_FLOOR_V32,
        v34: !!window.PMD_OWNER_FLOOR_MINI_OVERVIEW_V34,
        v36: !!window.PMD_DASHBOARD_CARD_GRID_RULES_V36,
        ownerFloor: !!floor,
        ownerCard: !!card,
        expanded: !!(floor && (floor.classList.contains('is-expanded') || floor.classList.contains('is-big'))),
        cardRect: rect(card),
        surfaceRect: rect(surface),
        rootRect: rect(root),
        overflowX: document.documentElement.scrollWidth - window.innerWidth
      };
    }
  };

  [100, 400, 1000, 2200, 4500].forEach(function (ms) {
    setTimeout(run, ms);
  });

  console.info('[PMD] Owner floor full-width short v37 active');
})();
 /* PMD_OWNER_FLOOR_FULLWIDTH_SHORT_V37_END */


/* PMD_OWNER_FLOOR_V60_VISIBLE_PLACEMENT_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_FLOOR_V60_VISIBLE_PLACEMENT) return;
  window.PMD_OWNER_FLOOR_V60_VISIBLE_PLACEMENT = true;

  var ENDPOINT = '/admin/pmd-owner-dashboard-floor-layout';

  var state = {
    expanded: false,
    editing: false,
    saving: false,
    loading: true,
    tables: [],
    drag: null,
    mounted: false,
    booting: false,
    observer: null,
    insertionMode: null
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function cleanText(el) { return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim(); }

  function oldFloor() {
    return $('.pmd-shared-role-floor-v32.is-owner') || $('.pmd-shared-role-floor-v32');
  }

  function root() {
    return $('.pmd-owner-floor-v60');
  }

  function surface() {
    return $('.pmd-owner-floor-v60__surface', root() || document);
  }

  function csrfToken() {
    return (
      $('meta[name="csrf-token"]')?.getAttribute('content') ||
      $('input[name="_token"]')?.value ||
      window.csrfToken ||
      window.CSRF_TOKEN ||
      ''
    );
  }

  function status(msg) {
    var el = $('.pmd-owner-floor-v60__status');
    if (el) el.textContent = msg || '';
  }

  function findAiAlertsCard() {
    var title = $$('h1,h2,h3,h4,strong,span,div').find(function (el) {
      return cleanText(el) === 'AI Alerts';
    });

    if (!title) return null;

    var el = title;
    for (var i = 0; i < 8 && el && el !== document.body; i++, el = el.parentElement) {
      var r = el.getBoundingClientRect();
      var t = cleanText(el);
      if (r.width > 300 && r.height > 120 && t.indexOf('Open check value') >= 0) {
        return el;
      }
    }

    return title.closest('section, article, .card, div');
  }

  function findOldContainer() {
    var old = oldFloor();
    if (!old) return null;

    var best = old;
    var cur = old;

    for (var i = 0; i < 7 && cur && cur !== document.body; i++, cur = cur.parentElement) {
      var t = cleanText(cur);

      if (
        t.indexOf('Restaurant Floor') >= 0 &&
        t.indexOf('AI Alerts') < 0 &&
        t.indexOf('Live Timeline') < 0 &&
        t.indexOf('Revenue Today') < 0
      ) {
        best = cur;
      }
    }

    return best;
  }

  function insertionTarget() {
    var oldContainer = findOldContainer();

    if (oldContainer && oldContainer.parentNode) {
      return {
        mode: 'before-old-container',
        parent: oldContainer.parentNode,
        before: oldContainer,
        oldContainer: oldContainer
      };
    }

    var ai = findAiAlertsCard();
    if (ai && ai.parentNode) {
      return {
        mode: 'before-ai-alerts',
        parent: ai.parentNode,
        before: ai,
        oldContainer: null
      };
    }

    var main =
      $('.pmd-v36-card-grid') ||
      $('.pmd-owner-dashboard-clean-v1-active main') ||
      $('.pmd-owner-dashboard-clean-v1-active .content') ||
      $('main') ||
      $('.content') ||
      document.body;

    return {
      mode: 'append-main',
      parent: main,
      before: null,
      oldContainer: null
    };
  }

  function setMode() {
    var r = root();
    if (!r) return;

    r.classList.toggle('is-loading', state.loading);
    r.classList.toggle('is-expanded', state.expanded && !state.loading);
    r.classList.toggle('is-compact', !state.expanded && !state.loading);
    r.classList.toggle('is-editing', state.editing && !state.loading);

    $('.pmd-owner-floor-v60__toggle', r).textContent = state.expanded ? '↙' : '↗';
    $('.pmd-owner-floor-v60__edit', r).style.display = state.editing || state.loading ? 'none' : '';
    $('.pmd-owner-floor-v60__save', r).style.display = state.editing && !state.loading ? '' : 'none';
    $('.pmd-owner-floor-v60__cancel', r).style.display = state.editing && !state.loading ? '' : 'none';
    $('.pmd-owner-floor-v60__toggle', r).style.display = state.loading ? 'none' : '';
  }

  function buildDom() {
    var old = oldFloor();
    if (old) {
      old.classList.add('pmd-v60-old-floor-hidden');
      old.classList.add('pmd-v59-old-floor-hidden');
      old.classList.add('pmd-v58-old-floor-hidden');
      old.classList.add('pmd-v57-old-floor-hidden');
    }

    var existing = root();
    if (existing) {
      existing.style.display = 'block';
      return true;
    }

    var target = insertionTarget();
    if (!target || !target.parent) return false;

    if (target.oldContainer) {
      target.oldContainer.classList.add('pmd-v60-old-container-hidden');
    }

    var card = document.createElement('section');
    card.className = 'pmd-owner-floor-v60 is-loading';
    card.innerHTML = [
      '<div class="pmd-owner-floor-v60__head">',
        '<div class="pmd-owner-floor-v60__title">🍽️ <span>Restaurant Floor</span></div>',
        '<div class="pmd-owner-floor-v60__actions">',
          '<button type="button" class="pmd-owner-floor-v60__btn pmd-owner-floor-v60__edit">Edit</button>',
          '<button type="button" class="pmd-owner-floor-v60__btn pmd-owner-floor-v60__btn-primary pmd-owner-floor-v60__save" style="display:none">Save layout</button>',
          '<button type="button" class="pmd-owner-floor-v60__btn pmd-owner-floor-v60__btn-danger pmd-owner-floor-v60__cancel" style="display:none">Cancel</button>',
          '<button type="button" class="pmd-owner-floor-v60__btn pmd-owner-floor-v60__toggle" style="display:none">↗</button>',
        '</div>',
      '</div>',
      '<div class="pmd-owner-floor-v60__surface"><div class="pmd-owner-floor-v60__skeleton">Loading floor…</div></div>',
      '<div class="pmd-owner-floor-v60__status"></div>'
    ].join('');

    target.parent.insertBefore(card, target.before || null);
    attachEvents(card);

    state.insertionMode = target.mode;

    console.info('[PMD v60] mounted visible isolated floor', {
      mode: target.mode,
      parent: target.parent.className || target.parent.tagName
    });

    return true;
  }

  function normalizeTable(t, index) {
    var id = t.id || t.table_id;
    var no = t.table_no || t.table_number || t.number || t.name || (index + 1);
    var m = String(no).match(/\d+/);
    no = m ? m[0] : String(index + 1);

    return {
      id: Number(id),
      no: no,
      status: String(t.status || t.state || 'free').toLowerCase(),
      x: Number.isFinite(Number(t.floor_x)) ? Number(t.floor_x) : 70 + index * 120,
      y: Number.isFinite(Number(t.floor_y)) ? Number(t.floor_y) : 70,
      w: Number.isFinite(Number(t.floor_width)) && Number(t.floor_width) >= 40 ? Number(t.floor_width) : 78,
      h: Number.isFinite(Number(t.floor_height)) && Number(t.floor_height) >= 32 ? Number(t.floor_height) : 54
    };
  }

  async function fetchTables() {
    var res = await fetch(ENDPOINT + '?ts=' + Date.now(), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    var json = await res.json();
    var tables = (json.tables || []).map(normalizeTable).filter(function (t) {
      return Number.isFinite(t.id);
    });

    tables.sort(function (a, b) {
      return Number(a.no) - Number(b.no);
    });

    state.tables = tables;
    return tables;
  }

  function render() {
    var r = root();
    var s = surface();
    if (!r || !s) return;

    setMode();

    if (state.loading) return;

    s.innerHTML = '';

    if (!state.expanded) {
      var spacer = document.createElement('div');
      spacer.style.width = Math.max(s.clientWidth || 1000, 120 + Math.max(0, state.tables.length - 1) * 130 + 240) + 'px';
      spacer.style.height = '1px';
      spacer.style.pointerEvents = 'none';
      s.appendChild(spacer);
    }

    state.tables.forEach(function (t, index) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-owner-floor-v60__table';
      btn.dataset.id = String(t.id);
      btn.dataset.no = String(t.no);

      if (state.expanded) {
        btn.innerHTML = '<span>T' + t.no + '</span><small>' + t.status + '</small>';
        btn.style.left = Math.max(0, Math.round(t.x)) + 'px';
        btn.style.top = Math.max(0, Math.round(t.y)) + 'px';
        btn.style.width = Math.round(t.w || 78) + 'px';
        btn.style.height = Math.round(t.h || 54) + 'px';
      } else {
        btn.textContent = t.no;
        btn.style.left = (120 + index * 130) + 'px';
        btn.style.top = '50%';
      }

      s.appendChild(btn);
    });
  }

  function expand() {
    if (state.loading) return;
    state.expanded = true;
    state.editing = false;
    render();
    status('');
  }

  function collapse() {
    if (state.loading) return;
    state.expanded = false;
    state.editing = false;
    render();
    status('');
  }

  function edit() {
    if (state.loading) return;
    state.expanded = true;
    state.editing = true;
    render();
    status('Edit mode: drag tables, then Save layout.');
  }

  async function save() {
    if (state.saving || state.loading) return;

    state.saving = true;
    status('Saving layout...');

    try {
      var payload = {
        tables: state.tables.map(function (t) {
          return {
            id: Number(t.id),
            floor_x: Math.round(t.x),
            floor_y: Math.round(t.y),
            floor_width: Math.round(t.w || 78),
            floor_height: Math.round(t.h || 54)
          };
        })
      };

      var headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };

      var token = csrfToken();
      if (token) headers['X-CSRF-TOKEN'] = token;

      var res = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: headers,
        body: JSON.stringify(payload)
      });

      var contentType = res.headers.get('content-type') || '';
      var body = contentType.indexOf('application/json') >= 0 ? await res.json() : await res.text();

      if (!res.ok || (body && body.ok === false)) {
        throw new Error('HTTP ' + res.status + ' ' + JSON.stringify(body).slice(0, 240));
      }

      state.editing = false;
      await fetchTables();
      state.expanded = true;
      render();

      status('Saved successfully.');
      console.info('[PMD v60] Saved isolated floor layout', payload);
    } catch (err) {
      console.error('[PMD v60] Save failed', err);
      status('Save failed: ' + err.message);
      alert('Floor save failed: ' + err.message);
    } finally {
      state.saving = false;
    }
  }

  function cancel() {
    fetchTables().then(function () {
      state.editing = false;
      state.expanded = true;
      render();
      status('');
    });
  }

  function tableFromEl(el) {
    var id = Number(el && el.dataset && el.dataset.id);
    return state.tables.find(function (t) { return Number(t.id) === id; });
  }

  function startDrag(e) {
    var el = e.target.closest && e.target.closest('.pmd-owner-floor-v60__table');
    if (!el || !state.editing || !state.expanded) return;

    e.preventDefault();
    e.stopPropagation();

    var t = tableFromEl(el);
    if (!t) return;

    var rr = el.getBoundingClientRect();

    state.drag = {
      el: el,
      table: t,
      offsetX: e.clientX - rr.left,
      offsetY: e.clientY - rr.top
    };

    el.classList.add('is-dragging');

    try {
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    } catch (ignore) {}
  }

  function moveDrag(e) {
    if (!state.drag) return;

    e.preventDefault();
    e.stopPropagation();

    var s = surface();
    var d = state.drag;
    var sr = s.getBoundingClientRect();
    var er = d.el.getBoundingClientRect();

    var x = e.clientX - sr.left + s.scrollLeft - d.offsetX;
    var y = e.clientY - sr.top + s.scrollTop - d.offsetY;

    var maxX = Math.max(0, s.clientWidth - er.width);
    var maxY = Math.max(0, s.clientHeight - er.height);

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    d.table.x = Math.round(x);
    d.table.y = Math.round(y);
    d.table.w = Math.round(er.width || d.table.w || 78);
    d.table.h = Math.round(er.height || d.table.h || 54);

    d.el.style.left = d.table.x + 'px';
    d.el.style.top = d.table.y + 'px';
  }

  function endDrag(e) {
    if (!state.drag) return;

    e.preventDefault();
    e.stopPropagation();

    state.drag.el.classList.remove('is-dragging');
    state.drag = null;
  }

  function attachEvents(card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.pmd-owner-floor-v60__toggle')) {
        e.preventDefault();
        e.stopPropagation();
        state.expanded ? collapse() : expand();
        return;
      }

      if (e.target.closest('.pmd-owner-floor-v60__edit')) {
        e.preventDefault();
        e.stopPropagation();
        edit();
        return;
      }

      if (e.target.closest('.pmd-owner-floor-v60__save')) {
        e.preventDefault();
        e.stopPropagation();
        save();
        return;
      }

      if (e.target.closest('.pmd-owner-floor-v60__cancel')) {
        e.preventDefault();
        e.stopPropagation();
        cancel();
        return;
      }
    }, true);

    card.addEventListener('pointerdown', startDrag, true);
    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  async function boot() {
    if (state.booting) return false;
    state.booting = true;

    try {
      if (!buildDom()) return false;

      var old = oldFloor();
      if (old) {
        old.classList.add('pmd-v60-old-floor-hidden');
        old.classList.add('pmd-v59-old-floor-hidden');
        old.classList.add('pmd-v58-old-floor-hidden');
        old.classList.add('pmd-v57-old-floor-hidden');
      }

      if (state.mounted) return true;

      state.mounted = true;
      state.loading = true;
      render();

      await fetchTables();

      state.expanded = false;
      state.editing = false;
      state.loading = false;

      render();
      status('');

      return true;
    } catch (err) {
      state.loading = false;
      render();
      status('Could not load floor layout.');
      console.warn('[PMD v60] boot failed', err);
      return false;
    } finally {
      state.booting = false;
    }
  }

  function start() {
    boot().then(function (ok) {
      if (ok) return;

      state.observer = new MutationObserver(function () {
        boot().then(function (mounted) {
          if (mounted && state.observer) {
            state.observer.disconnect();
            state.observer = null;
          }
        });
      });

      state.observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(function () {
        boot();
      }, 350);

      setTimeout(function () {
        boot();
      }, 900);

      setTimeout(function () {
        if (state.observer) {
          state.observer.disconnect();
          state.observer = null;
        }
        boot();
      }, 1600);
    });
  }

  window.PMDOwnerFloorV60 = {
    boot: boot,
    reload: async function () {
      await fetchTables();
      render();
      return this.debug();
    },
    expand: expand,
    collapse: collapse,
    edit: edit,
    save: save,
    debug: function () {
      var r = root();
      var s = surface();
      var old = oldFloor();

      return {
        active: true,
        visiblePlacement: true,
        isolated: true,
        mounted: !!r,
        insertionMode: state.insertionMode,
        oldFloorExists: !!old,
        oldFloorHidden: !!old?.classList.contains('pmd-v60-old-floor-hidden'),
        expanded: state.expanded,
        editing: state.editing,
        loading: state.loading,
        saving: state.saving,
        tableCount: state.tables.length,
        rootVisible: r ? getComputedStyle(r).display !== 'none' && getComputedStyle(r).visibility !== 'hidden' : false,
        rootRect: r ? {
          x: Math.round(r.getBoundingClientRect().x),
          y: Math.round(r.getBoundingClientRect().y),
          h: Math.round(r.getBoundingClientRect().height),
          w: Math.round(r.getBoundingClientRect().width)
        } : null,
        surfaceRect: s ? {
          h: Math.round(s.getBoundingClientRect().height),
          w: Math.round(s.getBoundingClientRect().width),
          scrollWidth: s.scrollWidth,
          scrollHeight: s.scrollHeight
        } : null,
        oldContainerHiddenCount: $$('.pmd-v60-old-container-hidden').length
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  console.info('[PMD] Owner floor v60 visible placement active');
})();
 /* PMD_OWNER_FLOOR_V60_VISIBLE_PLACEMENT_END */


/* PMD_OWNER_FLOOR_V62_AFTER_KPI_PLACEMENT_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_FLOOR_V62_AFTER_KPI_PLACEMENT) return;
  window.PMD_OWNER_FLOOR_V62_AFTER_KPI_PLACEMENT = true;

  var state = {
    attempts: 0,
    placed: false,
    mode: null,
    lastError: null,
    observer: null
  };

  function $(s, r) {
    return (r || document).querySelector(s);
  }

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function cleanText(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function floorRoot() {
    return $('.pmd-owner-floor-v60');
  }

  function oldFloor() {
    return $('.pmd-shared-role-floor-v32.is-owner') || $('.pmd-shared-role-floor-v32');
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom)
    };
  }

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 10 && r.height > 10 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function findKpiRow() {
    var labels = ['Revenue Today', 'Open Checks', 'Active Tables', 'Reservations Today'];

    var candidates = $$('div,section,article').filter(function (el) {
      var t = cleanText(el);
      return labels.every(function (label) { return t.indexOf(label) >= 0; });
    }).map(function (el) {
      var r = el.getBoundingClientRect();
      return { el: el, w: r.width, h: r.height, area: r.width * r.height, textLen: cleanText(el).length };
    }).filter(function (x) {
      return x.w > 800 && x.h >= 70 && x.h <= 260;
    }).sort(function (a, b) {
      return a.area - b.area;
    });

    return candidates.length ? candidates[0].el : null;
  }

  function findAiAlertsCard() {
    var nodes = $$('h1,h2,h3,h4,strong,span,div');
    var title = nodes.find(function (el) {
      return cleanText(el) === 'AI Alerts';
    });

    if (!title) return null;

    var el = title;
    for (var i = 0; i < 9 && el && el !== document.body; i++, el = el.parentElement) {
      var r = el.getBoundingClientRect();
      var t = cleanText(el);
      if (r.width > 300 && r.height > 120 && t.indexOf('Open check value') >= 0) return el;
    }

    return title.closest('section, article, .card, div');
  }

  function hideOldFloorAndBlank() {
    var old = oldFloor();

    if (old) {
      old.classList.add('pmd-v60-old-floor-hidden');
      old.classList.add('pmd-v59-old-floor-hidden');
      old.classList.add('pmd-v58-old-floor-hidden');
      old.classList.add('pmd-v57-old-floor-hidden');
    }

    if (!old) return;

    var cur = old.parentElement;

    for (var i = 0; i < 8 && cur && cur !== document.body; i++, cur = cur.parentElement) {
      if (cur.contains(floorRoot())) continue;

      var t = cleanText(cur);

      if (
        t.indexOf('Restaurant Floor') >= 0 &&
        t.indexOf('AI Alerts') < 0 &&
        t.indexOf('Live Timeline') < 0 &&
        t.indexOf('Revenue Today') < 0
      ) {
        cur.classList.add('pmd-v60-old-container-hidden');
        cur.classList.add('pmd-v62-old-floor-container-hidden');
        break;
      }
    }
  }

  function place() {
    state.attempts++;

    try {
      if (!floorRoot() && window.PMDOwnerFloorV60 && typeof window.PMDOwnerFloorV60.boot === 'function') {
        window.PMDOwnerFloorV60.boot();
      }

      var root = floorRoot();
      if (!root) {
        state.mode = 'no-root';
        return false;
      }

      hideOldFloorAndBlank();

      var kpi = findKpiRow();
      var ai = findAiAlertsCard();

      if (kpi && kpi.parentNode) {
        kpi.parentNode.insertBefore(root, kpi.nextSibling);
        state.mode = 'after-kpi-row';
      } else if (ai && ai.parentNode) {
        ai.parentNode.insertBefore(root, ai);
        state.mode = 'before-ai-alerts-fallback';
      } else {
        var main = $('main') || $('.content') || $('.pmd-v36-card-grid') || document.body;
        main.insertBefore(root, main.firstChild);
        state.mode = 'main-prepend-fallback';
      }

      root.classList.add('pmd-v62-after-kpi');
      root.style.display = 'block';
      root.style.visibility = 'visible';
      root.style.opacity = '1';

      state.placed = true;
      return true;
    } catch (err) {
      state.lastError = err.message;
      console.warn('[PMD v62] placement failed', err);
      return false;
    }
  }

  function schedule() {
    [0, 80, 180, 350, 700, 1200, 2000, 3500].forEach(function (ms) {
      setTimeout(place, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }

  state.observer = new MutationObserver(function () {
    if (!state.placed || state.attempts < 25) place();
  });

  state.observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(function () {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    place();
  }, 5000);

  window.PMDOwnerFloorV62 = {
    place: place,
    debug: function () {
      place();

      var root = floorRoot();
      var kpi = findKpiRow();
      var ai = findAiAlertsCard();

      return {
        active: true,
        afterKpiPlacement: true,
        attempts: state.attempts,
        placed: state.placed,
        mode: state.mode,
        lastError: state.lastError,
        rootExists: !!root,
        rootVisible: isVisible(root),
        rootRect: rect(root),
        kpiFound: !!kpi,
        kpiRect: rect(kpi),
        aiFound: !!ai,
        aiRect: rect(ai),
        oldHidden: !!oldFloor()?.classList.contains('pmd-v60-old-floor-hidden'),
        oldBlankHiddenCount: $$('.pmd-v62-old-floor-container-hidden, .pmd-v60-old-container-hidden').length
      };
    }
  };

  console.info('[PMD] Owner floor v62 after-KPI placement active');
})();
 /* PMD_OWNER_FLOOR_V62_AFTER_KPI_PLACEMENT_END */


/* PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V69_RUNTIME) return;
  window.PMD_OWNER_DASHBOARD_V69_RUNTIME = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  function $(s, r) {
    return (r || document).querySelector(s);
  }

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function txt(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      cls: String(el.className || '').slice(0, 160)
    };
  }

  function findKpiRow() {
    var labels = ['Revenue Today', 'Open Checks', 'Active Tables', 'Reservations Today'];

    var candidates = $$('div,section,article').map(function (el) {
      var t = txt(el);
      var r = el.getBoundingClientRect();

      return {
        el: el,
        t: t,
        w: r.width,
        h: r.height,
        area: r.width * r.height
      };
    }).filter(function (x) {
      return x.w > 850 &&
        x.h >= 70 &&
        x.h <= 280 &&
        labels.every(function (label) { return x.t.indexOf(label) >= 0; });
    }).sort(function (a, b) {
      return a.area - b.area;
    });

    return candidates.length ? candidates[0].el : null;
  }

  function forceFinal() {
    document.documentElement.classList.add(
      'pmd-owner-v69-no-loader',
      'pmd-admin-toolbar-ready',
      'pmd-role-owner-v30',
      'pmd-role-owner-v31',
      'pmd-v21-role-owner',
      'pmd-sidebar-icons-only'
    );

    document.documentElement.classList.remove(
      'pmd-v64-dashboard-booting',
      'pmd-v64-dashboard-stabilizing',
      'pmd-v64-dashboard-ready',
      'pmd-v67-post-reveal-lock'
    );

    document.body.classList.add(
      'pmd-admin-toolbar-ready',
      'pmd-role-rail-v30',
      'pmd-all-roles-clean-v31',
      'pmd-role-owner-v31',
      'pmd-role-owner-v30',
      'pmd-v21-role-owner',
      'pmd-sidebar-icons-only'
    );

    var kpi = findKpiRow() || $('.pmd-v15-kpi-grid') || $('.pmd-v19-kpi-grid') || $('.pmd-v21-kpi-grid');
    if (kpi) kpi.classList.add('pmd-v36-kpi-grid');

    $$('.pmd-v19-reference-grid, .pmd-v21-reference-grid, .pmd-v36-card-grid').forEach(function (grid) {
      grid.classList.add('pmd-v36-card-grid');
    });

    $$('.pmd-v15-card--alerts, .pmd-v19-area-alerts, .pmd-v15-card--timeline, .pmd-v19-area-timeline').forEach(function (el) {
      el.classList.add('pmd-v36-span-2');
    });

    var floor = $('.pmd-owner-floor-v60');
    if (floor) floor.classList.add('pmd-v62-after-kpi');

    if (window.PMDOwnerFloorV62 && typeof window.PMDOwnerFloorV62.place === 'function') {
      try { window.PMDOwnerFloorV62.place(); } catch (ignore) {}
    }
  }

  function start() {
    forceFinal();

    [0, 20, 50, 100, 180, 300, 500, 800, 1200, 1800].forEach(function (ms) {
      setTimeout(forceFinal, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV69 = {
    fix: forceFinal,
    debug: function () {
      forceFinal();

      var main = document.querySelector('.main-container, .page-content, .content');
      var kpi = findKpiRow();
      var floor = $('.pmd-owner-floor-v60');
      var ai = $('.pmd-v15-card--alerts, .pmd-v19-area-alerts');
      var timeline = $('.pmd-v15-card--timeline, .pmd-v19-area-timeline');

      return {
        active: true,
        noLoaderFlag: !!window.PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST,
        htmlClass: document.documentElement.className,
        bodyClass: document.body.className,
        removedOldLoaders: !document.documentElement.className.includes('pmd-v64-dashboard-booting'),
        main: rect(main),
        kpi: rect(kpi),
        floor: rect(floor),
        ai: rect(ai),
        timeline: rect(timeline)
      };
    }
  };

  console.info('[PMD] Owner dashboard v69 no-loader geometry-first active');
})();
 /* PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST_END */


/* PMD_OWNER_DASHBOARD_V71_MOVE_CARDS_AFTER_FLOOR_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V71_MOVE_CARDS_AFTER_FLOOR) return;
  window.PMD_OWNER_DASHBOARD_V71_MOVE_CARDS_AFTER_FLOOR = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    active: true,
    applied: false,
    attempts: 0,
    last: null
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function text(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      cls: String(el.className || '').slice(0, 180)
    };
  }

  function findCard(label) {
    var title = $$('h1,h2,h3,h4,strong,span,p,div').find(function (el) {
      return text(el) === label;
    });

    if (!title) return null;

    var el = title;

    for (var i = 0; i < 10 && el && el !== document.body; i++, el = el.parentElement) {
      var r = el.getBoundingClientRect();
      var t = text(el);

      if (r.width > 260 && r.height > 80 && t.indexOf(label) >= 0) return el;
    }

    return title.closest('section, article, .card, div');
  }

  function hardStyle(el, prop, value) {
    if (el && el.style) el.style.setProperty(prop, value, 'important');
  }

  function hideEmptyOldParent(parent, floor, row) {
    if (!parent || parent === document.body || parent === document.documentElement) return;
    if (parent === row || parent.contains(row) || parent.contains(floor)) return;

    var visibleChildren = Array.prototype.slice.call(parent.children || []).filter(function (child) {
      if (child === row) return false;
      if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return false;

      var cs = getComputedStyle(child);
      var r = child.getBoundingClientRect();

      return cs.display !== 'none' && r.width > 2 && r.height > 2 && text(child).length > 0;
    });

    if (visibleChildren.length === 0 || text(parent).length < 4) {
      parent.classList.add('pmd-v71-empty-old-parent');
      hardStyle(parent, 'display', 'none');
      hardStyle(parent, 'height', '0');
      hardStyle(parent, 'min-height', '0');
      hardStyle(parent, 'margin', '0');
      hardStyle(parent, 'padding', '0');
      hardStyle(parent, 'overflow', 'hidden');
    }
  }

  function ensureRowAfterFloor(floor) {
    var row = document.getElementById('pmd-v71-after-floor-row');

    if (!row) {
      row = document.createElement('div');
      row.id = 'pmd-v71-after-floor-row';
      row.className = 'pmd-v71-after-floor-row';
    }

    if (floor && row.previousElementSibling !== floor) {
      floor.insertAdjacentElement('afterend', row);
    }

    row.classList.add('pmd-v71-after-floor-row');

    hardStyle(row, 'display', 'grid');
    hardStyle(row, 'grid-template-columns', 'repeat(2, minmax(0, 1fr))');
    hardStyle(row, 'gap', '18px');
    hardStyle(row, 'width', '100%');
    hardStyle(row, 'max-width', '100%');
    hardStyle(row, 'margin', '18px 0 0 0');
    hardStyle(row, 'padding', '0');
    hardStyle(row, 'grid-column', '1 / -1');

    return row;
  }

  function apply() {
    state.attempts++;

    document.documentElement.classList.add('pmd-owner-v69-no-loader');

    var floor = document.querySelector('.pmd-owner-floor-v60');
    var timeline = findCard('Live Timeline');
    var ai = findCard('AI Alerts');

    if (!floor || !timeline || !ai) return false;

    var timelineOldParent = timeline.parentElement;
    var aiOldParent = ai.parentElement;

    var row = ensureRowAfterFloor(floor);

    timeline.classList.add('pmd-v71-timeline-card');
    ai.classList.add('pmd-v71-ai-card');

    // Remove the old v70 class behavior if it exists.
    timeline.classList.remove('pmd-v70-timeline-card');
    ai.classList.remove('pmd-v70-ai-card');

    hardStyle(timeline, 'grid-column', '1 / 2');
    hardStyle(timeline, 'order', '1');
    hardStyle(timeline, 'margin', '0');
    hardStyle(timeline, 'width', '100%');
    hardStyle(timeline, 'max-width', '100%');
    hardStyle(timeline, 'height', '396px');
    hardStyle(timeline, 'max-height', '396px');

    hardStyle(ai, 'grid-column', '2 / 3');
    hardStyle(ai, 'order', '2');
    hardStyle(ai, 'margin', '0');
    hardStyle(ai, 'width', '100%');
    hardStyle(ai, 'max-width', '100%');
    hardStyle(ai, 'height', '396px');
    hardStyle(ai, 'max-height', '396px');

    // Physical DOM move. This is the key fix.
    if (timeline.parentElement !== row || timeline.nextElementSibling !== ai) {
      row.appendChild(timeline);
      row.appendChild(ai);
    }

    hideEmptyOldParent(timelineOldParent, floor, row);
    hideEmptyOldParent(aiOldParent, floor, row);

    state.applied = true;

    state.last = {
      row: rect(row),
      floor: rect(floor),
      timeline: rect(timeline),
      ai: rect(ai),
      gapTimelineToFloor: Math.round(timeline.getBoundingClientRect().y - floor.getBoundingClientRect().bottom),
      gapAiToFloor: Math.round(ai.getBoundingClientRect().y - floor.getBoundingClientRect().bottom)
    };

    return true;
  }

  function start() {
    apply();

    [0, 20, 50, 100, 180, 300, 500, 800, 1200, 1800, 2600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    console.info('[PMD] Owner dashboard v71 moved AI/Timeline after floor active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV71 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        applied: state.applied,
        attempts: state.attempts,
        last: state.last
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V71_MOVE_CARDS_AFTER_FLOOR_END */


/* PMD_OWNER_DASHBOARD_V73_FINAL_EQUAL_SPACING_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V73_FINAL_EQUAL_SPACING) return;
  window.PMD_OWNER_DASHBOARD_V73_FINAL_EQUAL_SPACING = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var GAP = 18;

  var state = {
    active: true,
    applied: false,
    attempts: 0,
    last: null
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      tag: el.tagName,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 160),
      text: clean(el).slice(0, 100)
    };
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function disableBadV72() {
    if (window.PMDOwnerDashboardV72) {
      window.PMDOwnerDashboardV72.fix = function () { return false; };
      window.PMDOwnerDashboardV72.debug = function () {
        return { disabledByV73: true };
      };
    }

    $$('.pmd-v72-analytics-card').forEach(function (el) {
      el.classList.remove('pmd-v72-analytics-card');
      el.removeAttribute('style');
    });

    var row72 = document.getElementById('pmd-v72-analytics-row');
    if (row72) row72.remove();
  }

  function restoreHeader(card, label) {
    if (!card) return;

    var header = $$('header,.pmd-v15-card-head', card).find(function (el) {
      return clean(el).indexOf(label) >= 0;
    });

    if (!header) {
      header = $$('header,.pmd-v15-card-head').find(function (el) {
        return clean(el).indexOf(label) >= 0;
      });
    }

    if (!header) return;

    header.classList.remove('pmd-v72-analytics-card');
    header.removeAttribute('style');
    header.classList.add('pmd-v15-card-head');

    if (header.parentElement !== card || card.firstElementChild !== header) {
      card.insertBefore(header, card.firstChild);
    }
  }

  function grid(el, columns) {
    hard(el, 'display', 'grid');
    hard(el, 'grid-template-columns', columns);
    hard(el, 'gap', GAP + 'px');
    hard(el, 'width', '100%');
    hard(el, 'max-width', '100%');
    hard(el, 'margin', GAP + 'px 0 0 0');
    hard(el, 'padding', '0');
    hard(el, 'align-items', 'stretch');
    hard(el, 'grid-auto-flow', 'row');
    hard(el, 'transform', 'none');
    hard(el, 'transition', 'none');
    hard(el, 'animation', 'none');
  }

  function cardStyle(card, index) {
    if (!card) return;

    card.classList.add('pmd-v36-span-1');
    card.classList.add('pmd-v73-top-card');

    for (var i = 1; i <= 4; i++) {
      card.classList.remove('pmd-v73-card-' + i);
    }

    card.classList.add('pmd-v73-card-' + (index + 1));

    hard(card, 'grid-column', (index + 1) + ' / ' + (index + 2));
    hard(card, 'order', String(index + 1));
    hard(card, 'margin', '0');
    hard(card, 'width', '100%');
    hard(card, 'max-width', '100%');
    hard(card, 'transform', 'none');
    hard(card, 'transition', 'none');
    hard(card, 'animation', 'none');
  }

  function getTopCards() {
    return [
      ['revenue', 'Revenue by Hour', document.querySelector('.pmd-v15-card--chart')],
      ['payment', 'Payment Breakdown', document.querySelector('.pmd-v15-card--payment')],
      ['average', 'Average Guest Spend', document.querySelector('.pmd-v15-card--small')],
      ['lost', 'Lost Revenue', document.querySelector('.pmd-v15-card--lost')]
    ];
  }

  function findRemainingGrid(topRow) {
    return $$('.pmd-v19-analytics-grid,.pmd-v21-analytics-grid').find(function (el) {
      var t = clean(el);
      return el !== topRow &&
        (
          t.indexOf('Upcoming Reservations') >= 0 ||
          t.indexOf('Top Servers') >= 0 ||
          t.indexOf('Kitchen Performance') >= 0 ||
          t.indexOf('Quick Actions') >= 0 ||
          t.indexOf('Top Selling Items') >= 0
        );
    }) || null;
  }

  function apply() {
    state.attempts += 1;

    disableBadV72();

    document.documentElement.classList.add('pmd-owner-v69-no-loader');

    if (window.PMDOwnerDashboardV71 && typeof window.PMDOwnerDashboardV71.fix === 'function') {
      try { window.PMDOwnerDashboardV71.fix(); } catch (ignore) {}
    }

    var floor = document.querySelector('.pmd-owner-floor-v60');
    var timelineAiRow = document.getElementById('pmd-v71-after-floor-row');
    var cards = getTopCards();

    cards.forEach(function (item) {
      restoreHeader(item[2], item[1]);
    });

    if (!floor || !timelineAiRow || cards.some(function (item) { return !item[2]; })) {
      state.last = {
        ok: false,
        reason: 'missing-node',
        floor: rect(floor),
        timelineAiRow: rect(timelineAiRow),
        cards: cards.map(function (item) {
          return { key: item[0], label: item[1], card: rect(item[2]) };
        })
      };
      return false;
    }

    var topRow = document.getElementById('pmd-v73-top-analytics-row');

    if (!topRow) {
      topRow = document.createElement('div');
      topRow.id = 'pmd-v73-top-analytics-row';
      topRow.className = 'pmd-v73-top-analytics-row pmd-v36-card-grid';
    }

    if (timelineAiRow.nextElementSibling !== topRow) {
      timelineAiRow.insertAdjacentElement('afterend', topRow);
    }

    grid(timelineAiRow, 'repeat(2, minmax(0, 1fr))');
    grid(topRow, 'repeat(4, minmax(0, 1fr))');

    // Exact order, every run.
    cards.forEach(function (item, index) {
      var card = item[2];
      cardStyle(card, index);
      topRow.appendChild(card);
    });

    var remainingGrid = findRemainingGrid(topRow);

    if (remainingGrid) {
      if (topRow.nextElementSibling !== remainingGrid) {
        topRow.insertAdjacentElement('afterend', remainingGrid);
      }

      remainingGrid.classList.add('pmd-v73-remaining-analytics-grid');
      grid(remainingGrid, 'repeat(4, minmax(0, 1fr))');

      Array.prototype.slice.call(remainingGrid.children).forEach(function (card, index) {
        hard(card, 'margin', '0');
        hard(card, 'width', '100%');
        hard(card, 'max-width', '100%');
        hard(card, 'grid-column', ((index % 4) + 1) + ' / ' + ((index % 4) + 2));
        hard(card, 'order', String(index + 1));
        hard(card, 'transform', 'none');
        hard(card, 'transition', 'none');
        hard(card, 'animation', 'none');
      });
    }

    var revenue = cards[0][2];
    var payment = cards[1][2];
    var average = cards[2][2];
    var lost = cards[3][2];

    state.applied = true;
    state.last = {
      ok: true,
      floor: rect(floor),
      timelineAiRow: rect(timelineAiRow),
      topAnalyticsRow: rect(topRow),
      remainingGrid: rect(remainingGrid),
      revenue: rect(revenue),
      payment: rect(payment),
      average: rect(average),
      lost: rect(lost),
      gaps: {
        rowToFloor: Math.round(timelineAiRow.getBoundingClientRect().y - floor.getBoundingClientRect().bottom),
        analyticsToTimelineAi: Math.round(topRow.getBoundingClientRect().y - timelineAiRow.getBoundingClientRect().bottom),
        revenueToAnalyticsTop: Math.round(revenue.getBoundingClientRect().y - topRow.getBoundingClientRect().y),
        paymentToRevenueXGap: Math.round(payment.getBoundingClientRect().x - revenue.getBoundingClientRect().right),
        averageToPaymentXGap: Math.round(average.getBoundingClientRect().x - payment.getBoundingClientRect().right),
        lostToAverageXGap: Math.round(lost.getBoundingClientRect().x - average.getBoundingClientRect().right)
      }
    };

    return true;
  }

  function start() {
    apply();

    [0, 20, 50, 100, 180, 300, 500, 800, 1200, 1800, 2600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    console.info('[PMD] Owner dashboard v73 final equal spacing active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV73 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        applied: state.applied,
        attempts: state.attempts,
        last: state.last
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V73_FINAL_EQUAL_SPACING_END */


/* PMD_OWNER_DASHBOARD_V74_LOWER_ROW_FINAL_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V74_LOWER_ROW_FINAL) return;
  window.PMD_OWNER_DASHBOARD_V74_LOWER_ROW_FINAL = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var GAP = 18;

  var state = {
    active: true,
    applied: false,
    attempts: 0,
    last: null
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      tag: el.tagName,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 160),
      text: clean(el).slice(0, 100)
    };
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function findFullCard(label) {
    var title = $$('h1,h2,h3,h4,strong,span,p,div').find(function (el) {
      return clean(el) === label;
    });

    if (!title) return null;

    var best = null;
    var node = title;

    for (var i = 0; i < 12 && node && node !== document.body; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      var cls = String(node.className || '');
      var t = clean(node);

      if (
        t.indexOf(label) >= 0 &&
        r.width > 220 &&
        r.height > 70 &&
        cls.indexOf('pmd-v15-card-head') < 0
      ) {
        if (cls.indexOf('pmd-v15-card') >= 0) return node;
        if (!best) best = node;
      }
    }

    return best;
  }

  function grid(row, columns) {
    hard(row, 'display', 'grid');
    hard(row, 'grid-template-columns', columns);
    hard(row, 'gap', GAP + 'px');
    hard(row, 'width', '100%');
    hard(row, 'max-width', '100%');
    hard(row, 'margin', GAP + 'px 0 0 0');
    hard(row, 'padding', '0');
    hard(row, 'align-items', 'stretch');
    hard(row, 'grid-auto-flow', 'row');
    hard(row, 'transform', 'none');
    hard(row, 'transition', 'none');
    hard(row, 'animation', 'none');
  }

  function cardStyle(card, index) {
    if (!card) return;

    card.classList.add('pmd-v74-lower-card');

    for (var i = 1; i <= 4; i++) {
      card.classList.remove('pmd-v74-lower-card-' + i);
    }

    card.classList.add('pmd-v74-lower-card-' + (index + 1));

    hard(card, 'grid-column', (index + 1) + ' / ' + (index + 2));
    hard(card, 'order', String(index + 1));
    hard(card, 'margin', '0');
    hard(card, 'width', '100%');
    hard(card, 'max-width', '100%');
    hard(card, 'transform', 'none');
    hard(card, 'transition', 'none');
    hard(card, 'animation', 'none');
  }

  function collapseIfEmpty(parent) {
    if (!parent || parent === document.body || parent === document.documentElement) return;

    var visible = Array.prototype.slice.call(parent.children || []).filter(function (child) {
      var r = child.getBoundingClientRect();
      var cs = getComputedStyle(child);
      return cs.display !== 'none' && r.width > 2 && r.height > 2 && clean(child).length > 3;
    });

    if (visible.length === 0) {
      parent.classList.add('pmd-v74-empty-parent');
      hard(parent, 'display', 'none');
      hard(parent, 'height', '0');
      hard(parent, 'min-height', '0');
      hard(parent, 'max-height', '0');
      hard(parent, 'margin', '0');
      hard(parent, 'padding', '0');
      hard(parent, 'overflow', 'hidden');
    }
  }

  function hideUpcoming() {
    var upcoming = findFullCard('Upcoming Reservations');

    if (!upcoming) return null;

    var oldParent = upcoming.parentElement;

    upcoming.classList.add('pmd-v74-hidden-upcoming');
    upcoming.setAttribute('data-pmd-v74-hidden-upcoming', 'true');

    hard(upcoming, 'display', 'none');
    hard(upcoming, 'visibility', 'hidden');
    hard(upcoming, 'height', '0');
    hard(upcoming, 'min-height', '0');
    hard(upcoming, 'max-height', '0');
    hard(upcoming, 'margin', '0');
    hard(upcoming, 'padding', '0');
    hard(upcoming, 'overflow', 'hidden');

    collapseIfEmpty(oldParent);

    return upcoming;
  }

  function apply() {
    state.attempts += 1;

    document.documentElement.classList.add('pmd-owner-v69-no-loader');

    if (window.PMDOwnerDashboardV73 && typeof window.PMDOwnerDashboardV73.fix === 'function') {
      try { window.PMDOwnerDashboardV73.fix(); } catch (ignore) {}
    }

    var topRow = document.getElementById('pmd-v73-top-analytics-row');

    var upcoming = hideUpcoming();

    var cards = [
      ['topServers', 'Top Servers', findFullCard('Top Servers')],
      ['kitchen', 'Kitchen Performance', findFullCard('Kitchen Performance')],
      ['topSelling', 'Top Selling Items', findFullCard('Top Selling Items')],
      ['quickActions', 'Quick Actions', findFullCard('Quick Actions')]
    ];

    if (!topRow || cards.some(function (item) { return !item[2]; })) {
      state.last = {
        ok: false,
        reason: 'missing-node',
        topRow: rect(topRow),
        upcoming: rect(upcoming),
        cards: cards.map(function (item) {
          return { key: item[0], label: item[1], card: rect(item[2]) };
        })
      };
      return false;
    }

    var lowerRow = document.getElementById('pmd-v74-lower-equal-row');

    if (!lowerRow) {
      lowerRow = document.createElement('div');
      lowerRow.id = 'pmd-v74-lower-equal-row';
      lowerRow.className = 'pmd-v74-lower-equal-row pmd-v36-card-grid';
    }

    if (topRow.nextElementSibling !== lowerRow) {
      topRow.insertAdjacentElement('afterend', lowerRow);
    }

    grid(lowerRow, 'repeat(4, minmax(0, 1fr))');

    cards.forEach(function (item, index) {
      var card = item[2];
      cardStyle(card, index);
      lowerRow.appendChild(card);
    });

    var topServers = cards[0][2];
    var kitchen = cards[1][2];
    var topSelling = cards[2][2];
    var quickActions = cards[3][2];

    state.applied = true;
    state.last = {
      ok: true,
      upcomingHidden: !!document.querySelector('[data-pmd-v74-hidden-upcoming="true"],.pmd-v74-hidden-upcoming'),
      topRow: rect(topRow),
      lowerRow: rect(lowerRow),
      topServers: rect(topServers),
      kitchen: rect(kitchen),
      topSelling: rect(topSelling),
      quickActions: rect(quickActions),
      gaps: {
        lowerRowToTopRow: Math.round(lowerRow.getBoundingClientRect().y - topRow.getBoundingClientRect().bottom),
        kitchenToTopServersXGap: Math.round(kitchen.getBoundingClientRect().x - topServers.getBoundingClientRect().right),
        topSellingToKitchenXGap: Math.round(topSelling.getBoundingClientRect().x - kitchen.getBoundingClientRect().right),
        quickActionsToTopSellingXGap: Math.round(quickActions.getBoundingClientRect().x - topSelling.getBoundingClientRect().right)
      }
    };

    return true;
  }

  function start() {
    apply();

    [0, 20, 50, 100, 180, 300, 500, 800, 1200, 1800, 2600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    console.info('[PMD] Owner dashboard v74 lower row final active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV74 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        applied: state.applied,
        attempts: state.attempts,
        last: state.last
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V74_LOWER_ROW_FINAL_END */


/* PMD_ROLE_DASHBOARD_V76_OWNER_FLOOR_ALL_NONKDS_START */
(function () {
  'use strict';

  if (window.PMD_ROLE_DASHBOARD_V76_OWNER_FLOOR_ALL_NONKDS) return;
  window.PMD_ROLE_DASHBOARD_V76_OWNER_FLOOR_ALL_NONKDS = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var TARGET_GAP = 18;

  var state = {
    active: true,
    attempts: 0,
    last: null,
    template: null,
    templateText: ''
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 80 && r.height > 60 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      display: cs.display,
      marginTop: cs.marginTop,
      inline: el.getAttribute('style') || '',
      cls: String(el.className || '').slice(0, 180),
      text: clean(el).slice(0, 120)
    };
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isTargetRole(role) {
    return ['manager', 'cashier', 'counter', 'waiter'].indexOf(role) >= 0;
  }

  function getKpiRow() {
    var kpis = $$('.pmd-v15-kpi,.pmd-kds-v44-card')
      .filter(visible)
      .filter(function (el) {
        return !el.classList.contains('pmd-v15-kpi-copy');
      });

    if (!kpis.length) return null;

    var parent = kpis[0].parentElement;

    while (parent && parent !== document.body) {
      if (kpis.every(function (k) { return parent.contains(k); })) return parent;
      parent = parent.parentElement;
    }

    return kpis[0];
  }

  function legacyFloors() {
    return $$([
      '.pmd-shared-role-floor-v32-card',
      '.pmd-v21-waiter-floor-card',
      '.pmd-v23-counter-floor-card',
      '.pmd-v37-owner-floor-card',
      '.pmd-v15-card--floor',
      '.pmd-owner-floor-v60'
    ].join(','))
      .filter(function (el) {
        return el.id !== 'pmd-v76-role-floor' && visible(el);
      });
  }

  function findOwnerFloorSource() {
    var candidates = $$([
      '.pmd-owner-floor-v60',
      '.pmd-v37-owner-floor-card',
      '.pmd-shared-role-floor-v32-card',
      '.pmd-v15-card--floor'
    ].join(','))
      .filter(function (el) {
        return el.id !== 'pmd-v76-role-floor' &&
          !el.hasAttribute('data-pmd-v76-hidden-old-floor') &&
          visible(el);
      });

    if (!candidates.length) return null;

    candidates.sort(function (a, b) {
      var at = clean(a);
      var bt = clean(b);

      var ascore = 0;
      var bscore = 0;

      if (a.classList.contains('pmd-owner-floor-v60')) ascore += 100;
      if (b.classList.contains('pmd-owner-floor-v60')) bscore += 100;

      if (a.classList.contains('pmd-v37-owner-floor-card')) ascore += 50;
      if (b.classList.contains('pmd-v37-owner-floor-card')) bscore += 50;

      if (at.indexOf('Loading floor') < 0) ascore += 20;
      if (bt.indexOf('Loading floor') < 0) bscore += 20;

      ascore += Math.min(20, Math.round(a.getBoundingClientRect().width / 100));
      bscore += Math.min(20, Math.round(b.getBoundingClientRect().width / 100));

      return bscore - ascore;
    });

    return candidates[0];
  }

  function rememberTemplate() {
    var source = findOwnerFloorSource();

    if (!source && state.template) return true;
    if (!source) return false;

    var sourceText = clean(source);

    if (
      state.template &&
      state.templateText &&
      state.templateText.indexOf('Loading floor') < 0 &&
      sourceText.indexOf('Loading floor') >= 0
    ) {
      return true;
    }

    var clone = source.cloneNode(true);

    $$('[id]', clone).forEach(function (el) {
      el.removeAttribute('id');
    });

    state.template = clone;
    state.templateText = sourceText;

    return true;
  }

  function hideLegacyFloors() {
    var floors = legacyFloors();

    floors.forEach(function (el) {
      el.classList.add('pmd-v76-hidden-old-floor');
      el.setAttribute('data-pmd-v76-hidden-old-floor', 'true');

      hard(el, 'display', 'none');
      hard(el, 'visibility', 'hidden');
      hard(el, 'height', '0');
      hard(el, 'min-height', '0');
      hard(el, 'max-height', '0');
      hard(el, 'margin', '0');
      hard(el, 'padding', '0');
      hard(el, 'overflow', 'hidden');

      var p = el.parentElement;

      if (p && p !== document.body) {
        var visibleChildren = Array.prototype.slice.call(p.children || []).filter(function (child) {
          var r = child.getBoundingClientRect();
          var cs = getComputedStyle(child);
          return cs.display !== 'none' && r.width > 5 && r.height > 5 && clean(child).length > 3;
        });

        if (!visibleChildren.length) {
          p.classList.add('pmd-v76-hidden-old-floor-parent');
          p.setAttribute('data-pmd-v76-hidden-old-floor-parent', 'true');
          hard(p, 'display', 'none');
          hard(p, 'height', '0');
          hard(p, 'min-height', '0');
          hard(p, 'max-height', '0');
          hard(p, 'margin', '0');
          hard(p, 'padding', '0');
          hard(p, 'overflow', 'hidden');
        }
      }
    });

    return floors;
  }

  function removePreviewAndUnhide() {
    var preview = document.getElementById('pmd-v76-role-floor');
    if (preview) preview.remove();

    $$('[data-pmd-v76-hidden-old-floor="true"],.pmd-v76-hidden-old-floor').forEach(function (el) {
      el.classList.remove('pmd-v76-hidden-old-floor');
      el.removeAttribute('data-pmd-v76-hidden-old-floor');
      ['display', 'visibility', 'height', 'min-height', 'max-height', 'margin', 'padding', 'overflow'].forEach(function (p) {
        el.style.removeProperty(p);
      });
    });

    $$('[data-pmd-v76-hidden-old-floor-parent="true"],.pmd-v76-hidden-old-floor-parent').forEach(function (el) {
      el.classList.remove('pmd-v76-hidden-old-floor-parent');
      el.removeAttribute('data-pmd-v76-hidden-old-floor-parent');
      ['display', 'visibility', 'height', 'min-height', 'max-height', 'margin', 'padding', 'overflow'].forEach(function (p) {
        el.style.removeProperty(p);
      });
    });
  }

  function normalizeFloor(floor, role) {
    floor.id = 'pmd-v76-role-floor';
    floor.classList.add('pmd-owner-floor-v60', 'pmd-v62-after-kpi', 'is-compact');

    floor.classList.remove('is-loading');

    hard(floor, 'display', 'block');
    hard(floor, 'visibility', 'visible');
    hard(floor, 'opacity', '1');
    hard(floor, 'width', '100%');
    hard(floor, 'max-width', '100%');
    hard(floor, 'min-width', '0');
    hard(floor, 'margin', TARGET_GAP + 'px 0 0 0');
    hard(floor, 'padding', '0');
    hard(floor, 'transform', 'none');
    hard(floor, 'transition', 'none');
    hard(floor, 'animation', 'none');
    hard(floor, 'overflow', 'visible');

    var title = floor.querySelector('h1,h2,h3,h4');
    if (title) title.textContent = 'Restaurant Floor';

    floor.setAttribute('data-pmd-v76-role-floor', role);

    return floor;
  }

  function ensurePreview(role) {
    var existing = document.getElementById('pmd-v76-role-floor');

    if (!existing) {
      if (!state.template && !rememberTemplate()) return null;

      existing = state.template.cloneNode(true);

      $$('[id]', existing).forEach(function (el) {
        el.removeAttribute('id');
      });
    }

    return normalizeFloor(existing, role);
  }

  function insertAfterKpi(floor) {
    var kpiRow = getKpiRow();

    if (!kpiRow || !floor) return false;

    if (kpiRow.nextElementSibling !== floor) {
      kpiRow.insertAdjacentElement('afterend', floor);
    }

    return true;
  }

  function apply() {
    state.attempts += 1;

    var role = currentRole();

    if (!isTargetRole(role)) {
      removePreviewAndUnhide();
      state.last = {
        ok: true,
        skipped: true,
        role: role,
        reason: 'role-not-targeted-or-kds'
      };
      return true;
    }

    rememberTemplate();

    var beforeFloors = legacyFloors();
    var hidden = hideLegacyFloors();
    var floor = ensurePreview(role);
    var inserted = insertAfterKpi(floor);

    var kpiRow = getKpiRow();
    var gap = kpiRow && floor
      ? Math.round(floor.getBoundingClientRect().y - kpiRow.getBoundingClientRect().bottom)
      : null;

    state.last = {
      ok: !!floor && inserted && Math.abs(gap - TARGET_GAP) <= 3,
      role: role,
      gap: gap,
      beforeFloors: beforeFloors.map(rect),
      hiddenOldFloors: hidden.map(rect),
      preview: rect(floor)
    };

    return state.last.ok;
  }

  function start() {
    apply();

    [0, 30, 80, 160, 300, 500, 800, 1200, 1800, 2600, 4000].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        [50, 120, 260, 500, 900, 1400, 2200].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Role dashboard v76 owner floor all non-KDS active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDRoleDashboardV76 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        templateText: state.templateText,
        last: state.last
      };
    }
  };
})();
 /* PMD_ROLE_DASHBOARD_V76_OWNER_FLOOR_ALL_NONKDS_END */


/* PMD_ROLE_DASHBOARD_V77_CARD_PACKER_START */
(function () {
  'use strict';

  if (window.PMD_ROLE_DASHBOARD_V77_CARD_PACKER) return;
  window.PMD_ROLE_DASHBOARD_V77_CARD_PACKER = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var GAP = 18;
  var TARGET_ROLES = ['manager', 'cashier', 'counter', 'waiter'];

  var state = {
    active: true,
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 80 && r.height > 60 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      display: cs.display,
      marginTop: cs.marginTop,
      cls: String(el.className || '').slice(0, 180),
      text: clean(el).slice(0, 120)
    };
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isTargetRole(role) {
    return TARGET_ROLES.indexOf(role) >= 0;
  }

  function getFloor() {
    return document.getElementById('pmd-v76-role-floor') ||
      document.querySelector('.pmd-owner-floor-v60:not([data-pmd-v76-hidden-old-floor="true"])') ||
      document.querySelector('.pmd-v15-card--floor:not([data-pmd-v76-hidden-old-floor="true"])');
  }

  function isEmptyUpcomingReservations(card) {
    var t = clean(card);

    return (
      /^Upcoming Reservations\b/.test(t) &&
      t.indexOf('No upcoming reservations detected') >= 0
    );
  }

  function hideCard(card) {
    if (!card) return;

    card.classList.add('pmd-v77-hidden-empty-card');
    card.setAttribute('data-pmd-v77-hidden-empty-card', 'true');

    hard(card, 'display', 'none');
    hard(card, 'visibility', 'hidden');
    hard(card, 'height', '0');
    hard(card, 'min-height', '0');
    hard(card, 'max-height', '0');
    hard(card, 'margin', '0');
    hard(card, 'padding', '0');
    hard(card, 'overflow', 'hidden');
  }

  function hideEmptyUpcomingAfterFloor(floor) {
    if (!floor) return [];

    var floorBottom = floor.getBoundingClientRect().bottom;

    var cards = $$('.pmd-v15-card')
      .filter(visible)
      .filter(function (card) {
        return card.getBoundingClientRect().y >= floorBottom - 20 && isEmptyUpcomingReservations(card);
      });

    cards.forEach(hideCard);

    return cards;
  }

  function isRealRoleCard(card) {
    if (!visible(card)) return false;

    if (!card.classList.contains('pmd-v15-card')) return false;
    if (card.classList.contains('pmd-v15-card--floor')) return false;
    if (card.id === 'pmd-v76-role-floor') return false;
    if (card.closest('#pmd-v76-role-floor')) return false;
    if (card.closest('[data-pmd-v76-hidden-old-floor="true"],.pmd-v76-hidden-old-floor')) return false;
    if (card.closest('[data-pmd-v77-hidden-empty-card="true"],.pmd-v77-hidden-empty-card')) return false;
    if (card.classList.contains('pmd-v15-card-head')) return false;
    if (card.classList.contains('pmd-v15-card-body')) return false;
    if (isEmptyUpcomingReservations(card)) return false;

    return true;
  }

  function collectCardsAfterFloor() {
    var floor = getFloor();
    var floorBottom = floor ? floor.getBoundingClientRect().bottom : 0;

    return $$('.pmd-v15-card')
      .filter(isRealRoleCard)
      .filter(function (card) {
        return card.getBoundingClientRect().y >= floorBottom - 20;
      })
      .sort(function (a, b) {
        var ar = a.getBoundingClientRect();
        var br = b.getBoundingClientRect();
        return ar.y - br.y || ar.x - br.x;
      });
  }

  function groupByCurrentRows(cards) {
    var rows = [];

    cards.forEach(function (card) {
      var r = card.getBoundingClientRect();
      var row = rows.find(function (x) {
        return Math.abs(x.y - r.y) <= 18;
      });

      if (!row) {
        row = { y: r.y, cards: [] };
        rows.push(row);
      }

      row.cards.push(card);
    });

    rows.forEach(function (row) {
      row.cards.sort(function (a, b) {
        return a.getBoundingClientRect().x - b.getBoundingClientRect().x;
      });
    });

    rows.sort(function (a, b) {
      return a.y - b.y;
    });

    return rows;
  }

  function chunkRows(rows) {
    var out = [];

    rows.forEach(function (row) {
      for (var i = 0; i < row.cards.length; i += 4) {
        out.push(row.cards.slice(i, i + 4));
      }
    });

    return out;
  }

  function hideIfEmpty(node) {
    if (!node || node === document.body || node === document.documentElement) return;

    var visibleChildren = Array.prototype.slice.call(node.children || []).filter(function (child) {
      var r = child.getBoundingClientRect();
      var cs = getComputedStyle(child);
      return cs.display !== 'none' && r.width > 5 && r.height > 5 && clean(child).length > 3;
    });

    if (!visibleChildren.length) {
      node.classList.add('pmd-v77-empty-wrapper');
      node.setAttribute('data-pmd-v77-empty-wrapper', 'true');

      hard(node, 'display', 'none');
      hard(node, 'height', '0');
      hard(node, 'min-height', '0');
      hard(node, 'max-height', '0');
      hard(node, 'margin', '0');
      hard(node, 'padding', '0');
      hard(node, 'overflow', 'hidden');
    }
  }

  function setupContainer(container) {
    container.className = 'pmd-v77-pack-container';
    hard(container, 'display', 'block');
    hard(container, 'width', '100%');
    hard(container, 'max-width', '100%');
    hard(container, 'margin', '0');
    hard(container, 'padding', '0');
    hard(container, 'overflow', 'visible');
  }

  function setupRow(row, count) {
    row.className = 'pmd-v77-pack-row pmd-v36-card-grid';

    hard(row, 'display', 'grid');
    hard(row, 'grid-template-columns', 'repeat(' + count + ', minmax(0, 1fr))');
    hard(row, 'gap', GAP + 'px');
    hard(row, 'width', '100%');
    hard(row, 'max-width', '100%');
    hard(row, 'margin', GAP + 'px 0 0 0');
    hard(row, 'padding', '0');
    hard(row, 'align-items', 'stretch');
    hard(row, 'grid-auto-flow', 'row');
    hard(row, 'transform', 'none');
    hard(row, 'transition', 'none');
    hard(row, 'animation', 'none');
  }

  function setupCard(card, index) {
    card.classList.add('pmd-v77-packed-card');

    hard(card, 'grid-column', (index + 1) + ' / ' + (index + 2));
    hard(card, 'order', String(index + 1));
    hard(card, 'width', '100%');
    hard(card, 'max-width', '100%');
    hard(card, 'min-width', '0');
    hard(card, 'margin', '0');
    hard(card, 'align-self', 'stretch');
    hard(card, 'transform', 'none');
    hard(card, 'transition', 'none');
    hard(card, 'animation', 'none');
  }

  function measureRows(container) {
    var rows = $$('.pmd-v77-pack-row', container);

    return rows.map(function (row) {
      var cards = Array.prototype.slice.call(row.children || []).filter(visible);
      var gaps = [];

      for (var i = 1; i < cards.length; i += 1) {
        gaps.push(Math.round(cards[i].getBoundingClientRect().x - cards[i - 1].getBoundingClientRect().right));
      }

      return {
        row: rect(row),
        count: cards.length,
        gaps: gaps,
        cards: cards.map(rect)
      };
    });
  }

  function packCurrentRole() {
    state.attempts += 1;

    var role = currentRole();

    if (!isTargetRole(role)) {
      state.last = {
        ok: true,
        skipped: true,
        role: role,
        reason: 'role-not-targeted-or-kds'
      };
      return true;
    }

    if (window.PMDRoleDashboardV76 && typeof window.PMDRoleDashboardV76.fix === 'function') {
      try { window.PMDRoleDashboardV76.fix(); } catch (ignore) {}
    }

    var floor = getFloor();

    if (!floor) {
      state.last = {
        ok: false,
        role: role,
        reason: 'floor-not-found'
      };
      return false;
    }

    var hiddenEmpty = hideEmptyUpcomingAfterFloor(floor);
    var cards = collectCardsAfterFloor();

    if (!cards.length) {
      state.last = {
        ok: false,
        role: role,
        reason: 'no-cards-after-floor',
        floor: rect(floor),
        hiddenEmptyCards: hiddenEmpty.map(rect)
      };
      return false;
    }

    var oldParents = [];
    cards.forEach(function (card) {
      if (card.parentElement && oldParents.indexOf(card.parentElement) < 0) {
        oldParents.push(card.parentElement);
      }
    });

    var grouped = chunkRows(groupByCurrentRows(cards));

    var container = document.getElementById('pmd-v77-pack-' + role);

    if (!container) {
      container = document.createElement('div');
      container.id = 'pmd-v77-pack-' + role;
    }

    setupContainer(container);

    if (floor.nextElementSibling !== container) {
      floor.insertAdjacentElement('afterend', container);
    }

    // Safe clear:
    // move cards out first, then replace rows.
    var cardSet = [];
    grouped.forEach(function (group) {
      group.forEach(function (card) {
        if (cardSet.indexOf(card) < 0) cardSet.push(card);
      });
    });

    var holding = document.createDocumentFragment();
    cardSet.forEach(function (card) {
      holding.appendChild(card);
    });

    container.replaceChildren();

    grouped.forEach(function (group, rowIndex) {
      var row = document.createElement('div');
      row.setAttribute('data-pmd-v77-row', String(rowIndex + 1));

      setupRow(row, group.length);

      group.forEach(function (card, index) {
        setupCard(card, index);
        row.appendChild(card);
      });

      container.appendChild(row);
    });

    oldParents.forEach(hideIfEmpty);

    var firstRow = container.querySelector('.pmd-v77-pack-row');
    var gapAfterFloor = firstRow
      ? Math.round(firstRow.getBoundingClientRect().y - floor.getBoundingClientRect().bottom)
      : null;

    var rows = measureRows(container);
    var badRows = rows.filter(function (row) {
      return row.gaps.some(function (g) {
        return Math.abs(g - GAP) > 3;
      });
    });

    state.last = {
      ok: Math.abs(gapAfterFloor - GAP) <= 3 && badRows.length === 0,
      role: role,
      gapAfterFloor: gapAfterFloor,
      movedCards: cards.length,
      hiddenEmptyCards: hiddenEmpty.map(rect),
      floor: rect(floor),
      rows: rows,
      badRows: badRows
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function start() {
    packCurrentRole();

    [0, 40, 100, 180, 300, 500, 800, 1200, 1800, 2600, 4000].forEach(function (ms) {
      setTimeout(packCurrentRole, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        [60, 140, 260, 500, 900, 1400, 2200, 3200].forEach(function (ms) {
          setTimeout(packCurrentRole, ms);
        });
      }, true);
    }

    console.info('[PMD] Role dashboard v77 card packer active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDRoleDashboardV77 = {
    fix: packCurrentRole,
    debug: function () {
      packCurrentRole();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_ROLE_DASHBOARD_V77_CARD_PACKER_END */


/* PMD_ROLE_DASHBOARD_V80_V32_OWNER_SKIN_START */
(function () {
  'use strict';

  if (window.PMD_ROLE_DASHBOARD_V80_V32_OWNER_SKIN) return;
  window.PMD_ROLE_DASHBOARD_V80_V32_OWNER_SKIN = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var TARGET_ROLES = ['manager', 'cashier', 'counter', 'waiter'];
  var GAP = 18;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 60 && r.height > 40 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      display: cs.display,
      visibility: cs.visibility,
      marginTop: cs.marginTop,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 220),
      text: clean(el).slice(0, 160)
    };
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isTarget(role) {
    return TARGET_ROLES.indexOf(role) >= 0;
  }

  function getKpiRow() {
    var kpis = $$('.pmd-v15-kpi,.pmd-kds-v44-card')
      .filter(visible)
      .filter(function (el) {
        return !el.classList.contains('pmd-v15-kpi-copy');
      });

    if (!kpis.length) return null;

    var p = kpis[0].parentElement;

    while (p && p !== document.body) {
      if (kpis.every(function (k) { return p.contains(k); })) return p;
      p = p.parentElement;
    }

    return kpis[0];
  }

  function findFloor() {
    var v76 = document.getElementById('pmd-v76-role-floor');
    if (v76 && visible(v76)) return v76;

    var kpi = getKpiRow();
    var kpiBottom = kpi ? kpi.getBoundingClientRect().bottom : 0;

    return $$('.pmd-shared-role-floor-v32-card,.pmd-v15-card--floor')
      .filter(visible)
      .sort(function (a, b) {
        var ar = a.getBoundingClientRect();
        var br = b.getBoundingClientRect();

        var as = 0;
        var bs = 0;

        if (ar.y >= kpiBottom - 30) as += 100;
        if (br.y >= kpiBottom - 30) bs += 100;

        if (Math.abs((ar.y - kpiBottom) - GAP) <= 6) as += 100;
        if (Math.abs((br.y - kpiBottom) - GAP) <= 6) bs += 100;

        as += Math.min(80, ar.width / 20);
        bs += Math.min(80, br.width / 20);

        return bs - as;
      })[0] || null;
  }

  function findActions(floor) {
    return floor && (
      floor.querySelector('.pmd-shared-role-floor-v32__actions') ||
      floor.querySelector('.pmd-owner-floor-v60__actions')
    );
  }

  function textButton(floor, pattern) {
    return $$('button,a', floor).find(function (btn) {
      return pattern.test(clean(btn));
    }) || null;
  }

  function controls(floor) {
    if (!floor) return {};

    return {
      edit: floor.querySelector('.pmd-owner-floor-v60__edit') || textButton(floor, /^Edit\b|Edit Floor/i),
      save: floor.querySelector('.pmd-owner-floor-v60__save') || textButton(floor, /^Save\b|Save layout/i),
      cancel: floor.querySelector('.pmd-owner-floor-v60__cancel') || textButton(floor, /^Cancel\b/i),
      toggle: floor.querySelector('.pmd-owner-floor-v60__toggle') || floor.querySelector('.pmd-v80-floor-toggle'),
      tables: $$('.pmd-owner-floor-v60__table,.pmd-shared-role-floor-v32__table,.pmd-v29-table-node,.pmd-v15-floor-node,[data-table-id],[data-pmd-table-id]', floor)
    };
  }

  function setTitle(floor) {
    var title =
      floor.querySelector('.pmd-shared-role-floor-v32__title strong') ||
      floor.querySelector('[data-pmd-v32-floor-title]') ||
      floor.querySelector('.pmd-owner-floor-v60__title span');

    if (title) title.textContent = '🍽️ Restaurant Floor';
  }

  function polishButtons(floor) {
    var c = controls(floor);

    if (c.edit) c.edit.textContent = 'Edit';
    if (c.save) c.save.textContent = 'Save layout';
    if (c.cancel) c.cancel.textContent = 'Cancel';

    $$('button,a', floor).forEach(function (btn) {
      var t = clean(btn);
      if (/^Refresh$/i.test(t) || /^Manage Tables$/i.test(t)) {
        btn.classList.add('pmd-v80-extra-floor-action');
      }
    });

    var actions = findActions(floor);

    if (actions && !floor.querySelector('.pmd-v80-floor-toggle')) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'pmd-v80-floor-toggle';
      toggle.textContent = floor.classList.contains('pmd-v80-expanded') ? '↙' : '↗';
      actions.appendChild(toggle);
    }
  }

  function setExpanded(floor, expanded) {
    floor.classList.toggle('pmd-v80-expanded', !!expanded);
    floor.classList.toggle('pmd-v80-collapsed', !expanded);

    var toggle = floor.querySelector('.pmd-v80-floor-toggle');
    if (toggle) toggle.textContent = expanded ? '↙' : '↗';
  }

  function setEditing(floor, editing) {
    floor.classList.toggle('pmd-v80-editing', !!editing);

    if (editing) {
      setExpanded(floor, true);
    }
  }

  function bind(floor) {
    if (!floor || floor.dataset.pmdV80Bound === 'true') return;

    floor.dataset.pmdV80Bound = 'true';

    floor.addEventListener('click', function (e) {
      var toggle = e.target.closest('.pmd-v80-floor-toggle');
      var edit = e.target.closest('button,a');
      var text = clean(edit);

      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        setEditing(floor, false);
        setExpanded(floor, !floor.classList.contains('pmd-v80-expanded'));
        return;
      }

      if (/^Edit\b|Edit Floor/i.test(text)) {
        setTimeout(function () {
          setEditing(floor, true);
          polishButtons(floor);
        }, 40);
        return;
      }

      if (/^Cancel\b/i.test(text) || /^Save\b|Save layout/i.test(text)) {
        setTimeout(function () {
          setEditing(floor, false);
          setExpanded(floor, false);
          polishButtons(floor);
        }, 180);
      }
    }, true);
  }

  function normalizeFloor(floor, role) {
    if (!floor) return null;

    floor.classList.add('pmd-v80-owner-skin-floor');
    floor.setAttribute('data-pmd-v80-role-floor', role);

    hard(floor, 'display', 'block');
    hard(floor, 'visibility', 'visible');
    hard(floor, 'opacity', '1');
    hard(floor, 'width', '100%');
    hard(floor, 'max-width', '100%');
    hard(floor, 'min-width', '0');
    hard(floor, 'margin', GAP + 'px 0 0 0');
    hard(floor, 'padding', '0');
    hard(floor, 'transform', 'none');
    hard(floor, 'transition', 'none');
    hard(floor, 'animation', 'none');

    if (!floor.classList.contains('pmd-v80-expanded') && !floor.classList.contains('pmd-v80-editing')) {
      floor.classList.add('pmd-v80-collapsed');
    }

    setTitle(floor);
    polishButtons(floor);
    bind(floor);

    return floor;
  }

  function apply() {
    state.attempts += 1;

    var role = currentRole();

    if (!isTarget(role)) {
      state.last = {
        ok: true,
        skipped: true,
        role: role,
        reason: 'role-not-targeted-or-kds'
      };
      return true;
    }

    try {
      if (window.PMDRoleDashboardV76 && typeof window.PMDRoleDashboardV76.fix === 'function') {
        window.PMDRoleDashboardV76.fix();
      }
    } catch (ignore) {}

    var floor = findFloor();

    if (!floor) {
      state.last = {
        ok: false,
        role: role,
        reason: 'floor-not-found'
      };
      return false;
    }

    floor = normalizeFloor(floor, role);

    try {
      if (window.PMDRoleDashboardV77 && typeof window.PMDRoleDashboardV77.fix === 'function') {
        window.PMDRoleDashboardV77.fix();
      }
    } catch (ignore) {}

    floor = normalizeFloor(findFloor() || floor, role);

    var kpi = getKpiRow();
    var gap = kpi && floor
      ? Math.round(floor.getBoundingClientRect().y - kpi.getBoundingClientRect().bottom)
      : null;

    var c = controls(floor);

    state.last = {
      ok:
        Math.abs((gap || GAP) - GAP) <= 4 &&
        !!c.edit &&
        !!c.save &&
        !!c.cancel &&
        !!floor.querySelector('.pmd-v80-floor-toggle'),
      role: role,
      gap: gap,
      floor: rect(floor),
      controls: {
        hasEdit: !!c.edit,
        hasSave: !!c.save,
        hasCancel: !!c.cancel,
        hasToggle: !!floor.querySelector('.pmd-v80-floor-toggle'),
        tableCount: c.tables.length
      }
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function start() {
    apply();

    [0, 50, 120, 240, 420, 700, 1000, 1500, 2400, 3600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        [80, 180, 350, 650, 1100, 1700, 2600].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Role dashboard v80 v32 owner skin active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDRoleDashboardV80 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_ROLE_DASHBOARD_V80_V32_OWNER_SKIN_END */


/* PMD_ROLE_DASHBOARD_V81_V32_CRISP_SURFACE_START */
(function () {
  'use strict';

  if (window.PMD_ROLE_DASHBOARD_V81_V32_CRISP_SURFACE) return;
  window.PMD_ROLE_DASHBOARD_V81_V32_CRISP_SURFACE = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var TARGET_ROLES = ['manager', 'cashier', 'counter', 'waiter'];
  var GAP = 18;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 40 && r.height > 30 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      display: cs.display,
      visibility: cs.visibility,
      overflow: cs.overflow,
      heightCss: cs.height,
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      marginTop: cs.marginTop,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 220),
      text: clean(el).slice(0, 160)
    };
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isTarget(role) {
    return TARGET_ROLES.indexOf(role) >= 0;
  }

  function getKpiRow() {
    var kpis = $$('.pmd-v15-kpi,.pmd-kds-v44-card')
      .filter(visible)
      .filter(function (el) {
        return !el.classList.contains('pmd-v15-kpi-copy');
      });

    if (!kpis.length) return null;

    var p = kpis[0].parentElement;

    while (p && p !== document.body) {
      if (kpis.every(function (k) { return p.contains(k); })) return p;
      p = p.parentElement;
    }

    return kpis[0];
  }

  function floor() {
    return document.getElementById('pmd-v76-role-floor');
  }

  function realSurface(floorEl) {
    if (!floorEl) return null;

    return floorEl.querySelector('.pmd-shared-role-floor-v32__surface,[data-pmd-v32-floor-surface]');
  }

  function v32Root(floorEl) {
    if (!floorEl) return null;

    return floorEl.querySelector('.pmd-shared-role-floor-v32,[data-pmd-v32-floor-root]');
  }

  function hideLegacy(el) {
    if (!el) return;

    el.classList.add('pmd-v81-legacy-floor-hidden');
    el.setAttribute('data-pmd-v81-legacy-floor-hidden', 'true');

    hard(el, 'display', 'none');
    hard(el, 'visibility', 'hidden');
    hard(el, 'opacity', '0');
    hard(el, 'width', '0');
    hard(el, 'height', '0');
    hard(el, 'min-width', '0');
    hard(el, 'min-height', '0');
    hard(el, 'max-width', '0');
    hard(el, 'max-height', '0');
    hard(el, 'margin', '0');
    hard(el, 'padding', '0');
    hard(el, 'overflow', 'hidden');
    hard(el, 'pointer-events', 'none');
  }

  function cleanLegacyInside(floorEl) {
    if (!floorEl) return 0;

    var hidden = 0;

    [
      '.pmd-v15-floor-tools',
      '.pmd-v15-floor-wrap',
      '.pmd-v15-floor-canvas',
      '.pmd-v15-floor-bg',
      '.pmd-v15-floor-node',
      '.pmd-shared-floor-v5-row'
    ].forEach(function (sel) {
      $$(sel, floorEl).forEach(function (el) {
        if (el.closest('.pmd-shared-role-floor-v32')) return;
        hideLegacy(el);
        hidden += 1;
      });
    });

    $$('.pmd-v15-card-actions', floorEl).forEach(function (el) {
      if (el.closest('.pmd-shared-role-floor-v32')) return;
      hideLegacy(el);
      hidden += 1;
    });

    $$('button,a', floorEl).forEach(function (btn) {
      var t = clean(btn);
      if (/^New Order$/i.test(t) || /^New Reservation$/i.test(t) || /^Main Floor/i.test(t)) {
        if (!btn.closest('.pmd-shared-role-floor-v32')) {
          hideLegacy(btn);
          hidden += 1;
        }
      }
    });

    return hidden;
  }

  function forceRealSurface(floorEl) {
    var surface = realSurface(floorEl);

    if (!surface) return null;

    var expanded = floorEl.classList.contains('pmd-v80-expanded') || floorEl.classList.contains('pmd-v80-editing');
    var h = expanded ? '540px' : '132px';

    hard(surface, 'display', 'block');
    hard(surface, 'position', 'relative');
    hard(surface, 'width', '100%');
    hard(surface, 'min-width', '0');
    hard(surface, 'height', h);
    hard(surface, 'min-height', h);
    hard(surface, 'max-height', h);
    hard(surface, 'margin', '8px 0 0 0');
    hard(surface, 'padding', '0');
    hard(surface, 'box-sizing', 'border-box');
    hard(surface, 'overflow', expanded ? 'visible' : 'hidden');

    $$('.pmd-shared-role-floor-v32__table,[data-pmd-v32-floor-table]', floorEl).forEach(function (table) {
      hard(table, 'position', 'absolute');
      hard(table, 'display', 'inline-flex');
      hard(table, 'align-items', 'center');
      hard(table, 'justify-content', 'center');
      hard(table, 'visibility', 'visible');
      hard(table, 'opacity', '1');
      hard(table, 'z-index', '2');
      hard(table, 'box-sizing', 'border-box');

      if (expanded) {
        hard(table, 'transform', 'none');
      } else {
        hard(table, 'transform', 'scale(.72)');
        hard(table, 'transform-origin', 'top left');
      }
    });

    return surface;
  }

  function controls(floorEl) {
    var buttons = $$('button,a', floorEl || document);

    function byText(re) {
      return buttons.find(function (btn) { return re.test(clean(btn)); }) || null;
    }

    return {
      edit: byText(/^Edit\b|Edit Floor/i),
      save: byText(/^Save\b|Save layout/i),
      cancel: byText(/^Cancel\b/i),
      toggle: floorEl && floorEl.querySelector('.pmd-v80-floor-toggle'),
      tables: floorEl ? $$('.pmd-shared-role-floor-v32__table,[data-pmd-v32-floor-table]', floorEl) : []
    };
  }

  function stabilizeState(floorEl, mode) {
    if (!floorEl) return;

    if (mode === 'collapse') {
      floorEl.classList.remove('pmd-v80-editing', 'pmd-v80-expanded');
      floorEl.classList.add('pmd-v80-collapsed');
    }

    if (mode === 'expand') {
      floorEl.classList.remove('pmd-v80-collapsed');
      floorEl.classList.add('pmd-v80-expanded');
    }

    if (mode === 'edit') {
      floorEl.classList.remove('pmd-v80-collapsed');
      floorEl.classList.add('pmd-v80-expanded', 'pmd-v80-editing');
    }

    var toggle = floorEl.querySelector('.pmd-v80-floor-toggle');
    if (toggle) {
      toggle.textContent = floorEl.classList.contains('pmd-v80-expanded') || floorEl.classList.contains('pmd-v80-editing') ? '↙' : '↗';
    }

    forceRealSurface(floorEl);
  }

  function bind(floorEl) {
    if (!floorEl || floorEl.dataset.pmdV81Bound === 'true') return;

    floorEl.dataset.pmdV81Bound = 'true';

    floorEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button,a');
      if (!btn || !floorEl.contains(btn)) return;

      var t = clean(btn);

      if (btn.classList.contains('pmd-v80-floor-toggle')) {
        setTimeout(function () {
          stabilizeState(floorEl, floorEl.classList.contains('pmd-v80-expanded') ? 'expand' : 'collapse');
        }, 30);

        setTimeout(function () { forceRealSurface(floorEl); }, 120);
        return;
      }

      if (/^Edit\b|Edit Floor/i.test(t)) {
        [40, 120, 260].forEach(function (ms) {
          setTimeout(function () { stabilizeState(floorEl, 'edit'); }, ms);
        });
        return;
      }

      if (/^Cancel\b/i.test(t) || /^Save\b|Save layout/i.test(t)) {
        [120, 260, 520, 900].forEach(function (ms) {
          setTimeout(function () { stabilizeState(floorEl, 'collapse'); }, ms);
        });
      }
    }, true);
  }

  function normalizeFloor(floorEl, role) {
    if (!floorEl) return null;

    floorEl.classList.add('pmd-v80-owner-skin-floor');
    floorEl.setAttribute('data-pmd-v81-crisp-role', role);

    var root = v32Root(floorEl);
    if (root) {
      hard(root, 'display', 'block');
      hard(root, 'position', 'relative');
      hard(root, 'width', '100%');
      hard(root, 'min-width', '0');
      hard(root, 'margin', '0');
      hard(root, 'padding', '14px 16px');
      hard(root, 'box-sizing', 'border-box');
      hard(root, 'overflow', 'visible');
    }

    hard(floorEl, 'display', 'block');
    hard(floorEl, 'visibility', 'visible');
    hard(floorEl, 'opacity', '1');
    hard(floorEl, 'width', '100%');
    hard(floorEl, 'max-width', '100%');
    hard(floorEl, 'min-width', '0');
    hard(floorEl, 'margin', GAP + 'px 0 0 0');
    hard(floorEl, 'padding', '0');
    hard(floorEl, 'transform', 'none');
    hard(floorEl, 'transition', 'none');
    hard(floorEl, 'animation', 'none');

    if (!floorEl.classList.contains('pmd-v80-expanded') && !floorEl.classList.contains('pmd-v80-editing')) {
      floorEl.classList.add('pmd-v80-collapsed');
    }

    cleanLegacyInside(floorEl);
    forceRealSurface(floorEl);
    bind(floorEl);

    return floorEl;
  }

  function apply() {
    state.attempts += 1;

    var role = currentRole();

    if (!isTarget(role)) {
      state.last = {
        ok: true,
        skipped: true,
        role: role,
        reason: 'role-not-targeted-or-kds'
      };
      return true;
    }

    try {
      if (window.PMDRoleDashboardV76 && typeof window.PMDRoleDashboardV76.fix === 'function') {
        window.PMDRoleDashboardV76.fix();
      }
      if (window.PMDRoleDashboardV77 && typeof window.PMDRoleDashboardV77.fix === 'function') {
        window.PMDRoleDashboardV77.fix();
      }
      if (window.PMDRoleDashboardV80 && typeof window.PMDRoleDashboardV80.fix === 'function') {
        window.PMDRoleDashboardV80.fix();
      }
    } catch (ignore) {}

    var f = normalizeFloor(floor(), role);

    if (!f) {
      state.last = { ok: false, role: role, reason: 'floor-not-found' };
      return false;
    }

    var kpi = getKpiRow();
    var gap = kpi ? Math.round(f.getBoundingClientRect().y - kpi.getBoundingClientRect().bottom) : null;
    var surface = realSurface(f);
    var c = controls(f);
    var legacyVisible = $$('.pmd-v15-floor-node,.pmd-v15-floor-wrap', f).filter(visible).length;

    state.last = {
      ok:
        Math.abs((gap || GAP) - GAP) <= 6 &&
        !!surface &&
        c.tables.length > 0 &&
        legacyVisible === 0 &&
        !!c.edit &&
        !!c.save &&
        !!c.cancel &&
        !!c.toggle,
      role: role,
      gap: gap,
      floor: rect(f),
      surface: rect(surface),
      controls: {
        hasEdit: !!c.edit,
        hasSave: !!c.save,
        hasCancel: !!c.cancel,
        hasToggle: !!c.toggle,
        tableCount: c.tables.length,
        legacyVisible: legacyVisible
      }
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function start() {
    apply();

    [0, 50, 120, 260, 500, 900, 1400, 2200, 3400].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        [80, 180, 360, 700, 1200, 1900, 3000].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Role dashboard v81 v32 crisp surface active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDRoleDashboardV81 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_ROLE_DASHBOARD_V81_V32_CRISP_SURFACE_END */


/* PMD_ROLE_DASHBOARD_V82_NO_LOADER_ANTIFLASH_START */
(function () {
  'use strict';

  if (window.PMD_ROLE_DASHBOARD_V82_NO_LOADER_ANTIFLASH) return;
  window.PMD_ROLE_DASHBOARD_V82_NO_LOADER_ANTIFLASH = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function removeBladeLoader() {
    var re = /Loading PayMyDine Role Dashboard|Preparing live restaurant floor|connected operational widgets/i;

    Array.prototype.slice.call(document.querySelectorAll('strong,small,div,section,article'))
      .forEach(function (el) {
        var t = clean(el);
        if (!re.test(t)) return;

        var card = el.closest('.card,.pmd-v15-card,.pmd-v31-card,.pmd-role-loader,[class*="loader"],[class*="loading"]') || el;

        if (card && card.parentNode) {
          card.parentNode.removeChild(card);
        }
      });
  }

  function preparing() {
    document.documentElement.classList.add('pmd-v82-role-preparing');
    document.documentElement.classList.remove('pmd-v82-role-ready');
  }

  function ready(reason) {
    document.documentElement.classList.remove('pmd-v82-role-preparing');
    document.documentElement.classList.add('pmd-v82-role-ready');

    state.last = {
      ok: true,
      role: currentRole(),
      reason: reason || 'ready'
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();
  }

  function runFixes() {
    state.attempts += 1;
    removeBladeLoader();

    try { window.PMDRoleDashboardV76 && window.PMDRoleDashboardV76.fix && window.PMDRoleDashboardV76.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV77 && window.PMDRoleDashboardV77.fix && window.PMDRoleDashboardV77.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV80 && window.PMDRoleDashboardV80.fix && window.PMDRoleDashboardV80.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV81 && window.PMDRoleDashboardV81.fix && window.PMDRoleDashboardV81.fix(); } catch (e) {}
  }

  function settle(label) {
    preparing();

    [0, 30, 80, 140, 240, 420, 700, 1050].forEach(function (ms) {
      setTimeout(runFixes, ms);
    });

    setTimeout(function () {
      runFixes();
      ready(label || 'settled');
    }, 1150);

    // failsafe: never leave dashboard hidden
    setTimeout(function () {
      ready('failsafe');
    }, 2200);
  }

  function start() {
    removeBladeLoader();
    settle('initial');

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        settle('role-switch');
      }, true);
    }

    window.addEventListener('pageshow', function () {
      removeBladeLoader();
      settle('pageshow');
    });

    console.info('[PMD] Role dashboard v82 no-loader anti-flash active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDRoleDashboardV82 = {
    fix: function () {
      settle('manual');
      return true;
    },
    debug: function () {
      removeBladeLoader();
      runFixes();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice(),
        htmlClass: document.documentElement.className,
        loaderTextLeft: /Loading PayMyDine Role Dashboard|Preparing live restaurant floor|connected operational widgets/i.test(document.body.innerText || '')
      };
    }
  };
})();
 /* PMD_ROLE_DASHBOARD_V82_NO_LOADER_ANTIFLASH_END */


/* PMD_ROLE_DASHBOARD_V83_OWNER_LIKE_SMALL_FLOOR_START */
(function () {
  'use strict';

  if (window.PMD_ROLE_DASHBOARD_V83_OWNER_LIKE_SMALL_FLOOR) return;
  window.PMD_ROLE_DASHBOARD_V83_OWNER_LIKE_SMALL_FLOOR = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var TARGET_ROLES = ['manager', 'cashier', 'counter', 'waiter'];
  var state = { attempts: 0, last: null, history: [] };

  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isTarget(role) {
    return TARGET_ROLES.indexOf(role) >= 0;
  }

  function floor() {
    return document.getElementById('pmd-v76-role-floor');
  }

  function surface(f) {
    return f && f.querySelector('.pmd-shared-role-floor-v32__surface,[data-pmd-v32-floor-surface]');
  }

  function root(f) {
    return f && f.querySelector('.pmd-shared-role-floor-v32,[data-pmd-v32-floor-root]');
  }

  function tables(f) {
    return f ? $$('.pmd-shared-role-floor-v32__table,[data-pmd-v32-floor-table]', f) : [];
  }

  function numFromTable(t, fallback) {
    var raw = [
      t.dataset.no,
      t.dataset.tableNo,
      t.dataset.id,
      t.dataset.tableId,
      t.dataset.pmdTableId,
      t.dataset.pmdV32FloorTable,
      clean(t)
    ].filter(Boolean).join(' ');

    var m = raw.match(/\b(?:T|Table\s*)?(\d+)\b/i);
    return m ? m[1] : String(fallback + 1);
  }

  function normalizeLabel(table, index) {
    var n = numFromTable(table, index);
    table.dataset.pmdV83No = n;
    table.textContent = n;
    table.setAttribute('aria-label', 'Table ' + n);
  }

  function normalizePositions(f) {
    var s = surface(f);
    if (!s) return;

    var list = tables(f);

    list.forEach(function (table, index) {
      normalizeLabel(table, index);

      hard(table, 'width', '68px');
      hard(table, 'min-width', '68px');
      hard(table, 'max-width', '68px');
      hard(table, 'height', '46px');
      hard(table, 'min-height', '46px');
      hard(table, 'max-height', '46px');
      hard(table, 'padding', '8px 16px');
      hard(table, 'display', 'grid');
      hard(table, 'place-items', 'center');
      hard(table, 'border-radius', '999px');
      hard(table, 'background', '#fff');
      hard(table, 'color', '#071225');
      hard(table, 'box-shadow', '0 12px 28px rgba(15,23,42,.14)');
      hard(table, 'font-size', '21px');
      hard(table, 'font-weight', '950');
      hard(table, 'line-height', '22px');
      hard(table, 'text-align', 'center');
      hard(table, 'white-space', 'nowrap');
      hard(table, 'overflow', 'visible');
      hard(table, 'transform', 'translate(-34px, -23px)');
      hard(table, 'transform-origin', 'center center');

      // If old V32 has huge/outside px positions, clamp into visible small owner-like surface.
      var left = parseFloat(table.style.left || '');
      var top = parseFloat(table.style.top || '');

      if (!Number.isFinite(left)) left = 120 + index * 130;
      if (!Number.isFinite(top)) top = 54;

      // Keep same relative order but prevent table from going outside collapsed small view.
      var maxLeft = Math.max(120, s.clientWidth - 90);
      var maxTop = 82;

      if (left < 60 || left > maxLeft + 80) {
        left = 120 + index * 130;
      }

      if (top < 35 || top > maxTop + 80) {
        top = 54;
      }

      hard(table, 'left', Math.round(left) + 'px');
      hard(table, 'top', Math.round(top) + 'px');
    });
  }

  function normalizeFloor(f, role) {
    if (!f) return false;

    f.classList.add('pmd-v83-owner-like-small-floor');
    f.setAttribute('data-pmd-v83-role', role);

    hard(f, 'height', f.classList.contains('pmd-v80-expanded') || f.classList.contains('pmd-v80-editing') ? '653px' : '213px');
    hard(f, 'min-height', f.classList.contains('pmd-v80-expanded') || f.classList.contains('pmd-v80-editing') ? '653px' : '213px');
    hard(f, 'max-height', f.classList.contains('pmd-v80-expanded') || f.classList.contains('pmd-v80-editing') ? 'none' : '213px');
    hard(f, 'padding', '14px 14px 15px');
    hard(f, 'border-radius', '24px');
    hard(f, 'overflow', f.classList.contains('pmd-v80-expanded') || f.classList.contains('pmd-v80-editing') ? 'visible' : 'hidden');
    hard(f, 'background', '#fff');
    hard(f, 'box-shadow', '0 18px 45px rgba(15,23,42,.08)');
    hard(f, 'color', '#071225');

    var r = root(f);
    if (r) {
      hard(r, 'padding', '0');
      hard(r, 'margin', '0');
      hard(r, 'width', '100%');
      hard(r, 'height', '100%');
      hard(r, 'min-height', '0');
      hard(r, 'overflow', 'visible');
      hard(r, 'background', 'transparent');
      hard(r, 'box-shadow', 'none');
      hard(r, 'border', '0');
    }

    var s = surface(f);
    if (s) {
      var expanded = f.classList.contains('pmd-v80-expanded') || f.classList.contains('pmd-v80-editing');
      hard(s, 'display', 'block');
      hard(s, 'position', 'relative');
      hard(s, 'width', '100%');
      hard(s, 'height', expanded ? '540px' : '108px');
      hard(s, 'min-height', expanded ? '540px' : '108px');
      hard(s, 'max-height', expanded ? '540px' : '108px');
      hard(s, 'margin', '0');
      hard(s, 'padding', '0');
      hard(s, 'overflow-x', expanded ? 'visible' : 'auto');
      hard(s, 'overflow-y', expanded ? 'visible' : 'hidden');
      hard(s, 'border-radius', '20px');
      hard(s, 'background', 'transparent');
      hard(s, 'box-shadow', 'none');
    }

    var title = f.querySelector('.pmd-shared-role-floor-v32__title strong');
    if (title) title.textContent = '🍽️ Restaurant Floor';

    normalizePositions(f);

    return true;
  }

  function apply() {
    state.attempts += 1;

    var role = currentRole();

    if (!isTarget(role)) {
      state.last = { ok: true, skipped: true, role: role };
      return true;
    }

    try { window.PMDRoleDashboardV76 && window.PMDRoleDashboardV76.fix && window.PMDRoleDashboardV76.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV77 && window.PMDRoleDashboardV77.fix && window.PMDRoleDashboardV77.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV80 && window.PMDRoleDashboardV80.fix && window.PMDRoleDashboardV80.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV81 && window.PMDRoleDashboardV81.fix && window.PMDRoleDashboardV81.fix(); } catch (e) {}

    var f = floor();
    var ok = normalizeFloor(f, role);
    var s = surface(f);
    var list = tables(f);

    state.last = {
      ok: !!ok && !!s && list.length === 4,
      role: role,
      floorH: f ? Math.round(f.getBoundingClientRect().height) : null,
      surfaceH: s ? Math.round(s.getBoundingClientRect().height) : null,
      tables: list.map(function (t) {
        var r = t.getBoundingClientRect();
        return {
          text: clean(t),
          w: Math.round(r.width),
          h: Math.round(r.height),
          left: t.style.left,
          top: t.style.top
        };
      })
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function start() {
    apply();

    [0, 40, 90, 160, 280, 500, 850, 1300, 2100].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        [0, 30, 70, 130, 220, 380, 650, 1050, 1600, 2400].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    document.addEventListener('click', function (e) {
      var f = floor();
      if (!f || !f.contains(e.target)) return;

      if (
        e.target.closest('.pmd-v80-floor-toggle') ||
        /^Edit\b|Edit Floor|Cancel|Save\b|Save layout/i.test(clean(e.target.closest('button,a')))
      ) {
        [40, 120, 260, 520].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }
    }, true);

    console.info('[PMD] Role dashboard v83 owner-like small floor active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDRoleDashboardV83 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_ROLE_DASHBOARD_V83_OWNER_LIKE_SMALL_FLOOR_END */


/* PMD_OWNER_DASHBOARD_V85_SAFE_CONTENT_POLISH_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V85_SAFE_CONTENT_POLISH) return;
  window.PMD_OWNER_DASHBOARD_V85_SAFE_CONTENT_POLISH = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isKds() {
    return currentRole() === 'kds';
  }

  function textNodes(root) {
    if (!root) return [];

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];

    while (walker.nextNode()) nodes.push(walker.currentNode);

    return nodes;
  }

  function replaceText(root, from, to) {
    if (!root) return 0;

    var count = 0;

    textNodes(root).forEach(function (node) {
      var before = node.nodeValue;
      var after = before.replace(from, to);

      if (after !== before) {
        node.nodeValue = after;
        count += 1;
      }
    });

    return count;
  }

  function cardByText(re) {
    return $$('.pmd-v15-card,.pmd-v15-kpi,.pmd-owner-floor-v60,#pmd-v76-role-floor')
      .find(function (el) {
        return re.test(clean(el));
      }) || null;
  }

  function visible(el) {
    if (!el) return false;

    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);

    return r.width > 20 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function hideDuplicateOldFloor() {
    var floors = $$('.pmd-v15-card--floor,.pmd-shared-role-floor-v32-card,.pmd-v37-owner-floor-card')
      .filter(function (el) {
        var t = clean(el);
        return t.indexOf('Live Restaurant Floor') >= 0 || t.indexOf('RefreshNew OrderMain Floor') >= 0;
      });

    var hidden = 0;

    floors.forEach(function (el) {
      if (el.closest('#pmd-v76-role-floor')) return;
      if (el.classList.contains('pmd-owner-floor-v60')) return;

      el.classList.add('pmd-v85-hidden-duplicate-floor');
      el.setAttribute('data-pmd-v85-hidden-duplicate-floor', 'true');

      [
        ['display', 'none'],
        ['visibility', 'hidden'],
        ['opacity', '0'],
        ['height', '0'],
        ['min-height', '0'],
        ['max-height', '0'],
        ['margin', '0'],
        ['padding', '0'],
        ['overflow', 'hidden'],
        ['pointer-events', 'none']
      ].forEach(function (pair) {
        el.style.setProperty(pair[0], pair[1], 'important');
      });

      hidden += 1;
    });

    return hidden;
  }

  function floorButtonsClean() {
    $$('.pmd-owner-floor-v60,#pmd-v76-role-floor').forEach(function (floor) {
      var editing =
        floor.classList.contains('is-editing') ||
        floor.classList.contains('pmd-v80-editing');

      $$('button,a', floor).forEach(function (btn) {
        var t = clean(btn);

        if (/^Save layout$|^Save$/i.test(t)) {
          btn.classList.add('pmd-v85-floor-save');
          btn.textContent = 'Save layout';
          btn.style.setProperty('display', editing ? 'inline-flex' : 'none', 'important');
        }

        if (/^Cancel$/i.test(t)) {
          btn.classList.add('pmd-v85-floor-cancel');
          btn.textContent = 'Cancel';
          btn.style.setProperty('display', editing ? 'inline-flex' : 'none', 'important');
        }

        if (/^Edit$|^Edit Floor$/i.test(t)) {
          btn.classList.add('pmd-v85-floor-edit');
          btn.textContent = 'Edit';
          btn.style.setProperty('display', editing ? 'none' : 'inline-flex', 'important');
        }
      });
    });
  }

  function replaceTopServersWithReservation() {
    var servers = cardByText(/Top Servers|Team members detected/i);

    if (!servers) return false;

    servers.classList.add('pmd-v85-next-reservation');
    servers.setAttribute('data-pmd-v85-was-top-servers', 'true');

    if (servers.dataset.pmdV85ReservationReady === 'true') return true;

    servers.dataset.pmdV85ReservationReady = 'true';

    servers.innerHTML =
      '<header class="pmd-v15-card-head">' +
        '<div>' +
          '<h3>Next Reservation</h3>' +
          '<p>Reservation status</p>' +
        '</div>' +
      '</header>' +
      '<div class="pmd-v15-card-body">' +
        '<div class="pmd-v85-reservation-box">' +
          '<strong class="pmd-v85-reservation-dash">—</strong>' +
          '<b class="pmd-v85-reservation-title">No upcoming reservations</b>' +
          '<small class="pmd-v85-reservation-copy">Reservation details will appear here once the reservation backend is connected.</small>' +
        '</div>' +
      '</div>';

    return true;
  }

  function polishTexts() {
    var timeline = cardByText(/Live Timeline|Recent Activity/i);
    var alerts = cardByText(/AI Alerts|Needs Attention/i);
    var revenue = cardByText(/Revenue by Hour|Sales Trend/i);
    var payment = cardByText(/Payment Breakdown|Payments/i);
    var kitchen = cardByText(/Kitchen Performance|Kitchen Status/i);
    var items = cardByText(/Top Selling Items/i);
    var quick = cardByText(/Quick Actions/i);
    var avg = cardByText(/Average Guest Spend/i);
    var lost = cardByText(/Lost Revenue/i);

    if (timeline) {
      replaceText(timeline, /Live Timeline/g, 'Recent Activity');
      replaceText(timeline, /Latest recorded orders and reservations/g, 'Latest restaurant activity');
    }

    if (alerts) {
      replaceText(alerts, /AI Alerts/g, 'Needs Attention');
      replaceText(alerts, /Owner-relevant connected issues/g, 'Actionable owner issues');
      replaceText(alerts, /Operational alerts for manager action/g, 'Actionable operational issues');
      replaceText(alerts, /Open check value/g, 'Pending value');
      replaceText(alerts, /Old table references/g, 'Table data check');
      replaceText(alerts, /Some open orders still use legacy table references/g, 'Some orders need table data cleanup');
    }

    if (revenue) {
      replaceText(revenue, /Revenue by Hour/g, 'Sales Trend');
      replaceText(revenue, /Connected to real orders; today may be zero/g, 'Today’s sales and order activity');
      replaceText(revenue, /today · recent live order trend below/g, 'today · recent order trend');
      replaceText(revenue, /All-time context:/g, 'All-time sales:');
    }

    if (payment) {
      replaceText(payment, /Payment Breakdown/g, 'Payments');
      replaceText(payment, /Open-check fallback until payment transactions exist/g, 'Payment methods and pending value');
      replaceText(payment, /Payment table is empty; showing current open-check value\./g, 'Payment methods will appear once transactions are connected.');
      replaceText(payment, /Open \/ pending/g, 'Pending');
    }

    if (kitchen) {
      replaceText(kitchen, /Kitchen Performance/g, 'Kitchen Status');
      replaceText(kitchen, /Prep time, delay risk, queue and KDS health/g, 'Prep, delays and rush level');
      replaceText(kitchen, /from prep estimate when available/g, 'when connected');
      replaceText(kitchen, /estimated from open kitchen rows/g, 'from kitchen rows');
    }

    if (items) {
      replaceText(items, /Items currently sitting inside open checks/g, 'Based on open checks for now');
    }

    if (quick) {
      replaceText(quick, /Fast owner\/manager actions/g, 'Fast owner actions');
    }

    if (avg) {
      replaceText(avg, /payment transactions table is empty/g, 'payments will appear once connected');
    }

    if (lost) {
      replaceText(lost, /No-shows, cancellations, and open-check risk/g, 'No-shows, cancellations and risk');
    }

    return {
      timeline: !!timeline,
      alerts: !!alerts,
      revenue: !!revenue,
      payment: !!payment,
      kitchen: !!kitchen,
      items: !!items,
      quick: !!quick,
      topServersReplaced: replaceTopServersWithReservation()
    };
  }

  function audit() {
    var duplicateOldFloorsVisible = $$('.pmd-v15-card--floor,.pmd-shared-role-floor-v32-card')
      .filter(visible)
      .filter(function (el) {
        return !el.closest('#pmd-v76-role-floor') && !el.classList.contains('pmd-owner-floor-v60');
      })
      .map(function (el) {
        return clean(el).slice(0, 100);
      });

    var cards = $$('.pmd-v15-kpi,.pmd-v15-card,.pmd-owner-floor-v60,#pmd-v76-role-floor')
      .filter(visible)
      .map(function (el) {
        var r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: clean(el).slice(0, 120),
          cls: String(el.className || '').slice(0, 160)
        };
      });

    return {
      duplicateOldFloorsVisible: duplicateOldFloorsVisible,
      hasTopServers: /Top Servers/i.test(document.body.innerText || ''),
      hasNextReservation: /Next Reservation/i.test(document.body.innerText || ''),
      hasRecentActivity: /Recent Activity/i.test(document.body.innerText || ''),
      hasNeedsAttention: /Needs Attention/i.test(document.body.innerText || ''),
      cards: cards
    };
  }

  function apply() {
    state.attempts += 1;

    if (isKds()) {
      state.last = {
        ok: true,
        skipped: true,
        role: currentRole(),
        reason: 'kds-untouched'
      };
      return true;
    }

    try { window.PMDRoleDashboardV83 && window.PMDRoleDashboardV83.fix && window.PMDRoleDashboardV83.fix(); } catch (e) {}

    var hiddenDuplicateFloors = hideDuplicateOldFloor();
    floorButtonsClean();
    var polished = polishTexts();

    state.last = {
      ok: true,
      role: currentRole(),
      hiddenDuplicateFloors: hiddenDuplicateFloors,
      polished: polished,
      audit: audit()
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return true;
  }

  function start() {
    apply();

    [0, 60, 140, 300, 600, 1000, 1600, 2400].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');

    if (rail) {
      rail.addEventListener('click', function () {
        [40, 120, 260, 520, 900, 1400, 2200].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    document.addEventListener('click', function (e) {
      if (
        e.target.closest('.pmd-v80-floor-toggle') ||
        e.target.closest('.pmd-owner-floor-v60__edit,.pmd-owner-floor-v60__save,.pmd-owner-floor-v60__cancel') ||
        /Edit|Save layout|Cancel/i.test(clean(e.target.closest('button,a')))
      ) {
        [40, 120, 260, 520].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }
    }, true);

    console.info('[PMD] Owner dashboard v85 safe content polish active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV85 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V85_SAFE_CONTENT_POLISH_END */


/* PMD_OWNER_DASHBOARD_V86_MICRO_POLISH_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V86_MICRO_POLISH) return;
  window.PMD_OWNER_DASHBOARD_V86_MICRO_POLISH = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isKds() {
    return currentRole() === 'kds';
  }

  function textNodes(root) {
    if (!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function replaceText(root, from, to) {
    if (!root) return 0;
    var count = 0;

    textNodes(root).forEach(function (node) {
      var before = node.nodeValue;
      var after = before.replace(from, to);
      if (after !== before) {
        node.nodeValue = after;
        count += 1;
      }
    });

    return count;
  }

  function cardByText(re) {
    return $$('.pmd-v15-card,.pmd-v15-kpi,.pmd-owner-floor-v60,#pmd-v76-role-floor')
      .find(function (el) {
        return re.test(clean(el));
      }) || null;
  }

  function polishPaymentCopy() {
    var card = cardByText(/Payments|Payment Breakdown|Pending.*€|Paid today/i);
    if (!card) return false;

    card.classList.add('pmd-v86-payment-polished');

    replaceText(card, /Pending€([0-9.,]+)/g, 'Pending €$1');
    replaceText(card, /Paid today€([0-9.,]+)/g, 'Paid today €$1');
    replaceText(card, /Payment methods will appear once transactions are connected\./g, 'Payment methods will appear once connected.');

    // Add spacing classes only around obvious payment rows; no structure move.
    $$('div,li,p,span', card).forEach(function (el) {
      var t = clean(el);

      if (/Pending\s*€|Paid today\s*€/i.test(t) && t.length < 80) {
        el.classList.add('pmd-v86-pay-row');
      }

      if (/Payment methods will appear once connected/i.test(t)) {
        el.classList.add('pmd-v86-soft-copy');
      }
    });

    return true;
  }

  function polishAverageCopy() {
    var card = cardByText(/Average Guest Spend/i);
    if (!card) return false;

    replaceText(card, /All-time average because today has no completed orders/g, 'All-time average until today has completed orders');
    replaceText(card, /5 open check\(s\); payments will appear once connected/g, '5 open checks pending payment connection');
    replaceText(card, /5 open check\(s\); payment transactions table is empty/g, '5 open checks pending payment connection');

    $$('p,small,div', card).forEach(function (el) {
      if (/All-time average|pending payment connection|payments will appear/i.test(clean(el))) {
        el.classList.add('pmd-v86-soft-copy');
      }
    });

    return true;
  }

  function polishLostCopy() {
    var card = cardByText(/Lost Revenue/i);
    if (!card) return false;

    replaceText(card, /confirmed lost revenue today/g, 'confirmed lost today');
    replaceText(card, /Open check risk/g, 'Pending check risk');

    return true;
  }

  function polishReservationCopy() {
    var card = cardByText(/Next Reservation/i);
    if (!card) return false;

    replaceText(card, /Reservation details will appear here once the reservation backend is connected\./g, 'Live reservation details will appear once connected.');

    $$('small,p,div', card).forEach(function (el) {
      if (/Live reservation details|Reservation status/i.test(clean(el))) {
        el.classList.add('pmd-v86-soft-copy');
      }
    });

    return true;
  }

  function polishQuickActions() {
    var card = cardByText(/Quick Actions/i);
    if (!card) return false;

    card.classList.add('pmd-v86-actions-polished');

    replaceText(card, /Fast owner\/manager actions/g, 'Fast owner actions');
    replaceText(card, /Send Message/g, 'Message');

    return true;
  }

  function keepV85Alive() {
    try { window.PMDOwnerDashboardV85 && window.PMDOwnerDashboardV85.fix && window.PMDOwnerDashboardV85.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV83 && window.PMDRoleDashboardV83.fix && window.PMDRoleDashboardV83.fix(); } catch (e) {}
  }

  function audit() {
    return {
      hasV85: !!window.PMD_OWNER_DASHBOARD_V85_SAFE_CONTENT_POLISH,
      hasTopServers: /Top Servers/i.test(document.body.innerText || ''),
      hasNextReservation: /Next Reservation/i.test(document.body.innerText || ''),
      hasPayments: /Payments/i.test(document.body.innerText || ''),
      hasPendingJoined: /Pending€/.test(document.body.innerText || ''),
      hasPaidJoined: /Paid today€/.test(document.body.innerText || ''),
      hasOldDuplicateFloor: $$('.pmd-v15-card--floor,.pmd-shared-role-floor-v32-card')
        .filter(function (el) {
          var cs = getComputedStyle(el);
          return cs.display !== 'none' && !el.closest('#pmd-v76-role-floor') && !el.classList.contains('pmd-owner-floor-v60');
        })
        .length
    };
  }

  function apply() {
    state.attempts += 1;

    if (isKds()) {
      state.last = { ok: true, skipped: true, role: currentRole(), reason: 'kds-untouched' };
      return true;
    }

    keepV85Alive();

    var result = {
      payment: polishPaymentCopy(),
      average: polishAverageCopy(),
      lost: polishLostCopy(),
      reservation: polishReservationCopy(),
      quick: polishQuickActions()
    };

    state.last = {
      ok: true,
      role: currentRole(),
      result: result,
      audit: audit()
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return true;
  }

  function start() {
    apply();

    [0, 80, 180, 420, 800, 1400, 2200].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        [80, 180, 420, 800, 1400].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Owner dashboard v86 micro polish active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV86 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V86_MICRO_POLISH_END */


/* PMD_OWNER_DASHBOARD_V87_PAYMENT_ACTIONS_POLISH_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V87_PAYMENT_ACTIONS_POLISH) return;
  window.PMD_OWNER_DASHBOARD_V87_PAYMENT_ACTIONS_POLISH = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isKds() {
    return currentRole() === 'kds';
  }

  function cardByText(re) {
    return $$('.pmd-v15-card,.pmd-v15-kpi,.pmd-owner-floor-v60,#pmd-v76-role-floor')
      .find(function (el) {
        return re.test(clean(el));
      }) || null;
  }

  function textNodes(root) {
    if (!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function replaceText(root, from, to) {
    if (!root) return 0;
    var count = 0;

    textNodes(root).forEach(function (node) {
      var before = node.nodeValue;
      var after = before.replace(from, to);
      if (after !== before) {
        node.nodeValue = after;
        count += 1;
      }
    });

    return count;
  }

  function nearestPaymentRow(card, el) {
    var p = el;
    var steps = 0;

    while (p && p !== card && steps < 6) {
      var t = clean(p);
      if (/(Pending|Paid today)/i.test(t) && /€\s?[\d.,]+/.test(t) && t.length < 90) {
        return p;
      }
      p = p.parentElement;
      steps += 1;
    }

    return null;
  }

  function ensureSpaceBefore(el) {
    if (!el || !el.parentNode) return;

    var prev = el.previousSibling;

    if (prev && prev.nodeType === Node.TEXT_NODE && /\s$/.test(prev.nodeValue || '')) return;

    if (prev && prev.nodeType === Node.TEXT_NODE) {
      prev.nodeValue = (prev.nodeValue || '') + ' ';
      return;
    }

    el.parentNode.insertBefore(document.createTextNode(' '), el);
  }

  function fixPayments() {
    var card = cardByText(/Payments|Payment Breakdown|Pending\s*€|Paid today\s*€/i);
    if (!card) return { found: false };

    card.classList.add('pmd-v87-payment-polished');

    replaceText(card, /Pending€([0-9.,]+)/g, 'Pending €$1');
    replaceText(card, /Paid today€([0-9.,]+)/g, 'Paid today €$1');
    replaceText(card, /Payment methods will appear once transactions are connected\./g, 'Payment methods will appear once connected.');

    var valueCount = 0;
    var rowCount = 0;

    $$('*', card).forEach(function (el) {
      var t = clean(el);

      if (/^€\s?[\d.,]+$/.test(t)) {
        var row = nearestPaymentRow(card, el);
        if (row) {
          row.classList.add('pmd-v87-payment-row');
          el.classList.add('pmd-v87-payment-value');
          ensureSpaceBefore(el);
          valueCount += 1;
        }
      }

      if (/^(Pending|Paid today)$/i.test(t)) {
        el.classList.add('pmd-v87-payment-label');
      }

      if (/(Pending|Paid today)\s*€/.test(t) && t.length < 90) {
        el.classList.add('pmd-v87-payment-row');
        rowCount += 1;
      }
    });

    return {
      found: true,
      valueCount: valueCount,
      rowCount: rowCount,
      joinedPendingLeft: /Pending€/.test(clean(card)),
      joinedPaidLeft: /Paid today€/.test(clean(card))
    };
  }

  function findActionTile(labelEl, card) {
    var p = labelEl;
    var steps = 0;

    while (p && p !== card && steps < 6) {
      var r = p.getBoundingClientRect();
      if (r.width >= 80 && r.height >= 50) return p;
      p = p.parentElement;
      steps += 1;
    }

    return labelEl;
  }

  function fixQuickActions() {
    var card = cardByText(/Quick Actions/i);
    if (!card) return { found: false };

    card.classList.add('pmd-v87-actions-polished');

    replaceText(card, /Send Message/g, 'Message');

    var labels = ['Walk-in', 'New Order', 'Split Bill', 'Message'];
    var tiles = 0;

    $$('*', card).forEach(function (el) {
      var t = clean(el);
      if (labels.some(function (label) { return t === label || t.indexOf(label) >= 0 && t.length <= 40; })) {
        var tile = findActionTile(el, card);
        if (tile) {
          tile.classList.add('pmd-v87-action-tile');
          tiles += 1;
        }
      }
    });

    return {
      found: true,
      tiles: tiles
    };
  }

  function keepEarlierFixesAlive() {
    try { window.PMDOwnerDashboardV85 && window.PMDOwnerDashboardV85.fix && window.PMDOwnerDashboardV85.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV86 && window.PMDOwnerDashboardV86.fix && window.PMDOwnerDashboardV86.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV83 && window.PMDRoleDashboardV83.fix && window.PMDRoleDashboardV83.fix(); } catch (e) {}
  }

  function auditQuickClipping() {
    var card = cardByText(/Quick Actions/i);
    if (!card) return null;

    var cr = card.getBoundingClientRect();
    var items = [];

    ['Walk-in', 'New Order', 'Split Bill', 'Message'].forEach(function (label) {
      var el = $$('*', card).find(function (n) {
        var t = clean(n);
        return t === label || (t.indexOf(label) >= 0 && t.length <= 40);
      });

      if (el) {
        var r = el.getBoundingClientRect();
        items.push({
          label: label,
          bottom: Math.round(r.bottom),
          cardBottom: Math.round(cr.bottom),
          clipped: r.bottom > cr.bottom - 2
        });
      }
    });

    return {
      cardH: Math.round(cr.height),
      items: items,
      clipped: items.some(function (i) { return i.clipped; })
    };
  }

  function audit() {
    var pay = cardByText(/Payments|Payment Breakdown/i);
    var body = document.body.innerText || '';

    return {
      hasTopServers: /Top Servers/i.test(body),
      hasNextReservation: /Next Reservation/i.test(body),
      hasOldDuplicateFloor: $$('.pmd-v15-card--floor,.pmd-shared-role-floor-v32-card')
        .filter(function (el) {
          var cs = getComputedStyle(el);
          return cs.display !== 'none' && !el.closest('#pmd-v76-role-floor') && !el.classList.contains('pmd-owner-floor-v60');
        })
        .length,
      paymentJoinedPendingBody: /Pending€/.test(body),
      paymentJoinedPaidBody: /Paid today€/.test(body),
      paymentText: pay ? clean(pay).slice(0, 220) : null,
      quick: auditQuickClipping()
    };
  }

  function apply() {
    state.attempts += 1;

    if (isKds()) {
      state.last = { ok: true, skipped: true, role: currentRole(), reason: 'kds-untouched' };
      return true;
    }

    keepEarlierFixesAlive();

    var payment = fixPayments();
    var quick = fixQuickActions();
    var a = audit();

    state.last = {
      ok: true,
      role: currentRole(),
      payment: payment,
      quick: quick,
      audit: a
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return true;
  }

  function start() {
    apply();

    [0, 80, 180, 420, 800, 1400, 2200].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        [80, 180, 420, 800, 1400].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Owner dashboard v87 payment/actions polish active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV87 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V87_PAYMENT_ACTIONS_POLISH_END */


/* PMD_OWNER_DASHBOARD_V88_SAFE_KPI_TEXT_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V88_SAFE_KPI_TEXT) return;
  window.PMD_OWNER_DASHBOARD_V88_SAFE_KPI_TEXT = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isKds() {
    return currentRole() === 'kds';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 40 && r.height > 40 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function kpis() {
    return $$('.pmd-v15-kpi')
      .filter(visible)
      .sort(function (a, b) {
        return a.getBoundingClientRect().x - b.getBoundingClientRect().x;
      });
  }

  function textNodes(root) {
    if (!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function replaceInCard(card, from, to) {
    textNodes(card).forEach(function (node) {
      node.nodeValue = node.nodeValue.replace(from, to);
    });
  }

  function setTextNode(card, matcher, value, reverse) {
    var nodes = textNodes(card);
    if (reverse) nodes = nodes.reverse();

    var node = nodes.find(function (n) {
      return matcher.test((n.nodeValue || '').trim());
    });

    if (node) {
      node.nodeValue = value;
      return true;
    }

    return false;
  }

  function moneyFromCards() {
    var candidates = $$('.pmd-v15-card,.pmd-v15-kpi')
      .map(clean)
      .filter(function (t) {
        return /Pending value|Open Check Value|open\/unpaid|Pending\s*€|Open check risk/i.test(t);
      });

    var text = candidates.join(' ');
    var m = text.match(/€\s?[\d.,]+/);

    return m ? m[0].replace(/\s+/g, '') : '€0.00';
  }

  function openChecksCount() {
    var body = document.body.innerText || '';

    var m =
      body.match(/\b(\d+)\s+open checks?\b/i) ||
      body.match(/\b(\d+)\s+open check\(s\)/i) ||
      body.match(/Open Checks\s+(\d+)/i) ||
      body.match(/(\d+)\s+open checks pending/i);

    return m ? Number(m[1]) : 0;
  }

  function tableInfo() {
    var card = $$('.pmd-v15-kpi')
      .find(function (el) {
        return /Active Tables|Table Occupancy/i.test(clean(el));
      });

    var t = clean(card);

    var ratio = t.match(/(\d+)\s*\/\s*(\d+)/);
    if (ratio) {
      var busy = Number(ratio[1]);
      var total = Number(ratio[2]);
      return {
        busy: busy,
        total: total,
        free: Math.max(0, total - busy),
        percent: total ? Math.round((busy / total) * 100) : 0
      };
    }

    var words = t.match(/(\d+)\s*busy\s*[·\-]\s*(\d+)\s*free/i);
    if (words) {
      var b = Number(words[1]);
      var f = Number(words[2]);
      var tot = b + f;
      return {
        busy: b,
        total: tot,
        free: f,
        percent: tot ? Math.round((b / tot) * 100) : 0
      };
    }

    return {
      busy: 0,
      total: 0,
      free: 0,
      percent: 0
    };
  }

  function countOrdersToday() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var key = yyyy + '-' + mm + '-' + dd;

    var activity = $$('.pmd-v15-card')
      .find(function (card) {
        return /Recent Activity|Live Timeline/i.test(clean(card));
      });

    var text = clean(activity);
    if (!text) return 0;

    var re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    var matches = text.match(re);

    return matches ? matches.length : 0;
  }

  function rewriteCard(card, title, value, sub) {
    if (!card) return false;

    card.setAttribute('data-pmd-v88-kpi', 'true');

    var titleDone = setTextNode(
      card,
      /Revenue Today|Open Checks|Active Tables|Reservations Today|Pending Value|Table Occupancy|Orders Today/i,
      title,
      false
    );

    var valueDone = setTextNode(
      card,
      /€\s?[\d.,]+|\b\d+\s*\/\s*\d+\b|^\d+$|^\d+%$/,
      value,
      false
    );

    var subDone = setTextNode(
      card,
      /All-time|open checks|busy tables|upcoming reservation|pending|busy|free|today|reservation/i,
      sub,
      true
    );

    return titleDone || valueDone || subDone;
  }

  function keepEarlierFixesAlive() {
    try { window.PMDOwnerDashboardV85 && window.PMDOwnerDashboardV85.fix && window.PMDOwnerDashboardV85.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV86 && window.PMDOwnerDashboardV86.fix && window.PMDOwnerDashboardV86.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV87 && window.PMDOwnerDashboardV87.fix && window.PMDOwnerDashboardV87.fix(); } catch (e) {}
    try { window.PMDRoleDashboardV83 && window.PMDRoleDashboardV83.fix && window.PMDRoleDashboardV83.fix(); } catch (e) {}
  }

  function apply() {
    state.attempts += 1;

    if (isKds()) {
      state.last = {
        ok: true,
        skipped: true,
        role: currentRole(),
        reason: 'kds-untouched'
      };
      return true;
    }

    keepEarlierFixesAlive();

    var row = kpis();
    var pending = moneyFromCards();
    var open = openChecksCount();
    var tables = tableInfo();
    var ordersToday = countOrdersToday();

    var changed = [];

    if (row.length >= 4) {
      replaceInCard(row[0], /All-time\s+€/, 'All-time €');

      changed.push(rewriteCard(row[1], 'Pending Value', pending, open + ' open checks pending'));
      changed.push(rewriteCard(row[2], 'Table Occupancy', tables.percent + '%', tables.busy + ' busy · ' + tables.free + ' free'));
      changed.push(rewriteCard(row[3], 'Orders Today', String(ordersToday), open + ' open checks now'));
    }

    state.last = {
      ok: row.length >= 4,
      role: currentRole(),
      pending: pending,
      open: open,
      tables: tables,
      ordersToday: ordersToday,
      changed: changed,
      kpis: row.map(function (card) {
        var r = card.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: clean(card)
        };
      })
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function start() {
    apply();

    [0, 80, 180, 420, 800, 1400, 2200].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        [80, 180, 420, 800, 1400].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Owner dashboard v88 safe KPI text active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV88 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V88_SAFE_KPI_TEXT_END */


/* PMD_OWNER_DASHBOARD_V89_OWNER_FLOOR_RESCUE_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V89_OWNER_FLOOR_RESCUE) return;
  window.PMD_OWNER_DASHBOARD_V89_OWNER_FLOOR_RESCUE = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = { attempts: 0, last: null, history: [] };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 20 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 180),
      text: clean(el).slice(0, 140)
    };
  }

  function getKpiRow() {
    var kpis = $$('.pmd-v15-kpi').filter(visible);
    if (!kpis.length) return null;

    var firstParent = kpis[0].parentElement;
    if (firstParent && kpis.every(function (k) { return firstParent.contains(k); })) {
      return firstParent;
    }

    var p = kpis[0].parentElement;
    while (p && p !== document.body) {
      if (kpis.every(function (k) { return p.contains(k); })) return p;
      p = p.parentElement;
    }

    return kpis[0];
  }

  function realOwnerFloor() {
    return $$('.pmd-owner-floor-v60')
      .filter(function (el) { return el.id !== 'pmd-v76-role-floor'; })[0] || null;
  }

  function ensureHostAfterKpis() {
    var host = document.querySelector('.pmd-owner-floor-v89-host');
    var kpiRow = getKpiRow();

    if (!host) {
      host = document.createElement('section');
      host.className = 'pmd-owner-floor-v89-host';
      host.setAttribute('data-pmd-v89-host', 'true');
    }

    if (kpiRow && kpiRow.parentNode && host.previousElementSibling !== kpiRow) {
      kpiRow.parentNode.insertBefore(host, kpiRow.nextSibling);
    } else if (!host.parentNode) {
      var main =
        document.querySelector('.pmd-v15-shell') ||
        document.querySelector('.content') ||
        document.querySelector('main') ||
        document.body;

      main.insertBefore(host, main.firstChild || null);
    }

    return host;
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function forceVisibleFloor(floor) {
    if (!floor) return false;

    floor.classList.add('pmd-owner-floor-v89-rescued');
    floor.classList.add('pmd-v62-after-kpi');
    floor.classList.add('is-compact');

    [
      ['display', 'block'],
      ['visibility', 'visible'],
      ['opacity', '1'],
      ['width', '100%'],
      ['max-width', '100%'],
      ['min-width', '0'],
      ['height', '213px'],
      ['min-height', '213px'],
      ['max-height', '213px'],
      ['margin', '0'],
      ['padding', '14px 14px 15px'],
      ['overflow', 'hidden'],
      ['box-sizing', 'border-box']
    ].forEach(function (x) { hard(floor, x[0], x[1]); });

    var surface = floor.querySelector('.pmd-owner-floor-v60__surface');
    if (surface) {
      [
        ['display', 'block'],
        ['visibility', 'visible'],
        ['opacity', '1'],
        ['width', '100%'],
        ['height', '108px'],
        ['min-height', '108px'],
        ['max-height', '108px'],
        ['overflow-x', 'auto'],
        ['overflow-y', 'hidden']
      ].forEach(function (x) { hard(surface, x[0], x[1]); });
    }

    $$('.pmd-owner-floor-v60__table', floor).forEach(function (t) {
      hard(t, 'display', 'grid');
      hard(t, 'visibility', 'visible');
      hard(t, 'opacity', '1');
      hard(t, 'width', '68px');
      hard(t, 'height', '46px');
      hard(t, 'min-width', '68px');
      hard(t, 'min-height', '46px');
    });

    return true;
  }

  function hideOldFloorsExceptReal(real) {
    var hidden = 0;

    $$('.pmd-v15-card--floor,.pmd-shared-role-floor-v32-card,.pmd-v37-owner-floor-card').forEach(function (el) {
      if (el === real || el.contains(real)) return;
      if (el.id === 'pmd-v76-role-floor') return;

      el.classList.add('pmd-v85-hidden-duplicate-floor');
      el.setAttribute('data-pmd-v85-hidden-duplicate-floor', 'true');

      [
        ['display', 'none'],
        ['visibility', 'hidden'],
        ['opacity', '0'],
        ['height', '0'],
        ['min-height', '0'],
        ['max-height', '0'],
        ['margin', '0'],
        ['padding', '0'],
        ['overflow', 'hidden']
      ].forEach(function (x) { hard(el, x[0], x[1]); });

      hidden += 1;
    });

    return hidden;
  }

  function apply() {
    state.attempts += 1;

    var role = currentRole();

    if (role !== 'owner') {
      state.last = { ok: true, skipped: true, role: role, reason: 'owner-only-rescue' };
      return true;
    }

    var floor = realOwnerFloor();
    var host = ensureHostAfterKpis();

    if (floor && host && floor.parentNode !== host) {
      host.appendChild(floor);
    }

    forceVisibleFloor(floor);
    var hiddenOld = hideOldFloorsExceptReal(floor);

    var ok = !!floor && visible(floor);

    state.last = {
      ok: ok,
      role: role,
      hiddenOld: hiddenOld,
      host: rect(host),
      floor: rect(floor),
      tableCount: floor ? floor.querySelectorAll('.pmd-owner-floor-v60__table').length : 0,
      gapAfterKpi: (function () {
        var kpiRow = getKpiRow();
        if (!kpiRow || !floor) return null;
        return Math.round(floor.getBoundingClientRect().y - kpiRow.getBoundingClientRect().bottom);
      })()
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return ok;
  }

  function start() {
    apply();

    [0, 50, 120, 260, 500, 900, 1400, 2200, 3600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        [80, 180, 420, 900, 1600, 2600].forEach(function (ms) {
          setTimeout(apply, ms);
        });
      }, true);
    }

    console.info('[PMD] Owner dashboard v89 owner floor rescue active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV89 = {
    fix: apply,
    debug: function () {
      apply();
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V89_OWNER_FLOOR_RESCUE_END */


/* PMD_OWNER_DASHBOARD_V90_FLOOR_AUTO_GUARD_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V90_FLOOR_AUTO_GUARD) return;
  window.PMD_OWNER_DASHBOARD_V90_FLOOR_AUTO_GUARD = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    fixes: 0,
    last: null,
    history: [],
    observer: null,
    timer: null,
    running: false
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 20 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 180),
      text: clean(el).slice(0, 120)
    };
  }

  function ownerFloor() {
    return $$('.pmd-owner-floor-v60')
      .filter(function (el) { return el.id !== 'pmd-v76-role-floor'; })[0] || null;
  }

  function ownerFloorVisibleEnough() {
    var f = ownerFloor();
    if (!f || !visible(f)) return false;

    var r = f.getBoundingClientRect();
    var tables = f.querySelectorAll('.pmd-owner-floor-v60__table').length;
    var surface = f.querySelector('.pmd-owner-floor-v60__surface');

    return r.width > 400 && r.height >= 180 && tables >= 4 && !!surface && visible(surface);
  }

  function callV89(reason) {
    var before = rect(ownerFloor());
    var result = null;
    var ok = false;

    try {
      if (window.PMDOwnerDashboardV89 && window.PMDOwnerDashboardV89.fix) {
        result = window.PMDOwnerDashboardV89.fix();
      }
    } catch (e) {
      result = 'V89 error: ' + (e && e.message ? e.message : String(e));
    }

    ok = ownerFloorVisibleEnough();

    state.fixes += 1;
    state.last = {
      ok: ok,
      role: currentRole(),
      reason: reason,
      before: before,
      after: rect(ownerFloor()),
      v89Result: result,
      tableCount: ownerFloor() ? ownerFloor().querySelectorAll('.pmd-owner-floor-v60__table').length : 0
    };

    state.history.push(state.last);
    if (state.history.length > 40) state.history.shift();

    return ok;
  }

  function check(reason) {
    state.attempts += 1;

    if (state.running) return false;
    state.running = true;

    try {
      var role = currentRole();

      if (role !== 'owner') {
        state.last = {
          ok: true,
          skipped: true,
          role: role,
          reason: 'not-owner:' + reason
        };
        return true;
      }

      if (!ownerFloorVisibleEnough()) {
        return callV89(reason);
      }

      state.last = {
        ok: true,
        role: role,
        reason: 'already-visible:' + reason,
        floor: rect(ownerFloor()),
        tableCount: ownerFloor() ? ownerFloor().querySelectorAll('.pmd-owner-floor-v60__table').length : 0
      };

      state.history.push(state.last);
      if (state.history.length > 40) state.history.shift();

      return true;
    } finally {
      state.running = false;
    }
  }

  function schedule(reason, delays) {
    (delays || [0, 80, 180, 420, 800, 1400, 2200, 3600]).forEach(function (ms) {
      setTimeout(function () {
        check(reason + '+' + ms);
      }, ms);
    });
  }

  function debounce(reason) {
    clearTimeout(state.timer);
    state.timer = setTimeout(function () {
      check(reason);
    }, 120);
  }

  function startObserver() {
    if (state.observer || !document.body) return;

    state.observer = new MutationObserver(function () {
      if (currentRole() === 'owner' && !ownerFloorVisibleEnough()) {
        debounce('mutation-owner-floor-missing');
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });
  }

  function start() {
    schedule('startup', [0, 50, 120, 260, 500, 900, 1400, 2200, 3600, 5200, 8000]);

    window.addEventListener('load', function () {
      schedule('window-load', [0, 120, 500, 1200, 2400]);
    });

    window.addEventListener('pageshow', function () {
      schedule('pageshow', [0, 120, 500, 1200]);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) schedule('visibility-return', [0, 150, 600]);
    });

    window.addEventListener('focus', function () {
      schedule('window-focus', [0, 150, 600]);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        schedule('role-click', [80, 180, 420, 900, 1600, 2600]);
      }, true);
    }

    startObserver();

    console.info('[PMD] Owner dashboard v90 floor auto guard active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV90 = {
    fix: function () {
      return check('manual-v90');
    },
    debug: function () {
      check('debug-v90');
      return {
        active: true,
        attempts: state.attempts,
        fixes: state.fixes,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V90_FLOOR_AUTO_GUARD_END */


/* PMD_OWNER_DASHBOARD_V91_STABILIZE_ACTIVITY_ALERTS_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V91_STABILIZE_ACTIVITY_ALERTS) return;
  window.PMD_OWNER_DASHBOARD_V91_STABILIZE_ACTIVITY_ALERTS = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isOwner() {
    return currentRole() === 'owner';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 20 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      cls: String(el.className || '').slice(0, 180),
      text: clean(el).slice(0, 120)
    };
  }

  function cardByText(re) {
    return $$('.pmd-v15-card')
      .find(function (el) {
        return re.test(clean(el));
      }) || null;
  }

  function textNodes(root) {
    if (!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function replaceText(root, from, to) {
    if (!root) return 0;
    var count = 0;

    textNodes(root).forEach(function (node) {
      var before = node.nodeValue;
      var after = before.replace(from, to);
      if (after !== before) {
        node.nodeValue = after;
        count += 1;
      }
    });

    return count;
  }

  function ownerFloorVisibleEnough() {
    var f = $$('.pmd-owner-floor-v60').filter(function (el) {
      return el.id !== 'pmd-v76-role-floor';
    })[0];

    if (!f || !visible(f)) return false;

    var r = f.getBoundingClientRect();
    var tables = f.querySelectorAll('.pmd-owner-floor-v60__table').length;

    return r.width > 400 && r.height >= 180 && tables >= 4;
  }

  function runGuards(reason) {
    try { window.PMDOwnerDashboardV89 && window.PMDOwnerDashboardV89.fix && window.PMDOwnerDashboardV89.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV90 && window.PMDOwnerDashboardV90.fix && window.PMDOwnerDashboardV90.fix(); } catch (e) {}
  }

  function polishActivity() {
    var card = cardByText(/Recent Activity|Live Timeline/i);
    if (!card) return false;

    card.classList.add('pmd-v91-activity-card');

    replaceText(card, /Recent Activity/g, 'Recent Activity');
    replaceText(card, /Latest restaurant activity/g, 'Latest restaurant activity');

    var candidates = $$('li,div,p', card)
      .filter(function (el) {
        return /Order\s+#|\d{4}-\d{2}-\d{2}/.test(clean(el));
      });

    // Hide only overflow duplicates if there are many; keep card clean and shorter.
    candidates.forEach(function (el, i) {
      if (i >= 5) el.classList.add('pmd-v91-extra-activity');
    });

    return true;
  }

  function polishAlerts() {
    var card = cardByText(/Needs Attention|AI Alerts|Pending value|Table data check/i);
    if (!card) return false;

    card.classList.add('pmd-v91-alerts-card');

    replaceText(card, /Needs Attention/g, 'Needs Attention');
    replaceText(card, /Actionable owner issues/g, 'Actionable owner issues');
    replaceText(card, /Pending value/g, 'Pending value');
    replaceText(card, /Table data check/g, 'Table data check');

    return true;
  }

  function apply(reason) {
    state.attempts += 1;

    if (!isOwner()) {
      state.last = {
        ok: true,
        skipped: true,
        role: currentRole(),
        reason: 'owner-only:' + reason
      };
      return true;
    }

    document.documentElement.classList.add('pmd-v91-owner-settling');

    runGuards(reason);

    var activity = polishActivity();
    var alerts = polishAlerts();

    setTimeout(function () {
      document.documentElement.classList.remove('pmd-v91-owner-settling');
    }, 900);

    var floor = $$('.pmd-owner-floor-v60').filter(function (el) {
      return el.id !== 'pmd-v76-role-floor';
    })[0];

    state.last = {
      ok: ownerFloorVisibleEnough(),
      role: currentRole(),
      reason: reason,
      activity: activity,
      alerts: alerts,
      floor: rect(floor),
      activityCard: rect(cardByText(/Recent Activity/i)),
      alertsCard: rect(cardByText(/Needs Attention/i))
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function schedule(reason, delays) {
    (delays || [0, 80, 180, 420, 800, 1400]).forEach(function (ms) {
      setTimeout(function () {
        apply(reason + '+' + ms);
      }, ms);
    });
  }

  function start() {
    schedule('startup', [0, 60, 140, 300, 600, 1000, 1800, 2800]);

    window.addEventListener('load', function () {
      schedule('window-load', [0, 150, 600, 1300]);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        schedule('role-click', [100, 300, 800, 1400]);
      }, true);
    }

    console.info('[PMD] Owner dashboard v91 stabilize activity/alerts active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV91 = {
    fix: function () {
      return apply('manual-v91');
    },
    debug: function () {
      apply('debug-v91');
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V91_STABILIZE_ACTIVITY_ALERTS_END */


/* PMD_OWNER_DASHBOARD_V93_CLEAN_ACTIVITY_ALERTS_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V93_CLEAN_ACTIVITY_ALERTS) return;
  window.PMD_OWNER_DASHBOARD_V93_CLEAN_ACTIVITY_ALERTS = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isOwner() {
    return currentRole() === 'owner';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 20 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      text: clean(el).slice(0, 160),
      cls: String(el.className || '').slice(0, 160)
    };
  }

  function textNodes(root) {
    if (!root) return [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function replaceText(root, from, to) {
    if (!root) return 0;
    var count = 0;

    textNodes(root).forEach(function (node) {
      var before = node.nodeValue;
      var after = before.replace(from, to);
      if (after !== before) {
        node.nodeValue = after;
        count += 1;
      }
    });

    return count;
  }

  function cardByText(re) {
    return $$('.pmd-v15-card')
      .find(function (el) {
        return re.test(clean(el));
      }) || null;
  }

  function keepEarlierFixesAlive() {
    try { window.PMDOwnerDashboardV89 && window.PMDOwnerDashboardV89.fix && window.PMDOwnerDashboardV89.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV90 && window.PMDOwnerDashboardV90.fix && window.PMDOwnerDashboardV90.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV88 && window.PMDOwnerDashboardV88.fix && window.PMDOwnerDashboardV88.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV87 && window.PMDOwnerDashboardV87.fix && window.PMDOwnerDashboardV87.fix(); } catch (e) {}
  }

  function getCards() {
    return {
      activity: cardByText(/Recent Activity|Live Timeline/i),
      alerts: cardByText(/Needs Attention|AI Alerts|Pending value|Table data check/i)
    };
  }

  function putAlertsLeft(activity, alerts) {
    if (!activity || !alerts) return false;
    if (activity.parentElement !== alerts.parentElement) return false;

    var activityX = activity.getBoundingClientRect().x;
    var alertsX = alerts.getBoundingClientRect().x;

    if (alertsX > activityX) {
      activity.parentElement.insertBefore(alerts, activity);
      return true;
    }

    return false;
  }

  function removeBadSummary(alerts) {
    var removed = 0;

    $$('.pmd-v92-alert-summary', alerts || document).forEach(function (el) {
      el.remove();
      removed += 1;
    });

    return removed;
  }

  function restoreActivity(activity) {
    if (!activity) return false;

    activity.classList.add('pmd-v93-activity-card');

    replaceText(activity, /Live Timeline/g, 'Recent Activity');
    replaceText(activity, /Latest recorded orders and reservations/g, 'Latest restaurant activity');

    $$('.pmd-v91-extra-activity', activity).forEach(function (el) {
      el.classList.remove('pmd-v91-extra-activity');
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
    });

    $$('*', activity).forEach(function (el) {
      var t = clean(el);
      if (/Order\s+#|\d{4}-\d{2}-\d{2}|Old table ref|Table\s+\d+/.test(t)) {
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('opacity');
      }
    });

    activity.style.setProperty('height', '350px', 'important');
    activity.style.setProperty('min-height', '350px', 'important');
    activity.style.setProperty('max-height', '350px', 'important');
    activity.style.setProperty('overflow', 'hidden', 'important');

    return true;
  }

  function restoreAlerts(alerts) {
    if (!alerts) return false;

    alerts.classList.add('pmd-v93-alerts-card');

    removeBadSummary(alerts);

    replaceText(alerts, /AI Alerts/g, 'Needs Attention');
    replaceText(alerts, /Owner-relevant connected issues/g, 'Actionable owner issues');
    replaceText(alerts, /Open check value/g, 'Pending value');
    replaceText(alerts, /Old table references/g, 'Table data check');

    alerts.style.setProperty('height', '350px', 'important');
    alerts.style.setProperty('min-height', '350px', 'important');
    alerts.style.setProperty('max-height', '350px', 'important');
    alerts.style.setProperty('overflow', 'hidden', 'important');

    return true;
  }

  function floorOk() {
    var floor = $$('.pmd-owner-floor-v60').filter(function (el) {
      return el.id !== 'pmd-v76-role-floor';
    })[0];

    if (!floor || !visible(floor)) return false;

    var r = floor.getBoundingClientRect();
    return r.width > 400 && r.height >= 180 && floor.querySelectorAll('.pmd-owner-floor-v60__table').length >= 4;
  }

  function apply(reason) {
    state.attempts += 1;

    if (!isOwner()) {
      state.last = {
        ok: true,
        skipped: true,
        role: currentRole(),
        reason: 'owner-only:' + reason
      };
      return true;
    }

    keepEarlierFixesAlive();

    var cards = getCards();
    var swapped = putAlertsLeft(cards.activity, cards.alerts);

    cards = getCards();

    var removedSummary = removeBadSummary(cards.alerts);
    var alertsOk = restoreAlerts(cards.alerts);
    var activityOk = restoreActivity(cards.activity);

    state.last = {
      ok: !!activityOk && !!alertsOk && floorOk(),
      role: currentRole(),
      reason: reason,
      swapped: swapped,
      removedSummary: removedSummary,
      floorOk: floorOk(),
      activityOk: activityOk,
      alertsOk: alertsOk,
      badSummaryLeft: !!document.querySelector('.pmd-v92-alert-summary'),
      brokenActivityInnerHide: !!(cards.activity && cards.activity.querySelector('.pmd-v91-extra-activity')),
      activityCard: rect(cards.activity),
      alertsCard: rect(cards.alerts)
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return state.last.ok;
  }

  function schedule(reason, delays) {
    (delays || [0, 80, 180, 420, 900, 1500]).forEach(function (ms) {
      setTimeout(function () {
        apply(reason + '+' + ms);
      }, ms);
    });
  }

  function start() {
    schedule('startup', [0, 60, 140, 300, 700, 1200, 2200]);

    window.addEventListener('load', function () {
      schedule('window-load', [0, 150, 600, 1300]);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        schedule('role-click', [100, 300, 800, 1400]);
      }, true);
    }

    console.info('[PMD] Owner dashboard v93 clean activity/alerts active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV93 = {
    fix: function () {
      return apply('manual-v93');
    },
    debug: function () {
      apply('debug-v93');
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V93_CLEAN_ACTIVITY_ALERTS_END */


/* PMD_OWNER_DASHBOARD_V95_SAFE_FLOOR_EXPAND_KPI_CARDS_START */
(function () {
  'use strict';

  if (window.PMD_OWNER_DASHBOARD_V95_SAFE_FLOOR_EXPAND_KPI_CARDS) return;
  window.PMD_OWNER_DASHBOARD_V95_SAFE_FLOOR_EXPAND_KPI_CARDS = true;

  if (!/\/admin\/dashboard(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    attempts: 0,
    expanded: false,
    last: null,
    history: []
  };

  function $$(s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  }

  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function currentRole() {
    var active = document.querySelector('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function isOwner() {
    return currentRole() === 'owner';
  }

  function isKds() {
    return currentRole() === 'kds';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return r.width > 20 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      text: clean(el).slice(0, 140),
      cls: String(el.className || '').slice(0, 160)
    };
  }

  function hard(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function keepSafeFixesAlive() {
    try { window.PMDOwnerDashboardV89 && window.PMDOwnerDashboardV89.fix && window.PMDOwnerDashboardV89.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV90 && window.PMDOwnerDashboardV90.fix && window.PMDOwnerDashboardV90.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV88 && window.PMDOwnerDashboardV88.fix && window.PMDOwnerDashboardV88.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV87 && window.PMDOwnerDashboardV87.fix && window.PMDOwnerDashboardV87.fix(); } catch (e) {}
    try { window.PMDOwnerDashboardV93 && window.PMDOwnerDashboardV93.fix && window.PMDOwnerDashboardV93.fix(); } catch (e) {}
  }

  function realOwnerFloor() {
    return document.querySelector('.pmd-owner-floor-v89-host .pmd-owner-floor-v60') ||
      document.querySelector('.pmd-owner-floor-v60.pmd-owner-floor-v89-rescued') ||
      $$('.pmd-owner-floor-v60').find(function (el) {
        return el.id !== 'pmd-v76-role-floor' && !el.closest('#pmd-v76-role-floor');
      }) ||
      null;
  }

  function floorHost() {
    var floor = realOwnerFloor();
    return floor ? (floor.closest('.pmd-owner-floor-v89-host') || floor.parentElement) : null;
  }

  function hideWrongOwnerFloor() {
    if (!isOwner()) return 0;

    var real = realOwnerFloor();
    var hidden = 0;

    var wrong = document.getElementById('pmd-v76-role-floor');
    if (wrong && wrong !== real && !wrong.contains(real)) {
      hard(wrong, 'display', 'none');
      hard(wrong, 'visibility', 'hidden');
      hard(wrong, 'opacity', '0');
      hidden += 1;
    }

    $$('.pmd-shared-role-floor-v32-card,.pmd-v15-card--floor,.pmd-v37-owner-floor-card').forEach(function (el) {
      if (el === real || el.contains(real)) return;
      if (el.id === 'pmd-v76-role-floor') return;
      hard(el, 'display', 'none');
      hard(el, 'visibility', 'hidden');
      hard(el, 'opacity', '0');
      hidden += 1;
    });

    return hidden;
  }

  function normalizeButtons() {
    var floor = realOwnerFloor();
    if (!floor) return 0;

    var count = 0;

    $$('button,a', floor).forEach(function (btn) {
      var t = clean(btn);

      if (/^Save layout$|^Save$/i.test(t)) {
        btn.textContent = 'Save';
        count += 1;
      }

      if (/^Edit Floor$/i.test(t)) {
        btn.textContent = 'Edit';
        count += 1;
      }

      if (/^↗$|^↙$|^⤢$|^⤡$/.test(t) || btn.classList.contains('pmd-owner-floor-v60__toggle')) {
        btn.classList.add('pmd-owner-floor-v60__toggle');
        btn.setAttribute('aria-label', state.expanded ? 'Collapse floor map' : 'Expand floor map');
        btn.textContent = state.expanded ? '↙' : '↗';
        count += 1;
      }
    });

    return count;
  }

  function applyFloorSize(expanded) {
    var floor = realOwnerFloor();
    var host = floorHost();

    if (!floor) return false;

    var surface = floor.querySelector('.pmd-owner-floor-v60__surface');

    if (expanded) {
      if (host) {
        hard(host, 'display', 'block');
        hard(host, 'visibility', 'visible');
        hard(host, 'opacity', '1');
        hard(host, 'width', '100%');
        hard(host, 'max-width', '100%');
        hard(host, 'margin-top', '18px');
        hard(host, 'margin-bottom', '24px');
      }

      hard(floor, 'display', 'block');
      hard(floor, 'position', 'relative');
      floor.style.removeProperty('inset');
      floor.style.removeProperty('z-index');
      hard(floor, 'visibility', 'visible');
      hard(floor, 'opacity', '1');
      hard(floor, 'width', '100%');
      hard(floor, 'height', '660px');
      hard(floor, 'min-height', '660px');
      hard(floor, 'max-height', '660px');
      hard(floor, 'padding', '18px');
      hard(floor, 'overflow', 'hidden');
      hard(floor, 'transition', 'height .26s ease, min-height .26s ease, max-height .26s ease, margin .26s ease'); // PMD_V95_INLINE_TRANSITION_PATCH

      if (surface) {
        hard(surface, 'height', '550px');
        hard(surface, 'min-height', '550px');
        hard(surface, 'max-height', '550px');
        hard(surface, 'overflow', 'auto');
        hard(surface, 'transition', 'height .26s ease, min-height .26s ease, max-height .26s ease');
      }
    } else {
      if (host) {
        hard(host, 'display', 'block');
        hard(host, 'visibility', 'visible');
        hard(host, 'opacity', '1');
        hard(host, 'width', '100%');
        hard(host, 'max-width', '100%');
        hard(host, 'margin-top', '18px');
        hard(host, 'margin-bottom', '18px');
      }

      hard(floor, 'display', 'block');
      hard(floor, 'visibility', 'visible');
      hard(floor, 'opacity', '1');
      hard(floor, 'width', '100%');
      hard(floor, 'height', '213px');
      hard(floor, 'min-height', '213px');
      hard(floor, 'max-height', '213px');
      hard(floor, 'padding', '14px 14px 15px');
      hard(floor, 'overflow', 'hidden');

      if (surface) {
        hard(surface, 'height', '108px');
        hard(surface, 'min-height', '108px');
        hard(surface, 'max-height', '108px');
        hard(surface, 'overflow-x', 'auto');
        hard(surface, 'overflow-y', 'hidden');
      }
    }

    floor.classList.toggle('pmd-v95-expanded-floor', expanded);
    if (host) host.classList.toggle('pmd-v95-expanded-host', expanded);

    normalizeButtons();

    return true;
  }

  function bindExpand() {
    var floor = realOwnerFloor();
    if (!floor) return 0;

    var bound = 0;

    $$('button,a', floor).forEach(function (btn) {
      var t = clean(btn);

      if (/^↗$|^↙$|^⤢$|^⤡$/.test(t) || btn.classList.contains('pmd-owner-floor-v60__toggle')) {
        if (btn.dataset.pmdV95Bound === 'true') return;

        btn.dataset.pmdV95Bound = 'true';

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();

          state.expanded = !state.expanded;
          applyFloorSize(state.expanded);

          [40, 160, 420, 900].forEach(function (ms) {
            setTimeout(function () {
              applyFloorSize(state.expanded);
            }, ms);
          });
        }, true);

        bound += 1;
      }
    });

    return bound;
  }

  function tagKpis() {
    var kpis = $$('.pmd-v15-kpi').filter(visible)
      .sort(function (a, b) {
        return a.getBoundingClientRect().x - b.getBoundingClientRect().x;
      });

    var tagged = 0;

    kpis.forEach(function (card, i) {
      var t = clean(card);

      if (/Revenue Today/i.test(t) || i === 0) {
        card.setAttribute('data-pmd-v95-kpi', 'revenue');
        tagged += 1;
      } else if (/Pending Value|Open Checks/i.test(t) || i === 1) {
        card.setAttribute('data-pmd-v95-kpi', 'pending');
        tagged += 1;
      } else if (/Table Occupancy|Active Tables/i.test(t) || i === 2) {
        card.setAttribute('data-pmd-v95-kpi', 'occupancy');
        tagged += 1;
      } else if (/Orders Today|Reservations Today/i.test(t) || i === 3) {
        card.setAttribute('data-pmd-v95-kpi', 'orders');
        tagged += 1;
      }
    });

    return tagged;
  }

  function restoreBusinessCards() {
    var labels = [
      /Sales Trend|Revenue by Hour/i,
      /Payments|Payment Breakdown/i,
      /Average Guest Spend/i,
      /Lost Revenue/i,
      /Next Reservation/i,
      /Kitchen Status|Kitchen Performance/i,
      /Top Selling Items/i,
      /Quick Actions/i
    ];

    var restored = 0;

    $$('.pmd-v15-card').forEach(function (card) {
      var t = clean(card);
      if (!labels.some(function (re) { return re.test(t); })) return;

      card.classList.add('pmd-v95-restored-card');

      hard(card, 'display', 'block');
      hard(card, 'visibility', 'visible');
      hard(card, 'opacity', '1');

      // Do not force height. Keep existing design heights.
      card.style.removeProperty('height');
      card.style.removeProperty('min-height');
      card.style.removeProperty('max-height');

      restored += 1;
    });

    return restored;
  }

  function auditCards() {
    var wanted = [
      'Recent Activity',
      'Needs Attention',
      'Sales Trend',
      'Payments',
      'Average Guest Spend',
      'Lost Revenue',
      'Next Reservation',
      'Kitchen Status',
      'Top Selling Items',
      'Quick Actions'
    ];

    var text = document.body.innerText || '';
    var found = {};
    wanted.forEach(function (w) {
      found[w] = text.indexOf(w) >= 0;
    });

    return found;
  }

  function apply(reason) {
    state.attempts += 1;

    if (isKds()) {
      state.last = {
        ok: true,
        skipped: true,
        role: currentRole(),
        reason: 'kds-untouched:' + reason
      };
      return true;
    }

    keepSafeFixesAlive();

    var hiddenWrong = hideWrongOwnerFloor();
    var buttons = normalizeButtons();
    var bound = bindExpand();
    var tagged = tagKpis();
    var restored = restoreBusinessCards();

    applyFloorSize(state.expanded);

    var floor = realOwnerFloor();

    state.last = {
      ok: true,
      role: currentRole(),
      reason: reason,
      expanded: state.expanded,
      hiddenWrong: hiddenWrong,
      buttons: buttons,
      bound: bound,
      taggedKpis: tagged,
      restoredCards: restored,
      floor: rect(floor),
      host: rect(floorHost()),
      tableText: floor ? clean(floor).slice(0, 180) : null,
      cardPresence: auditCards()
    };

    state.history.push(state.last);
    if (state.history.length > 30) state.history.shift();

    return true;
  }

  function schedule(reason, delays) {
    (delays || [0, 80, 180, 420, 900, 1500]).forEach(function (ms) {
      setTimeout(function () { apply(reason + '+' + ms); }, ms);
    });
  }

  function start() {
    schedule('startup', [0, 60, 140, 300, 700, 1200, 2200]);

    window.addEventListener('load', function () {
      schedule('window-load', [0, 150, 600, 1300]);
    });

    var rail = document.getElementById('pmd-v31-role-rail');
    if (rail) {
      rail.addEventListener('click', function () {
        state.expanded = false;
        schedule('role-click', [100, 300, 800, 1400]);
      }, true);
    }

    console.info('[PMD] Owner dashboard v95 safe floor expand + KPI cards active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PMDOwnerDashboardV95 = {
    fix: function () {
      return apply('manual-v95');
    },
    expand: function () {
      state.expanded = true;
      keepSafeFixesAlive();
      applyFloorSize(true);
      [80, 220, 600, 1200].forEach(function (ms) {
        setTimeout(function () { applyFloorSize(true); }, ms);
      });
      return true;
    },
    collapse: function () {
      state.expanded = false;
      applyFloorSize(false);
      [80, 220, 600].forEach(function (ms) {
        setTimeout(function () { applyFloorSize(false); }, ms);
      });
      return true;
    },
    toggle: function () {
      return state.expanded ? this.collapse() : this.expand();
    },
    debug: function () {
      apply('debug-v95');
      return {
        active: true,
        attempts: state.attempts,
        last: state.last,
        history: state.history.slice()
      };
    }
  };
})();
 /* PMD_OWNER_DASHBOARD_V95_SAFE_FLOOR_EXPAND_KPI_CARDS_END */



/* PMD_OWNER_V95_INLINE_EXPAND_REPLACE_V1: removed fullscreen append; original v95 now expands inline to 660px / 550px surface. */


/* PMD_OWNER_V96_TOGGLE_CLICK_BRIDGE_START */
/*
  Owner floor v96 click bridge.
  Fixes real mouse click on the v60 expand button after v95 inline expand patch.
  Scope: Owner dashboard only. No backend/database/order/payment logic.
*/
(function () {
  'use strict';

  if (window.PMD_OWNER_V96_TOGGLE_CLICK_BRIDGE) return;
  window.PMD_OWNER_V96_TOGGLE_CLICK_BRIDGE = true;

  if (!/\/admin\/dashboard(?:$|[?#])|\/admin\/?$/.test(location.pathname + location.search + location.hash)) return;

  function $(s, r) {
    return (r || document).querySelector(s);
  }

  function currentRole() {
    var active = $('#pmd-v31-role-rail .pmd-v31-role-btn.is-active');
    return active && active.dataset ? active.dataset.pmdRole : null;
  }

  function ownerFloor() {
    return $('.pmd-owner-floor-v89-host .pmd-owner-floor-v60') ||
      $('.pmd-owner-floor-v60.pmd-owner-floor-v89-rescued') ||
      $('.pmd-owner-floor-v60:not(#pmd-v76-role-floor)');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.pmd-owner-floor-v60__toggle');
    if (!btn) return;
    if (currentRole() !== 'owner') return;

    var floor = ownerFloor();
    if (!floor || !floor.contains(btn)) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    if (window.PMDOwnerDashboardV95 && typeof window.PMDOwnerDashboardV95.toggle === 'function') {
      window.PMDOwnerDashboardV95.toggle();

      [80, 220, 520].forEach(function (ms) {
        setTimeout(function () {
          var expanded =
            floor.classList.contains('pmd-v95-expanded-floor') ||
            floor.classList.contains('is-expanded');

          if (expanded && window.PMDOwnerDashboardV95.expand) {
            window.PMDOwnerDashboardV95.expand();
          }
        }, ms);
      });
    }
  }, true);

  window.PMDOwnerV96ToggleBridge = {
    debug: function () {
      var floor = ownerFloor();
      var btn = floor ? floor.querySelector('.pmd-owner-floor-v60__toggle') : null;
      return {
        active: true,
        role: currentRole(),
        floor: !!floor,
        button: !!btn,
        buttonText: btn ? btn.textContent : null,
        floorClass: floor ? floor.className : null,
        floorRect: floor ? floor.getBoundingClientRect().toJSON() : null,
        floorStyle: floor ? floor.getAttribute('style') : null
      };
    }
  };

  console.info('[PMD] Owner v96 toggle click bridge active');
})();
 /* PMD_OWNER_V96_TOGGLE_CLICK_BRIDGE_END */


/* PMD_DASHBOARD_ROBOTO_FONT_LOADER_V2_START */
/*
  Load Roboto for PMD dashboard typography.
  Safe idempotent loader. No backend/database/order/payment logic.
*/
(function () {
  'use strict';

  if (window.PMD_DASHBOARD_ROBOTO_FONT_LOADER_V2) return;
  window.PMD_DASHBOARD_ROBOTO_FONT_LOADER_V2 = true;

  if (!/\/admin\/dashboard(?:$|[?#])|\/admin\/?$/.test(location.pathname + location.search + location.hash)) return;

  if (!document.getElementById('pmd-dashboard-roboto-font-v2')) {
    var link = document.createElement('link');
    link.id = 'pmd-dashboard-roboto-font-v2';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;800;900&display=swap';
    document.head.appendChild(link);
  }

  console.info('[PMD] Dashboard Roboto font loader v2 active');
})();
 /* PMD_DASHBOARD_ROBOTO_FONT_LOADER_V2_END */


