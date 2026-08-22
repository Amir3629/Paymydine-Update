(function () {
  'use strict';

  if (window.PMDCashierQuickLauncherV21) return;

  var bootNode = document.getElementById('pmd-cashier-quick-canonical-bootstrap-v21');
  var waiterRoot = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!bootNode || !waiterRoot) return;

  var boot = {};
  try { boot = JSON.parse(bootNode.textContent || '{}'); }
  catch (error) { console.error('[PMD Cashier Quick V2.2] bootstrap failed', error); return; }

  function clean(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function key(v) { return clean(v).toLowerCase(); }
  function num(v, fallback) { var n = Number(v); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function id(v) { var n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
  function money(v) { return '€' + Math.max(0, num(v, 0)).toFixed(2); }
  function csrf() { var meta = document.querySelector('meta[name="csrf-token"]'); return meta ? clean(meta.content) : ''; }

  var floorMap = boot.table_floor_map && typeof boot.table_floor_map === 'object' ? boot.table_floor_map : {};

  function floorName(value) {
    var name = clean(value);
    return !name || key(name) === 'main' || key(name) === 'main floor' ? 'Main Floor' : name;
  }

  function floorsFromBoot() {
    var rows = (Array.isArray(boot.floors) ? boot.floors : []).map(function (floor, index) {
      floor = floor || {};
      return {id:clean(floor.id) || ('floor-' + (index + 1)), name:floorName(floor.name || floor.label), sort:num(floor.sort, index)};
    });
    if (!rows.length) rows.push({id:'main-floor',name:'Main Floor',sort:0});
    rows.sort(function (a,b) { return a.sort - b.sort || a.name.localeCompare(b.name, undefined, {numeric:true}); });
    return rows;
  }

  function tableFloor(row, tableId, numberText, name) {
    var byId = floorMap.by_id || {}, byNumber = floorMap.by_number || {}, byName = floorMap.by_name || {};
    var candidates = [tableId,row.table_id,row.id,row.dbTableId,row.raw && row.raw.table_id].map(clean).filter(Boolean);
    for (var i=0;i<candidates.length;i++) if (byId[candidates[i]]) return floorName(byId[candidates[i]]);
    candidates = [numberText,row.number,row.table_number,row.table_no].map(key).filter(Boolean);
    for (var j=0;j<candidates.length;j++) if (byNumber[candidates[j]]) return floorName(byNumber[candidates[j]]);
    candidates = [name,row.name,row.label,row.table_name].map(key).filter(Boolean);
    for (var k=0;k<candidates.length;k++) if (byName[candidates[k]]) return floorName(byName[candidates[k]]);
    return 'Main Floor';
  }

  function normalizeTable(row) {
    row = row || {}; var raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
    var tableId = id(row.dbTableId || row.db_table_id || row.table_id || row.location_table_id || row.id || raw.table_id || raw.id);
    if (!tableId) return null;
    var numberText = clean(row.number || row.table_number || row.table_no || raw.table_no || tableId);
    var name = clean(row.name || row.label || row.table_name || raw.table_name);
    if (!name || /^\d+$/.test(name)) name = 'Table ' + (numberText || tableId);
    if (['cashier','delivery'].indexOf(key(name)) !== -1) return null;
    var openOrders = Math.max(0, num(row.open_orders != null ? row.open_orders : (row.openOrders != null ? row.openOrders : raw.open_orders), 0));
    var due = Math.max(0, num(row.due != null ? row.due : (row.payment_due != null ? row.payment_due : raw.due), 0));
    var rawStatus = key(row.operational_status || raw.operational_status || row.status || raw.status || '');
    var occupied = openOrders > 0 || /occup|busy|active|open|kitchen|prepar|serv/.test(rawStatus);
    return {id:tableId,number:numberText,name:name,floorName:tableFloor(row,tableId,numberText,name),openOrders:openOrders,due:due,occupied:occupied,raw:row};
  }

  var floors = floorsFromBoot();
  var tables = (Array.isArray(boot.tables) ? boot.tables : []).map(normalizeTable).filter(Boolean);
  var seen = {}; tables = tables.filter(function (table) { if (seen[table.id]) return false; seen[table.id] = true; return true; });
  tables.sort(function (a,b) { return String(a.number).localeCompare(String(b.number), undefined, {numeric:true,sensitivity:'base'}); });

  var activeFloor = floors.find(function (floor) { return clean(floor.id) === clean(boot.active_floor && boot.active_floor.id); }) || floors[0];
  var query = '';
  var currentTable = null;
  var currentChecks = [];
  var pendingOpen = null;

  function visibleTables() {
    var wanted = key(query), active = key(activeFloor && activeFloor.name);
    return tables.filter(function (table) {
      if (key(table.floorName) !== active) return false;
      return !wanted || key([table.name,table.number,table.occupied ? 'occupied besetzt' : 'free'].join(' ')).indexOf(wanted) !== -1;
    });
  }

  function patchPosMount() {
    var app = window.PMDWaiterPOSApp;
    if (!app || typeof app.mount !== 'function' || app.__pmdCashierQuickV22) return;
    var originalMount = app.mount;
    app.mount = function (root, posBoot, options) {
      if (pendingOpen && posBoot && Number(posBoot.table && (posBoot.table.id || posBoot.table.table_id)) === Number(pendingOpen.tableId)) {
        var wanted = Number(pendingOpen.orderId || 0);
        var orders = Array.isArray(posBoot.open_orders) ? posBoot.open_orders : [];
        if (wanted && orders.some(function (order) { return Number(order.order_id) === wanted; })) {
          posBoot.active_order_id = wanted;
        }
      }
      var instance = originalMount.call(app, root, posBoot, options);
      if (pendingOpen && instance) {
        var shouldPay = !!pendingOpen.pay;
        pendingOpen = null;
        if (shouldPay && typeof instance.openPayment === 'function') {
          requestAnimationFrame(function () { instance.openPayment(); });
        }
      }
      return instance;
    };
    app.__pmdCashierQuickV22 = true;
  }

  patchPosMount();

  var launcher = document.createElement('section');
  launcher.id = 'pmd-cashier-quick-launcher-v21';
  launcher.innerHTML = [
    '<header class="pmd-cql-v21__head"><div><small>WAITER QUICK MODE</small><h1>Quick Service</h1><p data-cql-active-floor></p></div><button type="button" data-cql-refresh aria-label="Refresh">↻</button></header>',
    '<section class="pmd-cql-v21__summary"><article><span>Tables</span><strong data-cql-table-count>0</strong></article><article><span>Open checks</span><strong data-cql-open-count>0</strong></article><article><span>Due</span><strong data-cql-due>€0.00</strong></article></section>',
    '<nav class="pmd-cql-v21__floors" data-cql-floors></nav>',
    '<label class="pmd-cql-v21__search"><span>⌕</span><input type="search" data-cql-search placeholder="Search table..." autocomplete="off"></label>',
    '<div class="pmd-cql-v21__meta"><strong data-cql-floor-title></strong><span data-cql-floor-count></span></div>',
    '<div class="pmd-cql-v21__grid" data-cql-grid></div>',
    '<div class="pmd-cql-v21__empty" data-cql-empty hidden><strong>No tables on this floor</strong><span>Choose another floor or clear the search.</span></div>',
    '<div class="pmd-cql-v22__checks" data-cql-checks hidden aria-hidden="true"><div class="pmd-cql-v22__checks-card"><header><div><small>CURRENT CHECKS</small><h2 data-cql-checks-title>Table</h2></div><button type="button" data-cql-checks-close aria-label="Close">×</button></header><div data-cql-checks-body></div><footer><button type="button" data-cql-new-order>New order</button></footer></div></div>'
  ].join('');
  waiterRoot.insertBefore(launcher, waiterRoot.firstChild);
  document.body.classList.add('pmd-cashier-waiter-host-v21');

  var floorHost = launcher.querySelector('[data-cql-floors]');
  var grid = launcher.querySelector('[data-cql-grid]');
  var empty = launcher.querySelector('[data-cql-empty]');
  var search = launcher.querySelector('[data-cql-search]');
  var checksLayer = launcher.querySelector('[data-cql-checks]');
  var checksBody = launcher.querySelector('[data-cql-checks-body]');

  function render() {
    floorHost.hidden = floors.length <= 1;
    floorHost.innerHTML = floors.length <= 1 ? '' : floors.map(function (floor) {
      var count = tables.filter(function (table) { return key(table.floorName) === key(floor.name); }).length;
      return '<button type="button" data-cql-floor="'+esc(floor.id)+'" class="'+(activeFloor.id===floor.id?'is-active':'')+'"><span>'+esc(floor.name)+'</span><b>'+count+'</b></button>';
    }).join('');

    var rows = visibleTables();
    launcher.querySelector('[data-cql-active-floor]').textContent = activeFloor.name;
    launcher.querySelector('[data-cql-floor-title]').textContent = activeFloor.name;
    launcher.querySelector('[data-cql-floor-count]').textContent = rows.length + (rows.length === 1 ? ' table' : ' tables');
    launcher.querySelector('[data-cql-table-count]').textContent = rows.length;
    launcher.querySelector('[data-cql-open-count]').textContent = rows.reduce(function (s,t) { return s+t.openOrders; },0);
    launcher.querySelector('[data-cql-due]').textContent = money(rows.reduce(function (s,t) { return s+t.due; },0));
    empty.hidden = rows.length > 0;
    grid.innerHTML = rows.map(function (table) {
      var meta = table.occupied ? (table.openOrders + (table.openOrders===1?' open check':' open checks') + (table.due>0 ? ' · Due '+money(table.due) : '')) : 'Ready for service';
      return '<button type="button" class="pmd-cql-v21__table '+(table.occupied?'is-open':'is-free')+'" data-cql-table="'+table.id+'"><span class="pmd-cql-v21__dot"></span><span class="pmd-cql-v21__table-copy"><strong>'+esc(table.name)+'</strong><small>'+esc(meta)+'</small></span><span class="pmd-cql-v21__state">'+(table.occupied?'Besetzt':'Free')+'</span><span class="pmd-cql-v21__arrow">›</span></button>';
    }).join('');
  }

  async function tableData(tableId) {
    var response = await fetch('/admin/pmd-waiter-pos-v1/data/' + encodeURIComponent(String(tableId)) + '?_=' + Date.now(), {credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}});
    var json = await response.json().catch(function () { return {}; });
    if (!response.ok || json.ok === false) throw new Error(json.message || ('HTTP '+response.status));
    return json;
  }

  function checkStatus(order) {
    var total = num(order.total,0), paid = num(order.settled_amount,0), due = Math.max(0,total-paid), state = key(order.settlement_status || 'unpaid');
    var label = due <= .009 ? 'Paid' : paid > .009 || /partial/.test(state) ? 'Part paid' : 'Unpaid';
    return {total:total,paid:paid,due:due,label:label};
  }

  function renderChecks() {
    if (!currentTable) return;
    launcher.querySelector('[data-cql-checks-title]').textContent = currentTable.name;
    checksBody.innerHTML = currentChecks.length ? currentChecks.map(function (order) {
      var s = checkStatus(order), items = Array.isArray(order.items) ? order.items : [];
      var preview = items.length ? '<ul>'+items.slice(0,6).map(function (item) { return '<li>'+esc(num(item.quantity,1))+'× '+esc(item.name || 'Item')+'</li>'; }).join('')+'</ul>' : '<p class="is-muted">No item preview.</p>';
      var note = clean(order.comment) ? '<p class="pmd-cql-v22__note"><b>Note:</b> '+esc(order.comment)+'</p>' : '';
      return '<article class="pmd-cql-v22__check"><div class="pmd-cql-v22__check-head"><strong>Order #'+esc(order.order_id)+'</strong><span class="is-'+key(s.label).replace(/\s+/g,'-')+'">'+esc(s.label)+'</span></div><div class="pmd-cql-v22__money"><span>Total <b>'+money(s.total)+'</b></span><span>Paid <b>'+money(s.paid)+'</b></span><span>Due <b>'+money(s.due)+'</b></span></div>'+preview+note+'<div class="pmd-cql-v22__actions"><button type="button" data-cql-open-order="'+esc(order.order_id)+'">Open / edit</button><button type="button" data-cql-pay-order="'+esc(order.order_id)+'" '+(s.due<=.009?'disabled':'')+'>Pay '+money(s.due)+'</button></div></article>';
    }).join('') : '<div class="pmd-cql-v22__no-checks"><strong>No open checks</strong><span>Start a new order for this table.</span></div>';
  }

  async function showChecks(table) {
    currentTable = table;
    checksLayer.hidden = false; checksLayer.setAttribute('aria-hidden','false');
    checksBody.innerHTML = '<div class="pmd-cql-v22__loading">Loading current checks…</div>';
    try {
      var data = await tableData(table.id);
      currentChecks = Array.isArray(data.open_orders) ? data.open_orders : [];
      renderChecks();
    } catch (error) {
      checksBody.innerHTML = '<div class="pmd-cql-v22__error">'+esc(error.message || 'Could not load checks.')+'</div>';
    }
  }

  function closeChecks() { checksLayer.hidden = true; checksLayer.setAttribute('aria-hidden','true'); }

  function openExisting(orderId, pay) {
    if (!currentTable || !window.PMDWaiterStandardV2 || typeof window.PMDWaiterStandardV2.openTable !== 'function') return;
    patchPosMount();
    pendingOpen = {tableId:currentTable.id,orderId:Number(orderId),pay:!!pay,occupied:true};
    closeChecks();
    window.PMDWaiterStandardV2.openTable(String(currentTable.id));
  }

  function openNew(table) {
    if (!table || !window.PMDWaiterStandardV2 || typeof window.PMDWaiterStandardV2.openTable !== 'function') return;
    currentTable = table; currentChecks = [];
    pendingOpen = {tableId:table.id,orderId:0,pay:false,occupied:false};
    closeChecks();
    window.PMDWaiterStandardV2.openTable(String(table.id));
  }

  async function freeTable(tableId, label) {
    if (!confirm('Set '+(label || 'this table')+' as FREE?\n\nThe server will refuse while any check is unpaid or part-paid.')) return;
    var response = await fetch('/admin/pmd-waiter-pos-v22/tables/'+encodeURIComponent(String(tableId))+'/free',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf()}});
    var json = await response.json().catch(function(){return {};});
    if (!response.ok || json.ok === false) throw new Error(json.message || json.error || ('HTTP '+response.status));
    var status = key(json && json.table && json.table.operational_status);
    if (status !== 'available' && status !== 'free') throw new Error('Table release was not confirmed by the server.');
    window.location.reload();
  }

  function installPosHeader(detail) {
    var old = document.querySelector('[data-pmd-cql-pos-header]'); if (old) old.remove();
    if (!pendingOpen && !(detail && detail.table)) return;
    var tableId = id(detail && detail.table && detail.table.id) || id(currentTable && currentTable.id);
    var label = clean(currentTable && currentTable.name) || 'Table';
    var pos = detail && detail.pos;
    var occupied = currentChecks.length > 0 || (currentTable && currentTable.occupied);
    if (!occupied) return;
    var header = document.createElement('div'); header.className='pmd-cql-v22__pos-header'; header.setAttribute('data-pmd-cql-pos-header','1');
    header.innerHTML = '<strong>'+esc(label)+'</strong><div><button type="button" data-cql-pos-note>Note</button><button type="button" data-cql-pos-pay>Pay</button><button type="button" data-cql-pos-free>Free table</button><button type="button" data-cql-pos-back>× Back</button></div>';
    document.body.appendChild(header);
    header.addEventListener('click', function (event) {
      if (event.target.closest('[data-cql-pos-back]')) return window.PMDWaiterStandardV2.closeTable();
      if (event.target.closest('[data-cql-pos-pay]') && pos && typeof pos.openPayment === 'function') return pos.openPayment();
      if (event.target.closest('[data-cql-pos-note]')) {
        var cartButton = document.querySelector('[data-pos-mobile-cart]'); if (cartButton) cartButton.click();
        setTimeout(function () { var note = document.querySelector('[data-pos-table-note]'); if (note) note.focus(); }, 50); return;
      }
      if (event.target.closest('[data-cql-pos-free]')) freeTable(tableId,label).catch(function(error){alert(error.message || 'Could not set table free.');});
    });
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) { requestAnimationFrame(function(){ installPosHeader(event.detail || {}); }); });
  window.addEventListener('popstate', function () { var h=document.querySelector('[data-pmd-cql-pos-header]'); if(h) h.remove(); });

  launcher.addEventListener('click', function (event) {
    var target = event.target.closest ? event.target : null; if (!target) return;
    var floorButton = target.closest('[data-cql-floor]'); if (floorButton) { var next=floors.find(function(f){return f.id===floorButton.getAttribute('data-cql-floor');}); if(next){activeFloor=next;render();} return; }
    if (target.closest('[data-cql-refresh]')) return window.location.reload();
    if (target.closest('[data-cql-checks-close]')) return closeChecks();
    if (target.closest('[data-cql-new-order]')) return openNew(currentTable);
    var openButton=target.closest('[data-cql-open-order]'); if(openButton) return openExisting(openButton.getAttribute('data-cql-open-order'),false);
    var payButton=target.closest('[data-cql-pay-order]'); if(payButton) return openExisting(payButton.getAttribute('data-cql-pay-order'),true);
    var tableButton=target.closest('[data-cql-table]'); if(tableButton){var table=tables.find(function(t){return t.id===id(tableButton.getAttribute('data-cql-table'));}); if(!table)return; return table.occupied ? showChecks(table) : openNew(table);}
  });

  if (search) search.addEventListener('input', function(){query=clean(search.value);render();});
  render();

  window.PMDCashierQuickLauncherV21 = {
    version:'2.2.0',
    inspect:function(){return {route:location.pathname,source:clean(boot.source),locationId:id(boot.location_id),canonicalTables:tables.length,visibleTables:visibleTables().length,waiterRuntimeReady:!!(window.PMDWaiterStandardV2&&window.PMDWaiterStandardV2.openTable),posMountBridgeReady:!!(window.PMDWaiterPOSApp&&window.PMDWaiterPOSApp.__pmdCashierQuickV22),currentChecks:currentChecks.length,oldLauncherHidden:true};}
  };
  console.info('[PMD] Cashier Quick Launcher V2.2 ready', window.PMDCashierQuickLauncherV21.inspect());
})();
