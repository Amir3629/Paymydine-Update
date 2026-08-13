/* PMD_RESERVATIONS_LAB_EXACT_RESERVATIONS2_CALENDAR_HOUR_V2_4
 * Reservations Lab uses the captured live Reservations2 Calendar/Hour DOM contract.
 * Floor is initial. Existing header calendar control opens the exact Calendar surface.
 * Selecting a Calendar day opens the exact Reservations2 Hour/Timeslot screen.
 * Interaction-only rendering; no delayed or observing layout authority.
 */
(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/reservationslab') return;

  var PAGE_ID = 'pmd-dashboard-lab';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var ROOT_ID = 'pmd-r2-calendar-surface-v160';
  var TOGGLE_ID = 'pmd-dashboard-lab-calendar-v4';
  var NOTE_KEY = 'pmd.yearCalendar.notes.v1';

  var page = document.getElementById(PAGE_ID);
  var floor = document.getElementById(FLOOR_ID);
  var bootNode = document.getElementById('pmd-reservations-lab-schedule-bootstrap-v1');
  var composer = document.querySelector('[data-pmd-res-lab-composer]');
  if (!page || !floor || !bootNode || !composer) return;

  var boot = {};
  try { boot = JSON.parse(bootNode.textContent || '{}') || {}; } catch (error) { boot = {}; }

  var strings = boot.strings || {};
  var locale = String(boot.locale || 'en').toLowerCase() === 'de' ? 'de' : 'en';
  var localeTag = String(boot.locale_tag || (locale === 'de' ? 'de-DE' : 'en-GB'));
  var reservations = Array.isArray(boot.reservations) ? boot.reservations.slice() : [];
  var calendarMode = false;
  var selectedDate = null;
  var year = Number(boot.year || new Date().getFullYear());
  var month = Math.max(0, Number(boot.month || (new Date().getMonth() + 1)) - 1);
  var view = 'month';
  var filter = 'all';
  var interactionRenderWrites = 0;
  var interactionNetworkRequests = 0;

  var form = composer.querySelector('[data-pmd-res-lab-form]');
  var tableField = composer.querySelector('[data-pmd-res-lab-table-field]');
  var availabilityNode = composer.querySelector('[data-pmd-res-lab-availability]');
  var errorNode = composer.querySelector('[data-pmd-res-lab-error]');
  var saveButton = composer.querySelector('[data-pmd-res-lab-save]');
  var activeComposerMode = 'create';
  var activeReservationId = null;

  var monthNames = locale === 'de'
    ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var weekNames = Array.isArray(boot.weekdays) && boot.weekdays.length === 7
    ? boot.weekdays.slice()
    : (locale === 'de' ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  function text(key, fallback) { return String(strings[key] || fallback || ''); }
  function csrf() { var meta = document.querySelector('meta[name="csrf-token"]'); return meta ? String(meta.content || '') : ''; }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function pad(number) { return String(number).padStart(2, '0'); }
  function dateKey(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function parseDateKey(value) {
    var parts = String(value || '').split('-').map(Number);
    return new Date(parts[0] || year, (parts[1] || (month + 1)) - 1, parts[2] || 1, 12, 0, 0, 0);
  }
  function formatDate(key) {
    var parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3) return key;
    return locale === 'de'
      ? parts[2] + '. ' + monthNames[parts[1] - 1] + ' ' + parts[0]
      : monthNames[parts[1] - 1] + ' ' + parts[2] + ', ' + parts[0];
  }
  function reservationDate(item) { return String(item.reserve_date || item.reservation_date || item.date || '').slice(0, 10); }
  function reservationId(item) { return item.reservation_id || item.id || item.booking_id || ''; }
  function reservationTime(item) { return clean(item.reserve_time || item.reservation_time || item.time || '').slice(0, 5); }
  function reservationName(item) {
    return clean(item.guest_name || item.customer_name || item.name || [item.first_name || '', item.last_name || ''].join(' ')) ||
      text('reservation', 'Reservation') + ' #' + String(reservationId(item) || '');
  }
  function reservationStatus(item) {
    var raw = item.status;
    if (raw && typeof raw === 'object') raw = raw.name || raw.label || raw.status || raw.status_name;
    return clean(raw || item.status_name || item.state || text('scheduled', locale === 'de' ? 'Geplant' : 'Scheduled'));
  }
  function reservationTable(item) {
    if (Array.isArray(item.table_names) && item.table_names.length) return clean(item.table_names.join(', ')).replace(/\btable\s*/gi, '');
    return clean(item.table_name || item.table || item.table_number || item.table_id || '').replace(/\btable\s*/gi, '').replace(/\s*,\s*/g, ', ');
  }
  function guestCount(item) { return Math.max(0, Number(item.guest_num || item.guests || item.party_size || item.number_of_guests || 0) || 0); }
  function reservationMinutes(item) {
    var match = reservationTime(item).match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }
  function minuteLabel(value) { return pad(Math.floor(value / 60)) + ':' + pad(value % 60); }
  function statusClass(status) {
    var value = clean(status).toLowerCase();
    if (/cancel|declin|reject|no.?show|storn|abgelehnt/.test(value)) return 'is-cancelled';
    if (/pending|request|wait|aussteh|wart/.test(value)) return 'is-pending';
    return 'is-confirmed';
  }
  function groupReservations() {
    return reservations.reduce(function (map, item) {
      var key = reservationDate(item);
      if (key) (map[key] || (map[key] = [])).push(item);
      return map;
    }, {});
  }
  function notes() {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY) || '{}') || {}; } catch (error) { return {}; }
  }
  function saveNotes(data) { localStorage.setItem(NOTE_KEY, JSON.stringify(data)); }
  function holidays(targetYear) {
    return locale === 'de'
      ? [
          {date:targetYear+'-01-01',title:'Neujahr'},
          {date:targetYear+'-05-01',title:'Tag der Arbeit'},
          {date:targetYear+'-10-03',title:'Tag der Deutschen Einheit'},
          {date:targetYear+'-12-25',title:'1. Weihnachtstag'},
          {date:targetYear+'-12-26',title:'2. Weihnachtstag'}
        ]
      : [
          {date:targetYear+'-01-01',title:'New Year’s Day'},
          {date:targetYear+'-05-01',title:'Labour Day'},
          {date:targetYear+'-10-03',title:'German Unity Day'},
          {date:targetYear+'-12-25',title:'Christmas Day'},
          {date:targetYear+'-12-26',title:'Second Christmas Day'}
        ];
  }
  function eventsForYear(targetYear) {
    var items = Array.isArray(boot.events) ? boot.events.slice() : [];
    return items.concat(holidays(targetYear)).map(function (event) {
      return {date:String(event.date || event.start_date || '').slice(0, 10), title:event.title || event.name || text('event','Event')};
    }).filter(function (event) { return event.date.indexOf(String(targetYear) + '-') === 0; });
  }
  function eventMapForYear(targetYear) {
    return eventsForYear(targetYear).reduce(function (map, event) {
      (map[event.date] || (map[event.date] = [])).push(event); return map;
    }, {});
  }

  function rootMarkup() {
    return '' +
      '<div class="pmd-r2-yc-calendar-frame" data-r2-yc-calendar-frame>' +
        '<div class="pmd-yc__toolbar">' +
          '<div class="pmd-yc__legend">' +
            '<span><i class="is-reservation">R</i>' + esc(text('reservation','Reservation')) + '</span>' +
            '<span><i class="is-note">✎</i>' + esc(text('note', locale === 'de' ? 'Notiz' : 'Note')) + '</span>' +
            '<span><i class="is-event">★</i>' + esc(text('event', locale === 'de' ? 'Ereignis' : 'Event')) + '</span>' +
          '</div>' +
          '<div class="pmd-yc__month-nav"><button type="button" data-r2-yc-prev aria-label="' + esc(text('previous','Previous')) + '">←</button><strong data-r2-yc-label></strong><button type="button" data-r2-yc-next aria-label="' + esc(text('next','Next')) + '">→</button></div>' +
          '<div class="pmd-yc__toolbar-right">' +
            '<div class="pmd-yc__view-switch"><button type="button" data-r2-yc-view="year">' + esc(text('year',locale === 'de' ? 'Jahr' : 'Year')) + '</button><button type="button" data-r2-yc-view="month" class="is-active">' + esc(text('month',locale === 'de' ? 'Monat' : 'Month')) + '</button></div>' +
            '<div class="pmd-yc__filters"><button type="button" data-r2-yc-filter="all" class="is-active">' + esc(text('all',locale === 'de' ? 'Alle' : 'All')) + '</button><button type="button" data-r2-yc-filter="reservations">' + esc(text('reservations_title',locale === 'de' ? 'Reservierungen' : 'Reservations')) + '</button><button type="button" data-r2-yc-filter="events">' + esc(text('events',locale === 'de' ? 'Ereignisse' : 'Events')) + '</button></div>' +
            '<button type="button" class="pmd-r2-yc-note-btn" data-r2-yc-note>＋ ' + esc(text('note',locale === 'de' ? 'Notiz' : 'Note')) + '</button>' +
          '</div>' +
        '</div>' +
        '<main class="pmd-yc__months" data-r2-yc-months></main>' +
      '</div>' +
      '<section class="pmd-r2-yc-selected" data-r2-yc-selected hidden></section>' +
      '<section class="pmd-r2-yc-modal" data-r2-yc-modal hidden>' +
        '<div class="pmd-r2-yc-modal__backdrop" data-r2-yc-modal-close></div>' +
        '<section class="pmd-r2-yc-modal__card" role="dialog" aria-modal="true" aria-labelledby="pmd-r2-yc-modal-title">' +
          '<div class="pmd-r2-yc-modal__head"><div><small>' + esc(text('day_note',locale === 'de' ? 'Tagesnotiz' : 'Day note')) + '</small><h2 id="pmd-r2-yc-modal-title" data-r2-yc-modal-title></h2></div><button type="button" data-r2-yc-modal-close aria-label="' + esc(text('close','Close')) + '">×</button></div>' +
          '<textarea data-r2-yc-modal-input rows="5" placeholder="' + esc(text('write_note',locale === 'de' ? 'Notiz für diesen Tag schreiben' : 'Write a note for this day')) + '"></textarea>' +
          '<div class="pmd-r2-yc-modal__actions"><button type="button" data-r2-yc-modal-delete>' + esc(text('delete',locale === 'de' ? 'Löschen' : 'Delete')) + '</button><button type="button" data-r2-yc-modal-close>' + esc(text('cancel','Cancel')) + '</button><button type="button" class="primary" data-r2-yc-modal-save>' + esc(text('save_note',locale === 'de' ? 'Notiz speichern' : 'Save note')) + '</button></div>' +
        '</section>' +
      '</section>';
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ID;
      root.className = 'pmd-yc pmd-r2-yc';
      root.hidden = true;
      root.innerHTML = rootMarkup();
      floor.appendChild(root);
      bindCalendarRoot(root);
      interactionRenderWrites += 1;
    }
    return root;
  }

  function dataState(key, reservationMap, noteMap, eventMap) {
    return {reservations:reservationMap[key] || [], note:noteMap[key] || '', events:eventMap[key] || []};
  }
  function monthRows(state) {
    var rows = [];
    if ((filter === 'all' || filter === 'reservations') && state.reservations.length) {
      rows.push('<span class="pmd-r2-yc-entry is-reservation">' + state.reservations.length + ' ' + esc(state.reservations.length === 1 ? text('reservation_lower',locale === 'de' ? 'Reservierung' : 'reservation') : text('reservations','reservations')) + '</span>');
    }
    if (filter === 'all' && state.note) rows.push('<span class="pmd-r2-yc-entry is-note">' + esc(state.note) + '</span>');
    if ((filter === 'all' || filter === 'events') && state.events.length) {
      state.events.forEach(function (event) { rows.push('<span class="pmd-r2-yc-entry is-event">' + esc(event.title) + '</span>'); });
    }
    return rows.join('');
  }
  function yearDots(state) {
    var dots = [];
    if ((filter === 'all' || filter === 'reservations') && state.reservations.length) dots.push('<i class="pmd-r2-yc-dot is-reservation"></i>');
    if (filter === 'all' && state.note) dots.push('<i class="pmd-r2-yc-dot is-note"></i>');
    if ((filter === 'all' || filter === 'events') && state.events.length) dots.push('<i class="pmd-r2-yc-dot is-event"></i>');
    return dots.join('');
  }
  function monthMarkup(monthIndex, large) {
    var first = new Date(year, monthIndex, 1, 12, 0, 0, 0);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(year, monthIndex, 1 - offset, 12, 0, 0, 0);
    var reservationMap = groupReservations();
    var noteMap = notes();
    var eventMap = eventMapForYear(year);
    var cells = [];
    for (var index = 0; index < 42; index += 1) {
      var date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12, 0, 0, 0);
      var key = dateKey(date);
      var state = dataState(key, reservationMap, noteMap, eventMap);
      var inside = date.getMonth() === monthIndex;
      var body = large ? monthRows(state) : yearDots(state);
      cells.push('<button type="button" class="pmd-yc-day' + (!inside ? ' is-outside' : '') + (key === dateKey(new Date()) ? ' is-today' : '') + (key === selectedDate ? ' is-selected' : '') + '" data-r2-yc-date="' + key + '"><span class="pmd-yc-day__number">' + date.getDate() + '</span><span class="pmd-yc-day__operations' + (large ? '' : ' is-dot-mode') + '">' + body + '</span></button>');
    }
    return '<section class="pmd-yc-month' + (large ? ' is-month-view' : ' is-year-card') + '"><div class="pmd-yc-month__head"><h2>' + esc(monthNames[monthIndex] + ' ' + year) + '</h2></div><div class="pmd-yc-weekdays">' + weekNames.map(function (name) { return '<span>' + esc(name) + '</span>'; }).join('') + '</div><div class="pmd-yc-days">' + cells.join('') + '</div></section>';
  }

  function bookingChip(item) {
    var table = reservationTable(item);
    var status = reservationStatus(item);
    var guests = guestCount(item);
    var id = reservationId(item);
    return '<article class="pmd-r2-slot-booking ' + statusClass(status) + '" data-pmd-res-lab-exact-booking="' + esc(id) + '">' +
      '<div class="pmd-r2-slot-booking__main"><strong>' + esc(reservationName(item)) + '</strong><span>' +
      (table ? esc((table.indexOf(',') !== -1 ? text('tables','Tables') : text('table','Table')) + ' ' + table.replace(/\s*,\s*/g, ' + ')) : esc(text('no_table',locale === 'de' ? 'Kein Tisch' : 'No table'))) +
      ' · ' + guests + ' ' + esc(guests === 1 ? text('guest',locale === 'de' ? 'Gast' : 'guest') : text('guests','Guests')) + '</span></div>' +
      '<div class="pmd-r2-slot-booking__status"><span>' + esc(status) + '</span><a href="#" data-pmd-res-lab-edit="' + esc(id) + '">' + esc(text('open',locale === 'de' ? 'Öffnen' : 'Open')) + '</a></div></article>';
  }

  function renderSelected(root) {
    var section = root.querySelector('[data-r2-yc-selected]');
    var frame = root.querySelector('[data-r2-yc-calendar-frame]');
    if (!section || !frame) return;

    if (!selectedDate) {
      root.classList.remove('is-timeslot-screen', 'is-switching-to-timeslots');
      page.classList.remove('pmd-r2-hour-layout-v38-active');
      frame.hidden = false;
      section.hidden = true;
      section.innerHTML = '';
      return;
    }

    var grouped = groupReservations();
    var list = (grouped[selectedDate] || []).slice().sort(function (a, b) {
      var am = reservationMinutes(a), bm = reservationMinutes(b);
      return (am === null ? 99999 : am) - (bm === null ? 99999 : bm);
    });
    var slots = {};
    list.forEach(function (item) {
      var minutes = reservationMinutes(item);
      var key = minutes === null ? 'unknown' : String(Math.floor(minutes / 30) * 30);
      (slots[key] || (slots[key] = [])).push(item);
    });
    var known = list.map(reservationMinutes).filter(function (value) { return value !== null; });
    var startMinutes = 600;
    var endMinutes = 1320;
    if (known.length) {
      startMinutes = Math.max(0, Math.min(startMinutes, Math.floor(Math.min.apply(Math, known) / 30) * 30));
      endMinutes = Math.min(1410, Math.max(endMinutes, Math.floor(Math.max.apply(Math, known) / 30) * 30 + 90));
    }
    var rows = [];
    for (var cursor = startMinutes; cursor <= endMinutes; cursor += 30) {
      var bookings = slots[String(cursor)] || [];
      rows.push('<section class="pmd-r2-timeslot ' + (bookings.length ? 'has-bookings' : 'is-empty') + '" data-pmd-res-lab-slot-date="' + esc(selectedDate) + '" data-pmd-res-lab-slot-time="' + minuteLabel(cursor) + '">' +
        '<div class="pmd-r2-timeslot__time"><strong>' + minuteLabel(cursor) + '</strong><span>' + (bookings.length ? bookings.length + ' ' + esc(bookings.length === 1 ? text('booking','booking') : text('bookings','bookings')) : esc(text('available','Available'))) + '</span></div>' +
        '<div class="pmd-r2-timeslot__content">' +
          (bookings.length ? bookings.map(bookingChip).join('') : '<div class="pmd-r2-timeslot__free"><i></i><span>' + esc(text('no_reservations','No reservations')) + '</span></div>') +
          '<button type="button" class="pmd-r2-timeslot__create-button" data-pmd-res-lab-slot-create aria-label="' + esc(text('new_reservation','New reservation')) + ' ' + minuteLabel(cursor) + '">+</button>' +
        '</div></section>');
    }
    if (slots.unknown) {
      rows.push('<section class="pmd-r2-timeslot has-bookings"><div class="pmd-r2-timeslot__time"><strong>' + esc(text('time_not_set',locale === 'de' ? 'Keine Uhrzeit' : 'Time not set')) + '</strong><span>' + slots.unknown.length + ' ' + esc(slots.unknown.length === 1 ? text('booking','booking') : text('bookings','bookings')) + '</span></div><div class="pmd-r2-timeslot__content">' + slots.unknown.map(bookingChip).join('') + '</div></section>');
    }
    var splitIndex = Math.ceil(rows.length / 2);
    var totalGuests = list.reduce(function (total, item) { return total + guestCount(item); }, 0);
    var occupiedSlots = Object.keys(slots).filter(function (key) { return key !== 'unknown' && slots[key] && slots[key].length; }).length;

    section.innerHTML = '<div class="pmd-r2-timeslot-screen">' +
      '<header class="pmd-r2-day-view__header" data-pmd-hour-header-v38="true">' +
        '<button type="button" class="pmd-r2-timeslot-screen__back" data-r2-yc-clear-selection>' + esc(text('calendar','Calendar')) + '</button>' +
        '<div class="pmd-r2-day-view__date-nav"><button type="button" class="pmd-r2-day-view__month-button" data-r2-yc-prev-day aria-label="' + esc(text('previous','Previous')) + '">‹</button><div class="pmd-r2-day-view__title"><h2>' + esc(formatDate(selectedDate)) + '</h2></div><button type="button" class="pmd-r2-day-view__month-button" data-r2-yc-next-day aria-label="' + esc(text('next','Next')) + '">›</button></div>' +
        '<div class="pmd-r2-day-view__summary"><span><strong>' + list.length + '</strong> ' + esc(text('reservations','reservations')) + '</span><span><strong>' + totalGuests + '</strong> ' + esc(text('guests','Guests')) + '</span><span><strong>' + occupiedSlots + '</strong> ' + esc(text('time_slots','time slots')) + '</span></div>' +
      '</header>' +
      '<div class="pmd-r2-day-board__timeline pmd-r2-day-board__timeline--two-columns" data-pmd-hour-grid-v38="true"><div class="pmd-r2-day-board__column pmd-r2-day-board__column--first">' + rows.slice(0, splitIndex).join('') + '</div><div class="pmd-r2-day-board__column pmd-r2-day-board__column--second">' + rows.slice(splitIndex).join('') + '</div></div>' +
      '</div>';

    root.classList.add('is-timeslot-screen');
    page.classList.add('pmd-r2-hour-layout-v38-active');
    frame.hidden = true;
    section.hidden = false;
    interactionRenderWrites += 1;
  }

  function render(root) {
    if (selectedDate) { renderSelected(root); return; }
    var months = root.querySelector('[data-r2-yc-months]');
    var label = root.querySelector('[data-r2-yc-label]');
    if (!months || !label) return;
    label.textContent = view === 'month' ? monthNames[month] + ' ' + year : String(year);
    months.innerHTML = view === 'month' ? monthMarkup(month, true) : monthNames.map(function (_, index) { return monthMarkup(index, false); }).join('');
    root.classList.toggle('is-month-mode', view === 'month');
    root.classList.toggle('is-year-mode', view === 'year');
    root.querySelectorAll('[data-r2-yc-view]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.r2YcView === view); });
    root.querySelectorAll('[data-r2-yc-filter]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.r2YcFilter === filter); });
    renderSelected(root);
    interactionRenderWrites += 1;
  }

  function shiftSelectedDay(delta) {
    var target = parseDateKey(selectedDate || dateKey(new Date()));
    target.setDate(target.getDate() + delta);
    selectedDate = dateKey(target);
    year = target.getFullYear();
    month = target.getMonth();
    render(ensureRoot());
  }

  function openNoteModal(key) {
    var root = ensureRoot();
    var modal = root.querySelector('[data-r2-yc-modal]');
    var title = root.querySelector('[data-r2-yc-modal-title]');
    var input = root.querySelector('[data-r2-yc-modal-input]');
    var remove = root.querySelector('[data-r2-yc-modal-delete]');
    modal.dataset.date = key;
    title.textContent = formatDate(key);
    input.value = notes()[key] || '';
    remove.hidden = !input.value;
    modal.hidden = false;
    modal.classList.add('is-open');
    input.focus();
    document.documentElement.classList.add('pmd-r2-yc-modal-open');
  }
  function closeNoteModal() {
    var root = document.getElementById(ROOT_ID);
    var modal = root && root.querySelector('[data-r2-yc-modal]');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.documentElement.classList.remove('pmd-r2-yc-modal-open');
  }
  function saveModalNote(remove) {
    var root = ensureRoot();
    var modal = root.querySelector('[data-r2-yc-modal]');
    var input = root.querySelector('[data-r2-yc-modal-input]');
    var map = notes();
    var key = modal.dataset.date;
    var value = clean(input.value);
    if (remove || !value) delete map[key]; else map[key] = value;
    saveNotes(map); closeNoteModal(); render(root);
  }

  function bindCalendarRoot(root) {
    root.addEventListener('click', function (event) {
      var previous = event.target.closest('[data-r2-yc-prev]');
      var next = event.target.closest('[data-r2-yc-next]');
      var viewButton = event.target.closest('[data-r2-yc-view]');
      var filterButton = event.target.closest('[data-r2-yc-filter]');
      var noteButton = event.target.closest('[data-r2-yc-note]');
      var day = event.target.closest('[data-r2-yc-date]');
      var clearSelection = event.target.closest('[data-r2-yc-clear-selection]');
      var previousDay = event.target.closest('[data-r2-yc-prev-day]');
      var nextDay = event.target.closest('[data-r2-yc-next-day]');
      var editButton = event.target.closest('[data-pmd-res-lab-edit]');
      var slotCreate = event.target.closest('[data-pmd-res-lab-slot-create]');
      var modalClose = event.target.closest('[data-r2-yc-modal-close]');
      var modalSave = event.target.closest('[data-r2-yc-modal-save]');
      var modalDelete = event.target.closest('[data-r2-yc-modal-delete]');

      if (previous) { if (view === 'month') { month -= 1; if (month < 0) { month = 11; year -= 1; } } else year -= 1; render(root); return; }
      if (next) { if (view === 'month') { month += 1; if (month > 11) { month = 0; year += 1; } } else year += 1; render(root); return; }
      if (viewButton) { view = viewButton.dataset.r2YcView; selectedDate = null; render(root); return; }
      if (filterButton) { filter = filterButton.dataset.r2YcFilter; render(root); return; }
      if (noteButton) { openNoteModal(selectedDate || dateKey(new Date())); return; }
      if (clearSelection) { selectedDate = null; render(root); return; }
      if (previousDay) { shiftSelectedDay(-1); return; }
      if (nextDay) { shiftSelectedDay(1); return; }
      if (day) {
        selectedDate = String(day.dataset.r2YcDate || '');
        var selected = parseDateKey(selectedDate); year = selected.getFullYear(); month = selected.getMonth();
        render(root); return;
      }
      if (editButton) { event.preventDefault(); openComposer('edit', editButton.getAttribute('data-pmd-res-lab-edit'), selectedDate, ''); return; }
      if (slotCreate) {
        var slot = slotCreate.closest('[data-pmd-res-lab-slot-date][data-pmd-res-lab-slot-time]');
        if (slot) openComposer('create', null, slot.getAttribute('data-pmd-res-lab-slot-date'), slot.getAttribute('data-pmd-res-lab-slot-time'));
        return;
      }
      if (modalClose) { closeNoteModal(); return; }
      if (modalSave) { saveModalNote(false); return; }
      if (modalDelete) { saveModalNote(true); return; }
    });
  }

  function setMode(on) {
    calendarMode = Boolean(on);
    var root = ensureRoot();
    var toggle = document.getElementById(TOGGLE_ID);
    page.classList.toggle('is-calendar-mode', calendarMode);
    if (toggle) {
      toggle.classList.toggle('is-active', calendarMode);
      toggle.setAttribute('aria-pressed', calendarMode ? 'true' : 'false');
    }
    if (calendarMode) {
      root.hidden = false;
      root.classList.add('is-visible');
      render(root);
    } else {
      selectedDate = null;
      page.classList.remove('pmd-r2-hour-layout-v38-active');
      root.classList.remove('is-visible', 'is-timeslot-screen');
      root.hidden = true;
    }
  }

  function bindHeaderToggle() {
    var toggle = document.getElementById(TOGGLE_ID);
    if (!toggle || toggle.getAttribute('data-pmd-reservationslab-calendar-bound') === '1') return false;
    toggle.setAttribute('data-pmd-reservationslab-calendar-bound', '1');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', text('calendar','Calendar'));
    toggle.setAttribute('title', text('calendar','Calendar'));
    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setMode(!calendarMode);
    });
    return true;
  }

  function request(handler, data) {
    interactionNetworkRequests += 1;
    return fetch('/admin/reservationslab', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Accept':'application/json','Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf(),'X-IGNITER-REQUEST-HANDLER':handler},
      body: JSON.stringify(data || {})
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.success === false) {
          var message = json && json.error && json.error.message ? json.error.message : text('load_failed','Request failed.');
          var error = new Error(message); error.response = json; throw error;
        }
        return json;
      });
    });
  }
  function clearComposerError() { if (!errorNode) return; errorNode.hidden = true; errorNode.textContent = ''; }
  function showComposerError(error) { if (!errorNode) return; errorNode.hidden = false; errorNode.textContent = error && error.message ? error.message : text('save_failed','The reservation could not be saved.'); }
  function setAvailability(message, ok) {
    if (!availabilityNode) return; availabilityNode.textContent = message || '';
    availabilityNode.classList.toggle('is-ok', ok === true); availabilityNode.classList.toggle('is-error', ok === false);
  }
  function assignmentMode() { var checked = form.querySelector('[name="assignment_mode"]:checked'); return checked ? String(checked.value || '') : 'auto'; }
  function syncTableField() { if (tableField) tableField.hidden = assignmentMode() !== 'choose'; }
  function formPayload() {
    var data = {}, tables = [];
    new FormData(form).forEach(function (value, key) { if (key === 'tables[]') tables.push(Number(value)); else data[key] = value; });
    data.tables = tables.filter(function (id) { return Number.isFinite(id) && id > 0; });
    data.first_name = String(data.first_name || '').replace(/\s+/g, ' ').trim(); data.last_name = '';
    data.telephone = String(data.telephone || '').trim(); data.email = String(data.email || '').trim();
    data.guest_num = Math.max(1, Number(data.guest_num || 1)); data.duration = Math.max(1, Number(data.duration || 45)); data.notify = 0;
    ['reservation_id','location_id','occasion_id'].forEach(function (key) { if (data[key] === '' || data[key] == null) delete data[key]; else data[key] = Number(data[key]); });
    return data;
  }
  function populateTables(tables, selectedIds) {
    var select = form.querySelector('[name="tables[]"]'); if (!select) return;
    var selected = (selectedIds || []).map(Number); select.replaceChildren();
    (Array.isArray(tables) ? tables : []).forEach(function (table) {
      var option = document.createElement('option'); option.value = String(table.table_id || '');
      option.textContent = String(table.table_name || ('Table ' + table.table_id)) + ' (' + String(table.min_capacity || 0) + '–' + String(table.max_capacity || 0) + ')';
      option.selected = selected.indexOf(Number(table.table_id || 0)) >= 0; select.appendChild(option);
    });
  }
  function populateComposer(data) {
    var reservation = data.reservation || null; var values = reservation || data.defaults || {};
    var name = [values.first_name || '', values.last_name || ''].join(' ').replace(/\s+/g, ' ').trim();
    var fields = {first_name:name,telephone:values.telephone || '',email:values.email || '',guest_num:values.guest_num || 1,reserve_date:values.reserve_date || selectedDate || boot.today || '',reserve_time:String(values.reserve_time || '').slice(0,5),duration:values.duration || 45,comment:values.comment || '',location_id:values.location_id || data.locationId || data.location_id || '',occasion_id:values.occasion_id || 0,reservation_id:reservation ? (reservation.reservation_id || activeReservationId || '') : '',source:'reservationslab'};
    Object.keys(fields).forEach(function (key) { if (form.elements[key]) form.elements[key].value = fields[key]; });
    if (form.elements.last_name) form.elements.last_name.value = ''; if (form.elements.notify) form.elements.notify.value = '0';
    var selected = reservation && Array.isArray(reservation.tables) ? reservation.tables.map(function (table) { return Number(table.table_id || 0); }).filter(Boolean) : (Array.isArray((data.defaults || {}).tables) ? data.defaults.tables.map(Number).filter(Boolean) : []);
    populateTables(data.tables, selected);
    var mode = reservation ? (selected.length ? 'choose' : 'later') : String((data.defaults || {}).assignment_mode || 'auto');
    var radio = form.querySelector('[name="assignment_mode"][value="' + mode.replace(/[^a-z]/g,'') + '"]'); if (radio) radio.checked = true;
    syncTableField(); setAvailability('', null);
    var title = composer.querySelector('[data-pmd-res-lab-composer-title]'); if (title) title.textContent = reservation ? text('edit_reservation','Edit reservation') : text('new_reservation','New reservation');
  }
  function openComposer(mode, reservationId, date, time) {
    activeComposerMode = mode === 'edit' ? 'edit' : 'create'; activeReservationId = reservationId ? Number(reservationId) : null;
    clearComposerError(); setAvailability(text('loading','Loading reservation…'), null); composer.hidden = false; document.body.classList.add('pmd-reservations-lab-composer-open');
    return request('onLoadReservationComposer', {mode:activeComposerMode,reservation_id:activeReservationId,source:'reservationslab',selected_date:String(date || selectedDate || boot.today || ''),selected_time:String(time || ''),table_ids:[],location_id:null})
      .then(populateComposer).catch(function (error) { showComposerError(error); setAvailability('', null); });
  }
  function closeComposer() { composer.hidden = true; document.body.classList.remove('pmd-reservations-lab-composer-open'); clearComposerError(); setAvailability('', null); }
  function checkAvailability() {
    clearComposerError(); var data = formPayload();
    if (!data.reserve_date || !data.reserve_time || !data.guest_num || !data.duration) { setAvailability(text('availability_requirements','Choose date, time, duration and guests.'), false); return; }
    setAvailability(text('checking','Checking availability…'), null);
    request('onCheckReservationAvailability', data).then(function (response) {
      var result = response.availability || {}; var available = Boolean(result.available); var recommended = Array.isArray(result.recommendedTableIds) ? result.recommendedTableIds : [];
      var message = available ? text('available','Available') : text('not_available','Not available');
      if (available && recommended.length) message += ' · ' + text('recommended_tables','Recommended tables') + ': ' + recommended.join(', ');
      setAvailability(message, available);
      if (assignmentMode() === 'choose') {
        var allowed = Array.isArray(result.manualAvailableTableIds) && result.manualAvailableTableIds.length ? result.manualAvailableTableIds.map(Number) : (Array.isArray(result.availableTableIds) ? result.availableTableIds.map(Number) : []);
        if (allowed.length) { var select = form.querySelector('[name="tables[]"]'); if (select) Array.prototype.forEach.call(select.options, function (option) { option.disabled = allowed.indexOf(Number(option.value)) < 0 && !option.selected; }); }
      }
    }).catch(function (error) { setAvailability(error.message || text('not_available','Not available'), false); });
  }
  function saveReservation(event) {
    event.preventDefault(); clearComposerError(); if (saveButton) saveButton.disabled = true;
    request('onSaveReservationComposer', formPayload()).then(function () { window.location.reload(); }).catch(function (error) { showComposerError(error); if (saveButton) saveButton.disabled = false; });
  }

  composer.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-res-lab-close]')) { closeComposer(); return; }
    if (event.target.closest('[data-pmd-res-lab-check]')) checkAvailability();
  });
  form.addEventListener('change', function (event) { if (event.target && event.target.name === 'assignment_mode') { syncTableField(); setAvailability('', null); } });
  form.addEventListener('submit', saveReservation);

  bindHeaderToggle();

  window.PMDReservationsLabScheduleV1 = {
    version: '2.4.0',
    openCalendar: function () { setMode(true); },
    closeCalendar: function () { setMode(false); },
    audit: function () {
      var root = document.getElementById(ROOT_ID);
      return {
        route: route,
        sourceVisualAuthority: 'live Reservations2 calendar-toggle-v1.css',
        floorInitial: true,
        calendarMode: calendarMode,
        selectedDate: selectedDate,
        calendarRoot: Boolean(root),
        calendarVisible: Boolean(root && !root.hidden && !selectedDate),
        hourVisible: Boolean(root && !root.hidden && selectedDate),
        exactMonthClass: Boolean(root && root.querySelector('.pmd-yc-month')),
        exactHourClass: Boolean(root && root.querySelector('.pmd-r2-timeslot-screen')),
        reservationCount: reservations.length,
        interactionRenderWrites: interactionRenderWrites,
        interactionNetworkRequests: interactionNetworkRequests,
        bootNetworkRequests: 0,
        bootLayoutRenderWrites: 0,
        composerEndpoint: '/admin/reservationslab'
      };
    }
  };
})();
