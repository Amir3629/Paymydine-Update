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

  // PMD_CASHIER_R60L_FREE_TABLE_TOOLBAR
  function selectedFloorTableR60L() {
    var floor =
      window.PMDFloorMapV1;

    var instances =
      floor &&
      Array.isArray(floor.instances)
        ? floor.instances
        : [];

    for (
      var index = 0;
      index < instances.length;
      index += 1
    ) {
      var instance =
        instances[index];

      if (
        !instance ||
        typeof instance.getState !==
          'function'
      ) {
        continue;
      }

      var floorState =
        instance.getState() || {};

      var selectedId =
        String(
          floorState.selectedDisplayId ||
          ''
        );

      if (!selectedId) {
        continue;
      }

      var displayTables =
        Array.isArray(
          floorState.displayTables
        )
          ? floorState.displayTables
          : [];

      var selected =
        displayTables.find(
          function (row) {
            return (
              row &&
              String(row.id) ===
                selectedId
            );
          }
        ) || null;

      if (selected) {
        return selected;
      }
    }

    return null;
  }


  function syncFreeTableToolbar() {
    var button =
      document.querySelector(
        '#pmd-cashier-current-orders-v2 ' +
        '[data-pmd-cashier-table-free-toolbar]'
      );

    if (!button) {
      return;
    }

    var selected =
      selectedFloorTableR60L();

    var raw =
      selected &&
      selected.raw &&
      typeof selected.raw === 'object'
        ? selected.raw
        : {};

    var canonicalId =
      Number(
        (
          selected &&
          selected.dbTableId
        ) ||
        raw.table_id ||
        0
      );

    var status =
      String(
        selected &&
        selected.status ||
        ''
      ).toLowerCase();

    var merged =
      !!(
        selected &&
        (
          selected.isMergedView ||
          (
            Array.isArray(
              selected.memberIds
            ) &&
            selected.memberIds.length > 1
          )
        )
      );

    /*
     * User workflow:
     * select a RED occupied physical table -> Free table activates.
     *
     * The backend still performs the final unpaid/part-paid safety
     * validation when the button is pressed.
     */
    var ready =
      !!selected &&
      !merged &&
      status === 'occupied' &&
      canonicalId > 0;

    var label =
      String(
        (
          selected &&
          selected.name
        ) ||
        (
          selected &&
          selected.number
            ? 'Table ' +
              selected.number
            : ''
        )
      ).trim();

    button.disabled =
      !ready;

    button.classList.toggle(
      'is-ready',
      ready
    );

    button.setAttribute(
      'aria-disabled',
      ready
        ? 'false'
        : 'true'
    );

    button.setAttribute(
      'data-pmd-cashier-table-free',
      ready
        ? String(canonicalId)
        : '0'
    );

    button.setAttribute(
      'data-pmd-cashier-table-label',
      ready
        ? label
        : ''
    );

    button.setAttribute(
      'title',
      ready
        ? (
            'Set ' +
            (
              label ||
              'selected table'
            ) +
            ' free'
          )
        : (
            merged
              ? 'Merged tables cannot be released with one Free table action.'
              : 'Select a red occupied table first.'
          )
    );
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

    // PMD_CASHIER_R60S_PAID_TABLE_DIRECT_CENTER
    var directTableId = Number(
      (
        card &&
        card.getAttribute(
          'data-pmd-cashier-table-id'
        )
      ) || 0
    );

    var fullyPaid =
      !!card &&
      (
        String(
          card.getAttribute(
            'data-pmd-cashier-order-paid'
          ) || '0'
        ) === '1'
        ||
        !!card.querySelector(
          '.is-paid-label'
        )
      );

    /*
     * Paid physical-table orders are read-only.
     *
     * Do not paint Composer and then fall back to Order Center.
     * That two-surface handoff is the visible table-order blink.
     *
     * Delivery remains on its existing path.
     */
    if (
      directTableId > 0 &&
      fullyPaid &&
      window.PMDCashierOrderCenter &&
      typeof window.PMDCashierOrderCenter.open ===
        'function'
    ) {
      window.PMDCashierOrderCenter.open(
        orderId
      );
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

      // PMD_CASHIER_R46_FREE_CONFIRMATION
      // Do not remove the card/reload until the backend confirms physical state.
      var confirmedStatus = String(
        json && json.table && json.table.operational_status || ''
      ).toLowerCase();

      if (confirmedStatus !== 'available' && confirmedStatus !== 'free') {
        throw new Error('Table release was not confirmed by the server.');
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
    var floorTable =
      closest(
        event.target,
        '[data-pmd-floor] [data-floor-table]'
      );

    if (floorTable) {
      window.setTimeout(
        syncFreeTableToolbar,
        0
      );
    }

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
    version: '45.2.0-r60l',
    openOrder: openOrder,
    freeTable: freeTable,
    syncFreeTableToolbar:
      syncFreeTableToolbar
  };

  window.addEventListener(
    'pageshow',
    function () {
      window.setTimeout(
        syncFreeTableToolbar,
        0
      );
    }
  );

  window.addEventListener(
    'pmd:floor:updated',
    function () {
      window.setTimeout(
        syncFreeTableToolbar,
        0
      );
    }
  );

  window.addEventListener(
    'pmd:floor:context',
    function () {
      window.setTimeout(
        syncFreeTableToolbar,
        0
      );
    }
  );

  window.setTimeout(
    syncFreeTableToolbar,
    0
  );

  console.info('[PMD] Cashier R45 action authority ready');
})();


/* PMD_CASHIER_R60T_FREE_TABLE_SELECTION_START */
(function () {
  'use strict';

  function floorRoot() {
    return document.getElementById(
      'pmd-r2-shared-floor-canvas-v310'
    );
  }

  function floorState() {
    var root = floorRoot();

    var api =
      root &&
      root.__pmdFloorV1;

    if (
      !api ||
      typeof api.getState !== 'function'
    ) {
      return null;
    }

    return api.getState();
  }

  function selectedFloorTable() {
    var state = floorState();

    if (
      !state ||
      state.selectedDisplayId == null
    ) {
      return null;
    }

    var selected =
      String(
        state.selectedDisplayId
      );

    var tables =
      Array.isArray(state.tables)
        ? state.tables
        : [];

    return tables.find(
      function (table) {
        return (
          table &&
          String(table.id) === selected
        );
      }
    ) || null;
  }

  function canonicalTableId(table) {
    if (!table) {
      return 0;
    }

    var raw =
      table.raw || {};

    return Number(
      table.dbTableId ||
      table.tableId ||
      table.table_id ||
      raw.table_id ||
      raw.id ||
      0
    );
  }

  function tableIsOccupied(table) {
    if (!table) {
      return false;
    }

    var raw =
      table.raw || {};

    var operational =
      String(
        raw.operational_status ||
        raw.table_operational_status ||
        table.operational_status ||
        table.table_operational_status ||
        ''
      )
        .trim()
        .toLowerCase();

    var presentation =
      String(
        table.status ||
        raw.status ||
        raw.latest_order_status ||
        ''
      )
        .trim()
        .toLowerCase();

    var openOrders =
      Number(
        table.openOrders ||
        table.open_orders ||
        raw.open_orders ||
        0
      );

    /*
     * A red/occupied table may expose the toolbar action.
     *
     * Financial eligibility is still validated by the existing
     * markTableFreeV45 backend. This UI never bypasses that guard.
     */
    return (
      operational === 'occupied' ||
      presentation === 'occupied' ||
      openOrders > 0
    );
  }

  function tableLabel(table, tableId) {
    if (!table) {
      return '';
    }

    return String(
      table.name ||
      table.label ||
      (
        'Table ' +
        String(
          table.number ||
          tableId
        )
      )
    ).trim();
  }

  function syncFreeTableToolbar() {
    var control =
      document.querySelector(
        '[data-pmd-cashier-table-free-toolbar="1"]'
      );

    if (!control) {
      return;
    }

    var table =
      selectedFloorTable();

    var tableId =
      canonicalTableId(table);

    var occupied =
      tableIsOccupied(table);

    var enabled =
      !!table &&
      tableId > 0 &&
      occupied;

    control.disabled =
      !enabled;

    control.setAttribute(
      'aria-disabled',
      enabled
        ? 'false'
        : 'true'
    );

    control.setAttribute(
      'data-pmd-cashier-table-free',
      enabled
        ? String(tableId)
        : '0'
    );

    var label =
      tableLabel(
        table,
        tableId
      );

    if (enabled && label) {
      control.setAttribute(
        'data-pmd-cashier-table-label',
        label
      );

      control.title =
        'Set ' +
        label +
        ' free';
    } else {
      control.removeAttribute(
        'data-pmd-cashier-table-label'
      );

      control.title =
        'Select an occupied table first';
    }
  }

  function queueToolbarSync() {
    if (
      typeof window.requestAnimationFrame ===
      'function'
    ) {
      window.requestAnimationFrame(
        syncFreeTableToolbar
      );

      return;
    }

    window.setTimeout(
      syncFreeTableToolbar,
      0
    );
  }

  /*
   * Floor owns table selection.
   *
   * We listen in capture phase only so another Floor handler
   * cannot hide the event from Cashier. The actual read happens
   * on the next frame AFTER Floor has updated selectedDisplayId.
   */
  window.addEventListener(
    'click',
    function (event) {
      var target =
        event.target &&
        typeof event.target.closest ===
          'function'
          ? event.target.closest(
              '#pmd-r2-shared-floor-canvas-v310 '
              + '[data-floor-table]'
            )
          : null;

      if (!target) {
        return;
      }

      queueToolbarSync();
    },
    true
  );

  /*
   * Floor switching clears selection.
   */
  window.addEventListener(
    'pmd:floor:changed',
    queueToolbarSync
  );

  /*
   * Explicit successful Free Table may refresh/reload.
   * If it does not, immediately resync the toolbar state.
   */
  window.addEventListener(
    'pmd:cashier-table-freed',
    queueToolbarSync
  );

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      queueToolbarSync,
      {
        once: true
      }
    );
  } else {
    queueToolbarSync();
  }

  window.PMDCashierFreeTableR60T = {
    sync:
      syncFreeTableToolbar,

    selected:
      selectedFloorTable
  };

  console.info(
    '[PMD] Cashier R60T physical Free Table selection ready'
  );
})();
/* PMD_CASHIER_R60T_FREE_TABLE_SELECTION_END */
