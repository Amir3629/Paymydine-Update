/* PMD_QPOS_QUICK_RESERVATIONS_R130
 * POS-native Reservations workspace.
 * Right rail stays the canonical Quick POS table authority.
 * Canonical Reservation Composer stays the only create/edit authority.
 */
(function () {
  'use strict';

  if (window.PMDQuickReservationsR130) return;

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
  var quickTableText = document.querySelector('[data-qres-quick-table-text]');
  var quickSave = document.querySelector('[data-qres-quick-save]');

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
    loading: false,
    editor: {
      open: false,
      mode: 'create',
      reservationId: 0,
      tableIds: [],
      tableNames: [],
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
              esc('P ' + guests + ' · ' + rowTables(row) + ' · ' + Math.max(1, Number(row.duration || 45)) + ' min') +
            '</small>' +
            (rowNote(row)
              ? '<em class="pmd-qres-list-note">' + esc(rowNote(row)) + '</em>'
              : '') +
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

    renderTableFilter();
    renderList();
    renderTimeline();
  }

  function installScheduleBridge() {
    if (
      window.PMDReservationsScheduleV1 &&
      window.PMDReservationsScheduleV1.version !== 'qpos-r130'
    ) {
      return;
    }

    window.PMDReservationsScheduleV1 = {
      version: 'qpos-r130',
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

  function quickField(name) {
    return quickForm && quickForm.elements ? quickForm.elements[name] : null;
  }

  function setQuickStatus(message, error) {
    if (!quickStatus) return;
    quickStatus.textContent = String(message || '');
    quickStatus.classList.toggle('is-error', !!error);
  }

  function syncQuickTableUI() {
    var ids = state.editor.tableIds.slice();
    var names = state.editor.tableNames.slice();
    var assignment = quickField('assignment_mode');

    if (assignment) assignment.value = ids.length ? 'choose' : 'auto';
    if (quickTableText) {
      quickTableText.textContent = ids.length
        ? (names.length ? names.join(', ') : ids.map(function (id) { return 'Table ' + id; }).join(', '))
        : 'Automatic';
    }

    root.querySelectorAll('[data-qpos-table]').forEach(function (button) {
      var id = Number(button.getAttribute('data-qpos-table') || 0);
      button.classList.toggle('is-reservation-editor-table-r130', ids.indexOf(id) >= 0);
    });
  }

  function closeQuickEditor() {
    state.editor.open = false;
    state.editor.mode = 'create';
    state.editor.reservationId = 0;
    state.editor.tableIds = [];
    state.editor.tableNames = [];
    state.editor.saving = false;

    if (quickEditor) {
      quickEditor.hidden = true;
      quickEditor.setAttribute('aria-hidden', 'true');
    }
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
      : (state.selectedTableId ? [state.selectedTableId] : []);
    state.editor.tableNames = row
      ? (Array.isArray(row.table_names) && row.table_names.length
          ? row.table_names.slice()
          : (row.table_name ? [String(row.table_name)] : []))
      : (state.selectedTableName ? [state.selectedTableName] : []);

    quickForm.reset();
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
    if (quickField('source')) quickField('source').value = 'quick-pos-reservations-r130';
    if (quickField('pmd_floor_id')) quickField('pmd_floor_id').value = floor.id || '';
    if (quickField('pmd_floor_name')) quickField('pmd_floor_name').value = floor.name || '';
    if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = state.editor.tableIds.length ? '1' : '0';

    if (quickTitle) quickTitle.textContent = id ? 'Edit reservation' : 'New reservation';
    if (quickContext) quickContext.textContent = id
      ? ('#' + id + ' · ' + String(row && row.reserve_time || '').slice(0, 5))
      : ('Quick mode · ' + state.date);

    quickEditor.hidden = false;
    quickEditor.setAttribute('aria-hidden', 'false');
    setQuickStatus('Tap a table on the right, or keep Automatic table.', false);
    syncQuickTableUI();

    window.requestAnimationFrame(function () {
      var name = quickField('first_name');
      if (name) name.focus();
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
    var payload = {
      reservation_id: state.editor.reservationId || null,
      first_name: String((quickField('first_name') || {}).value || '').trim(),
      last_name: '',
      telephone: String((quickField('telephone') || {}).value || '').trim(),
      email: String((quickField('email') || {}).value || '').trim(),
      guest_num: Math.max(0, Number((quickField('guest_num') || {}).value || 0)),
      reserve_date: String((quickField('reserve_date') || {}).value || ''),
      reserve_time: String((quickField('reserve_time') || {}).value || '').slice(0, 5),
      duration: Math.max(0, Number((quickField('duration') || {}).value || 0)),
      comment: String((quickField('comment') || {}).value || '').trim(),
      assignment_mode: ids.length ? 'choose' : 'auto',
      tables: ids,
      pmd_table_features: [],
      occasion_id: 0,
      notify: 0,
      source: 'quick-pos-reservations-r130',
      location_id: quickLocationId() || null,
      pmd_floor_id: floor.id || '',
      pmd_floor_name: floor.name || '',
      pmd_floor_locked: ids.length ? 1 : 0
    };

    return payload;
  }

  function validateQuickPayload(data) {
    if (!data.first_name) return 'Add the guest name.';
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(data.reserve_date)) return 'Choose a reservation date.';
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(data.reserve_time)) return 'Choose a reservation time.';
    if (data.guest_num < 1) return 'People must be at least 1.';
    if (data.duration < 1) return 'Choose a duration.';
    return '';
  }

  function saveQuickReservation(event) {
    if (event) event.preventDefault();
    if (!quickForm || state.editor.saving) return;

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
        closeQuickEditor();
        return loadReservations();
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

    if (state.editor.open) {
      state.editor.tableIds = [id];
      state.editor.tableNames = [name];
      if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = '1';
      syncQuickTableUI();
      setQuickStatus('Assigned to Table ' + name + '.', false);
      return;
    }

    state.selectedTableId = id;
    state.selectedTableName = name;
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
      if (state.editor.open) {
        state.editor.tableIds = [];
        state.editor.tableNames = [];
        syncQuickTableUI();
        setQuickStatus('Floor changed. Table assignment returned to Automatic.', false);
      }
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
      openQuickEditor(0, null);
      return;
    }

    var slot = event.target && event.target.closest
      ? event.target.closest('[data-qres-slot]')
      : null;

    if (slot) {
      event.preventDefault();
      openQuickEditor(
        0,
        String(slot.getAttribute('data-qres-slot') || '')
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
    openQuickEditor(
      0,
      String(slot.getAttribute('data-qres-slot') || '')
    );
  });

  if (quickForm) {
    quickForm.addEventListener('submit', saveQuickReservation);
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
      state.editor.tableIds = [];
      state.editor.tableNames = [];
      if (quickField('pmd_floor_locked')) quickField('pmd_floor_locked').value = '0';
      syncQuickTableUI();
      setQuickStatus('Automatic table assignment selected.', false);
    });
  }

  document.querySelectorAll('[data-qres-guests-step]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      var field = quickField('guest_num');
      if (!field) return;
      var direction = Number(button.getAttribute('data-qres-guests-step') || 0);
      field.value = String(Math.max(1, Math.min(999, Number(field.value || 1) + direction)));
    });
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
      version: 'qpos-r130-bridge',
      refresh: function () {
        return loadReservations();
      }
    };
  }

  installScheduleBridge();
  localClock();
  window.setInterval(localClock, 30000);

  setWorkspace(state.workspace, false);

  window.PMDQuickReservationsR130 = {
    version: '1.0.0-r130',
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
        count: state.rows.length,
        openingHours: state.openingHours.slice()
      };
    }
  };

  // Compatibility alias for diagnostics that referenced the first bridge.
  window.PMDQuickReservationsR129 = window.PMDQuickReservationsR130;
  window.PMDQuickReservationsR128 = window.PMDQuickReservationsR130;
})();
