(function () {
  // CRITICAL: Prevent multiple initializations - check and set flag atomically at the VERY TOP
  // This MUST be the first thing that runs to prevent race conditions
  if (window.NotificationSystemInitialized || window.notificationCountInterval) {
    console.warn('⚠️ Notification system already initialized, skipping duplicate script execution');
    return; // Exit immediately - don't run ANY code below
  }
  
  // Set flag IMMEDIATELY to prevent other script loads from running
  window.NotificationSystemInitialized = true;
  
  // Do NOT run on the admin login page
  try {
    const path = (location && location.pathname) || '';
    const isAuthScreen = /\/admin\/(login|logout)(?:$|[/?#])/i.test(path) || path === '/admin/login';
    if (isAuthScreen) {
      // Hard hide any notification UI if markup exists
      try {
        const style = document.createElement('style');
        style.textContent = '#notif-root, #notification-panel { display: none !important; visibility: hidden !important; }';
        document.documentElement.appendChild(style);
      } catch (_e) {}
      window.NotificationSystemInitialized = false; // Reset if we're exiting early
      return;
    }
  } catch (_) {}

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
    // Better fallback logic for table display
    let table = '—';
    if (item.table_name && item.table_name.trim()) {
      table = item.table_name.trim();
    } else if (item.table_id) {
      table = `Table ${item.table_id}`;
    }
    const type = (item.type||'').replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
    
    let payload = {};
    try {
      payload = JSON.parse(item.payload || "{}");
    } catch (e) {
      console.error("Failed to parse payload", item.payload, e);
    }

    // Create the main container with proper flex layout
    const div = document.createElement('div');
    div.className = 'list-group-item d-flex align-items-start justify-content-between notif-item-custom';
    div.dataset.id = item.id;

    // Create the content wrapper (left side)
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex-grow-1';

    // Create time info - RESTRUCTURED (just time for all types)
    const metaDiv = document.createElement('div');
    metaDiv.className = 'small notif-meta-line';
    metaDiv.style.color = '#000000';
    metaDiv.style.fontWeight = '500';
    
    // For order_status notifications: show "time • Order #X"
    if (item.type === 'order_status') {
      const orderId = payload.order_id || 'Unknown Order';
      metaDiv.textContent = `${time} • Order #${orderId}`;
    } else if (item.type === 'general_staff_note') {
      // For general staff notes: just show time
      metaDiv.textContent = time;
    } else {
      // For all other types: just show time without bullet
      metaDiv.textContent = time;
    }

    // Create table name with status (for orders) or type label for others
    const tableDiv = document.createElement('div');
    if (item.type === 'order_status') {
      const statusName = payload.status_name || 'Unknown Status';
      // Status color mapping
      const statusColors = {
        'Received': '#08815e',
        'Preparation': '#f39c12',
        'Ready': '#3498db',
        'Delivered': '#27ae60',
        'Completed': '#27ae60',
        'Canceled': '#e74c3c',
        'Cancelled': '#e74c3c'
      };
      const statusColor = statusColors[statusName] || '#08815e';
      tableDiv.innerHTML = `<strong>${escapeHtml(table)}</strong> • <span style="color: ${statusColor}; font-weight: 600;">${escapeHtml(statusName)}</span>`;
    } else if (item.type === 'table_note') {
      // For table notes: show "TABLE X • Note"
      tableDiv.innerHTML = `<strong>${escapeHtml(table)}</strong> • <span style="color: #000000; font-weight: 600;">Note</span>`;
    } else if (item.type === 'staff_note') {
      // For staff notes: show just "TABLE X" (note text will be in body)
      tableDiv.innerHTML = `<strong>${escapeHtml(table)}</strong>`;
    } else if (item.type === 'general_staff_note') {
      // For general staff notes: show "General Note" label
      const staffName = payload.staff_name || 'Staff';
      tableDiv.innerHTML = `<strong style="color: #000000; font-weight: 600;">Note</strong> • <span style="color: #6c757d; font-weight: 500;">${escapeHtml(staffName)}</span>`;
    } else if (item.type === 'waiter_call') {
      // For waiter calls: show "TABLE X • Waiter Call"
      tableDiv.innerHTML = `<strong>${escapeHtml(table)}</strong> • <span style="color: #000000; font-weight: 600;">Waiter Call</span>`;
    } else if (item.type === 'stock_out') {
      // For stock out: don't show table, just show "Stock Status" label
      tableDiv.innerHTML = `<strong style="color: #000000; font-weight: 600;">Stock Status</strong>`;
    } else {
      tableDiv.innerHTML = `<strong>${escapeHtml(table)}</strong>`;
    }

    // Create the text body with proper class for wrapping
    const body = document.createElement('div');
    body.className = 'notif-text';
    body.style.color = '#000000';
    body.style.fontWeight = '500';

    // Choose the right field to show based on type
    let text = '';
    if (item.type === 'table_note') {
      // Show the note content in dropdown (full text)
      const noteContent = payload.note || '(no note text)';
      text = noteContent;
    } else if (item.type === 'staff_note') {
      // Show the note content in dropdown with "Staff Note: " prefix
      // Try multiple sources for the note text
      let noteContent = '';
      if (payload && payload.note) {
        noteContent = payload.note;
      } else if (item.message) {
        noteContent = item.message;
      } else if (item.title && item.title.includes('Staff Note')) {
        // If title exists but no payload note, try to extract from title or use empty
        noteContent = '(no note text)';
      } else {
        noteContent = '(no note text)';
      }
      text = 'Staff Note: ' + noteContent;
    } else if (item.type === 'general_staff_note') {
      // For general staff notes: show the note content directly
      let noteContent = '';
      if (payload && payload.note) {
        noteContent = payload.note;
      } else if (item.message) {
        noteContent = item.message;
      } else {
        noteContent = '(no note text)';
      }
      text = noteContent;
    } else if (item.type === 'valet_request') {
      const name = payload.name || '';
      const plate = payload.license_plate || '';
      const car = payload.car_make || '';
      if (name || plate || car) {
        text = [name, plate, car].filter(v => v).join(' • ');
      }
    } else if (item.type === 'waiter_call') {
      // Add custom message if it exists and is not default
      const raw = (payload && payload.message) ? String(payload.message).trim() : "";
      const isLegacyDefault = raw.toLowerCase() === "customer needs assistance";
      const isMinimal = raw === ".";
      if (raw && !isLegacyDefault && !isMinimal) {
        text = raw;
      }
    } else if (item.type === 'order_status') {
      // For order status, we've already shown order ID and status, so no additional text needed
      text = "";
    } else if (item.type === 'table_move') {
      // For table move: extract source and destination from payload and format as "Table X move to Table Y"
      let payload = {};
      try {
        if (item.payload) {
          payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        }
      } catch (e) {
        console.error('Failed to parse notification payload:', e);
      }
      if (payload.source_table_name && payload.dest_table_name) {
        text = payload.source_table_name + ' move to ' + payload.dest_table_name;
      } else {
        // Fallback to title if payload doesn't have the info
        text = item.title || 'Table Move';
      }
    } else if (item.type === 'stock_out') {
      // For stock out: show the title directly (e.g., "Item name is not in stock anymore")
      text = item.title || 'Item stock status changed';
    } else {
      text = item.title || type;
    }

    // Assemble the structure in correct order: time, table, then additional text
    contentWrapper.appendChild(metaDiv);
    contentWrapper.appendChild(tableDiv);
    
    // Set text content safely (not innerHTML) - this enables proper text wrapping
    if (text) {
      body.textContent = text;
      contentWrapper.appendChild(body);
    }

    // Create the action button container (right side)
    const actionDiv = document.createElement('div');
    actionDiv.className = 'ml-3 flex-shrink-0';
    const button = document.createElement('button');
    button.className = 'btn btn-sm btn-outline-secondary js-mark-seen';
    button.textContent = 'Seen';
    actionDiv.appendChild(button);
    
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
  
  // Store interval ID in global scope for cleanup and duplicate prevention
  if (window.notificationCountInterval) {
    clearInterval(window.notificationCountInterval);
  }
  window.notificationCountInterval = setInterval(refreshCount, 20000); // Very slow polling (20s) to reduce CPU load
  
  // Clean up interval on page unload to prevent memory leaks and CPU usage
  window.addEventListener('beforeunload', () => {
    if (window.notificationCountInterval) {
      clearInterval(window.notificationCountInterval);
      window.notificationCountInterval = null;
      window.NotificationSystemInitialized = false;
    }
  }, { once: true });
  
  // Pause polling when tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause polling when tab is hidden
      if (window.notificationCountInterval) {
        clearInterval(window.notificationCountInterval);
        window.notificationCountInterval = null;
      }
    } else {
      // Resume polling when tab becomes visible
      if (!window.notificationCountInterval) {
        refreshCount(); // Refresh immediately
        window.notificationCountInterval = setInterval(refreshCount, 20000); // Match the slow polling interval
      }
    }
  });
})();