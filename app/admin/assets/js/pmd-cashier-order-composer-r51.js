// PMD_CASHIER_COMPOSER_CACHE_FRESH_R51
// PMD_CASHIER_R51_RAIL_DELIVERY_R52
// PMD_CASHIER_R54_TOUCH_PAYMENT
// PMD_CASHIER_R55A_STABLE_UI
// PMD_CASHIER_R56B_PAYMENT_RAIL
(function () {
  'use strict';

  // PMD_CASHIER_UI_R50

  // PMD_CASHIER_ORDER_COMPOSER_R41
  // PMD_CASHIER_COMPOSER_PRIMARY_R47
  // PMD_CASHIER_PAY_INVOICE_R48
  // PMD_CASHIER_INVOICE_ROUTE_R49
  //
  // Cashier-native create/edit ordering surface.
  // It reuses canonical Waiter JSON/save/payment authorities,
  // but NEVER mounts PMDWaiterPOSApp and NEVER injects waiter shell HTML.

  if (window.PMDCashierOrderComposerV1) return;

  var PMD_MENU_FALLBACK_IMAGE = '/brand/paymydine-logo.svg';

  var state = {
    shell: null,
    open: false,
    mode: 'create',
    table: null,
    tables: [],
    boot: null,
    settings: {},
    menu: [],
    categories: [],
    openOrders: [],
    activeOrderId: null,
    desiredOrderId: null,
    existingOrder: null,
    deliveryMode: false,
    deliveryLocationId: null,
    railView: 'new',
    invoiceReady: false,
    search: '',
    category: 'all',
    cart: [],
    guestCount: 1,
    note: '',
    loading: false,
    submitting: false,
    product: null,
    productQty: 1,
    productNote: '',
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
      idempotencyKey: uid('pay')
    },
    paymentApi: null,
    paymentAssetsPromise: null,
    lastError: null
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c];
    });
  }

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return String(prefix || 'pmd') + ':' + window.crypto.randomUUID();
    }

    return String(prefix || 'pmd') + ':' +
      Date.now() + ':' + Math.random().toString(36).slice(2);
  }

  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function roundMoney(value) {
    return Math.round((num(value, 0) + Number.EPSILON) * 100) / 100;
  }

  function money(value) {
    return (state.settings.currency || '€') + roundMoney(value).toFixed(2);
  }

  function paymentSummaryIsPaid() {
    var summary =
      state.payment &&
      state.payment.summary;

    var settlement =
      summary &&
      summary.settlement;

    if (!settlement) {
      return false;
    }

    var status = String(
      (
        summary.order &&
        summary.order.settlement_status
      ) ||
      settlement.status ||
      settlement.settlement_status ||
      ''
    ).toLowerCase();

    if (status === 'paid') {
      return true;
    }

    var total = num(
      settlement.order_total,
      0
    );

    var remaining = num(
      settlement.remaining_amount,
      total
    );

    return (
      total > 0 &&
      remaining <= 0.005
    );
  }

  function replaceOrderToken(template, orderId) {
    return String(template || '').replace(
      '{order}',
      encodeURIComponent(String(orderId || ''))
    );
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function rootQuery(selector, parent) {
    return (parent || state.shell || document).querySelector(selector);
  }

  function rootQueryAll(selector, parent) {
    return Array.prototype.slice.call(
      (parent || state.shell || document).querySelectorAll(selector)
    );
  }

  async function fetchJson(url, options) {
    var opts = Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      }
    }, options || {});

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

  function toast(message, error) {
    var el = rootQuery('[data-coc-toast]');
    if (!el) return;

    el.textContent = String(message || '');
    el.classList.toggle('is-error', !!error);
    el.classList.add('is-show');

    clearTimeout(el.__pmdTimer);

    el.__pmdTimer = setTimeout(function () {
      el.classList.remove('is-show');
    }, 3600);
  }

  function showSuccess(message) {
    toast(message || 'Done');
  }

  function clearCashierBusy() {
    if (!state.shell) return;

    state.shell.classList.remove(
      'is-coc-initial-loading',
      'is-coc-silent-loading'
    );
  }

  function setBusy(message) {
    state.loading = true;

    if (state.shell) {
      state.shell.classList.add(
        'is-coc-silent-loading'
      );
    }
  }

  function setError(error) {
    state.loading = false;
    clearCashierBusy();
    state.lastError = error;

    var body = rootQuery('[data-coc-main]');
    if (!body) return;

    body.innerHTML = [
      '<div class="pmd-coc-error">',
        '<strong>Could not open the order composer.</strong>',
        '<p>', esc(error && error.message ? error.message : error), '</p>',
        '<button type="button" data-coc-retry>Retry</button>',
      '</div>'
    ].join('');

    var retry = rootQuery('[data-coc-retry]', body);

    if (retry) {
      retry.onclick = function () {
        if (state.mode === 'edit' && state.desiredOrderId) {
          openEdit(state.desiredOrderId);
        } else {
          openCreate();
        }
      };
    }

    updateFooter();
  }

  function injectStyle(path, key) {
    if (document.querySelector('link[' + key + ']')) return;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path;
    link.setAttribute(key, '1');
    document.head.appendChild(link);
  }

  async function injectScript(path, globalKey) {
    if (globalKey && window[globalKey]) return;

    var existing = Array.prototype.slice.call(
      document.querySelectorAll('script[src]')
    ).find(function (script) {
      return String(script.src || '').indexOf(path) !== -1;
    });

    if (existing) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 0);
      });

      if (!globalKey || window[globalKey]) return;
    }

    await new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = path + (path.indexOf('?') === -1 ? '?v=r41' : '&v=r41');
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Could not load ' + path));
      };
      document.head.appendChild(script);
    });
  }

  // PMD_CASHIER_PAYMENT_V3_AUTHORITY_FINAL
  // Cashier owns the shell, while the canonical staff payment engine is V3.
  // Never instantiate the legacy V2 engine here: it exposes provider/customer
  // methods that do not belong in the waiter/cashier payment surface.
  async function ensurePaymentAssets() {
    if (state.paymentAssetsPromise) return state.paymentAssetsPromise;

    state.paymentAssetsPromise = (async function () {
      function hasStyle(path) {
        return Array.prototype.slice.call(document.querySelectorAll('link[href]')).some(function (link) {
          return String(link.href || '').indexOf(path) !== -1;
        });
      }

      function ensureStyle(path, key) {
        if (hasStyle(path)) return;
        injectStyle(path, key);
      }

      function loadFreshScript(path, cacheKey) {
        return new Promise(function (resolve, reject) {
          var script = document.createElement('script');
          script.src = path + '?v=' + encodeURIComponent(cacheKey);
          script.async = false;
          script.onload = resolve;
          script.onerror = function () {
            reject(new Error('Could not load ' + path));
          };
          document.head.appendChild(script);
        });
      }

      ensureStyle(
        '/app/admin/assets/css/pmd-waiter-pos-v1.css',
        'data-pmd-coc-payment-style'
      );
      ensureStyle(
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css',
        'data-pmd-coc-payment-clean-style'
      );
      ensureStyle(
        '/app/admin/assets/css/pmd-payment-simple-v1.css',
        'data-pmd-coc-payment-simple-style'
      );

      // PMD_CASHIER_PAYMENT_FRESH_R56B
      //
      // Cashier must not reuse a stale V3 object left by
      // an earlier global asset.
      if (
        !window.PMDWaiterPOSPaymentV2 ||
        window.PMDWaiterPOSPaymentV2.__pmdCashierR56B !== true
      ) {
        window.__PMDCashierForcePaymentV3R56B = true;

        try {
          await loadFreshScript(
            '/app/admin/assets/js/pmd-waiter-pos-payment-v3.js',
            'cashier-payment-v3-r56b-20260825'
          );
        } finally {
          try {
            delete window.__PMDCashierForcePaymentV3R56B;
          } catch (_) {
            window.__PMDCashierForcePaymentV3R56B = false;
          }
        }
      }

      // The Cashier must install V3 itself if global asset ordering has not
      // established it yet. An old PMDWaiterPOSPaymentV2 global is NOT enough.
      if (
        !window.PMDWaiterPOSPaymentV2 ||
        window.PMDWaiterPOSPaymentV2.__pmdV3 !== true
      ) {
        await loadFreshScript(
          '/app/admin/assets/js/pmd-waiter-pos-payment-v3.js',
          'cashier-payment-v3-final'
        );
      }

      if (
        !window.PMDWaiterPOSPaymentV2 ||
        window.PMDWaiterPOSPaymentV2.__pmdV3 !== true ||
        typeof window.PMDWaiterPOSPaymentV2.install !== 'function'
      ) {
        throw new Error('Canonical staff Payment V3 is unavailable.');
      }

      // If a policy tag executed earlier against an old module, execute the
      // same canonical policy once more against the now-authoritative V3.
      if (!window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped) {
        await loadFreshScript(
          '/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js',
          'cashier-payment-policy-r56b-20260825'
        );
      }

      if (!window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped) {
        throw new Error('Canonical staff payment policy is unavailable.');
      }
    })();

    return state.paymentAssetsPromise;
  }

  function paymentMarkup() {
    return [
      '<div class="pmd-pos-payment-modal" data-pos-payment-modal aria-hidden="true">',
        '<div class="pmd-pos-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-coc-payment-title">',
          '<header class="pmd-pos-payment-head">',
            '<div>',
              '<span class="pmd-pos-payment-eyebrow">PAYMENT CENTER</span>',
              '<h2 id="pmd-coc-payment-title">Pay</h2>',
              '<p data-pos-payment-subtitle></p>',
            '</div>',
            '<button type="button" class="pmd-pos-payment-close" data-pos-payment-close aria-label="Close payment">×</button>',
          '</header>',

          '<div class="pmd-pos-payment-body">',
            '<section class="pmd-pos-payment-main">',
              '<div class="pmd-pos-payment-balance" data-pos-payment-balance></div>',

              '<div class="pmd-pos-payment-block">',
                '<div class="pmd-pos-payment-block-title"><b>Split bill</b><span>Choose what this payer covers</span></div>',
                '<div class="pmd-pos-split-tabs" data-pos-split-tabs>',
                  '<button type="button" class="is-active" data-split-mode="full">Full bill</button>',
                  '<button type="button" data-split-mode="equal">Equally</button>',
                  '<button type="button" data-split-mode="items">By items</button>',
                  '<button type="button" data-split-mode="custom">Custom</button>',
                '</div>',
                '<div class="pmd-pos-split-panel" data-pos-split-panel></div>',
              '</div>',

              '<div class="pmd-pos-payment-block">',
                '<div class="pmd-pos-payment-block-title"><b>Payment method</b><span>Only configured methods are shown</span></div>',
                '<div class="pmd-pos-method-grid" data-pos-methods></div>',
                '<div class="pmd-pos-online-box" data-pos-online-box hidden></div>',
                '<div class="pmd-pos-terminal-box" data-pos-terminal-box hidden></div>',
              '</div>',

              '<div class="pmd-pos-payment-block pmd-pos-adjustments">',
                '<div>',
                  '<div class="pmd-pos-payment-block-title"><b>Tip</b><span>Optional</span></div>',
                  '<div class="pmd-pos-tip-buttons" data-pos-tip-buttons>',
                    '<button type="button" class="is-active" data-tip-percent="0">No tip</button>',
                    '<button type="button" data-tip-percent="5">5%</button>',
                    '<button type="button" data-tip-percent="10">10%</button>',
                    '<button type="button" data-tip-percent="custom">Custom</button>',
                  '</div>',
                  '<input type="number" min="0" step="0.01" class="pmd-pos-payment-input" data-pos-custom-tip placeholder="Custom tip" hidden>',
                '</div>',

                '<div>',
                  '<div class="pmd-pos-payment-block-title"><b>Coupon</b><span>Full remaining balance only</span></div>',
                  '<div class="pmd-pos-coupon-row">',
                    '<input type="text" class="pmd-pos-payment-input" data-pos-coupon-code placeholder="Coupon code" autocomplete="off">',
                    '<button type="button" data-pos-coupon-apply>Apply</button>',
                  '</div>',
                  '<div class="pmd-pos-coupon-result" data-pos-coupon-result></div>',
                '</div>',
              '</div>',

              '<div class="pmd-pos-payment-block" data-pos-collection-fields>',
                '<div class="pmd-pos-payment-fields">',
                  '<label><span>Payer / guest label</span><input type="text" class="pmd-pos-payment-input" data-pos-payer-label placeholder="Guest 1, Anna, Seat 2…"></label>',
                  '<label data-pos-reference-field hidden><span>Terminal approval / receipt reference</span><input type="text" class="pmd-pos-payment-input" data-pos-payment-reference placeholder="Required for external terminal"></label>',
                  '<div class="pmd-cashier-cash-field" data-pos-cash-field>',
                    '<div class="pmd-cashier-cash-title">Cash received</div>',

                    '<input type="text" inputmode="decimal" autocomplete="off" class="pmd-pos-payment-input pmd-cashier-cash-input" data-pos-cash-received>',

                    '<div class="pmd-cashier-keypad" data-cash-keypad>',
                      '<button type="button" data-cash-key="1">1</button>',
                      '<button type="button" data-cash-key="2">2</button>',
                      '<button type="button" data-cash-key="3">3</button>',

                      '<button type="button" data-cash-key="4">4</button>',
                      '<button type="button" data-cash-key="5">5</button>',
                      '<button type="button" data-cash-key="6">6</button>',

                      '<button type="button" data-cash-key="7">7</button>',
                      '<button type="button" data-cash-key="8">8</button>',
                      '<button type="button" data-cash-key="9">9</button>',

                      '<button type="button" data-cash-action="decimal">.</button>',
                      '<button type="button" data-cash-key="0">0</button>',
                      '<button type="button" data-cash-action="backspace" aria-label="Backspace">⌫</button>',
                    '</div>',

                    '<div class="pmd-cashier-tenders">',
                      '<button type="button" data-cash-action="exact">Exact</button>',
                      '<button type="button" data-cash-tender="5">€5</button>',
                      '<button type="button" data-cash-tender="10">€10</button>',
                      '<button type="button" data-cash-tender="20">€20</button>',
                      '<button type="button" data-cash-tender="50">€50</button>',
                    '</div>',
                  '</div>',
                '</div>',
                '<label class="pmd-pos-confirm-row" data-pos-external-confirm-row hidden><input type="checkbox" data-pos-external-confirm> I confirm the external terminal approved this exact amount.</label>',
              '</div>',
            '</section>',

            '<aside class="pmd-pos-payment-summary">',
              '<h3>Payment summary</h3>',
              '<div data-pos-payment-totals></div>',
              '<div class="pmd-pos-change-box" data-pos-change-box hidden></div>',
              '<button type="button" class="pmd-pos-pay-button" data-pos-pay-button>Pay</button>',
              '<button type="button" class="pmd-pos-payment-secondary" data-pos-copy-link>Copy customer payment link</button>',
              '<button type="button" class="pmd-pos-payment-secondary" data-pos-refresh-payment>Refresh payment status</button>',
              '<p class="pmd-pos-payment-safety">Online and direct-terminal payments are never marked successful without provider confirmation.</p>',

              '<div class="pmd-pos-payment-history-wrap">',
                '<div class="pmd-pos-payment-block-title"><b>Payment history</b><span data-pos-payment-history-count></span></div>',
                '<div class="pmd-pos-payment-history" data-pos-payment-history></div>',
              '</div>',
            '</aside>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function ensureShell() {
    if (state.shell && document.body.contains(state.shell)) {
      return state.shell;
    }

    var shell = document.createElement('div');
    shell.id = 'pmd-cashier-order-composer-v1';
    shell.className = 'pmd-coc';
    shell.hidden = true;

    shell.innerHTML = [

      '<section class="pmd-coc__dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-coc-title">',
        '<header class="pmd-coc__head">',
          '<div class="pmd-coc__head-copy">',
            '<span class="pmd-coc__eyebrow">CASHIER · ORDER COMPOSER</span>',
            '<h2 id="pmd-coc-title" data-coc-title>New order</h2>',
            '<p data-coc-subtitle>Select a table and add items.</p>',
          '</div>',
          '<button type="button" class="pmd-coc__close" data-coc-close aria-label="Close">×</button>',
        '</header>',

        '<div class="pmd-coc__tablebar">',
          '<label>',
            '<span>Table</span>',
            '<select data-coc-table-select></select>',
          '</label>',
          '<div class="pmd-coc__order-context" data-coc-order-context></div>',
        '</div>',

        '<div class="pmd-coc__main" data-coc-main></div>',

        '<footer class="pmd-coc__footer">',
          '<div class="pmd-coc__footer-right">',
            '<button type="button" class="pmd-coc__secondary" data-coc-close>Close</button>',
            '<button type="button" class="pmd-coc__send pmd-coc__primary" data-coc-primary disabled>Confirm</button>',
          '</div>',
        '</footer>',
      '</section>',

      '<div class="pmd-coc-product" data-coc-product-modal hidden>',
        '<section class="pmd-coc-product__dialog" role="dialog" aria-modal="true">',
          '<header class="pmd-coc-product__head">',
            '<div>',
              '<span>FOOD DETAILS</span>',
              '<h3 data-coc-product-title>Item</h3>',
            '</div>',
            '<button type="button" data-coc-product-close aria-label="Close">×</button>',
          '</header>',
          '<div class="pmd-coc-product__body" data-coc-product-body></div>',
          '<footer class="pmd-coc-product__foot">',
            '<button type="button" class="pmd-coc__secondary" data-coc-product-close>Cancel</button>',
            '<button type="button" class="pmd-coc__send" data-coc-product-add>Add item</button>',
          '</footer>',
        '</section>',
      '</div>',

      paymentMarkup(),

      '<div class="pmd-coc-toast" data-coc-toast role="status" aria-live="polite"></div>'
    ].join('');

    document.body.appendChild(shell);
    state.shell = shell;

    shell.addEventListener('click', function (event) {
      if (event.target.closest('[data-coc-close]')) {
        event.preventDefault();
        closeComposer();
        return;
      }

      if (event.target.closest('[data-coc-product-close]')) {
        event.preventDefault();
        closeProduct();
        return;
      }

      if (event.target.closest('[data-coc-product-add]')) {
        event.preventDefault();
        confirmProduct();
        return;
      }

      if (event.target.closest('[data-coc-refresh]')) {
        event.preventDefault();

        if (state.table) {
          loadTable(
            state.table,
            state.activeOrderId,
            false
          );
        } else if (state.deliveryMode) {
          loadDelivery(
            state.activeOrderId || null
          );
        }

        return;
      }

      var primaryAction = event.target.closest('[data-coc-primary]');

      if (primaryAction) {
        event.preventDefault();

        if (
          state.invoiceReady &&
          state.activeOrderId
        ) {
          openInvoice();
        } else if (state.cart.length) {
          saveOrder('send');
        } else if (state.activeOrderId) {
          openPayment();
        }

        return;
      }

      if (event.target.closest('[data-coc-details]')) {
        event.preventDefault();
        openDetails();
        return;
      }

      if (event.target.closest('[data-coc-payment]')) {
        event.preventDefault();
        openPayment();
        return;
      }

      var submit = event.target.closest('[data-coc-submit]');

      if (submit) {
        event.preventDefault();
        saveOrder(submit.getAttribute('data-coc-submit'));
      }
    });

    var tableSelect = rootQuery('[data-coc-table-select]', shell);

    if (tableSelect) {
      tableSelect.addEventListener('change', function () {
        var id = Number(
          tableSelect.value || 0
        );

        var table = state.tables.find(function (row) {
          return Number(row.id) === id;
        });

        state.mode = 'create';
        state.desiredOrderId = null;
        state.activeOrderId = null;
        state.existingOrder = null;
        state.cart = [];
        state.note = '';
        state.invoiceReady = false;
        state.railView = 'new';

        if (!table) {
          loadDelivery(null);
          return;
        }

        loadTable(
          table,
          null,
          false
        );
      });
    }

    return shell;
  }

  function normalizeTable(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object' ? row.raw : {};

    var id = Number(
      row.dbTableId ||
      raw.table_id ||
      row.table_id ||
      row.id ||
      0
    );

    var number = String(
      row.number ||
      row.table_number ||
      row.table_no ||
      raw.table_no ||
      raw.table_number ||
      id ||
      ''
    ).trim();

    var name = String(
      row.name ||
      row.label ||
      row.table_label ||
      row.table_name ||
      raw.table_name ||
      raw.name ||
      (number ? ('Table ' + number) : '')
    ).trim();

    return {
      id: id,
      number: number,
      name: name || ('Table ' + (number || id)),
      capacity: Number(
        row.capacity ||
        raw.capacity ||
        raw.table_capacity ||
        raw.preferred_capacity ||
        raw.max_capacity ||
        0
      ),
      raw: raw
    };
  }

  function flattenDisplayTable(display) {
    if (!display) return [];

    if (display.isMergedView && Array.isArray(display.members)) {
      return display.members.map(normalizeTable).filter(function (row) {
        return row.id > 0;
      });
    }

    var one = normalizeTable(display);

    return one.id > 0 ? [one] : [];
  }

  function floorState() {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll('[data-pmd-floor]')
    );

    for (var i = 0; i < roots.length; i += 1) {
      var instance = roots[i].__pmdFloorV1;

      if (instance && typeof instance.getState === 'function') {
        try {
          return {
            root: roots[i],
            instance: instance,
            state: instance.getState() || {}
          };
        } catch (error) {
        }
      }
    }

    return null;
  }

  function collectFloorTables() {
    var info = floorState();
    var rows = [];

    if (
      info &&
      info.state &&
      Array.isArray(info.state.displayTables)
    ) {
      info.state.displayTables.forEach(function (display) {
        flattenDisplayTable(display).forEach(function (row) {
          rows.push(row);
        });
      });
    }

    var seen = {};

    return rows.filter(function (row) {
      if (!row.id || seen[row.id]) return false;
      seen[row.id] = true;
      return true;
    }).sort(function (a, b) {
      var an = num(a.number, a.id);
      var bn = num(b.number, b.id);

      if (an !== bn) return an - bn;

      return String(a.name).localeCompare(String(b.name));
    });
  }

  function selectedFloorTable() {
    var info = floorState();

    if (!info || !Array.isArray(info.state.displayTables)) return null;

    var selectedId = info.state.selectedDisplayId;

    if (selectedId == null || String(selectedId) === '') {
      var node = document.querySelector(
        '.pmd-floor-v1__table.is-selected[data-floor-table]'
      );

      if (node) {
        selectedId = node.getAttribute('data-floor-table');
      }
    }

    if (selectedId == null || String(selectedId) === '') return null;

    var display = info.state.displayTables.find(function (row) {
      return row && String(row.id) === String(selectedId);
    });

    if (!display) return null;

    var members = flattenDisplayTable(display);

    // One visual merged table can map to several database tables.
    // Never guess which member owns a new order.
    return members.length === 1 ? members[0] : null;
  }

  function renderTableOptions(preferredId) {
    var select = rootQuery('[data-coc-table-select]');
    if (!select) return;

    var floorTables = collectFloorTables();

    if (floorTables.length) {
      state.tables = floorTables;
    }

    var current = state.table;

    if (
      current &&
      current.id &&
      !state.tables.some(function (row) {
        return Number(row.id) === Number(current.id);
      })
    ) {
      state.tables.push(current);
    }

    state.tables.sort(function (a, b) {
      return num(a.number, a.id) - num(b.number, b.id);
    });

    select.innerHTML = [
      '<option value="">Delivery / no table</option>'
    ].concat(
      state.tables.map(function (table) {
        return [
          '<option value="', esc(table.id), '">',
            esc(table.name),
            table.number && table.name.indexOf(table.number) === -1
              ? ' · ' + esc(table.number)
              : '',
          '</option>'
        ].join('');
      })
    ).join('');

    if (preferredId) {
      select.value = String(preferredId);
    }
  }

  function openShell() {
    ensureShell();

    if (state.shell.hidden) {
      state.shell.classList.add(
        'is-coc-initial-loading'
      );
    }

    state.shell.hidden = false;
    state.open = true;

    document.documentElement.classList.add('pmd-coc-open');
    document.body.classList.add('pmd-coc-open');
  }

  function closeComposer(force) {
    if (!state.shell) return;

    if (
      !force &&
      state.cart.length &&
      !window.confirm('Close this order composer? Unsaved new items will be removed.')
    ) {
      return;
    }

    if (state.paymentApi && state.payment.open) {
      state.paymentApi.closePayment();
    }

    closeProduct();

    clearCashierBusy();
    state.shell.hidden = true;
    state.open = false;
    state.cart = [];
    state.note = '';
    state.product = null;

    document.documentElement.classList.remove('pmd-coc-open');
    document.body.classList.remove('pmd-coc-open');
  }

  // PMD_CASHIER_CANONICAL_TABLE_ROUTE_R44
  // /admin/pmd-waiter-pos-v1/data/{table} resolves by the physical DB table id.
  // Never prefer a human/display table number over that canonical id.
  function tableRouteKey(table) {
    if (!table) return '';

    var raw = table.raw && typeof table.raw === 'object'
      ? table.raw
      : {};

    var id = Number(
      table.id ||
      table.dbTableId ||
      raw.table_id ||
      0
    );

    if (id > 0) {
      return String(id);
    }

    // Compatibility only for old cards that truly have no canonical id.
    var number = String(table.number || '').trim();

    if (/^\d+$/.test(number) && Number(number) > 0) {
      return number;
    }

    return '';
  }

  function currentOrder() {
    if (!state.activeOrderId) return null;

    return state.openOrders.find(function (row) {
      return Number(row.order_id) === Number(state.activeOrderId);
    }) || null;
  }

  function applyBootstrap(boot, desiredOrderId) {
    state.boot = boot || {};
    state.settings = state.boot.settings || {};
    state.menu = Array.isArray(state.boot.menu_items)
      ? state.boot.menu_items
      : [];
    state.categories = Array.isArray(state.boot.categories)
      ? state.boot.categories
      : [];
    state.openOrders = Array.isArray(state.boot.open_orders)
      ? state.boot.open_orders
      : [];

    if (desiredOrderId) {
      var desired = state.openOrders.find(function (row) {
        return Number(row.order_id) === Number(desiredOrderId);
      });

      if (!desired) {
        return false;
      }

      state.activeOrderId = Number(desiredOrderId);
      state.existingOrder = desired;
    } else {
      var bootActive = Number(state.boot.active_order_id || 0);

      var active = state.openOrders.find(function (row) {
        return Number(row.order_id) === bootActive;
      }) || state.openOrders[0] || null;

      state.activeOrderId = active ? Number(active.order_id) : null;
      state.existingOrder = active;
    }

    state.guestCount = Math.max(
      1,
      num(
        state.existingOrder && state.existingOrder.guest_count,
        num(state.boot.table && state.boot.table.capacity, 1)
      )
    );

    state.category = 'all';
    state.search = '';

    return true;
  }

  async function loadDelivery(desiredOrderId) {
    state.table = null;
    state.deliveryMode = true;
    state.loading = true;
    state.lastError = null;

    if (!desiredOrderId) {
      state.activeOrderId = null;
      state.existingOrder = null;
      state.openOrders = [];
      state.invoiceReady = false;
      state.railView = 'new';
    }

    renderTableOptions();

    setBusy('Loading delivery menu…');

    try {
      if (!state.tables.length) {
        state.tables = collectFloorTables();
      }

      var sourceTable =
        state.tables.length
          ? state.tables[0]
          : null;

      if (!sourceTable) {
        throw new Error(
          'No active location menu source is available.'
        );
      }

      var key =
        tableRouteKey(sourceTable);

      if (!key) {
        throw new Error(
          'Delivery menu source has no canonical location reference.'
        );
      }

      /*
       * We read menu/catalogue/location from an existing physical
       * table endpoint, but deliberately discard its table/order state.
       * No fake table is ever written to the Delivery order.
       */
      var boot = await fetchJson(
        '/admin/pmd-waiter-pos-v1/data/' +
        encodeURIComponent(key) +
        '?_=' +
        Date.now()
      );

      state.boot = boot || {};

      state.settings = Object.assign(
        {},
        state.boot.settings || {},
        {
          save_url:
            '/admin/pmd-waiter-pos-v1/save-delivery',

          /*
           * Delivery has no physical table data endpoint.
           * refreshData() below owns its refresh through payment summary.
           */
          data_url: ''
        }
      );

      state.menu =
        Array.isArray(state.boot.menu_items)
          ? state.boot.menu_items
          : [];

      state.categories =
        Array.isArray(state.boot.categories)
          ? state.boot.categories
          : [];

      state.openOrders = [];
      state.existingOrder = null;

      state.deliveryLocationId = Number(
        (
          state.boot.table &&
          state.boot.table.location_id
        ) ||
        sourceTable.location_id ||
        (
          sourceTable.raw &&
          sourceTable.raw.location_id
        ) ||
        0
      );

      state.activeOrderId =
        Number(desiredOrderId || 0) ||
        null;

      state.desiredOrderId =
        state.activeOrderId;

      state.mode =
        state.activeOrderId
          ? 'edit'
          : 'create';

      state.guestCount =
        Math.max(
          1,
          num(state.guestCount, 1)
        );

      state.category = 'all';
      state.search = '';
      state.loading = false;

      await setupPaymentModule();

      renderTableOptions();

      if (state.activeOrderId) {
        await refreshDeliveryOrder(
          true,
          state.activeOrderId
        );
      } else {
        renderComposer();
      }

      return true;
    } catch (error) {
      setError(error);
      return false;
    }
  }

  async function loadTable(table, desiredOrderId, fallbackToDetails) {
    state.table = table;
    state.deliveryMode = false;
    state.deliveryLocationId = null;
    state.loading = true;
    state.lastError = null;
    state.invoiceReady = false;
    state.railView = 'new';

    renderTableOptions(
      table && table.id
    );

    setBusy(
      'Loading ' +
      (
        table && table.name
          ? table.name
          : 'table'
      ) +
      '…'
    );

    try {
      var key =
        tableRouteKey(table);

      if (!key) {
        throw new Error(
          'This table has no canonical database table reference.'
        );
      }

      var boot = await fetchJson(
        '/admin/pmd-waiter-pos-v1/data/' +
        encodeURIComponent(key) +
        '?_=' +
        Date.now()
      );

      if (boot.table) {
        state.table =
          normalizeTable(boot.table);
      }

      var editable =
        applyBootstrap(
          boot,
          desiredOrderId
        );

      if (
        !editable &&
        desiredOrderId
      ) {
        if (
          fallbackToDetails !== false &&
          window.PMDCashierOrderCenter &&
          typeof window.PMDCashierOrderCenter.open ===
            'function'
        ) {
          var id =
            Number(desiredOrderId);

          state.cart = [];

          closeComposer(true);

          window.PMDCashierOrderCenter.open(
            id
          );

          return false;
        }

        throw new Error(
          'Order #' +
          desiredOrderId +
          ' is no longer structurally editable.'
        );
      }

      state.loading = false;

      await setupPaymentModule();

      if (
        state.activeOrderId &&
        state.paymentApi &&
        typeof state.paymentApi.loadPaymentSummary ===
          'function'
      ) {
        await state.paymentApi.loadPaymentSummary(
          true
        );

        if (
          typeof paymentSummaryIsPaid ===
          'function'
        ) {
          state.invoiceReady =
            paymentSummaryIsPaid();
        }
      }

      renderTableOptions(
        state.table &&
        state.table.id
      );

      renderComposer();

      return true;
    } catch (error) {
      setError(error);
      return false;
    }
  }

  function renderChooseTable() {
    clearCashierBusy();
    return loadDelivery(null);
  }

  function foodBadges(item) {
    var rows = [];

    if (item.vegan) rows.push('Vegan');
    else if (item.vegetarian) rows.push('Vegetarian');

    if (item.halal) rows.push('Halal');
    if (item.is_bestseller) rows.push('Bestseller');
    if (item.is_chef_recommended) rows.push('Chef');

    return rows;
  }

  function filteredMenu() {
    var search = String(state.search || '').toLowerCase().trim();

    return state.menu.filter(function (item) {
      var categoryOk =
        state.category === 'all' ||
        (item.category_ids || [])
          .map(String)
          .indexOf(String(state.category)) !== -1;

      var allergens = (item.allergens || []).map(function (row) {
        return row.name || '';
      }).join(' ');

      var dietary = [
        item.halal ? 'halal' : '',
        item.vegetarian ? 'vegetarian' : '',
        item.vegan ? 'vegan' : '',
        item.is_bestseller ? 'bestseller' : '',
        item.is_chef_recommended ? 'chef recommended' : ''
      ].join(' ');

      var haystack = [
        item.name || '',
        item.description || '',
        (item.category_names || []).join(' '),
        allergens,
        dietary
      ].join(' ').toLowerCase();

      return categoryOk &&
        (!search || haystack.indexOf(search) !== -1);
    });
  }

  function syncRailTableSelect() {
    var source =
      rootQuery('[data-coc-table-select]');

    var rail =
      rootQuery('[data-coc-table-select-rail]');

    if (!source || !rail) {
      return;
    }

    rail.innerHTML =
      source.innerHTML;

    rail.value =
      source.value;

    rail.onchange = function () {
      source.value =
        rail.value;

      source.dispatchEvent(
        new Event(
          'change',
          {
            bubbles: true
          }
        )
      );
    };
  }

  function renderComposer() {
    clearCashierBusy();
    var title =
      rootQuery('[data-coc-title]');

    var subtitle =
      rootQuery('[data-coc-subtitle]');

    var context =
      rootQuery('[data-coc-order-context]');

    var body =
      rootQuery('[data-coc-main]');

    if (!body) return;

    if (title) {
      title.textContent =
        state.activeOrderId
          ? (
              'Order #' +
              state.activeOrderId
            )
          : (
              state.deliveryMode
                ? 'Delivery'
                : 'New order'
            );
    }

    if (subtitle) {
      subtitle.textContent = '';
      subtitle.hidden = true;
    }

    /*
     * Order number already exists in the Composer title.
     * Never repeat OPEN CHECK / NEW CHECK here.
     */
    if (context) {
      context.innerHTML = '';
      context.hidden = true;
    }

    body.innerHTML = [
      '<section class="pmd-coc__catalog">',
        '<div class="pmd-coc__tools">',
          '<label class="pmd-coc__search">',
            '<span aria-hidden="true">⌕</span>',
            '<input type="search" data-coc-search placeholder="Search food, drink, category, vegan, allergen…" autocomplete="off">',
          '</label>',
        '</div>',

        '<div class="pmd-coc__warning" data-coc-warning hidden></div>',
        '<nav class="pmd-coc__categories" data-coc-categories></nav>',
        '<div class="pmd-coc__menu" data-coc-menu></div>',
      '</section>',

      '<aside class="pmd-coc__cart">',

        /*
         * No CURRENT ORDER / Order # duplicate.
         * Only guest controls belong in this header.
         */
        '<div class="pmd-coc__cart-head pmd-coc__cart-head--simple">',
          '<label class="pmd-coc__rail-table">',
            '<small>Table</small>',
            '<select data-coc-table-select-rail></select>',
          '</label>',

          '<div class="pmd-coc__guest">',
            '<button type="button" data-coc-guest-minus>−</button>',
            '<span>',
              '<small>Guests</small>',
              '<b data-coc-guests>',
                esc(state.guestCount),
              '</b>',
            '</span>',
            '<button type="button" data-coc-guest-plus>+</button>',
          '</div>',
        '</div>',

        /*
         * Existing/sent items and unsent items no longer occupy
         * two permanent vertical sections.
         */
        '<div class="pmd-coc__rail-switch" role="tablist" aria-label="Order items">',
          '<button type="button" data-coc-rail-view="new" role="tab">',
            '<span>New items</span>',
            '<b data-coc-new-count>0</b>',
          '</button>',

          '<button type="button" data-coc-rail-view="sent" role="tab">',
            '<span>Sent items</span>',
            '<b data-coc-sent-count>0</b>',
          '</button>',
        '</div>',

        '<section class="pmd-coc__rail-pane" data-coc-rail-pane="new">',
          '<div data-coc-cart></div>',
        '</section>',

        '<section class="pmd-coc__rail-pane is-sent" data-coc-rail-pane="sent" hidden>',
          '<div data-coc-existing></div>',
        '</section>',

        '<label class="pmd-coc__note">',
          '<span>Note</span>',
          '<textarea data-coc-note maxlength="1000" placeholder="Add note…"></textarea>',
        '</label>',

        /*
         * New/unsent value stays separate from the payable
         * current bill until Send to kitchen succeeds.
         */
        '<div class="pmd-coc__totals">',
          '<div data-coc-new-total-row hidden>',
            '<span>Pending</span>',
            '<b data-coc-new-total>€0.00</b>',
          '</div>',

          '<div class="is-grand">',
            '<span data-coc-total-label>Pending total</span>',
            '<b data-coc-total>€0.00</b>',
          '</div>',
        '</div>',
      '</aside>'
    ].join('');

    bindComposerBody();
    syncRailTableSelect();
    renderCategories();
    renderMenu();
    renderExisting();
    renderCart();
    updateFooter();

    var warning =
      rootQuery('[data-coc-warning]');

    var hidden = num(
      state.boot &&
      state.boot.warnings &&
      state.boot.warnings.hidden_zero_price_items,
      0
    );

    if (
      warning &&
      hidden > 0
    ) {
      warning.hidden = false;

      warning.textContent =
        hidden +
        ' zero-price menu ' +
        (
          hidden === 1
            ? 'item is'
            : 'items are'
        ) +
        ' hidden until a valid price is configured.';
    }
  }

  function bindComposerBody() {
    var search = rootQuery('[data-coc-search]');

    if (search) {
      search.value = state.search;

      search.oninput = function () {
        state.search = search.value;
        renderMenu();
      };
    }

    var minus = rootQuery('[data-coc-guest-minus]');
    var plus = rootQuery('[data-coc-guest-plus]');

    if (minus) {
      minus.onclick = function () {
        state.guestCount = Math.max(1, state.guestCount - 1);

        var el = rootQuery('[data-coc-guests]');
        if (el) el.textContent = state.guestCount;
      };
    }

    if (plus) {
      plus.onclick = function () {
        state.guestCount = Math.min(99, state.guestCount + 1);

        var el = rootQuery('[data-coc-guests]');
        if (el) el.textContent = state.guestCount;
      };
    }

    var note = rootQuery('[data-coc-note]');

    if (note) {
      note.value = state.note;

      note.oninput = function () {
        state.note = note.value;
      };
    }
  }

  function renderCategories() {
    var nav = rootQuery('[data-coc-categories]');
    if (!nav) return;

    var rows = [{id: 'all', name: 'All'}].concat(state.categories || []);

    nav.innerHTML = rows.map(function (row) {
      var active = String(state.category) === String(row.id);

      return [
        '<button type="button" ',
          'class="', active ? 'is-active' : '', '" ',
          'data-coc-category="', esc(row.id), '">',
          esc(row.name || 'Menu'),
        '</button>'
      ].join('');
    }).join('');

    rootQueryAll('[data-coc-category]', nav).forEach(function (button) {
      button.onclick = function () {
        state.category = button.getAttribute('data-coc-category');
        renderCategories();
        renderMenu();
      };
    });
  }

  function renderMenu() {
    var container = rootQuery('[data-coc-menu]');
    if (!container) return;

    var items = filteredMenu();

    items.forEach(function (item) {
      if (
        !String(
          item.image || ''
        ).trim()
      ) {
        item.image =
          PMD_MENU_FALLBACK_IMAGE;
      }
    });

    if (!items.length) {
      container.innerHTML = [
        '<div class="pmd-coc-empty">',
          '<div>',
            '<strong>No menu items found</strong>',
            '<span>Try another category or search.</span>',
          '</div>',
        '</div>'
      ].join('');
      return;
    }

    container.innerHTML = items.map(function (item) {
      var badges = foodBadges(item);

      var categories = (item.category_names || [])
        .slice(0, 2)
        .join(' · ');

      var allergens = (item.allergens || []).map(function (row) {
        return row.name || '';
      }).filter(Boolean);

      return [
        '<article class="pmd-coc-food" data-coc-food="', esc(item.id), '" role="button" tabindex="0">',
          '<div class="pmd-coc-food__media">',
            item.image
              ? '<img src="' + esc(item.image) + '" alt="" loading="lazy" decoding="async" data-coc-food-image>'
              : '<span>' + esc(String(item.name || 'F').charAt(0).toUpperCase()) + '</span>',

            badges.length
              ? '<div class="pmd-coc-food__badges">' +
                  badges.map(function (badge) {
                    return '<em>' + esc(badge) + '</em>';
                  }).join('') +
                '</div>'
              : '',
          '</div>',

          '<div class="pmd-coc-food__body">',
            categories
              ? '<small class="pmd-coc-food__category">' + esc(categories) + '</small>'
              : '',

            '<strong>', esc(item.name || 'Food'), '</strong>',

            item.description
              ? '<p>' + esc(item.description) + '</p>'
              : '',

            '<div class="pmd-coc-food__facts">',
              num(item.prep_minutes, 0) > 0
                ? '<span>' + esc(item.prep_minutes) + ' min</span>'
                : '',

              item.calories != null && item.calories !== ''
                ? '<span>' + esc(item.calories) + ' kcal</span>'
                : '',

              allergens.length
                ? '<span>Allergens: ' +
                    esc(allergens.slice(0, 3).join(', ')) +
                    (allergens.length > 3 ? '…' : '') +
                  '</span>'
                : '',
            '</div>',

            '<div class="pmd-coc-food__foot">',
              '<b>', money(item.price), '</b>',
              '<span>＋</span>',
            '</div>',
          '</div>',
        '</article>'
      ].join('');
    }).join('');

    rootQueryAll('[data-coc-food-image]', container).forEach(function (img) {
      img.onerror = function () {
        if (
          String(
            img.getAttribute('src') || ''
          ).indexOf(
            PMD_MENU_FALLBACK_IMAGE
          ) === -1
        ) {
          img.src =
            PMD_MENU_FALLBACK_IMAGE;

          img.classList.add(
            'is-pmd-logo-fallback'
          );

          return;
        }

        img.style.display = 'none';
      };

      if (
        String(
          img.getAttribute('src') || ''
        ).indexOf(
          PMD_MENU_FALLBACK_IMAGE
        ) !== -1
      ) {
        img.classList.add(
          'is-pmd-logo-fallback'
        );
      }
    });

    rootQueryAll('[data-coc-food]', container).forEach(function (card) {
      function activate() {
        var id = Number(card.getAttribute('data-coc-food') || 0);

        var item = state.menu.find(function (row) {
          return Number(row.id) === id;
        });

        if (item) openProduct(item);
      }

      card.onclick = activate;

      card.onkeydown = function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate();
      };
    });
  }

  // PMD_CASHIER_LIVE_SYNC_R43
  function visibleOrderComment(value) {
    return String(value || '')
      .replace(/\s*\|\s*\[guest_session:[^\]]*\]/gi, '')
      .replace(/\[guest_session:[^\]]*\]/gi, '')
      .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
      .trim();
  }

  function renderExisting() {
    var box =
      rootQuery('[data-coc-existing]');

    if (!box) return;

    var order =
      currentOrder();

    if (!order) {
      box.innerHTML = [
        '<div class="pmd-coc-cart-empty">',
          '<div>',
            '<strong>No sent items yet</strong>',
            '<span>Send new items to the kitchen first.</span>',
          '</div>',
        '</div>'
      ].join('');

      return;
    }

    var items =
      Array.isArray(order.items)
        ? order.items
        : [];

    box.innerHTML = [
      '<div class="pmd-coc-existing pmd-coc-existing--simple">',

        items.length
          ? (
              '<div class="pmd-coc-existing__items">' +

              items.map(function (item) {
                return [
                  '<div>',
                    '<span class="pmd-coc-existing__qty">',
                      esc(item.quantity),
                      '×',
                    '</span>',

                    '<span class="pmd-coc-existing__name">',
                      '<b>',
                        esc(item.name || 'Item'),
                      '</b>',

                      visibleOrderComment(
                        item.comment
                      )
                        ? (
                            '<small>' +
                            esc(
                              visibleOrderComment(
                                item.comment
                              )
                            ) +
                            '</small>'
                          )
                        : '',
                    '</span>',

                    '<strong>',
                      money(
                        item.subtotal ||
                        item.line_subtotal ||
                        0
                      ),
                    '</strong>',
                  '</div>'
                ].join('');
              }).join('') +

              '</div>'
            )
          : (
              '<p class="pmd-coc-existing__empty">' +
              'No sent items yet.' +
              '</p>'
            ),

      '</div>'
    ].join('');
  }

  function cartSignature(item, options, note) {
    return [
      String(item.id),
      (options || []).map(function (option) {
        return option.id;
      }).sort().join(','),
      String(note || '').trim().toLowerCase()
    ].join(':');
  }

  function addLine(item, options, quantity, comment) {
    var qty = Math.max(
      Math.max(1, num(item.minimum_qty, 1)),
      Math.min(99, num(quantity, 1))
    );

    var note = String(comment || '').trim();
    var key = cartSignature(item, options, note);

    var existing = state.cart.find(function (row) {
      return row.key === key;
    });

    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty);
    } else {
      state.cart.push({
        key: key,
        menu_id: Number(item.id),
        name: item.name,
        price: num(item.price, 0),
        quantity: qty,
        options: options || [],
        comment: note
      });
    }

    state.railView = 'new';

    renderCart();
    updateFooter();
    toast(item.name + ' added');
  }

  function lineUnit(row) {
    return num(row.price, 0) +
      (row.options || []).reduce(function (sum, option) {
        return sum + num(option.price, 0);
      }, 0);
  }

  function lineTotal(row) {
    return lineUnit(row) * num(row.quantity, 1);
  }

  function cartTotal() {
    return state.cart.reduce(function (sum, row) {
      return sum + lineTotal(row);
    }, 0);
  }

  function existingTotal() {
    var order = currentOrder();

    return order
      ? num(order.total != null ? order.total : order.order_total, 0)
      : 0;
  }

  function applyRailView() {
    var hasSent =
      !!state.activeOrderId;

    if (
      !hasSent &&
      state.railView === 'sent'
    ) {
      state.railView = 'new';
    }

    if (
      state.railView !== 'sent' &&
      state.railView !== 'new'
    ) {
      state.railView = 'new';
    }

    rootQueryAll(
      '[data-coc-rail-view]'
    ).forEach(function (button) {
      var view =
        button.getAttribute(
          'data-coc-rail-view'
        );

      if (view === 'sent') {
        button.hidden = !hasSent;
      }

      var active =
        view === state.railView;

      button.classList.toggle(
        'is-active',
        active
      );

      button.setAttribute(
        'aria-selected',
        active ? 'true' : 'false'
      );
    });

    rootQueryAll(
      '[data-coc-rail-pane]'
    ).forEach(function (pane) {
      pane.hidden =
        pane.getAttribute(
          'data-coc-rail-pane'
        ) !== state.railView;
    });
  }

  function renderCart() {
    var box =
      rootQuery('[data-coc-cart]');

    if (!box) return;

    if (!state.cart.length) {
      box.innerHTML = [
        '<div class="pmd-coc-cart-empty">',
          '<div>',
            '<strong>No new items</strong>',
            '<span>Choose food from the menu.</span>',
          '</div>',
        '</div>'
      ].join('');
    } else {
      box.innerHTML =
        state.cart.map(
          function (row, index) {
            var options =
              (row.options || [])
                .map(function (option) {
                  return (
                    option.name +
                    (
                      num(option.price, 0)
                        ? (
                            ' +' +
                            money(option.price)
                          )
                        : ''
                    )
                  );
                })
                .join(' · ');

            return [
              '<article class="pmd-coc-line">',

                '<div class="pmd-coc-line__top">',
                  '<div>',
                    '<strong>',
                      esc(row.name),
                    '</strong>',

                    options
                      ? (
                          '<small>' +
                          esc(options) +
                          '</small>'
                        )
                      : '',

                    row.comment
                      ? (
                          '<small class="is-note">' +
                          esc(row.comment) +
                          '</small>'
                        )
                      : '',
                  '</div>',

                  '<b>',
                    money(
                      lineTotal(row)
                    ),
                  '</b>',
                '</div>',

                '<div class="pmd-coc-line__actions">',
                  '<div>',
                    '<button type="button" data-coc-dec="',
                      index,
                    '">−</button>',

                    '<b>',
                      esc(row.quantity),
                    '</b>',

                    '<button type="button" data-coc-inc="',
                      index,
                    '">+</button>',
                  '</div>',

                  '<button type="button" class="pmd-coc-line__remove" data-coc-remove="',
                    index,
                  '">Remove</button>',
                '</div>',

              '</article>'
            ].join('');
          }
        ).join('');
    }

    rootQueryAll(
      '[data-coc-inc]',
      box
    ).forEach(function (button) {
      button.onclick = function () {
        var index =
          Number(
            button.getAttribute(
              'data-coc-inc'
            )
          );

        if (state.cart[index]) {
          state.cart[index].quantity =
            Math.min(
              99,
              state.cart[index].quantity + 1
            );

          state.railView = 'new';

          renderCart();
          updateFooter();
        }
      };
    });

    rootQueryAll(
      '[data-coc-dec]',
      box
    ).forEach(function (button) {
      button.onclick = function () {
        var index =
          Number(
            button.getAttribute(
              'data-coc-dec'
            )
          );

        var row =
          state.cart[index];

        if (!row) return;

        row.quantity -= 1;

        if (row.quantity <= 0) {
          state.cart.splice(
            index,
            1
          );
        }

        state.railView = 'new';

        renderCart();
        updateFooter();
      };
    });

    rootQueryAll(
      '[data-coc-remove]',
      box
    ).forEach(function (button) {
      button.onclick = function () {
        state.cart.splice(
          Number(
            button.getAttribute(
              'data-coc-remove'
            )
          ),
          1
        );

        state.railView = 'new';

        renderCart();
        updateFooter();
      };
    });

    var order =
      currentOrder();

    var sentItems =
      order &&
      Array.isArray(order.items)
        ? order.items
        : [];

    var newCount =
      state.cart.reduce(
        function (sum, row) {
          return (
            sum +
            num(row.quantity, 0)
          );
        },
        0
      );

    var sentCount =
      sentItems.reduce(
        function (sum, row) {
          return (
            sum +
            num(row.quantity, 0)
          );
        },
        0
      );

    var newCountEl =
      rootQuery(
        '[data-coc-new-count]'
      );

    var sentCountEl =
      rootQuery(
        '[data-coc-sent-count]'
      );

    if (newCountEl) {
      newCountEl.textContent =
        String(newCount);
    }

    if (sentCountEl) {
      sentCountEl.textContent =
        String(sentCount);
    }

    var newTotal =
      cartTotal();

    var oldTotal =
      existingTotal();

    var newEl =
      rootQuery(
        '[data-coc-new-total]'
      );

    var newRow =
      rootQuery(
        '[data-coc-new-total-row]'
      );

    var totalEl =
      rootQuery(
        '[data-coc-total]'
      );

    var totalLabel =
      rootQuery(
        '[data-coc-total-label]'
      );

    /*
     * Existing payable bill never includes unsent items.
     * After Send succeeds, backend recalculation moves them
     * into existingTotal() naturally.
     */
    if (newEl) {
      newEl.textContent =
        money(newTotal);
    }

    if (newRow) {
      newRow.hidden =
        !state.activeOrderId ||
        newTotal <= 0.0001;
    }

    if (totalLabel) {
      totalLabel.textContent =
        state.activeOrderId
          ? 'Current bill'
          : (
              state.deliveryMode
                ? 'Delivery total'
                : 'Pending total'
            );
    }

    if (totalEl) {
      totalEl.textContent =
        money(
          state.activeOrderId
            ? oldTotal
            : newTotal
        );
    }

    rootQueryAll(
      '[data-coc-rail-view]'
    ).forEach(function (button) {
      button.onclick = function () {
        state.railView =
          button.getAttribute(
            'data-coc-rail-view'
          ) || 'new';

        applyRailView();
      };
    });

    applyRailView();
  }

  
  // PMD_CASHIER_R57_RAIL_ACTIONS
  // PMD_CASHIER_R59_STABLE_RAIL
  function mountRailActions() {
    var root = document.getElementById(
      'pmd-cashier-order-composer-v1'
    );

    if (!root) return;

    // PMD_CASHIER_R59B_PERSISTENT_ACTIONS
    var footer = root.querySelector(
      '.pmd-coc__footer'
    );

    if (!footer) return;

    var actions = root.querySelector(
      '.pmd-coc__footer-right'
    );

    /*
     * R59/R59A may already have moved the real action node
     * into a re-rendered region.
     *
     * Put that exact node back into the persistent footer.
     */
    if (actions) {
      if (actions.parentNode !== footer) {
        footer.appendChild(actions);
      }
    } else {
      /*
       * Recovery path for a composer that lost the action
       * node during a previous main/cart re-render.
       *
       * Click handling is delegated from the shell, so these
       * canonical data attributes use the existing handlers.
       */
      footer.innerHTML = [
        '<div class="pmd-coc__footer-right">',
          '<button type="button" class="pmd-coc__secondary" data-coc-close>Close</button>',
          '<button type="button" class="pmd-coc__send pmd-coc__primary" data-coc-primary disabled>Confirm</button>',
        '</div>'
      ].join('');

      actions = footer.querySelector(
        '.pmd-coc__footer-right'
      );
    }

    footer.hidden = false;
    footer.removeAttribute(
      'aria-hidden'
    );
  }


  function updateFooter() {
    mountRailActions();
    var primary =
      rootQuery('[data-coc-primary]');

    var hasCart =
      state.cart.length > 0;

    var hasOrder =
      !!state.activeOrderId;

    if (!primary) {
      return;
    }

    if (
      hasOrder &&
      state.invoiceReady
    ) {
      primary.textContent =
        'Invoice';

      primary.disabled = false;

      primary.classList.remove(
        'is-pay'
      );

      primary.classList.add(
        'is-invoice'
      );

      return;
    }

    if (hasCart) {
      primary.textContent =
        state.submitting
          ? 'Confirming…'
          : 'Confirm';

      primary.disabled =
        state.submitting ||
        (
          !state.table &&
          !state.deliveryMode
        );

      primary.classList.remove(
        'is-pay',
        'is-invoice'
      );

      return;
    }

    if (hasOrder) {
      primary.textContent =
        'Pay';

      primary.disabled =
        state.submitting;

      primary.classList.remove(
        'is-invoice'
      );

      primary.classList.add(
        'is-pay'
      );

      return;
    }

    primary.textContent =
      'Confirm';

    primary.disabled = true;

    primary.classList.remove(
      'is-pay',
      'is-invoice'
    );
  }

  function openProduct(item) {
    state.product = item;
    state.productQty = Math.max(1, num(item.minimum_qty, 1));
    state.productNote = '';

    var modal = rootQuery('[data-coc-product-modal]');
    var title = rootQuery('[data-coc-product-title]');
    var body = rootQuery('[data-coc-product-body]');

    if (!modal || !body) return;

    if (title) {
      title.textContent = item.name || 'Food';
    }

    var badges = foodBadges(item);

    var allergens = (item.allergens || []).map(function (row) {
      return row.name || '';
    }).filter(Boolean);

    var nutrition = [];

    [
      ['Calories', item.calories != null && item.calories !== '' ? item.calories + ' kcal' : ''],
      ['Serving size', item.serving_size || ''],
      ['Protein', item.protein != null && item.protein !== '' ? item.protein + ' g' : ''],
      ['Carbs', item.carbs != null && item.carbs !== '' ? item.carbs + ' g' : ''],
      ['Fat', item.fat != null && item.fat !== '' ? item.fat + ' g' : ''],
      ['Sugar', item.sugar != null && item.sugar !== '' ? item.sugar + ' g' : ''],
      ['Preparation', num(item.prep_minutes, 0) > 0 ? item.prep_minutes + ' min' : '']
    ].forEach(function (row) {
      if (row[1] !== '') {
        nutrition.push(row);
      }
    });

    var optionHtml = (item.options || []).map(function (group) {
      var type =
        Number(group.max || 1) === 1
          ? 'radio'
          : 'checkbox';

      return [
        '<section class="pmd-coc-option" ',
          'data-coc-option-group ',
          'data-required="', group.required ? '1' : '0', '" ',
          'data-min="', esc(group.min || 0), '" ',
          'data-max="', esc(group.max || 1), '">',

          '<div class="pmd-coc-option__title">',
            '<strong>', esc(group.name || 'Options'), '</strong>',
            '<span>', group.required ? 'Required' : 'Optional', '</span>',
          '</div>',

          '<div class="pmd-coc-option__values">',
            (group.values || []).map(function (value) {
              return [
                '<label>',
                  '<span>',
                    '<input type="', type, '" ',
                      'name="pmd-coc-option-', esc(group.id), '" ',
                      'value="', esc(value.id), '" ',
                      'data-name="', esc(value.name), '" ',
                      'data-price="', esc(value.price || 0), '" ',
                      value.default ? 'checked' : '',
                    '>',
                    '<b>', esc(value.name || 'Option'), '</b>',
                  '</span>',

                  '<strong>',
                    num(value.price, 0)
                      ? ('+' + money(value.price))
                      : '',
                  '</strong>',
                '</label>'
              ].join('');
            }).join(''),
          '</div>',
        '</section>'
      ].join('');
    }).join('');

    body.innerHTML = [
      '<div class="pmd-coc-product__hero">',
        '<div class="pmd-coc-product__image">',
          item.image
            ? '<img src="' + esc(item.image) + '" alt="" data-coc-detail-image>'
            : '<span>' +
                esc(String(item.name || 'F').charAt(0).toUpperCase()) +
              '</span>',
        '</div>',

        '<div class="pmd-coc-product__intro">',
          (item.category_names || []).length
            ? '<small>' + esc(item.category_names.join(' · ')) + '</small>'
            : '',

          '<h4>', esc(item.name || 'Food'), '</h4>',

          item.description
            ? '<p>' + esc(item.description) + '</p>'
            : '',

          badges.length
            ? '<div class="pmd-coc-product__badges">' +
                badges.map(function (badge) {
                  return '<span>' + esc(badge) + '</span>';
                }).join('') +
              '</div>'
            : '',

          '<strong class="pmd-coc-product__price">',
            money(item.price),
          '</strong>',
        '</div>',
      '</div>',

      allergens.length
        ? '<div class="pmd-coc-product__allergens"><b>Allergens</b><span>' +
            esc(allergens.join(', ')) +
          '</span></div>'
        : '',

      nutrition.length
        ? '<div class="pmd-coc-product__nutrition">' +
            nutrition.map(function (row) {
              return [
                '<div>',
                  '<span>', esc(row[0]), '</span>',
                  '<b>', esc(row[1]), '</b>',
                '</div>'
              ].join('');
            }).join('') +
          '</div>'
        : '',

      optionHtml,

      '<section class="pmd-coc-product__order">',
        '<div class="pmd-coc-product__qty">',
          '<div><b>Quantity</b></div>',

          '<div>',
            '<button type="button" data-coc-product-minus>−</button>',
            '<strong data-coc-product-qty>', esc(state.productQty), '</strong>',
            '<button type="button" data-coc-product-plus>+</button>',
          '</div>',
        '</div>',

        '<label class="pmd-coc-product__note">',
          '<span>',
            '<b>Item note</b>',
          '</span>',
          '<textarea data-coc-product-note maxlength="500" placeholder="Optional note…"></textarea>',
        '</label>',

        '<div class="pmd-coc-product__total">',
          '<span>Add to current order</span>',
          '<strong data-coc-product-total>',
            money(item.price * state.productQty),
          '</strong>',
        '</div>',
      '</section>'
    ].join('');

    var img = rootQuery('[data-coc-detail-image]', body);

    if (img) {
      img.onerror = function () {
        if (
          String(
            img.getAttribute('src') || ''
          ).indexOf(
            PMD_MENU_FALLBACK_IMAGE
          ) === -1
        ) {
          img.src =
            PMD_MENU_FALLBACK_IMAGE;

          img.classList.add(
            'is-pmd-logo-fallback'
          );

          return;
        }

        img.style.display = 'none';
      };

      if (
        String(
          img.getAttribute('src') || ''
        ).indexOf(
          PMD_MENU_FALLBACK_IMAGE
        ) !== -1
      ) {
        img.classList.add(
          'is-pmd-logo-fallback'
        );
      }
    }

    var minus = rootQuery('[data-coc-product-minus]', body);
    var plus = rootQuery('[data-coc-product-plus]', body);
    var note = rootQuery('[data-coc-product-note]', body);

    if (minus) {
      minus.onclick = function () {
        state.productQty = Math.max(
          Math.max(1, num(item.minimum_qty, 1)),
          state.productQty - 1
        );

        updateProductTotal();
      };
    }

    if (plus) {
      plus.onclick = function () {
        state.productQty = Math.min(99, state.productQty + 1);
        updateProductTotal();
      };
    }

    if (note) {
      note.oninput = function () {
        state.productNote = note.value;
      };
    }

    body.onchange = updateProductTotal;

    modal.hidden = false;
  }

  function selectedProductOptions(markInvalid) {
    var body = rootQuery('[data-coc-product-body]');

    if (!body) {
      return {ok: true, rows: []};
    }

    var rows = [];
    var valid = true;

    rootQueryAll('[data-coc-option-group]', body).forEach(function (group) {
      var checked = rootQueryAll('input:checked', group);

      var min = Number(
        group.getAttribute('data-min') ||
        (group.getAttribute('data-required') === '1' ? 1 : 0)
      );

      var max = Number(
        group.getAttribute('data-max') || 999
      );

      if (checked.length < min || checked.length > max) {
        valid = false;

        if (markInvalid) {
          group.classList.add('is-invalid');

          setTimeout(function () {
            group.classList.remove('is-invalid');
          }, 1800);
        }

        return;
      }

      checked.forEach(function (input) {
        rows.push({
          id: Number(input.value),
          name: input.getAttribute('data-name') || 'Option',
          price: num(input.getAttribute('data-price'), 0)
        });
      });
    });

    return {
      ok: valid,
      rows: rows
    };
  }

  function updateProductTotal() {
    var item = state.product;
    if (!item) return;

    var options = selectedProductOptions(false);

    var extras = options.rows.reduce(function (sum, row) {
      return sum + num(row.price, 0);
    }, 0);

    var qty = rootQuery('[data-coc-product-qty]');
    var total = rootQuery('[data-coc-product-total]');

    if (qty) {
      qty.textContent = state.productQty;
    }

    if (total) {
      total.textContent =
        money(
          (num(item.price, 0) + extras) *
          state.productQty
        );
    }
  }

  function confirmProduct() {
    if (!state.product) return;

    var options = selectedProductOptions(true);

    if (!options.ok) {
      toast('Complete all required options.', true);
      return;
    }

    addLine(
      state.product,
      options.rows,
      state.productQty,
      state.productNote
    );

    closeProduct();
  }

  function closeProduct() {
    var modal = rootQuery('[data-coc-product-modal]');

    if (modal) {
      modal.hidden = true;
    }

    state.product = null;
    state.productQty = 1;
    state.productNote = '';
  }

  async function saveOrder(mode) {
    if (
      !state.cart.length ||
      state.submitting ||
      (
        !state.table &&
        !state.deliveryMode
      )
    ) {
      return;
    }

    var wasDelivery =
      !!state.deliveryMode;

    var saveUrl =
      wasDelivery
        ? '/admin/pmd-waiter-pos-v1/save-delivery'
        : state.settings.save_url;

    if (!saveUrl) {
      toast(
        'Canonical save endpoint is unavailable.',
        true
      );

      return;
    }

    state.submitting = true;
    updateFooter();

    var order =
      currentOrder();

    try {
      var json =
        await fetchJson(
          saveUrl,
          {
            method: 'POST',

            headers: {
              'Accept':
                'application/json',

              'Content-Type':
                'application/json',

              'X-Requested-With':
                'XMLHttpRequest',

              'X-CSRF-TOKEN':
                csrf()
            },

            body: JSON.stringify({
              mode: mode,

              order_type:
                wasDelivery
                  ? 'delivery'
                  : 'table',

              location_id:
                wasDelivery
                  ? Number(
                      state.deliveryLocationId ||
                      (
                        state.boot &&
                        state.boot.table &&
                        state.boot.table.location_id
                      ) ||
                      0
                    )
                  : Number(
                      state.table &&
                      state.table.location_id ||
                      0
                    ),

              order_id:
                state.activeOrderId,

              expected_updated_at:
                order
                  ? order.updated_at
                  : null,

              guest_count:
                state.guestCount,

              note:
                state.note,

              items:
                state.cart.map(
                  function (row) {
                    return {
                      menu_id:
                        row.menu_id,

                      quantity:
                        row.quantity,

                      comment:
                        row.comment || '',

                      options:
                        (row.options || [])
                          .map(
                            function (option) {
                              return option.id;
                            }
                          )
                    };
                  }
                )
            })
          }
        );

      state.activeOrderId =
        Number(
          json.order_id ||
          state.activeOrderId ||
          0
        ) ||
        null;

      state.desiredOrderId =
        state.activeOrderId;

      state.mode = 'edit';
      state.invoiceReady = false;
      state.railView = 'sent';

      state.cart = [];
      state.note = '';

      toast(
        json.message ||
        (
          wasDelivery
            ? 'Delivery order sent to the kitchen.'
            : 'Order sent to the kitchen.'
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          'pmd:waiter-pos-order-updated',
          {
            detail: json
          }
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          'pmd:cashier-order-updated',
          {
            detail: json
          }
        )
      );

      if (wasDelivery) {
        /*
         * The saved Delivery has no table endpoint.
         * Reload its canonical order/payment state by order id.
         */
        await refreshDeliveryOrder(
          true,
          state.activeOrderId
        );
      } else {
        await refreshCashierOrdersSection(
          state.activeOrderId
        );

        if (state.table) {
          await loadTable(
            state.table,
            state.activeOrderId,
            false
          );

          state.railView = 'sent';

          if (state.open) {
            renderComposer();
          }
        }
      }
    } catch (error) {
      toast(
        error.message ||
        'Could not save order.',
        true
      );
    } finally {
      state.submitting = false;
      updateFooter();
    }
  }

  async function refreshDeliveryOrder(
    silent,
    orderId
  ) {
    var id =
      Number(
        orderId ||
        state.activeOrderId ||
        0
      );

    if (!id) {
      if (state.open) {
        renderComposer();
      }

      return;
    }

    try {
      var template =
        state.settings.payment_summary_url ||
        '/admin/pmd-waiter-pos-v1/payment-summary/{order}';

      var summary =
        await fetchJson(
          replaceOrderToken(
            template,
            id
          ) +
          '?_=' +
          Date.now()
        );

      state.payment.summary =
        summary;

      var settlement =
        summary.settlement || {};

      var orderData =
        summary.order || {};

      var items =
        Array.isArray(summary.items)
          ? summary.items.map(
              function (item) {
                return {
                  order_menu_id:
                    Number(
                      item.order_menu_id ||
                      0
                    ),

                  menu_id:
                    Number(
                      item.menu_id ||
                      0
                    ),

                  name:
                    item.name ||
                    'Item',

                  quantity:
                    num(
                      item.quantity,
                      0
                    ),

                  subtotal:
                    num(
                      item.line_subtotal,
                      0
                    ),

                  comment:
                    item.comment ||
                    ''
                };
              }
            )
          : [];

      state.existingOrder = {
        order_id: id,

        total:
          num(
            settlement.order_total,
            0
          ),

        order_total:
          num(
            settlement.order_total,
            0
          ),

        settlement_status:
          String(
            settlement.status ||
            'unpaid'
          ),

        updated_at:
          String(
            orderData.updated_at ||
            ''
          ),

        comment:
          String(
            orderData.comment ||
            ''
          ),

        guest_count:
          state.guestCount,

        items:
          items
      };

      state.openOrders = [
        state.existingOrder
      ];

      state.activeOrderId = id;
      state.desiredOrderId = id;
      state.mode = 'edit';
      state.deliveryMode = true;

      if (
        typeof paymentSummaryIsPaid ===
        'function'
      ) {
        state.invoiceReady =
          paymentSummaryIsPaid();
      } else {
        state.invoiceReady =
          String(
            settlement.status ||
            ''
          ).toLowerCase() === 'paid' ||
          (
            num(
              settlement.order_total,
              0
            ) > 0 &&
            num(
              settlement.remaining_amount,
              0
            ) <= 0.005
          );
      }

      if (!silent) {
        toast(
          'Delivery order refreshed'
        );
      }

      if (state.open) {
        renderComposer();
      }

      await refreshCashierOrdersSection(
        id
      );
    } catch (error) {
      if (!silent) {
        toast(
          error.message ||
          'Delivery refresh failed.',
          true
        );
      }

      throw error;
    }
  }

  async function refreshData(silent) {
    if (state.deliveryMode) {
      await refreshDeliveryOrder(
        silent,
        state.activeOrderId
      );

      return;
    }

    if (!state.settings.data_url) {
      return;
    }

    try {
      var boot =
        await fetchJson(
          state.settings.data_url +
          '?_=' +
          Date.now()
        );

      var desired =
        state.activeOrderId;

      state.boot =
        boot || {};

      state.settings =
        state.boot.settings ||
        state.settings;

      state.menu =
        Array.isArray(
          state.boot.menu_items
        )
          ? state.boot.menu_items
          : state.menu;

      state.categories =
        Array.isArray(
          state.boot.categories
        )
          ? state.boot.categories
          : state.categories;

      state.openOrders =
        Array.isArray(
          state.boot.open_orders
        )
          ? state.boot.open_orders
          : [];

      if (boot.table) {
        state.table =
          normalizeTable(
            boot.table
          );
      }

      var desiredRow =
        desired
          ? state.openOrders.find(
              function (row) {
                return (
                  Number(
                    row.order_id
                  ) ===
                  Number(desired)
                );
              }
            )
          : null;

      if (desiredRow) {
        state.activeOrderId =
          Number(desired);

        state.existingOrder =
          desiredRow;
      } else if (!state.payment.open) {
        var active =
          state.openOrders.find(
            function (row) {
              return (
                Number(
                  row.order_id
                ) ===
                Number(
                  boot.active_order_id ||
                  0
                )
              );
            }
          ) ||
          state.openOrders[0] ||
          null;

        state.activeOrderId =
          active
            ? Number(
                active.order_id
              )
            : null;

        state.existingOrder =
          active;
      }

      if (
        state.payment &&
        state.payment.summary &&
        typeof paymentSummaryIsPaid ===
          'function'
      ) {
        state.invoiceReady =
          paymentSummaryIsPaid();
      }

      if (!silent) {
        toast(
          'Order and menu refreshed'
        );
      }

      if (state.open) {
        renderComposer();
      }

      await refreshCashierOrdersSection();
    } catch (error) {
      if (!silent) {
        toast(
          error.message ||
          'Refresh failed.',
          true
        );
      }
    }
  }

  function cashierCashPayable() {
    var summary =
      state.payment &&
      state.payment.summary
        ? state.payment.summary
        : {};

    var settlement =
      summary.settlement || {};

    var base =
      num(
        settlement.remaining_amount,
        0
      );

    var tip = 0;

    if (
      state.payment.tipPercent ===
      'custom'
    ) {
      tip =
        Math.max(
          0,
          roundMoney(
            state.payment.customTip
          )
        );
    } else {
      tip =
        roundMoney(
          base *
          (
            num(
              state.payment.tipPercent,
              0
            ) /
            100
          )
        );
    }

    var discount =
      state.payment.coupon
        ? num(
            state.payment.coupon.discount,
            0
          )
        : 0;

    return roundMoney(
      Math.max(
        0,
        base + tip - discount
      )
    );
  }

  function bindCashKeypad(root) {
    var pad =
      root.querySelector(
        '[data-cash-keypad]'
      );

    var cash =
      root.querySelector(
        '[data-pos-cash-received]'
      );

    if (
      !pad ||
      !cash ||
      pad.dataset.pmdBound === '1'
    ) {
      return;
    }

    pad.dataset.pmdBound = '1';

    function sessionReady() {
      var current =
        String(
          state.payment.idempotencyKey ||
          ''
        );

      if (
        pad.dataset.pmdSession !==
        current
      ) {
        pad.dataset.pmdSession =
          current;

        pad.dataset.pmdEdited =
          '0';
      }
    }

    function write(value) {
      cash.value =
        String(value);

      cash.dispatchEvent(
        new Event(
          'input',
          {
            bubbles: true
          }
        )
      );
    }

    function beginEdit() {
      sessionReady();

      if (
        pad.dataset.pmdEdited !== '1'
      ) {
        pad.dataset.pmdEdited = '1';
        return '';
      }

      return String(
        cash.value || ''
      );
    }

    root.addEventListener(
      'click',
      function (event) {
        var button =
          event.target &&
          event.target.closest
            ? event.target.closest(
                '[data-cash-key], ' +
                '[data-cash-action], ' +
                '[data-cash-tender]'
              )
            : null;

        if (
          !button ||
          !root.contains(button)
        ) {
          return;
        }

        if (
          button.hasAttribute(
            'data-cash-key'
          )
        ) {
          var value =
            beginEdit();

          var digit =
            button.getAttribute(
              'data-cash-key'
            );

          if (
            value === '0' &&
            digit !== '0' &&
            value.indexOf('.') === -1
          ) {
            value = '';
          }

          write(
            value + digit
          );

          return;
        }

        var action =
          button.getAttribute(
            'data-cash-action'
          );

        if (action) {
          sessionReady();

          if (action === 'exact') {
            pad.dataset.pmdEdited =
              '1';

            write(
              cashierCashPayable()
                .toFixed(2)
            );

            return;
          }

          if (action === 'decimal') {
            var value =
              beginEdit();

            if (
              value.indexOf('.') === -1
            ) {
              write(
                value === ''
                  ? '0.'
                  : value + '.'
              );
            }

            return;
          }

          if (
            action === 'backspace'
          ) {
            var current =
              beginEdit();

            write(
              current.slice(
                0,
                -1
              )
            );

            return;
          }
        }

        if (
          button.hasAttribute(
            'data-cash-tender'
          )
        ) {
          sessionReady();

          pad.dataset.pmdEdited =
            '1';

          var step =
            Math.max(
              1,
              num(
                button.getAttribute(
                  'data-cash-tender'
                ),
                1
              )
            );

          var payable =
            cashierCashPayable();

          var tender =
            Math.ceil(
              (
                payable -
                0.000001
              ) /
              step
            ) *
            step;

          write(
            roundMoney(
              tender
            ).toFixed(2)
          );
        }
      }
    );
  }

  async function setupPaymentModule() {
    if (state.paymentApi) return state.paymentApi;

    await ensurePaymentAssets();

    var root = ensureShell();

    state.paymentApi =
      window.PMDWaiterPOSPaymentV2.install({
        root: root,
        state: state,
        pmdCashier: true,
        pmdCashierAdjustments: true,

        $: function (selector, parent) {
          return (parent || root).querySelector(selector);
        },

        $$: function (selector, parent) {
          return Array.prototype.slice.call(
            (parent || root).querySelectorAll(selector)
          );
        },

        esc: esc,
        uid: uid,
        toNumber: num,
        roundMoney: roundMoney,
        replaceOrderToken: replaceOrderToken,
        money: money,
        fetchJson: fetchJson,
        toast: toast,
        showSuccess: showSuccess,
        closeCart: function () {
          closeComposer(true);
        },
        refreshData: refreshData
      });

    state.paymentApi.bindPayment();
    bindCashKeypad(root);

    return state.paymentApi;
  }

  function openInvoice() {
    if (!state.activeOrderId) {
      toast(
        'No order is available for invoice.',
        true
      );

      return;
    }

    window.open(
      '/admin/pmd-cashier-order-center/invoice/' +
      encodeURIComponent(
        String(state.activeOrderId)
      ),
      '_blank',
      'noopener'
    );
  }

  async function openPayment() {
    if (!state.activeOrderId) {
      toast('Save or send the order first.', true);
      return;
    }

    if (state.cart.length) {
      toast(
        'Save or send new items before taking payment.',
        true
      );
      return;
    }

    try {
      await setupPaymentModule();
      state.paymentApi.openPayment();
    } catch (error) {
      toast(
        error.message ||
        'Payment Center could not open.',
        true
      );
    }
  }

  function openDetails() {
    if (!state.activeOrderId) return;

    var orderId = state.activeOrderId;

    if (
      window.PMDCashierOrderCenter &&
      typeof window.PMDCashierOrderCenter.open === 'function'
    ) {
      state.cart = [];
      closeComposer(true);
      window.PMDCashierOrderCenter.open(orderId);
      return;
    }

    toast(
      'Order details are unavailable.',
      true
    );
  }

  // PMD_CASHIER_LIVE_SYNC_R43
  var cashierRefreshBusy = false;
  var cashierRefreshTimer = null;
  var cashierRefreshKickTimer = null;

  function cashierOrderExists(root, orderId) {
    if (!root || !orderId) return false;

    return !!root.querySelector(
      '[data-pmd-cashier-order="' +
      String(Number(orderId)) +
      '"]'
    );
  }

  function refreshCashierBridgeWidgets() {
    if (
      window.PMDCashierOrderCenter &&
      typeof window.PMDCashierOrderCenter.refresh === 'function'
    ) {
      try {
        window.PMDCashierOrderCenter.refresh();
      } catch (error) {
      }
    }

    if (
      window.PMDSharedFloorMultiFloorV1 &&
      typeof window.PMDSharedFloorMultiFloorV1.refresh === 'function'
    ) {
      try {
        window.PMDSharedFloorMultiFloorV1.refresh();
      } catch (error) {
      }
    }

    tagHeaderCreate();
  }

  function cashierRefreshUrl(attempt) {
    var url = new URL(location.href);

    url.searchParams.set(
      'pmd_coc_refresh',
      String(Date.now()) + '-' + String(attempt || 0)
    );

    return url.toString();
  }

  function waitForCashierRefresh(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function refreshCashierOrdersSection(expectedOrderId) {
    if (cashierRefreshBusy) return false;

    cashierRefreshBusy = true;

    var expected = Number(expectedOrderId || 0);
    var attempts = expected > 0 ? 3 : 1;
    var latestSection = null;
    var expectedFound = expected <= 0;

    try {
      for (var attempt = 0; attempt < attempts; attempt += 1) {
        var response = await fetch(
          cashierRefreshUrl(attempt),
          {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              'Accept': 'text/html',
              'X-Requested-With': 'XMLHttpRequest',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }
        );

        if (!response.ok) {
          if (attempt + 1 < attempts) {
            await waitForCashierRefresh(450 + attempt * 450);
            continue;
          }
          return false;
        }

        var html = await response.text();
        var doc = new DOMParser().parseFromString(
          html,
          'text/html'
        );

        latestSection = doc.querySelector(
          '#pmd-cashier-current-orders-v2'
        );

        if (!latestSection) {
          if (attempt + 1 < attempts) {
            await waitForCashierRefresh(450 + attempt * 450);
            continue;
          }
          return false;
        }

        expectedFound =
          expected <= 0 ||
          cashierOrderExists(latestSection, expected);

        if (expectedFound || attempt + 1 >= attempts) {
          break;
        }

        await waitForCashierRefresh(500 + attempt * 500);
      }

      var current = document.querySelector(
        '#pmd-cashier-current-orders-v2'
      );

      if (latestSection && current) {
        current.replaceWith(latestSection);
        refreshCashierBridgeWidgets();
      }

      if (expected > 0 && !expectedFound) {
        console.warn(
          '[PMD R43] Saved order is not in the refreshed Cashier range yet',
          {orderId: expected, path: location.pathname}
        );
      }

      return expectedFound;
    } catch (error) {
      console.warn(
        '[PMD R43] Cashier live refresh failed',
        error
      );
      return false;
    } finally {
      cashierRefreshBusy = false;
    }
  }

  function queueCashierLiveRefresh(expectedOrderId, delay) {
    window.clearTimeout(cashierRefreshKickTimer);

    cashierRefreshKickTimer = window.setTimeout(
      function () {
        if (document.visibilityState === 'hidden') return;
        refreshCashierOrdersSection(expectedOrderId || 0);
      },
      Math.max(0, Number(delay || 0))
    );
  }

  function startCashierLiveSync() {
    if (cashierRefreshTimer) return;

    cashierRefreshTimer = window.setInterval(
      function () {
        if (
          document.visibilityState === 'hidden' ||
          state.open ||
          state.submitting
        ) {
          return;
        }

        refreshCashierOrdersSection(0);
      },
      12000
    );

    window.addEventListener('focus', function () {
      if (!state.open) queueCashierLiveRefresh(0, 100);
    });

    document.addEventListener(
      'visibilitychange',
      function () {
        if (
          document.visibilityState === 'visible' &&
          !state.open
        ) {
          queueCashierLiveRefresh(0, 150);
        }
      }
    );

    window.addEventListener(
      'pmd:waiter-pos-order-updated',
      function (event) {
        var detail = event && event.detail
          ? event.detail
          : {};

        var orderId = Number(
          detail.order_id ||
          detail.orderId ||
          0
        );

        queueCashierLiveRefresh(orderId, 300);
      }
    );
  }

  async function resolveTableForOrder(orderId) {
    var results = await Promise.allSettled([
      fetchJson(
        '/admin/pmd-waiter-pos-v22/operations/' +
        encodeURIComponent(orderId) +
        '?_=' +
        Date.now()
      ),

      fetchJson(
        '/admin/pmd-waiter-pos-v1/payment-summary/' +
        encodeURIComponent(orderId) +
        '?_=' +
        Date.now()
      )
    ]);

    var operations =
      results[0].status === 'fulfilled'
        ? results[0].value
        : null;

    var payment =
      results[1].status === 'fulfilled'
        ? results[1].value
        : null;

    var table =
      (operations && operations.table) ||
      (payment && payment.table) ||
      null;

    if (!table) {
      throw (
        results[0].reason ||
        results[1].reason ||
        new Error('The order has no resolvable table.')
      );
    }

    var normalized = normalizeTable(table);

    if (!normalized.id && !normalized.number) {
      throw new Error(
        'The order table could not be resolved.'
      );
    }

    return normalized;
  }

  async function openEdit(orderId, hintedTable) {
    orderId = Number(orderId || 0);

    if (!orderId) return false;

    state.mode = 'edit';
    state.desiredOrderId = orderId;
    state.activeOrderId = orderId;
    state.cart = [];
    state.note = '';

    openShell();

    state.tables = collectFloorTables();
    renderTableOptions();

    setBusy('Loading Order #' + orderId + '…');

    try {
      var table = hintedTable
        ? normalizeTable(hintedTable)
        : null;

      if (!table || (!table.id && !table.number)) {
        table = tableHintForOrderId(orderId);
      }

      if (!table || (!table.id && !table.number)) {
        table = await resolveTableForOrder(orderId);
      }

      if (
        table.id &&
        !state.tables.some(function (row) {
          return Number(row.id) === Number(table.id);
        })
      ) {
        state.tables.push(table);
      }

      renderTableOptions(table.id);

      return await loadTable(
        table,
        orderId,
        true
      );
    } catch (error) {
      setError(error);
      return false;
    }
  }

  async function openCreate() {
    state.mode = 'create';
    state.desiredOrderId = null;
    state.activeOrderId = null;
    state.existingOrder = null;
    state.cart = [];
    state.note = '';
    state.table = null;
    state.deliveryMode = false;
    state.deliveryLocationId = null;
    state.invoiceReady = false;
    state.railView = 'new';

    openShell();

    state.tables =
      collectFloorTables();

    var selected =
      selectedFloorTable();

    renderTableOptions(
      selected &&
      selected.id
    );

    if (selected) {
      return await loadTable(
        selected,
        null,
        false
      );
    }

    /*
     * Empty Table selection is a real Delivery order,
     * not a disabled Composer.
     */
    return await loadDelivery(
      null
    );
  }

  function isCashierPath() {
    return /^\/admin\/cashierlab(?:\/|$)/.test(
      location.pathname
    );
  }

  function isHeaderCreateCandidate(element) {
    if (!element || !isCashierPath()) return false;

    var rect;

    try {
      rect = element.getBoundingClientRect();
    } catch (error) {
      return false;
    }

    if (
      !rect ||
      rect.width < 20 ||
      rect.height < 20
    ) {
      return false;
    }

    // Cashier header controls are top-right.
    // This excludes Add table/Floor controls below.
    if (rect.top > 145) return false;
    if (rect.right < window.innerWidth * 0.50) return false;

    var href = String(
      element.getAttribute('href') || ''
    ).toLowerCase();

    var aria = String(
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      ''
    ).toLowerCase();

    var text = String(
      element.textContent || ''
    ).trim();

    return (
      href.indexOf('/admin/reservations/create') !== -1 ||
      href.indexOf('/reservations/create') !== -1 ||
      aria.indexOf('reservation') !== -1 ||
      aria.indexOf('reservierung') !== -1 ||
      aria === 'create' ||
      aria === 'add' ||
      aria === 'new' ||
      text === '+' ||
      text === '＋'
    );
  }

  function tagHeaderCreate() {
    if (!isCashierPath()) return;

    var selectors = [
      '#pmd-r2-clean-header a.pmd-r2-clean-create',
      '.pmd-r2-clean-create',
      '[data-pmd-clean-header] a[href*="/reservations/create"]',
      'header a[href*="/reservations/create"]',
      'header button',
      'header a'
    ].join(',');

    rootQueryAll(selectors, document).forEach(function (element) {
      if (!isHeaderCreateCandidate(element)) return;

      element.setAttribute(
        'data-pmd-cashier-order-create',
        'header'
      );

      element.setAttribute(
        'aria-label',
        'New order'
      );

      element.setAttribute(
        'title',
        'New order'
      );

      if (element.tagName === 'A') {
        element.setAttribute(
          'href',
          '#pmd-cashier-order-composer'
        );
      }
    });
  }

  function currentOrderCenterId() {
    if (
      window.PMDCashierOrderCenter &&
      typeof window.PMDCashierOrderCenter.inspect === 'function'
    ) {
      var inspect =
        window.PMDCashierOrderCenter.inspect() || {};

      return Number(
        inspect.orderId || 0
      );
    }

    return 0;
  }

  function closeOrderCenterSilently() {
    var close = document.querySelector(
      '.pmd-cashier-order-center [data-pmd-r37-close]'
    );

    if (close) {
      close.click();
    }
  }

  document.addEventListener(
    'click',
    function (event) {
      if (!isCashierPath()) return;

      /*
       * PMD_CASHIER_FREE_TABLE_DIRECT_COMPOSER
       *
       * On CashierLab a canonical Floor table that is already AVAILABLE
       * should go straight to the native Cashier Order Composer.
       *
       * No order is created here. loadTable() only loads the table/menu.
       * The first Save / Hold or Send to kitchen remains the authority
       * that creates the actual order.
       */
      var freeFloorTable = event.target.closest(
        '.pmd-floor-v1__table[data-floor-table][data-status="available"]'
      );

      if (freeFloorTable && !state.open) {
        var floorInfo = floorState();

        /*
         * Structural Floor modes keep their existing behaviour.
         * Do not hijack drag/edit/merge clicks.
         */
        if (
          !floorInfo ||
          !floorInfo.state ||
          floorInfo.state.editing ||
          floorInfo.state.mergeMode
        ) {
          return;
        }

        var displayId = freeFloorTable.getAttribute(
          'data-floor-table'
        );

        var display = Array.isArray(floorInfo.state.displayTables)
          ? floorInfo.state.displayTables.find(function (row) {
              return row && String(row.id) === String(displayId);
            })
          : null;

        var members = flattenDisplayTable(display);

        /*
         * Never guess which physical table owns an order when a visual
         * merged card represents several database tables.
         */
        if (members.length === 1 && members[0].id) {
          event.preventDefault();
          event.stopImmediatePropagation();

          openCreate(members[0]);
          return;
        }
      }

      var create = event.target.closest(
        '[data-pmd-cashier-order-create]'
      );

      if (create) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openCreate();
        return;
      }

      var openLink = event.target.closest(
        '#pmd-cashier-current-orders-v2 ' +
        '[data-pmd-cashier-order] ' +
        '.pmd-ops-card__footer a'
      );

      if (openLink) {
        var card = openLink.closest(
          '[data-pmd-cashier-order]'
        );

        var orderId = Number(
          card &&
          card.getAttribute(
            'data-pmd-cashier-order'
          )
        );

        if (orderId) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openEdit(
            orderId,
            tableFromOrderCard(card)
          );
          return;
        }
      }

      var editAction = event.target.closest(
        '[data-pmd-r37-action="items"], ' +
        '[data-pmd-r37-action="edit"], ' +
        '[data-pmd-r37-action="add-items"]'
      );

      if (editAction) {
        var editId = currentOrderCenterId();

        if (editId) {
          event.preventDefault();
          event.stopImmediatePropagation();

          closeOrderCenterSilently();

          setTimeout(function () {
            openEdit(
              editId,
              tableHintForOrderId(editId)
            );
          }, 0);

          return;
        }
      }

      var paymentAction = event.target.closest(
        '[data-pmd-r37-action="payment"]'
      );

      if (paymentAction) {
        var paymentId = currentOrderCenterId();

        if (paymentId) {
          event.preventDefault();
          event.stopImmediatePropagation();

          closeOrderCenterSilently();

          setTimeout(function () {
            openEdit(
              paymentId,
              tableHintForOrderId(paymentId)
            ).then(function (opened) {
              if (opened) {
                openPayment();
              }
            });
          }, 0);

          return;
        }
      }
    },
    true
  );

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key !== 'Escape') return;

      var product = rootQuery(
        '[data-coc-product-modal]'
      );

      if (product && !product.hidden) {
        closeProduct();
        return;
      }

      if (
        state.payment.open &&
        state.paymentApi
      ) {
        state.paymentApi.closePayment();
        return;
      }

      if (state.open) {
        closeComposer();
      }
    }
  );

  var observer = new MutationObserver(function () {
    tagHeaderCreate();
  });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  window.addEventListener(
    'popstate',
    tagHeaderCreate
  );

  window.addEventListener(
    'pageshow',
    tagHeaderCreate
  );

  tagHeaderCreate();

  startCashierLiveSync();

  window.PMDCashierOrderComposerV1 = {
    version: '1.0.0-r43',
    openCreate: openCreate,
    openEdit: openEdit,
    close: function () {
      closeComposer(false);
    },
    refresh: function () {
      if (!state.table) return Promise.resolve(false);

      return loadTable(
        state.table,
        state.activeOrderId,
        false
      );
    },
    inspect: function () {
      return {
        open: state.open,
        mode: state.mode,
        table: state.table,
        tableCount: state.tables.length,
        activeOrderId: state.activeOrderId,
        desiredOrderId: state.desiredOrderId,
        menuItems: state.menu.length,
        categories: state.categories.length,
        cartLines: state.cart.length,
        paymentInstalled: !!state.paymentApi,
        waiterAppMountedByComposer: false,
        usesWaiterShell: false
      };
    }
  };

  console.info(
    '[PMD] Cashier Order Composer R54 touch/payment ready',
    {
      version:
        window.PMDCashierOrderComposerV1.version,
      path: location.pathname,
      nativeComposer: true,
      mountsWaiterPOSApp: false
    }
  );
})();

