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


  /* PMD_ZCS_CUSTOMER_DISPLAY_BRIDGE_V1
   * Device-local bridge: only the Android POS WebView exposes PayMyDineHardware.
   * A normal browser never gets this object, so two cashiers cannot cross-talk. */
  var customerDisplayLastSignature = '';
  var customerDisplaySuccessTimer = null;

  function customerDisplayBridge() {
    if (state && state.mode !== 'cashier') return null;
    var bridge = window.PayMyDineHardware;
    return bridge && typeof bridge.pushCustomerDisplay === 'function'
      ? bridge
      : null;
  }

  function customerDisplayCurrency() {
    return String(
      (state.boot && state.boot.settings && state.boot.settings.currency) ||
      (state.settings && state.settings.currency) ||
      '€'
    );
  }

  function customerDisplayTableLabel() {
    if (state.serviceMode === 'takeaway') return 'Pickup';
    if (!state.selectedTable) return '';
    return compactTableLabel(state.selectedTable);
  }

  function customerDisplayImageForMenu(menuId) {
    var row = state.menu.find(function (item) {
      return Number(item.id || 0) === Number(menuId || 0);
    });
    return row ? String(row.image || '') : '';
  }

  function customerDisplayCartRows() {
    return state.cart.map(function (row) {
      return {
        menu_id: Number(row.menu_id || 0) || null,
        name: String(row.name || 'Item'),
        quantity: Math.max(0, num(row.quantity, 0)),
        unit_price: roundMoney(num(row.price, 0)),
        line_total: lineTotal(row),
        image: customerDisplayImageForMenu(row.menu_id)
      };
    });
  }

  function customerDisplayOrderPayload(phase, extras) {
    extras = extras || {};
    var order = activeOrder();
    var total = roundMoney(
      existingTotal() + pendingSendTotal() + cartTotal()
    );
    var highlight = state.customerDisplayHighlight || null;

    return Object.assign({
      phase: phase || 'order',
      currency: customerDisplayCurrency(),
      total: total,
      amount_due:
        phase === 'payment'
          ? roundMoney(
              state.payment && state.payment.open
                ? paymentCharge()
                : total
            )
          : total,
      table_label: customerDisplayTableLabel(),
      order_label:
        order && orderId(order)
          ? ('Order #' + orderId(order))
          : '',
      highlight_name:
        highlight ? String(highlight.name || '') : '',
      highlight_image:
        highlight ? String(highlight.image || '') : '',
      items: customerDisplayCartRows()
    }, extras);
  }

  function pushCustomerDisplay(phase, extras, force) {
    var bridge = customerDisplayBridge();
    if (!bridge) return;

    var payload = customerDisplayOrderPayload(phase, extras);
    var signature = JSON.stringify(payload);
    if (!force && signature === customerDisplayLastSignature) return;
    customerDisplayLastSignature = signature;

    try {
      bridge.pushCustomerDisplay(signature);
    } catch (ignored) {
    }
  }

  function pushCustomerDisplayIdle(force) {
    var bridge = customerDisplayBridge();
    if (!bridge) return;
    customerDisplayLastSignature = '';
    try {
      bridge.showCustomerDisplayIdle();
    } catch (ignored) {
    }
  }

  function pushCustomerDisplaySuccess(amount, message) {
    var bridge = customerDisplayBridge();
    if (!bridge) return;

    clearTimeout(customerDisplaySuccessTimer);
    pushCustomerDisplay(
      'success',
      {
        total: roundMoney(amount),
        amount_due: 0,
        headline: 'Paid',
        message: String(message || 'Thank you!'),
        items: []
      },
      true
    );

    customerDisplaySuccessTimer = setTimeout(function () {
      pushCustomerDisplayIdle(true);
    }, 4500);
  }

  function installCustomerDisplayControls() {
    var bridge = customerDisplayBridge();
    if (!bridge || document.getElementById('pmd-customer-display-control')) return;

    var capabilities = {};
    try {
      capabilities = JSON.parse(
        String(bridge.customerDisplayCapabilities() || '{}')
      );
    } catch (ignored) {
    }

    var wrap = document.createElement('div');
    wrap.id = 'pmd-customer-display-control';
    wrap.innerHTML =
      '<button type="button" data-pmd-customer-display-toggle ' +
        'style="position:fixed;right:18px;bottom:18px;z-index:2200;border:1px solid #d4d4d8;' +
        'background:#fff;color:#18181b;border-radius:999px;padding:10px 14px;font:700 13px/1 sans-serif;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.14)">Customer display</button>' +
      '<section data-pmd-customer-display-panel hidden ' +
        'style="position:fixed;right:18px;bottom:66px;z-index:2201;width:300px;background:#fff;' +
        'border:1px solid #e4e4e7;border-radius:16px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.22);' +
        'font:14px/1.4 sans-serif;color:#18181b">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px">' +
          '<strong>Customer display</strong>' +
          '<span style="font-size:12px;color:#71717a">' +
            (capabilities.customer_display ? 'ZCS connected' : 'Preview / SDK not detected') +
          '</span>' +
        '</div>' +
        '<label style="display:flex;justify-content:space-between;align-items:center;margin:10px 0">' +
          '<span>Enabled</span><input type="checkbox" data-pmd-customer-display-enabled ' +
            (capabilities.enabled === false ? '' : 'checked') + '>' +
        '</label>' +
        '<label style="display:flex;justify-content:space-between;align-items:center;margin:10px 0">' +
          '<span>Show food images</span><input type="checkbox" data-pmd-customer-display-images ' +
            (capabilities.images_enabled === false ? '' : 'checked') + '>' +
        '</label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
          '<button type="button" data-pmd-customer-display-test="order" style="padding:9px;border:1px solid #d4d4d8;border-radius:10px;background:#fafafa">Test order</button>' +
          '<button type="button" data-pmd-customer-display-test="payment" style="padding:9px;border:1px solid #d4d4d8;border-radius:10px;background:#fafafa">Test payment</button>' +
          '<button type="button" data-pmd-customer-display-test="success" style="padding:9px;border:1px solid #d4d4d8;border-radius:10px;background:#fafafa">Test success</button>' +
          '<button type="button" data-pmd-customer-display-test="idle" style="padding:9px;border:1px solid #d4d4d8;border-radius:10px;background:#fafafa">Idle</button>' +
        '</div>' +
      '</section>';

    document.body.appendChild(wrap);

    var toggle = wrap.querySelector('[data-pmd-customer-display-toggle]');
    var panel = wrap.querySelector('[data-pmd-customer-display-panel]');
    var enabled = wrap.querySelector('[data-pmd-customer-display-enabled]');
    var images = wrap.querySelector('[data-pmd-customer-display-images]');

    toggle.onclick = function () {
      panel.hidden = !panel.hidden;
    };

    enabled.onchange = function () {
      try {
        bridge.setCustomerDisplayEnabled(!!enabled.checked);
      } catch (ignored) {
      }
      if (enabled.checked) {
        pushCustomerDisplay('order', {}, true);
      }
    };

    images.onchange = function () {
      try {
        bridge.setCustomerDisplayImages(!!images.checked);
      } catch (ignored) {
      }
      pushCustomerDisplay(
        state.payment.open ? 'payment' : 'order',
        {},
        true
      );
    };

    Array.prototype.slice.call(
      wrap.querySelectorAll('[data-pmd-customer-display-test]')
    ).forEach(function (button) {
      button.onclick = function () {
        var kind = button.getAttribute('data-pmd-customer-display-test');
        if (kind === 'idle') {
          pushCustomerDisplayIdle(true);
          return;
        }
        if (kind === 'success') {
          pushCustomerDisplaySuccess(
            cartTotal() || existingTotal() || 18,
            'Thank you!'
          );
          return;
        }
        if (kind === 'payment') {
          pushCustomerDisplay(
            'payment',
            {
              headline: 'Please pay',
              message: 'Tap, insert, or follow the cashier',
              amount_due: cartTotal() || existingTotal() || 18
            },
            true
          );
          return;
        }
        pushCustomerDisplay(
          'order',
          {
            headline: 'Your order'
          },
          true
        );
      };
    });
  }

  var state = {
    boot: null,
    mode: String(root.getAttribute('data-mode') || 'cashier'),
    serviceMode: 'dine_in',
    settings: {},
    floors: [],
    activeFloorId: '',
    defaultFloorId: '',
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
    customerDisplayHighlight: null,
    tableRequestSeq: 0,
    /* PMD_QPOS_TABLE_CACHE_STATE_V41
     * Short in-memory cache + in-flight de-duplication for table checks. */
    tableCache: Object.create(null),
    tableFetches: Object.create(null),
    tableSwitching: false,
    /* PMD_QPOS_WARMUP_STATE_V42 */
    tableWarmupKey: '',
    tableWarmupRunning: false,
    guestCount: 1,
    note: '',
    loading: false,
    visualHydrated: false,
    floorMapOpen: false,
    submitting: false,
    sentItemQuantityBusy: false,
    modifier: null,
    itemNoteIndex: null,
    historyScope: 'selected',
    historyKind: 'orders',
    historyPreset: '7d',
    historyFrom: '',
    historyTo: '',
    historyData: null,
    historyDataKey: '',
    historyRequestSeq: 0,
    historySelectedOrderId: null,
    historyLoading: false,
    textKeyboardTarget: null,
    textKeyboardUpper: true,
    transfer: {
      open: false,
      scope: 'order',
      targetTableId: null,
      submitting: false,
      directSide: false,
      /* PMD_QPOS_MOVE_SCOPE_STATE_V44 */
      choiceOpen: false
    },
    payment: {
      open: false,
      loading: false,
      summaryPromise: null,
      submitting: false,
      summary: null,
      authoritative: false,
      method: 'cash',
      amount: '',
      cashReceived: '',
      tipMode: 'percent',
      tipPercent: 0,
      tipAmount: '',
      splitMode: 'full',
      splitParts: 1,
      splitPercent: 50,
      selectedItems: {},
      reference: '',
      externalConfirmed: false,
      terminal: null,
      /* PMD_QPOS_TERMINAL_TIP_STATE_V46
       * Read-only tip reported by the physical terminal/provider. */
      terminalTipAmount: 0,
      terminalTipKnown: false,
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

  /* PMD_QPOS_WORKSPACE_TOAST_CLEAN_V22 */
  function hideToast() {
    var el = $('[data-qpos-toast]');
    if (!el) return;
    clearTimeout(el.__qposTimer);
    el.classList.remove('is-show', 'is-error');
  }

  /* PMD_QPOS_PLATFORM_CONFIRM_V16
   * Never hand cashier actions to the browser's native confirm UI. */
  var confirmResolver = null;

  function closeConfirm(result) {
    var modal = $('[data-qpos-confirm-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    var resolver = confirmResolver;
    confirmResolver = null;
    if (resolver) resolver(!!result);
  }

  function confirmAction(options) {
    options = options || {};

    var modal = $('[data-qpos-confirm-modal]');
    var title = $('[data-qpos-confirm-title]');
    var message = $('[data-qpos-confirm-message]');
    var icon = $('[data-qpos-confirm-icon]');
    var accept = $('[data-qpos-confirm-accept]');
    var cancel = $('[data-qpos-confirm-cancel]');

    if (!modal || !accept || !cancel) {
      return Promise.resolve(false);
    }

    if (confirmResolver) {
      closeConfirm(false);
    }

    if (title) title.textContent = String(options.title || 'Confirm action');
    if (message) {
      message.textContent = String(options.message || '');
      message.hidden = !String(options.message || '').trim();
    }
    if (icon) icon.textContent = String(options.icon || '!');
    accept.textContent = String(options.confirmLabel || 'Confirm');
    cancel.textContent = String(options.cancelLabel || 'Cancel');

    var tone = String(options.tone || 'default');
    modal.setAttribute('data-tone', tone);
    accept.classList.toggle('is-danger', tone === 'danger');

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    return new Promise(function (resolve) {
      confirmResolver = resolve;
      window.requestAnimationFrame(function () {
        try { accept.focus(); } catch (ignored) {}
      });
    });
  }

  function setOnline(online) {
    var el = $('[data-qpos-online]');
    if (!el) return;
    el.classList.toggle('is-offline', !online);
    el.setAttribute('aria-label', online ? 'Online' : 'Offline');
    el.setAttribute('title', online ? 'Online' : 'Offline');
  }

  function startClock() {
    var clock = $('[data-qpos-clock]');
    if (!clock) return;

    var formatter = new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    function paint() {
      var now = new Date();
      clock.textContent = formatter.format(now);
      clock.dateTime = now.toISOString();
      clock.title = now.toLocaleDateString();
    }

    paint();
    clearInterval(clock.__qposClockTimer);
    clock.__qposClockTimer = setInterval(paint, 1000);
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

  function activeOrderStructuralLocked() {
    var order = activeOrder();
    if (!order) return false;

    var status = String(order.settlement_status || '').toLowerCase();
    return (
      order.structural_locked === true ||
      num(order.settled_amount, 0) > 0.0001 ||
      ['partial', 'paid', 'settled', 'closed', 'refunded'].indexOf(status) !== -1
    );
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

  /* PMD_QPOS_BOOT_CACHE_V1
   * Visual-only warm boot. No user identity or permission authority is cached.
   * A refresh paints the last menu/table layout immediately, then silently
   * reconciles it with the authoritative bootstrap response.
   */
  function bootCacheKey() {
    return [
      'pmd:qpos:visual:v25',
      window.location.host,
      state.mode
    ].join(':');
  }

  function visualPayload(json) {
    return {
      saved_at: Date.now(),
      settings: {
        currency:
          json && json.settings
            ? String(json.settings.currency || '€')
            : '€'
      },
      floors: Array.isArray(json && json.floors) ? json.floors : [],
      default_floor_id: String(
        json && json.default_floor_id
          ? json.default_floor_id
          : ''
      ),
      active_floor_id: String(
        json && json.active_floor_id
          ? json.active_floor_id
          : ''
      ),
      floor_cookie_name: String(
        json && json.floor_cookie_name
          ? json.floor_cookie_name
          : ''
      ),
      tables: Array.isArray(json && json.tables) ? json.tables : [],
      categories: Array.isArray(json && json.categories) ? json.categories : [],
      menu_items: Array.isArray(json && json.menu_items) ? json.menu_items : []
    };
  }

  function visualSignature(tables, categories, menu, floors) {
    try {
      return JSON.stringify([
        tables || [],
        categories || [],
        menu || [],
        floors || []
      ]);
    } catch (ignored) {
      return '';
    }
  }

  function normalizeActiveFloor() {
    var valid = state.floors.some(function (floor) {
      return String(floor.id) === String(state.activeFloorId);
    });

    if (valid) return;

    var defaultId = String(state.defaultFloorId || '');
    if (
      defaultId &&
      state.floors.some(function (floor) {
        return String(floor.id) === defaultId;
      })
    ) {
      state.activeFloorId = defaultId;
      return;
    }

    state.activeFloorId = state.floors.length
      ? String(state.floors[0].id || '')
      : '';
  }

  function rememberActiveFloor() {
    var cookieName = String(
      state.boot && state.boot.floor_cookie_name
        ? state.boot.floor_cookie_name
        : ''
    );

    if (!cookieName || !state.activeFloorId) return;

    try {
      document.cookie =
        cookieName + '=' +
        encodeURIComponent(String(state.activeFloorId)) +
        '; path=/; max-age=2592000; samesite=lax';
    } catch (ignored) {
    }
  }

  function hydrateVisualCache() {
    try {
      var raw = window.localStorage.getItem(bootCacheKey());
      if (!raw) return false;

      var cached = JSON.parse(raw);
      if (
        !cached ||
        !cached.saved_at ||
        Date.now() - Number(cached.saved_at) > 300000
      ) {
        return false;
      }

      state.settings = Object.assign({}, state.settings, cached.settings || {});
      state.floors = Array.isArray(cached.floors) ? cached.floors : [];
      state.defaultFloorId = String(cached.default_floor_id || '');
      state.activeFloorId = String(cached.active_floor_id || '');
      state.boot = Object.assign({}, state.boot || {}, {
        floor_cookie_name: String(cached.floor_cookie_name || '')
      });
      normalizeActiveFloor();
      state.tables = Array.isArray(cached.tables) ? cached.tables : [];
      state.categories = Array.isArray(cached.categories) ? cached.categories : [];
      state.menu = Array.isArray(cached.menu_items) ? cached.menu_items : [];

      if (!state.tables.length && !state.menu.length) return false;

      state.visualHydrated = true;
      renderAll();
      return true;
    } catch (ignored) {
      return false;
    }
  }

  function persistVisualCache(json) {
    try {
      window.localStorage.setItem(
        bootCacheKey(),
        JSON.stringify(visualPayload(json))
      );
    } catch (ignored) {
    }
  }

  function hydrateInitialBootstrap() {
    var config = window.PMDQuickPOSConfig || {};
    var json = config.initialBootstrap;

    if (!json || json.ok === false) {
      return false;
    }

    state.boot = json;
    state.mode = json.mode || state.mode;
    root.setAttribute('data-mode', state.mode);
    state.settings = json.settings || {};
    state.floors = Array.isArray(json.floors) ? json.floors : [];
    state.defaultFloorId = String(json.default_floor_id || '');
    state.activeFloorId = String(json.active_floor_id || '');
    normalizeActiveFloor();
    state.tables = Array.isArray(json.tables) ? json.tables : [];
    state.menu = Array.isArray(json.menu_items) ? json.menu_items : [];
    state.categories = Array.isArray(json.categories) ? json.categories : [];

    var user = $('[data-qpos-user]');
    if (user) user.textContent = (json.user && json.user.name) || 'Staff';

    state.visualHydrated = true;
    renderAll();
    persistVisualCache(json);

    return true;
  }

  async function bootstrap(silent) {
    if (state.loading) return;
    state.loading = true;
    root.classList.add('is-loading');

    var selectedId = state.selectedTable ? Number(state.selectedTable.id) : 0;

    try {
      var url = root.getAttribute('data-bootstrap-url');
      var json = await fetchJson(url + '?_=' + Date.now());
      var beforeVisual = visualSignature(
        state.tables,
        state.categories,
        state.menu,
        state.floors
      );

      state.boot = json;
      state.mode = json.mode || state.mode;
      root.setAttribute('data-mode', state.mode);
      state.settings = json.settings || {};
      state.floors = Array.isArray(json.floors) ? json.floors : [];
      state.defaultFloorId = String(json.default_floor_id || '');
      state.activeFloorId = String(
        json.active_floor_id ||
        state.activeFloorId ||
        ''
      );
      normalizeActiveFloor();
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

      var afterVisual = visualSignature(
        state.tables,
        state.categories,
        state.menu,
        state.floors
      );

      if (!state.visualHydrated || beforeVisual !== afterVisual) {
        renderAll();
      } else {
        renderContext();
        renderCart();
      }

      state.visualHydrated = true;
      persistVisualCache(json);

      if (state.selectedTable && state.serviceMode === 'dine_in') {
        await loadTable(state.selectedTable.id, true);
      }


    } catch (error) {
      toast(error.message || 'POS could not be loaded.', true);
    } finally {
      state.loading = false;
      root.classList.remove('is-loading');
    }
  }

  function renderFloors() {
    var box = $('[data-qpos-floors]');
    if (!box) return;

    if (!state.floors.length) {
      box.innerHTML =
        '<button type="button" class="is-active">Main Floor</button>';
      return;
    }

    box.innerHTML = state.floors.map(function (floor) {
      var id = String(floor.id || '');
      return (
        '<button type="button" data-qpos-floor="' + esc(id) + '"' +
          (String(state.activeFloorId) === id ? ' class="is-active"' : '') +
        '>' + esc(floor.name || 'Floor') + '</button>'
      );
    }).join('');

    $$('[data-qpos-floor]', box).forEach(function (button) {
      button.onclick = function () {
        selectFloor(button.getAttribute('data-qpos-floor'));
      };
    });
  }

  function renderContext() {
    renderFloors();

    var tableActions = $('[data-qpos-table-actions]');
    var cleaning = $('[data-qpos-table-cleaning]');
    var move = $('[data-qpos-table-move]');
    var free = $('[data-qpos-table-free]');
    var pickupSelected = state.serviceMode === 'takeaway';
    /* PMD_QPOS_CLEANING_LEFT_LOCK_V40
     * Left means "mark this table cleaning". Once already cleaning, the action
     * must be disabled while Free stays available. */
    var selectedStatus = String(
      state.selectedTable && state.selectedTable.status || ''
    ).toLowerCase();
    var selectedCleaning = selectedStatus === 'cleaning';
    var directMove =
      state.transfer.open &&
      state.transfer.directSide;

    if (tableActions) {
      tableActions.hidden = !state.selectedTable && !pickupSelected;
    }

    /* PMD_QPOS_STABLE_ACTIONS_DURING_MOVE_V44
     * Do not toggle disabled styling while an optimistic transfer commits.
     * The action bar is interaction-locked by .is-transfer-committing and
     * handler guards, so Left / Move / Free keep their exact colors. */
    if (tableActions) {
      tableActions.setAttribute(
        'aria-busy',
        state.transfer.submitting ? 'true' : 'false'
      );
    }

    if (cleaning) {
      cleaning.disabled =
        directMove ||
        pickupSelected ||
        !state.selectedTable ||
        selectedCleaning;
    }
    if (move) {
      move.disabled = directMove
        ? false
        : (
            pickupSelected ||
            !state.selectedTable ||
            !state.openOrders.length ||
            !!state.cart.length ||
            !!state.submitting
          );
      move.textContent = directMove ? 'Cancel' : 'Move';
      move.classList.toggle('is-direct-cancel', directMove);
    }
    if (free) {
      free.disabled =
        directMove ||
        pickupSelected ||
        !state.selectedTable;
    }
  }

  function tableStatusLabel(status) {
    return {
      available: 'Free',
      occupied: 'Busy',
      cleaning: 'Clean',
      reserved: 'Res.'
    }[String(status || '').toLowerCase()] || 'Free';
  }

  function compactTableLabel(table) {
    if (!table) return '';
    var number = String(
      table.number == null ? '' : table.number
    ).trim().replace(/^table\s*/i, '');
    if (number) return number;

    var name = String(table.name == null ? '' : table.name).trim();
    name = name.replace(/^table\s*/i, '').trim();
    return name || String(table.id || '');
  }

  function activeFloorTables() {
    var activeId = String(state.activeFloorId || '');
    return state.tables.filter(function (table) {
      return String(table.floor_id || '') === activeId;
    });
  }

  /* PMD_QPOS_EXACT_DASHBOARD_FLOOR_UI_V26
   * There is deliberately NO Quick-POS Floor renderer here. The workspace
   * embeds DashboardLab's canonical Floor Blade/CSS/JS. This bridge only:
   *   - opens/closes that existing Floor,
   *   - keeps its active Floor aligned with POS,
   *   - converts a canonical table click into Quick POS table selection.
   */
  function exactFloorRoot() {
    return document.getElementById('pmd-r2-shared-floor-canvas-v310');
  }

  function exactFloorInstance() {
    var floor = exactFloorRoot();
    return floor && floor.__pmdFloorV1
      ? floor.__pmdFloorV1
      : null;
  }

  function exactFloorPosTableFromNode(node) {
    if (!node) return null;

    var instance = exactFloorInstance();
    var floorState =
      instance && typeof instance.getState === 'function'
        ? instance.getState()
        : null;

    var ids = String(
      node.getAttribute('data-floor-members') ||
      node.getAttribute('data-floor-table') ||
      ''
    ).split(',').map(function (value) {
      return String(value || '').trim();
    }).filter(Boolean);

    var candidates = [];

    if (floorState && Array.isArray(floorState.tables)) {
      ids.forEach(function (id) {
        floorState.tables.forEach(function (table) {
          if (
            String(table.id || '') === id ||
            String(table.dbTableId || '') === id
          ) {
            candidates.push(table);
          }
        });
      });
    }

    for (var i = 0; i < candidates.length; i += 1) {
      var exact = candidates[i];
      var dbId = Number(exact.dbTableId || 0);
      if (dbId > 0) {
        var byDbId = state.tables.find(function (row) {
          return Number(row.id) === dbId;
        });
        if (byDbId) return byDbId;
      }

      var exactNumber = String(exact.number || '').trim();
      if (exactNumber) {
        var byNumber = state.tables.find(function (row) {
          return String(row.number || '').trim() === exactNumber;
        });
        if (byNumber) return byNumber;
      }
    }

    var label = node.querySelector('.pmd-floor-v1__table-number');
    var labelText = String(label ? label.textContent : '').trim();

    if (labelText) {
      var firstNumber = labelText.match(/\d+/);
      if (firstNumber) {
        var byVisibleNumber = state.tables.find(function (row) {
          return String(row.number || '').trim() === firstNumber[0];
        });
        if (byVisibleNumber) return byVisibleNumber;
      }
    }

    return null;
  }

  /* PMD_QPOS_MAP_RAIL_SCROLL_V46
   * When a table is chosen from the full-screen map, return to POS with the
   * selected table already visible in the table rail. No smooth wait. */
  function scrollTableRailToV46(tableId) {
    tableId = Number(tableId || 0);
    if (!tableId) return;

    var grid = $('[data-qpos-tables]');
    if (!grid) return;

    var button = grid.querySelector(
      '[data-qpos-table="' + String(tableId) + '"]'
    );
    if (!button) return;

    var top =
      button.offsetTop -
      Math.max(0, (grid.clientHeight - button.offsetHeight) / 2);

    grid.scrollTop = Math.max(0, top);
  }

  async function openExactFloorTable(node) {
    var table = exactFloorPosTableFromNode(node);

    if (!table) {
      toast('This Floor table could not be matched to POS.', true);
      return;
    }

    await selectTable(table.id);

    if (
      state.selectedTable &&
      Number(state.selectedTable.id) === Number(table.id)
    ) {
      closeFloorMap();

      window.requestAnimationFrame(function () {
        scrollTableRailToV46(table.id);
      });
    }
  }

  function closeFloorMap() {
    state.floorMapOpen = false;

    var workspace = $('[data-qpos-floor-map-workspace]');
    if (workspace) {
      workspace.hidden = true;
      workspace.setAttribute('aria-hidden', 'true');
    }

    root.classList.remove('is-floor-map-open');
    document.body.classList.remove(
      'page',
      'pmd-dashboard-lab-page',
      'pmd-qpos-exact-floor-open'
    );
  }

  function openFloorMap() {
    if (state.payment.open) {
      toast('Close payment first.', true);
      return;
    }

    closeHistory();
    closeTransfer();
    closeTextKeyboard();

    state.floorMapOpen = true;
    root.classList.add('is-floor-map-open');

    /*
     * Dashboard's exact Floor CSS is intentionally route-scoped to these
     * classes. Activate the identical scope only while the POS Map is open.
     */
    document.body.classList.add(
      'page',
      'pmd-dashboard-lab-page',
      'pmd-qpos-exact-floor-open'
    );

    renderFloorMap();

    var exactToolbar =
      document.getElementById('pmd-r2-floor-toolbar-v316');
    var returnControl = $('[data-qpos-floor-map-close]');

    if (
      exactToolbar &&
      returnControl &&
      returnControl.parentElement !== exactToolbar
    ) {
      exactToolbar.insertBefore(
        returnControl,
        exactToolbar.firstChild
      );
    }

    var floor = exactFloorRoot();
    var multiFloor = floor && floor.__pmdSharedMultiFloorV1;

    if (
      multiFloor &&
      typeof multiFloor.setActiveFloor === 'function' &&
      state.activeFloorId
    ) {
      multiFloor.setActiveFloor(String(state.activeFloorId));
    }

    /* PMD_QPOS_FULLSCREEN_FLOOR_REFIT_V36
     * The POS host expands the canonical Floor after it becomes visible.
     * Re-fit after two frames so the shared engine measures the real
     * full-screen viewport instead of its historical 560px initial frame. */
    var instance = exactFloorInstance();
    if (instance && typeof instance.fit === 'function') {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          instance.fit();
        });
      });
    }
  }

  function renderFloorMap() {
    var workspace = $('[data-qpos-floor-map-workspace]');
    if (!workspace) return;

    workspace.hidden = !state.floorMapOpen;
    workspace.setAttribute(
      'aria-hidden',
      state.floorMapOpen ? 'false' : 'true'
    );
  }

  /* PMD_QPOS_RAIL_SELECTION_SYNC_V42
   * A table tap should visually select immediately without rebuilding all
   * table buttons. Full table rendering remains for real status changes. */
  function syncSelectedTableRailV42() {
    var box = $('[data-qpos-tables]');
    if (!box) return;

    var selectedId =
      state.serviceMode === 'dine_in' && state.selectedTable
        ? Number(state.selectedTable.id || 0)
        : 0;

    var pickup = $('[data-qpos-pickup]', box);
    if (pickup) {
      pickup.classList.toggle(
        'is-selected',
        state.serviceMode === 'takeaway'
      );
    }

    Array.prototype.slice.call(
      box.querySelectorAll('[data-qpos-table]')
    ).forEach(function (button) {
      var id = Number(button.getAttribute('data-qpos-table') || 0);
      button.classList.toggle(
        'is-selected',
        selectedId > 0 && id === selectedId
      );
    });
  }

  function tableFeatureIconsV68(features) {
    var allowed = {
      near_window: {
        label: 'Near window',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 12h16M12 4v16"></path></svg>'
      },
      quiet_area: {
        label: 'Quiet area',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="m16 9 5 6M21 9l-5 6"></path></svg>'
      },
      accessible: {
        label: 'Accessible',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="5" r="2"></circle><path d="M7 9h5l2 5h3M9 9v5a4 4 0 1 0 4 4M13 14l2 6h4"></path></svg>'
      }
    };

    var rows = Array.isArray(features) ? features : [];
    var icons = rows.map(function (feature) {
      var key = String(feature || '').toLowerCase();
      var meta = allowed[key];
      if (!meta) return '';
      return (
        '<span class="pmd-qpos-table-feature-v68 is-' + esc(key) + '"' +
          ' title="' + esc(meta.label) + '"' +
          ' aria-label="' + esc(meta.label) + '">' +
          meta.svg +
        '</span>'
      );
    }).filter(Boolean);

    return icons.length
      ? '<span class="pmd-qpos-table-features-v68">' + icons.join('') + '</span>'
      : '';
  }

  function renderTables() {
    var box = $('[data-qpos-tables]');
    var count = $('[data-qpos-table-count]');
    var title = $('[data-qpos-table-title]');
    if (!box) return;

    var floorTables = activeFloorTables();
    var directMove =
      state.transfer.open &&
      state.transfer.directSide;
    var sourceId =
      directMove && state.selectedTable
        ? Number(state.selectedTable.id || 0)
        : 0;

    if (count) count.textContent = String(floorTables.length);
    if (title) {
      /* PMD_QPOS_DIRECT_MOVE_SCOPE_LABEL_V44 */
      title.textContent = directMove
        ? (
            state.transfer.scope === 'table'
              ? 'Move all'
              : 'Move #' + String(state.activeOrderId || '')
          )
        : (
            state.serviceMode === 'takeaway'
              ? 'Pickup'
              : (
                  state.selectedTable
                    ? compactTableLabel(state.selectedTable)
                    : 'Tables'
                )
          );
    }

    var rows = [
      '<button type="button" class="pmd-qpos-table pmd-qpos-pickup' +
        (state.serviceMode === 'takeaway' ? ' is-selected' : '') +
        (directMove ? ' is-move-disabled' : '') + '"' +
        ' data-qpos-pickup' +
        (directMove ? ' disabled' : '') + '>' +
        '<strong>Pickup</strong>' +
      '</button>'
    ];

    floorTables.forEach(function (table) {
      var tableId = Number(table.id || 0);
      var selected =
        state.serviceMode === 'dine_in' &&
        state.selectedTable &&
        Number(state.selectedTable.id) === tableId;
      var isMoveSource =
        directMove &&
        sourceId > 0 &&
        sourceId === tableId;
      var isMoveTarget =
        directMove &&
        !isMoveSource &&
        transferTargetAllowed(table);

      var paymentState =
        String(table.status || 'available') === 'available'
          ? 'none'
          : String(table.payment_state || 'none');

      var waiterCalls = Math.max(0, num(table.waiter_calls, 0));
      var noteCount = Math.max(0, num(table.note_count, 0));
      var hasAttention = waiterCalls > 0 || noteCount > 0;
      var attentionHistoryKind = hasAttention ? 'attention' : '';
      var signals = [];

      if (waiterCalls > 0) {
        signals.push({
          kind: 'call',
          icon: '!',
          title: 'Waiter call',
          attentionKind: 'calls',
          count: waiterCalls
        });
      }

      if (noteCount > 0) {
        signals.push({
          kind: 'note',
          icon: 'N',
          title: 'Table note',
          attentionKind: 'notes',
          count: noteCount
        });
      }

      /* PMD_QPOS_PAYMENT_ICON_RULE_V57
       * Due is represented by the table/check state itself. Only actual payment
       * progress gets a payment icon: half = Part paid, check = Paid. */
      if (paymentState === 'partial') {
        signals.push({
          kind: 'partial',
          icon: '½',
          title: 'Part paid',
          count: 0
        });
      } else if (paymentState === 'paid') {
        signals.push({
          kind: 'paid',
          icon: '✓',
          title: 'Paid',
          count: 0
        });
      }

      rows.push(
        '<button type="button" class="pmd-qpos-table' +
          (selected ? ' is-selected' : '') +
          (isMoveSource ? ' is-move-source' : '') +
          (isMoveTarget ? ' is-move-target' : '') +
          (hasAttention ? ' has-attention' : '') + '"' +
          ' data-qpos-table="' + esc(table.id) + '"' +
          ' data-status="' + esc(effectiveTableStatusV62(table)) + '"' +
          ' data-payment-state="' + esc(paymentState) + '"' +
          (hasAttention ? ' data-qpos-attention="1"' : '') +
          (attentionHistoryKind
            ? ' data-qpos-attention-kind-default="' + esc(attentionHistoryKind) + '"'
            : '') +
          (isMoveSource || (directMove && !isMoveTarget) || state.transfer.submitting
            ? ' disabled'
            : '') +
          (isMoveTarget
            ? (
                state.transfer.scope === 'table'
                  ? ' aria-label="Move all checks to table ' +
                    esc(compactTableLabel(table)) + '"'
                  : ' aria-label="Move order ' +
                    esc(state.activeOrderId || '') +
                    ' to table ' + esc(compactTableLabel(table)) + '"'
              )
            : '') + '>' +
          '<strong>' + esc(compactTableLabel(table)) + '</strong>' +
          '<small' + (num(table.capacity, 0) > 0 ? '' : ' hidden') + '>' +
            (num(table.capacity, 0) > 0 ? esc(table.capacity) + 's' : '') +
          '</small>' +
          tableFeatureIconsV68(table.features) +
          (signals.length
            ? '<span class="pmd-qpos-table-signals-v57">' +
                signals.map(function (signal) {
                  return (
                    '<span class="pmd-qpos-table-signal is-' + esc(signal.kind) + '"' +
                      (signal.attentionKind
                        ? ' data-qpos-attention-kind="' + esc(signal.attentionKind) + '"'
                        : '') +
                      ' title="' + esc(signal.title) + '"' +
                      ' aria-label="' + esc(
                        signal.attentionKind
                          ? 'Open ' + signal.title
                          : signal.title
                      ) + '">' +
                      '<b>' + esc(signal.icon) + '</b>' +
                      (signal.kind !== 'note' && num(signal.count, 0) > 1
                        ? '<em>' + esc(signal.count) + '</em>'
                        : '') +
                    '</span>'
                  );
                }).join('') +
              '</span>'
            : '') +
        '</button>'
      );
    });

    box.innerHTML = rows.join('');

    var pickup = $('[data-qpos-pickup]', box);
    if (pickup && !directMove) pickup.onclick = selectPickup;

    Array.prototype.slice.call(box.querySelectorAll('[data-qpos-table]')).forEach(function (button) {
      /* PMD_QPOS_TABLE_HOVER_PREFETCH_V41
       * Warm only the table the pointer/focus is already heading toward. */
      var prefetch = function () {
        if (directMove) return;
        var id = Number(button.getAttribute('data-qpos-table') || 0);
        if (id) prefetchTableData(id);
      };

      button.onpointerenter = prefetch;
      button.onpointerdown = prefetch;
      button.ontouchstart = prefetch;
      button.onfocus = prefetch;

      /* PMD_QPOS_TOUCH_PREFETCH_V42
       * pointerdown/touchstart begins the table request before click release. */
      button.onclick = function (event) {
        var id = Number(button.getAttribute('data-qpos-table') || 0);
        if (!id) return;

        var attentionTarget =
          event &&
          event.target &&
          event.target.closest
            ? event.target.closest('[data-qpos-attention-kind]')
            : null;

        if (attentionTarget && !directMove) {
          event.preventDefault();
          event.stopPropagation();
          openTableAttentionV57(
            id,
            attentionTarget.getAttribute('data-qpos-attention-kind')
          );
          return;
        }

        if (directMove) {
          directMoveOrderToTable(id);
          return;
        }

        var defaultAttentionKind = String(
          button.getAttribute('data-qpos-attention-kind-default') || ''
        );

        if (defaultAttentionKind) {
          openTableAttentionV57(id, defaultAttentionKind);
          return;
        }

        selectTable(id);
      };
    });

    /* PMD_QPOS_IDLE_TABLE_WARMUP_CALL_V42 */
    scheduleTableWarmupV42();
  }

  function setSelectedTablePaymentSignal(paymentState, dueAmount) {
    if (
      state.serviceMode !== 'dine_in' ||
      !state.selectedTable
    ) {
      return;
    }

    var tableId = Number(state.selectedTable.id || 0);
    if (!tableId) return;

    state.selectedTable.payment_state = String(paymentState || 'none');
    state.selectedTable.due_amount = Math.max(0, num(dueAmount, 0));

    state.tables = state.tables.map(function (table) {
      if (Number(table.id || 0) !== tableId) return table;
      return Object.assign({}, table, {
        payment_state: state.selectedTable.payment_state,
        due_amount: state.selectedTable.due_amount
      });
    });

    renderTables();
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

  function cartQuantityForMenu(menuId) {
    menuId = Number(menuId || 0);
    if (!menuId) return 0;

    return state.cart.reduce(function (total, row) {
      return Number(row.menu_id || 0) === menuId
        ? total + Math.max(0, num(row.quantity, 0))
        : total;
    }, 0);
  }

  function syncProductSelection() {
    $$('[data-qpos-product]').forEach(function (button) {
      var menuId = Number(button.getAttribute('data-qpos-product') || 0);
      var quantity = cartQuantityForMenu(menuId);
      var badge = button.querySelector('[data-qpos-product-count]');

      button.classList.toggle('is-selected', quantity > 0);

      if (quantity > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'pmd-qpos-product-count';
          badge.setAttribute('data-qpos-product-count', '');
          button.appendChild(badge);
        }
        badge.textContent = String(quantity);
        badge.setAttribute(
          'aria-label',
          quantity + (quantity === 1 ? ' selected item' : ' selected items')
        );
      } else if (badge) {
        badge.remove();
      }
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
        item.menu_number,
        item.menu_number ? ('#' + item.menu_number) : '',
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
        status.textContent = 'Select table';
      } else if (activeOrderStructuralLocked()) {
        status.textContent = 'Payment started · finish payment first';
      } else {
        status.textContent = items.length + ' items';
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
      var selectedQuantity = cartQuantityForMenu(item.id);
      return (
        '<button type="button" class="pmd-qpos-product' +
          (orderable ? '' : ' is-disabled') +
          (selectedQuantity > 0 ? ' is-selected' : '') + '"' +
          ' data-qpos-product="' + esc(item.id) + '"' +
          (orderable ? '' : ' disabled') + '>' +
          /* PMD_QPOS_PLACEHOLDER_LOGO_V34
           * Match the Menu page empty-photo treatment: a neutral preview
           * with the monochrome PayMyDine brand mark. */
          (image
            ? '<div class="pmd-qpos-product-image" style="background-image:url(&quot;' + esc(image) + '&quot;)"></div>'
            : '<div class="pmd-qpos-product-image is-placeholder" aria-hidden="true"></div>') +
          (item.is_bestseller ? '<span class="pmd-qpos-product-badge">Popular</span>' : '') +
          (selectedQuantity > 0
            ? '<span class="pmd-qpos-product-count" data-qpos-product-count aria-label="' +
                esc(selectedQuantity + (selectedQuantity === 1 ? ' selected item' : ' selected items')) +
              '">' + esc(selectedQuantity) + '</span>'
            : '') +
          /* PMD_QPOS_REAL_PRODUCT_BODY_V31
           * Use a real body element instead of a pseudo-element so the
           * white panel itself can overlap the photo and cast its shadow. */
          '<span class="pmd-qpos-product-body">' +
            '<strong class="pmd-qpos-product-name">' +
              /* PMD_QPOS_FOOD_NUMBER_PUNCT_V27
               * Food labels use the restaurant-menu convention:
               *   1. Item name
               * Never "#1Item name". */
              (item.menu_number
                ? '<span class="pmd-qpos-product-number" aria-label="Food number ' +
                    esc(item.menu_number) + '">' + esc(item.menu_number) + '.</span>'
                : '') +
              '<span>' + esc(item.name) + '</span>' +
            '</strong>' +
            '<span class="pmd-qpos-product-meta"><span>' +
              (item.has_options ? 'Options' : '') +
            '</span><b>' + (orderable ? money(item.price) : 'No price') + '</b></span>' +
          '</span>' +
        '</button>'
      );
    }).join('');

    $$('[data-qpos-product]', box).forEach(function (button) {
      button.onclick = function () {
        if (!canOrderNow()) {
          toast('Select table or Pickup.', true);
          return;
        }

        if (activeOrderStructuralLocked()) {
          toast('Payment started. Choose + Check for new items.', true);
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
    /* PMD_QPOS_FAST_ORDER_SWITCH_V41
     * Order-number switching uses already-loaded table data. Do not rebuild
     * the unsent cart or product grid just to activate a different check. */
    renderCart({orderSwitch: true});
  }

  /* PMD_QPOS_SIMPLIFIED_CHECKS_V14 */
function renderOpenChecks() {
    var box = $('[data-qpos-open-checks]');
    if (!box) return;

    if (state.serviceMode !== 'dine_in' || !state.selectedTable || !state.openOrders.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.hidden = false;
    var rows = [];

    state.openOrders.forEach(function (order) {
      var id = orderId(order);
      rows.push(
        '<button type="button" data-qpos-check="' + esc(id) + '"' +
          (Number(state.activeOrderId) === id ? ' class="is-active"' : '') + '>' +
          '#' + esc(id) + ' · ' + money(orderTotal(order)) +
        '</button>'
      );
    });

    /* PMD_QPOS_CHECK_CHIP_REUSE_V41
     * Reuse existing check buttons when the check set is unchanged. */
    var mounted = Array.prototype.slice.call(
      box.querySelectorAll('[data-qpos-check]')
    );
    var canReuse =
      mounted.length === state.openOrders.length &&
      mounted.every(function (button, index) {
        return Number(button.getAttribute('data-qpos-check') || 0) ===
          orderId(state.openOrders[index]);
      });

    if (canReuse) {
      mounted.forEach(function (button, index) {
        var order = state.openOrders[index];
        var id = orderId(order);
        button.classList.toggle(
          'is-active',
          Number(state.activeOrderId) === id
        );
        button.textContent = '#' + id + ' · ' + money(orderTotal(order));
      });
    } else {
      box.innerHTML = rows.join('');
      mounted = Array.prototype.slice.call(
        box.querySelectorAll('[data-qpos-check]')
      );
    }

    mounted.forEach(function (button) {
      button.onclick = function () {
        var value = Number(button.getAttribute('data-qpos-check') || 0);
        if (value > 0) selectOrder(value);
      };
    });
  }

  function sentItemQuantityMutableV68(order, item) {
    if (!order || !item || item.__pending) return false;
    if (state.sentItemQuantityBusy) return false;
    if (order.item_quantity_mutable === false) return false;
    if (order.kitchen_item_locked === true) return false;
    if (activeOrderStructuralLocked()) return false;
    return Number(item.order_menu_id || item.id || 0) > 0;
  }

  async function adjustSentItemQuantityV68(item, delta) {
    var order = activeOrder();
    if (!order || !item || state.sentItemQuantityBusy) return;

    var orderIdValue = orderId(order);
    var itemIdValue = Number(item.order_menu_id || item.id || 0);
    if (!orderIdValue || !itemIdValue || !state.settings.item_quantity_url) {
      return;
    }

    if (!sentItemQuantityMutableV68(order, item)) {
      if (activeOrderStructuralLocked()) {
        toast(
          delta > 0
            ? 'Payment already exists. Use + Check for additional food.'
            : 'Paid items must be corrected through refund/cancellation.',
          true
        );
      } else {
        toast('Kitchen preparation has started. This item is locked.', true);
      }
      return;
    }

    var reason = '';
    if (delta < 0) {
      var answer = window.prompt(
        'Reason for reducing this sent item:',
        'Customer changed order before preparation'
      );
      if (answer === null) return;
      reason = String(answer || '').trim();
      if (!reason) {
        toast('A reduction reason is required.', true);
        return;
      }
    }

    var url = tokenUrl(
      tokenUrl(
        state.settings.item_quantity_url,
        '{order}',
        orderIdValue
      ),
      '{item}',
      itemIdValue
    );

    state.sentItemQuantityBusy = true;
    renderSentItems();

    try {
      await fetchJson(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delta: delta,
          reason: reason,
          expected_updated_at: String(order.updated_at || '')
        })
      });

      if (
        state.serviceMode === 'dine_in' &&
        state.selectedTable
      ) {
        await loadTable(state.selectedTable.id, true, true);
      }

      toast(delta > 0 ? 'Quantity increased.' : 'Quantity reduced.');
    } catch (error) {
      toast(error.message || 'Quantity could not be changed.', true);
      if (
        state.serviceMode === 'dine_in' &&
        state.selectedTable
      ) {
        loadTable(state.selectedTable.id, true, true);
      }
    } finally {
      state.sentItemQuantityBusy = false;
      renderSentItems();
    }
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
      var mutable = sentItemQuantityMutableV68(order, item);
      var itemIdValue = Number(item.order_menu_id || item.id || 0);
      return (
        '<div class="pmd-qpos-sent-line' +
          (item.__pending ? ' is-pending' : '') +
          (mutable ? ' is-quantity-editable' : '') +
        '">' +
          '<b>' + esc(qty) + '×</b>' +
          '<span>' + esc(item.name || item.menu_name || 'Item') +
            (visibleNote(item.comment) ? '<small>' + esc(visibleNote(item.comment)) + '</small>' : '') +
          '</span>' +
          (mutable
            ? '<span class="pmd-qpos-sent-qty-v68" aria-label="Change quantity">' +
                '<button type="button" data-qpos-sent-qty="-1" data-qpos-sent-item="' +
                  esc(itemIdValue) + '" aria-label="Reduce quantity">−</button>' +
                '<button type="button" data-qpos-sent-qty="1" data-qpos-sent-item="' +
                  esc(itemIdValue) + '" aria-label="Increase quantity">+</button>' +
              '</span>'
            : '') +
          '<strong>' + money(subtotal) + '</strong>' +
        '</div>'
      );
    }).join('');

    Array.prototype.slice.call(
      box.querySelectorAll('[data-qpos-sent-qty]')
    ).forEach(function (button) {
      button.onclick = function () {
        var delta = Number(button.getAttribute('data-qpos-sent-qty') || 0);
        var itemIdValue = Number(button.getAttribute('data-qpos-sent-item') || 0);
        var item = committed.find(function (row) {
          return Number(row.order_menu_id || row.id || 0) === itemIdValue;
        });
        if (item && (delta === -1 || delta === 1)) {
          adjustSentItemQuantityV68(item, delta);
        }
      };
    });
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

    state.customerDisplayHighlight = {
      menu_id: Number(item.id || 0),
      name: String(item.name || 'Item'),
      image: String(item.image || '')
    };

    renderCart();
  }

  function changeCartQty(index, delta) {
    var row = state.cart[index];
    if (!row) return;
    row.quantity = Math.max(0, num(row.quantity, 1) + delta);
    if (row.quantity < 1) state.cart.splice(index, 1);
    renderCart();
  }

  function renderCart(options) {
    /* PMD_QPOS_RENDER_CART_FAST_PATH_V41 */
    var renderOptions = options || {};
    var orderSwitchOnly = !!renderOptions.orderSwitch;

    renderOpenChecks();
    renderSentItems();

    if (!orderSwitchOnly) {
      syncProductSelection();
    }

    var list = $('[data-qpos-cart-list]');
    if (list && !orderSwitchOnly) {
      if (!state.cart.length) {
        list.innerHTML =
          '<div class="pmd-qpos-empty-cart">' +
            '<strong>No items</strong>' +
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
                '<button type="button" class="pmd-qpos-line-note" data-qpos-line-note="' + index + '">' +
                  (row.comment ? 'Note ✓' : 'Note') +
                '</button>' +
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
        $$('[data-qpos-line-note]', list).forEach(function (button) {
          button.onclick = function () {
            openItemNote(Number(button.getAttribute('data-qpos-line-note')));
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
      if (state.tableSwitching && state.selectedTable) {
        title.textContent =
          compactTableLabel(state.selectedTable) + ' · Loading';
      } else if (order) {
        title.textContent = 'Order #' + orderId(order);
      } else if (state.serviceMode === 'takeaway') {
        title.textContent = 'Pickup';
      } else if (state.selectedTable) {
        title.textContent = compactTableLabel(state.selectedTable) + ' · New';
      } else {
        title.textContent = 'New';
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

    if (!state.payment.open) {
      if (state.cart.length || activeOrder()) {
        pushCustomerDisplay('order');
      } else {
        pushCustomerDisplayIdle();
      }
    }

    var guests = $('[data-qpos-guests]');
    if (guests) guests.textContent = String(state.guestCount);

    var note = $('[data-qpos-note]');
    if (note && note.value !== state.note) note.value = state.note;

    var floorMapOpen = $('[data-qpos-floor-map-open]');
    var floorMapClose = $('[data-qpos-floor-map-close]');

    if (floorMapOpen) floorMapOpen.onclick = openFloorMap;
    if (floorMapClose) floorMapClose.onclick = closeFloorMap;

    /* PMD_QPOS_SINGLE_FLOOR_BIND_V41
     * renderCart() runs frequently. Bind these listeners only once. */
    var exactFloorWorkspace = $('[data-qpos-floor-map-workspace]');
    if (
      exactFloorWorkspace &&
      !exactFloorWorkspace.__pmdQposTableOpenBoundV41
    ) {
      exactFloorWorkspace.__pmdQposTableOpenBoundV41 = true;

      exactFloorWorkspace.addEventListener('click', function (event) {
        var tableNode =
          event.target &&
          event.target.closest
            ? event.target.closest('[data-floor-table]')
            : null;

        if (!tableNode || !exactFloorWorkspace.contains(tableNode)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }

        openExactFloorTable(tableNode);
      }, true);
    }

    if (!window.__pmdQposFloorChangedBoundV41) {
      window.__pmdQposFloorChangedBoundV41 = true;

      window.addEventListener('pmd:floor:changed', function (event) {
        var detail = event && event.detail ? event.detail : {};
        var floorId = String(detail.floor_id || '');

        if (
          !floorId ||
          !state.floors.some(function (floor) {
            return String(floor.id || '') === floorId;
          })
        ) {
          return;
        }

        state.activeFloorId = floorId;
        rememberActiveFloor();
        renderContext();
        renderTables();
      });
    }


    var send = $('[data-qpos-send]');
    var pay = $('[data-qpos-pay]');

    var canSave =
      canOrderNow() &&
      !activeOrderStructuralLocked() &&
      state.cart.length > 0 &&
      !state.submitting;
    root.classList.toggle('is-committing', !!state.submitting);

    if (send) {
      send.disabled = !canSave;
      send.textContent = 'Send';
    }

    if (pay) {
      /* PMD_QPOS_PAY_BACKEND_AUTHORITY_V50
       * The button is a workflow control, not a permission authority.
       * Quick POS payment endpoints enforce authorization server-side.
       * If a real check is already loaded, Pay must be usable immediately. */
      var payableOrder = activeOrder();
      var waitingForPayableOrder =
        state.tableSwitching && !payableOrder;

      pay.disabled =
        waitingForPayableOrder ||
        !!state.pendingSend ||
        state.submitting ||
        (
          !payableOrder &&
          !(canOrderNow() && state.cart.length > 0)
        );

      pay.textContent = state.cart.length > 0
        ? 'Send & Pay'
        : 'Pay';
    }

    renderContext();
  }

  /* PMD_QPOS_TRANSFER_UI_V24
   * One compact Move action handles both guest table moves and wrong-check
   * corrections. The server remains authoritative for the reassignment. */
  function transferTargetAllowed(table) {
    if (!table || !state.selectedTable) return false;
    if (Number(table.id) === Number(state.selectedTable.id)) return false;

    if (state.transfer.scope !== 'table') return true;

    var status = String(table.status || 'available').toLowerCase();
    var paymentState = String(table.payment_state || 'none').toLowerCase();

    return (
      ['available', 'reserved'].indexOf(status) !== -1 &&
      ['due', 'partial'].indexOf(paymentState) === -1
    );
  }

  function renderTransfer() {
    var modal = $('[data-qpos-transfer-modal]');
    if (!modal || !state.transfer.open) return;

    var source = state.selectedTable;
    var title = $('[data-qpos-transfer-title]');
    var orderLabel = $('[data-qpos-transfer-order-label]');
    var tableCount = $('[data-qpos-transfer-table-count]');
    var selection = $('[data-qpos-transfer-selection]');
    var targetBox = $('[data-qpos-transfer-tables]');
    var submit = $('[data-qpos-transfer-submit]');

    if (title) {
      title.textContent = source
        ? 'Table ' + compactTableLabel(source)
        : 'Table';
    }

    if (orderLabel) {
      orderLabel.textContent = state.activeOrderId
        ? '#' + String(state.activeOrderId)
        : 'Order';
    }

    if (tableCount) {
      var count = state.openOrders.length;
      tableCount.textContent =
        count + (count === 1 ? ' check' : ' checks');
    }

    $$('[data-qpos-transfer-scope]', modal).forEach(function (button) {
      var scope = String(button.getAttribute('data-qpos-transfer-scope') || '');
      button.classList.toggle('is-active', scope === state.transfer.scope);
      button.disabled =
        scope === 'order' && !Number(state.activeOrderId || 0);
    });

    var target = state.tables.find(function (table) {
      return Number(table.id) === Number(state.transfer.targetTableId || 0);
    }) || null;

    if (target && !transferTargetAllowed(target)) {
      state.transfer.targetTableId = null;
      target = null;
    }

    if (selection) {
      selection.textContent = target
        ? 'Table ' + compactTableLabel(target)
        : 'Choose table';
    }

    if (targetBox) {
      var candidates = state.tables.filter(function (table) {
        return !source || Number(table.id) !== Number(source.id);
      });

      targetBox.innerHTML = candidates.map(function (table) {
        var allowed = transferTargetAllowed(table);
        var selected =
          Number(table.id) === Number(state.transfer.targetTableId || 0);
        var floor = String(table.floor_name || '').trim();
        var status = tableStatusLabel(table.status);
        var paymentState = String(table.payment_state || 'none').toLowerCase();
        var hasCheck =
          paymentState === 'due' ||
          paymentState === 'partial';

        return (
          '<button type="button" class="pmd-qpos-transfer-table' +
            (selected ? ' is-selected' : '') +
            (allowed ? '' : ' is-disabled') + '"' +
            ' data-qpos-transfer-target="' + esc(table.id) + '"' +
            (allowed ? '' : ' disabled') + '>' +
            '<strong>' + esc(compactTableLabel(table)) + '</strong>' +
            '<span>' + esc(floor || 'Floor') + '</span>' +
            '<small>' +
              esc(status + (hasCheck ? ' · has check' : '')) +
            '</small>' +
          '</button>'
        );
      }).join('');

      $$('[data-qpos-transfer-target]', targetBox).forEach(function (button) {
        button.onclick = function () {
          state.transfer.targetTableId = Number(
            button.getAttribute('data-qpos-transfer-target') || 0
          ) || null;
          renderTransfer();
        };
      });
    }

    if (submit) {
      submit.disabled =
        state.transfer.submitting ||
        !target ||
        !transferTargetAllowed(target);
      submit.textContent = state.transfer.submitting
        ? 'Moving…'
        : (target ? 'Move to ' + compactTableLabel(target) : 'Move');
    }
  }

  /* PMD_QPOS_DIRECT_MOVE_SCOPE_CHOOSER_V44
   * Keep the fast left-rail workflow, but expose a compact scope choice when
   * a table has multiple checks: current order or the whole table/all checks.
   */
  function closeMoveScopeChoiceV44() {
    state.transfer.choiceOpen = false;

    var chooser = $('[data-qpos-move-scope-choice]');
    if (chooser) {
      chooser.hidden = true;
      chooser.setAttribute('aria-hidden', 'true');
    }

    var moveButton = $('[data-qpos-table-move]');
    if (moveButton) {
      moveButton.setAttribute('aria-expanded', 'false');
    }

    root.classList.remove('is-move-scope-choice-open');
  }

  function renderMoveScopeChoiceV44() {
    var chooser = $('[data-qpos-move-scope-choice]');
    if (!chooser) return;

    var orderButton = $('[data-qpos-direct-move-scope="order"]', chooser);
    var tableButton = $('[data-qpos-direct-move-scope="table"]', chooser);
    var orderMeta = $('[data-qpos-direct-move-order-meta]', chooser);
    var tableMeta = $('[data-qpos-direct-move-table-meta]', chooser);
    var count = state.openOrders.length;

    if (orderButton) {
      orderButton.disabled = !Number(state.activeOrderId || 0);
    }
    if (orderMeta) {
      orderMeta.textContent = Number(state.activeOrderId || 0)
        ? '#' + String(state.activeOrderId)
        : 'Choose check';
    }
    if (tableButton) {
      tableButton.disabled = count < 1;
    }
    if (tableMeta) {
      tableMeta.textContent =
        count + (count === 1 ? ' check' : ' checks');
    }

    chooser.hidden = !state.transfer.choiceOpen;
    chooser.setAttribute(
      'aria-hidden',
      state.transfer.choiceOpen ? 'false' : 'true'
    );

    /* PMD_QPOS_MOVE_SCOPE_ARIA_V44 */
    var moveButton = $('[data-qpos-table-move]');
    if (moveButton) {
      moveButton.setAttribute(
        'aria-expanded',
        state.transfer.choiceOpen ? 'true' : 'false'
      );
    }

    root.classList.toggle(
      'is-move-scope-choice-open',
      state.transfer.choiceOpen
    );
  }

  function closeTransfer() {
    var modal = $('[data-qpos-transfer-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    closeMoveScopeChoiceV44();

    state.transfer.open = false;
    state.transfer.targetTableId = null;
    state.transfer.submitting = false;
    state.transfer.directSide = false;
    root.classList.remove('is-direct-order-move');
  }

  function startDirectSideMoveV44(scope) {
    scope = scope === 'table' ? 'table' : 'order';

    if (state.transfer.submitting) return;
    if (state.serviceMode !== 'dine_in' || !state.selectedTable) return;

    if (state.cart.length) {
      toast('Send or remove new items first.', true);
      return;
    }

    if (!state.openOrders.length) {
      toast('No open checks to move.', true);
      return;
    }

    if (scope === 'order' && !Number(state.activeOrderId || 0)) {
      toast('Choose a check to move first.', true);
      return;
    }

    closePayment();
    closeHistory();
    closeFloorMap();
    closeTextKeyboard();
    hideToast();
    closeMoveScopeChoiceV44();

    state.transfer.open = true;
    state.transfer.scope = scope;
    state.transfer.targetTableId = null;
    state.transfer.submitting = false;
    state.transfer.directSide = true;
    root.classList.add('is-direct-order-move');

    renderTables();
    renderContext();

    if (scope === 'table') {
      toast(
        'Select the destination table for all ' +
        String(state.openOrders.length) +
        (state.openOrders.length === 1 ? ' check.' : ' checks.')
      );
    } else {
      toast(
        'Select the destination table for order #' +
        String(state.activeOrderId) +
        '.'
      );
    }
  }

  /* PMD_QPOS_DIRECT_SIDE_MOVE_V37
   * A single-check table keeps the original one-tap Move flow. If the source
   * table has multiple checks, Move opens a tiny scope chooser first. */
  function openDirectSideMove() {
    if (state.transfer.submitting) return;
    if (state.serviceMode !== 'dine_in' || !state.selectedTable) return;

    if (state.cart.length) {
      toast('Send or remove new items first.', true);
      return;
    }

    if (!state.openOrders.length) {
      toast('No open checks to move.', true);
      return;
    }

    if (state.openOrders.length <= 1) {
      startDirectSideMoveV44('order');
      return;
    }

    state.transfer.choiceOpen = !state.transfer.choiceOpen;
    renderMoveScopeChoiceV44();
  }

  async function directMoveOrderToTable(tableId) {
    if (
      !state.transfer.open ||
      !state.transfer.directSide ||
      state.transfer.submitting
    ) return;

    var target = state.tables.find(function (table) {
      return Number(table.id || 0) === Number(tableId || 0);
    }) || null;

    if (!target || !transferTargetAllowed(target)) {
      toast('Choose a different destination table.', true);
      return;
    }

    /* PMD_QPOS_DIRECT_MOVE_NO_PRE_RENDER_V43
     * Destination click goes straight to the transfer operation. The old
     * path rebuilt the entire rail twice before the request even started. */
    state.transfer.targetTableId = Number(target.id || 0);
    executeTransfer();
  }

  function openTransfer() {
    if (state.serviceMode !== 'dine_in' || !state.selectedTable) return;

    if (state.cart.length) {
      toast('Send or remove new items first.', true);
      return;
    }

    if (!state.openOrders.length) {
      toast('No open checks to move.', true);
      return;
    }

    closePayment();
    closeHistory();
    closeFloorMap();
    closeTextKeyboard();
    hideToast();

    state.transfer.open = true;
    state.transfer.scope = state.activeOrderId ? 'order' : 'table';
    state.transfer.targetTableId = null;
    state.transfer.submitting = false;

    var modal = $('[data-qpos-transfer-modal]');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }

    renderTransfer();
  }

  async function executeTransfer() {
    if (
      !state.transfer.open ||
      state.transfer.submitting ||
      !state.selectedTable ||
      !state.transfer.targetTableId
    ) return;

    var sourceId = Number(state.selectedTable.id || 0);
    var targetId = Number(state.transfer.targetTableId || 0);
    var orderId = Number(state.activeOrderId || 0);

    if (state.transfer.scope === 'order' && !orderId) {
      toast('Choose a check first.', true);
      return;
    }

    var directSide = !!state.transfer.directSide;
    var moveScope = state.transfer.scope === 'table' ? 'table' : 'order';
    var sourceTable = state.tables.find(function (table) {
      return Number(table.id) === sourceId;
    }) || null;
    var targetTable = state.tables.find(function (table) {
      return Number(table.id) === targetId;
    }) || null;
    var optimisticSnapshot = null;

    state.transfer.submitting = true;

    if (directSide && targetTable) {
      /* PMD_QPOS_OPTIMISTIC_WHOLE_TABLE_MOVE_V44
       * Both single-check and whole-table direct moves paint immediately.
       * Server authority is unchanged; any failure restores the exact source
       * state and re-enters destination-selection mode with the same scope. */
      var targetCached = tableCacheGet(targetId);
      var targetOrders =
        moveScope === 'table'
          ? []
          : (
              targetCached && Array.isArray(targetCached.open_orders)
                ? targetCached.open_orders.slice()
                : []
            );
      var movedOrders =
        moveScope === 'table'
          ? state.openOrders.slice()
          : [];

      if (moveScope === 'order') {
        var movedOrder = activeOrder();

        targetOrders = targetOrders.filter(function (order) {
          return orderId !== Number(
            order && (order.order_id || order.id) || 0
          );
        });

        if (movedOrder) {
          movedOrders.push(movedOrder);
        } else {
          movedOrders.push({
            order_id: orderId,
            total: existingTotal(),
            guest_count: state.guestCount,
            items: []
          });
        }
      }

      movedOrders.forEach(function (order) {
        var movedId = Number(
          order && (order.order_id || order.id) || 0
        );

        targetOrders = targetOrders.filter(function (targetOrder) {
          return movedId !== Number(
            targetOrder &&
            (targetOrder.order_id || targetOrder.id) || 0
          );
        });

        targetOrders.push(order);
      });

      optimisticSnapshot = {
        sourceStatus: sourceTable ? sourceTable.status : null,
        targetStatus: targetTable.status,
        selectedTable: state.selectedTable,
        activeFloorId: state.activeFloorId,
        tableData: state.tableData,
        openOrders: state.openOrders.slice(),
        activeOrderId: state.activeOrderId,
        forceNewCheck: state.forceNewCheck,
        moveScope: moveScope
      };

      if (sourceTable) {
        sourceTable.status =
          moveScope === 'table'
            ? 'cleaning'
            : (
                optimisticSnapshot.openOrders.length > 1
                  ? 'occupied'
                  : 'available'
              );
      }
      targetTable.status = 'occupied';

      state.selectedTable = targetTable;
      state.activeFloorId = String(
        targetTable.floor_id || state.activeFloorId || ''
      );
      state.tableData = targetCached || null;
      state.openOrders = targetOrders;
      state.activeOrderId =
        moveScope === 'table'
          ? (
              Number(optimisticSnapshot.activeOrderId || 0) ||
              (
                targetOrders.length
                  ? Number(
                      targetOrders[0].order_id ||
                      targetOrders[0].id ||
                      0
                    )
                  : null
              )
            )
          : orderId;
      state.forceNewCheck = false;
      state.cart = [];
      state.pendingSend = null;
      state.note = '';

      tableCacheDrop(sourceId);
      tableCacheDrop(targetId);
      rememberActiveFloor();

      state.transfer.open = false;
      state.transfer.directSide = false;
      state.transfer.targetTableId = null;
      state.transfer.choiceOpen = false;
      root.classList.remove(
        'is-direct-order-move',
        'is-move-scope-choice-open'
      );
      root.classList.add('is-transfer-committing');

      renderTables();
      renderContext();
      renderCart({orderSwitch: true});

      toast(
        moveScope === 'table'
          ? (
              'Moving all ' + String(movedOrders.length) +
              (movedOrders.length === 1 ? ' check' : ' checks') +
              ' to table ' + compactTableLabel(targetTable) + '…'
            )
          : (
              'Moving #' + String(orderId) +
              ' to table ' + compactTableLabel(targetTable) + '…'
            )
      );
    } else if (directSide) {
      renderContext();
    } else {
      renderTransfer();
    }

    try {
      var json = await fetchJson(
        String(state.settings.transfer_url || '/admin/pos/transfer'),
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            source_table_id: sourceId,
            target_table_id: targetId,
            scope: state.transfer.scope,
            order_id: state.transfer.scope === 'order' ? orderId : null
          })
        }
      );

      if (sourceTable && json.source_status) {
        sourceTable.status = String(json.source_status);
      }
      if (targetTable && json.target_status) {
        targetTable.status = String(json.target_status);
      }

      tableCacheDrop(sourceId);
      tableCacheDrop(targetId);

      if (directSide && targetTable) {
        /* PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43
         * Never run full bootstrap/renderAll after a direct move. The local
         * rail is already correct; hydrate only the destination check data. */
        state.selectedTable = targetTable;
        state.activeFloorId = String(
          targetTable.floor_id || state.activeFloorId || ''
        );
        rememberActiveFloor();

        /* PMD_QPOS_POST_MOVE_SELECTION_FIX_V45
         * V44 rendered the rail while transfer.submitting was still true.
         * renderTables() therefore stamped disabled on every table button,
         * and finally() cleared only JS state, not those DOM attributes.
         * Clear the commit lock BEFORE the final authoritative rail render. */
        state.transfer.submitting = false;
        root.classList.remove('is-transfer-committing');

        var actionBar = $('[data-qpos-table-actions]');
        if (actionBar) {
          actionBar.setAttribute('aria-busy', 'false');
        }

        renderTables();
        renderContext();

        toast(json.message || 'Moved.');

        /* Authoritative destination data arrives in the background without
         * blocking the completed move interaction. */
        loadTable(targetId, true, true);
      } else {
        closeTransfer();

        state.cart = [];
        state.pendingSend = null;
        state.note = '';
        state.tableData = null;
        state.openOrders = [];
        state.activeOrderId = null;

        if (targetTable) {
          state.selectedTable = targetTable;
          state.activeFloorId = String(
            targetTable.floor_id || state.activeFloorId || ''
          );
          rememberActiveFloor();
        }

        renderAll();
        toast(json.message || 'Moved.');
        await bootstrap(true);
      }
    } catch (error) {
      if (directSide && optimisticSnapshot) {
        /* PMD_QPOS_DIRECT_MOVE_ROLLBACK_V43 */
        if (sourceTable && optimisticSnapshot.sourceStatus != null) {
          sourceTable.status = optimisticSnapshot.sourceStatus;
        }
        if (targetTable) {
          targetTable.status = optimisticSnapshot.targetStatus;
        }

        state.selectedTable = optimisticSnapshot.selectedTable;
        state.activeFloorId = optimisticSnapshot.activeFloorId;
        state.tableData = optimisticSnapshot.tableData;
        state.openOrders = optimisticSnapshot.openOrders;
        state.activeOrderId = optimisticSnapshot.activeOrderId;
        state.forceNewCheck = optimisticSnapshot.forceNewCheck;

        state.transfer.open = true;
        state.transfer.scope =
          optimisticSnapshot.moveScope === 'table' ? 'table' : 'order';
        state.transfer.targetTableId = null;
        state.transfer.directSide = true;
        state.transfer.choiceOpen = false;
        root.classList.add('is-direct-order-move');

        /* PMD_QPOS_POST_MOVE_ROLLBACK_SELECTION_FIX_V45
         * Failed moves must also clear the submitting flag before rebuilding
         * the destination rail, otherwise every table stays disabled. */
        state.transfer.submitting = false;
        root.classList.remove('is-transfer-committing');

        var rollbackActionBar = $('[data-qpos-table-actions]');
        if (rollbackActionBar) {
          rollbackActionBar.setAttribute('aria-busy', 'false');
        }

        renderTables();
        renderContext();
        renderCart({orderSwitch: true});
      }

      toast(error.message || 'Could not move the check.', true);
    } finally {
      state.transfer.submitting = false;
      root.classList.remove('is-transfer-committing');

      /* PMD_QPOS_TRANSFER_BUSY_CLEAR_V44 */
      var actionBar = $('[data-qpos-table-actions]');
      if (actionBar) {
        actionBar.setAttribute('aria-busy', 'false');
      }

      if (state.transfer.open) {
        if (state.transfer.directSide) {
          renderContext();
        } else {
          renderTransfer();
        }
      }
    }
  }

  async function selectTable(id) {
    var table = state.tables.find(function (row) {
      return Number(row.id) === Number(id);
    });
    if (!table) return;

    if (state.payment.open) {
      toast('Close payment first.', true);
      return;
    }

    if (
      state.cart.length &&
      (
        state.serviceMode !== 'dine_in' ||
        !state.selectedTable ||
        Number(state.selectedTable.id) !== Number(table.id)
      ) &&
      !(await confirmAction({
        title: 'Change table?',
        message: '',
        confirmLabel: 'Change table',
        cancelLabel: 'Keep cart',
        tone: 'danger'
      }))
    ) {
      return;
    }

    state.serviceMode = 'dine_in';
    state.selectedTable = table;
    state.cart = [];
    state.note = '';
    state.activeOrderId = null;
    state.offPremiseOrder = null;

    /* PMD_QPOS_IMMEDIATE_TABLE_TAP_V42
     * Do not rebuild the full table rail or food catalogue on a table tap.
     * Paint selection immediately, reuse a warm table payload if available,
     * and revalidate cached data without blocking the click handler. */
    var cachedTable = tableCacheGet(table.id);

    state.tableSwitching = !cachedTable;
    root.classList.toggle('is-table-switching', state.tableSwitching);

    syncSelectedTableRailV42();
    syncProductSelection();

    if (cachedTable) {
      applyTablePayload(table.id, cachedTable);

      /* Stale-while-revalidate: visible data is immediate. */
      loadTable(table.id, true, true);
    } else {
      state.tableData = null;
      state.openOrders = [];
      state.activeOrderId = null;
      renderContext();
      renderCart();

      /* Do not block the tap handler; loadTable paints as soon as it resolves. */
      loadTable(table.id, false, false);
    }

    var historyWorkspace = $('[data-qpos-history-modal]');
    if (historyWorkspace && historyWorkspace.classList.contains('is-open')) {
      /* PMD_QPOS_HISTORY_AFTER_TABLE_V42 */
      state.historyScope = 'selected';
      state.historySelectedOrderId = null;
      await loadHistory('selected', {preserve: true});
    }

    if (window.innerWidth <= 820) {
      var catalog = $('.pmd-qpos-catalog');
      if (catalog && catalog.scrollIntoView) {
        catalog.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    }
  }

  /* PMD_QPOS_TABLE_CACHE_V41
   * Recent table payloads are shown immediately and then revalidated.
   * Hover/focus prefetch only requests the table the user is heading toward.
   */
  var PMD_QPOS_TABLE_CACHE_TTL_V41 = 12000;

  function tableCacheGet(id) {
    var key = String(Number(id || 0));
    var row = state.tableCache[key];
    if (!row) return null;

    if ((Date.now() - Number(row.saved_at || 0)) > PMD_QPOS_TABLE_CACHE_TTL_V41) {
      delete state.tableCache[key];
      return null;
    }

    return row.payload || null;
  }

  function tableCachePut(id, payload) {
    var key = String(Number(id || 0));
    if (!key || key === '0' || !payload) return;

    state.tableCache[key] = {
      saved_at: Date.now(),
      payload: payload
    };
  }

  function tableCacheDrop(id) {
    var key = String(Number(id || 0));
    if (key && key !== '0') {
      delete state.tableCache[key];
    }
  }

  async function fetchTablePayload(id, force) {
    id = Number(id || 0);
    if (!id || !state.settings.table_data_url) return null;

    var key = String(id);

    if (!force) {
      var cached = tableCacheGet(id);
      if (cached) return cached;
    }

    if (state.tableFetches[key]) {
      return state.tableFetches[key];
    }

    var url = tokenUrl(state.settings.table_data_url, '{table}', id);
    var pending = fetchJson(url + '?_=' + Date.now())
      .then(function (json) {
        tableCachePut(id, json);
        return json;
      })
      .finally(function () {
        delete state.tableFetches[key];
      });

    state.tableFetches[key] = pending;
    return pending;
  }

  function prefetchTableData(id) {
    id = Number(id || 0);
    if (!id || tableCacheGet(id)) return;

    fetchTablePayload(id, false).catch(function () {
      /* Opportunistic prefetch: normal click flow owns user-facing errors. */
    });
  }

  /* PMD_QPOS_IDLE_TABLE_WARMUP_V42
   * Warm a small number of likely-to-be-open checks sequentially. This avoids
   * a request burst while making the next few busy-table taps effectively
   * instant on both mouse and touch devices. */
  function scheduleTableWarmupV42() {
    if (state.tableWarmupRunning || state.transfer.open || state.payment.open) {
      return;
    }

    var candidates = activeFloorTables()
      .filter(function (table) {
        var id = Number(table.id || 0);
        if (!id) return false;
        if (
          state.selectedTable &&
          Number(state.selectedTable.id || 0) === id
        ) {
          return false;
        }
        if (tableCacheGet(id)) return false;

        var status = String(table.status || '').toLowerCase();
        var payment = String(table.payment_state || 'none').toLowerCase();

        return (
          status === 'occupied' ||
          payment === 'due' ||
          payment === 'partial'
        );
      })
      .slice(0, 6);

    if (!candidates.length) return;

    var key =
      String(state.activeFloorId || '') + ':' +
      candidates.map(function (table) {
        return String(table.id || '');
      }).join(',');

    if (state.tableWarmupKey === key) return;
    state.tableWarmupKey = key;

    var run = async function () {
      if (state.tableWarmupRunning) return;
      state.tableWarmupRunning = true;

      try {
        for (var i = 0; i < candidates.length; i++) {
          if (state.payment.open || state.transfer.open) break;
          await fetchTablePayload(candidates[i].id, false).catch(function () {
            return null;
          });
        }
      } finally {
        state.tableWarmupRunning = false;
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () {
        run();
      }, {timeout: 700});
    } else {
      window.setTimeout(run, 260);
    }
  }

  function applyTablePayload(id, json) {
    if (
      !json ||
      !state.selectedTable ||
      Number(state.selectedTable.id) !== Number(id)
    ) {
      return false;
    }

    /* PMD_QPOS_SWITCH_STATE_CLEAR_V42 */
    state.tableSwitching = false;
    root.classList.remove('is-table-switching');
    state.tableData = json;
    state.openOrders = Array.isArray(json.open_orders) ? json.open_orders : [];
    state.activeOrderId = Number(json.active_order_id || 0) || null;
    state.forceNewCheck = false;

    var table = json.table || null;
    if (table && state.selectedTable) {
      var mergedTable = Object.assign({}, state.selectedTable, table);
      state.selectedTable = mergedTable;

      state.tables = state.tables.map(function (row) {
        if (Number(row.id || 0) !== Number(id)) return row;

        /* Keep lightweight signal fields from bootstrap unless the table
         * payload explicitly provides replacements for them. */
        return Object.assign({}, row, table, {
          payment_state:
            table.payment_state != null
              ? table.payment_state
              : row.payment_state,
          due_amount:
            table.due_amount != null
              ? table.due_amount
              : row.due_amount,
          waiter_calls:
            table.waiter_calls != null
              ? table.waiter_calls
              : row.waiter_calls,
          note_count:
            table.note_count != null
              ? table.note_count
              : row.note_count
        });
      });
    }

    var order = activeOrder();
    if (order && order.guest_count) {
      state.guestCount = Math.max(1, num(order.guest_count, 1));
    }

    /* PMD_QPOS_NO_RAIL_REBUILD_ON_HYDRATE_V42
     * Keep the selected card mounted; only patch selection/status metadata. */
    syncSelectedTableRailV42();

    var selectedButton = document.querySelector(
      '[data-qpos-table="' + String(Number(id || 0)) + '"]'
    );
    if (selectedButton && state.selectedTable) {
      selectedButton.setAttribute(
        'data-status',
        String(state.selectedTable.status || 'available')
      );

      var selectedMeta = selectedButton.querySelector('small');
      if (selectedMeta) {
        selectedMeta.textContent =
          tableStatusLabel(state.selectedTable.status) +
          (
            num(state.selectedTable.capacity, 0) > 0
              ? ' · ' + String(state.selectedTable.capacity) + 's'
              : ''
          );
      }
    }

    renderContext();
    renderCart();

    return true;
  }

  async function loadTable(id, silent, force) {
    if (!state.settings.table_data_url) return;

    var requestSeq = ++state.tableRequestSeq;

    try {
      /* PMD_QPOS_AUTHORITATIVE_REFRESH_V41
       * Existing refresh callers remain authoritative by default. Only the
       * first-click path explicitly passes false to reuse a warm prefetch. */
      var shouldForce = force !== false;
      var json = await fetchTablePayload(id, shouldForce);

      if (
        requestSeq !== state.tableRequestSeq ||
        !state.selectedTable ||
        Number(state.selectedTable.id) !== Number(id)
      ) {
        return;
      }

      /* PMD_QPOS_TARGETED_TABLE_HYDRATE_V41
       * Hydrate only the rail/check context instead of renderAll(). */
      applyTablePayload(id, json);
    } catch (error) {
      if (!silent && requestSeq === state.tableRequestSeq) {
        /* PMD_QPOS_SWITCH_ERROR_CLEAR_V42 */
        state.tableSwitching = false;
        root.classList.remove('is-table-switching');
        renderCart();
        toast(error.message || 'Table could not be opened.', true);
      }
    }
  }

  async function selectFloor(id) {
    if (state.payment.open) {
      toast('Close payment first.', true);
      return;
    }

    id = String(id || '');
    if (
      !id ||
      !state.floors.some(function (floor) {
        return String(floor.id) === id;
      }) ||
      id === String(state.activeFloorId)
    ) {
      return;
    }

    if (
      state.transfer.open &&
      state.transfer.directSide
    ) {
      state.activeFloorId = id;
      rememberActiveFloor();
      renderContext();
      renderTables();
      return;
    }

    if (state.serviceMode === 'takeaway') {
      state.activeFloorId = id;
      rememberActiveFloor();
      renderContext();
      renderTables();
      return;
    }

    if (
      state.cart.length &&
      !(await confirmAction({
        title: 'Change floor?',
        message: '',
        confirmLabel: 'Change floor',
        cancelLabel: 'Keep cart',
        tone: 'danger'
      }))
    ) {
      return;
    }

    state.activeFloorId = id;
    rememberActiveFloor();

    state.serviceMode = 'dine_in';
    state.selectedTable = null;
    state.tableData = null;
    state.openOrders = [];
    state.activeOrderId = null;
    state.offPremiseOrder = null;
    state.cart = [];
    state.note = '';
    state.guestCount = 1;

    renderAll();
  }

  async function selectPickup() {
    if (state.payment.open) {
      toast('Close payment first.', true);
      return;
    }

    if (state.serviceMode === 'takeaway') {
      var existingHistory = $('[data-qpos-history-modal]');
      if (existingHistory && existingHistory.classList.contains('is-open')) {
        state.historyScope = 'selected';
        state.historySelectedOrderId = null;
        loadHistory('selected', {preserve: true});
      }
      return;
    }

    if (
      state.cart.length &&
      !(await confirmAction({
        title: 'Switch to Pickup?',
        message: '',
        confirmLabel: 'Pickup',
        cancelLabel: 'Keep table',
        tone: 'danger'
      }))
    ) {
      return;
    }

    state.serviceMode = 'takeaway';
    state.selectedTable = null;
    state.tableData = null;
    state.openOrders = [];
    state.activeOrderId = null;
    state.offPremiseOrder = null;
    state.cart = [];
    state.note = '';
    state.guestCount = 1;
    state.forceNewCheck = false;

    renderAll();

    var historyWorkspace = $('[data-qpos-history-modal]');
    if (historyWorkspace && historyWorkspace.classList.contains('is-open')) {
      state.historyScope = 'selected';
      state.historySelectedOrderId = null;
      loadHistory('selected', {preserve: true});
    }
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
      toast('Select table or Pickup.', true);
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

    // PMD_QPOS_BLITZ_ACTION_V1
    // The operator gets the next screen immediately. Network persistence runs
    // behind the already-updated UI and rolls back only on an actual failure.
    if (afterSuccess === 'pay') {
      var previewBase = order ? orderTotal(order) : 0;
      var previewSettled = order ? num(order.settled_amount, 0) : 0;
      var previewAdded = snapshot.cart.reduce(function (sum, row) {
        return sum + lineTotal(row);
      }, 0);

      showPaymentPreview(
        roundMoney(previewBase + previewAdded),
        previewSettled,
        snapshot.expectedUpdatedAt || ''
      );
    }

    state.submitting = true;
    state.pendingSend = snapshot;
    state.cart = [];
    state.note = '';

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (ignored) {}
    }

    renderCart();

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

      if (!(afterSuccess === 'pay' && state.payment.open)) {
        toast(json.message || 'Order saved');
      }

      window.dispatchEvent(new CustomEvent('pmd:quick-pos-order-updated', {
        detail: json
      }));

      if (afterSuccess === 'pay' && state.payment.open) {
        if (json.payment_quick && json.payment_quick.settlement) {
          state.payment.summary = json.payment_quick;
          state.payment.authoritative = true;
          state.payment.amount = roundMoney(
            num(json.payment_quick.settlement.remaining_amount, 0)
          ).toFixed(2);
          state.payment.cashReceived = state.payment.amount;
          renderPayment();
        }

        // Hydrate terminal providers / full payment metadata in background.
        setTimeout(function () {
          if (state.payment.open) loadPaymentSummary(true);
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

      if (afterSuccess === 'pay' && state.payment.open) {
        closePayment();
      }

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

  async function newCheck() {
    if (
      state.cart.length &&
      !(await confirmAction({
        title: 'Clear cart?',
        message: '',
        confirmLabel: 'Clear',
        cancelLabel: 'Keep items',
        tone: 'danger'
      }))
    ) {
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

  /* PMD_QPOS_ITEM_NOTE_V1 */
  function openItemNote(index) {
    var row = state.cart[index];
    if (!row) return;

    state.itemNoteIndex = index;

    var title = $('[data-qpos-item-note-title]');
    var input = $('[data-qpos-item-note-input]');
    var modal = $('[data-qpos-item-note-modal]');

    if (title) title.textContent = row.name || 'Item';
    if (input) input.value = String(row.comment || '');

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }

    if (input) {
      window.requestAnimationFrame(function () {
        input.focus();
        maybeOpenTextKeyboard(input, 'Item note');
      });
    }
  }

  function closeItemNote() {
    var modal = $('[data-qpos-item-note-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    state.itemNoteIndex = null;
    closeTextKeyboard();
  }

  function saveItemNote(clear) {
    var index = Number(state.itemNoteIndex);
    var row = state.cart[index];
    if (!row) {
      closeItemNote();
      return;
    }

    var input = $('[data-qpos-item-note-input]');
    row.comment = clear
      ? ''
      : String(input ? input.value : '').trim();

    row.key = [
      String(row.menu_id || ''),
      (row.options || []).map(function (option) {
        return String(option.id);
      }).sort().join(','),
      String(row.comment || '').trim().toLowerCase()
    ].join(':');

    closeItemNote();
    renderCart();
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
    closeTextKeyboard();
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
      summaryPromise: null,
      submitting: false,
      summary: null,
      method: 'cash',
      amount: '',
      cashReceived: '',
      tipMode: 'percent',
      tipPercent: 0,
      tipAmount: '',
      splitMode: 'full',
      splitParts: 1,
      splitPercent: 50,
      selectedItems: {},
      reference: '',
      externalConfirmed: false,
      terminal: null,
      receiptUrl: '',
      invoiceUrl: '',
      idempotencyKey: uid('pay'),
      authoritative: false,
      touchKeypadTarget: 'cash',
      touchKeypadFresh: true
    };
  }

  function paymentPreviewSummary(total, settled, updatedAt) {
    total = Math.max(0, roundMoney(total));
    settled = Math.max(0, Math.min(total, roundMoney(settled)));

    return {
      ok: true,
      preview: true,
      order: {
        order_id: Number(state.activeOrderId || 0),
        updated_at: String(updatedAt || '')
      },
      settlement: {
        order_total: total,
        settled_amount: settled,
        remaining_amount: Math.max(0, roundMoney(total - settled))
      },
      terminal_providers: []
    };
  }

  function showPaymentPreview(total, settled, updatedAt) {
    closeHistory();
    closeTextKeyboard();
    hideToast();
    resetPayment();
    state.payment.summary = paymentPreviewSummary(total, settled, updatedAt);
    state.payment.amount = roundMoney(
      state.payment.summary.settlement.remaining_amount
    ).toFixed(2);
    state.payment.cashReceived = state.payment.amount;

    renderPayment();

    var modal = $('[data-qpos-payment-modal]');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
    root.classList.add('is-payment-workspace');

    pushCustomerDisplay(
      'payment',
      {
        headline: 'Please pay',
        message:
          state.payment.method === 'direct_terminal'
            ? 'Tap or insert your card'
            : 'Please follow the cashier',
        amount_due: paymentCharge()
      },
      true
    );

    /* PMD_QPOS_CASH_AUTO_FOCUS_V46
     * Payment opens ready for immediate cashier input. */
    window.requestAnimationFrame(function () {
      focusPaymentKeypadTargetV46('cash');
    });
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

  function paymentSelectedItemsPayload() {
    var summary = state.payment.summary;
    var selected = state.payment.selectedItems || {};
    if (!summary || !Array.isArray(summary.items)) return [];

    return summary.items.reduce(function (rows, item) {
      var id = Number(item.order_menu_id || 0);
      var qty = num(selected[String(id)], 0);
      var unpaid = num(item.unpaid_quantity, 0);
      qty = Math.max(0, Math.min(unpaid, qty));
      if (id > 0 && qty > 0.0001) {
        rows.push({order_menu_id: id, quantity: qty});
      }
      return rows;
    }, []);
  }

  function selectedItemsGross() {
    var summary = state.payment.summary;
    if (!summary || !Array.isArray(summary.items)) return 0;

    var ratio = Math.max(
      0.000001,
      num(summary.settlement && summary.settlement.gross_ratio, 1)
    );
    var selected = state.payment.selectedItems || {};

    return roundMoney(summary.items.reduce(function (sum, item) {
      var id = Number(item.order_menu_id || 0);
      var qty = Math.max(
        0,
        Math.min(
          num(item.unpaid_quantity, 0),
          num(selected[String(id)], 0)
        )
      );
      return sum + (num(item.unit_price, 0) * qty * ratio);
    }, 0));
  }

  function syncSplitAmount() {
    var remaining = paymentRemaining();
    var mode = String(state.payment.splitMode || 'full');
    var amount = remaining;

    if (mode === 'equal') {
      var parts = Math.max(2, Math.min(20, Number(state.payment.splitParts || 2)));
      state.payment.splitParts = parts;
      amount = roundMoney(remaining / parts);
    } else if (mode === 'items') {
      amount = selectedItemsGross();
    } else if (mode === 'shares') {
      var percent = Math.max(0, Math.min(100, num(state.payment.splitPercent, 50)));
      amount = roundMoney(remaining * percent / 100);
    }

    state.payment.amount = amount > 0 ? amount.toFixed(2) : '';

    if (state.payment.method === 'cash') {
      state.payment.cashReceived = amount > 0
        ? paymentCharge().toFixed(2)
        : '';
    }

    return amount;
  }

  /* PMD_QPOS_SPLIT_TIP_V1 */
  function paymentTip() {
    if (state.payment.tipMode === 'custom') {
      return roundMoney(Math.max(0, num(state.payment.tipAmount, 0)));
    }

    return roundMoney(
      paymentAmount() *
      Math.max(0, num(state.payment.tipPercent, 0)) /
      100
    );
  }

  function paymentCharge() {
    return roundMoney(paymentAmount() + paymentTip());
  }

  /* PMD_QPOS_SPLIT_BILL_V16
   * Mirrors the customer digital-menu concepts: equal, items and shares. */
  function applySplitMode(mode) {
    if (!state.payment.open || state.payment.method === 'direct_terminal') {
      return;
    }

    clearPaymentErrorOnEdit();
    mode = String(mode || 'full');
    if (['full', 'equal', 'items', 'shares'].indexOf(mode) === -1) {
      mode = 'full';
    }

    state.payment.splitMode = mode;

    if (mode === 'equal' && Number(state.payment.splitParts || 0) < 2) {
      state.payment.splitParts = 2;
    }
    if (mode === 'shares' && num(state.payment.splitPercent, 0) <= 0) {
      state.payment.splitPercent = 50;
    }

    syncSplitAmount();
    state.payment.touchKeypadTarget =
      mode === 'shares'
        ? 'share'
        : (state.payment.method === 'cash' ? 'cash' : 'amount');
    state.payment.touchKeypadFresh = true;
    renderPayment();
  }

  function adjustSplitPeople(delta) {
    if (state.payment.splitMode !== 'equal') return;
    clearPaymentErrorOnEdit();
    state.payment.splitParts = Math.max(
      2,
      Math.min(20, Number(state.payment.splitParts || 2) + Number(delta || 0))
    );
    syncSplitAmount();
    renderPayment();
  }

  function toggleSplitItem(orderMenuId) {
    if (state.payment.splitMode !== 'items' || !state.payment.summary) return;

    clearPaymentErrorOnEdit();
    var item = (state.payment.summary.items || []).find(function (row) {
      return Number(row.order_menu_id || 0) === Number(orderMenuId);
    });
    if (!item) return;

    var key = String(Number(orderMenuId));
    var selected = state.payment.selectedItems || {};
    var current = num(selected[key], 0);

    if (current > 0.0001) {
      delete selected[key];
    } else {
      selected[key] = num(item.unpaid_quantity, 0);
    }

    state.payment.selectedItems = selected;
    syncSplitAmount();
    renderPayment();
  }

  function applySharePercent(value) {
    if (state.payment.method === 'direct_terminal') return;

    clearPaymentErrorOnEdit();
    var percent = Math.max(0, Math.min(100, num(value, 0)));
    state.payment.splitMode = 'shares';
    state.payment.splitPercent = percent;
    syncSplitAmount();
    state.payment.touchKeypadTarget = 'share';
    state.payment.touchKeypadFresh = true;
    renderPayment();
  }

  /* PMD_QPOS_PAYMENT_FILL_V23
   * Expose the current split mode to CSS so the left payment workspace can
   * use all available height without inventing duplicate summary content. */
  function renderSplitControls() {
    var wrap = $('[data-qpos-split-row]');
    if (!wrap) return;

    var terminal = state.payment.method === 'direct_terminal';
    wrap.hidden = terminal;
    if (terminal) {
      wrap.removeAttribute('data-qpos-active-split');
      return;
    }

    var mode = String(state.payment.splitMode || 'full');
    wrap.setAttribute('data-qpos-active-split', mode);
    var remaining = paymentRemaining();

    $$('[data-qpos-split-mode]', wrap).forEach(function (button) {
      var value = String(button.getAttribute('data-qpos-split-mode') || '');
      button.classList.toggle('is-active', value === mode);
    });

    var equal = $('[data-qpos-split-equal]', wrap);
    var items = $('[data-qpos-split-items]', wrap);
    var shares = $('[data-qpos-split-shares]', wrap);
    if (equal) equal.hidden = mode !== 'equal';
    if (items) items.hidden = mode !== 'items';
    if (shares) shares.hidden = mode !== 'shares';

    var summary = $('[data-qpos-split-summary]', wrap);
    if (summary) {
      if (mode === 'equal') {
        summary.textContent =
          '1 of ' + Math.max(2, Number(state.payment.splitParts || 2)) +
          ' · ' + money(paymentAmount());
      } else if (mode === 'items') {
        var selectedCount = paymentSelectedItemsPayload().length;
        summary.textContent =
          selectedCount
            ? selectedCount + ' item' + (selectedCount === 1 ? '' : 's') +
              ' · ' + money(paymentAmount())
            : 'Choose unpaid items';
      } else if (mode === 'shares') {
        summary.textContent =
          Number(num(state.payment.splitPercent, 0).toFixed(2)) +
          '% · ' + money(paymentAmount());
      } else {
        summary.textContent = 'Pay full bill · ' + money(remaining);
      }
    }

    var people = $('[data-qpos-split-people]', wrap);
    var each = $('[data-qpos-split-each]', wrap);
    if (people) people.textContent = String(Math.max(2, Number(state.payment.splitParts || 2)));
    if (each) each.textContent = money(paymentAmount());

    var itemList = $('[data-qpos-split-items-list]', wrap);
    var itemTotal = $('[data-qpos-split-items-total]', wrap);
    if (itemTotal) itemTotal.textContent = money(paymentAmount());

    if (itemList && mode === 'items') {
      var rows = state.payment.summary && Array.isArray(state.payment.summary.items)
        ? state.payment.summary.items.filter(function (item) {
            return num(item.unpaid_quantity, 0) > 0.0001;
          })
        : [];

      if (!rows.length) {
        itemList.innerHTML =
          '<div class="pmd-qpos-split-empty">No unpaid items remain.</div>';
      } else {
        itemList.innerHTML = rows.map(function (item) {
          var id = Number(item.order_menu_id || 0);
          var selectedQty = num(
            (state.payment.selectedItems || {})[String(id)],
            0
          );
          var active = selectedQty > 0.0001;
          var gross = num(item.unpaid_gross, 0);
          return (
            '<button type="button" class="pmd-qpos-split-item' +
              (active ? ' is-selected' : '') + '"' +
              ' data-qpos-split-item="' + esc(id) + '">' +
              '<span class="pmd-qpos-split-item-check">' +
                (active ? '✓' : '') +
              '</span>' +
              '<span><b>' + esc(item.name || 'Item') + '</b>' +
                '<small>' + esc(num(item.unpaid_quantity, 0)) + ' unpaid</small></span>' +
              '<strong>' + money(gross) + '</strong>' +
            '</button>'
          );
        }).join('');

        $$('[data-qpos-split-item]', itemList).forEach(function (button) {
          button.onclick = function () {
            toggleSplitItem(button.getAttribute('data-qpos-split-item'));
          };
        });
      }
    }

    var shareInput = $('[data-qpos-share-percent]', wrap);
    var shareAmount = $('[data-qpos-share-amount]', wrap);
    if (shareInput && document.activeElement !== shareInput) {
      shareInput.value = String(Number(num(state.payment.splitPercent, 0).toFixed(2)));
    }
    if (shareAmount) shareAmount.textContent = money(paymentAmount());

    $$('[data-qpos-share-preset]', wrap).forEach(function (button) {
      var preset = num(button.getAttribute('data-qpos-share-preset'), 0);
      button.classList.toggle(
        'is-active',
        mode === 'shares' &&
        Math.abs(preset - num(state.payment.splitPercent, 0)) < 0.02
      );
    });
  }

  async function openPayment() {
    if (state.cart.length) {
      toast('Send first.', true);
      return;
    }
    if (!state.activeOrderId) {
      toast('Select a check.', true);
      return;
    }

    var order = activeOrder();
    showPaymentPreview(
      order ? orderTotal(order) : 0,
      order ? num(order.settled_amount, 0) : 0,
      order && order.updated_at ? order.updated_at : ''
    );

    /* PMD_QPOS_PAYMENT_INSTANT_OPEN_V52
     * Authoritative settlement refresh runs in the background. The preview is
     * already usable, so opening Payment never waits on network latency. */
    loadPaymentSummary(false);

    if (state.payment.open && state.payment.method === 'cash') {
      window.requestAnimationFrame(function () {
        focusPaymentKeypadTargetV46('cash');
      });
    }
  }

  function closePayment() {
    var modal = $('[data-qpos-payment-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    root.classList.remove('is-payment-workspace');
    state.payment.open = false;
    state.payment.touchKeypadTarget = null;
    state.payment.touchKeypadFresh = true;
    renderTouchKeypad();
  }

  function loadPaymentSummary(silent) {
    if (!state.activeOrderId) {
      return Promise.resolve(false);
    }

    /* PMD_QPOS_PAYMENT_SUMMARY_DEDUPE_V52
     * Opening Payment and an immediate cashier tap share one request instead
     * of racing two payment-summary calls. */
    if (state.payment.summaryPromise) {
      return state.payment.summaryPromise;
    }

    state.payment.loading = true;

    state.payment.summaryPromise = (async function () {
      try {
        var url = tokenUrl(
          state.settings.payment_summary_url,
          '{order}',
          state.activeOrderId
        );
        var json = await fetchJson(url + '?_=' + Date.now());
        state.payment.summary = json;
        state.payment.authoritative = true;
        state.payment.amount = roundMoney(
          num(json.settlement && json.settlement.remaining_amount, 0)
        ).toFixed(2);
        syncSplitAmount();
        state.payment.cashReceived =
          state.payment.method === 'cash'
            ? (paymentAmount() > 0 ? paymentCharge().toFixed(2) : '')
            : '';

        if (
          !silent &&
          num(json.settlement && json.settlement.remaining_amount, 0) <= 0.005
        ) {
          finishPaidOrderUi();
          closePayment();
          toast('Paid');
          return false;
        }

        return true;
      } catch (error) {
        showPaymentError(
          error.message || 'Payment details could not be loaded.'
        );
        return false;
      } finally {
        state.payment.loading = false;
        state.payment.summaryPromise = null;
        renderPayment();
      }
    })();

    return state.payment.summaryPromise;
  }

  function showPaymentError(message) {
    var el = $('[data-qpos-payment-error]');
    if (el) {
      el.hidden = !message;
      el.textContent = String(message || '');
    }

    if (message && state.payment.open) {
      pushCustomerDisplay(
        'error',
        {
          headline: 'Please try again',
          message: String(message || 'Payment was not completed.'),
          amount_due: paymentCharge()
        },
        true
      );
    }
  }

  /* PMD_QPOS_PAYMENT_ERROR_STATE_V18
   * Server validation stays visible until the cashier changes a payment
   * control. Once the value/method changes, the previous error is stale. */
  function clearPaymentErrorOnEdit() {
    showPaymentError('');
  }

  function renderPaymentMethods() {
    var box = $('[data-qpos-payment-methods]');
    if (!box || !state.payment.summary) return;

    var providers = Array.isArray(state.payment.summary.terminal_providers)
      ? state.payment.summary.terminal_providers
      : [];

    if (state.payment.method === 'external_terminal') {
      state.payment.method = 'cash';
      state.payment.reference = '';
      state.payment.externalConfirmed = false;
    }

    if (
      state.payment.authoritative === true &&
      state.payment.method === 'direct_terminal' &&
      !providers.length
    ) {
      state.payment.method = 'cash';
      state.payment.amount = roundMoney(paymentRemaining()).toFixed(2);
      state.payment.cashReceived = paymentCharge().toFixed(2);
      state.payment.touchKeypadTarget = 'cash';
      state.payment.touchKeypadFresh = true;
    }

    var methods = [
      {code: 'cash', name: 'Cash', disabled: false},
      {code: 'direct_terminal', name: 'Terminal', disabled: !providers.length}
    ];

    var methodSignature = methods.map(function (method) {
      return [
        method.code,
        state.payment.method === method.code ? '1' : '0',
        method.disabled ? '1' : '0'
      ].join(':');
    }).join('|');

    if (box.getAttribute('data-qpos-method-signature') !== methodSignature) {
      box.setAttribute('data-qpos-method-signature', methodSignature);
      box.innerHTML = methods.map(function (method) {
        return (
          '<button type="button" data-payment-method="' + esc(method.code) + '"' +
            (state.payment.method === method.code ? ' class="is-active"' : '') +
            (method.disabled ? ' disabled' : '') + '>' +
            esc(method.name) +
          '</button>'
        );
      }).join('');

      $$('[data-payment-method]', box).forEach(function (button) {
        button.onclick = function () {
          if (button.disabled) return;

          clearPaymentErrorOnEdit();
          state.payment.method = button.getAttribute('data-payment-method');
          state.payment.reference = '';
          state.payment.externalConfirmed = false;
          state.payment.terminal = null;
          state.payment.terminalTipAmount = 0;
          state.payment.terminalTipKnown = false;

          if (state.payment.method === 'direct_terminal') {
            state.payment.amount = roundMoney(paymentRemaining()).toFixed(2);
            state.payment.cashReceived = '';
            state.payment.tipMode = 'percent';
            state.payment.tipPercent = 0;
            state.payment.tipAmount = '';
            state.payment.splitMode = 'full';
            state.payment.splitParts = 1;
            state.payment.splitPercent = 50;
            state.payment.selectedItems = {};
            state.payment.touchKeypadTarget = 'amount';
            state.payment.touchKeypadFresh = true;
          } else {
            state.payment.amount = roundMoney(paymentRemaining()).toFixed(2);
            state.payment.tipMode = 'percent';
            state.payment.tipPercent = 0;
            state.payment.tipAmount = '';
            state.payment.splitMode = 'full';
            state.payment.splitParts = 1;
            state.payment.splitPercent = 50;
            state.payment.selectedItems = {};
            state.payment.cashReceived = paymentCharge().toFixed(2);
            state.payment.touchKeypadTarget = 'cash';
            state.payment.touchKeypadFresh = true;
          }

          renderPayment();

          /* PMD_QPOS_PAYMENT_METHOD_FOCUS_V46 */
          if (state.payment.method === 'cash') {
            window.requestAnimationFrame(function () {
              focusPaymentKeypadTargetV46('cash');
            });
          }
        };
      });
    }
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
        clearPaymentErrorOnEdit();
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
    if (box.hidden) return;

    var current = roundMoney(num(state.payment.cashReceived, 0));
    var values = cashPresetValues();
    var signature = values.map(function (value) {
      return String(roundMoney(value));
    }).join('|') + '::' + String(current);

    if (box.getAttribute('data-qpos-cash-signature') === signature) {
      return;
    }

    box.setAttribute('data-qpos-cash-signature', signature);
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
        clearPaymentErrorOnEdit();
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
    if (target === 'cash') {
      return String(
        state.payment.cashReceived == null
          ? ''
          : state.payment.cashReceived
      );
    }

    if (target === 'tip') {
      return String(
        state.payment.tipAmount == null
          ? ''
          : state.payment.tipAmount
      );
    }

    if (target === 'share') {
      return String(
        state.payment.splitPercent == null
          ? ''
          : state.payment.splitPercent
      );
    }

    return String(
      state.payment.amount == null
        ? ''
        : state.payment.amount
    );
  }

  function touchKeypadDisplayValue(target) {
    var raw = touchKeypadRawValue(target);
    if (raw === '') return '0.00';
    return raw;
  }

  /* PMD_QPOS_PAYMENT_STABLE_V3
   * The numeric keypad is part of the payment card, not a pop-in control.
   * It stays visible for the entire payment flow to keep the card geometry
   * stable on restaurant touch screens.
   */
  function renderTouchKeypad() {
    var keypad = $('[data-qpos-touch-keypad]');
    var label = $('[data-qpos-touch-keypad-label]');
    var value = $('[data-qpos-touch-keypad-value]');
    var nextField = $('[data-qpos-keypad-next]');
    var amountEl = $('[data-qpos-payment-amount]');
    var cashEl = $('[data-qpos-cash-received]');
    var tipEl = $('[data-qpos-tip-amount]');
    var shareEl = $('[data-qpos-share-percent]');

    if (!keypad) return;

    if (!state.payment.open) {
      keypad.hidden = true;
      return;
    }

    var target = state.payment.touchKeypadTarget;
    if (
      target !== 'amount' &&
      target !== 'cash' &&
      target !== 'tip' &&
      target !== 'share'
    ) {
      target = state.payment.method === 'cash' ? 'cash' : 'amount';
      state.payment.touchKeypadTarget = target;
      state.payment.touchKeypadFresh = true;
    }

    if (
      state.payment.method !== 'cash' &&
      (target === 'cash' || target === 'tip' || target === 'share')
    ) {
      target = 'amount';
      state.payment.touchKeypadTarget = target;
      state.payment.touchKeypadFresh = true;
    }

    var locked = state.payment.method === 'direct_terminal';

    if (amountEl) {
      amountEl.classList.toggle('is-keypad-target', target === 'amount');
    }
    if (cashEl) {
      cashEl.classList.toggle('is-keypad-target', target === 'cash');
    }
    if (tipEl) {
      tipEl.classList.toggle('is-keypad-target', target === 'tip');
    }
    if (shareEl) {
      shareEl.classList.toggle('is-keypad-target', target === 'share');
    }

    keypad.hidden = false;
    keypad.classList.toggle('is-locked', locked);
    keypad.setAttribute('data-qpos-keypad-target-mode', target);
    keypad.setAttribute('data-qpos-keypad-payment-method', state.payment.method);

    $$('[data-qpos-keypad-key]', keypad).forEach(function (button) {
      button.disabled = locked;
    });

    if (label) {
      label.textContent = locked
        ? 'Terminal amount'
        : (
            target === 'cash'
              ? 'Cash'
              : (
                  target === 'tip'
                    ? 'Tip'
                    : (target === 'share' ? 'Share %' : 'Pay')
                )
          );
    }

    if (value) {
      value.textContent =
        target === 'share'
          ? Number(num(touchKeypadDisplayValue(target), 0).toFixed(2)) + '%'
          : money(num(touchKeypadDisplayValue(target), 0));
    }

    /* PMD_QPOS_KEYPAD_NEXT_FIELD_RUNTIME_V46 */
    if (nextField) {
      nextField.disabled =
        locked || paymentKeypadTargetsV46().length < 2;
      nextField.setAttribute(
        'aria-label',
        locked ? 'No next field' : 'Next field'
      );
    }
  }

  function paymentKeypadTargetsV46() {
    if (state.payment.method !== 'cash') return [];

    var targets = ['cash', 'amount', 'tip'];
    if (state.payment.splitMode === 'shares') {
      targets.push('share');
    }
    return targets;
  }

  function focusPaymentKeypadTargetV46(target) {
    target = String(target || '');
    if (paymentKeypadTargetsV46().indexOf(target) === -1) {
      return;
    }

    openTouchKeypad(target);

    var input = $('[data-qpos-keypad-target="' + target + '"]');
    if (input && !input.disabled && !input.hidden) {
      /* Keep the focused field synchronized with the authoritative state. */
      if (target === 'cash') {
        input.value = state.payment.cashReceived;
      } else if (target === 'amount') {
        input.value = state.payment.amount;
      } else if (target === 'tip') {
        input.value =
          state.payment.tipMode === 'custom'
            ? state.payment.tipAmount
            : '';
      } else if (target === 'share') {
        input.value = String(state.payment.splitPercent || '');
      }

      try {
        input.focus({preventScroll: true});
      } catch (ignored) {
        input.focus();
      }
    }
  }

  function advancePaymentKeypadTargetV46() {
    var targets = paymentKeypadTargetsV46();
    if (!targets.length) return;

    var current = String(state.payment.touchKeypadTarget || '');
    var index = targets.indexOf(current);
    var next = targets[(index + 1 + targets.length) % targets.length];

    focusPaymentKeypadTargetV46(next);
  }

  function openTouchKeypad(target) {
    target = String(target || '');

    if (
      target !== 'amount' &&
      target !== 'cash' &&
      target !== 'tip' &&
      target !== 'share'
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
      (target === 'cash' || target === 'tip') &&
      state.payment.method !== 'cash'
    ) {
      return;
    }

    state.payment.touchKeypadTarget = target;
    state.payment.touchKeypadFresh = true;
    renderTouchKeypad();
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
    clearPaymentErrorOnEdit();
    raw = normalizeTouchKeypadValue(raw);

    if (target === 'cash') {
      state.payment.cashReceived = raw;
    } else if (target === 'tip') {
      state.payment.tipMode = 'custom';
      state.payment.tipPercent = 0;
      state.payment.tipAmount = raw;

      if (state.payment.method === 'cash') {
        state.payment.cashReceived = paymentCharge().toFixed(2);
      }
    } else if (target === 'share') {
      state.payment.splitMode = 'shares';
      state.payment.splitPercent = Math.max(0, Math.min(100, num(raw, 0)));
      syncSplitAmount();
    } else {
      state.payment.amount = raw;
      state.payment.splitMode = 'shares';
      state.payment.splitPercent = paymentRemaining() > 0
        ? Math.max(
            0,
            Math.min(
              100,
              num(raw, 0) / paymentRemaining() * 100
            )
          )
        : 0;

      if (state.payment.method === 'cash') {
        state.payment.cashReceived = paymentCharge().toFixed(2);
      }
    }

    renderPaymentTotals();
  }

  /* PMD_QPOS_KEYPAD_PAYMENT_ACTION_V21
   * The keypad's final green key is now the actual payment action.
   * Numeric editing no longer needs a separate Done step or footer CTA. */
  function applyTouchKeypadKey(key) {
    var target = state.payment.touchKeypadTarget;
    if (
      target !== 'amount' &&
      target !== 'cash' &&
      target !== 'tip' &&
      target !== 'share'
    ) return;

    key = String(key || '');
    var raw = touchKeypadRawValue(target);

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

    if (key === 'next') {
      advancePaymentKeypadTargetV46();
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
    var tipEl = $('[data-qpos-tip-amount]');
    var tipRow = $('.pmd-qpos-tip-row');
    var cashField = $('[data-qpos-cash-field]');
    var terminalTip = $('[data-qpos-terminal-tip]');
    var terminalTipAmount = $('[data-qpos-terminal-tip-amount]');
    var changeBox = $('[data-qpos-change]');
    var changeEl = $('[data-qpos-change-amount]');
    var submit = $('[data-qpos-payment-submit]');

    if (amountEl && document.activeElement !== amountEl) {
      amountEl.value = state.payment.amount;
      amountEl.disabled = state.payment.method === 'direct_terminal';
    }

    if (cashField) {
      cashField.hidden = state.payment.method !== 'cash';
    }

    if (cashEl) {
      cashEl.disabled = state.payment.method !== 'cash';
      if (state.payment.method !== 'cash') {
        cashEl.value = '';
      } else if (document.activeElement !== cashEl) {
        cashEl.value = state.payment.cashReceived;
      }
    }

    /* PMD_QPOS_CASH_ONLY_TIP_V46
     * Cashier tip controls exist only for Cash. Terminal tipping belongs to
     * the customer-facing device and is displayed read-only when reported. */
    if (tipRow) {
      tipRow.hidden = state.payment.method !== 'cash';
    }

    if (terminalTip) {
      terminalTip.hidden =
        state.payment.method !== 'direct_terminal' ||
        !state.payment.terminalTipKnown;
    }
    if (terminalTipAmount) {
      terminalTipAmount.textContent = money(
        num(state.payment.terminalTipAmount, 0)
      );
    }

    if (state.payment.method === 'direct_terminal') {
      var paymentError = $('[data-qpos-payment-error]');
      if (
        paymentError &&
        /cash received/i.test(String(paymentError.textContent || ''))
      ) {
        showPaymentError('');
      }
    }

    if (tipEl) {
      tipEl.disabled = state.payment.method === 'direct_terminal';
      if (document.activeElement !== tipEl) {
        tipEl.value =
          state.payment.tipMode === 'custom'
            ? state.payment.tipAmount
            : '';
      }
      tipEl.classList.toggle(
        'is-custom-active',
        state.payment.tipMode === 'custom'
      );
    }

    var charge = paymentCharge();
    var cashReceived = num(state.payment.cashReceived, 0);
    var change = state.payment.method === 'cash'
      ? Math.max(0, roundMoney(cashReceived - charge))
      : 0;

    if (changeBox) {
      changeBox.hidden = !(state.payment.method === 'cash' && change > 0);
    }
    if (changeEl) changeEl.textContent = money(change);

    renderCashPresets();
    renderSplitControls();

    $$('[data-tip]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        state.payment.tipMode !== 'custom' &&
        Number(button.getAttribute('data-tip')) ===
          Number(state.payment.tipPercent)
      );
    });

    renderTouchKeypad();

    /* PMD_QPOS_PAYMENT_PREVIEW_READY_V52
     * The preview already has the check total and cash received value, so the
     * operator never sees a fake disabled flash while the server summary syncs.
     * A tap during that sync is held until the authoritative response arrives. */
    var previewReady =
      !!state.payment.summary &&
      state.payment.summary.preview === true;

    var valid =
      !!state.payment.summary &&
      (state.payment.authoritative === true || previewReady) &&
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
              ? 'Send ' + money(charge)
              : 'Pay ' + money(charge)
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
    var paymentCard = $('.pmd-qpos-payment-card');

    if (paymentCard) {
      paymentCard.classList.toggle(
        'is-terminal',
        state.payment.method === 'direct_terminal'
      );
    }

    if (title) {
      title.textContent = state.activeOrderId
        ? 'Order #' + String(state.activeOrderId)
        : 'Payment';
    }

    if (summary) {
      if (remaining) remaining.textContent = money(paymentRemaining());
      if (settled) {
        settled.textContent =
          money(num(summary.settlement && summary.settlement.settled_amount, 0)) +
          ' / ' + money(num(summary.settlement && summary.settlement.order_total, 0));
      }
    }

    renderPaymentMethods();

    if (paymentCard) {
      paymentCard.classList.toggle(
        'is-terminal',
        state.payment.method === 'direct_terminal'
      );
    }

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
        state.payment.tipMode !== 'custom' &&
        Number(button.getAttribute('data-tip')) ===
          Number(state.payment.tipPercent)
      );
      button.disabled = state.payment.method === 'direct_terminal';
    });

    renderPaymentTotals();

    pushCustomerDisplay(
      'payment',
      {
        headline:
          state.payment.method === 'direct_terminal'
            ? 'Tap or insert card'
            : 'Please pay',
        message:
          state.payment.method === 'direct_terminal'
            ? 'Use the payment reader'
            : 'Please follow the cashier',
        amount_due: paymentCharge()
      }
    );
  }

  function finishPaidOrderUi() {
    var paidId = Number(state.activeOrderId || 0);

    if (paidId > 0) {
      state.openOrders = state.openOrders.filter(function (row) {
        return orderId(row) !== paidId;
      });
    }

    state.activeOrderId = null;
    state.forceNewCheck = state.serviceMode === 'dine_in';

    if (state.serviceMode !== 'dine_in') {
      state.offPremiseOrder = null;
    }

    state.cart = [];
    state.pendingSend = null;
    state.note = '';
    state.guestCount = 1;

    renderAll();
  }

  async function executePayment() {
    if (!state.payment.summary || state.payment.submitting) return;

    /* PMD_QPOS_PAYMENT_EARLY_TAP_V52
     * If the cashier taps immediately after opening Payment, keep that action:
     * wait for the already-running authoritative summary, then continue once. */
    if (state.payment.authoritative !== true) {
      state.payment.submitting = true;
      showPaymentError('');
      renderPaymentTotals();

      var summaryReady = await loadPaymentSummary(false);

      state.payment.submitting = false;

      if (
        !summaryReady ||
        !state.payment.open ||
        state.payment.authoritative !== true
      ) {
        renderPaymentTotals();
        return;
      }
    }

    if (state.payment.method === 'direct_terminal') {
      return executeTerminalPayment();
    }

    state.payment.submitting = true;
    showPaymentError('');
    renderPaymentTotals();

    var summary = state.payment.summary;
    var remaining = paymentRemaining();
    var amount = paymentAmount();
    var splitModeBefore = state.payment.splitMode;
    var splitPartsBefore = Math.max(
      1,
      Number(state.payment.splitParts || 1)
    );
    var selectedItemsBefore =
      splitModeBefore === 'items'
        ? paymentSelectedItemsPayload()
        : [];

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
          split_mode: String(state.payment.splitMode || 'full'),
          amount: amount,
          selected_items:
            state.payment.splitMode === 'items'
              ? paymentSelectedItemsPayload()
              : null,
          share_percent:
            state.payment.splitMode === 'shares'
              ? num(state.payment.splitPercent, 0)
              : null,
          tip_amount: paymentTip(),
          coupon_code: null,
          payer_label:
            state.payment.splitMode === 'equal' && state.payment.splitParts > 1
              ? ('Equal split 1/' + state.payment.splitParts)
              : (
                  state.payment.splitMode === 'items'
                    ? 'Selected items'
                    : (
                        state.payment.splitMode === 'shares'
                          ? ('Share ' + Number(num(state.payment.splitPercent, 0).toFixed(2)) + '%')
                          : ''
                      )
                ),
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

      /* PMD_QPOS_SPLIT_ITEMS_OPTIMISTIC_V16
       * Fast-settle intentionally reuses the pre-payment summary. Keep item
       * balances correct locally so the next payer never sees just-paid items
       * as unpaid while the background table refresh catches up. */
      if (
        splitModeBefore === 'items' &&
        selectedItemsBefore.length &&
        state.payment.summary &&
        Array.isArray(state.payment.summary.items)
      ) {
        var itemGrossRatio = Math.max(
          0.000001,
          num(
            state.payment.summary.settlement &&
            state.payment.summary.settlement.gross_ratio,
            1
          )
        );

        state.payment.summary.items = state.payment.summary.items.map(
          function (item) {
            var paid = selectedItemsBefore.find(function (row) {
              return Number(row.order_menu_id || 0) ===
                Number(item.order_menu_id || 0);
            });
            if (!paid) return item;

            var quantityPaidNow = Math.max(0, num(paid.quantity, 0));
            var totalQuantity = Math.max(0, num(item.quantity, 0));
            var oldPaid = Math.max(0, num(item.paid_quantity, 0));
            var oldUnpaid = Math.max(0, num(item.unpaid_quantity, 0));
            var nextUnpaid = Math.max(0, oldUnpaid - quantityPaidNow);
            var nextPaid = Math.min(
              totalQuantity,
              oldPaid + quantityPaidNow
            );
            var unitPrice = Math.max(0, num(item.unit_price, 0));

            return Object.assign({}, item, {
              paid_quantity: roundMoney(nextPaid),
              unpaid_quantity: roundMoney(nextUnpaid),
              unpaid_subtotal: roundMoney(unitPrice * nextUnpaid),
              unpaid_gross: roundMoney(
                unitPrice * nextUnpaid * itemGrossRatio
              )
            });
          }
        );
      }

      state.payment.receiptUrl = String(json.receipt_url || '');
      state.payment.invoiceUrl = String(json.invoice_url || '');
      state.payment.idempotencyKey = uid('pay');
      state.payment.reference = '';
      state.payment.externalConfirmed = false;
      state.payment.amount = roundMoney(
        num(
          state.payment.summary.settlement &&
          state.payment.summary.settlement.remaining_amount,
          0
        )
      ).toFixed(2);
      state.payment.tipMode = 'percent';
      state.payment.tipPercent = 0;
      state.payment.tipAmount = '';

      if (
        splitModeBefore === 'equal' &&
        splitPartsBefore > 1 &&
        paymentRemaining() > 0.005
      ) {
        var nextParts = splitPartsBefore - 1;
        state.payment.splitParts = nextParts;
        state.payment.splitMode = nextParts > 1 ? 'equal' : 'full';
      } else if (
        splitModeBefore === 'items' &&
        paymentRemaining() > 0.005
      ) {
        state.payment.splitMode = 'items';
        state.payment.selectedItems = {};
      } else if (
        splitModeBefore === 'shares' &&
        paymentRemaining() > 0.005
      ) {
        state.payment.splitMode = 'shares';
      } else {
        state.payment.splitMode = 'full';
        state.payment.splitParts = 1;
      }
      syncSplitAmount();

      state.payment.cashReceived =
        state.payment.method === 'cash'
          ? paymentCharge().toFixed(2)
          : '';
      state.payment.touchKeypadTarget =
        state.payment.method === 'cash'
          ? 'cash'
          : 'amount';
      state.payment.touchKeypadFresh = true;

      var locallyPaidOrder = activeOrder();
      if (locallyPaidOrder && state.payment.summary && state.payment.summary.settlement) {
        locallyPaidOrder.settled_amount = num(
          state.payment.summary.settlement.settled_amount,
          locallyPaidOrder.settled_amount || 0
        );
        locallyPaidOrder.settlement_status = String(
          state.payment.summary.settlement.status ||
          json.settlement_status ||
          locallyPaidOrder.settlement_status ||
          ''
        );
        locallyPaidOrder.structural_locked =
          locallyPaidOrder.settled_amount > 0.0001;
      }

      toast(json.message || 'Payment recorded');

      var remainingAfterPayment = num(
        state.payment.summary &&
        state.payment.summary.settlement &&
        state.payment.summary.settlement.remaining_amount,
        0
      );
      var settledAfterPayment = num(
        state.payment.summary &&
        state.payment.summary.settlement &&
        state.payment.summary.settlement.settled_amount,
        0
      );

      var settlementPaid =
        String(json.settlement_status || '').toLowerCase() === 'paid' ||
        remainingAfterPayment <= 0.005;

      setSelectedTablePaymentSignal(
        settlementPaid
          ? 'paid'
          : (settledAfterPayment > 0.005 ? 'partial' : 'due'),
        remainingAfterPayment
      );

      var paidTableId =
        state.serviceMode === 'dine_in' && state.selectedTable
          ? Number(state.selectedTable.id)
          : 0;

      if (settlementPaid) {
        pushCustomerDisplaySuccess(
          num(
            state.payment.summary &&
            state.payment.summary.settlement &&
            state.payment.summary.settlement.order_total,
            paymentCharge()
          ),
          'Thank you!'
        );

        if (state.serviceMode !== 'dine_in') {
          state.offPremiseOrder = Object.assign({}, state.offPremiseOrder || {}, {
            settlement_status: 'paid'
          });
        }

        closePayment();
        finishPaidOrderUi();

        if (paidTableId) {
          setTimeout(function () {
            loadTable(paidTableId, true);
          }, 0);
        }

        toast('Paid');
      } else {
        if (paidTableId) {
          setTimeout(function () {
            loadTable(paidTableId, true);
          }, 0);
        }
        renderAll();
        renderPayment();
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

  /* PMD_QPOS_TERMINAL_TIP_RUNTIME_V46
   * Terminal tip is provider-owned. POS never edits it; it only displays the
   * amount reported by the terminal integration. */
  function applyTerminalTipV46(payload) {
    if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'tip_amount')) {
      return;
    }

    if (payload.tip_amount === null || payload.tip_amount === '') {
      return;
    }

    var tip = Number(payload.tip_amount);
    if (!Number.isFinite(tip) || tip < 0) return;

    state.payment.terminalTipAmount = roundMoney(tip);
    state.payment.terminalTipKnown = true;
    renderPaymentTotals();
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

      applyTerminalTipV46(json);
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

      applyTerminalTipV46(result);

      var status = String(result.status || '').toLowerCase();

      if (status === 'paid') {
        await loadPaymentSummary(true);
        pushCustomerDisplaySuccess(
          num(
            state.payment.summary &&
            state.payment.summary.settlement &&
            state.payment.summary.settlement.order_total,
            paymentCharge()
          ),
          'Thank you!'
        );
        setSelectedTablePaymentSignal('paid', 0);
        var terminalPaidTableId =
          state.serviceMode === 'dine_in' && state.selectedTable
            ? Number(state.selectedTable.id)
            : 0;

        var terminalTipPaid = state.payment.terminalTipKnown
          ? num(state.payment.terminalTipAmount, 0)
          : null;

        closePayment();
        finishPaidOrderUi();
        toast(
          terminalTipPaid !== null && terminalTipPaid > 0.0001
            ? 'Paid · Tip ' + money(terminalTipPaid)
            : 'Paid'
        );

        if (terminalPaidTableId) {
          setTimeout(function () {
            loadTable(terminalPaidTableId, true);
          }, 0);
        }

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

  /* PMD_QPOS_HISTORY_BROWSER_V15 */
  function historySelection() {
    if (state.serviceMode === 'takeaway') {
      return {scope: 'pickup', tableId: 0};
    }

    if (state.selectedTable) {
      return {
        scope: 'table',
        tableId: Number(state.selectedTable.id || 0)
      };
    }

    return {scope: 'all', tableId: 0};
  }

  function closeHistory() {
    var modal = $('[data-qpos-history-modal]');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    root.classList.remove('is-history-workspace');
  }

  function formatHistoryTime(value) {
    var date = new Date(String(value || ''));
    if (!Number.isFinite(date.getTime())) {
      return String(value || '');
    }

    try {
      return new Intl.DateTimeFormat([], {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (ignored) {
      return date.toLocaleString();
    }
  }

  function historyKindMatches(entry, kind) {
    kind = String(kind || 'orders');
    var entryKind = String(entry && entry.kind || 'event');

    if (kind === 'all') return true;
    if (kind === 'orders') return entryKind === 'order';
    if (kind === 'payments') {
      return ['payment', 'terminal'].indexOf(entryKind) !== -1;
    }
    if (kind === 'notes') {
      return ['note', 'item_note', 'table_note'].indexOf(entryKind) !== -1;
    }
    if (kind === 'calls') {
      return ['waiter_call', 'table_status', 'status'].indexOf(entryKind) !== -1;
    }
    return true;
  }

  function historyEntries(json) {
    return Array.isArray(json && json.entries) ? json.entries : [];
  }

  function historyOrderEntries(json) {
    var seen = {};
    return historyEntries(json).filter(function (entry) {
      if (String(entry.kind || '') !== 'order') return false;
      var id = Number(entry.order_id || 0);
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function historyEntryCount(json, kinds) {
    return historyEntries(json).filter(function (entry) {
      return kinds.indexOf(String(entry.kind || '')) !== -1;
    }).length;
  }

  function renderHistoryStats(json) {
    var stats = $('[data-qpos-history-stats]');
    if (!stats) return;

    var orders = historyOrderEntries(json).length;
    var payments = historyEntryCount(json, ['payment', 'terminal']);
    var notes = historyEntryCount(json, ['note', 'item_note', 'table_note']);
    var calls = historyEntryCount(json, ['waiter_call']);

    stats.innerHTML =
      '<span><b>' + esc(orders) + '</b> orders</span>' +
      '<span><b>' + esc(payments) + '</b> payments</span>' +
      '<span><b>' + esc(notes) + '</b> notes</span>' +
      (calls ? '<span class="is-attention"><b>' + esc(calls) + '</b> calls</span>' : '');
  }

  /* PMD_QPOS_HISTORY_CLARITY_V20
   * History is for scanning, not reading database rows. Keep the order list
   * short, group the detail panel by purpose, and hide redundant technical
   * wording while preserving the full raw history behind the filters. */
  function historyWords(value) {
    value = String(value || '').replace(/[_-]+/g, ' ').trim();
    if (!value) return '';
    return value.replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function historySettlementLabel(value) {
    value = String(value || '').trim().toLowerCase();
    if (value === 'paid' || value === 'settled' || value === 'closed') {
      return 'Paid';
    }
    if (value === 'partial' || value === 'partially_paid') {
      return 'Part paid';
    }
    if (value === 'unpaid' || value === 'pending' || value === 'open') {
      return 'Unpaid';
    }
    return value ? historyWords(value) : '';
  }

  function historySettlementTone(value) {
    value = String(value || '').trim().toLowerCase();
    if (value === 'paid' || value === 'settled' || value === 'closed') {
      return 'paid';
    }
    if (value === 'partial' || value === 'partially_paid') {
      return 'partial';
    }
    if (value === 'unpaid' || value === 'pending' || value === 'open') {
      return 'unpaid';
    }
    return 'neutral';
  }

  function historyShortTime(value) {
    var date = new Date(String(value || ''));
    if (!Number.isFinite(date.getTime())) {
      return String(value || '');
    }

    try {
      return new Intl.DateTimeFormat([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (ignored) {
      return date.toLocaleString();
    }
  }

  function historyCompactEvent(entry) {
    entry = entry || {};
    var kind = String(entry.kind || 'event');
    var detailParts = String(entry.detail || '')
      .split(' · ')
      .map(function (part) { return part.trim(); })
      .filter(Boolean);

    var item = {
      kind: kind,
      title: 'Activity',
      value: '',
      note: '',
      meta: [],
      time: entry.time,
      receiptUrl: String(entry.receipt_url || ''),
      count: 1
    };

    if (kind === 'payment') {
      var method = historyWords(entry.payment_method || detailParts[0] || 'Payment');
      item.title = method ? method + ' payment' : 'Payment';
      item.value = entry.amount != null
        ? money(entry.amount)
        : (detailParts[1] || '');

      var received = entry.cash_received;
      var change = num(entry.change_due, 0);
      var tip = num(entry.tip_amount, 0);
      var amount = num(entry.amount, 0);

      if (
        received != null &&
        Math.abs(num(received, 0) - amount) > 0.005
      ) {
        item.meta.push('Received ' + money(received));
      }
      if (change > 0.005) {
        item.meta.push('Change ' + money(change));
      }
      if (tip > 0.005) {
        item.meta.push('Tip ' + money(tip));
      }
      if (entry.payer_label) {
        item.meta.push(String(entry.payer_label));
      }
      if (entry.payment_note) {
        item.note = String(entry.payment_note);
      }
      return item;
    }

    if (kind === 'terminal') {
      item.title = detailParts[0] || 'Terminal';
      item.value = detailParts[1] || '';
      if (detailParts[2]) item.meta.push(detailParts[2]);
      if (detailParts.length > 3) {
        item.note = detailParts.slice(3).join(' · ');
      }
      return item;
    }

    if (kind === 'status') {
      item.title = String(
        entry.status_name ||
        detailParts[0] ||
        'Order status'
      );
      return item;
    }

    if (kind === 'table_status') {
      var oldStatus = historyWords(entry.old_status || '');
      var newStatus = historyWords(entry.new_status || '');
      item.title = entry.table_id
        ? 'Table ' + String(entry.table_id)
        : 'Table status';
      item.value = oldStatus && newStatus
        ? oldStatus + ' → ' + newStatus
        : (detailParts[0] || '');
      return item;
    }

    if (kind === 'waiter_call') {
      item.title = 'Waiter call';
      item.note = String(entry.detail || '');
      return item;
    }

    if (kind === 'item_note') {
      item.title = String(entry.title || 'Item note')
        .replace(/^Item note\s*·\s*/i, '');
      item.note = String(entry.detail || '');
      return item;
    }

    if (kind === 'note') {
      item.title = 'Order note';
      item.note = String(entry.detail || '');
      return item;
    }

    if (kind === 'table_note') {
      item.title = 'Table note';
      item.note = String(entry.detail || '');
      return item;
    }

    item.title = String(entry.title || 'Activity')
      .replace(/\s*·\s*Order\s*#\d+/i, '');
    item.note = String(entry.detail || '');
    return item;
  }

  function historyGroupedEvents(entries) {
    var rows = [];

    entries.forEach(function (entry) {
      var compact = historyCompactEvent(entry);
      var groupable =
        compact.kind === 'status' ||
        compact.kind === 'table_status';

      if (groupable) {
        var key = [
          compact.kind,
          compact.title,
          compact.value,
          compact.note
        ].join('|').toLowerCase();

        var existing = rows.find(function (row) {
          return row._groupKey === key;
        });

        if (existing) {
          existing.count += 1;
          return;
        }

        compact._groupKey = key;
      }

      rows.push(compact);
    });

    return rows;
  }

  function historyEventRow(item) {
    var meta = (item.meta || []).map(function (value) {
      return '<span>' + esc(value) + '</span>';
    }).join('');

    var receipt = item.receiptUrl
      ? '<a href="' + esc(item.receiptUrl) +
          '" target="_blank" rel="noopener">Receipt</a>'
      : '';

    return (
      '<article class="pmd-qpos-history-simple-event" data-kind="' +
        esc(item.kind || 'event') + '">' +
        '<div class="pmd-qpos-history-simple-main">' +
          '<div>' +
            '<strong>' + esc(item.title || 'Activity') + '</strong>' +
            (item.value
              ? '<b>' + esc(item.value) + '</b>'
              : '') +
          '</div>' +
          '<time>' + esc(historyShortTime(item.time)) + '</time>' +
        '</div>' +
        ((item.meta && item.meta.length) || item.count > 1 || receipt
          ? '<div class="pmd-qpos-history-simple-meta">' +
              meta +
              (item.count > 1
                ? '<span>' + esc(item.count) + ' events</span>'
                : '') +
              receipt +
            '</div>'
          : '') +
        (item.note
          ? '<p>' + esc(item.note) + '</p>'
          : '') +
      '</article>'
    );
  }

  function historySection(title, items) {
    if (!items.length) return '';

    return (
      '<section class="pmd-qpos-history-section">' +
        '<header>' +
          '<strong>' + esc(title) + '</strong>' +
          '<span>' + esc(items.length) + '</span>' +
        '</header>' +
        items.map(historyEventRow).join('') +
      '</section>'
    );
  }

  function renderHistoryDetail(orderId) {
    var detail = $('[data-qpos-history-detail]');
    if (!detail) return;

    orderId = Number(orderId || 0);
    state.historySelectedOrderId = orderId || null;

    if (!orderId || !state.historyData) {
      detail.innerHTML =
        '<div class="pmd-qpos-history-empty">' +
          'Select an order to see its payments and activity.' +
        '</div>';
      return;
    }

    var entries = historyEntries(state.historyData).filter(function (entry) {
      return Number(entry.order_id || 0) === orderId;
    });

    var order = entries.find(function (entry) {
      return String(entry.kind || '') === 'order';
    });

    if (!order) {
      detail.innerHTML =
        '<div class="pmd-qpos-history-empty">Order details are not available.</div>';
      return;
    }

    var invoiceUrl = String(
      order.invoice_url || ('/admin/orders/invoice/' + encodeURIComponent(orderId))
    );
    var settlement = String(order.settlement_status || '').trim();
    var settlementLabel = historySettlementLabel(settlement);
    var settlementTone = historySettlementTone(settlement);
    var total = order.total != null ? money(order.total) : '';
    var itemSummary = String(order.item_summary || '').trim();
    var orderNote = String(order.note || '').trim();

    var rawEvents = entries.filter(function (entry) {
      return String(entry.kind || '') !== 'order';
    });

    var paymentEvents = historyGroupedEvents(
      rawEvents.filter(function (entry) {
        return ['payment', 'terminal'].indexOf(String(entry.kind || '')) !== -1;
      })
    );

    var noteEvents = historyGroupedEvents(
      rawEvents.filter(function (entry) {
        return ['note', 'item_note', 'table_note', 'waiter_call']
          .indexOf(String(entry.kind || '')) !== -1;
      })
    );

    var activityEvents = historyGroupedEvents(
      rawEvents.filter(function (entry) {
        return ['status', 'table_status']
          .indexOf(String(entry.kind || '')) !== -1;
      })
    );

    detail.innerHTML =
      '<div class="pmd-qpos-history-order-head pmd-qpos-history-order-head-v20">' +
        '<div class="pmd-qpos-history-order-identity">' +
          '<span>Order</span>' +
          '<h3>#' + esc(orderId) + '</h3>' +
        '</div>' +
        '<div class="pmd-qpos-history-order-facts">' +
          (total
            ? '<strong>' + esc(total) + '</strong>'
            : '') +
          (settlementLabel
            ? '<span class="is-' + esc(settlementTone) + '">' +
                esc(settlementLabel) +
              '</span>'
            : '') +
          '<time>' + esc(historyShortTime(order.time)) + '</time>' +
        '</div>' +
        '<a class="pmd-qpos-history-invoice" href="' + esc(invoiceUrl) +
          '" target="_blank" rel="noopener">Open invoice</a>' +
      '</div>' +
      ((itemSummary || orderNote)
        ? '<div class="pmd-qpos-history-order-overview">' +
            (itemSummary
              ? '<div><span>Items</span><p>' + esc(itemSummary) + '</p></div>'
              : '') +
            (orderNote
              ? '<div><span>Note</span><p>' + esc(orderNote) + '</p></div>'
              : '') +
          '</div>'
        : '') +
      '<div class="pmd-qpos-history-sections">' +
        historySection('Payments', paymentEvents) +
        historySection('Notes & calls', noteEvents) +
        historySection('Activity', activityEvents) +
        (
          !paymentEvents.length &&
          !noteEvents.length &&
          !activityEvents.length
            ? '<div class="pmd-qpos-history-empty">No linked activity.</div>'
            : ''
        ) +
      '</div>';
  }

  function historyListCompact(entry) {
    var kind = String(entry.kind || 'event');
    var orderId = Number(entry.order_id || 0);
    var title = String(entry.title || 'Activity');
    var line = '';
    var badge = '';
    var badgeTone = 'neutral';

    if (kind === 'order') {
      title = '#' + String(orderId || '');
      line = entry.total != null ? money(entry.total) : '';
      badge = historySettlementLabel(entry.settlement_status || '');
      badgeTone = historySettlementTone(entry.settlement_status || '');
      if (Number(entry.item_count || 0) > 0) {
        line +=
          (line ? ' · ' : '') +
          String(Number(entry.item_count || 0)) +
          (Number(entry.item_count || 0) === 1 ? ' item' : ' items');
      }
    } else {
      var compact = historyCompactEvent(entry);
      title = compact.title;
      line = compact.value || compact.note || '';
      if (orderId) {
        badge = '#' + String(orderId);
      }
    }

    return {
      title: title,
      line: line,
      badge: badge,
      badgeTone: badgeTone,
      time: entry.time
    };
  }

  function renderHistory(json) {
    var list = $('[data-qpos-history-list]');
    var title = $('[data-qpos-history-title]');
    if (!list) return;

    state.historyData = json || {};
    renderHistoryStats(json);

    if (title) {
      title.textContent = String(
        json && json.scope_label
          ? json.scope_label
          : 'History'
      );
    }

    var kind = String(state.historyKind || 'orders');
    var entries = historyEntries(json);

    if (kind === 'orders') {
      entries = historyOrderEntries(json);
    } else {
      entries = entries.filter(function (entry) {
        return historyKindMatches(entry, kind);
      });
    }

    if (!entries.length) {
      list.innerHTML =
        '<div class="pmd-qpos-history-empty">No matching history.</div>';
      renderHistoryDetail(0);
      return;
    }

    list.innerHTML = entries.map(function (entry) {
      var orderId = Number(entry.order_id || 0);
      var selected =
        orderId &&
        Number(state.historySelectedOrderId || 0) === orderId;
      var row = historyListCompact(entry);

      return (
        '<button type="button" class="pmd-qpos-history-entry pmd-qpos-history-entry-v20' +
          (selected ? ' is-selected' : '') + '"' +
          ' data-kind="' + esc(entry.kind || 'event') + '"' +
          (orderId ? ' data-qpos-history-order="' + esc(orderId) + '"' : '') + '>' +
          '<div class="pmd-qpos-history-entry-top">' +
            '<strong>' + esc(row.title) + '</strong>' +
            '<time>' + esc(historyShortTime(row.time)) + '</time>' +
          '</div>' +
          '<div class="pmd-qpos-history-entry-bottom">' +
            (row.line
              ? '<span>' + esc(row.line) + '</span>'
              : '<span class="is-muted">Activity</span>') +
            (row.badge
              ? '<b class="is-' + esc(row.badgeTone) + '">' +
                  esc(row.badge) +
                '</b>'
              : '') +
          '</div>' +
        '</button>'
      );
    }).join('');

    $$('[data-qpos-history-order]', list).forEach(function (button) {
      button.onclick = function () {
        var orderId = Number(button.getAttribute('data-qpos-history-order') || 0);
        state.historySelectedOrderId = orderId || null;
        renderHistory(state.historyData);
        renderHistoryDetail(orderId);
      };
    });

    if (
      state.historySelectedOrderId &&
      entries.some(function (entry) {
        return Number(entry.order_id || 0) === Number(state.historySelectedOrderId);
      })
    ) {
      renderHistoryDetail(state.historySelectedOrderId);
    } else if (kind === 'orders' && entries[0] && entries[0].order_id) {
      state.historySelectedOrderId = Number(entries[0].order_id);
      renderHistoryDetail(state.historySelectedOrderId);
      var first = $('[data-qpos-history-order="' +
        String(state.historySelectedOrderId) + '"]', list);
      if (first) first.classList.add('is-selected');
    } else {
      renderHistoryDetail(0);
    }
  }

  function historyIsoDate(date) {
    var y = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var m = (month < 10 ? '0' : '') + String(month);
    var d = (day < 10 ? '0' : '') + String(day);
    return y + '-' + m + '-' + d;
  }

  function setHistoryPreset(preset, reload) {
    preset = String(preset || '7d');
    state.historyPreset = preset;

    var now = new Date();
    var from = '';
    var to = historyIsoDate(now);

    if (preset === 'today') {
      from = to;
    } else if (preset === '7d') {
      var d7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      from = historyIsoDate(d7);
    } else if (preset === '30d') {
      var d30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      from = historyIsoDate(d30);
    } else {
      from = '';
      to = '';
    }

    state.historyFrom = from;
    state.historyTo = to;

    var fromInput = $('[data-qpos-history-from]');
    var toInput = $('[data-qpos-history-to]');
    if (fromInput) fromInput.value = from;
    if (toInput) toInput.value = to;

    $$('[data-qpos-history-preset]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        String(button.getAttribute('data-qpos-history-preset')) === preset
      );
    });

    if (reload) loadHistory();
  }

  /* PMD_QPOS_HISTORY_NO_BLINK_V17 */
  function historyRequestContext(scopeMode) {
    var selection = historySelection();
    var requested = String(scopeMode || state.historyScope || 'selected');

    if (requested === 'all') {
      selection = {scope: 'all', tableId: 0};
    }

    return {
      requested: requested,
      selection: selection,
      key: [
        requested,
        selection.scope,
        Number(selection.tableId || 0),
        state.historyFrom || '',
        state.historyTo || ''
      ].join('|')
    };
  }

  async function loadHistory(scopeMode, options) {
    if (!state.settings.history_url) return false;

    options = options || {};
    var context = historyRequestContext(scopeMode);
    var selection = context.selection;
    var requested = context.requested;
    var requestKey = context.key;
    var requestSeq = ++state.historyRequestSeq;

    state.historyScope = requested;
    state.historyLoading = true;

    var list = $('[data-qpos-history-list]');
    var preserveExisting =
      options.preserve === true ||
      (
        options.preserve !== false &&
        !!state.historyData
      );

    if (list && !preserveExisting) {
      list.innerHTML =
        '<div class="pmd-qpos-history-empty">Loading history…</div>';
    }

    $$('[data-qpos-history-scope]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        String(button.getAttribute('data-qpos-history-scope')) === requested
      );
    });

    try {
      var url = String(state.settings.history_url);
      var params = new URLSearchParams();
      params.set('scope', selection.scope);
      params.set('limit', '500');
      if (selection.tableId) {
        params.set('table_id', String(selection.tableId));
      }
      if (state.historyFrom) params.set('from', state.historyFrom);
      if (state.historyTo) params.set('to', state.historyTo);

      var json = await fetchJson(
        url + '?' + params.toString() + '&_=' + Date.now()
      );

      if (requestSeq !== state.historyRequestSeq) {
        return false;
      }

      state.historyDataKey = requestKey;
      renderHistory(json);
      return true;
    } catch (error) {
      if (requestSeq !== state.historyRequestSeq) {
        return false;
      }

      if (list && !preserveExisting) {
        list.innerHTML =
          '<div class="pmd-qpos-history-empty is-error">' +
            esc(error.message || 'History could not be loaded.') +
          '</div>';
        renderHistoryDetail(0);
      } else {
        toast(error.message || 'History could not be refreshed.', true);
      }
      return false;
    } finally {
      if (requestSeq === state.historyRequestSeq) {
        state.historyLoading = false;
      }
    }
  }

  async function openHistory(scopeMode) {
    closePayment();
    closeTextKeyboard();
    hideToast();

    var modal = $('[data-qpos-history-modal]');
    if (!modal) return;

    if (!state.historyFrom && !state.historyTo) {
      setHistoryPreset(state.historyPreset || '7d', false);
    }

    var requested = String(scopeMode || 'selected');
    var context = historyRequestContext(requested);
    var hasCurrentData =
      !!state.historyData &&
      state.historyDataKey === context.key;

    if (!hasCurrentData) {
      await loadHistory(requested, {preserve: false});
    }

    root.classList.add('is-history-workspace');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    if (hasCurrentData) {
      loadHistory(requested, {preserve: true});
    }
  }

  /* PMD_QPOS_TEXT_KEYBOARD_V1
   * Cashier-only desktop/touch-monitor keyboard. Waiter/mobile/tablet keeps
   * the operating system keyboard.
   */
  function useTextKeyboard() {
    return state.mode === 'cashier' && window.innerWidth >= 900;
  }

  function textKeyboardTargets() {
    return $$(
      '[data-qpos-search], ' +
      '[data-qpos-note], ' +
      '[data-qpos-modifier-note], ' +
      '[data-qpos-item-note-input]'
    );
  }

  function configureTextKeyboardTargets() {
    var enabled = useTextKeyboard();

    textKeyboardTargets().forEach(function (field) {
      if (enabled) {
        field.setAttribute('inputmode', 'none');
        field.setAttribute('data-qpos-text-keyboard-field', '1');
      } else {
        field.removeAttribute('inputmode');
        field.removeAttribute('data-qpos-text-keyboard-field');
      }
    });

    if (!enabled) {
      closeTextKeyboard();
    }
  }

  function maybeOpenTextKeyboard(target, label) {
    if (!target || !useTextKeyboard()) return;

    state.textKeyboardTarget = target;
    var keyboard = $('[data-qpos-text-keyboard]');
    var title = $('[data-qpos-text-keyboard-label]');
    if (!keyboard) return;

    if (title) {
      title.textContent = String(label || 'Keyboard');
    }

    keyboard.hidden = false;
    keyboard.setAttribute('aria-hidden', 'false');
  }

  function closeTextKeyboard() {
    var keyboard = $('[data-qpos-text-keyboard]');
    if (keyboard) {
      keyboard.hidden = true;
      keyboard.setAttribute('aria-hidden', 'true');
    }
    state.textKeyboardTarget = null;
  }

  function insertTextKeyboardValue(target, value) {
    if (!target) return;

    var current = String(target.value || '');
    var start = Number.isFinite(target.selectionStart)
      ? target.selectionStart
      : current.length;
    var end = Number.isFinite(target.selectionEnd)
      ? target.selectionEnd
      : start;

    target.value =
      current.slice(0, start) +
      value +
      current.slice(end);

    var next = start + value.length;
    try {
      target.setSelectionRange(next, next);
    } catch (ignored) {
    }

    target.dispatchEvent(new Event('input', {bubbles: true}));
  }

  function applyTextKeyboardKey(key) {
    var target = state.textKeyboardTarget;
    if (!target || !document.documentElement.contains(target)) {
      closeTextKeyboard();
      return;
    }

    key = String(key || '');

    if (key === 'hide') {
      closeTextKeyboard();
      try { target.blur(); } catch (ignored) {}
      return;
    }

    if (key === 'shift') {
      state.textKeyboardUpper = !state.textKeyboardUpper;
      var keyboard = $('[data-qpos-text-keyboard]');
      if (keyboard) {
        keyboard.classList.toggle(
          'is-lowercase',
          !state.textKeyboardUpper
        );
      }
      return;
    }

    if (key === 'clear') {
      target.value = '';
      target.dispatchEvent(new Event('input', {bubbles: true}));
      target.focus();
      return;
    }

    if (key === 'backspace') {
      var current = String(target.value || '');
      var start = Number.isFinite(target.selectionStart)
        ? target.selectionStart
        : current.length;
      var end = Number.isFinite(target.selectionEnd)
        ? target.selectionEnd
        : start;

      if (start !== end) {
        target.value = current.slice(0, start) + current.slice(end);
      } else if (start > 0) {
        target.value =
          current.slice(0, start - 1) +
          current.slice(end);
        start -= 1;
      }

      try {
        target.setSelectionRange(start, start);
      } catch (ignored) {
      }
      target.dispatchEvent(new Event('input', {bubbles: true}));
      target.focus();
      return;
    }

    if (key === 'space') {
      insertTextKeyboardValue(target, ' ');
      target.focus();
      return;
    }

    var output = key;
    if (/^[A-Z]$/.test(key) && !state.textKeyboardUpper) {
      output = key.toLowerCase();
    }

    insertTextKeyboardValue(target, output);
    target.focus();
  }

  function bindTextKeyboardField(field, label) {
    if (!field || field.__qposKeyboardBound) return;
    field.__qposKeyboardBound = true;

    var open = function () {
      maybeOpenTextKeyboard(field, label);
    };

    field.addEventListener('focus', open);
    field.addEventListener('click', open);
  }

  /* Table lifecycle */
  async function updateTableStatus(status, skipCleaning) {
    if (!state.selectedTable || !state.settings.table_state_url) return;

    /* PMD_QPOS_CLEANING_STATUS_NOOP_V40
     * Defensive guard: a cleaning table cannot be marked Left/cleaning again. */
    if (
      String(status || '').toLowerCase() === 'cleaning' &&
      String(state.selectedTable.status || '').toLowerCase() === 'cleaning'
    ) {
      renderContext();
      return;
    }

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

      /* PMD_QPOS_TABLE_CACHE_INVALIDATE_V41 */
      tableCacheDrop(state.selectedTable.id);
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
    renderFloorMap();
  }

  /* Binding */
  function bind() {
    var search = $('[data-qpos-search]');
    if (search) {
      search.addEventListener('input', function () {
        state.search = search.value;
        renderProducts();
      });
      bindTextKeyboardField(search, 'Search');
    }

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
    if (note) {
      note.addEventListener('input', function () {
        state.note = note.value;
      });
      bindTextKeyboardField(note, 'Order note');
    }

    var send = $('[data-qpos-send]');
    var pay = $('[data-qpos-pay]');
    if (send) send.onclick = function () { submitOrder('send'); };
    if (pay) pay.onclick = function () {
      if (state.cart.length > 0) {
        submitOrder('send', 'pay');
        return;
      }
      openPayment();
    };

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
    if (modifierNote) {
      modifierNote.addEventListener('input', function () {
        if (state.modifier) state.modifier.note = modifierNote.value;
      });
      bindTextKeyboardField(modifierNote, 'Item note');
    }

    var itemNoteModal = $('[data-qpos-item-note-modal]');
    var itemNoteClose = $('[data-qpos-item-note-close]');
    var itemNoteSave = $('[data-qpos-item-note-save]');
    var itemNoteClear = $('[data-qpos-item-note-clear]');
    var itemNoteInput = $('[data-qpos-item-note-input]');

    if (itemNoteClose) itemNoteClose.onclick = closeItemNote;
    if (itemNoteSave) itemNoteSave.onclick = function () {
      saveItemNote(false);
    };
    if (itemNoteClear) itemNoteClear.onclick = function () {
      saveItemNote(true);
    };
    if (itemNoteModal) itemNoteModal.addEventListener('click', function (event) {
      if (event.target === itemNoteModal) closeItemNote();
    });
    if (itemNoteInput) {
      bindTextKeyboardField(itemNoteInput, 'Item note');
    }

    var paymentModal = $('[data-qpos-payment-modal]');
    var paymentClose = $('[data-qpos-payment-close]');
    if (paymentClose) paymentClose.onclick = closePayment;
    if (paymentModal) paymentModal.addEventListener('click', function (event) {
      if (event.target === paymentModal) closePayment();
    });

    var amount = $('[data-qpos-payment-amount]');
    if (amount) {
      amount.addEventListener('input', function () {
        clearPaymentErrorOnEdit();
        state.payment.amount = normalizeTouchKeypadValue(amount.value);
        state.payment.splitMode = 'shares';
        state.payment.splitPercent = paymentRemaining() > 0
          ? Math.max(
              0,
              Math.min(
                100,
                num(state.payment.amount, 0) / paymentRemaining() * 100
              )
            )
          : 0;
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
        clearPaymentErrorOnEdit();
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

    var tipAmount = $('[data-qpos-tip-amount]');
    if (tipAmount) {
      tipAmount.addEventListener('input', function () {
        clearPaymentErrorOnEdit();
        state.payment.tipMode = 'custom';
        state.payment.tipPercent = 0;
        state.payment.tipAmount = normalizeTouchKeypadValue(tipAmount.value);
        if (tipAmount.value !== state.payment.tipAmount) {
          tipAmount.value = state.payment.tipAmount;
        }
        if (state.payment.method === 'cash') {
          state.payment.cashReceived = paymentCharge().toFixed(2);
        }
        renderPayment();
      });

      var openCustomTip = function () {
        if (state.payment.method !== 'cash') return;

        if (state.payment.tipMode !== 'custom') {
          state.payment.tipAmount = paymentTip().toFixed(2);
        }
        state.payment.tipMode = 'custom';
        state.payment.tipPercent = 0;
        openTouchKeypad('tip');
        renderPayment();
      };

      tipAmount.addEventListener('focus', openCustomTip);
      tipAmount.addEventListener('click', openCustomTip);
    }

    $$('[data-qpos-split-mode]').forEach(function (button) {
      button.onclick = function () {
        applySplitMode(button.getAttribute('data-qpos-split-mode'));
      };
    });

    var splitPeopleMinus = $('[data-qpos-split-people-minus]');
    var splitPeoplePlus = $('[data-qpos-split-people-plus]');
    if (splitPeopleMinus) splitPeopleMinus.onclick = function () {
      adjustSplitPeople(-1);
    };
    if (splitPeoplePlus) splitPeoplePlus.onclick = function () {
      adjustSplitPeople(1);
    };

    $$('[data-qpos-share-preset]').forEach(function (button) {
      button.onclick = function () {
        applySharePercent(button.getAttribute('data-qpos-share-preset'));
      };
    });

    var sharePercent = $('[data-qpos-share-percent]');
    if (sharePercent) {
      sharePercent.addEventListener('input', function () {
        clearPaymentErrorOnEdit();
        state.payment.splitMode = 'shares';
        state.payment.splitPercent = Math.max(
          0,
          Math.min(100, num(sharePercent.value, 0))
        );
        syncSplitAmount();
        renderPaymentTotals();
      });
      sharePercent.addEventListener('focus', function () {
        openTouchKeypad('share');
      });
      sharePercent.addEventListener('click', function () {
        openTouchKeypad('share');
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
      clearPaymentErrorOnEdit();
      state.payment.reference = reference.value;
      renderPaymentTotals();
    });

    var confirmExternal = $('[data-qpos-external-confirm]');
    if (confirmExternal) confirmExternal.addEventListener('change', function () {
      clearPaymentErrorOnEdit();
      state.payment.externalConfirmed = confirmExternal.checked;
      renderPaymentTotals();
    });

    $$('[data-tip]').forEach(function (button) {
      button.onclick = function () {
        if (state.payment.method === 'direct_terminal') return;

        clearPaymentErrorOnEdit();
        state.payment.tipMode = 'percent';
        state.payment.tipPercent = Number(
          button.getAttribute('data-tip') || 0
        );
        state.payment.tipAmount = '';

        if (state.payment.method === 'cash') {
          state.payment.cashReceived = paymentCharge().toFixed(2);
        }

        renderPayment();
      };
    });

    var submitPayment = $('[data-qpos-payment-submit]');
    if (submitPayment) submitPayment.onclick = executePayment;

    var historyOpen = $('[data-qpos-history-open]');
    var historyModal = $('[data-qpos-history-modal]');
    var historyClose = $('[data-qpos-history-close]');

    if (historyOpen) historyOpen.onclick = function () {
      openHistory('selected');
    };
    if (historyClose) historyClose.onclick = closeHistory;
    if (historyModal) historyModal.addEventListener('click', function (event) {
      if (event.target === historyModal) closeHistory();
    });

    $$('[data-qpos-history-scope]').forEach(function (button) {
      button.onclick = function () {
        loadHistory(
          button.getAttribute('data-qpos-history-scope') || 'selected'
        );
      };
    });

    $$('[data-qpos-history-preset]').forEach(function (button) {
      button.onclick = function () {
        setHistoryPreset(
          button.getAttribute('data-qpos-history-preset') || '7d',
          true
        );
      };
    });

    $$('[data-qpos-history-kind]').forEach(function (button) {
      button.onclick = function () {
        state.historyKind =
          button.getAttribute('data-qpos-history-kind') || 'orders';

        $$('[data-qpos-history-kind]').forEach(function (row) {
          row.classList.toggle(
            'is-active',
            row === button
          );
        });

        if (state.historyData) {
          state.historySelectedOrderId = null;
          renderHistory(state.historyData);
        }
      };
    });

    var historyFrom = $('[data-qpos-history-from]');
    var historyTo = $('[data-qpos-history-to]');

    if (historyFrom) historyFrom.onchange = function () {
      state.historyFrom = historyFrom.value || '';
      state.historyPreset = 'custom';
      $$('[data-qpos-history-preset]').forEach(function (button) {
        button.classList.remove('is-active');
      });
      loadHistory();
    };

    if (historyTo) historyTo.onchange = function () {
      state.historyTo = historyTo.value || '';
      state.historyPreset = 'custom';
      $$('[data-qpos-history-preset]').forEach(function (button) {
        button.classList.remove('is-active');
      });
      loadHistory();
    };

    var confirmModal = $('[data-qpos-confirm-modal]');
    var confirmCancel = $('[data-qpos-confirm-cancel]');
    var confirmAccept = $('[data-qpos-confirm-accept]');

    if (confirmCancel) confirmCancel.onclick = function () {
      closeConfirm(false);
    };
    if (confirmAccept) confirmAccept.onclick = function () {
      closeConfirm(true);
    };
    if (confirmModal) confirmModal.addEventListener('click', function (event) {
      if (event.target === confirmModal) closeConfirm(false);
    });

    var profileToggle = $('[data-qpos-profile-toggle]');
    var profileMenu = $('[data-qpos-profile-menu]');
    if (profileToggle && profileMenu) {
      profileToggle.onclick = function (event) {
        event.stopPropagation();
        var opening = profileMenu.hidden;
        profileMenu.hidden = !opening;
        profileToggle.setAttribute(
          'aria-expanded',
          opening ? 'true' : 'false'
        );
      };

      profileMenu.addEventListener('click', function (event) {
        event.stopPropagation();
      });

      document.addEventListener('click', function () {
        profileMenu.hidden = true;
        profileToggle.setAttribute('aria-expanded', 'false');
      });
    }

    $$('[data-qpos-text-key]').forEach(function (button) {
      button.onclick = function () {
        applyTextKeyboardKey(
          button.getAttribute('data-qpos-text-key')
        );
      };
    });

    configureTextKeyboardTargets();
    window.addEventListener('resize', configureTextKeyboardTargets);

    document.addEventListener('pointerdown', function (event) {
      var keyboard = $('[data-qpos-text-keyboard]');
      if (!keyboard || keyboard.hidden) return;

      var target = event.target;
      if (
        keyboard.contains(target) ||
        (
          target &&
          target.closest &&
          target.closest('[data-qpos-text-keyboard-field]')
        )
      ) {
        return;
      }

      closeTextKeyboard();
    });

    var cleaning = $('[data-qpos-table-cleaning]');
    var move = $('[data-qpos-table-move]');
    var free = $('[data-qpos-table-free]');

    /* PMD_QPOS_MOVE_SCOPE_BINDINGS_V44 */
    if (cleaning) cleaning.onclick = function () {
      if (state.transfer.submitting) return;

      if (
        !state.selectedTable ||
        String(state.selectedTable.status || '').toLowerCase() === 'cleaning'
      ) {
        renderContext();
        return;
      }

      updateTableStatus('cleaning', false);
    };

    if (move) move.onclick = function () {
      if (state.transfer.submitting) return;

      if (
        state.transfer.open &&
        state.transfer.directSide
      ) {
        closeTransfer();
        renderTables();
        renderContext();
        hideToast();
        return;
      }

      openDirectSideMove();
    };

    Array.prototype.slice.call(root.querySelectorAll('[data-qpos-direct-move-scope]')).forEach(function (button) {
      button.onclick = function () {
        if (state.transfer.submitting) return;

        startDirectSideMoveV44(
          String(
            button.getAttribute('data-qpos-direct-move-scope') ||
            'order'
          )
        );
      };
    });

    document.addEventListener('pointerdown', function (event) {
      if (!state.transfer.choiceOpen) return;

      var chooser = $('[data-qpos-move-scope-choice]');
      var moveButton = $('[data-qpos-table-move]');
      var target = event.target;

      if (
        (chooser && chooser.contains(target)) ||
        (moveButton && moveButton.contains(target))
      ) {
        return;
      }

      closeMoveScopeChoiceV44();
    });

    var transferClose = $('[data-qpos-transfer-close]');
    var transferCancel = $('[data-qpos-transfer-cancel]');
    var transferSubmit = $('[data-qpos-transfer-submit]');

    if (transferClose) transferClose.onclick = closeTransfer;
    if (transferCancel) transferCancel.onclick = closeTransfer;
    if (transferSubmit) transferSubmit.onclick = executeTransfer;

    $$('[data-qpos-transfer-scope]').forEach(function (button) {
      button.onclick = function () {
        state.transfer.scope =
          String(button.getAttribute('data-qpos-transfer-scope') || 'order');
        state.transfer.targetTableId = null;
        renderTransfer();
      };
    });

    if (free) free.onclick = async function () {
      if (state.transfer.submitting) return;

      var status = String(state.selectedTable && state.selectedTable.status || '');
      var skip = status === 'occupied';
      if (
        skip &&
        !(await confirmAction({
          title: 'Make table free?',
          message: '',
          confirmLabel: 'Make free',
          cancelLabel: 'Keep occupied',
          tone: 'danger'
        }))
      ) {
        return;
      }
      updateTableStatus('available', skip);
    };

    startClock();
    installCustomerDisplayControls();

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeConfirm(false);
        closeModifier();
        closeItemNote();
        closeHistory();
        closePayment();
        closeTransfer();
        closeFloorMap();
        closeTextKeyboard();
        if (cart) cart.classList.remove('is-mobile-open');
      }
      if (event.key === '/' && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        event.preventDefault();
        if (search) search.focus();
      }
    });
  }

  var hasInlineBootstrap = hydrateInitialBootstrap();
  if (!hasInlineBootstrap) {
    hydrateVisualCache();
  }

  bind();

  if (!hasInlineBootstrap) {
    bootstrap(true);
  }

  window.PMDQuickPOSV1 = {
    state: state,
    refresh: function () { return bootstrap(false); },
    selectTable: selectTable,
    newCheck: newCheck,
    openPayment: openPayment,
    openFloorMap: openFloorMap,
    customerDisplay: {
      refresh: function () {
        pushCustomerDisplay(
          state.payment.open ? 'payment' : 'order',
          {},
          true
        );
      },
      idle: function () {
        pushCustomerDisplayIdle(true);
      }
    }
  };
})();
