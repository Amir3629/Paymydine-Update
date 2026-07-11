(function () {
  'use strict';

  var boot = window.PMD_WAITER_POS_BOOTSTRAP || {};
  if (!boot.ok) return;

  var state = {
    table: boot.table || {},
    user: boot.user || {},
    menu: Array.isArray(boot.menu_items) ? boot.menu_items : [],
    categories: Array.isArray(boot.categories) ? boot.categories : [],
    openOrders: Array.isArray(boot.open_orders) ? boot.open_orders : [],
    activeOrderId: boot.active_order_id || null,
    settings: boot.settings || {},
    category: 'all',
    search: '',
    cart: [],
    guestCount: Math.max(1, Number((boot.table || {}).capacity || 1)),
    note: '',
    submitting: false,
    modifierItem: null,
    draftKey: 'pmd-waiter-pos-v1:' + location.host + ':table:' + String((boot.table || {}).id || ''),
    toastTimer: null
  };

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }
  function money(value) {
    var symbol = state.settings.currency || '€';
    return symbol + Number(value || 0).toFixed(2);
  }
  function lineUnit(row) {
    return Number(row.price || 0) + (row.options || []).reduce(function (sum, o) { return sum + Number(o.price || 0); }, 0);
  }
  function lineTotal(row) { return lineUnit(row) * Number(row.quantity || 1); }
  function cartTotal() { return state.cart.reduce(function (sum, row) { return sum + lineTotal(row); }, 0); }
  function itemCount() { return state.cart.reduce(function (sum, row) { return sum + Number(row.quantity || 0); }, 0); }

  function toast(message, error) {
    var el = $('#pmd-pos-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-error', !!error);
    el.classList.add('is-show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2400);
  }

  function saveDraft() {
    try {
      localStorage.setItem(state.draftKey, JSON.stringify({
        cart: state.cart,
        guestCount: state.guestCount,
        note: state.note,
        activeOrderId: state.activeOrderId,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function restoreDraft() {
    try {
      var raw = JSON.parse(localStorage.getItem(state.draftKey) || 'null');
      if (!raw || !Array.isArray(raw.cart)) return;
      if (Date.now() - Number(raw.savedAt || 0) > 12 * 60 * 60 * 1000) return;
      state.cart = raw.cart.filter(function (row) { return row && row.menu_id && row.quantity > 0; });
      state.guestCount = Math.max(1, Number(raw.guestCount || state.guestCount));
      state.note = String(raw.note || '');
      if (raw.activeOrderId) state.activeOrderId = raw.activeOrderId;
    } catch (e) {}
  }

  function clearDraft() {
    try { localStorage.removeItem(state.draftKey); } catch (e) {}
  }

  function filteredMenu() {
    var q = state.search.toLowerCase().trim();
    return state.menu.filter(function (item) {
      var categoryOk = state.category === 'all' || (item.category_ids || []).map(String).indexOf(String(state.category)) !== -1;
      var searchOk = !q || String(item.name || '').toLowerCase().indexOf(q) !== -1 || String(item.description || '').toLowerCase().indexOf(q) !== -1;
      return categoryOk && searchOk;
    });
  }

  function renderCategories() {
    var root = $('#pmd-pos-categories');
    if (!root) return;
    var rows = [{id:'all', name:'All'}].concat(state.categories || []);
    root.innerHTML = rows.map(function (cat) {
      return '<button type="button" class="pmd-pos-category ' + (String(state.category) === String(cat.id) ? 'is-active' : '') + '" data-category="' + esc(cat.id) + '">' + esc(cat.name || 'Menu') + '</button>';
    }).join('');
    $$('[data-category]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.category = btn.getAttribute('data-category');
        renderCategories();
        renderMenu();
      });
    });
  }

  function renderMenu() {
    var root = $('#pmd-pos-menu');
    if (!root) return;
    var items = filteredMenu();
    if (!items.length) {
      root.innerHTML = '<div class="pmd-pos-empty"><div><b>No menu items found</b><br><small>Try another category or search.</small></div></div>';
      return;
    }
    root.innerHTML = items.map(function (item) {
      return '<button type="button" class="pmd-pos-product ' + (item.has_options ? 'has-options' : '') + '" data-product="' + esc(item.id) + '">' +
        '<div><div class="pmd-pos-product-name">' + esc(item.name) + '</div>' +
        (item.description ? '<div class="pmd-pos-product-desc">' + esc(item.description) + '</div>' : '') + '</div>' +
        '<div class="pmd-pos-product-foot"><span class="pmd-pos-price">' + money(item.price) + '</span><span class="pmd-pos-plus">+</span></div>' +
      '</button>';
    }).join('');
    $$('[data-product]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = state.menu.find(function (x) { return String(x.id) === String(btn.getAttribute('data-product')); });
        if (!item) return;
        if (item.has_options) openModifier(item);
        else addLine(item, []);
      });
    });
  }

  function signature(item, options) {
    return String(item.id) + ':' + (options || []).map(function (o) { return o.id; }).sort().join(',');
  }

  function addLine(item, options) {
    var key = signature(item, options);
    var existing = state.cart.find(function (row) { return row.key === key; });
    if (existing) existing.quantity += 1;
    else state.cart.push({
      key: key,
      menu_id: Number(item.id),
      name: item.name,
      price: Number(item.price || 0),
      quantity: 1,
      options: options || [],
      comment: ''
    });
    saveDraft();
    renderCart();
    toast(item.name + ' added');
  }

  function renderCart() {
    var root = $('#pmd-pos-cart-list');
    if (!root) return;
    if (!state.cart.length) {
      root.innerHTML = '<div class="pmd-pos-cart-empty"><div><b>Your order is empty</b><br><small>Tap menu items to add them.</small></div></div>';
    } else {
      root.innerHTML = state.cart.map(function (row, index) {
        var options = (row.options || []).map(function (o) { return o.name + (Number(o.price || 0) ? ' +' + money(o.price) : ''); }).join(' · ');
        return '<article class="pmd-pos-line-item" data-line="' + index + '">' +
          '<div class="pmd-pos-line-top"><div class="pmd-pos-line-name">' + esc(row.name) + (options ? '<div class="pmd-pos-line-options">' + esc(options) + '</div>' : '') + '</div><div class="pmd-pos-line-price">' + money(lineTotal(row)) + '</div></div>' +
          '<div class="pmd-pos-line-actions"><div class="pmd-pos-qty"><button type="button" data-dec="' + index + '">−</button><b>' + esc(row.quantity) + '</b><button type="button" data-inc="' + index + '">+</button></div><button type="button" class="pmd-pos-remove" data-remove="' + index + '">×</button></div>' +
          '<input class="pmd-pos-note-input" data-line-note="' + index + '" value="' + esc(row.comment || '') + '" placeholder="Item note, allergy, doneness…">' +
        '</article>';
      }).join('');
    }

    $$('[data-inc]', root).forEach(function (btn) { btn.onclick = function () { changeQty(Number(btn.dataset.inc), 1); }; });
    $$('[data-dec]', root).forEach(function (btn) { btn.onclick = function () { changeQty(Number(btn.dataset.dec), -1); }; });
    $$('[data-remove]', root).forEach(function (btn) { btn.onclick = function () { state.cart.splice(Number(btn.dataset.remove), 1); saveDraft(); renderCart(); }; });
    $$('[data-line-note]', root).forEach(function (input) {
      input.addEventListener('input', function () {
        var row = state.cart[Number(input.dataset.lineNote)];
        if (row) row.comment = input.value;
        saveDraft();
      });
    });

    var total = cartTotal();
    var count = itemCount();
    ['#pmd-pos-subtotal', '#pmd-pos-total', '#pmd-pos-mobile-total'].forEach(function (sel) { var el = $(sel); if (el) el.textContent = money(total); });
    var countEl = $('#pmd-pos-mobile-count'); if (countEl) countEl.textContent = count + (count === 1 ? ' item' : ' items');
    var send = $('#pmd-pos-send'); var hold = $('#pmd-pos-hold');
    if (send) send.disabled = !state.cart.length || state.submitting;
    if (hold) hold.disabled = !state.cart.length || state.submitting;
    var guests = $('#pmd-pos-guests'); if (guests) guests.textContent = state.guestCount;
    var note = $('#pmd-pos-table-note'); if (note && note.value !== state.note) note.value = state.note;
  }

  function changeQty(index, delta) {
    var row = state.cart[index];
    if (!row) return;
    row.quantity += delta;
    if (row.quantity <= 0) state.cart.splice(index, 1);
    saveDraft();
    renderCart();
  }

  function openModifier(item) {
    state.modifierItem = item;
    var modal = $('#pmd-pos-modifier-modal');
    var title = $('#pmd-pos-modal-title');
    var body = $('#pmd-pos-modal-body');
    if (!modal || !body) return;
    title.textContent = item.name;
    body.innerHTML = (item.options || []).map(function (group) {
      var type = Number(group.max || 1) === 1 ? 'radio' : 'checkbox';
      return '<section class="pmd-pos-option-group" data-option-group="' + esc(group.id) + '" data-required="' + (group.required ? '1' : '0') + '" data-min="' + esc(group.min || 0) + '" data-max="' + esc(group.max || 1) + '">' +
        '<div class="pmd-pos-option-title"><span>' + esc(group.name) + '</span><small>' + (group.required ? 'Required' : 'Optional') + '</small></div>' +
        '<div class="pmd-pos-option-list">' + (group.values || []).map(function (value) {
          return '<label class="pmd-pos-option"><span><input type="' + type + '" name="pmd-option-' + esc(group.id) + '" value="' + esc(value.id) + '" data-name="' + esc(value.name) + '" data-price="' + esc(value.price || 0) + '" ' + (value.default ? 'checked' : '') + '> ' + esc(value.name) + '</span><b>' + (Number(value.price || 0) ? '+' + money(value.price) : '') + '</b></label>';
        }).join('') + '</div></section>';
    }).join('');
    modal.classList.add('is-show');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModifier() {
    var modal = $('#pmd-pos-modifier-modal');
    if (modal) { modal.classList.remove('is-show'); modal.setAttribute('aria-hidden', 'true'); }
    state.modifierItem = null;
  }

  function addModifiedItem() {
    if (!state.modifierItem) return;
    var selected = [];
    var valid = true;
    $$('#pmd-pos-modal-body [data-option-group]').forEach(function (group) {
      var checked = $$('input:checked', group);
      var min = Number(group.dataset.min || (group.dataset.required === '1' ? 1 : 0));
      var max = Number(group.dataset.max || 999);
      if (checked.length < min || checked.length > max) {
        valid = false;
        group.scrollIntoView({behavior:'smooth', block:'center'});
        group.style.outline = '3px solid rgba(239,51,64,.25)';
        setTimeout(function () { group.style.outline = ''; }, 1800);
        return;
      }
      checked.forEach(function (input) {
        selected.push({id:Number(input.value), name:input.dataset.name || 'Option', price:Number(input.dataset.price || 0)});
      });
    });
    if (!valid) { toast('Please complete required options.', true); return; }
    addLine(state.modifierItem, selected);
    closeModifier();
  }

  async function submit(mode) {
    if (!state.cart.length || state.submitting) return;
    state.submitting = true;
    renderCart();
    var send = $('#pmd-pos-send'); var hold = $('#pmd-pos-hold');
    if (send) send.textContent = mode === 'send' ? 'Sending…' : 'Send to kitchen';
    if (hold) hold.textContent = mode === 'hold' ? 'Saving…' : 'Hold';

    try {
      var response = await fetch(state.settings.save_url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': ($('meta[name="csrf-token"]') || {}).content || ''
        },
        body: JSON.stringify({
          mode: mode,
          order_id: state.activeOrderId,
          guest_count: state.guestCount,
          note: state.note,
          items: state.cart.map(function (row) {
            return {
              menu_id: row.menu_id,
              quantity: row.quantity,
              comment: row.comment || '',
              options: (row.options || []).map(function (o) { return o.id; })
            };
          })
        })
      });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok || !json.ok) throw new Error(json.message || ('HTTP ' + response.status));
      state.activeOrderId = json.order_id;
      state.cart = [];
      state.note = '';
      clearDraft();
      renderCart();
      toast(json.message || 'Order saved');
      var pill = $('#pmd-pos-order-pill');
      if (pill) pill.textContent = 'Order #' + json.order_id;
      var existing = $('#pmd-pos-existing');
      if (existing) { existing.classList.add('is-show'); existing.textContent = 'New items will be added to Order #' + json.order_id + '.'; }
      setTimeout(function () { location.href = state.settings.dashboard_url || '/admin/dashboardwaiter'; }, 900);
    } catch (error) {
      toast(error.message || 'Could not save order.', true);
    } finally {
      state.submitting = false;
      if (send) send.textContent = 'Send to kitchen';
      if (hold) hold.textContent = 'Hold';
      renderCart();
    }
  }

  function openCart() { var cart = $('#pmd-pos-cart'); if (cart) cart.classList.add('is-mobile-open'); }
  function closeCart() { var cart = $('#pmd-pos-cart'); if (cart) cart.classList.remove('is-mobile-open'); }

  function bind() {
    var search = $('#pmd-pos-search');
    if (search) search.addEventListener('input', function () { state.search = search.value; renderMenu(); });
    var note = $('#pmd-pos-table-note');
    if (note) note.addEventListener('input', function () { state.note = note.value; saveDraft(); });
    var plus = $('#pmd-pos-guest-plus'); if (plus) plus.onclick = function () { state.guestCount = Math.min(99, state.guestCount + 1); saveDraft(); renderCart(); };
    var minus = $('#pmd-pos-guest-minus'); if (minus) minus.onclick = function () { state.guestCount = Math.max(1, state.guestCount - 1); saveDraft(); renderCart(); };
    var hold = $('#pmd-pos-hold'); if (hold) hold.onclick = function () { submit('hold'); };
    var send = $('#pmd-pos-send'); if (send) send.onclick = function () { submit('send'); };
    var mobile = $('#pmd-pos-mobile-cart'); if (mobile) mobile.onclick = openCart;
    var close = $('#pmd-pos-close-cart'); if (close) close.onclick = closeCart;
    var modalClose = $('#pmd-pos-modal-close'); if (modalClose) modalClose.onclick = closeModifier;
    var modalCancel = $('#pmd-pos-modal-cancel'); if (modalCancel) modalCancel.onclick = closeModifier;
    var modalAdd = $('#pmd-pos-modal-add'); if (modalAdd) modalAdd.onclick = addModifiedItem;
    var modal = $('#pmd-pos-modifier-modal'); if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeModifier(); });
    var clear = $('#pmd-pos-clear'); if (clear) clear.onclick = function () { if (!state.cart.length || confirm('Clear the current cart?')) { state.cart = []; state.note = ''; clearDraft(); renderCart(); } };
    var payment = $('#pmd-pos-payment'); if (payment) payment.onclick = function () { if (state.activeOrderId) location.href = '/admin/payments?order_id=' + encodeURIComponent(state.activeOrderId); else toast('Send or hold the order first.', true); };
    var edit = $('#pmd-pos-edit-order'); if (edit) edit.onclick = function () { if (state.activeOrderId) location.href = '/admin/orders/edit/' + encodeURIComponent(state.activeOrderId); else toast('No active order yet.', true); };
    var print = $('#pmd-pos-print'); if (print) print.onclick = function () { if (state.activeOrderId) window.open('/admin/orders/invoice/' + encodeURIComponent(state.activeOrderId), '_blank'); else toast('No active order yet.', true); };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModifier(); closeCart(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit('send'); }
    });
  }

  function initExisting() {
    var pill = $('#pmd-pos-order-pill');
    var existing = $('#pmd-pos-existing');
    if (state.activeOrderId) {
      if (pill) pill.textContent = 'Order #' + state.activeOrderId;
      if (existing) {
        existing.classList.add('is-show');
        existing.textContent = 'This table already has an open order. New items will be appended to Order #' + state.activeOrderId + '.';
      }
    } else if (pill) pill.textContent = 'New order';
  }

  restoreDraft();
  bind();
  initExisting();
  renderCategories();
  renderMenu();
  renderCart();

  window.PMDWaiterPOS = {
    state: state,
    submit: submit,
    addItem: function (id) {
      var item = state.menu.find(function (x) { return String(x.id) === String(id); });
      if (item) item.has_options ? openModifier(item) : addLine(item, []);
    },
    debug: function () {
      return {
        version: boot.version,
        table: state.table,
        activeOrderId: state.activeOrderId,
        openOrders: state.openOrders.length,
        menuItems: state.menu.length,
        cartLines: state.cart.length,
        cartItems: itemCount(),
        total: cartTotal(),
        submitting: state.submitting
      };
    }
  };
})();
