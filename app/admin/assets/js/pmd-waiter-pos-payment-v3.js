(function () {
  'use strict';

  // PMD_PAYMENT_V3_R60A_CLEAN_BASE

  // PMD_PAYMENT_V3_CASHIER_R55A
  // PMD_PAYMENT_V3_CASHIER_R56B

  if (
    window.PMDWaiterPOSPaymentV2 &&
    window.PMDWaiterPOSPaymentV2.__pmdV3 &&
    !window.__PMDCashierForcePaymentV3R56B
  ) return;

  window.PMDWaiterPOSPaymentV2 = {
    __pmdV3: true,
    __pmdCashierR56B: true,
    install: function (ctx) {
      var state = ctx.state;

      // PMD_PAYMENT_PLATFORM_I18N_V4
      function pmdT(key, fallback, replacements) {
        var runtime = window.PMDPlatformMessages;
        if (runtime && typeof runtime.t === 'function') {
          return runtime.t(key, replacements || {}, fallback || key);
        }
        return fallback || key;
      }

      var cashierMode = !!(
        ctx.pmdCashierAdjustments ||
        ctx.pmdCashier
      );

      var $ = ctx.$;
      var $$ = ctx.$$;
      var esc = ctx.esc;
      var uid = ctx.uid;
      var toNumber = ctx.toNumber;
      var roundMoney = ctx.roundMoney;
      var replaceOrderToken = ctx.replaceOrderToken;
      var money = ctx.money;
      var fetchJson = ctx.fetchJson;
      var toast = ctx.toast;
      var showSuccess = ctx.showSuccess;
      var refreshData = ctx.refreshData;
      var cashierCheckout = !!(
        state.settings &&
        state.settings.pmdCashierAdjustments
      );

      var closeCart =
        typeof ctx.closeCart === 'function'
          ? ctx.closeCart
          : function () {};

      function paymentSummaryUrl() { return replaceOrderToken(state.settings.payment_summary_url, state.activeOrderId); }
      function paymentSettleUrl() { return replaceOrderToken(state.settings.payment_settle_url, state.activeOrderId); }
      function paymentCouponUrl() { return replaceOrderToken(state.settings.payment_coupon_url, state.activeOrderId); }
      function terminalPaymentUrl() { return replaceOrderToken(state.settings.terminal_payment_url, state.activeOrderId); }
      function terminalAttemptRefreshUrl(id) { return '/admin/terminal-payments/attempts/' + encodeURIComponent(String(id)) + '/refresh'; }
      function terminalAttemptsUrl() { return '/admin/orders/' + encodeURIComponent(String(state.activeOrderId)) + '/terminal-payment-attempts'; }
      function terminalReaderTestUrl(id) { return '/admin/pmddevices/sumup/readers/' + encodeURIComponent(String(id)) + '/test'; }
      function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
      function jsonHeaders() {
        return {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': (($('meta[name="csrf-token"]', document) || {}).content || '')
        };
      }

      // PMD_DESKTOP_AUTO_RECEIPT_R1
      // Electron is the local hardware authority only when the trusted preload
      // bridge exists. Normal browser sessions keep their existing behavior.
      function desktopBridge() {
        return window.PayMyDineDesktop
          && window.PayMyDineDesktop.isDesktopApp
          ? window.PayMyDineDesktop
          : null;
      }

      function latestDesktopReceiptUrl() {
        var transactions = state.payment.summary
          && Array.isArray(state.payment.summary.transactions)
            ? state.payment.summary.transactions
            : [];
        var row = transactions.find(function (transaction) {
          return transaction && transaction.receipt_url;
        });
        return row ? String(row.receipt_url) : '';
      }

      function desktopPrintStoreKey() {
        return 'pmd_desktop_printed_payment_keys_v1';
      }

      function desktopPrintedKeys() {
        try {
          var parsed = JSON.parse(
            window.localStorage.getItem(desktopPrintStoreKey()) || '[]'
          );
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (error) {
          return [];
        }
      }

      function desktopWasPrinted(key) {
        return desktopPrintedKeys().indexOf(String(key || '')) !== -1;
      }

      function desktopRememberPrinted(key) {
        key = String(key || '');
        if (!key) return;
        try {
          var keys = desktopPrintedKeys().filter(function (row) {
            return row !== key;
          });
          keys.push(key);
          window.localStorage.setItem(
            desktopPrintStoreKey(),
            JSON.stringify(keys.slice(-100))
          );
        } catch (error) {}
      }

      function desktopAbsoluteUrl(rawUrl) {
        return new URL(String(rawUrl || ''), window.location.origin).toString();
      }

      async function notifyDesktopPaymentSuccess(meta) {
        var bridge = desktopBridge();
        if (!bridge || !meta) return;

        var receiptUrl = String(meta.receiptUrl || '');
        var key = String(meta.key || receiptUrl || '');
        if (!receiptUrl || !key || desktopWasPrinted(key)) return;

        try {
          var config = await bridge.getConfig();
          if (config && config.autoPrintReceipt === false) return;

          // PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109
          var printCall =
            bridge.printerCompatibilityV109 === true
            && typeof bridge.printReceiptUrl === 'function'
              ? bridge.printReceiptUrl
              : (
                  typeof bridge.printUrl === 'function'
                    ? bridge.printUrl
                    : bridge.printReceiptUrl
                );
          await printCall.call(
            bridge,
            desktopAbsoluteUrl(receiptUrl)
          );
          desktopRememberPrinted(key);
          toast(pmdT('payment.receipt_printed', 'Receipt printed'));
        } catch (error) {
          toast(
            'Payment recorded, but receipt could not print: '
              + ((error && error.message) || 'Unknown print error'),
            true
          );
        }
      }

      // PMD_CASHIER_LOCAL_POS_IDENTITY_R1
      var pmdLocalPosIdentityPromise = null;
      async function resolveLocalPosIdentity() {
        var cachedCode = '';
        try { cachedCode = String(window.localStorage.getItem('pmd_local_pos_device_code') || ''); } catch (e) {}
        if (pmdLocalPosIdentityPromise) return pmdLocalPosIdentityPromise;

        pmdLocalPosIdentityPromise = (async function () {
          var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timer = controller ? setTimeout(function () { controller.abort(); }, 900) : null;
          try {
            var response = await fetch('http://127.0.0.1:17877/identity?_=' + Date.now(), {
              method: 'GET', cache: 'no-store', mode: 'cors',
              signal: controller ? controller.signal : undefined,
              headers: {'Accept': 'application/json'}
            });
            if (!response.ok) throw new Error('Local POS identity HTTP ' + response.status);
            var identity = await response.json();
            if (identity && identity.paired && identity.device_code) {
              try { window.localStorage.setItem('pmd_local_pos_device_code', String(identity.device_code)); } catch (e) {}
              return identity;
            }
          } catch (e) {
            // Connector may not be installed. A single unambiguous drawer can
            // still be selected server-side; multiple drawers fail closed.
          } finally {
            if (timer) clearTimeout(timer);
          }
          return cachedCode ? {device_code: cachedCode, cached: true} : null;
        })();

        try { return await pmdLocalPosIdentityPromise; }
        finally { pmdLocalPosIdentityPromise = null; }
      }

      function resetPaymentState() {
        state.payment.loading = false;
        state.payment.submitting = false;
        state.payment.splitMode = 'full';
        state.payment.equalPeople = Math.max(2, Math.min(10, state.guestCount || 2));
        state.payment.customAmount = '';
        state.payment.itemQuantities = {};
        state.payment.method = 'cash';
        state.payment.providerCode = null;
        state.payment.terminalDeviceId = null;
        state.payment.terminalAttemptId = null;
        state.payment.terminalStatusRefreshing = false;
        state.payment.tipPercent = 0;
        state.payment.customTip = '';
        state.payment.coupon = null;
        state.payment.couponCode = '';
        state.payment.payerLabel = '';
        state.payment.reference = '';
        state.payment.cashReceived = '';
        state.payment.externalConfirmed = false;
        state.payment.idempotencyKey = uid('pay');
      }

      async function openPayment() {
        if (!state.activeOrderId) return toast(pmdT('payment.save_order_first', 'Save the order before taking payment.'), true);
        if (state.cart && state.cart.length) return toast(pmdT('payment.save_items_first', 'Save new items before taking payment.'), true);
        resetPaymentState();
        var modal = $('[data-pos-payment-modal]');
        if (!modal) return;

        state.payment.open = true;

        if (cashierMode) {
          // PMD_R77_CASHIER_PAYMENT_RENDER_BEFORE_SHOW
          // Build the complete Cashier payment UI while the modal is closed.
          // The user sees one finished frame instead of hidden -> mounted ->
          // rendered -> requestAnimationFrame reveal.
          modal.classList.remove(
            'is-show',
            'pmd-payment-is-preparing'
          );
          modal.setAttribute(
            'aria-hidden',
            'true'
          );

          await loadPaymentSummary(true);

          modal.classList.add('is-show');
          modal.setAttribute(
            'aria-hidden',
            'false'
          );
          return;
        }

        modal.classList.add('is-show');
        modal.setAttribute(
          'aria-hidden',
          'false'
        );

        await loadPaymentSummary(true);
      }

      function closePayment() {
        var modal = $('[data-pos-payment-modal]');
        if (modal) {
          modal.classList.remove('is-show', 'is-direct-terminal', 'is-online-payment');
          modal.setAttribute('aria-hidden', 'true');
        }
        state.payment.open = false;
      }

      async function loadPaymentSummary(silent) {
        if (!state.activeOrderId || state.payment.loading) return;
        state.payment.loading = true;
        try {
          var summary = await fetchJson(paymentSummaryUrl() + '?_=' + Date.now());
          state.payment.summary = summary;
          var remaining = paymentRemaining();
          if (state.payment.cashReceived === '') state.payment.cashReceived = roundMoney(remaining).toFixed(2);
          renderPayment();
          if (!silent) toast(pmdT('payment.status_updated', 'Payment status updated'));
        } catch (error) {
          toast(error.message || pmdT('payment.load_error', 'Could not load payment details.'), true);
        } finally {
          state.payment.loading = false;
          renderPayment();
        }
      }

      function paymentRemaining() {
        return toNumber(state.payment.summary && state.payment.summary.settlement && state.payment.summary.settlement.remaining_amount, 0);
      }

      function selectedItemPayload() {
        var summary = state.payment.summary || {};
        return (summary.items || []).reduce(function (rows, item) {
          var quantity = toNumber(state.payment.itemQuantities[String(item.order_menu_id)], 0);
          if (quantity > 0) rows.push({order_menu_id: Number(item.order_menu_id), quantity: quantity});
          return rows;
        }, []);
      }

      function paymentBaseAmount() {
        var remaining = paymentRemaining();
        if (state.payment.method === 'direct_terminal') return remaining;
        if (state.payment.splitMode === 'full') return remaining;
        if (state.payment.splitMode === 'equal') return roundMoney(remaining / Math.max(2, state.payment.equalPeople));
        if (state.payment.splitMode === 'custom') return Math.min(remaining, Math.max(0, toNumber(state.payment.customAmount, 0)));
        if (state.payment.splitMode === 'items') {
          var summary = state.payment.summary || {};
          var ratio = toNumber(summary.settlement && summary.settlement.gross_ratio, 1);
          return roundMoney((summary.items || []).reduce(function (sum, item) {
            var quantity = toNumber(state.payment.itemQuantities[String(item.order_menu_id)], 0);
            return sum + toNumber(item.unit_price, 0) * quantity * ratio;
          }, 0));
        }
        return remaining;
      }

      function paymentTipAmount() {
        if (state.payment.method === 'direct_terminal') return 0;
        var base = paymentBaseAmount();
        if (state.payment.tipPercent === 'custom') return Math.max(0, roundMoney(state.payment.customTip));
        return roundMoney(base * (toNumber(state.payment.tipPercent, 0) / 100));
      }

      function couponDiscount() {
        return state.payment.method === 'direct_terminal' ? 0 : (state.payment.coupon ? toNumber(state.payment.coupon.discount, 0) : 0);
      }

      function paymentPayable() {
        return roundMoney(Math.max(0, paymentBaseAmount() + paymentTipAmount() - couponDiscount()));
      }

      function terminalProviders() {
        return (state.payment.summary && state.payment.summary.terminal_providers) || [];
      }

      function selectedTerminal() {
        return terminalProviders().find(function (row) {
          return String(row.provider_code || '') === String(state.payment.providerCode || '') &&
            String(row.terminal_device_id || '') === String(state.payment.terminalDeviceId || '');
        }) || null;
      }

      function terminalIsOnline(row) {
        return !!row && String(row.terminal_status || '').toLowerCase() === 'online';
      }

      function mergeTestedTerminal(result) {
        if (!result || !result.terminal_device_id || !state.payment.summary) return;
        var id = String(result.terminal_device_id);
        (state.payment.summary.terminal_providers || []).forEach(function (row) {
          if (String(row.terminal_device_id || '') !== id) return;
          if (result.terminal_status) row.terminal_status = String(result.terminal_status).toLowerCase();
          if (result.pairing_state) row.pairing_state = String(result.pairing_state).toLowerCase();
        });
      }

      async function refreshDirectTerminalStatuses() {
        if (state.payment.terminalStatusRefreshing || state.payment.method !== 'direct_terminal') return;
        var providers = terminalProviders().filter(function (row) {
          return String(row.provider_code || '').toLowerCase() === 'sumup' && Number(row.terminal_device_id) > 0;
        });
        if (!providers.length) return;

        state.payment.terminalStatusRefreshing = true;
        renderPayment();
        try {
          await Promise.all(providers.map(async function (row) {
            try {
              var result = await fetchJson(terminalReaderTestUrl(row.terminal_device_id), {
                method: 'POST',
                headers: jsonHeaders(),
                body: '{}'
              });
              mergeTestedTerminal(result);
            } catch (error) {
              // Keep the last known status. The charge request still has server-side provider authority.
            }
          }));
        } finally {
          state.payment.terminalStatusRefreshing = false;
          var current = selectedTerminal();
          if (!terminalIsOnline(current)) {
            var firstOnline = terminalProviders().find(terminalIsOnline);
            state.payment.providerCode = firstOnline ? firstOnline.provider_code : null;
            state.payment.terminalDeviceId = firstOnline ? (firstOnline.terminal_device_id || null) : null;
          }
          renderPayment();
        }
      }

      function renderPaymentBalance() {
        var summary = state.payment.summary;
        var container = $('[data-pos-payment-balance]');
        var subtitle = $('[data-pos-payment-subtitle]');
        if (!container) return;
        if (!summary) {
          container.innerHTML = '<div class="pmd-pos-payment-history-empty">Loading…</div>';
          return;
        }
        var settlement = summary.settlement || {};

        if (cashierMode) {
          container.innerHTML =
            '<div class="pmd-pos-balance-card is-remaining pmd-pos-balance-hero">' +
              // PMD_PAYMENT_V3_R60E_STABLE_BALANCE
              '<span>' + esc(pmdT('payment.total', 'Total')) + '</span>' +
              '<b>' +
                money(paymentPayable()) +
              '</b>' +
            '</div>';

          if (subtitle) {
            subtitle.textContent = '';
            subtitle.hidden = true;
          }
        } else {
          container.innerHTML =
            '<div class="pmd-pos-balance-card is-remaining pmd-pos-balance-hero">' +
              '<span>' + esc(pmdT('payment.amount_due', 'Amount due')) + '</span>' +
              '<b>' +
                money(settlement.remaining_amount) +
              '</b>' +
              '<small>Order total ' +
                money(settlement.order_total) +
                ' · Paid ' +
                money(settlement.settled_amount) +
              '</small>' +
            '</div>';

          if (subtitle) {
            subtitle.textContent =
              'Order #' +
              summary.order.order_id +
              ' · ' +
              (
                summary.table
                  ? summary.table.name
                  : 'Table order'
              );
          }
        }
      }

      function renderSplitPanel() {
        var panel = $('[data-pos-split-panel]');
        var summary = state.payment.summary;
        if (!panel || !summary) return;
        if (state.payment.method === 'direct_terminal') {
          state.payment.splitMode = 'full';
          panel.innerHTML = '';
          return;
        }
        $$('[data-split-mode]').forEach(function (button) {
          button.classList.toggle('is-active', button.dataset.splitMode === state.payment.splitMode);
        });
        var remaining = paymentRemaining();
        if (state.payment.splitMode === 'full') {
          panel.innerHTML = '<div class="pmd-pos-split-equal"><div><strong>' + esc(pmdT('payment.full_balance', 'Full balance')) + '</strong><small>' + esc(pmdT('payment.pay_remaining', 'Pay everything remaining on this order.')) + '</small></div><b>' + money(remaining) + '</b></div>';
        } else if (state.payment.splitMode === 'equal') {
          panel.innerHTML = '<div class="pmd-pos-split-equal"><div><strong>One of ' + state.payment.equalPeople + ' equal shares</strong><small>Reopen payment for the next payer.</small></div><div class="pmd-pos-split-stepper"><button type="button" data-equal-minus>−</button><b>' + state.payment.equalPeople + '</b><button type="button" data-equal-plus>+</button></div></div>';
          var minus = $('[data-equal-minus]', panel);
          var plus = $('[data-equal-plus]', panel);
          if (minus) minus.onclick = function () { state.payment.equalPeople = Math.max(2, state.payment.equalPeople - 1); renderPayment(); };
          if (plus) plus.onclick = function () { state.payment.equalPeople = Math.min(10, state.payment.equalPeople + 1); renderPayment(); };
        } else if (state.payment.splitMode === 'items') {
          var unpaid = (summary.items || []).filter(function (item) { return toNumber(item.unpaid_quantity, 0) > 0; });
          panel.innerHTML = '<div class="pmd-pos-split-items">' + unpaid.map(function (item) {
            var key = String(item.order_menu_id);
            var value = state.payment.itemQuantities[key] || 0;
            return '<label class="pmd-pos-split-item"><span class="pmd-pos-split-item-name">' + esc(item.name) + '<small>' + esc(item.unpaid_quantity) + ' available · ' + money(item.unit_price) + '</small></span><input class="pmd-pos-item-pay-qty" data-pay-item="' + esc(key) + '" type="number" min="0" max="' + esc(item.unpaid_quantity) + '" step="1" value="' + esc(value) + '"><b>' + money(toNumber(value, 0) * toNumber(item.unit_price, 0)) + '</b></label>';
          }).join('') + '</div>';
          $$('[data-pay-item]', panel).forEach(function (input) {
            input.oninput = function () {
              var item = unpaid.find(function (row) { return String(row.order_menu_id) === String(input.dataset.payItem); });
              var max = item ? toNumber(item.unpaid_quantity, 0) : 0;
              state.payment.itemQuantities[String(input.dataset.payItem)] = Math.max(0, Math.min(max, toNumber(input.value, 0)));
              renderPaymentBalance();
              renderPaymentTotals();
            };
          });
        } else {
          panel.innerHTML = '<div class="pmd-pos-custom-row"><label><span class="pmd-pos-payment-block-title"><b>Amount</b><span>Max ' + money(remaining) + '</span></span><input type="number" min="0.01" max="' + esc(remaining) + '" step="0.01" class="pmd-pos-payment-input" data-custom-payment value="' + esc(state.payment.customAmount) + '" placeholder="0.00"></label><b>' + money(paymentBaseAmount()) + '</b></div>';
          var custom = $('[data-custom-payment]', panel);
          if (custom) custom.oninput = function () { state.payment.customAmount = custom.value; renderPaymentBalance(); renderPaymentTotals(); };
        }
      }

      function renderMethods() {
        var summary = state.payment.summary;
        var container = $('[data-pos-methods]');
        var onlineBox = $('[data-pos-online-box]');
        var terminalBox = $('[data-pos-terminal-box]');
        if (!summary || !container) return;

        // Staff checkout is intentionally limited to the two actions a waiter needs.
        // Online methods remain available to guests in the digital-menu checkout.
        var methods = [{key: 'cash', name: pmdT('payment.cash', 'Cash'), note: pmdT('payment.cash_payment', 'Cash payment')}];
        if (terminalProviders().length) {
          methods.push({key: 'direct_terminal', name: pmdT('payment.terminal', 'Terminal'), note: pmdT('payment.pay_connected_terminal', 'Pay on a connected terminal')});
        }

        container.innerHTML = methods.map(function (method) {
          return '<button type="button" class="pmd-pos-method ' + (state.payment.method === method.key ? 'is-active' : '') + '" data-payment-method="' + esc(method.key) + '"><b>' + esc(method.name) + '</b><small>' + esc(method.note) + '</small></button>';
        }).join('');

        $$('[data-payment-method]', container).forEach(function (button) {
          button.onclick = function () {
            state.payment.method = button.dataset.paymentMethod;
            state.payment.providerCode = null;
            state.payment.terminalDeviceId = null;
            state.payment.terminalAttemptId = null;
            state.payment.idempotencyKey = uid('pay');
            if (state.payment.method === 'direct_terminal') {
              state.payment.splitMode = 'full';

              if (!cashierMode) {
                if (!cashierCheckout) {
                  state.payment.tipPercent = 0;
                  state.payment.customTip = '';
                  state.payment.coupon = null;
                  state.payment.couponCode = '';
                }
              }
            }
            renderPayment();
            if (state.payment.method === 'direct_terminal') refreshDirectTerminalStatuses();
          };
        });

        if (onlineBox) onlineBox.hidden = true;

        if (terminalBox) {
          terminalBox.hidden = state.payment.method !== 'direct_terminal';
          if (state.payment.method === 'direct_terminal') {
            var providers = terminalProviders();
            var selected = selectedTerminal();
            if (!terminalIsOnline(selected)) {
              var firstOnline = providers.find(terminalIsOnline);
              state.payment.providerCode = firstOnline ? firstOnline.provider_code : null;
              state.payment.terminalDeviceId = firstOnline ? (firstOnline.terminal_device_id || null) : null;
            }

            var onlineCount = providers.filter(terminalIsOnline).length;
            // PMD_PAYMENT_V3_R60E_STABLE_TERMINAL_STATUS
            //
            // Refresh terminal health without replacing the
            // visible UI with an intermediate loading frame.
            var subtitle =
              onlineCount
                ? (
                    providers.length > 1
                      ? 'Choose where the customer pays'
                      : 'Ready'
                  )
                : pmdT('payment.no_terminal_online', 'No terminal online');

            terminalBox.setAttribute(
              'aria-busy',
              state.payment.terminalStatusRefreshing
                ? 'true'
                : 'false'
            );

            terminalBox.innerHTML = '<div class="pmd-pos-terminal-title"><b>' + (providers.length > 1 ? pmdT('payment.choose_terminal', 'Choose terminal') : pmdT('payment.terminal', 'Terminal')) + '</b><span>' + esc(subtitle) + '</span></div><div class="pmd-pos-terminal-provider-row">' + providers.map(function (provider) {
              var id = provider.terminal_device_id || '';
              var status = String(provider.terminal_status || 'unknown').toLowerCase();
              var isOnline = status === 'online';
              var active = state.payment.providerCode === provider.provider_code && String(state.payment.terminalDeviceId || '') === String(id);
              return '<button type="button" data-terminal-provider="' + esc(provider.provider_code) + '" data-terminal-device-id="' + esc(id) + '" class="' + (active ? 'is-active ' : '') + (isOnline ? 'is-online' : 'is-offline') + '" ' + (!isOnline ? 'disabled' : '') + '><span>' + esc(provider.name || 'Terminal') + '</span><small><i></i>' + esc(isOnline ? pmdT('payment.online', 'Online') : status) + '</small></button>';
            }).join('') + '</div>';

            $$('[data-terminal-provider]', terminalBox).forEach(function (button) {
              button.onclick = function () {
                if (button.disabled) return;
                state.payment.providerCode = button.dataset.terminalProvider;
                state.payment.terminalDeviceId = button.dataset.terminalDeviceId ? Number(button.dataset.terminalDeviceId) : null;
                renderPayment();
              };
            });
          }
        }

        var referenceField = $('[data-pos-reference-field]');
        var externalConfirm = $('[data-pos-external-confirm-row]');
        var cashField = $('[data-pos-cash-field]');
        if (referenceField) referenceField.hidden = true;
        if (externalConfirm) externalConfirm.hidden = true;
        if (cashField) cashField.hidden = state.payment.method !== 'cash';
      }

      function renderAdjustments() {
        $$('[data-tip-percent]').forEach(function (button) {
          button.classList.toggle('is-active', String(button.dataset.tipPercent) === String(state.payment.tipPercent));
        });
        var custom = $('[data-pos-custom-tip]');
        if (custom) {
          custom.hidden = state.payment.tipPercent !== 'custom';
          custom.value = state.payment.customTip;
        }
        var code = $('[data-pos-coupon-code]');
        if (code && code.value !== state.payment.couponCode) code.value = state.payment.couponCode;
        var result = $('[data-pos-coupon-result]');
        if (result) result.textContent = state.payment.coupon ? state.payment.coupon.code + ' applied: −' + money(state.payment.coupon.discount) : '';
        var payer = $('[data-pos-payer-label]');
        if (payer && payer.value !== state.payment.payerLabel) payer.value = state.payment.payerLabel;
        var reference = $('[data-pos-payment-reference]');
        if (reference && reference.value !== state.payment.reference) reference.value = state.payment.reference;
        var cash = $('[data-pos-cash-received]');
        if (cash && document.activeElement !== cash && cash.value !== state.payment.cashReceived) cash.value = state.payment.cashReceived;
        var confirm = $('[data-pos-external-confirm]');
        if (confirm) confirm.checked = state.payment.externalConfirmed;
      }

      function renderPaymentTotals() {
        var container = $('[data-pos-payment-totals]');
        var payButton = $('[data-pos-pay-button]');
        var changeBox = $('[data-pos-change-box]');
        var copy = $('[data-pos-copy-link]');
        var refresh = $('[data-pos-refresh-payment]');
        if (!container) return;

        var base = paymentBaseAmount();
        var payable = paymentPayable();
        var direct = state.payment.method === 'direct_terminal';
        container.innerHTML = '<div class="pmd-pos-pay-totals is-simple"><div class="pmd-pos-pay-total-row is-grand"><span>' + (direct ? 'Charge' : 'Total') + '</span><strong>' + money(payable) + '</strong></div></div>';

        var cashReceived = toNumber(state.payment.cashReceived, 0);
        var change = Math.max(0, roundMoney(cashReceived - payable));
        if (changeBox) {
          changeBox.hidden = state.payment.method !== 'cash' || cashReceived < payable;
          if (!changeBox.hidden) changeBox.textContent = pmdT('payment.change', 'Change: :amount', {amount: money(change)});
        }
        if (copy) copy.hidden = true;
        if (refresh) refresh.hidden = !state.payment.terminalAttemptId;

        if (payButton) {
          var chosen = selectedTerminal();
          if (cashierMode) {
            payButton.textContent = pmdT('payment.pay', 'Pay');
          } else if (direct) {
            if (state.payment.terminalStatusRefreshing) payButton.textContent = pmdT('payment.checking_terminal', 'Checking terminal…');
            else if (!chosen) payButton.textContent = pmdT('payment.no_terminal_online', 'No terminal online');
            else payButton.textContent = 'Charge ' + money(payable);
          } else {
            payButton.textContent = pmdT('payment.record_cash', 'Record cash');
          }

          var canCollect = state.payment.summary && state.payment.summary.permissions && state.payment.summary.permissions.can_collect_payment;
          var valid = base > 0 && payable > 0 && !state.payment.submitting;
          if (!direct && !canCollect) valid = false;
          if (state.payment.method === 'cash' && cashReceived + 0.001 < payable) valid = false;
          if (direct && (!state.payment.providerCode || !state.payment.terminalDeviceId || !terminalIsOnline(chosen) || state.payment.terminalStatusRefreshing)) valid = false;
          payButton.disabled = !valid;
        }
      }

      function renderPaymentHistory() {
        var summary = state.payment.summary;
        var container = $('[data-pos-payment-history]');
        var count = $('[data-pos-payment-history-count]');
        var wrap = container ? container.closest('.pmd-pos-payment-history-wrap') : null;
        if (!container || !summary) return;
        var rows = summary.transactions || [];
        if (wrap) wrap.hidden = !rows.length;
        if (count) count.textContent = rows.length ? rows.length + ' payment' + (rows.length === 1 ? '' : 's') : '';
        if (!rows.length) {
          container.innerHTML = '';
          return;
        }
        container.innerHTML = rows.map(function (tx) {
          return '<article class="pmd-pos-payment-history-item"><div><b>' + esc(String(tx.payment_method || '').replace(/_/g, ' ')) + ' · ' + money(tx.amount) + '</b><a href="' + esc(tx.receipt_url || '#') + '" target="_blank" rel="noopener">Receipt</a></div><small>' + esc(tx.paid_at || '') + '</small></article>';
        }).join('');
      }

      function renderPayment() {
        if (!state.payment.open) return;
        var modal = $('[data-pos-payment-modal]');
        if (modal) {
          modal.classList.toggle('is-direct-terminal', state.payment.method === 'direct_terminal');
          modal.classList.remove('is-online-payment');
        }
        renderPaymentBalance();
        if (!state.payment.summary) return;
        renderSplitPanel();
        renderMethods();
        renderAdjustments();
        renderPaymentTotals();
        renderPaymentHistory();
      }

      async function applyCoupon() {
        var input = $('[data-pos-coupon-code]');
        var result = $('[data-pos-coupon-result]');

        if (result) {
          result.classList.remove(
            'is-error',
            'is-success'
          );
        }

        var code = String(input ? input.value : '').trim().toUpperCase();
        state.payment.couponCode = code;
        state.payment.coupon = null;
        if (!code) return renderPaymentTotals();
        if (Math.abs(paymentBaseAmount() - paymentRemaining()) > 0.02) {
          if (result) result.textContent = 'Coupon requires the full remaining balance.';
          return;
        }
        try {
          var json = await fetchJson(paymentCouponUrl(), {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({code: code, amount: paymentBaseAmount()})
          });
          state.payment.coupon = json;
          renderPayment();

          if (result) {
            result.classList.remove(
              'is-error'
            );
            result.classList.add(
              'is-success'
            );
          }
        } catch (error) {
          if (result) {
            result.textContent =
              error.message ||
              'Coupon is invalid.';

            result.classList.remove(
              'is-success'
            );
            result.classList.add(
              'is-error'
            );
          }
        }
      }

      function onlineMethodCode() {
        return state.payment.method.indexOf('online:') === 0 ? state.payment.method.split(':').slice(1).join(':') : null;
      }

      function guestCheckoutUrl() {
        var summary = state.payment.summary;
        if (!summary || !summary.guest_checkout_url) return null;
        var url = new URL(summary.guest_checkout_url, location.origin);
        var method = onlineMethodCode();
        if (method) url.searchParams.set('payment_method', method);
        url.searchParams.set('source', 'waiter_pos');
        return url.toString();
      }

      async function copyPaymentLink() {
        var url = guestCheckoutUrl();
        if (!url) return toast('Customer payment link is unavailable.', true);
        try {
          await navigator.clipboard.writeText(url);
          toast('Payment link copied');
        } catch (error) {
          window.prompt('Copy payment link:', url);
        }
      }

      async function executePayment() {
        if (!state.payment.summary || state.payment.submitting) return;
        if (state.payment.method.indexOf('online:') === 0) {
          var checkout = guestCheckoutUrl();
          if (!checkout) return toast('Customer checkout is unavailable.', true);
          window.open(checkout, '_blank', 'noopener');
          return toast('Customer checkout opened.');
        }
        if (state.payment.method === 'direct_terminal') return executeTerminalPayment();

        state.payment.submitting = true;
        renderPaymentTotals();
        var summary = state.payment.summary;
        var paymentKey = state.payment.idempotencyKey;
        try {
          var localPosIdentity = state.payment.method === 'cash' && !desktopBridge()
            ? await resolveLocalPosIdentity()
            : null;
          var json = await fetchJson(paymentSettleUrl(), {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({
              idempotency_key: state.payment.idempotencyKey,
              payment_method: state.payment.method,
              pos_device_code: localPosIdentity && localPosIdentity.device_code ? String(localPosIdentity.device_code) : null,
              desktop_hardware_managed: !!desktopBridge(),
              provider_code: state.payment.method === 'external_terminal' ? 'external_terminal' : null,
              split_mode: state.payment.splitMode,
              amount: paymentBaseAmount(),
              selected_items: state.payment.splitMode === 'items' ? selectedItemPayload() : null,
              tip_amount: paymentTipAmount(),
              coupon_code: state.payment.coupon ? state.payment.coupon.code : null,
              payer_label: state.payment.payerLabel,
              payment_reference: state.payment.reference,
              cash_received: state.payment.method === 'cash' ? toNumber(state.payment.cashReceived, paymentPayable()) : null,
              external_confirmed: state.payment.method === 'external_terminal' ? state.payment.externalConfirmed : false,
              expected_remaining: summary.settlement.remaining_amount,
              expected_updated_at: summary.order.updated_at
            })
          });
          state.payment.summary = json.summary || state.payment.summary;
          void notifyDesktopPaymentSuccess({
            key: paymentKey,
            paymentMethod: state.payment.method,
            receiptUrl: json.receipt_url,
            settlementStatus: json.settlement_status,
            orderId: state.activeOrderId
          });
          state.payment.idempotencyKey = uid('pay');
          renderPayment();
          toast(json.message || 'Payment recorded');
          if (json.cash_drawer && json.cash_drawer.ok === false && !json.cash_drawer.skipped) {
            toast(json.cash_drawer.message || 'Payment recorded, but the cash drawer did not open.', true);
          }
          showSuccess(json.message || 'Payment recorded.');
          await refreshData(true);
          if (json.settlement_status === 'paid') {
            if (cashierCheckout) {
              closePayment();
              window.setTimeout(closeCart, 0);
            } else {
              setTimeout(closePayment, 900);
            }
          }
        } catch (error) {
          toast(error.message || 'Payment failed.', true);
          if (error.status === 409 || error.status === 422) await loadPaymentSummary(true);
        } finally {
          state.payment.submitting = false;
          renderPayment();
        }
      }

      async function executeTerminalPayment() {
        var chosen = selectedTerminal();
        if (!state.payment.providerCode || !state.payment.terminalDeviceId || !chosen) return toast('Choose an online terminal.', true);

        state.payment.submitting = true;
        renderPaymentTotals();
        try {
          // SumUp device status can become stale between opening the modal and charging.
          // Re-check immediately before the payment request, then let the provider response remain authoritative.
          if (String(state.payment.providerCode).toLowerCase() === 'sumup') {
            var tested = await fetchJson(terminalReaderTestUrl(state.payment.terminalDeviceId), {
              method: 'POST',
              headers: jsonHeaders(),
              body: '{}'
            });
            mergeTestedTerminal(tested);
            chosen = selectedTerminal();
            if (!terminalIsOnline(chosen)) {
              renderPayment();
              toast('This terminal is offline. Turn it on or choose another terminal.', true);
              return;
            }
          }

          var json = await fetchJson(terminalPaymentUrl(), {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({
              provider_code: state.payment.providerCode,
              terminal_device_id: state.payment.terminalDeviceId
            })
          });
          state.payment.terminalAttemptId = Number(json.attempt_id) || null;
          toast(json.message || 'Payment sent to terminal.');
          renderPayment();
          if (state.payment.terminalAttemptId) await pollTerminalPayment(state.payment.terminalAttemptId);
        } catch (error) {
          toast(error.message || 'Could not send payment to terminal.', true);
        } finally {
          state.payment.submitting = false;
          renderPayment();
        }
      }

      async function refreshTerminalAttempt(attemptId) {
        return fetchJson(terminalAttemptRefreshUrl(attemptId), {
          method: 'POST',
          headers: jsonHeaders(),
          body: '{}'
        });
      }

      async function latestTerminalAttemptId() {
        var json = await fetchJson(terminalAttemptsUrl() + '?_=' + Date.now());
        var attempts = json.attempts || [];
        return attempts.length ? Number(attempts[0].id) || null : null;
      }

      async function finishTerminalStatus(result, silent) {
        var status = String(result && result.status ? result.status : '').toLowerCase();
        if (status === 'paid') {
          await loadPaymentSummary(true);
          var desktopReceiptUrl = latestDesktopReceiptUrl();
          void notifyDesktopPaymentSuccess({
            key: desktopReceiptUrl || ('terminal:' + state.activeOrderId + ':' + (state.payment.terminalAttemptId || 'paid')),
            paymentMethod: 'direct_terminal',
            receiptUrl: desktopReceiptUrl,
            settlementStatus: 'paid',
            orderId: state.activeOrderId
          });
          await refreshData(true);
          toast('Payment approved.');
          showSuccess('Payment approved.');
          if (cashierCheckout) {
            closePayment();
            window.setTimeout(closeCart, 0);
          } else {
            setTimeout(closePayment, 850);
          }

          return true;
        }
        if (status === 'failed' || status === 'cancelled' || status === 'reconciliation_required') {
          await loadPaymentSummary(true);
          toast((result && result.message) || 'Terminal payment failed.', true);
          return true;
        }
        if (!silent) toast('Waiting for terminal confirmation.');
        return false;
      }

      async function pollTerminalPayment(attemptId) {
        state.payment.terminalAttemptId = Number(attemptId);
        for (var i = 0; i < 45; i++) {
          await wait(2000);
          var result = await refreshTerminalAttempt(attemptId);
          if (await finishTerminalStatus(result, true)) return result;
        }
        toast('Payment is still processing. Check status again.', true);
        return null;
      }

      async function refreshTerminalPaymentStatus() {
        try {
          var attemptId = state.payment.terminalAttemptId || await latestTerminalAttemptId();
          if (!attemptId) return loadPaymentSummary(false);
          state.payment.terminalAttemptId = attemptId;
          var result = await refreshTerminalAttempt(attemptId);
          if (!(await finishTerminalStatus(result, false))) await loadPaymentSummary(true);
        } catch (error) {
          toast(error.message || 'Could not refresh terminal payment.', true);
        }
      }

      function bindPayment() {
        var modal = $('[data-pos-payment-modal]');
        var close = $('[data-pos-payment-close]');
        if (close) close.onclick = closePayment;
        if (modal) modal.addEventListener('click', function (event) { if (event.target === modal) closePayment(); });
        $$('[data-split-mode]').forEach(function (button) {
          button.onclick = function () {
            state.payment.splitMode = button.dataset.splitMode;
            state.payment.coupon = null;
            state.payment.couponCode = '';
            state.payment.idempotencyKey = uid('pay');
            renderPayment();
          };
        });
        $$('[data-tip-percent]').forEach(function (button) {
          button.onclick = function () {
            state.payment.tipPercent = button.dataset.tipPercent === 'custom' ? 'custom' : Number(button.dataset.tipPercent);
            renderPayment();
          };
        });
        var customTip = $('[data-pos-custom-tip]');
        if (customTip) customTip.oninput = function () { state.payment.customTip = customTip.value; renderPaymentTotals(); };
        var couponCode = $('[data-pos-coupon-code]');
        if (couponCode) couponCode.oninput = function () { state.payment.couponCode = couponCode.value.toUpperCase(); state.payment.coupon = null; renderPaymentTotals(); };
        var couponApply = $('[data-pos-coupon-apply]');
        if (couponApply) couponApply.onclick = applyCoupon;
        var payer = $('[data-pos-payer-label]');
        if (payer) payer.oninput = function () { state.payment.payerLabel = payer.value; };
        var reference = $('[data-pos-payment-reference]');
        if (reference) reference.oninput = function () { state.payment.reference = reference.value; renderPaymentTotals(); };
        var cash = $('[data-pos-cash-received]');
        if (cash) cash.oninput = function () { state.payment.cashReceived = cash.value; renderPaymentTotals(); };
        var external = $('[data-pos-external-confirm]');
        if (external) external.onchange = function () { state.payment.externalConfirmed = external.checked; renderPaymentTotals(); };
        var pay = $('[data-pos-pay-button]');
        if (pay) pay.onclick = executePayment;
        var copy = $('[data-pos-copy-link]');
        if (copy) copy.onclick = copyPaymentLink;
        var refresh = $('[data-pos-refresh-payment]');
        if (refresh) refresh.onclick = refreshTerminalPaymentStatus;
      }

      return {
        openPayment: openPayment,
        closePayment: closePayment,
        bindPayment: bindPayment,
        renderPayment: renderPayment,
        paymentRemaining: paymentRemaining,
        loadPaymentSummary: loadPaymentSummary
      };
    }
  };
})();

