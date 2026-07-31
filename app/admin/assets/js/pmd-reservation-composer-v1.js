(function () {
  'use strict';

  var config = window.PMD_RESERVATION_COMPOSER_V1 || {};
  var root = document.getElementById('pmd-reservation-composer-v1');
  var form = document.getElementById('pmd-reservation-composer-form-v1');
  if (!root || !form || window.PMDReservationComposerV1) return;

  var selectors = [
    '#pmd-r2-clean-header a.pmd-r2-clean-create',
    '#pmd-reservations2 .pmd-r2__hero a.pmd-r2__new',
    '#pmd-r2-reservation-grid-v320 [data-r2-add-reservation] a[href]',
    '#pmd-r2-calendar-surface-v160 [data-r2-create-button]',
    '#pmd-r2-reservation-grid-v320 [data-r2-reservation-id] a[href*="/admin/reservations/edit/"]',
    '#pmd-r2-calendar-surface-v160 .pmd-r2-slot-booking[data-r2-reservation-id] a[href*="/admin/reservations/edit/"]',
    '#pmd-r2-calendar-surface-v160 .pmd-r2-yc-detail-card[data-reservation] a[href*="/admin/reservations/edit/"]'
  ].join(',');
  var modal = null;
  var context = null;
  var trigger = null;
  var baseline = '';
  var allowHide = false;
  var closing = false;
  var checkingTimer = null;
  var saving = false;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function positiveIds(values) {
    var seen = {};
    return (Array.isArray(values) ? values : [values]).map(Number).filter(function (id) {
      if (!Number.isInteger(id) || id < 1 || seen[id]) return false;
      seen[id] = true; return true;
    });
  }
  function dateValue(value) { return /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : null; }
  function timeValue(value) { var match = clean(value).match(/^([01]\d|2[0-3]):[0-5]\d/); return match ? match[0] : null; }
  function editId(url) { var match = clean(url).match(/\/reservations\/edit\/(\d+)/); return match ? Number(match[1]) : null; }
  function currentView() {
    var page = document.getElementById('pmd-reservations2');
    if (page && (page.classList.contains('is-timeslot-screen') || page.classList.contains('pmd-r2-hour-layout-v38-active'))) return 'hour';
    if (page && page.classList.contains('is-calendar-mode')) return 'calendar';
    return 'floor';
  }
  function selectedDate() {
    var page = document.getElementById('pmd-reservations2');
    var selected = document.querySelector('[data-r2-yc-selected] [data-r2-yc-date], [data-r2-yc-date][aria-selected="true"]');
    var values = [
      selected && selected.getAttribute('data-r2-yc-date'),
      page && page.getAttribute('data-pmd-selected-date'),
      page && page.getAttribute('data-r2-selected-date')
    ];
    var api = window.PMDReservations2FloorExperience;
    if (api && api.getState) values.push(api.getState().start);
    for (var i = 0; i < values.length; i += 1) if (dateValue(values[i])) return dateValue(values[i]);
    return null;
  }
  function floorSelection() {
    var api = window.PMDReservations2FloorExperience;
    var state = api && api.getState ? api.getState() : {};
    var node = document.querySelector('#pmd-r2-shared-floor-canvas-v310 [data-pmd-r2-selected-table-v320], #pmd-r2-shared-floor-canvas-v310 .pmd-r2-table-selected-v317');
    var members = node ? clean(node.getAttribute('data-floor-members')).split(',') : [];
    var ids = positiveIds(members);
    if (!ids.length && node && !node.classList.contains('is-merged-card')) ids = positiveIds(node.getAttribute('data-floor-table'));
    if (!ids.length) ids = positiveIds(state.tableId);
    var names = node ? [clean(node.getAttribute('aria-label') || node.getAttribute('title') || state.tableName)] : [state.tableName];
    return { ids: ids, names: names.filter(Boolean), date: dateValue(state.start) };
  }
  function fallbackFor(element) {
    if (element.href) return element.href;
    var row = element.closest('[data-r2-create-date][data-r2-create-time]');
    var url = new URL((window.PMD_RESERVATIONS2_BOOT || {}).createUrl || '/admin/reservations/create', location.origin);
    if (row) {
      url.searchParams.set('reserve_date', row.getAttribute('data-r2-create-date'));
      url.searchParams.set('reserve_time', row.getAttribute('data-r2-create-time'));
    }
    return url.href;
  }
  function normalize(element) {
    var fallback = fallbackFor(element);
    var url = new URL(fallback, location.origin);
    var row = element.closest('[data-r2-create-date][data-r2-create-time]');
    var card = element.closest('[data-r2-reservation-id]');
    var calendarCard = element.closest('[data-reservation]');
    var floor = floorSelection();
    var id = positiveIds(card && card.getAttribute('data-r2-reservation-id'))[0]
      || positiveIds(calendarCard && calendarCard.getAttribute('data-reservation'))[0]
      || editId(url.pathname);
    var source = 'header';
    if (row && id) source = 'hour-reservation';
    else if (calendarCard && id) source = 'calendar-reservation';
    else if (card && id) source = 'reservation-card';
    else if (row) source = 'hour-slot';
    else if (element.closest('[data-r2-add-reservation]')) source = floor.ids.length ? 'floor-selection' : 'add-card';
    var date = dateValue(row && row.getAttribute('data-r2-create-date'))
      || dateValue(url.searchParams.get('reserve_date')) || floor.date || selectedDate();
    var time = timeValue(row && row.getAttribute('data-r2-create-time')) || timeValue(url.searchParams.get('reserve_time'));
    var hinted = positiveIds([url.searchParams.get('table_id'), url.searchParams.get('table')]);
    return {
      version: 1, mode: id ? 'edit' : 'create', source: source,
      reservationId: id || null, selectedDate: date, selectedTime: time,
      duration: null, tableIds: floor.ids.length ? floor.ids : hinted,
      tableNames: floor.names, locationId: null, returnView: id && source === 'calendar-reservation' ? 'calendar' : (id && source === 'hour-reservation' ? 'hour' : currentView()),
      fallbackUrl: fallback
    };
  }
  function csrf() { var meta = document.querySelector('meta[name="csrf-token"]'); return meta ? meta.content : ''; }
  function request(handler, data) {
    return fetch(config.endpoint || '/admin/reservations2', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Accept':'application/json','Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf(),'X-IGNITER-REQUEST-HANDLER':handler},
      body: JSON.stringify(data || {})
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.success === false) { var error = new Error(json && json.error ? json.error.message : 'Request failed.'); error.response = json; error.status = response.status; throw error; }
        return json;
      });
    });
  }
  function ensureModal() {
    if (!window.bootstrap || !window.bootstrap.Modal) throw new Error('Bootstrap Modal is unavailable.');
    if (!modal) modal = new window.bootstrap.Modal(root, {backdrop:true, keyboard:false, focus:true});
    return modal;
  }
  function tagBackdrop() {
    var backdrops = document.querySelectorAll('.modal-backdrop:not(.pmd-reservation-composer-backdrop-v1)');
    if (backdrops.length) backdrops[backdrops.length - 1].classList.add('pmd-reservation-composer-backdrop-v1');
  }
  function snapshot() {
    return JSON.stringify(Array.from(new FormData(form).entries()).sort(function (a,b) { return a[0].localeCompare(b[0]) || clean(a[1]).localeCompare(clean(b[1])); }));
  }
  function dirty() { return baseline && snapshot() !== baseline; }
  function close(force) {
    if (!force && dirty() && !window.confirm('Discard unsaved reservation changes?')) return;
    if (closing) return;
    closing = true; root.classList.add('pmd-reservation-composer-v1--closing');
    var delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190;
    window.setTimeout(function () { allowHide = true; ensureModal().hide(); }, delay);
  }
  function clearErrors() {
    root.querySelectorAll('[aria-invalid=true]').forEach(function (field) { field.removeAttribute('aria-invalid'); });
    root.querySelectorAll('[data-error-for]').forEach(function (node) { node.textContent = ''; });
    var summary = root.querySelector('[data-pmd-composer-summary]'); summary.hidden = true; summary.textContent = '';
  }
  function showError(error) {
    clearErrors();
    var response = error.response && error.response.error ? error.response.error : {};
    var fields = response.fields || {};
    Object.keys(fields).forEach(function (name) {
      var field = form.querySelector('[name="'+CSS.escape(name)+'"], [name="'+CSS.escape(name)+'[]"]');
      var errorNode = root.querySelector('[data-error-for="'+CSS.escape(name.replace(/\.\d+$/, ''))+'"]');
      if (field) field.setAttribute('aria-invalid', 'true');
      if (errorNode) errorNode.textContent = Array.isArray(fields[name]) ? fields[name][0] : fields[name];
    });
    var summary = root.querySelector('[data-pmd-composer-summary]');
    summary.textContent = response.message || error.message || 'The reservation could not be processed.'; summary.hidden = false; summary.focus();
    var first = root.querySelector('[aria-invalid=true]'); if (first) first.focus();
  }
  function option(select, value, text, selected) { var item = document.createElement('option'); item.value = value; item.textContent = text; item.selected = !!selected; select.appendChild(item); }
  function populate(data) {
    var values = data.reservation || data.defaults;
    ['first_name','last_name','telephone','email','guest_num','reserve_date','reserve_time','duration','comment'].forEach(function (name) {
      var field = form.elements[name]; if (field) field.value = values[name] == null ? '' : (name === 'reserve_time' ? (timeValue(values[name]) || '') : values[name]);
    });
    form.elements.reservation_id.value = context.reservationId || '';
    form.elements.source.value = context.source;
    var selectedTables = positiveIds(data.reservation ? (data.reservation.tables || []).map(function (table) { return table.table_id; }) : data.defaults.tables);
    var tableSelect = form.querySelector('[name="tables[]"]'); tableSelect.innerHTML = '';
    data.tables.forEach(function (table) { option(tableSelect, table.table_id, table.table_name+' ('+table.min_capacity+'–'+table.max_capacity+')', selectedTables.indexOf(Number(table.table_id)) >= 0); });
    var assignment = data.reservation ? (selectedTables.length ? 'choose' : 'later') : data.defaults.assignment_mode;
    var radio = form.querySelector('[name=assignment_mode][value="'+assignment+'"]'); if (radio) radio.checked = true;
    var status = form.elements.status_id; status.innerHTML = ''; data.statuses.forEach(function (item) { option(status, item.status_id, item.status_name, Number(item.status_id) === Number(values.status_id)); });
    var occasion = form.elements.occasion_id; occasion.innerHTML = ''; data.occasions.forEach(function (item) { option(occasion, item.occasion_id, item.label, Number(item.occasion_id) === Number(values.occasion_id)); });
    var location = form.elements.location_id; location.innerHTML = ''; data.locations.forEach(function (item) { option(location, item.location_id, item.location_name, Number(item.location_id) === Number(values.location_id || data.location.location_id)); });
    root.querySelector('[data-pmd-composer-location]').hidden = !data.showLocation;
    form.elements.notify.checked = !!values.notify;
    root.querySelector('[data-pmd-composer-title]').textContent = data.mode === 'edit' ? 'Edit reservation' : 'New reservation';
    root.querySelector('[data-pmd-composer-loading]').hidden = true; root.querySelector('[data-pmd-composer-content]').hidden = false;
    syncAssignment(); baseline = snapshot();
    window.requestAnimationFrame(function () { form.elements.first_name.focus(); });
  }
  function payload() {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (key === 'tables[]') { data.tables = data.tables || []; data.tables.push(Number(value)); }
      else data[key] = value;
    });
    data.tables = positiveIds(data.tables || []); data.notify = form.elements.notify.checked ? 1 : 0;
    ['guest_num','duration','status_id','occasion_id','location_id','reservation_id'].forEach(function (key) { if (data[key] !== '') data[key] = Number(data[key]); else delete data[key]; });
    return data;
  }
  function syncAssignment() {
    var mode = form.querySelector('[name=assignment_mode]:checked');
    root.querySelector('.pmd-reservation-composer-v1__tables').hidden = !mode || mode.value !== 'choose';
  }
  function scheduleAvailability() {
    syncAssignment(); window.clearTimeout(checkingTimer);
    checkingTimer = window.setTimeout(function () {
      var status = root.querySelector('[data-pmd-composer-availability]'); status.textContent = 'Checking availability…'; status.classList.remove('is-error');
      request('index_onCheckReservationAvailability', payload()).then(function (data) {
        var result = data.availability; status.textContent = result.available ? 'Available' : 'The selected assignment is unavailable.'; status.classList.toggle('is-error', !result.available);
      }).catch(function (error) { status.textContent = error.message; status.classList.add('is-error'); });
    }, 300);
  }
  function open(nextContext, origin) {
    context = nextContext; trigger = origin; baseline = ''; clearErrors();
    root.querySelector('[data-pmd-composer-loading]').hidden = false; root.querySelector('[data-pmd-composer-content]').hidden = true;
    ensureModal().show(); document.body.classList.add('pmd-reservation-composer-open-v1');
    window.requestAnimationFrame(tagBackdrop);
    return request('index_onLoadReservationComposer', {
      mode: context.mode, reservation_id: context.reservationId, source: context.source,
      selected_date: context.selectedDate, selected_time: context.selectedTime,
      table_ids: context.tableIds, location_id: context.locationId
    }).then(populate).catch(function (error) { showError(error); throw error; });
  }
  function refreshWorkspace(reservation, assignmentMode) {
    var boot = window.PMD_RESERVATIONS2_BOOT || (window.PMD_RESERVATIONS2_BOOT = {});
    var items = Array.isArray(boot.reservations) ? boot.reservations : (boot.reservations = []);
    for (var index = items.length - 1; index >= 0; index -= 1) if (Number(items[index].reservation_id || items[index].id) === Number(reservation.reservation_id)) items.splice(index, 1);
    items.unshift(reservation);
    if (window.PMDReservations2KpisV309) window.PMDReservations2KpisV309.refresh();
    var cards = window.PMDReservations2FloorExperience || window.PMDReservations2CardsV320;
    if (!cards || !(cards.renderReservations || cards.refresh)) throw new Error('Reservation card refresh is unavailable.');
    (cards.renderReservations || cards.refresh).call(cards);
    return new Promise(function (resolve) { window.requestAnimationFrame(resolve); }).then(function () {
      if (window.PMDCalendarRealCountsFloatingV1) window.PMDCalendarRealCountsFloatingV1.refresh();
      if (window.PMDCalendarCountsToolbarV111) window.PMDCalendarCountsToolbarV111.refresh();
      if (window.PMDCalendarNativeCountV14) window.PMDCalendarNativeCountV14.refresh();
      if (context.returnView === 'calendar' && window.PMDReservations2CalendarToggleV1) window.PMDReservations2CalendarToggleV1.render();
      if (context.returnView === 'hour') {
        if (window.PMDRealHourTimelineV1) window.PMDRealHourTimelineV1.render();
        if (window.PMDHourEntryAuthorityV11) window.PMDHourEntryAuthorityV11.run();
      }
      if (window.PMDReservations2FloorV312) window.PMDReservations2FloorV312.refresh();
      if (window.PMDReservations2FinalFloorUIV466) window.PMDReservations2FinalFloorUIV466.refresh();
      if (window.PMDReservations2KpiTableColorsV467) window.PMDReservations2KpiTableColorsV467.refresh();
      window.dispatchEvent(new CustomEvent('pmd:reservation-saved', {detail:{version:1,mode:context.mode,source:context.source,reservationId:reservation.reservation_id,reservation:reservation,assignmentMode:assignmentMode,selectedDate:context.selectedDate,tableIds:(reservation.tables || []).map(function (table) { return table.table_id; }),returnView:context.returnView,refreshSucceeded:true}}));
    });
  }
  function controlledReload() {
    try { sessionStorage.setItem('pmd.reservationComposer.restore.v1', JSON.stringify({view:context.returnView,date:context.selectedDate})); } catch (ignore) {}
    window.location.reload();
  }
  function submit(event) {
    event.preventDefault(); if (saving) return; saving = true; clearErrors();
    var save = root.querySelector('[data-pmd-composer-save]'); save.disabled = true;
    var scroll = {x:window.scrollX,y:window.scrollY}; var data = payload();
    request('index_onSaveReservationComposer', data).then(function (response) {
      return refreshWorkspace(response.reservation, data.assignment_mode).then(function () { window.scrollTo(scroll.x, scroll.y); baseline = snapshot(); close(true); }).catch(controlledReload);
    }).catch(showError).finally(function () { saving = false; save.disabled = false; });
  }
  function clickOwner(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var element = event.target.closest(selectors); var page = document.getElementById('pmd-reservations2');
    if (!element || !page || !page.contains(element)) return;
    var next; try { next = normalize(element); } catch (error) { return; }
    if (!next || !window.PMDReservationComposerV1 || typeof window.PMDReservationComposerV1.open !== 'function') return;
    event.preventDefault(); event.stopImmediatePropagation();
    try { window.PMDReservationComposerV1.open(next, element).catch(function () { if (!root.classList.contains('show')) location.href = next.fallbackUrl; }); }
    catch (error) { location.href = next.fallbackUrl; }
  }

  form.insertAdjacentHTML('afterbegin', '<input type="hidden" name="reservation_id"><input type="hidden" name="source">');
  form.addEventListener('submit', submit);
  form.addEventListener('change', function (event) { if (event.target.name === 'location_id') { context.locationId = Number(event.target.value); context.tableIds = []; open(context, trigger); return; } scheduleAvailability(); });
  root.querySelectorAll('[data-pmd-composer-close],[data-pmd-composer-cancel]').forEach(function (button) { button.addEventListener('click', function () { close(false); }); });
  root.addEventListener('hide.bs.modal', function (event) { if (!allowHide) { event.preventDefault(); close(false); } });
  root.addEventListener('hidden.bs.modal', function () { allowHide = false; closing = false; root.classList.remove('pmd-reservation-composer-v1--closing'); document.body.classList.remove('pmd-reservation-composer-open-v1'); if (!document.querySelector('.modal.show')) document.body.classList.remove('modal-open'); if (trigger && trigger.isConnected) trigger.focus(); });
  root.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); close(false); } });
  document.addEventListener('click', clickOwner, true);

  window.PMDReservationComposerV1 = {version:'1.0.0', open:open, normalizeContext:normalize, close:close};
}());
