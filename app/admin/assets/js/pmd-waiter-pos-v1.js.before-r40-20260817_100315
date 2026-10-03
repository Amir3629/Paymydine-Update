(function () {
  'use strict';

  if (window.PMDWaiterPOSApp) return;

  var instances = new WeakMap();

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return String(prefix || 'pmd') + ':' + window.crypto.randomUUID();
    }
    return String(prefix || 'pmd') + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function roundMoney(value) {
    return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
  }

  function replaceOrderToken(template, orderId) {
    return String(template || '').replace('{order}', encodeURIComponent(String(orderId || '')));
  }

  function createInstance(root, boot, options) {
    options = options || {};
    var embedded = !!options.embedded;
    var destroyed = false;
    var toastTimer = null;
    var successTimer = null;

    function $(selector, parent) { return (parent || root).querySelector(selector); }
    function $$(selector, parent) { return Array.prototype.slice.call((parent || root).querySelectorAll(selector)); }

    var state = {
      root: root,
      boot: boot || {},
      table: (boot && boot.table) || {},
      user: (boot && boot.user) || {},
      permissions: (boot && boot.permissions) || {},
      menu: Array.isArray(boot && boot.menu_items) ? boot.menu_items : [],
      categories: Array.isArray(boot && boot.categories) ? boot.categories : [],
      openOrders: Array.isArray(boot && boot.open_orders) ? boot.open_orders : [],
      activeOrderId: (boot && boot.active_order_id) || null,
      settings: (boot && boot.settings) || {},
      warnings: (boot && boot.warnings) || {},
      category: 'all',
      search: '',
      view: localStorage.getItem('pmd-waiter-pos-view') === 'list' ? 'list' : 'grid',
      cart: [],
      guestCount: Math.max(1, toNumber((boot && boot.table && boot.table.capacity) || 1, 1)),
      note: '',
      submitting: false,
      modifierItem: null,
      draftKey: 'pmd-waiter-pos-v2:' + location.host + ':table:' + String((boot && boot.table && boot.table.id) || ''),
      payment: {
        open: false,
        loading: false,
        submitting: false,
        summary: null,
        splitMode: 'full',
        equalPeople: 2,
        customAmount: '',
        itemQuantities: {},
        method: 'cash',
        providerCode: null,
        tipPercent: 0,
        customTip: '',
        coupon: null,
        couponCode: '',
        payerLabel: '',
        reference: '',
        cashReceived: '',
        externalConfirmed: false,
        idempotencyKey: uid('pay'),
      },
    };

    function money(value) {
      return (state.settings.currency || '€') + roundMoney(value).toFixed(2);
    }

    function activeOrder() {
      if (!state.activeOrderId) return null;
      return state.openOrders.find(function (order) { return String(order.order_id) === String(state.activeOrderId); }) || state.openOrders[0] || null;
    }

    function existingTotal() {
      var order = activeOrder();
      return order ? toNumber(order.total, 0) : 0;
    }

    function lineUnit(row) {
      return toNumber(row.price, 0) + (row.options || []).reduce(function (sum, option) {
        return sum + toNumber(option.price, 0);
      }, 0);
    }

    function lineTotal(row) { return lineUnit(row) * toNumber(row.quantity, 1); }
    function cartTotal() { return state.cart.reduce(function (sum, row) { return sum + lineTotal(row); }, 0); }
    function itemCount() { return state.cart.reduce(function (sum, row) { return sum + toNumber(row.quantity, 0); }, 0); }

    function toast(message, error) {
      var el = $('[data-pos-toast]');
      if (!el) return;
      el.textContent = String(message || '');
      el.classList.toggle('is-error', !!error);
      el.classList.add('is-show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 3200);
    }

    function showSuccess(message) {
      var el = $('[data-pos-success]');
      if (!el) return;
      el.textContent = message;
      el.hidden = false;
      clearTimeout(successTimer);
      successTimer = setTimeout(function () { el.hidden = true; }, 5500);
    }

    function saveDraft() {
      try {
        localStorage.setItem(state.draftKey, JSON.stringify({
          cart: state.cart,
          guestCount: state.guestCount,
          note: state.note,
          activeOrderId: state.activeOrderId,
          savedAt: Date.now(),
        }));
      } catch (e) {}
    }

    function restoreDraft() {
      try {
        var raw = JSON.parse(localStorage.getItem(state.draftKey) || 'null');
        if (!raw || !Array.isArray(raw.cart)) return;
        if (Date.now() - toNumber(raw.savedAt, 0) > 12 * 60 * 60 * 1000) return;
        state.cart = raw.cart.filter(function (row) { return row && row.menu_id && row.quantity > 0; });
        state.guestCount = Math.max(1, toNumber(raw.guestCount, state.guestCount));
        state.note = String(raw.note || '');
        if (raw.activeOrderId) state.activeOrderId = raw.activeOrderId;
      } catch (e) {}
    }

    function clearDraft() {
      try { localStorage.removeItem(state.draftKey); } catch (e) {}
    }

    function filteredMenu() {
      var query = state.search.toLowerCase().trim();
      return state.menu.filter(function (item) {
        var categoryOk = state.category === 'all' || (item.category_ids || []).map(String).indexOf(String(state.category)) !== -1;
        var searchOk = !query || String(item.name || '').toLowerCase().indexOf(query) !== -1 || String(item.description || '').toLowerCase().indexOf(query) !== -1;
        return categoryOk && searchOk;
      });
    }

    function renderWarning() {
      var el = $('[data-pos-menu-warning]');
      if (!el) return;
      var hidden = toNumber(state.warnings.hidden_zero_price_items, 0);
      el.hidden = hidden < 1;
      if (hidden > 0) {
        el.textContent = hidden + ' zero-price menu ' + (hidden === 1 ? 'item is' : 'items are') + ' hidden until a valid price is configured.';
      }
    }

    function renderCategories() {
      var container = $('[data-pos-categories]');
      if (!container) return;
      var rows = [{id:'all', name:'All'}].concat(state.categories || []);
      container.innerHTML = rows.map(function (category) {
        return '<button type="button" class="pmd-pos-category ' + (String(state.category) === String(category.id) ? 'is-active' : '') + '" data-pos-category="' + esc(category.id) + '">' + esc(category.name || 'Menu') + '</button>';
      }).join('');
      $$('[data-pos-category]', container).forEach(function (button) {
        button.addEventListener('click', function () {
          state.category = button.getAttribute('data-pos-category');
          renderCategories();
          renderMenu();
        });
      });
    }

    function renderViewMode() {
      $$('[data-pos-view]').forEach(function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-pos-view') === state.view);
      });
      var menu = $('[data-pos-menu]');
      if (menu) menu.classList.toggle('is-list', state.view === 'list');
    }

    function renderMenu() {
      var container = $('[data-pos-menu]');
      if (!container) return;
      var items = filteredMenu();
      container.classList.toggle('is-list', state.view === 'list');
      if (!items.length) {
        container.innerHTML = '<div class="pmd-pos-empty"><div><b>No menu items found</b><br><small>Try another category or search.</small></div></div>';
        return;
      }
      container.innerHTML = items.map(function (item) {
        return '<button type="button" class="pmd-pos-product ' + (item.has_options ? 'has-options' : '') + '" data-pos-product="' + esc(item.id) + '">' +
          '<div><div class="pmd-pos-product-name">' + esc(item.name) + '</div>' +
          (item.description ? '<div class="pmd-pos-product-desc">' + esc(item.description) + '</div>' : '') + '</div>' +
          '<div class="pmd-pos-product-foot"><span class="pmd-pos-price">' + money(item.price) + '</span><span class="pmd-pos-plus">+</span></div>' +
        '</button>';
      }).join('');
      $$('[data-pos-product]', container).forEach(function (button) {
        button.addEventListener('click', function () {
          var item = state.menu.find(function (row) { return String(row.id) === String(button.getAttribute('data-pos-product')); });
          if (!item) return;
          item.has_options ? openModifier(item) : addLine(item, []);
        });
      });
    }

    function signature(item, options) {
      return String(item.id) + ':' + (options || []).map(function (option) { return option.id; }).sort().join(',');
    }

    function addLine(item, options) {
      var key = signature(item, options);
      var existing = state.cart.find(function (row) { return row.key === key; });
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cart.push({
          key: key,
          menu_id: Number(item.id),
          name: item.name,
          price: toNumber(item.price, 0),
          quantity: 1,
          options: options || [],
          comment: '',
        });
      }
      saveDraft();
      renderCart();
      toast(item.name + ' added');
    }

    function renderExistingOrder() {
      var order = activeOrder();
      var section = $('[data-pos-sent-section]');
      var list = $('[data-pos-sent-list]');
      var status = $('[data-pos-kitchen-status]');
      var existing = $('[data-pos-existing]');
      var pill = $('[data-pos-order-pill]');
      var totalRow = $('[data-pos-existing-total-row]');
      var totalEl = $('[data-pos-existing-total]');

      if (!order) {
        if (section) section.hidden = true;
        if (existing) existing.classList.remove('is-show');
        if (pill) {
          pill.textContent = 'New order';
          pill.className = 'pmd-pos-order-pill';
        }
        if (totalRow) totalRow.hidden = true;
        return;
      }

      if (pill) {
        pill.textContent = 'Order #' + order.order_id;
        pill.className = 'pmd-pos-order-pill' + (order.settlement_status === 'partial' ? ' is-partial' : '') + (order.settlement_status === 'paid' ? ' is-paid' : '');
      }
      if (existing) {
        existing.classList.add('is-show');
        existing.textContent = 'New items will be appended to Order #' + order.order_id + '. Existing items are read-only here.';
      }
      if (status) status.textContent = order.status_name || 'Kitchen order';
      if (section) section.hidden = !Array.isArray(order.items) || order.items.length === 0;
      if (list) {
        list.innerHTML = (order.items || []).map(function (item) {
          return '<div class="pmd-pos-sent-item"><span class="pmd-pos-sent-qty">' + esc(item.quantity) + '×</span>' +
            '<span class="pmd-pos-sent-name">' + esc(item.name) + (item.comment ? '<small>' + esc(item.comment) + '</small>' : '') + '</span>' +
            '<span class="pmd-pos-sent-price">' + money(item.subtotal) + '</span></div>';
        }).join('');
      }
      if (totalRow) totalRow.hidden = false;
      if (totalEl) totalEl.textContent = money(order.total);
    }

    function renderCart() {
      var container = $('[data-pos-cart-list]');
      if (!container) return;
      if (!state.cart.length) {
        container.innerHTML = '<div class="pmd-pos-cart-empty"><div><b>No new items</b><br><small>Tap menu items to add them.</small></div></div>';
      } else {
        container.innerHTML = state.cart.map(function (row, index) {
          var options = (row.options || []).map(function (option) {
            return option.name + (toNumber(option.price, 0) ? ' +' + money(option.price) : '');
          }).join(' · ');
          return '<article class="pmd-pos-line-item" data-pos-line="' + index + '">' +
            '<div class="pmd-pos-line-top"><div class="pmd-pos-line-name">' + esc(row.name) + (options ? '<div class="pmd-pos-line-options">' + esc(options) + '</div>' : '') + '</div><div class="pmd-pos-line-price">' + money(lineTotal(row)) + '</div></div>' +
            '<div class="pmd-pos-line-actions"><div class="pmd-pos-qty"><button type="button" data-pos-dec="' + index + '">−</button><b>' + esc(row.quantity) + '</b><button type="button" data-pos-inc="' + index + '">+</button></div><button type="button" class="pmd-pos-remove" data-pos-remove="' + index + '" aria-label="Remove item">×</button></div>' +
            '<input class="pmd-pos-note-input" data-pos-line-note="' + index + '" value="' + esc(row.comment || '') + '" placeholder="Item note, allergy, doneness…">' +
          '</article>';
        }).join('');
      }

      $$('[data-pos-inc]', container).forEach(function (button) { button.onclick = function () { changeQty(Number(button.dataset.posInc), 1); }; });
      $$('[data-pos-dec]', container).forEach(function (button) { button.onclick = function () { changeQty(Number(button.dataset.posDec), -1); }; });
      $$('[data-pos-remove]', container).forEach(function (button) { button.onclick = function () { state.cart.splice(Number(button.dataset.posRemove), 1); saveDraft(); renderCart(); }; });
      $$('[data-pos-line-note]', container).forEach(function (input) {
        input.addEventListener('input', function () {
          var row = state.cart[Number(input.dataset.posLineNote)];
          if (row) row.comment = input.value;
          saveDraft();
        });
      });

      var newTotal = cartTotal();
      var combinedTotal = existingTotal() + newTotal;
      var count = itemCount();
      var subtotal = $('[data-pos-subtotal]');
      var total = $('[data-pos-total]');
      var mobileTotal = $('[data-pos-mobile-total]');
      var mobileCount = $('[data-pos-mobile-count]');
      if (subtotal) subtotal.textContent = money(newTotal);
      if (total) total.textContent = money(combinedTotal);
      if (mobileTotal) mobileTotal.textContent = money(combinedTotal);
      if (mobileCount) mobileCount.textContent = count + (count === 1 ? ' new item' : ' new items');

      var send = $('[data-pos-send]');
      var hold = $('[data-pos-hold]');
      if (send) send.disabled = !state.cart.length || state.submitting;
      if (hold) hold.disabled = !state.cart.length || state.submitting;
      var guests = $('[data-pos-guests]');
      if (guests) guests.textContent = state.guestCount;
      var note = $('[data-pos-table-note]');
      if (note && note.value !== state.note) note.value = state.note;

      var hasOrder = !!state.activeOrderId;
      ['[data-pos-edit-order]','[data-pos-payment]','[data-pos-print]'].forEach(function (selector) {
        var button = $(selector);
        if (button) button.disabled = !hasOrder || (selector === '[data-pos-payment]' && state.cart.length > 0);
      });
      renderExistingOrder();
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
      var modal = $('[data-pos-modifier-modal]');
      var title = $('[data-pos-modal-title]');
      var body = $('[data-pos-modal-body]');
      if (!modal || !body) return;
      title.textContent = item.name;
      body.innerHTML = (item.options || []).map(function (group) {
        var type = Number(group.max || 1) === 1 ? 'radio' : 'checkbox';
        return '<section class="pmd-pos-option-group" data-option-group="' + esc(group.id) + '" data-required="' + (group.required ? '1' : '0') + '" data-min="' + esc(group.min || 0) + '" data-max="' + esc(group.max || 1) + '">' +
          '<div class="pmd-pos-option-title"><span>' + esc(group.name) + '</span><small>' + (group.required ? 'Required' : 'Optional') + '</small></div>' +
          '<div class="pmd-pos-option-list">' + (group.values || []).map(function (value) {
            return '<label class="pmd-pos-option"><span><input type="' + type + '" name="pmd-option-' + esc(group.id) + '" value="' + esc(value.id) + '" data-option-name="' + esc(value.name) + '" data-option-price="' + esc(value.price || 0) + '" ' + (value.default ? 'checked' : '') + '> ' + esc(value.name) + '</span><b>' + (toNumber(value.price, 0) ? '+' + money(value.price) : '') + '</b></label>';
          }).join('') + '</div></section>';
      }).join('');
      modal.classList.add('is-show');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeModifier() {
      var modal = $('[data-pos-modifier-modal]');
      if (modal) {
        modal.classList.remove('is-show');
        modal.setAttribute('aria-hidden', 'true');
      }
      state.modifierItem = null;
    }

    function addModifiedItem() {
      if (!state.modifierItem) return;
      var selected = [];
      var valid = true;
      $$('[data-pos-modal-body] [data-option-group]').forEach(function (group) {
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
          selected.push({id:Number(input.value), name:input.dataset.optionName || 'Option', price:Number(input.dataset.optionPrice || 0)});
        });
      });
      if (!valid) {
        toast('Complete all required options.', true);
        return;
      }
      addLine(state.modifierItem, selected);
      closeModifier();
    }

    async function fetchJson(url, options) {
      var response = await fetch(url, Object.assign({
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': (($('meta[name="csrf-token"]', document) || {}).content || ''),
        },
      }, options || {}));
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok || json.ok === false) {
        var error = new Error(json.message || json.error || ('HTTP ' + response.status));
        error.status = response.status;
        error.payload = json;
        throw error;
      }
      return json;
    }

    async function refreshData(silent) {
      if (!state.settings.data_url) return;
      try {
        var json = await fetchJson(state.settings.data_url + '?_=' + Date.now());
        if (destroyed) return;
        state.boot = json;
        state.table = json.table || state.table;
        state.user = json.user || state.user;
        state.permissions = json.permissions || state.permissions;
        state.menu = Array.isArray(json.menu_items) ? json.menu_items : state.menu;
        state.categories = Array.isArray(json.categories) ? json.categories : state.categories;
        state.openOrders = Array.isArray(json.open_orders) ? json.open_orders : [];
        state.activeOrderId = json.active_order_id || state.activeOrderId;
        state.settings = Object.assign({}, state.settings, json.settings || {});
        state.warnings = json.warnings || state.warnings;
        renderAll();
        if (!silent) toast('Order and menu refreshed');
      } catch (error) {
        if (!silent) toast(error.message || 'Refresh failed.', true);
      }
    }

    async function submit(mode) {
      if (!state.cart.length || state.submitting) return;
      state.submitting = true;
      renderCart();
      var send = $('[data-pos-send]');
      var hold = $('[data-pos-hold]');
      if (send) send.textContent = mode === 'send' ? 'Sending…' : 'Send to kitchen';
      if (hold) hold.innerHTML = mode === 'hold' ? '<span>Saving…</span><small>Please wait</small>' : '<span>Save / Hold</span><small>Do not send</small>';
      var order = activeOrder();

      try {
        var json = await fetchJson(state.settings.save_url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': (($('meta[name="csrf-token"]', document) || {}).content || ''),
          },
          body: JSON.stringify({
            mode: mode,
            order_id: state.activeOrderId,
            expected_updated_at: order ? order.updated_at : null,
            guest_count: state.guestCount,
            note: state.note,
            items: state.cart.map(function (row) {
              return {
                menu_id: row.menu_id,
                quantity: row.quantity,
                comment: row.comment || '',
                options: (row.options || []).map(function (option) { return option.id; }),
              };
            }),
          }),
        });
        state.activeOrderId = json.order_id;
        state.cart = [];
        state.note = '';
        clearDraft();
        await refreshData(true);
        renderCart();
        showSuccess((json.message || 'Order saved') + ' Order #' + json.order_id + '.');
        toast(json.message || 'Order saved');
        window.dispatchEvent(new CustomEvent('pmd:waiter-pos-order-updated', {detail: json}));
      } catch (error) {
        toast(error.message || 'Could not save order.', true);
      } finally {
        state.submitting = false;
        if (send) send.textContent = 'Send to kitchen';
        if (hold) hold.innerHTML = '<span>Save / Hold</span><small>Do not send</small>';
        renderCart();
      }
    }

    function openCart() {
      var cart = $('[data-pos-cart]');
      if (cart) cart.classList.add('is-mobile-open');
    }
    function closeCart() {
      var cart = $('[data-pos-cart]');
      if (cart) cart.classList.remove('is-mobile-open');
    }

    function closeApp() {
      if (state.cart.length && !confirm('Leave this table? The current draft will remain saved for 12 hours.')) return;
      closePayment();
      closeModifier();
      closeCart();
      if (embedded && typeof options.onClose === 'function') {
        options.onClose();
      } else {
        location.href = state.settings.dashboard_url || '/admin/dashboardwaiter';
      }
    }

    function openEdit() {
      if (!state.activeOrderId) return toast('No active order yet.', true);
      location.href = '/admin/orders/edit/' + encodeURIComponent(state.activeOrderId);
    }
    function openPrint() {
      if (!state.activeOrderId) return toast('No active order yet.', true);
      window.open('/admin/orders/invoice/' + encodeURIComponent(state.activeOrderId), '_blank', 'noopener');
    }

    /* -------------------- Payment center -------------------- */

    if (!window.PMDWaiterPOSPaymentV2 || typeof window.PMDWaiterPOSPaymentV2.install !== 'function') {
      throw new Error('Waiter POS payment module is missing.');
    }
    var paymentModule = window.PMDWaiterPOSPaymentV2.install({
      root: root,
      state: state,
      $: $,
      $$: $$,
      esc: esc,
      uid: uid,
      toNumber: toNumber,
      roundMoney: roundMoney,
      replaceOrderToken: replaceOrderToken,
      money: money,
      fetchJson: fetchJson,
      toast: toast,
      showSuccess: showSuccess,
      closeCart: closeCart,
      refreshData: refreshData
    });
    var openPayment = paymentModule.openPayment;
    var closePayment = paymentModule.closePayment;
    var bindPayment = paymentModule.bindPayment;
    var renderPayment = paymentModule.renderPayment;
    var paymentRemaining = paymentModule.paymentRemaining;

    function bind() {
      var search = $('[data-pos-search]');
      if (search) search.addEventListener('input', function () { state.search = search.value; renderMenu(); });
      var note = $('[data-pos-table-note]');
      if (note) note.addEventListener('input', function () { state.note = note.value; saveDraft(); });
      var plus = $('[data-pos-guest-plus]');
      var minus = $('[data-pos-guest-minus]');
      if (plus) plus.onclick = function () { state.guestCount = Math.min(99, state.guestCount + 1); saveDraft(); renderCart(); };
      if (minus) minus.onclick = function () { state.guestCount = Math.max(1, state.guestCount - 1); saveDraft(); renderCart(); };
      var hold = $('[data-pos-hold]');
      var send = $('[data-pos-send]');
      if (hold) hold.onclick = function () { submit('hold'); };
      if (send) send.onclick = function () { submit('send'); };
      var mobile = $('[data-pos-mobile-cart]');
      var closeCartButton = $('[data-pos-close-cart]');
      if (mobile) mobile.onclick = openCart;
      if (closeCartButton) closeCartButton.onclick = closeCart;
      var modalClose = $('[data-pos-modal-close]');
      var modalCancel = $('[data-pos-modal-cancel]');
      var modalAdd = $('[data-pos-modal-add]');
      var modifierModal = $('[data-pos-modifier-modal]');
      if (modalClose) modalClose.onclick = closeModifier;
      if (modalCancel) modalCancel.onclick = closeModifier;
      if (modalAdd) modalAdd.onclick = addModifiedItem;
      if (modifierModal) modifierModal.addEventListener('click', function (event) { if (event.target === modifierModal) closeModifier(); });
      var clear = $('[data-pos-clear]');
      if (clear) clear.onclick = function () {
        if (!state.cart.length || confirm('Clear all new, unsent items from this cart?')) {
          state.cart = [];
          state.note = '';
          clearDraft();
          renderCart();
        }
      };
      var refresh = $('[data-pos-refresh]');
      if (refresh) refresh.onclick = function () { refreshData(false); };
      var edit = $('[data-pos-edit-order]');
      var payment = $('[data-pos-payment]');
      var print = $('[data-pos-print]');
      if (edit) edit.onclick = openEdit;
      if (payment) payment.onclick = openPayment;
      if (print) print.onclick = openPrint;
      $$('[data-pos-close]').forEach(function (button) { button.onclick = closeApp; });
      $$('[data-pos-view]').forEach(function (button) {
        button.onclick = function () {
          state.view = button.dataset.posView === 'list' ? 'list' : 'grid';
          try { localStorage.setItem('pmd-waiter-pos-view', state.view); } catch (e) {}
          renderViewMode();
          renderMenu();
        };
      });
      bindPayment();
      root.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          if (state.payment.open) closePayment();
          else if ($('[data-pos-modifier-modal].is-show')) closeModifier();
          else if ($('[data-pos-cart].is-mobile-open')) closeCart();
          else if (embedded) closeApp();
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          submit('send');
        }
      });
    }

    function renderAll() {
      renderWarning();
      renderCategories();
      renderViewMode();
      renderMenu();
      renderCart();
      if (state.payment.open) renderPayment();
    }

    function destroy() {
      destroyed = true;
      clearTimeout(toastTimer);
      clearTimeout(successTimer);
      instances.delete(root);
    }

    restoreDraft();
    bind();
    renderAll();

    var api = {
      state: state,
      refresh: refreshData,
      submit: submit,
      openPayment: openPayment,
      closePayment: closePayment,
      close: closeApp,
      destroy: destroy,
      addItem: function (id) {
        var item = state.menu.find(function (row) { return String(row.id) === String(id); });
        if (item) item.has_options ? openModifier(item) : addLine(item, []);
      },
      debug: function () {
        return {
          version: 'pmd-waiter-pos-v2',
          mode: embedded ? 'overlay' : 'standalone',
          table: state.table,
          activeOrderId: state.activeOrderId,
          openOrders: state.openOrders.length,
          menuItems: state.menu.length,
          hiddenZeroPriceItems: toNumber(state.warnings.hidden_zero_price_items, 0),
          cartLines: state.cart.length,
          cartItems: itemCount(),
          newItemsTotal: cartTotal(),
          existingOrderTotal: existingTotal(),
          submitting: state.submitting,
          paymentOpen: state.payment.open,
          paymentRemaining: state.payment.summary ? paymentRemaining() : null,
        };
      },
    };

    instances.set(root, api);
    window.PMDWaiterPOS = api;
    console.info('[PMD] Waiter POS v2 mounted', api.debug());
    return api;
  }

  window.PMDWaiterPOSApp = {
    mount: function (root, boot, options) {
      if (!root) throw new Error('Waiter POS root is missing.');
      var existing = instances.get(root);
      if (existing) existing.destroy();
      return createInstance(root, boot, options || {});
    },
    get: function (root) { return instances.get(root) || null; },
  };
})();
