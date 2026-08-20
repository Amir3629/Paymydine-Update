/* PMD_RESERVATIONS_LAB_EXACT_RESERVATIONS2_CALENDAR_HOUR_V2_4
 * Reservations Lab uses the captured live Reservations2 Calendar/Hour DOM contract.
 * Floor is initial. Existing header calendar control opens the exact Calendar surface.
 * Selecting a Calendar day opens the exact Reservations2 Hour/Timeslot screen.
 * Interaction-only rendering; no delayed or observing layout authority.
 */
(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  /*
   * PMD_RESERVATIONSLAB_MANAGERLAB_SHARED_HOST_V3
   *
   * ONE Calendar/Hour runtime.
   * Hosts:
   * - ReservationsLab
   * - DashboardLab
   * - ManagerLab
   */
  if (
    route !== '/admin/reservationslab'
    && route !== '/admin/dashboardlab'
    && route !== '/admin/managerlab'
    && route !== '/admin/cashierlab'
  ) return;

  var PAGE_ID = 'pmd-dashboard-lab';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var ROOT_ID = 'pmd-r2-calendar-surface-v160';
  var TOGGLE_ID = 'pmd-dashboard-lab-calendar-v4';
  var HEADER_CREATE_ID = 'pmd-reservations-lab-header-create-v1';
  var NOTE_KEY = 'pmd.yearCalendar.notes.v1';

  var page = document.getElementById(PAGE_ID);
  var floor = document.getElementById(FLOOR_ID);
  var bootNode = document.getElementById('pmd-reservations-lab-schedule-bootstrap-v1');
  if (!page || !floor || !bootNode) return;

  var boot = {};
  try { boot = JSON.parse(bootNode.textContent || '{}') || {}; } catch (error) { boot = {}; }

  var strings = boot.strings || {};
  var locale = String(boot.locale || 'en').toLowerCase() === 'de' ? 'de' : 'en';
  var localeTag = String(boot.locale_tag || (locale === 'de' ? 'de-DE' : 'en-GB'));

  /*
   * PMD_CALENDAR_LOCALE_CANONICAL_UI_V4_START
   *
   * Active locale owns visible Calendar/Hour UI copy.
   *
   * Preserve unknown backend/service keys, but do not allow
   * stale strings from another locale to override UI labels.
   */
  var pmdCalendarLocaleStrings = {
    en: {
      reservation: 'Reservation',
      reservations: 'Reservations',
      reservation_lower: 'reservation',
      reservations_title: 'Reservations',

      new_reservation: 'New reservation',
      edit_reservation: 'Edit reservation',

      name: 'Name',
      phone_optional: 'Phone (optional)',
      email_optional: 'Email (optional)',

      guests: 'Guests',
      guest: 'Guest',

      date: 'Reservation date',
      time: 'Reservation time',
      duration: 'Duration',

      table_assignment: 'Table assignment',
      auto_assign: 'Auto assign',
      choose_tables: 'Choose table(s)',
      assign_later: 'Assign later',

      tables: 'Tables',
      table: 'Table',
      no_table: 'No table',

      check_availability: 'Check availability',

      notes: 'Notes',
      note: 'Note',

      event: 'Event',
      events: 'Events',

      calendar: 'Calendar',

      year: 'Year',
      month: 'Month',
      all: 'All',

      previous: 'Previous',
      next: 'Next',

      day_note: 'Day note',
      write_note: 'Write a note for this day',

      delete: 'Delete',
      cancel: 'Cancel',
      close: 'Close',

      save_note: 'Save note',
      save: 'Save reservation',

      loading: 'Loading reservation…',
      checking: 'Checking availability…',

      available: 'Available',
      not_available: 'Not available',

      availability_requirements:
        'Choose date, time, duration and guests.',

      recommended_tables: 'Recommended tables',
      no_reservations: 'No reservations',

      booking: 'Reservation',
      bookings: 'Reservations',

      time_slots: 'Time slots',
      time_not_set: 'Time not set',

      open: 'Open',
      scheduled: 'Scheduled',

      load_failed: 'Request failed.',

      save_failed:
        'The reservation could not be saved.',

      past_slot: 'Past time',

      future_only:
        'Reservations cannot be created in the past.',

      restaurant_closed: 'Restaurant closed',

      outside_opening_hours:
        'Outside opening hours'
    },

    de: {
      reservation: 'Reservierung',
      reservations: 'Reservierungen',
      reservation_lower: 'Reservierung',
      reservations_title: 'Reservierungen',

      new_reservation: 'Neue Reservierung',
      edit_reservation: 'Reservierung bearbeiten',

      name: 'Name',
      phone_optional: 'Telefon (optional)',
      email_optional: 'E-Mail (optional)',

      guests: 'Gäste',
      guest: 'Gast',

      date: 'Reservierungsdatum',
      time: 'Reservierungszeit',
      duration: 'Dauer',

      table_assignment: 'Tischzuweisung',
      auto_assign: 'Automatisch zuweisen',
      choose_tables: 'Tisch(e) auswählen',
      assign_later: 'Später zuweisen',

      tables: 'Tische',
      table: 'Tisch',
      no_table: 'Kein Tisch',

      check_availability: 'Verfügbarkeit prüfen',

      notes: 'Notizen',
      note: 'Notiz',

      event: 'Ereignis',
      events: 'Ereignisse',

      calendar: 'Kalender',

      year: 'Jahr',
      month: 'Monat',
      all: 'Alle',

      previous: 'Zurück',
      next: 'Weiter',

      day_note: 'Tagesnotiz',

      write_note:
        'Notiz für diesen Tag schreiben',

      delete: 'Löschen',
      cancel: 'Abbrechen',
      close: 'Schließen',

      save_note: 'Notiz speichern',
      save: 'Reservierung speichern',

      loading: 'Reservierung wird geladen…',
      checking: 'Verfügbarkeit wird geprüft…',

      available: 'Verfügbar',
      not_available: 'Nicht verfügbar',

      availability_requirements:
        'Datum, Uhrzeit, Dauer und Gäste auswählen.',

      recommended_tables: 'Empfohlene Tische',
      no_reservations: 'Keine Reservierungen',

      booking: 'Reservierung',
      bookings: 'Reservierungen',

      time_slots: 'Zeitfenster',
      time_not_set: 'Keine Uhrzeit',

      open: 'Öffnen',
      scheduled: 'Geplant',

      load_failed: 'Anfrage fehlgeschlagen.',

      save_failed:
        'Die Reservierung konnte nicht gespeichert werden.',

      past_slot: 'Vergangene Uhrzeit',

      future_only:
        'Reservierungen können nicht in der Vergangenheit erstellt werden.',

      restaurant_closed: 'Restaurant geschlossen',

      outside_opening_hours:
        'Außerhalb der Öffnungszeiten'
    }
  };

  if (
    !strings
    || typeof strings !== 'object'
    || Array.isArray(strings)
  ) {
    strings = {};
  }

  var pmdCalendarLocaleOwnedStrings =
    pmdCalendarLocaleStrings[locale]
    || pmdCalendarLocaleStrings.en;

  Object.keys(
    pmdCalendarLocaleOwnedStrings
  ).forEach(function (key) {
    strings[key] =
      pmdCalendarLocaleOwnedStrings[key];
  });

  /*
   * PMD_CALENDAR_LOCALE_CANONICAL_UI_V4_END
   */

  var reservations = Array.isArray(boot.reservations) ? boot.reservations.slice() : [];
  var calendarMode = false;
  var selectedDate = null;
  var year = Number(boot.year || new Date().getFullYear());
  var month = Math.max(0, Number(boot.month || (new Date().getMonth() + 1)) - 1);
  var view = 'month';
  var filter = 'all';
  var interactionRenderWrites = 0;
  var interactionNetworkRequests = 0;

  /* PMD_RESERVATIONSLAB_FUTURE_BOOKING_POLICY_V1
   * Server-seeded Europe/Berlin clock. Past Calendar days stay viewable for
   * history, but create actions are available only at/after the next 15-minute
   * booking boundary. No timer/polling authority is introduced.
   */
  var pmdBerlinSeedEpoch = Date.parse(String(boot.server_now_berlin || ''));
  if (!Number.isFinite(pmdBerlinSeedEpoch)) pmdBerlinSeedEpoch = Date.now();
  var pmdBerlinClientSeedEpoch = Date.now();
  var pmdBerlinFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  function berlinClockParts() {
    var instant = new Date(
      pmdBerlinSeedEpoch + Math.max(0, Date.now() - pmdBerlinClientSeedEpoch)
    );
    var result = {};
    pmdBerlinFormatter.formatToParts(instant).forEach(function (part) {
      if (part.type !== 'literal') result[part.type] = part.value;
    });
    return {
      year: Number(result.year || 0),
      month: Number(result.month || 0),
      day: Number(result.day || 0),
      hour: Number(result.hour || 0),
      minute: Number(result.minute || 0),
      second: Number(result.second || 0)
    };
  }

  function bookingDateKey(parts) {
    return String(parts.year) + '-' + pad(parts.month) + '-' + pad(parts.day);
  }

  function nextDateKey(key) {
    var parts = String(key || '').split('-').map(Number);
    var date = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    return dateKey(date);
  }

  function minimumBookableMoment() {
    var now = berlinClockParts();
    var date = bookingDateKey(now);
    var rawMinutes = now.hour * 60 + now.minute + (now.second > 0 ? 1 : 0);
    var rounded = Math.ceil(rawMinutes / 15) * 15;
    if (rounded >= 1440) {
      return {date: nextDateKey(date), time: '00:00', minutes: 0};
    }
    return {date: date, time: minuteLabel(rounded), minutes: rounded};
  }

  function isBookableMoment(date, time) {
    var day = String(date || '');
    var clock = String(time || '').slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return false;
    var minimum = minimumBookableMoment();
    return day > minimum.date || (day === minimum.date && clock >= minimum.time);
  }


  /* PMD_RESERVATIONSLAB_OPENING_HOURS_V1
   * Single read authority: boot.opening_hours comes from working_hours, the
   * exact table written by PMD Settings. Empty bootstrap means legacy/no
   * configured policy and therefore does not invent a closure window. */
  var pmdOpeningHours = Array.isArray(boot.opening_hours)
    ? boot.opening_hours.map(function (row) {
        return {
          weekday: Number(row && row.weekday),
          enabled: Boolean(row && row.enabled),
          opening_time: String((row && row.opening_time) || '').slice(0, 5),
          closing_time: String((row && row.closing_time) || '').slice(0, 5)
        };
      }).filter(function (row) {
        return row.weekday >= 0 && row.weekday <= 6;
      })
    : [];

  function pmdOpeningHoursConfigured() {
    return pmdOpeningHours.length > 0;
  }

  function pmdClockMinutes(value) {
    var match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function pmdWeekdayForDate(key) {
    var parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return (date.getUTCDay() + 6) % 7; // PMD: Monday=0 ... Sunday=6
  }

  function pmdOpeningRow(weekday) {
    for (var index = pmdOpeningHours.length - 1; index >= 0; index -= 1) {
      if (Number(pmdOpeningHours[index].weekday) === Number(weekday)) return pmdOpeningHours[index];
    }
    return null;
  }

  function pmdOpeningIntervalsForDate(key) {
    if (!pmdOpeningHoursConfigured()) return [[0, 1440]];
    var weekday = pmdWeekdayForDate(key);
    if (weekday === null) return [];
    var intervals = [];
    var current = pmdOpeningRow(weekday);
    var previous = pmdOpeningRow((weekday + 6) % 7);

    if (previous && previous.enabled) {
      var previousOpen = pmdClockMinutes(previous.opening_time);
      var previousClose = pmdClockMinutes(previous.closing_time);
      if (previousOpen !== null && previousClose !== null && previousClose < previousOpen && previousClose > 0) {
        intervals.push([0, previousClose]);
      }
    }

    if (current && current.enabled) {
      var opening = pmdClockMinutes(current.opening_time);
      var closing = pmdClockMinutes(current.closing_time);
      if (opening !== null && closing !== null) {
        if (opening === closing) intervals.push([0, 1440]);
        else if (closing > opening) intervals.push([opening, closing]);
        else intervals.push([opening, 1440]);
      }
    }

    intervals.sort(function (left, right) { return left[0] - right[0]; });
    return intervals;
  }

  function pmdIsOpeningStart(date, time) {
    if (!pmdOpeningHoursConfigured()) return true;
    var minutes = pmdClockMinutes(String(time || '').slice(0, 5));
    if (minutes === null) return false;
    return pmdOpeningIntervalsForDate(date).some(function (interval) {
      return minutes >= interval[0] && minutes < interval[1];
    });
  }

  function pmdOpeningAllowsReservation(date, time, duration) {
    if (!pmdOpeningHoursConfigured()) return true;
    var weekday = pmdWeekdayForDate(date);
    var start = pmdClockMinutes(String(time || '').slice(0, 5));
    if (weekday === null || start === null) return false;
    var end = start + Math.max(1, Number(duration || 45));
    var current = pmdOpeningRow(weekday);
    var previous = pmdOpeningRow((weekday + 6) % 7);

    if (previous && previous.enabled) {
      var previousOpen = pmdClockMinutes(previous.opening_time);
      var previousClose = pmdClockMinutes(previous.closing_time);
      if (previousOpen !== null && previousClose !== null && previousClose < previousOpen && start < previousClose && end <= previousClose) {
        return true;
      }
    }

    if (!current || !current.enabled) return false;
    var opening = pmdClockMinutes(current.opening_time);
    var closing = pmdClockMinutes(current.closing_time);
    if (opening === null || closing === null) return false;
    if (opening === closing) return true;
    if (closing <= opening) closing += 1440;
    return start >= opening && end <= closing;
  }

  function pmdDateHasOpeningWindow(date) {
    if (!pmdOpeningHoursConfigured()) return true;
    return pmdOpeningIntervalsForDate(date).length > 0;
  }

  /* PMD_RESERVATIONSLAB_LAST_SLOT_DURATION_CONTEXT_V1_20260815
   * Hour-view create eligibility is based on whether ANY canonical Composer
   * duration can fit, not whether the historical default 45 minutes fits.
   * This keeps a closing-edge slot such as 21:30 clickable when 30 minutes
   * still fits before closing.
   */
  function pmdComposerDurationOptions() {
    var select = document.querySelector(
      '#pmd-reservation-composer-v1 select[name="duration"]'
    );
    var values = select
      ? Array.prototype.map.call(select.options, function (option) {
          return Number(option.value || 0);
        })
      : [];

    values = values.filter(function (value, index, list) {
      return Number.isFinite(value)
        && value > 0
        && list.indexOf(value) === index;
    }).sort(function (left, right) {
      return left - right;
    });

    return values.length
      ? values
      : [30, 45, 60, 75, 90, 120, 150, 180];
  }

  function pmdPreferredDurationForSlot(date, time) {
    var options = pmdComposerDurationOptions();

    if (options.indexOf(45) >= 0
        && pmdOpeningAllowsReservation(date, time, 45)) {
      return 45;
    }

    for (var index = 0; index < options.length; index += 1) {
      if (pmdOpeningAllowsReservation(date, time, options[index])) {
        return options[index];
      }
    }

    return null;
  }

  function pmdCanCreateAt(date, time) {
    return isBookableMoment(date, time)
      && pmdPreferredDurationForSlot(date, time) !== null;
  }

  var monthNames = locale === 'de'
    ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var weekNames = locale === 'de'
    ? [
        'Mo',
        'Di',
        'Mi',
        'Do',
        'Fr',
        'Sa',
        'So'
      ]
    : [
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun'
      ];

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
    var value = clean(raw || item.status_name || item.state || '');
    var normalized = value.toLowerCase();

    if (locale === 'de') {
      if (/cancel|canceled|cancelled|storn|declin|reject/.test(normalized)) return 'Storniert';
      if (/pending|request|wait|aussteh|wart/.test(normalized)) return 'Ausstehend';
      if (/confirm|approved|bestät/.test(normalized)) return 'Bestätigt';
      if (/seat|arriv|platziert|angekommen/.test(normalized)) return 'Angekommen';
      if (/complete|finished|abgesch/.test(normalized)) return 'Abgeschlossen';
      if (/no.?show|nicht erschienen/.test(normalized)) return 'Nicht erschienen';
      if (/received|scheduled|geplant|eingegang/.test(normalized)) return 'Geplant';
      return value || text('scheduled', 'Geplant');
    }

    if (/storn/.test(normalized)) return 'Cancelled';
    if (/aussteh|wart/.test(normalized)) return 'Pending';
    if (/bestät/.test(normalized)) return 'Confirmed';
    if (/angekommen|platziert/.test(normalized)) return 'Arrived';
    if (/abgesch/.test(normalized)) return 'Completed';
    return value || text('scheduled', 'Scheduled');
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
      var minimum = minimumBookableMoment();
      var isPastDate = key < minimum.date;
      var isClosedDate = !pmdDateHasOpeningWindow(key);
      var closedTitle = text('restaurant_closed', locale === 'de' ? 'Restaurant geschlossen' : 'Restaurant closed');
      cells.push('<button type="button" class="pmd-yc-day' + (!inside ? ' is-outside' : '') + (key === bookingDateKey(berlinClockParts()) ? ' is-today' : '') + (key === selectedDate ? ' is-selected' : '') + (isPastDate ? ' is-past-date' : '') + (isClosedDate ? ' is-closed-date' : '') + '" data-r2-yc-date="' + key + '"' + (isPastDate ? ' data-pmd-res-past-date="1"' : '') + (isClosedDate ? ' data-pmd-res-closed-date="1" disabled aria-disabled="true" title="' + esc(closedTitle) + '"' : (isPastDate ? ' title="' + esc(text('past_slot', locale === 'de' ? 'Vergangene Uhrzeit' : 'Past time')) + ' · ' + esc(text('future_only', locale === 'de' ? 'Reservierungen können nicht in der Vergangenheit erstellt werden.' : 'Reservations cannot be created in the past.')) + '"' : '')) + '><span class="pmd-yc-day__number">' + date.getDate() + '</span><span class="pmd-yc-day__operations' + (large ? '' : ' is-dot-mode') + '">' + body + '</span></button>');
    }
    return '<section class="pmd-yc-month' + (large ? ' is-month-view' : ' is-year-card') + '"><div class="pmd-yc-month__head"><h2>' + esc(monthNames[monthIndex] + ' ' + year) + '</h2></div><div class="pmd-yc-weekdays">' + weekNames.map(function (name) { return '<span>' + esc(name) + '</span>'; }).join('') + '</div><div class="pmd-yc-days">' + cells.join('') + '</div></section>';
  }

  function bookingChip(item) {
    var table = reservationTable(item);
    var status = reservationStatus(item);
    var guests = guestCount(item);
    var id = reservationId(item);
    return '<article class="pmd-r2-slot-booking ' + statusClass(status) + '" data-pmd-res-lab-exact-booking="' + esc(id) + '" data-pmd-res-lab-edit="' + esc(id) + '" role="button" tabindex="0">' +
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
    var configuredOpeningHours = pmdOpeningHoursConfigured();
    var openingIntervals = pmdOpeningIntervalsForDate(selectedDate);
    var slotMinuteMap = {};

    if (configuredOpeningHours) {
      openingIntervals.forEach(function (interval) {
        var first = Math.ceil(interval[0] / 30) * 30;
        for (var minute = first; minute < interval[1] && minute < 1440; minute += 30) {
          slotMinuteMap[minute] = true;
        }
      });
    } else {
      for (var legacyMinute = 600; legacyMinute <= 1320; legacyMinute += 30) {
        slotMinuteMap[legacyMinute] = true;
      }
    }

    // Existing reservations remain visible for history even if restaurant
    // opening hours were later changed around them.
    known.forEach(function (minute) {
      slotMinuteMap[Math.floor(minute / 30) * 30] = true;
    });

    var slotMinutes = Object.keys(slotMinuteMap).map(Number).sort(function (a, b) { return a - b; });
    var rows = [];

    if (!slotMinutes.length && configuredOpeningHours) {
      rows.push('<section class="pmd-r2-timeslot-closed-message"><strong>' + esc(text('restaurant_closed', locale === 'de' ? 'Restaurant geschlossen' : 'Restaurant closed')) + '</strong><span>' + esc(text('outside_opening_hours', locale === 'de' ? 'Außerhalb der Öffnungszeiten' : 'Outside opening hours')) + '</span></section>');
    }

    slotMinutes.forEach(function (cursor) {
      var bookings = slots[String(cursor)] || [];
      var slotClock = minuteLabel(cursor);
      var futureSlot = isBookableMoment(selectedDate, slotClock);
      /* PMD_RESERVATIONSLAB_SLOT_ANY_DURATION_FIT_V1_20260815
       * A slot remains a create target when at least one canonical Composer
       * duration can fully fit before closing. If 45 minutes no longer fits,
       * the click context carries the nearest supported fitting duration
       * (for example 30 minutes at 21:30 before a 22:00 close). */
      var openingSlot = pmdIsOpeningStart(selectedDate, slotClock);
      var preferredSlotDuration = pmdPreferredDurationForSlot(
        selectedDate,
        slotClock
      );
      var openingDurationFits = preferredSlotDuration !== null;
      var bookableSlot = futureSlot && openingDurationFits;
      var pastSlot = !futureSlot;
      var closedSlot = configuredOpeningHours && !openingDurationFits;
      var createLabel = pastSlot
        ? text('future_only', locale === 'de' ? 'Reservierungen können nicht in der Vergangenheit erstellt werden.' : 'Reservations cannot be created in the past.')
        : (closedSlot
          ? text('outside_opening_hours', locale === 'de' ? 'Außerhalb der Öffnungszeiten' : 'Outside opening hours')
          : text('new_reservation','New reservation') + ' ' + slotClock);
      rows.push('<section class="pmd-r2-timeslot ' + (bookings.length ? 'has-bookings' : 'is-empty') + (pastSlot ? ' is-past-slot' : '') + (closedSlot ? ' is-closed-slot' : '') + '" data-pmd-res-lab-slot-date="' + esc(selectedDate) + '" data-pmd-res-lab-slot-time="' + slotClock + '" data-pmd-res-lab-bookable="' + (bookableSlot ? '1' : '0') + '">' +
        '<div class="pmd-r2-timeslot__time"><strong>' + slotClock + '</strong><span>' + (bookings.length ? bookings.length + ' ' + esc(bookings.length === 1 ? text('booking','booking') : text('bookings','bookings')) : esc(closedSlot ? text('restaurant_closed', locale === 'de' ? 'Restaurant geschlossen' : 'Restaurant closed') : text('available','Available'))) + '</span></div>' +
        '<div class="pmd-r2-timeslot__content">' +
          (bookings.length ? bookings.map(bookingChip).join('') : '<div class="pmd-r2-timeslot__free"><i></i><span>' + esc(closedSlot ? text('restaurant_closed', locale === 'de' ? 'Restaurant geschlossen' : 'Restaurant closed') : text('no_reservations','No reservations')) + '</span></div>') +
          '<button type="button" class="pmd-r2-timeslot__create-button" data-pmd-res-lab-slot-create aria-label="' + esc(createLabel) + '" title="' + esc(createLabel) + '"' + (!bookableSlot ? ' disabled aria-disabled="true"' : '') + '>+</button>' +
        '</div></section>');
    });
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
    var direction = delta < 0 ? -1 : 1;
    for (var attempt = 0; attempt < 370; attempt += 1) {
      target.setDate(target.getDate() + direction);
      var candidate = dateKey(target);
      if (pmdDateHasOpeningWindow(candidate)) {
        selectedDate = candidate;
        year = target.getFullYear();
        month = target.getMonth();
        render(ensureRoot());
        return;
      }
    }
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
      var bookingCard = event.target.closest('.pmd-r2-slot-booking[data-pmd-res-lab-edit]');
      var slotCreate = event.target.closest('[data-pmd-res-lab-slot-create]');
      var slotRow = event.target.closest('[data-pmd-res-lab-slot-date][data-pmd-res-lab-slot-time]');
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
        if (day.disabled || day.getAttribute('aria-disabled') === 'true' || day.getAttribute('data-pmd-res-closed-date') === '1') return;
        selectedDate = String(day.dataset.r2YcDate || '');
        if (!pmdDateHasOpeningWindow(selectedDate)) return;
        var selected = parseDateKey(selectedDate); year = selected.getFullYear(); month = selected.getMonth();
        render(root); return;
      }
      if (editButton || bookingCard) {
        event.preventDefault();
        var editOrigin = editButton || bookingCard;
        openComposer('edit', editOrigin.getAttribute('data-pmd-res-lab-edit'), selectedDate, '', editOrigin);
        return;
      }
      if (slotCreate) {
        var slot = slotCreate.closest('[data-pmd-res-lab-slot-date][data-pmd-res-lab-slot-time]');
        var slotDate = slot && slot.getAttribute('data-pmd-res-lab-slot-date');
        var slotTime = slot && slot.getAttribute('data-pmd-res-lab-slot-time');
        if (slotCreate.disabled || slotCreate.getAttribute('aria-disabled') === 'true' || !pmdCanCreateAt(slotDate, slotTime)) return;
        if (slot) openComposer('create', null, slotDate, slotTime, slotCreate);
        return;
      }
      if (slotRow && slotRow.getAttribute('data-pmd-res-lab-bookable') === '1') {
        // Time cell and unused row surface are first-class create targets.
        // Interactive controls and reservation cards keep their own action.
        if (!event.target.closest('a,button,input,select,textarea,label') && !event.target.closest('.pmd-r2-slot-booking')) {
          openComposer(
            'create',
            null,
            slotRow.getAttribute('data-pmd-res-lab-slot-date'),
            slotRow.getAttribute('data-pmd-res-lab-slot-time'),
            slotRow
          );
          return;
        }
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

  function bindHeaderCreate() {
    // PMD_CASHIER_KEEP_NATIVE_HEADER_CREATE_V1
    if (route === '/admin/cashierlab') return false;
    var button = document.getElementById(HEADER_CREATE_ID);
    if (!button || button.getAttribute('data-pmd-reservationslab-create-bound') === '1') return false;

    button.setAttribute('data-pmd-reservationslab-create-bound', '1');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openComposer(
        'create',
        null,
        selectedDate || boot.today || '',
        '',
        button
      );
    });
    return true;
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

  /* PMD_RESERVATIONS_LAB_CANONICAL_COMPOSER_BRIDGE_V1
   * Reservations2 owns composer markup, styling, modal lifecycle,
   * Jade time wheel, smart assignment, availability and save behavior.
   * ReservationsLab supplies only context and its existing endpoint.
   */
  function composerFallback(mode, reservationId, date, time) {
    var id = Number(reservationId || 0);
    if (mode === 'edit' && id > 0) {
      return '/admin/reservations/edit/' + id;
    }

    var url = new URL('/admin/reservations/create', window.location.origin);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      url.searchParams.set('reserve_date', String(date));
    }
    if (/^([01]\d|2[0-3]):[0-5]\d/.test(String(time || ''))) {
      url.searchParams.set('reserve_time', String(time).slice(0, 5));
    }
    return url.pathname + url.search;
  }

  /* PMD_RESERVATIONSLAB_EXACT_R2_COMPOSER_RUNTIME_V2
   * The shared workspace now emits the literal Reservations2 Composer block
   * AFTER the Floor, with the same deferred canonical runtime. ReservationsLab
   * only supplies the click context; it does not load, restyle or reimplement
   * any Composer field behavior.
   */
  function canonicalComposerApi() {
    var api = window.PMDReservationComposerV1;
    return api && typeof api.open === 'function' ? api : null;
  }

  /* PMD_RESERVATIONSLAB_USER_CONTEXT_BRIDGE_V1
   * The exact Floor remains the selection authority. Reservation create entry
   * points read that already-selected table only at the moment the user acts.
   * No observer/timer/second Floor state is introduced. Canonical DB table IDs
   * come from the exact Floor runtime's dbTableId/raw.table_id mapping.
   */
  function activeFloorReservationContext() {
    var floorId = floor ? clean(floor.getAttribute('data-pmd-active-floor-id')) : '';
    var floorName = floor ? clean(floor.getAttribute('data-pmd-active-floor-name')) : '';
    if (floor && floor.__pmdSharedMultiFloorV1 && typeof floor.__pmdSharedMultiFloorV1.audit === 'function') {
      try {
        var audit = floor.__pmdSharedMultiFloorV1.audit() || {};
        floorId = floorId || clean(audit.activeFloorId);
        floorName = floorName || clean(audit.activeFloorName);
      } catch (ignore) {}
    }
    return { floorId: floorId, floorName: floorName };
  }

  function selectedFloorReservationContext() {
    /* PMD_RESERVATIONSLAB_FLOOR_DB_ID_CONTEXT_V1_3_20260815
     * The exact Floor has TWO identities:
     *   - table.id / data-floor-table = display/operational identity
     *   - table.dbTableId / raw.table_id = canonical database tables.table_id
     * Reservation Composer must receive ONLY the canonical database identity.
     * Resolve the selected display card through the exact Floor runtime state,
     * then map every selected member to dbTableId. Never send data-floor-table
     * directly to the reservation backend.
     */
    var activeFloor = activeFloorReservationContext();
    var api = window.PMDDashboardLabExactFloorV1;
    var instance = floor && floor.__pmdFloorV1 ? floor.__pmdFloorV1 : null;

    if (!instance && api && Array.isArray(api.instances)) {
      instance = api.instances.find(function (candidate) {
        return candidate && candidate.root === floor;
      }) || api.instances[0] || null;
    }

    var state = instance && typeof instance.getState === 'function'
      ? (instance.getState() || {})
      : {};
    var displayTables = Array.isArray(state.displayTables)
      ? state.displayTables
      : [];
    var selectedNode = floor
      ? floor.querySelector('.pmd-floor-v1__table.is-selected[data-floor-table]')
      : null;
    var selectedId = state.selectedDisplayId != null && String(state.selectedDisplayId) !== ''
      ? state.selectedDisplayId
      : (selectedNode ? selectedNode.getAttribute('data-floor-table') : null);
    var selected = displayTables.find(function (table) {
      return table && String(table.id) === String(selectedId == null ? '' : selectedId);
    }) || null;

    if (selected) {
      var members = selected.isMergedView && Array.isArray(selected.members)
        ? selected.members
        : [selected];
      var seen = {};
      var tableIds = [];
      var tableNames = [];

      members.forEach(function (table) {
        if (!table) return;
        var raw = table.raw && typeof table.raw === 'object' ? table.raw : {};
        var id = Number(table.dbTableId || raw.table_id || 0);
        if (!Number.isInteger(id) || id < 1 || seen[id]) return;
        seen[id] = true;
        tableIds.push(id);
        tableNames.push(clean(
          table.name ||
          raw.table_name ||
          raw.name ||
          ('Table ' + (table.number || id))
        ));
      });

      if (tableIds.length) {
        return {
          tableIds: tableIds,
          tableNames: tableNames,
          displayId: selected.id,
          merged: Boolean(selected.isMergedView),
          source: 'exact-floor-db-id',
          floorId: activeFloor.floorId,
          floorName: activeFloor.floorName,
          floorLocked: true
        };
      }
    }

    /* Secondary compatibility path only. This may serve another host that has
     * a Composer Floor reader but no exact Floor instance. ReservationsLab's
     * normal path above always uses exact Floor state + dbTableId. */
    var composerApi = canonicalComposerApi();
    if (composerApi && typeof composerApi.getFloorSelection === 'function') {
      var canonicalFloor = composerApi.getFloorSelection() || {};
      var canonicalIds = Array.isArray(canonicalFloor.ids)
        ? canonicalFloor.ids.map(Number).filter(function (id, index, list) {
            return Number.isInteger(id) && id > 0 && list.indexOf(id) === index;
          })
        : [];
      if (canonicalIds.length) {
        return {
          tableIds: canonicalIds,
          tableNames: Array.isArray(canonicalFloor.names) ? canonicalFloor.names.filter(Boolean) : [],
          displayId: selectedId,
          merged: canonicalIds.length > 1,
          source: 'composer-fallback',
          floorId: clean(canonicalFloor.floorId || activeFloor.floorId),
          floorName: clean(canonicalFloor.floorName || activeFloor.floorName),
          floorLocked: true
        };
      }
    }

    return {
      tableIds: [],
      tableNames: [],
      displayId: selectedId,
      merged: false,
      source: 'none',
      floorId: activeFloor.floorId,
      floorName: activeFloor.floorName,
      floorLocked: false
    };
  }

  function openComposer(mode, reservationId, date, time, origin) {
    var id = Number(reservationId || 0);
    var normalizedMode = mode === 'edit' && id > 0 ? 'edit' : 'create';
    var day = /^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))
      ? String(date)
      : String(selectedDate || boot.today || '');
    var clock = /^([01]\d|2[0-3]):[0-5]\d/.test(String(time || ''))
      ? String(time).slice(0, 5)
      : null;
    if (normalizedMode === 'create') {
      var minimum = minimumBookableMoment();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < minimum.date) day = minimum.date;
      if (clock && !isBookableMoment(day, clock)) return Promise.resolve(false);
    }
    var fallback = composerFallback(normalizedMode, id, day, clock);
    var floorContext = normalizedMode === 'create'
      ? selectedFloorReservationContext()
      : { tableIds: [], tableNames: [], displayId: null, merged: false, floorId: '', floorName: '', floorLocked: false };
    var isCardEdit = Boolean(
      normalizedMode === 'edit'
      && origin
      && origin.getAttribute
      && origin.getAttribute('data-pmd-res-lab-card-edit')
    );
    var source = normalizedMode === 'edit'
      ? (isCardEdit ? 'reservation-card' : 'hour-reservation')
      : (clock ? 'hour-slot' : 'header');
    var context = {
      version: 1,
      mode: normalizedMode,
      source: source,
      reservationId: normalizedMode === 'edit' ? id : null,
      selectedDate: day || null,
      selectedTime: clock,
      duration: normalizedMode === 'create' && clock
        ? pmdPreferredDurationForSlot(day, clock)
        : null,
      tableIds: floorContext.tableIds.slice(),
      tableNames: floorContext.tableNames.slice(),
      floorSelectionDisplayId: floorContext.displayId,
      floorSelectionMerged: floorContext.merged,
      floorId: floorContext.floorId || '',
      floorName: floorContext.floorName || '',
      floorLocked: Boolean(floorContext.floorLocked),
      locationId: null,
      returnView: selectedDate ? 'hour' : (calendarMode ? 'calendar' : 'floor'),
      fallbackUrl: fallback
    };

    var api = canonicalComposerApi();

    if (!api) {
      console.error('[PMD ReservationsLab] Canonical Reservations2 Composer runtime is unavailable');
      window.location.href = fallback;
      return Promise.resolve(false);
    }

    try {
      return api.open(context, origin || null).catch(function (error) {
        console.error('[PMD ReservationsLab] Canonical Reservations2 Composer open failed', error);
        var composerRoot = document.getElementById('pmd-reservation-composer-v1');
        if (!composerRoot || !composerRoot.classList.contains('show')) {
          window.location.href = fallback;
        }
        return false;
      });
    } catch (error) {
      console.error('[PMD ReservationsLab] Canonical Reservations2 Composer open failed', error);
      window.location.href = fallback;
      return Promise.resolve(false);
    }
  }

  /* PMD_RESERVATIONS_LAB_OPERATIONAL_CARDS_CLICK_V1
   * One direct interaction owner; no observer/timer/polling.
   */
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    var cardCreate = target ? target.closest('[data-pmd-res-lab-card-create]') : null;
    var cardEdit = target ? target.closest('[data-pmd-res-lab-card-edit]') : null;

    if (cardCreate) {
      event.preventDefault();
      openComposer(
        'create',
        null,
        cardCreate.getAttribute('data-pmd-res-lab-create-date') || boot.today || '',
        '',
        cardCreate
      );
      return;
    }

    if (!cardEdit) return;

    event.preventDefault();

    openComposer(
      'edit',
      cardEdit.getAttribute('data-pmd-res-lab-card-edit'),
      cardEdit.getAttribute('data-pmd-res-lab-card-date') || '',
      cardEdit.getAttribute('data-pmd-res-lab-card-time') || '',
      cardEdit
    );
  }, true);

  bindHeaderCreate();
  bindHeaderToggle();

  window.PMDReservationsLabScheduleV1 = {
    version: '2.8.1',
    assetAuthority: 'direct-cache-busted-hours-v1-4-1',
    openCalendar: function () { setMode(true); },
    closeCalendar: function () { setMode(false); },
    getSelectedFloorReservationContext: selectedFloorReservationContext,
    getOpeningHours: function () { return pmdOpeningHours.map(function (row) { return Object.assign({}, row); }); },
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
        assetAuthority: 'direct-cache-busted-hours-v1-4-1',
        runtimeVersion: '2.8.1',
        composerEndpoint: '/admin/reservations2',
        composerAuthority: 'literal Reservations2 post-Floor deferred runtime',
        composerBootAssetLoads: 0,
        minimumBookableMoment: minimumBookableMoment(),
        openingHoursConfigured: pmdOpeningHoursConfigured(),
        openingHours: pmdOpeningHours.slice(),
        pastCreateGuard: true,
        composerRuntimeReady: Boolean(window.PMDReservationComposerV1),
        selectedFloorReservationContext: selectedFloorReservationContext(),
        headerCreateReady: Boolean(document.getElementById(HEADER_CREATE_ID)),
        composerDynamicModules: {
          jadeV221: Boolean(window.PMDComposerStableJadeV221),
          layoutV222: Boolean(window.PMDComposerLayoutV222),
          compactV223: Boolean(window.PMDComposerCompactAssignmentV223),
          smartV224: Boolean(window.PMDSmartContextTablesV224),
          dropdownV225: Boolean(window.PMDComposerDropdownColumnsV225),
          manualDropdownV3: Boolean(window.PMDManualTableDropdownUIV3)
        }
      };
    }
  };

  console.info(
    '[PMD ReservationsLab Schedule V2.8.1 Hours Direct] Ready',
    window.PMDReservationsLabScheduleV1.audit()
  );
})();
