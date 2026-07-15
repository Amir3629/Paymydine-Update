(function () {
  'use strict';

  if (window.PMDWaiterFinalV12) return;

  var root = document.querySelector('[data-pmd-waiter-final-root]');
  if (!root) return;

  var restoredPaymentVisibility = 0;
  var restoredControls = 0;
  var paymentGuardTimer = null;

  function posRoot() {
    return root.querySelector('[data-pmd-pos-root]');
  }

  function posState() {
    return window.PMDWaiterPOS && window.PMDWaiterPOS.state ? window.PMDWaiterPOS.state : null;
  }

  function ensureControls() {
    var current = posRoot();
    if (!current) return;

    ['[data-pos-view="grid"]', '[data-pos-view="list"]', '[data-pos-clear]'].forEach(function (selector) {
      var element = current.querySelector(selector);
      if (!element) return;
      element.hidden = false;
      element.removeAttribute('hidden');
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      element.style.removeProperty('opacity');
      restoredControls += 1;
    });
  }

  function ensurePaymentVisible(forceOpen) {
    var current = posRoot();
    if (!current) return;

    var modal = current.querySelector('[data-pos-payment-modal]');
    var state = posState();
    if (!modal) return;

    var shouldOpen = !!forceOpen || !!(state && state.payment && state.payment.open);
    if (!shouldOpen) return;

    if (!modal.classList.contains('is-show') || modal.getAttribute('aria-hidden') !== 'false') {
      modal.classList.add('is-show');
      modal.setAttribute('aria-hidden', 'false');
      if (state && state.payment) state.payment.open = true;
      restoredPaymentVisibility += 1;
    }
  }

  function startPaymentGuard() {
    clearInterval(paymentGuardTimer);
    var remaining = 30;
    paymentGuardTimer = setInterval(function () {
      ensureControls();
      ensurePaymentVisible(true);
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(paymentGuardTimer);
        paymentGuardTimer = null;
      }
    }, 100);
  }

  root.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;

    if (target.closest('[data-pos-payment]')) {
      setTimeout(function () {
        ensurePaymentVisible(true);
        startPaymentGuard();
      }, 0);
      return;
    }

    if (target.closest('[data-pos-refresh-payment]')) {
      setTimeout(function () {
        var state = posState();
        if (state && state.payment) state.payment.open = true;
        ensurePaymentVisible(true);
        startPaymentGuard();
      }, 0);
      return;
    }

    if (target.closest('[data-pos-payment-close]')) {
      clearInterval(paymentGuardTimer);
      paymentGuardTimer = null;
      var state = posState();
      var current = posRoot();
      var modal = current && current.querySelector('[data-pos-payment-modal]');
      if (state && state.payment) state.payment.open = false;
      if (modal) {
        modal.classList.remove('is-show');
        modal.setAttribute('aria-hidden', 'true');
      }
      return;
    }
  }, true);

  window.addEventListener('pmd:waiter-standard-v2-opened', function () {
    setTimeout(ensureControls, 0);
    setTimeout(ensureControls, 250);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      ensureControls();
      ensurePaymentVisible(false);
    }
  });

  window.PMDWaiterFinalV12 = {
    version: 'pmd-waiter-final-v1.2',
    active: true,
    repair: function () {
      ensureControls();
      ensurePaymentVisible(false);
    },
    debug: function () {
      var current = posRoot();
      var modal = current && current.querySelector('[data-pos-payment-modal]');
      return {
        version: 'pmd-waiter-final-v1.2',
        active: true,
        posMounted: !!current,
        paymentOpen: !!(modal && modal.classList.contains('is-show')),
        paymentAriaHidden: modal ? modal.getAttribute('aria-hidden') : null,
        restoredPaymentVisibility: restoredPaymentVisibility,
        restoredControls: restoredControls,
        gridButtonVisible: !!(current && current.querySelector('[data-pos-view="grid"]')),
        listButtonVisible: !!(current && current.querySelector('[data-pos-view="list"]')),
        clearButtonVisible: !!(current && current.querySelector('[data-pos-clear]'))
      };
    }
  };

  console.info('[PMD] Waiter Final V1.2 runtime fixes active');
})();
