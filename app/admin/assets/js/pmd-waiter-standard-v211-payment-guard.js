(function () {
  'use strict';

  if (window.PMDWaiterPaymentStableV211) return;

  var pageRoot = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!pageRoot) return;

  var installations = new WeakMap();
  var debugState = {
    version: 'pmd-waiter-payment-stable-v2.1.1',
    installed: 0,
    preventedAutoCloses: 0,
    retries: 0,
    degradedSummaries: 0,
    lastError: '',
    modalOpen: false
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function latestErrorText(posRoot) {
    var candidates = [
      posRoot.querySelector('[data-pos-toast].is-error'),
      pageRoot.querySelector('[data-v2-toast].is-error'),
      posRoot.querySelector('[data-pos-toast]'),
      pageRoot.querySelector('[data-v2-toast]')
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var text = clean(candidates[i] && candidates[i].textContent);
      if (text) return text;
    }

    return 'Payment details could not be loaded.';
  }

  function ensureErrorPanel(posRoot, modal, pos, controller) {
    var balance = posRoot.querySelector('[data-pos-payment-balance]');
    if (!balance) return;

    var message = latestErrorText(posRoot);
    debugState.lastError = message;

    balance.innerHTML = '' +
      '<section class="pmd-v211-payment-error" role="alert">' +
        '<strong>PAYMENT DETAILS NOT LOADED</strong>' +
        '<span>' + message.replace(/[&<>"']/g, function (character) {
          return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character];
        }) + '</span>' +
        '<small>The order is still safe. Retry without leaving this table.</small>' +
        '<button type="button" data-v211-payment-retry>RETRY PAYMENT DETAILS</button>' +
      '</section>';

    var retry = balance.querySelector('[data-v211-payment-retry]');
    if (retry) {
      retry.onclick = function () {
        debugState.retries += 1;
        controller.manualClose = false;
        controller.opening = true;
        controller.restored = false;
        controller.deadline = Date.now() + 10000;

        if (pos && pos.state && pos.state.payment) {
          pos.state.payment.open = false;
          pos.state.payment.loading = false;
          pos.state.payment.summary = null;
        }

        modal.classList.remove('is-show');
        modal.setAttribute('aria-hidden', 'true');

        setTimeout(function () {
          if (pos && typeof pos.openPayment === 'function') pos.openPayment();
        }, 0);
      };
    }
  }

  function decorateRecoveredSummary(posRoot, pos) {
    if (!pos || !pos.state || !pos.state.payment || !pos.state.payment.summary) return;

    var summary = pos.state.payment.summary;
    var dialog = posRoot.querySelector('.pmd-pos-payment-dialog');
    var balance = posRoot.querySelector('[data-pos-payment-balance]');
    if (!dialog || !balance) return;

    var current = dialog.querySelector('.pmd-v211-payment-warning');
    if (!summary.degraded) {
      if (current) current.remove();
      return;
    }

    debugState.degradedSummaries += current ? 0 : 1;

    if (!current) {
      current = document.createElement('div');
      current.className = 'pmd-v211-payment-warning';
      balance.parentNode.insertBefore(current, balance);
    }

    var storageReady = !summary.payment_storage || summary.payment_storage.ready !== false;
    current.classList.toggle('is-blocking', !storageReady);
    current.innerHTML = '' +
      '<strong>' + (storageReady ? 'COMPATIBILITY MODE' : 'PAYMENT STORAGE NOT READY') + '</strong>' +
      '<span>' + clean(summary.warning || 'Payment information was recovered safely.') + '</span>';

    dialog.setAttribute('data-v211-payment-mode', storageReady ? 'compatibility' : 'storage-missing');
  }

  function install(pos, posRoot) {
    if (!pos || !posRoot || installations.has(posRoot)) return;

    var modal = posRoot.querySelector('[data-pos-payment-modal]');
    var paymentButton = posRoot.querySelector('[data-pos-payment]');
    if (!modal || !paymentButton) return;

    var controller = {
      opening: false,
      manualClose: false,
      restored: false,
      applying: false,
      deadline: 0,
      timer: null,
      observer: null
    };

    function beginOpen() {
      controller.opening = true;
      controller.manualClose = false;
      controller.restored = false;
      controller.deadline = Date.now() + 10000;
      debugState.lastError = '';
    }

    paymentButton.addEventListener('click', beginOpen, true);

    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-pos-payment-close]')) {
        controller.manualClose = true;
        controller.opening = false;
      }
    }, true);

    controller.observer = new MutationObserver(function () {
      if (controller.applying) return;

      var payment = pos.state && pos.state.payment;
      var shown = modal.classList.contains('is-show');
      debugState.modalOpen = shown;

      if (shown && payment && payment.summary) {
        controller.opening = false;
        controller.restored = false;
        decorateRecoveredSummary(posRoot, pos);
        return;
      }

      if (!shown && controller.opening && !controller.manualClose && Date.now() <= controller.deadline) {
        if (payment && !payment.summary && !payment.loading && !controller.restored) {
          controller.restored = true;
          controller.applying = true;
          debugState.preventedAutoCloses += 1;

          payment.open = true;
          modal.classList.add('is-show');
          modal.setAttribute('aria-hidden', 'false');

          requestAnimationFrame(function () {
            ensureErrorPanel(posRoot, modal, pos, controller);
            controller.applying = false;
          });
        }
      }
    });

    controller.observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class', 'aria-hidden'],
      childList: true,
      subtree: true
    });

    controller.timer = setInterval(function () {
      var payment = pos.state && pos.state.payment;
      var shown = modal.classList.contains('is-show');
      debugState.modalOpen = shown;

      if (shown && payment && payment.summary) {
        decorateRecoveredSummary(posRoot, pos);
      }

      if (controller.opening && Date.now() > controller.deadline) {
        controller.opening = false;
      }
    }, 250);

    installations.set(posRoot, controller);
    debugState.installed += 1;
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    var pos = detail.pos || window.PMDWaiterPOS;
    var posRoot = document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]');
    requestAnimationFrame(function () { install(pos, posRoot); });
  });

  window.PMDWaiterPaymentStableV211 = {
    active: true,
    install: install,
    debug: function () {
      return {
        version: debugState.version,
        active: true,
        installed: debugState.installed,
        preventedAutoCloses: debugState.preventedAutoCloses,
        retries: debugState.retries,
        degradedSummaries: debugState.degradedSummaries,
        lastError: debugState.lastError,
        modalOpen: debugState.modalOpen,
        pos: window.PMDWaiterPOS && typeof window.PMDWaiterPOS.debug === 'function'
          ? window.PMDWaiterPOS.debug()
          : null
      };
    }
  };

  console.info('[PMD] Waiter payment stable V2.1.1 no-auto-close guard active');
})();
