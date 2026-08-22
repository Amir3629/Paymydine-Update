(function () {
  'use strict';

  if (window.PMDWaiterPaymentStableV211) return;

  var pageRoot = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!pageRoot) return;

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  var isCashierQuick = route === '/admin/cashierlab';

  /*
   * PMD CASHIER QUICK MOBILE PERFORMANCE GUARD V2.3
   *
   * Cashier Quick reuses the proven Waiter POS engine, but it does not use
   * the legacy Waiter launcher/lifecycle/service-inbox UI. Those older layers
   * otherwise keep several pollers and MutationObservers alive behind the
   * Quick launcher. Disable only those launcher authorities on /cashierlab.
   * The canonical POS/payment engine remains loaded and unchanged.
   */
  if (isCashierQuick) {
    window.PMDWaiterV241SafeLifecycle = true;
    window.PMDWaiterV263 = true;
    window.PMDWaiterV271 = {
      disabledInCashierQuick: true,
      events: [],
      dashboard: null
    };
    window.PMDWaiterV274 = {
      disabledInCashierQuick: true
    };

    function stopLegacyV21BackgroundWork() {
      var layer = window.PMDWaiterStandardV21;
      if (layer && typeof layer.destroy === 'function') {
        try { layer.destroy(); } catch (error) {}
      }
    }

    // V2.1 is loaded immediately before this file. Keep its one-time visual
    // enhancement when a POS opens, then disconnect its observers/poller.
    stopLegacyV21BackgroundWork();

    window.addEventListener('pmd:waiter-standard-v2-opened', function () {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(stopLegacyV21BackgroundWork);
      });
    });

    window.addEventListener('pmd:waiter-pos-order-updated', function () {
      // V2.1 schedules follow-up work at 80ms and 250ms. Disconnect after both
      // callbacks so repeated order edits cannot leave observers running.
      window.setTimeout(stopLegacyV21BackgroundWork, 120);
      window.setTimeout(stopLegacyV21BackgroundWork, 320);
    });

    /*
     * iOS/Safari requires focus to remain inside the original user gesture.
     * The previous Quick header waited 50ms before focusing the note textarea,
     * which can suppress the keyboard. Handle the Quick Note button in capture
     * phase, open the canonical mobile cart, then focus synchronously.
     */
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1
        ? event.target
        : null;
      var noteButton = target && target.closest('[data-cql-v22-note]');
      if (!noteButton) return;

      var posHost = document.querySelector('[data-v2-pos-host]');
      var orderBar = posHost && posHost.querySelector('[data-pos-mobile-cart]');
      var note = posHost && posHost.querySelector('[data-pos-table-note]');

      if (!note) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (orderBar) orderBar.click();

      try {
        note.scrollIntoView({block: 'center', behavior: 'auto'});
      } catch (error) {}

      try {
        note.focus({preventScroll: true});
      } catch (error) {
        note.focus();
      }

      if (typeof note.setSelectionRange === 'function') {
        try {
          var end = String(note.value || '').length;
          note.setSelectionRange(end, end);
        } catch (error) {}
      }
    }, true);

    window.PMDCashierQuickPerformanceV23 = {
      version: '2.3.0',
      legacyV21BackgroundStopped: true,
      waiterLifecycleSkipped: true,
      waiterAreaWatcherSkipped: true,
      waiterServiceInboxSkipped: true,
      waiterServiceRendererSkipped: true,
      paymentGuardSkipped: true,
      canonicalPaymentEnginePreserved: Boolean(window.PMDWaiterPOSPaymentV2)
    };

    console.info(
      '[PMD] Cashier Quick mobile performance guard V2.3 active',
      window.PMDCashierQuickPerformanceV23
    );
    return;
  }

  var installations = new WeakMap();
  var debugState = {
    version: 'pmd-waiter-payment-stable-v2.1.2',
    installed: 0,
    cleaned: 0,
    preventedAutoCloses: 0,
    retries: 0,
    degradedSummaries: 0,
    lastError: '',
    modalOpen: false
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[character];
    });
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
        '<span>' + escapeHtml(message) + '</span>' +
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
      dialog.removeAttribute('data-v211-payment-mode');
      return;
    }

    var storageReady = !summary.payment_storage || summary.payment_storage.ready !== false;
    var mode = storageReady ? 'compatibility' : 'storage-missing';
    var title = storageReady ? 'COMPATIBILITY MODE' : 'PAYMENT STORAGE NOT READY';
    var message = clean(summary.warning || 'Payment information was recovered safely.');
    var signature = mode + '|' + title + '|' + message;

    if (current && current.getAttribute('data-v211-signature') === signature) {
      if (dialog.getAttribute('data-v211-payment-mode') !== mode) {
        dialog.setAttribute('data-v211-payment-mode', mode);
      }
      return;
    }

    debugState.degradedSummaries += current ? 0 : 1;

    if (!current) {
      current = document.createElement('div');
      current.className = 'pmd-v211-payment-warning';
      balance.parentNode.insertBefore(current, balance);
    }

    current.setAttribute('data-v211-signature', signature);
    current.classList.toggle('is-blocking', !storageReady);
    current.innerHTML = '' +
      '<strong>' + escapeHtml(title) + '</strong>' +
      '<span>' + escapeHtml(message) + '</span>';

    dialog.setAttribute('data-v211-payment-mode', mode);
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
      observer: null,
      cleaned: false
    };

    function cleanup() {
      if (controller.cleaned) return;
      controller.cleaned = true;

      if (controller.timer) {
        clearInterval(controller.timer);
        controller.timer = null;
      }

      if (controller.observer) {
        controller.observer.disconnect();
        controller.observer = null;
      }

      installations.delete(posRoot);
      debugState.cleaned += 1;
    }

    controller.cleanup = cleanup;

    function beginOpen() {
      controller.opening = true;
      controller.manualClose = false;
      controller.restored = false;
      controller.deadline = Date.now() + 10000;
      debugState.lastError = '';
    }

    paymentButton.addEventListener('click', beginOpen, true);

    modal.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (event.target === modal || (target && target.closest('[data-pos-payment-close]'))) {
        controller.manualClose = true;
        controller.opening = false;
      }
    }, true);

    controller.observer = new MutationObserver(function () {
      if (controller.applying || controller.cleaned) return;

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
            if (!controller.cleaned) {
              ensureErrorPanel(posRoot, modal, pos, controller);
              controller.applying = false;
            }
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
      if (controller.cleaned || !posRoot.isConnected) {
        cleanup();
        return;
      }

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

    // The dashboard destroys the canonical POS instance whenever a table is
    // closed/replaced. Tie this guard's observer/timer to that same lifecycle.
    if (typeof pos.destroy === 'function' && !pos.__pmdV211DestroyWrapped) {
      var canonicalDestroy = pos.destroy;
      pos.destroy = function () {
        cleanup();
        return canonicalDestroy.apply(pos, arguments);
      };
      pos.__pmdV211DestroyWrapped = true;
    }

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
        cleaned: debugState.cleaned,
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

  console.info('[PMD] Waiter payment stable V2.1.2 lifecycle-safe guard active');
})();
