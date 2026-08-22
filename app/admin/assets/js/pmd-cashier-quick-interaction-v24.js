(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  var mobile = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var isQuickSurface = path === '/admin/cashierlab' && (!mobile || mobile.matches);

  if (!isQuickSurface) return;
  if (window.PMDCashierQuickInteractionV24) return;

  document.documentElement.classList.add('pmd-cashier-quick-v24');

  /*
   * PMD_CASHIER_QUICK_CANONICAL_PAYMENT_V24
   *
   * The old Standard V2.2 payment decorator continuously rewrites canonical
   * payment DOM from a subtree MutationObserver. Those writes can themselves
   * retrigger the observer and make Safari/mobile payment controls effectively
   * untappable. Cashier Quick does not need that decorator: the canonical
   * PMDWaiterPOSPaymentV2 engine already owns split modes, payment methods,
   * totals and settlement. Disable only the Standard V2.2 decorator on the
   * Cashier mobile route before its controller-specific script executes.
   * The real Waiter route remains unchanged.
   */
  if (!window.PMDWaiterStandardV22) {
    window.PMDWaiterStandardV22 = {
      active: false,
      disabledInCashierQuick: true,
      reason: 'canonical-payment-interaction-authority-v24',
      openOperations: function () {},
      refreshOperations: function () { return Promise.resolve(null); },
      debug: function () {
        return {
          active: false,
          disabledInCashierQuick: true,
          reason: 'canonical-payment-interaction-authority-v24'
        };
      }
    };
  }

  var activePos = null;
  var activeTableId = 0;
  var activeTableName = 'this table';
  var paymentObserver = null;

  function positiveId(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.content || '') : '';
  }

  function paymentModal() {
    var host = document.querySelector('[data-v2-pos-host]');
    return host ? host.querySelector('[data-pos-payment-modal]') : null;
  }

  function syncPaymentOpenClass() {
    var modalNode = paymentModal();
    var open = !!(modalNode && modalNode.classList.contains('is-show'));
    document.documentElement.classList.toggle('pmd-cashier-quick-payment-open-v24', open);
  }

  function observePaymentModal() {
    if (paymentObserver) {
      paymentObserver.disconnect();
      paymentObserver = null;
    }

    var modalNode = paymentModal();
    if (!modalNode || typeof MutationObserver !== 'function') {
      syncPaymentOpenClass();
      return;
    }

    paymentObserver = new MutationObserver(syncPaymentOpenClass);
    paymentObserver.observe(modalNode, {
      attributes: true,
      attributeFilter: ['class', 'aria-hidden']
    });
    syncPaymentOpenClass();
  }

  function closePaymentIfOpen() {
    var modalNode = paymentModal();
    if (!modalNode || !modalNode.classList.contains('is-show')) return;
    var close = modalNode.querySelector('[data-pos-payment-close]');
    if (close) close.click();
  }

  function focusNote() {
    closePaymentIfOpen();

    var host = document.querySelector('[data-v2-pos-host]');
    if (!host) return false;

    var orderBar = host.querySelector('[data-pos-mobile-cart]');
    var note = host.querySelector('[data-pos-table-note]');
    if (!note) return false;

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

    return true;
  }

  function openPayment() {
    var pos = activePos || window.PMDWaiterPOS;
    if (pos && typeof pos.openPayment === 'function') {
      pos.openPayment();
      return true;
    }
    return false;
  }

  async function freeTable() {
    if (!activeTableId) {
      throw new Error('Active table could not be resolved.');
    }

    if (!window.confirm(
      'Set ' + activeTableName + ' as FREE?\n\n' +
      'The server will refuse while any check is unpaid or part-paid.'
    )) return;

    var response = await fetch(
      '/admin/pmd-waiter-pos-v22/tables/' + encodeURIComponent(String(activeTableId)) + '/free',
      {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        }
      }
    );

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || ('HTTP ' + response.status));
    }

    if (String(payload.status || payload.table_status || '').toLowerCase() !== 'available' &&
        String(payload.status || payload.table_status || '').toLowerCase() !== 'free') {
      throw new Error('Server did not confirm the table as free.');
    }

    window.location.replace('/admin/cashierlab?pmd_cashier_quick=1');
  }

  function backToTables() {
    closePaymentIfOpen();
    if (
      window.PMDWaiterStandardV2 &&
      typeof window.PMDWaiterStandardV2.closeTable === 'function'
    ) {
      window.PMDWaiterStandardV2.closeTable();
      return true;
    }
    window.location.replace('/admin/cashierlab?pmd_cashier_quick=1');
    return true;
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    activePos = detail.pos || window.PMDWaiterPOS || null;
    activeTableId = positiveId(detail.tableId) ||
      positiveId(activePos && activePos.state && activePos.state.table && activePos.state.table.id) ||
      positiveId(activePos && activePos.state && activePos.state.tableId);

    var title = document.querySelector('[data-pmd-cql-v22-pos-header] > strong');
    activeTableName = title && title.textContent.trim()
      ? title.textContent.trim()
      : ('Table ' + (activeTableId || ''));

    window.requestAnimationFrame(observePaymentModal);
  });

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || typeof target.closest !== 'function') return;

    var note = target.closest('[data-cql-v22-note]');
    var pay = target.closest('[data-cql-v22-pos-pay]');
    var free = target.closest('[data-cql-v22-free]');
    var back = target.closest('[data-cql-v22-back]');

    if (!note && !pay && !free && !back) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (note) {
      focusNote();
      return;
    }

    if (pay) {
      openPayment();
      return;
    }

    if (back) {
      backToTables();
      return;
    }

    if (free) {
      freeTable().catch(function (error) {
        window.alert(error.message || 'Could not set table free.');
      });
    }
  }, true);

  window.addEventListener('pmd:waiter-pos-order-updated', function () {
    window.requestAnimationFrame(syncPaymentOpenClass);
  });

  window.addEventListener('pagehide', function () {
    if (paymentObserver) paymentObserver.disconnect();
  }, {once: true});

  window.PMDCashierQuickInteractionV24 = {
    version: '2.4.0',
    canonicalPayment: true,
    standardV22DecoratorDisabled: true,
    topActionAuthority: true,
    sharpUiAuthority: true,
    inspect: function () {
      return {
        activeTableId: activeTableId,
        paymentOpen: document.documentElement.classList.contains('pmd-cashier-quick-payment-open-v24'),
        pos: !!(activePos || window.PMDWaiterPOS),
        canonicalPayment: !!window.PMDWaiterPOSPaymentV2,
        standardV22: window.PMDWaiterStandardV22 && window.PMDWaiterStandardV22.debug
          ? window.PMDWaiterStandardV22.debug()
          : null
      };
    }
  };

  console.info('[PMD] Cashier Quick interaction V2.4 canonical payment authority active');
})();
