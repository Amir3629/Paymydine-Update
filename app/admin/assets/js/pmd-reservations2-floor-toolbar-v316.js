(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (path !== '/admin/reservations2') return;

  if (window.PMDReservations2FloorExperience) {
    window.PMDReservations2FloorExperience.refresh();
    return;
  }

  var VERSION = '4.0.0';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var FILTER_ID = 'pmd-r2-date-filter-v317';
  var SECTION_ID = 'pmd-r2-reservation-cards-v320';
  var GRID_ID = 'pmd-r2-reservation-grid-v320';
  var STORAGE_KEY = 'pmd.reservations2.dateRange.v1';
  var applying = false;
  var scheduled = false;
  var observer = null;
  var eventsBound = false;

  var state = {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
    tableId: null,
    tableName: null
  };

  var iconPaths = {
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>',
    zoomOut: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><path d="M8 11h6"></path>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M16 3h3a2 2 0 0 1 2 2v3"></path><path d="M8 21H5a2 2 0 0 1-2-2v-3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>',
    zoomIn: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><path d="M11 8v6"></path><path d="M8 11h6"></path>',
    strip: '<rect width="18" height="14" x="3" y="5" rx="2"></rect><path d="M3 10h18"></path>'
  };

  function floor() { return document.getElementById(FLOOR_ID); }
  function bootData() { return window.PMD_RESERVATIONS2_BOOT || {}; }
  function reservations() {
    return Array.isArray(bootData().reservations) ? bootData().reservations : [];
  }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function esc(value) {
    return clean(value).replace(/[&<>'"]/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character];
    });
  }
  function pad(value) { return String(value).padStart(2, '0'); }
  function startOfDay(value) { var date = new Date(value); date.setHours(0,0,0,0); return date; }
  function endOfDay(value) { var date = new Date(value); date.setHours(23,59,59,999); return date; }
  function addDays(value, days) { var date = new Date(value); date.setDate(date.getDate() + days); return date; }
  function dateKey(value) { return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate()); }
  function parseDateInput(value, end) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) return null;
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(date.getTime()) ? null : (end ? endOfDay(date) : startOfDay(date));
  }
  function validRange(start, end) {
    return Boolean(start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start);
  }
  function humanDate(value) {
    try { return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(value); }
    catch (error) { return dateKey(value); }
  }
  function humanTime(value) {
    try { return new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(value); }
    catch (error) { return pad(value.getHours()) + ':' + pad(value.getMinutes()); }
  }
  function rangeLabel() {
    return dateKey(state.start) === dateKey(state.end)
      ? humanDate(state.start)
      : humanDate(state.start) + ' – ' + humanDate(state.end);
  }
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + iconPaths[name] + '</svg>';
  }

  function restoreRange() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      var start = saved && parseDateInput(saved.start, false);
      var end = saved && parseDateInput(saved.end, true);
      if (validRange(start, end)) { state.start = start; state.end = end; }
    } catch (error) {}
  }
  function persistRange() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({start:dateKey(state.start),end:dateKey(state.end)})); }
    catch (error) {}
  }
  function setRange(start, end, persist) {
    if (!validRange(start, end)) return;
    state.start = start;
    state.end = end;
    if (persist !== false) persistRange();
    render();
  }

  function nativeControl(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector)).find(function (node) {
      return !node.closest('#' + TOOLBAR_ID);
    }) || null;
  }
  function activateNative(root, selector, fallback) {
    var control = nativeControl(root, selector);
    if (control) {
      control.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    } else if (typeof fallback === 'function') {
      fallback();
    }
  }
  function toolbarButton(options) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-r2-floor-tool-v316';
    button.setAttribute('data-pmd-r2-tool', options.key);
    button.setAttribute('title', options.title);
    button.setAttribute('aria-label', options.title);
    button.innerHTML = svg(options.icon) + (options.text ? '<span>' + esc(options.text) + '</span>' : '');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var root = floor();
      if (!root) return;
      activateNative(root, options.selector, options.fallback);
      schedule();
    });
    return button;
  }
  function ensureToolbar(root) {
    var statusbar = root.querySelector('.pmd-floor-v1__statusbar');
    if (!statusbar) return null;
    var toolbar = document.getElementById(TOOLBAR_ID);
    if (toolbar && toolbar.parentElement !== statusbar) { toolbar.remove(); toolbar = null; }
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = TOOLBAR_ID;
      toolbar.className = 'pmd-r2-floor-toolbar-v316';
      toolbar.setAttribute('role','toolbar');
      toolbar.setAttribute('aria-label','Floor map controls');
      [
        {key:'edit',icon:'edit',text:'Edit',title:'Edit layout',selector:'[data-floor-edit]'},
        {key:'save',icon:'save',text:'Save',title:'Save layout',selector:'[data-floor-save]'},
        {key:'zoom-out',icon:'zoomOut',title:'Zoom out',selector:'[data-floor-zoom-out]'},
        {key:'fit',icon:'fit',title:'Full Floor',selector:'[data-floor-fit]',fallback:function(){if(root.__pmdFloorV1&&root.__pmdFloorV1.fit)root.__pmdFloorV1.fit();}},
        {key:'zoom-in',icon:'zoomIn',title:'Zoom in',selector:'[data-floor-zoom-in]'},
        {key:'strip',icon:'strip',text:'One row',title:'One row tables',selector:'[data-floor-strip]'}
      ].forEach(function (item) { toolbar.appendChild(toolbarButton(item)); });
      statusbar.appendChild(toolbar);
    }
    root.querySelectorAll('[data-floor-secondary-toolbar],.pmd-floor-v1__secondary-toolbar,[data-pmd-r2-floor-toolbar-v313]').forEach(function (bar) {
      if (bar.id !== TOOLBAR_ID) bar.classList.add('pmd-r2-native-toolbar-v316-hidden');
    });
    root.querySelectorAll('[data-floor-mother-action],[data-floor-merge],[data-floor-fullscreen],[data-floor-refresh]').forEach(function (button) {
      if (!button.closest('#' + TOOLBAR_ID)) button.classList.add('pmd-r2-native-action-v316-hidden');
    });
    var floorState = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null;
    var editNative = nativeControl(root,'[data-floor-edit]');
    var editing = Boolean(floorState && floorState.editing) || Boolean(editNative && editNative.getAttribute('aria-pressed') === 'true');
    var edit = toolbar.querySelector('[data-pmd-r2-tool="edit"]');
    var save = toolbar.querySelector('[data-pmd-r2-tool="save"]');
    if (edit) edit.hidden = editing;
    if (save) save.hidden = !editing;
    var stripNative = nativeControl(root,'[data-floor-strip]');
    var strip = toolbar.querySelector('[data-pmd-r2-tool="strip"]');
    if (strip) {
      var pressed = Boolean(floorState && (floorState.stripMode || floorState.oneRowMode)) || Boolean(stripNative && stripNative.getAttribute('aria-pressed') === 'true');
      strip.setAttribute('aria-pressed',pressed ? 'true':'false');
      var label = strip.querySelector('span');
      if (label) label.textContent = pressed ? 'Floor' : 'One row';
    }
    return toolbar;
  }

  function presetName() {
    var today = startOfDay(new Date());
    var start = dateKey(state.start);
    var end = dateKey(state.end);
    if (start === dateKey(today) && end === dateKey(today)) return 'today';
    if (start === dateKey(addDays(today,1)) && end === dateKey(addDays(today,1))) return 'tomorrow';
    if (start === dateKey(today) && end === dateKey(addDays(today,6))) return 'week';
    var monthStart = new Date(today.getFullYear(),today.getMonth(),1);
    var monthEnd = new Date(today.getFullYear(),today.getMonth()+1,0);
    return start === dateKey(monthStart) && end === dateKey(monthEnd) ? 'month' : 'custom';
  }
  function ensureDateFilter() {
    var actions = document.querySelector('.pmd-r2__hero-actions') || document.querySelector('.pmd-r2-clean-header__actions') || document.querySelector('[data-pmd-header-actions]') || document.querySelector('#pmd-reservations2 header');
    if (!actions) return null;
    var panel = document.getElementById(FILTER_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = FILTER_ID;
      panel.className = 'pmd-r2-date-filter-v317';
      panel.innerHTML =
        '<div class="pmd-r2-date-filter-v317__quick">' +
          '<button type="button" data-range="today">Today</button>' +
          '<button type="button" data-range="tomorrow">Tomorrow</button>' +
          '<button type="button" data-range="week">7 days</button>' +
          '<button type="button" data-range="month">This month</button>' +
        '</div>' +
        '<label><span>From</span><input type="date" data-date-start></label>' +
        '<label><span>To</span><input type="date" data-date-end></label>' +
        '<div class="pmd-r2-date-filter-v317__summary" data-date-summary></div>';
      actions.insertBefore(panel,actions.firstChild);
      panel.addEventListener('click',function(event){
        var button = event.target.closest('[data-range]');
        if (!button) return;
        var today = startOfDay(new Date());
        if (button.dataset.range === 'today') setRange(today,endOfDay(today));
        if (button.dataset.range === 'tomorrow') { var tomorrow = addDays(today,1); setRange(tomorrow,endOfDay(tomorrow)); }
        if (button.dataset.range === 'week') setRange(today,endOfDay(addDays(today,6)));
        if (button.dataset.range === 'month') setRange(new Date(today.getFullYear(),today.getMonth(),1),endOfDay(new Date(today.getFullYear(),today.getMonth()+1,0)));
      });
      panel.addEventListener('change',function(){
        var start = parseDateInput(panel.querySelector('[data-date-start]').value,false) || state.start;
        var end = parseDateInput(panel.querySelector('[data-date-end]').value,true) || state.end;
        if (end < start) end = endOfDay(start);
        setRange(start,end);
      });
    }
    var startInput = panel.querySelector('[data-date-start]');
    var endInput = panel.querySelector('[data-date-end]');
    var summary = panel.querySelector('[data-date-summary]');
    if (startInput) startInput.value = dateKey(state.start);
    if (endInput) endInput.value = dateKey(state.end);
    if (summary) summary.textContent = rangeLabel() + (state.tableId ? ' · ' + (state.tableName || 'Table ' + state.tableId) : ' · All tables');
    var activePreset = presetName();
    panel.querySelectorAll('[data-range]').forEach(function(button){
      var active = button.dataset.range === activePreset;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',active ? 'true':'false');
    });
    return panel;
  }

  function reservationStart(item) {
    var direct = item && (item.reservation_datetime || item.start_at || item.starts_at);
    if (direct) {
      var parsed = new Date(direct);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    var rawDate = item && (item.reserve_date || item.reservation_date || item.booking_date || item.date);
    if (!rawDate) return null;
    var parts = String(rawDate).slice(0,10).split(/[-/]/).map(Number);
    if (parts.length !== 3) return null;
    var time = String(item.reserve_time || item.reservation_time || item.booking_time || item.time || '00:00:00').split(':').map(Number);
    return new Date(parts[0],parts[1]-1,parts[2],time[0]||0,time[1]||0,time[2]||0,0);
  }
  function tableIds(item) {
    var ids = [];
    function add(value) {
      var number = Number(value);
      if (Number.isFinite(number) && number > 0 && ids.indexOf(String(number)) === -1) ids.push(String(number));
    }
    add(item && item.table_id);
    if (item && Array.isArray(item.tables)) item.tables.forEach(function(table){add(table && typeof table === 'object' ? (table.table_id || table.id) : table);});
    return ids;
  }
  function tableLabel(item) {
    var names = [];
    if (item && Array.isArray(item.tables)) item.tables.forEach(function(table){
      if (table && typeof table === 'object') names.push(table.table_name || table.name || table.table_number);
    });
    names = names.filter(Boolean);
    if (names.length) return names.join(', ');
    var ids = tableIds(item);
    return ids.length ? ids.map(function(id){return 'Table ' + id;}).join(', ') : 'Unassigned';
  }
  function guestName(item) { return item.customer_name || [item.first_name,item.last_name].filter(Boolean).join(' ') || item.guest_name || 'Guest'; }
  function guestCount(item) { return Number(item.guest_num || item.guests || item.party_size || item.covers || 0) || 0; }
  function statusLabel(item) { return clean(item.status_name || item.status || item.reservation_status || 'Scheduled'); }
  function statusState(item) {
    var status = statusLabel(item).toLowerCase();
    if (/cancel|declin|no.?show/.test(status)) return 'payment';
    if (/complete|finish|closed/.test(status)) return 'served';
    if (/seat|active|arriv|check.?in/.test(status)) return 'open';
    if (/pending|request|wait/.test(status)) return 'attention';
    return 'free';
  }
  function inRange(item) {
    var start = reservationStart(item);
    if (!start || start < state.start || start > state.end) return false;
    return !state.tableId || tableIds(item).indexOf(String(state.tableId)) !== -1;
  }
  function filteredReservations() {
    return reservations().filter(inRange).sort(function(left,right){return reservationStart(left)-reservationStart(right);});
  }
  function editUrl(item) {
    var id = item && (item.reservation_id || item.id);
    var base = clean(bootData().editBaseUrl || '/admin/reservations/edit').replace(/\/$/,'');
    return id ? base + '/' + encodeURIComponent(id) : '#';
  }
  function createUrl() {
    var base = clean(bootData().createUrl || '/admin/reservations/create');
    try {
      var url = new URL(base,window.location.origin);
      if (state.tableId) {
        url.searchParams.set('table_id',state.tableId);
        url.searchParams.set('table',state.tableId);
      }
      url.searchParams.set('reserve_date',dateKey(state.start));
      return url.pathname + url.search + url.hash;
    } catch (error) { return base; }
  }

  function ensureCardsSection() {
    var root = floor();
    if (!root || !root.parentElement) return null;
    var legacy = document.getElementById('pmd-r2-reservation-cards-v317');
    if (legacy) legacy.remove();
    var section = document.getElementById(SECTION_ID);
    if (!section) {
      section = document.createElement('section');
      section.id = SECTION_ID;
      section.className = 'pmd-r2-reservation-cards-v320';
      section.innerHTML =
        '<div class="pmd-r2-reservation-cards-v320__head">' +
          '<div><strong data-r2-card-title>Reservations</strong><span data-r2-card-subtitle></span></div>' +
          '<button type="button" data-r2-show-all hidden>Show all tables</button>' +
        '</div>' +
        '<div id="' + GRID_ID + '" class="pmd-r2-reservation-grid-v320"></div>';
      root.insertAdjacentElement('afterend',section);
      section.querySelector('[data-r2-show-all]').addEventListener('click',function(){
        state.tableId = null; state.tableName = null; clearTableSelection(); render();
      });
    }
    return section;
  }
  function addCardMarkup() {
    return '<a class="pmd-v2-table-key pmd-v21-table-key pmd-r2-reservation-key pmd-r2-add-reservation-key is-free" href="' + esc(createUrl()) + '" data-r2-add-reservation>' +
      '<span class="pmd-v2-table-state">NEW</span>' +
      '<strong aria-hidden="true">＋</strong>' +
      '<span class="pmd-v2-table-name">ADD RESERVATION</span>' +
      '<span class="pmd-v2-table-info"><b>' + esc(state.tableId ? (state.tableName || 'Table ' + state.tableId) : 'Choose a table') + '</b><small>' + esc(rangeLabel()) + '</small></span>' +
    '</a>';
  }
  function reservationCardMarkup(item) {
    var start = reservationStart(item);
    var url = editUrl(item);
    var tag = url === '#' ? 'article' : 'a';
    var href = url === '#' ? '' : ' href="' + esc(url) + '"';
    var guests = guestCount(item);
    var id = item.reservation_id || item.id || '';
    return '<' + tag + href + ' class="pmd-v2-table-key pmd-v21-table-key pmd-r2-reservation-key is-' + esc(statusState(item)) + '" data-r2-reservation-id="' + esc(id) + '">' +
      '<span class="pmd-v2-table-state">' + esc(statusLabel(item).toUpperCase()) + '</span>' +
      '<strong>' + esc(start ? humanTime(start) : '—') + '</strong>' +
      '<span class="pmd-v2-table-name">' + esc(guestName(item)) + '</span>' +
      '<span class="pmd-v2-table-info"><b>' + esc(tableLabel(item)) + '</b><small>' + esc((guests ? guests + ' guests' : 'Guests not set') + ' · ' + (start ? humanDate(start) : 'Date unavailable')) + '</small></span>' +
    '</' + tag + '>';
  }
  function clearTableSelection() {
    var root = floor();
    if (!root) return;
    root.querySelectorAll('[data-pmd-r2-selected-table-v320],.pmd-r2-table-selected-v317').forEach(function(node){
      node.removeAttribute('data-pmd-r2-selected-table-v320');
      node.classList.remove('pmd-r2-table-selected-v317');
    });
  }
  function markSelectedTable() {
    var root = floor();
    if (!root) return;
    clearTableSelection();
    if (!state.tableId) return;
    root.querySelectorAll('[data-floor-table]').forEach(function(node){
      var ids = [node.getAttribute('data-floor-table'),node.getAttribute('data-table-id'),node.getAttribute('data-floor-table-id')].filter(Boolean).map(String);
      if (ids.indexOf(String(state.tableId)) !== -1) {
        node.setAttribute('data-pmd-r2-selected-table-v320','true');
        node.classList.add('pmd-r2-table-selected-v317');
      }
    });
  }
  function updateKpis(items) {
    var now = new Date();
    var upcoming = items.filter(function(item){var start=reservationStart(item);return start&&start>=now;}).length;
    var pending = items.filter(function(item){return /pending|confirm|request|wait/i.test(statusLabel(item));}).length;
    var tables = new Set();
    items.forEach(function(item){tableIds(item).forEach(function(id){tables.add(id);});});
    var values = {today:items.length,upcoming:upcoming,pending:pending,tables:tables.size};
    Object.keys(values).forEach(function(key){var node=document.querySelector('[data-r2-v308-value="'+key+'"]');if(node)node.textContent=String(values[key]);});
  }
  function renderCards(items) {
    var section = ensureCardsSection();
    if (!section) return;
    var title = section.querySelector('[data-r2-card-title]');
    var subtitle = section.querySelector('[data-r2-card-subtitle]');
    var reset = section.querySelector('[data-r2-show-all]');
    var grid = document.getElementById(GRID_ID);
    var selected = state.tableId ? (state.tableName || 'Table ' + state.tableId) : 'All tables';
    if (title) title.textContent = state.tableId ? 'Reservations for ' + selected : 'Reservations';
    if (subtitle) subtitle.textContent = rangeLabel() + ' · ' + items.length + ' reservation' + (items.length === 1 ? '' : 's');
    if (reset) reset.hidden = !state.tableId;
    if (grid) grid.innerHTML = addCardMarkup() + items.map(reservationCardMarkup).join('');
    section.setAttribute('data-reservation-count',String(items.length));
  }

  function render() {
    if (applying) return;
    applying = true;
    try {
      var root = floor();
      if (!root) return;
      ensureToolbar(root);
      ensureDateFilter();
      var items = filteredReservations();
      updateKpis(items);
      markSelectedTable();
      renderCards(items);
      document.documentElement.classList.add('pmd-r2-reservation-experience-ready');
      root.setAttribute('data-pmd-r2-toolbar-authority','floor-experience-v4');
      window.dispatchEvent(new CustomEvent('pmd:reservations2-filter-change',{detail:{start:dateKey(state.start),end:dateKey(state.end),tableId:state.tableId,tableName:state.tableName,count:items.length}}));
    } finally { applying = false; }
  }
  function tableIdFromNode(node) {
    var direct = node && (node.getAttribute('data-floor-table') || node.getAttribute('data-table-id') || node.getAttribute('data-floor-table-id') || node.dataset.tableId || node.dataset.id);
    if (direct && Number(direct) > 0) return String(Number(direct));
    var members = clean(node && node.getAttribute('data-floor-members')).split(',').filter(Boolean);
    if (members.length && Number(members[0]) > 0) return String(Number(members[0]));
    var match = clean(node && node.textContent).match(/\b(\d+)\b/);
    return match ? String(Number(match[1])) : null;
  }
  function tableNameFromNode(node,id) {
    var nameNode = node.querySelector('.pmd-floor-v1__name,[data-floor-table-name],strong');
    var name = clean(nameNode && nameNode.textContent);
    if (name) return /^table\s/i.test(name) ? name : 'Table ' + name;
    var label = clean(node.getAttribute('aria-label') || node.getAttribute('title'));
    return label ? label.split(' — ')[0] : 'Table ' + id;
  }
  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    document.addEventListener('click',function(event){
      var root = floor();
      if (!root || !root.contains(event.target)) return;
      var table = event.target.closest('[data-floor-table]');
      if (!table || !root.contains(table)) return;
      var floorState = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null;
      if (floorState && floorState.editing) return;
      var id = tableIdFromNode(table);
      if (!id) return;
      state.tableId = id;
      state.tableName = tableNameFromNode(table,id);
      render();
      window.setTimeout(function(){var section=document.getElementById(SECTION_ID);if(section)section.scrollIntoView({behavior:'smooth',block:'start'});},30);
    },true);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function(){scheduled=false;render();});
  }
  function connectObserver() {
    var root = floor();
    if (!root) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(function(mutations){
      var relevant = mutations.some(function(mutation){return mutation.type==='childList'||['hidden','aria-pressed','data-status','data-floor-members'].indexOf(mutation.attributeName)!==-1;});
      if (relevant) schedule();
    });
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-pressed','data-status','data-floor-members']});
  }
  function audit() {
    var items = filteredReservations();
    var persisted = null;
    try { persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) {}
    return {
      version:VERSION,
      floor:Boolean(floor()),
      toolbar:Boolean(document.getElementById(TOOLBAR_ID)),
      dateFilter:Boolean(document.getElementById(FILTER_ID)),
      section:Boolean(document.getElementById(SECTION_ID)),
      totalReservations:reservations().length,
      filteredReservations:items.length,
      visibleReservationCards:document.querySelectorAll('#'+GRID_ID+' [data-r2-reservation-id]').length,
      addReservationCard:Boolean(document.querySelector('#'+GRID_ID+' [data-r2-add-reservation]')),
      selectedTable:state.tableId,
      range:[dateKey(state.start),dateKey(state.end)],
      persistedRange:persisted
    };
  }

  function boot() {
    restoreRange();
    bindEvents();
    render();
    connectObserver();
    document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule();});
    console.info('[PMD Reservations2 Floor Experience V4] Ready',audit());
  }

  var api = {
    version:VERSION,
    refresh:schedule,
    renderReservations:schedule,
    setRange:function(start,end){var parsedStart=parseDateInput(start,false);var parsedEnd=parseDateInput(end,true);if(validRange(parsedStart,parsedEnd))setRange(parsedStart,parsedEnd);},
    clearTable:function(){state.tableId=null;state.tableName=null;clearTableSelection();render();},
    getState:function(){return{start:dateKey(state.start),end:dateKey(state.end),tableId:state.tableId,tableName:state.tableName};},
    audit:audit,
    destroy:function(){if(observer)observer.disconnect();observer=null;}
  };

  window.PMDReservations2FloorExperience = api;
  window.PMDReservations2FloorToolbarV316 = api;
  window.PMDReservations2CardsV320 = {version:VERSION,refresh:schedule,showAll:api.clearTable,audit:audit};
  window.PMDReservations2ScrollV322 = {version:VERSION,refresh:schedule,audit:audit};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
