(function () {
  'use strict';
  if (window.PMDWaiterStandardV22) return;

  var activePos = null;
  var activeRoot = null;
  var operations = null;
  var paymentObserver = null;
  var posObserver = null;
  var applyingPayment = false;
  var state = {
    version: 'pmd-waiter-standard-v2.2',
    installed: 0,
    operationsLoads: 0,
    operationsWrites: 0,
    paymentPatches: 0,
    splitMethod: 'full',
    lastError: ''
  };

  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
  function num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  function money(value) { var symbol = activePos && activePos.state && activePos.state.settings ? (activePos.state.settings.currency || '€') : '€'; return symbol + num(value, 0).toFixed(2); }
  function $(selector, root) { return (root || activeRoot || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || activeRoot || document).querySelectorAll(selector)); }
  function csrf() { var meta = document.querySelector('meta[name="csrf-token"]'); return meta ? meta.content : ''; }
  function activeOrder() {
    if (!activePos || !activePos.state) return null;
    var s = activePos.state;
    if (s.activeOrderId) {
      return (s.openOrders || []).find(function (row) { return String(row.order_id) === String(s.activeOrderId); }) || null;
    }
    return (s.openOrders || [])[0] || null;
  }
  function activeOrderId() { var order = activeOrder(); return order ? Number(order.order_id) : Number(activePos && activePos.state && activePos.state.activeOrderId || 0); }

  async function json(url, options) {
    var opts = options || {};
    opts.credentials = 'same-origin';
    opts.cache = 'no-store';
    opts.headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }, opts.headers || {});
    if (opts.body && typeof opts.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['X-CSRF-TOKEN'] = csrf();
      opts.body = JSON.stringify(opts.body);
    }
    var response = await fetch(url, opts);
    var payload;
    try { payload = await response.json(); } catch (error) { payload = {ok:false, message:'HTTP ' + response.status}; }
    if (!response.ok || payload.ok === false) {
      var err = new Error(payload.message || ('HTTP ' + response.status));
      err.status = response.status;
      err.payload = payload;
      throw err;
    }
    return payload;
  }

  function toast(message, bad) {
    if (activePos && typeof activePos.toast === 'function') return activePos.toast(message, bad);
    var host = document.querySelector('[data-v2-toast]');
    if (!host) return;
    host.textContent = message;
    host.classList.toggle('is-error', !!bad);
    host.classList.add('is-show');
    clearTimeout(host._pmdV22Timer);
    host._pmdV22Timer = setTimeout(function () { host.classList.remove('is-show'); }, 2800);
  }

  function orderBase() {
    var id = activeOrderId();
    return '/admin/pmd-waiter-pos-v22/operations/' + id;
  }

  async function loadOperations(force) {
    var id = activeOrderId();
    if (!id) throw new Error('Send or hold the order before using check operations.');
    if (operations && !force && Number(operations.order && operations.order.order_id) === id) return operations;
    operations = await json(orderBase() + '?_=' + Date.now());
    state.operationsLoads += 1;
    return operations;
  }

  async function postAction(path, body) {
    var payload = await json(orderBase() + '/' + path, {method:'POST', body:body || {}});
    state.operationsWrites += 1;
    if (payload.summary) operations = payload.summary;
    toast(payload.message || 'Operation completed');
    window.dispatchEvent(new CustomEvent('pmd:waiter-pos-order-updated', {detail:{source:'v22-operations'}}));
    if (activePos && typeof activePos.refresh === 'function') {
      try { await activePos.refresh(true); } catch (ignored) {}
    }
    return payload;
  }

  function ensureOperationsModal() {
    var modal = $('[data-v22-operations-modal]');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'pmd-v22-operations-modal';
    modal.setAttribute('data-v22-operations-modal', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = [
      '<div class="pmd-v22-operations-dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-v22-operations-title">',
        '<header><div><small>CHECK OPERATIONS</small><h2 id="pmd-v22-operations-title">Table service tools</h2><p data-v22-operation-subtitle></p></div><button type="button" data-v22-close aria-label="Close">×</button></header>',
        '<nav data-v22-operation-tabs></nav>',
        '<main data-v22-operation-body><div class="pmd-v22-loading">Loading check operations…</div></main>',
      '</div>'
    ].join('');
    (activeRoot || document.body).appendChild(modal);
    modal.addEventListener('click', function (event) { if (event.target === modal || event.target.closest('[data-v22-close]')) closeOperations(); });
    return modal;
  }

  function closeOperations() {
    var modal = $('[data-v22-operations-modal]');
    if (!modal) return;
    modal.classList.remove('is-show');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function openOperations(tab) {
    var modal = ensureOperationsModal();
    modal.classList.add('is-show');
    modal.setAttribute('aria-hidden', 'false');
    $('[data-v22-operation-body]', modal).innerHTML = '<div class="pmd-v22-loading">Loading check operations…</div>';
    try {
      await loadOperations(true);
      renderOperations(tab || 'transfer');
    } catch (error) {
      state.lastError = error.message;
      $('[data-v22-operation-body]', modal).innerHTML = '<div class="pmd-v22-error">' + esc(error.message) + '<button type="button" data-v22-retry>RETRY</button></div>';
      var retry = $('[data-v22-retry]', modal);
      if (retry) retry.onclick = function () { openOperations(tab); };
    }
  }

  function renderTabs(active) {
    var modal = ensureOperationsModal();
    var tabs = $('[data-v22-operation-tabs]', modal);
    var rows = [
      ['transfer','CHANGE TABLE'],
      ['merge','MERGE / MOVE'],
      ['service','SEATS / COURSES'],
      ['void','VOID / CANCEL'],
      ['print','PRINT / REOPEN']
    ];
    tabs.innerHTML = rows.map(function (row) {
      var disabled = row[0] === 'void' && !(operations.permissions && operations.permissions.can_void);
      return '<button type="button" data-v22-tab="' + row[0] + '" class="' + (row[0] === active ? 'is-active' : '') + '" ' + (disabled ? 'disabled title="Manager permission required"' : '') + '>' + row[1] + '</button>';
    }).join('');
    $$('[data-v22-tab]', tabs).forEach(function (button) { button.onclick = function () { renderOperations(button.dataset.v22Tab); }; });
  }

  function renderOperations(active) {
    var modal = ensureOperationsModal();
    renderTabs(active);
    var order = operations.order || {};
    var table = operations.table || {};
    $('[data-v22-operation-subtitle]', modal).textContent = 'Order #' + order.order_id + ' · ' + (table.name || 'Table') + ' · ' + money(order.order_total);
    var body = $('[data-v22-operation-body]', modal);
    if (active === 'transfer') body.innerHTML = transferHtml();
    else if (active === 'merge') body.innerHTML = mergeHtml();
    else if (active === 'service') body.innerHTML = serviceHtml();
    else if (active === 'void') body.innerHTML = voidHtml();
    else body.innerHTML = printHtml();
    bindOperationBody(active, body);
  }

  function transferHtml() {
    var currentId = Number(operations.table && operations.table.id || 0);
    var options = (operations.tables || []).filter(function (t) { return Number(t.id) !== currentId; }).map(function (t) {
      return '<option value="' + t.id + '">' + esc(t.name) + (t.status ? ' · ' + esc(t.status) : '') + '</option>';
    }).join('');
    return '<section class="pmd-v22-panel"><h3>Change table</h3><p>Move this complete check to another physical table. Paid checks are protected.</p><label>Destination table<select data-v22-target-table><option value="">Choose table…</option>' + options + '</select></label><button class="pmd-v22-primary" type="button" data-v22-transfer>MOVE CHECK</button></section>';
  }

  function checkLabel(row) {
    var table = row.table || {};
    return (table.name || ('Order #' + row.order_id)) + ' · #' + row.order_id + ' · ' + money(row.total) + ' · ' + row.items + ' items';
  }

  function mergeHtml() {
    var options = (operations.open_checks || []).map(function (row) { return '<option value="' + row.order_id + '">' + esc(checkLabel(row)) + '</option>'; }).join('');
    var items = (operations.items || []).filter(function (row) { return num(row.quantity, 0) > 0; }).map(function (row) {
      return '<label class="pmd-v22-item-pick"><input type="checkbox" data-v22-move-item value="' + row.order_menu_id + '"><span><b>' + esc(row.name) + '</b><small>' + row.quantity + ' · ' + money(row.subtotal) + '</small></span><input type="number" data-v22-move-qty="' + row.order_menu_id + '" min="0.001" max="' + row.quantity + '" step="0.001" value="' + row.quantity + '"></label>';
    }).join('');
    return [
      '<div class="pmd-v22-two-columns">',
        '<section class="pmd-v22-panel"><h3>Merge complete check</h3><p>Moves every unpaid item from another open check into this one.</p><label>Source check<select data-v22-source-order><option value="">Choose open check…</option>' + options + '</select></label><button class="pmd-v22-primary" type="button" data-v22-merge>MERGE CHECK</button></section>',
        '<section class="pmd-v22-panel"><h3>Move selected items</h3><p>Move full or partial quantities to another unpaid check.</p><label>Destination check<select data-v22-target-order><option value="">Choose open check…</option>' + options + '</select></label><div class="pmd-v22-item-list">' + items + '</div><button class="pmd-v22-primary" type="button" data-v22-move-items>MOVE SELECTED ITEMS</button></section>',
      '</div>'
    ].join('');
  }

  function serviceHtml() {
    var rows = (operations.items || []).filter(function (row) { return num(row.quantity, 0) > 0; }).map(function (row) {
      return '<article class="pmd-v22-service-row" data-v22-service-row="' + row.order_menu_id + '"><div><b>' + esc(row.name) + '</b><small>Qty ' + row.quantity + (row.voided_quantity ? ' · Voided ' + row.voided_quantity : '') + '</small></div><label>Seat<input type="number" min="1" max="99" data-v22-seat value="' + (row.seat_no || '') + '"></label><label>Course<select data-v22-course><option value="">—</option>' + [1,2,3,4,5,6].map(function (n) { return '<option value="' + n + '" ' + (Number(row.course_no) === n ? 'selected' : '') + '>Course ' + n + '</option>'; }).join('') + '</select></label><label>Status<select data-v22-course-status><option value="held" ' + (row.course_status === 'held' ? 'selected' : '') + '>HOLD</option><option value="fired" ' + (row.course_status === 'fired' ? 'selected' : '') + '>FIRE NOW</option><option value="served" ' + (row.course_status === 'served' ? 'selected' : '') + '>SERVED</option></select></label></article>';
    }).join('');
    return '<section class="pmd-v22-panel"><h3>Seat and course control</h3><p>Assign each item to a guest/seat and control when the kitchen should fire its course.</p><div class="pmd-v22-service-list">' + rows + '</div><button class="pmd-v22-primary" type="button" data-v22-save-service>SAVE SEATS & COURSES</button></section>';
  }

  function voidHtml() {
    var options = (operations.items || []).filter(function (row) { return num(row.quantity, 0) > 0; }).map(function (row) { return '<option value="' + row.order_menu_id + '" data-max="' + row.quantity + '">' + esc(row.name) + ' · qty ' + row.quantity + '</option>'; }).join('');
    return '<div class="pmd-v22-two-columns"><section class="pmd-v22-panel is-danger"><h3>Void item</h3><p>Requires manager permission and stores the reason in the audit log.</p><label>Item<select data-v22-void-item><option value="">Choose item…</option>' + options + '</select></label><label>Quantity<input type="number" data-v22-void-qty min="0.001" step="0.001" value="1"></label><label>Reason<select data-v22-void-reason><option value="">Choose reason…</option><option>Customer changed mind</option><option>Wrong item</option><option>Kitchen unavailable</option><option>Duplicate item</option><option>Manager correction</option></select></label><button class="pmd-v22-danger" type="button" data-v22-void-item-submit>VOID ITEM</button></section><section class="pmd-v22-panel is-danger"><h3>Cancel complete order</h3><p>Only available before any payment has been recorded.</p><label>Reason<textarea data-v22-cancel-reason placeholder="Required reason"></textarea></label><label class="pmd-v22-confirm"><input type="checkbox" data-v22-cancel-confirm> I understand this cancels the complete check.</label><button class="pmd-v22-danger" type="button" data-v22-cancel-order>CANCEL ORDER</button></section></div>';
  }

  function printHtml() {
    var canReopen = operations.permissions && operations.permissions.can_reopen;
    return '<div class="pmd-v22-two-columns"><section class="pmd-v22-panel"><h3>Print and reprint</h3><p>Open the required production print view in a new tab.</p><button type="button" data-v22-print="guest">PRINT GUEST BILL</button><button type="button" data-v22-print="kitchen">REPRINT KITCHEN TICKET</button><button type="button" data-v22-print="order">OPEN ORDER RECORD</button></section><section class="pmd-v22-panel"><h3>Reopen check</h3><p>A paid check must be refunded first. Reopen is restricted to authorized staff.</p><button type="button" class="pmd-v22-primary" data-v22-reopen ' + (canReopen ? '' : 'disabled') + '>REOPEN CHECK</button></section></div>';
  }

  function busy(button, on) { if (!button) return; button.disabled = !!on; button.classList.toggle('is-busy', !!on); }

  function bindOperationBody(active, body) {
    if (active === 'transfer') {
      var transfer = $('[data-v22-transfer]', body);
      transfer.onclick = async function () {
        var target = $('[data-v22-target-table]', body).value;
        if (!target) return toast('Choose a destination table.', true);
        busy(transfer, true);
        try { await postAction('transfer', {target_table_id:Number(target), expected_updated_at:operations.order.updated_at}); renderOperations('transfer'); }
        catch (error) { toast(error.message, true); } finally { busy(transfer, false); }
      };
    }
    if (active === 'merge') {
      var merge = $('[data-v22-merge]', body);
      merge.onclick = async function () {
        var source = $('[data-v22-source-order]', body).value;
        if (!source) return toast('Choose a source check.', true);
        if (!window.confirm('Merge the complete source check into this order?')) return;
        busy(merge, true);
        try { await postAction('merge', {source_order_id:Number(source), expected_updated_at:operations.order.updated_at}); renderOperations('merge'); }
        catch (error) { toast(error.message, true); } finally { busy(merge, false); }
      };
      var move = $('[data-v22-move-items]', body);
      move.onclick = async function () {
        var target = $('[data-v22-target-order]', body).value;
        var items = $$('[data-v22-move-item]:checked', body).map(function (input) {
          var qty = $('[data-v22-move-qty="' + input.value + '"]', body);
          return {order_menu_id:Number(input.value), quantity:num(qty && qty.value, 0)};
        }).filter(function (row) { return row.quantity > 0; });
        if (!target || !items.length) return toast('Choose a destination and items.', true);
        busy(move, true);
        try { await postAction('move-items', {target_order_id:Number(target), items:items}); renderOperations('merge'); }
        catch (error) { toast(error.message, true); } finally { busy(move, false); }
      };
    }
    if (active === 'service') {
      var save = $('[data-v22-save-service]', body);
      save.onclick = async function () {
        var items = $$('[data-v22-service-row]', body).map(function (row) {
          return {
            order_menu_id:Number(row.dataset.v22ServiceRow),
            seat_no:num($('[data-v22-seat]', row).value, 0),
            course_no:num($('[data-v22-course]', row).value, 0),
            course_status:$('[data-v22-course-status]', row).value
          };
        });
        busy(save, true);
        try { await postAction('item-service', {items:items}); renderOperations('service'); }
        catch (error) { toast(error.message, true); } finally { busy(save, false); }
      };
    }
    if (active === 'void') {
      var select = $('[data-v22-void-item]', body);
      var qty = $('[data-v22-void-qty]', body);
      select.onchange = function () { var option = select.options[select.selectedIndex]; qty.max = option ? option.dataset.max || '1' : '1'; };
      var voidButton = $('[data-v22-void-item-submit]', body);
      voidButton.onclick = async function () {
        var reason = $('[data-v22-void-reason]', body).value;
        if (!select.value || !reason || num(qty.value, 0) <= 0) return toast('Choose item, quantity and reason.', true);
        if (!window.confirm('Void this item quantity?')) return;
        busy(voidButton, true);
        try { await postAction('void-item', {order_menu_id:Number(select.value), quantity:num(qty.value, 0), reason:reason}); renderOperations('void'); }
        catch (error) { toast(error.message, true); } finally { busy(voidButton, false); }
      };
      var cancel = $('[data-v22-cancel-order]', body);
      cancel.onclick = async function () {
        var reason = clean($('[data-v22-cancel-reason]', body).value);
        if (!reason || !$('[data-v22-cancel-confirm]', body).checked) return toast('Enter a reason and confirm cancellation.', true);
        if (!window.confirm('Cancel the complete order?')) return;
        busy(cancel, true);
        try { await postAction('void-order', {reason:reason}); closeOperations(); }
        catch (error) { toast(error.message, true); } finally { busy(cancel, false); }
      };
    }
    if (active === 'print') {
      $$('[data-v22-print]', body).forEach(function (button) {
        button.onclick = async function () {
          try {
            var links = await json(orderBase() + '/print-links');
            var key = button.dataset.v22Print;
            var url = key === 'guest' ? links.guest_bill_url : (key === 'kitchen' ? links.kitchen_ticket_url : links.order_url);
            window.open(url, '_blank', 'noopener');
          } catch (error) { toast(error.message, true); }
        };
      });
      var reopen = $('[data-v22-reopen]', body);
      if (reopen) reopen.onclick = async function () {
        if (!window.confirm('Reopen this check?')) return;
        busy(reopen, true);
        try { await postAction('reopen', {}); renderOperations('print'); }
        catch (error) { toast(error.message, true); } finally { busy(reopen, false); }
      };
    }
  }

  function addMoreActions() {
    if (!activeRoot) return;
    var menu = $('.pmd-v21-more-menu');
    if (!menu || menu.querySelector('[data-v22-operation="transfer"]')) return;
    [
      ['transfer','CHANGE TABLE'],
      ['merge','MERGE / MOVE'],
      ['service','SEATS / COURSES'],
      ['void','VOID / CANCEL'],
      ['print','PRINT / REOPEN']
    ].forEach(function (row) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-v22-more-action';
      button.dataset.v22Operation = row[0];
      button.textContent = row[1];
      button.onclick = function () { menu.hidden = true; openOperations(row[0]); };
      menu.appendChild(button);
    });
    state.installed += 1;
  }

  function splitStorageKey(orderId) { return 'pmd-v22-split-plan:' + location.host + ':' + orderId; }
  function loadSplitPlan(orderId, guests) {
    var fallback = {guests:guests, shares:[], assignments:{}, payerIndex:0};
    try { fallback = Object.assign(fallback, JSON.parse(sessionStorage.getItem(splitStorageKey(orderId)) || '{}')); } catch (ignored) {}
    fallback.guests = Math.max(2, guests);
    while (fallback.shares.length < fallback.guests) fallback.shares.push(Math.floor(100 / fallback.guests));
    fallback.shares = fallback.shares.slice(0, fallback.guests);
    var total = fallback.shares.reduce(function (s, v) { return s + num(v, 0); }, 0);
    if (total !== 100) fallback.shares[0] += 100 - total;
    return fallback;
  }
  function saveSplitPlan(orderId, plan) { try { sessionStorage.setItem(splitStorageKey(orderId), JSON.stringify(plan)); } catch (ignored) {} }

  function paymentSummary() { return activePos && activePos.state && activePos.state.payment ? activePos.state.payment.summary : null; }
  function paymentState() { return activePos && activePos.state ? activePos.state.payment : null; }
  function guestCount() { return Math.max(2, num(activePos && activePos.state && activePos.state.guestCount, 2)); }

  function fireInput(input, value) {
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function patchPaymentCoverage(modal) {
    if (!modal || applyingPayment || modal.getAttribute('aria-hidden') === 'true') return;
    var tabs = $('[data-pos-split-tabs]', modal);
    var panel = $('[data-pos-split-panel]', modal);
    var payment = paymentState();
    var summary = paymentSummary();
    if (!tabs || !panel || !payment || !summary) return;
    applyingPayment = true;
    try {
      var full = $('[data-split-mode="full"]', tabs);
      var equal = $('[data-split-mode="equal"]', tabs);
      var items = $('[data-split-mode="items"]', tabs);
      var custom = $('[data-split-mode="custom"], [data-split-mode="shares"]', tabs);
      if (custom) { custom.textContent = 'BY SHARES'; custom.setAttribute('data-v22-visible-mode', 'shares'); }
      if (equal) equal.textContent = 'EQUALLY';
      if (items) items.textContent = 'BY ITEMS';
      if (full) { full.hidden = true; full.setAttribute('aria-hidden', 'true'); }

      var block = tabs.closest('.pmd-pos-payment-block');
      var title = block && block.querySelector('.pmd-pos-payment-block-title');
      if (title) title.innerHTML = '<b>Payment coverage</b><span>Pay in full or use the same three split methods as customer checkout</span>';
      var fullKey = block && block.querySelector('[data-v22-pay-full]');
      if (!fullKey && block) {
        fullKey = document.createElement('button');
        fullKey.type = 'button';
        fullKey.className = 'pmd-v22-pay-full';
        fullKey.setAttribute('data-v22-pay-full', '');
        fullKey.innerHTML = '<span><b>PAY FULL REMAINING BALANCE</b><small>Close the check when payment is confirmed</small></span><strong></strong>';
        block.insertBefore(fullKey, tabs);
        fullKey.onclick = function () { if (full) full.click(); setTimeout(function () { patchPaymentCoverage(modal); }, 0); };
      }
      if (fullKey) {
        var remaining = num(summary.settlement && summary.settlement.remaining_amount, 0);
        $('strong', fullKey).textContent = money(remaining);
        fullKey.classList.toggle('is-active', payment.splitMode === 'full');
      }
      tabs.classList.add('pmd-v22-split-tabs');

      var transactions = (summary.transactions || []).filter(function (tx) { return !/failed|cancelled/.test(clean(tx.settlement_status).toLowerCase()); });
      var progress = block && block.querySelector('[data-v22-payer-progress]');
      if (!progress && block) {
        progress = document.createElement('div');
        progress.className = 'pmd-v22-payer-progress';
        progress.setAttribute('data-v22-payer-progress', '');
        block.insertBefore(progress, panel.nextSibling);
      }
      if (progress) progress.innerHTML = '<span><b>' + transactions.length + '</b> payment' + (transactions.length === 1 ? '' : 's') + ' recorded</span><span>Remaining <b>' + money(summary.settlement.remaining_amount) + '</b></span>';

      if (payment.splitMode === 'custom' || payment.splitMode === 'shares') renderSharesPanel(panel, summary, transactions);
      if (payment.splitMode === 'items') renderItemsAssignment(panel, summary, transactions);
      if (payment.splitMode === 'equal') renderEqualProgress(panel, summary, transactions);
      state.splitMethod = payment.splitMode === 'custom' ? 'shares' : payment.splitMode;
      state.paymentPatches += 1;
    } finally {
      applyingPayment = false;
    }
  }

  function renderEqualProgress(panel, summary, transactions) {
    if (panel.querySelector('[data-v22-equal-progress]')) return;
    var people = Math.max(2, num(paymentState().equalPeople, guestCount()));
    var paid = Math.min(people, transactions.length);
    var line = document.createElement('div');
    line.className = 'pmd-v22-equal-progress';
    line.setAttribute('data-v22-equal-progress', '');
    line.innerHTML = '<b>Payer ' + Math.min(people, paid + 1) + ' of ' + people + '</b><span>' + paid + ' paid · ' + Math.max(0, people - paid) + ' remaining</span>';
    panel.appendChild(line);
    var payer = $('[data-pos-payer-label]');
    if (payer && !clean(payer.value)) fireInput(payer, 'Guest ' + Math.min(people, paid + 1));
  }

  function renderSharesPanel(panel, summary, transactions) {
    if (panel.querySelector('[data-v22-shares]')) return;
    var coreAmountInput = panel.querySelector('[data-custom-payment]');
    var orderId = Number(summary.order && summary.order.order_id || activeOrderId());
    var plan = loadSplitPlan(orderId, guestCount());
    if (transactions.length < plan.guests) plan.payerIndex = Math.max(plan.payerIndex || 0, transactions.length);
    plan.payerIndex = Math.min(plan.guests - 1, plan.payerIndex || 0);
    saveSplitPlan(orderId, plan);

    var remaining = num(summary.settlement && summary.settlement.remaining_amount, 0);
    var total = num(summary.settlement && summary.settlement.order_total, remaining);
    panel.innerHTML = '<div class="pmd-v22-shares" data-v22-shares><div class="pmd-v22-share-head"><div><b>Split by shares</b><small>Set percentages, then collect one payer at a time.</small></div><strong data-v22-share-total></strong></div><div data-v22-share-rows></div><div class="pmd-v22-share-foot"><span data-v22-share-check></span><button type="button" data-v22-next-payer>NEXT PAYER</button></div></div>';
    if (coreAmountInput) { coreAmountInput.hidden = true; panel.appendChild(coreAmountInput); }
    var rows = $('[data-v22-share-rows]', panel);
    rows.innerHTML = plan.shares.map(function (percent, index) {
      var amount = index === plan.guests - 1 ? Math.max(0, total - plan.shares.slice(0, -1).reduce(function (sum, p) { return sum + total * num(p, 0) / 100; }, 0)) : total * num(percent, 0) / 100;
      return '<button type="button" class="pmd-v22-share-row ' + (index === plan.payerIndex ? 'is-active' : '') + '" data-v22-payer="' + index + '"><span><b>Guest ' + (index + 1) + '</b><small>' + (index < transactions.length ? 'PAID / RECORDED' : (index === plan.payerIndex ? 'CURRENT PAYER' : 'WAITING')) + '</small></span><label><input type="number" min="0" max="100" step="1" data-v22-share-percent="' + index + '" value="' + num(percent, 0) + '"><i>%</i></label><strong>' + money(amount) + '</strong></button>';
    }).join('');

    function sync() {
      var percentTotal = plan.shares.reduce(function (sum, value) { return sum + num(value, 0); }, 0);
      $('[data-v22-share-total]', panel).textContent = percentTotal + '%';
      var check = $('[data-v22-share-check]', panel);
      check.textContent = percentTotal === 100 ? 'Shares total exactly 100%' : 'Shares must total 100%';
      check.classList.toggle('is-error', percentTotal !== 100);
      var currentPercent = num(plan.shares[plan.payerIndex], 0);
      var currentAmount = Math.min(remaining, Math.max(0, total * currentPercent / 100));
      paymentState().customAmount = currentAmount.toFixed(2);
      fireInput(coreAmountInput || $('[data-custom-payment]', panel), currentAmount.toFixed(2));
      var payer = $('[data-pos-payer-label]');
      if (payer) fireInput(payer, 'Guest ' + (plan.payerIndex + 1));
      saveSplitPlan(orderId, plan);
    }

    $$('[data-v22-share-percent]', panel).forEach(function (input) {
      input.addEventListener('click', function (event) { event.stopPropagation(); });
      input.addEventListener('input', function () { plan.shares[Number(input.dataset.v22SharePercent)] = Math.max(0, Math.min(100, num(input.value, 0))); sync(); });
    });
    $$('[data-v22-payer]', panel).forEach(function (button) {
      button.onclick = function (event) {
        if (event.target.closest('input')) return;
        plan.payerIndex = Number(button.dataset.v22Payer);
        saveSplitPlan(orderId, plan);
        var currentInput = panel.querySelector('[data-custom-payment]');
        panel.innerHTML = '';
        if (currentInput) panel.appendChild(currentInput);
        renderSharesPanel(panel, summary, transactions);
      };
    });
    $('[data-v22-next-payer]', panel).onclick = function () { plan.payerIndex = Math.min(plan.guests - 1, plan.payerIndex + 1); saveSplitPlan(orderId, plan); var currentInput = panel.querySelector('[data-custom-payment]'); panel.innerHTML = ''; if (currentInput) panel.appendChild(currentInput); renderSharesPanel(panel, summary, transactions); };
    sync();
  }

  function renderItemsAssignment(panel, summary, transactions) {
    if (panel.querySelector('[data-v22-item-assignment]')) return;
    var orderId = Number(summary.order && summary.order.order_id || activeOrderId());
    var plan = loadSplitPlan(orderId, guestCount());
    plan.payerIndex = Math.min(plan.guests - 1, Math.max(plan.payerIndex || 0, transactions.length));
    var coreList = panel.querySelector('.pmd-pos-split-items');
    if (!coreList) return;
    coreList.hidden = true;
    var wrap = document.createElement('div');
    wrap.className = 'pmd-v22-item-assignment';
    wrap.setAttribute('data-v22-item-assignment', '');
    var unpaid = (summary.items || []).filter(function (item) { return num(item.unpaid_quantity, 0) > 0; });
    wrap.innerHTML = '<div class="pmd-v22-payer-tabs">' + Array.from({length:plan.guests}, function (_, index) { return '<button type="button" data-v22-item-payer="' + index + '" class="' + (index === plan.payerIndex ? 'is-active' : '') + '">GUEST ' + (index + 1) + '</button>'; }).join('') + '</div><p>Tap each item to cycle its assigned guest. Open the selected payer, then record payment.</p><div class="pmd-v22-assign-list">' + unpaid.map(function (item) { var key = String(item.order_menu_id); var assigned = plan.assignments[key]; return '<button type="button" data-v22-assign-item="' + key + '"><span><b>' + esc(item.name) + '</b><small>' + item.unpaid_quantity + ' unpaid · ' + money(item.unpaid_gross) + '</small></span><strong>' + (assigned == null ? 'UNASSIGNED' : 'GUEST ' + (Number(assigned) + 1)) + '</strong></button>'; }).join('') + '</div>';
    panel.appendChild(wrap);

    function syncCore() {
      $$('[data-pay-item]', coreList).forEach(function (input) {
        var key = String(input.dataset.payItem);
        var item = unpaid.find(function (row) { return String(row.order_menu_id) === key; });
        fireInput(input, Number(plan.assignments[key]) === Number(plan.payerIndex) ? num(item && item.unpaid_quantity, 0) : 0);
      });
      var payer = $('[data-pos-payer-label]');
      if (payer) fireInput(payer, 'Guest ' + (plan.payerIndex + 1));
      saveSplitPlan(orderId, plan);
    }
    $$('[data-v22-item-payer]', wrap).forEach(function (button) { button.onclick = function () { plan.payerIndex = Number(button.dataset.v22ItemPayer); saveSplitPlan(orderId, plan); renderItemsAssignmentFresh(panel, summary, transactions); }; });
    $$('[data-v22-assign-item]', wrap).forEach(function (button) { button.onclick = function () { var key = String(button.dataset.v22AssignItem); var current = plan.assignments[key]; plan.assignments[key] = current == null ? 0 : (Number(current) + 1 >= plan.guests ? null : Number(current) + 1); saveSplitPlan(orderId, plan); renderItemsAssignmentFresh(panel, summary, transactions); }; });
    syncCore();
  }

  function renderItemsAssignmentFresh(panel, summary, transactions) {
    var old = panel.querySelector('[data-v22-item-assignment]');
    if (old) old.remove();
    var core = panel.querySelector('.pmd-pos-split-items');
    if (core) core.hidden = false;
    renderItemsAssignment(panel, summary, transactions);
  }

  function observePayment() {
    if (!activeRoot || !window.MutationObserver) return;
    var modal = $('[data-pos-payment-modal]');
    if (!modal) return;
    if (paymentObserver) paymentObserver.disconnect();
    paymentObserver = new MutationObserver(function () {
      if (applyingPayment || modal.getAttribute('aria-hidden') === 'true') return;
      requestAnimationFrame(function () { patchPaymentCoverage(modal); });
    });
    paymentObserver.observe(modal, {subtree:true, childList:true, attributes:true, attributeFilter:['class','aria-hidden']});
    if (modal.getAttribute('aria-hidden') === 'false') patchPaymentCoverage(modal);
  }

  function install(pos, root) {
    if (!pos || !root) return;
    activePos = pos;
    activeRoot = root;
    addMoreActions();
    observePayment();
    if (posObserver) posObserver.disconnect();
    posObserver = new MutationObserver(function () { requestAnimationFrame(function () { addMoreActions(); observePayment(); }); });
    posObserver.observe(root, {subtree:true, childList:true});
    root.classList.add('pmd-waiter-standard-v22-active');
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    requestAnimationFrame(function () { install(detail.pos || window.PMDWaiterPOS, document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]')); });
  });
  window.addEventListener('pmd:waiter-pos-order-updated', function () {
    operations = null;
    if (activeRoot) setTimeout(function () { addMoreActions(); observePayment(); }, 100);
  });

  window.PMDWaiterStandardV22 = {
    active: true,
    openOperations: openOperations,
    refreshOperations: function () { operations = null; return loadOperations(true); },
    debug: function () {
      return {
        version: state.version,
        active: true,
        posOpen: !!activeRoot,
        orderId: activeOrderId(),
        installed: state.installed,
        operationsLoads: state.operationsLoads,
        operationsWrites: state.operationsWrites,
        paymentPatches: state.paymentPatches,
        splitMethod: state.splitMethod,
        lastError: state.lastError,
        operations: operations
      };
    }
  };

  console.info('[PMD] Waiter Standard POS V2.2 operations + customer-parity split active');
})();
