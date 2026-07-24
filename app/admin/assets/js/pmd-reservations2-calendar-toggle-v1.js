(function () {
  'use strict';

  var route = String(location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/reservations2') return;

  var VERSION = '1.10.0';
  var PAGE_ID = 'pmd-reservations2';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var ROOT_ID = 'pmd-r2-calendar-surface-v160';
  var TOGGLE_ID = 'pmd-r2-calendar-toggle-v1';
  var NOTE_KEY = 'pmd.yearCalendar.notes.v1';

  var page = document.getElementById(PAGE_ID);
  if (!page) return;

  var calendarMode = false;
  var year = new Date().getFullYear();
  var month = new Date().getMonth();
  var view = 'month';
  var filter = 'all';
  var selectedDate = null;
  var headerObserver = null;
  var arrangeQueued = false;

  var monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  var weekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function visible(el) {
    if (!el) return false;
    var style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char];
    });
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function formatDate(key) {
    var parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3) return key;
    return monthNames[parts[1] - 1] + ' ' + parts[2] + ', ' + parts[0];
  }

  function formatTime(value) {
    var source = clean(value);
    if (!source) return '—';
    var match = source.match(/(\d{1,2}):(\d{2})/);
    if (!match) return source;
    var hour = Number(match[1]);
    var minute = match[2];
    var suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return pad(hour) + ':' + minute + ' ' + suffix;
  }

  function boot() {
    return window.PMD_RESERVATIONS2_BOOT || {};
  }

  function reservations() {
    var data = boot();
    return Array.isArray(data.reservations) ? data.reservations : [];
  }

  function reservationDate(reservation) {
    return String(
      reservation.reserve_date || reservation.reservation_date || reservation.date || ''
    ).slice(0, 10);
  }

  function reservationId(reservation) {
    return reservation.reservation_id || reservation.id || reservation.booking_id || '';
  }

  function reservationTable(reservation) {
    return clean(
      reservation.table_name || reservation.table || reservation.table_number || reservation.table_id || ''
    );
  }

  function reservationName(reservation) {
    return clean(
      reservation.guest_name || reservation.customer_name || reservation.first_name || reservation.name ||
      ('Reservation #' + (reservationId(reservation) || ''))
    ) || 'Reservation';
  }

  function reservationStatus(reservation) {
    var raw = reservation.status;
    if (raw && typeof raw === 'object') raw = raw.name || raw.label || raw.status;
    return clean(raw || reservation.status_name || reservation.state || 'Scheduled');
  }

  function reservationEditUrl(reservation) {
    var data = boot();
    var base = data.editBaseUrl || '/admin/reservations/edit';
    var id = reservationId(reservation);
    return id ? base.replace(/\/$/, '') + '/' + encodeURIComponent(id) : '#';
  }

  function notes() {
    try {
      return JSON.parse(localStorage.getItem(NOTE_KEY) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function saveNotes(data) {
    localStorage.setItem(NOTE_KEY, JSON.stringify(data));
  }

  function holidays(targetYear) {
    return [
      { date: targetYear + '-01-01', title: 'New Year’s Day' },
      { date: targetYear + '-05-01', title: 'Labour Day' },
      { date: targetYear + '-10-03', title: 'German Unity Day' },
      { date: targetYear + '-12-25', title: 'Christmas Day' },
      { date: targetYear + '-12-26', title: 'Second Christmas Day' }
    ];
  }

  function eventsForYear(targetYear) {
    var data = boot();
    var items = Array.isArray(data.events) ? data.events.slice() : [];
    return items.concat(holidays(targetYear)).map(function (event) {
      return {
        date: String(event.date || event.start_date || '').slice(0, 10),
        title: event.title || event.name || 'Event'
      };
    }).filter(function (event) {
      return event.date.indexOf(String(targetYear) + '-') === 0;
    });
  }

  function groupReservations() {
    return reservations().reduce(function (map, reservation) {
      var key = reservationDate(reservation);
      if (key) (map[key] || (map[key] = [])).push(reservation);
      return map;
    }, {});
  }

  function eventMapForYear(targetYear) {
    return eventsForYear(targetYear).reduce(function (map, event) {
      (map[event.date] || (map[event.date] = [])).push(event);
      return map;
    }, {});
  }

  function findHeaderActions() {
    return document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions') ||
      Array.from(document.querySelectorAll('.pmd-r2-clean-actions')).find(visible) ||
      document.querySelector('.pmd-r2-clean-actions');
  }

  function ensureToggle() {
    var button = document.getElementById(TOGGLE_ID);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = TOGGLE_ID;
      button.title = 'Calendar view';
      button.setAttribute('aria-label', 'Toggle calendar view');
      button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path></svg>';
      button.addEventListener('click', function () {
        if (calendarMode) {
          openDateRange();
        } else {
          setMode(true);
        }
      });
    }
    return button;
  }

  function openDateRange() {
    var dateButton = document.getElementById('pmd-r2-date-button-v430');
    if (!dateButton) return false;

    dateButton.hidden = false;
    dateButton.style.setProperty('display', 'inline-flex', 'important');
    dateButton.style.setProperty('visibility', 'visible', 'important');
    dateButton.style.setProperty('opacity', '1', 'important');

    dateButton.click();

    var panel = document.getElementById('pmd-r2-date-panel-v318');
    if (panel) {
      panel.hidden = false;
      panel.classList.add('is-open', 'show');
      panel.setAttribute('aria-hidden', 'false');
      dateButton.setAttribute('aria-expanded', 'true');
    }

    return true;
  }

  function queueArrangeHeader() {
    if (arrangeQueued) return;
    arrangeQueued = true;
    requestAnimationFrame(function () {
      arrangeQueued = false;
      arrangeHeader();
    });
  }

  function arrangeHeader() {
    var actions = findHeaderActions();
    if (!actions) return false;

    var dateButton = document.getElementById('pmd-r2-date-button-v430');
    var toggle = ensureToggle();
    var create = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-create') ||
      document.querySelector('.pmd-r2-clean-create');
    var notification = document.getElementById('notif-root');

    [dateButton, toggle, create, notification].forEach(function (element) {
      if (!element) return;
      if (element === dateButton) {
        element.hidden = false;
        element.style.setProperty('display', 'inline-flex', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.setAttribute('aria-label', 'Reservation date range');
      }
      if (element.parentElement !== actions) actions.appendChild(element);
    });

    if (dateButton) dateButton.style.setProperty('order', '1', 'important');
    if (toggle) toggle.style.setProperty('order', '2', 'important');
    if (create) create.style.setProperty('order', '3', 'important');
    if (notification) notification.style.setProperty('order', '4', 'important');

    var wrapper = notification && notification.querySelector('.media-toolbar-tooltip-wrap');
    if (wrapper && toggle.parentElement === wrapper) actions.insertBefore(toggle, create || notification);

    var emptyPopover = document.getElementById('pmd-r2-date-popover-v318');
    if (emptyPopover && !emptyPopover.children.length) emptyPopover.hidden = true;

    return true;
  }

  function watchHeader() {
    var header = document.getElementById('pmd-r2-clean-header');
    if (!header || headerObserver) return;
    headerObserver = new MutationObserver(queueArrangeHeader);
    headerObserver.observe(header, { childList: true, subtree: true });
  }

  function rootMarkup() {
    return '' +
      '<div class="pmd-yc__toolbar">' +
        '<div class="pmd-yc__legend"><span><i class="is-reservation">R</i>Reservation</span><span><i class="is-note">✎</i>Note</span><span><i class="is-event">★</i>Event</span></div>' +
        '<div class="pmd-yc__month-nav"><button type="button" data-r2-yc-prev aria-label="Previous">←</button><strong data-r2-yc-label></strong><button type="button" data-r2-yc-next aria-label="Next">→</button></div>' +
        '<div class="pmd-yc__toolbar-right"><div class="pmd-yc__view-switch"><button type="button" data-r2-yc-view="year">Year</button><button type="button" data-r2-yc-view="month" class="is-active">Month</button></div><div class="pmd-yc__filters"><button type="button" data-r2-yc-filter="all" class="is-active">All</button><button type="button" data-r2-yc-filter="reservations">Reservations</button><button type="button" data-r2-yc-filter="events">Events</button></div><button type="button" class="pmd-r2-yc-note-btn" data-r2-yc-note>＋ Note</button></div>' +
      '</div>' +
      '<main class="pmd-yc__months" data-r2-yc-months></main>' +
      '<section class="pmd-r2-yc-selected" data-r2-yc-selected hidden></section>' +
      '<section class="pmd-r2-yc-modal" data-r2-yc-modal hidden><div class="pmd-r2-yc-modal__backdrop" data-r2-yc-modal-close></div><section class="pmd-r2-yc-modal__card" role="dialog" aria-modal="true" aria-labelledby="pmd-r2-yc-modal-title"><div class="pmd-r2-yc-modal__head"><div><small>Day note</small><h2 id="pmd-r2-yc-modal-title" data-r2-yc-modal-title></h2></div><button type="button" data-r2-yc-modal-close aria-label="Close">×</button></div><textarea data-r2-yc-modal-input rows="5" placeholder="Write a note for this day"></textarea><div class="pmd-r2-yc-modal__actions"><button type="button" data-r2-yc-modal-delete>Delete</button><button type="button" data-r2-yc-modal-close>Cancel</button><button type="button" class="primary" data-r2-yc-modal-save>Save note</button></div></section></section>';
  }

  function ensureRoot() {
    var floor = document.getElementById(FLOOR_ID);
    if (!floor) return null;
    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ID;
      root.className = 'pmd-yc pmd-r2-yc';
      root.hidden = true;
      root.innerHTML = rootMarkup();
      floor.appendChild(root);
      bind(root);
    } else if (root.parentElement !== floor) {
      floor.appendChild(root);
    }
    return root;
  }

  function dataState(key, reservationMap, noteMap, eventMap) {
    return {
      reservations: reservationMap[key] || [],
      note: noteMap[key] || '',
      events: eventMap[key] || []
    };
  }

  function monthRows(state) {
    var rows = [];
    if ((filter === 'all' || filter === 'reservations') && state.reservations.length) {
      rows.push('<span class="pmd-r2-yc-entry is-reservation">' + state.reservations.length + ' reservation' + (state.reservations.length === 1 ? '' : 's') + '</span>');
    }
    if (filter === 'all' && state.note) rows.push('<span class="pmd-r2-yc-entry is-note">' + esc(state.note) + '</span>');
    if ((filter === 'all' || filter === 'events') && state.events.length) {
      state.events.forEach(function (event) {
        rows.push('<span class="pmd-r2-yc-entry is-event">' + esc(event.title) + '</span>');
      });
    }
    return rows.join('');
  }

  function yearDots(state) {
    var dots = [];
    if ((filter === 'all' || filter === 'reservations') && state.reservations.length) dots.push('<i class="pmd-r2-yc-dot is-reservation" title="' + state.reservations.length + ' reservation' + (state.reservations.length === 1 ? '' : 's') + '"></i>');
    if (filter === 'all' && state.note) dots.push('<i class="pmd-r2-yc-dot is-note" title="Note"></i>');
    if ((filter === 'all' || filter === 'events') && state.events.length) dots.push('<i class="pmd-r2-yc-dot is-event" title="' + esc(state.events.map(function (event) { return event.title; }).join(', ')) + '"></i>');
    return dots.join('');
  }

  function monthMarkup(monthIndex, large) {
    var first = new Date(year, monthIndex, 1);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(year, monthIndex, 1 - offset);
    var reservationMap = groupReservations();
    var noteMap = notes();
    var eventMap = eventMapForYear(year);
    var cells = [];

    for (var index = 0; index < 42; index += 1) {
      var date = new Date(start);
      date.setDate(start.getDate() + index);
      var key = dateKey(date);
      var state = dataState(key, reservationMap, noteMap, eventMap);
      var inside = date.getMonth() === monthIndex;
      var body = large ? monthRows(state) : yearDots(state);
      cells.push(
        '<button type="button" class="pmd-yc-day' + (!inside ? ' is-outside' : '') + (key === dateKey(new Date()) ? ' is-today' : '') + (key === selectedDate ? ' is-selected' : '') + '" data-r2-yc-date="' + key + '">' +
          '<span class="pmd-yc-day__number">' + date.getDate() + '</span>' +
          '<span class="pmd-yc-day__operations' + (large ? '' : ' is-dot-mode') + '">' + body + '</span>' +
        '</button>'
      );
    }

    return '' +
      '<section class="pmd-yc-month' + (large ? ' is-month-view' : ' is-year-card') + '">' +
        '<div class="pmd-yc-month__head"><h2>' + monthNames[monthIndex] + ' ' + year + '</h2></div>' +
        '<div class="pmd-yc-weekdays">' + weekNames.map(function (name) { return '<span>' + name + '</span>'; }).join('') + '</div>' +
        '<div class="pmd-yc-days">' + cells.join('') + '</div>' +
      '</section>';
  }

  function existingReservationCard(reservation) {
    var id = String(reservationId(reservation) || '');
    if (!id) return '';

    var root = document.getElementById(ROOT_ID);
    var selectors = [
      '.pmd-w5-card[data-reservation="' + CSS.escape(id) + '"]',
      '.pmd-w5-card[data-order="' + CSS.escape(id) + '"]',
      '.pmd-w5-card[data-reservation-id="' + CSS.escape(id) + '"]',
      '[data-reservation="' + CSS.escape(id) + '"].pmd-v35-ready',
      '[data-order="' + CSS.escape(id) + '"].pmd-v35-ready'
    ];

    var source = null;
    for (var index = 0; index < selectors.length && !source; index += 1) {
      source = Array.from(document.querySelectorAll(selectors[index])).find(function (element) {
        return !root || !root.contains(element);
      }) || null;
    }

    if (!source) return '';

    var clone = source.cloneNode(true);
    clone.classList.add('pmd-r2-yc-detail-card');
    clone.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
    return clone.outerHTML;
  }

  function reservationCard(reservation) {
    var exactCard = existingReservationCard(reservation);
    if (exactCard) return exactCard;

    var id = reservationId(reservation);
    var table = reservationTable(reservation);
    var guests = reservation.guest_num || reservation.guests || reservation.party_size || reservation.number_of_guests || '—';
    var time = formatTime(reservation.reserve_time || reservation.reservation_time || reservation.time);
    var status = reservationStatus(reservation);
    var name = reservationName(reservation);
    var editUrl = reservationEditUrl(reservation);

    return '' +
      '<article class="pmd-w5-card is-old pmd-v35-ready pmd-r2-yc-detail-card" data-reservation="' + esc(id) + '">' +
        '<div class="pmd-v35-card-head"><div class="pmd-v35-table-no">' + esc(table || '—') + '</div>' +
          (editUrl !== '#' ? '<a class="pmd-v35-edit-btn" href="' + esc(editUrl) + '" title="Edit reservation" aria-label="Edit reservation">✎</a>' : '') + '</div>' +
        '<div class="pmd-w5-card-top"><span class="pmd-w5-pill warn">' + esc(table ? 'Table ' + table : 'No table') + '</span></div>' +
        '<h2>' + esc(name) + '</h2>' +
        '<div class="pmd-w5-meta"><div class="pmd-w5-box"><small>Guests</small><b>' + esc(guests) + '</b></div><div class="pmd-w5-box"><small>Time</small><b>' + esc(time) + '</b></div><div class="pmd-w5-box pmd-v35-order-box"><small>Reservation</small><b>' + esc(id || '—') + '</b></div></div>' +
        '<div class="pmd-w5-card-actions">' + (editUrl !== '#' ? '<a class="primary" href="' + esc(editUrl) + '">Edit</a>' : '') + '<button type="button" disabled><span>Status</span><small>' + esc(status) + '</small></button></div>' +
      '</article>';
  }

  function eventCard(event) {
    return '<article class="pmd-w5-card is-old pmd-v35-ready pmd-r2-yc-detail-card is-event-card"><div class="pmd-v35-card-head"><div class="pmd-v35-table-no">★</div></div><div class="pmd-w5-card-top"><span class="pmd-w5-pill warn">Germany event</span></div><h2>' + esc(event.title) + '</h2><div class="pmd-w5-meta"><div class="pmd-w5-box"><small>Date</small><b>' + esc(formatDate(event.date)) + '</b></div></div></article>';
  }

  function noteCard(key, text) {
    return '<article class="pmd-w5-card is-old pmd-v35-ready pmd-r2-yc-detail-card is-note-card"><div class="pmd-v35-card-head"><div class="pmd-v35-table-no">✎</div><button type="button" class="pmd-v35-edit-btn" data-r2-yc-edit-note="' + esc(key) + '" aria-label="Edit note">✎</button></div><div class="pmd-w5-card-top"><span class="pmd-w5-pill warn">Note</span></div><h2>' + esc(formatDate(key)) + '</h2><div class="pmd-w5-items"><small>Day note</small><div class="pmd-w5-item"><span>' + esc(text) + '</span></div></div></article>';
  }

  function renderSelected() {
    var root = ensureRoot();
    if (!root) return;
    var section = root.querySelector('[data-r2-yc-selected]');
    if (!section) return;

    if (!selectedDate) {
      section.hidden = true;
      section.innerHTML = '';
      return;
    }

    var reservationMap = groupReservations();
    var eventMap = eventMapForYear(Number(selectedDate.slice(0, 4)));
    var noteMap = notes();
    var dayReservations = reservationMap[selectedDate] || [];
    var dayEvents = eventMap[selectedDate] || [];
    var dayNote = noteMap[selectedDate] || '';
    var cards = [];

    dayReservations.forEach(function (reservation) { cards.push(reservationCard(reservation)); });
    dayEvents.forEach(function (event) { cards.push(eventCard(event)); });
    if (dayNote) cards.push(noteCard(selectedDate, dayNote));

    section.hidden = false;
    section.innerHTML = '<div class="pmd-r2-yc-selected__head"><div><small>Selected day</small><h2>' + esc(formatDate(selectedDate)) + '</h2><p>' + cards.length + ' item' + (cards.length === 1 ? '' : 's') + '</p></div><div class="pmd-r2-yc-selected__actions"><button type="button" data-r2-yc-add-note="' + esc(selectedDate) + '">＋ Note</button><a href="' + esc((boot().createUrl || '/admin/reservations/create') + '?reserve_date=' + encodeURIComponent(selectedDate)) + '">＋ Reservation</a><button type="button" data-r2-yc-clear-selection>Show calendar only</button></div></div>' +
      (cards.length ? '<div class="pmd-r2-yc-selected__grid">' + cards.join('') + '</div>' : '<div class="pmd-r2-yc-empty"><strong>No reservations, notes or events.</strong><span>Add a note or create a reservation for this day.</span></div>');
  }

  function render() {
    var root = ensureRoot();
    if (!root) return;
    var months = root.querySelector('[data-r2-yc-months]');
    var label = root.querySelector('[data-r2-yc-label]');
    label.textContent = view === 'month' ? monthNames[month] + ' ' + year : String(year);
    months.innerHTML = view === 'month' ? monthMarkup(month, true) : monthNames.map(function (_, index) { return monthMarkup(index, false); }).join('');
    root.classList.toggle('is-month-mode', view === 'month');
    root.classList.toggle('is-year-mode', view === 'year');
    root.querySelectorAll('[data-r2-yc-view]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.r2YcView === view); });
    root.querySelectorAll('[data-r2-yc-filter]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.r2YcFilter === filter); });
    renderSelected();
  }

  function openNoteModal(key) {
    var root = ensureRoot();
    if (!root) return;
    var modal = root.querySelector('[data-r2-yc-modal]');
    var title = root.querySelector('[data-r2-yc-modal-title]');
    var input = root.querySelector('[data-r2-yc-modal-input]');
    var remove = root.querySelector('[data-r2-yc-modal-delete]');
    modal.dataset.date = key;
    title.textContent = formatDate(key);
    input.value = notes()[key] || '';
    remove.hidden = !input.value;
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-open'); input.focus(); });
    document.documentElement.classList.add('pmd-r2-yc-modal-open');
  }

  function closeNoteModal() {
    var root = ensureRoot();
    var modal = root && root.querySelector('[data-r2-yc-modal]');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('pmd-r2-yc-modal-open');
    setTimeout(function () { modal.hidden = true; }, 160);
  }

  function saveModalNote(remove) {
    var root = ensureRoot();
    var modal = root && root.querySelector('[data-r2-yc-modal]');
    if (!modal) return;
    var key = modal.dataset.date;
    var input = root.querySelector('[data-r2-yc-modal-input]');
    var map = notes();
    var value = clean(input.value);
    if (remove || !value) delete map[key]; else map[key] = value;
    saveNotes(map);
    selectedDate = key;
    closeNoteModal();
    render();
  }

  function selectDate(key) {
    selectedDate = key;
    var parts = key.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    render();
    var root = ensureRoot();
    var section = root && root.querySelector('[data-r2-yc-selected]');
    if (section) setTimeout(function () { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
  }

  function bind(root) {
    root.addEventListener('click', function (event) {
      var previous = event.target.closest('[data-r2-yc-prev]');
      var next = event.target.closest('[data-r2-yc-next]');
      var viewButton = event.target.closest('[data-r2-yc-view]');
      var filterButton = event.target.closest('[data-r2-yc-filter]');
      var noteButton = event.target.closest('[data-r2-yc-note]');
      var day = event.target.closest('[data-r2-yc-date]');
      var addNote = event.target.closest('[data-r2-yc-add-note]');
      var editNote = event.target.closest('[data-r2-yc-edit-note]');
      var clearSelection = event.target.closest('[data-r2-yc-clear-selection]');
      var modalClose = event.target.closest('[data-r2-yc-modal-close]');
      var modalSave = event.target.closest('[data-r2-yc-modal-save]');
      var modalDelete = event.target.closest('[data-r2-yc-modal-delete]');

      if (previous) { if (view === 'month') { month -= 1; if (month < 0) { month = 11; year -= 1; } } else year -= 1; render(); return; }
      if (next) { if (view === 'month') { month += 1; if (month > 11) { month = 0; year += 1; } } else year += 1; render(); return; }
      if (viewButton) { view = viewButton.dataset.r2YcView; render(); return; }
      if (filterButton) { filter = filterButton.dataset.r2YcFilter; render(); return; }
      if (noteButton) { openNoteModal(selectedDate || dateKey(new Date())); return; }
      if (addNote) { openNoteModal(addNote.dataset.r2YcAddNote); return; }
      if (editNote) { openNoteModal(editNote.dataset.r2YcEditNote); return; }
      if (clearSelection) { selectedDate = null; render(); return; }
      if (modalClose) { closeNoteModal(); return; }
      if (modalSave) { saveModalNote(false); return; }
      if (modalDelete) { saveModalNote(true); return; }
      if (day) selectDate(day.dataset.r2YcDate);
    });
  }

  function setMode(on) {
    calendarMode = Boolean(on);
    var root = ensureRoot();
    var toggle = ensureToggle();
    arrangeHeader();
    page.classList.toggle('is-calendar-mode', calendarMode);
    toggle.classList.toggle('is-active', calendarMode);
    toggle.setAttribute('aria-pressed', calendarMode ? 'true' : 'false');
    if (!root) return;
    if (calendarMode) {
      root.hidden = false;
      render();
      requestAnimationFrame(function () { root.classList.add('is-visible'); });
    } else {
      root.classList.remove('is-visible');
      setTimeout(function () { if (!calendarMode) root.hidden = true; }, 180);
    }
  }

  function audit() {
    var floor = document.getElementById(FLOOR_ID);
    var root = document.getElementById(ROOT_ID);
    var actions = findHeaderActions();
    var dateButton = document.getElementById('pmd-r2-date-button-v430');
    var toggle = document.getElementById(TOGGLE_ID);
    var create = document.querySelector('.pmd-r2-clean-create');
    var notification = document.getElementById('notif-root');
    return {
      version: VERSION,
      calendarMode: calendarMode,
      toggle: Boolean(toggle),
      toggleVisible: visible(toggle),
      floorCanvas: Boolean(floor),
      calendarRoot: Boolean(root),
      rootInsideFloor: Boolean(root && floor && root.parentElement === floor),
      rootHidden: Boolean(root && root.hidden),
      renderedMonths: root ? root.querySelectorAll('.pmd-yc-month').length : 0,
      selectedDate: selectedDate,
      selectedCards: root ? root.querySelectorAll('.pmd-r2-yc-detail-card').length : 0,
      dateInHeader: Boolean(dateButton && actions && dateButton.parentElement === actions),
      calendarInHeader: Boolean(toggle && actions && toggle.parentElement === actions),
      createInHeader: Boolean(create && actions && create.parentElement === actions),
      notificationInHeader: Boolean(notification && actions && notification.parentElement === actions),
      headerOrder: actions ? [dateButton, toggle, create, notification].filter(Boolean).map(function (element) { return Array.prototype.indexOf.call(actions.children, element); }) : [],
      reservations: reservations().length,
      url: location.pathname
    };
  }

  function init() {
    ensureToggle();
    ensureRoot();
    arrangeHeader();
    watchHeader();
    [250, 900, 1800].forEach(function (delay) { setTimeout(arrangeHeader, delay); });
    window.PMDReservations2CalendarToggleV1 = {
      version: VERSION,
      open: function () { setMode(true); },
      close: function () { setMode(false); },
      toggle: function () { setMode(!calendarMode); },
      render: render,
      arrangeHeader: arrangeHeader,
      selectDate: selectDate,
      openDateRange: openDateRange,
      audit: audit
    };
    console.info('[PMD Reservations2 Calendar Toggle V1.10] Ready', audit());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();