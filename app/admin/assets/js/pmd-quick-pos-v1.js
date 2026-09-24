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
      .replace(
        /(?:^|\n)\s*\[VOID\s+[0-9.]+\]\s*[^\r\n]*/gi,
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

  /* PMD_QPOS_ORIENTATION_RUNTIME_V86
   * Do not keep the web POS logically landscape-only. The native Android shell
   * may rotate the WebView, and the browser Screen Orientation API may also be
   * able to release a previous web-level lock. The class is authoritative for
   * the tablet portrait CSS below. */
  var orientationFrameV86 = null;

  function syncOrientationV86() {
    if (orientationFrameV86) {
      window.cancelAnimationFrame(orientationFrameV86);
    }

    orientationFrameV86 = window.requestAnimationFrame(function () {
      orientationFrameV86 = null;

      var width = Math.max(
        Number(window.innerWidth || 0),
        Number(document.documentElement.clientWidth || 0)
      );
      var height = Math.max(
        Number(window.innerHeight || 0),
        Number(document.documentElement.clientHeight || 0)
      );

      if (!width || !height) return;

      var portrait = height > width;

      root.classList.toggle('is-portrait-v86', portrait);
      root.classList.toggle('is-landscape-v86', !portrait);

      if (document.body) {
        document.body.classList.toggle('pmd-qpos-portrait-v86', portrait);
        document.body.classList.toggle('pmd-qpos-landscape-v86', !portrait);
      }
    });
  }

  function releaseWebOrientationLockV86() {
    try {
      if (
        window.screen &&
        window.screen.orientation &&
        typeof window.screen.orientation.unlock === 'function'
      ) {
        window.screen.orientation.unlock();
      }
    } catch (error) {
      /* Native manifest/activity policy may still own orientation. */
    }
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function tokenUrl(template, token, value) {
    return String(template || '').replace(token, encodeURIComponent(String(value || '')));
  }

  /* PMD_QPOS_NATIVE_LOCAL_TRANSPORT_V18
   * Android keeps this exact canonical Quick POS DOM/CSS/JS during WAN loss.
   * Only fetchJson changes authority: Cloud while online, signed/native local
   * state while offline. No alternate POS page and no 2-second repaint loop. */
  function nativeBridgeTransportAvailableV91() {
    return (
      window.PayMyDineOffline &&
      typeof window.PayMyDineOffline.fetchJson === 'function'
    );
  }

  function nativeLocalTransportAvailable() {
    return (
      window.__PMD_NATIVE_OFFLINE__ === true &&
      nativeBridgeTransportAvailableV91()
    );
  }

  function nativeCloudUnavailableV91() {
    if (!nativeBridgeTransportAvailableV91()) return false;
    try {
      if (typeof window.PayMyDineOffline.cloudAvailable === 'function') {
        return window.PayMyDineOffline.cloudAvailable() !== true;
      }
    } catch (ignored) {}
    return false;
  }

  /* PMD_QPOS_REQUEST_FAILOVER_V91
   * Connectivity callbacks are advisory only. The request itself is the final
   * authority: if Cloud transport dies between the Wi-Fi cut and Android's
   * network callback, retry that exact request against SQLite immediately.
   * This removes the race that surfaced browser "Failed to fetch" to staff. */
  function activateNativeLocalTransportV91() {
    window.__PMD_NATIVE_OFFLINE__ = true;

    try {
      if (
        window.PayMyDineOffline &&
        typeof window.PayMyDineOffline.activateLocalTransport === 'function'
      ) {
        window.PayMyDineOffline.activateLocalTransport();
      }
    } catch (ignored) {}

    try {
      setOnline(false);
      root.classList.add('is-native-offline');
      stopLiveSyncTimerV73();
    } catch (ignored) {}

    try {
      if (
        window.pushNotif &&
        typeof window.pushNotif.stopListening === 'function'
      ) {
        window.pushNotif.stopListening();
      }
    } catch (ignored) {}
  }

  /* PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92
   * Android mutation authority is SQLite/outbox first even while Cloud is
   * healthy. This gives SEND/HOLD/Cash/table operations one idempotent command
   * path across online, WAN-cut and reconnect states instead of racing a direct
   * browser POST against ConnectivityObserver. Card/terminal/provider actions
   * remain Cloud-only and are deliberately excluded here. */
  function nativeRequestPathV92(url) {
    try {
      return new URL(String(url || ''), window.location.href).pathname || '';
    } catch (ignored) {
      return String(url || '').split('?')[0];
    }
  }

  function isNativeDurableMutationV92(url, opts) {
    if (!nativeBridgeTransportAvailableV91()) return false;
    if (String(opts.method || 'GET').toUpperCase() !== 'POST') return false;

    var path = nativeRequestPathV92(url);
    if (/^\/admin\/pos\/save\/\d+$/.test(path)) return true;
    if (/^\/admin\/pmd-waiter-table-states-v154\/\d+$/.test(path)) {
      return true;
    }
    if (path === '/admin/pos/transfer') return true;

    if (/^\/admin\/pos\/payment-settle\/-?\d+$/.test(path)) {
      var payload = {};
      try {
        payload = JSON.parse(String(opts.body || '{}'));
      } catch (ignored) {}
      var method = String(payload.payment_method || 'cash').toLowerCase();
      var splitMode = String(payload.split_mode || 'full').toLowerCase();
      return method === 'cash' && splitMode === 'full';
    }

    return false;
  }

  function nativeFetchJsonV91(url, opts) {
    var nativeRaw = window.PayMyDineOffline.fetchJson(
      String(url || ''),
      String(opts.method || 'GET').toUpperCase(),
      typeof opts.body === 'string' ? opts.body : ''
    );
    var nativeJson = {};
    try {
      nativeJson = JSON.parse(String(nativeRaw || '{}'));
    } catch (ignored) {
      nativeJson = {
        ok: false,
        status: 500,
        message: 'Local restaurant data could not be read.'
      };
    }

    if (nativeJson.ok === false || nativeJson.success === false) {
      var nativeError = new Error(
        friendlyOfflineMessage(
          nativeJson.message ||
          (nativeJson.error && nativeJson.error.message) ||
          nativeJson.error
        )
      );
      nativeError.status = Number(nativeJson.status || 422);
      nativeError.payload = nativeJson;
      throw nativeError;
    }

    return nativeJson;
  }

  function shouldFailOverHttpV91(status) {
    status = Number(status || 0);
    return (
      status === 401 ||
      status === 403 ||
      status === 408 ||
      status === 419 ||
      status === 425 ||
      status === 429 ||
      status >= 500
    );
  }

  function friendlyOfflineMessage(value) {
    var raw = String(value || '').trim();
    if (!raw) return 'This action is not available offline yet.';

    var lower = raw.toLowerCase();
    if (
      lower.indexOf('failed to fetch') !== -1 ||
      lower.indexOf('network') !== -1 ||
      lower.indexOf('dns') !== -1 ||
      lower.indexOf('http ') !== -1 ||
      lower.indexOf('ssl') !== -1 ||
      lower.indexOf('socket') !== -1 ||
      lower.indexOf('exception') !== -1
    ) {
      return 'Connection is unavailable. PayMyDine is using the local restaurant copy.';
    }

    return raw;
  }

  /* PMD_QPOS_DURABLE_UI_DRAFT_V18
   * Android keeps the exact unsent V86 cart locally as UI continuity state.
   * This is not a sync command and never creates an order until Send/Pay. */
  var nativeUiDraftTimerV18 = null;

  function nativeUiDraftBridgeV18() {
    return (
      window.PayMyDineOffline &&
      typeof window.PayMyDineOffline.persistUiDraft === 'function'
    );
  }

  function nativeUiDraftRestorePendingV18() {
    return window.__PMD_NATIVE_UI_DRAFT_RESTORE_PENDING__ === true;
  }

  function nativeUiDraftPayloadV18() {
    return {
      location_id: Number(state.boot && state.boot.location_id || 0),
      service_mode: String(state.serviceMode || 'dine_in'),
      table_id:
        state.selectedTable && state.selectedTable.id
          ? Number(state.selectedTable.id)
          : null,
      active_order_id: state.activeOrderId || null,
      force_new_check: !!state.forceNewCheck,
      guest_count: Math.max(1, Number(state.guestCount || 1)),
      note: String(state.note || ''),
      cart: (state.cart || []).map(function (row) {
        return {
          key: String(row.key || ''),
          menu_id: Number(row.menu_id || 0),
          name: String(row.name || ''),
          price: num(row.price, 0),
          quantity: Math.max(1, Number(row.quantity || 1)),
          comment: String(row.comment || ''),
          options: (row.options || []).map(function (option) {
            return {
              id: Number(option.id || 0),
              name: String(option.name || ''),
              price: num(option.price, 0)
            };
          })
        };
      })
    };
  }

  function persistNativeUiDraftV18() {
    if (
      !nativeUiDraftBridgeV18() ||
      nativeUiDraftRestorePendingV18()
    ) return;
    try {
      window.PayMyDineOffline.persistUiDraft(
        JSON.stringify(nativeUiDraftPayloadV18())
      );
    } catch (ignored) {}
  }

  function scheduleNativeUiDraftV18() {
    if (
      !nativeUiDraftBridgeV18() ||
      nativeUiDraftRestorePendingV18()
    ) return;
    window.clearTimeout(nativeUiDraftTimerV18);
    nativeUiDraftTimerV18 = window.setTimeout(function () {
      nativeUiDraftTimerV18 = null;
      persistNativeUiDraftV18();
    }, 120);
  }

  function applyNativeUiDraftV18(draft) {
    if (!draft || typeof draft !== 'object') return false;
    if (String(draft.service_mode || '') !== 'dine_in') return false;

    var tableId = Number(draft.table_id || 0);
    if (!tableId) return false;

    var table = state.tables.find(function (row) {
      return Number(row.id || 0) === tableId;
    }) || null;
    if (!table) return false;

    var rows = Array.isArray(draft.cart) ? draft.cart : [];
    state.serviceMode = 'dine_in';
    state.selectedTable = table;
    if (table.floor_id != null && String(table.floor_id) !== '') {
      state.activeFloorId = String(table.floor_id);
    }
    state.guestCount = Math.max(
      1,
      Math.min(99, Number(draft.guest_count || 1))
    );
    state.note = String(draft.note || '');
    state.forceNewCheck = !!draft.force_new_check;
    state.cart = rows
      .filter(function (row) {
        return Number(row && row.menu_id || 0) > 0 &&
          Number(row && row.quantity || 0) > 0;
      })
      .map(function (row) {
        return {
          key: String(row.key || ''),
          menu_id: Number(row.menu_id || 0),
          name: String(row.name || ''),
          price: num(row.price, 0),
          quantity: Math.max(1, Number(row.quantity || 1)),
          comment: String(row.comment || ''),
          options: Array.isArray(row.options)
            ? row.options.map(function (option) {
                return {
                  id: Number(option.id || 0),
                  name: String(option.name || ''),
                  price: num(option.price, 0)
                };
              })
            : []
        };
      });

    var activeId = Number(draft.active_order_id || 0);
    state.activeOrderId = activeId || null;
    state.orderSelectionExplicitV72 = !!activeId;
    return true;
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

    if (isNativeDurableMutationV92(url, opts)) {
      return nativeFetchJsonV91(url, opts);
    }

    if (
      nativeLocalTransportAvailable() ||
      nativeCloudUnavailableV91()
    ) {
      if (!nativeLocalTransportAvailable()) {
        activateNativeLocalTransportV91();
      }
      return nativeFetchJsonV91(url, opts);
    }

    var response;
    try {
      response = await fetch(url, opts);
    } catch (networkError) {
      if (nativeBridgeTransportAvailableV91()) {
        activateNativeLocalTransportV91();
        return nativeFetchJsonV91(url, opts);
      }
      throw networkError;
    }

    if (
      !response.ok &&
      shouldFailOverHttpV91(response.status) &&
      nativeBridgeTransportAvailableV91()
    ) {
      activateNativeLocalTransportV91();
      return nativeFetchJsonV91(url, opts);
    }

    var json = await response.json().catch(function () { return {}; });

    if (!response.ok || json.ok === false || json.success === false) {
      var message =
        json.message ||
        (json.error && json.error.message) ||
        json.error ||
        ('HTTP ' + response.status);

      var error = new Error(friendlyOfflineMessage(message));
      error.status = response.status;
      error.payload = json;
      throw error;
    }

    try {
      var nativeBridge = window.PayMyDineOffline;
      if (
        nativeBridge &&
        typeof nativeBridge.cloudMutationCommitted === 'function' &&
        String(opts.method || 'GET').toUpperCase() !== 'GET'
      ) {
        nativeBridge.cloudMutationCommitted(
          String(url || ''),
          String(opts.method || 'GET').toUpperCase()
        );
      }
    } catch (ignored) {}

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
    var total = qposTotalsV74().total;
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

    var profileMenu = document.querySelector('[data-qpos-profile-menu]');
    if (!profileMenu) return;

    /* PMD_ZCS_CUSTOMER_DISPLAY_PROFILE_V2
     * Keep customer-display controls inside the existing operator profile card.
     * This avoids floating controls covering Quick POS actions on compact POS
     * displays and keeps hardware controls out of normal browser sessions. */
    var wrap = document.createElement('div');
    wrap.id = 'pmd-customer-display-control';
    wrap.style.cssText =
      'border-top:1px solid rgba(148,163,184,.22);margin-top:8px;padding-top:8px';

    wrap.innerHTML =
      '<button type="button" data-pmd-customer-display-toggle ' +
        'style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;' +
        'border:0;background:transparent;color:inherit;text-align:left;padding:9px 2px;font:inherit;cursor:pointer">' +
        '<span>Customer display</span>' +
        '<small data-pmd-customer-display-status style="opacity:.7">Checking…</small>' +
      '</button>' +
      '<section data-pmd-customer-display-panel hidden ' +
        'style="padding:8px 0 2px">' +
        '<div data-pmd-customer-display-diagnostic ' +
          'style="font-size:11px;line-height:1.45;padding:8px 10px;margin-bottom:8px;' +
          'border-radius:8px;background:rgba(148,163,184,.10);white-space:normal;word-break:break-word">' +
          'Reading ZCS status…' +
        '</div>' +
        '<label style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 2px">' +
          '<span>Enabled</span><input type="checkbox" data-pmd-customer-display-enabled>' +
        '</label>' +
        '<label style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 2px">' +
          '<span>Show food images</span><input type="checkbox" data-pmd-customer-display-images>' +
        '</label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">' +
          '<button type="button" data-pmd-customer-display-test="order" style="padding:8px 6px">Test order</button>' +
          '<button type="button" data-pmd-customer-display-test="payment" style="padding:8px 6px">Test payment</button>' +
          '<button type="button" data-pmd-customer-display-test="success" style="padding:8px 6px">Test success</button>' +
          '<button type="button" data-pmd-customer-display-test="idle" style="padding:8px 6px">Idle</button>' +
        '</div>' +
      '</section>';

    profileMenu.appendChild(wrap);

    var toggle = wrap.querySelector('[data-pmd-customer-display-toggle]');
    var panel = wrap.querySelector('[data-pmd-customer-display-panel]');
    var enabled = wrap.querySelector('[data-pmd-customer-display-enabled]');
    var images = wrap.querySelector('[data-pmd-customer-display-images]');
    var status = wrap.querySelector('[data-pmd-customer-display-status]');
    var diagnostic = wrap.querySelector('[data-pmd-customer-display-diagnostic]');

    function readCapabilities() {
      try {
        return JSON.parse(
          String(bridge.customerDisplayCapabilities() || '{}')
        );
      } catch (error) {
        return {
          customer_display: false,
          last_error: error && error.message ? error.message : 'Bridge status unavailable'
        };
      }
    }

    function renderCapabilities(capabilities) {
      capabilities = capabilities || {};

      if (enabled) {
        enabled.checked = capabilities.enabled !== false;
      }
      if (images) {
        images.checked = capabilities.images_enabled !== false;
      }

      var connected = capabilities.customer_display === true;
      if (status) {
        status.textContent = connected ? 'Connected' : 'Unavailable';
      }

      var details = [];
      if (capabilities.vendor) details.push(String(capabilities.vendor));
      if (capabilities.model) details.push(String(capabilities.model));

      if (capabilities.large_secondary_supported === true) {
        details.push('large screen: yes');
      } else if (capabilities.large_secondary_supported === false) {
        details.push('large screen: no');
      }

      if (capabilities.touch_secondary_supported === true) {
        details.push('touch: yes');
      } else if (capabilities.touch_secondary_supported === false) {
        details.push('touch: no');
      }

      if (capabilities.sdk_init_status !== undefined && capabilities.sdk_init_status !== null) {
        details.push('sdkInit=' + capabilities.sdk_init_status);
      }
      if (capabilities.last_awake_status !== undefined && capabilities.last_awake_status !== null) {
        details.push('awake=' + capabilities.last_awake_status);
      }
      if (capabilities.last_show_status !== undefined && capabilities.last_show_status !== null) {
        details.push('show=' + capabilities.last_show_status);
      }

      if (capabilities.last_error) {
        details.push('ERROR: ' + String(capabilities.last_error));
      } else if (connected) {
        details.push('Hardware bridge ready');
      } else {
        details.push('ZCS hardware not ready');
      }

      if (diagnostic) {
        diagnostic.textContent = details.join(' · ');
      }
    }

    function refreshCapabilities(delay) {
      window.setTimeout(function () {
        renderCapabilities(readCapabilities());
      }, Math.max(0, Number(delay || 0)));
    }

    renderCapabilities(readCapabilities());

    toggle.onclick = function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) refreshCapabilities(0);
    };

    enabled.onchange = function () {
      try {
        bridge.setCustomerDisplayEnabled(!!enabled.checked);
      } catch (ignored) {
      }
      if (enabled.checked) {
        pushCustomerDisplay('order', {}, true);
      }
      refreshCapabilities(700);
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
      refreshCapabilities(700);
    };

    Array.prototype.slice.call(
      wrap.querySelectorAll('[data-pmd-customer-display-test]')
    ).forEach(function (button) {
      button.onclick = function () {
        var kind = button.getAttribute('data-pmd-customer-display-test');
        if (kind === 'idle') {
          pushCustomerDisplayIdle(true);
          refreshCapabilities(900);
          return;
        }
        if (kind === 'success') {
          pushCustomerDisplaySuccess(
            cartTotal() || existingTotal() || 18,
            'Thank you!'
          );
          refreshCapabilities(900);
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
          refreshCapabilities(900);
          return;
        }
        pushCustomerDisplay(
          'order',
          {
            headline: 'Your order'
          },
          true
        );
        refreshCapabilities(900);
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
    /* PMD_QPOS_EXPLICIT_CHECK_SELECTION_V72
     * Opening a table starts a fresh check. Existing checks receive new food
     * only after the cashier explicitly taps the matching #check chip. */
    orderSelectionExplicitV72: false,
    offPremiseOrder: null,
    forceNewCheck: false,
    cart: [],
    pendingSend: null,
    sentMutationBusy: Object.create(null),
    /* PMD_QPOS_QUANTITY_UNDO_STATE_V72
     * One reversible sent-item quantity action only; payments never enter it. */
    lastQuantityUndoV72: null,
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
    /* PMD_QPOS_LIVE_SYNC_STATE_V73
     * One visible-page heartbeat keeps tables, guest attention and the opened
     * check synchronized across customer, kitchen and other staff surfaces. */
    liveSyncTimerV73: null,
    liveSyncInFlightV73: false,
    liveSyncFailuresV73: 0,
    liveTablesSignatureV73: '',
    liveSelectedSignatureV73: '',
    /* PMD_QPOS_PICKUP_CHECK_STATE_V78 */
    pickupOrdersSignatureV78: '',
    livePollAfterMsV73: 2000,
    visualHydrated: false,
    floorMapOpen: false,
    submitting: false,
    modifier: null,
    itemNoteIndex: null,
    historyScope: 'selected',
    historyTargetScopeV88: '',
    historyTargetTableIdV88: 0,
    historyKind: 'orders',
    historySearch: '',
    historyPreset: '7d',
    historyFrom: '',
    historyTo: '',
    historyData: null,
    historyDataKey: '',
    historyRequestSeq: 0,
    /* PMD_QPOS_HISTORY_CACHE_STATE_V83
     * Short stale-while-revalidate cache keeps table-to-table History instant. */
    historyCacheV83: Object.create(null),
    historyFetchesV83: Object.create(null),
    historySelectedOrderId: null,
    historyLoading: false,
    /* PMD_QPOS_TABLE_ATTENTION_STATE_V57 */
    attentionCycleIndex: 0,
    attentionCycleTimer: null,
    /* PMD_QPOS_ATTENTION_PROGRESSIVE_DELAY_V79
     * 0 => next automatic attention move in 10s, then 20s, 30s, ... */
    attentionCycleStepV79: 0,
    attentionResumeTimer: null,
    attentionScrollFrame: null,
    attentionPauseUntil: 0,
    attentionSeenNotificationIds: Object.create(null),
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

    /* PMD_QPOS_OVERLAY_INPUT_SAFE_V63
     * Close the floating cashier keyboard before confirmation overlays. */
    closeTextKeyboard();

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
      var value = formatter.format(now);
      var iso = now.toISOString();
      var title = now.toLocaleDateString();

      clock.textContent = value;
      clock.dateTime = iso;
      clock.title = title;

      /* PMD_QPOS_HISTORY_CLOCK_V84
       * History has the same clock placement as the live catalogue. */
      var historyClock = $('[data-qpos-history-clock]');
      if (historyClock) {
        historyClock.textContent = value;
        historyClock.dateTime = iso;
        historyClock.title = title;
      }
    }

    paint();
    clearInterval(clock.__qposClockTimer);
    clock.__qposClockTimer = setInterval(paint, 1000);
  }

  function activeOrder() {
    var id = Number(state.activeOrderId || 0);
    if (!id) return null;

    var railOrder = state.openOrders.find(function (order) {
      return Number(order.order_id || order.id || 0) === id;
    }) || null;

    if (railOrder) return railOrder;

    if (
      state.serviceMode !== 'dine_in' &&
      state.offPremiseOrder &&
      Number(
        state.offPremiseOrder.order_id ||
        state.offPremiseOrder.id ||
        0
      ) === id
    ) {
      return state.offPremiseOrder;
    }

    return null;
  }

  function activeOrderStructuralLocked() {
    var order = activeOrder();
    if (!order) return false;

    var status = String(order.settlement_status || '').toLowerCase();
    var pickupKitchenLocked =
      state.serviceMode === 'takeaway' &&
      order.item_mutation &&
      order.item_mutation.allowed === false;

    return (
      pickupKitchenLocked ||
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

  /* PMD_QPOS_VAT_PREVIEW_V74
   * Order persistence is authoritative and currently stores menu prices net
   * when tax_menu_price=1. Preview the same rule for unsent food and reuse the
   * canonical stored order_totals tax for already-sent food. */
  function taxSettingsV74() {
    var settings = state.settings || {};
    var enabledRaw = settings.tax_enabled;
    var enabled = enabledRaw === true ||
      ['1', 'true', 'yes', 'on'].indexOf(
        String(enabledRaw == null ? '' : enabledRaw).toLowerCase()
      ) !== -1;
    var percentage = Math.max(0, num(settings.tax_percentage, 0));
    var addAtCheckout = String(
      settings.tax_menu_price == null ? '1' : settings.tax_menu_price
    ) !== '0';
    var title = String(settings.tax_title || 'VAT').trim() || 'VAT';

    return {
      enabled: enabled && percentage > 0,
      percentage: percentage,
      addAtCheckout: addAtCheckout,
      title: title
    };
  }

  function taxRateLabelV74(rate) {
    var value = Math.max(0, num(rate, 0));
    return String(
      Math.round(value * 10000) / 10000
    ).replace(/\.0+$/, '');
  }

  function vatForAmountV74(amount, tax) {
    amount = Math.max(0, num(amount, 0));
    tax = tax || taxSettingsV74();

    if (!tax.enabled || amount <= 0 || tax.percentage <= 0) {
      return 0;
    }

    return roundMoney(
      tax.addAtCheckout
        ? amount * (tax.percentage / 100)
        : amount * (tax.percentage / (100 + tax.percentage))
    );
  }

  function existingVatV74(tax) {
    var order = activeOrder();
    if (!order) return 0;

    /* Stored order tax wins even if the restaurant VAT setting changes later.
     * This keeps a historical/paid check internally consistent on screen. */
    var stored = num(order.tax_amount, -1);
    if (stored >= 0) {
      return roundMoney(stored);
    }

    if (!tax.enabled) return 0;

    var subtotal = num(order.subtotal, -1);
    var gross = Math.max(0, existingTotal());

    if (tax.addAtCheckout && subtotal >= 0 && gross >= subtotal) {
      return roundMoney(gross - subtotal);
    }

    return roundMoney(
      gross * (tax.percentage / (100 + tax.percentage))
    );
  }

  function qposTotalsV74() {
    var tax = taxSettingsV74();
    var newSubtotal = cartTotal();
    var pendingSubtotal = pendingSendTotal();
    var unsentSubtotal = roundMoney(newSubtotal + pendingSubtotal);
    var unsentVat = vatForAmountV74(unsentSubtotal, tax);
    var unsentGross = roundMoney(
      unsentSubtotal + (tax.enabled && tax.addAtCheckout ? unsentVat : 0)
    );
    var existingGross = roundMoney(existingTotal());
    var existingVat = existingVatV74(tax);
    var order = activeOrder();
    var orderVatRate = order
      ? Math.max(0, num(order.tax_percentage, 0))
      : 0;
    var orderVatTitle = order
      ? String(order.tax_title || '').trim()
      : '';
    var displayTax = Object.assign({}, tax, {
      enabled: tax.enabled || existingVat > 0.0001,
      percentage:
        existingVat > 0.0001 && orderVatRate > 0
          ? orderVatRate
          : tax.percentage,
      title:
        existingVat > 0.0001 && orderVatTitle
          ? orderVatTitle
          : tax.title
    });

    return {
      tax: displayTax,
      newSubtotal: newSubtotal,
      pendingSubtotal: pendingSubtotal,
      vat: roundMoney(existingVat + unsentVat),
      total: roundMoney(existingGross + unsentGross)
    };
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
    state.orderSelectionExplicitV72 = false;
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
            : '€',
        /* PMD_QPOS_VAT_CACHE_V74
         * Cache presentation-only tax settings with the menu so refresh never
         * flashes a tax-less total before bootstrap reconciliation. */
        tax_enabled:
          !!(json && json.settings && json.settings.tax_enabled),
        tax_percentage:
          json && json.settings
            ? num(json.settings.tax_percentage, 0)
            : 0,
        tax_menu_price:
          json && json.settings
            ? num(json.settings.tax_menu_price, 1)
            : 1,
        tax_title:
          json && json.settings
            ? String(json.settings.tax_title || 'VAT')
            : 'VAT'
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

      if (nativeLocalTransportAvailable()) {
        // PMD_QPOS_NATIVE_BOOTSTRAP_MERGE_V18
        // Keep every V86 feature flag/URL/presentation setting from the
        // canonical shell. Local bootstrap overrides only the authorities it
        // can serve, so cold-start offline never becomes a reduced UI.
        state.boot = Object.assign({}, state.boot || {}, json);
        state.settings = Object.assign(
          {},
          state.settings || {},
          json.settings || {}
        );
      } else {
        state.boot = json;
        state.settings = json.settings || {};
      }
      state.mode = json.mode || state.mode;
      root.setAttribute('data-mode', state.mode);
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

      var nativeDraftApplied = false;
      var nativeDraftOrderId = 0;
      if (
        nativeLocalTransportAvailable() &&
        json.native_ui_draft &&
        typeof json.native_ui_draft === 'object'
      ) {
        nativeDraftApplied = applyNativeUiDraftV18(json.native_ui_draft);
        nativeDraftOrderId = nativeDraftApplied
          ? Number(json.native_ui_draft.active_order_id || 0)
          : 0;
      }

      if (!nativeDraftApplied && selectedId) {
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

        if (
          nativeDraftApplied &&
          json.native_ui_draft &&
          typeof json.native_ui_draft === 'object'
        ) {
          // loadTable hydrates server guest/check state. Re-apply the unsent
          // local UI draft last so the exact cashier work wins on restart.
          applyNativeUiDraftV18(json.native_ui_draft);

          if (
            nativeDraftOrderId &&
            !state.openOrders.some(function (row) {
              return orderId(row) === nativeDraftOrderId;
            })
          ) {
            state.activeOrderId = null;
            state.orderSelectionExplicitV72 = false;
          }

          renderCart({orderSwitch: true});
        }
      }


    } catch (error) {
      toast(error.message || 'POS could not be loaded.', true);
    } finally {
      state.loading = false;
      root.classList.remove('is-loading');
    }
  }

  /* PMD_QPOS_LIVE_SYNC_V73
   * Background heartbeat intentionally reuses /admin/pos/bootstrap with
   * ?live=1 so no second routing/authentication surface is introduced.
   * The server omits menu/categories and can additionally hydrate the one
   * selected table in the same request. */
  function liveSyncTableSignatureV73(tables) {
    try {
      return JSON.stringify((tables || []).map(function (table) {
        return [
          Number(table.id || 0),
          String(table.status || ''),
          String(table.payment_state || ''),
          roundMoney(num(table.due_amount, 0)),
          Math.max(0, num(table.waiter_calls, 0)),
          Math.max(0, num(table.note_count, 0)),
          String(table.floor_id || ''),
          String(table.number || ''),
          String(table.name || ''),
          Math.max(0, num(table.capacity, 0))
        ];
      }));
    } catch (ignored) {
      return '';
    }
  }

  function liveSyncSelectedSignatureV73(payload) {
    try {
      return payload ? JSON.stringify(payload) : '';
    } catch (ignored) {
      return '';
    }
  }

  function liveSyncSelectedBlockedV73() {
    return !!(
      state.loading ||
      state.tableSwitching ||
      state.submitting ||
      state.pendingSend ||
      state.transfer.submitting ||
      state.payment.submitting ||
      Object.keys(state.sentMutationBusy || {}).length
    );
  }

  function stopLiveSyncTimerV73() {
    if (!state.liveSyncTimerV73) return;
    window.clearTimeout(state.liveSyncTimerV73);
    state.liveSyncTimerV73 = null;
  }

  function scheduleLiveSyncV73(delay) {
    stopLiveSyncTimerV73();
    if (document.visibilityState === 'hidden') return;

    // PMD_QPOS_NATIVE_OFFLINE_NO_HEARTBEAT_V18
    // The Cloud heartbeat is useful online, but offline state is event-driven.
    // Never poll/repaint the cashier workspace every few seconds after WAN loss.
    if (nativeLocalTransportAvailable()) return;

    state.liveSyncTimerV73 = window.setTimeout(function () {
      state.liveSyncTimerV73 = null;
      refreshLiveStateV73(false);
    }, Math.max(0, num(delay, state.livePollAfterMsV73)));
  }

  function requestLiveSyncV73(delay) {
    if (document.visibilityState === 'hidden') return;
    scheduleLiveSyncV73(delay == null ? 0 : delay);
  }

  function markSelectedTableOccupiedV73(tableId) {
    tableId = Number(tableId || 0);
    if (!tableId) return;

    /* Force the next heartbeat to confirm or roll back this optimistic paint. */
    state.liveTablesSignatureV73 = '';

    state.tables = state.tables.map(function (table) {
      if (Number(table.id || 0) !== tableId) return table;
      return Object.assign({}, table, {status: 'occupied'});
    });

    if (
      state.selectedTable &&
      Number(state.selectedTable.id || 0) === tableId
    ) {
      state.selectedTable = Object.assign({}, state.selectedTable, {
        status: 'occupied'
      });
    }
  }

  function applyLiveTablesV73(tables) {
    if (!Array.isArray(tables)) return false;

    var nextSignature = liveSyncTableSignatureV73(tables);
    if (nextSignature === state.liveTablesSignatureV73) {
      return false;
    }

    state.liveTablesSignatureV73 = nextSignature;
    var selectedId = state.selectedTable
      ? Number(state.selectedTable.id || 0)
      : 0;
    var rail = $('[data-qpos-tables]');
    var scrollLeft = rail ? rail.scrollLeft : 0;

    var previousById = Object.create(null);
    state.tables.forEach(function (table) {
      previousById[String(Number(table.id || 0))] = table;
    });

    /* Preserve any presentation-only fields that are not part of the lean
     * live payload while letting operational fields remain authoritative. */
    state.tables = tables.map(function (table) {
      var previous = previousById[String(Number(table.id || 0))] || {};
      return Object.assign({}, previous, table);
    });

    if (selectedId) {
      var nextSelected = state.tables.find(function (table) {
        return Number(table.id || 0) === selectedId;
      });

      if (nextSelected) {
        state.selectedTable = Object.assign(
          {},
          state.selectedTable || {},
          nextSelected
        );
      }
    }

    renderTables();
    renderContext();

    rail = $('[data-qpos-tables]');
    if (rail && Number.isFinite(scrollLeft)) {
      rail.scrollLeft = scrollLeft;
    }

    return true;
  }

  async function refreshLiveStateV73(force) {
    if (nativeLocalTransportAvailable()) {
      stopLiveSyncTimerV73();
      return false;
    }

    if (state.loading) {
      scheduleLiveSyncV73(600);
      return;
    }

    if (state.liveSyncInFlightV73) {
      if (force) scheduleLiveSyncV73(250);
      return;
    }
    if (document.visibilityState === 'hidden') return;

    var baseUrl = String(root.getAttribute('data-bootstrap-url') || '');
    if (!baseUrl) return;

    var selectedId = (
      state.serviceMode === 'dine_in' && state.selectedTable
    )
      ? Number(state.selectedTable.id || 0)
      : 0;

    var glue = baseUrl.indexOf('?') === -1 ? '?' : '&';
    var pickupLive =
      state.serviceMode === 'takeaway'
        ? '&pickup=1'
        : '';
    var url = baseUrl + glue +
      'live=1&table=' + encodeURIComponent(String(selectedId || 0)) +
      pickupLive +
      '&_=' + Date.now();

    state.liveSyncInFlightV73 = true;

    try {
      var json = await fetchJson(url);

      if (
        !json ||
        json.ok !== true ||
        json.version !== 'pmd-quick-pos-live-v73' ||
        !Array.isArray(json.tables)
      ) {
        throw new Error('Invalid Quick POS live state.');
      }

      state.liveSyncFailuresV73 = 0;
      state.livePollAfterMsV73 = Math.max(
        1200,
        Math.min(5000, num(json.poll_after_ms, 2000))
      );

      applyLiveTablesV73(json.tables);

      var selectedPayload = json.selected_table || null;
      var selectedStillMatches =
        selectedId > 0 &&
        state.serviceMode === 'dine_in' &&
        state.selectedTable &&
        Number(state.selectedTable.id || 0) === selectedId;

      if (selectedStillMatches && selectedPayload) {
        tableCachePut(selectedId, selectedPayload);

        var selectedSignature =
          liveSyncSelectedSignatureV73(selectedPayload);

        if (
          !liveSyncSelectedBlockedV73() &&
          (
            force ||
            selectedSignature !== state.liveSelectedSignatureV73
          )
        ) {
          state.liveSelectedSignatureV73 = selectedSignature;
          applyTablePayload(selectedId, selectedPayload);
        }
      } else if (!selectedId) {
        state.liveSelectedSignatureV73 = '';
      }

      if (
        state.serviceMode === 'takeaway' &&
        Array.isArray(json.pickup_orders) &&
        !liveSyncSelectedBlockedV73()
      ) {
        applyPickupOrdersV78(json.pickup_orders, !!force);
      }
    } catch (ignored) {
      /* Background sync is deliberately silent. Normal operator actions keep
       * their own explicit errors and the next heartbeat retries. */
      state.liveSyncFailuresV73++;
    } finally {
      state.liveSyncInFlightV73 = false;

      var retryDelay = state.liveSyncFailuresV73 > 0
        ? Math.min(10000, 3500 + (state.liveSyncFailuresV73 * 1000))
        : state.livePollAfterMsV73;

      scheduleLiveSyncV73(retryDelay);
    }
  }

  function startLiveSyncV73() {
    state.liveTablesSignatureV73 = liveSyncTableSignatureV73(state.tables);
    scheduleLiveSyncV73(700);
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

  /* PMD_QPOS_TABLE_ATTENTION_V76
   * Calls/notes are attention signals whose creation also persists physical
   * Busy on the server. This renderer never frees that physical visit.
   * Never auto-select a table because that could discard/switch cashier work;
   * pulse the card and gently rotate the visible rail instead. */
  function tableNeedsAttentionV57(table) {
    return !!table && (
      num(table.waiter_calls, 0) > 0 ||
      num(table.note_count, 0) > 0
    );
  }

  function effectiveTableStatusV62(table) {
    var status = String(
      table && table.status != null ? table.status : 'available'
    ).toLowerCase().trim();

    if (!status || status === 'free') status = 'available';

    if (
      status === 'available' &&
      table &&
      (
        !!table.has_active_order ||
        num(table.waiter_calls, 0) > 0 ||
        num(table.note_count, 0) > 0 ||
        String(table.payment_state || '') === 'due' ||
        String(table.payment_state || '') === 'partial'
      )
    ) {
      return 'occupied';
    }

    return status;
  }

  function attentionTablesV57() {
    return activeFloorTables().filter(tableNeedsAttentionV57);
  }

  function stopAttentionCycleTimerV79() {
    if (!state.attentionCycleTimer) return;
    window.clearTimeout(state.attentionCycleTimer);
    state.attentionCycleTimer = null;
  }

  function attentionCycleDelayV79() {
    var nextStep = Math.max(
      1,
      Number(state.attentionCycleStepV79 || 0) + 1
    );

    /* setTimeout has a signed 32-bit practical ceiling in browsers. */
    return Math.min(2147483647, nextStep * 10000);
  }

  function scheduleAttentionCycleV79(delayOverride) {
    stopAttentionCycleTimerV79();

    if (document.visibilityState === 'hidden') return;

    var delay = delayOverride == null
      ? attentionCycleDelayV79()
      : Math.max(1000, num(delayOverride, 10000));

    state.attentionCycleTimer = window.setTimeout(function () {
      state.attentionCycleTimer = null;
      cycleAttentionTablesV57();
    }, delay);
  }

  function resetAttentionCycleV79() {
    state.attentionCycleStepV79 = 0;
    scheduleAttentionCycleV79(10000);
  }

  function pauseAttentionCycleV57(ms) {
    var duration = Math.max(700, num(ms, 2800));

    state.attentionPauseUntil = Date.now() + duration;
    stopAttentionCycleTimerV79();

    if (state.attentionResumeTimer) {
      window.clearTimeout(state.attentionResumeTimer);
    }

    /* PMD_QPOS_ATTENTION_PROGRESSIVE_RESUME_V79
     * Operator interaction postpones attention movement. When interaction ends,
     * resume the current progressive delay instead of jumping immediately. */
    state.attentionResumeTimer = window.setTimeout(function () {
      state.attentionResumeTimer = null;
      state.attentionPauseUntil = 0;
      scheduleAttentionCycleV79();
    }, duration + 180);
  }

  function attentionOverlayOpenV63() {
    var keyboard = $('[data-qpos-text-keyboard]');
    if (keyboard && !keyboard.hidden) return true;

    return !!document.querySelector('.pmd-qpos-modal.is-open');
  }

  function attentionInteractionBusyV57() {
    if (document.hidden) return true;

    return !!(
      state.payment.open ||
      state.transfer.open ||
      state.floorMapOpen ||
      state.modifier ||
      state.itemNoteIndex !== null ||
      state.textKeyboardTarget ||
      confirmResolver ||
      attentionOverlayOpenV63()
    );
  }

  function animateAttentionRailV64(grid, targetTop) {
    if (!grid) return;

    if (state.attentionScrollFrame) {
      window.cancelAnimationFrame(state.attentionScrollFrame);
      state.attentionScrollFrame = null;
    }

    var from = Number(grid.scrollTop || 0);
    var distance = targetTop - from;
    if (Math.abs(distance) < 2) {
      grid.scrollTop = targetTop;
      return;
    }

    /* PMD_QPOS_ATTENTION_SLOW_SCROLL_V64
     * Slightly slower than browser-native smooth scrolling so a cashier can
     * visually follow where the rail is taking them. */
    var duration = 950;
    var started = null;

    function easeInOutCubic(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(timestamp) {
      if (started === null) started = timestamp;
      var progress = Math.min(1, (timestamp - started) / duration);
      grid.scrollTop = from + distance * easeInOutCubic(progress);

      if (progress < 1) {
        state.attentionScrollFrame = window.requestAnimationFrame(step);
      } else {
        grid.scrollTop = targetTop;
        state.attentionScrollFrame = null;
      }
    }

    state.attentionScrollFrame = window.requestAnimationFrame(step);
  }

  function focusAttentionTableV57(tableId, immediate) {
    tableId = Number(tableId || 0);
    if (!tableId || attentionInteractionBusyV57()) return false;
    if (!immediate && Date.now() < Number(state.attentionPauseUntil || 0)) {
      return false;
    }

    /* PMD_QPOS_ATTENTION_RAIL_GEOMETRY_V63 */
    var grid = $('[data-qpos-tables]');
    if (!grid) return false;

    var button = grid.querySelector(
      '[data-qpos-table="' + String(tableId) + '"]'
    );
    if (!button) return false;

    var gridRect = grid.getBoundingClientRect();
    var buttonRect = button.getBoundingClientRect();
    var delta =
      (buttonRect.top + buttonRect.height / 2) -
      (gridRect.top + gridRect.height / 2);
    var targetTop = grid.scrollTop + delta;

    targetTop = Math.max(
      0,
      Math.min(
        targetTop,
        Math.max(0, grid.scrollHeight - grid.clientHeight)
      )
    );

    animateAttentionRailV64(grid, targetTop);

    button.classList.add('is-attention-focus-v57');
    window.setTimeout(function () {
      if (button && button.classList) {
        button.classList.remove('is-attention-focus-v57');
      }
    }, 1900);

    return true;
  }

  function cycleAttentionTablesV57() {
    if (
      attentionInteractionBusyV57() ||
      Date.now() < Number(state.attentionPauseUntil || 0)
    ) {
      scheduleAttentionCycleV79();
      return;
    }

    var rows = attentionTablesV57();
    if (!rows.length) {
      state.attentionCycleIndex = 0;
      state.attentionCycleStepV79 = 0;
      scheduleAttentionCycleV79(10000);
      return;
    }

    var index =
      Math.max(0, Number(state.attentionCycleIndex || 0)) % rows.length;

    if (!focusAttentionTableV57(rows[index].id, false)) {
      scheduleAttentionCycleV79();
      return;
    }

    state.attentionCycleIndex = (index + 1) % rows.length;

    /* PMD_QPOS_ATTENTION_PROGRESSIVE_DELAY_V79
     * Successful automatic moves back off linearly:
     * first move after 10s -> next after 20s -> 30s -> 40s -> ... */
    state.attentionCycleStepV79 =
      Math.max(0, Number(state.attentionCycleStepV79 || 0)) + 1;

    scheduleAttentionCycleV79();
  }

  function startAttentionCycleV57() {
    stopAttentionCycleTimerV79();

    /* PMD_QPOS_ATTENTION_ROTATION_V79
     * No page-load jump. Start at 10 seconds and increase only after an
     * automatic attention move actually succeeds. */
    state.attentionCycleStepV79 = 0;
    scheduleAttentionCycleV79(10000);
  }

  function setHistoryKindV57(kind) {
    kind = String(kind || 'orders');
    state.historyKind = kind;

    /* PMD_QPOS_ATTENTION_DETAIL_CLICK_V61
     * Use the querySelectorAll helper; the single-element helper cannot be iterated. */
    $$('[data-qpos-history-kind]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        String(button.getAttribute('data-qpos-history-kind')) === kind
      );
    });

    if (state.historyData) {
      state.historySelectedOrderId = null;
      renderHistory(state.historyData);
    }
  }

  async function openTableAttentionV57(tableId, kind) {
    tableId = Number(tableId || 0);
    if (!tableId || state.transfer.submitting) return;

    pauseAttentionCycleV57(12000);

    if (
      !state.selectedTable ||
      Number(state.selectedTable.id || 0) !== tableId
    ) {
      await selectTable(tableId);
    }

    if (
      !state.selectedTable ||
      Number(state.selectedTable.id || 0) !== tableId
    ) {
      return;
    }

    setHistoryKindV57(
      kind === 'attention'
        ? 'attention'
        : (kind === 'calls' ? 'calls' : 'notes')
    );
    await openHistory('selected');
  }

  function notificationTableIdV57(notification, payload) {
    return Number(
      (notification && (
        notification.table_id ||
        notification.location_table_id
      )) ||
      (payload && (
        payload.table_id ||
        payload.location_table_id
      )) ||
      0
    );
  }

  function applyPushAttentionV57(event) {
    var detail = event && event.detail ? event.detail : {};
    var notification = detail.notification || {};
    var payload = detail.payload || {};
    var type = String(
      notification.type ||
      payload.type ||
      payload.notification_type ||
      ''
    ).toLowerCase();

    var kind = '';
    if (type === 'waiter_call') {
      kind = 'calls';
    } else if (type === 'table_note' || type === 'staff_note') {
      kind = 'notes';
    } else {
      return;
    }

    var tableId = notificationTableIdV57(notification, payload);
    if (!tableId) return;

    var eventKey = String(
      notification.id ||
      notification.notification_id ||
      [
        type,
        tableId,
        notification.created_at || payload.created_at || ''
      ].join(':')
    );

    if (state.attentionSeenNotificationIds[eventKey]) return;
    state.attentionSeenNotificationIds[eventKey] = true;

    var found = false;
    state.tables = state.tables.map(function (table) {
      if (Number(table.id || 0) !== tableId) return table;
      found = true;

      var next = Object.assign({}, table);
      if (kind === 'calls') {
        next.waiter_calls = Math.max(1, num(next.waiter_calls, 0) + 1);
      } else {
        next.note_count = Math.max(1, num(next.note_count, 0) + 1);
      }

      // PMD_QPOS_PUSH_DERIVED_BUSY_V62
      // New unresolved service work makes a previously Free table Busy now.
      if (effectiveTableStatusV62(next) === 'occupied') {
        next.status = 'occupied';
        next.derived_busy = true;
      }

      return next;
    });

    if (!found) return;

    if (
      state.selectedTable &&
      Number(state.selectedTable.id || 0) === tableId
    ) {
      var selectedFresh = state.tables.find(function (table) {
        return Number(table.id || 0) === tableId;
      });
      if (selectedFresh) {
        state.selectedTable = Object.assign(
          {},
          state.selectedTable,
          selectedFresh
        );
      }
    }

    renderTables();
    window.setTimeout(function () {
      if (!focusAttentionTableV57(tableId, true)) return;

      /* A new push attention is itself a scroll event. Its next automatic
       * rotation therefore starts the requested sequence again at 10 seconds. */
      var rows = attentionTablesV57();
      var pushedIndex = rows.findIndex(function (row) {
        return Number(row.id || 0) === tableId;
      });

      if (pushedIndex >= 0 && rows.length) {
        state.attentionCycleIndex = (pushedIndex + 1) % rows.length;
      }

      resetAttentionCycleV79();
    }, 80);
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

  function tableFeatureIconsV67(features) {
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
        '<span class="pmd-qpos-table-feature-v67 is-' + esc(key) + '"' +
          ' title="' + esc(meta.label) + '"' +
          ' aria-label="' + esc(meta.label) + '">' +
          meta.svg +
        '</span>'
      );
    }).filter(Boolean);

    return icons.length
      ? '<span class="pmd-qpos-table-features-v67">' + icons.join('') + '</span>'
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

      /* PMD_QPOS_UNIFIED_ATTENTION_ICON_V81
       * Waiter calls and table notes share one table badge. This prevents a
       * single table from accumulating multiple service-attention icons while
       * keeping payment badges independent. */
      if (hasAttention) {
        var attentionTitleV81 =
          waiterCalls > 0 && noteCount > 0
            ? 'Waiter call + table note'
            : (waiterCalls > 0 ? 'Waiter call' : 'Table note');

        signals.push({
          kind: 'attention-v81',
          icon: '!',
          title: attentionTitleV81,
          attentionKind: 'attention',
          count: 0
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
          tableFeatureIconsV67(table.features) +
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
        if (id) {
          prefetchTableData(id);
          prefetchHistoryForTableV83(id);
        }
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

    renderHistoryTableRailV88();

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

  function productUsesBrandPlaceholderV72(image) {
    var source = String(image || '').trim();
    if (!source) return true;

    try {
      var path = new URL(source, window.location.href).pathname.toLowerCase();
      return (
        path === '/brand/paymydine-logo.svg' ||
        path === '/app/admin/assets/images/paymydine-logo.svg'
      );
    } catch (ignored) {
      return /(?:^|\/)paymydine-logo\.svg(?:$|[?#])/i.test(source);
    }
  }

  function productPlaceholderMarkupV72() {
    /* PMD_QPOS_INLINE_PLACEHOLDER_V72
     * Inline vector = no separate SVG/mask request and therefore no refresh
     * flash for foods that intentionally use the PayMyDine placeholder. */
    return (
      '<div class="pmd-qpos-product-image is-placeholder is-inline-v72" aria-hidden="true">' +
        '<svg viewBox="0 0 428.72 420" focusable="false" aria-hidden="true">' +
          '<path d="M242.42 38.65H45.83c8.89 34.02 37.63 60.01 73.1 64.85 3.93.54 7.94.82 12.02.82h111.47c46.54 0 84.28 37.73 84.28 84.28s-37.74 84.28-84.28 84.28h-67.53c-16.46 0-29.8 13.34-29.8 29.8v35.87h95.89c83.02 0 151.35-66.86 151.39-149.89.03-82.85-67.12-150.01-149.95-150.01Z"></path>' +
          '<path d="M219.64 246.47v-25.53h-91.75c-6.1 0-11.05 4.95-11.05 11.05v88.72c0 4.08-.28 8.09-.82 12.02-4.84 35.47-30.83 64.21-64.85 73.1V209.24c0-1.3 0-2.58.01-3.84 1.73-25.71 21.8-46.39 47.24-49.07h11.14l110.08-.07v-25.53l58.55 57.87-58.55 57.87Z"></path>' +
        '</svg>' +
      '</div>'
    );
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
        status.textContent =
          state.serviceMode === 'dine_in'
            ? 'Viewing paid/locked check · new food starts a new check'
            : (
                activeOrder() &&
                activeOrder().item_mutation &&
                activeOrder().item_mutation.kitchen_started
                  ? 'Kitchen preparation started · this Pickup is locked'
                  : 'Payment started · this Pickup is locked'
              );
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
      var placeholder = productUsesBrandPlaceholderV72(image);
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
          (placeholder
            ? productPlaceholderMarkupV72()
            : '<div class="pmd-qpos-product-image" style="background-image:url(&quot;' + esc(image) + '&quot;)"></div>') +
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

        if (
          activeOrderStructuralLocked() &&
          state.serviceMode === 'dine_in' &&
          state.selectedTable
        ) {
          state.activeOrderId = null;
          state.orderSelectionExplicitV72 = false;
          state.forceNewCheck = true;
          state.guestCount = 1;
          state.note = '';
          renderCart({orderSwitch: true});
        } else if (activeOrderStructuralLocked()) {
          var lockedPickupOrder = activeOrder();
          toast(
            lockedPickupOrder &&
            lockedPickupOrder.item_mutation &&
            lockedPickupOrder.item_mutation.reason
              ? lockedPickupOrder.item_mutation.reason
              : 'This Pickup order can no longer be changed.',
            true
          );
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
    state.orderSelectionExplicitV72 = id > 0;
    state.lastQuantityUndoV72 = null;
    var order = activeOrder();

    if (state.serviceMode === 'takeaway') {
      state.offPremiseOrder = order || null;
    }
    state.forceNewCheck =
      id < 1 ||
      (!!order && activeOrderStructuralLocked());
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

    var tableCheckContext =
      state.serviceMode === 'dine_in' &&
      !!state.selectedTable;
    var pickupCheckContext =
      state.serviceMode === 'takeaway';

    if (
      (!tableCheckContext && !pickupCheckContext) ||
      !state.openOrders.length
    ) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.hidden = false;
    var rows = [];

    state.openOrders.forEach(function (order) {
      var id = orderId(order);
      var settlement = String(order.settlement_status || '').toLowerCase();
      var isPaid = ['paid', 'settled', 'closed'].indexOf(settlement) !== -1;
      var classes = [];
      if (Number(state.activeOrderId) === id) classes.push('is-active');
      if (isPaid) classes.push('is-paid-v71');
      rows.push(
        '<button type="button" data-qpos-check="' + esc(id) + '"' +
          (classes.length ? ' class="' + classes.join(' ') + '"' : '') + '>' +
          '#' + esc(id) + ' · ' + money(orderTotal(order)) +
          (isPaid ? ' · Paid' : '') +
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
        var settlement = String(order.settlement_status || '').toLowerCase();
        var isPaid = ['paid', 'settled', 'closed'].indexOf(settlement) !== -1;
        button.classList.toggle(
          'is-active',
          Number(state.activeOrderId) === id
        );
        button.classList.toggle('is-paid-v71', isPaid);
        button.textContent =
          '#' + id + ' · ' + money(orderTotal(order)) +
          (isPaid ? ' · Paid' : '');
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

  async function mutateCommittedItemQuantityV68(
    button,
    direction,
    options
  ) {
    var mutationOptions = options || {};
    var order = activeOrder();
    var mutation = order && order.item_mutation ? order.item_mutation : {};

    var mutationContextAllowed =
      (
        state.serviceMode === 'dine_in' &&
        !!state.selectedTable
      ) ||
      state.serviceMode === 'takeaway';

    if (
      !order ||
      !mutationContextAllowed ||
      mutation.allowed !== true
    ) {
      toast(
        mutation.reason ||
          'This ordered item can no longer be changed.',
        true
      );
      return;
    }

    var itemId = Number(
      button.getAttribute('data-order-menu-id') || 0
    );
    if (itemId < 1) return;

    var busyKey = String(itemId);
    if (state.sentMutationBusy[busyKey]) return;

    var item = orderItems(order).find(function (row) {
      return Number(row.order_menu_id || row.id || 0) === itemId;
    });
    if (!item) return;

    var currentQty = Math.max(0, num(item.quantity, 0));
    var nextQty = currentQty + (direction > 0 ? 1 : -1);
    if (nextQty < 0 || (direction < 0 && currentQty <= 0)) return;

    var template = direction > 0
      ? state.settings.item_increase_url
      : state.settings.item_decrease_url;

    if (!template) {
      toast('Item quantity action is unavailable.', true);
      return;
    }

    var oldSubtotal = num(item.subtotal, 0);
    var unitSubtotal = currentQty > 0
      ? oldSubtotal / currentQty
      : num(item.price, 0);
    var oldOrderTotal = orderTotal(order);
    var oldTotalItems = num(order.total_items, 0);
    var oldUpdatedAt = String(order.updated_at || '');

    state.sentMutationBusy[busyKey] = true;

    /* PMD_QPOS_INSTANT_QUANTITY_V72
     * Paint immediately; server authority can still reject and roll back. */
    item.quantity = nextQty;
    item.subtotal = roundMoney(unitSubtotal * nextQty);
    order.total = Math.max(
      0,
      roundMoney(
        oldOrderTotal +
        (direction > 0 ? unitSubtotal : -unitSubtotal)
      )
    );
    order.order_total = order.total;
    if (
      oldTotalItems > 0 ||
      Object.prototype.hasOwnProperty.call(order, 'total_items')
    ) {
      order.total_items = Math.max(
        0,
        oldTotalItems + (direction > 0 ? 1 : -1)
      );
    }
    renderCart({orderSwitch: true});

    try {
      var json = await fetchJson(
        tokenUrl(template, '{order}', orderId(order)),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_menu_id: itemId,
            quantity: 1,
            expected_updated_at: oldUpdatedAt,
            reason: direction < 0
              ? (
                  mutationOptions.isUndo
                    ? 'Undo Quick POS quantity increase before kitchen preparation'
                    : 'Quick POS quantity correction before kitchen preparation'
                )
              : '',
            undo_quantity_correction:
              !!mutationOptions.isUndo && direction > 0
          })
        }
      );

      var authoritativeQty = Math.max(
        0,
        num(
          json.new_quantity != null
            ? json.new_quantity
            : json.remaining_quantity,
          nextQty
        )
      );

      item.quantity = authoritativeQty;
      item.subtotal = num(
        json.line_subtotal,
        roundMoney(unitSubtotal * authoritativeQty)
      );

      if (json.order_total != null) {
        order.total = num(json.order_total, order.total);
        order.order_total = order.total;
      }
      if (json.total_items != null) {
        order.total_items = Math.max(
          0,
          num(json.total_items, order.total_items)
        );
      }
      if (json.updated_at) {
        order.updated_at = String(json.updated_at);
      }

      if (mutationOptions.isUndo) {
        state.lastQuantityUndoV72 = null;
        toast('Last quantity change undone.');
      } else {
        state.lastQuantityUndoV72 = {
          order_id: orderId(order),
          order_menu_id: itemId,
          direction: direction > 0 ? -1 : 1,
          created_at: Date.now()
        };

        toast(
          direction > 0
            ? 'Quantity increased.'
            : 'Quantity reduced.'
        );
      }
    } catch (error) {
      item.quantity = currentQty;
      item.subtotal = oldSubtotal;
      order.total = oldOrderTotal;
      order.order_total = oldOrderTotal;
      order.total_items = oldTotalItems;
      order.updated_at = oldUpdatedAt;

      toast(
        error.message || 'Item quantity could not be changed.',
        true
      );
    } finally {
      delete state.sentMutationBusy[busyKey];
      renderCart({orderSwitch: true});
    }
  }

  async function undoLastQuantityV72() {
    var undo = state.lastQuantityUndoV72;
    var order = activeOrder();

    if (
      !undo ||
      !order ||
      orderId(order) !== Number(undo.order_id || 0)
    ) {
      state.lastQuantityUndoV72 = null;
      renderSentItems();
      return;
    }

    var itemId = Number(undo.order_menu_id || 0);
    var item = orderItems(order).find(function (row) {
      return Number(row.order_menu_id || row.id || 0) === itemId;
    });

    if (!item) {
      state.lastQuantityUndoV72 = null;
      renderSentItems();
      return;
    }

    await mutateCommittedItemQuantityV68(
      {
        getAttribute: function (name) {
          return name === 'data-order-menu-id'
            ? String(itemId)
            : '';
        }
      },
      Number(undo.direction || 0),
      {isUndo: true}
    );
  }

  function renderSentItems() {
    var section = $('[data-qpos-sent]');
    var box = $('[data-qpos-sent-items]');
    var total = $('[data-qpos-sent-total]');
    var undoButton = $('[data-qpos-sent-undo]');
    var order = activeOrder();

    if (!section || !box) return;

    var committed = orderItems(order).filter(function (row) {
      return num(
        row && (row.quantity != null ? row.quantity : row.qty),
        0
      ) > 0.0001;
    });
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

    var mutation = order && order.item_mutation
      ? order.item_mutation
      : {};

    var undo = state.lastQuantityUndoV72;
    var canUndo =
      !!undo &&
      !!order &&
      orderId(order) === Number(undo.order_id || 0) &&
      mutation.allowed === true;

    if (undoButton) {
      undoButton.hidden = !canUndo;
      undoButton.disabled =
        !canUndo ||
        Object.keys(state.sentMutationBusy).length > 0;
      undoButton.onclick = canUndo
        ? undoLastQuantityV72
        : null;
    }

    if (!items.length && !canUndo) {
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

    var canEditCommitted =
      (
        (
          state.serviceMode === 'dine_in' &&
          !!state.selectedTable
        ) ||
        state.serviceMode === 'takeaway'
      ) &&
      mutation.allowed === true;

    var rows = items.map(function (item) {
      var qty = num(
        item.quantity != null ? item.quantity : item.qty,
        1
      );
      var subtotal = num(
        item.subtotal != null
          ? item.subtotal
          : item.line_subtotal,
        0
      );
      var orderMenuId = Number(
        item.order_menu_id || item.id || 0
      );
      var quantityBusy = !!state.sentMutationBusy[String(orderMenuId)];

      var controls = (
        !item.__pending &&
        canEditCommitted &&
        qty > 0 &&
        orderMenuId > 0
      )
        ? (
            '<span class="pmd-qpos-sent-qty-v68">' +
              '<button type="button" data-qpos-sent-decrease data-order-menu-id="' +
                esc(orderMenuId) + '"' +
                (quantityBusy ? ' disabled' : '') +
                ' aria-label="Reduce ordered quantity">−</button>' +
              '<button type="button" data-qpos-sent-increase data-order-menu-id="' +
                esc(orderMenuId) + '"' +
                (quantityBusy ? ' disabled' : '') +
                ' aria-label="Increase ordered quantity">+</button>' +
            '</span>'
          )
        : '';

      return (
        '<div class="pmd-qpos-sent-line' +
          (item.__pending ? ' is-pending' : '') +
          '">' +
          '<b>' + esc(qty) + '×</b>' +
          '<span>' +
            esc(item.name || item.menu_name || 'Item') +
            (
              visibleNote(item.comment)
                ? '<small>' +
                    esc(visibleNote(item.comment)) +
                  '</small>'
                : ''
            ) +
          '</span>' +
          '<span class="pmd-qpos-sent-tail-v68">' +
            '<strong>' + money(subtotal) + '</strong>' +
            controls +
          '</span>' +
        '</div>'
      );
    });

    if (
      order &&
      mutation.allowed === false &&
      (mutation.reason || mutation.kitchen_started || mutation.payment_started)
    ) {
      var lockText = mutation.kitchen_started
        ? 'Kitchen preparing/ready · sent item quantities are locked.'
        : (
            mutation.payment_started
              ? 'Payment started · paid item quantities are locked. Add new food with + Check; reduce paid value only through refund/correction.'
              : String(mutation.reason || 'Sent item quantities are locked.')
          );

      rows.push(
        '<div class="pmd-qpos-sent-lock-v68">' +
          esc(lockText) +
        '</div>'
      );
    }

    box.innerHTML = rows.join('');

    Array.prototype.slice.call(
      box.querySelectorAll('[data-qpos-sent-decrease]')
    ).forEach(function (button) {
      button.onclick = function () {
        mutateCommittedItemQuantityV68(button, -1);
      };
    });

    Array.prototype.slice.call(
      box.querySelectorAll('[data-qpos-sent-increase]')
    ).forEach(function (button) {
      button.onclick = function () {
        mutateCommittedItemQuantityV68(button, 1);
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
    if (
      state.serviceMode === 'dine_in' &&
      state.activeOrderId &&
      activeOrderStructuralLocked()
    ) {
      state.activeOrderId = null;
      state.orderSelectionExplicitV72 = false;
      state.forceNewCheck = true;
      state.guestCount = 1;
      state.note = '';
    }

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

    scheduleNativeUiDraftV18();
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

    var totalsV74 = qposTotalsV74();
    var newTotal = totalsV74.newSubtotal;
    var total = totalsV74.total;

    var newTotalEl = $('[data-qpos-new-total]');
    var vatRowV74 = $('[data-qpos-vat-row]');
    var vatLabelV74 = $('[data-qpos-vat-label]');
    var vatTotalV74 = $('[data-qpos-vat-total]');
    var totalEl = $('[data-qpos-total]');
    var mobileTotal = $('[data-qpos-mobile-total]');
    var mobileCount = $('[data-qpos-mobile-count]');
    if (newTotalEl) newTotalEl.textContent = money(newTotal);

    if (vatRowV74) {
      vatRowV74.hidden = !totalsV74.tax.enabled;
    }
    if (vatLabelV74) {
      vatLabelV74.textContent =
        totalsV74.tax.title +
        ' (' + taxRateLabelV74(totalsV74.tax.percentage) + '%)';
    }
    if (vatTotalV74) {
      vatTotalV74.textContent = money(totalsV74.vat);
    }

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
      send.textContent = 'Send to Kitchen';
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

      /* PMD_QPOS_PAY_LABEL_V82
       * Keep the proven send-then-pay workflow behind one simple operator label. */
      pay.textContent = 'Pay';
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
    state.orderSelectionExplicitV72 = false;
    state.forceNewCheck = true;
    state.lastQuantityUndoV72 = null;
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
      state.orderSelectionExplicitV72 = false;
      state.forceNewCheck = true;
      renderContext();
      renderCart();

      /* Do not block the tap handler; loadTable paints as soon as it resolves. */
      loadTable(table.id, false, false);
    }

    var historyWorkspace = $('[data-qpos-history-modal]');
    if (historyWorkspace && historyWorkspace.classList.contains('is-open')) {
      /* PMD_QPOS_HISTORY_SWITCH_FAST_V83
       * Never leave the previous table's History on screen while waiting.
       * Paint a warm cached History immediately when available; otherwise show
       * the new table identity/loading state and reconcile in background. */
      state.historyScope = 'selected';
      state.historySelectedOrderId = null;

      var historyContextV83 = historyContextForTableV83(table.id);
      var cachedHistoryV83 = historyCacheGetV83(historyContextV83.key);
      var historyTitleV83 = $('[data-qpos-history-title]');
      var historyListV83 = $('[data-qpos-history-list]');

      if (cachedHistoryV83) {
        state.historyDataKey = historyContextV83.key;
        renderHistory(cachedHistoryV83);
      } else {
        state.historyData = null;
        state.historyDataKey = '';

        if (historyTitleV83) {
          historyTitleV83.textContent =
            'Table ' + String(table.number || table.id || '');
        }
        if (historyListV83) {
          historyListV83.innerHTML =
            '<div class="pmd-qpos-history-empty">Loading history…</div>';
        }
        renderHistoryDetail(0);
      }

      loadHistory('selected', {
        preserve: !!cachedHistoryV83
      });
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
  /* PMD_QPOS_TABLE_CACHE_TTL_V83
   * Keep warm checks visible longer; every cached tap still revalidates in
   * background, so this improves switching without making server state final. */
  var PMD_QPOS_TABLE_CACHE_TTL_V41 = 30000;

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
      .slice(0, 10);

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
        /* PMD_QPOS_TABLE_WARMUP_BATCH_V83
         * Warm small groups in parallel instead of serially waiting on every
         * occupied table. Keep concurrency capped so the POS does not burst. */
        for (var i = 0; i < candidates.length; i += 3) {
          if (state.payment.open || state.transfer.open) break;

          await Promise.all(
            candidates.slice(i, i + 3).map(function (candidate) {
              return fetchTablePayload(candidate.id, false).catch(function () {
                return null;
              });
            })
          );
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

    var explicitOrderId = state.orderSelectionExplicitV72
      ? Number(state.activeOrderId || 0)
      : 0;

    state.openOrders = Array.isArray(json.open_orders) ? json.open_orders : [];

    var explicitOrderStillExists =
      explicitOrderId > 0 &&
      state.openOrders.some(function (order) {
        return orderId(order) === explicitOrderId;
      });

    state.activeOrderId = explicitOrderStillExists
      ? explicitOrderId
      : null;

    if (!explicitOrderStillExists) {
      state.orderSelectionExplicitV72 = false;
    }

    state.forceNewCheck =
      !state.activeOrderId ||
      activeOrderStructuralLocked();

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
        var selectedCapacity = Math.max(
          0,
          num(state.selectedTable.capacity, 0)
        );
        selectedMeta.hidden = selectedCapacity < 1;
        selectedMeta.textContent =
          selectedCapacity > 0
            ? String(selectedCapacity) + 's'
            : '';
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

  /* PMD_QPOS_PICKUP_ACTIVE_CHECKS_V78
   * Pickup mirrors a table's check rail: every Received/Preparing collection
   * order is visible, but nothing is auto-selected. KDS Ready removes the chip
   * on the next live heartbeat; History remains the long-term record. */
  function pickupOrdersSignatureV78(orders) {
    try {
      return JSON.stringify((orders || []).map(function (order) {
        return [
          orderId(order),
          String(order.status_name || ''),
          String(order.settlement_status || ''),
          num(order.total, num(order.order_total, 0)),
          String(order.updated_at || ''),
          !!(
            order.item_mutation &&
            order.item_mutation.allowed === true
          ),
          orderItems(order).map(function (item) {
            return [
              Number(item.order_menu_id || item.id || 0),
              num(item.quantity, 0),
              num(item.subtotal, 0)
            ];
          })
        ];
      }));
    } catch (ignored) {
      return '';
    }
  }

  function applyPickupOrdersV78(orders, force) {
    if (!Array.isArray(orders)) return false;

    var signature = pickupOrdersSignatureV78(orders);
    if (!force && signature === state.pickupOrdersSignatureV78) {
      return false;
    }

    var selectedId = Number(state.activeOrderId || 0);
    var hadSelectedId = selectedId > 0;

    state.pickupOrdersSignatureV78 = signature;
    state.openOrders = orders;

    var selected = selectedId
      ? state.openOrders.find(function (order) {
          return orderId(order) === selectedId;
        }) || null
      : null;

    if (selected) {
      state.offPremiseOrder = selected;
    } else if (hadSelectedId) {
      state.activeOrderId = null;
      state.orderSelectionExplicitV72 = false;
      state.lastQuantityUndoV72 = null;
      state.offPremiseOrder = null;

      if (state.cart.length) {
        toast(
          'Pickup #' + selectedId +
          ' is Ready. Unsent items remain in the cart as a new Pickup order.'
        );
      }
    } else {
      state.offPremiseOrder = null;
    }

    renderCart({orderSwitch: true});
    renderProducts();
    return true;
  }

  async function loadPickupOrdersV78(silent) {
    if (!state.settings.pickup_data_url) return false;

    try {
      var json = await fetchJson(
        String(state.settings.pickup_data_url) +
        '?_=' + Date.now()
      );

      if (
        !json ||
        json.ok !== true ||
        !Array.isArray(json.open_orders)
      ) {
        throw new Error('Invalid Pickup check data.');
      }

      applyPickupOrdersV78(json.open_orders, true);
      return true;
    } catch (error) {
      if (!silent) {
        toast(
          error.message || 'Pickup orders could not be loaded.',
          true
        );
      }
      return false;
    }
  }

  async function selectPickup() {
    if (state.payment.open) {
      toast('Close payment first.', true);
      return;
    }

    if (state.serviceMode === 'takeaway') {
      /* Tapping Pickup again while viewing an existing #check returns to a
       * fresh Pickup without hiding the other active check chips. */
      if (state.activeOrderId && !state.cart.length) {
        state.activeOrderId = null;
        state.orderSelectionExplicitV72 = false;
        state.lastQuantityUndoV72 = null;
        state.offPremiseOrder = null;
        renderCart({orderSwitch: true});
        renderProducts();
      }

      loadPickupOrdersV78(true);

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
    state.orderSelectionExplicitV72 = false;
    state.lastQuantityUndoV72 = null;
    state.offPremiseOrder = null;
    state.cart = [];
    state.note = '';
    state.guestCount = 1;
    state.forceNewCheck = false;
    state.pickupOrdersSignatureV78 = '';

    renderAll();
    loadPickupOrdersV78(false);

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
    state.orderSelectionExplicitV72 = true;
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
      var existingPickup = state.openOrders.find(function (row) {
        return orderId(row) === id;
      }) || state.offPremiseOrder || null;
      var existingItems =
        existingPickup && Array.isArray(existingPickup.items)
          ? existingPickup.items
          : [];

      var pickupOrder = Object.assign(
        {},
        existingPickup || {},
        {
          order_id: id,
          order_total: total,
          total: total,
          total_items: num(
            json.total_items,
            existingPickup && existingPickup.total_items
              ? existingPickup.total_items
              : 0
          ),
          updated_at: json.updated_at || '',
          settlement_status: 'unpaid',
          item_mutation: Object.assign(
            {
              allowed: true,
              locked: false,
              payment_started: false,
              kitchen_started: false
            },
            existingPickup && existingPickup.item_mutation
              ? existingPickup.item_mutation
              : {}
          ),
          items: existingItems.concat(sentItems)
        }
      );

      state.openOrders = [
        pickupOrder
      ].concat(state.openOrders.filter(function (row) {
        return orderId(row) !== id;
      }));
      state.offPremiseOrder = pickupOrder;
      state.pickupOrdersSignatureV78 = '';
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

      /* PMD_QPOS_LOCAL_OCCUPIED_V73
       * A successful dine-in save should color the table Busy immediately;
       * the live heartbeat then confirms the authoritative physical state. */
      if (snapshot.serviceMode === 'dine_in' && snapshot.tableId) {
        markSelectedTableOccupiedV73(snapshot.tableId);
      }

      renderAll();
      requestLiveSyncV73(0);

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
          state.liveSelectedSignatureV73 = '';
          loadTable(snapshot.tableId, true);
        }, 0);
      } else if (snapshot.serviceMode === 'takeaway') {
        setTimeout(function () {
          state.pickupOrdersSignatureV78 = '';
          loadPickupOrdersV78(true);
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
    state.orderSelectionExplicitV72 = false;
    state.lastQuantityUndoV72 = null;
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
      /* PMD_QPOS_SIMPLE_OPTIONS_V72
       * The cashier only needs the option group and tap targets here. Product
       * description/allergen prose stays out of this fast ordering surface. */
      meta.textContent = '';
      meta.hidden = true;
    }

    if (box) {
      box.innerHTML = (item.options || []).map(function (group) {
        var selected = state.modifier.selected[String(group.id)] || [];

        return (
          '<section class="pmd-qpos-option-group">' +
            '<header><strong>' + esc(group.name) + '</strong></header>' +
            '<div class="pmd-qpos-option-grid">' +
              (group.values || []).map(function (value) {
                var active = selected.indexOf(Number(value.id)) !== -1;
                return (
                  '<button type="button" class="pmd-qpos-option' + (active ? ' is-selected' : '') + '"' +
                    ' data-option-group="' + esc(group.id) + '"' +
                    ' data-option-value="' + esc(value.id) + '">' +
                    '<b>' + esc(value.name) + '</b>' +
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
    closeTextKeyboard();

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
    var dineInVisit =
      state.serviceMode === 'dine_in' &&
      !!state.selectedTable;
    var pickupVisit =
      state.serviceMode === 'takeaway';

    if ((dineInVisit || pickupVisit) && paidId > 0) {
      var paidOrder = activeOrder();
      if (paidOrder) {
        paidOrder.settlement_status = 'paid';
        paidOrder.settled_amount = Math.max(
          num(paidOrder.settled_amount, 0),
          orderTotal(paidOrder)
        );
        paidOrder.structural_locked = true;
        paidOrder.item_mutation = Object.assign(
          {},
          paidOrder.item_mutation || {},
          {
            allowed: false,
            locked: true,
            payment_started: true,
            reason: pickupVisit
              ? 'Payment completed. This Pickup stays visible until Kitchen marks it Ready.'
              : 'Payment completed. This bill stays visible until the table is made Free.'
          }
        );
      }

      /* PMD_QPOS_ACTIVE_VISIT_PAID_V78
       * Payment is financial state, not the check-rail exit. Table checks stay
       * until Ready/visit lifecycle and Pickup checks stay until KDS Ready. */
      state.activeOrderId = null;
      state.orderSelectionExplicitV72 = false;
      state.forceNewCheck = dineInVisit;
      state.lastQuantityUndoV72 = null;

      if (pickupVisit) {
        state.offPremiseOrder = null;
        state.pickupOrdersSignatureV78 = '';
      }
    } else {
      if (paidId > 0) {
        state.openOrders = state.openOrders.filter(function (row) {
          return orderId(row) !== paidId;
        });
      }
      state.activeOrderId = null;
      state.orderSelectionExplicitV72 = false;
      state.forceNewCheck = state.serviceMode === 'dine_in';
      state.lastQuantityUndoV72 = null;

      if (state.serviceMode !== 'dine_in') {
        state.offPremiseOrder = null;
      }
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

        var fiscalWarning = fiscalizationWarningV69(json);

        closePayment();
        finishPaidOrderUi();

        if (paidTableId) {
          setTimeout(function () {
            loadTable(paidTableId, true);
          }, 0);
        }

        toast(
          fiscalWarning || 'Paid',
          !!fiscalWarning
        );
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

  /* PMD_GERMANY_FISCAL_NOTICE_V69
   * Payment success and TSE success are intentionally separate. Never tell the
   * cashier that a fiscalization failure means the card/cash payment failed. */
  function fiscalizationWarningV69(payload) {
    var fiscal = payload && payload.fiscalization
      ? payload.fiscalization
      : null;

    if (!fiscal || fiscal.required !== true || fiscal.ok !== false) {
      return '';
    }

    return String(
      fiscal.message ||
      'Payment recorded. TSE fiscalization requires reconciliation.'
    );
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

        var fiscalWarning = fiscalizationWarningV69(result);

        closePayment();
        finishPaidOrderUi();
        toast(
          fiscalWarning ||
            (
              terminalTipPaid !== null && terminalTipPaid > 0.0001
                ? 'Paid · Tip ' + money(terminalTipPaid)
                : 'Paid'
            ),
          !!fiscalWarning
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
    /* PMD_QPOS_HISTORY_TABLE_RAIL_V88
     * History table browsing must not change the active POS table/check. */
    if (state.historyTargetScopeV88 === 'pickup') {
      return {scope: 'pickup', tableId: 0};
    }

    if (
      state.historyTargetScopeV88 === 'table' &&
      Number(state.historyTargetTableIdV88 || 0) > 0
    ) {
      return {
        scope: 'table',
        tableId: Number(state.historyTargetTableIdV88 || 0)
      };
    }

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
    closeHistoryMobileDetailV87();
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
    if (kind === 'attention') {
      return ['waiter_call', 'table_note'].indexOf(entryKind) !== -1;
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
      (calls ? '<span><b>' + esc(calls) + '</b> calls</span>' : '');
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
      title: 'History event',
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

    item.title = String(entry.title || 'History event')
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

  function historyItemSummaryMarkupV83(value) {
    return String(value || '')
      .split(',')
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean)
      .map(function (part) {
        return '<span class="pmd-qpos-history-item-chip-v83">' +
          esc(part) +
        '</span>';
      })
      .join('');
  }

  function renderHistoryDetail(orderId) {
    var detail = $('[data-qpos-history-detail]');
    if (!detail) return;

    orderId = Number(orderId || 0);
    state.historySelectedOrderId = orderId || null;

    if (!orderId || !state.historyData) {
      detail.innerHTML =
        '<div class="pmd-qpos-history-empty">' +
          'Select an order to see its payments and notes.' +
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

    var settlement = String(order.settlement_status || '').trim();
    var invoiceUrl = String(order.invoice_url || '');
    var invoiceReady =
      !!invoiceUrl &&
      ['paid', 'settled', 'closed'].indexOf(
        settlement.toLowerCase()
      ) !== -1;
    /* PMD_QPOS_HISTORY_DOCUMENT_ACTIONS_V75
     * Invoice opens the canonical document. Print uses the same document with
     * an explicit print request so browser/Desktop print handling stays on the
     * invoice page instead of duplicating receipt rendering inside Quick POS. */
    var printInvoiceUrl = invoiceReady
      ? invoiceUrl +
        (invoiceUrl.indexOf('?') === -1 ? '?' : '&') +
        'print=1'
      : '';
    var settlementLabel = historySettlementLabel(settlement);
    var settlementTone = historySettlementTone(settlement);
    var total = order.total != null ? money(order.total) : '';
    var itemSummary = String(order.item_summary || '').trim();
    var itemSummaryMarkupV83 = historyItemSummaryMarkupV83(itemSummary);
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

    /* PMD_QPOS_HISTORY_ORDER_CARD_V84
     * The order is the first section card, using the same visual grammar as
     * Payments. The old standalone "Order" eyebrow/header is intentionally gone. */
    detail.innerHTML =
      '<div class="pmd-qpos-history-sections pmd-qpos-history-sections-v84">' +
        '<section class="pmd-qpos-history-section pmd-qpos-history-order-card-v84">' +
          '<header>' +
            '<strong>#' + esc(orderId) + '</strong>' +
            (settlementLabel
              ? '<span class="pmd-qpos-history-order-status-v84 is-' +
                  esc(settlementTone) + '">' +
                  esc(settlementLabel) +
                '</span>'
              : '') +
          '</header>' +
          '<article class="pmd-qpos-history-order-event-v84">' +
            '<div class="pmd-qpos-history-simple-main pmd-qpos-history-order-main-v84">' +
              '<div>' +
                (total
                  ? '<strong>' + esc(total) + '</strong>'
                  : '') +
              '</div>' +
              '<time>' + esc(historyShortTime(order.time)) + '</time>' +
            '</div>' +
            (itemSummary
              ? '<div class="pmd-qpos-history-order-items-v84">' +
                  '<span>Items</span>' +
                  '<div class="pmd-qpos-history-item-chips-v83">' +
                    itemSummaryMarkupV83 +
                  '</div>' +
                '</div>'
              : '') +
            (orderNote
              ? '<div class="pmd-qpos-history-order-note-v84">' +
                  '<span>Note</span>' +
                  '<p>' + esc(orderNote) + '</p>' +
                '</div>'
              : '') +
            (invoiceReady
              ? '<div class="pmd-qpos-history-document-actions-v75 pmd-qpos-history-document-actions-v84">' +
                  '<a class="pmd-qpos-history-invoice" href="' + esc(invoiceUrl) +
                    '" target="_blank" rel="noopener">Invoice</a>' +
                  '<a class="pmd-qpos-history-invoice pmd-qpos-history-print-v75" href="' +
                    esc(printInvoiceUrl) +
                    '" target="_blank" rel="noopener">Print</a>' +
                '</div>'
              : '') +
          '</article>' +
        '</section>' +
        historySection('Payments', paymentEvents) +
        historySection('Notes & calls', noteEvents) +
      '</div>';
  }

  function historyListCompact(entry) {
    var kind = String(entry.kind || 'event');
    var orderId = Number(entry.order_id || 0);
    var title = String(entry.title || 'History event');
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

  async function markHistoryAttentionSeenV64(notificationId, kind, tableId, control) {
    notificationId = Number(notificationId || 0);
    tableId = Number(tableId || 0);
    if (!notificationId) return;

    if (control) {
      control.setAttribute('aria-busy', 'true');
      control.classList.add('is-loading');
    }

    try {
      var url = tokenUrl(
        state.settings.attention_seen_url ||
          '/admin/pos/attention/{notification}/seen',
        '{notification}',
        notificationId
      );

      await fetchJson(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: 'seen'})
      });

      /* PMD_QPOS_HISTORY_SEEN_SYNC_V64
       * Update this screen instantly. The server row is shared, so other
       * staff clients lose "new" on their next notification refresh too. */
      historyEntries(state.historyData).forEach(function (entry) {
        if (Number(entry.notification_id || 0) === notificationId) {
          entry.status = 'seen';
          entry.is_new = false;
          entry.seen_at = new Date().toISOString();
        }
      });

      if (tableId > 0) {
        state.tables = state.tables.map(function (table) {
          if (Number(table.id || 0) !== tableId) return table;

          var next = Object.assign({}, table);
          if (kind === 'waiter_call') {
            next.waiter_calls = Math.max(0, num(next.waiter_calls, 0) - 1);
          } else if (kind === 'table_note') {
            next.note_count = Math.max(0, num(next.note_count, 0) - 1);
          }

          /* PMD_QPOS_SEEN_DOES_NOT_FREE_V76
           * Seen acknowledges the service signal only. The physical visit stays
           * Busy until Cashier/Waiter explicitly presses Free. */
          if (next.derived_busy) {
            next.status = 'occupied';
          }

          return next;
        });

        if (
          state.selectedTable &&
          Number(state.selectedTable.id || 0) === tableId
        ) {
          var selectedFresh = state.tables.find(function (table) {
            return Number(table.id || 0) === tableId;
          });
          if (selectedFresh) {
            state.selectedTable = Object.assign(
              {},
              state.selectedTable,
              selectedFresh
            );
          }
        }
      }

      renderTables();
      renderHistory(state.historyData);
      toast('Seen');

      /* Keep the current bell/new-count in sync immediately. Other staff
       * clients receive the shared DB status on their normal notification poll. */
      fetchJson('/admin/notifications-api/count?_=' + Date.now())
        .then(function (countJson) {
          window.dispatchEvent(new CustomEvent('pmd:notification:count', {
            detail: {count: Math.max(0, num(countJson.new, 0))}
          }));
        })
        .catch(function () {});

      try {
        window.dispatchEvent(new CustomEvent('pmd:notification:seen', {
          detail: {
            notification_id: notificationId,
            table_id: tableId,
            kind: kind
          }
        }));
      } catch (ignored) {
      }

      // Reconcile against shared server authority without blocking the click.
      bootstrap(true);
    } catch (error) {
      toast(error.message || 'Could not mark as seen.', true);
      if (control) {
        control.removeAttribute('aria-busy');
        control.classList.remove('is-loading');
      }
    }
  }

  function historySearchMatchesV84(entry, query) {
    query = String(query || '').trim().toLowerCase();
    if (!query) return true;

    entry = entry || {};
    var compact = historyListCompact(entry);
    var values = [
      entry.order_id,
      entry.title,
      entry.detail,
      entry.item_summary,
      entry.note,
      entry.payment_method,
      entry.payment_note,
      entry.status_name,
      entry.settlement_status,
      entry.payer_label,
      compact.title,
      compact.line,
      compact.badge,
      formatHistoryTime(entry.time)
    ];

    return values
      .map(function (value) {
        return String(value == null ? '' : value).toLowerCase();
      })
      .join(' ')
      .indexOf(query) !== -1;
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

    /* PMD_QPOS_HISTORY_SEARCH_V84 */
    var historyQueryV84 = String(state.historySearch || '').trim();
    if (historyQueryV84) {
      entries = entries.filter(function (entry) {
        return historySearchMatchesV84(entry, historyQueryV84);
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
      var notificationId = Number(entry.notification_id || 0);
      var attentionKind =
        String(entry.kind || '') === 'waiter_call' ||
        String(entry.kind || '') === 'table_note';
      var isNewAttention =
        attentionKind &&
        notificationId > 0 &&
        (
          entry.is_new === true ||
          String(entry.status || '').toLowerCase() === 'new' ||
          String(entry.status || '') === ''
        );

      return (
        '<button type="button" class="pmd-qpos-history-entry pmd-qpos-history-entry-v20' +
          (selected ? ' is-selected' : '') +
          (isNewAttention ? ' is-new-attention is-new-' + esc(entry.kind || '') : '') + '"' +
          ' data-kind="' + esc(entry.kind || 'event') + '"' +
          (notificationId ? ' data-qpos-history-notification="' + esc(notificationId) + '"' : '') +
          (orderId ? ' data-qpos-history-order="' + esc(orderId) + '"' : '') + '>' +
          '<div class="pmd-qpos-history-entry-top">' +
            '<strong>' + esc(row.title) + '</strong>' +
            '<time>' + esc(historyShortTime(row.time)) + '</time>' +
          '</div>' +
          '<div class="pmd-qpos-history-entry-bottom">' +
            (row.line
              ? '<span>' + esc(row.line) + '</span>'
              : '') +
            (row.badge
              ? '<b class="is-' + esc(row.badgeTone) + '">' +
                  esc(row.badge) +
                '</b>'
              : '') +
            (isNewAttention
              ? '<span class="pmd-qpos-history-new-pill">NEW</span>' +
                '<span class="pmd-qpos-history-seen-action" role="button" tabindex="0"' +
                  ' data-qpos-history-seen="' + esc(notificationId) + '"' +
                  ' data-qpos-history-seen-kind="' + esc(entry.kind || '') + '"' +
                  ' data-qpos-history-seen-table="' + esc(Number(entry.table_id || 0)) + '">' +
                  'Seen' +
                '</span>'
              : '') +
          '</div>' +
        '</button>'
      );
    }).join('');

    $$('[data-qpos-history-seen]', list).forEach(function (control) {
      var runSeen = function (event) {
        event.preventDefault();
        event.stopPropagation();

        markHistoryAttentionSeenV64(
          control.getAttribute('data-qpos-history-seen'),
          control.getAttribute('data-qpos-history-seen-kind'),
          control.getAttribute('data-qpos-history-seen-table'),
          control
        );
      };

      control.onclick = runSeen;
      control.onkeydown = function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          runSeen(event);
        }
      };
    });

    $$('[data-qpos-history-order]', list).forEach(function (button) {
      button.onclick = function () {
        var orderId = Number(button.getAttribute('data-qpos-history-order') || 0);
        state.historySelectedOrderId = orderId || null;
        renderHistory(state.historyData);
        renderHistoryDetail(orderId);
        openHistoryMobileDetailV87();
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

    var from = state.historyFrom || '';
    var to = state.historyTo || '';

    return {
      requested: requested,
      selection: selection,
      from: from,
      to: to,
      key: [
        requested,
        selection.scope,
        Number(selection.tableId || 0),
        from,
        to
      ].join('|')
    };
  }

  /* PMD_QPOS_HISTORY_CACHE_V83 */
  var PMD_QPOS_HISTORY_CACHE_TTL_V83 = 30000;

  function historyContextForTableV83(tableId) {
    tableId = Number(tableId || 0);
    var from = state.historyFrom || '';
    var to = state.historyTo || '';

    return {
      requested: 'selected',
      selection: {scope: 'table', tableId: tableId},
      from: from,
      to: to,
      key: ['selected', 'table', tableId, from, to].join('|')
    };
  }

  function historyCacheGetV83(key) {
    key = String(key || '');
    var row = state.historyCacheV83[key];
    if (!row) return null;

    if (
      (Date.now() - Number(row.saved_at || 0)) >
      PMD_QPOS_HISTORY_CACHE_TTL_V83
    ) {
      delete state.historyCacheV83[key];
      return null;
    }

    return row.payload || null;
  }

  function historyCachePutV83(key, payload) {
    key = String(key || '');
    if (!key || !payload) return;

    state.historyCacheV83[key] = {
      saved_at: Date.now(),
      payload: payload
    };
  }

  function fetchHistoryContextV83(context, force) {
    if (!state.settings.history_url || !context) {
      return Promise.resolve(null);
    }

    var key = String(context.key || '');

    if (!force) {
      var cached = historyCacheGetV83(key);
      if (cached) return Promise.resolve(cached);
    }

    if (state.historyFetchesV83[key]) {
      return state.historyFetchesV83[key];
    }

    var url = String(state.settings.history_url);
    var params = new URLSearchParams();
    params.set('scope', context.selection.scope);
    params.set('limit', '500');

    if (context.selection.tableId) {
      params.set('table_id', String(context.selection.tableId));
    }
    if (context.from) params.set('from', context.from);
    if (context.to) params.set('to', context.to);

    var pending = fetchJson(
      url + '?' + params.toString() + '&_=' + Date.now()
    ).then(function (json) {
      historyCachePutV83(key, json);
      return json;
    }).finally(function () {
      delete state.historyFetchesV83[key];
    });

    state.historyFetchesV83[key] = pending;
    return pending;
  }

  function prefetchHistoryForTableV83(tableId) {
    tableId = Number(tableId || 0);
    if (!tableId) return;

    var modal = $('[data-qpos-history-modal]');
    if (!modal || !modal.classList.contains('is-open')) return;

    var context = historyContextForTableV83(tableId);
    if (
      historyCacheGetV83(context.key) ||
      state.historyFetchesV83[context.key]
    ) {
      return;
    }

    fetchHistoryContextV83(context, false).catch(function () {
      /* Opportunistic History prefetch has no user-facing error. */
    });
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
    renderHistoryTableRailV88();

    var list = $('[data-qpos-history-list]');
    var cachedHistoryV83 =
      options.cache === false
        ? null
        : historyCacheGetV83(requestKey);
    var preserveExisting =
      !!cachedHistoryV83 ||
      options.preserve === true ||
      (
        options.preserve !== false &&
        !!state.historyData
      );

    if (cachedHistoryV83) {
      state.historyDataKey = requestKey;
      renderHistory(cachedHistoryV83);
    } else if (list && !preserveExisting) {
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
      /* Always revalidate server authority after an instant cached paint. */
      var json = await fetchHistoryContextV83(context, true);

      if (
        requestSeq !== state.historyRequestSeq ||
        !json
      ) {
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

    ensureHistoryControlsV87();
    ensureHistoryTableRailV88();
    closeHistoryMobileDetailV87();
    syncHistoryMobileLayoutV87();

    if (!state.historyFrom && !state.historyTo) {
      setHistoryPreset(state.historyPreset || '7d', false);
    }

    var requested = String(scopeMode || 'selected');
    var context = historyRequestContext(requested);
    var hasCurrentData =
      !!state.historyData &&
      state.historyDataKey === context.key;

    /* PMD_QPOS_HISTORY_OPEN_IMMEDIATE_V77
     * Open the workspace before the network request. A cold History click now
     * paints immediately with its loading row instead of appearing to ignore
     * the operator until /admin/pos/history has finished. */
    root.classList.add('is-history-workspace');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    if (!hasCurrentData) {
      await loadHistory(requested, {preserve: false});
      return;
    }

    loadHistory(requested, {preserve: true});
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

      /* PMD_QPOS_VISIT_RELEASE_V71
       * Settled checks stay in the active table overview until this explicit
       * Free transition. At that point they become history-only immediately. */
      if (
        ['available', 'free'].indexOf(
          String(state.selectedTable.status || '').toLowerCase()
        ) !== -1
      ) {
        state.openOrders = state.openOrders.filter(function (order) {
          var settlement = String(order.settlement_status || '').toLowerCase();
          return ['paid', 'settled', 'closed'].indexOf(settlement) === -1;
        });

        if (
          state.activeOrderId &&
          !state.openOrders.some(function (order) {
            return orderId(order) === Number(state.activeOrderId);
          })
        ) {
          state.activeOrderId = state.openOrders.length
            ? orderId(state.openOrders[0])
            : null;
        }

        state.forceNewCheck =
          !!state.activeOrderId &&
          activeOrderStructuralLocked();
      }

      renderTables();
      renderContext();
      renderCart({orderSwitch: true});
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

  /* PMD_QPOS_MOBILE_HISTORY_V87
   * Mobile History is one viewport: controls stay visible, only the list
   * scrolls, and an explicit order tap opens a full-screen detail panel. */
  function isMobileHistoryV87() {
    return window.innerWidth <= 820;
  }

  function isMobileCartFlowV87() {
    return (
      window.innerWidth <= 820 ||
      root.classList.contains('is-portrait-v86')
    );
  }

  function closeHistoryMobileDetailV87() {
    var shell = $('.pmd-qpos-history-shell-v84');
    if (shell) shell.classList.remove('is-mobile-detail-v87');
  }

  function openHistoryMobileDetailV87() {
    if (!isMobileHistoryV87()) return;

    var shell = $('.pmd-qpos-history-shell-v84');
    var detail = $('[data-qpos-history-detail]');
    if (!shell || !detail) return;

    shell.classList.add('is-mobile-detail-v87');
    detail.scrollTop = 0;
  }

  function syncHistoryMobileLayoutV87() {
    var modal = $('[data-qpos-history-modal]');
    if (!modal) return;

    var shell = modal.querySelector('.pmd-qpos-history-shell-v84');
    var left = modal.querySelector('.pmd-qpos-history-left-card-v84');
    var center = modal.querySelector('.pmd-qpos-history-center-card-v84');
    var workbar = modal.querySelector('.pmd-qpos-history-workbar-v84');
    var list = modal.querySelector('[data-qpos-history-list]');
    var detail = modal.querySelector('[data-qpos-history-detail]');

    if (!shell || !left || !center || !workbar || !list || !detail) return;

    if (isMobileHistoryV87()) {
      if (workbar.parentNode !== left) {
        left.insertBefore(workbar, list);
      }
    } else {
      if (workbar.parentNode !== center) {
        center.insertBefore(workbar, detail);
      }
      shell.classList.remove('is-mobile-detail-v87');
    }
  }

  function ensureHistoryControlsV87() {
    var modal = $('[data-qpos-history-modal]');
    if (!modal) return;

    var shell = modal.querySelector('.pmd-qpos-history-shell-v84');
    var left = modal.querySelector('.pmd-qpos-history-left-card-v84');
    var center = modal.querySelector('.pmd-qpos-history-center-card-v84');

    if (!shell || !left || !center) return;

    var tabs = left.querySelector('.pmd-qpos-history-kind-tabs-v82');
    var scope = left.querySelector('.pmd-qpos-history-scope-v87');

    if (!scope && tabs) {
      scope = document.createElement('div');
      scope.className = 'pmd-qpos-history-scope-v87';
      scope.innerHTML =
        '<button type="button" data-qpos-history-scope="selected">Selected table</button>' +
        '<button type="button" data-qpos-history-scope="all">All tables</button>';
      tabs.insertAdjacentElement('afterend', scope);
    }

    var back = center.querySelector('[data-qpos-history-mobile-back]');
    if (!back) {
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'pmd-qpos-history-mobile-back-v87';
      back.setAttribute('data-qpos-history-mobile-back', '');
      back.textContent = '← History';
      center.insertBefore(back, center.firstChild);
    }

    back.onclick = function () {
      closeHistoryMobileDetailV87();
    };

    syncHistoryMobileLayoutV87();
  }

  /* PMD_QPOS_HISTORY_TABLE_RAIL_V88
   * Mobile History gets the same physical-table context operators expect from
   * the POS rail. Browsing History never changes the live check/table. */
  function historyRailTablesV88() {
    return (state.tables || []).slice().sort(function (a, b) {
      var af = String(a.floor_name || a.floor_id || '');
      var bf = String(b.floor_name || b.floor_id || '');
      if (af !== bf) return af.localeCompare(bf, undefined, {numeric: true});

      return String(compactTableLabel(a)).localeCompare(
        String(compactTableLabel(b)),
        undefined,
        {numeric: true}
      );
    });
  }

  function renderHistoryTableRailV88() {
    var modal = $('[data-qpos-history-modal]');
    if (!modal) return;

    var rail = modal.querySelector('[data-qpos-history-table-rail-v88]');
    if (!rail) return;

    var allMode = String(state.historyScope || '') === 'all';
    var targetScope = String(state.historyTargetScopeV88 || '');
    var targetTableId = Number(state.historyTargetTableIdV88 || 0);
    var currentTableId =
      !targetScope && state.selectedTable
        ? Number(state.selectedTable.id || 0)
        : 0;
    var pickupActive =
      !allMode &&
      (
        targetScope === 'pickup' ||
        (!targetScope && state.serviceMode === 'takeaway')
      );

    var rows = [
      '<button type="button"' +
        ' data-qpos-history-pickup-v88' +
        (pickupActive ? ' class="is-active"' : '') +
        '>Pickup</button>'
    ];

    historyRailTablesV88().forEach(function (table) {
      var id = Number(table.id || 0);
      if (!id) return;

      var active =
        !allMode &&
        (
          (targetScope === 'table' && targetTableId === id) ||
          (!targetScope && currentTableId === id)
        );
      var busy = effectiveTableStatusV62(table) !== 'available';

      rows.push(
        '<button type="button" data-qpos-history-table-v88="' + esc(id) + '"' +
          ' class="' +
            (active ? 'is-active' : '') +
            (busy ? (active ? ' is-busy' : 'is-busy') : '') +
          '">' +
          esc(compactTableLabel(table)) +
        '</button>'
      );
    });

    rail.innerHTML = rows.join('');

    var pickup = rail.querySelector('[data-qpos-history-pickup-v88]');
    if (pickup) {
      pickup.onclick = function () {
        state.historyTargetScopeV88 = 'pickup';
        state.historyTargetTableIdV88 = 0;
        state.historySelectedOrderId = null;
        closeHistoryMobileDetailV87();
        renderHistoryTableRailV88();
        loadHistory('selected', {preserve: false});
      };
    }

    Array.prototype.slice.call(
      rail.querySelectorAll('[data-qpos-history-table-v88]')
    ).forEach(function (button) {
      button.onclick = function () {
        var id = Number(
          button.getAttribute('data-qpos-history-table-v88') || 0
        );
        if (!id) return;

        state.historyTargetScopeV88 = 'table';
        state.historyTargetTableIdV88 = id;
        state.historySelectedOrderId = null;
        closeHistoryMobileDetailV87();
        renderHistoryTableRailV88();
        loadHistory('selected', {preserve: false});
      };
    });
  }

  function ensureHistoryTableRailV88() {
    var modal = $('[data-qpos-history-modal]');
    if (!modal) return;

    var left = modal.querySelector('.pmd-qpos-history-left-card-v84');
    var scope = modal.querySelector('.pmd-qpos-history-scope-v87');
    if (!left || !scope) return;

    var rail = modal.querySelector('[data-qpos-history-table-rail-v88]');
    if (!rail) {
      rail = document.createElement('div');
      rail.className = 'pmd-qpos-history-table-rail-v88';
      rail.setAttribute('data-qpos-history-table-rail-v88', '');
      scope.insertAdjacentElement('afterend', rail);
    }

    renderHistoryTableRailV88();
  }

  /* Binding */
  function bind() {
    ensureHistoryTableRailV88();
    ensureHistoryControlsV87();
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
        scheduleNativeUiDraftV18();
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
        if (isMobileCartFlowV87()) {
          cart.classList.remove('is-mobile-open');
          if (cart.scrollIntoView) {
            cart.scrollIntoView({behavior: 'smooth', block: 'start'});
          }
          return;
        }

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
      setHistoryKindV57('orders');
      openHistory('selected');
    };
    if (historyClose) historyClose.onclick = closeHistory;
    if (historyModal) historyModal.addEventListener('click', function (event) {
      if (event.target === historyModal) closeHistory();
    });

    $$('[data-qpos-history-scope]').forEach(function (button) {
      button.onclick = function () {
        var requested =
          button.getAttribute('data-qpos-history-scope') || 'selected';

        state.historyTargetScopeV88 = '';
        state.historyTargetTableIdV88 = 0;
        state.historySelectedOrderId = null;
        closeHistoryMobileDetailV87();
        renderHistoryTableRailV88();
        loadHistory(requested, {preserve: false});
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

    /* PMD_QPOS_INIT_BINDINGS_SAFE_V63
     * $() returns one element; history kind buttons are a collection. */
    $$('[data-qpos-history-kind]').forEach(function (button) {
      button.onclick = function () {
        setHistoryKindV57(
          button.getAttribute('data-qpos-history-kind') || 'orders'
        );
      };
    });

    var historyFrom = $('[data-qpos-history-from]');
    var historyTo = $('[data-qpos-history-to]');
    var historySearchV84 = $('[data-qpos-history-search]');

    if (historySearchV84) {
      historySearchV84.oninput = function () {
        state.historySearch = String(historySearchV84.value || '');

        if (state.historyData) {
          state.historySelectedOrderId = null;
          renderHistory(state.historyData);
        }
      };
    }

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
    window.addEventListener('resize', syncHistoryMobileLayoutV87, {passive: true});

    /* PMD_QPOS_ORIENTATION_BINDINGS_V86 */
    releaseWebOrientationLockV86();
    syncOrientationV86();

    window.addEventListener('resize', syncOrientationV86, {passive: true});
    window.addEventListener('orientationchange', function () {
      releaseWebOrientationLockV86();
      window.setTimeout(syncOrientationV86, 80);
      window.setTimeout(syncOrientationV86, 260);
    }, {passive: true});

    if (
      window.screen &&
      window.screen.orientation &&
      typeof window.screen.orientation.addEventListener === 'function'
    ) {
      window.screen.orientation.addEventListener('change', syncOrientationV86);
    }

    /* PMD_QPOS_GUIDE_AUTO_CLOSE_V57
     * One outside/inside action is enough: any pointer action away from the
     * summary toggle closes the guide before the requested action continues. */
    document.addEventListener('pointerdown', function (event) {
      Array.prototype.slice.call(
        document.querySelectorAll('.pmd-qpos-guide-menu[open]')
      ).forEach(function (guide) {
        var toggle = guide.querySelector('.pmd-qpos-guide-toggle');
        if (
          toggle &&
          (
            event.target === toggle ||
            (toggle.contains && toggle.contains(event.target))
          )
        ) {
          return;
        }
        guide.open = false;
      });
    }, true);

    /* PMD_QPOS_MANUAL_ACTIVITY_PAUSE_V62
     * Any real operator activity postpones attention auto-return. Programmatic
     * rail scrolling does not emit these input events, so it cannot self-pause. */
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (eventName) {
      document.addEventListener(eventName, function () {
        if (state.attentionScrollFrame) {
          window.cancelAnimationFrame(state.attentionScrollFrame);
          state.attentionScrollFrame = null;
        }
        pauseAttentionCycleV57(2800);
      }, {passive: true, capture: true});
    });

    document.addEventListener('keydown', function () {
      pauseAttentionCycleV57(2800);
    }, true);

    window.addEventListener(
      'pmd:notification:new',
      applyPushAttentionV57
    );

    window.addEventListener('pmd:notification:new', function () {
      requestLiveSyncV73(120);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        stopLiveSyncTimerV73();
        stopAttentionCycleTimerV79();
        return;
      }
      requestLiveSyncV73(0);
      scheduleAttentionCycleV79();
    });

    window.addEventListener('focus', function () {
      requestLiveSyncV73(0);
    });

    window.addEventListener('beforeunload', function () {
      stopLiveSyncTimerV73();
      stopAttentionCycleTimerV79();
      if (state.attentionResumeTimer) {
        window.clearTimeout(state.attentionResumeTimer);
        state.attentionResumeTimer = null;
      }
      if (state.attentionScrollFrame) {
        window.cancelAnimationFrame(state.attentionScrollFrame);
        state.attentionScrollFrame = null;
      }
    });

    startAttentionCycleV57();

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
  startLiveSyncV73();

  if (!hasInlineBootstrap) {
    bootstrap(true);
  }

  window.PMDQuickPOSV1 = {
    state: state,
    refresh: function () { return bootstrap(false); },
    refreshLive: function () { return refreshLiveStateV73(true); },
    selectTable: selectTable,
    newCheck: newCheck,
    openPayment: openPayment,
    openFloorMap: openFloorMap,

    // PMD_QPOS_NATIVE_TRANSPORT_ONLY_SWITCH_V18
    // Connectivity changes never replace/reload this canonical UI.
    setNativeOffline: function (enabled) {
      window.__PMD_NATIVE_OFFLINE__ = enabled === true;
      setOnline(!window.__PMD_NATIVE_OFFLINE__);
      root.classList.toggle(
        'is-native-offline',
        window.__PMD_NATIVE_OFFLINE__
      );
      hideToast();

      if (window.__PMD_NATIVE_OFFLINE__) {
        persistNativeUiDraftV18();
        stopLiveSyncTimerV73();
        try {
          if (
            window.pushNotif &&
            typeof window.pushNotif.stopListening === 'function'
          ) {
            window.pushNotif.stopListening();
          }
        } catch (ignored) {}
      } else {
        state.liveSyncFailuresV73 = 0;
        state.liveTablesSignatureV73 = '';
        state.liveSelectedSignatureV73 = '';
        startLiveSyncV73();
        try {
          if (
            window.pushNotif &&
            typeof window.pushNotif.startListening === 'function'
          ) {
            window.pushNotif.startListening();
          }
        } catch (ignored) {}
      }

      return Promise.resolve(true);
    },
    refreshNativeState: function () {
      if (!nativeLocalTransportAvailable()) return Promise.resolve(false);

      return bootstrap(true).then(function (result) {
        // PMD_QPOS_NATIVE_DRAFT_RESTORE_BARRIER_V18
        // Cold-start cached HTML may contain an empty/stale server-rendered
        // cart. It must never overwrite the durable Android cart before the
        // local bootstrap has restored the cashier's exact unsent work.
        window.__PMD_NATIVE_UI_DRAFT_RESTORE_PENDING__ = false;
        persistNativeUiDraftV18();

        try {
          if (
            window.PayMyDineOffline &&
            typeof window.PayMyDineOffline.localUiReady === 'function'
          ) {
            window.PayMyDineOffline.localUiReady();
          }
        } catch (ignored) {}

        return result;
      }, function (error) {
        throw error;
      });
    },
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
