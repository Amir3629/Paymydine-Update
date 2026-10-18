/* PMD_FLOOR_RESERVATION_STATE_R1
 * Pure, shared, tenant-agnostic classification for Dashboard, Reservations,
 * Manager/Cashier, Quick POS, Ownerboard and standalone Floor.
 */
(function (global, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global) global.PMDFloorReservationStateR1 = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  var MAX_NOTICE_MINUTES = 120;

  function safeMinutes(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 15;
    return Math.max(0, Math.min(MAX_NOTICE_MINUTES, Math.floor(n)));
  }

  function classify(windows, dbTableId, tableNo, atMs, noticeMinutes) {
    if (!Array.isArray(windows)) return 'free';
    var id = Number(dbTableId || 0);
    var number = String(tableNo == null ? '' : tableNo).trim();
    var now = Number(atMs);
    if (!Number.isFinite(now)) return 'free';
    var leadMs = safeMinutes(noticeMinutes) * 60000;
    var upcoming = false;

    windows.forEach(function (row) {
      if (!row) return;
      var rowId = Number(row.table_id || 0);
      var rowNo = String(row.table_no == null ? '' : row.table_no).trim();
      var matches = id > 0 && rowId > 0
        ? id === rowId
        : number !== '' && rowNo !== '' && number === rowNo;
      if (!matches) return;
      var start = Number(row.start_ms || 0);
      var end = Number(row.end_ms || 0);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end <= start) return;
      if (now >= start && now < end) upcoming = 'busy';
      else if (upcoming !== 'busy' && leadMs > 0 && now < start && now >= start - leadMs) upcoming = true;
    });

    return upcoming === 'busy' ? 'busy' : upcoming ? 'upcoming' : 'free';
  }

  function effectiveStatus(baseStatus, phase) {
    var base = String(baseStatus || 'available').toLowerCase();
    if (base === 'disabled' || base === 'attention' || base === 'cleaning'
        || base === 'occupied') return base;
    if (phase === 'busy') return 'occupied';
    if (base === 'reserved') return 'reserved';
    if (base === 'available' && phase === 'upcoming') return 'reserved';
    return base;
  }

  function visualPhase(baseStatus, phase) {
    var base = String(baseStatus || 'available').toLowerCase();
    if (phase === 'busy' && (base === 'available' || base === 'reserved')) return 'busy';
    if (phase === 'upcoming' && base === 'available') return 'upcoming';
    return 'none';
  }

  function nextBoundary(windows, atMs, noticeMinutes) {
    var now = Number(atMs);
    var leadMs = safeMinutes(noticeMinutes) * 60000;
    var next = 0;
    (Array.isArray(windows) ? windows : []).forEach(function (row) {
      var start = Number(row && row.start_ms || 0);
      var end = Number(row && row.end_ms || 0);
      if (!Number.isFinite(start) || !Number.isFinite(end)
          || start < 1 || end <= start) return;
      [start - leadMs, start, end].forEach(function (time) {
        if (time <= now || !Number.isFinite(time)) return;
        if (!next || time < next) next = time;
      });
    });
    return next;
  }

  return {
    safeMinutes: safeMinutes,
    classify: classify,
    effectiveStatus: effectiveStatus,
    visualPhase: visualPhase,
    nextBoundary: nextBoundary
  };
});
