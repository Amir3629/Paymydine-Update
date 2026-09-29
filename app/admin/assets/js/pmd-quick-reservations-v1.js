/* PMD_QPOS_QUICK_RESERVATIONS_R136
 * POS-native Reservations workspace.
 * Right rail stays the canonical Quick POS table authority.
 * Canonical Reservation Composer stays the only create/edit authority.
 */
(function () {
  'use strict';

  if (window.PMDQuickReservationsR136) return;

  var root = document.getElementById('pmd-quick-pos');
  if (!root) return;

  var left = document.querySelector('[data-qpos-reservations-left]');
  var center = document.querySelector('[data-qpos-reservations-center]');
  var posCatalog = root.querySelector('.pmd-qpos-catalog');
  var posCart = root.querySelector('.pmd-qpos-cart');
  var list = document.querySelector('[data-qres-list]');
  var timeline = document.querySelector('[data-qres-timeline]');
  var dateInput = document.querySelector('[data-qres-date]');
  var searchInput = document.querySelector('[data-qres-search]');
  var tableFilter = document.querySelector('[data-qres-table-filter]');
  var tableFilterText = document.querySelector('[data-qres-table-filter-text]');
  var dateLabel = document.querySelector('[data-qres-date-label]');
  var clockNode = document.querySelector('[data-qres-clock]');
  var quickEditor = document.querySelector('[data-qres-quick-editor]');
  var quickForm = document.querySelector('[data-qres-quick-form]');
  var quickTitle = document.querySelector('[data-qres-quick-title]');
  var quickContext = document.querySelector('[data-qres-quick-context]');
  var quickStatus = document.querySelector('[data-qres-quick-status]');
  var quickSave = document.querySelector('[data-qres-quick-save]');
  var quickPastNote = document.querySelector('[data-qres-past-note]');
  var quickAutoLabel = document.querySelector('[data-qres-auto-label]');
  var quickChooseLabel = document.querySelector('[data-qres-choose-label]');
  var quickLaterLabel = document.querySelector('[data-qres-later-label]');
  var quickTimeWheel = null;
  var quickTimeWheelSyncing = false;
  var quickTimeWheelPublishing = false;
  var quickTimeSettleTimers = new WeakMap();
  var quickAvailabilityTimer = 0;
  var quickAvailabilityRequestId = 0;
  var otherSearchTimer = 0;

  var state = {
    workspace: root.getAttribute('data-workspace') === 'reservations'
      ? 'reservations'
      : 'pos',
    date: root.getAttribute('data-qpos-reservations-today') || '',
    today: root.getAttribute('data-qpos-reservations-today') || '',
    serverNowBerlin: '',
    openingHours: [],
    rows: [],
    otherDateRows: [],
    otherSearchTerm: '',
    searchLoading: false,
    searchRequestId: 0,
    searchController: null,
    selectedTableId: 0,
    selectedTableName: '',
    tableScope: 'all',
    search: '',
    requestId: 0,
    requestController: null,
    loading: false,
    editor: {
      open: false,
      mode: 'create',
      reservationId: 0,
      tableIds: [],
      tableNames: [],
      assignmentMode: 'auto',
      recommendedTableIds: [],
      recommendationState: 'idle',
      featuresLoaded: true,
      saving: false
    }
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function csrfToken() {
    var node = document.querySelector('meta[name="csrf-token"]');
    return node && node.content ? node.content : '';
  }

  function toast(message, error) {
    var box = document.querySelector('[data-qpos-toast]');
    if (!box) return;
    box.textContent = String(message || '');
    box.classList.toggle('is-error', !!error);
    box.classList.add('is-show');
    window.setTimeout(function () {
      box.classList.remove('is-show');
    }, 2200);
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function localClock() {
    if (!clockNode) return;
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (part) {
        if (part.type !== 'literal') map[part.type] = part.value;
      });
      clockNode.textContent = pad(map.hour || '0') + ':' + pad(map.minute || '0');
    } catch (ignore) {
      var now = new Date();
      clockNode.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    }
  }

  function berlinNowParts() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (part) {
        if (part.type !== 'literal') map[part.type] = part.value;
      });
      return {
        date: String(map.year) + '-' + pad(map.month) + '-' + pad(map.day),
        minutes: Number(map.hour || 0) * 60 + Number(map.minute || 0)
      };
    } catch (ignore) {
      var now = new Date();
      return {
        date: [
          now.getFullYear(),
          pad(now.getMonth() + 1),
          pad(now.getDate())
        ].join('-'),
        minutes: now.getHours() * 60 + now.getMinutes()
      };
    }
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(value + 'T12:00:00'));
    } catch (ignore) {
      return value;
    }
  }

  function shiftDate(value, days) {
    var date = new Date((value || state.today) + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate())
    ].join('-');
  }

  function parseMinutes(value) {
    var match = String(value || '').slice(0, 5).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    var hour = Number(match[1]);
    var minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function minuteLabel(minutes) {
    var normalized = ((Number(minutes || 0) % 1440) + 1440) % 1440;
    return pad(Math.floor(normalized / 60)) + ':' + pad(normalized % 60);
  }

  function weekdayForDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    var bits = String(value).split('-').map(Number);
    var day = new Date(Date.UTC(bits[0], bits[1] - 1, bits[2])).getUTCDay();
    return (day + 6) % 7;
  }

  function openingForDate(value) {
    if (!state.openingHours.length) {
      return {
        configured: false,
        closed: false,
        start: 8 * 60,
        end: 24 * 60
      };
    }

    var weekday = weekdayForDate(value);
    var row = state.openingHours.find(function (item) {
      return Number(item && item.weekday) === weekday;
    });

    if (!row || row.enabled === false) {
      return {
        configured: true,
        closed: true,
        start: 8 * 60,
        end: 24 * 60
      };
    }

    var start = parseMinutes(row.opening_time);
    var end = parseMinutes(row.closing_time);

    if (start === null || end === null) {
      return {
        configured: true,
        closed: true,
        start: 8 * 60,
        end: 24 * 60
      };
    }

    if (end <= start) end += 1440;

    return {
      configured: true,
      closed: false,
      start: start,
      end: end
    };
  }

  function rowName(row) {
    return String(
      row.customer_name ||
      row.guest_name ||
      ((row.first_name || '') + ' ' + (row.last_name || ''))
    ).trim() || 'Guest';
  }

  function rowNote(row) {
    return String(row.comment || row.note || '').trim();
  }

  function rowTables(row) {
    var names = Array.isArray(row.table_names)
      ? row.table_names.filter(Boolean)
      : [];
    if (names.length) return names.join(', ');
    return String(row.table_name || '').trim() || 'No table';
  }

  function rowIds(row) {
    var ids = Array.isArray(row.table_ids) ? row.table_ids : [];
    return ids.map(Number).filter(function (id, index, listIds) {
      return Number.isInteger(id) && id > 0 && listIds.indexOf(id) === index;
    });
  }

  function rowMinute(row) {
    var value = parseMinutes(row.reserve_time || row.reservation_time || '');
    return value === null ? 0 : value;
  }

  function rowIsPast(row) {
    var now = berlinNowParts();
    if (state.date < now.date) return true;
    if (state.date > now.date) return false;
    return rowMinute(row) < now.minutes;
  }

  function filteredRows() {
    var needle = state.search.toLowerCase();
    return state.rows.filter(function (row) {
      if (!needle) return true;

      var haystack = [
        rowName(row),
        rowTables(row),
        rowNote(row),
        row.telephone || '',
        row.email || '',
        row.reserve_time || '',
        row.status_name || row.status || '',
        row.reservation_id || ''
      ].join(' ').toLowerCase();

      return haystack.indexOf(needle) !== -1;
    });
  }

  function renderReservationRailAction() {
    var pickup = root.querySelector('[data-qpos-pickup]');
    if (!pickup) return;

    var wrapper = pickup.parentElement &&
      pickup.parentElement.classList &&
      pickup.parentElement.classList.contains('pmd-qres-rail-action-r131')
        ? pickup.parentElement
        : null;

    // R133: Reservations uses the same single physical card geometry as the
    // normal Pickup tile. No date, Today row, or secondary copy lives here.
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(pickup, wrapper);
      wrapper.remove();
    }

    if (state.workspace !== 'reservations') {
      pickup.classList.remove('is-qres-new-r131', 'is-qres-new-r133');
      pickup.removeAttribute('aria-label');
      pickup.innerHTML = '<strong>Pickup</strong>';
      return;
    }

    pickup.classList.remove('is-qres-new-r131');
    pickup.classList.add('is-qres-new-r133');
    pickup.setAttribute('aria-label', 'New reservation');
    pickup.innerHTML = '<strong>New</strong>';
  }

  function setRefreshing(active) {
    [left, center].forEach(function (node) {
      if (!node) return;
      node.classList.toggle('is-qres-refreshing-r131', !!active);
      node.setAttribute('aria-busy', active ? 'true' : 'false');
    });
  }

  var renderFrame = 0;
  function queueRender() {
    if (renderFrame) window.cancelAnimationFrame(renderFrame);
    renderFrame = window.requestAnimationFrame(function () {
      renderFrame = 0;
      render();
    });
  }

  function renderTableFilter() {
    var selectedMode =
      state.tableScope === 'selected' &&
      state.selectedTableId > 0;

    if (tableFilter) {
      tableFilter.classList.toggle('is-visible', selectedMode);

      if (tableFilterText) {
        tableFilterText.textContent = selectedMode
          ? 'Table ' + (state.selectedTableName || state.selectedTableId)
          : '';
      }
    }

    root.querySelectorAll('[data-qres-scope]').forEach(function (button) {
      var scope = String(button.getAttribute('data-qres-scope') || 'all');
      button.classList.toggle(
        'is-active',
        scope === (selectedMode ? 'selected' : 'all')
      );
    });

    root.querySelectorAll('[data-qpos-table]').forEach(function (button) {
      var id = Number(button.getAttribute('data-qpos-table') || 0);
      button.classList.toggle(
        'is-reservation-filter-r129',
        selectedMode && id === state.selectedTableId
      );
    });
  }

  function reservationListCard(row, includeDate) {
    var guests = Math.max(0, Number(row.guest_num || row.guests || 0));
    var date = String(row.reserve_date || row.reservation_date || '');
    return (
      '<button type="button" class="pmd-qres-list-card' +
        (includeDate ? ' is-other-date-r136' : '') +
        '" data-qres-edit="' + esc(row.reservation_id || row.id) + '">' +
        '<span class="pmd-qres-list-time">' +
          esc(String(row.reserve_time || '').slice(0, 5)) +
          (includeDate
            ? '<small class="pmd-qres-list-date-r136">' + esc(date) + '</small>'
            : '') +
        '</span>' +
        '<span class="pmd-qres-list-copy">' +
          '<strong>' + esc(rowName(row)) + '</strong>' +
          '<small>' +
            esc('P ' + guests + ' · ' + rowTables(row) + ' · ' + Math.max(1, Number(row.duration || 45)) + ' min') +
          '</small>' +
          (rowNote(row)
            ? '<em class="pmd-qres-list-note">' + esc(rowNote(row)) + '</em>'
            : '') +
        '</span>' +
      '</button>'
    );
  }

  function renderList() {
    var rows = filteredRows();
    if (!list) return;

    if (state.loading && !state.rows.length && !state.search) {
      list.innerHTML =
        '<div class="pmd-qres-list-loading">' +
          '<span></span><span></span><span></span>' +
        '</div>';
      return;
    }

    if (!state.search) {
      if (!rows.length) {
        list.innerHTML =
          '<div class="pmd-qres-empty">' +
            '<strong>No reservations</strong>' +
            '<span>' +
              (state.tableScope === 'selected' && state.selectedTableId
                ? 'Nothing booked for this table.'
                : 'Nothing matches this day.') +
            '</span>' +
          '</div>';
        return;
      }

      list.innerHTML = rows.map(function (row) {
        return reservationListCard(row, false);
      }).join('');
      return;
    }

    var html = [
      '<div class="pmd-qres-search-group-r136">',
        '<div class="pmd-qres-search-heading-r136">',
          '<strong>Selected date</strong>',
          '<span>' + esc(formatDate(state.date)) + '</span>',
        '</div>'
    ];

    if (rows.length) {
      html.push(rows.map(function (row) {
        return reservationListCard(row, false);
      }).join(''));
    } else {
      html.push(
        '<div class="pmd-qres-search-empty-r136">No matches on this date.</div>'
      );
    }
    html.push('</div>');

    if (state.search.length >= 2) {
      html.push(
        '<div class="pmd-qres-search-group-r136 is-other-r136">',
          '<div class="pmd-qres-search-heading-r136">',
            '<strong>Other dates found</strong>',
            '<span>' + (state.searchLoading ? 'Searching…' : '') + '</span>',
          '</div>'
      );

      if (state.searchLoading) {
        html.push(
          '<div class="pmd-qres-list-loading is-compact-r136">' +
            '<span></span><span></span><span></span>' +
          '</div>'
        );
      } else if (
        state.otherSearchTerm === state.search &&
        state.otherDateRows.length
      ) {
        html.push(state.otherDateRows.map(function (row) {
          return reservationListCard(row, true);
        }).join(''));
      } else {
        html.push(
          '<div class="pmd-qres-search-empty-r136">No matches on other dates.</div>'
        );
      }
      html.push('</div>');
    }

    list.innerHTML = html.join('');
  }

  function clearOtherDateSearch() {
    if (otherSearchTimer) {
      window.clearTimeout(otherSearchTimer);
      otherSearchTimer = 0;
    }
    if (
      state.searchController &&
      typeof state.searchController.abort === 'function'
    ) {
      state.searchController.abort();
    }
    state.searchController = null;
    state.searchLoading = false;
    state.otherDateRows = [];
    state.otherSearchTerm = '';
  }

  function scheduleOtherDateSearch(delay) {
    if (otherSearchTimer) {
      window.clearTimeout(otherSearchTimer);
      otherSearchTimer = 0;
    }

    if (state.search.length < 2) {
      clearOtherDateSearch();
      queueRender();
      return;
    }

    otherSearchTimer = window.setTimeout(function () {
      otherSearchTimer = 0;
      loadOtherDateSearch();
    }, typeof delay === 'number' ? delay : 180);
  }

  async function loadOtherDateSearch() {
    if (state.workspace !== 'reservations' || state.search.length < 2) {
      return false;
    }

    var needle = state.search;
    var requestId = ++state.searchRequestId;

    if (
      state.searchController &&
      typeof state.searchController.abort === 'function'
    ) {
      state.searchController.abort();
    }

    var controller = typeof AbortController === 'function'
      ? new AbortController()
      : null;
    state.searchController = controller;
    state.searchLoading = true;
    queueRender();

    var url = '/admin/pos/reservations-data?date=' +
      encodeURIComponent(state.date || state.today) +
      '&search_only=1&search=' +
      encodeURIComponent(needle);

    if (
      state.tableScope === 'selected' &&
      state.selectedTableId
    ) {
      url += '&table_id=' + encodeURIComponent(String(state.selectedTableId));
    }

    try {
      var response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken()
        }
      });

      var json = await response.json();

      if (!response.ok || !json || json.ok !== true) {
        throw new Error(
          json && json.error
            ? json.error
            : 'Reservation search could not be loaded.'
        );
      }

      if (
        requestId !== state.searchRequestId ||
        needle !== state.search
      ) {
        return false;
      }

      state.otherDateRows = Array.isArray(json.other_date_reservations)
        ? json.other_date_reservations
        : [];
      state.otherSearchTerm = needle;
      state.searchLoading = false;
      state.searchController = null;
      queueRender();
      return true;
    } catch (error) {
      if (error && error.name === 'AbortError') return false;
      if (requestId !== state.searchRequestId) return false;

      state.otherDateRows = [];
      state.otherSearchTerm = needle;
      state.searchLoading = false;
      state.searchController = null;
      queueRender();
      return false;
    }
  }

  function scheduleBounds(rows) {
    var opening = openingForDate(state.date);
    var reservationMinutes = rows.map(rowMinute);

    if (opening.closed && !reservationMinutes.length) {
      return {
        closed: true,
        start: opening.start,
        end: opening.end
      };
    }

    var start = opening.closed
      ? Math.min.apply(Math, reservationMinutes)
      : opening.start;
    var end = opening.closed
      ? Math.max.apply(Math, reservationMinutes) + 60
      : opening.end;

    if (!opening.configured && reservationMinutes.length) {
      start = Math.min(start, Math.min.apply(Math, reservationMinutes));
      end = Math.max(end, Math.max.apply(Math, reservationMinutes) + 60);
    }

    start = Math.max(0, Math.floor(start / 60) * 60);
    end = Math.min(30 * 60, Math.ceil(end / 60) * 60);

    if (end <= start) end = start + 60;

    return {
      closed: false,
      start: start,
      end: end
    };
  }

  function rowsForHour(rows, startMinute) {
    var endMinute = startMinute + 60;
    return rows.filter(function (row) {
      var minute = rowMinute(row);
      return minute >= startMinute && minute < endMinute;
    });
  }

  function bookingCard(row) {
    var id = row.reservation_id || row.id;
    var guests = Math.max(0, Number(row.guest_num || row.guests || 0));
    var duration = Math.max(1, Number(row.duration || 45));
    var time = String(row.reserve_time || '').slice(0, 5);
    var note = rowNote(row);

    return (
      '<button type="button" class="pmd-qres-booking-card" data-qres-edit="' +
        esc(id) + '">' +
        '<span class="pmd-qres-booking-cells">' +
          '<span class="pmd-qres-booking-cell is-name">' +
            '<small>Name</small><strong>' + esc(rowName(row)) + '</strong>' +
          '</span>' +
          '<span class="pmd-qres-booking-cell is-people">' +
            '<small>P</small><strong>' + esc(guests) + '</strong>' +
          '</span>' +
          '<span class="pmd-qres-booking-cell is-table">' +
            '<small>Table</small><strong>' + esc(rowTables(row)) + '</strong>' +
          '</span>' +
          '<span class="pmd-qres-booking-cell is-duration">' +
            '<small>Duration</small><strong>' + esc(duration + ' min') + '</strong>' +
          '</span>' +
          '<span class="pmd-qres-booking-cell is-time">' +
            '<small>Time</small><strong>' + esc(time) + '</strong>' +
          '</span>' +
        '</span>' +
        '<span class="pmd-qres-booking-note">' +
          '<small>Note</small>' +
          '<span>' + esc(note || '—') + '</span>' +
        '</span>' +
      '</button>'
    );
  }

  function renderTimeline() {
    if (!timeline) return;

    var rows = filteredRows();
    var bounds = scheduleBounds(rows);

    if (bounds.closed) {
      timeline.innerHTML =
        '<div class="pmd-qres-closed">' +
          '<strong>Restaurant closed</strong>' +
          '<span>No bookable hours for this day.</span>' +
        '</div>';
      return;
    }

    var now = berlinNowParts();
    var html = '<div class="pmd-qres-hour-grid' +
      (state.loading ? ' is-loading' : '') + '">';

    for (var minute = bounds.start; minute < bounds.end; minute += 60) {
      var hourRows = rowsForHour(rows, minute);
      var isCurrent =
        state.date === now.date &&
        now.minutes >= minute &&
        now.minutes < minute + 60;

      var slotTime = minuteLabel(minute);
      var cards = hourRows.length
        ? hourRows.map(bookingCard).join('')
        : '<span class="pmd-qres-hour-empty">Click to book</span>';

      html +=
        '<div class="pmd-qres-hour-row' +
          (isCurrent ? ' is-current' : '') + '">' +
          '<button type="button" class="pmd-qres-hour-label" data-qres-slot="' +
            esc(slotTime) + '">' +
            esc(slotTime) +
          '</button>' +
          '<div class="pmd-qres-hour-lane" data-qres-slot="' +
            esc(slotTime) + '" role="button" tabindex="0" aria-label="Book at ' +
            esc(slotTime) + '">' +
            cards +
          '</div>' +
        '</div>';
    }

    html += '</div>';
    timeline.innerHTML = html;
  }

  function render() {
    if (dateInput && dateInput.value !== state.date) {
      dateInput.value = state.date;
    }
    if (dateLabel) dateLabel.textContent = formatDate(state.date);

    renderReservationRailAction();
    renderTableFilter();
    renderList();
    syncQuickEditorDateState();
    if (!state.editor.open) renderTimeline();
  }

  function installScheduleBridge() {
    if (
      window.PMDReservationsScheduleV1 &&
      window.PMDReservationsScheduleV1.version !== 'qpos-r132'
    ) {
      return;
    }

    window.PMDReservationsScheduleV1 = {
      version: 'qpos-r132',
      getOpeningHours: function () {
        return state.openingHours.slice();
      },
      audit: function () {
        return {
          openingHoursConfigured: state.openingHours.length > 0,
          openingHours: state.openingHours.slice(),
          today: state.today,
          date: state.date
        };
      }
    };
  }

  async function loadReservations(force) {
    if (state.workspace !== 'reservations') return false;

    var requestId = ++state.requestId;
    state.loading = true;
    setRefreshing(true);

    if (state.requestController && typeof state.requestController.abort === 'function') {
      state.requestController.abort();
    }

    var controller = typeof AbortController === 'function'
      ? new AbortController()
      : null;
    state.requestController = controller;

    var url = '/admin/pos/reservations-data?date=' +
      encodeURIComponent(state.date || state.today);

    if (
      state.tableScope === 'selected' &&
      state.selectedTableId
    ) {
      url += '&table_id=' + encodeURIComponent(String(state.selectedTableId));
    }

    url += '&_=' + Date.now();

    try {
      var response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken()
        }
      });

      var json = await response.json();

      if (!response.ok || !json || json.ok !== true) {
        throw new Error(
          json && json.error
            ? json.error
            : 'Reservations could not be loaded.'
        );
      }

      if (requestId !== state.requestId) return false;

      state.today = String(json.today || state.today || '');
      state.date = String(json.date || state.date || state.today);
      state.serverNowBerlin = String(json.server_now_berlin || '');
      state.openingHours = Array.isArray(json.opening_hours)
        ? json.opening_hours.slice()
        : [];
      state.rows = Array.isArray(json.reservations)
        ? json.reservations
        : [];
      state.loading = false;
      state.requestController = null;

      window.PMD_RESERVATIONS_BOOT = Object.assign(
        {},
        window.PMD_RESERVATIONS_BOOT || {},
        {
          today: state.today,
          server_now_berlin: state.serverNowBerlin,
          opening_hours: state.openingHours.slice(),
          reservations: state.rows.slice()
        }
      );

      installScheduleBridge();
      render();
      setRefreshing(false);
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
      return true;
    } catch (error) {
      if (error && error.name === 'AbortError') return false;
      if (requestId !== state.requestId) return false;

      state.loading = false;
      state.requestController = null;
      setRefreshing(false);

      if (!state.rows.length) {
        var message = esc(
          error && error.message
            ? error.message
            : 'Reservations could not be loaded.'
        );
        if (list) {
          list.innerHTML = '<div class="pmd-qres-error">' + message + '</div>';
        }
        if (timeline) {
          timeline.innerHTML = '<div class="pmd-qres-error">' + message + '</div>';
        }
      }

      toast(
        error && error.message
          ? error.message
          : 'Reservations could not be loaded.',
        true
      );

      return false;
    }
  }

  function setWorkspace(next, updateUrl) {
    next = next === 'reservations' ? 'reservations' : 'pos';
    state.workspace = next;
    root.setAttribute('data-workspace', next);

    if (left) left.hidden = next !== 'reservations';
    if (center) center.hidden = next !== 'reservations';
    if (posCatalog) posCatalog.hidden = next === 'reservations';
    if (posCart) posCart.hidden = next === 'reservations';

    root.querySelectorAll('[data-qpos-workspace-switch]').forEach(function (button) {
      button.hidden = button.getAttribute('data-qpos-workspace-switch') === next;
    });

    var profileMenu = root.querySelector('[data-qpos-profile-menu]');
    var profileToggle = root.querySelector('[data-qpos-profile-toggle]');

    if (profileMenu) profileMenu.hidden = true;
    if (profileToggle) profileToggle.setAttribute('aria-expanded', 'false');

    if (updateUrl && window.history && window.history.replaceState) {
      var nextUrl = new URL(window.location.href);
      if (next === 'reservations') {
        nextUrl.searchParams.set('workspace', 'reservations');
      } else {
        nextUrl.searchParams.delete('workspace');
      }
      window.history.replaceState(
        window.history.state,
        '',
        nextUrl.pathname + nextUrl.search + nextUrl.hash
      );
    }

    if (next === 'reservations') {
      renderReservationRailAction();
      loadReservations();
    } else {
      closeQuickEditor();
      clearOtherDateSearch();
      renderReservationRailAction();
    }
  }

  function currentFloorMeta() {
    var active = root.querySelector('[data-qpos-floor].is-active');
    return {
      id: active
        ? String(active.getAttribute('data-qpos-floor') || '')
        : '',
      name: active
        ? String(active.textContent || '').trim()
        : ''
    };
  }

  function rowById(id) {
    id = Number(id || 0);
    return state.rows.concat(state.otherDateRows || []).find(function (row) {
      return Number(row.reservation_id || row.id || 0) === id;
    }) || null;
  }

  function canonicalRequest(handler, data) {
    return fetch('/admin/reservations', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken(),
        'X-IGNITER-REQUEST-HANDLER': handler
      },
      body: JSON.stringify(data || {})
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.success === false) {
          var message = json && json.error && json.error.message
            ? json.error.message
            : 'Reservation could not be saved.';
          var error = new Error(message);
          error.response = json;
          error.status = response.status;
          throw error;
        }
        return json;
      });
    });
  }

  function defaultQuickTime() {
    var opening = openingForDate(state.date);
    var now = berlinNowParts();
    var start = opening.closed ? 8 * 60 : opening.start;
    var end = opening.closed ? 24 * 60 : opening.end;
    var minute = start;

    if (state.date === now.date) {
      minute = Math.ceil(now.minutes / 15) * 15;
      minute = Math.max(minute, start);
    }

    if (minute + 45 > end) {
      minute = Math.max(start, end - 45);
      minute = Math.floor(minute / 15) * 15;
    }

    return minuteLabel(minute);
  }

  function quickTimeValuesRepeated(values, count) {
    var rows = [];
    for (var cycle = 0; cycle < count; cycle += 1) {
      values.forEach(function (value) { rows.push(value); });
    }
    return rows;
  }

  function quickTimeParse12(value) {
    var minutes = parseMinutes(value);
    if (minutes === null) {
      return { hour: 12, minute: 0, period: 'AM' };
    }
    var hour24 = Math.floor(minutes / 60);
    return {
      hour: hour24 % 12 || 12,
      minute: minutes % 60,
      period: hour24 >= 12 ? 'PM' : 'AM'
    };
  }

  function quickTimeNative(hour, minute, period) {
    var hour24 = Number(hour) % 12;
    if (period === 'PM') hour24 += 12;
    return pad(hour24) + ':' + pad(Number(minute || 0));
  }

  function quickTimeAllSlots() {
    var slots = [];
    for (var minute = 0; minute < 1440; minute += 15) {
      slots.push(minuteLabel(minute));
    }
    return slots;
  }

  function quickTimeAllowedSlots() {
    if (state.editor.mode === 'edit') return quickTimeAllSlots();

    var date = String((quickField('reserve_date') || {}).value || state.date || '');
    var duration = Math.max(
      30,
      Math.min(180, Number((quickField('duration') || {}).value || 45))
    );
    var opening = openingForDate(date);

    if (opening.closed) return [];
    if (!opening.configured) return quickTimeAllSlots();

    var start = Math.ceil(Number(opening.start || 0) / 15) * 15;
    var lastStart = Number(opening.end || 0) - duration;
    var slots = [];

    for (var minute = start; minute <= lastStart; minute += 15) {
      if (minute >= 0 && minute < 1440) slots.push(minuteLabel(minute));
    }

    return slots;
  }

  function quickTimeNearestSlot(value, slots) {
    if (!slots || !slots.length) return '';
    var target = parseMinutes(value);
    if (target === null) return slots[0];

    var best = slots[0];
    var distance = Infinity;

    slots.forEach(function (slot) {
      var minute = parseMinutes(slot);
      if (minute === null) return;
      var nextDistance = Math.abs(minute - target);
      if (nextDistance < distance) {
        distance = nextDistance;
        best = slot;
      }
    });

    return best;
  }

  function quickTimeColumn(name, values, formatter, label) {
    var column = document.createElement('div');
    column.className = 'pmd-jade-wheel-v221__column is-' + name;
    column.dataset.pmdWheelKind = name;
    column.tabIndex = 0;
    column.setAttribute('role', 'listbox');
    column.setAttribute('aria-label', label);

    quickTimeValuesRepeated(values, 9).forEach(function (value) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'pmd-jade-wheel-v221__item';
      item.dataset.value = String(value);
      item.textContent = formatter(value);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      column.appendChild(item);
    });

    return column;
  }

  function quickTimeItems(column) {
    return column
      ? Array.prototype.slice.call(
          column.querySelectorAll('.pmd-jade-wheel-v221__item')
        )
      : [];
  }

  function quickTimeActiveItem(column) {
    return column && column.querySelector('.pmd-jade-wheel-v221__item.is-selected');
  }

  function quickTimeSetSelected(column, selected) {
    quickTimeItems(column).forEach(function (item) {
      var active = item === selected;
      item.classList.toggle('is-selected', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function quickTimeMiddleItem(column, value) {
    var matches = quickTimeItems(column).filter(function (item) {
      return item.dataset.value === String(value) && !item.disabled;
    });
    return matches[Math.floor(matches.length / 2)] || null;
  }

  function quickTimeCenter(column, item, smooth) {
    if (!column || !item) return;
    var top = item.offsetTop - (column.clientHeight - item.offsetHeight) / 2;
    column.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function quickTimeClosestItem(column) {
    if (!column) return null;
    var rect = column.getBoundingClientRect();
    var center = rect.top + rect.height / 2;
    var selected = null;
    var bestDistance = Infinity;

    quickTimeItems(column).forEach(function (item) {
      if (item.disabled) return;
      var itemRect = item.getBoundingClientRect();
      var distance = Math.abs(
        itemRect.top + itemRect.height / 2 - center
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        selected = item;
      }
    });

    return selected;
  }

  function quickTimeValue(column) {
    var item = quickTimeActiveItem(column);
    return item ? item.dataset.value : '';
  }

  function quickTimeAvailability(slots) {
    var availability = {
      periods: Object.create(null),
      hours: Object.create(null),
      minutes: Object.create(null)
    };

    (slots || []).forEach(function (slot) {
      var parsed = quickTimeParse12(slot);
      availability.periods[parsed.period] = true;
      availability.hours[String(parsed.hour)] = true;
      availability.minutes[String(parsed.minute)] = true;
    });

    return availability;
  }

  function quickTimeDisableByValue(column, predicate) {
    quickTimeItems(column).forEach(function (item) {
      var disabled = !!predicate(item.dataset.value);
      item.disabled = disabled;
      item.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (disabled && item.classList.contains('is-selected')) {
        item.classList.remove('is-selected');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }

  function quickTimeSetEmpty(active) {
    if (!quickTimeWheel) return;
    quickTimeWheel.container.classList.toggle('is-no-available-time', !!active);
    var highlight = quickTimeWheel.container.querySelector(
      '.pmd-jade-wheel-v221__highlight'
    );
    if (highlight) {
      highlight.setAttribute(
        'data-pmd-no-time-label',
        'No reservation time available'
      );
    }
  }

  function syncQuickTimeWheelFromNative(smooth) {
    if (!quickTimeWheel || quickTimeWheelPublishing) return;

    var field = quickField('reserve_time');
    if (!field) return;

    var parsed = quickTimeParse12(field.value);
    quickTimeWheelSyncing = true;

    [
      [quickTimeWheel.hour, parsed.hour],
      [quickTimeWheel.minute, parsed.minute],
      [quickTimeWheel.period, parsed.period]
    ].forEach(function (entry) {
      var item = quickTimeMiddleItem(entry[0], entry[1]);
      if (!item) return;
      quickTimeSetSelected(entry[0], item);
      quickTimeCenter(entry[0], item, !!smooth);
    });

    window.requestAnimationFrame(function () {
      quickTimeWheelSyncing = false;
    });
  }

  function refreshQuickTimeWheelAvailability() {
    if (!quickTimeWheel) return;

    var field = quickField('reserve_time');
    var slots = quickTimeAllowedSlots();

    if (!slots.length) {
      [
        quickTimeWheel.hour,
        quickTimeWheel.minute,
        quickTimeWheel.period
      ].forEach(function (column) {
        quickTimeDisableByValue(column, function () { return true; });
      });
      if (field) field.value = '';
      quickTimeSetEmpty(true);
      return;
    }

    quickTimeSetEmpty(false);
    var availability = quickTimeAvailability(slots);

    quickTimeDisableByValue(quickTimeWheel.period, function (value) {
      return !availability.periods[String(value)];
    });
    quickTimeDisableByValue(quickTimeWheel.hour, function (value) {
      return !availability.hours[String(Number(value))];
    });
    quickTimeDisableByValue(quickTimeWheel.minute, function (value) {
      return !availability.minutes[String(Number(value))];
    });

    if (field) {
      var current = String(field.value || '').slice(0, 5);
      if (slots.indexOf(current) < 0) {
        field.value = quickTimeNearestSlot(current, slots);
      }
    }

    syncQuickTimeWheelFromNative(false);
  }

  function publishQuickTimeWheel(changedColumn) {
    if (
      !quickTimeWheel ||
      quickTimeWheelSyncing ||
      quickTimeWheelPublishing
    ) {
      return;
    }

    var field = quickField('reserve_time');
    if (!field) return;

    var hour = Number(quickTimeValue(quickTimeWheel.hour));
    var minute = Number(quickTimeValue(quickTimeWheel.minute));
    var period = quickTimeValue(quickTimeWheel.period);

    if (!hour || Number.isNaN(minute) || !period) return;

    var raw = quickTimeNative(hour, minute, period);
    var slots = quickTimeAllowedSlots();
    var resolved =
      slots.indexOf(raw) >= 0
        ? raw
        : quickTimeNearestSlot(raw, slots);

    if (!resolved) return;

    quickTimeWheelPublishing = true;
    field.value = resolved;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));

    window.requestAnimationFrame(function () {
      quickTimeWheelPublishing = false;
      if (resolved !== raw) syncQuickTimeWheelFromNative(true);
    });
  }

  function settleQuickTimeColumn(column) {
    var selected = quickTimeClosestItem(column);
    if (!selected) return;
    quickTimeSetSelected(column, selected);
    quickTimeCenter(column, selected, false);
    publishQuickTimeWheel(column);
  }

  function bindQuickTimeColumn(column) {
    function clearTimer() {
      var timer = quickTimeSettleTimers.get(column);
      if (timer) window.clearTimeout(timer);
      quickTimeSettleTimers.delete(column);
    }

    function settleAfterScroll() {
      clearTimer();
      settleQuickTimeColumn(column);
    }

    if ('onscrollend' in column) {
      column.addEventListener('scrollend', settleAfterScroll, { passive: true });
    }

    column.addEventListener('scroll', function () {
      if ('onscrollend' in column) return;
      clearTimer();
      quickTimeSettleTimers.set(
        column,
        window.setTimeout(settleAfterScroll, 90)
      );
    }, { passive: true });

    column.addEventListener('click', function (event) {
      var item = event.target.closest('.pmd-jade-wheel-v221__item');
      if (!item || !column.contains(item) || item.disabled) return;
      clearTimer();
      quickTimeSetSelected(column, item);
      quickTimeCenter(column, item, true);
      publishQuickTimeWheel(column);
    });

    column.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();

      var rows = quickTimeItems(column).filter(function (item) {
        return !item.disabled;
      });
      if (!rows.length) return;

      var current = quickTimeActiveItem(column) || quickTimeClosestItem(column);
      var index = Math.max(0, rows.indexOf(current));
      index += event.key === 'ArrowDown' ? 1 : -1;
      index = Math.max(0, Math.min(rows.length - 1, index));

      var selected = rows[index];
      quickTimeSetSelected(column, selected);
      quickTimeCenter(column, selected, true);
      publishQuickTimeWheel(column);
    });
  }

  function ensureQuickTimeWheel() {
    if (quickTimeWheel) return quickTimeWheel;

    var field = quickField('reserve_time');
    if (!field) return null;

    var label = field.closest('.pmd-qres-composer-field-r132');
    if (!label) return null;

    label.classList.add('pmd-jade-time-field-v221');
    field.classList.add('pmd-jade-native-time-v221');
    field.tabIndex = -1;
    field.setAttribute('aria-hidden', 'true');

    var container = document.createElement('div');
    container.className = 'pmd-jade-wheel-v221 pmd-qres-time-wheel-r134';

    var hour = quickTimeColumn(
      'hour',
      [1,2,3,4,5,6,7,8,9,10,11,12],
      function (value) { return pad(value); },
      'Hour'
    );
    var minute = quickTimeColumn(
      'minute',
      [0,15,30,45],
      function (value) { return pad(value); },
      'Minute'
    );
    var period = quickTimeColumn(
      'period',
      ['AM','PM'],
      function (value) { return value; },
      'AM or PM'
    );

    var separator = document.createElement('span');
    separator.className = 'pmd-jade-wheel-v221__separator';
    separator.textContent = ':';
    separator.setAttribute('aria-hidden', 'true');

    var highlight = document.createElement('div');
    highlight.className = 'pmd-jade-wheel-v221__highlight';
    highlight.setAttribute('aria-hidden', 'true');

    container.appendChild(hour);
    container.appendChild(separator);
    container.appendChild(minute);
    container.appendChild(period);
    container.appendChild(highlight);
    label.appendChild(container);

    quickTimeWheel = {
      container: container,
      hour: hour,
      minute: minute,
      period: period
    };

    bindQuickTimeColumn(hour);
    bindQuickTimeColumn(minute);
    bindQuickTimeColumn(period);

    field.addEventListener('input', function () {
      if (!quickTimeWheelPublishing) syncQuickTimeWheelFromNative(false);
    });
    field.addEventListener('change', function () {
      if (!quickTimeWheelPublishing) syncQuickTimeWheelFromNative(false);
    });

    return quickTimeWheel;
  }

  function quickField(name) {
    return quickForm && quickForm.elements ? quickForm.elements[name] : null;
  }

  function setQuickStatus(message, error) {
    if (!quickStatus) return;
    quickStatus.textContent = String(message || '');
    quickStatus.classList.toggle('is-error', !!error);
  }

  function quickFeatureInputs() {
    return quickForm
      ? Array.prototype.slice.call(
          quickForm.querySelectorAll('input[name="pmd_table_features[]"]')
        )
      : [];
  }

  function setQuickFeatureValues(values, enabled) {
    var selected = {};
    (Array.isArray(values) ? values : []).forEach(function (value) {
      value = String(value || '').trim();
      if (value) selected[value] = true;
    });

    quickFeatureInputs().forEach(function (input) {
      input.checked = !!selected[String(input.value || '')];
      input.disabled = enabled === false;
    });
  }

  function hydrateQuickEditFeatures(reservationId) {
    var id = Number(reservationId || 0);

    if (!id) {
      state.editor.featuresLoaded = true;
      setQuickFeatureValues([], true);
      return;
    }

    state.editor.featuresLoaded = false;
    setQuickFeatureValues([], false);

    canonicalRequest('onLoadReservationComposer', {
      reservation_id: id,
      source: 'quick-pos-reservations-r136'
    })
      .then(function (response) {
        if (
          !state.editor.open
          || Number(state.editor.reservationId || 0) !== id
        ) {
          return;
        }

        var values =
          response && response.reservation
            ? response.reservation
            : (response && response.defaults ? response.defaults : {});

        setQuickFeatureValues(
          Array.isArray(values.pmd_table_features)
            ? values.pmd_table_features
            : [],
          true
        );
        state.editor.featuresLoaded = true;
        syncQuickEditorDateState();
      })
      .catch(function () {
        if (
          !state.editor.open
          || Number(state.editor.reservationId || 0) !== id
        ) {
          return;
        }

        state.editor.featuresLoaded = false;
        setQuickFeatureValues([], false);
        syncQuickEditorDateState();
        setQuickStatus(
          'Table preferences could not be loaded. Existing preferences will be preserved.',
          false
        );
      });
  }

  function isPastSelectedDate() {
    var editorDate = state.editor.open && quickField('reserve_date')
      ? String(quickField('reserve_date').value || '')
      : '';

    return Boolean(
      state.today &&
      (
        (state.date && state.date < state.today) ||
        (/^\d{4}-\d{2}-\d{2}$/.test(editorDate) && editorDate < state.today)
      )
    );
  }

  function syncQuickEditorDateState() {
    if (!quickEditor || !quickForm || !state.editor.open) {
      if (quickPastNote) quickPastNote.hidden = true;
      return;
    }

    var past = isPastSelectedDate();
    quickEditor.classList.toggle('is-past-date-r136', past);
    if (quickPastNote) quickPastNote.hidden = !past;

    Array.prototype.forEach.call(quickForm.elements, function (field) {
      if (!field || !field.tagName) return;
      if (field.matches && field.matches('[data-qres-quick-cancel]')) return;

      if (past) {
        if (!field.dataset.qresPastCapturedR136) {
          field.dataset.qresPastCapturedR136 = '1';
          field.dataset.qresPastDisabledR136 = field.disabled ? '1' : '0';
        }
        field.disabled = true;
      } else if (field.dataset.qresPastCapturedR136) {
        field.disabled = field.dataset.qresPastDisabledR136 === '1';
        delete field.dataset.qresPastCapturedR136;
        delete field.dataset.qresPastDisabledR136;
      }
    });

    if (quickSave) {
      quickSave.disabled = past || state.editor.saving;
    }
  }

  function tableLabelFromName(name) {
    name = String(name || '').trim();
    if (!name) return '';
    return /^table\b/i.test(name) ? name : ('Table ' + name);
  }

  function tableNamesForIds(ids) {
    return (Array.isArray(ids) ? ids : []).map(function (id) {
      var button = root.querySelector(
        '[data-qpos-table="' + String(Number(id || 0)) + '"]'
      );
      var name = button
        ? String((button.querySelector('strong') || {}).textContent || '').trim()
        : '';
      return tableLabelFromName(name || id);
    }).filter(Boolean);
  }

  function quickAssignmentMode() {
    if (state.editor.tableIds.length) return 'choose';
    return state.editor.assignmentMode === 'later'
      ? 'later'
      : (state.editor.assignmentMode === 'choose' ? 'choose' : 'auto');
  }

  function availabilityFromResponse(response) {
    if (response && response.availability) return response.availability;
    if (response && response.data && response.data.availability) {
      return response.data.availability;
    }
    if (response && response.result && response.result.availability) {
      return response.result.availability;
    }
    return null;
  }

  function syncQuickAssignmentLabels(mode) {
    var selectedNames = state.editor.tableNames.length
      ? state.editor.tableNames.map(tableLabelFromName).filter(Boolean)
      : tableNamesForIds(state.editor.tableIds);

    if (quickChooseLabel) {
      quickChooseLabel.textContent =
        mode === 'choose' && selectedNames.length
          ? selectedNames.join(' + ')
          : 'Choose table(s)';
    }

    if (quickLaterLabel) {
      quickLaterLabel.textContent = 'Assign later';
    }

    if (quickAutoLabel) {
      if (mode !== 'auto') {
        quickAutoLabel.textContent = 'Automatic table';
      } else if (
        state.editor.recommendationState === 'ready' &&
        state.editor.recommendedTableIds.length
      ) {
        quickAutoLabel.textContent = tableNamesForIds(
          state.editor.recommendedTableIds
        ).join(' + ');
      } else if (state.editor.recommendationState === 'empty') {
        quickAutoLabel.textContent = 'No fit table';
      } else if (state.editor.recommendationState === 'error') {
        quickAutoLabel.textContent = 'Check tables';
      } else {
        quickAutoLabel.textContent = 'Finding table…';
      }
    }

    quickForm.querySelectorAll('input[name="assignment_mode"]').forEach(function (radio) {
      radio.checked = radio.value === mode;
    });
  }

  function scheduleQuickRecommendation(delay) {
    if (quickAvailabilityTimer) {
      window.clearTimeout(quickAvailabilityTimer);
      quickAvailabilityTimer = 0;
    }

    if (
      !state.editor.open ||
      quickAssignmentMode() !== 'auto' ||
      isPastSelectedDate()
    ) {
      return;
    }

    state.editor.recommendationState = 'loading';
    state.editor.recommendedTableIds = [];
    syncQuickTableUI();

    quickAvailabilityTimer = window.setTimeout(function () {
      quickAvailabilityTimer = 0;
      refreshQuickRecommendation();
    }, typeof delay === 'number' ? delay : 140);
  }

  function refreshQuickRecommendation() {
    if (
      !state.editor.open ||
      quickAssignmentMode() !== 'auto' ||
      isPastSelectedDate()
    ) {
      return;
    }

    var data = quickPayload();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.reserve_date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.reserve_time) ||
      data.guest_num < 1 ||
      data.duration < 1
    ) {
      state.editor.recommendationState = 'empty';
      state.editor.recommendedTableIds = [];
      syncQuickTableUI();
      return;
    }

    var floor = currentFloorMeta();
    data.assignment_mode = 'auto';
    data.tables = [];
    data.pmd_floor_locked = floor.id ? 1 : 0;
    data.pmd_floor_id = floor.id || '';
    data.pmd_floor_name = floor.name || '';

    var requestId = ++quickAvailabilityRequestId;

    canonicalRequest('onCheckReservationAvailability', data)
      .then(function (response) {
        if (
          requestId !== quickAvailabilityRequestId ||
          !state.editor.open ||
          quickAssignmentMode() !== 'auto'
        ) {
          return;
        }

        var availability = availabilityFromResponse(response) || {};
        var ids = Array.isArray(availability.recommendedTableIds)
          ? availability.recommendedTableIds
              .map(function (id) { return Number(id || 0); })
              .filter(function (id) { return id > 0; })
          : [];

        state.editor.recommendedTableIds = ids;
        state.editor.recommendationState = ids.length ? 'ready' : 'empty';
        syncQuickTableUI();
      })
      .catch(function () {
        if (requestId !== quickAvailabilityRequestId) return;
        state.editor.recommendedTableIds = [];
        state.editor.recommendationState = 'error';
        syncQuickTableUI();
      });
  }

  function syncQuickTableUI() {
    var ids = state.editor.tableIds.slice();
    var assignment = quickField('assignment_mode');
    var mode = quickAssignmentMode();

    if (assignment) assignment.value = mode;
    syncQuickAssignmentLabels(mode);

    root.querySelectorAll('[data-qpos-table]').forEach(function (button) {
      var id = Number(button.getAttribute('data-qpos-table') || 0);
      button.classList.toggle(
        'is-reservation-editor-table-r132',
        ids.indexOf(id) >= 0
      );
    });
  }

  function closeQuickEditor() {
    state.editor.open = false;
    state.editor.mode = 'create';
    state.editor.reservationId = 0;
    state.editor.tableIds = [];
    state.editor.tableNames = [];
    state.editor.assignmentMode = 'auto';
    state.editor.recommendedTableIds = [];
    state.editor.recommendationState = 'idle';
    state.editor.featuresLoaded = true;
    state.editor.saving = false;

    if (quickEditor) {
      quickEditor.hidden = true;
      quickEditor.setAttribute('aria-hidden', 'true');
    }
    if (center) center.classList.remove('is-editor-open-r132');
    if (quickSave) quickSave.disabled = false;
    setQuickStatus('', false);
    syncQuickTableUI();
  }

  function openQuickEditor(reservationId, selectedTime) {
    if (!quickEditor || !quickForm) return;

    var id = Number(reservationId || 0);
    var row = id ? rowById(id) : null;
    var floor = currentFloorMeta();

    state.editor.open = true;
    state.editor.mode = id ? 'edit' : 'create';
    state.editor.reservationId = id;
    state.editor.tableIds = row
      ? rowIds(row)
      : (
          state.tableScope === 'selected' && state.selectedTableId
            ? [state.selectedTableId]
            : []
        );
    state.editor.tableNames = row
      ? (Array.isArray(row.table_names) && row.table_names.length
          ? row.table_names.slice()
          : (row.table_name ? [String(row.table_name)] : []))
      : (
          state.tableScope === 'selected' && state.selectedTableName
            ? [state.selectedTableName]
            : []
        );
    state.editor.assignmentMode = state.editor.tableIds.length
      ? 'choose'
      : (id ? 'later' : 'auto');
    state.editor.recommendedTableIds = [];
    state.editor.recommendationState =
      state.editor.assignmentMode === 'auto' ? 'loading' : 'idle';

    quickForm.reset();
    state.editor.featuresLoaded = !id;
    setQuickFeatureValues([], !id);
    if (quickField('first_name')) quickField('first_name').value = row ? rowName(row) : '';
    if (quickField('last_name')) quickField('last_name').value = '';
    if (quickField('reserve_date')) quickField('reserve_date').value = row ? String(row.reserve_date || state.date) : state.date;
    if (quickField('reserve_time')) quickField('reserve_time').value = row
      ? String(row.reserve_time || '').slice(0, 5)
      : (selectedTime || defaultQuickTime());
    if (quickField('guest_num')) quickField('guest_num').value = String(row ? Math.max(1, Number(row.guest_num || row.guests || 1)) : 1);
    if (quickField('duration')) quickField('duration').value = String(row ? Math.max(1, Number(row.duration || 45)) : 45);
    if (quickField('telephone')) quickField('telephone').value = row ? String(row.telephone || '') : '';
    if (quickField('email')) quickField('email').value = row ? String(row.email || '') : '';
    if (quickField('comment')) quickField('comment').value = row ? rowNote(row) : '';
    if (quickField('reservation_id')) quickField('reservation_id').value = id ? String(id) : '';
    if (quickField('source')) quickField('source').value = 'quick-pos-reservations-r136';
    if (quickField('pmd_floor_id')) quickField('pmd_floor_id').value = floor.id || '';
    if (quickField('pmd_floor_name')) quickField('pmd_floor_name').value = floor.name || '';
    if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = state.editor.tableIds.length ? '1' : '0';

    if (quickTitle) quickTitle.textContent = id ? 'Edit reservation' : 'New reservation';
    if (quickContext) quickContext.textContent = id
      ? ('#' + id + ' · ' + formatDate(String(row && row.reserve_date || state.date)) + ' · ' + String(row && row.reserve_time || '').slice(0, 5))
      : (
          formatDate(state.date)
          + (selectedTime ? ' · ' + selectedTime : '')
          + (
              state.tableScope === 'selected' && state.selectedTableName
                ? ' · Table ' + state.selectedTableName
                : ''
            )
        );

    if (center) center.classList.add('is-editor-open-r132');
    quickEditor.hidden = false;
    quickEditor.setAttribute('aria-hidden', 'false');
    setQuickStatus(
      state.editor.tableIds.length
        ? ('Assigned to ' + state.editor.tableNames.map(tableLabelFromName).join(' + ') + '.')
        : 'Complete the reservation details.',
      false
    );
    syncQuickTableUI();
    hydrateQuickEditFeatures(id);
    ensureQuickTimeWheel();
    syncQuickEditorDateState();

    if (state.editor.assignmentMode === 'auto') {
      scheduleQuickRecommendation(0);
    }

    window.requestAnimationFrame(function () {
      refreshQuickTimeWheelAvailability();
      syncQuickTimeWheelFromNative(false);
      var name = quickField('first_name');
      if (name && !isPastSelectedDate()) name.focus();
    });
  }

  function quickLocationId() {
    var config = window.PMDQuickPOSConfig || {};
    var bootstrap = config.initialBootstrap || {};
    return Math.max(0, Number(bootstrap.location_id || 0));
  }

  function quickPayload() {
    var floor = currentFloorMeta();
    var ids = state.editor.tableIds.slice();
    var featureValues = quickFeatureInputs()
      .filter(function (input) { return input.checked && !input.disabled; })
      .map(function (input) { return String(input.value || '').trim(); })
      .filter(Boolean);

    var payload = {
      reservation_id: state.editor.reservationId || null,
      first_name: String((quickField('first_name') || {}).value || '').trim(),
      last_name: '',
      telephone: String((quickField('telephone') || {}).value || '').trim(),
      email: String((quickField('email') || {}).value || '').trim(),
      guest_num: Math.min(99, Math.max(0, Number((quickField('guest_num') || {}).value || 0))),
      reserve_date: String((quickField('reserve_date') || {}).value || ''),
      reserve_time: String((quickField('reserve_time') || {}).value || '').slice(0, 5),
      duration: Math.min(180, Math.max(30, Math.round(Number((quickField('duration') || {}).value || 45) / 15) * 15)),
      comment: String((quickField('comment') || {}).value || '').trim(),
      assignment_mode: quickAssignmentMode(),
      tables: ids,
      occasion_id: 0,
      notify: 0,
      source: 'quick-pos-reservations-r136',
      location_id: quickLocationId() || null,
      pmd_floor_id: floor.id || '',
      pmd_floor_name: floor.name || '',
      pmd_floor_locked: ids.length || (
        state.editor.assignmentMode === 'auto' && floor.id
      ) ? 1 : 0
    };

    if (
      state.editor.mode !== 'edit'
      || state.editor.featuresLoaded
    ) {
      payload.pmd_table_features = featureValues;
    }

    return payload;
  }

  function validateQuickPayload(data) {
    if (!data.first_name) return 'Add the guest name.';
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(data.reserve_date)) return 'Choose a reservation date.';
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(data.reserve_time)) return 'Choose a reservation time.';
    if (data.guest_num < 1) return 'People must be at least 1.';
    if (data.duration < 1) return 'Choose a duration.';
    if (data.assignment_mode === 'choose' && !data.tables.length) {
      return 'Select a table from the right.';
    }
    return '';
  }

  function saveQuickReservation(event) {
    if (event) event.preventDefault();
    if (!quickForm || state.editor.saving) return;

    if (isPastSelectedDate()) {
      syncQuickEditorDateState();
      setQuickStatus('Past dates are read-only.', true);
      return;
    }

    var data = quickPayload();
    var problem = validateQuickPayload(data);
    if (problem) {
      setQuickStatus(problem, true);
      return;
    }

    state.editor.saving = true;
    if (quickSave) quickSave.disabled = true;
    setQuickStatus('Saving…', false);

    canonicalRequest('onSaveReservationComposer', data)
      .then(function () {
        if (/^\d{4}-\d{2}-\d{2}$/.test(data.reserve_date)) {
          state.date = data.reserve_date;
        }
        closeQuickEditor();
        return loadReservations(true);
      })
      .then(function () {
        toast('Reservation saved.');
      })
      .catch(function (error) {
        state.editor.saving = false;
        if (quickSave) quickSave.disabled = false;
        setQuickStatus(error && error.message ? error.message : 'Reservation could not be saved.', true);
      });
  }

  function selectReservationTable(button) {
    var id = Number(button.getAttribute('data-qpos-table') || 0);
    if (!id || button.disabled) return;

    var name = String(
      (button.querySelector('strong') || {}).textContent || id
    ).trim();

    // R135: a table click always scopes the left reservation list to that
    // table for the active date. If no editor is open, the middle workspace
    // immediately becomes a New reservation already assigned to this table.
    state.selectedTableId = id;
    state.selectedTableName = name;
    state.tableScope = 'selected';
    renderTableFilter();
    loadReservations(true);
    if (state.search.length >= 2) scheduleOtherDateSearch(0);

    if (state.editor.open && isPastSelectedDate()) {
      syncQuickEditorDateState();
      return;
    }

    if (state.editor.open) {
      state.editor.tableIds = [id];
      state.editor.tableNames = [name];
      state.editor.assignmentMode = 'choose';
      if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = '1';
      syncQuickTableUI();
      setQuickStatus('Assigned to Table ' + name + '.', false);
      return;
    }

    if (isPastSelectedDate()) {
      toast('Past date — reservations are read-only.');
      return;
    }

    openQuickEditor(0, null);
    setQuickStatus('Table ' + name + ' selected. Complete the reservation details.', false);
  }

  document.addEventListener('click', function (event) {
    var switcher = event.target && event.target.closest
      ? event.target.closest('[data-qpos-workspace-switch]')
      : null;

    if (switcher) {
      event.preventDefault();
      event.stopPropagation();
      setWorkspace(
        switcher.getAttribute('data-qpos-workspace-switch'),
        true
      );
      return;
    }

    if (state.workspace !== 'reservations') return;

    var tableButton = event.target && event.target.closest
      ? event.target.closest('[data-qpos-table]')
      : null;

    if (tableButton && root.contains(tableButton)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      selectReservationTable(tableButton);
      return;
    }

    var pickup = event.target && event.target.closest
      ? event.target.closest('[data-qpos-pickup]')
      : null;

    if (pickup && root.contains(pickup)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (isPastSelectedDate()) {
        toast('Past date — reservations are read-only.');
        return;
      }
      openQuickEditor(0, null);
      return;
    }

    var floorButton = event.target && event.target.closest
      ? event.target.closest('[data-qpos-floor]')
      : null;

    if (floorButton && root.contains(floorButton)) {
      state.selectedTableId = 0;
      state.selectedTableName = '';
      state.tableScope = 'all';
      if (state.editor.open && !isPastSelectedDate()) {
        state.editor.tableIds = [];
        state.editor.tableNames = [];
        state.editor.assignmentMode = 'auto';
        state.editor.recommendedTableIds = [];
        state.editor.recommendationState = 'loading';
        syncQuickTableUI();
        setQuickStatus('Finding the best available table on this Floor…', false);
        scheduleQuickRecommendation(0);
      }
      renderTableFilter();
      window.setTimeout(loadReservations, 0);
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
    }
  }, true);

  document.addEventListener('click', function (event) {
    if (state.workspace !== 'reservations') return;

    var edit = event.target && event.target.closest
      ? event.target.closest('[data-qres-edit]')
      : null;

    if (edit) {
      event.preventDefault();
      openQuickEditor(
        Number(edit.getAttribute('data-qres-edit') || 0),
        null
      );
      return;
    }

    var create = event.target && event.target.closest
      ? event.target.closest('[data-qres-new]')
      : null;

    if (create) {
      event.preventDefault();
      if (isPastSelectedDate()) {
        toast('Past date — reservations are read-only.');
        return;
      }
      openQuickEditor(0, null);
      return;
    }

    var slot = event.target && event.target.closest
      ? event.target.closest('[data-qres-slot]')
      : null;

    if (slot) {
      event.preventDefault();
      if (isPastSelectedDate()) {
        toast('Past date — reservations are read-only.');
        return;
      }
      openQuickEditor(
        0,
        String(slot.getAttribute('data-qres-slot') || '')
      );
      return;
    }

    var reservationScope = event.target && event.target.closest
      ? event.target.closest('[data-qres-scope]')
      : null;

    if (reservationScope) {
      event.preventDefault();

      var requestedScope = String(
        reservationScope.getAttribute('data-qres-scope') || 'all'
      );

      if (requestedScope === 'selected') {
        if (!state.selectedTableId) {
          state.tableScope = 'all';
          renderTableFilter();
          toast('Select a table on the right.');
          return;
        }

        state.tableScope = 'selected';
      } else {
        state.tableScope = 'all';
      }

      renderTableFilter();
      loadReservations();
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
      return;
    }

    var shift = event.target && event.target.closest
      ? event.target.closest('[data-qres-shift]')
      : null;

    if (shift) {
      state.date = shiftDate(
        state.date,
        Number(shift.getAttribute('data-qres-shift') || 0)
      );
      syncQuickEditorDateState();
      loadReservations();
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
      return;
    }

    var today = event.target && event.target.closest
      ? event.target.closest('[data-qres-today]')
      : null;

    if (today) {
      state.date = state.today;
      syncQuickEditorDateState();
      loadReservations();
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
      return;
    }

    var clearTable = event.target && event.target.closest
      ? event.target.closest('[data-qres-clear-table]')
      : null;

    if (clearTable) {
      state.tableScope = 'all';
      renderTableFilter();
      loadReservations();
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (
      state.workspace !== 'reservations' ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return;
    }

    var slot = event.target && event.target.closest
      ? event.target.closest('.pmd-qres-hour-lane[data-qres-slot]')
      : null;

    if (!slot) return;

    event.preventDefault();
    if (isPastSelectedDate()) {
      toast('Past date — reservations are read-only.');
      return;
    }
    openQuickEditor(
      0,
      String(slot.getAttribute('data-qres-slot') || '')
    );
  });

  if (quickForm) {
    quickForm.addEventListener('submit', saveQuickReservation);
    quickForm.addEventListener('change', function (event) {
      var name = String(event && event.target && event.target.name || '');
      if (name === 'reserve_date' || name === 'duration') {
        refreshQuickTimeWheelAvailability();
      }
      if (name === 'reserve_date') {
        syncQuickEditorDateState();
      }
      if (
        name === 'reserve_date' ||
        name === 'reserve_time' ||
        name === 'duration' ||
        name === 'guest_num' ||
        name === 'pmd_table_features[]'
      ) {
        scheduleQuickRecommendation();
      }
    });
  }

  document.querySelectorAll('[data-qres-quick-cancel]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      closeQuickEditor();
    });
  });

  var quickAuto = document.querySelector('[data-qres-quick-auto]');
  if (quickAuto) {
    quickAuto.addEventListener('click', function (event) {
      event.preventDefault();
      if (isPastSelectedDate()) return;
      state.editor.tableIds = [];
      state.editor.tableNames = [];
      state.editor.assignmentMode = 'auto';
      state.editor.recommendedTableIds = [];
      state.editor.recommendationState = 'loading';
      if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = '0';
      syncQuickTableUI();
      setQuickStatus('Finding the best available table…', false);
      scheduleQuickRecommendation(0);
    });
  }

  var quickChoose = document.querySelector('[data-qres-quick-choose]');
  if (quickChoose) {
    quickChoose.addEventListener('click', function (event) {
      event.preventDefault();
      if (isPastSelectedDate()) return;
      state.editor.assignmentMode = 'choose';
      syncQuickTableUI();
      setQuickStatus(
        state.editor.tableIds.length
          ? ('Assigned to ' + state.editor.tableNames.map(tableLabelFromName).join(' + ') + '.')
          : 'Tap a table on the right to assign it.',
        false
      );
    });
  }

  var quickLater = document.querySelector('[data-qres-quick-later]');
  if (quickLater) {
    quickLater.addEventListener('click', function (event) {
      event.preventDefault();
      if (isPastSelectedDate()) return;
      state.editor.tableIds = [];
      state.editor.tableNames = [];
      state.editor.assignmentMode = 'later';
      if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = '0';
      syncQuickTableUI();
      setQuickStatus('No table will be assigned yet.', false);
    });
  }

  document.querySelectorAll('[data-qres-guests-step]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      var field = quickField('guest_num');
      if (!field) return;
      var direction = Number(button.getAttribute('data-qres-guests-step') || 0);
      field.value = String(Math.max(1, Math.min(99, Number(field.value || 1) + direction)));
      scheduleQuickRecommendation();
    });
  });

  document.querySelectorAll('[data-qres-duration-step]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      var field = quickField('duration');
      if (!field) return;
      var direction = Number(button.getAttribute('data-qres-duration-step') || 0);
      var next = Number(field.value || 45) + direction;
      field.value = String(Math.max(30, Math.min(180, Math.round(next / 15) * 15)));
      refreshQuickTimeWheelAvailability();
      scheduleQuickRecommendation();
    });
  });

  if (dateInput) {
    dateInput.addEventListener('change', function () {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) return;
      state.date = dateInput.value;
      syncQuickEditorDateState();
      loadReservations();
      if (state.search.length >= 2) scheduleOtherDateSearch(0);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.search = String(searchInput.value || '').trim();
      if (state.search.length < 2) {
        clearOtherDateSearch();
      } else {
        scheduleOtherDateSearch();
      }
      queueRender();
    });
  }

  window.addEventListener('pmd:qpos:tables-rendered', function () {
    renderReservationRailAction();
    renderTableFilter();
    syncQuickTableUI();
  });

  window.addEventListener('pmd:reservation-saved', function () {
    window.setTimeout(function () { loadReservations(true); }, 60);
  });

  if (!window.PMDReservationsCardsV320) {
    window.PMDReservationsCardsV320 = {
      version: 'qpos-r136-bridge',
      refresh: function () {
        return loadReservations();
      }
    };
  }

  installScheduleBridge();
  localClock();
  window.setInterval(localClock, 30000);

  setWorkspace(state.workspace, false);

  window.PMDQuickReservationsR136 = {
    version: '1.0.0-r136',
    setWorkspace: setWorkspace,
    refresh: loadReservations,
    newReservation: function () {
      openQuickEditor(0, null);
    },
    getState: function () {
      return {
        workspace: state.workspace,
        date: state.date,
        selectedTableId: state.selectedTableId,
        tableScope: state.tableScope,
        search: state.search,
        otherDateCount: state.otherDateRows.length,
        count: state.rows.length,
        openingHours: state.openingHours.slice()
      };
    }
  };

  // Compatibility aliases for diagnostics that referenced earlier bridges.
  window.PMDQuickReservationsR135 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR134 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR133 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR132 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR131 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR130 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR129 = window.PMDQuickReservationsR136;
  window.PMDQuickReservationsR128 = window.PMDQuickReservationsR136;
})();
