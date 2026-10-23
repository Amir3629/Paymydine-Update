/* PMD_TABLE_DISPLAY_V1
 * Table-device card/contactless handoff for canonical Quick POS.
 * This extension never records settlement. It only publishes a payment request
 * for the small display bound to the selected table.
 */
(function () {
  'use strict';

  var root = document.getElementById('pmd-quick-pos');
  if (!root || window.PMDTableDisplayWaiterPaymentV1) return;

  var active = false;
  var sending = false;
  var waiting = false;
  var activeAttemptId = 0;
  var pollGeneration = 0;
  var observer = null;
  var timer = null;

  // PMD_TABLE_DEVICE_DYNAMIC_AVAILABILITY_V140
  var availability = {orderId: 0, ready: false, checkedAt: 0, pending: false};

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

    return allowedRole &&
      (mode === 'cashier' || mode === 'waiter') &&
      Number(current.activeOrderId || 0) > 0 &&
      !current.payment.batchModeV114 &&
      !!(current.selectedTable && Number(current.selectedTable.id || 0) > 0);
  }

  // A physical Table Companion without a linked acquiring terminal cannot
  // accept bank cards. Resolve the binding from an authenticated read-only
  // backend endpoint; never infer it from the NFC badge or presence of a screen.
  function tableDeviceAvailableV140() {
    var current = state();
    return !!(
      current &&
      availability.ready &&
      availability.orderId === Number(current.activeOrderId || 0)
    );
  }

  function nativeCloudReachableV140() {
    var bridge = window.PayMyDineOffline;
    if (!bridge || typeof bridge.syncStatus !== 'function') return true;
    try {
      var result = JSON.parse(String(bridge.syncStatus() || '{}'));
      return result.cloud_available === true;
    } catch (ignored) {
      return false;
    }
  }

  function refreshTableDeviceAvailabilityV140() {
    if (!canUseTableDevicePayment() || !paymentOpen()) return;
    var current = state();
    var id = Number(current.activeOrderId || 0);
    var now = Date.now();
    if (!nativeCloudReachableV140()) {
      availability.ready = false;
      availability.orderId = id;
      availability.checkedAt = 0;
      return;
    }
    if (availability.orderId !== id) {
      availability.orderId = id;
      availability.ready = false;
      availability.checkedAt = 0;
    }
    if (availability.pending || now - availability.checkedAt < 10000) return;
    availability.checkedAt = now;
    availability.pending = true;

    fetch(
      '/admin/pos/table-display-payment-availability/' +
        encodeURIComponent(String(id)),
      {method: 'GET', credentials: 'same-origin', cache: 'no-store',
       headers: {'Accept': 'application/json'}}
    ).then(function (response) {
      if (!response.ok) throw new Error('Unavailable');
      return response.json();
    }).then(function (data) {
      if (availability.orderId !== id) return;
      availability.ready = !!(data && data.ok && data.available);
    }).catch(function () {
      if (availability.orderId === id) availability.ready = false;
    }).finally(function () {
      availability.pending = false;
      if (availability.orderId === id) updateUi();
    });
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

    if (!tableDeviceAvailableV140()) {
      var oldButton = box.querySelector('[data-pmd-table-card-method-v1]');
      if (oldButton && !waiting && !sending) oldButton.remove();
      return;
    }

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
        '<small>Send the amount to the payment terminal linked to this table. The table display may show payment status, but only the provider confirms card payment.</small>' +
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
    if (!canUseTableDevicePayment() || !paymentOpen() || !tableDeviceAvailableV140()) return;
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
    waiting = false;
    activeAttemptId = 0;
    pollGeneration += 1;
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

    refreshTableDeviceAvailabilityV140();
    ensureMethod();
    if (!tableDeviceAvailableV140() && active && !waiting && !sending) {
      leaveTableCard();
    }
    var p = tableDeviceAvailableV140() || waiting || sending
      ? ensurePanel()
      : panel();
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
      submit.disabled = sending || waiting || amountDue() <= 0;
      submit.textContent = sending
        ? 'Sending to table…'
        : (waiting
          ? 'Waiting for contactless…'
          : 'Send to table device ' + money(amountDue()));
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function isRecordedCardPaymentV137(result) {
    return !!(
      result &&
      result.simulated !== true &&
      String(result.status || '').toLowerCase() === 'paid' &&
      result.payment_recorded === true
    );
  }

  function terminalFailureStatus(status) {
    return [
      'failed',
      'cancelled',
      'canceled',
      'declined',
      'expired',
      'rejected'
    ].indexOf(String(status || '').toLowerCase()) !== -1;
  }

  async function refreshAttempt(attemptId) {
    var response = await fetch(
      '/admin/pos/table-display-payment-attempt/' +
        encodeURIComponent(String(attemptId)) +
        '/refresh',
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
        body: '{}'
      }
    );

    var json = {};
    try { json = await response.json(); } catch (ignored) {}
    if (!response.ok) {
      throw new Error(
        json.message || json.error || ('HTTP ' + response.status)
      );
    }

    return json;
  }

  async function pollAttempt(attemptId, generation) {
    var maxChecks = 160;

    for (var check = 0; check < maxChecks; check += 1) {
      if (
        !active ||
        !waiting ||
        generation !== pollGeneration ||
        attemptId !== activeAttemptId
      ) {
        return;
      }

      if (check > 0) {
        await sleep(1500);
      }

      var json;
      try {
        json = await refreshAttempt(attemptId);
      } catch (error) {
        if (
          !active ||
          generation !== pollGeneration ||
          attemptId !== activeAttemptId
        ) {
          return;
        }

        setStatus(
          'Payment status is temporarily unavailable. Retrying…',
          false
        );
        continue;
      }

      var status = String(json.status || '').toLowerCase();

      if (json.simulated) {
        waiting = false;
        setStatus(
          json.message ||
            'TEST only — no real payment was recorded.',
          true
        );
        updateUi();
        return;
      }

      /* PMD_TABLE_DEVICE_PROVIDER_SETTLEMENT_GUARD_V137
       * A provider "paid" response is not enough to close a PayMyDine
       * order unless the canonical server confirms recording as well.
       * Never instruct staff to retry a possibly charged card. */
      if (status === 'paid' && !isRecordedCardPaymentV137(json)) {
        waiting = true;
        setStatus(
          'Provider reports paid, but PayMyDine has not confirmed the settlement. Do not retry or charge the card again; check the payment provider.',
          true
        );
        updateUi();
        return;
      }

      if (isRecordedCardPaymentV137(json)) {
        waiting = false;
        setStatus('Payment approved and recorded.', false);

        var submit = submitButton();
        if (submit) {
          submit.disabled = true;
          submit.textContent = 'Paid ✓';
        }

        window.setTimeout(function () {
          if (
            generation !== pollGeneration ||
            attemptId !== activeAttemptId
          ) {
            return;
          }

          var close = root.querySelector('[data-qpos-payment-close]');
          leaveTableCard();
          if (close) close.click();
        }, 1200);
        return;
      }

      if (terminalFailureStatus(status)) {
        waiting = false;
        setStatus(
          json.message ||
            ('Payment ' + (status || 'failed') + '.'),
          true
        );
        updateUi();
        return;
      }

      setStatus(
        json.message ||
          'Waiting for the customer to pay on the linked terminal…',
        false
      );
      updateUi();
    }

    if (
      active &&
      generation === pollGeneration &&
      attemptId === activeAttemptId
    ) {
      waiting = false;
      setStatus(
        'The terminal is still waiting. Check the payment device before trying again.',
        true
      );
      updateUi();
    }
  }

  async function sendRequest() {
    if (!active || sending || waiting || !tableDeviceAvailableV140()) return;
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

      var attemptId = Number(json.attempt_id || 0);
      if (attemptId < 1) {
        throw new Error(
          'PayMyDine did not return a payment attempt ID.'
        );
      }

      activeAttemptId = attemptId;
      waiting = true;
      pollGeneration += 1;
      var generation = pollGeneration;

      setStatus(
        'Sent to the linked contactless terminal. Waiting for the customer to pay…',
        false
      );
      updateUi();

      await pollAttempt(attemptId, generation);
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

  // PMD_QPOS_PAYMENT_FREEZE_R136
  // The old observer watched every class/hidden mutation under the whole POS.
  // updateUi() itself changes hidden/class/text state, so opening Payment could
  // create a self-triggering MutationObserver loop and freeze Safari/Chromium.
  // Only watch the canonical payment modal's open/close class. The existing
  // timer remains the fallback for all other state changes.
  var paymentModalForObserver = root.querySelector('[data-qpos-payment-modal]');
  if (paymentModalForObserver) {
    observer = new MutationObserver(function () {
      updateUi();
    });
    observer.observe(paymentModalForObserver, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

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