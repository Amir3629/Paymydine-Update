/* PayMyDine Owner/Admin Dashboard Clean v18
   Reference-style restaurant operations dashboard using the real v12 data model. */
(function () {
  'use strict';

  var VERSION = 'owner-clean-v18-pixel-reference-ops-20260626';
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
    return '' +
      '<article class="pmd-v15-kpi pmd-v15-kpi--' + esc(tone || 'neutral') + '">' +
        '<div class="pmd-v15-kpi-icon">' + esc(icon) + '</div>' +
        '<div class="pmd-v15-kpi-copy">' +
          '<span>' + esc(m.label) + '</span>' +
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
        '<button type="button" title="' + esc(title) + '" data-pmd-table="' + esc(t.id) + '" class="pmd-v15-floor-node pmd-v15-floor-node--' + esc(t.status || 'free') + '" style="left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%">' +
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
      '<div class="pmd-v15-chart-note">Connected to <b>ti_orders</b> / <b>ti_order_totals</b>. All-time context: ' + esc(totalRevenue ? totalRevenue.value : fmtMoney(todayRevenue)) + '</div>';
  }

  function paymentBreakdown(data) {
    var pending = rawMetric(data, 'unpaid');
    var paidToday = (((data.sections || {}).payment || {}).paid_today_raw || 0);
    var total = Math.max(1, pending + paidToday);
    var pctPaid = (paidToday / total) * 100;
    return '<div class="pmd-v15-payment-grid">' + donut(pctPaid, fmtMoney(pending + paidToday)) + '<div class="pmd-v15-payment-lines">' +
      '<div><i class="pmd-v15-pay-open"></i><span>Open / pending</span><b>' + esc(fmtMoney(pending)) + '</b></div>' +
      '<div><i class="pmd-v15-pay-paid"></i><span>Paid today</span><b>' + esc(fmtMoney(paidToday)) + '</b></div>' +
      '<small>No payment transaction rows exist yet, so this card shows current open-check value instead of pretending to be settled payment data.</small>' +
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
      '<div class="pmd-v15-kitchen-metrics pmd-v18-kitchen-metrics">' +
        miniStat('Avg Prep Time', s.avg_prep_label || '—', 'from prep estimate when available', 'green') +
        miniStat('Delayed Orders', String(delayed), delayed ? 'needs attention' : 'no delayed rows detected', 'orange') +
        miniStat('On-time Rate', String(onTime) + '%', 'estimated from open kitchen rows', 'blue') +
      '</div>' +
      '<div class="pmd-v15-kitchen-metrics pmd-v18-kitchen-mini">' +
        miniStat('Kitchen Queue', q.value || '0', q.note || '', 'orange') +
        miniStat('Ready', String(s.ready || 0), 'ready order/item rows', 'green') +
        miniStat('KDS Stations', String(s.stations || 0), 'connected kitchen displays', 'blue') +
      '</div>' +
      '<div class="pmd-v15-rush"><span>Rush Status</span><b>' + (Number(q.raw || 0) > 8 || delayed > 0 ? 'High' : (Number(q.raw || 0) > 0 ? 'Medium' : 'Calm')) + '</b></div>';
  }

  function quickActions() {
    var items = [
      ['Walk-in', '/admin/reservations/create', '👥'],
      ['New Order', '/admin/orders/create', '🧾'],
      ['Split Bill', '/admin/orders', '💳'],
      ['Send Message', '/admin/notifications', '💬']
    ];
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
    var s = data.sections || {};
    var snapshot = s.snapshot || [];
    var totalRevenue = snapshot.filter(function (x) { return x.label === 'Total Revenue'; })[0];
    var openChecks = snapshot.filter(function (x) { return x.label === 'Open Checks'; })[0];
    var staff = s.staff || {};

    root.innerHTML = '' +
      '<div class="pmd-v15-shell pmd-v18-shell">' +
        '<header class="pmd-v15-topbar pmd-v18-topbar">' +
          '<div><h1>' + esc(greeting()) + ', ' + esc(findAdminName()) + '! 👋</h1><p>Here\'s what\'s happening at <b>Mimoza / PayMyDine</b></p></div>' +
          '<div class="pmd-v15-top-controls"><span>📅 Today · ' + esc(nowLabel()) + '</span><span>🍽️ Dinner Shift · Live</span></div>' +
        '</header>' +

        '<section class="pmd-v15-kpi-grid pmd-v18-kpi-grid">' +
          topKpi(data, 'revenue_today', '💵', (totalRevenue ? ('All-time ' + totalRevenue.value) : metric(data, 'revenue_today').note), 'green') +
          topKpi(data, 'open_orders', '🧾', (openChecks ? (openChecks.value + ' open checks') : metric(data, 'open_orders').note), 'orange') +
          topKpi(data, 'active_tables', '🍽️', 'Current visible busy tables', 'blue') +
          topKpi(data, 'reservations_today', '📅', metric(data, 'reservations_today').note, 'purple') +
        '</section>' +

        '<section class="pmd-v18-reference-grid">' +
          section('Live Restaurant Floor', 'Live · table coordinates + open-check status', floorPlan(s.floor_plan), 'pmd-v15-card--floor pmd-v18-area-floor', '<div class="pmd-v15-card-actions"><button type="button" data-pmd-owner-refresh>Refresh</button><a href="/admin/orders/create">New Order</a></div>') +
          section('AI Alerts', 'Owner-relevant connected issues', alerts(data), 'pmd-v15-card--alerts pmd-v18-area-alerts', '<a href="/admin/orders">View all</a>') +
          section('Recent Activity', 'Latest recorded orders and reservations', timeline(data), 'pmd-v15-card--timeline pmd-v18-area-timeline', '<a href="/admin/orders">View all</a>') +
        '</section>' +

        '<section class="pmd-v18-analytics-grid">' +
          section('Revenue by Order Trend', 'Connected to real orders; today may be zero', revenueByHour(data), 'pmd-v15-card--chart') +
          section('Open Check Value', 'Open-check fallback until payment transactions exist', paymentBreakdown(data), 'pmd-v15-card--payment') +
          section('Average Check Spend', 'Average spend from real order totals', smallFinance(data), 'pmd-v15-card--small') +
          section('Lost Revenue', 'No-shows, cancellations, and open-check risk', lostRevenue(data), 'pmd-v15-card--lost') +
          section('Upcoming Reservations', 'Reception/table-booking view', listRows(s.upcoming_reservations, 'reservation'), 'pmd-v15-card--reservations') +
        '</section>' +

        '<section class="pmd-v18-bottom-grid">' +
          section('Top Servers', 'Staff activity from assignments when available; otherwise team overview', staffOverview(staff), 'pmd-v15-card--servers') +
          section('Kitchen Performance', 'Prep time, delay risk, queue and KDS health', kitchenPerformance(data), 'pmd-v15-card--kitchen') +
          section('Top Open Items', 'Items currently sitting inside open checks', barList(s.top_items, 'label', 'count', 3), 'pmd-v15-card--items') +
          section('Quick Actions', 'Fast owner/manager actions', quickActions(), 'pmd-v15-card--actions') +
        '</section>' +
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
    var servers = staff.servers || [];
    if (servers.length) {
      var max = 1;
      servers.forEach(function (x) { max = Math.max(max, Number(x.total || 0), Number(x.orders || 0)); });
      return '<div class="pmd-v15-staff-total"><strong>' + esc(staff.total || 0) + '</strong><span>Team members detected</span></div>' +
        '<div class="pmd-v18-server-list">' + servers.map(function (x, idx) {
          var val = Number(x.total || 0) || Number(x.orders || 0);
          var pct = Math.max(4, Math.min(100, (val / max) * 100));
          return '<div class="pmd-v15-bar-row"><div class="pmd-v15-bar-label"><span><b>' + (idx + 1) + '</b>' + esc(x.label || 'Staff') + '</span><em>' + esc(x.total_label || (x.orders || 0) + ' orders') + '</em></div><div class="pmd-v15-bar-track"><i style="width:' + pct + '%"></i></div><small>' + esc(x.orders || 0) + ' open/active order(s)</small></div>';
        }).join('') + '</div>';
    }
    var roles = staff.roles || [];
    return '<div class="pmd-v15-staff-total"><strong>' + esc(staff.total || 0) + '</strong><span>Team members detected</span></div>' + barList(roles, 'label', 'count', 8);
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
