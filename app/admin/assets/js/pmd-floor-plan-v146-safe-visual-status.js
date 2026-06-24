(function () {
  'use strict';

  if (!/^\/admin(\/dashboard|\/?$)/.test(location.pathname)) return;
  if (window.__PMD_FLOOR_V146__) return;
  window.__PMD_FLOOR_V146__ = true;

  const VERSION = 'v146-safe-visual-status';
  const DATA_URLS = [
    '/admin/pmd-floor-plan-data',
    '/admin/pmd-waiter-floor-v107-data'
  ];

  const MERGE_URLS = [
    '/admin/pmd-floor-plan-merge',
    '/admin/pmd-waiter-floor-v107-merge'
  ];

  let DATA = null;
  let activeFloor = null;
  let mergeMode = false;
  let selected = new Set();

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[m];
    });
  }

  function arr(v) {
    return Array.isArray(v) ? v : [];
  }

  async function fetchJsonAny(urls) {
    let last = null;

    for (const url of urls) {
      try {
        const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
        const txt = await r.text();
        last = { url, status: r.status, text: txt.slice(0, 300) };

        if (!r.ok) continue;
        if (!/^\s*[\[{]/.test(txt)) continue;

        const json = JSON.parse(txt);
        if (json && json.ok !== false) {
          json.__source_url = url;
          return json;
        }
      } catch (e) {
        last = { url, error: String(e) };
      }
    }

    throw new Error('No valid JSON floor endpoint. Last: ' + JSON.stringify(last));
  }

  function tableId(t) {
    return t.id || t.table_id || t.tableId || t.pk || t.number || t.label;
  }

  function tableNo(t) {
    return t.number || t.table_no || t.name || t.label || t.id || t.table_id || '?';
  }

  function capacity(t) {
    const vals = [
      t.capacity,
      t.table_capacity,
      t.seats,
      t.max_capacity,
      t.min_capacity
    ];

    for (const v of vals) {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) return Math.min(20, n);
    }

    return 2;
  }

  function extraCapacity(t) {
    const n = parseInt(t.extra_capacity || t.extra || 0, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function floorName(t) {
    return t.floor_name || t.floor || t.section || t.table_section || 'Main';
  }

  function statusInfo(t) {
    const raw = [
      t.status,
      t.status_label,
      t.order_status,
      t.current_status,
      t.current_order_status,
      t.kitchen_status,
      t.payment_status
    ].filter(Boolean).join(' ').toLowerCase();

    const open = Number(t.open_orders || t.orders || t.active_orders || 0);
    const ready = Number(t.ready || t.ready_items || t.ready_to_serve || 0);
    const due = Number(t.due || t.payment_due || t.checks_due || 0);
    const calls = Number(t.calls || t.waiter_calls || t.needs_attention || 0);
    const notes = Number(t.notes || t.guest_notes || 0);

    if (calls > 0 || notes > 0 || /call|waiter|note|allergy|attention/.test(raw)) {
      return { key: 'call', label: 'CALL / NOTE', color: '#ef4444', border: '#b91c1c' };
    }

    if (ready > 0 || /ready|serve|kds/.test(raw)) {
      return { key: 'ready', label: 'READY', color: '#a78bfa', border: '#7c3aed' };
    }

    if (/kitchen|sent|cooking|preparing|confirmed/.test(raw)) {
      return { key: 'kitchen', label: 'KITCHEN', color: '#fbbf24', border: '#d97706' };
    }

    if (/partial/.test(raw)) {
      return { key: 'partial', label: 'PARTIAL PAID', color: '#60a5fa', border: '#2563eb' };
    }

    if (due > 0 || /unpaid|payment|bill|checkout|check/.test(raw)) {
      return { key: 'payment', label: 'PAYMENT', color: '#38bdf8', border: '#0284c7' };
    }

    if (/paid|closed|complete|finished|erledigt/.test(raw)) {
      return { key: 'paid', label: 'PAID', color: '#cbd5e1', border: '#64748b' };
    }

    if (open > 0 || /busy|active|occupied|order/.test(raw)) {
      return { key: 'busy', label: 'BUSY', color: '#60a5fa', border: '#2563eb' };
    }

    return { key: 'free', label: '', color: '#7ddd97', border: '#19b965' };
  }

  function sizeFor(t) {
    const c = capacity(t);

    if (c <= 2) return { w: 132, h: 78 };
    if (c <= 4) return { w: 170, h: 88 };
    if (c <= 6) return { w: 220, h: 92 };
    if (c <= 8) return { w: 276, h: 100 };
    return { w: 316, h: 108 };
  }

  function point(v, fallback, max) {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return fallback;

    if (n >= 0 && n <= 100) return n;
    return Math.max(3, Math.min(97, (n / max) * 100));
  }

  function chairsHtml(t, w, h) {
    const count = Math.max(1, Math.min(14, capacity(t)));
    const cx = (w + 44) / 2;
    const cy = (h + 44) / 2;
    const rx = (w / 2) + 25;
    const ry = (h / 2) + 25;
    const st = statusInfo(t);

    let out = '';

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i / count);
      const x = cx + Math.cos(angle) * rx - 8.5;
      const y = cy + Math.sin(angle) * ry - 8.5;

      out += `<span class="pmd146-chair" style="left:${x}px;top:${y}px;--chair-color:${st.color};--chair-border:${st.border}"></span>`;
    }

    return out;
  }

  function normalizeTables() {
    const tables = arr(DATA && (DATA.tables || DATA.floor_tables));
    return tables.filter(Boolean).map(function (t, idx) {
      const s = sizeFor(t);
      const fallbackX = 15 + (idx % 4) * 24;
      const fallbackY = 20 + Math.floor(idx / 4) * 28;

      return Object.assign({}, t, {
        __id: tableId(t),
        __no: tableNo(t),
        __floor: floorName(t),
        __w: s.w,
        __h: s.h,
        __x: point(t.floor_x || t.x, fallbackX, 1000),
        __y: point(t.floor_y || t.y, fallbackY, 600)
      });
    });
  }

  function floorsOf(tables) {
    const names = [...new Set(tables.map(t => t.__floor || 'Main'))];
    return names.length ? names : ['Main'];
  }

  function hideOldDashboardParts() {
    document.body.classList.add('pmd-floor-v146-active');

    const candidates = [
      '.pmd-w3-quick-grid',
      '.pmd-w3-bottom',
      '.pmd-floor-panel',
      '.pmd-floor-plan',
      '#pmd-floor-plan-root',
      '#pmd-floor-v139-root',
      '#pmd-floor-v141-root',
      '#pmd-floor-v142-root',
      '#pmd-floor-v143-root',
      '#pmd-floor-v144-root'
    ];

    candidates.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.id === 'pmd-floor-v146-root') return;
        if (el.closest('#pmd-floor-v146-root')) return;
        el.setAttribute('data-pmd-v146-hidden', '1');
      });
    });

    // Hide any old card that visibly contains the old waiter action text.
    document.querySelectorAll('div, section').forEach(el => {
      if (el.closest('#pmd-floor-v146-root')) return;

      const txt = (el.textContent || '').trim();
      if (
        /New Order\s*Select table/i.test(txt) ||
        /Next Waiter Actions/i.test(txt) ||
        /Service Focus/i.test(txt)
      ) {
        el.setAttribute('data-pmd-v146-hidden', '1');
      }
    });
  }

  function mountRoot() {
    let root = document.getElementById('pmd-floor-v146-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'pmd-floor-v146-root';

    const titleBar = document.querySelector('.page-title, .content .page-title, h1, .navbar, header');
    const container = document.querySelector('main, .content, .main-content, #layout-content') || document.body;

    if (titleBar && titleBar.parentNode) {
      titleBar.parentNode.insertBefore(root, titleBar.nextSibling);
    } else {
      container.insertBefore(root, container.firstChild);
    }

    return root;
  }

  function render() {
    hideOldDashboardParts();

    const root = mountRoot();
    const tables = normalizeTables();
    const floors = floorsOf(tables);

    if (!activeFloor || !floors.includes(activeFloor)) activeFloor = floors[0];

    const current = tables.filter(t => t.__floor === activeFloor);
    const selectedCount = selected.size;

    root.innerHTML = `
      <section class="pmd146-panel">
        <div class="pmd146-head">
          <div>
            <div class="pmd146-title">Floor plan</div>
            <div class="pmd146-sub">
              ${tables.length} real visible tables · ${arr(DATA && DATA.menu_items).length} real menu items · chairs show capacity
            </div>
          </div>
          <div class="pmd146-actions">
            <button class="pmd146-btn" data-pmd146="audit">Audit</button>
            <button class="pmd146-btn" data-pmd146="refresh">Refresh</button>
            <button class="pmd146-btn ${mergeMode ? 'danger' : ''}" data-pmd146="merge">
              ${mergeMode ? 'Cancel merge' : 'Merge tables'}
            </button>
            ${mergeMode && selectedCount >= 2 ? `<button class="pmd146-btn primary" data-pmd146="merge-apply">Merge ${selectedCount}</button>` : ''}
          </div>
        </div>

        ${floors.length > 1 ? `
          <div class="pmd146-floor-tabs">
            ${floors.map(f => `<button class="pmd146-tab ${f === activeFloor ? 'active' : ''}" data-pmd146-floor="${esc(f)}">${esc(f)}</button>`).join('')}
          </div>
        ` : ''}

        <div class="pmd146-map">
          ${current.map(function (t) {
            const st = statusInfo(t);
            const isSelected = selected.has(String(t.__id));
            const wrapW = t.__w + 44;
            const wrapH = t.__h + 44;

            return `
              <div class="pmd146-table-wrap"
                data-pmd146-table="${esc(t.__id)}"
                style="left:${t.__x}%;top:${t.__y}%;width:${wrapW}px;height:${wrapH}px">
                ${chairsHtml(t, t.__w, t.__h)}
                <div class="pmd146-table-body ${isSelected ? 'selected' : ''}"
                  style="width:${t.__w}px;height:${t.__h}px;--table-color:${st.color};--table-border:${st.border}">
                  <div>
                    <div class="pmd146-number">${esc(t.__no)}</div>
                    <div class="pmd146-status ${st.key === 'free' ? 'is-free' : ''}">${esc(st.label)}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="pmd146-details">
          ${current.map(function (t) {
            const st = statusInfo(t);
            const extra = extraCapacity(t);
            const meta = `${capacity(t)} seats${extra ? ` · +${extra} extra possible` : ''}${t.table_section || t.section ? ` · ${esc(t.table_section || t.section)}` : ''}`;

            return `
              <div class="pmd146-card">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                  <div class="pmd146-card-title">Table ${esc(t.__no)}</div>
                  <span class="pmd146-badge">${st.key === 'free' ? 'FREE' : esc(st.label)}</span>
                </div>
                <div class="pmd146-card-meta">${meta}</div>
                <div class="pmd146-card-actions">
                  <button class="pmd146-btn primary" data-pmd146-add="${esc(t.__id)}">Add items</button>
                  <button class="pmd146-btn" data-pmd146-details="${esc(t.__id)}">Details</button>
                  <button class="pmd146-btn" data-pmd146-bill="${esc(t.__id)}">Bill</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;

    bind(root);
    console.log('✅ PMD floor plan v146 safe visual status', audit());
  }

  function findTable(id) {
    return normalizeTables().find(t => String(t.__id) === String(id));
  }

  function bind(root) {
    root.querySelectorAll('[data-pmd146-floor]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFloor = btn.getAttribute('data-pmd146-floor');
        selected.clear();
        render();
      });
    });

    root.querySelectorAll('[data-pmd146-table]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-pmd146-table');

        if (mergeMode) {
          if (selected.has(String(id))) selected.delete(String(id));
          else selected.add(String(id));
          render();
          return;
        }

        const t = findTable(id);
        if (!t) return;

        alert(
          'Table ' + tableNo(t) + '\n' +
          'Status: ' + (statusInfo(t).label || 'FREE') + '\n' +
          'Capacity: ' + capacity(t) + ' seats' +
          (extraCapacity(t) ? '\nExtra possible: +' + extraCapacity(t) : '')
        );
      });
    });

    root.querySelectorAll('[data-pmd146]').forEach(btn => {
      const action = btn.getAttribute('data-pmd146');

      btn.addEventListener('click', async () => {
        if (action === 'audit') {
          console.log('PMD v146 AUDIT:', audit());
          alert('Audit printed in console.');
        }

        if (action === 'refresh') {
          await load();
        }

        if (action === 'merge') {
          mergeMode = !mergeMode;
          selected.clear();
          render();
        }

        if (action === 'merge-apply') {
          await mergeSelected();
        }
      });
    });

    root.querySelectorAll('[data-pmd146-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pmd146-add');
        location.href = '/admin/quick-mode?preview=pmdquick2026&table_id=' + encodeURIComponent(id);
      });
    });

    root.querySelectorAll('[data-pmd146-details]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pmd146-details');
        const t = findTable(id);
        if (!t) return;
        alert(JSON.stringify(t, null, 2));
      });
    });

    root.querySelectorAll('[data-pmd146-bill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pmd146-bill');
        location.href = '/admin/payments?table_id=' + encodeURIComponent(id);
      });
    });
  }

  async function mergeSelected() {
    const ids = [...selected];

    if (ids.length < 2) {
      alert('Select at least 2 tables.');
      return;
    }

    let last = null;

    for (const base of MERGE_URLS) {
      try {
        const url = base + '?apply=1&table_ids=' + encodeURIComponent(ids.join(','));
        const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
        const txt = await r.text();
        last = { url, status: r.status, text: txt.slice(0, 300) };

        if (r.ok && /^\s*[\[{]/.test(txt)) {
          const json = JSON.parse(txt);
          if (json.ok !== false) {
            alert('Merge request sent.');
            mergeMode = false;
            selected.clear();
            await load();
            return;
          }
        }
      } catch (e) {
        last = { base, error: String(e) };
      }
    }

    console.warn('PMD v146 merge failed:', last);
    alert('Merge backend endpoint is not ready. Details printed in console.');
  }

  function audit() {
    const tables = normalizeTables();

    return {
      version: VERSION,
      endpoint: DATA && DATA.__source_url,
      tableCount: tables.length,
      menuCount: arr(DATA && DATA.menu_items).length,
      floors: floorsOf(tables),
      activeFloor,
      mergeMode,
      selected: [...selected],
      scripts: [...document.scripts].filter(s => /pmd-(floor|waiter)/i.test(s.src)).map(s => s.src),
      rootExists: !!document.getElementById('pmd-floor-v146-root')
    };
  }

  async function load() {
    try {
      DATA = await fetchJsonAny(DATA_URLS);
      render();
      return DATA;
    } catch (e) {
      console.error('PMD v146 floor failed:', e);
      const root = mountRoot();
      root.innerHTML = `
        <section class="pmd146-panel">
          <div class="pmd146-title">Floor plan unavailable</div>
          <pre style="white-space:pre-wrap;margin-top:14px">${esc(e.message)}</pre>
        </section>
      `;
      return null;
    }
  }

  window.PMDFloorPlanV146 = {
    refresh: load,
    audit,
    data: () => DATA
  };

  ready(() => {
    setTimeout(load, 250);
  });
})();
