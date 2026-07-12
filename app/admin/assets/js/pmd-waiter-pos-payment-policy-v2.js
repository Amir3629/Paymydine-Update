(function () {
  'use strict';

  var module = window.PMDWaiterPOSPaymentV2;
  if (!module || typeof module.install !== 'function' || module.__pmdPolicyWrapped) return;

  var originalInstall = module.install;
  module.__pmdPolicyWrapped = true;

  module.install = function (ctx) {
    var api = originalInstall(ctx);
    var originalRender = api.renderPayment;
    var originalBind = api.bindPayment;
    var root = ctx.root;
    var state = ctx.state;

    function isSecureHandoff() {
      return String(state.payment.method || '').indexOf('online:') === 0;
    }

    function isDirectTerminal() {
      return state.payment.method === 'direct_terminal';
    }

    function normalizeProviderOnlyFlow() {
      if (!isSecureHandoff() && !isDirectTerminal()) return;
      state.payment.splitMode = 'full';
      state.payment.customAmount = '';
      state.payment.itemQuantities = {};
      state.payment.tipPercent = 0;
      state.payment.customTip = '';
      state.payment.coupon = null;
      state.payment.couponCode = '';
    }

    function setHidden(selector, hidden) {
      var element = root.querySelector(selector);
      if (!element) return;
      var block = element.closest('.pmd-pos-payment-block') || element;
      block.hidden = !!hidden;
    }

    function applyPolicyUI() {
      var providerOnly = isSecureHandoff() || isDirectTerminal();
      setHidden('[data-pos-split-tabs]', providerOnly);
      setHidden('[data-pos-tip-buttons]', providerOnly);
      var collectionFields = root.querySelector('[data-pos-collection-fields]');
      if (collectionFields) collectionFields.hidden = providerOnly;

      var onlineBox = root.querySelector('[data-pos-online-box]');
      if (onlineBox && isSecureHandoff() && !onlineBox.hidden) {
        onlineBox.innerHTML = '<b>Secure customer checkout</b><br>This button opens the existing PayMyDine customer payment flow for the same table and order. Card data, wallet approval, online split selection, coupon and tip stay inside the configured provider checkout and are never collected by the waiter POS.';
      }

      var terminalBox = root.querySelector('[data-pos-terminal-box]');
      if (terminalBox && isDirectTerminal() && !terminalBox.hidden) {
        var note = terminalBox.querySelector('[data-pmd-terminal-policy-note]');
        if (!note) {
          note = document.createElement('div');
          note.dataset.pmdTerminalPolicyNote = '1';
          note.style.marginTop = '8px';
          note.style.fontWeight = '800';
          note.textContent = 'Connected-terminal requests use the full remaining order balance. The order is not marked paid until provider confirmation is recorded.';
          terminalBox.appendChild(note);
        }
      }
    }

    api.renderPayment = function () {
      normalizeProviderOnlyFlow();
      originalRender();
      applyPolicyUI();
    };

    api.bindPayment = function () {
      originalBind();
      root.addEventListener('click', function (event) {
        var target = event.target && event.target.closest ? event.target.closest('[data-payment-method]') : null;
        if (!target) return;
        setTimeout(function () {
          normalizeProviderOnlyFlow();
          api.renderPayment();
        }, 0);
      });
    };

    return api;
  };
})();
