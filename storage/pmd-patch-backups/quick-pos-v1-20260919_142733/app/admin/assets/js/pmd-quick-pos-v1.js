/* PMD Quick POS V1
 * One touch-first POS engine with cashier and waiter modes.
 * Reuses canonical Waiter POS order/payment/table authorities.
 */
(function () {
  'use strict';

  var root = document.getElementById('pmd-quick-pos');
  if (!root || window.PMDQuickPOSV1) return;

  function $(selector, parent) {
    return (parent || root).querySelector(selector);
  }

  function $$(selector, parent) {
    return Array.prototype.slice.call((parent || root).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function visibleNote(value) {
    return String(value == null ? '' : value)
      .replace(
        /\[(?:guest_session|table_session|table_draft_id|submitted_by):[^\]]*\]/gi,
        ''
      )
      .replace(/\s*\|\s*\|\s*/g, ' | ')
      .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function num(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function roundMoney(value) {
    return Math.round((num(value, 0) + Number.EPSILON) * 100) / 100;
  }

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return String(prefix || 'qpos') + ':' + window.crypto.randomUUID();
    }
    return String(prefix || 'qpos') + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function tokenUrl(template, token, value) {
    return String(template || '').replace(token, encodeURIComponent(String(value || '')));
  }

  async function fetchJson(url, options) {
    var opts = Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, options || {});

    opts.headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }, opts.headers || {});

    if (opts.method && String(opts.method).toUpperCase() !== 'GET') {
      opts.headers['X-CSRF-TOKEN'] = csrf();
    }

    var response = await fetch(url, opts);
    var json = await response.json().catch(function () { return {}; });

    if (!response.ok || json.ok === false || json.success === false) {
      var message =
        json.message ||
        (json.error && json.error.message) ||
        json.error ||
        ('HTTP ' + response.status);

      var error = new Error(String(message));
      error.status = response.status;
      error.payload = json;
      throw error;
    }

    return json;
  }

  var state = {
    boot: null,
    mode: String(root.getAttribute('data-mode') || 'cashier'),
    serviceMode: 'dine_in',
    settings: {},
    tables: [],
    menu: [],
    categories: [],
    category: 'all',
    search: '',
    selectedTable: null,
    tableData: null,
    openOrders: [],
    activeOrderId: null,
    offPremiseOrder: null,
    forceNewCheck: false,
    cart: [],
    pendingSend: null,
    tableRequestSeq: 0,
    guestCount: 1,
    note: '',
    loading: false,
    submitting: false,
    modifier: null,
    payment: {
      open: false,
      loading: false,
      submitting: false,
      summary: null,
      method: 'cash',
      amount: '',
      cashReceived: '',
      tipPercent: 0,
      reference: '',
      externalConfirmed: false,
      terminal: null,
      receiptUrl: '',
      invoiceUrl: '',
      idempotencyKey: uid('pay')
    }
  };

  if (state.mode === 'waiter') {
    state.serviceMode = 'dine_in';
  }

  function money(value) {
    var symbol = String((state.boot && state.boot.settings && state.boot.settings.currency) || '€');
    return symbol + roundMoney(value).toFixed(2);
  }

  function toast(message, error) {
    var el = $('[data-qpos-toast]');
    if (!el) return;
    el.textContent = String(message || '');
    el.classList.toggle('is-error', !!error);
    el.classList.add('is-show');
    clearTimeout(el.__qposTimer);
    el.__qposTimer = setTimeout(function () {
      el.classList.remove('is-show');
    }, 3200);
  }

  function setOnline(online) {
    var el = $('[data-qpos-online]');
    if (!el) return;
    el.classList.toggle('is-offline', !online);
    el.lastChild.nodeValue = online ? ' Online' : ' Offline';
  }

  function activeOrder() {
    if (state.serviceMode !== 'dine_in') {
      return state.offPremiseOrder;
    }

    var id = Number(state.activeOrderId || 0);
    if (!id) return null;

    return state.openOrders.find(function (order) {
      return Number(order.order_id || order.id || 0) === id;
    }) || null;
  }

  function existingTotal() {
    var order = activeOrder();
    return order
      ? num(order.total != null ? order.total : order.order_total, 0)
      : 0;
  }

  function lineTotal(row) {
    var optionTotal = (row.options || []).reduce(function (sum, option) {
      return sum + num(option.price, 0);
    }, 0);

    return roundMoney(
      (num(row.price, 0) + optionTotal) * Math.max(1, num(row.quantity, 1))
    );
  }

  function cartTotal() {
    return roundMoney(state.cart.reduce(function (sum, row) {
      return sum + lineTotal(row);
    }, 0));
  }

  function pendingSendTotal() {
    var rows =
      state.pendingSend && Array.isArray(state.pendingSend.cart)
        ? state.pendingSend.cart
        : [];

    return roundMoney(rows.reduce(function (sum, row) {
      return sum + lineTotal(row);
    }, 0));
  }

  function itemCount() {
    return state.cart.reduce(function (sum, row) {
      return sum + Math.max(1, num(row.quantity, 1));
    }, 0);
  }

  function canOrderNow() {
    return state.serviceMode !== 'dine_in' || !!state.selectedTable;
  }

  function resetCurrentOrder(keepCart) {
    state.tableData = null;
    state.openOrders = [];
    state.activeOrderId = null;
    state.offPremiseOrder = null;
    if (!keepCart) {
      state.cart = [];
      state.note = '';
    }
  }

  async function bootstrap(silent) {
    if (state.loading) return;
    state.loading = true;
    root.classList.add('is-loading');

    var selectedId = state.selectedTable ? Number(state.selectedTable.id) : 0;

    try {
      var url = root.getAttribute('data-bootstrap-url');
      var json = await fetchJson(url + '?_=' + Date.now());
      state.boot = json;
      state.mode = json.mode || state.mode;
      root.setAttribute('data-mode', state.mode);
      state.settings = json.settings || {};
      state.tables = Array.isArray(json.tables) ? json.tables : [];
      state.menu = Array.isArray(json.menu_items) ? json.menu_items : [];
      state.categories = Array.isArray(json.categories) ? json.categories : [];

      var user = $('[data-qpos-user]');
      if (user) user.textContent = (json.user && json.user.name) || 'Staff';

      if (selectedId) {
        state.selectedTable = state.tables.find(function (table) {
          return Number(table.id) === selectedId;
        }) || null;
      }

      renderAll();

      if (state.selectedTable && state.serviceMode === 'dine_in') {
        await loadTable(state.selectedTable.id, true);
      }

      if (!silent) toast('POS refreshed');
    } catch (error) {
      toast(error.message || 'POS could not be loaded.', true);
    } finally {
      state.loading = false;
      root.classList.remove('is-loading');
    }
  }

  function serviceLabel() {
    if (state.mode === 'waiter') return 'Waiter · Dine in';
    if (state.serviceMode === 'delivery') return 'Cashier · Delivery';
    if (state.serviceMode === 'takeaway') return 'Cashier · Takeaway';
    return 'Cashier · Dine in';
  }

  function renderContext() {
    var context = $('[data-qpos-context]');
    if (context) context.textContent = serviceLabel();

    $$('[data-qpos-service]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        button.getAttribute('data-qpos-service') === state.serviceMode
      );
    });

    var tableActions = $('[data-qpos-table-actions]');
    if (tableActions) {
      tableActions.hidden = !state.selectedTable || state.serviceMode !== 'dine_in';
    }
  }

  function tableStatusLabel(status) {
    return {
      available: 'Free',
      occupied: 'Busy',
      cleaning: 'Cleaning',
      reserved: 'Reserved'
    }[String(status || '').toLowerCase()] || 'Free';
  }

  function renderTables() {
    var box = $('[data-qpos-tables]');
    var count = $('[data-qpos-table-count]');
    var title = $('[data-qpos-table-title]');
    if (!box) return;

    if (count) count.textContent = String(state.tables.length);

    if (state.serviceMode !== 'dine_in') {
      box.innerHTML =
        '<div class="pmd-qpos-no-products">' +
          '<strong>No table needed</strong><br>' +
          '<span>' + (state.serviceMode === 'delivery' ? 'Delivery' : 'Takeaway') + ' order</span>' +
        '</div>';
      if (title) title.textContent = 'Counter order';
      return;
    }

    if (title) {
      title.textContent = state.selectedTable
        ? state.selectedTable.name
        : 'Select a table';
    }

    if (!state.tables.length) {
      box.innerHTML = '<div class="pmd-qpos-no-products">No tables available.</div>';
      return;
    }

    box.innerHTML = state.tables.map(function (table) {
      var selected = state.selectedTable && Number(state.selectedTable.id) === Number(table.id);
      return (
        '<button type="button" class="pmd-qpos-table' + (selected ? ' is-selected' : '') + '"' +
          ' data-qpos-table="' + esc(table.id) + '"' +
          ' data-status="' + esc(table.status || 'available') + '">' +
          '<strong>' + esc(table.name || ('Table ' + table.number)) + '</strong>' +
          '<small>' + esc(tableStatusLabel(table.status)) +
            (num(table.capacity, 0) > 0 ? ' · ' + esc(table.capacity) + ' seats' : '') +
          '</small>' +
        '</button>'
      );
    }).join('');

    $$('[data-qpos-table]', box).forEach(function (button) {
      button.onclick = function () {
        selectTable(Number(button.getAttribute('data-qpos-table')));
      };
    });
  }

  function renderCategories() {
    var box = $('[data-qpos-categories]');
    if (!box) return;

    var rows = [{id: 'all', name: 'All'}].concat(state.categories || []);
    box.innerHTML = rows.map(function (category) {
      var id = String(category.id);
      return (
        '<button type="button" data-qpos-category="' + esc(id) + '"' +
          (String(state.category) === id ? ' class="is-active"' : '') + '>' +
          esc(category.name || 'Menu') +
        '</button>'
      );
    }).join('');

    $$('[data-qpos-category]', box).forEach(function (button) {
      button.onclick = function () {
        state.category = button.getAttribute('data-qpos-category') || 'all';
        renderCategories();
        renderProducts();
      };
    });
  }

  function filteredMenu() {
    var search = String(state.search || '').trim().toLowerCase();
    var category = String(state.category || 'all');

    return state.menu.filter(function (item) {
      if (
        category !== 'all' &&
        !(item.category_ids || []).some(function (id) {
          return String(id) === category;
        })
      ) {
        return false;
      }

      if (!search) return true;

      var haystack = [
        item.name,
        item.description,
        (item.category_names || []).join(' ')
      ].join(' ').toLowerCase();

      return haystack.indexOf(search) !== -1;
    });
  }

  function renderProducts() {
    var box = $('[data-qpos-products]');
    var status = $('[data-qpos-catalog-status]');
    if (!box) return;

    var items = filteredMenu();

    if (status) {
      if (!canOrderNow()) {
        status.textContent = 'Select a table to start the check.';
      } else {
        status.textContent = items.length + ' menu items';
      }
    }

    if (!items.length) {
      box.innerHTML = '<div class="pmd-qpos-no-products">No menu items match this filter.</div>';
      return;
    }

    box.innerHTML = items.map(function (item) {
      var orderable =
        item.orderable !== false &&
        item.price_configured !== false &&
        num(item.price, 0) > 0;

      var image = String(item.image || '');
      return (
        '<button type="button" class="pmd-qpos-product' + (orderable ? '' : ' is-disabled') + '"' +
          ' data-qpos-product="' + esc(item.id) + '"' +
          (orderable ? '' : ' disabled') + '>' +
          (image
            ? '<div class="pmd-qpos-product-image" style="background-image:url(&quot;' + esc(image) + '&quot;)"></div>'
            : '<div class="pmd-qpos-product-image"></div>') +
          (item.is_bestseller ? '<span class="pmd-qpos-product-badge">Popular</span>' : '') +
          '<strong>' + esc(item.name) + '</strong>' +
          '<footer><span>' +
            (item.has_options ? 'Options' : (item.prep_minutes ? esc(item.prep_minutes) + ' min' : 'Tap to add')) +
          '</span><b>' + (orderable ? money(item.price) : 'No price') + '</b></footer>' +
        '</button>'
      );
    }).join('');

    $$('[data-qpos-product]', box).forEach(function (button) {
      button.onclick = function () {
        if (!canOrderNow()) {
          toast('Select a table first.', true);
          return;
        }

        var id = Number(button.getAttribute('data-qpos-product'));
        var item = state.menu.find(function (row) {
          return Number(row.id) === id;
        });
        if (!item) return;

        if (item.has_options || (item.options || []).length) {
          openModifier(item);
        } else {
          addCartLine(item, [], Math.max(1, num(item.minimum_qty, 1)), '');
        }
      };
    });
  }

  function orderId(order) {
    return Number(order && (order.order_id || order.id) || 0);
  }

  function orderTotal(order) {
    return num(order && (order.total != null ? order.total : order.order_total), 0);
  }

  function orderItems(order) {
    return Array.isArray(order && order.items) ? order.items : [];
  }

  function selectOrder(id) {
    id = Number(id || 0);
    state.activeOrderId = id > 0 ? id : null;
    state.forceNewCheck = id < 1;
    var order = activeOrder();
    if (order && order.guest_count) {
      state.guestCount = Math.max(1, num(order.guest_count, 1));
    }
    renderCart();
  }

  function renderOpenChecks() {
    var box = $('[data-qpos-open-checks]');
    if (!box) return;

    if (state.serviceMode !== 'dine_in' || !state.selectedTable || !state.openOrders.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.hidden = false;
    var rows = [
      '<button type="button" data-qpos-check="new"' +
        (!state.activeOrderId ? ' class="is-active"' : '') +
        '>+ New check</button>'
    ];

    state.openOrders.forEach(function (order) {
      var id = orderId(order);
      rows.push(
        '<button type="button" data-qpos-check="' + esc(id) + '"' +
          (Number(state.activeOrderId) === id ? ' class="is-active"' : '') + '>' +
          '#' + esc(id) + ' · ' + money(orderTotal(order)) +
        '</button>'
      );
    });

    box.innerHTML = rows.join('');

    $$('[data-qpos-check]', box).forEach(function (button) {
      button.onclick = function () {
        var value = button.getAttribute('data-qpos-check');
        selectOrder(value === 'new' ? null : Number(value));
      };
    });
  }

  function renderSentItems() {
    var section = $('[data-qpos-sent]');
    var box = $('[data-qpos-sent-items]');
    var total = $('[data-qpos-sent-total]');
    var order = activeOrder();

    if (!section || !box) return;

    var committed = orderItems(order);
    var pending = (
      state.pendingSend &&
      Array.isArray(state.pendingSend.cart)
    )
      ? state.pendingSend.cart.map(function (row) {
          return {
            name: row.name,
            quantity: row.quantity,
            subtotal: lineTotal(row),
            comment: row.comment || '',
            __pending: true
          };
        })
      : [];

    var items = committed.concat(pending);

    if (!items.length) {
      section.hidden = true;
      box.innerHTML = '';
      return;
    }

    section.hidden = false;
    if (total) {
      total.textContent = money(
        (order ? orderTotal(order) : 0) + pendingSendTotal()
      );
    }

    box.innerHTML = items.map(function (item) {
      var qty = num(item.quantity != null ? item.quantity : item.qty, 1);
      var subtotal = num(item.subtotal != null ? item.subtotal : item.line_subtotal, 0);
      return (
        '<div class="pmd-qpos-sent-line' + (item.__pending ? ' is-pending' : '') + '">' +
          '<b>' + esc(qty) + '×</b>' +
          '<span>' + esc(item.name || item.menu_name || 'Item') +
            (visibleNote(item.comment) ? '<small>' + esc(visibleNote(item.comment)) + '</small>' : '') +
            (item.__pending ? '<small class="pmd-qpos-syncing">Sending…</small>' : '') +
          '</span>' +
          '<strong>' + money(subtotal) + '</strong>' +
        '</div>'
      );
    }).join('');
  }

  function cartSignature(item, options, comment) {
    return [
      String(item.id),
      (options || []).map(function (row) { return String(row.id); }).sort().join(','),
      String(comment || '').trim().toLowerCase()
    ].join(':');
  }

  function addCartLine(item, options, quantity, comment) {
    var qty = Math.max(
      Math.max(1, num(item.minimum_qty, 1)),
      Math.min(99, num(quantity, 1))
    );

    var key = cartSignature(item, options, comment);
    var existing = state.cart.find(function (row) {
      return row.key === key;
    });

    if (existing) {
      existing.quantity = Math.min(99, num(existing.quantity, 0) + qty);
    } else {
      state.cart.push({
        key: key,
        menu_id: Number(item.id),
        name: item.name,
        price: num(item.price, 0),
        quantity: qty,
        options: options || [],
        comment: String(comment || '').trim()
      });
    }

    renderCart();
    toast(item.name + ' added');
  }

  function changeCartQty(index, delta) {
    var row = state.cart[index];
    if (!row) return;
    row.quantity = Math.max(0, num(row.quantity, 1) + delta);
    if (row.quantity < 1) state.cart.splice(index, 1);
    renderCart();
  }

  function renderCart() {
    renderOpenChecks();
    renderSentItems();

    var list = $('[data-qpos-cart-list]');
    if (list) {
      if (!state.cart.length) {
        list.innerHTML =
          '<div class="pmd-qpos-empty-cart">' +
            '<strong>No new items</strong>' +
            '<span>Tap a product to add it.</span>' +
          '</div>';
      } else {
        list.innerHTML = state.cart.map(function (row, index) {
          var options = (row.options || []).map(function (option) {
            return option.name + (num(option.price, 0) ? ' +' + money(option.price) : '');
          }).join(' · ');

          return (
            '<article class="pmd-qpos-cart-line">' +
              '<div class="pmd-qpos-cart-line-top">' +
                '<div><strong>' + esc(row.name) + '</strong>' +
                  (options ? '<small>' + esc(options) + '</small>' : '') +
                  (row.comment ? '<small>' + esc(row.comment) + '</small>' : '') +
                '</div>' +
                '<strong>' + money(lineTotal(row)) + '</strong>' +
              '</div>' +
              '<div class="pmd-qpos-cart-line-actions">' +
                '<div class="pmd-qpos-line-qty">' +
                  '<button type="button" data-qpos-dec="' + index + '">−</button>' +
                  '<b>' + esc(row.quantity) + '</b>' +
                  '<button type="button" data-qpos-inc="' + index + '">+</button>' +
                '</div>' +
                '<button type="button" class="pmd-qpos-line-remove" data-qpos-remove="' + index + '">×</button>' +
              '</div>' +
            '</article>'
          );
        }).join('');

        $$('[data-qpos-inc]', list).forEach(function (button) {
          button.onclick = function () {
            changeCartQty(Number(button.getAttribute('data-qpos-inc')), 1);
          };
        });
        $$('[data-qpos-dec]', list).forEach(function (button) {
          button.onclick = function () {
            changeCartQty(Number(button.getAttribute('data-qpos-dec')), -1);
          };
        });
        $$('[data-qpos-remove]', list).forEach(function (button) {
          button.onclick = function () {
            var index = Number(button.getAttribute('data-qpos-remove'));
            state.cart.splice(index, 1);
            renderCart();
          };
        });
      }
    }

    var order = activeOrder();
    var title = $('[data-qpos-check-title]');
    if (title) {
      if (order) {
        title.textContent = 'Order #' + orderId(order);
      } else if (state.serviceMode === 'takeaway') {
        title.textContent = 'New takeaway';
      } else if (state.serviceMode === 'delivery') {
        title.textContent = 'New delivery';
      } else if (state.selectedTable) {
        title.textContent = state.selectedTable.name + ' · New check';
      } else {
        title.textContent = 'New order';
      }
    }

    var newTotal = cartTotal();
    var total = roundMoney(
      existingTotal() + pendingSendTotal() + newTotal
    );

    var newTotalEl = $('[data-qpos-new-total]');
    var totalEl = $('[data-qpos-total]');
    var mobileTotal = $('[data-qpos-mobile-total]');
    var mobileCount = $('[data-qpos-mobile-count]');
    if (newTotalEl) newTotalEl.textContent = money(newTotal);
    if (totalEl) totalEl.textContent = money(total);
    if (mobileTotal) mobileTotal.textContent = money(total);
    if (mobileCount) mobileCount.textContent = String(itemCount());

    var guests = $('[data-qpos-guests]');
    if (guests) guests.textContent = String(state.guestCount);

    var note = $('[data-qpos-note]');
    if (note && note.value !== state.note) note.value = state.note;

    var hold = $('[data-qpos-hold]');
    var send = $('[data-qpos-send]');
    var pay = $('[data-qpos-pay]');

    var canSave = canOrderNow() && state.cart.length > 0 && !state.submitting;
    root.classList.toggle('is-committing', !!state.submitting);

    if (hold) {
      hold.disabled = !canSave;
      hold.textContent = state.submitting ? 'Saving…' : 'Hold';
    }

    if (send) {
      send.disabled = !canSave;
      send.textContent = state.submitting ? 'Sending…' : 'Send';
    }

    if (pay) {
      var canPayPermission =
        (state.boot && state.boot.permissions && state.boot.permissions.payments) !== false;

      pay.disabled =
        !!state.pendingSend ||
        state.submitting ||
        !canPayPermission ||
        (
          !activeOrder() &&
          !(canOrderNow() && state.cart.length > 0)
        );

      pay.textContent = state.cart.length > 0
        ? 'Send & Pay'
        : 'Pay';
    }

    renderContext();
  }

  async function selectTable(id) {
    var table = state.tables.find(function (row) {
      return Number(row.id) === Number(id);
    });
    if (!table) return;

    if (
      state.cart.length &&
      state.selectedTable &&
      Number(state.selectedTable.id) !== Number(table.id) &&
      !window.confirm('Move away from this unsent cart? The draft will be cleared.')
    ) {
      return;
    }

    state.serviceMode = 'dine_in';
    state.selectedTable = table;
    state.cart = [];
    state.note = '';
    state.activeOrderId = null;
    state.offPremiseOrder = null;

    renderAll();
    await loadTable(table.id, false);

    if (window.innerWidth <= 820) {
      var catalog = $('.pmd-qpos-catalog');
      if (catalog && catalog.scrollIntoView) {
        catalog.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    }
  }

  async function loadTable(id, silent) {
    if (!state.settings.table_data_url) return;

    var requestSeq = ++state.tableRequestSeq;

    try {
      var url = tokenUrl(state.settings.table_data_url, '{table}', id);
      var json = await fetchJson(url + '?_=' + Date.now());

      if (
        requestSeq !== state.tableRequestSeq ||
        !state.selectedTable ||
        Number(state.selectedTable.id) !== Number(id)
      ) {
        return;
      }

      state.tableData = json;
      state.openOrders = Array.isArray(json.open_orders) ? json.open_orders : [];
      state.activeOrderId = Number(json.active_order_id || 0) || null;
      state.forceNewCheck = false;

      var table = json.table || null;
      if (table && state.selectedTable) {
        state.selectedTable = Object.assign({}, state.selectedTable, table);
      }

      var order = activeOrder();
      if (order && order.guest_count) {
        state.guestCount = Math.max(1, num(order.guest_count, 1));
      }

      renderAll();
      if (!silent) toast((state.selectedTable && state.selectedTable.name) + ' opened');
    } catch (error) {
      if (!silent && requestSeq === state.tableRequestSeq) {
        toast(error.message || 'Table could not be opened.', true);
      }
    }
  }

  function setServiceMode(mode) {
    if (state.mode === 'waiter') return;
    mode = String(mode || '');

    if (['dine_in', 'takeaway', 'delivery'].indexOf(mode) === -1) return;
    if (mode === state.serviceMode) return;

    if (
      state.cart.length &&
      !window.confirm('Change order type? The unsent cart will be cleared.')
    ) {
      return;
    }

    state.serviceMode = mode;
    state.cart = [];
    state.note = '';
    state.guestCount = 1;
    state.tableData = null;
    state.openOrders = [];
    state.activeOrderId = null;
    state.offPremiseOrder = null;

    if (mode !== 'dine_in') {
      state.selectedTable = null;
    }

    renderAll();
  }

  function optimisticSentItems(rows) {
    return (rows || []).map(function (row) {
      return {
        menu_id: row.menu_id,
        name: row.name,
        quantity: row.quantity,
        price: num(row.price, 0),
        subtotal: lineTotal(row),
        comment: row.comment || ''
      };
    });
  }

  function applyQuickSaveResponse(json, snapshot) {
    var id = Number(json.order_id || 0);
    if (!id) return;

    var total = num(json.order_total, 0);
    var sentItems = optimisticSentItems(snapshot.cart);

    state.activeOrderId = id;
    state.forceNewCheck = false;

    if (snapshot.serviceMode === 'dine_in') {
      var found = false;

      state.openOrders = state.openOrders.map(function (row) {
        if (orderId(row) !== id) return row;
        found = true;

        return Object.assign({}, row, {
          order_id: id,
          total: total,
          order_total: total,
          total_items: num(json.total_items, row.total_items || 0),
          updated_at: json.updated_at || row.updated_at || '',
          guest_count: snapshot.guestCount,
          items: orderItems(row).concat(sentItems)
        });
      });

      if (!found) {
        state.openOrders.unshift({
          order_id: id,
          total: total,
          order_total: total,
          total_items: num(json.total_items, 0),
          updated_at: json.updated_at || '',
          guest_count: snapshot.guestCount,
          settlement_status: 'unpaid',
          items: sentItems
        });
      }
    } else {
      var existingItems =
        state.offPremiseOrder && Array.isArray(state.offPremiseOrder.items)
          ? state.offPremiseOrder.items
          : [];

      state.offPremiseOrder = Object.assign(
        {},
        state.offPremiseOrder || {},
        {
          order_id: id,
          order_total: total,
          total: total,
          total_items: num(json.total_items, 0),
          updated_at: json.updated_at || '',
          settlement_status: 'unpaid',
          items: existingItems.concat(sentItems)
        }
      );
    }
  }

  async function submitOrder(mode, afterSuccess) {
    if (state.submitting || !state.cart.length) return;

    if (!canOrderNow()) {
      toast('Select a table first.', true);
      return;
    }

    var order = activeOrder();
    var snapshot = {
      mode: mode,
      serviceMode: state.serviceMode,
      tableId: state.selectedTable ? Number(state.selectedTable.id) : null,
      activeOrderId: state.activeOrderId,
      expectedUpdatedAt: order && order.updated_at ? order.updated_at : null,
      guestCount: state.guestCount,
      note: state.note,
      forceNewCheck: !!state.forceNewCheck,
      cart: state.cart.map(function (row) {
        return Object.assign({}, row, {
          options: (row.options || []).map(function (option) {
            return Object.assign({}, option);
          })
        });
      })
    };

    var payload = {
      mode: snapshot.mode,
      order_id: snapshot.activeOrderId,
      expected_updated_at: snapshot.expectedUpdatedAt,
      guest_count: snapshot.guestCount,
      note: snapshot.note,
      force_new_check:
        snapshot.serviceMode === 'dine_in'
          ? snapshot.forceNewCheck
          : false,
      quick_pos: true,
      items: snapshot.cart.map(function (row) {
        return {
          menu_id: row.menu_id,
          quantity: row.quantity,
          comment: row.comment || '',
          options: (row.options || []).map(function (option) {
            return option.id;
          })
        };
      })
    };

    var url;
    if (snapshot.serviceMode === 'dine_in') {
      url = tokenUrl(
        state.settings.table_save_url,
        '{table}',
        snapshot.tableId
      );
    } else {
      url = state.settings.off_premise_save_url;
      payload.service_mode = snapshot.serviceMode;
      payload.location_id = state.boot ? state.boot.location_id : null;
    }

    // Touch-first acknowledgement: the cart moves immediately into a
    // "Sending…" state. If the server rejects the write, it is restored.
    state.submitting = true;
    state.pendingSend = snapshot;
    state.cart = [];
    state.note = '';

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (ignored) {}
    }

    renderCart();
    toast(mode === 'send' ? 'Sending…' : 'Saving…');

    try {
      var json = await fetchJson(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      applyQuickSaveResponse(json, snapshot);
      state.pendingSend = null;
      state.submitting = false;
      renderAll();
      toast(json.message || 'Order saved');

      window.dispatchEvent(new CustomEvent('pmd:quick-pos-order-updated', {
        detail: json
      }));

      if (afterSuccess === 'pay') {
        setTimeout(function () {
          openPayment();
        }, 0);
      }

      // Server reconciliation is background-only. The successful POST already
      // returned authoritative ids/totals, so the cashier never waits for a
      // second GET before continuing.
      if (
        snapshot.serviceMode === 'dine_in' &&
        snapshot.tableId &&
        state.selectedTable &&
        Number(state.selectedTable.id) === Number(snapshot.tableId)
      ) {
        setTimeout(function () {
          loadTable(snapshot.tableId, true);
        }, 0);
      }
    } catch (error) {
      state.pendingSend = null;

      // Never lose unsent work. Merge the rejected snapshot back in front of
      // anything the operator tapped while the request was in flight.
      state.cart = snapshot.cart.concat(state.cart);
      if (!state.note) state.note = snapshot.note;
      state.guestCount = snapshot.guestCount;
      state.forceNewCheck = snapshot.forceNewCheck;

      toast(error.message || 'Order could not be saved.', true);
    } finally {
      state.submitting = false;
      renderAll();
    }
  }

  function newCheck() {
    if (state.cart.length && !window.confirm('Clear the current unsent cart?')) {
      return;
    }

    state.cart = [];
    state.note = '';
    state.guestCount = 1;
    state.activeOrderId = null;
    state.offPremiseOrder = null;
    state.forceNewCheck = state.serviceMode === 'dine_in';
    renderAll();
  }

  /* Product modifier modal */
  function openModifier(item) {
    var selected = {};

    (item.options || []).forEach(function (group) {
      selected[String(group.id)] = [];
      (group.values || []).forEach(function (value) {
        if (value.default) selected[String(group.id)].push(Number(value.id));
      });
    });

    state.modifier = {
      item: item,
      quantity: Math.max(1, num(item.minimum_qty, 1)),
      note: '',
      selected: selected
    };

    renderModifier();
    var modal = $('[data-qpos-modifier-modal]');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModifier() {
    var modal = $('[data-qpos-modifier-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    state.modifier = null;
  }

  function selectedModifierOptions() {
    if (!state.modifier) return [];
    var out = [];

    (state.modifier.item.options || []).forEach(function (group) {
      var selectedIds = state.modifier.selected[String(group.id)] || [];
      (group.values || []).forEach(function (value) {
        if (selectedIds.indexOf(Number(value.id)) !== -1) {
          out.push({
            id: Number(value.id),
            name: value.name,
            price: num(value.price, 0),
            group_id: Number(group.id)
          });
        }
      });
    });

    return out;
  }

  function modifierTotal() {
    if (!state.modifier) return 0;
    var unit = num(state.modifier.item.price, 0);
    selectedModifierOptions().forEach(function (option) {
      unit += num(option.price, 0);
    });
    return roundMoney(unit * state.modifier.quantity);
  }

  function toggleModifierValue(groupId, valueId) {
    if (!state.modifier) return;

    var group = (state.modifier.item.options || []).find(function (row) {
      return Number(row.id) === Number(groupId);
    });
    if (!group) return;

    var key = String(group.id);
    var selected = state.modifier.selected[key] || [];
    var id = Number(valueId);
    var found = selected.indexOf(id);

    if (found !== -1) {
      selected.splice(found, 1);
    } else if (Math.max(1, num(group.max, 1)) === 1) {
      selected = [id];
    } else if (selected.length < Math.max(1, num(group.max, 1))) {
      selected.push(id);
    } else {
      toast('Maximum ' + group.max + ' choices.', true);
    }

    state.modifier.selected[key] = selected;
    renderModifier();
  }

  function renderModifier() {
    if (!state.modifier) return;

    var item = state.modifier.item;
    var name = $('[data-qpos-modifier-name]');
    var meta = $('[data-qpos-modifier-meta]');
    var box = $('[data-qpos-modifier-options]');
    var qty = $('[data-qpos-modifier-qty]');
    var price = $('[data-qpos-modifier-price]');
    var note = $('[data-qpos-modifier-note]');

    if (name) name.textContent = item.name;
    if (meta) {
      var details = [];
      if (item.description) details.push(item.description);
      if (item.allergens && item.allergens.length) {
        details.push('Allergens: ' + item.allergens.map(function (row) { return row.name; }).join(', '));
      }
      meta.textContent = details.join(' · ');
    }

    if (box) {
      box.innerHTML = (item.options || []).map(function (group) {
        var selected = state.modifier.selected[String(group.id)] || [];
        var min = num(group.min, 0);
        var max = Math.max(1, num(group.max, 1));
        var requirement = group.required
          ? 'Required' + (max > 1 ? ' · up to ' + max : '')
          : (max > 1 ? 'Choose up to ' + max : 'Optional');

        return (
          '<section class="pmd-qpos-option-group">' +
            '<header><strong>' + esc(group.name) + '</strong><span>' + esc(requirement) + '</span></header>' +
            '<div class="pmd-qpos-option-grid">' +
              (group.values || []).map(function (value) {
                var active = selected.indexOf(Number(value.id)) !== -1;
                return (
                  '<button type="button" class="pmd-qpos-option' + (active ? ' is-selected' : '') + '"' +
                    ' data-option-group="' + esc(group.id) + '"' +
                    ' data-option-value="' + esc(value.id) + '">' +
                    '<b>' + esc(value.name) + '</b>' +
                    '<span>' + (num(value.price, 0) ? '+' + money(value.price) : 'Included') + '</span>' +
                  '</button>'
                );
              }).join('') +
            '</div>' +
          '</section>'
        );
      }).join('');

      $$('[data-option-value]', box).forEach(function (button) {
        button.onclick = function () {
          toggleModifierValue(
            Number(button.getAttribute('data-option-group')),
            Number(button.getAttribute('data-option-value'))
          );
        };
      });
    }

    if (qty) qty.textContent = String(state.modifier.quantity);
    if (price) price.textContent = money(modifierTotal());
    if (note && note.value !== state.modifier.note) note.value = state.modifier.note;
  }

  function addModifierItem() {
    if (!state.modifier) return;

    var invalid = (state.modifier.item.options || []).find(function (group) {
      var selected = state.modifier.selected[String(group.id)] || [];
      var min = Math.max(group.required ? 1 : 0, num(group.min, 0));
      return selected.length < min;
    });

    if (invalid) {
      toast('Choose ' + invalid.name + '.', true);
      return;
    }

    addCartLine(
      state.modifier.item,
      selectedModifierOptions(),
      state.modifier.quantity,
      state.modifier.note
    );
    closeModifier();
  }

  /* Payment */
  function resetPayment() {
    state.payment = {
      open: true,
      loading: false,
      submitting: false,
      summary: null,
      method: 'cash',
      amount: '',
      cashReceived: '',
      tipPercent: 0,
      reference: '',
      externalConfirmed: false,
      terminal: null,
      receiptUrl: '',
      invoiceUrl: '',
      idempotencyKey: uid('pay'),
      touchKeypadTarget: null,
      touchKeypadFresh: true
    };
  }

  function paymentRemaining() {
    return num(
      state.payment.summary &&
      state.payment.summary.settlement &&
      state.payment.summary.settlement.remaining_amount,
      0
    );
  }

  function paymentAmount() {
    var remaining = paymentRemaining();
    var amount = state.payment.amount === ''
      ? remaining
      : num(state.payment.amount, remaining);
    return Math.max(0, Math.min(remaining, roundMoney(amount)));
  }

  function paymentTip() {
    return roundMoney(paymentAmount() * Math.max(0, num(state.payment.tipPercent, 0)) / 100);
  }

  function paymentCharge() {
    return roundMoney(paymentAmount() + paymentTip());
  }

  async function openPayment() {
    if (state.cart.length) {
      toast('Send or hold new items before payment.', true);
      return;
    }
    if (!state.activeOrderId) {
      toast('Create or select an order first.', true);
      return;
    }

    resetPayment();

    var modal = $('[data-qpos-payment-modal]');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }

    await loadPaymentSummary(false);
  }

  function closePayment() {
    var modal = $('[data-qpos-payment-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    state.payment.open = false;
    state.payment.touchKeypadTarget = null;
    state.payment.touchKeypadFresh = true;
    renderTouchKeypad();
  }

  async function loadPaymentSummary(silent) {
    if (!state.activeOrderId || state.payment.loading) return;
    state.payment.loading = true;

    try {
      var url = tokenUrl(
        state.settings.payment_summary_url,
        '{order}',
        state.activeOrderId
      );
      var json = await fetchJson(url + '?_=' + Date.now());
      state.payment.summary = json;
      state.payment.amount = roundMoney(
        num(json.settlement && json.settlement.remaining_amount, 0)
      ).toFixed(2);
      state.payment.cashReceived = state.payment.amount;
      renderPayment();
      if (!silent) toast('Payment ready');
    } catch (error) {
      showPaymentError(error.message || 'Payment details could not be loaded.');
    } finally {
      state.payment.loading = false;
      renderPayment();
    }
  }

  function showPaymentError(message) {
    var el = $('[data-qpos-payment-error]');
    if (!el) return;
    el.hidden = !message;
    el.textContent = String(message || '');
  }

  function renderPaymentMethods() {
    var box = $('[data-qpos-payment-methods]');
    if (!box || !state.payment.summary) return;

    var providers = Array.isArray(state.payment.summary.terminal_providers)
      ? state.payment.summary.terminal_providers
      : [];

    var methods = [
      {code: 'cash', name: 'Cash'},
      {code: 'external_terminal', name: 'Card'}
    ];

    if (providers.length) {
      methods.push({code: 'direct_terminal', name: 'Terminal'});
    }

    box.innerHTML = methods.map(function (method) {
      return (
        '<button type="button" data-payment-method="' + esc(method.code) + '"' +
          (state.payment.method === method.code ? ' class="is-active"' : '') + '>' +
          esc(method.name) +
        '</button>'
      );
    }).join('');

    $$('[data-payment-method]', box).forEach(function (button) {
      button.onclick = function () {
        state.payment.method = button.getAttribute('data-payment-method');
        state.payment.reference = '';
        state.payment.externalConfirmed = false;
        state.payment.terminal = null;

        if (state.payment.method === 'direct_terminal') {
          state.payment.amount = roundMoney(paymentRemaining()).toFixed(2);
          state.payment.tipPercent = 0;
          state.payment.touchKeypadTarget = null;
        } else if (
          state.payment.method !== 'cash' &&
          state.payment.touchKeypadTarget === 'cash'
        ) {
          state.payment.touchKeypadTarget = 'amount';
          state.payment.touchKeypadFresh = true;
        }

        renderPayment();
      };
    });
  }

  function renderTerminals() {
    var wrap = $('[data-qpos-terminals]');
    var box = $('[data-qpos-terminal-list]');
    if (!wrap || !box || !state.payment.summary) return;

    var providers = Array.isArray(state.payment.summary.terminal_providers)
      ? state.payment.summary.terminal_providers
      : [];

    wrap.hidden = state.payment.method !== 'direct_terminal' || !providers.length;

    if (wrap.hidden) {
      box.innerHTML = '';
      return;
    }

    box.innerHTML = providers.map(function (terminal, index) {
      var selected =
        state.payment.terminal &&
        Number(state.payment.terminal.terminal_device_id || 0) === Number(terminal.terminal_device_id || 0) &&
        String(state.payment.terminal.provider_code || '') === String(terminal.provider_code || '');

      return (
        '<button type="button" class="pmd-qpos-terminal' + (selected ? ' is-selected' : '') + '"' +
          ' data-terminal-index="' + index + '">' +
          '<strong>' + esc(terminal.name || terminal.provider_code || 'Terminal') + '</strong>' +
          (terminal.terminal_status ? ' · ' + esc(terminal.terminal_status) : '') +
        '</button>'
      );
    }).join('');

    $$('[data-terminal-index]', box).forEach(function (button) {
      button.onclick = function () {
        var index = Number(button.getAttribute('data-terminal-index'));
        state.payment.terminal = providers[index] || null;
        renderTerminals();
        renderPaymentTotals();
      };
    });
  }

  function cashPresetValues() {
    var charge = paymentCharge();
    var values = [charge];
    [5, 10, 20, 50, 100, 200].forEach(function (step) {
      var candidate = Math.ceil(charge / step) * step;
      if (candidate + 0.001 >= charge && values.indexOf(candidate) === -1) {
        values.push(candidate);
      }
    });
    return values.slice(0, 4);
  }

  function renderCashPresets() {
    var box = $('[data-qpos-cash-presets]');
    if (!box) return;

    box.hidden = state.payment.method !== 'cash';
    if (box.hidden) {
      box.innerHTML = '';
      return;
    }

    var current = roundMoney(num(state.payment.cashReceived, 0));
    var values = cashPresetValues();

    box.innerHTML = values.map(function (value, index) {
      var active = Math.abs(current - value) < 0.001;
      return (
        '<button type="button" data-cash-value="' + esc(value) + '"' +
          (active ? ' class="is-active"' : '') + '>' +
          (index === 0 ? 'Exact ' : '') + money(value) +
        '</button>'
      );
    }).join('');

    $$('[data-cash-value]', box).forEach(function (button) {
      button.onclick = function () {
        state.payment.cashReceived = roundMoney(
          num(button.getAttribute('data-cash-value'), paymentCharge())
        ).toFixed(2);
        state.payment.touchKeypadTarget = 'cash';
        state.payment.touchKeypadFresh = true;
        renderPaymentTotals();
      };
    });
  }

  /* PMD_TOUCH_NUMPAD_V1
   * Built-in numeric keypad for restaurant touch terminals. It intentionally
   * owns only monetary fields; text/search/note fields keep their normal
   * keyboard behavior.
   */
  function touchKeypadRawValue(target) {
    return String(
      target === 'cash'
        ? (state.payment.cashReceived == null ? '' : state.payment.cashReceived)
        : (state.payment.amount == null ? '' : state.payment.amount)
    );
  }

  function touchKeypadDisplayValue(target) {
    var raw = touchKeypadRawValue(target);
    if (raw === '') return '0.00';
    return raw;
  }

  function renderTouchKeypad() {
    var keypad = $('[data-qpos-touch-keypad]');
    var label = $('[data-qpos-touch-keypad-label]');
    var value = $('[data-qpos-touch-keypad-value]');
    var exact = $('[data-qpos-keypad-exact]');
    var amountEl = $('[data-qpos-payment-amount]');
    var cashEl = $('[data-qpos-cash-received]');
    var target = state.payment.touchKeypadTarget;

    if (amountEl) {
      amountEl.classList.toggle('is-keypad-target', target === 'amount');
    }
    if (cashEl) {
      cashEl.classList.toggle('is-keypad-target', target === 'cash');
    }

    if (!keypad) return;

    var allowed =
      state.payment.open &&
      (target === 'amount' || target === 'cash') &&
      !(target === 'amount' && state.payment.method === 'direct_terminal') &&
      !(target === 'cash' && state.payment.method !== 'cash');

    keypad.hidden = !allowed;
    if (!allowed) return;

    if (label) {
      label.textContent = target === 'cash'
        ? 'Cash received'
        : 'Payment amount';
    }

    if (value) {
      value.textContent = money(num(touchKeypadDisplayValue(target), 0));
    }

    if (exact) {
      exact.textContent = target === 'cash' ? 'Exact' : 'Full';
    }
  }

  function openTouchKeypad(target) {
    target = String(target || '');

    if (
      target !== 'amount' &&
      target !== 'cash'
    ) {
      return;
    }

    if (
      target === 'amount' &&
      state.payment.method === 'direct_terminal'
    ) {
      return;
    }

    if (
      target === 'cash' &&
      state.payment.method !== 'cash'
    ) {
      return;
    }

    state.payment.touchKeypadTarget = target;
    state.payment.touchKeypadFresh = true;
    renderTouchKeypad();

    var keypad = $('[data-qpos-touch-keypad]');
    if (keypad && keypad.scrollIntoView) {
      window.requestAnimationFrame(function () {
        keypad.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      });
    }
  }

  function normalizeTouchKeypadValue(raw) {
    raw = String(raw == null ? '' : raw)
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');

    var dot = raw.indexOf('.');
    if (dot !== -1) {
      raw =
        raw.slice(0, dot + 1) +
        raw.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    }

    if (raw.length > 10) {
      raw = raw.slice(0, 10);
    }

    return raw;
  }

  function setTouchKeypadValue(target, raw) {
    raw = normalizeTouchKeypadValue(raw);

    if (target === 'cash') {
      state.payment.cashReceived = raw;
    } else {
      state.payment.amount = raw;

      if (state.payment.method === 'cash') {
        state.payment.cashReceived = roundMoney(
          paymentCharge()
        ).toFixed(2);
      }
    }

    renderPaymentTotals();
  }

  function applyTouchKeypadKey(key) {
    var target = state.payment.touchKeypadTarget;
    if (target !== 'amount' && target !== 'cash') return;

    key = String(key || '');
    var raw = touchKeypadRawValue(target);

    if (key === 'done') {
      if (raw !== '') {
        setTouchKeypadValue(
          target,
          roundMoney(num(raw, 0)).toFixed(2)
        );
      }
      state.payment.touchKeypadTarget = null;
      state.payment.touchKeypadFresh = true;
      renderTouchKeypad();
      return;
    }

    if (key === 'clear') {
      state.payment.touchKeypadFresh = false;
      setTouchKeypadValue(target, '');
      renderTouchKeypad();
      return;
    }

    if (key === 'backspace') {
      if (state.payment.touchKeypadFresh) {
        raw = '';
      } else {
        raw = raw.slice(0, -1);
      }
      state.payment.touchKeypadFresh = false;
      setTouchKeypadValue(target, raw);
      renderTouchKeypad();
      return;
    }

    if (key === 'exact') {
      raw = (
        target === 'cash'
          ? paymentCharge()
          : paymentRemaining()
      ).toFixed(2);
      state.payment.touchKeypadFresh = true;
      setTouchKeypadValue(target, raw);
      renderTouchKeypad();
      return;
    }

    if (state.payment.touchKeypadFresh) {
      raw = '';
      state.payment.touchKeypadFresh = false;
    }

    if (key === '.') {
      if (raw.indexOf('.') === -1) {
        raw = (raw || '0') + '.';
      }
    } else if (/^\d{1,2}$/.test(key)) {
      if (raw === '0' && key !== '00') {
        raw = '';
      }
      raw += key;
    } else {
      return;
    }

    setTouchKeypadValue(target, raw);
    renderTouchKeypad();
  }

  function renderPaymentTotals() {
    var amountEl = $('[data-qpos-payment-amount]');
    var cashEl = $('[data-qpos-cash-received]');
    var chargeEl = $('[data-qpos-payment-charge]');
    var changeBox = $('[data-qpos-change]');
    var changeEl = $('[data-qpos-change-amount]');
    var submit = $('[data-qpos-payment-submit]');
    var receipt = $('[data-qpos-payment-receipt]');

    if (receipt) {
      receipt.hidden = !state.payment.receiptUrl;
      if (state.payment.receiptUrl) {
        receipt.href = state.payment.receiptUrl;
      }
    }

    if (amountEl && document.activeElement !== amountEl) {
      amountEl.value = state.payment.amount;
      amountEl.disabled = state.payment.method === 'direct_terminal';
    }

    if (cashEl && document.activeElement !== cashEl) {
      cashEl.value = state.payment.cashReceived;
    }

    var charge = paymentCharge();
    var cashReceived = num(state.payment.cashReceived, 0);
    var change = state.payment.method === 'cash'
      ? Math.max(0, roundMoney(cashReceived - charge))
      : 0;

    if (chargeEl) chargeEl.textContent = money(charge);

    if (changeBox) {
      changeBox.hidden = !(state.payment.method === 'cash' && change > 0);
    }
    if (changeEl) changeEl.textContent = money(change);

    renderCashPresets();
    renderTouchKeypad();

    var valid =
      !!state.payment.summary &&
      paymentAmount() > 0 &&
      !state.payment.submitting;

    if (state.payment.method === 'cash' && cashReceived + 0.001 < charge) {
      valid = false;
    }

    if (
      state.payment.method === 'external_terminal' &&
      (!state.payment.externalConfirmed || !String(state.payment.reference || '').trim())
    ) {
      valid = false;
    }

    if (state.payment.method === 'direct_terminal' && !state.payment.terminal) {
      valid = false;
    }

    if (submit) {
      submit.disabled = !valid;
      submit.textContent = state.payment.submitting
        ? (
            state.payment.method === 'direct_terminal'
              ? 'Waiting for terminal…'
              : 'Processing…'
          )
        : (
            state.payment.method === 'direct_terminal'
              ? 'Send to terminal'
              : (
                  state.payment.method === 'cash'
                    ? 'Pay cash ' + money(charge)
                    : 'Pay card ' + money(charge)
                )
          );
    }
  }

  function renderPayment() {
    if (!state.payment.open) return;

    var summary = state.payment.summary;
    var remaining = $('[data-qpos-payment-remaining]');
    var settled = $('[data-qpos-payment-settled]');
    var title = $('[data-qpos-payment-title]');
    var cashField = $('[data-qpos-cash-field]');
    var external = $('[data-qpos-external-fields]');
    var reference = $('[data-qpos-payment-reference]');
    var externalConfirm = $('[data-qpos-external-confirm]');

    if (title) title.textContent = 'Order #' + String(state.activeOrderId || '');

    if (summary) {
      if (remaining) remaining.textContent = money(paymentRemaining());
      if (settled) {
        settled.textContent =
          'Paid ' + money(num(summary.settlement && summary.settlement.settled_amount, 0)) +
          ' of ' + money(num(summary.settlement && summary.settlement.order_total, 0));
      }
    }

    renderPaymentMethods();

    if (cashField) cashField.hidden = state.payment.method !== 'cash';
    if (external) external.hidden = state.payment.method !== 'external_terminal';
    if (reference && document.activeElement !== reference) {
      reference.value = state.payment.reference;
    }
    if (externalConfirm) {
      externalConfirm.checked = !!state.payment.externalConfirmed;
    }

    renderTerminals();

    $$('[data-tip]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        Number(button.getAttribute('data-tip')) === Number(state.payment.tipPercent)
      );
      button.disabled = state.payment.method === 'direct_terminal';
    });

    renderPaymentTotals();
  }

  async function executePayment() {
    if (!state.payment.summary || state.payment.submitting) return;

    if (state.payment.method === 'direct_terminal') {
      return executeTerminalPayment();
    }

    state.payment.submitting = true;
    showPaymentError('');
    renderPaymentTotals();

    var summary = state.payment.summary;
    var remaining = paymentRemaining();
    var amount = paymentAmount();

    try {
      var url = tokenUrl(
        state.settings.payment_settle_url,
        '{order}',
        state.activeOrderId
      );

      var json = await fetchJson(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          idempotency_key: state.payment.idempotencyKey,
          quick_pos_fast: true,
          payment_method: state.payment.method,
          provider_code: state.payment.method === 'external_terminal'
            ? 'external_terminal'
            : null,
          split_mode: Math.abs(amount - remaining) <= 0.02 ? 'full' : 'custom',
          amount: amount,
          selected_items: null,
          tip_amount: paymentTip(),
          coupon_code: null,
          payer_label: '',
          payment_reference: state.payment.reference,
          cash_received: state.payment.method === 'cash'
            ? num(state.payment.cashReceived, paymentCharge())
            : null,
          external_confirmed: state.payment.method === 'external_terminal'
            ? state.payment.externalConfirmed
            : false,
          expected_remaining: summary.settlement.remaining_amount,
          expected_updated_at: summary.order.updated_at
        })
      });

      state.payment.summary = json.summary || state.payment.summary;
      state.payment.receiptUrl = String(json.receipt_url || '');
      state.payment.invoiceUrl = String(json.invoice_url || '');
      state.payment.idempotencyKey = uid('pay');
      state.payment.reference = '';
      state.payment.externalConfirmed = false;
      state.payment.amount = roundMoney(
        num(state.payment.summary.settlement && state.payment.summary.settlement.remaining_amount, 0)
      ).toFixed(2);
      state.payment.cashReceived = state.payment.amount;

      toast(json.message || 'Payment recorded');

      if (state.serviceMode === 'dine_in' && state.selectedTable) {
        var paidTableId = Number(state.selectedTable.id);
        setTimeout(function () {
          loadTable(paidTableId, true);
        }, 0);
      } else if (String(json.settlement_status || '').toLowerCase() === 'paid') {
        state.offPremiseOrder = Object.assign({}, state.offPremiseOrder || {}, {
          settlement_status: 'paid'
        });
      }

      renderPayment();
      renderAll();

      if (
        String(json.settlement_status || '').toLowerCase() === 'paid'
        && !state.payment.receiptUrl
      ) {
        setTimeout(closePayment, 900);
      }
    } catch (error) {
      showPaymentError(error.message || 'Payment failed.');
      if (error.status === 409 || error.status === 422) {
        await loadPaymentSummary(true);
      }
    } finally {
      state.payment.submitting = false;
      renderPaymentTotals();
    }
  }

  async function executeTerminalPayment() {
    if (!state.payment.terminal) {
      showPaymentError('Choose a terminal.');
      return;
    }

    state.payment.submitting = true;
    showPaymentError('');
    renderPaymentTotals();

    try {
      var url = tokenUrl(
        state.settings.terminal_payment_url,
        '{order}',
        state.activeOrderId
      );

      var json = await fetchJson(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          provider_code: state.payment.terminal.provider_code,
          terminal_device_id: state.payment.terminal.terminal_device_id || null
        })
      });

      toast(json.message || 'Payment sent to terminal');

      var attemptId = Number(json.attempt_id || 0);
      if (attemptId) {
        await pollTerminal(attemptId);
      } else {
        await loadPaymentSummary(true);
      }
    } catch (error) {
      showPaymentError(error.message || 'Terminal payment failed.');
    } finally {
      state.payment.submitting = false;
      renderPaymentTotals();
    }
  }

  async function pollTerminal(attemptId) {
    for (var i = 0; i < 45; i++) {
      await new Promise(function (resolve) { setTimeout(resolve, 2000); });

      var url = tokenUrl(
        state.settings.terminal_refresh_url,
        '{attempt}',
        attemptId
      );

      var result = await fetchJson(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({})
      });

      var status = String(result.status || '').toLowerCase();

      if (status === 'paid') {
        await loadPaymentSummary(true);
        toast('Terminal payment approved');
        if (state.serviceMode === 'dine_in' && state.selectedTable) {
          var terminalPaidTableId = Number(state.selectedTable.id);
          setTimeout(function () {
            loadTable(terminalPaidTableId, true);
          }, 0);
        }
        setTimeout(closePayment, 350);
        return;
      }

      if (
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'reconciliation_required'
      ) {
        await loadPaymentSummary(true);
        throw new Error(result.message || 'Terminal payment failed.');
      }
    }

    await loadPaymentSummary(true);
    throw new Error('Terminal payment is still processing. Check the terminal status before retrying.');
  }

  /* Table lifecycle */
  async function updateTableStatus(status, skipCleaning) {
    if (!state.selectedTable || !state.settings.table_state_url) return;

    try {
      var url = tokenUrl(
        state.settings.table_state_url,
        '{table}',
        state.selectedTable.id
      );

      var json = await fetchJson(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          status: status,
          reason: 'quick_pos_v1',
          skip_cleaning: !!skipCleaning
        })
      });

      state.selectedTable.status = json.status || status;

      state.tables = state.tables.map(function (row) {
        if (Number(row.id) === Number(state.selectedTable.id)) {
          return Object.assign({}, row, {status: state.selectedTable.status});
        }
        return row;
      });

      renderTables();
      renderContext();
      toast(json.status_label || 'Table updated');
    } catch (error) {
      toast(error.message || 'Table status could not be changed.', true);
    }
  }

  function renderAll() {
    renderContext();
    renderTables();
    renderCategories();
    renderProducts();
    renderCart();
  }

  /* Binding */
  function bind() {
    var search = $('[data-qpos-search]');
    if (search) {
      search.addEventListener('input', function () {
        state.search = search.value;
        renderProducts();
      });
    }

    $$('[data-qpos-service]').forEach(function (button) {
      button.onclick = function () {
        setServiceMode(button.getAttribute('data-qpos-service'));
      };
    });

    var guestsPlus = $('[data-qpos-guests-plus]');
    var guestsMinus = $('[data-qpos-guests-minus]');
    if (guestsPlus) guestsPlus.onclick = function () {
      state.guestCount = Math.min(99, state.guestCount + 1);
      renderCart();
    };
    if (guestsMinus) guestsMinus.onclick = function () {
      state.guestCount = Math.max(1, state.guestCount - 1);
      renderCart();
    };

    var note = $('[data-qpos-note]');
    if (note) note.addEventListener('input', function () {
      state.note = note.value;
    });

    var hold = $('[data-qpos-hold]');
    var send = $('[data-qpos-send]');
    var pay = $('[data-qpos-pay]');
    if (hold) hold.onclick = function () { submitOrder('hold'); };
    if (send) send.onclick = function () { submitOrder('send'); };
    if (pay) pay.onclick = function () {
      if (state.cart.length > 0) {
        submitOrder('send', 'pay');
        return;
      }
      openPayment();
    };

    var newCheckButton = $('[data-qpos-new-check]');
    if (newCheckButton) newCheckButton.onclick = newCheck;

    var refresh = $('[data-qpos-refresh]');
    if (refresh) refresh.onclick = function () { bootstrap(false); };

    var mobileCart = $('[data-qpos-mobile-cart]');
    var cart = $('.pmd-qpos-cart');
    var closeCart = $('[data-qpos-cart-close]');
    if (mobileCart && cart) {
      mobileCart.onclick = function () {
        cart.classList.add('is-mobile-open');
      };
    }
    if (closeCart && cart) {
      closeCart.onclick = function () {
        cart.classList.remove('is-mobile-open');
      };
    }

    var modifierModal = $('[data-qpos-modifier-modal]');
    var modifierClose = $('[data-qpos-modifier-close]');
    var modifierPlus = $('[data-qpos-modifier-plus]');
    var modifierMinus = $('[data-qpos-modifier-minus]');
    var modifierAdd = $('[data-qpos-modifier-add]');
    var modifierNote = $('[data-qpos-modifier-note]');

    if (modifierClose) modifierClose.onclick = closeModifier;
    if (modifierModal) modifierModal.addEventListener('click', function (event) {
      if (event.target === modifierModal) closeModifier();
    });
    if (modifierPlus) modifierPlus.onclick = function () {
      if (!state.modifier) return;
      state.modifier.quantity = Math.min(99, state.modifier.quantity + 1);
      renderModifier();
    };
    if (modifierMinus) modifierMinus.onclick = function () {
      if (!state.modifier) return;
      state.modifier.quantity = Math.max(
        Math.max(1, num(state.modifier.item.minimum_qty, 1)),
        state.modifier.quantity - 1
      );
      renderModifier();
    };
    if (modifierAdd) modifierAdd.onclick = addModifierItem;
    if (modifierNote) modifierNote.addEventListener('input', function () {
      if (state.modifier) state.modifier.note = modifierNote.value;
    });

    var paymentModal = $('[data-qpos-payment-modal]');
    var paymentClose = $('[data-qpos-payment-close]');
    if (paymentClose) paymentClose.onclick = closePayment;
    if (paymentModal) paymentModal.addEventListener('click', function (event) {
      if (event.target === paymentModal) closePayment();
    });

    var amount = $('[data-qpos-payment-amount]');
    if (amount) {
      amount.addEventListener('input', function () {
        state.payment.amount = normalizeTouchKeypadValue(amount.value);
        if (amount.value !== state.payment.amount) {
          amount.value = state.payment.amount;
        }
        if (state.payment.method === 'cash') {
          state.payment.cashReceived = roundMoney(
            paymentCharge()
          ).toFixed(2);
        }
        renderPaymentTotals();
      });
      amount.addEventListener('focus', function () {
        openTouchKeypad('amount');
      });
      amount.addEventListener('click', function () {
        openTouchKeypad('amount');
      });
    }

    var cash = $('[data-qpos-cash-received]');
    if (cash) {
      cash.addEventListener('input', function () {
        state.payment.cashReceived = normalizeTouchKeypadValue(cash.value);
        if (cash.value !== state.payment.cashReceived) {
          cash.value = state.payment.cashReceived;
        }
        renderPaymentTotals();
      });
      cash.addEventListener('focus', function () {
        openTouchKeypad('cash');
      });
      cash.addEventListener('click', function () {
        openTouchKeypad('cash');
      });
    }

    $$('[data-qpos-keypad-key]').forEach(function (button) {
      button.onclick = function () {
        applyTouchKeypadKey(
          button.getAttribute('data-qpos-keypad-key')
        );
      };
    });

    var reference = $('[data-qpos-payment-reference]');
    if (reference) reference.addEventListener('input', function () {
      state.payment.reference = reference.value;
      renderPaymentTotals();
    });

    var confirmExternal = $('[data-qpos-external-confirm]');
    if (confirmExternal) confirmExternal.addEventListener('change', function () {
      state.payment.externalConfirmed = confirmExternal.checked;
      renderPaymentTotals();
    });

    $$('[data-tip]').forEach(function (button) {
      button.onclick = function () {
        state.payment.tipPercent = Number(button.getAttribute('data-tip') || 0);
        renderPayment();
      };
    });

    var submitPayment = $('[data-qpos-payment-submit]');
    if (submitPayment) submitPayment.onclick = executePayment;

    var cleaning = $('[data-qpos-table-cleaning]');
    var free = $('[data-qpos-table-free]');

    if (cleaning) cleaning.onclick = function () {
      updateTableStatus('cleaning', false);
    };

    if (free) free.onclick = function () {
      var status = String(state.selectedTable && state.selectedTable.status || '');
      var skip = status === 'occupied';
      if (
        skip &&
        !window.confirm('Set this occupied table directly to free and skip cleaning?')
      ) {
        return;
      }
      updateTableStatus('available', skip);
    };

    window.addEventListener('online', function () { setOnline(true); });
    window.addEventListener('offline', function () { setOnline(false); });
    setOnline(navigator.onLine !== false);

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeModifier();
        closePayment();
        if (cart) cart.classList.remove('is-mobile-open');
      }
      if (event.key === '/' && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        event.preventDefault();
        if (search) search.focus();
      }
    });
  }

  bind();
  bootstrap(true);

  window.PMDQuickPOSV1 = {
    state: state,
    refresh: function () { return bootstrap(false); },
    selectTable: selectTable,
    newCheck: newCheck,
    openPayment: openPayment
  };
})();
