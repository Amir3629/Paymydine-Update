(function () {
  'use strict';
  if (window.PMDWaiterPOSPaymentV2) return;

  window.PMDWaiterPOSPaymentV2 = {
    install: function (ctx) {
      var root = ctx.root;
      var state = ctx.state;
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
      var closeCart = ctx.closeCart;
      var refreshData = ctx.refreshData;

    function paymentSummaryUrl() { return replaceOrderToken(state.settings.payment_summary_url, state.activeOrderId); }
    function paymentSettleUrl() { return replaceOrderToken(state.settings.payment_settle_url, state.activeOrderId); }
    function paymentCouponUrl() { return replaceOrderToken(state.settings.payment_coupon_url, state.activeOrderId); }
    function terminalPaymentUrl() { return replaceOrderToken(state.settings.terminal_payment_url, state.activeOrderId); }

    function resetPaymentState() {
      state.payment.loading = false;
      state.payment.submitting = false;
      state.payment.splitMode = 'full';
      state.payment.equalPeople = Math.max(2, Math.min(10, state.guestCount || 2));
      state.payment.customAmount = '';
      state.payment.itemQuantities = {};
      state.payment.method = 'cash';
      state.payment.providerCode = null;
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
      if (!state.activeOrderId) return toast('Send or hold the order first.', true);
      if (state.cart.length) return toast('Send or hold new items before taking payment.', true);
      resetPaymentState();
      var modal = $('[data-pos-payment-modal]');
      if (!modal) return;
      modal.classList.add('is-show');
      modal.setAttribute('aria-hidden', 'false');
      state.payment.open = true;
      await loadPaymentSummary();
    }

    function closePayment() {
      var modal = $('[data-pos-payment-modal]');
      if (modal) {
        modal.classList.remove('is-show');
        modal.setAttribute('aria-hidden', 'true');
      }
      state.payment.open = false;
    }

    async function loadPaymentSummary(silent) {
      if (!state.activeOrderId || state.payment.loading) return;
      state.payment.loading = true;
      renderPayment();
      try {
        var summary = await fetchJson(paymentSummaryUrl() + '?_=' + Date.now());
        state.payment.summary = summary;
        var remaining = toNumber(summary.settlement && summary.settlement.remaining_amount, 0);
        if (state.payment.cashReceived === '') state.payment.cashReceived = roundMoney(remaining).toFixed(2);
        renderPayment();
        if (!silent) toast('Payment balance refreshed');
      } catch (error) {
        toast(error.message || 'Could not load payment details.', true);
        closePayment();
      } finally {
        state.payment.loading = false;
        renderPayment();
      }
    }

    function paymentRemaining() {
      return toNumber(state.payment.summary && state.payment.summary.settlement && state.payment.summary.settlement.remaining_amount, 0);
    }

    function selectedItemPayload() {
      var summary = state.payment.summary;
      if (!summary) return [];
      return (summary.items || []).reduce(function (rows, item) {
        var quantity = toNumber(state.payment.itemQuantities[String(item.order_menu_id)], 0);
        if (quantity > 0) rows.push({order_menu_id: Number(item.order_menu_id), quantity: quantity});
        return rows;
      }, []);
    }

    function paymentBaseAmount() {
      var remaining = paymentRemaining();
      if (state.payment.splitMode === 'full') return remaining;
      if (state.payment.splitMode === 'equal') return roundMoney(remaining / Math.max(2, state.payment.equalPeople));
      if (state.payment.splitMode === 'custom') return Math.min(remaining, Math.max(0, toNumber(state.payment.customAmount, 0)));
      if (state.payment.splitMode === 'items') {
        var summary = state.payment.summary;
        var grossRatio = toNumber(summary && summary.settlement && summary.settlement.gross_ratio, 1);
        return roundMoney((summary.items || []).reduce(function (sum, item) {
          var quantity = toNumber(state.payment.itemQuantities[String(item.order_menu_id)], 0);
          return sum + toNumber(item.unit_price, 0) * quantity * grossRatio;
        }, 0));
      }
      return remaining;
    }

    function paymentTipAmount() {
      var base = paymentBaseAmount();
      if (state.payment.tipPercent === 'custom') return Math.max(0, roundMoney(state.payment.customTip));
      return roundMoney(base * (toNumber(state.payment.tipPercent, 0) / 100));
    }

    function couponDiscount() {
      return state.payment.coupon ? toNumber(state.payment.coupon.discount, 0) : 0;
    }

    function paymentPayable() {
      return roundMoney(Math.max(0, paymentBaseAmount() + paymentTipAmount() - couponDiscount()));
    }

    function renderPaymentBalance() {
      var summary = state.payment.summary;
      var container = $('[data-pos-payment-balance]');
      var subtitle = $('[data-pos-payment-subtitle]');
      if (!container) return;
      if (!summary) {
        container.innerHTML = '<div class="pmd-pos-payment-history-empty">Loading balance…</div>';
        return;
      }
      var settlement = summary.settlement || {};
      container.innerHTML = [
        ['Order total', settlement.order_total, ''],
        ['Already paid', settlement.settled_amount, ''],
        ['Remaining', settlement.remaining_amount, 'is-remaining'],
      ].map(function (row) {
        return '<div class="pmd-pos-balance-card ' + row[2] + '"><span>' + esc(row[0]) + '</span><b>' + money(row[1]) + '</b></div>';
      }).join('');
      if (subtitle) subtitle.textContent = 'Order #' + summary.order.order_id + ' · ' + (summary.table ? summary.table.name : 'Table order') + ' · ' + String(settlement.status || 'unpaid').toUpperCase();
    }

    function renderSplitPanel() {
      var panel = $('[data-pos-split-panel]');
      var summary = state.payment.summary;
      if (!panel || !summary) return;
      $$('[data-split-mode]').forEach(function (button) {
        button.classList.toggle('is-active', button.dataset.splitMode === state.payment.splitMode);
      });
      var remaining = paymentRemaining();
      if (state.payment.splitMode === 'full') {
        panel.innerHTML = '<div class="pmd-pos-split-equal"><div><strong>Pay the complete remaining balance</strong><small>Closes the order when provider payment is confirmed.</small></div><b>' + money(remaining) + '</b></div>';
      } else if (state.payment.splitMode === 'equal') {
        panel.innerHTML = '<div class="pmd-pos-split-equal"><div><strong>Split across ' + state.payment.equalPeople + ' people</strong><small>This payer covers one equal share. Reopen Payment for the next payer.</small></div><div class="pmd-pos-split-stepper"><button type="button" data-equal-minus>−</button><b>' + state.payment.equalPeople + '</b><button type="button" data-equal-plus>+</button></div></div>';
        var minus = $('[data-equal-minus]', panel);
        var plus = $('[data-equal-plus]', panel);
        if (minus) minus.onclick = function () { state.payment.equalPeople = Math.max(2, state.payment.equalPeople - 1); renderPayment(); };
        if (plus) plus.onclick = function () { state.payment.equalPeople = Math.min(10, state.payment.equalPeople + 1); renderPayment(); };
      } else if (state.payment.splitMode === 'items') {
        var unpaidItems = (summary.items || []).filter(function (item) { return toNumber(item.unpaid_quantity, 0) > 0; });
        panel.innerHTML = '<div class="pmd-pos-split-items">' + unpaidItems.map(function (item) {
          var key = String(item.order_menu_id);
          var value = state.payment.itemQuantities[key] || 0;
          return '<label class="pmd-pos-split-item"><span class="pmd-pos-split-item-name">' + esc(item.name) + '<small>' + esc(item.unpaid_quantity) + ' unpaid · ' + money(item.unit_price) + ' each</small></span><input class="pmd-pos-item-pay-qty" data-pay-item="' + esc(key) + '" type="number" min="0" max="' + esc(item.unpaid_quantity) + '" step="1" value="' + esc(value) + '"><b>' + money(toNumber(value, 0) * toNumber(item.unit_price, 0) * toNumber(summary.settlement.gross_ratio, 1)) + '</b></label>';
        }).join('') + '</div>';
        $$('[data-pay-item]', panel).forEach(function (input) {
          input.oninput = function () {
            var item = unpaidItems.find(function (row) { return String(row.order_menu_id) === String(input.dataset.payItem); });
            var max = item ? toNumber(item.unpaid_quantity, 0) : 0;
            state.payment.itemQuantities[String(input.dataset.payItem)] = Math.max(0, Math.min(max, toNumber(input.value, 0)));
            renderPaymentTotals();
          };
        });
      } else {
        panel.innerHTML = '<div class="pmd-pos-custom-row"><label><span class="pmd-pos-payment-block-title"><b>Amount from order balance</b><span>Maximum ' + money(remaining) + '</span></span><input type="number" min="0.01" max="' + esc(remaining) + '" step="0.01" class="pmd-pos-payment-input" data-custom-payment value="' + esc(state.payment.customAmount) + '" placeholder="0.00"></label><b>' + money(paymentBaseAmount()) + '</b></div>';
        var custom = $('[data-custom-payment]', panel);
        if (custom) custom.oninput = function () { state.payment.customAmount = custom.value; renderPaymentTotals(); };
      }
    }

    function methodTitle(method) {
      if (method === 'cash') return 'Cash';
      if (method === 'external_terminal') return 'External terminal';
      if (method === 'direct_terminal') return 'Connected terminal';
      return method;
    }

    function renderMethods() {
      var summary = state.payment.summary;
      var container = $('[data-pos-methods]');
      var onlineBox = $('[data-pos-online-box]');
      var terminalBox = $('[data-pos-terminal-box]');
      if (!summary || !container) return;
      var methods = [];
      methods.push({key:'cash', name:'Cash', note:'Collect cash and calculate change'});
      methods.push({key:'external_terminal', name:'External card terminal', note:'Record only after terminal approval'});
      if ((summary.terminal_providers || []).length) {
        methods.push({key:'direct_terminal', name:'Connected terminal', note:'Send full amount to configured device'});
      }
      (summary.methods || []).forEach(function (method) {
        if (method.code === 'cash') return;
        methods.push({key:'online:' + method.code, name:method.name, note:'Secure customer checkout · ' + (method.provider_code || 'provider'), provider:method.provider_code, code:method.code});
      });
      container.innerHTML = methods.map(function (method) {
        return '<button type="button" class="pmd-pos-method ' + (state.payment.method === method.key ? 'is-active' : '') + '" data-payment-method="' + esc(method.key) + '" data-provider="' + esc(method.provider || '') + '"><b>' + esc(method.name) + '</b><small>' + esc(method.note) + '</small></button>';
      }).join('');
      $$('[data-payment-method]', container).forEach(function (button) {
        button.onclick = function () {
          state.payment.method = button.dataset.paymentMethod;
          state.payment.providerCode = button.dataset.provider || null;
          state.payment.idempotencyKey = uid('pay');
          renderPayment();
        };
      });

      var online = state.payment.method.indexOf('online:') === 0;
      if (onlineBox) {
        onlineBox.hidden = !online;
        if (online) onlineBox.innerHTML = '<b>Secure online payment</b><br>The customer checkout handles card details, wallets, PayPal, Wero, tip and split selections securely. This POS never stores card data. Use “Open secure checkout”, then refresh status here.';
      }
      if (terminalBox) {
        terminalBox.hidden = state.payment.method !== 'direct_terminal';
        if (state.payment.method === 'direct_terminal') {
          var providers = summary.terminal_providers || [];
          if (!state.payment.providerCode && providers.length) state.payment.providerCode = providers[0].provider_code;
          terminalBox.innerHTML = '<b>Connected terminal</b><br>Only real provider responses are accepted. Split, coupon and tip are disabled for this direct full-balance request.<div class="pmd-pos-terminal-provider-row">' + providers.map(function (provider) {
            return '<button type="button" data-terminal-provider="' + esc(provider.provider_code) + '" class="' + (state.payment.providerCode === provider.provider_code ? 'is-active' : '') + '">' + esc(provider.name) + '</button>';
          }).join('') + '</div>';
          $$('[data-terminal-provider]', terminalBox).forEach(function (button) {
            button.onclick = function () { state.payment.providerCode = button.dataset.terminalProvider; renderMethods(); };
          });
        }
      }

      var referenceField = $('[data-pos-reference-field]');
      var externalConfirm = $('[data-pos-external-confirm-row]');
      var cashField = $('[data-pos-cash-field]');
      if (referenceField) referenceField.hidden = state.payment.method !== 'external_terminal';
      if (externalConfirm) externalConfirm.hidden = state.payment.method !== 'external_terminal';
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
      if (result) {
        result.classList.remove('is-error');
        result.textContent = state.payment.coupon ? state.payment.coupon.code + ' applied: −' + money(state.payment.coupon.discount) : '';
      }
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
      if (!container) return;
      var base = paymentBaseAmount();
      var tip = paymentTipAmount();
      var coupon = couponDiscount();
      var payable = paymentPayable();
      container.innerHTML = '<div class="pmd-pos-pay-totals">' +
        '<div class="pmd-pos-pay-total-row"><span>Order balance covered</span><strong>' + money(base) + '</strong></div>' +
        '<div class="pmd-pos-pay-total-row"><span>Tip</span><strong>' + money(tip) + '</strong></div>' +
        '<div class="pmd-pos-pay-total-row"><span>Coupon</span><strong>−' + money(coupon) + '</strong></div>' +
        '<div class="pmd-pos-pay-total-row is-grand"><span>Collect now</span><strong>' + money(payable) + '</strong></div>' +
      '</div>';

      var cashReceived = toNumber(state.payment.cashReceived, 0);
      var change = Math.max(0, roundMoney(cashReceived - payable));
      if (changeBox) {
        changeBox.hidden = state.payment.method !== 'cash' || cashReceived < payable;
        if (!changeBox.hidden) changeBox.textContent = 'Change due: ' + money(change);
      }

      if (payButton) {
        var online = state.payment.method.indexOf('online:') === 0;
        if (online) payButton.textContent = 'Open secure checkout';
        else if (state.payment.method === 'direct_terminal') payButton.textContent = 'Send full balance to terminal';
        else if (state.payment.method === 'cash') payButton.textContent = 'Record cash payment';
        else payButton.textContent = 'Record approved terminal payment';

        var canCollect = state.payment.summary && state.payment.summary.permissions && state.payment.summary.permissions.can_collect_payment;
        var valid = base > 0 && payable > 0 && !state.payment.submitting;
        if (!online && state.payment.method !== 'direct_terminal' && !canCollect) valid = false;
        if (state.payment.method === 'cash' && cashReceived + 0.001 < payable) valid = false;
        if (state.payment.method === 'external_terminal' && (!state.payment.externalConfirmed || !state.payment.reference.trim())) valid = false;
        if (state.payment.method === 'direct_terminal' && (!state.payment.providerCode || state.payment.splitMode !== 'full' || tip > 0 || coupon > 0)) valid = false;
        payButton.disabled = !valid;
      }
    }

    function renderPaymentHistory() {
      var summary = state.payment.summary;
      var container = $('[data-pos-payment-history]');
      var count = $('[data-pos-payment-history-count]');
      if (!container || !summary) return;
      var rows = summary.transactions || [];
      if (count) count.textContent = rows.length ? rows.length + ' transaction' + (rows.length === 1 ? '' : 's') : '';
      if (!rows.length) {
        container.innerHTML = '<div class="pmd-pos-payment-history-empty">No payments recorded yet.</div>';
        return;
      }
      container.innerHTML = rows.map(function (tx) {
        var details = [];
        if (toNumber(tx.tip_amount, 0)) details.push('Tip ' + money(tx.tip_amount));
        if (toNumber(tx.coupon_discount, 0)) details.push('Coupon −' + money(tx.coupon_discount));
        if (toNumber(tx.change_due, 0)) details.push('Change ' + money(tx.change_due));
        return '<article class="pmd-pos-payment-history-item"><div><b>' + esc(String(tx.payment_method || '').replace(/_/g,' ').toUpperCase()) + ' · ' + money(tx.amount) + '</b><a href="' + esc(tx.receipt_url) + '" target="_blank" rel="noopener">Receipt</a></div><small>' + esc(tx.payer_label || 'Payer') + ' · ' + esc(tx.paid_at || '') + (details.length ? ' · ' + esc(details.join(' · ')) : '') + '</small></article>';
      }).join('');
    }

    function renderPayment() {
      if (!state.payment.open) return;
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
      var code = String(input ? input.value : '').trim().toUpperCase();
      state.payment.couponCode = code;
      state.payment.coupon = null;
      if (!code) {
        if (result) { result.textContent = 'Enter a coupon code.'; result.classList.add('is-error'); }
        renderPaymentTotals();
        return;
      }
      if (Math.abs(paymentBaseAmount() - paymentRemaining()) > 0.02) {
        if (result) { result.textContent = 'Coupon requires the full remaining balance.'; result.classList.add('is-error'); }
        return;
      }
      try {
        var json = await fetchJson(paymentCouponUrl(), {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': (($('meta[name="csrf-token"]', document) || {}).content || ''),
          },
          body: JSON.stringify({code: code, amount: paymentBaseAmount()}),
        });
        state.payment.coupon = json;
        if (result) { result.textContent = json.code + ' applied: −' + money(json.discount); result.classList.remove('is-error'); }
        renderPaymentTotals();
      } catch (error) {
        if (result) { result.textContent = error.message || 'Coupon is invalid.'; result.classList.add('is-error'); }
        renderPaymentTotals();
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
        toast('Customer payment link copied');
      } catch (error) {
        window.prompt('Copy customer payment link:', url);
      }
    }

    async function executePayment() {
      if (!state.payment.summary || state.payment.submitting) return;
      var online = state.payment.method.indexOf('online:') === 0;
      if (online) {
        var checkout = guestCheckoutUrl();
        if (!checkout) return toast('Customer checkout is unavailable.', true);
        window.open(checkout, '_blank', 'noopener');
        toast('Secure customer checkout opened. Refresh status after payment.');
        return;
      }

      if (state.payment.method === 'direct_terminal') {
        return executeTerminalPayment();
      }

      state.payment.submitting = true;
      renderPaymentTotals();
      var summary = state.payment.summary;
      try {
        var json = await fetchJson(paymentSettleUrl(), {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': (($('meta[name="csrf-token"]', document) || {}).content || ''),
          },
          body: JSON.stringify({
            idempotency_key: state.payment.idempotencyKey,
            payment_method: state.payment.method,
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
            expected_updated_at: summary.order.updated_at,
          }),
        });
        state.payment.summary = json.summary || state.payment.summary;
        state.payment.idempotencyKey = uid('pay');
        state.payment.coupon = null;
        state.payment.couponCode = '';
        state.payment.tipPercent = 0;
        state.payment.customTip = '';
        state.payment.reference = '';
        state.payment.externalConfirmed = false;
        state.payment.cashReceived = roundMoney(paymentRemaining()).toFixed(2);
        renderPayment();
        toast(json.message || 'Payment recorded');
        if (toNumber(json.change_due, 0) > 0) showSuccess('Payment recorded. Change due: ' + money(json.change_due));
        else showSuccess(json.message || 'Payment recorded.');
        await refreshData(true);
        if (json.settlement_status === 'paid') {
          setTimeout(function () { closePayment(); }, 1300);
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
      if (!state.payment.providerCode) return toast('Choose a terminal provider.', true);
      state.payment.submitting = true;
      renderPaymentTotals();
      try {
        var json = await fetchJson(terminalPaymentUrl(), {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': (($('meta[name="csrf-token"]', document) || {}).content || ''),
          },
          body: JSON.stringify({provider_code: state.payment.providerCode}),
        });
        toast(json.message || 'Terminal request sent');
        await loadPaymentSummary(true);
      } catch (error) {
        toast(error.message || 'Terminal payment was not sent.', true);
      } finally {
        state.payment.submitting = false;
        renderPayment();
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
      if (refresh) refresh.onclick = function () { loadPaymentSummary(false); };
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
