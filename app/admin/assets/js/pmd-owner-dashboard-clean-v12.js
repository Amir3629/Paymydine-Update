/* PayMyDine Owner/Admin Dashboard Clean v12
   Owner-first dashboard: compact KPI header + floor plan + reliable console health API. */
(function () {
  'use strict';

  var VERSION = 'owner-clean-v12-operational-cleanup-20260626';
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

  function formatMoney(value) {
    var n = Number(value);
    if (!isFinite(n)) return '—';
    try {
      return '€' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      return '€' + n.toFixed(2);
    }
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
    if (!rows || !rows.length) {
      var msg = type === 'reservation' ? 'No upcoming reservations detected.' : 'No recent live rows detected yet.';
      return '<div class="pmd-owner-clean-empty">' + esc(msg) + '</div>';
    }
    return '<div class="pmd-owner-clean-list">' + rows.map(function (row) {
      if (type === 'reservation') {
        var when = [row.reserve_date, row.reserve_time].filter(Boolean).join(' ');
        var guests = row.guests ? (row.guests + ' guests') : '—';
        var table = row.table_ref ? (' · Table ' + row.table_ref) : '';
        return '' +
          '<div class="pmd-owner-clean-row pmd-owner-clean-row--reservation">' +
            '<div><strong>' + esc(row.guest_name || 'Reservation') + '</strong><small>' + esc((when || 'Upcoming') + table) + '</small></div>' +
            '<span>' + esc(guests) + '</span>' +
          '</div>';
      }
      var total = row.total_label || row.total_formatted || (row.total == null ? '—' : formatMoney(row.total));
      var status = row.status_label || row.status || '—';
      var tableLabel = row.table_label || (row.table_ref ? ('Table ' + row.table_ref) : 'No table');
      var customer = row.customer_label && row.customer_label !== 'Guest' ? (' · ' + row.customer_label) : '';
      var settlement = row.settlement_label && row.settlement_label !== '—' ? (' · ' + row.settlement_label) : '';
      var orderInner = '' +
        '<div><strong>Order #' + esc(row.id || '—') + '</strong><small>' + esc(tableLabel + ' · ' + status + settlement + customer) + '</small></div>' +
        '<span>' + esc(total) + '</span>';
      if (row.edit_url) {
        return '<a class="pmd-owner-clean-row pmd-owner-clean-row--link" href="' + esc(row.edit_url) + '">' + orderInner + '</a>';
      }
      return '<div class="pmd-owner-clean-row">' + orderInner + '</div>';
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


  function sidebarLogoGuard() {
    if (!isDashboardPage()) return;

    function rect(el) {
      try { return el.getBoundingClientRect(); }
      catch (e) { return { left: 9999, top: 9999, width: 0, height: 0 }; }
    }

    var possible = Array.prototype.slice.call(document.querySelectorAll([
      'aside', 'nav', '#sidebar', '#sidebar-wrapper', '.sidebar', '.side-nav', '.sidenav',
      '.main-sidebar', '.page-sidebar', '.navbar-sidebar', '.admin-sidebar',
      '[class*="sidebar"]', '[id*="sidebar"]'
    ].join(',')));

    var sidebar = null;
    possible.forEach(function (el) {
      var r = rect(el);
      var text = (el.innerText || el.textContent || '').trim();
      var hasAdminNav = /Dashboard|Orders|Reservations|Kitchen Display|System|Restaurant/i.test(text);
      if (!hasAdminNav) return;
      if (r.left > 60 || r.width < 90 || r.width > 360 || r.height < 300) return;
      if (!sidebar || r.height > rect(sidebar).height) sidebar = el;
    });

    if (!sidebar) return;

    var imgs = Array.prototype.slice.call(sidebar.querySelectorAll('img')).filter(function (img) {
      var src = String(img.currentSrc || img.src || '');
      var alt = String(img.alt || '');
      var r = rect(img);
      if (r.width < 24 || r.height < 18 || r.top > 380) return false;
      return /pmd|paymydine|pay-my-dine|logo|logo-candidates/i.test(src + ' ' + alt);
    });

    if (imgs.length <= 1) return;

    var keep = imgs.slice().sort(function (a, b) {
      var ra = rect(a), rb = rect(b);
      var areaA = ra.width * ra.height;
      var areaB = rb.width * rb.height;
      if (areaB !== areaA) return areaB - areaA;
      return rb.top - ra.top;
    })[0];

    function findSafeLogoBlock(img) {
      var best = img;
      var el = img.parentElement;
      var depth = 0;
      while (el && el !== sidebar && depth < 7) {
        var text = (el.innerText || el.textContent || '').trim();
        var r = rect(el);
        if (/Dashboard|Orders|Reservations|Kitchen Display|Coupons|Restaurant|Design|System/i.test(text)) {
          break;
        }
        if (r.width <= 300 && r.height <= 240 && r.left < 80) best = el;
        el = el.parentElement;
        depth++;
      }
      return best;
    }

    imgs.forEach(function (img) {
      if (img === keep) return;
      var block = findSafeLogoBlock(img);
      block.setAttribute('data-pmd-owner-sidebar-logo-hidden', '1');
      block.style.setProperty('display', 'none', 'important');
    });

    Array.prototype.slice.call(sidebar.querySelectorAll('*')).forEach(function (el) {
      var text = (el.innerText || el.textContent || '').trim();
      var r = rect(el);
      if (r.top > 360 || r.left > 260) return;
      if (/^(?:[↔↩↪⇄←→\s]*)?\d+\s*\/\s*\d+$/.test(text)) {
        var b = el;
        var p = el.parentElement;
        var depth = 0;
        while (p && p !== sidebar && depth < 4) {
          var pr = rect(p);
          var pText = (p.innerText || p.textContent || '').trim();
          if (/Dashboard|Orders|Reservations|Kitchen Display|System/i.test(pText)) break;
          if (pr.width <= 180 && pr.height <= 90) b = p;
          p = p.parentElement;
          depth++;
        }
        b.setAttribute('data-pmd-owner-sidebar-logo-hidden', '1');
        b.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function scheduleSidebarLogoGuard() {
    sidebarLogoGuard();
    [120, 450, 1000, 2400].forEach(function (ms) {
      window.setTimeout(sidebarLogoGuard, ms);
    });
  }

  function snapshotStrip(items) {
    items = items || [];
    if (!items.length) return '';
    var visible = items.slice(0, 8);
    return '<div class="pmd-owner-clean-live-strip">' + visible.map(function (item) {
      return '' +
        '<div class="pmd-owner-clean-live-pill">' +
          '<span>' + esc(item.label || 'Source') + '</span>' +
          '<strong>' + esc(item.value == null ? '—' : item.value) + '</strong>' +
          '<small>' + esc(item.note || '') + '</small>' +
        '</div>';
    }).join('') + '</div>';
  }

  function serviceMix(data) {
    var mix = data && data.sections && data.sections.service_mix ? data.sections.service_mix : {};
    var items = [
      { label: 'Dine-in', count: mix.dine_in },
      { label: 'Takeaway', count: mix.takeaway },
      { label: 'Delivery', count: mix.delivery },
      { label: 'Cashier/POS', count: mix.cashier },
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

  function connectionGrid(items) {
    items = items || [];
    if (!items.length) return '<div class="pmd-owner-clean-empty">No database connection map returned yet.</div>';
    return '<div class="pmd-owner-clean-connection-grid">' + items.map(function (item) {
      var cls = item.connected ? 'is-connected' : 'is-missing';
      var count = item.count === null || item.count === undefined ? '—' : item.count;
      return '' +
        '<div class="pmd-owner-clean-connection ' + cls + '">' +
          '<i></i>' +
          '<div><strong>' + esc(item.label || item.key || 'Source') + '</strong><small>' + esc(item.table || 'not detected') + '</small></div>' +
          '<b>' + esc(count) + '</b>' +
        '</div>';
    }).join('') + '</div>';
  }

  function operationsNote(ops) {
    ops = ops || {};
    var rows = [
      ['Business day', ops.business_day || 'today'],
      ['Order ↔ table link', ops.order_table_link || 'not detected'],
      ['Revenue source', ops.revenue_source || 'not detected'],
      ['Payment source', ops.payment_source || 'not detected'],
      ['Floor source', ops.floor_source || 'not detected'],
      ['Menu source', ops.menu_source || 'not detected'],
      ['Table diagnostics', ops.table_diagnostics || 'not detected']
    ];
    return '<div class="pmd-owner-clean-ops-list">' + rows.map(function (r) {
      return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>';
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


  function menuInventoryPanel(inv) {
    inv = inv || {};
    var stats = [
      ['Foods', inv.menus_total || 0],
      ['Categories', inv.categories_total || 0],
      ['Menu links', inv.menu_category_links || 0],
      ['Media files', inv.media_total || 0],
      ['Menu images table', inv.menu_images_total || 0],
      ['Order item rows', inv.order_item_rows || 0]
    ];
    var statHtml = '<div class="pmd-owner-clean-proof-grid">' + stats.map(function (r) {
      return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>';
    var cats = (inv.categories || []).slice(0, 8).map(function (c) { return '<span>' + esc(c.name || c.label || c.id) + '</span>'; }).join('');
    var menus = (inv.menus || []).slice(0, 10).map(function (m) { return '<div class="pmd-owner-clean-mini-line"><strong>' + esc(m.name || m.id) + '</strong><small>' + esc(m.price == null ? '' : formatMoney(m.price)) + '</small></div>'; }).join('');
    return statHtml +
      '<h3 class="pmd-owner-clean-subhead">Categories</h3><div class="pmd-owner-clean-chip-list">' + (cats || '<span>No categories detected</span>') + '</div>' +
      '<h3 class="pmd-owner-clean-subhead">Foods / menu sample</h3><div class="pmd-owner-clean-mini-lines">' + (menus || '<div class="pmd-owner-clean-empty">No menu rows detected</div>') + '</div>';
  }

  function tableDiagnosticsPanel(diag) {
    diag = diag || {};
    var stats = [
      ['Current floor tables', diag.current_table_count || 0],
      ['Service rows', diag.service_table_count || 0],
      ['Matched open refs', diag.matched_open_current_tables || 0],
      ['Unmapped open refs', (diag.unmatched_open_refs || []).length],
      ['Table merges', diag.table_merges_count || 0],
      ['Waiter assignments', diag.waiter_assignment_count || 0]
    ];
    var statHtml = '<div class="pmd-owner-clean-proof-grid">' + stats.map(function (r) {
      return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>';
    var unmatched = (diag.unmatched_open_refs || []).map(function (r) {
      return '<div class="pmd-owner-clean-row"><div><strong>Ref ' + esc(r.order_type || '—') + '</strong><small>Latest order #' + esc(r.latest_order || '—') + '</small></div><span>' + esc(r.open_orders || 0) + ' open</span></div>';
    }).join('');
    var matched = (diag.matched_open_refs || []).map(function (r) {
      return '<div class="pmd-owner-clean-row"><div><strong>Table ' + esc(r.table_no || r.table_id || r.order_type) + '</strong><small>order_type ' + esc(r.order_type || '—') + ' → table_id ' + esc(r.table_id || '—') + '</small></div><span>' + esc(r.open_orders || 0) + ' open</span></div>';
    }).join('');
    var services = (diag.service_tables || []).map(function (r) {
      return '<span>' + esc((r.table_name || 'service') + ' #' + (r.table_id || '')) + '</span>';
    }).join('');
    return statHtml +
      '<h3 class="pmd-owner-clean-subhead">Matched current floor tables</h3><div class="pmd-owner-clean-list">' + (matched || '<div class="pmd-owner-clean-empty">No open orders matched to current floor tables.</div>') + '</div>' +
      '<h3 class="pmd-owner-clean-subhead">Unmapped / legacy order refs</h3><div class="pmd-owner-clean-list">' + (unmatched || '<div class="pmd-owner-clean-empty">No unmatched open refs.</div>') + '</div>' +
      '<h3 class="pmd-owner-clean-subhead">Separated service rows</h3><div class="pmd-owner-clean-chip-list">' + (services || '<span>No service rows detected</span>') + '</div>';
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
          snapshotStrip(s.snapshot) +
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
          section('Recent Live Orders', 'Draft/test rows with status_id 0 are excluded.', miniRows(s.recent_orders, 'order')) +
          section('Upcoming Reservations', 'Reception/table-booking view.', miniRows(s.upcoming_reservations, 'reservation')) +
          section('Top Items Today', 'Only items detected from today\'s orders.', barList(s.top_items, 'label', 'count')) +
        '</div>' +

        '<div class="pmd-owner-clean-grid pmd-owner-clean-grid--two">' +
          section('Real Menu / Content Sources', 'Foods, categories, media and order-item rows from the real Mimoza tables.', menuInventoryPanel(s.menu_inventory || {}), 'pmd-owner-clean-panel--proof') +
          section('Table / Order Source Match', 'Shows matched current floor tables and unmapped legacy/order_type refs instead of hiding them.', tableDiagnosticsPanel(s.table_diagnostics || {}), 'pmd-owner-clean-panel--proof') +
        '</div>' +

        '<div class="pmd-owner-clean-grid pmd-owner-clean-grid--two">' +
          section('Current Service Mix', 'Distribution from current open checks, not today-only drafts.', serviceMix(data)) +
          section('Staff Overview', 'Team and role distribution detected from staff tables.', staffOverview(s.staff || {})) +
        '</div>' +

        '<div class="pmd-owner-clean-grid pmd-owner-clean-grid--two">' +
          section('Live Data Connections', 'Every real database source currently connected to this owner dashboard.', connectionGrid(s.connections || []), 'pmd-owner-clean-panel--connections') +
          section('Connection Logic', 'How the dashboard is linking orders, tables, payments and floor data.', operationsNote(s.operations || {}), 'pmd-owner-clean-panel--ops') +
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
        exposeApi();
        scheduleSidebarLogoGuard();
        if (window.console && console.info) console.info('[PMD Owner Dashboard]', VERSION, health());
      })
      .catch(renderError)
      .finally(function () {
        if (root) root.classList.remove('is-loading');
      });
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
    var metrics = lastData && lastData.metrics ? lastData.metrics : {};
    return {
      version: VERSION,
      path: window.location.pathname,
      root_found: !!root,
      loaded: !!lastData,
      generated_at: lastData && lastData.generated_at ? lastData.generated_at : null,
      endpoint_version: lastData && lastData.version ? lastData.version : null,
      metrics_keys: Object.keys(metrics),
      floor_plan_loaded: !!fp,
      floor_count: fp && fp.floors ? fp.floors.length : 0,
      table_count: fp && fp.tables ? fp.tables.length : 0,
      connected_sources: safeGet(['sections', 'connections'], []).filter(function (x) { return x.connected; }).length,
      selected_floor_id: selectedFloorId,
      selected_table_id: selectedTableId
    };
  }

  function exposeApi() {
    var api = {
      version: VERSION,
      reload: function () { load(); return 'PMD owner dashboard reload started'; },
      data: function () { return lastData || null; },
      metrics: function () { return lastData && lastData.metrics ? lastData.metrics : null; },
      floorPlan: function () { return safeGet(['sections', 'floor_plan'], null); },
      topItems: function () { return safeGet(['sections', 'top_items'], []); },
      recentOrders: function () { return safeGet(['sections', 'recent_orders'], []); },
      connections: function () { return safeGet(['sections', 'connections'], []); },
      snapshot: function () { return safeGet(['sections', 'snapshot'], []); },
      operations: function () { return safeGet(['sections', 'operations'], {}); },
      nativeMatch: function () { return {operations: safeGet(['sections', 'operations'], {}), floor_plan: safeGet(['sections','floor_plan'], null), recent_orders: safeGet(['sections','recent_orders'], []), table_diagnostics: safeGet(['sections','table_diagnostics'], {})}; },
      menuInventory: function () { return safeGet(['sections','menu_inventory'], {}); },
      tableDiagnostics: function () { return safeGet(['sections','table_diagnostics'], {}); },
      fixSidebarLogo: function () { scheduleSidebarLogoGuard(); return 'sidebar logo guard executed'; },
      health: health,
      audit: function () { window.open('/admin/pmd-owner-dashboard-clean-v1-audit', '_blank'); return 'audit opened'; }
    };
    window.PMDOwnerDashboardCleanV1 = api;
    window.PMDOwnerDashboardCleanV5 = api;
    window.PMDOwnerDashboardCleanV9 = api;
    window.PMDOwnerDashboardCleanV12 = api;
    return api;
  }

  function boot() {
    if (!isDashboardPage()) return;
    root = document.getElementById('pmd-owner-dashboard-clean-v1-root');
    if (!root) return;
    exposeApi();
    scheduleSidebarLogoGuard();
    load();
    refreshTimer = window.setInterval(load, 60000);
    window.addEventListener('beforeunload', function () {
      if (refreshTimer) window.clearInterval(refreshTimer);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
