(function () {
  'use strict';

  if (window.PMDWaiterFinalV21) return;

  var root = document.querySelector('[data-pmd-waiter-final2-root]');
  if (!root) return;

  var installedRoots = new WeakSet();
  var modalObservers = new WeakMap();
  var paymentOpening = false;
  var preventedDuplicateOpens = 0;
  var mounts = 0;
  var modalTransitions = 0;

  function currentPosRoot() {
    return root.querySelector('[data-pmd-pos-root]');
  }

  function currentPos() {
    return window.PMDWaiterPOS || null;
  }

  function syncPaymentSurface(modal) {
    if (!modal) return;

    var shown = modal.classList.contains('is-show') && modal.getAttribute('aria-hidden') !== 'true';
    document.body.classList.toggle('pmd-final2-payment-open', shown);

    if (shown) {
      modal.removeAttribute('inert');
      modal.setAttribute('aria-hidden', 'false');
    } else {
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('inert', '');
    }

    modalTransitions += 1;
  }

  function observeModal(modal) {
    if (!modal || modalObservers.has(modal)) return;

    var observer = new MutationObserver(function (records) {
      var relevant = records.some(function (record) {
        return record.type === 'attributes' && (record.attributeName === 'class' || record.attributeName === 'aria-hidden');
      });
      if (relevant) syncPaymentSurface(modal);
    });

    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class', 'aria-hidden']
    });

    modalObservers.set(modal, observer);
    syncPaymentSurface(modal);
  }

  function openPaymentOnce(event, posRoot) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;

    var button = target.closest('[data-pos-payment]');
    if (!button || button.disabled) return;

    var pos = currentPos();
    if (!pos || typeof pos.openPayment !== 'function') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (paymentOpening || (pos.state && pos.state.payment && pos.state.payment.loading)) {
      preventedDuplicateOpens += 1;
      return;
    }

    if (pos.state && pos.state.payment && pos.state.payment.open) {
      preventedDuplicateOpens += 1;
      var existingModal = posRoot.querySelector('[data-pos-payment-modal]');
      syncPaymentSurface(existingModal);
      return;
    }

    paymentOpening = true;
    button.setAttribute('aria-busy', 'true');

    Promise.resolve(pos.openPayment())
      .catch(function (error) {
        console.error('[PMD] Final2 payment open failed', error);
      })
      .finally(function () {
        paymentOpening = false;
        button.removeAttribute('aria-busy');
        var modal = posRoot.querySelector('[data-pos-payment-modal]');
        syncPaymentSurface(modal);
      });
  }

  function install(posRoot) {
    if (!posRoot || installedRoots.has(posRoot)) return false;

    var modal = posRoot.querySelector('[data-pos-payment-modal]');
    if (!modal) return false;

    installedRoots.add(posRoot);
    mounts += 1;
    modal.classList.add('pmd-final2-payment-stable');
    observeModal(modal);

    posRoot.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;

      if (target.closest('[data-pos-payment]')) {
        openPaymentOnce(event, posRoot);
        return;
      }

      if (target.closest('[data-pos-payment-close]')) {
        paymentOpening = false;
        setTimeout(function () { syncPaymentSurface(modal); }, 0);
        return;
      }

      if (target.closest('[data-pos-refresh-payment]')) {
        document.body.classList.add('pmd-final2-payment-open');
      }
    }, true);

    posRoot.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        paymentOpening = false;
        setTimeout(function () { syncPaymentSurface(modal); }, 0);
      }
    }, true);

    return true;
  }

  function scheduleInstall() {
    [0, 80, 240].forEach(function (delay) {
      setTimeout(function () { install(currentPosRoot()); }, delay);
    });
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', scheduleInstall);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      var modal = currentPosRoot() && currentPosRoot().querySelector('[data-pos-payment-modal]');
      syncPaymentSurface(modal);
    }
  });

  window.PMDWaiterFinalV21 = {
    version: 'pmd-waiter-final-v2.1',
    active: true,
    repair: scheduleInstall,
    debug: function () {
      var posRoot = currentPosRoot();
      var modal = posRoot && posRoot.querySelector('[data-pos-payment-modal]');
      var pos = currentPos();
      return {
        version: 'pmd-waiter-final-v2.1',
        active: true,
        mounts: mounts,
        paymentOpening: paymentOpening,
        paymentOpen: !!(modal && modal.classList.contains('is-show')),
        paymentAriaHidden: modal ? modal.getAttribute('aria-hidden') : null,
        preventedDuplicateOpens: preventedDuplicateOpens,
        modalTransitions: modalTransitions,
        legacyV211GuardLoaded: !!window.PMDWaiterPaymentStableV211,
        legacyV12GuardLoaded: !!window.PMDWaiterFinalV12,
        pos: pos && typeof pos.debug === 'function' ? pos.debug() : null
      };
    }
  };

  console.info('[PMD] Waiter Final V2.1 stable payment + sharp operational colours active');
})();
