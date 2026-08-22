(function () {
  'use strict';

  if (window.PMDCashierQuickV24Final) return;

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/cashierlab') return;

  var bootNode = document.getElementById('pmd-cashier-quick-canonical-bootstrap-v21');
  if (!bootNode) return;

  var boot = {};
  try {
    boot = JSON.parse(bootNode.textContent || '{}');
  } catch (error) {
    console.error('[PMD Cashier Quick V2.4] Canonical bootstrap parse failed', error);
    return;
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function positiveId(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function isPhone() {
    return window.matchMedia
      ? window.matchMedia('(max-width: 767px)').matches
      : window.innerWidth < 768;
  }

  function tableId(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
    return positiveId(
      row.dbTableId ||
      row.db_table_id ||
      row.table_id ||
      row.location_table_id ||
      row.id ||
      raw.table_id ||
      raw.location_table_id ||
      raw.id
    );
  }

  function openChecks(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
    return Math.max(
      0,
      number(
        row.open_orders != null
          ? row.open_orders
          : (row.openOrders != null ? row.openOrders : raw.open_orders)
      )
    );
  }

  var openByTableId = {};
  (Array.isArray(boot.tables) ? boot.tables : []).forEach(function (row) {
    var id = tableId(row);
    if (!id) return;
    openByTableId[String(id)] = openChecks(row);
  });

  function launcher() {
    return document.getElementById('pmd-cashier-quick-launcher-v21');
  }

  function occupiedCountForButton(button) {
    if (!button) return 0;
    var id = positiveId(button.getAttribute('data-cql-table'));
    return id ? Math.max(0, number(openByTableId[String(id)])) : 0;
  }

  function markOccupiedButtons() {
    var root = launcher();
    if (!root) return false;

    root.querySelectorAll('[data-cql-table]').forEach(function (button) {
      if (occupiedCountForButton(button) > 0) {
        button.setAttribute('data-pmd-r43-occupied', '1');
      } else {
        button.removeAttribute('data-pmd-r43-occupied');
      }
    });

    return true;
  }

  function markWhenReady(attempt) {
    if (markOccupiedButtons()) return;
    attempt = Number(attempt || 0);
    if (attempt >= 40) return;
    window.setTimeout(function () {
      markWhenReady(attempt + 1);
    }, 50);
  }

  function showChecksWhenReady(tableIdValue, attempt) {
    if (
      window.PMDCashierQuickV22 &&
      typeof window.PMDCashierQuickV22.showChecks === 'function'
    ) {
      window.PMDCashierQuickV22.showChecks(String(tableIdValue));
      return;
    }

    attempt = Number(attempt || 0);
    if (attempt >= 20) {
      console.error('[PMD Cashier Quick V2.4] Current Checks authority is unavailable.');
      return;
    }

    window.setTimeout(function () {
      showChecksWhenReady(tableIdValue, attempt + 1);
    }, 50);
  }

  /*
   * V2.2 correctly intercepted `.is-open`, but V2.1 gives higher-priority
   * visual states (ready/call/cleaning) to some tables that still have open
   * checks. Those tables are occupied too. Intercept only that missing edge
   * case and hand it to the existing V2.2 Current Checks authority.
   */
  document.addEventListener('click', function (event) {
    if (!isPhone()) return;

    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    var button = target && target.closest('[data-cql-table]');
    var root = launcher();

    if (!button || !root || !root.contains(button)) return;
    if (button.classList.contains('is-open')) return;
    if (occupiedCountForButton(button) < 1) return;

    var id = positiveId(button.getAttribute('data-cql-table'));
    if (!id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    showChecksWhenReady(id, 0);
  }, true);

  // V2.1 rebuilds the table buttons after floor/search interactions. Reapply
  // the canonical occupied marker after those user-driven renders only.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || !target.closest('[data-cql-floor]')) return;
    window.requestAnimationFrame(markOccupiedButtons);
  }, true);

  document.addEventListener('input', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || !target.matches('[data-cql-search]')) return;
    window.requestAnimationFrame(markOccupiedButtons);
  }, true);

  window.addEventListener('resize', function () {
    if (isPhone()) window.requestAnimationFrame(markOccupiedButtons);
  }, {passive: true});

  window.PMDCashierQuickV24Final = {
    version: '2.4.0',
    occupiedChecksFirst: true,
    noPoller: true,
    noMutationObserver: true,
    inspect: function () {
      var root = launcher();
      return {
        version: '2.4.0',
        phone: isPhone(),
        canonicalTablesWithOpenChecks: Object.keys(openByTableId).filter(function (id) {
          return openByTableId[id] > 0;
        }).length,
        markedOccupiedButtons: root
          ? root.querySelectorAll('[data-cql-table][data-pmd-r43-occupied="1"]').length
          : 0,
        currentChecksAuthorityReady: Boolean(
          window.PMDCashierQuickV22 &&
          typeof window.PMDCashierQuickV22.showChecks === 'function'
        )
      };
    }
  };

  markWhenReady(0);

  console.info(
    '[PMD] Cashier Quick V2.4 final occupied-table bridge ready',
    window.PMDCashierQuickV24Final.inspect()
  );
})();
