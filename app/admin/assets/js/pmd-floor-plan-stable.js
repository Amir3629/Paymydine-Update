(function () {
  'use strict';

  if (!/^\/admin(\/dashboard|\/?$)/.test(location.pathname)) return;
  if (window.__PMD_FLOOR_PLAN_V144__) return;
  window.__PMD_FLOOR_PLAN_V144__ = true;

  const VERSION = 'v144-clean-circle-seats';
  const DATA_URLS = ['/admin/pmd-floor-plan-data', '/admin/pmd-waiter-floor-v107-data'];
  const UPDATE_URL = '/admin/pmd-floor-plan-update';
  const MERGE_URLS = ['/admin/pmd-floor-plan-merge', '/admin/pmd-waiter-floor-v107-merge'];

  let DATA = null;
  let activeFloorId = null;
  let selectedTableId = null;
  let editMode = false;
  let mergeMode = false;
  let mergeSelected = [];
  let drag = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function money(v) { return '€' + Number(v || 0).toFixed(2); }

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  async function fetchJson() {
    let lastErr = null;

    for (const url of DATA_URLS) {
      try {
        const r = await fetch(url, { credentials: 'same-origin' });
        const text = await r.text();
        const json = JSON.parse(text);

        if (r.ok && json && json.ok) {
          json.__sourceUrl = url;
          return json;
        }

        lastErr = new Error(url + ' bad payload');
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr || new Error('No valid floor endpoint');
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 100 && r.height > 40 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function findKpiHeader() {
    return Array.from(document.querySelectorAll('[class*="pmd-w3"], [class*="metric"], [class*="kpi"], [class*="dashboard"]'))
      .filter(isVisible)
      .filter(el => {
        const text = (el.innerText || '').toLowerCase();
        const r = el.getBoundingClientRect();

        return r.width > 650 &&
          r.height >= 80 &&
          r.height <= 240 &&
          (
            text.includes('my tables') ||
            text.includes('ready to serve') ||
            text.includes('payments due') ||
            text.includes('tables')
          ) &&
          !text.includes('new order') &&
          !text.includes('next waiter actions') &&
          !text.includes('service focus');
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] || null;
  }

  function injectRoot() {
    let root = document.getElementById('pmd-floor-plan-stable');
    if (root) return root;

    root = document.createElement('section');
    root.id = 'pmd-floor-plan-stable';

    const header = findKpiHeader();
    if (header && header.parentNode) {
      header.parentNode.insertBefore(root, header.nextSibling);
      return root;
    }

    const target = document.querySelector('#dashboardcontainer-container') || document.querySelector('main') || document.body;
    target.parentNode ? target.parentNode.insertBefore(root, target) : document.body.prepend(root);

    return root;
  }

  function cleanOldDashboard() {
    document.querySelectorAll('.pmd-w3-quick-grid, .pmd-w3-bottom, [class*="pmd-w3-quick-grid"], [class*="pmd-w3-bottom"]').forEach(el => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('max-height', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.setAttribute('data-pmd-v143-hidden', '1');
    });
  }

  function floors() { return arr(DATA && DATA.floors); }
  function tables() { return arr(DATA && (DATA.floor_tables || DATA.tables)); }
  function menus() { return arr(DATA && (DATA.menu_items || DATA.menus)); }

  function activeFloor() {
    return floors().find(f => String(f.id) === String(activeFloorId)) || floors()[0] || {
      id: 'main-floor',
      label: 'Main Floor',
      width: 1000,
      height: 520
    };
  }

  function floorTables() {
    return tables().filter(t => String(t.floor_id || 'main-floor') === String(activeFloorId));
  }

  function tableTitle(t) {
    return t.label || t.name || ('Table ' + (t.number || t.id));
  }

  function capacity(t) {
    const cap = Number(t.capacity || t.table_capacity || 0);
    const max = Number(t.max_capacity || 0);
    const min = Number(t.min_capacity || 0);
    return Math.max(cap, max, min, 1);
  }

  function extraCapacity(t) {
    return Math.max(0, Number(t.extra_capacity || 0));
  }

  function seatCount(t) {
    // v144: map chairs show ONLY real base capacity.
    // extra_capacity stays available in card/details, but does not create ghost chairs on the map.
    return Math.max(1, Math.min(14, capacity(t)));
  }

  function visualSize(t) {
    const seats = seatCount(t);

    if (seats <= 2) return { w: 112, h: 68 };
    if (seats <= 4) return { w: 138, h: 74 };
    if (seats <= 6) return { w: 162, h: 78 };
    if (seats <= 8) return { w: 188, h: 84 };
    return { w: 220, h: 92 };
  }

  function capacityText(t) {
    const cap = capacity(t);
    const extra = extraCapacity(t);

    if (extra > 0) {
      return `${cap} seats · +${extra} extra possible`;
    }

    return `${cap} seats`;
  }

  function featuresText(t) {
    const f = arr(t.features);
    return f.length ? f.join(' · ') : (t.section || 'main');
  }

  function lower(v) {
    return String(v == null ? '' : v).toLowerCase();
  }

  function statusInfo(t) {
    const raw = [
      t.status,
      t.status_label,
      t.order_status,
      t.kitchen_status,
      t.payment_status,
      t.reservation_status
    ].map(lower).join(' ');

    const openOrders = Number(t.open_orders || t.orders || t.active_orders || 0);
    const ready = Number(t.ready || t.ready_to_serve || 0);
    const due = Number(t.due || t.payments_due || t.checks_due || 0);
    const paidAmount = Number(t.paid_amount || t.amount_paid || 0);
    const attention = Number(t.attention || t.needs_attention || t.calls || t.waiter_calls || 0);
    const notes = Number(t.notes || t.guest_notes || t.note_count || 0);
    const reservations = Number(t.reservations || t.reservation_count || t.upcoming_reservations || 0);

    if (attention > 0 || raw.includes('waiter') || raw.includes('call')) {
      return { key: 'call', label: 'CALL', card: 'Waiter call', priority: 90 };
    }

    if (notes > 0 || raw.includes('note') || raw.includes('allergy')) {
      return { key: 'note', label: 'NOTE', card: 'Guest note', priority: 85 };
    }

    if (ready > 0 || raw.includes('ready')) {
      return { key: 'ready', label: 'READY', card: 'Ready to serve', priority: 80 };
    }

    if (raw.includes('kitchen') || raw.includes('sent') || raw.includes('preparing') || raw.includes('cooking')) {
      return { key: 'kitchen', label: 'KITCHEN', card: 'Sent to kitchen', priority: 70 };
    }

    if ((paidAmount > 0 && due > 0) || raw.includes('partial')) {
      return { key: 'partial', label: 'PART PAID', card: 'Partially paid', priority: 65 };
    }

    if (openOrders > 0 || raw.includes('confirmed') || raw.includes('order') || raw.includes('busy') || raw.includes('occupied')) {
      return { key: 'order', label: 'ORDER', card: 'Active order', priority: 60 };
    }

    if (due > 0 || raw.includes('unpaid')) {
      return { key: 'unpaid', label: 'UNPAID', card: 'Payment due', priority: 55 };
    }

    if (raw.includes('paid')) {
      return { key: 'paid', label: 'PAID', card: 'Paid', priority: 45 };
    }

    if (reservations > 0 || raw.includes('reserved')) {
      return { key: 'reserved', label: 'RESERVED', card: 'Reserved', priority: 40 };
    }

    return { key: 'free', label: '', card: 'Free', priority: 0 };
  }

  function renderTabs() {
    const fs = floors();
    if (fs.length <= 1) return '';

    return `
      <div class="pmd-floor-tabs">
        ${fs.map(f => `
          <button class="pmd-floor-tab ${String(f.id) === String(activeFloorId) ? 'active' : ''}" data-pmd-floor-tab="${esc(f.id)}">
            ${esc(f.label)} · ${Number(f.tables || 0)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function tableMainSvg(t, w, h) {
    const shape = lower(t.shape || t.floor_shape || 'rectangle');

    if (shape === 'round' || shape === 'circle') {
      return `<ellipse class="pmd-table-main" cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"></ellipse>`;
    }

    if (shape === 'square') {
      const side = Math.min(w, h);
      return `<rect class="pmd-table-main" x="${(w - side) / 2}" y="0" width="${side}" height="${side}" rx="16"></rect>`;
    }

    if (shape === 'bar' || shape === 'counter') {
      return `<rect class="pmd-table-main" x="0" y="${h * .18}" width="${w}" height="${h * .64}" rx="${h * .32}"></rect>`;
    }

    return `<rect class="pmd-table-main" x="0" y="0" width="${w}" height="${h}" rx="18"></rect>`;
  }

  function chairSvg(t, w, h) {
    const seats = seatCount(t);
    const cx = w / 2;
    const cy = h / 2;

    // v144: chair icons are clean circles around the table, not capsule/ghost seats.
    const rx = w / 2 + 17;
    const ry = h / 2 + 17;
    const chairR = seats <= 4 ? 8.5 : seats <= 8 ? 7.5 : 6.8;

    let out = '';

    for (let i = 0; i < seats; i++) {
      const deg = (360 * i / seats) - 90;
      const rad = deg * Math.PI / 180;
      const x = cx + Math.cos(rad) * rx;
      const y = cy + Math.sin(rad) * ry;

      out += `
        <circle class="pmd-chair"
                cx="${x}"
                cy="${y}"
                r="${chairR}"></circle>
      `;
    }

    return out;
  }

  function tableSvg(t) {
    const id = String(t.id);
    const x = Number(t.x || 40);
    const y = Number(t.y || 40);
    const size = visualSize(t);
    const w = size.w;
    const h = size.h;
    const st = statusInfo(t);
    const selected = String(selectedTableId) === id;
    const mergeSel = mergeSelected.includes(id);

    const statusLabel = st.label ? `
      <text class="pmd-table-text-status" x="${w / 2}" y="${h * .68}">${esc(st.label)}</text>
    ` : '';

    return `
      <g class="pmd-floor-table status-${esc(st.key)} ${selected ? 'selected' : ''} ${mergeSel ? 'merge-selected' : ''} ${editMode ? 'editing' : ''}"
         data-pmd-table-id="${esc(id)}"
         transform="translate(${x}, ${y})"
         tabindex="0"
         role="button">
        <title>${esc(tableTitle(t))} · ${esc(st.card)} · ${esc(capacityText(t))}</title>
        ${chairSvg(t, w, h)}
        ${tableMainSvg(t, w, h)}
        <text class="pmd-table-text-main" x="${w / 2}" y="${st.label ? h * .40 : h * .52}">${esc(t.number || t.label || t.id)}</text>
        ${statusLabel}
      </g>
    `;
  }

  function renderMap() {
    const f = activeFloor();

    return `
      <div class="pmd-floor-map-wrap">
        <svg class="pmd-floor-svg"
             viewBox="0 0 ${Number(f.width || 1000)} ${Number(f.height || 520)}"
             preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="pmd-floor-grid-v143" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(8,36,31,.055)" stroke-width="1"/>
            </pattern>
            <radialGradient id="pmd-floor-glow-v143" cx="10%" cy="78%" r="28%">
              <stop offset="0%" stop-color="rgba(0,84,63,.13)"/>
              <stop offset="100%" stop-color="rgba(0,84,63,0)"/>
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="100%" height="100%" fill="#fbf4e8"></rect>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pmd-floor-grid-v143)"></rect>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pmd-floor-glow-v143)"></rect>

          ${floorTables().map(tableSvg).join('')}
        </svg>
      </div>
    `;
  }

  function renderCards() {
    return `
      <div class="pmd-floor-grid">
        ${floorTables().map(t => {
          const st = statusInfo(t);

          return `
            <div class="pmd-floor-card status-${esc(st.key)}" data-pmd-card-table-id="${esc(t.id)}">
              <div class="pmd-floor-card-head">
                <div class="pmd-floor-card-title">${esc(tableTitle(t))}</div>
                <div class="pmd-floor-pill">${esc(st.card)}</div>
              </div>

              <div class="pmd-floor-mini">
                <div>${Number(t.open_orders || t.orders || 0)}<span>Orders</span></div>
                <div>${Number(t.ready || 0)}<span>Ready</span></div>
                <div>${money(t.due || 0)}<span>Due</span></div>
              </div>

              <div class="pmd-floor-meta">
                <strong>${esc(capacityText(t))}</strong>
                <br>${esc(t.section || 'main')}${t.zone ? ' · ' + esc(t.zone) : ''}
                ${arr(t.features).length ? '<br>' + esc(featuresText(t)) : ''}
              </div>

              <div class="pmd-floor-card-actions">
                <a class="primary" href="/admin/quick-mode?preview=pmdquick2026&table_id=${encodeURIComponent(t.id)}">Add items</a>
                <a href="/admin/tables/edit/${encodeURIComponent(t.id)}">Details</a>
                <a href="/admin/payments?table_id=${encodeURIComponent(t.id)}">Bill</a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function render() {
    const root = injectRoot();
    cleanOldDashboard();

    if (!DATA || !DATA.ok) {
      root.innerHTML = `
        <div class="pmd-floor-shell">
          <div class="pmd-floor-title">Floor plan unavailable</div>
          <div class="pmd-floor-sub">${esc(DATA && DATA.message ? DATA.message : 'No valid floor data')}</div>
        </div>
      `;
      return;
    }

    if (!activeFloorId) {
      activeFloorId = (floors()[0] && floors()[0].id) || 'main-floor';
    }

    root.classList.toggle('pmd-floor-editing', editMode);
    root.classList.toggle('pmd-floor-merge-mode', mergeMode);

    root.innerHTML = `
      <div class="pmd-floor-shell">
        <div class="pmd-floor-top">
          <div>
            <div class="pmd-floor-title">Floor plan</div>
            <div class="pmd-floor-sub">
              ${tables().length} real visible tables · ${menus().length} real menu items · chairs = capacity · color = status
            </div>
          </div>

          <div class="pmd-floor-actions">
            <button class="pmd-floor-btn" data-pmd-action="audit">Audit</button>
            <button class="pmd-floor-btn" data-pmd-action="refresh">Refresh</button>
            <button class="pmd-floor-btn ${editMode ? 'primary' : ''}" data-pmd-action="edit">
              ${editMode ? 'Editing ON' : 'Edit layout'}
            </button>
            <button class="pmd-floor-btn ${mergeMode ? 'primary' : ''}" data-pmd-action="merge-mode">
              ${mergeMode ? 'Merge ON' : 'Merge tables'}
            </button>
            ${mergeMode && mergeSelected.length >= 2 ? `
              <button class="pmd-floor-btn danger" data-pmd-action="merge-apply">
                Merge selected
              </button>
            ` : ''}
          </div>
        </div>

        ${renderTabs()}

        <div class="pmd-floor-legend">
          <span class="free">Free</span>
          <span class="order">Order</span>
          <span class="kitchen">Kitchen</span>
          <span class="ready">Ready</span>
          <span class="partial">Part paid</span>
          <span class="call">Call / Note</span>
          <span class="paid">Paid</span>
        </div>

        ${renderMap()}

        <div class="pmd-floor-edit-note">
          ${editMode ? 'Edit mode: drag tables to update layout.' : ''}
          ${mergeMode ? 'Merge mode: select 2 or more tables, then click Merge selected.' : ''}
        </div>

        ${renderCards()}
      </div>
    `;

    bind();
  }

  function bind() {
    const root = document.getElementById('pmd-floor-plan-stable');
    if (!root) return;

    root.querySelectorAll('[data-pmd-floor-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFloorId = btn.getAttribute('data-pmd-floor-tab');
        selectedTableId = null;
        mergeSelected = [];
        render();
      });
    });

    root.querySelectorAll('[data-pmd-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-pmd-action');

        if (action === 'refresh') await refresh();

        if (action === 'audit') {
          console.log('PMD FLOOR v143 AUDIT:', audit());
          alert('Audit printed in console.');
        }

        if (action === 'edit') {
          editMode = !editMode;
          if (editMode) mergeMode = false;
          render();
        }

        if (action === 'merge-mode') {
          mergeMode = !mergeMode;
          if (mergeMode) editMode = false;
          mergeSelected = [];
          render();
        }

        if (action === 'merge-apply') {
          await mergeTables();
        }
      });
    });

    root.querySelectorAll('.pmd-floor-table').forEach(g => {
      g.addEventListener('click', () => {
        const id = g.getAttribute('data-pmd-table-id');

        if (mergeMode) {
          if (mergeSelected.includes(id)) {
            mergeSelected = mergeSelected.filter(x => x !== id);
          } else {
            mergeSelected.push(id);
          }
          render();
          return;
        }

        selectedTableId = id;
        render();
      });
    });

    const svg = root.querySelector('.pmd-floor-svg');
    if (!svg) return;

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
  }

  function svgPoint(svg, ev) {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function onPointerDown(ev) {
    if (!editMode) return;

    const g = ev.target.closest('.pmd-floor-table');
    if (!g) return;

    const svg = ev.currentTarget;
    const id = g.getAttribute('data-pmd-table-id');
    const t = tables().find(x => String(x.id) === String(id));
    if (!t) return;

    const p = svgPoint(svg, ev);

    drag = {
      id,
      g,
      svg,
      startX: p.x,
      startY: p.y,
      origX: Number(t.x || 0),
      origY: Number(t.y || 0),
      table: t
    };

    selectedTableId = id;
    g.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!drag || !editMode) return;

    const p = svgPoint(drag.svg, ev);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    const f = activeFloor();
    const size = visualSize(drag.table);

    const nx = Math.max(10, Math.min(Number(f.width || 1000) - size.w - 35, drag.origX + dx));
    const ny = Math.max(10, Math.min(Number(f.height || 520) - size.h - 35, drag.origY + dy));

    drag.table.x = Math.round(nx);
    drag.table.y = Math.round(ny);

    drag.g.setAttribute('transform', `translate(${drag.table.x}, ${drag.table.y})`);
  }

  async function onPointerUp() {
    if (!drag) return;

    const t = drag.table;
    const id = drag.id;
    drag = null;

    try {
      const params = new URLSearchParams({
        table_id: id,
        floor_x: String(Math.round(Number(t.x || 0))),
        floor_y: String(Math.round(Number(t.y || 0))),
        floor_name: activeFloor().label || 'Main Floor'
      });

      const r = await fetch(UPDATE_URL + '?' + params.toString(), { credentials: 'same-origin' });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) {}

      if (!r.ok || !json || !json.ok) {
        console.warn('PMD floor position save failed:', r.status, text);
      } else {
        console.log('✅ PMD floor position saved:', json);
      }
    } catch (e) {
      console.warn('PMD floor position save error:', e);
    }
  }

  async function mergeTables() {
    if (mergeSelected.length < 2) return;

    const ids = mergeSelected.join(',');

    for (const url of MERGE_URLS) {
      try {
        const r = await fetch(url + '?apply=1&table_ids=' + encodeURIComponent(ids), {
          credentials: 'same-origin'
        });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch (e) {}

        if (r.ok && json && json.ok) {
          alert('Tables merged.');
          mergeSelected = [];
          mergeMode = false;
          await refresh();
          return;
        }

        console.warn('Merge endpoint failed:', url, r.status, text);
      } catch (e) {
        console.warn('Merge endpoint error:', url, e);
      }
    }

    alert('Merge endpoint is not ready yet. Backend needs real merge persistence, not only visual merge.');
  }

  async function refresh() {
    DATA = await fetchJson();

    if (!activeFloorId || !floors().some(f => String(f.id) === String(activeFloorId))) {
      activeFloorId = (floors()[0] && floors()[0].id) || 'main-floor';
    }

    render();
    console.log('✅ PMD floor plan v144 status chair map', audit());
    return DATA;
  }

  function audit() {
    const root = document.getElementById('pmd-floor-plan-stable');

    return {
      version: VERSION,
      apiOk: !!(DATA && DATA.ok),
      sourceUrl: DATA && DATA.__sourceUrl,
      floors: floors().map(f => ({ id: f.id, label: f.label, tables: f.tables })),
      activeFloorId,
      visibleTables: tables().length,
      tableIcons: root ? root.querySelectorAll('.pmd-floor-table').length : 0,
      chairIcons: root ? root.querySelectorAll('.pmd-chair').length : 0,
      menuItems: menus().length,
      editMode,
      mergeMode,
      mergeSelected,
      hiddenOldWidgets: document.querySelectorAll('[data-pmd-v143-hidden="1"]').length,
      scripts: Array.from(document.scripts)
        .filter(s => /pmd-(floor|waiter)/i.test(s.src || ''))
        .map(s => s.src)
    };
  }

  window.PMDFloorPlanV144 = {
    refresh,
    audit,
    toggleEdit: function () {
      editMode = !editMode;
      if (editMode) mergeMode = false;
      render();
      return editMode;
    },
    toggleMerge: function () {
      mergeMode = !mergeMode;
      if (mergeMode) editMode = false;
      mergeSelected = [];
      render();
      return mergeMode;
    }
  };

  ready(function () {
    refresh().catch(e => {
      DATA = { ok: false, message: e.message };
      render();
      console.warn('PMD floor plan v144 failed:', e);
    });

    const mo = new MutationObserver(() => {
      clearTimeout(window.__PMD_FLOOR_V144_CLEAN_TIMER__);
      window.__PMD_FLOOR_V144_CLEAN_TIMER__ = setTimeout(cleanOldDashboard, 80);
    });

    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
