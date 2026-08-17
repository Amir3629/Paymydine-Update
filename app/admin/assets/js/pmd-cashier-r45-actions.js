(function () {
  'use strict';

  // PMD_CASHIER_R45_WINDOW_CAPTURE_AUTHORITY
  // This file has a new filename on purpose. Even a browser that cached an old
  // Composer or R37 Order Center gets this listener. Window capture runs before
  // document capture, so the explicit Cashier actions cannot be stolen by R37.
  if (window.PMDCashierR45Actions) return;

  function closest(target, selector) {
    return target && typeof target.closest === 'function'
      ? target.closest(selector)
      : null;
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.content || '') : '';
  }

  function cardFor(node) {
    return closest(node, '[data-pmd-cashier-order]');
  }

  function openOrder(link) {
    var card = cardFor(link);
    var orderId = Number(
      (card && card.getAttribute('data-pmd-cashier-order')) || 0
    );

    if (!orderId) {
      if (link.href) window.location.href = link.href;
      return;
    }

    var tableId = Number(
      (card && card.getAttribute('data-pmd-cashier-table-id')) || 0
    );
    // PMD_CASHIER_R45_CANONICAL_IDENTITY_FIX
    // DB primary key and guest-facing table number are different identities.
    // For Table 115 the canonical id can be 364. Composer tableRouteKey()
    // intentionally uses the human table number when available.
    var tableNumber = String(
      (card && card.getAttribute('data-pmd-cashier-table-number')) || ''
    ).trim();

    var label = String(
      (card && card.getAttribute('data-pmd-cashier-table-label')) || ''
    ).trim();

    if (!tableNumber && label) {
      var tableMatch = label.match(
        /(?:table|tisch)?\s*#?\s*(\d+)$/i
      );

      if (tableMatch) {
        tableNumber = tableMatch[1];
      }
    }

    var api = window.PMDCashierOrderComposerV1;
    if (api && typeof api.openEdit === 'function') {
      // Important: both id AND number are deliberately the canonical DB id.
      // That keeps even an older cached Composer from preferring display number
      // 115 over its real tables.table_id.
      var hint = tableId > 0 ? {
        id: tableId,
        table_id: tableId,
        number: tableNumber || String(tableId),
        name: label || ('Table ' + tableId),
        raw: {
          table_id: tableId,
          table_no: tableNumber || '',
          table_name: label || ''
        }
      } : null;

      Promise.resolve(api.openEdit(orderId, hint)).catch(function (error) {
        console.error('[PMD R45] Open order failed', error);
      });
      return;
    }

    // Last-resort safe fallback: never leave the button dead.
    if (link.href) window.location.href = link.href;
  }

  async function freeTable(button) {
    var tableId = Number(button.getAttribute('data-pmd-cashier-table-free') || 0);
    var label = String(button.getAttribute('data-pmd-cashier-table-label') || '').trim();
    if (!tableId) {
      window.alert('This order has no canonical table id, so the table cannot be released safely.');
      return;
    }

    var message = 'Set ' + (label || ('Table ' + tableId)) + ' as FREE?\n\n' +
      'This is only allowed when there are no unpaid/part-paid checks. ' +
      'It will make the table green and close the old QR table session so the next guests start clean.';

    if (!window.confirm(message)) return;

    var previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Setting free…';

    try {
      var response = await fetch(
        '/admin/pmd-waiter-pos-v22/tables/' + encodeURIComponent(String(tableId)) + '/free',
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

      var json = await response.json().catch(function () { return {}; });
      if (!response.ok || json.ok === false) {
        throw new Error(
          String(json.message || json.error || ('HTTP ' + response.status))
        );
      }

      window.dispatchEvent(new CustomEvent('pmd:cashier-table-freed', {
        detail: json
      }));

      // Reload is deliberate: Floor reads the authoritative table status again,
      // the card eligibility is re-rendered, and the table immediately goes green.
      window.location.reload();
    } catch (error) {
      button.disabled = false;
      button.textContent = previous;
      window.alert(error && error.message ? error.message : 'Could not set the table free.');
    }
  }

  window.addEventListener('click', function (event) {
    var openLink = closest(
      event.target,
      '#pmd-cashier-current-orders-v2 a[data-pmd-cashier-open-composer="1"]'
    );

    if (openLink) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openOrder(openLink);
      return;
    }

    var freeButton = closest(
      event.target,
      '#pmd-cashier-current-orders-v2 [data-pmd-cashier-table-free]'
    );

    if (freeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      freeTable(freeButton);
    }
  }, true);

  window.PMDCashierR45Actions = {
    version: '45.1.0',
    openOrder: openOrder,
    freeTable: freeTable
  };

  console.info('[PMD] Cashier R45 action authority ready');
})();
