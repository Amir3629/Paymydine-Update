(function () {
  'use strict';

  // PMD_PAYMENT_POLICY_CASHIER_R55A
  // PMD_PAYMENT_POLICY_CASHIER_R56B
  // PMD_PAYMENT_PLATFORM_I18N_V1

  var module = window.PMDWaiterPOSPaymentV2;
  if (!module || typeof module.install !== 'function' || module.__pmdPolicyWrapped) return;

  var originalInstall = module.install;
  module.__pmdPolicyWrapped = true;

  module.install = function (ctx) {
    function pt(key, replacements, fallback) {
      var runtime = window.PMDPlatformMessages;
      if (runtime && typeof runtime.t === 'function') {
        return runtime.t(key, replacements || {}, fallback == null ? key : fallback);
      }
      return fallback == null ? key : fallback;
    }

    function translateRuntimeMessage(message) {
      var text = String(message == null ? '' : message);
      var exact = {
        'Receipt printed': ['payment.receipt_printed', 'Receipt printed'],
        'Payment status updated': ['payment.status_updated', 'Payment status updated'],
        'Could not load payment details.': ['payment.load_error', 'Could not load payment details.'],
        'Save the order before taking payment.': ['payment.save_order_first', 'Save the order before taking payment.'],
        'Save new items before taking payment.': ['payment.save_items_first', 'Save new items before taking payment.'],
        'Unknown print error': ['payment.unknown_print_error', 'Unknown print error']
      };

      if (exact[text]) return pt(exact[text][0], {}, exact[text][1]);

      var prefix = 'Payment recorded, but receipt could not print: ';
      if (text.indexOf(prefix) === 0) {
        return pt('payment.receipt_print_error', {error: text.slice(prefix.length)}, text);
      }

      return text;
    }

    var originalToast = ctx.toast;
    if (typeof originalToast === 'function') {
      ctx.toast = function (message, error) {
        return originalToast(translateRuntimeMessage(message), error);
      };
    }

    var api = originalInstall(ctx);
    var originalOpenPayment = api.openPayment;
    var originalRender = api.renderPayment;
    var originalBind = api.bindPayment;
    var root = ctx.root;
    var state = ctx.state;
    var money = typeof ctx.money === 'function' ? ctx.money : function (value) { return String(value == null ? '' : value); };

    var cashierOverlay = !!(
      root &&
      root.closest &&
      (
        root.closest('.pmd-cashier-pos-overlay') ||
        root.closest('.pmd-coc')
      )
    );

    var cashierRoute =
      String(window.location.pathname || '') ===
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

    function setText(selector, value, parent) {
      var node = (parent || root).querySelector(selector);
      if (node) node.textContent = value;
      return node;
    }

    function setPlaceholder(selector, value, parent) {
      var node = (parent || root).querySelector(selector);
      if (node) node.setAttribute('placeholder', value);
      return node;
    }

    function replaceTextAfterElement(parent, value) {
      if (!parent) return;
      var textNode = Array.prototype.slice.call(parent.childNodes).find(function (node) {
        return node.nodeType === 3 && String(node.nodeValue || '').trim() !== '';
      });
      if (textNode) textNode.nodeValue = ' ' + value;
      else parent.appendChild(document.createTextNode(' ' + value));
    }

    function simplifyMethodHeading() {
      var grid = root.querySelector('[data-pos-methods]');
      var block = grid ? grid.closest('.pmd-pos-payment-block') : null;
      if (!block) return;
      var title = block.querySelector('.pmd-pos-payment-block-title b');
      var note = block.querySelector('.pmd-pos-payment-block-title span');
      if (title) {
        title.textContent = cashierMode
          ? pt('shared.payment_method', {}, 'Payment method')
          : pt('payment.method_question', {}, 'How will they pay?');
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
          if (title) title.textContent = pt('payment.cash', {}, 'Cash');
          if (note) note.textContent = pt('payment.cash_payment', {}, 'Cash payment');
        } else {
          if (title) title.textContent = pt('payment.terminal', {}, 'Terminal');
          if (note) note.textContent = pt('payment.pay_connected_terminal', {}, 'Pay on a connected terminal');
        }

        if (cashierMode) {
          forceHidden(note, true);
          button.classList.add('pmd-cashier-method');

          var icon = button.querySelector('.pmd-cashier-method-icon');
          if (!icon) {
            icon = document.createElement('span');
            icon.className = 'pmd-cashier-method-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = key === 'cash' ? '€' : '▣';
            button.insertBefore(icon, title || button.firstChild);
          }
        }
      });

      grid.dataset.pmdSimpleMethodCount = String(visible);
      simplifyMethodHeading();
    }

    function simplifyCashierPresentation() {
      if (!cashierMode) return;

      var eyebrow = root.querySelector('.pmd-pos-payment-eyebrow');
      forceHidden(eyebrow, true);

      var subtitle = root.querySelector('[data-pos-payment-subtitle]');
      forceHidden(subtitle, true);

      var title = root.querySelector('#pmd-coc-payment-title');
      var summary = state.payment.summary || {};
      var order = summary.order || {};

      if (title) {
        title.textContent = order.order_id
          ? pt('payment.order_number', {id: order.order_id}, 'Order #' + order.order_id)
          : pt('payment.title', {}, 'Pay');
      }

      var balance = root.querySelector('[data-pos-payment-balance]');
      if (balance) {
        var label = balance.querySelector('.pmd-pos-balance-hero > span');
        var detail = balance.querySelector('.pmd-pos-balance-hero > small');
        if (label) label.textContent = pt('payment.pay_now', {}, 'Pay now');
        forceHidden(detail, true);
      }

      root.querySelectorAll('.pmd-pos-payment-block-title span').forEach(function (note) {
        forceHidden(note, true);
      });

      forceHidden(root.querySelector('.pmd-pos-payment-summary > h3'), true);
      forceHidden(root.querySelector('.pmd-pos-payment-history-wrap'), true);

      var payButton = root.querySelector('[data-pos-pay-button]');
      if (payButton) {
        var current = String(payButton.textContent || '');
        var protectedStates = [
          pt('payment.terminal_offline', {}, 'Terminal offline'),
          pt('payment.no_terminal_online', {}, 'No terminal online'),
          pt('payment.checking_terminal', {}, 'Checking terminal…')
        ];
        if (protectedStates.indexOf(current) === -1) {
          payButton.textContent = pt('payment.pay', {}, 'Pay');
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

      var buttons = Array.prototype.slice.call(terminalBox.querySelectorAll('[data-terminal-provider]'));
      var title = terminalBox.querySelector('.pmd-pos-terminal-title b');
      var subtitle = terminalBox.querySelector('.pmd-pos-terminal-title span');
      if (title) title.textContent = buttons.length > 1
        ? pt('payment.choose_terminal', {}, 'Choose terminal')
        : pt('payment.terminal', {}, 'Terminal');
      if (subtitle && buttons.length <= 1 && String(subtitle.textContent || '').trim() === 'Ready') {
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
        payButton.textContent = pt('payment.terminal_offline', {}, 'Terminal offline');
      }

      var existing = terminalBox.querySelector('[data-pmd-simple-terminal-status]');
      if (existing) existing.remove();

      if (selected && offline) {
        var status = document.createElement('div');
        status.dataset.pmdSimpleTerminalStatus = '1';
        status.className = 'pmd-pos-terminal-simple-status is-offline';
        status.textContent = pt(
          'payment.terminal_offline_help',
          {},
          'This terminal is offline. Turn it on or choose another terminal.'
        );
        terminalBox.appendChild(status);
      }
    }

    function translateSplitPanel() {
      var panel = root.querySelector('[data-pos-split-panel]');
      if (!panel) return;

      if (state.payment.splitMode === 'full') {
        setText('strong', pt('payment.full_balance', {}, 'Full balance'), panel);
        setText('small', pt('payment.pay_remaining', {}, 'Pay everything remaining on this order.'), panel);
      } else if (state.payment.splitMode === 'equal') {
        setText(
          'strong',
          pt('payment.equal_share', {count: state.payment.equalPeople}, 'One of ' + state.payment.equalPeople + ' equal shares'),
          panel
        );
        setText('small', pt('payment.reopen_next_payer', {}, 'Reopen payment for the next payer.'), panel);
      } else if (state.payment.splitMode === 'items') {
        var summary = state.payment.summary || {};
        var unpaid = (summary.items || []).filter(function (item) {
          return Number(item.unpaid_quantity || 0) > 0;
        });
        panel.querySelectorAll('.pmd-pos-split-item-name small').forEach(function (node, index) {
          var item = unpaid[index];
          if (!item) return;
          node.textContent = pt(
            'payment.item_available',
            {quantity: item.unpaid_quantity, price: money(item.unit_price)},
            item.unpaid_quantity + ' available · ' + money(item.unit_price)
          );
        });
      } else if (state.payment.splitMode === 'custom') {
        var heading = panel.querySelector('.pmd-pos-payment-block-title');
        if (heading) {
          setText('b', pt('payment.amount', {}, 'Amount'), heading);
          var maxNode = heading.querySelector('span');
          if (maxNode) {
            var raw = String(maxNode.textContent || '').replace(/^Max\s*/i, '');
            maxNode.textContent = pt('payment.max_amount', {amount: raw}, 'Max ' + raw);
          }
        }
      }
    }

    function applyPlatformCopy() {
      var modal = root.querySelector('[data-pos-payment-modal]');
      if (!modal) return;

      var close = modal.querySelector('[data-pos-payment-close]');
      if (close) close.setAttribute('aria-label', pt('waiter.pos.close_payment', {}, 'Close payment'));

      var splitTabs = modal.querySelector('[data-pos-cashier-split-tabs], [data-pos-split-tabs]');
      if (splitTabs) {
        var splitBlock = splitTabs.closest('.pmd-pos-payment-block');
        if (splitBlock) {
          setText(
            '.pmd-pos-payment-block-title b',
            cashierMode ? pt('payment.split_part', {}, 'Split / part payment') : pt('waiter.payment.split_bill', {}, 'Split bill'),
            splitBlock
          );
          setText(
            '.pmd-pos-payment-block-title span',
            cashierMode ? pt('payment.choose_payer_now', {}, 'Choose what this payer pays now') : pt('waiter.payment.choose_coverage', {}, 'Choose what this payer covers'),
            splitBlock
          );
        }

        var labels = {
          full: cashierMode ? pt('payment.full', {}, 'Full') : pt('waiter.payment.full_bill', {}, 'Full bill'),
          equal: cashierMode ? pt('payment.equal', {}, 'Equal') : pt('waiter.payment.equally', {}, 'Equally'),
          items: pt('waiter.payment.by_items', {}, 'By items'),
          custom: cashierMode ? pt('payment.custom_amount', {}, 'Custom amount') : pt('shared.custom', {}, 'Custom')
        };
        splitTabs.querySelectorAll('[data-split-mode]').forEach(function (button) {
          var value = labels[String(button.getAttribute('data-split-mode') || '')];
          if (value) button.textContent = value;
        });
      }

      var methodGrid = modal.querySelector('[data-pos-methods]');
      if (methodGrid) {
        var methodBlock = methodGrid.closest('.pmd-pos-payment-block');
        if (methodBlock) {
          setText('.pmd-pos-payment-block-title b', pt('shared.payment_method', {}, 'Payment method'), methodBlock);
          setText('.pmd-pos-payment-block-title span', pt('waiter.payment.configured_methods_only', {}, 'Only configured methods are shown'), methodBlock);
        }
      }

      var tipButtons = modal.querySelector('[data-pos-tip-buttons]');
      if (tipButtons) {
        var tipWrap = tipButtons.parentElement;
        if (tipWrap) {
          setText('.pmd-pos-payment-block-title b', pt('shared.tip', {}, 'Tip'), tipWrap);
          setText('.pmd-pos-payment-block-title span', pt('shared.optional', {}, 'Optional'), tipWrap);
        }
        var noTip = tipButtons.querySelector('[data-tip-percent="0"]');
        var customTip = tipButtons.querySelector('[data-tip-percent="custom"]');
        if (noTip) noTip.textContent = pt('waiter.payment.no_tip', {}, 'No tip');
        if (customTip) customTip.textContent = pt('shared.custom', {}, 'Custom');
        setPlaceholder('[data-pos-custom-tip]', pt('waiter.payment.custom_tip', {}, 'Custom tip'), modal);
      }

      var couponInput = modal.querySelector('[data-pos-coupon-code]');
      if (couponInput) {
        var couponWrap = couponInput.closest('.pmd-pos-adjustments > div') || couponInput.parentElement;
        if (couponWrap) {
          setText('.pmd-pos-payment-block-title b', pt('shared.coupon', {}, 'Coupon'), couponWrap);
          setText('.pmd-pos-payment-block-title span', pt('waiter.payment.full_remaining_only', {}, 'Full remaining balance only'), couponWrap);
        }
        couponInput.setAttribute('placeholder', pt('waiter.payment.coupon_code', {}, 'Coupon code'));
        var apply = modal.querySelector('[data-pos-coupon-apply]');
        if (apply) apply.textContent = pt('shared.apply', {}, 'Apply');
      }

      var payer = modal.querySelector('[data-pos-payer-label]');
      if (payer) {
        var payerLabel = payer.closest('label');
        if (payerLabel) setText('span', pt('waiter.payment.payer_label', {}, 'Payer / guest label'), payerLabel);
        payer.setAttribute('placeholder', pt('waiter.payment.payer_placeholder', {}, 'Guest 1, Anna, Seat 2…'));
      }

      var reference = modal.querySelector('[data-pos-payment-reference]');
      if (reference) {
        var referenceLabel = reference.closest('label');
        if (referenceLabel) setText('span', pt('waiter.payment.terminal_reference', {}, 'Terminal approval / receipt reference'), referenceLabel);
        reference.setAttribute('placeholder', pt('waiter.payment.external_reference_required', {}, 'Required for external terminal'));
      }

      var cashField = modal.querySelector('[data-pos-cash-field]');
      if (cashField) {
        var cashLabel = cashField.querySelector('span, .pmd-cashier-cash-title');
        if (cashLabel) cashLabel.textContent = pt('waiter.payment.cash_received', {}, 'Cash received');
      }

      var externalConfirm = modal.querySelector('[data-pos-external-confirm-row]');
      replaceTextAfterElement(externalConfirm, pt('waiter.payment.external_confirmation', {}, 'I confirm the external terminal approved this exact amount.'));

      var backspace = modal.querySelector('[data-cash-action="backspace"]');
      if (backspace) backspace.setAttribute('aria-label', pt('payment.backspace', {}, 'Backspace'));
      var exact = modal.querySelector('[data-cash-action="exact"]');
      if (exact) exact.textContent = pt('payment.exact', {}, 'Exact');

      setText('.pmd-pos-payment-summary > h3', pt('shared.payment_summary', {}, 'Payment summary'), modal);
      var copyLink = modal.querySelector('[data-pos-copy-link]');
      if (copyLink) copyLink.textContent = pt('waiter.payment.copy_link', {}, 'Copy customer payment link');
      var refresh = modal.querySelector('[data-pos-refresh-payment]');
      if (refresh) refresh.textContent = pt('waiter.payment.refresh_status', {}, 'Refresh payment status');
      setText('.pmd-pos-payment-safety', pt('waiter.payment.provider_confirmation_safety', {}, 'Online and direct-terminal payments are never marked successful without provider confirmation.'), modal);
      setText('.pmd-pos-payment-history-wrap .pmd-pos-payment-block-title b', pt('shared.payment_history', {}, 'Payment history'), modal);

      var balanceLabel = modal.querySelector('.pmd-pos-balance-hero > span');
      if (balanceLabel) {
        balanceLabel.textContent = cashierMode
          ? pt('payment.pay_now', {}, 'Pay now')
          : pt('payment.amount_due', {}, 'Amount due');
      }

      translateSplitPanel();
      simplifyMethods();
      simplifyTerminal();

      var grandLabel = modal.querySelector('.pmd-pos-pay-total-row.is-grand span');
      if (grandLabel) {
        grandLabel.textContent = isDirectTerminal()
          ? pt('payment.charge', {}, 'Charge')
          : pt('payment.total', {}, 'Total');
      }

      var changeBox = modal.querySelector('[data-pos-change-box]');
      if (changeBox && !changeBox.hidden) {
        var currentChange = String(changeBox.textContent || '');
        var match = currentChange.match(/:\s*(.+)$/);
        var amount = match ? match[1] : '';
        changeBox.textContent = pt('payment.change', {amount: amount}, 'Change: ' + amount);
      }

      var payButton = modal.querySelector('[data-pos-pay-button]');
      if (payButton) {
        var currentPay = String(payButton.textContent || '').trim();
        if (state.payment.terminalStatusRefreshing) {
          payButton.textContent = pt('payment.checking_terminal', {}, 'Checking terminal…');
        } else if (isDirectTerminal() && !selectedTerminalButton()) {
          payButton.textContent = pt('payment.no_terminal_online', {}, 'No terminal online');
        } else if (cashierMode) {
          payButton.textContent = pt('payment.pay', {}, 'Pay');
        } else if (isDirectTerminal()) {
          var suffix = currentPay.replace(/^Charge\s*/i, '');
          payButton.textContent = pt('payment.charge', {}, 'Charge') + (suffix ? ' ' + suffix : '');
        } else {
          payButton.textContent = pt('payment.record_cash', {}, 'Record cash');
        }
      }

      var couponResult = modal.querySelector('[data-pos-coupon-result]');
      if (couponResult && state.payment.coupon) {
        couponResult.textContent = pt(
          'payment.coupon_applied',
          {code: state.payment.coupon.code, amount: money(state.payment.coupon.discount)},
          state.payment.coupon.code + ' applied: −' + money(state.payment.coupon.discount)
        );
      }

      var historyCount = modal.querySelector('[data-pos-payment-history-count]');
      var rows = state.payment.summary && Array.isArray(state.payment.summary.transactions)
        ? state.payment.summary.transactions
        : [];
      if (historyCount) {
        historyCount.textContent = rows.length
          ? pt(rows.length === 1 ? 'payment.one_payment' : 'payment.many_payments', {count: rows.length}, rows.length + (rows.length === 1 ? ' payment' : ' payments'))
          : '';
      }
    }

    function applySimpleStaffUI() {
      setBlockHidden('[data-pos-split-tabs]', !cashierMode);
      setBlockHidden(
        '[data-pos-tip-buttons]',
        !(cashierAdjustments && !isDirectTerminal())
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

      if (cashierAdjustments) {
        forceHidden(root.querySelector('.pmd-pos-adjustments'), false);
      }

      simplifyMethods();
      simplifyTerminal();
      simplifyCashierPresentation();
    }

    api.openPayment = async function () {
      var modal = root.querySelector('[data-pos-payment-modal]');
      if (modal) modal.classList.add('pmd-payment-is-preparing');

      try {
        return await originalOpenPayment();
      } finally {
        applyPlatformCopy();
        if (modal) {
          window.requestAnimationFrame(function () {
            applyPlatformCopy();
            modal.classList.remove('pmd-payment-is-preparing');
          });
        }
      }
    };

    api.renderPayment = function () {
      normalizeStaffFlow();
      originalRender();
      applySimpleStaffUI();
      applyPlatformCopy();
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
        normalizeStaffFlow();
        applySimpleStaffUI();
        applyPlatformCopy();
      });
    };

    return api;
  };
})();
