(function () {
  const ROOT   = document.getElementById('notif-root');
  if (!ROOT) return;

  const TRIGGER= document.getElementById('notifDropdown');
  const PANEL  = document.getElementById('notification-panel');
  const COUNT  = document.getElementById('notification-count');
  const LIST   = document.getElementById('notification-list');
  const LOADING= document.getElementById('notification-loading');
  const EMPTY  = document.getElementById('notification-empty');
  const ERROR  = document.getElementById('notification-error');
  // removed: global mark-all-seen; replaced with History link in template

  const CSRF   = (document.querySelector('meta[name="csrf-token"]')||{}).content || '';
  const BASE   = '/admin/notifications-api';

  function show(el){ el && el.classList.remove('d-none'); }
  function hide(el){ el && el.classList.add('d-none'); }
  function setCount(n){ if(n>0){COUNT.textContent=String(n);COUNT.classList.remove('d-none');} else {COUNT.textContent='0';COUNT.classList.add('d-none');}}

  async function fetchJSON(url, opts={}){
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: Object.assign({
        'Accept':'application/json',
        'X-Requested-With':'XMLHttpRequest',
        ...(opts.method && opts.method!=='GET' ? {'X-CSRF-TOKEN': CSRF, 'Content-Type':'application/json'} : {})
      }, opts.headers||{}),
      method: opts.method || 'GET',
      body: opts.body || null
    });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  async function refreshCount(){
    try {
      const url = '/admin/notifications-api/count?_t=' + Date.now();
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const text = await res.text().catch(()=>'');
        console.warn('Count failed:', res.status, text);
        return;
      }
      const json = await res.json();
      setCount(Number(json.new || 0));
    } catch (e) {
      console.warn('refreshCount error:', e);
    }
  }

  // ----- render list (unchanged; call this after opening) -----
  function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function renderItem(item) {
    const ts = new Date(item.created_at || Date.now());
    const time = ts.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const table = item.table_name || (item.table_id ? `Table ${item.table_id}` : '—');
    const type = (item.type||'').replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
    
    let payload = {};
    try {
      payload = JSON.parse(item.payload || "{}");
    } catch (e) {
      console.error("Failed to parse payload", item.payload, e);
    }

    // Create the main container with proper flex layout
    const div = document.createElement('div');
    div.className = 'list-group-item d-flex align-items-start justify-content-between';
    div.dataset.id = item.id;

    // Create the content wrapper (left side)
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex-grow-1';

    // Create time and type info
    const metaDiv = document.createElement('div');
    metaDiv.className = 'small text-muted';
    metaDiv.textContent = `${time} • ${type}`;

    // Create table name
    const tableDiv = document.createElement('div');
    tableDiv.innerHTML = `<strong>${escapeHtml(table)}</strong>`;

    // Create the text body with proper class for wrapping
    const body = document.createElement('div');
    body.className = 'notif-text text-muted';

    // Choose the right field to show based on type
    let text = '';
    if (item.type === 'table_note') {
      text = payload.note || '(no note text)';
    } else if (item.type === 'valet_request') {
      const name = payload.name || 'Guest';
      const plate = payload.license_plate || '—';
      const car = payload.car_make || '';
      text = `Valet • ${name} • ${plate}${car ? ' • ' + car : ''}`;
    } else if (item.type === 'waiter_call') {
      const raw = (payload && payload.message) ? String(payload.message).trim() : "";
      const isLegacyDefault = raw.toLowerCase() === "customer needs assistance";
      const isMinimal = raw === ".";
      if (!raw || isLegacyDefault || isMinimal) {
        text = "";
      } else {
        text = raw;
      }
    } else if (item.type === 'order_status') {
      const statusName = payload.status_name || 'Unknown Status';
      const orderId = payload.order_id || 'Unknown Order';
      text = `Order #${orderId} • ${statusName}`;
    } else {
      text = item.title || '';
    }

    // Set text content safely (not innerHTML) - this enables proper text wrapping
    body.textContent = text;

    // Create the action button container (right side)
    const actionDiv = document.createElement('div');
    actionDiv.className = 'ml-3 flex-shrink-0';
    const button = document.createElement('button');
    button.className = 'btn btn-sm btn-outline-secondary js-mark-seen';
    button.textContent = 'Seen';
    actionDiv.appendChild(button);

    // Assemble the structure: content on left, button on right
    contentWrapper.appendChild(metaDiv);
    contentWrapper.appendChild(tableDiv);
    contentWrapper.appendChild(body);
    
    div.appendChild(contentWrapper);
    div.appendChild(actionDiv);

    return div;
  }

  async function loadList(){
    hide(ERROR); hide(EMPTY); show(LOADING); LIST.innerHTML = '';
    try {
      const url = '/admin/notifications-api/?_t=' + Date.now(); // cache-buster
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const text = await res.text().catch(()=>'');
        console.error('Notifications list failed:', res.status, text);
        throw new Error('HTTP ' + res.status);
      }
      const json = await res.json();
      const items = Array.isArray(json.items) ? json.items : [];
      if (!items.length){ hide(LOADING); show(EMPTY); return; }
      const frag = document.createDocumentFragment();
      items.forEach(i => frag.appendChild(renderItem(i)));
      LIST.appendChild(frag);
      hide(LOADING);
    } catch (e) {
      console.error('loadList error:', e);
      hide(LOADING); show(ERROR);
    }
  }

  LIST.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.js-mark-seen'); if (!btn) return;
    const row = btn.closest('.list-group-item'); const id = row && row.dataset.id; if (!id) return;
    row.classList.add('opacity-50'); btn.disabled = true;
    try{
      await fetchJSON(`${BASE}/${id}`, { method:'PATCH', body: JSON.stringify({status:'seen'}) });
      row.remove(); setCount(Math.max(0, parseInt(COUNT.textContent||'0',10)-1));
      if (!LIST.children.length) show(EMPTY);
    }catch(_){ row.classList.remove('opacity-50'); btn.disabled=false; alert('Failed to mark as seen.'); }
  });

  // removed: global mark-all-seen; replaced with History link in template

  // ----- dropdown wiring: Bootstrap if present, fallback otherwise -----
  const hasBootstrapDropdown = !!(window.jQuery && jQuery.fn && jQuery.fn.dropdown);
  if (hasBootstrapDropdown) {
    // ensure plugin is initialized
    jQuery(TRIGGER).dropdown();
    jQuery(TRIGGER).on('shown.bs.dropdown', loadList);
  } else {
    // pure JS fallback
    const open = () => { PANEL.classList.add('show'); ROOT.classList.add('show'); loadList(); };
    const close = () => { PANEL.classList.remove('show'); ROOT.classList.remove('show'); };
    const toggle = (e) => { e.preventDefault(); PANEL.classList.contains('show') ? close() : open(); };

    TRIGGER.addEventListener('click', toggle);
    document.addEventListener('click', (e)=>{ if (!ROOT.contains(e.target)) close(); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });
  }

  // keep the badge fresh
  refreshCount();
  setInterval(refreshCount, 5000);
})();