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

    function isDirectTerminal() {
      return state.payment.method === 'direct_terminal';
    }

    function normalizeStaffFlow() {
      if (state.payment.method !== 'cash' && state.payment.method !== 'direct_terminal') {
        state.payment.method = 'cash';
        state.payment.providerCode = null;
        state.payment.terminalDeviceId = null;
        state.payment.terminalAttemptId = null;
      }

      state.payment.splitMode = 'full';
      state.payment.customAmount = '';
      state.payment.itemQuantities = {};
      state.payment.tipPercent = 0;
      state.payment.customTip = '';
      state.payment.coupon = null;
      state.payment.couponCode = '';
      state.payment.payerLabel = '';
      state.payment.reference = '';
      state.payment.externalConfirmed = false;
    }

    function blockFor(selector) {
      var element = root.querySelector(selector);
      return element ? (element.closest('.pmd-pos-payment-block') || element) : null;
    }

    function setBlockHidden(selector, hidden) {
      var block = blockFor(selector);
      if (block) block.hidden = !!hidden;
    }

    function hideClosestLabel(selector) {
      var element = root.querySelector(selector);
      if (!element) return;
      var label = element.closest('label');
      if (label) label.hidden = true;
    }

    function simplifyMethods() {
      var grid = root.querySelector('[data-pos-methods]');
      if (!grid) return;

      var visible = 0;
      grid.querySelectorAll('[data-payment-method]').forEach(function (button) {
        var key = String(button.getAttribute('data-payment-method') || '');
        var allowed = key === 'cash' || key === 'direct_terminal';
        button.hidden = !allowed;
        if (!allowed) return;

        visible += 1;
        var title = button.querySelector('b');
        var note = button.querySelector('small');

        if (key === 'cash') {
          if (title) title.textContent = 'Cash';
          if (note) note.textContent = 'Cash payment';
        } else {
          if (title) title.textContent = 'Terminal';
          if (note) note.textContent = 'Pay on a connected terminal';
        }
      });

      grid.dataset.pmdSimpleMethodCount = String(visible);
    }

    function selectedTerminalButton() {
      return root.querySelector('[data-terminal-provider].is-active');
    }

    function simplifyTerminal() {
      var terminalBox = root.querySelector('[data-pos-terminal-box]');
      if (!terminalBox || !isDirectTerminal() || terminalBox.hidden) return;

      var legacyNote = terminalBox.querySelector('[data-pmd-terminal-policy-note]');
      if (legacyNote) legacyNote.remove();

      var buttons = Array.prototype.slice.call(
        terminalBox.querySelectorAll('[data-terminal-provider]')
      );

      var title = terminalBox.querySelector('.pmd-pos-terminal-title b');
      var subtitle = terminalBox.querySelector('.pmd-pos-terminal-title span');
      if (title) title.textContent = buttons.length > 1 ? 'Choose terminal' : 'Terminal';
      if (subtitle) subtitle.textContent = buttons.length > 1 ? 'Select a device' : '';

      var selected = selectedTerminalButton();
      var offline = !!(selected && selected.classList.contains('is-offline'));
      var payButton = root.querySelector('[data-pos-pay-button]');

      if (payButton && offline) {
        payButton.disabled = true;
        payButton.textContent = 'Terminal offline';
      }

      var existing = terminalBox.querySelector('[data-pmd-simple-terminal-status]');
      if (existing) existing.remove();

      if (selected && offline) {
        var status = document.createElement('div');
        status.dataset.pmdSimpleTerminalStatus = '1';
        status.className = 'pmd-pos-terminal-simple-status is-offline';
        status.textContent = 'This terminal is offline. Turn it on or choose another terminal.';
        terminalBox.appendChild(status);
      }
    }

    function applySimpleStaffUI() {
      // Staff checkout is intentionally simple: full balance, no waiter-side
      // split/tip/coupon controls. Guest checkout keeps its own online options.
      setBlockHidden('[data-pos-split-tabs]', true);
      setBlockHidden('[data-pos-tip-buttons]', true);

      hideClosestLabel('[data-pos-payer-label]');
      var ref = root.querySelector('[data-pos-reference-field]');
      if (ref) ref.hidden = true;
      var confirm = root.querySelector('[data-pos-external-confirm-row]');
      if (confirm) confirm.hidden = true;

      var collection = root.querySelector('[data-pos-collection-fields]');
      if (collection) collection.hidden = isDirectTerminal();

      var cashField = root.querySelector('[data-pos-cash-field]');
      if (cashField) cashField.hidden = state.payment.method !== 'cash';

      var onlineBox = root.querySelector('[data-pos-online-box]');
      if (onlineBox) onlineBox.hidden = true;

      var copyLink = root.querySelector('[data-pos-copy-link]');
      if (copyLink) copyLink.hidden = true;

      var safety = root.querySelector('.pmd-pos-payment-safety');
      if (safety) safety.hidden = true;

      simplifyMethods();
      simplifyTerminal();
    }

    api.renderPayment = function () {
      normalizeStaffFlow();
      originalRender();
      applySimpleStaffUI();
    };

    api.bindPayment = function () {
      originalBind();

      root.addEventListener('click', function (event) {
        var method = event.target && event.target.closest
          ? event.target.closest('[data-payment-method]')
          : null;
        var terminal = event.target && event.target.closest
          ? event.target.closest('[data-terminal-provider]')
          : null;

        if (!method && !terminal) return;

        window.setTimeout(function () {
          normalizeStaffFlow();
          api.renderPayment();
        }, 0);
      });
    };

    return api;
  };
})();
