/* PMD_INVENTORY_OPERATIONS_V24
 * Advanced Inventory operations UI layered on top of the stable R20 control API.
 * No polling loops. No MutationObserver. New-mode clicks use capture so the
 * legacy R19 mode handler never rewrites an unsupported V24 mode.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-inventory-root]');
  var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
  var api = window.PMDInventoryControlR1;
  if (!root || !workspace || !api || typeof api.request !== 'function') return;

  var state = {
    mode: '',
    poLines: [],
    scanLines: [],
    cameraStream: null,
    cameraTimer: null,
    detector: null,
    lastCameraCode: '',
    lastCameraAt: 0,
    busy: false
  };

  function snap() { return api.getSnapshot ? (api.getSnapshot() || {}) : {}; }
  function ops() {
    var value = snap().operations;
    return value && typeof value === 'object' ? value : {ready:false};
  }
  function items() { return Array.isArray(snap().items) ? snap().items : []; }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function money(value) {
    var n = Number(value || 0);
    var currency = String((api.getConfig && api.getConfig().currency) || 'EUR');
    try { return new Intl.NumberFormat(undefined,{style:'currency',currency:currency,maximumFractionDigits:2}).format(n); }
    catch (ignore) { return n.toFixed(2) + ' ' + currency; }
  }
  function num(value, digits) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return new Intl.NumberFormat(undefined,{maximumFractionDigits:digits == null ? 2 : digits}).format(n);
  }
  function val(selector, fallback) {
    var node = workspace.querySelector(selector);
    if (!node) return fallback == null ? '' : fallback;
    if (node.type === 'checkbox') return node.checked;
    return node.value == null ? (fallback == null ? '' : fallback) : node.value;
  }
  function setBusy(next) {
    state.busy = Boolean(next);
    workspace.classList.toggle('is-v24-busy', state.busy);
  }
  function toast(message, error) {
    var old = document.querySelector('.pmd-inv-v24-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'pmd-inv-v24-toast' + (error ? ' is-error' : '');
    node.textContent = String(message || '');
    document.body.appendChild(node);
    window.setTimeout(function(){ node.remove(); }, 3200);
  }
  function request(handler, payload, formData) {
    if (state.busy) return Promise.reject(new Error('Inventory is busy.'));
    setBusy(true);
    return api.request(handler, payload || {}, formData)
      .then(function (json) {
        if (json && json.snapshot && api.applySnapshot) api.applySnapshot(json.snapshot);
        return json || {};
      })
      .finally(function () { setBusy(false); });
  }
  function itemById(id) {
    id = Number(id || 0);
    return items().find(function (row) { return Number(row.id) === id; }) || null;
  }
  function supplierById(id) {
    id = Number(id || 0);
    return (ops().suppliers || []).find(function (row) { return Number(row.id) === id; }) || null;
  }
  function storageById(id) {
    id = Number(id || 0);
    return (ops().storage_locations || []).find(function (row) { return Number(row.id) === id; }) || null;
  }
  function optionRows(rows, selected, label) {
    return (rows || []).map(function (row) {
      var id = String(row.id || '');
      return '<option value="' + esc(id) + '"' + (String(selected || '') === id ? ' selected' : '') + '>' +
        esc(label(row)) + '</option>';
    }).join('');
  }
  function itemOptions(selected) {
    return '<option value="">Choose item</option>' + optionRows(items(), selected, function(row){
      return row.name + ' · ' + num(row.estimated_on_hand,2) + ' ' + row.unit;
    });
  }
  function supplierOptions(selected, allowEmpty) {
    return (allowEmpty ? '<option value="">Unassigned supplier</option>' : '<option value="">Choose supplier</option>') +
      optionRows(ops().suppliers || [], selected, function(row){ return row.name; });
  }
  function storageOptions(selected, allowEmpty) {
    return (allowEmpty ? '<option value="">Unassigned storage</option>' : '<option value="">Choose storage</option>') +
      optionRows(ops().storage_locations || [], selected, function(row){ return row.name; });
  }

  function syncSelects() {
    var suppliers = ops().suppliers || [];
    var storages = ops().storage_locations || [];
    var settings = ops().settings || {};

    [
      ['[data-r19-purchase-supplier-id]', true],
      ['[data-v24-po-supplier]', false],
      ['[data-v24-map-supplier]', false],
      ['[data-v24-code-supplier]', true]
    ].forEach(function (entry) {
      var node = workspace.querySelector(entry[0]);
      if (!node) return;
      var current = node.value;
      node.innerHTML = supplierOptions(current, entry[1]);
    });

    ['[data-v24-map-item]','[data-v24-code-item]','[data-v24-transfer-item]','[data-v24-return-item]','[data-v24-merge-keep]','[data-v24-merge-remove]'].forEach(function(selector){
      var node = workspace.querySelector(selector);
      if (!node) return;
      var current = node.value;
      node.innerHTML = itemOptions(current);
    });

    ['[data-v24-transfer-from]','[data-v24-transfer-to]','[data-v24-return-storage]','[data-v24-setting-storage]'].forEach(function(selector){
      var node = workspace.querySelector(selector);
      if (!node) return;
      var current = node.value || (selector === '[data-v24-setting-storage]' ? settings.default_storage_location_id : '');
      node.innerHTML = storageOptions(current, selector === '[data-v24-return-storage]' || selector === '[data-v24-setting-storage]');
      if (current) node.value = String(current);
    });

    var purchaseSupplier = workspace.querySelector('[data-r19-purchase-supplier-id]');
    var purchaseSupplierName = workspace.querySelector('[data-r19-purchase-supplier]');
    if (purchaseSupplier && purchaseSupplierName) {
      var selectedSupplier = supplierById(purchaseSupplier.value);
      purchaseSupplierName.value = selectedSupplier ? selectedSupplier.name : '';
    }

    // Preserve values while hydrating settings.
    var trigger = workspace.querySelector('[data-v24-setting-trigger]');
    if (trigger) trigger.value = String(settings.consumption_trigger || 'paid');
    var expiry = workspace.querySelector('[data-v24-setting-expiry]');
    if (expiry) expiry.value = String(settings.expiry_warning_days || 7);
    var blind = workspace.querySelector('[data-v24-setting-blind]');
    if (blind) blind.checked = Boolean(settings.blind_count);
    var low = workspace.querySelector('[data-v24-setting-low]');
    if (low) low.checked = settings.low_stock_notifications !== false;
    var menu = workspace.querySelector('[data-v24-setting-menu]');
    if (menu) menu.checked = Boolean(settings.menu_availability_guard);
  }

  function setMode(mode) {
    state.mode = mode;
    workspace.querySelectorAll('[data-r19-mode]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-r19-mode') === mode);
    });
    workspace.querySelectorAll('[data-r19-pane]').forEach(function(pane){
      var active = pane.getAttribute('data-r19-pane') === mode;
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });
    renderMode(mode);
  }

  function renderMode(mode) {
    syncSelects();
    if (mode === 'orders') renderOrders();
    if (mode === 'suppliers') renderSuppliers();
    if (mode === 'storage') renderStorage();
    if (mode === 'ledger') renderLedger();
    if (mode === 'settings') renderSettings();
  }

  function renderOrders() {
    var host = workspace.querySelector('[data-v24-po-list]');
    if (!host) return;
    var rows = ops().purchase_orders || [];
    host.innerHTML = rows.length ? rows.map(function(po){
      var received = (po.lines || []).reduce(function(sum,line){ return sum + Number(line.received_qty || 0); },0);
      var ordered = (po.lines || []).reduce(function(sum,line){ return sum + Number(line.ordered_qty || 0); },0);
      var canReceive = ['draft','sent','partial'].indexOf(String(po.status)) !== -1;
      var actions = '<div class="pmd-inv-v24-po-actions">';
      if (String(po.status) === 'draft') {
        actions += '<button type="button" class="pmd-inv-r19-secondary" data-v24-po-status="' + esc(po.id) + '" data-status="sent">Mark sent</button>';
        actions += '<button type="button" class="pmd-inv-r19-secondary" data-v24-po-status="' + esc(po.id) + '" data-status="cancelled">Cancel</button>';
      }
      if (canReceive) {
        actions += '<button type="button" class="pmd-inv-r19-primary" data-v24-po-receive-open="' + esc(po.id) + '">Receive</button>';
      }
      if (['partial','received'].indexOf(String(po.status)) !== -1) {
        actions += '<button type="button" class="pmd-inv-r19-secondary" data-v24-po-status="' + esc(po.id) + '" data-status="closed">Close</button>';
      }
      actions += '</div>';
      return '<article class="pmd-inv-v24-po">' +
        '<div><strong>' + esc(po.order_number) + '</strong><span>' + esc(po.supplier_name || 'Unassigned supplier') + '</span></div>' +
        '<div><b>' + esc(String(po.status).toUpperCase()) + '</b><span>' + esc(num(received,2) + ' / ' + num(ordered,2) + ' packs received') + '</span></div>' +
        '<div><strong>' + esc(money(po.subtotal || 0)) + '</strong><span>Expected ' + esc(po.expected_at || '—') + '</span></div>' +
        actions +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No purchase orders yet. Create one or convert the Shopping plan.</div>';
  }

  function resetPoEditor() {
    state.poLines = [];
    var editor = workspace.querySelector('[data-v24-po-editor]');
    if (editor) editor.hidden = true;
    var lines = workspace.querySelector('[data-v24-po-lines]');
    if (lines) lines.innerHTML = '';
  }

  function addPoLine(seed) {
    seed = seed || {};
    state.poLines.push({
      item_id:Number(seed.item_id || 0),
      quantity:Number(seed.quantity || 1),
      unit:String(seed.unit || ''),
      pack_to_base:Number(seed.pack_to_base || 1),
      unit_cost:Number(seed.unit_cost || 0),
      supplier_item_id:Number(seed.supplier_item_id || 0)
    });
    renderPoEditorLines();
  }

  function renderPoEditorLines() {
    var host = workspace.querySelector('[data-v24-po-lines]');
    if (!host) return;
    host.innerHTML = state.poLines.map(function(line,index){
      return '<div class="pmd-inv-v24-po-line" data-v24-po-line="' + index + '">' +
        '<select data-v24-po-line-item>' + itemOptions(line.item_id) + '</select>' +
        '<input type="number" min="0.0001" step="0.01" value="' + esc(line.quantity || 1) + '" data-v24-po-line-qty aria-label="Quantity">' +
        '<input type="text" value="' + esc(line.unit || '') + '" placeholder="pack unit" data-v24-po-line-unit aria-label="Unit">' +
        '<input type="number" min="0.0001" step="0.0001" value="' + esc(line.pack_to_base || 1) + '" data-v24-po-line-factor aria-label="Pack conversion">' +
        '<input type="number" min="0" step="0.01" value="' + esc(line.unit_cost || 0) + '" data-v24-po-line-cost aria-label="Unit cost">' +
        '<button type="button" data-v24-po-line-remove="' + index + '" aria-label="Remove">×</button>' +
      '</div>';
    }).join('');
  }

  function collectPoLines() {
    return Array.prototype.slice.call(workspace.querySelectorAll('[data-v24-po-line]')).map(function(row){
      var itemId = Number((row.querySelector('[data-v24-po-line-item]') || {}).value || 0);
      var item = itemById(itemId);
      return {
        item_id:itemId,
        quantity:Number((row.querySelector('[data-v24-po-line-qty]') || {}).value || 0),
        unit:String((row.querySelector('[data-v24-po-line-unit]') || {}).value || (item ? item.purchase_unit || item.unit : 'piece')),
        pack_to_base:Number((row.querySelector('[data-v24-po-line-factor]') || {}).value || (item ? item.purchase_to_base || 1 : 1)),
        unit_cost:Number((row.querySelector('[data-v24-po-line-cost]') || {}).value || (item ? item.purchase_unit_cost || 0 : 0))
      };
    }).filter(function(line){ return line.item_id > 0 && line.quantity > 0; });
  }

  function openPoReceive(poId) {
    var po = (ops().purchase_orders || []).find(function(row){ return Number(row.id) === Number(poId); });
    var host = workspace.querySelector('[data-v24-po-receive]');
    if (!po || !host) return;
    host.hidden = false;
    host.setAttribute('data-v24-po-receive-id', String(po.id));
    host.innerHTML =
      '<div class="pmd-inv-v24-card-head"><div><h3>Receive ' + esc(po.order_number) + '</h3><span>' + esc(po.supplier_name || 'Supplier') + '</span></div><button type="button" class="pmd-inv-r19-secondary" data-v24-po-receive-close>Close</button></div>' +
      '<div class="pmd-inv-v24-grid pmd-inv-v24-grid--3">' +
        '<label>Invoice number<input type="text" data-v24-po-receive-invoice placeholder="Optional"></label>' +
        '<label>Received date<input type="date" value="' + esc(new Date().toISOString().slice(0,10)) + '" data-v24-po-receive-date></label>' +
        '<span></span>' +
      '</div>' +
      '<div class="pmd-inv-v24-receive-lines">' +
      (po.lines || []).map(function(line){
        var remaining = Math.max(0, Number(line.ordered_qty || 0) - Number(line.received_qty || 0));
        return '<div class="pmd-inv-v24-receive-line" data-v24-receive-line="' + esc(line.id) + '">' +
          '<div><strong>' + esc(line.item_name) + '</strong><small>Remaining ' + esc(num(remaining,2) + ' ' + line.unit) + '</small></div>' +
          '<input type="number" min="0" max="' + esc(remaining) + '" step="0.01" value="' + esc(remaining) + '" data-v24-receive-qty aria-label="Received quantity">' +
          '<select data-v24-receive-storage>' + storageOptions((ops().settings || {}).default_storage_location_id, true) + '</select>' +
          '<input type="text" placeholder="Lot / batch" data-v24-receive-lot aria-label="Lot code">' +
          '<input type="date" data-v24-receive-expiry aria-label="Expiry date">' +
        '</div>';
      }).join('') +
      '</div><div class="pmd-inv-v24-actions"><button type="button" class="pmd-inv-r19-primary" data-v24-po-receive-save>Confirm received stock</button></div>';
    host.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function renderSuppliers() {
    var list = workspace.querySelector('[data-v24-supplier-list]');
    if (list) {
      list.innerHTML = (ops().suppliers || []).map(function(supplier){
        var mapped = (ops().supplier_items || []).filter(function(si){ return Number(si.supplier_id) === Number(supplier.id); });
        return '<article class="pmd-inv-v24-supplier"><div><strong>' + esc(supplier.name) + '</strong><span>' +
          esc((supplier.lead_time_days || 0) + ' day lead time · ' + mapped.length + ' mapped item' + (mapped.length === 1 ? '' : 's')) +
          '</span></div><div><span>' + esc(supplier.order_email || supplier.email || 'No order email') + '</span><b>' + esc(money(supplier.min_order_value || 0)) + ' minimum</b></div></article>';
      }).join('') || '<div class="pmd-inv-r19-empty">No suppliers yet.</div>';
    }

    var performance = workspace.querySelector('[data-v24-supplier-performance]');
    if (performance) {
      var perfRows = ops().supplier_performance || [];
      performance.innerHTML = '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--head"><span>Supplier</span><span>Purchase lines</span><span>Last purchase</span><span>Activity</span></div>' +
        (perfRows.map(function(row){
          return '<div class="pmd-inv-v24-tr"><strong>' + esc(row.supplier_name || 'Supplier') + '</strong><span>' +
            esc(row.purchase_lines_90d || 0) + '</span><span>' + esc(row.last_purchase_at || '—') + '</span><span>90-day history</span></div>';
        }).join('') || '<div class="pmd-inv-r19-empty">Supplier activity appears after received purchases.</div>');
    }

    var codes = workspace.querySelector('[data-v24-code-list]');
    if (codes) {
      codes.innerHTML = '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--head"><span>Item</span><span>Code</span><span>Package</span><span>Supplier</span></div>' +
        ((ops().identifiers || []).map(function(row){
          return '<div class="pmd-inv-v24-tr"><strong>' + esc(row.item_name) + '</strong><code>' + esc(row.code) + '</code><span>' +
            esc('1 ' + row.package_unit + ' = ' + num(row.package_to_base,4) + ' ' + row.base_unit) + '</span><span>' + esc(row.supplier_name || 'Any') + '</span></div>';
        }).join('') || '<div class="pmd-inv-r19-empty">No package codes linked yet.</div>');
    }
  }

  function renderStorage() {
    var expiryHost = workspace.querySelector('[data-v24-expiry-list]');
    if (expiryHost) {
      var lots = ops().expiry_lots || [];
      expiryHost.innerHTML = '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--head"><span>Item</span><span>Expiry</span><span>Lot</span><span>Storage</span></div>' +
        (lots.map(function(row){
          var status = row.status === 'expired' ? 'Expired' : (row.status === 'expiring' ? 'Soon · ' + row.days_to_expiry + 'd' : row.days_to_expiry + 'd');
          return '<div class="pmd-inv-v24-tr is-' + esc(row.status) + '"><strong>' + esc(row.item_name) + '</strong><span>' + esc(row.expiry_date + ' · ' + status) +
            '</span><span>' + esc(row.lot_code || '—') + '</span><span>' + esc(row.storage_name || 'Unassigned') + '</span></div>';
        }).join('') || '<div class="pmd-inv-r19-empty">No expiring lots recorded.</div>');
    }

    var balances = workspace.querySelector('[data-v24-storage-balances]');
    if (balances) {
      var rows = (ops().storage_balances || []).filter(function(row){ return Math.abs(Number(row.qty || 0)) > .00005; });
      balances.innerHTML = '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--head"><span>Storage</span><span>Item</span><span>Recorded balance</span><span></span></div>' +
        (rows.map(function(row){
          return '<div class="pmd-inv-v24-tr"><strong>' + esc(row.storage_name || 'Storage') + '</strong><span>' + esc(row.item_name) +
            '</span><span>' + esc(num(row.qty,2) + ' ' + row.unit) + '</span><span></span></div>';
        }).join('') || '<div class="pmd-inv-r19-empty">Storage-specific balances start building as purchases and transfers are assigned to locations.</div>');
    }
  }

  function renderLedger() {
    var host = workspace.querySelector('[data-v24-ledger]');
    if (!host) return;
    var rows = ops().recent_movements || [];
    host.innerHTML = '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--head pmd-inv-v24-tr--ledger"><span>When</span><span>Item</span><span>Movement</span><span>Qty</span><span>By</span><span></span></div>' +
      (rows.map(function(row){
        var reversible = ['REVERSAL','TRANSFER_OUT','TRANSFER_IN'].indexOf(row.movement_type) === -1 && !row.reversal_of_id;
        return '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--ledger"><span>' + esc(String(row.occurred_at || '').slice(0,16)) + '</span><strong>' +
          esc(row.item_name) + '</strong><span>' + esc(row.movement_type + (row.storage_name ? ' · ' + row.storage_name : '')) + '</span><span>' +
          esc((Number(row.qty_delta) > 0 ? '+' : '') + num(row.qty_delta,2) + ' ' + row.unit) + '</span><span>' + esc(row.staff_name || 'System') +
          '</span>' + (reversible ? '<button type="button" data-v24-reverse="' + esc(row.id) + '">Reverse</button>' : '<span></span>') + '</div>';
      }).join('') || '<div class="pmd-inv-r19-empty">No inventory movements yet.</div>');
  }

  function renderSettings() {
    syncSelects();
    var host = workspace.querySelector('[data-v24-cost-history]');
    if (host) {
      var rows = ops().cost_history || [];
      host.innerHTML = '<div class="pmd-inv-v24-tr pmd-inv-v24-tr--head"><span>Date</span><span>Item</span><span>Supplier</span><span>Price</span></div>' +
        (rows.map(function(row){
          return '<div class="pmd-inv-v24-tr"><span>' + esc(row.purchased_at || '—') + '</span><strong>' + esc(row.item_name) +
            '</strong><span>' + esc(row.supplier_name || 'Unassigned') + '</span><span>' + esc(money(row.purchase_unit_cost) + ' / ' + (row.purchase_unit || 'unit')) + '</span></div>';
        }).join('') || '<div class="pmd-inv-r19-empty">Cost history appears after V24 purchases.</div>');
    }
  }

  function renderAllV24() {
    syncSelects();
    if (state.mode) renderMode(state.mode);
  }

  function createPoFromShopping() {
    var rows = Array.prototype.slice.call(workspace.querySelectorAll('[data-r19-shopping-row]')).map(function(node){
      var item = itemById(node.getAttribute('data-r19-shopping-row'));
      var qty = Number((node.querySelector('[data-r19-shopping-qty]') || {}).value || 0);
      if (!item || qty <= 0) return null;
      return {
        item:item,
        quantity:qty,
        unit:String(node.getAttribute('data-unit') || item.purchase_unit || item.unit || 'piece'),
        pack_to_base:Number(node.getAttribute('data-factor') || item.purchase_to_base || 1),
        unit_cost:Number(node.getAttribute('data-unit-cost') || item.purchase_unit_cost || 0),
        supplier_id:Number(node.getAttribute('data-supplier-id') || 0) || null,
        supplier_item_id:Number(node.getAttribute('data-supplier-item-id') || 0) || null
      };
    }).filter(Boolean);

    if (!rows.length) return toast('Shopping list is empty.', true);

    var groups = {};
    rows.forEach(function(row){
      var key = String(row.supplier_id || 0);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    var groupKeys = Object.keys(groups);
    setBusy(true);

    var chain = Promise.resolve();
    var lastSnapshot = null;
    groupKeys.forEach(function(key){
      chain = chain.then(function(){
        var supplierId = Number(key) || null;
        var supplier = supplierById(supplierId);
        var leadDays = supplier ? Math.max(0, Number(supplier.lead_time_days || 0)) : 0;
        var expected = new Date();
        expected.setDate(expected.getDate() + leadDays);

        return api.request('onSavePurchaseOrder',{
          supplier_id:supplierId,
          status:'draft',
          ordered_at:new Date().toISOString().slice(0,10),
          expected_at:expected.toISOString().slice(0,10),
          notes:'Draft created from Shopping forecast',
          lines:groups[key].map(function(row){
            return {
              item_id:Number(row.item.id),
              supplier_item_id:row.supplier_item_id,
              quantity:row.quantity,
              unit:row.unit,
              pack_to_base:row.pack_to_base,
              unit_cost:row.unit_cost
            };
          })
        }).then(function(json){
          if (json && json.snapshot) {
            lastSnapshot = json.snapshot;
            if (api.applySnapshot) api.applySnapshot(json.snapshot);
          }
        });
      });
    });

    chain.then(function(){
      setMode('orders');
      renderOrders();
      toast(groupKeys.length + ' draft purchase order' + (groupKeys.length === 1 ? '' : 's') + ' created by supplier.');
    }).catch(function(error){
      toast(error.message || 'Could not create purchase orders.', true);
    }).finally(function(){
      setBusy(false);
    });
  }

  function packageCost(identifier, item) {
    var baseCost = Number(item && item.unit_cost || 0);
    return baseCost * Number(identifier.package_to_base || 1);
  }

  function renderScanCart() {
    var panel = workspace.querySelector('[data-r19-barcode-panel]');
    if (!panel) return;
    var host = panel.querySelector('[data-v24-scan-cart]');
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-v24-scan-cart','');
      host.className = 'pmd-inv-v24-scan-cart';
      panel.appendChild(host);
    }
    if (!state.scanLines.length) {
      host.innerHTML = '';
      host.hidden = true;
      return;
    }
    host.hidden = false;
    host.innerHTML = '<div class="pmd-inv-v24-card-head"><h3>Scanned purchase draft</h3><span>' + esc(state.scanLines.length + ' product package' + (state.scanLines.length === 1 ? '' : 's')) + '</span></div>' +
      state.scanLines.map(function(line,index){
        return '<div class="pmd-inv-v24-scan-line"><div><strong>' + esc(line.item_name) + '</strong><small>' +
          esc('1 scan = ' + num(line.package_to_base,4) + ' ' + line.base_unit + ' · ' + line.package_unit) + '</small></div>' +
          '<input type="number" min="0.0001" step="1" value="' + esc(line.quantity) + '" data-v24-scan-qty="' + index + '">' +
          '<span>' + esc(money(Number(line.unit_cost || 0) * Number(line.quantity || 0))) + '</span>' +
          '<button type="button" data-v24-scan-remove="' + index + '">×</button></div>';
      }).join('') +
      '<div class="pmd-inv-v24-actions"><button type="button" class="pmd-inv-r19-primary" data-v24-scan-confirm>Confirm scanned purchase</button><button type="button" class="pmd-inv-r19-secondary" data-v24-scan-clear>Clear</button></div>';
  }

  function addResolvedScan(identifier, rawCode) {
    var item = itemById(identifier.item_id);
    if (!item) return toast('Scanned item is no longer in stock master.', true);
    var existing = state.scanLines.find(function(line){ return Number(line.identifier_id) === Number(identifier.id); });
    if (existing) {
      existing.quantity += 1;
    } else {
      state.scanLines.push({
        item_id:Number(item.id),
        item_name:String(item.name || ''),
        identifier_id:Number(identifier.id),
        barcode:String(rawCode || identifier.code || ''),
        quantity:1,
        package_unit:String(identifier.package_unit || item.purchase_unit || item.unit || 'piece'),
        package_to_base:Number(identifier.package_to_base || 1),
        base_unit:String(identifier.base_unit || item.unit || 'piece'),
        unit_cost:packageCost(identifier,item),
        supplier_id:identifier.supplier_id || null
      });
    }
    renderScanCart();
    var status = workspace.querySelector('[data-r19-barcode-status]');
    if (status) {
      status.textContent = 'Scanned ' + item.name + ' · 1 ' + identifier.package_unit + ' = ' + num(identifier.package_to_base,4) + ' ' + identifier.base_unit + '.';
      status.classList.remove('is-error');
      status.classList.add('is-success');
    }
    var unknown = workspace.querySelector('[data-r19-barcode-unknown]');
    if (unknown) unknown.hidden = true;
  }

  function queueOfflineCode(code) {
    try {
      var key = 'pmd_inventory_scan_queue_v24';
      var rows = JSON.parse(localStorage.getItem(key) || '[]');
      rows.push({code:String(code), at:Date.now()});
      rows = rows.slice(-100);
      localStorage.setItem(key, JSON.stringify(rows));
      toast('Scanner is offline. Code queued and will retry when connection returns.');
    } catch (ignore) {
      toast('Scanner request failed.', true);
    }
  }

  function resolveScan(code, fromQueue) {
    code = String(code || '').trim();
    if (!code) return;
    api.request('onResolveBarcode', {code:code})
      .then(function(json){
        if (json.identifier) {
          addResolvedScan(json.identifier, code);
          return;
        }
        var parsed = json.parsed || {};
        state.pendingCode = code;
        var unknown = workspace.querySelector('[data-r19-barcode-unknown]');
        var codeNode = workspace.querySelector('[data-r19-barcode-unknown-code]');
        if (codeNode) codeNode.textContent = code + (parsed.code_type ? ' · ' + parsed.code_type : '');
        if (unknown) unknown.hidden = false;
        var status = workspace.querySelector('[data-r19-barcode-status]');
        if (status) {
          status.textContent = parsed.valid === false ? 'Code format/check digit is invalid.' : 'Unknown package code. Link the package once.';
          status.classList.add('is-error');
        }
      })
      .catch(function(){ if (!fromQueue) queueOfflineCode(code); });
  }

  function flushOfflineScans() {
    if (!navigator.onLine) return;
    try {
      var key = 'pmd_inventory_scan_queue_v24';
      var rows = JSON.parse(localStorage.getItem(key) || '[]');
      if (!rows.length) return;
      localStorage.removeItem(key);
      rows.slice(0,100).forEach(function(row,index){
        window.setTimeout(function(){ resolveScan(row.code, true); }, index * 180);
      });
    } catch (ignore) {}
  }

  function startCamera() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return toast('Camera barcode detection is not supported by this browser. USB/Bluetooth scanners still work.', true);
    }
    if (state.cameraStream) return;
    var video = workspace.querySelector('[data-r19-camera-video]');
    if (!video) return;

    Promise.resolve(typeof BarcodeDetector.getSupportedFormats === 'function' ? BarcodeDetector.getSupportedFormats() : [])
      .then(function(formats){
        var wanted = ['ean_13','ean_8','upc_a','upc_e','code_128','qr_code','data_matrix'];
        var supported = formats && formats.length ? wanted.filter(function(f){ return formats.indexOf(f) !== -1; }) : wanted;
        state.detector = new BarcodeDetector(supported.length ? {formats:supported} : undefined);
        return navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
      })
      .then(function(stream){
        state.cameraStream = stream;
        video.srcObject = stream;
        video.hidden = false;
        return video.play();
      })
      .then(function(){
        var start = workspace.querySelector('[data-r19-camera-start]');
        var stop = workspace.querySelector('[data-r19-camera-stop]');
        if (start) start.hidden = true;
        if (stop) stop.hidden = false;
        detectCameraFrame();
      })
      .catch(function(error){ toast(error.message || 'Could not open the camera.', true); });
  }

  function detectCameraFrame() {
    clearTimeout(state.cameraTimer);
    var video = workspace.querySelector('[data-r19-camera-video]');
    if (!state.cameraStream || !state.detector || !video) return;
    state.detector.detect(video).then(function(codes){
      if (codes && codes.length) {
        var raw = String(codes[0].rawValue || '');
        var now = Date.now();
        if (raw && (raw !== state.lastCameraCode || now - state.lastCameraAt > 1400)) {
          state.lastCameraCode = raw;
          state.lastCameraAt = now;
          resolveScan(raw, false);
        }
      }
    }).catch(function(){})
      .finally(function(){ state.cameraTimer = window.setTimeout(detectCameraFrame, 320); });
  }

  function stopCamera() {
    clearTimeout(state.cameraTimer);
    state.cameraTimer = null;
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(function(track){ track.stop(); });
    }
    state.cameraStream = null;
    var video = workspace.querySelector('[data-r19-camera-video]');
    if (video) { video.pause(); video.srcObject = null; video.hidden = true; }
    var start = workspace.querySelector('[data-r19-camera-start]');
    var stop = workspace.querySelector('[data-r19-camera-stop]');
    if (start) start.hidden = false;
    if (stop) stop.hidden = true;
  }

  function saveUnknownLink() {
    var itemId = Number(val('[data-r19-barcode-link-select]',0));
    var item = itemById(itemId);
    var code = String(state.pendingCode || '');
    var unit = String(val('[data-r19-barcode-package-unit]','piece') || 'piece');
    var factor = Number(val('[data-r19-barcode-package-factor]',1) || 1);
    var supplierId = Number(val('[data-r19-purchase-supplier-id]',0)) || null;
    if (!item || !code || !(factor > 0)) return toast('Choose the stock item and package conversion.', true);

    request('onSaveIdentifier', {
      item_id:item.id,
      supplier_id:supplierId,
      code:code,
      package_unit:unit,
      package_to_base:factor,
      is_primary:false
    }).then(function(json){
      var identifier = ((json.snapshot || {}).operations || {}).identifiers || [];
      var linked = identifier.find(function(row){ return String(row.normalized_code || row.code) === String(code).replace(/[\s\-]+/g,''); }) ||
        identifier.find(function(row){ return Number(row.item_id) === Number(item.id) && String(row.code) === code; });
      if (linked) addResolvedScan(linked, code);
      state.pendingCode = '';
      toast('Package code linked to ' + item.name + '.');
    }).catch(function(error){ toast(error.message || 'Could not link package code.', true); });
  }

  function createUnknownScannedItem() {
    var code = String(state.pendingCode || '').trim();
    if (!code) return toast('Scan an unknown code first.', true);

    var name = window.prompt('New stock item name');
    if (!name || !String(name).trim()) return;

    var packageUnit = String(val('[data-r19-barcode-package-unit]','piece') || 'piece').trim();
    var baseUnit = String(val('[data-r19-barcode-base-unit]','piece') || 'piece').trim();
    var factor = Number(val('[data-r19-barcode-package-factor]',1) || 1);
    var supplierId = Number(val('[data-r19-purchase-supplier-id]',0)) || null;
    var supplier = supplierById(supplierId);

    if (!(factor > 0)) return toast('Package conversion must be greater than zero.', true);

    request('onSavePurchase', {
      supplier_id:supplierId,
      supplier_name:supplier ? supplier.name : '',
      supplier_invoice_number:String(val('[data-r19-purchase-invoice]','')).trim(),
      purchased_at:String(val('[data-r19-purchase-date]',new Date().toISOString().slice(0,10))),
      source:'barcode',
      lines:[{
        item_id:0,
        item_name:String(name).trim(),
        category:'',
        quantity:1,
        unit:packageUnit,
        base_unit:baseUnit,
        package_to_base:factor,
        unit_cost:0,
        barcode:code,
        supplier_id:supplierId
      }]
    }).then(function(json){
      state.pendingCode = '';
      var unknown = workspace.querySelector('[data-r19-barcode-unknown]');
      if (unknown) unknown.hidden = true;
      toast('New item created and 1 ' + packageUnit + ' received.');
    }).catch(function(error){
      toast(error.message || 'Could not create the scanned item.', true);
    });
  }

  function confirmScanCart() {
    if (!state.scanLines.length) return;
    var supplierId = Number(val('[data-r19-purchase-supplier-id]',0)) || null;
    var supplier = supplierById(supplierId);
    request('onSavePurchase', {
      supplier_id:supplierId,
      supplier_name:supplier ? supplier.name : '',
      supplier_invoice_number:String(val('[data-r19-purchase-invoice]','')).trim(),
      purchased_at:String(val('[data-r19-purchase-date]', new Date().toISOString().slice(0,10))),
      source:'barcode',
      lines:state.scanLines.map(function(line){
        return {
          item_id:line.item_id,
          item_name:line.item_name,
          identifier_id:line.identifier_id,
          barcode:line.barcode,
          quantity:Number(line.quantity || 0),
          unit:line.package_unit,
          package_to_base:Number(line.package_to_base || 1),
          unit_cost:Number(line.unit_cost || 0),
          supplier_id:line.supplier_id || supplierId
        };
      })
    }).then(function(){
      state.scanLines = [];
      renderScanCart();
      toast('Scanned purchase added to stock.');
    }).catch(function(error){ toast(error.message || 'Could not confirm scanned purchase.', true); });
  }

  function exportCsv() {
    var csv = [];
    function q(value) { return '"' + String(value == null ? '' : value).replace(/"/g,'""') + '"'; }
    var fileName;

    if (state.mode === 'ledger') {
      var movements = ops().recent_movements || [];
      csv.push(['occurred_at','item','movement_type','qty_delta','unit','unit_cost','storage','to_storage','reason','note','staff','reference_type','reference_id','reversal_of_id'].join(','));
      movements.forEach(function(row){
        csv.push([
          row.occurred_at,row.item_name,row.movement_type,row.qty_delta,row.unit,row.unit_cost,
          row.storage_name,row.to_storage_name,row.reason,row.note,row.staff_name,row.reference_type,row.reference_id,row.reversal_of_id
        ].map(q).join(','));
      });
      fileName = 'paymydine-inventory-ledger-' + new Date().toISOString().slice(0,10) + '.csv';
    } else {
      var rows = items();
      var supplierItems = ops().supplier_items || [];
      var identifiers = ops().identifiers || [];
      var header = ['name','category','base_unit','purchase_unit','purchase_to_base','purchase_cost','reorder_point','par_level','safety_stock','supplier','supplier_sku','barcode','min_order_qty','order_multiple'];
      csv.push(header.join(','));
      rows.forEach(function(item){
        var si = supplierItems.find(function(row){ return Number(row.item_id) === Number(item.id) && row.is_primary; });
        var code = identifiers.find(function(row){ return Number(row.item_id) === Number(item.id) && row.is_primary; }) ||
          identifiers.find(function(row){ return Number(row.item_id) === Number(item.id); });
        csv.push([
          item.name,item.category,item.unit,
          si ? si.pack_unit : item.purchase_unit,
          si ? si.pack_to_base : item.purchase_to_base,
          si ? si.pack_cost : item.purchase_unit_cost,
          Number(item.reorder_point || 0) / Math.max(.0001, Number(item.purchase_to_base || 1)),
          Number(item.par_level || 0) / Math.max(.0001, Number(item.purchase_to_base || 1)),
          Number(item.safety_stock || 0) / Math.max(.0001, Number(item.purchase_to_base || 1)),
          si ? si.supplier_name : item.supplier_name,
          si ? si.supplier_sku : '',
          code ? code.code : '',
          si ? si.min_order_qty : '',
          si ? si.order_multiple : ''
        ].map(q).join(','));
      });
      fileName = 'paymydine-inventory-' + new Date().toISOString().slice(0,10) + '.csv';
    }

    var blob = new Blob([csv.join('\n')],{type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function importCsv(file) {
    if (!file) return;
    var data = new FormData();
    data.append('csv', file);
    request('onImportInventoryCsv', {}, data)
      .then(function(json){
        var count = Number(json.created || 0) + Number(json.updated || 0);
        var errors = Array.isArray(json.errors) ? json.errors : [];
        toast(count + ' item rows imported/updated' + (errors.length ? ' · ' + errors.length + ' row errors' : '') + '.');
      })
      .catch(function(error){ toast(error.message || 'CSV import failed.', true); });
  }

  function saveSettings() {
    request('onSaveInventorySettings', {
      consumption_trigger:val('[data-v24-setting-trigger]','paid'),
      default_storage_location_id:Number(val('[data-v24-setting-storage]',0)) || null,
      expiry_warning_days:Number(val('[data-v24-setting-expiry]',7)) || 7,
      blind_count:Boolean(val('[data-v24-setting-blind]',false)),
      low_stock_notifications:Boolean(val('[data-v24-setting-low]',true)),
      menu_availability_guard:Boolean(val('[data-v24-setting-menu]',false))
    }).then(function(){ toast('Inventory settings saved.'); })
      .catch(function(error){ toast(error.message || 'Could not save settings.', true); });
  }

  // V24 modes must bypass R19's allow-list.
  workspace.addEventListener('click', function(event){
    var mode = event.target.closest('[data-r19-mode]');
    if (!mode) return;
    var name = String(mode.getAttribute('data-r19-mode') || '');
    if (['orders','suppliers','storage','ledger','settings'].indexOf(name) === -1) {
      state.mode = '';
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    setMode(name);
  }, true);

  // Capture package scanner actions before the R23 compatibility handler.
  workspace.addEventListener('keydown', function(event){
    if (!event.target.matches('[data-r19-barcode-input]') || event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var code = event.target.value;
    event.target.value = '';
    resolveScan(code, false);
  }, true);

  workspace.addEventListener('click', function(event){
    var target = event.target;

    if (target.closest('[data-r19-barcode-link]')) {
      event.preventDefault(); event.stopImmediatePropagation(); saveUnknownLink(); return;
    }
    if (target.closest('[data-r19-barcode-new]')) {
      event.preventDefault(); event.stopImmediatePropagation(); createUnknownScannedItem(); return;
    }
    if (target.closest('[data-r19-camera-start]')) { event.preventDefault(); startCamera(); return; }
    if (target.closest('[data-r19-camera-stop]')) { event.preventDefault(); stopCamera(); return; }
    if (target.closest('[data-r19-barcode-close]')) { stopCamera(); return; }

    var removeScan = target.closest('[data-v24-scan-remove]');
    if (removeScan) {
      state.scanLines.splice(Number(removeScan.getAttribute('data-v24-scan-remove')),1);
      renderScanCart(); return;
    }
    if (target.closest('[data-v24-scan-clear]')) { state.scanLines=[]; renderScanCart(); return; }
    if (target.closest('[data-v24-scan-confirm]')) { confirmScanCart(); return; }

    if (target.closest('[data-v24-po-new]')) {
      var editor = workspace.querySelector('[data-v24-po-editor]');
      if (editor) editor.hidden = false;
      if (!state.poLines.length) addPoLine({});
      return;
    }
    if (target.closest('[data-v24-po-add-line]')) { addPoLine({}); return; }
    var removePo = target.closest('[data-v24-po-line-remove]');
    if (removePo) {
      state.poLines.splice(Number(removePo.getAttribute('data-v24-po-line-remove')),1);
      renderPoEditorLines(); return;
    }
    if (target.closest('[data-v24-po-cancel]')) { resetPoEditor(); return; }
    if (target.closest('[data-v24-po-save]')) {
      var lines = collectPoLines();
      if (!lines.length) return toast('Add at least one purchase-order line.', true);
      request('onSavePurchaseOrder',{
        supplier_id:Number(val('[data-v24-po-supplier]',0)) || null,
        order_number:String(val('[data-v24-po-number]','')).trim(),
        ordered_at:val('[data-v24-po-date]',''),
        expected_at:val('[data-v24-po-expected]',''),
        notes:val('[data-v24-po-notes]',''),
        status:'draft',
        lines:lines
      }).then(function(){ resetPoEditor(); renderOrders(); toast('Purchase order saved.'); })
        .catch(function(error){ toast(error.message || 'Could not save purchase order.', true); });
      return;
    }
    var poStatus = target.closest('[data-v24-po-status]');
    if (poStatus) {
      var nextStatus = String(poStatus.getAttribute('data-status') || '');
      var poIdForStatus = Number(poStatus.getAttribute('data-v24-po-status') || 0);
      if (nextStatus === 'cancelled' && !window.confirm('Cancel this purchase order?')) return;
      request('onUpdatePurchaseOrderStatus',{
        purchase_order_id:poIdForStatus,
        status:nextStatus
      }).then(function(){ renderOrders(); toast('Purchase order updated.'); })
        .catch(function(error){ toast(error.message || 'Could not update purchase order.', true); });
      return;
    }

    var receiveOpen = target.closest('[data-v24-po-receive-open]');
    if (receiveOpen) { openPoReceive(receiveOpen.getAttribute('data-v24-po-receive-open')); return; }
    if (target.closest('[data-v24-po-receive-close]')) {
      var receive = workspace.querySelector('[data-v24-po-receive]');
      if (receive) receive.hidden = true;
      return;
    }
    if (target.closest('[data-v24-po-receive-save]')) {
      var receiveHost = workspace.querySelector('[data-v24-po-receive]');
      var poId = Number(receiveHost && receiveHost.getAttribute('data-v24-po-receive-id') || 0);
      var linesToReceive = Array.prototype.slice.call(workspace.querySelectorAll('[data-v24-receive-line]')).map(function(row){
        return {
          purchase_order_line_id:Number(row.getAttribute('data-v24-receive-line') || 0),
          quantity:Number((row.querySelector('[data-v24-receive-qty]') || {}).value || 0),
          storage_location_id:Number((row.querySelector('[data-v24-receive-storage]') || {}).value || 0) || null,
          lot_code:String((row.querySelector('[data-v24-receive-lot]') || {}).value || '').trim(),
          expiry_date:String((row.querySelector('[data-v24-receive-expiry]') || {}).value || '')
        };
      }).filter(function(line){ return line.quantity > 0; });
      request('onReceivePurchaseOrder',{
        purchase_order_id:poId,
        supplier_invoice_number:val('[data-v24-po-receive-invoice]',''),
        purchased_at:val('[data-v24-po-receive-date]',''),
        lines:linesToReceive
      }).then(function(){
        if (receiveHost) receiveHost.hidden = true;
        renderOrders(); toast('Purchase order receipt added to stock.');
      }).catch(function(error){ toast(error.message || 'Could not receive purchase order.', true); });
      return;
    }

    if (target.closest('[data-v24-supplier-save]')) {
      request('onSaveSupplier',{
        name:val('[data-v24-supplier-name]',''),
        account_code:val('[data-v24-supplier-account]',''),
        order_email:val('[data-v24-supplier-email]',''),
        phone:val('[data-v24-supplier-phone]',''),
        lead_time_days:Number(val('[data-v24-supplier-lead]',1)),
        min_order_value:Number(val('[data-v24-supplier-min]',0))
      }).then(function(){ renderSuppliers(); toast('Supplier saved.'); })
        .catch(function(error){ toast(error.message || 'Could not save supplier.', true); });
      return;
    }
    if (target.closest('[data-v24-map-save]')) {
      request('onSaveSupplierItem',{
        supplier_id:Number(val('[data-v24-map-supplier]',0)),
        item_id:Number(val('[data-v24-map-item]',0)),
        supplier_sku:val('[data-v24-map-sku]',''),
        pack_unit:val('[data-v24-map-unit]','piece'),
        pack_to_base:Number(val('[data-v24-map-factor]',1)),
        pack_cost:Number(val('[data-v24-map-cost]',0)),
        min_order_qty:Number(val('[data-v24-map-minqty]',0)),
        order_multiple:Number(val('[data-v24-map-multiple]',1)),
        is_primary:Boolean(val('[data-v24-map-primary]',true))
      }).then(function(){ renderSuppliers(); toast('Supplier package saved.'); })
        .catch(function(error){ toast(error.message || 'Could not save supplier package.', true); });
      return;
    }
    if (target.closest('[data-v24-code-save]')) {
      request('onSaveIdentifier',{
        item_id:Number(val('[data-v24-code-item]',0)),
        supplier_id:Number(val('[data-v24-code-supplier]',0)) || null,
        code:val('[data-v24-code-value]',''),
        package_unit:val('[data-v24-code-unit]','piece'),
        package_to_base:Number(val('[data-v24-code-factor]',1)),
        is_primary:true
      }).then(function(){ renderSuppliers(); toast('Barcode / GTIN package saved.'); })
        .catch(function(error){ toast(error.message || 'Could not save product code.', true); });
      return;
    }

    if (target.closest('[data-v24-storage-save]')) {
      request('onSaveStorageLocation',{
        name:val('[data-v24-storage-name]',''),
        type:val('[data-v24-storage-type]','storage')
      }).then(function(){ renderStorage(); toast('Storage location saved.'); })
        .catch(function(error){ toast(error.message || 'Could not save storage location.', true); });
      return;
    }
    if (target.closest('[data-v24-transfer-save]')) {
      request('onTransferStock',{
        item_id:Number(val('[data-v24-transfer-item]',0)),
        quantity:Number(val('[data-v24-transfer-qty]',0)),
        from_storage_location_id:Number(val('[data-v24-transfer-from]',0)),
        to_storage_location_id:Number(val('[data-v24-transfer-to]',0))
      }).then(function(){ renderStorage(); toast('Stock transferred.'); })
        .catch(function(error){ toast(error.message || 'Could not transfer stock.', true); });
      return;
    }

    var reverse = target.closest('[data-v24-reverse]');
    if (reverse) {
      if (!window.confirm('Create an auditable reversal for this movement?')) return;
      request('onReverseMovement',{movement_id:Number(reverse.getAttribute('data-v24-reverse'))})
        .then(function(){ renderLedger(); toast('Movement reversed.'); })
        .catch(function(error){ toast(error.message || 'Could not reverse movement.', true); });
      return;
    }
    if (target.closest('[data-v24-return-save]')) {
      request('onReturnToSupplier',{
        item_id:Number(val('[data-v24-return-item]',0)),
        quantity:Number(val('[data-v24-return-qty]',0)),
        storage_location_id:Number(val('[data-v24-return-storage]',0)) || null,
        reason:val('[data-v24-return-reason]','Returned to supplier')
      }).then(function(){ renderLedger(); toast('Supplier return recorded.'); })
        .catch(function(error){ toast(error.message || 'Could not record supplier return.', true); });
      return;
    }

    if (target.closest('[data-v24-merge-save]')) {
      var keepId = Number(val('[data-v24-merge-keep]',0));
      var removeId = Number(val('[data-v24-merge-remove]',0));
      if (!keepId || !removeId || keepId === removeId) return toast('Choose two different stock items.', true);
      var keepItem = itemById(keepId);
      var removeItem = itemById(removeId);
      if (!window.confirm('Merge "' + (removeItem ? removeItem.name : 'duplicate') + '" into "' + (keepItem ? keepItem.name : 'kept item') + '" and archive the duplicate?')) return;
      request('onMergeItems',{keep_item_id:keepId,merge_item_id:removeId})
        .then(function(){ renderSettings(); toast('Duplicate stock item merged.'); })
        .catch(function(error){ toast(error.message || 'Could not merge stock items.', true); });
      return;
    }

    if (target.closest('[data-v24-settings-save]')) { saveSettings(); return; }
    if (target.closest('[data-v24-export]')) { exportCsv(); return; }

    if (target.closest('[data-v24-shopping-po]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      createPoFromShopping();
      return;
    }
  }, true);

  workspace.addEventListener('input', function(event){
    var scanQty = event.target.closest('[data-v24-scan-qty]');
    if (scanQty) {
      var line = state.scanLines[Number(scanQty.getAttribute('data-v24-scan-qty'))];
      if (line) line.quantity = Math.max(0, Number(scanQty.value || 0));
      renderScanCart();
    }
  });

  workspace.addEventListener('change', function(event){
    if (event.target.matches('[data-r19-purchase-supplier-id]')) {
      var supplier = supplierById(event.target.value);
      var hidden = workspace.querySelector('[data-r19-purchase-supplier]');
      if (hidden) hidden.value = supplier ? supplier.name : '';
    }
    if (event.target.matches('[data-v24-import-csv]')) {
      importCsv(event.target.files && event.target.files[0]);
      event.target.value = '';
    }
  });

  root.addEventListener('pmd:inventory-snapshot', function(){ renderAllV24(); });
  window.addEventListener('online', flushOfflineScans);
  window.addEventListener('beforeunload', stopCamera);

  // Show browser capability without requesting camera permission.
  var support = workspace.querySelector('[data-r19-camera-support]');
  if (support) support.textContent = ('BarcodeDetector' in window) ? 'Camera detector available' : 'Camera detector not available in this browser';

  syncSelects();
  flushOfflineScans();

  window.PMDInventoryOperationsV24 = {
    version:'24.0.0',
    setMode:setMode,
    render:renderAllV24,
    resolveScan:resolveScan,
    createPoFromShopping:createPoFromShopping
  };
}());
