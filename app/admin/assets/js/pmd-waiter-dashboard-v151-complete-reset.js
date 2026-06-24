(function () {
  'use strict';

  if (!/^\/admin(\/dashboard|\/?$)/.test(location.pathname)) return;
  if (window.__PMD_WAITER_DASHBOARD_V151__) return;
  window.__PMD_WAITER_DASHBOARD_V151__ = true;

  const VERSION = 'v151-complete-reset';
  const DATA_URLS = [
    '/admin/pmd-waiter-dashboard-v149-data',
    '/admin/pmd-floor-plan-data',
    '/admin/pmd-waiter-floor-v107-data'
  ];

  const ADD_URLS = [
    '/admin/pmd-waiter-dashboard-v149-add-item',
    '/admin/pmd-floor-plan-add-item',
    '/admin/pmd-waiter-floor-v107-add-item'
  ];

  let DATA = null;
  let activeFloor = 'Main';
  let scope = 'all';
  let selectedTableId = null;
  let mode = 'floor';
  let lastEndpoint = null;
  let lastError = null;
  let observer = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
    });
  }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function money(v) { return '€' + Number(v || 0).toFixed(2); }

  function tableId(t) { return t.id || t.table_id || t.tableId; }
  function tableNo(t) { return t.number || t.table_no || t.table_number || t.no || t.name || t.label || tableId(t); }

  function tableTitle(t) {
    const raw = t.label || t.name || t.title || '';
    if (raw && !/^\[object Object\]$/.test(String(raw))) return raw;
    return 'Table ' + tableNo(t);
  }

  function cleanName(v) {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (typeof v === 'object') return v.name || v.label || v.title || v.floor_name || v.section || v.table_section || '';
    return '';
  }

  function floorName(t) {
    return cleanName(t.floor_name) || cleanName(t.floor) || cleanName(t.section) || cleanName(t.table_section) || 'Main';
  }

  function tables() {
    const d = DATA || {};
    return arr(d.tables).length ? arr(d.tables) : arr(d.floor_tables);
  }

  function menus() {
    const d = DATA || {};
    return arr(d.menu_items).length ? arr(d.menu_items) : arr(d.menus);
  }

  function orders() {
    const d = DATA || {};
    return arr(d.orders).concat(arr(d.open_orders), arr(d.current_orders), arr(d.tickets)).filter(Boolean);
  }

  function kpis() {
    const d = DATA || {};
    const k = d.kpis || d.metrics || {};
    return {
      tables: num(k.tables ?? k.assigned ?? tables().length, tables().length),
      ready: num(k.ready ?? k.ready_to_serve, 0),
      active: num(k.active_orders ?? k.orders ?? k.my_orders, 0),
      attention: num(k.attention ?? k.needs_attention ?? k.guest_notes, 0),
      due: num(k.due ?? k.payments_due ?? k.checks_due, 0)
    };
  }

  function capacity(t) {
    return Math.max(1, Math.min(16,
      num(t.capacity, 0) ||
      num(t.table_capacity, 0) ||
      num(t.seats, 0) ||
      num(t.max_capacity, 0) ||
      2
    ));
  }

  function extraCapacity(t) {
    return Math.max(0, num(t.extra_capacity, 0));
  }

  function statusOf(t) {
    const raw = String(t.status || t.status_label || t.state || '').toLowerCase();

    if (num(t.waiter_calls, 0) > 0 || num(t.calls, 0) > 0 || raw.includes('call') || raw.includes('note')) {
      return { key: 'call', label: 'Attention' };
    }
    if (num(t.ready, 0) > 0 || raw.includes('ready')) return { key: 'ready', label: 'Ready' };
    if (raw.includes('kitchen') || raw.includes('sent') || raw.includes('confirmed')) return { key: 'kitchen', label: 'Kitchen' };
    if (num(t.open_orders, 0) > 0 || num(t.orders, 0) > 0 || raw.includes('busy') || raw.includes('occupied')) return { key: 'busy', label: 'Open' };
    if (num(t.due, 0) > 0 || num(t.unpaid, 0) > 0 || raw.includes('partial')) return { key: 'busy', label: 'Unpaid' };
    if (raw.includes('paid') || raw.includes('closed')) return { key: 'paid', label: 'Paid' };

    return { key: 'free', label: 'Free' };
  }

  function floors() {
    const set = new Set(tables().map(floorName).filter(Boolean));
    return Array.from(set).length ? Array.from(set) : ['Main'];
  }

  function visibleTables() {
    let ts = tables().filter(t => floorName(t) === activeFloor);
    if (scope === 'mine') {
      ts = ts.filter(t => t.assigned === true || t.is_mine === true || t.assigned_to_me === true);
    }
    return ts;
  }

  async function endpointFetch(url) {
    const r = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) {}

    if (!r.ok || !json || json.ok === false) {
      throw new Error(url + ' failed: ' + r.status + ' ' + text.slice(0, 160));
    }

    lastEndpoint = url;
    return json;
  }

  async function loadData() {
    lastError = null;

    for (const url of DATA_URLS) {
      try {
        DATA = await endpointFetch(url);
        const fs = floors();
        if (!fs.includes(activeFloor)) activeFloor = fs[0] || 'Main';
        return DATA;
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('No waiter data endpoint worked');
  }

  function findDashboardTitleAnchor() {
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,.page-title,.page-header,.content-header,div'))
      .filter(function (el) {
        const txt = (el.textContent || '').trim();
        if (txt !== 'Dashboard') return false;
        const r = el.getBoundingClientRect();
        return r.width > 120 && r.height > 20 && r.top < 180;
      })
      .sort(function (a, b) {
        return b.getBoundingClientRect().width - a.getBoundingClientRect().width;
      });

    let el = candidates[0] || null;
    if (!el) return null;

    for (let i = 0; i < 4; i++) {
      const p = el.parentElement;
      if (!p || p === document.body) break;
      const r = p.getBoundingClientRect();
      if (r.height <= 130 && r.width >= el.getBoundingClientRect().width) el = p;
      else break;
    }

    return el;
  }

  function getRoot() {
    let root = document.getElementById('pmd-waiter-v151-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'pmd-waiter-v151-root';
    }

    const anchor = findDashboardTitleAnchor();
    if (anchor && anchor.parentNode && anchor.nextSibling !== root) {
      anchor.parentNode.insertBefore(root, anchor.nextSibling);
    } else if (!root.parentNode) {
      document.body.appendChild(root);
    }

    root.style.setProperty('display', 'block', 'important');
    root.style.setProperty('visibility', 'visible', 'important');
    root.style.setProperty('opacity', '1', 'important');
    root.style.setProperty('height', 'auto', 'important');
    root.style.setProperty('min-height', '600px', 'important');

    return root;
  }

  function hideOldDashboard() {
    document.body.classList.add('pmd-waiter-v151-active');

    const root = document.getElementById('pmd-waiter-v151-root');

    [
      '#dashboardcontainer-container',
      '.dashboard-widgets',
      '.widget-container',
      '.pmd-w3-quick-grid',
      '.pmd-w3-bottom',
      '#pmd-waiter-v150-root',
      '#pmd-floor-v146-root',
      '#pmd-floor-v139-root',
      '#pmd-floor-v142-root',
      '#pmd-floor-v143-root',
      '#pmd-floor-v144-root'
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (root && (el === root || el.contains(root))) return;
        el.setAttribute('data-pmd-v151-hidden', '1');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('height', '0', 'important');
        el.style.setProperty('max-height', '0', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    });
  }

  function renderKpis() {
    const k = kpis();
    return `
      <div class="pmd151-kpis">
        <div class="pmd151-kpi"><div class="pmd151-kpi-label">Tables</div><div class="pmd151-kpi-value">${esc(k.tables)}</div><div class="pmd151-kpi-sub">enabled tables</div></div>
        <div class="pmd151-kpi"><div class="pmd151-kpi-label">Ready to serve</div><div class="pmd151-kpi-value">${esc(k.ready)}</div><div class="pmd151-kpi-sub">from kitchen</div></div>
        <div class="pmd151-kpi"><div class="pmd151-kpi-label">Active orders</div><div class="pmd151-kpi-value">${esc(k.active)}</div><div class="pmd151-kpi-sub">open orders</div></div>
        <div class="pmd151-kpi"><div class="pmd151-kpi-label">Needs attention</div><div class="pmd151-kpi-value">${esc(k.attention)}</div><div class="pmd151-kpi-sub">calls / notes</div></div>
        <div class="pmd151-kpi"><div class="pmd151-kpi-label">Payments due</div><div class="pmd151-kpi-value">${money(k.due)}</div><div class="pmd151-kpi-sub">payments pending</div></div>
      </div>
    `;
  }

  function fallbackPos(i, total) {
    const cols = total <= 4 ? 2 : Math.min(4, Math.ceil(Math.sqrt(total * 1.35)));
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: 130 + col * 320, y: 95 + row * 175 };
  }

  function tableSize(t) {
    const cap = capacity(t);
    const w = Math.max(120, Math.min(285, cap <= 4 ? 135 + cap * 13 : 130 + cap * 23));
    const h = cap <= 4 ? 82 : 92;
    return { w, h };
  }

  function chairDots(t, w, h) {
    const cap = capacity(t);
    const dots = [];
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2 + 30;
    const ry = h / 2 + 28;

    for (let i = 0; i < cap; i++) {
      const a = (-Math.PI / 2) + (Math.PI * 2 * i / cap);
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      dots.push(`<span class="pmd151-chair" style="left:${x}px;top:${y}px"></span>`);
    }

    return dots.join('');
  }

  function tableHtml(t, i, total) {
    const id = tableId(t);
    const st = statusOf(t);
    const sz = tableSize(t);
    const pos = fallbackPos(i, total);

    const unassigned = (DATA && DATA.role === 'waiter' && t.assigned === false) ? ' unassigned' : '';
    const selected = String(id) === String(selectedTableId) ? ' selected' : '';

    return `
      <div class="pmd151-table ${esc(st.key)}${unassigned}${selected}"
           style="left:${pos.x}px;top:${pos.y}px;width:${sz.w}px;height:${sz.h}px"
           data-pmd151-table-id="${esc(id)}"
           title="${esc(tableTitle(t))} · ${esc(st.label)} · ${capacity(t)} seats">
        ${chairDots(t, sz.w, sz.h)}
        <span>${esc(tableNo(t))}</span>
      </div>
    `;
  }

  function renderMap() {
    const ts = visibleTables();

    return `
      <div class="pmd151-map-wrap">
        <div class="pmd151-map">
          ${ts.map((t, i) => tableHtml(t, i, ts.length)).join('')}
        </div>
      </div>
      <div class="pmd151-legend">
        <span><i class="pmd151-dot free-dot"></i>Free</span>
        <span><i class="pmd151-dot busy-dot"></i>Open / partial</span>
        <span><i class="pmd151-dot kitchen-dot"></i>Kitchen</span>
        <span><i class="pmd151-dot ready-dot"></i>Ready</span>
        <span><i class="pmd151-dot call-dot"></i>Call / note</span>
        <span><i class="pmd151-dot paid-dot"></i>Paid</span>
      </div>
    `;
  }

  function renderCards() {
    const ts = visibleTables();

    return `
      <div class="pmd151-card-grid">
        ${ts.map(function (t) {
          const id = tableId(t);
          const st = statusOf(t);
          const cap = capacity(t);
          const extra = extraCapacity(t);
          return `
            <div class="pmd151-card">
              <div class="pmd151-card-head">
                <div class="pmd151-card-title">${esc(tableTitle(t))}</div>
                <div class="pmd151-pill">${esc(st.label)}</div>
              </div>
              <div class="pmd151-mini">
                <div>${esc(t.orders || t.open_orders || 0)}<span>ORDERS</span></div>
                <div>${esc(t.ready || 0)}<span>READY</span></div>
                <div>${money(t.due || t.unpaid || 0)}<span>DUE</span></div>
              </div>
              <div class="pmd151-card-sub">${cap} seats${extra ? ' · +' + extra + ' extra possible' : ''} · ${esc(floorName(t))}</div>
              <div class="pmd151-card-actions">
                <button class="pmd151-btn pmd151-primary" data-pmd151-add="${esc(id)}">Add items</button>
                <a class="pmd151-btn" href="/admin/tables/edit/${esc(id)}">Details</a>
                <a class="pmd151-btn" href="/admin/payments?table_id=${esc(id)}">Bill</a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderFloor() {
    const fs = floors();
    const tCount = visibleTables().length;
    const allCount = tables().length;
    const mCount = menus().length;

    return `
      ${renderKpis()}
      <div class="pmd151-panel">
        <div class="pmd151-head">
          <div>
            <div class="pmd151-title">Floor plan</div>
            <div class="pmd151-sub">${tCount} visible tables · ${allCount} total tables · ${mCount} menu items · ${esc(lastEndpoint || '')}</div>
          </div>
          <div class="pmd151-actions">
            <button data-pmd151-scope="all" class="${scope === 'all' ? 'active' : ''}">All floor</button>
            <button data-pmd151-scope="mine" class="${scope === 'mine' ? 'active' : ''}">My tables</button>
            <button data-pmd151-refresh>Refresh</button>
            <button data-pmd151-audit>Audit</button>
          </div>
        </div>
        <div class="pmd151-tabs">
          ${fs.map(f => `<button class="${f === activeFloor ? 'active' : ''}" data-pmd151-floor="${esc(f)}">${esc(f)}</button>`).join('')}
        </div>
        ${renderMap()}
        ${renderCards()}
      </div>
      ${renderOrders()}
    `;
  }

  function renderOrders() {
    const os = orders();
    if (!os.length) return '';

    return `
      <div class="pmd151-panel" style="margin-top:18px">
        <div class="pmd151-head">
          <div>
            <div class="pmd151-title">Current orders</div>
            <div class="pmd151-sub">${os.length} active order records</div>
          </div>
        </div>
        <div class="pmd151-card-grid">
          ${os.slice(0, 12).map(function (o) {
            const oid = o.id || o.order_id || o.ticket_id;
            return `
              <div class="pmd151-card">
                <div class="pmd151-card-head">
                  <div class="pmd151-card-title">Order ${esc(oid || '')}</div>
                  <div class="pmd151-pill">${esc(o.status || o.status_label || 'open')}</div>
                </div>
                <div class="pmd151-card-sub">${esc(o.table_label || o.table || o.table_name || '')} · ${money(o.total || o.order_total || o.due || 0)}</div>
                <div class="pmd151-card-actions">
                  <a class="pmd151-btn pmd151-primary" href="/admin/orders/edit/${esc(oid)}">Edit</a>
                  <a class="pmd151-btn" href="/admin/payments?order_id=${esc(oid)}">Payment</a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderMenu(table) {
    const ms = menus();

    return `
      ${renderKpis()}
      <div class="pmd151-panel">
        <div class="pmd151-head">
          <div>
            <div class="pmd151-title">Add items</div>
            <div class="pmd151-sub">Selected: ${esc(tableTitle(table))} · real menu items</div>
          </div>
          <div class="pmd151-actions">
            <button data-pmd151-back>← Floor plan</button>
          </div>
        </div>
        <div class="pmd151-menu-grid">
          ${ms.map(function (m) {
            const mid = m.id || m.menu_id;
            const name = m.name || m.menu_name || m.title || ('Item ' + mid);
            const price = m.price || m.menu_price || m.sale_price || 0;
            return `
              <button class="pmd151-menu-item" data-pmd151-menu="${esc(mid)}" data-pmd151-table="${esc(tableId(table))}">
                ${esc(name)}
                <span class="pmd151-price">${money(price)}</span>
              </button>
            `;
          }).join('') || '<div class="pmd151-error">No menu items found.</div>'}
        </div>
      </div>
    `;
  }

  function renderError(e) {
    return `
      <div class="pmd151-panel">
        <div class="pmd151-error">
          <b>Waiter dashboard could not load.</b><br>
          ${esc(e && e.message ? e.message : e)}
        </div>
      </div>
    `;
  }

  function bind(root) {
    root.querySelectorAll('[data-pmd151-floor]').forEach(btn => {
      btn.addEventListener('click', function () {
        activeFloor = btn.getAttribute('data-pmd151-floor') || 'Main';
        mode = 'floor';
        render();
      });
    });

    root.querySelectorAll('[data-pmd151-scope]').forEach(btn => {
      btn.addEventListener('click', function () {
        scope = btn.getAttribute('data-pmd151-scope') || 'all';
        mode = 'floor';
        render();
      });
    });

    root.querySelectorAll('[data-pmd151-refresh]').forEach(btn => {
      btn.addEventListener('click', refresh);
    });

    root.querySelectorAll('[data-pmd151-audit]').forEach(btn => {
      btn.addEventListener('click', function () {
        console.log('PMD waiter v151 audit:', audit());
        alert('Audit printed in console.');
      });
    });

    root.querySelectorAll('[data-pmd151-table-id]').forEach(el => {
      el.addEventListener('click', function () {
        selectedTableId = el.getAttribute('data-pmd151-table-id');
        render();
      });
    });

    root.querySelectorAll('[data-pmd151-add]').forEach(btn => {
      btn.addEventListener('click', function () {
        selectedTableId = btn.getAttribute('data-pmd151-add');
        const table = tables().find(t => String(tableId(t)) === String(selectedTableId));
        if (table) {
          mode = 'menu';
          render();
        }
      });
    });

    root.querySelectorAll('[data-pmd151-back]').forEach(btn => {
      btn.addEventListener('click', function () {
        mode = 'floor';
        render();
      });
    });

    root.querySelectorAll('[data-pmd151-menu]').forEach(btn => {
      btn.addEventListener('click', async function () {
        const menuId = btn.getAttribute('data-pmd151-menu');
        const tableIdValue = btn.getAttribute('data-pmd151-table');

        btn.disabled = true;
        btn.textContent = 'Adding...';

        let ok = false;
        let last = null;

        for (const base of ADD_URLS) {
          try {
            const url = `${base}?apply=1&table_id=${encodeURIComponent(tableIdValue)}&menu_id=${encodeURIComponent(menuId)}&qty=1`;
            const r = await fetch(url, {
              credentials: 'same-origin',
              headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const text = await r.text();
            last = text;
            if (r.ok) {
              ok = true;
              break;
            }
          } catch (e) {
            last = e.message;
          }
        }

        if (!ok) alert('Add item failed: ' + String(last || '').slice(0, 180));

        mode = 'floor';
        await refresh();
      });
    });
  }

  function render() {
    hideOldDashboard();
    const root = getRoot();

    try {
      if (!DATA) {
        root.innerHTML = '<div class="pmd151-panel"><div class="pmd151-title">Loading waiter dashboard...</div></div>';
        return;
      }

      if (mode === 'menu') {
        const table = tables().find(t => String(tableId(t)) === String(selectedTableId));
        root.innerHTML = table ? renderMenu(table) : renderFloor();
      } else {
        root.innerHTML = renderFloor();
      }

      bind(root);
    } catch (e) {
      root.innerHTML = renderError(e);
      console.error('PMD v151 render error:', e);
    }
  }

  async function refresh() {
    hideOldDashboard();
    getRoot();

    try {
      await loadData();
      render();
      console.log('✅ PMD waiter dashboard v151', DATA);
    } catch (e) {
      getRoot().innerHTML = renderError(e);
      console.error('PMD v151 load error:', e);
    }
  }

  function audit() {
    const root = document.getElementById('pmd-waiter-v151-root');
    return {
      version: VERSION,
      endpoint: lastEndpoint,
      dataOk: !!DATA,
      tables: tables().length,
      visibleTables: visibleTables().length,
      menus: menus().length,
      orders: orders().length,
      floors: floors(),
      rootExists: !!root,
      rootDisplay: root ? getComputedStyle(root).display : null,
      rootHeight: root ? root.getBoundingClientRect().height : null,
      hiddenOld: document.querySelectorAll('[data-pmd-v151-hidden="1"]').length,
      scripts: Array.from(document.scripts).filter(s => /pmd-(waiter|floor)/i.test(s.src)).map(s => s.src)
    };
  }

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver(function () {
      window.clearTimeout(window.__pmd151Timer);
      window.__pmd151Timer = window.setTimeout(function () {
        hideOldDashboard();
        getRoot();
      }, 80);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function boot() {
    document.body.classList.add('pmd-waiter-v151-active');
    getRoot();
    hideOldDashboard();
    render();
    refresh();
    startObserver();

    [250, 800, 1600, 3000, 5000].forEach(ms => {
      setTimeout(function () {
        hideOldDashboard();
        getRoot();
        if (!DATA) refresh();
      }, ms);
    });
  }

  window.PMDWaiterDashboardV151 = {
    refresh,
    audit,
    render,
    data: function () { return DATA; }
  };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
