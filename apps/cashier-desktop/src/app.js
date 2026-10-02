(function () {
  'use strict';

  var desktop = window.PayMyDineDesktop;
  if (!desktop || !desktop.realAppV110) {
    document.body.innerHTML = '<div style="padding:30px;font-family:sans-serif">PayMyDine desktop bridge is unavailable.</div>';
    return;
  }

  var state = {
    config: null,
    online: null,
    authenticated: null,
    dashboard: null,
    tables: [],
    tableData: null,
    selectedTable: null,
    category: 'all',
    search: '',
    cart: [],
    guestCount: 1,
    note: '',
    modifierItem: null,
    paymentSummary: null,
    loading: false,
  };

  var $ = function (selector) { return document.querySelector(selector); };
  var $$ = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };
  var toastTimer = null;
  var draftTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function round(value) { return Math.round((num(value, 0) + Number.EPSILON) * 100) / 100; }
  function currency() { return (state.tableData && state.tableData.settings && state.tableData.settings.currency) || '€'; }
  function money(value) { return currency() + round(value).toFixed(2); }
  function uid(prefix) {
    if (window.crypto && window.crypto.randomUUID) return String(prefix || 'pmd') + ':' + window.crypto.randomUUID();
    return String(prefix || 'pmd') + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
  }

  function toast(message, error) {
    var node = $('#toast');
    node.textContent = String(message || '');
    node.classList.toggle('is-error', !!error);
    node.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove('is-show'); }, 3500);
  }

  function setNotice(message) {
    var node = $('#notice');
    node.hidden = !message;
    node.textContent = message || '';
  }

  function setConnectivity(info) {
    if (!info) return;
    if (typeof info.online === 'boolean') state.online = info.online;
    if (info.authenticated !== undefined && info.authenticated !== null) state.authenticated = info.authenticated;
    var badge = $('#syncBadge');
    badge.className = 'sync-badge';
    if (state.online === false) {
      badge.classList.add('is-offline');
      badge.querySelector('b').textContent = 'Offline';
    } else if (state.authenticated === false) {
      badge.classList.add('is-auth');
      badge.querySelector('b').textContent = 'Sign in required';
    } else if (state.online === true) {
      badge.querySelector('b').textContent = 'Cloud synced';
    } else {
      badge.classList.add('is-checking');
      badge.querySelector('b').textContent = 'Checking…';
    }
    $('#loginBtn').hidden = state.authenticated !== false;
    $('#offlineHelp').hidden = state.online !== false || $('#posView').hidden;
    updateActionState();
  }

  async function request(options) {
    var result = await desktop.apiRequest(options || {});
    if (result && result.authRequired) {
      state.authenticated = false;
      setConnectivity({ online: true, authenticated: false });
      setNotice('Your PayMyDine session is not signed in. Sign in once; the desktop app keeps the secure session on this device.');
      return result;
    }
    if (result && result.online === false) {
      setConnectivity({ online: false, authenticated: state.authenticated });
      if (result.cached) setNotice('Offline mode: showing the last data saved on this computer. Draft changes stay local until internet returns.');
    } else if (result && result.ok) {
      setConnectivity({ online: true, authenticated: true });
      setNotice('');
    }
    return result;
  }

  function tableId(row) { return Number(row && (row.table_id || row.id || row.location_table_id) || 0); }
  function tableNumber(row) { return String(row && (row.table_number || row.table_no || row.number || row.table || tableId(row)) || ''); }
  function tableName(row) { return String(row && (row.table_name || row.table_label || row.name || row.label) || ('Table ' + tableNumber(row))); }
  function tableStatus(row) {
    var value = String(row && (row.operational_status || row.table_operational_status || row.status) || '').toLowerCase();
    if (!value) value = num(row && row.open_orders, 0) > 0 ? 'occupied' : 'available';
    if (value === 'free') value = 'available';
    return value;
  }

  function activeOrder() {
    var rows = state.tableData && Array.isArray(state.tableData.open_orders) ? state.tableData.open_orders : [];
    var activeId = state.tableData && state.tableData.active_order_id;
    if (activeId) {
      var found = rows.find(function (row) { return String(row.order_id) === String(activeId); });
      if (found) return found;
    }
    return rows[0] || null;
  }

  function draftKey() {
    return state.config && state.selectedTable ? state.config.tenant + ':table:' + tableId(state.selectedTable) : '';
  }

  async function saveDraftSoon() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(async function () {
      var key = draftKey();
      if (!key) return;
      try {
        await desktop.saveDraft(key, {
          cart: state.cart,
          guestCount: state.guestCount,
          note: state.note,
          activeOrderId: state.tableData && state.tableData.active_order_id || null,
        });
      } catch (_) {}
    }, 150);
  }

  async function restoreDraft() {
    state.cart = [];
    state.note = '';
    state.guestCount = Math.max(1, num(state.selectedTable && state.selectedTable.capacity, 1));
    var key = draftKey();
    if (!key) return;
    try {
      var row = await desktop.getDraft(key);
      if (row && row.value) {
        var value = row.value;
        if (Array.isArray(value.cart)) state.cart = value.cart;
        state.note = String(value.note || '');
        state.guestCount = Math.max(1, num(value.guestCount, state.guestCount));
      }
    } catch (_) {}
  }

  function renderMetrics() {
    var metrics = state.dashboard && state.dashboard.metrics || {};
    var keys = ['active_tables', 'open_orders', 'pending_value'];
    $('#metrics').innerHTML = keys.map(function (key) {
      var row = metrics[key];
      if (!row) return '';
      return '<div class="metric"><small>' + esc(row.label || key) + '</small><b>' + esc(row.value != null ? row.value : row.raw) + '</b></div>';
    }).join('');
  }

  function renderTables() {
    var grid = $('#tableGrid');
    if (!state.tables.length) {
      grid.innerHTML = '<div class="empty-card">No tables are available for this restaurant.</div>';
      return;
    }
    grid.innerHTML = state.tables.map(function (row) {
      var status = tableStatus(row);
      var busy = status === 'occupied' || num(row.open_orders, 0) > 0;
      var cls = busy ? ' is-busy' : (status === 'cleaning' ? ' is-cleaning' : (status === 'reserved' ? ' is-reserved' : ''));
      var label = busy ? 'Occupied' : (status.charAt(0).toUpperCase() + status.slice(1));
      return '<button class="table-card' + cls + '" data-table-id="' + tableId(row) + '">' +
        '<div class="table-name">' + esc(tableName(row)) + '</div>' +
        '<div class="table-meta">' + (num(row.capacity, 0) ? esc(row.capacity) + ' seats · ' : '') + esc(num(row.open_orders, 0)) + ' open order(s)</div>' +
        '<span class="table-state">' + esc(label) + '</span>' +
      '</button>';
    }).join('');
    $$('[data-table-id]').forEach(function (button) {
      button.onclick = function () {
        var id = Number(button.dataset.tableId);
        var row = state.tables.find(function (item) { return tableId(item) === id; });
        if (row) openTable(row);
      };
    });
  }

  async function loadDashboard(force) {
    if (state.loading && !force) return;
    state.loading = true;
    $('#tableGrid').innerHTML = '<div class="empty-card">Loading restaurant floor…</div>';
    try {
      var result = await request({ path: '/admin/pmd-waiter-dashboard-v9-tenant-data', cacheKey: 'dashboard:' + state.config.tenant });
      if (!result || !result.ok) {
        if (result && result.authRequired) {
          $('#tableGrid').innerHTML = '<div class="empty-card">Sign in to load this restaurant.</div>';
        } else {
          $('#tableGrid').innerHTML = '<div class="empty-card">' + esc(result && result.message || 'Could not load tables.') + '</div>';
        }
        return;
      }
      state.dashboard = result.data || {};
      state.tables = (((state.dashboard.sections || {}).floor_plan || {}).tables) || state.dashboard.tables || ((state.dashboard.sections || {}).tables) || [];
      renderMetrics();
      renderTables();
    } catch (error) {
      $('#tableGrid').innerHTML = '<div class="empty-card">' + esc(error.message || 'Could not load tables.') + '</div>';
    } finally {
      state.loading = false;
    }
  }

  function absoluteImage(value) {
    var raw = String(value || '');
    if (!raw) return '';
    if (/^https:\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
    if (raw.charAt(0) === '/') return 'https://' + state.config.tenant + raw;
    return 'https://' + state.config.tenant + '/' + raw.replace(/^\/+/, '');
  }

  function filteredMenu() {
    var rows = state.tableData && Array.isArray(state.tableData.menu_items) ? state.tableData.menu_items : [];
    var query = state.search.trim().toLowerCase();
    return rows.filter(function (item) {
      var categoryIds = (item.category_ids || []).map(String);
      var catOk = state.category === 'all' || categoryIds.indexOf(String(state.category)) !== -1;
      var haystack = [item.name, item.description, (item.category_names || []).join(' '), (item.allergens || []).map(function (a) { return a.name; }).join(' ')].join(' ').toLowerCase();
      return catOk && (!query || haystack.indexOf(query) !== -1);
    });
  }

  function renderCategories() {
    var rows = [{ id: 'all', name: 'All' }].concat(state.tableData && state.tableData.categories || []);
    $('#categories').innerHTML = rows.map(function (row) {
      return '<button class="category' + (String(row.id) === String(state.category) ? ' is-active' : '') + '" data-category="' + esc(row.id) + '">' + esc(row.name || 'Menu') + '</button>';
    }).join('');
    $$('[data-category]').forEach(function (button) {
      button.onclick = function () { state.category = button.dataset.category; renderCategories(); renderMenu(); };
    });
  }

  function renderMenu() {
    var rows = filteredMenu();
    var grid = $('#menuGrid');
    if (!rows.length) {
      grid.innerHTML = '<div class="empty-card">No menu items match this search.</div>';
      return;
    }
    grid.innerHTML = rows.map(function (item) {
      var orderable = item.orderable !== false && item.price_configured !== false && num(item.price, 0) > 0;
      var image = absoluteImage(item.image);
      var letter = String(item.name || 'M').trim().charAt(0).toUpperCase();
      return '<button class="menu-item" data-menu-id="' + esc(item.id) + '"' + (orderable ? '' : ' disabled') + '>' +
        '<div class="menu-image">' + (image ? '<img src="' + esc(image) + '" alt="" loading="lazy">' : esc(letter)) + '</div>' +
        '<div class="menu-body"><b>' + esc(item.name || 'Menu item') + '</b><small>' + esc(item.description || (item.category_names || []).join(' · ')) + '</small>' +
        '<div class="menu-price"><span>' + money(item.price) + '</span><span>' + ((item.options || []).length ? 'Options +' : '+ Add') + '</span></div></div>' +
      '</button>';
    }).join('');
    $$('[data-menu-id]').forEach(function (button) {
      button.onclick = function () {
        var id = String(button.dataset.menuId);
        var item = (state.tableData.menu_items || []).find(function (row) { return String(row.id) === id; });
        if (item) openModifier(item);
      };
    });
  }

  function lineUnit(line) {
    return num(line.price, 0) + (line.options || []).reduce(function (sum, option) { return sum + num(option.price, 0); }, 0);
  }
  function cartTotal() { return state.cart.reduce(function (sum, line) { return sum + lineUnit(line) * num(line.quantity, 1); }, 0); }

  function renderExistingOrder() {
    var order = activeOrder();
    var node = $('#existingOrder');
    if (!order) { node.hidden = true; node.innerHTML = ''; return; }
    node.hidden = false;
    node.innerHTML = '<b>Existing order #' + esc(order.order_id) + '</b><br>' + money(order.total || order.order_total || 0) + ' · ' + esc(order.status || order.status_label || 'Open');
  }

  function renderCart() {
    var container = $('#cartLines');
    $('#cartEmpty').hidden = state.cart.length > 0;
    container.innerHTML = state.cart.map(function (line, index) {
      var options = (line.options || []).map(function (row) { return row.name; }).join(', ');
      return '<div class="cart-line" data-line="' + index + '"><div class="line-main"><b>' + esc(line.name) + '</b><b>' + money(lineUnit(line) * line.quantity) + '</b></div>' +
        (options ? '<div class="line-options">' + esc(options) + '</div>' : '') +
        (line.comment ? '<div class="line-options">Note: ' + esc(line.comment) + '</div>' : '') +
        '<div class="line-foot"><div class="stepper"><button data-minus="' + index + '">−</button><span>' + esc(line.quantity) + '</span><button data-plus="' + index + '">+</button></div><button class="line-remove" data-remove="' + index + '">Remove</button></div></div>';
    }).join('');
    $('#cartTotal').textContent = money(cartTotal());
    $('#guestInput').value = state.guestCount;
    $('#noteInput').value = state.note;
    $$('[data-minus]').forEach(function (button) { button.onclick = function () { changeQty(Number(button.dataset.minus), -1); }; });
    $$('[data-plus]').forEach(function (button) { button.onclick = function () { changeQty(Number(button.dataset.plus), 1); }; });
    $$('[data-remove]').forEach(function (button) { button.onclick = function () { state.cart.splice(Number(button.dataset.remove), 1); renderCart(); saveDraftSoon(); }; });
    updateActionState();
  }

  function changeQty(index, delta) {
    var line = state.cart[index];
    if (!line) return;
    line.quantity = Math.max(0, num(line.quantity, 1) + delta);
    if (line.quantity < 1) state.cart.splice(index, 1);
    renderCart();
    saveDraftSoon();
  }

  function openModifier(item) {
    state.modifierItem = item;
    var groups = item.options || [];
    var html = '<div class="modifier-hero"><div><h2>' + esc(item.name || 'Menu item') + '</h2><p>' + esc(item.description || '') + '</p><b>' + money(item.price) + '</b></div></div>';
    groups.forEach(function (group) {
      var type = num(group.max, 1) === 1 ? 'radio' : 'checkbox';
      html += '<div class="option-group" data-option-group="' + esc(group.id) + '" data-min="' + esc(group.min || (group.required ? 1 : 0)) + '" data-max="' + esc(group.max || 1) + '"><h4>' + esc(group.name || 'Options') + (group.required ? ' · Required' : '') + '</h4>';
      (group.values || []).forEach(function (value) {
        html += '<div class="option-row"><label><input type="' + type + '" name="opt-' + esc(group.id) + '" value="' + esc(value.id) + '" data-name="' + esc(value.name) + '" data-price="' + esc(value.price || 0) + '"' + (value.default ? ' checked' : '') + '> ' + esc(value.name || 'Option') + '</label><b>' + (num(value.price, 0) ? '+' + money(value.price) : '') + '</b></div>';
      });
      html += '</div>';
    });
    html += '<div class="modifier-bottom"><label><small>Item note</small><textarea id="modifierNote" maxlength="500" placeholder="Optional note…"></textarea></label><label><small>Qty</small><input id="modifierQty" type="number" min="1" max="99" value="1"></label><button id="modifierAdd">Add item</button></div>';
    $('#modifierContent').innerHTML = html;
    $('#modifierModal').hidden = false;
    $('#modifierAdd').onclick = addModifiedItem;
  }

  function closeModifier() { $('#modifierModal').hidden = true; state.modifierItem = null; }

  function addModifiedItem() {
    var item = state.modifierItem;
    if (!item) return;
    var selected = [];
    var valid = true;
    $$('#modifierContent [data-option-group]').forEach(function (group) {
      var checked = Array.prototype.slice.call(group.querySelectorAll('input:checked'));
      var min = num(group.dataset.min, 0);
      var max = num(group.dataset.max, 99);
      if (checked.length < min || checked.length > max) valid = false;
      checked.forEach(function (input) { selected.push({ id: Number(input.value), name: input.dataset.name || 'Option', price: num(input.dataset.price, 0) }); });
    });
    if (!valid) return toast('Please complete the required options.', true);
    state.cart.push({
      menu_id: Number(item.id),
      name: item.name || 'Item',
      price: num(item.price, 0),
      quantity: Math.max(1, num($('#modifierQty').value, 1)),
      comment: String($('#modifierNote').value || ''),
      options: selected,
    });
    closeModifier();
    renderCart();
    saveDraftSoon();
  }

  async function openTable(row) {
    state.selectedTable = row;
    state.tableData = null;
    state.category = 'all';
    state.search = '';
    $('#floorView').hidden = true;
    $('#posView').hidden = false;
    $('#tableTitle').textContent = tableName(row);
    $('#tableMeta').textContent = 'Table ' + tableNumber(row) + (row.capacity ? ' · ' + row.capacity + ' seats' : '');
    $('#menuGrid').innerHTML = '<div class="empty-card">Loading menu…</div>';
    $('#categories').innerHTML = '';
    $('#orderStatus').textContent = 'Loading…';
    $('#offlineHelp').hidden = state.online !== false;

    var id = tableId(row);
    var result = await request({ path: '/admin/pmd-waiter-pos-v1/data/' + encodeURIComponent(id), cacheKey: 'table:' + state.config.tenant + ':' + id });
    if (!result || !result.ok) {
      $('#menuGrid').innerHTML = '<div class="empty-card">' + esc(result && result.message || 'Could not load this table.') + '</div>';
      return;
    }
    state.tableData = result.data || {};
    await restoreDraft();
    var order = activeOrder();
    $('#orderStatus').textContent = order ? 'Open order #' + order.order_id : 'New draft';
    renderExistingOrder();
    renderCategories();
    renderMenu();
    renderCart();
  }

  function closeTable() {
    state.selectedTable = null;
    state.tableData = null;
    state.cart = [];
    $('#posView').hidden = true;
    $('#floorView').hidden = false;
    $('#offlineHelp').hidden = true;
    loadDashboard(true);
  }

  function updateActionState() {
    var hasCart = state.cart.length > 0;
    var online = state.online !== false;
    $('#holdBtn').disabled = !hasCart;
    $('#sendBtn').disabled = !hasCart;
    $('#holdBtn').textContent = online ? 'Save / Hold' : 'Save locally';
    $('#sendBtn').textContent = online ? 'Send to kitchen' : 'Save draft offline';
    var order = activeOrder();
    $('#paymentBtn').disabled = !order || !online;
    $('#printBtn').disabled = !order || !online;
  }

  async function saveOrder(mode) {
    if (!state.cart.length || !state.tableData) return;
    if (state.online === false) {
      await desktop.saveDraft(draftKey(), { cart: state.cart, guestCount: state.guestCount, note: state.note, activeOrderId: state.tableData.active_order_id || null });
      toast('Draft saved on this computer. It was NOT sent to the kitchen.');
      return;
    }
    var order = activeOrder();
    var url = state.tableData.settings && state.tableData.settings.save_url;
    if (!url) return toast('Order save URL is unavailable.', true);
    $('#holdBtn').disabled = true;
    $('#sendBtn').disabled = true;
    var result = await request({
      path: url,
      method: 'POST',
      body: {
        mode: mode,
        order_id: state.tableData.active_order_id || null,
        expected_updated_at: order ? order.updated_at : null,
        guest_count: state.guestCount,
        note: state.note,
        items: state.cart.map(function (line) {
          return { menu_id: line.menu_id, quantity: line.quantity, comment: line.comment || '', options: (line.options || []).map(function (option) { return option.id; }) };
        }),
      },
    });
    if (!result || !result.ok) {
      updateActionState();
      return toast(result && result.message || 'Could not save the order.', true);
    }
    state.cart = [];
    state.note = '';
    await desktop.deleteDraft(draftKey());
    toast((result.data && result.data.message) || 'Order saved.');
    await openTable(state.selectedTable);
  }

  async function openPayment() {
    var order = activeOrder();
    if (!order) return toast('There is no active order to pay.', true);
    if (state.online === false) return toast('Payments require an internet connection.', true);
    $('#paymentModal').hidden = false;
    $('#paymentContent').innerHTML = '<div class="loading">Loading secure payment state…</div>';
    $('#paymentTitle').textContent = 'Order #' + order.order_id;
    var template = state.tableData.settings && state.tableData.settings.payment_summary_url || '/admin/pmd-waiter-pos-v1/payment-summary/{order}';
    var path = template.replace('{order}', encodeURIComponent(order.order_id));
    var result = await request({ path: path, cacheKey: 'payment:' + state.config.tenant + ':' + order.order_id });
    if (!result || !result.ok) {
      $('#paymentContent').innerHTML = '<div class="loading">' + esc(result && result.message || 'Could not load payment.') + '</div>';
      return;
    }
    state.paymentSummary = result.data;
    renderPayment();
  }

  function paymentRemaining() {
    return num(state.paymentSummary && state.paymentSummary.settlement && state.paymentSummary.settlement.remaining_amount, 0);
  }

  function renderPayment() {
    var summary = state.paymentSummary || {};
    var settlement = summary.settlement || {};
    var remaining = num(settlement.remaining_amount, 0);
    var total = num(settlement.order_total, 0);
    var settled = Math.max(0, total - remaining);
    if (remaining <= 0.005) {
      $('#paymentContent').innerHTML = '<div class="payment-box"><h3>Paid</h3><p>This order is already fully paid.</p></div>';
      return;
    }
    $('#paymentContent').innerHTML = '<div class="payment-summary">' +
      '<div class="payment-stat"><small>Order total</small><b>' + money(total) + '</b></div>' +
      '<div class="payment-stat"><small>Already paid</small><b>' + money(settled) + '</b></div>' +
      '<div class="payment-stat"><small>Remaining</small><b>' + money(remaining) + '</b></div>' +
      '</div>' +
      '<div class="payment-box"><h3>Cash</h3><div class="payment-grid">' +
      '<label class="field"><span>Cash received</span><input id="cashReceived" type="number" min="' + remaining.toFixed(2) + '" step="0.01" value="' + remaining.toFixed(2) + '"></label>' +
      '<label class="field"><span>Tip</span><input id="tipAmount" type="number" min="0" step="0.01" value="0.00"></label>' +
      '</div><button class="pay-cash" id="payCashBtn">Record cash payment · ' + money(remaining) + '</button></div>' +
      '<button class="pay-card" id="providerPaymentBtn">Card / terminal / online provider</button>' +
      '<div class="payment-warning">Cash is settled by the PayMyDine server with an idempotency key. Card/provider flows stay on the canonical secure payment surface and are never marked paid just because a browser returned.</div>';
    $('#payCashBtn').onclick = settleCash;
    $('#providerPaymentBtn').onclick = function () {
      closePayment();
      desktop.openCompatibility('/admin/waiter-pos/' + encodeURIComponent(tableNumber(state.selectedTable)));
    };
  }

  async function settleCash() {
    var order = activeOrder();
    var summary = state.paymentSummary || {};
    var remaining = paymentRemaining();
    if (!order || remaining <= 0) return;
    var cash = num($('#cashReceived').value, remaining);
    var tip = Math.max(0, num($('#tipAmount').value, 0));
    if (cash + 0.001 < remaining + tip) return toast('Cash received is lower than the amount due plus tip.', true);
    var template = state.tableData.settings && state.tableData.settings.payment_settle_url || '/admin/pmd-waiter-pos-v1/payment-settle/{order}';
    var path = template.replace('{order}', encodeURIComponent(order.order_id));
    $('#payCashBtn').disabled = true;
    var result = await request({
      path: path,
      method: 'POST',
      body: {
        idempotency_key: uid('desktop-cash'),
        payment_method: 'cash',
        split_mode: 'full',
        expected_remaining: remaining,
        expected_updated_at: summary.order && summary.order.updated_at || order.updated_at || '',
        tip_amount: tip,
        cash_received: cash,
        payer_label: 'Cashier Desktop',
      },
    });
    if (!result || !result.ok) {
      $('#payCashBtn').disabled = false;
      return toast(result && result.message || 'Payment could not be recorded.', true);
    }
    var data = result.data || {};
    toast(data.message || 'Cash payment completed.');
    if (data.receipt_url && state.config && state.config.printerName) {
      desktop.printReceiptUrl(data.receipt_url).catch(function () {});
    }
    closePayment();
    await openTable(state.selectedTable);
  }

  function closePayment() { $('#paymentModal').hidden = true; state.paymentSummary = null; }

  async function printCurrent() {
    var order = activeOrder();
    if (!order) return toast('No active order to print.', true);
    try {
      await desktop.printReceiptUrl('/admin/pmd-cashier-order-center/invoice/' + encodeURIComponent(order.order_id));
      toast('Invoice sent to the configured printer.');
    } catch (error) {
      toast(error.message || 'Printing failed.', true);
    }
  }

  async function refresh() {
    if ($('#posView').hidden) return loadDashboard(true);
    if (state.selectedTable) return openTable(state.selectedTable);
  }

  function bind() {
    $('#backBtn').onclick = closeTable;
    $('#refreshBtn').onclick = refresh;
    $('#loginBtn').onclick = function () { desktop.openLogin(); };
    $('#hardwareBtn').onclick = function () { desktop.openHardwareSetup(); };
    $('#restaurantBtn').onclick = function () { desktop.resetTenant(); };
    $('#paymentBtn').onclick = openPayment;
    $('#printBtn').onclick = printCurrent;
    $('#searchInput').oninput = function () { state.search = $('#searchInput').value; renderMenu(); };
    $('#guestInput').oninput = function () { state.guestCount = Math.max(1, Math.min(99, num($('#guestInput').value, 1))); saveDraftSoon(); };
    $('#noteInput').oninput = function () { state.note = $('#noteInput').value; saveDraftSoon(); };
    $('#clearCartBtn').onclick = function () { state.cart = []; state.note = ''; renderCart(); saveDraftSoon(); };
    $('#holdBtn').onclick = function () { saveOrder('hold'); };
    $('#sendBtn').onclick = function () { saveOrder('send'); };
    $$('[data-close-modal]').forEach(function (button) { button.onclick = closeModifier; });
    $$('[data-close-payment]').forEach(function (button) { button.onclick = closePayment; });
    $('#modifierModal').onclick = function (event) { if (event.target === $('#modifierModal')) closeModifier(); };
    $('#paymentModal').onclick = function (event) { if (event.target === $('#paymentModal')) closePayment(); };
    $$('[data-view]').forEach(function (button) {
      button.onclick = function () {
        var view = button.dataset.view;
        if (view === 'cashier') {
          $$('.nav-item').forEach(function (row) { row.classList.remove('is-active'); });
          button.classList.add('is-active');
          $('#pageTitle').textContent = 'Cashier';
          if (!$('#posView').hidden) closeTable(); else loadDashboard(true);
          return;
        }
        if (view === 'orders') desktop.openCompatibility('/admin/orders');
        if (view === 'kds') desktop.openCompatibility('/admin/kitchendisplay/main-kitchen');
      };
    });

    desktop.onConnectivity(setConnectivity);
    desktop.onAuthChanged(function () {
      setConnectivity({ online: true, authenticated: true });
      setNotice('');
      refresh();
    });
    desktop.onHardwareEvent(function (event) {
      if (!event) return;
      if (event.type === 'cash-drawer-opened') toast('Cash drawer opened.');
      if (event.type === 'cash-drawer-error') toast('Payment succeeded, but the cash drawer could not open: ' + event.message, true);
    });

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!$('#paymentModal').hidden) closePayment();
        else if (!$('#modifierModal').hidden) closeModifier();
        else if (!$('#posView').hidden) closeTable();
      }
    });
  }

  async function boot() {
    bind();
    state.config = await desktop.getConfig();
    $('#tenantLabel').textContent = state.config.tenant || 'Restaurant not configured';
    $('#versionLabel').textContent = 'v' + (state.config.appVersion || '1.1.0') + ' · Real App';
    var connectivity = await desktop.checkOnline();
    setConnectivity(connectivity);
    await loadDashboard(true);
    setInterval(function () { desktop.checkOnline().then(setConnectivity).catch(function () {}); }, 15000);
  }

  boot().catch(function (error) {
    toast(error.message || 'PayMyDine Cashier could not start.', true);
  });
})();
