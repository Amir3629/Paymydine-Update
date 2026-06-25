(function () {
  'use strict';

  if (!/^\/admin\/dashboard\/?$/.test(location.pathname)) return;
  if (window.__PMD_WAITER_DASHBOARD_V161__) return;
  window.__PMD_WAITER_DASHBOARD_V161__ = true;

  const VERSION = 'v161-direct-renderer';
  const ENDPOINT = '/admin/pmd-waiter-dashboard-data';

  let DATA = null;
  let selectedId = null;
  let filterMine = false;
  let floorFilter = 'all';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const money = (v) => '€' + Number(v || 0).toFixed(2);

  function tableId(t) {
    return Number(t.id || t.table_id || t.tableId);
  }

  function capacity(t) {
    return Math.max(1, Math.min(14, Number(t.capacity || t.preferred_capacity || t.max_capacity || t.min_capacity || 2)));
  }

  function status(t) {
    const raw = String(t.status || 'free').toLowerCase();
    if (raw.includes('ready')) return 'ready';
    if (raw.includes('kitchen') || raw.includes('sent')) return 'kitchen';
    if (raw.includes('call') || raw.includes('note') || raw.includes('attention')) return 'attention';
    if (raw.includes('paid')) return 'paid';
    if (raw.includes('busy') || raw.includes('open') || raw.includes('active') || raw.includes('partial')) return 'active';
    return 'free';
  }

  function statusLabel(s) {
    return {
      free: 'Free',
      active: 'Open / partial',
      kitchen: 'Kitchen',
      ready: 'Ready',
      attention: 'Call / note',
      paid: 'Paid'
    }[s] || 'Free';
  }

  function tableSize(t) {
    const c = capacity(t);
    if (c <= 2) return { w: 170, h: 92 };
    if (c <= 4) return { w: 230, h: 106 };
    if (c <= 6) return { w: 300, h: 116 };
    return { w: 370, h: 126 };
  }

  function chairPositions(count) {
    if (count <= 2) return [[50, -18], [50, 118]];
    if (count <= 4) return [[50, -18], [118, 50], [50, 118], [-18, 50]];
    if (count <= 6) return [[30, -18], [70, -18], [118, 50], [70, 118], [30, 118], [-18, 50]];
    if (count <= 8) return [[22, -18], [50, -18], [78, -18], [118, 50], [78, 118], [50, 118], [22, 118], [-18, 50]];

    const out = [];
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i / count) - Math.PI / 2;
      out.push([50 + Math.cos(a) * 68, 50 + Math.sin(a) * 68]);
    }
    return out;
  }

  function floorName(t) {
    return String(t.floor_name || t.floor || 'Main Floor');
  }

  function visibleTables() {
    const all = Array.isArray(DATA?.tables) ? DATA.tables : [];
    return all.filter(t => {
      if (filterMine && t.assigned === false) return false;
      if (floorFilter !== 'all' && floorName(t) !== floorFilter) return false;
      return true;
    });
  }

  function autoLayout(tables) {
    const n = tables.length;

    if (n === 1) return tables.map((t, i) => ({ ...t, _x: 50, _y: 50 }));
    if (n === 2) return tables.map((t, i) => ({ ...t, _x: i === 0 ? 35 : 65, _y: 50 }));
    if (n === 3) {
      const p = [[32, 34], [68, 34], [50, 68]];
      return tables.map((t, i) => ({ ...t, _x: p[i][0], _y: p[i][1] }));
    }
    if (n === 4) {
      const p = [[28, 32], [60, 32], [28, 68], [60, 68]];
      return tables.map((t, i) => ({ ...t, _x: p[i][0], _y: p[i][1] }));
    }

    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    return tables.map((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...t,
        _x: ((col + 0.5) / cols) * 84 + 8,
        _y: ((row + 0.5) / rows) * 70 + 15
      };
    });
  }

  function nodeHtml(t) {
    const id = tableId(t);
    const s = status(t);
    const size = tableSize(t);

    const chairs = chairPositions(capacity(t)).map(([x, y]) =>
      `<span class="pmd161-chair" style="left:${x}%;top:${y}%;"></span>`
    ).join('');

    return `
      <div
        class="pmd161-table-wrap"
        data-table-id="${esc(id)}"
        style="left:${Number(t._x).toFixed(2)}%;top:${Number(t._y).toFixed(2)}%;width:${size.w}px;height:${size.h}px;"
      >
        <button
          type="button"
          class="pmd161-table-node status-${s} ${selectedId === id ? 'selected' : ''} ${t.assigned === false ? 'not-mine' : ''}"
          title="${esc(t.label || ('Table ' + (t.number || id)))} · ${esc(statusLabel(s))} · ${capacity(t)} seats"
        >
          ${chairs}
          <span>${esc(t.number || t.table_no || id)}</span>
        </button>
      </div>
    `;
  }

  function selectedTable() {
    const tables = visibleTables();
    return tables.find(t => tableId(t) === selectedId) || tables[0] || null;
  }

  function actionUrl(t, type) {
    const id = tableId(t);
    if (type === 'order') return t.order_url || `/admin/orders/create?table_id=${encodeURIComponent(id)}`;
    if (type === 'payment') return t.payment_url || `/admin/payments?table_id=${encodeURIComponent(id)}`;
    return t.details_url || `/admin/tables/edit/${encodeURIComponent(id)}`;
  }

  function selectedHtml(t) {
    if (!t) return '';
    const s = status(t);
    return `
      <div class="pmd161-selected">
        <div>
          <h3>${esc(t.label || ('Table ' + (t.number || tableId(t))))}</h3>
          <p>${esc(statusLabel(s))} · ${capacity(t)} seats · ${esc(floorName(t))} / ${esc(t.section || t.table_section || 'main')}</p>
        </div>
        <div class="pmd161-actions">
          <a class="pmd161-action primary" href="${esc(actionUrl(t, 'order'))}">Add items</a>
          <a class="pmd161-action" href="${esc(actionUrl(t, 'details'))}">Details</a>
          <a class="pmd161-action" href="${esc(actionUrl(t, 'payment'))}">Bill / Payment</a>
        </div>
      </div>
    `;
  }

  function cardHtml(t) {
    const s = status(t);
    return `
      <article class="pmd161-card">
        <h3>${esc(t.label || ('Table ' + (t.number || tableId(t))))}</h3>
        <span class="pmd161-pill">${esc(statusLabel(s))}</span>

        <div class="pmd161-mini-grid">
          <div class="pmd161-mini"><span>Orders</span><strong>${Number(t.orders_count || t.orders || 0)}</strong></div>
          <div class="pmd161-mini"><span>Ready</span><strong>${Number(t.ready_count || t.ready || 0)}</strong></div>
          <div class="pmd161-mini"><span>Due</span><strong>${money(t.due || t.payments_due || 0)}</strong></div>
          <div class="pmd161-mini"><span>Capacity</span><strong>${capacity(t)}</strong></div>
        </div>

        <p style="margin:0 0 14px;color:#667085;font-weight:850">${esc(floorName(t))} / ${esc(t.section || t.table_section || 'main')}</p>

        <div class="pmd161-actions">
          <a class="pmd161-action primary" href="${esc(actionUrl(t, 'order'))}">Add items</a>
          <a class="pmd161-action" href="${esc(actionUrl(t, 'details'))}">Details</a>
          <a class="pmd161-action" href="${esc(actionUrl(t, 'payment'))}">Bill / Payment</a>
        </div>
      </article>
    `;
  }

  function ensureRoot() {
    document.body.classList.add('pmd-waiter-v161-active');

    document.querySelectorAll('#pmd-waiter-v160-holder,#pmd-waiter-dashboard-root,#pmd-waiter-dashboard-v160-root,#pmd-waiter-v149-root,#pmd-waiter-v150-root,#pmd-waiter-v151-root,#pmd-floor-v146-root').forEach(el => {
      el.style.setProperty('display', 'none', 'important');
    });

    let holder = document.getElementById('pmd-waiter-v161-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'pmd-waiter-v161-holder';

      const nav = document.querySelector('nav.navbar-fixed-top,.navbar-fixed-top,.navbar-top');
      if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(holder, nav.nextSibling);
      } else {
        document.body.prepend(holder);
      }
    }

    let root = document.getElementById('pmd-waiter-dashboard-v161-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'pmd-waiter-dashboard-v161-root';
      holder.innerHTML = '';
      holder.appendChild(root);
    }

    return root;
  }

  function render() {
    const root = ensureRoot();

    if (!DATA?.ok) {
      root.innerHTML = `<div class="pmd161-floor-card"><h2>Dashboard unavailable</h2><p>Could not load waiter dashboard data.</p></div>`;
      return;
    }

    const k = DATA.kpis || {};
    const tables = autoLayout(visibleTables());
    const floors = [...new Set((DATA.tables || []).map(floorName))];

    if (!selectedId && tables[0]) selectedId = tableId(tables[0]);
    if (tables.length && !tables.find(t => tableId(t) === selectedId)) selectedId = tableId(tables[0]);

    const selected = selectedTable();
    const tableNodes = tables.map(nodeHtml).join('');
    const tableCards = tables.map(cardHtml).join('');

    root.innerHTML = `
      <section class="pmd161-topbar">
        <div class="pmd161-title">
          <h1>Waiter Dashboard</h1>
          <p>Live floor, orders, tables and payments</p>
        </div>
        <div class="pmd161-kpi"><span>Tables / My tables</span><strong>${Number(k.floor_tables || tables.length || 0)} / ${Number(k.my_tables || tables.length || 0)}</strong></div>
        <div class="pmd161-kpi"><span>Ready to serve</span><strong>${Number(k.ready || 0)}</strong></div>
        <div class="pmd161-kpi"><span>Active orders</span><strong>${Number(k.open_orders || k.active_orders || 0)}</strong></div>
        <div class="pmd161-kpi"><span>Needs attention</span><strong>${Number(k.calls_notes || k.attention || 0)}</strong></div>
        <div class="pmd161-kpi"><span>Payments due</span><strong>${money(k.due || 0)}</strong></div>
      </section>

      <div class="pmd161-toolbar">
        <button class="pmd161-btn ${!filterMine ? 'active' : ''}" data-pmd161-filter="all">All floor</button>
        <button class="pmd161-btn ${filterMine ? 'active' : ''}" data-pmd161-filter="mine">My tables</button>
        <select class="pmd161-select" data-pmd161-floor>
          <option value="all">All floors</option>
          ${floors.map(f => `<option value="${esc(f)}" ${floorFilter === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}
        </select>
        <a class="pmd161-btn" href="/admin/orders/create">New order</a>
      </div>

      <div class="pmd161-legend">
        <span><i class="pmd161-dot" style="background:#27c774"></i>free</span>
        <span><i class="pmd161-dot" style="background:#2563eb"></i>open / partial</span>
        <span><i class="pmd161-dot" style="background:#f59e0b"></i>kitchen</span>
        <span><i class="pmd161-dot" style="background:#7c3aed"></i>ready</span>
        <span><i class="pmd161-dot" style="background:#ef4444"></i>call / note</span>
        <span><i class="pmd161-dot" style="background:#94a3b8"></i>paid</span>
        <span><i class="pmd161-dot" style="background:#cbd5e1"></i>not mine</span>
      </div>

      <section class="pmd161-floor-card">
        <div class="pmd161-floor-head">
          <div>
            <h2>Floor plan</h2>
            <p>${tables.length} visible tables · ${(DATA.tables || []).length} total tables · ${(DATA.menu_items || []).length} menu items</p>
          </div>
          <button class="pmd161-btn" type="button">${floorFilter === 'all' ? 'All floors' : esc(floorFilter)}</button>
        </div>

        <div class="pmd161-map">
          ${tableNodes}
        </div>

        ${selectedHtml(selected)}
      </section>

      <section class="pmd161-cards">
        ${tableCards}
      </section>
    `;

    root.querySelectorAll('[data-table-id]').forEach(wrap => {
      wrap.addEventListener('click', () => {
        selectedId = Number(wrap.getAttribute('data-table-id'));
        render();
      });
    });

    root.querySelectorAll('[data-pmd161-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterMine = btn.getAttribute('data-pmd161-filter') === 'mine';
        selectedId = null;
        render();
      });
    });

    const floorSelect = root.querySelector('[data-pmd161-floor]');
    if (floorSelect) {
      floorSelect.addEventListener('change', () => {
        floorFilter = floorSelect.value || 'all';
        selectedId = null;
        render();
      });
    }
  }

  async function load() {
    const root = ensureRoot();
    root.innerHTML = `<div class="pmd161-floor-card"><h2>Loading waiter dashboard…</h2></div>`;

    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', cache: 'no-store' });
      DATA = await res.json();
      render();
      console.log('✅ PMD waiter dashboard v161 direct renderer', audit());
    } catch (e) {
      root.innerHTML = `<div class="pmd161-floor-card"><h2>Dashboard error</h2><p>${esc(e.message || e)}</p></div>`;
    }
  }

  function audit() {
    const root = document.getElementById('pmd-waiter-dashboard-v161-root');
    const map = root?.querySelector('.pmd161-map');
    const nodes = [...(root?.querySelectorAll('.pmd161-table-wrap') || [])];

    const rect = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        bottom: Math.round(r.bottom)
      };
    };

    return {
      version: VERSION,
      dataOk: !!DATA?.ok,
      endpoint: ENDPOINT,
      holder: !!document.getElementById('pmd-waiter-v161-holder'),
      root: !!root,
      topbar: !!root?.querySelector('.pmd161-topbar'),
      toolbar: !!root?.querySelector('.pmd161-toolbar'),
      floorCard: !!root?.querySelector('.pmd161-floor-card'),
      map: !!map,
      tableCount: DATA?.tables?.length || 0,
      visibleNodes: nodes.length,
      rootRect: rect(root),
      mapRect: rect(map),
      nodes: nodes.map(n => ({
        text: n.textContent.trim(),
        rect: rect(n),
        style: n.getAttribute('style')
      })),
      activeWaiterFloorScripts: [...document.scripts]
        .filter(s => /pmd-waiter-dashboard|pmd-floor/i.test(s.src || ''))
        .map(s => s.src),
      activeWaiterFloorCss: [...document.querySelectorAll('link[rel="stylesheet"]')]
        .filter(l => /pmd-waiter-dashboard|pmd-floor/i.test(l.href || ''))
        .map(l => l.href)
    };
  }

  window.PMDWaiterDashboardV161 = {
    version: VERSION,
    reload: load,
    audit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }

  window.addEventListener('load', () => {
    document.body.classList.add('pmd-waiter-v161-active');
  });
})();
