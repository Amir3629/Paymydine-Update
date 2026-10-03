/* PayMyDine Owner/Admin Dashboard Clean v3
   Owner-first dashboard: compact KPI header + corrected floor plan fit. */
(function () {
  'use strict';

  var VERSION = 'owner-clean-v3-20260625';
  var root = null;
  var refreshTimer = null;
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
    return (data && data.metrics && data.metrics[key]) || { label: key, value: '—', note: '', source: '' };
  }

  function card(data, key, icon, tone) {
    var m = metric(data, key);
    return '' +
      '<article class="pmd-owner-clean-kpi pmd-owner-clean-kpi--' + esc(tone || 'neutral') + '">' +
        '<div class="pmd-owner-clean-kpi-icon" aria-hidden="true">' + esc(icon || '•') + '</div>' +
        '<div class="pmd-owner-clean-kpi-main">' +
          '<span>' + esc(m.label) + '</span>' +
          '<strong>' + esc(m.value == null ? '—' : m.value) + '</strong>' +
          '<small>' + esc(m.note || m.source || '') + '</small>' +
        '</div>' +
      '</article>';
  }

  function section(title, subtitle, inner, extraClass) {
    return '' +
      '<section class="pmd-owner-clean-panel ' + esc(extraClass || '') + '">' +
        '<header class="pmd-owner-clean-panel-head">' +
          '<div><h2>' + esc(title) + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>' +
        '</header>' +
        '<div class="pmd-owner-clean-panel-body">' + inner + '</div>' +
      '</section>';
  }

  function alertPills(items) {
    if (!items || !items.length) {
      return '<div class="pmd-owner-clean-empty">No critical live alerts detected right now.</div>';
    }
    return items.map(function (item) {
      return '' +
        '<div class="pmd-owner-clean-alert pmd-owner-clean-alert--' + esc(item.level || 'info') + '">' +
          '<div><strong>' + esc(item.title || 'Alert') + '</strong><small>' + esc(item.note || '') + '</small></div>' +
          '<b>' + esc(item.value || '0') + '</b>' +
        '</div>';
    }).join('');
  }

  function miniRows(rows, type) {
    if (!rows || !rows.length) return '<div class="pmd-owner-clean-empty">No live rows detected yet.</div>';
    return '<div class="pmd-owner-clean-list">' + rows.map(function (row) {
      if (type === 'reservation') {
        return '' +
          '<div class="pmd-owner-clean-row">' +
            '<div><strong>' + esc(row.guest_name || 'Reservation') + '</strong><small>' + esc((row.reserve_date || '') + ' ' + (row.reserve_time || '')) + '</small></div>' +
            '<span>' + esc(row.guests || '—') + ' guests</span>' +
          '</div>';
      }
      return '' +
        '<div class="pmd-owner-clean-row">' +
          '<div><strong>Order #' + esc(row.id || '—') + '</strong><small>Table ' + esc(row.table_ref || '—') + ' · ' + esc(row.status || '—') + '</small></div>' +
          '<span>' + esc(row.total == null ? '—' : row.total) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function barList(items, labelKey, valueKey) {
    if (!items || !items.length) return '<div class="pmd-owner-clean-empty">No item data detected yet.</div>';
    var max = 1;
    items.forEach(function (item) { max = Math.max(max, Number(item[valueKey || 'count'] || 0)); });
    return '<div class="pmd-owner-clean-bars">' + items.map(function (item) {
      var value = Number(item[valueKey || 'count'] || 0);
      var pct = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
      return '' +
        '<div class="pmd-owner-clean-bar-row">' +
          '<div class="pmd-owner-clean-bar-label"><span>' + esc(item[labelKey || 'label'] || 'Item') + '</span><b>' + esc(value) + '</b></div>' +
          '<div class="pmd-owner-clean-bar-track"><i style="width:' + pct + '%"></i></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function serviceMix(data) {
    var mix = data && data.sections && data.sections.service_mix ? data.sections.service_mix : {};
    var items = [
      { label: 'Dine-in', count: mix.dine_in },
      { label: 'Takeaway', count: mix.takeaway },
      { label: 'Delivery', count: mix.delivery },
      { label: 'Unknown', count: mix.unknown }
    ].filter(function (x) { return x.count !== null && x.count !== undefined; });
    return barList(items, 'label', 'count');
  }

  function staffOverview(staff) {
    staff = staff || {};
    var roles = staff.roles || [];
    var top = '<div class="pmd-owner-clean-staff-total"><strong>' + esc(staff.total || 0) + '</strong><span>Total staff detected</span></div>';
    return top + barList(roles, 'label', 'count');
  }

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function pct(value, base) {
    base = Math.max(1, num(base, 1));
    return Math.max(0, Math.min(100, (num(value, 0) / base) * 100));
  }

  function statusLabel(status) {
    var map = {
      free: 'Free',
      active: 'Active',
      reserved: 'Reserved',
      attention: 'Attention',
      unpaid: 'Unpaid',
      ready: 'Ready'
    };
    return map[status] || status || 'Free';
  }

  function compactCapacityLabel(value) {
    return String(value || '')
      .replace(/\s*seats?\b/gi, '')
      .replace(/\s*\+\s*/g, '+')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function clampPct(value, min, max) {
    value = num(value, min);
    return Math.max(min, Math.min(max, value));
  }

  function floorPlanSection(fp) {
    fp = fp || {};
    var floors = fp.floors || [];
    var tables = fp.tables || [];
    var summary = fp.summary || {};

    if (!floors.length || !tables.length) {
      return section('Restaurant Floor Plan', 'Table layout from floor metadata.', '<div class="pmd-owner-clean-empty">No floor-plan tables were detected yet.</div>', 'pmd-owner-clean-panel--floor');
    }

    if (!selectedFloorId || !floors.some(function (f) { return String(f.id) === String(selectedFloorId); })) {
      selectedFloorId = fp.default_floor_id || floors[0].id;
    }

    var activeFloor = floors.filter(function (f) { return String(f.id) === String(selectedFloorId); })[0] || floors[0];
    selectedFloorId = activeFloor.id;
    var floorTables = tables.filter(function (t) { return String(t.floor_id) === String(activeFloor.id); });
    if (selectedTableId && !floorTables.some(function (t) { return String(t.id) === String(selectedTableId); })) {
      selectedTableId = null;
    }
    var selected = floorTables.filter(function (t) { return String(t.id) === String(selectedTableId); })[0] || null;

    var tabs = floors.map(function (floor) {
      var active = String(floor.id) === String(activeFloor.id) ? ' is-active' : '';
      return '<button type="button" class="pmd-owner-clean-floor-tab' + active + '" data-pmd-floor="' + esc(floor.id) + '">' + esc(floor.label || 'Floor') + '<b>' + esc(floor.tables || 0) + '</b></button>';
    }).join('');

    var legend = [
      ['free', summary.free || 0],
      ['active', summary.active || 0],
      ['reserved', summary.reserved || 0],
      ['attention', summary.attention || 0],
      ['unpaid', summary.unpaid || 0],
      ['ready', summary.ready || 0]
    ].map(function (x) {
      return '<span class="pmd-owner-clean-legend-item pmd-owner-clean-legend-item--' + esc(x[0]) + '"><i></i>' + esc(statusLabel(x[0])) + '<b>' + esc(x[1]) + '</b></span>';
    }).join('');

    var width = num(activeFloor.width, 1000);
    var height = num(activeFloor.height, 560);
    var nodes = floorTables.map(function (t) {
      var shape = String(t.shape || 'rectangle').toLowerCase();
      var cls = 'pmd-owner-clean-table-node pmd-owner-clean-table-node--' + esc(t.status || 'free') + ' pmd-owner-clean-table-node--' + esc(shape);
      if (selected && String(selected.id) === String(t.id)) cls += ' is-selected';
      var wPct = clampPct(pct(t.width, width), 9, 24);
      var hPct = clampPct(pct(t.height, height), 10, 22);
      var xPct = clampPct(pct(t.x, width), 1, 99 - wPct);
      var yPct = clampPct(pct(t.y, height), 4, 98 - hPct);
      var style = 'left:' + xPct.toFixed(3) + '%;top:' + yPct.toFixed(3) + '%;width:' + wPct.toFixed(3) + '%;height:' + hPct.toFixed(3) + '%;';
      return '' +
        '<button type="button" class="' + cls + '" style="' + style + '" data-pmd-table="' + esc(t.id) + '">' +
          '<span class="pmd-owner-clean-table-title"><strong>' + esc(t.label || ('Table ' + (t.number || t.id))) + '</strong><em>' + esc(statusLabel(t.status)) + '</em></span>' +
          '<small>' + esc(compactCapacityLabel(t.capacity_label || '')) + '</small>' +
        '</button>';
    }).join('');

    var detail = selected ? tableDetail(selected) : '<div class="pmd-owner-clean-floor-detail-empty"><strong>' + esc(activeFloor.label) + '</strong><span>Click a table to inspect live status, capacity, reservations and quick links.</span></div>';

    var body = '' +
      '<div class="pmd-owner-clean-floor-top">' +
        '<div class="pmd-owner-clean-floor-tabs">' + tabs + '</div>' +
        '<div class="pmd-owner-clean-floor-legend">' + legend + '</div>' +
      '</div>' +
      '<div class="pmd-owner-clean-floor-layout">' +
        '<div class="pmd-owner-clean-floor-stage" aria-label="Restaurant floor plan">' +
          nodes +
        '</div>' +
        '<aside class="pmd-owner-clean-floor-detail">' + detail + '</aside>' +
      '</div>';

    return section('Restaurant Floor Plan', 'Live table layout from restaurant table coordinates.', body, 'pmd-owner-clean-panel--floor');
  }

  function tableDetail(t) {
    var res = t.reservation || {};
    var details = [
      ['Status', statusLabel(t.status)],
      ['Capacity', t.capacity_label || '—'],
      ['Open orders', t.open_orders || 0],
      ['Ready', t.ready || 0],
      ['Due', t.due_label || '€0.00'],
      ['Waiter calls', t.waiter_calls || 0],
      ['Reservation', res.count ? ((res.next_time || 'today') + (res.guest_name ? ' · ' + res.guest_name : '')) : 'None today'],
      ['Section', (t.section || 'main') + (t.zone ? ' · ' + t.zone : '')]
    ].map(function (row) {
      return '<div><span>' + esc(row[0]) + '</span><b>' + esc(row[1]) + '</b></div>';
    }).join('');

    return '' +
      '<div class="pmd-owner-clean-floor-detail-card pmd-owner-clean-floor-detail-card--' + esc(t.status || 'free') + '">' +
        '<header><strong>' + esc(t.label || 'Table') + '</strong><small>' + esc(t.floor_name || '') + '</small></header>' +
        '<div class="pmd-owner-clean-floor-detail-grid">' + details + '</div>' +
        '<footer>' +
          '<a href="' + esc(t.create_order_url || '/admin/orders/create') + '">Create order</a>' +
          '<a href="' + esc(t.edit_url || '#') + '">Edit table</a>' +
        '</footer>' +
      '</div>';
  }

  function sourceDrawer(data) {
    var detected = data.detected_tables || {};
    var rows = Object.keys(detected).map(function (key) {
      return '<span><b>' + esc(key) + '</b>' + esc(detected[key] || 'not found') + '</span>';
    }).join('');
    return '<details class="pmd-owner-clean-sources"><summary>Detected database sources</summary><div>' + rows + '</div></details>';
  }

  function render(data) {
    lastData = data;
    var s = data.sections || {};

    root.innerHTML = '' +
      '<div class="pmd-owner-clean-shell">' +
        '<header class="pmd-owner-clean-hero pmd-owner-clean-hero--metrics">' +
          '<div class="pmd-owner-clean-kpis pmd-owner-clean-kpis--hero">' +
            card(data, 'revenue_today', '€', 'money') +
            card(data, 'orders_today', '🧾', 'orders') +
            card(data, 'open_orders', '⏳', 'open') +
            card(data, 'unpaid', '💳', 'danger') +
            card(data, 'reservations_today', '📅', 'reserve') +
            card(data, 'active_tables', '🍽️', 'tables') +
          '</div>' +
        '</header>' +

        '<div class="pmd-owner-clean-floor-anchor">' +
          floorPlanSection(s.floor_plan) +
        '</div>' +

        '<div class="pmd-owner-clean-grid pmd-owner-clean-grid--main">' +
          section('Live Attention', 'What the owner/manager must see first.', alertPills((s.alerts || {}).items), 'pmd-owner-clean-panel--alerts') +
          section('Restaurant Flow', 'Floor, kitchen, service, and reception snapshot.',
            '<div class="pmd-owner-clean-mini-grid">' +
              card(data, 'waiter_calls', '🔔', 'mini') +
              card(data, 'kitchen_queue', '👨‍🍳', 'mini') +
              card(data, 'customers_today', '👥', 'mini') +
              card(data, 'avg_ticket', '📈', 'mini') +
            '</div>') +
        '</div>' +

        '<div class="pmd-owner-clean-grid pmd-owner-clean-grid--three">' +
          section('Recent Orders', 'Latest detected orders.', miniRows(s.recent_orders, 'order')) +
          section('Upcoming Reservations', 'Reception/table-booking view.', miniRows(s.upcoming_reservations, 'reservation')) +
          section('Top Items', 'Best-selling detected menu items.', barList(s.top_items, 'label', 'count')) +
        '</div>' +

        '<div class="pmd-owner-clean-grid pmd-owner-clean-grid--two">' +
          section('Service Mix', 'Dine-in / takeaway / delivery distribution if order_type exists.', serviceMix(data)) +
          section('Staff Overview', 'Team and role distribution detected from staff tables.', staffOverview(s.staff || {})) +
        '</div>' +

        sourceDrawer(data) +
      '</div>';

    bindFloorPlan();
  }

  function bindFloorPlan() {
    if (!root) return;
    root.querySelectorAll('[data-pmd-floor]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedFloorId = btn.getAttribute('data-pmd-floor');
        selectedTableId = null;
        if (lastData) render(lastData);
      });
    });
    root.querySelectorAll('[data-pmd-table]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedTableId = btn.getAttribute('data-pmd-table');
        if (lastData) render(lastData);
      });
    });
  }

  function renderError(err) {
    root.innerHTML = '' +
      '<div class="pmd-owner-clean-error">' +
        '<h1>Owner dashboard failed to load</h1>' +
        '<p>' + esc(err && err.message ? err.message : err || 'Unknown error') + '</p>' +
        '<button type="button" data-pmd-owner-refresh>Try again</button>' +
        '<a href="/admin/pmd-owner-dashboard-clean-v1-audit" target="_blank" rel="noopener">Open audit endpoint</a>' +
      '</div>';
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
      })
      .catch(renderError)
      .finally(function () {
        if (root) root.classList.remove('is-loading');
      });
  }

  function boot() {
    if (!isDashboardPage()) return;
    root = document.getElementById('pmd-owner-dashboard-clean-v1-root');
    if (!root) return;
    window.PMDOwnerDashboardCleanV1 = {
      version: VERSION,
      reload: load,
      data: function () { return lastData; },
      audit: function () { window.open('/admin/pmd-owner-dashboard-clean-v1-audit', '_blank'); }
    };
    load();
    refreshTimer = window.setInterval(load, 60000);
    window.addEventListener('beforeunload', function () {
      if (refreshTimer) window.clearInterval(refreshTimer);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
