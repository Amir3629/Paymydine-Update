(function () {
  'use strict';

  // PMD_PAYMENT_POLICY_CASHIER_R55A
  // PMD_PAYMENT_POLICY_CASHIER_R56B

  // PMD_CASHIER_PAYMENT_R54

  var module = window.PMDWaiterPOSPaymentV2;
  if (!module || typeof module.install !== 'function' || module.__pmdPolicyWrapped) return;

  var originalInstall = module.install;
  module.__pmdPolicyWrapped = true;

  module.install = function (ctx) {
    var api = originalInstall(ctx);
    var originalOpenPayment = api.openPayment;
    var originalRender = api.renderPayment;
    var originalBind = api.bindPayment;
    var root = ctx.root;
    var state = ctx.state;

    // PMD_PAYMENT_POLICY_PLATFORM_I18N_V4
    function pmdT(key, fallback, replacements) {
      var runtime = window.PMDPlatformMessages;
      if (runtime && typeof runtime.t === 'function') {
        return runtime.t(key, replacements || {}, fallback || key);
      }
      return fallback || key;
    }

    var cashierOverlay = !!(
      root &&
      root.closest &&
      (
        root.closest('.pmd-cashier-pos-overlay') ||
        root.closest('.pmd-coc')
      )
    );

    var cashierRoute =
      String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '') ===
      '/admin/cashierlab';

    var cashierMode =
      ctx.pmdCashier === true ||
      cashierOverlay ||
      cashierRoute;

    var cashierAdjustments =
      cashierMode &&
      (
        ctx.pmdCashierAdjustments === true ||
        cashierOverlay ||
        cashierRoute
      );

    function isDirectTerminal() {
      return state.payment.method === 'direct_terminal';
    }

    function normalizeStaffFlow() {
      if (!cashierAdjustments) {
        state.payment.tipPercent = 0;
        state.payment.customTip = '';
        state.payment.coupon = null;
        state.payment.couponCode = '';
      }
      state.payment.payerLabel = '';
      state.payment.reference = '';
      state.payment.externalConfirmed = false;
    }

    function forceHidden(element, hidden) {
      if (!element) return;
      element.hidden = !!hidden;
      if (hidden) {
        element.style.setProperty('display', 'none', 'important');
      } else {
        element.style.removeProperty('display');
      }
    }

    function blockFor(selector) {
      var element = root.querySelector(selector);
      return element ? (element.closest('.pmd-pos-payment-block') || element) : null;
    }

    function setBlockHidden(selector, hidden) {
      forceHidden(blockFor(selector), hidden);
    }

    function hideClosestLabel(selector) {
      var element = root.querySelector(selector);
      if (!element) return;
      forceHidden(element.closest('label'), true);
    }

    function simplifyMethodHeading() {
      var grid = root.querySelector('[data-pos-methods]');
      var block = grid ? grid.closest('.pmd-pos-payment-block') : null;
      if (!block) return;
      var title = block.querySelector('.pmd-pos-payment-block-title b');
      var note = block.querySelector('.pmd-pos-payment-block-title span');
      if (title) {
        title.textContent =
          cashierMode
            ? pmdT('shared.payment_method', 'Payment method')
            : pmdT('payment.method_question', 'How will they pay?');
      }

      forceHidden(note, true);
    }

    function simplifyMethods() {
      var grid = root.querySelector('[data-pos-methods]');
      if (!grid) return;

      var visible = 0;
      grid.querySelectorAll('[data-payment-method]').forEach(function (button) {
        var key = String(button.getAttribute('data-payment-method') || '');
        var allowed = key === 'cash' || key === 'direct_terminal';
        forceHidden(button, !allowed);
        if (!allowed) return;

        visible += 1;
        var title = button.querySelector('b');
        var note = button.querySelector('small');

        if (key === 'cash') {
          if (title) title.textContent = pmdT('payment.cash', 'Cash');
          if (note) note.textContent = pmdT('payment.cash_payment', 'Cash payment');
        } else {
          if (title) title.textContent = pmdT('payment.terminal', 'Terminal');
          if (note) note.textContent = pmdT('payment.pay_connected_terminal', 'Pay on a connected terminal');
        }

        if (cashierMode) {
          forceHidden(note, true);

          button.classList.add(
            'pmd-cashier-method'
          );

          var icon =
            button.querySelector(
              '.pmd-cashier-method-icon'
            );

          if (!icon) {
            icon =
              document.createElement(
                'span'
              );

            icon.className =
              'pmd-cashier-method-icon';

            icon.setAttribute(
              'aria-hidden',
              'true'
            );

            icon.textContent =
              key === 'cash'
                ? '€'
                : '▣';

            button.insertBefore(
              icon,
              title || button.firstChild
            );
          }
        }
      });

      grid.dataset.pmdSimpleMethodCount = String(visible);
      simplifyMethodHeading();
    }

    function simplifyCashierPresentation() {
      if (!cashierMode) return;

      var eyebrow =
        root.querySelector(
          '.pmd-pos-payment-eyebrow'
        );

      forceHidden(
        eyebrow,
        true
      );

      var subtitle =
        root.querySelector(
          '[data-pos-payment-subtitle]'
        );

      forceHidden(
        subtitle,
        true
      );

      var title =
        root.querySelector(
          '#pmd-coc-payment-title'
        );

      var summary =
        state.payment.summary || {};

      var order =
        summary.order || {};

      if (title) {
        title.textContent =
          order.order_id
            ? (
                pmdT('payment.order_number', 'Order #:id', {id: order.order_id})
              )
            : pmdT('payment.pay', 'Pay');
      }

      var balance =
        root.querySelector(
          '[data-pos-payment-balance]'
        );

      if (balance) {
        var label =
          balance.querySelector(
            '.pmd-pos-balance-hero > span'
          );

        var detail =
          balance.querySelector(
            '.pmd-pos-balance-hero > small'
          );

        if (label) {
          label.textContent =
            pmdT('payment.total', 'Total');
        }

        forceHidden(
          detail,
          true
        );
      }

      root
        .querySelectorAll(
          '.pmd-pos-payment-block-title span'
        )
        .forEach(function (note) {
          forceHidden(
            note,
            true
          );
        });

      forceHidden(
        root.querySelector(
          '.pmd-pos-payment-summary > h3'
        ),
        true
      );

      forceHidden(
        root.querySelector(
          '.pmd-pos-payment-history-wrap'
        ),
        true
      );

      var payButton =
        root.querySelector(
          '[data-pos-pay-button]'
        );

      if (payButton) {
        var current =
          String(
            payButton.textContent || ''
          );

        if (
          current !==
            'Terminal offline' &&
          current !==
            'No terminal online' &&
          current !==
            'Checking terminal…'
        ) {
          payButton.textContent =
            pmdT('payment.pay', 'Pay');
        }
      }
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
      if (title) title.textContent = buttons.length > 1 ? pmdT('payment.choose_terminal', 'Choose terminal') : pmdT('payment.terminal', 'Terminal');
      if (subtitle && buttons.length <= 1 && subtitle.textContent === pmdT('payment.ready', 'Ready')) {
        subtitle.textContent = '';
      }

      buttons.forEach(function (button) {
        if (button.classList.contains('is-offline')) button.disabled = true;
      });

      var selected = selectedTerminalButton();
      var offline = !!(selected && selected.classList.contains('is-offline'));
      var payButton = root.querySelector('[data-pos-pay-button]');

      if (payButton && offline) {
        payButton.disabled = true;
        payButton.textContent = pmdT('payment.terminal_offline', 'Terminal offline');
      }

      var existing = terminalBox.querySelector('[data-pmd-simple-terminal-status]');
      if (existing) existing.remove();

      if (selected && offline) {
        var status = document.createElement('div');
        status.dataset.pmdSimpleTerminalStatus = '1';
        status.className = 'pmd-pos-terminal-simple-status is-offline';
        status.textContent = pmdT('payment.terminal_offline_help', 'This terminal is offline. Turn it on or choose another terminal.');
        terminalBox.appendChild(status);
      }
    }

    function applySimpleStaffUI() {
      // Staff checkout is intentionally simple: full remaining balance,
      // Cash or Terminal only. Guest checkout keeps its own online methods.
      setBlockHidden('[data-pos-split-tabs]', !cashierMode);
      setBlockHidden(
        '[data-pos-tip-buttons]',
        !(
          cashierAdjustments &&
          !isDirectTerminal()
        )
      );

      hideClosestLabel('[data-pos-payer-label]');
      forceHidden(root.querySelector('[data-pos-reference-field]'), true);
      forceHidden(root.querySelector('[data-pos-external-confirm-row]'), true);

      var collection = root.querySelector('[data-pos-collection-fields]');
      forceHidden(collection, isDirectTerminal());

      var cashField = root.querySelector('[data-pos-cash-field]');
      forceHidden(cashField, state.payment.method !== 'cash');

      forceHidden(root.querySelector('[data-pos-online-box]'), true);
      forceHidden(root.querySelector('[data-pos-copy-link]'), true);
      forceHidden(root.querySelector('.pmd-pos-payment-safety'), true);

      // PMD_CASHIER_ADJUSTMENTS_VISIBLE_R56B
      if (cashierAdjustments) {
        forceHidden(
          root.querySelector('.pmd-pos-adjustments'),
          false
        );
      }

      simplifyMethods();
      simplifyTerminal();
      simplifyCashierPresentation();
    }

    // V3 intentionally opens the modal before it fetches the fresh settlement
    // summary. On a fast screen that creates one visible frame of unrendered
    // payment markup. Keep the modal invisible until the first authoritative
    // summary/render cycle has completed, then reveal it on the next paint.
    api.openPayment = async function () {
      var modal = root.querySelector('[data-pos-payment-modal]');
      if (modal) modal.classList.add('pmd-payment-is-preparing');

      try {
        return await originalOpenPayment();
      } finally {
        if (modal) {
          window.requestAnimationFrame(function () {
            modal.classList.remove('pmd-payment-is-preparing');
          });
        }
      }
    };

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

        // PMD_PAYMENT_POLICY_R60E_STABLE_SWITCH
        //
        // V3 has already rendered during the button onclick.
        // Apply presentation to that DOM synchronously.
        // Do NOT create an additional zero-delay render frame.
        normalizeStaffFlow();
        applySimpleStaffUI();
      });
    };

    return api;
  };
})();
