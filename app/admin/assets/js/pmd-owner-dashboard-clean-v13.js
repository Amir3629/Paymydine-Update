/* PayMyDine Owner/Admin Dashboard Clean v13
   Reference-style restaurant operations dashboard using the real v12 data model. */
(function () {
  'use strict';

  var VERSION = 'owner-clean-v13-reference-ops-20260626';
  var root = null;
  var lastData = null;
  var selectedFloorId = null;
  var selectedTableId = null;

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

  function section(title, subtitle, inner, cls, action) {
    return '' +
      '<section class="pmd-v13-card ' + esc(cls || '') + '">' +
        '<header class="pmd-v13-card-head">' +
          '<div><h2>' + esc(title) + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>' +
          (action || '') +
        '</header>' +
        '<div class="pmd-v13-card-body">' + inner + '</div>' +
      '</section>';
  }

  function topKpi(data, key, icon, meta, tone) {
    var m = metric(data, key);
    var value = m.value == null ? '—' : m.value;
    return '' +
      '<article class="pmd-v13-kpi pmd-v13-kpi--' + esc(tone || 'neutral') + '">' +
        '<div class="pmd-v13-kpi-icon">' + esc(icon) + '</div>' +
        '<div class="pmd-v13-kpi-copy">' +
          '<span>' + esc(m.label) + '</span>' +
          '<strong>' + esc(value) + '</strong>' +
          '<small>' + esc(meta || m.note || m.source || '') + '</small>' +
        '</div>' +
      '</article>';
  }

  function miniStat(label, value, note, tone) {
    return '<div class="pmd-v13-mini-stat pmd-v13-mini-stat--' + esc(tone || 'neutral') + '"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(note || '') + '</small></div>';
  }

  function empty(text) {
    return '<div class="pmd-v13-empty">' + esc(text || 'No live rows detected yet.') + '</div>';
  }

  function barList(items, labelKey, valueKey, limit) {
    items = (items || []).slice(0, limit || 6);
    if (!items.length) return empty('No connected item rows to show yet.');
    var max = 1;
    items.forEach(function (x) { max = Math.max(max, Number(x[valueKey || 'count'] || 0)); });
    return '<div class="pmd-v13-bars">' + items.map(function (x, idx) {
      var val = Number(x[valueKey || 'count'] || 0);
      var pct = Math.max(4, Math.min(100, Math.round(val / max * 100)));
      return '' +
        '<div class="pmd-v13-bar-row">' +
          '<div class="pmd-v13-bar-label"><span><b>' + esc(idx + 1) + '</b>' + esc(x[labelKey || 'label'] || 'Item') + '</span><strong>' + esc(val) + '</strong></div>' +
          '<div class="pmd-v13-bar-track"><i style="width:' + pct + '%"></i></div>' +
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
      '<svg class="pmd-v13-spark" viewBox="0 0 200 90" aria-hidden="true">' +
        '<defs><linearGradient id="pmdV13Spark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs>' +
        '<polyline points="' + esc(points) + '" fill="none" stroke="url(#pmdV13Spark)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function donut(percent, center) {
    var p = Math.max(0, Math.min(100, Number(percent) || 0));
    return '' +
      '<div class="pmd-v13-donut" style="--p:' + p + '">' +
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
    var selected = floorTables.filter(function (t) { return String(t.id) === String(selectedTableId); })[0] || null;
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
      var w = Math.max(8, Math.min(24, Number(t.width || 120) / width * 100));
      var h = Math.max(8, Math.min(22, Number(t.height || 70) / height * 100));
      var isSelected = selected && String(selected.id) === String(t.id);
      return '' +
        '<button type="button" data-pmd-table="' + esc(t.id) + '" class="pmd-v13-floor-node pmd-v13-floor-node--' + esc(t.status || 'free') + (isSelected ? ' is-selected' : '') + '" style="left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%">' +
          '<strong>' + esc(t.number || t.label || t.id) + '</strong>' +
          '<small>' + esc(t.status_label || t.status || 'free') + '</small>' +
          (t.due_amount > 0 ? '<em>' + esc(t.due_label || fmtMoney(t.due_amount)) + '</em>' : '') +
        '</button>';
    }).join('');
    var side = selected ? tableSide(selected) : '<div class="pmd-v13-floor-empty"><strong>' + esc(floor.label || 'Main Floor') + '</strong><span>Click a table to inspect live status, capacity, reservations and quick links.</span></div>';
    return '' +
      '<div class="pmd-v13-floor-tools"><div class="pmd-v13-floor-tabs">' + floorTabs + '</div><div class="pmd-v13-floor-legend">' + legend.map(function (l) { return '<span class="pmd-v13-dot-' + esc(l[0]) + '"><i></i>' + esc(l[1]) + ' <b>' + esc(l[2]) + '</b></span>'; }).join('') + '</div></div>' +
      '<div class="pmd-v13-floor-wrap">' +
        '<div class="pmd-v13-floor-canvas"><div class="pmd-v13-floor-bg"></div>' + nodes + '</div>' +
        '<aside class="pmd-v13-floor-side">' + side + '</aside>' +
      '</div>';
  }

  function tableSide(t) {
    var rows = [
      ['Status', t.status_label || t.status || 'Free'],
      ['Capacity', t.capacity_label || '—'],
      ['Open orders', t.open_orders || 0],
      ['Ready', t.ready || 0],
      ['Due', t.due_label || fmtMoney(t.due_amount || 0)],
      ['Waiter calls', t.waiter_calls || 0],
      ['Reservation', t.reservation && t.reservation.count ? ((t.reservation.guest_name || 'Reserved') + ' · ' + (t.reservation.next_time || 'today')) : 'None today'],
      ['Section', t.section || 'main']
    ].map(function (r) { return '<div class="pmd-v13-side-row"><span>' + esc(r[0]) + '</span><strong>' + esc(r[1]) + '</strong></div>'; }).join('');
    return '' +
      '<div class="pmd-v13-table-card pmd-v13-table-card--' + esc(t.status || 'free') + '">' +
        '<header><strong>' + esc(t.label || ('Table ' + t.id)) + '</strong><small>' + esc(t.floor_name || 'Main Floor') + '</small></header>' +
        rows +
        '<footer><a href="' + esc(t.create_order_url || '/admin/orders/create') + '">New Order</a><a href="' + esc(t.edit_url || '#') + '">Edit Table</a></footer>' +
      '</div>';
  }

  function alerts(data) {
    var items = (((data.sections || {}).alerts || {}).items || []).slice(0, 6);
    if (!items.length) return empty('No critical AI-style operational alerts detected right now.');
    return '<div class="pmd-v13-alerts">' + items.map(function (a) {
      return '<a class="pmd-v13-alert pmd-v13-alert--' + esc(a.level || 'info') + '" href="' + esc(a.url || '#') + '"><i>⚠</i><div><strong>' + esc(a.title || 'Alert') + '</strong><small>' + esc(a.note || '') + '</small></div><b>' + esc(a.value || '') + '</b></a>';
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
    return '<div class="pmd-v13-timeline">' + rows.map(function (r) {
      return '<a href="' + esc(r.url) + '" class="pmd-v13-timeline-row pmd-v13-timeline-row--' + esc(r.tone) + '"><span>' + esc(r.time || 'Live') + '</span><i></i><div><strong>' + esc(r.title) + '</strong><small>' + esc(r.note) + '</small></div></a>';
    }).join('') + '</div>';
  }

  function listRows(rows, type) {
    rows = rows || [];
    if (!rows.length) return empty(type === 'reservation' ? 'No upcoming reservations detected.' : 'No live order rows detected.');
    return '<div class="pmd-v13-list">' + rows.slice(0, 6).map(function (row) {
      if (type === 'reservation') {
        return '<a href="/admin/reservations" class="pmd-v13-list-row"><div><strong>' + esc(row.guest_name || 'Reservation') + '</strong><small>' + esc([row.reserve_date, row.reserve_time].filter(Boolean).join(' ') + (row.table_ref ? ' · Table ' + row.table_ref : '')) + '</small></div><span>' + esc(row.guests || '—') + '</span></a>';
      }
      return '<a href="' + esc(row.edit_url || '/admin/orders') + '" class="pmd-v13-list-row"><div><strong>Order #' + esc(row.id || '—') + '</strong><small>' + esc((row.table_label || 'No table') + ' · ' + (row.status_label || row.status || '—') + ' · ' + (row.customer_label || 'Guest')) + '</small></div><span>' + esc(row.total_label || fmtMoney(row.total || 0)) + '</span></a>';
    }).join('') + '</div>';
  }

  function revenueByHour(data) {
    var orders = ((data.sections || {}).recent_orders || []);
    var todayRevenue = rawMetric(data, 'revenue_today');
    var totalRevenue = ((data.sections || {}).snapshot || []).filter(function (x) { return x.label === 'Total Revenue'; })[0];
    return '' +
      '<div class="pmd-v13-chart-head"><strong>' + esc(metric(data, 'revenue_today').value || '€0.00') + '</strong><small>today · recent live order trend below</small></div>' +
      sparklineFromOrders(orders) +
      '<div class="pmd-v13-chart-note">Connected to <b>ti_orders</b> / <b>ti_order_totals</b>. All-time context: ' + esc(totalRevenue ? totalRevenue.value : fmtMoney(todayRevenue)) + '</div>';
  }

  function paymentBreakdown(data) {
    var pending = rawMetric(data, 'unpaid');
    var paidToday = (((data.sections || {}).payment || {}).paid_today_raw || 0);
    var total = Math.max(1, pending + paidToday);
    var pctPaid = (paidToday / total) * 100;
    return '<div class="pmd-v13-payment-grid">' + donut(pctPaid, fmtMoney(pending + paidToday)) + '<div class="pmd-v13-payment-lines">' +
      '<div><i class="pmd-v13-pay-open"></i><span>Open / pending</span><b>' + esc(fmtMoney(pending)) + '</b></div>' +
      '<div><i class="pmd-v13-pay-paid"></i><span>Paid today</span><b>' + esc(fmtMoney(paidToday)) + '</b></div>' +
      '<small>Payment transaction table is connected but currently empty, so open-check fallback is used.</small>' +
      '</div></div>';
  }

  function smallFinance(data) {
    var avg = metric(data, 'avg_ticket');
    var pending = metric(data, 'unpaid');
    return '' +
      '<div class="pmd-v13-small-finance"><strong>' + esc(avg.value || '€0.00') + '</strong><span>Average Guest Spend</span><small>' + esc(avg.note || 'Average order value today') + '</small></div>' +
      '<div class="pmd-v13-small-finance pmd-v13-small-finance--risk"><strong>' + esc(pending.value || '€0.00') + '</strong><span>Open / Pending Value</span><small>' + esc(pending.note || '') + '</small></div>';
  }

  function kitchenPerformance(data) {
    var q = metric(data, 'kitchen_queue');
    var s = (data.sections || {}).kitchen || {};
    return '' +
      '<div class="pmd-v13-kitchen-metrics">' +
        miniStat('Kitchen Queue', q.value || '0', q.note || '', 'orange') +
        miniStat('Ready', String(s.ready || 0), 'ready order/item rows', 'green') +
        miniStat('KDS Stations', String(s.stations || 0), 'connected kitchen displays', 'blue') +
      '</div>' +
      '<div class="pmd-v13-rush"><span>Rush Status</span><b>' + (Number(q.raw || 0) > 8 ? 'High' : (Number(q.raw || 0) > 0 ? 'Medium' : 'Calm')) + '</b></div>';
  }

  function quickActions() {
    var items = [
      ['Walk-in', '/admin/reservations/create', '👥'],
      ['New Order', '/admin/orders/create', '🧾'],
      ['Open Checks', '/admin/orders', '💳'],
      ['Kitchen', '/admin/kitchendisplay/main-kitchen', '👨‍🍳'],
      ['Tables', '/admin/tables', '🍽️'],
      ['Messages', '/admin/notifications', '💬']
    ];
    return '<div class="pmd-v13-actions">' + items.map(function (i) { return '<a href="' + esc(i[1]) + '"><span>' + esc(i[2]) + '</span><b>' + esc(i[0]) + '</b></a>'; }).join('') + '</div>';
  }

  function dataProof(data) {
    var s = data.sections || {};
    var diag = s.table_diagnostics || {};
    var conn = (s.connections || []).filter(function (c) { return c.connected; });
    var chips = conn.slice(0, 18).map(function (c) { return '<span><b>' + esc(c.label || c.key) + '</b>' + esc(c.table || '') + ' · ' + esc(c.count == null ? '—' : c.count) + '</span>'; }).join('');
    var unmatched = (diag.unmatched_open_refs || []).map(function (r) { return '<li>Ref ' + esc(r.order_type || '—') + ' · ' + esc(r.open_orders || 0) + ' open · latest #' + esc(r.latest_order || '—') + '</li>'; }).join('');
    return '' +
      '<details class="pmd-v13-proof"><summary>Data connection proof / diagnostics</summary>' +
        '<div class="pmd-v13-proof-grid">' +
          miniStat('Current floor tables', diag.current_table_count || 0, 'from ti_tables') +
          miniStat('Service rows', diag.service_table_count || 0, 'Cashier / Delivery separated') +
          miniStat('Matched open refs', diag.matched_open_current_tables || 0, 'order_type → table_id') +
          miniStat('Unmapped refs', (diag.unmatched_open_refs || []).length, 'shown, not hidden') +
        '</div>' +
        (unmatched ? '<h3>Unmapped open order refs</h3><ul>' + unmatched + '</ul>' : '') +
        '<h3>Connected tables</h3><div class="pmd-v13-source-chips">' + chips + '</div>' +
      '</details>';
  }

  function render(data) {
    lastData = data;
    var s = data.sections || {};
    var snapshot = s.snapshot || [];
    var totalRevenue = snapshot.filter(function (x) { return x.label === 'Total Revenue'; })[0];
    var openChecks = snapshot.filter(function (x) { return x.label === 'Open Checks'; })[0];
    var staff = s.staff || {};

    root.innerHTML = '' +
      '<div class="pmd-v13-shell">' +
        '<header class="pmd-v13-topbar">' +
          '<div><h1>' + esc(greeting()) + ', ' + esc(findAdminName()) + '! 👋</h1><p>Here\'s what\'s happening at <b>Mimoza / PayMyDine</b></p></div>' +
          '<div class="pmd-v13-top-controls"><span>📅 ' + esc(nowLabel()) + '</span><span>🍽️ Live Restaurant Dashboard</span><a href="/admin/pmd-owner-dashboard-clean-v1-audit" target="_blank" rel="noopener">Audit</a></div>' +
        '</header>' +

        '<section class="pmd-v13-kpi-grid">' +
          topKpi(data, 'revenue_today', '💵', (totalRevenue ? ('All-time ' + totalRevenue.value) : metric(data, 'revenue_today').note), 'green') +
          topKpi(data, 'open_orders', '🧾', (openChecks ? (openChecks.value + ' open checks') : metric(data, 'open_orders').note), 'orange') +
          topKpi(data, 'active_tables', '🍽️', metric(data, 'active_tables').note, 'blue') +
          topKpi(data, 'reservations_today', '📅', metric(data, 'reservations_today').note, 'purple') +
        '</section>' +

        '<section class="pmd-v13-main-layout">' +
          section('Live Restaurant Floor', 'Live · table coordinates + open-check status', floorPlan(s.floor_plan), 'pmd-v13-card--floor', '<div class="pmd-v13-card-actions"><button type="button" data-pmd-owner-refresh>Refresh</button><a href="/admin/orders/create">New Order</a></div>') +
          section('AI Alerts', 'Operational alerts from connected PMD sources', alerts(data), 'pmd-v13-card--alerts', '<a href="/admin/orders">View all</a>') +
          section('Live Timeline', 'Orders and reservations from the live database', timeline(data), 'pmd-v13-card--timeline', '<a href="/admin/orders">View all</a>') +
        '</section>' +

        '<section class="pmd-v13-analytics-grid">' +
          section('Revenue by Order Trend', 'Connected to real orders; today may be zero', revenueByHour(data), 'pmd-v13-card--chart') +
          section('Payment Breakdown', 'Payments + open-check fallback', paymentBreakdown(data), 'pmd-v13-card--payment') +
          section('Average Guest Spend / Risk', 'Financial operations snapshot', smallFinance(data), 'pmd-v13-card--small') +
          section('Upcoming Reservations', 'Reception/table-booking view', listRows(s.upcoming_reservations, 'reservation'), 'pmd-v13-card--reservations') +
        '</section>' +

        '<section class="pmd-v13-bottom-grid">' +
          section('Top Servers / Roles', 'Connected to staff role tables; sales by server comes later when assignments are reliable', staffOverview(staff), 'pmd-v13-card--servers') +
          section('Kitchen Performance', 'Kitchen queue + KDS station health', kitchenPerformance(data), 'pmd-v13-card--kitchen') +
          section('Top Selling Items', 'Current open order items from ti_order_menus', barList(s.top_items, 'label', 'count', 6), 'pmd-v13-card--items') +
          section('Quick Actions', 'Fast owner/manager actions', quickActions(), 'pmd-v13-card--actions') +
        '</section>' +

        '<section class="pmd-v13-bottom-grid pmd-v13-bottom-grid--wide">' +
          section('Recent Live Orders', 'Draft/test rows are excluded', listRows(s.recent_orders, 'order'), 'pmd-v13-card--orders') +
          section('Current Service Mix', 'Distribution from current open checks', serviceMix(data), 'pmd-v13-card--mix') +
        '</section>' +

        dataProof(data) +
      '</div>';

    bind();
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
    var roles = staff.roles || [];
    return '<div class="pmd-v13-staff-total"><strong>' + esc(staff.total || 0) + '</strong><span>Total staff detected</span></div>' + barList(roles, 'label', 'count', 8);
  }

  function bind() {
    root.querySelectorAll('[data-pmd-floor]').forEach(function (btn) {
      btn.addEventListener('click', function () { selectedFloorId = btn.getAttribute('data-pmd-floor'); selectedTableId = null; render(lastData); });
    });
    root.querySelectorAll('[data-pmd-table]').forEach(function (btn) {
      btn.addEventListener('click', function () { selectedTableId = btn.getAttribute('data-pmd-table'); render(lastData); });
    });
    root.querySelectorAll('[data-pmd-owner-refresh]').forEach(function (btn) {
      btn.addEventListener('click', load);
    });
  }

  function renderError(err) {
    root.innerHTML = '<div class="pmd-v13-error"><h1>Owner dashboard failed to load</h1><p>' + esc(err && err.message ? err.message : err || 'Unknown error') + '</p><button type="button" data-pmd-owner-refresh>Try again</button></div>';
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
      tableDiagnostics: function () { return safeGet(['sections', 'table_diagnostics'], {}); },
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
