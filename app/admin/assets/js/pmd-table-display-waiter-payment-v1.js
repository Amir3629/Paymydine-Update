/* PMD_TABLE_DISPLAY_V1
 * Waiter-only Card payment handoff for canonical Quick POS.
 * This extension never records settlement. It only publishes a payment request
 * for the small display bound to the selected table.
 */
(function () {
  'use strict';

  var root = document.getElementById('pmd-quick-pos');
  if (!root || window.PMDTableDisplayWaiterPaymentV1) return;

  var active = false;
  var sending = false;
  var observer = null;
  var timer = null;

  function api() {
    return window.PMDQuickPOSV1 || null;
  }

  function state() {
    var instance = api();
    return instance && instance.state ? instance.state : null;
  }

  function canUseTableDevicePayment() {
    var current = state();
    if (!current) return false;

    var role = String(
      current.boot && current.boot.user && current.boot.user.role || ''
    ).toLowerCase();

    var mode = String(current.mode || '').toLowerCase();
    var allowedRole = [
      'pmd-owner',
      'pmd-manager',
      'pmd-cashier',
      'pmd-waiter',
      'owner',
      'manager',
      'cashier',
      'waiter'
    ].indexOf(role) !== -1;

    return allowedRole && (mode === 'cashier' || mode === 'waiter');
  }

  function paymentOpen() {
    var current = state();
    var modal = root.querySelector('[data-qpos-payment-modal]');
    return !!(
      current &&
      current.payment &&
      current.payment.open &&
      modal &&
      modal.classList.contains('is-open')
    );
  }

  function amountDue() {
    var current = state();
    if (!current || !current.payment) return 0;
    var settlement = current.payment.summary && current.payment.summary.settlement;
    return Math.max(0, Number(settlement && settlement.remaining_amount || 0));
  }

  function currency() {
    var current = state();
    return String(current && current.settings && current.settings.currency_code || 'EUR').toUpperCase();
  }

  function money(value) {
    value = Number(value || 0);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency()
      }).format(value);
    } catch (error) {
      return value.toFixed(2) + ' ' + currency();
    }
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.content || '') : '';
  }

  function methodBox() {
    return root.querySelector('[data-qpos-payment-methods]');
  }

  function submitButton() {
    return root.querySelector('[data-qpos-payment-submit]');
  }

  function panel() {
    return root.querySelector('[data-pmd-table-card-panel-v1]');
  }

  function ensureMethod() {
    if (!canUseTableDevicePayment() || !paymentOpen()) return;
    var box = methodBox();
    if (!box) return;

    var terminal = box.querySelector('[data-payment-method="direct_terminal"]');
    if (terminal && terminal.textContent.trim() !== 'Terminal') {
      terminal.textContent = 'Terminal';
    }

    var button = box.querySelector('[data-pmd-table-card-method-v1]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-payment-method', 'table_card');
      button.setAttribute('data-pmd-table-card-method-v1', '1');
      button.textContent = 'Table device';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        chooseTableCard();
      });

      if (terminal) box.insertBefore(button, terminal);
      else box.appendChild(button);
    }

    button.classList.toggle('is-active', active);
  }

  function ensurePanel() {
    if (!canUseTableDevicePayment() || !paymentOpen()) return null;
    var box = methodBox();
    if (!box) return null;

    var existing = panel();
    if (existing) return existing;

    var node = document.createElement('section');
    node.className = 'pmd-table-card-panel-v1';
    node.setAttribute('data-pmd-table-card-panel-v1', '1');
    node.hidden = true;
    node.innerHTML =
      '<div class="pmd-table-card-panel-v1__icon" aria-hidden="true">▣</div>' +
      '<div class="pmd-table-card-panel-v1__copy">' +
        '<span>TABLE DEVICE · CONTACTLESS</span>' +
        '<strong>Contactless payment on this table</strong>' +
        '<small>Send the amount to the small table device for contactless/card payment. PayMyDine only accepts the real provider result.</small>' +
      '</div>' +
      '<b data-pmd-table-card-amount-v1></b>' +
      '<div class="pmd-table-card-panel-v1__status" data-pmd-table-card-status-v1 hidden></div>';

    var methodBlock = box.closest('.pmd-qpos-payment-methods') || box.parentElement;
    if (methodBlock && methodBlock.parentNode) {
      methodBlock.parentNode.insertBefore(node, methodBlock.nextSibling);
    } else {
      box.parentNode.insertBefore(node, box.nextSibling);
    }
    return node;
  }

  function setStatus(message, error) {
    var el = root.querySelector('[data-pmd-table-card-status-v1]');
    if (!el) return;
    el.hidden = !message;
    el.classList.toggle('is-error', !!error);
    el.textContent = String(message || '');
  }

  function chooseTableCard() {
    if (!canUseTableDevicePayment() || !paymentOpen()) return;
    active = true;
    sending = false;
    setStatus('', false);

    var box = methodBox();
    if (box) {
      box.querySelectorAll('[data-payment-method]').forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button.hasAttribute('data-pmd-table-card-method-v1')
        );
      });
    }

    root.classList.add('pmd-qpos-table-card-active-v1');
    updateUi();
  }

  function leaveTableCard() {
    active = false;
    sending = false;
    root.classList.remove('pmd-qpos-table-card-active-v1');
    var p = panel();
    if (p) p.hidden = true;
    setStatus('', false);
  }

  function updateUi() {
    if (!canUseTableDevicePayment() || !paymentOpen()) {
      leaveTableCard();
      return;
    }

    ensureMethod();
    var p = ensurePanel();
    var method = methodBox() && methodBox().querySelector('[data-pmd-table-card-method-v1]');
    if (method) method.classList.toggle('is-active', active);

    if (!active) {
      if (p) p.hidden = true;
      return;
    }

    root.classList.add('pmd-qpos-table-card-active-v1');
    if (p) p.hidden = false;

    var amount = root.querySelector('[data-pmd-table-card-amount-v1]');
    if (amount) amount.textContent = money(amountDue());

    var submit = submitButton();
    if (submit) {
      submit.disabled = sending || amountDue() <= 0;
      submit.textContent = sending
        ? 'Sending to table…'
        : 'Send to table device ' + money(amountDue());
    }
  }

  async function sendRequest() {
    if (!active || sending) return;
    var current = state();
    var orderId = Number(current && current.activeOrderId || 0);
    if (orderId < 1) {
      setStatus('Select an unpaid order first.', true);
      return;
    }

    sending = true;
    setStatus('', false);
    updateUi();

    try {
      var response = await fetch(
        '/admin/pos/table-display-payment/' + encodeURIComponent(String(orderId)),
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrf()
          },
          body: JSON.stringify({
            expected_remaining: amountDue(),
            source: 'quick_pos_table_device'
          })
        }
      );

      var json = {};
      try { json = await response.json(); } catch (ignored) {}
      if (!response.ok || json.ok === false) {
        throw new Error(json.message || json.error || ('HTTP ' + response.status));
      }

      setStatus('Sent to the table device. The customer can now tap/insert their card.', false);
      var submit = submitButton();
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sent to table device ✓';
      }

      window.setTimeout(function () {
        var close = root.querySelector('[data-qpos-payment-close]');
        leaveTableCard();
        if (close) close.click();
      }, 1100);
    } catch (error) {
      setStatus(
        (error && error.message) || 'Could not reach the table device.',
        true
      );
    } finally {
      sending = false;
      if (active) updateUi();
    }
  }

  root.addEventListener('click', function (event) {
    var nativeMethod = event.target && event.target.closest
      ? event.target.closest('[data-payment-method]')
      : null;
    if (
      nativeMethod &&
      !nativeMethod.hasAttribute('data-pmd-table-card-method-v1') &&
      active
    ) {
      leaveTableCard();
    }
  }, true);

  root.addEventListener('click', function (event) {
    var submit = event.target && event.target.closest
      ? event.target.closest('[data-qpos-payment-submit]')
      : null;
    if (!submit || !active) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    sendRequest();
  }, true);

  observer = new MutationObserver(function () {
    updateUi();
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden']
  });

  timer = window.setInterval(updateUi, 450);
  updateUi();

  window.PMDTableDisplayWaiterPaymentV1 = {
    update: updateUi,
    request: sendRequest,
    destroy: function () {
      if (observer) observer.disconnect();
      if (timer) window.clearInterval(timer);
      leaveTableCard();
    }
  };
})();