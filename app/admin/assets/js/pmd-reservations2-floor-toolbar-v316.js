(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/reservations2') return;

  var VERSION = '4.1.0';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var FILTER_ID = 'pmd-r2-date-filter-v317';
  var SECTION_ID = 'pmd-r2-reservation-cards-v320';
  var GRID_ID = 'pmd-r2-reservation-grid-v320';
  var STYLE_ID = 'pmd-r2-waiter-cards-v410-style';
  var STORAGE_KEY = 'pmd.reservations2.dateRange.v1';
  var rendering = false;
  var scheduled = false;
  var observer = null;
  var eventsBound = false;

  var state = {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
    tableId: null,
    tableName: null
  };

  function floor() { return document.getElementById(FLOOR_ID); }
  function bootData() { return window.PMD_RESERVATIONS2_BOOT || {}; }
  function reservations() { return Array.isArray(bootData().reservations) ? bootData().reservations : []; }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function esc(value) { return clean(value).replace(/[&<>'"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]; }); }
  function pad(value) { return String(value).padStart(2, '0'); }
  function startOfDay(value) { var d = new Date(value); d.setHours(0, 0, 0, 0); return d; }
  function endOfDay(value) { var d = new Date(value); d.setHours(23, 59, 59, 999); return d; }
  function addDays(value, days) { var d = new Date(value); d.setDate(d.getDate() + days); return d; }
  function dateKey(value) { return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate()); }
  function parseDate(value, end) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) return null;
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(d.getTime()) ? null : (end ? endOfDay(d) : startOfDay(d));
  }
  function validRange(start, end) { return Boolean(start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start); }
  function humanDate(value) { try { return new Intl.DateTimeFormat(undefined, {day:'numeric', month:'short', year:'numeric'}).format(value); } catch (e) { return dateKey(value); } }
  function humanTime(value) { try { return new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit'}).format(value); } catch (e) { return pad(value.getHours()) + ':' + pad(value.getMinutes()); } }
  function rangeLabel() { return dateKey(state.start) === dateKey(state.end) ? humanDate(state.start) : humanDate(state.start) + ' – ' + humanDate(state.end); }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + GRID_ID + '{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important;gap:18px!important;align-items:stretch!important}' +
      '#' + GRID_ID + '>.pmd-w5-card{width:auto!important;min-width:0!important;margin:0!important;text-decoration:none!important;position:relative!important}' +
      '#' + GRID_ID + ' .pmd-r2-add-waiter-card{border-style:dashed!important;cursor:pointer!important}' +
      '#' + GRID_ID + ' .pmd-r2-add-waiter-card .pmd-v35-table-no{font-size:30px!important}' +
      '#' + GRID_ID + ' .pmd-r2-add-waiter-card h2{margin-top:12px!important}' +
      '#' + GRID_ID + ' .pmd-r2-card-link{position:absolute;inset:0;z-index:1;border-radius:inherit}' +
      '#' + GRID_ID + ' button,#' + GRID_ID + ' a.pmd-r2-action-link{position:relative;z-index:2}' +
      '#' + GRID_ID + ' .pmd-r2-contact-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid rgba(148,163,184,.18)}' +
      '#' + GRID_ID + ' .pmd-r2-contact-row:last-child{border-bottom:0}' +
      '@media(max-width:700px){#' + GRID_ID + '{grid-template-columns:1fr!important}}';
    document.head.appendChild(style);
  }

  function restoreRange() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      var start = saved && parseDate(saved.start, false);
      var end = saved && parseDate(saved.end, true);
      if (validRange(start, end)) { state.start = start; state.end = end; }
    } catch (e) {}
  }
  function persistRange() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({start:dateKey(state.start), end:dateKey(state.end)})); } catch (e) {} }
  function setRange(start, end) { if (!validRange(start, end)) return; state.start = start; state.end = end; persistRange(); render(); }

  function nativeControl(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector)).find(function (node) { return !node.closest('#' + TOOLBAR_ID); }) || null;
  }
  function toolButton(key, label, selector) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-r2-floor-tool-v316';
    button.dataset.pmdR2Tool = key;
    button.textContent = label;
    button.addEventListener('click', function (event) {
      event.preventDefault(); event.stopPropagation();
      var root = floor();
      var native = root && nativeControl(root, selector);
      if (native) native.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
      schedule();
    });
    return button;
  }
  function ensureToolbar(root) {
    var statusbar = root.querySelector('.pmd-floor-v1__statusbar');
    if (!statusbar) return;
    var toolbar = document.getElementById(TOOLBAR_ID);
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = TOOLBAR_ID;
      toolbar.className = 'pmd-r2-floor-toolbar-v316';
      toolbar.appendChild(toolButton('edit', 'Edit', '[data-floor-edit]'));
      toolbar.appendChild(toolButton('save', 'Save', '[data-floor-save]'));
      toolbar.appendChild(toolButton('zoom-out', '−', '[data-floor-zoom-out]'));
      toolbar.appendChild(toolButton('fit', 'Full Floor', '[data-floor-fit]'));
      toolbar.appendChild(toolButton('zoom-in', '+', '[data-floor-zoom-in]'));
      toolbar.appendChild(toolButton('strip', 'One row', '[data-floor-strip]'));
      statusbar.appendChild(toolbar);
    }
    root.querySelectorAll('[data-floor-secondary-toolbar],.pmd-floor-v1__secondary-toolbar,[data-pmd-r2-floor-toolbar-v313]').forEach(function (bar) { if (bar.id !== TOOLBAR_ID) bar.classList.add('pmd-r2-native-toolbar-v316-hidden'); });
  }

  function presetName() {
    var today = startOfDay(new Date());
    if (dateKey(state.start) === dateKey(today) && dateKey(state.end) === dateKey(today)) return 'today';
    if (dateKey(state.start) === dateKey(addDays(today, 1)) && dateKey(state.end) === dateKey(addDays(today, 1))) return 'tomorrow';
    if (dateKey(state.start) === dateKey(today) && dateKey(state.end) === dateKey(addDays(today, 6))) return 'week';
    var ms = new Date(today.getFullYear(), today.getMonth(), 1);
    var me = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return dateKey(state.start) === dateKey(ms) && dateKey(state.end) === dateKey(me) ? 'month' : 'custom';
  }
  function ensureDateFilter() {
    var actions = document.querySelector('.pmd-r2__hero-actions') || document.querySelector('.pmd-r2-clean-header__actions') || document.querySelector('[data-pmd-header-actions]');
    if (!actions) return;
    var panel = document.getElementById(FILTER_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = FILTER_ID;
      panel.className = 'pmd-r2-date-filter-v317';
      panel.innerHTML = '<div class="pmd-r2-date-filter-v317__quick"><button type="button" data-range="today">Today</button><button type="button" data-range="tomorrow">Tomorrow</button><button type="button" data-range="week">7 days</button><button type="button" data-range="month">This month</button></div><label><span>From</span><input type="date" data-date-start></label><label><span>To</span><input type="date" data-date-end></label><div class="pmd-r2-date-filter-v317__summary" data-date-summary></div>';
      actions.insertBefore(panel, actions.firstChild);
      panel.addEventListener('click', function (event) {
        var button = event.target.closest('[data-range]'); if (!button) return;
        var today = startOfDay(new Date());
        if (button.dataset.range === 'today') setRange(today, endOfDay(today));
        if (button.dataset.range === 'tomorrow') { var tomorrow = addDays(today, 1); setRange(tomorrow, endOfDay(tomorrow)); }
        if (button.dataset.range === 'week') setRange(today, endOfDay(addDays(today, 6)));
        if (button.dataset.range === 'month') setRange(new Date(today.getFullYear(), today.getMonth(), 1), endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
      });
      panel.addEventListener('change', function () {
        var start = parseDate(panel.querySelector('[data-date-start]').value, false) || state.start;
        var end = parseDate(panel.querySelector('[data-date-end]').value, true) || state.end;
        if (end < start) end = endOfDay(start);
        setRange(start, end);
      });
    }
    panel.querySelector('[data-date-start]').value = dateKey(state.start);
    panel.querySelector('[data-date-end]').value = dateKey(state.end);
    panel.querySelector('[data-date-summary]').textContent = rangeLabel() + (state.tableId ? ' · ' + (state.tableName || 'Table ' + state.tableId) : ' · All tables');
    var active = presetName();
    panel.querySelectorAll('[data-range]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.range === active); });
  }

  function reservationStart(item) {
    var direct = item && (item.reservation_datetime || item.start_at || item.starts_at);
    if (direct) { var parsed = new Date(direct); if (!Number.isNaN(parsed.getTime())) return parsed; }
    var rawDate = item && (item.reserve_date || item.reservation_date || item.booking_date || item.date);
    if (!rawDate) return null;
    var parts = String(rawDate).slice(0, 10).split(/[-/]/).map(Number);
    var time = String(item.reserve_time || item.reservation_time || item.booking_time || item.time || '00:00').split(':').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], time[0] || 0, time[1] || 0, 0, 0);
  }
  function tableIds(item) {
    var ids = [];
    function add(value) { var n = Number(value); if (Number.isFinite(n) && n > 0 && ids.indexOf(String(n)) === -1) ids.push(String(n)); }
    add(item && item.table_id);
    if (item && Array.isArray(item.tables)) item.tables.forEach(function (table) { add(table && typeof table === 'object' ? (table.table_id || table.id) : table); });
    return ids;
  }
  function tableLabel(item) {
    var names = [];
    if (item && Array.isArray(item.tables)) item.tables.forEach(function (table) { if (table && typeof table === 'object') names.push(table.table_name || table.name || table.table_number); });
    names = names.filter(Boolean);
    if (names.length) return names.join(', ');
    var ids = tableIds(item);
    return ids.length ? ids.map(function (id) { return 'Table ' + id; }).join(', ') : 'Unassigned';
  }
  function tableNumber(item) { var ids = tableIds(item); return ids.length ? ids[0] : '—'; }
  function guestName(item) { return clean(item.customer_name || [item.first_name, item.last_name].filter(Boolean).join(' ') || item.guest_name || 'Guest'); }
  function guestCount(item) { return Number(item.guest_num || item.guests || item.party_size || item.covers || 0) || 0; }
  function statusLabel(item) { var status = item && (item.status_name || item.reservation_status || item.status); if (status && typeof status === 'object') status = status.status_name || status.name || status.label; return clean(status || 'Scheduled'); }
  function tone(item) { var s = statusLabel(item).toLowerCase(); if (/cancel|declin|no.?show/.test(s)) return 'cancelled'; if (/complete|finish|closed/.test(s)) return 'served'; if (/seat|active|arriv|check.?in/.test(s)) return 'preparing'; if (/pending|request|wait/.test(s)) return 'received'; return 'received'; }
  function filteredReservations() {
    return reservations().filter(function (item) { var start = reservationStart(item); return start && start >= state.start && start <= state.end && (!state.tableId || tableIds(item).indexOf(String(state.tableId)) !== -1); }).sort(function (a, b) { return reservationStart(a) - reservationStart(b); });
  }
  function editUrl(item) { var id = item && (item.reservation_id || item.id); var base = clean(bootData().editBaseUrl || '/admin/reservations/edit').replace(/\/$/, ''); return id ? base + '/' + encodeURIComponent(id) : '#'; }
  function createUrl() {
    var base = clean(bootData().createUrl || '/admin/reservations/create');
    try { var url = new URL(base, window.location.origin); if (state.tableId) { url.searchParams.set('table_id', state.tableId); url.searchParams.set('table', state.tableId); } url.searchParams.set('reserve_date', dateKey(state.start)); return url.pathname + url.search; } catch (e) { return base; }
  }

  function ensureSection() {
    var root = floor(); if (!root || !root.parentElement) return null;
    var section = document.getElementById(SECTION_ID);
    if (!section) {
      section = document.createElement('section'); section.id = SECTION_ID; section.className = 'pmd-r2-reservation-cards-v320';
      section.innerHTML = '<div class="pmd-r2-reservation-cards-v320__head"><div><strong data-r2-card-title>Reservations</strong><span data-r2-card-subtitle></span></div><button type="button" data-r2-show-all hidden>Show all tables</button></div><div id="' + GRID_ID + '" class="pmd-r2-reservation-grid-v320 pmd-w5-grid"></div>';
      root.insertAdjacentElement('afterend', section);
      section.querySelector('[data-r2-show-all]').addEventListener('click', function () { state.tableId = null; state.tableName = null; clearSelection(); render(); });
    }
    return section;
  }

  function addCardMarkup() {
    var table = state.tableId ? (state.tableName || 'Table ' + state.tableId) : 'Choose a table';
    return '<article class="pmd-w5-card pmd-v35-ready pmd-r2-add-waiter-card" data-r2-add-reservation>' +
      '<a class="pmd-r2-card-link" href="' + esc(createUrl()) + '" aria-label="Add reservation"></a>' +
      '<div class="pmd-v35-card-head"><div class="pmd-v35-table-no">＋</div></div>' +
      '<div class="pmd-w5-card-top"><span class="pmd-w5-pill warn pmd-v17-card-table-top pmd-v21-table-badge">' + esc(table) + '</span></div>' +
      '<h2>Add reservation</h2>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><span class="pmd-w5-pill warn">NEW</span></div>' +
      '<div class="pmd-w5-meta"><div class="pmd-w5-box"><small>Table</small><b>' + esc(state.tableId || '—') + '</b></div><div class="pmd-w5-box"><small>Date</small><b>' + esc(humanDate(state.start)) + '</b></div><div class="pmd-w5-box pmd-v35-order-box"><small>Type</small><b>Booking</b></div></div>' +
      '<div class="pmd-w5-items"><small>Reservation</small><div class="pmd-r2-contact-row"><span>Select this card to create a reservation</span><b>＋</b></div></div>' +
      '<div class="pmd-w5-card-actions"><a class="primary pmd-r2-action-link" href="' + esc(createUrl()) + '">Add reservation</a></div>' +
    '</article>';
  }

  function reservationCardMarkup(item) {
    var start = reservationStart(item);
    var id = item.reservation_id || item.id || '';
    var url = editUrl(item);
    var guests = guestCount(item);
    var status = statusLabel(item);
    var phone = clean(item.telephone || item.phone || item.customer_phone || '');
    var email = clean(item.email || item.customer_email || '');
    var notes = clean(item.comment || item.notes || item.special_request || '');
    return '<article class="pmd-w5-card pmd-v35-ready" data-r2-reservation-id="' + esc(id) + '" data-table="' + esc(tableNumber(item)) + '">' +
      (url !== '#' ? '<a class="pmd-r2-card-link" href="' + esc(url) + '" aria-label="Edit reservation"></a>' : '') +
      '<div class="pmd-v35-card-head"><div class="pmd-v35-table-no">' + esc(tableNumber(item)) + '</div>' + (url !== '#' ? '<a class="pmd-v35-edit-btn pmd-r2-action-link" href="' + esc(url) + '" title="Edit reservation" aria-label="Edit reservation">✎</a>' : '') + '</div>' +
      '<div class="pmd-w5-card-top"><span class="pmd-w5-pill warn pmd-v17-card-table-top pmd-v21-table-badge">' + esc(tableLabel(item)) + '</span></div>' +
      '<h2>' + esc(guestName(item)) + '</h2>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><span class="pmd-w5-pill warn">' + esc(status) + '</span></div>' +
      '<div class="pmd-w5-meta"><div class="pmd-w5-box"><small>Guests</small><b>' + esc(guests || '—') + '</b></div><div class="pmd-w5-box"><small>Time</small><b>' + esc(start ? humanTime(start) : '—') + '</b></div><div class="pmd-w5-box pmd-v35-order-box"><small>Reservation</small><b>' + esc(id || '—') + '</b></div></div>' +
      '<div class="pmd-w5-items"><small>Reservation Details</small>' +
        '<div class="pmd-r2-contact-row"><span>Date</span><b>' + esc(start ? humanDate(start) : 'Unavailable') + '</b></div>' +
        (phone ? '<div class="pmd-r2-contact-row"><span>Phone</span><b>' + esc(phone) + '</b></div>' : '') +
        (email ? '<div class="pmd-r2-contact-row"><span>Email</span><b>' + esc(email) + '</b></div>' : '') +
        (notes ? '<div class="pmd-r2-contact-row"><span>Notes</span><b>' + esc(notes) + '</b></div>' : '') +
      '</div>' +
      '<div class="pmd-w5-card-actions">' + (url !== '#' ? '<a class="primary pmd-r2-action-link" href="' + esc(url) + '">Edit</a>' : '') + '<button type="button" class="pmd-v159-order-status pmd-v158-order-status" data-tone="' + esc(tone(item)) + '"><strong>' + esc(status) + '</strong></button></div>' +
    '</article>';
  }

  function clearSelection() { var root = floor(); if (!root) return; root.querySelectorAll('[data-pmd-r2-selected-table-v320],.pmd-r2-table-selected-v317').forEach(function (node) { node.removeAttribute('data-pmd-r2-selected-table-v320'); node.classList.remove('pmd-r2-table-selected-v317'); }); }
  function markSelection() { var root = floor(); if (!root) return; clearSelection(); if (!state.tableId) return; root.querySelectorAll('[data-floor-table]').forEach(function (node) { var ids = [node.getAttribute('data-floor-table'), node.getAttribute('data-table-id'), node.getAttribute('data-floor-table-id')].filter(Boolean).map(String); if (ids.indexOf(String(state.tableId)) !== -1) { node.setAttribute('data-pmd-r2-selected-table-v320', 'true'); node.classList.add('pmd-r2-table-selected-v317'); } }); }
  function updateKpis(items) { var now = new Date(); var upcoming = items.filter(function (item) { var start = reservationStart(item); return start && start >= now; }).length; var pending = items.filter(function (item) { return /pending|confirm|request|wait/i.test(statusLabel(item)); }).length; var tables = new Set(); items.forEach(function (item) { tableIds(item).forEach(function (id) { tables.add(id); }); }); var values = {today:items.length, upcoming:upcoming, pending:pending, tables:tables.size}; Object.keys(values).forEach(function (key) { var node = document.querySelector('[data-r2-v308-value="' + key + '"]'); if (node) node.textContent = String(values[key]); }); }

  function renderCards(items) {
    var section = ensureSection(); if (!section) return;
    var selected = state.tableId ? (state.tableName || 'Table ' + state.tableId) : 'All tables';
    section.querySelector('[data-r2-card-title]').textContent = state.tableId ? 'Reservations for ' + selected : 'Reservations';
    section.querySelector('[data-r2-card-subtitle]').textContent = rangeLabel() + ' · ' + items.length + ' reservation' + (items.length === 1 ? '' : 's');
    section.querySelector('[data-r2-show-all]').hidden = !state.tableId;
    document.getElementById(GRID_ID).innerHTML = addCardMarkup() + items.map(reservationCardMarkup).join('');
    section.dataset.reservationCount = String(items.length);
  }

  function render() {
    if (rendering) return; rendering = true;
    try {
      var root = floor(); if (!root) return;
      ensureStyle(); ensureToolbar(root); ensureDateFilter();
      var items = filteredReservations(); updateKpis(items); markSelection(); renderCards(items);
      document.documentElement.classList.add('pmd-r2-reservation-experience-ready');
      root.setAttribute('data-pmd-r2-toolbar-authority', 'floor-experience-v4.1');
    } finally { rendering = false; }
  }

  function tableIdFromNode(node) { var direct = node && (node.getAttribute('data-floor-table') || node.getAttribute('data-table-id') || node.getAttribute('data-floor-table-id') || node.dataset.tableId || node.dataset.id); if (direct && Number(direct) > 0) return String(Number(direct)); var members = clean(node && node.getAttribute('data-floor-members')).split(',').filter(Boolean); if (members.length && Number(members[0]) > 0) return String(Number(members[0])); var match = clean(node && node.textContent).match(/\b(\d+)\b/); return match ? String(Number(match[1])) : null; }
  function tableNameFromNode(node, id) { var nameNode = node.querySelector('.pmd-floor-v1__name,[data-floor-table-name],strong'); var name = clean(nameNode && nameNode.textContent); if (name) return /^table\s/i.test(name) ? name : 'Table ' + name; var label = clean(node.getAttribute('aria-label') || node.getAttribute('title')); return label ? label.split(' — ')[0] : 'Table ' + id; }
  function bindEvents() {
    if (eventsBound) return; eventsBound = true;
    document.addEventListener('click', function (event) {
      var root = floor(); if (!root || !root.contains(event.target)) return;
      var table = event.target.closest('[data-floor-table]'); if (!table || !root.contains(table)) return;
      var floorState = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null; if (floorState && floorState.editing) return;
      var id = tableIdFromNode(table); if (!id) return;
      event.preventDefault(); event.stopPropagation();
      state.tableId = id; state.tableName = tableNameFromNode(table, id); render();
      window.setTimeout(function () { var section = document.getElementById(SECTION_ID); if (section) section.scrollIntoView({behavior:'smooth', block:'start'}); }, 30);
    }, true);
  }
  function schedule() { if (scheduled) return; scheduled = true; window.requestAnimationFrame(function () { scheduled = false; render(); }); }
  function connectObserver() { var root = floor(); if (!root) return; if (observer) observer.disconnect(); observer = new MutationObserver(schedule); observer.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden','aria-pressed','data-status','data-floor-members']}); }
  function audit() { var items = filteredReservations(); return {version:VERSION, floor:Boolean(floor()), toolbar:Boolean(document.getElementById(TOOLBAR_ID)), dateFilter:Boolean(document.getElementById(FILTER_ID)), section:Boolean(document.getElementById(SECTION_ID)), totalReservations:reservations().length, filteredReservations:items.length, waiterCards:document.querySelectorAll('#' + GRID_ID + ' > .pmd-w5-card').length, visibleReservationCards:document.querySelectorAll('#' + GRID_ID + ' [data-r2-reservation-id]').length, addReservationCard:Boolean(document.querySelector('#' + GRID_ID + ' [data-r2-add-reservation]')), selectedTable:state.tableId, range:[dateKey(state.start), dateKey(state.end)]}; }

  var api = {version:VERSION, refresh:schedule, renderReservations:schedule, setRange:function (start, end) { var a = parseDate(start, false); var b = parseDate(end, true); if (validRange(a, b)) setRange(a, b); }, clearTable:function () { state.tableId = null; state.tableName = null; clearSelection(); render(); }, getState:function () { return {start:dateKey(state.start), end:dateKey(state.end), tableId:state.tableId, tableName:state.tableName}; }, audit:audit, destroy:function () { if (observer) observer.disconnect(); observer = null; }};
  window.PMDReservations2FloorExperience = api;
  window.PMDReservations2FloorToolbarV316 = api;
  window.PMDReservations2CardsV320 = {version:VERSION, refresh:schedule, showAll:api.clearTable, audit:audit};
  window.PMDReservations2ScrollV322 = {version:VERSION, refresh:schedule, audit:audit};

  function boot() { restoreRange(); bindEvents(); render(); connectObserver(); console.info('[PMD Reservations2 Floor Experience V4.1 waiter cards] Ready', audit()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
