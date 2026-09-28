/* PMD_QPOS_QUICK_RESERVATIONS_R129
 * POS-native Reservations workspace.
 * Right rail stays the canonical Quick POS table authority.
 * Canonical Reservation Composer stays the only create/edit authority.
 */
(function () {
  'use strict';

  if (window.PMDQuickReservationsR129) return;

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

  var state = {
    workspace: root.getAttribute('data-workspace') === 'reservations'
      ? 'reservations'
      : 'pos',
    date: root.getAttribute('data-qpos-reservations-today') || '',
    today: root.getAttribute('data-qpos-reservations-today') || '',
    serverNowBerlin: '',
    openingHours: [],
    rows: [],
    selectedTableId: 0,
    selectedTableName: '',
    search: '',
    filter: 'all',
    requestId: 0,
    loading: false
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
      if (state.filter === 'upcoming' && rowIsPast(row)) return false;
      if (state.filter === 'past' && !rowIsPast(row)) return false;
      if (!needle) return true;

      var haystack = [
        rowName(row),
        rowTables(row),
        row.telephone || '',
        row.email || '',
        row.reserve_time || '',
        row.status_name || row.status || '',
        row.reservation_id || ''
      ].join(' ').toLowerCase();

      return haystack.indexOf(needle) !== -1;
    });
  }

  function renderTableFilter() {
    if (!tableFilter) return;

    var visible = state.selectedTableId > 0;
    tableFilter.classList.toggle('is-visible', visible);

    if (tableFilterText) {
      tableFilterText.textContent = visible
        ? 'Table ' + (state.selectedTableName || state.selectedTableId)
        : '';
    }

    root.querySelectorAll('[data-qpos-table]').forEach(function (button) {
      var id = Number(button.getAttribute('data-qpos-table') || 0);
      button.classList.toggle(
        'is-reservation-filter-r129',
        visible && id === state.selectedTableId
      );
    });
  }

  function renderList() {
    var rows = filteredRows();
    if (!list) return;

    if (state.loading && !state.rows.length) {
      list.innerHTML =
        '<div class="pmd-qres-list-loading">' +
          '<span></span><span></span><span></span>' +
        '</div>';
      return;
    }

    if (!rows.length) {
      list.innerHTML =
        '<div class="pmd-qres-empty">' +
          '<strong>No reservations</strong>' +
          '<span>' +
            (state.selectedTableId
              ? 'Nothing booked for this table.'
              : 'Nothing matches this day.') +
          '</span>' +
        '</div>';
      return;
    }

    list.innerHTML = rows.map(function (row) {
      var guests = Math.max(0, Number(row.guest_num || row.guests || 0));
      return (
        '<button type="button" class="pmd-qres-list-card" data-qres-edit="' +
          esc(row.reservation_id || row.id) + '">' +
          '<span class="pmd-qres-list-time">' +
            esc(String(row.reserve_time || '').slice(0, 5)) +
          '</span>' +
          '<span class="pmd-qres-list-copy">' +
            '<strong>' + esc(rowName(row)) + '</strong>' +
            '<small>' +
              esc(guests + ' pax · ' + rowTables(row)) +
            '</small>' +
          '</span>' +
        '</button>'
      );
    }).join('');
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

    return (
      '<button type="button" class="pmd-qres-booking-card" data-qres-edit="' +
        esc(id) + '">' +
        '<span class="pmd-qres-booking-main">' +
          '<strong>' + esc(rowName(row)) + '</strong>' +
          '<b>' + esc(time) + '</b>' +
        '</span>' +
        '<span class="pmd-qres-booking-meta">' +
          '<span>' + esc(guests + ' pax') + '</span>' +
          '<span>' + esc(rowTables(row)) + '</span>' +
          '<span>' + esc(duration + ' min') + '</span>' +
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

    renderTableFilter();
    renderList();
    renderTimeline();
  }

  function installScheduleBridge() {
    if (
      window.PMDReservationsScheduleV1 &&
      window.PMDReservationsScheduleV1.version !== 'qpos-r129'
    ) {
      return;
    }

    window.PMDReservationsScheduleV1 = {
      version: 'qpos-r129',
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

  async function loadReservations() {
    if (state.workspace !== 'reservations') return false;

    var requestId = ++state.requestId;
    state.loading = true;
    render();

    var url = '/admin/pos/reservations-data?date=' +
      encodeURIComponent(state.date || state.today);

    if (state.selectedTableId) {
      url += '&table_id=' + encodeURIComponent(String(state.selectedTableId));
    }

    url += '&_=' + Date.now();

    try {
      var response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
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
      return true;
    } catch (error) {
      if (requestId !== state.requestId) return false;

      state.loading = false;
      state.rows = [];
      render();

      if (list) {
        list.innerHTML =
          '<div class="pmd-qres-error">' +
            esc(error && error.message
              ? error.message
              : 'Reservations could not be loaded.') +
          '</div>';
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
      loadReservations();
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
    return state.rows.find(function (row) {
      return Number(row.reservation_id || row.id || 0) === id;
    }) || null;
  }

  function composerFallback(id, selectedTime) {
    if (id) return '/admin/reservations/edit/' + id;

    var params = new URLSearchParams();
    params.set('reserve_date', state.date);
    if (selectedTime) params.set('reserve_time', selectedTime);

    return '/admin/reservations/create?' + params.toString();
  }

  function markComposerSurface() {
    var composer = document.getElementById('pmd-reservation-composer-v1');
    if (composer) {
      composer.setAttribute('data-pmd-qpos-composer-r129', '1');
    }
    return composer;
  }

  function openComposer(reservationId, selectedTime, trigger) {
    var api = window.PMDReservationComposerV1;
    var id = Number(reservationId || 0);
    var row = id ? rowById(id) : null;
    var floor = currentFloorMeta();
    var composer = markComposerSurface();

    var tableIds = row
      ? rowIds(row)
      : (state.selectedTableId ? [state.selectedTableId] : []);

    var tableNames = row
      ? (Array.isArray(row.table_names) ? row.table_names.slice() : [])
      : (state.selectedTableName ? [state.selectedTableName] : []);

    var fallback = composerFallback(id, selectedTime);

    if (!api || typeof api.open !== 'function') {
      window.location.href = fallback;
      return;
    }

    try {
      var result = api.open({
        version: 1,
        mode: id ? 'edit' : 'create',
        source: 'quick-pos-reservations-r129',
        reservationId: id || null,
        selectedDate: state.date,
        selectedTime: selectedTime || null,
        duration: row ? Number(row.duration || 0) || null : null,
        tableIds: tableIds,
        tableNames: tableNames,
        floorId: floor.id || null,
        floorName: floor.name || null,
        floorLocked: !id && tableIds.length > 0,
        locationId: null,
        returnView: 'hour',
        fallbackUrl: fallback
      }, trigger || null);

      Promise.resolve(result).then(function () {
        markComposerSurface();
      }).catch(function (error) {
        console.error('[PMD Quick Reservations] Composer open failed', error);
        composer = markComposerSurface();
        if (!composer || !composer.classList.contains('show')) {
          window.location.href = fallback;
        }
      });
    } catch (error) {
      console.error('[PMD Quick Reservations] Composer open failed', error);
      if (!composer || !composer.classList.contains('show')) {
        window.location.href = fallback;
      }
    }
  }

  function selectReservationTable(button) {
    var id = Number(button.getAttribute('data-qpos-table') || 0);
    if (!id || button.disabled) return;

    state.selectedTableId = id;
    state.selectedTableName = String(
      (button.querySelector('strong') || {}).textContent || id
    ).trim();

    renderTableFilter();
    loadReservations();
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
      toast('Pickup is available in POS mode.');
      return;
    }

    var floorButton = event.target && event.target.closest
      ? event.target.closest('[data-qpos-floor]')
      : null;

    if (floorButton && root.contains(floorButton)) {
      state.selectedTableId = 0;
      state.selectedTableName = '';
      renderTableFilter();
      window.setTimeout(loadReservations, 0);
    }
  }, true);

  document.addEventListener('click', function (event) {
    if (state.workspace !== 'reservations') return;

    var edit = event.target && event.target.closest
      ? event.target.closest('[data-qres-edit]')
      : null;

    if (edit) {
      event.preventDefault();
      openComposer(
        Number(edit.getAttribute('data-qres-edit') || 0),
        null,
        edit
      );
      return;
    }

    var create = event.target && event.target.closest
      ? event.target.closest('[data-qres-new]')
      : null;

    if (create) {
      event.preventDefault();
      openComposer(0, null, create);
      return;
    }

    var slot = event.target && event.target.closest
      ? event.target.closest('[data-qres-slot]')
      : null;

    if (slot) {
      event.preventDefault();
      openComposer(
        0,
        String(slot.getAttribute('data-qres-slot') || ''),
        slot
      );
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
      loadReservations();
      return;
    }

    var today = event.target && event.target.closest
      ? event.target.closest('[data-qres-today]')
      : null;

    if (today) {
      state.date = state.today;
      loadReservations();
      return;
    }

    var filter = event.target && event.target.closest
      ? event.target.closest('[data-qres-filter]')
      : null;

    if (filter) {
      state.filter = String(
        filter.getAttribute('data-qres-filter') || 'all'
      );

      document.querySelectorAll('[data-qres-filter]').forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button.getAttribute('data-qres-filter') === state.filter
        );
      });

      render();
      return;
    }

    var clearTable = event.target && event.target.closest
      ? event.target.closest('[data-qres-clear-table]')
      : null;

    if (clearTable) {
      state.selectedTableId = 0;
      state.selectedTableName = '';
      renderTableFilter();
      loadReservations();
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
    openComposer(
      0,
      String(slot.getAttribute('data-qres-slot') || ''),
      slot
    );
  });

  if (dateInput) {
    dateInput.addEventListener('change', function () {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) return;
      state.date = dateInput.value;
      loadReservations();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.search = String(searchInput.value || '').trim();
      render();
    });
  }

  window.addEventListener('pmd:qpos:tables-rendered', renderTableFilter);

  window.addEventListener('pmd:reservation-saved', function () {
    window.setTimeout(loadReservations, 60);
  });

  if (!window.PMDReservationsCardsV320) {
    window.PMDReservationsCardsV320 = {
      version: 'qpos-r129-bridge',
      refresh: function () {
        return loadReservations();
      }
    };
  }

  installScheduleBridge();
  markComposerSurface();
  localClock();
  window.setInterval(localClock, 30000);

  setWorkspace(state.workspace, false);

  window.PMDQuickReservationsR129 = {
    version: '1.0.0-r129',
    setWorkspace: setWorkspace,
    refresh: loadReservations,
    newReservation: function () {
      openComposer(0, null, null);
    },
    getState: function () {
      return {
        workspace: state.workspace,
        date: state.date,
        selectedTableId: state.selectedTableId,
        count: state.rows.length,
        openingHours: state.openingHours.slice()
      };
    }
  };

  // Compatibility alias for diagnostics that referenced the first bridge.
  window.PMDQuickReservationsR128 = window.PMDQuickReservationsR129;
})();
