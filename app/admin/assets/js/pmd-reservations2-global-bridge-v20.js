(function (window) {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function dateKey(item) {
    var raw = item && (
      item.reserve_date ||
      item.reservation_date ||
      item.date ||
      item.start_at ||
      item.start
    );
    var match = clean(raw).match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }

  window.dateFilteredReservations = function () {
    var boot = window.PMD_RESERVATIONS2_BOOT || {};
    var items = Array.isArray(boot.reservations) ? boot.reservations.slice() : [];
    var api = window.PMDReservations2FloorExperience;
    var state = api && typeof api.getState === 'function' ? api.getState() : null;

    if (!state || state.allDates || !state.start || !state.end) {
      return items;
    }

    return items.filter(function (item) {
      var key = dateKey(item);
      return key && key >= state.start && key <= state.end;
    });
  };

  window.statusLabel = function (item) {
    var value = item && (
      item.status_name ||
      item.reservation_status ||
      item.status
    );

    if (value && typeof value === 'object') {
      value = value.status_name || value.name || value.label;
    }

    return clean(value || 'Scheduled');
  };

  window.tableIds = function (item) {
    var result = [];

    function add(value) {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach(add);
        return;
      }
      if (typeof value === 'object') {
        add(value.table_id);
        add(value.tableId);
        add(value.id);
        add(value.table_number);
        add(value.tableNumber);
        return;
      }

      (String(value).match(/\d+/g) || []).forEach(function (part) {
        var number = Number(part);
        var normalized = String(number);
        if (
          Number.isFinite(number) &&
          number > 0 &&
          result.indexOf(normalized) === -1
        ) {
          result.push(normalized);
        }
      });
    }

    if (!item || typeof item !== 'object') return result;

    [
      item.table_id,
      item.tableId,
      item.table_number,
      item.tableNumber,
      item.table,
      item.assigned_table,
      item.assignedTable,
      item.reservation_table,
      item.reservationTable,
      item.table_ids,
      item.tableIds,
      item.tables
    ].forEach(add);

    return result;
  };
})(window);
