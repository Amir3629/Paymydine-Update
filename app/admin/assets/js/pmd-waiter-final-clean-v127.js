(function(){
  'use strict';

  if(!/\/admin\/dashboard/.test(location.pathname)) return;
  if(window.__PMD_WAITER_V127_RUNNING__) return;
  window.__PMD_WAITER_V127_RUNNING__ = true;

  const DATA_URL = '/admin/pmd-waiter-floor-v107-data';
  const ADD_URL = '/admin/pmd-waiter-floor-v107-add-item';

  let DATA = null;
  let view = 'floor';
  let selectedTable = null;
  let timer = null;

  function ready(fn){
    if(document.body) return fn();
    if(document.readyState === 'interactive' || document.readyState === 'complete') return setTimeout(fn, 50);
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(fn, 50); }, {once:true});
  }

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
    });
  }

  function arr(v){ return Array.isArray(v) ? v : []; }
  function money(v){ return '€' + Number(v || 0).toFixed(2); }
  function tables(){ return DATA ? (arr(DATA.floor_tables).length ? arr(DATA.floor_tables) : arr(DATA.tables)) : []; }
  function menus(){ return DATA ? (arr(DATA.menu_items).length ? arr(DATA.menu_items) : arr(DATA.menus)) : []; }
  function tid(t){ return t.id || t.table_id; }
  function tnum(t){ return t.number || t.table_no || t.name || t.label || t.id; }
  function title(t){ return t.label || t.name || ('Table ' + tnum(t)); }

  function injectCss(){
    if(document.getElementById('pmd-waiter-v127-css')) return;
    const st = document.createElement('style');
    st.id = 'pmd-waiter-v127-css';
    st.textContent = `
      body.pmd-waiter-v127-active #dashboardcontainer-container,
      body.pmd-waiter-v127-active .dashboard-widgets,
      body.pmd-waiter-v127-active .widget-container {
        display:none!important;
        height:0!important;
        overflow:hidden!important;
      }

      #pmd-waiter-v127,
      #pmd-waiter-v127 * {
        box-sizing:border-box;
      }

      #pmd-waiter-v127 {
        --green:#00543f;
        --green2:#002f29;
        --ink:#08241f;
        --muted:#6d7a8c;
        --soft:#f5f1e8;
        --line:rgba(8,36,31,.12);
        --shadow:0 18px 45px rgba(8,36,31,.08);
        width:100%;
        max-width:1540px;
        margin:26px auto 110px;
        padding:0 28px;
        color:var(--ink);
        font-family:inherit;
        position:relative;
        z-index:20;
      }

      #pmd-waiter-v127 .pmd127-kpis {
        display:grid;
        grid-template-columns:repeat(5,minmax(0,1fr));
        background:linear-gradient(135deg,#001c18,#006044);
        border-radius:24px;
        overflow:hidden;
        box-shadow:var(--shadow);
        margin-bottom:26px;
      }

      #pmd-waiter-v127 .pmd127-kpi {
        min-height:128px;
        padding:24px 26px;
        border-right:1px solid rgba(255,255,255,.12);
      }

      #pmd-waiter-v127 .pmd127-kpi:last-child {
        border-right:0;
      }

      #pmd-waiter-v127 .pmd127-kpi-title {
        color:rgba(255,255,255,.72);
        font-weight:950;
        letter-spacing:.18em;
        font-size:13px;
        text-transform:uppercase;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      #pmd-waiter-v127 .pmd127-kpi-value {
        color:#fff;
        font-size:42px;
        line-height:1;
        margin-top:18px;
        font-weight:950;
      }

      #pmd-waiter-v127 .pmd127-kpi-sub {
        margin-top:9px;
        color:#4cff93;
        font-size:15px;
        font-weight:900;
      }

      #pmd-waiter-v127 .pmd127-panel {
        background:#fff;
        border:1px solid var(--line);
        border-radius:26px;
        padding:26px;
        box-shadow:var(--shadow);
      }

      #pmd-waiter-v127 .pmd127-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:18px;
        margin-bottom:22px;
      }

      #pmd-waiter-v127 .pmd127-title {
        font-size:34px;
        line-height:1;
        font-weight:950;
        letter-spacing:-.04em;
      }

      #pmd-waiter-v127 .pmd127-actions {
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        justify-content:flex-end;
      }

      #pmd-waiter-v127 button {
        font-family:inherit;
      }

      #pmd-waiter-v127 .pmd127-btn {
        border:0;
        background:var(--soft);
        color:var(--ink);
        border-radius:16px;
        min-height:48px;
        padding:0 20px;
        font-weight:950;
        cursor:pointer;
        box-shadow:0 8px 18px rgba(8,36,31,.06);
      }

      #pmd-waiter-v127 .pmd127-primary {
        background:var(--green);
        color:#fff;
      }

      #pmd-waiter-v127 .pmd127-map {
        min-height:360px;
        border:4px solid rgba(8,36,31,.28);
        border-radius:24px;
        padding:38px 9%;
        background:
          radial-gradient(circle at 9% 80%,rgba(0,84,63,.14),rgba(0,84,63,0) 80px),
          linear-gradient(rgba(8,36,31,.035) 1px,transparent 1px),
          linear-gradient(90deg,rgba(8,36,31,.035) 1px,transparent 1px),
          #fbf4e8;
        background-size:auto,68px 68px,68px 68px,auto;
        display:grid;
        grid-template-columns:repeat(4,minmax(130px,1fr));
        align-content:start;
        justify-items:center;
        gap:32px 58px;
        overflow:hidden;
      }

      #pmd-waiter-v127 .pmd127-table {
        width:154px;
        min-height:90px;
        border-radius:22px;
        border:4px solid #2cc36f;
        background:linear-gradient(#92efa9,#74d98c);
        color:#07392f;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        font-weight:950;
        cursor:pointer;
        box-shadow:0 10px 20px rgba(8,36,31,.12);
      }

      #pmd-waiter-v127 .pmd127-table-num {
        font-size:34px;
        line-height:1;
      }

      #pmd-waiter-v127 .pmd127-table-status {
        margin-top:10px;
        font-size:11px;
        letter-spacing:.28em;
      }

      #pmd-waiter-v127 .pmd127-status-reserved {
        background:linear-gradient(#a8d4ff,#8fc9fb);
        border-color:#3b8ef6;
      }

      #pmd-waiter-v127 .pmd127-status-dining,
      #pmd-waiter-v127 .pmd127-status-open,
      #pmd-waiter-v127 .pmd127-status-unpaid {
        background:linear-gradient(#ffd982,#ffc65f);
        border-color:#f4a51c;
      }

      #pmd-waiter-v127 .pmd127-status-ready,
      #pmd-waiter-v127 .pmd127-status-attention {
        background:linear-gradient(#ffb5ad,#ff8d83);
        border-color:#ff5b50;
      }

      #pmd-waiter-v127 .pmd127-cards {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:16px;
        margin-top:20px;
      }

      #pmd-waiter-v127 .pmd127-card {
        background:#fff;
        border:1px solid var(--line);
        border-radius:20px;
        padding:20px;
        box-shadow:0 8px 20px rgba(8,36,31,.04);
      }

      #pmd-waiter-v127 .pmd127-card-top {
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:flex-start;
      }

      #pmd-waiter-v127 .pmd127-card-title {
        font-size:25px;
        font-weight:950;
        letter-spacing:-.04em;
      }

      #pmd-waiter-v127 .pmd127-pill {
        border-radius:999px;
        padding:8px 12px;
        background:#e8fff1;
        color:#00543f;
        font-size:12px;
        font-weight:950;
      }

      #pmd-waiter-v127 .pmd127-mini {
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
        margin:16px 0;
      }

      #pmd-waiter-v127 .pmd127-mini div {
        background:var(--soft);
        border-radius:14px;
        padding:12px;
        font-weight:950;
        min-height:58px;
      }

      #pmd-waiter-v127 .pmd127-mini small {
        display:block;
        color:#8190a0;
        font-size:10px;
        letter-spacing:.18em;
        margin-top:6px;
      }

      #pmd-waiter-v127 .pmd127-card-actions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }

      #pmd-waiter-v127 .pmd127-menu-grid {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:14px;
      }

      #pmd-waiter-v127 .pmd127-menu {
        border:1px solid var(--line);
        background:#fffdf8;
        border-radius:18px;
        padding:22px;
        text-align:left;
        cursor:pointer;
        min-height:110px;
      }

      #pmd-waiter-v127 .pmd127-menu strong {
        display:block;
        font-size:20px;
        color:var(--ink);
      }

      #pmd-waiter-v127 .pmd127-price {
        display:block;
        margin-top:12px;
        color:var(--green);
        font-size:22px;
        font-weight:950;
      }

      #pmd-waiter-v127 .pmd127-toast {
        position:fixed;
        left:50%;
        bottom:34px;
        transform:translateX(-50%);
        background:var(--green);
        color:#fff;
        border-radius:18px;
        padding:18px 26px;
        font-weight:950;
        z-index:2147483647;
        box-shadow:0 18px 45px rgba(8,36,31,.26);
      }

      @media (max-width: 760px) {
        #pmd-waiter-v127 {
          padding:0 14px 100px;
          margin-top:16px;
        }

        #pmd-waiter-v127 .pmd127-kpis {
          display:flex;
          overflow-x:auto;
          border-radius:22px;
          scroll-snap-type:x mandatory;
        }

        #pmd-waiter-v127 .pmd127-kpi {
          min-width:220px;
          scroll-snap-align:start;
          border-right:1px solid rgba(255,255,255,.12);
        }

        #pmd-waiter-v127 .pmd127-head {
          align-items:flex-start;
          flex-direction:column;
        }

        #pmd-waiter-v127 .pmd127-actions {
          width:100%;
          justify-content:flex-start;
        }

        #pmd-waiter-v127 .pmd127-map {
          min-height:520px;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:24px;
          padding:28px 16px;
        }

        #pmd-waiter-v127 .pmd127-table {
          width:100%;
          min-height:118px;
        }

        #pmd-waiter-v127 .pmd127-table-num {
          font-size:44px;
        }

        #pmd-waiter-v127 .pmd127-cards,
        #pmd-waiter-v127 .pmd127-menu-grid {
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function getMount(){
    let root = document.getElementById('pmd-waiter-v127');
    if(root) return root;

    root = document.createElement('div');
    root.id = 'pmd-waiter-v127';

    const pageTitle = document.querySelector('.page-title, .content-header, header, .navbar');
    const container = document.querySelector('.content-wrapper, main, #layout-content, .page-content, .container-fluid') || document.body;

    if(pageTitle && pageTitle.parentNode){
      pageTitle.parentNode.insertBefore(root, pageTitle.nextSibling);
    } else if(container.firstChild){
      container.insertBefore(root, container.firstChild);
    } else {
      container.appendChild(root);
    }

    return root;
  }

  function hideLegacy(){
    if(document.body){
      document.body.classList.add('pmd-waiter-v127-active');
    }
  }

  function kpis(){
    const k = DATA?.kpis || DATA?.metrics || {};
    const rows = [
      ['Tables', k.tables ?? tables().length, 'enabled tables'],
      ['Ready to serve', k.ready ?? k.ready_to_serve ?? 0, 'from kitchen'],
      ['Active orders', k.active_orders ?? 0, 'open orders'],
      ['Needs attention', k.attention ?? k.needs_attention ?? 0, 'calls / notes'],
      ['Checks to close', money(k.checks_due ?? k.payments_due ?? k.due ?? 0), 'payments pending'],
    ];
    return `<div class="pmd127-kpis">${rows.map(r => `
      <div class="pmd127-kpi">
        <div class="pmd127-kpi-title">${esc(r[0])}</div>
        <div class="pmd127-kpi-value">${esc(r[1])}</div>
        <div class="pmd127-kpi-sub">${esc(r[2])}</div>
      </div>`).join('')}</div>`;
  }

  function floor(){
    const ts = tables();
    return `
      ${kpis()}
      <section class="pmd127-panel">
        <div class="pmd127-head">
          <div class="pmd127-title">Floor plan</div>
          <div class="pmd127-actions">
            <button class="pmd127-btn" data-action="legend">? Legend</button>
            <button class="pmd127-btn" data-action="refresh">Refresh</button>
            <button class="pmd127-btn pmd127-primary" data-action="merge">Merge tables</button>
          </div>
        </div>

        <div class="pmd127-map">
          ${ts.map(t => `
            <button class="pmd127-table pmd127-status-${esc((t.status || 'free').toLowerCase())}" data-table="${esc(tid(t))}">
              <span class="pmd127-table-num">${esc(tnum(t))}</span>
              <span class="pmd127-table-status">${esc(t.status_label || t.status || 'FREE')}</span>
            </button>
          `).join('')}
        </div>

        <div class="pmd127-cards">
          ${ts.map(t => `
            <div class="pmd127-card">
              <div class="pmd127-card-top">
                <div class="pmd127-card-title">${esc(title(t))}</div>
                <div class="pmd127-pill">${esc(t.status_label || t.status || 'FREE')}</div>
              </div>
              <div class="pmd127-mini">
                <div>${esc(t.orders ?? t.open_orders ?? 0)}<small>ORDERS</small></div>
                <div>${esc(t.ready ?? 0)}<small>READY</small></div>
                <div>${money(t.due ?? 0)}<small>DUE</small></div>
              </div>
              <div class="pmd127-card-actions">
                <button class="pmd127-btn pmd127-primary" data-add="${esc(tid(t))}">Add items</button>
                <button class="pmd127-btn" data-detail="${esc(tid(t))}">Details</button>
                <button class="pmd127-btn" data-bill="${esc(tid(t))}">Bill</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function menu(){
    const ms = menus();
    return `
      ${kpis()}
      <section class="pmd127-panel">
        <div class="pmd127-head">
          <div>
            <div class="pmd127-title">Add Items</div>
            <div style="color:#6d7a8c;font-weight:900;margin-top:8px">Selected: ${esc(selectedTable ? title(selectedTable) : '')} · real items from /admin/menus</div>
          </div>
          <button class="pmd127-btn" data-action="back">← Tables</button>
        </div>
        <div class="pmd127-menu-grid">
          ${ms.map(m => `
            <button class="pmd127-menu" data-menu="${esc(m.id || m.menu_id)}">
              <strong>${esc(m.name || m.title || m.menu_name || 'Menu item')}</strong>
              <span class="pmd127-price">${money(m.price || m.menu_price || m.cost || 0)}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function render(){
    ready(function(){
      injectCss();
      hideLegacy();
      const root = getMount();

      if(!DATA){
        root.innerHTML = `<section class="pmd127-panel"><strong>Loading waiter data...</strong></section>`;
        return;
      }

      root.innerHTML = view === 'menu' ? menu() : floor();
      bind(root);
    });
  }

  function bind(root){
    root.querySelectorAll('[data-action="refresh"]').forEach(b => b.onclick = () => load());
    root.querySelectorAll('[data-action="back"]').forEach(b => b.onclick = () => { view='floor'; render(); });
    root.querySelectorAll('[data-action="legend"]').forEach(b => b.onclick = () => toast('Green free · orange open/unpaid · blue reserved · red attention/ready'));
    root.querySelectorAll('[data-action="merge"]').forEach(b => b.onclick = () => toast('Merge UI is ready; endpoint can be connected to selected tables next.'));

    root.querySelectorAll('[data-table],[data-add]').forEach(b => b.onclick = () => {
      const id = b.getAttribute('data-table') || b.getAttribute('data-add');
      selectedTable = tables().find(t => String(tid(t)) === String(id)) || null;
      view = 'menu';
      render();
    });

    root.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => toast('Details selected'));
    root.querySelectorAll('[data-bill]').forEach(b => b.onclick = () => toast('Bill selected'));

    root.querySelectorAll('[data-menu]').forEach(b => b.onclick = async () => {
      if(!selectedTable) return toast('Select a table first.');
      const menuId = b.getAttribute('data-menu');
      const url = `${ADD_URL}?apply=1&table_id=${encodeURIComponent(tid(selectedTable))}&menu_id=${encodeURIComponent(menuId)}&qty=1`;
      try {
        const r = await fetch(url, {credentials:'same-origin'});
        const txt = await r.text();
        let json = {};
        try { json = JSON.parse(txt); } catch(e) {}
        if(!r.ok || json.ok === false) {
          console.warn('PMD v127 add-item failed:', r.status, txt);
          toast(json.message || json.error || 'Add item failed. See console.');
          return;
        }
        toast('Item added to real order.');
        await load(false);
      } catch(e) {
        console.error(e);
        toast('Add item request failed.');
      }
    });
  }

  function toast(msg){
    const old = document.querySelector('.pmd127-toast');
    if(old) old.remove();
    const t = document.createElement('div');
    t.className = 'pmd127-toast';
    t.textContent = msg;
    (document.body || document.documentElement).appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  async function load(showLoading=true){
    ready(async function(){
      if(showLoading && !DATA) render();
      try {
        const r = await fetch(DATA_URL, {credentials:'same-origin'});
        const txt = await r.text();
        let json;
        try { json = JSON.parse(txt); }
        catch(e) {
          throw new Error('Data endpoint returned non-JSON: HTTP ' + r.status + ' ' + txt.slice(0,160));
        }
        if(!r.ok || json.ok === false) {
          throw new Error(json.error || json.message || ('HTTP ' + r.status));
        }
        DATA = json;
        render();
        console.log('✅ PMD waiter v127 only', json);
      } catch(e) {
        console.error('PMD v127 failed:', e);
        const root = getMount();
        root.innerHTML = `<section class="pmd127-panel"><strong>Waiter data failed.</strong><pre style="white-space:pre-wrap;margin-top:12px">${esc(e.message)}</pre></section>`;
      }
    });
  }

  function boot(){
    ready(function(){
      injectCss();
      hideLegacy();
      render();
      load();
      if(timer) clearInterval(timer);
      timer = setInterval(() => load(false), 15000);
    });
  }

  window.PMDWaiterV127 = {
    refresh: () => load(),
    state: () => ({DATA, view, selectedTable})
  };

  boot();
})();


/* PMD WAITER V128 VISUAL FIX START */
(function(){
  if(!/\/admin\/dashboard/.test(location.pathname)) return;

  function addStyle(){
    if(document.getElementById('pmd-waiter-v128-visual-css')) return;

    var st = document.createElement('style');
    st.id = 'pmd-waiter-v128-visual-css';
    st.textContent = `
      body.pmd-waiter-v127-active #dashboardcontainer-container,
      body.pmd-waiter-v127-active .dashboard-widgets,
      body.pmd-waiter-v127-active .widget-container {
        display:none!important;
        height:0!important;
        max-height:0!important;
        overflow:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }

      [data-pmd-old-waiter-strip="1"] {
        display:none!important;
        height:0!important;
        max-height:0!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }

      #pmd-waiter-v127 {
        position:relative!important;
        z-index:999!important;
        margin-top:24px!important;
      }

      #pmd-waiter-v127 .pmd127-kpis {
        position:relative!important;
        z-index:2!important;
      }

      #pmd-waiter-v127 .pmd127-panel {
        position:relative!important;
        z-index:2!important;
      }

      #pmd-waiter-v127 .pmd127-map {
        min-height:330px!important;
        padding:38px 9%!important;
        align-content:start!important;
      }

      #pmd-waiter-v127 .pmd127-table {
        width:154px!important;
        height:90px!important;
        min-height:90px!important;
        padding:0!important;
        border-radius:22px!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        line-height:1!important;
        overflow:hidden!important;
      }

      #pmd-waiter-v127 .pmd127-table-num {
        font-size:34px!important;
        line-height:1!important;
        margin:0!important;
        padding:0!important;
      }

      #pmd-waiter-v127 .pmd127-table-status {
        font-size:10px!important;
        line-height:1!important;
        margin-top:10px!important;
        letter-spacing:.28em!important;
        white-space:nowrap!important;
      }

      @media (max-width:760px) {
        #pmd-waiter-v127 {
          margin-top:14px!important;
          padding-left:14px!important;
          padding-right:14px!important;
        }

        #pmd-waiter-v127 .pmd127-kpis {
          margin-bottom:18px!important;
        }

        #pmd-waiter-v127 .pmd127-kpi {
          min-width:190px!important;
          min-height:116px!important;
          padding:20px 22px!important;
        }

        #pmd-waiter-v127 .pmd127-kpi-value {
          font-size:38px!important;
        }

        #pmd-waiter-v127 .pmd127-title {
          font-size:42px!important;
        }

        #pmd-waiter-v127 .pmd127-panel {
          padding:22px!important;
          border-radius:24px!important;
        }

        #pmd-waiter-v127 .pmd127-actions {
          display:grid!important;
          grid-template-columns:1fr 1fr!important;
          gap:12px!important;
        }

        #pmd-waiter-v127 .pmd127-actions .pmd127-primary {
          grid-column:1 / -1!important;
        }

        #pmd-waiter-v127 .pmd127-btn {
          min-height:54px!important;
          border-radius:18px!important;
          font-size:18px!important;
        }

        #pmd-waiter-v127 .pmd127-map {
          min-height:auto!important;
          padding:20px 16px!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:18px!important;
          border-width:4px!important;
          border-radius:24px!important;
        }

        #pmd-waiter-v127 .pmd127-table {
          width:100%!important;
          height:82px!important;
          min-height:82px!important;
          border-radius:20px!important;
        }

        #pmd-waiter-v127 .pmd127-table-num {
          font-size:38px!important;
        }

        #pmd-waiter-v127 .pmd127-table-status {
          font-size:10px!important;
          margin-top:8px!important;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(st);
  }

  function hideOldWaiterStrips(){
    if(!document.body) return;

    document.body.classList.add('pmd-waiter-v127-active');

    var root = document.getElementById('pmd-waiter-v127');
    var nodes = Array.from(document.body.querySelectorAll('div,section,article,main'));

    nodes.forEach(function(el){
      if(!el || el.id === 'pmd-waiter-v127') return;
      if(root && root.contains(el)) return;
      if(el.closest && el.closest('#pmd-waiter-v127')) return;
      if(el.closest && el.closest('.navbar,.main-header,.header,.topbar')) return;

      var txt = (el.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if(!txt) return;

      var isOldWaiter =
        txt.includes('assigned section') ||
        txt.includes('active tickets') ||
        txt.includes('my tables only') ||
        txt.includes('guest notes') ||
        txt.includes('go to table') ||
        txt.includes('t2/t6/t') ||
        (txt.includes('my tables') && txt.includes('ready to serve') && txt.includes('payments due'));

      if(!isOldWaiter) return;

      var target = el;
      for(var i=0;i<5 && target.parentElement && target.parentElement !== document.body;i++){
        var r = target.getBoundingClientRect();
        var pr = target.parentElement.getBoundingClientRect();

        if(pr.width >= Math.max(320, window.innerWidth * 0.65) && pr.height <= 320 && pr.height >= 60){
          target = target.parentElement;
        } else if(r.width >= Math.max(320, window.innerWidth * 0.65) && r.height <= 320 && r.height >= 60){
          break;
        } else {
          break;
        }
      }

      target.setAttribute('data-pmd-old-waiter-strip', '1');
    });
  }

  function run(){
    addStyle();
    hideOldWaiterStrips();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, {once:true});
  } else {
    run();
  }

  var count = 0;
  var timer = setInterval(function(){
    run();
    count++;
    if(count > 20) clearInterval(timer);
  }, 300);

  window.PMDWaiterV128VisualFix = { run: run };
  console.log('✅ PMD waiter v128 visual fix active');
})();
/* PMD WAITER V128 VISUAL FIX END */


/* PMD WAITER V129 FINAL POLISH START */
(function(){
  if(!/\/admin\/dashboard/.test(location.pathname)) return;

  function addStyle(){
    if(document.getElementById('pmd-waiter-v129-final-css')) return;

    var st = document.createElement('style');
    st.id = 'pmd-waiter-v129-final-css';
    st.textContent = `
      body.pmd-waiter-v127-active #dashboardcontainer-container,
      body.pmd-waiter-v127-active .dashboard-widgets,
      body.pmd-waiter-v127-active .widget-container {
        display:none!important;
        height:0!important;
        max-height:0!important;
        min-height:0!important;
        overflow:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }

      [data-pmd-old-waiter-strip="1"] {
        display:none!important;
        height:0!important;
        max-height:0!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }

      #pmd-waiter-v127 {
        position:relative!important;
        z-index:999!important;
        margin-top:22px!important;
        margin-bottom:100px!important;
      }

      #pmd-waiter-v127 .pmd127-kpis {
        position:relative!important;
        z-index:3!important;
      }

      #pmd-waiter-v127 .pmd127-panel {
        position:relative!important;
        z-index:3!important;
      }

      #pmd-waiter-v127 .pmd127-map {
        min-height:300px!important;
        max-height:none!important;
        padding:34px 9%!important;
        align-content:start!important;
        justify-content:center!important;
      }

      #pmd-waiter-v127 .pmd127-table {
        width:154px!important;
        height:86px!important;
        min-height:86px!important;
        padding:0!important;
        border-radius:20px!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        line-height:1!important;
        overflow:hidden!important;
      }

      #pmd-waiter-v127 .pmd127-table-num {
        font-size:34px!important;
        line-height:1!important;
        margin:0!important;
        padding:0!important;
      }

      #pmd-waiter-v127 .pmd127-table-status {
        font-size:10px!important;
        line-height:1!important;
        margin-top:9px!important;
        letter-spacing:.28em!important;
        white-space:nowrap!important;
      }

      #pmd-waiter-v127 .pmd127-menu-grid {
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:16px!important;
        align-items:stretch!important;
      }

      #pmd-waiter-v127 .pmd127-menu-card,
      #pmd-waiter-v127 .pmd127-menu-item {
        min-height:118px!important;
        height:auto!important;
        padding:22px 24px!important;
        border-radius:18px!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        justify-content:center!important;
        overflow:hidden!important;
        white-space:normal!important;
        line-height:1.2!important;
      }

      #pmd-waiter-v127 .pmd127-menu-card strong,
      #pmd-waiter-v127 .pmd127-menu-item strong {
        display:block!important;
        font-size:20px!important;
        line-height:1.25!important;
        margin:0 0 10px!important;
        white-space:normal!important;
      }

      #pmd-waiter-v127 .pmd127-menu-card .price,
      #pmd-waiter-v127 .pmd127-menu-item .price,
      #pmd-waiter-v127 .pmd127-menu-card small,
      #pmd-waiter-v127 .pmd127-menu-item small {
        display:block!important;
        font-size:20px!important;
        line-height:1.1!important;
        color:#00543f!important;
        font-weight:900!important;
        margin:0!important;
      }

      @media (max-width:760px) {
        #pmd-waiter-v127 {
          margin-top:12px!important;
          padding-left:14px!important;
          padding-right:14px!important;
          padding-bottom:96px!important;
        }

        #pmd-waiter-v127 .pmd127-kpis {
          display:flex!important;
          flex-wrap:nowrap!important;
          overflow-x:auto!important;
          gap:12px!important;
          margin-bottom:18px!important;
          padding-bottom:4px!important;
          scroll-snap-type:x mandatory!important;
        }

        #pmd-waiter-v127 .pmd127-kpi {
          flex:0 0 158px!important;
          min-width:158px!important;
          width:158px!important;
          min-height:92px!important;
          height:92px!important;
          padding:14px 16px!important;
          border-radius:20px!important;
          scroll-snap-align:start!important;
        }

        #pmd-waiter-v127 .pmd127-kpi-title {
          font-size:11px!important;
          letter-spacing:.22em!important;
          line-height:1!important;
          margin-bottom:10px!important;
          white-space:nowrap!important;
        }

        #pmd-waiter-v127 .pmd127-kpi-value {
          font-size:32px!important;
          line-height:1!important;
          margin:0!important;
        }

        #pmd-waiter-v127 .pmd127-kpi-sub {
          font-size:15px!important;
          line-height:1.1!important;
          margin-top:6px!important;
          white-space:nowrap!important;
        }

        #pmd-waiter-v127 .pmd127-panel {
          padding:20px!important;
          border-radius:24px!important;
        }

        #pmd-waiter-v127 .pmd127-head {
          display:block!important;
          margin-bottom:18px!important;
        }

        #pmd-waiter-v127 .pmd127-title {
          font-size:38px!important;
          line-height:1!important;
          margin-bottom:18px!important;
        }

        #pmd-waiter-v127 .pmd127-actions {
          display:grid!important;
          grid-template-columns:1fr 1fr!important;
          gap:12px!important;
          width:100%!important;
        }

        #pmd-waiter-v127 .pmd127-actions .pmd127-primary {
          grid-column:1 / -1!important;
        }

        #pmd-waiter-v127 .pmd127-btn {
          min-height:50px!important;
          border-radius:16px!important;
          font-size:16px!important;
          width:100%!important;
        }

        #pmd-waiter-v127 .pmd127-map {
          min-height:auto!important;
          height:auto!important;
          padding:16px!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:14px!important;
          border-width:4px!important;
          border-radius:22px!important;
          align-items:start!important;
        }

        #pmd-waiter-v127 .pmd127-table {
          width:100%!important;
          height:66px!important;
          min-height:66px!important;
          border-radius:18px!important;
        }

        #pmd-waiter-v127 .pmd127-table-num {
          font-size:31px!important;
        }

        #pmd-waiter-v127 .pmd127-table-status {
          font-size:9px!important;
          margin-top:6px!important;
          letter-spacing:.24em!important;
        }

        #pmd-waiter-v127 .pmd127-cards {
          grid-template-columns:1fr!important;
          gap:16px!important;
        }

        #pmd-waiter-v127 .pmd127-card {
          border-radius:22px!important;
          padding:20px!important;
        }

        #pmd-waiter-v127 .pmd127-menu-grid {
          grid-template-columns:1fr!important;
          gap:14px!important;
        }

        #pmd-waiter-v127 .pmd127-menu-card,
        #pmd-waiter-v127 .pmd127-menu-item {
          min-height:96px!important;
          padding:18px 20px!important;
          border-radius:18px!important;
        }

        #pmd-waiter-v127 .pmd127-menu-card strong,
        #pmd-waiter-v127 .pmd127-menu-item strong {
          font-size:18px!important;
          margin-bottom:8px!important;
        }

        #pmd-waiter-v127 .pmd127-menu-card .price,
        #pmd-waiter-v127 .pmd127-menu-item .price,
        #pmd-waiter-v127 .pmd127-menu-card small,
        #pmd-waiter-v127 .pmd127-menu-item small {
          font-size:18px!important;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(st);
  }

  function hideOldThings(){
    if(!document.body) return;
    document.body.classList.add('pmd-waiter-v127-active');

    var root = document.getElementById('pmd-waiter-v127');

    Array.from(document.body.querySelectorAll('div,section,article,main')).forEach(function(el){
      if(!el || el.id === 'pmd-waiter-v127') return;
      if(root && root.contains(el)) return;
      if(el.closest && el.closest('#pmd-waiter-v127')) return;
      if(el.closest && el.closest('.navbar,.main-header,.header,.topbar')) return;

      var txt = (el.textContent || '').toLowerCase().replace(/\s+/g,' ').trim();
      if(!txt) return;

      var oldWaiter =
        txt.includes('assigned section') ||
        txt.includes('active tickets') ||
        txt.includes('my tables only') ||
        txt.includes('go to table') ||
        txt.includes('guest notes') ||
        txt.includes('t2/t6/t') ||
        (txt.includes('my tables') && txt.includes('ready to serve') && txt.includes('payments due'));

      if(oldWaiter){
        var box = el;
        for(var i=0;i<4 && box.parentElement && box.parentElement !== document.body;i++){
          var r = box.getBoundingClientRect();
          var pr = box.parentElement.getBoundingClientRect();
          if(pr.width >= Math.max(320, window.innerWidth * .65) && pr.height >= 45 && pr.height <= 330){
            box = box.parentElement;
          } else if(r.width >= Math.max(320, window.innerWidth * .65) && r.height >= 45 && r.height <= 330){
            break;
          } else {
            break;
          }
        }
        box.setAttribute('data-pmd-old-waiter-strip','1');
      }
    });
  }

  function fixMenuMarkup(){
    var root = document.getElementById('pmd-waiter-v127');
    if(!root) return;

    root.querySelectorAll('.pmd127-menu-card,.pmd127-menu-item').forEach(function(card){
      if(card.querySelector('.price')) return;

      var children = Array.from(card.childNodes).filter(function(n){
        return String(n.textContent || '').trim();
      });

      children.forEach(function(n){
        var t = String(n.textContent || '').trim();
        if(/^€/.test(t) || /^\d+(\.\d+)?$/.test(t)){
          if(n.nodeType === 1) n.classList.add('price');
        }
      });
    });
  }

  function run(){
    addStyle();
    hideOldThings();
    fixMenuMarkup();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, {once:true});
  } else {
    run();
  }

  var n = 0;
  var t = setInterval(function(){
    run();
    n++;
    if(n > 20) clearInterval(t);
  }, 250);

  window.PMDWaiterV129Polish = { run: run };
  console.log('✅ PMD waiter v129 final polish active');
})();
/* PMD WAITER V129 FINAL POLISH END */


/* PMD WAITER V130 STABILITY POLISH START */
(function(){
  if(!/\/admin\/dashboard/.test(location.pathname)) return;

  function ready(fn){
    if(document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, {once:true});
  }

  function addStyle(){
    if(document.getElementById('pmd-waiter-v130-css')) return;

    var st = document.createElement('style');
    st.id = 'pmd-waiter-v130-css';
    st.textContent = `
      body.pmd-waiter-v127-active #dashboardcontainer-container,
      body.pmd-waiter-v127-active .dashboard-widgets,
      body.pmd-waiter-v127-active .widget-container,
      body.pmd-waiter-v127-active [data-pmd-old-waiter-strip="1"] {
        display:none!important;
        visibility:hidden!important;
        height:0!important;
        min-height:0!important;
        max-height:0!important;
        opacity:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 {
        position:relative!important;
        z-index:20!important;
        isolation:isolate!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-grid,
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-list,
      body.pmd-waiter-v127-active #pmd-waiter-v127 [class*="menu-grid"],
      body.pmd-waiter-v127-active #pmd-waiter-v127 [class*="menu-list"] {
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:14px!important;
        align-items:stretch!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-card,
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-item,
      body.pmd-waiter-v127-active #pmd-waiter-v127 [data-menu-id],
      body.pmd-waiter-v127-active #pmd-waiter-v127 button[data-menu-id],
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-add-items button:not(.pmd127-btn),
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-panel button[data-id] {
        width:100%!important;
        min-height:96px!important;
        height:auto!important;
        padding:18px 20px!important;
        border-radius:18px!important;
        border:1px solid rgba(8,36,31,.12)!important;
        background:#fbfaf7!important;
        color:#08241f!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        justify-content:center!important;
        gap:8px!important;
        white-space:normal!important;
        line-height:1.15!important;
        overflow:visible!important;
        box-shadow:0 10px 24px rgba(8,36,31,.045)!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-card:hover,
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-item:hover,
      body.pmd-waiter-v127-active #pmd-waiter-v127 [data-menu-id]:hover {
        transform:translateY(-1px)!important;
        box-shadow:0 16px 30px rgba(8,36,31,.075)!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-card strong,
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-item strong,
      body.pmd-waiter-v127-active #pmd-waiter-v127 [data-menu-id] strong {
        font-size:18px!important;
        font-weight:950!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-card small,
      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-item small,
      body.pmd-waiter-v127-active #pmd-waiter-v127 [data-menu-id] small {
        font-size:16px!important;
        font-weight:950!important;
        color:#00543f!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-map {
        height:auto!important;
        min-height:300px!important;
        max-height:none!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-table {
        min-width:128px!important;
        min-height:78px!important;
        max-width:180px!important;
      }

      @media(max-width:760px){
        body.pmd-waiter-v127-active #pmd-waiter-v127 {
          padding-left:14px!important;
          padding-right:14px!important;
          margin-top:14px!important;
          padding-bottom:96px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-kpis {
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:10px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-kpi {
          min-height:92px!important;
          height:auto!important;
          padding:16px!important;
          border-radius:20px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-kpi strong {
          font-size:34px!important;
          line-height:1!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-panel {
          padding:18px!important;
          border-radius:24px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-head {
          display:grid!important;
          grid-template-columns:1fr!important;
          gap:14px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-actions {
          display:grid!important;
          grid-template-columns:1fr 1fr!important;
          gap:10px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-actions .pmd127-primary {
          grid-column:1 / -1!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-title {
          font-size:36px!important;
          line-height:1!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-map {
          min-height:380px!important;
          height:auto!important;
          padding:18px!important;
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:14px!important;
          align-items:start!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-map .pmd127-table {
          position:relative!important;
          left:auto!important;
          top:auto!important;
          transform:none!important;
          width:100%!important;
          min-width:0!important;
          max-width:none!important;
          height:82px!important;
          min-height:82px!important;
          margin:0!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-cards {
          display:grid!important;
          grid-template-columns:1fr!important;
          gap:14px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-grid,
        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-list,
        body.pmd-waiter-v127-active #pmd-waiter-v127 [class*="menu-grid"],
        body.pmd-waiter-v127-active #pmd-waiter-v127 [class*="menu-list"] {
          grid-template-columns:1fr!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-card,
        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-menu-item,
        body.pmd-waiter-v127-active #pmd-waiter-v127 [data-menu-id] {
          min-height:92px!important;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(st);
  }

  function hideOldWidgets(){
    document.body && document.body.classList.add('pmd-waiter-v127-active');

    var root = document.getElementById('pmd-waiter-v127');

    document.querySelectorAll('#dashboardcontainer-container,.dashboard-widgets,.widget-container').forEach(function(el){
      if(root && el.contains(root)) return;
      el.style.setProperty('display','none','important');
      el.style.setProperty('height','0','important');
      el.style.setProperty('max-height','0','important');
      el.style.setProperty('overflow','hidden','important');
      el.setAttribute('data-pmd-v130-hidden','1');
    });

    document.querySelectorAll('body > div, main > div, .content > div, .page-content > div').forEach(function(el){
      if(!root || el === root || el.contains(root) || root.contains(el)) return;

      var text = (el.textContent || '').replace(/\s+/g,' ').trim();
      var r = el.getBoundingClientRect();

      var looksOldWaiter =
        text.includes('New Order') &&
        text.includes('Open Orders') &&
        text.includes('Reservations') &&
        r.height > 120;

      if(looksOldWaiter){
        el.style.setProperty('display','none','important');
        el.style.setProperty('height','0','important');
        el.style.setProperty('max-height','0','important');
        el.style.setProperty('overflow','hidden','important');
        el.setAttribute('data-pmd-old-waiter-strip','1');
      }
    });
  }

  function normalizeAddItems(){
    var root = document.getElementById('pmd-waiter-v127');
    if(!root) return;

    var text = (root.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    if(!text.includes('add items')) return;

    root.querySelectorAll('button,a,[role="button"]').forEach(function(btn){
      var t = (btn.textContent || '').replace(/\s+/g,' ').trim();
      if(!t) return;

      var looksMenu =
        /€\d/i.test(t) ||
        /puff|scotch|rice|salad|amala|yam|plantain|pizza|food|shrimp|catfish/i.test(t);

      if(looksMenu && !/tables|refresh|merge|details|bill/i.test(t)){
        btn.classList.add('pmd127-menu-card');
      }
    });
  }

  function pauseNoisyDashboardRefresh(){
    if(window.__PMD_V130_TIMERS_PATCHED__) return;
    window.__PMD_V130_TIMERS_PATCHED__ = true;

    var nativeSetInterval = window.setInterval;
    window.setInterval = function(fn, delay){
      try {
        var src = String(fn || '');
        if(/PMD real dashboard|pmd-dashboard-real|DashboardContainer|dashboardcontainer/i.test(src) && Number(delay) <= 15000){
          return nativeSetInterval(function(){}, 2147483647);
        }
      } catch(e){}
      return nativeSetInterval.apply(this, arguments);
    };
  }

  function run(){
    addStyle();
    pauseNoisyDashboardRefresh();
    hideOldWidgets();
    normalizeAddItems();
  }

  ready(function(){
    run();
    setTimeout(run, 250);
    setTimeout(run, 900);
    setTimeout(run, 1800);

    if(!window.__PMD_WAITER_V130_OBSERVER__){
      window.__PMD_WAITER_V130_OBSERVER__ = new MutationObserver(function(){
        clearTimeout(window.__PMD_WAITER_V130_T__);
        window.__PMD_WAITER_V130_T__ = setTimeout(run, 80);
      });
      window.__PMD_WAITER_V130_OBSERVER__.observe(document.body, {childList:true, subtree:true});
    }
  });

  window.PMDWaiterV130Polish = { run: run };
})();
/* PMD WAITER V130 STABILITY POLISH END */


/* PMD WAITER V131 HEADER OFFSET FIX START */
(function(){
  if(!/\/admin\/dashboard/.test(location.pathname)) return;

  function ready(fn){
    if(document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, {once:true});
  }

  function headerBottom(){
    var selectors = [
      '.navbar-brand',
      '.page-title',
      '.navbar.navbar-right',
      '.pmd-header-toolbar-actions',
      '#menu-mainmenu'
    ];

    var max = 0;

    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        var r = el.getBoundingClientRect();
        if(!r || r.width < 1 || r.height < 1) return;
        if(r.top > 180) return;
        max = Math.max(max, r.bottom);
      });
    });

    var headerLike = document.querySelector('.navbar-brand');
    if(headerLike){
      var parent = headerLike.closest('.container-fluid') || headerLike.parentElement;
      if(parent){
        var pr = parent.getBoundingClientRect();
        if(pr && pr.height > 20 && pr.top < 180){
          max = Math.max(max, pr.bottom);
        }
      }
    }

    return Math.max(88, Math.ceil(max || 88));
  }

  function addStyle(){
    if(document.getElementById('pmd-waiter-v131-header-css')) return;

    var st = document.createElement('style');
    st.id = 'pmd-waiter-v131-header-css';
    st.textContent = `
      body.pmd-waiter-v127-active #pmd-waiter-v127 {
        position:relative!important;
        top:auto!important;
        transform:none!important;
        z-index:20!important;
        isolation:isolate!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-kpis {
        margin-top:0!important;
      }

      body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-panel:first-of-type,
      body.pmd-waiter-v127-active #pmd-waiter-v127 section:first-of-type {
        margin-top:0!important;
      }

      @media(max-width:760px){
        body.pmd-waiter-v127-active #pmd-waiter-v127 {
          padding-left:14px!important;
          padding-right:14px!important;
        }

        body.pmd-waiter-v127-active #pmd-waiter-v127 .pmd127-kpis {
          border-radius:0 0 22px 22px!important;
          overflow:hidden!important;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(st);
  }

  function apply(){
    addStyle();

    var root = document.getElementById('pmd-waiter-v127');
    if(!root) return false;

    document.body.classList.add('pmd-waiter-v127-active');

    var bottom = headerBottom();
    var gap = window.innerWidth <= 760 ? 18 : 20;
    var offset = bottom + gap;

    root.style.setProperty('margin-top', offset + 'px', 'important');
    root.style.setProperty('padding-top', '0px', 'important');
    root.style.setProperty('position', 'relative', 'important');
    root.style.setProperty('top', 'auto', 'important');
    root.style.setProperty('transform', 'none', 'important');

    root.setAttribute('data-pmd-v131-header-offset', String(offset));

    return {
      ok: true,
      headerBottom: bottom,
      gap: gap,
      appliedOffset: offset,
      rootTop: Math.round(root.getBoundingClientRect().top)
    };
  }

  function run(){
    var result = apply();
    if(result && result.ok){
      console.log('✅ PMD waiter v131 header offset fixed', result);
    }
    return result;
  }

  ready(function(){
    run();
    setTimeout(run, 150);
    setTimeout(run, 600);
    setTimeout(run, 1200);

    window.addEventListener('resize', function(){
      clearTimeout(window.__PMD_WAITER_V131_RESIZE_T__);
      window.__PMD_WAITER_V131_RESIZE_T__ = setTimeout(run, 120);
    });
  });

  window.PMDWaiterV131HeaderFix = {
    run: run,
    report: function(){
      var root = document.getElementById('pmd-waiter-v127');
      return {
        headerBottom: headerBottom(),
        rootExists: !!root,
        rootTop: root ? Math.round(root.getBoundingClientRect().top) : null,
        appliedOffset: root ? root.getAttribute('data-pmd-v131-header-offset') : null,
        scripts: [...document.scripts].filter(s => s.src.includes('pmd-waiter')).map(s => s.src)
      };
    }
  };
})();
/* PMD WAITER V131 HEADER OFFSET FIX END */

