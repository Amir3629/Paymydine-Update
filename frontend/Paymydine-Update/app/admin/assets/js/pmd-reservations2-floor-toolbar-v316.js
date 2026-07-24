(function () {
  'use strict';

  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var FILTER_ID = 'pmd-r2-date-filter-v317';
  var CARDS_ID = 'pmd-r2-reservation-cards-v317';
  var applying = false;
  var observer = null;
  var featureBound = false;

  var filterState = {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
    tableId: null,
    tableName: null
  };

  var icons = {
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>',
    zoomOut: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><path d="M8 11h6"></path>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M16 3h3a2 2 0 0 1 2 2v3"></path><path d="M8 21H5a2 2 0 0 1-2-2v-3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>',
    zoomIn: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><path d="M11 8v6"></path><path d="M8 11h6"></path>',
    strip: '<rect width="18" height="14" x="3" y="5" rx="2"></rect><path d="M3 10h18"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>',
    table: '<path d="M3 10h18M5 10v8M19 10v8M4 6h16a1 1 0 0 1 1 1v3H3V7a1 1 0 0 1 1-1z"></path>'
  };

  function floor() { return document.getElementById(FLOOR_ID); }
  function bootData() { return window.PMD_RESERVATIONS2_BOOT || {}; }
  function reservations() { return Array.isArray(bootData().reservations) ? bootData().reservations : []; }
  function pad(value) { return String(value).padStart(2, '0'); }
  function startOfDay(date) { var d = new Date(date); d.setHours(0,0,0,0); return d; }
  function endOfDay(date) { var d = new Date(date); d.setHours(23,59,59,999); return d; }
  function addDays(date, days) { var d = new Date(date); d.setDate(d.getDate() + days); return d; }
  function inputDate(date) { return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()); }
  function parseInputDate(value, end) { var parts = String(value || '').split('-').map(Number); if (parts.length !== 3) return null; return end ? endOfDay(new Date(parts[0],parts[1]-1,parts[2])) : startOfDay(new Date(parts[0],parts[1]-1,parts[2])); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]; }); }
  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>'; }

  function nativeControl(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector)).find(function (control) {
      return !control.closest('#' + TOOLBAR_ID);
    }) || null;
  }

  function activateNative(root, selector, fallback) {
    var button = nativeControl(root, selector);
    if (button) {
      button.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,view:window}));
      return true;
    }
    if (typeof fallback === 'function') { fallback(); return true; }
    return false;
  }

  function makeButton(options) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-r2-floor-tool-v316';
    button.setAttribute('data-pmd-r2-tool', options.key);
    button.setAttribute('title', options.title);
    button.setAttribute('aria-label', options.title);
    button.innerHTML = svg(options.icon) + (options.text ? '<span>' + options.text + '</span>' : '');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var root = floor();
      if (!root) return;
      options.onClick(root);
      window.requestAnimationFrame(refresh);
    });
    return button;
  }

  function createToolbar(root) {
    var statusbar = root.querySelector('.pmd-floor-v1__statusbar');
    if (!statusbar) return null;
    var toolbar = document.getElementById(TOOLBAR_ID);
    if (toolbar && toolbar.parentElement !== statusbar) { toolbar.remove(); toolbar = null; }
    if (toolbar) return toolbar;
    toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;
    toolbar.className = 'pmd-r2-floor-toolbar-v316';
    toolbar.setAttribute('role','toolbar');
    toolbar.setAttribute('aria-label','Floor map controls');
    [
      {key:'edit',icon:'edit',text:'Edit',title:'Edit layout',selector:'[data-floor-edit]'},
      {key:'save',icon:'save',text:'Save',title:'Save layout',selector:'[data-floor-save]'},
      {key:'zoom-out',icon:'zoomOut',title:'Zoom out',selector:'[data-floor-zoom-out]'},
      {key:'fit',icon:'fit',title:'Full Floor',selector:'[data-floor-fit]',fallback:function(){ if(root.__pmdFloorV1 && root.__pmdFloorV1.fit) root.__pmdFloorV1.fit(); }},
      {key:'zoom-in',icon:'zoomIn',title:'Zoom in',selector:'[data-floor-zoom-in]'},
      {key:'strip',icon:'strip',text:'One row',title:'One row tables',selector:'[data-floor-strip]'}
    ].forEach(function (item) {
      toolbar.appendChild(makeButton({key:item.key,icon:item.icon,text:item.text,title:item.title,onClick:function(){activateNative(root,item.selector,item.fallback);}}));
    });
    statusbar.appendChild(toolbar);
    return toolbar;
  }

  function preserveAndHideNativeControls(root) {
    root.querySelectorAll('[data-floor-secondary-toolbar],.pmd-floor-v1__secondary-toolbar,[data-pmd-r2-floor-toolbar-v313]').forEach(function (bar) {
      if (bar.id !== TOOLBAR_ID) bar.classList.add('pmd-r2-native-toolbar-v316-hidden');
    });
    root.querySelectorAll('[data-floor-mother-action],[data-floor-merge],[data-floor-fullscreen],[data-floor-refresh]').forEach(function (button) {
      if (!button.closest('#' + TOOLBAR_ID)) button.classList.add('pmd-r2-native-action-v316-hidden');
    });
  }

  function syncToolbar(root, toolbar) {
    if (!toolbar) return;
    var state = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null;
    var editNative = nativeControl(root,'[data-floor-edit]');
    var editing = Boolean(state && state.editing) || Boolean(editNative && editNative.getAttribute('aria-pressed') === 'true');
    var edit = toolbar.querySelector('[data-pmd-r2-tool="edit"]');
    var save = toolbar.querySelector('[data-pmd-r2-tool="save"]');
    if (edit) edit.hidden = editing;
    if (save) save.hidden = !editing;
    var stripNative = nativeControl(root,'[data-floor-strip]');
    var strip = toolbar.querySelector('[data-pmd-r2-tool="strip"]');
    if (strip) {
      var pressed = Boolean(state && (state.stripMode || state.oneRowMode)) || Boolean(stripNative && stripNative.getAttribute('aria-pressed') === 'true');
      strip.setAttribute('aria-pressed',pressed ? 'true':'false');
      var label = strip.querySelector('span');
      if (label) label.textContent = pressed ? 'Floor':'One row';
    }
  }

  function reservationStart(item) {
    var direct = item && (item.reservation_datetime || item.start_at || item.starts_at);
    var date = direct ? new Date(direct) : null;
    if (date && !Number.isNaN(date.getTime())) return date;
    var rawDate = item && (item.reserve_date || item.reservation_date || item.date);
    if (!rawDate) return null;
    var parts = String(rawDate).slice(0,10).split(/[-\/]/).map(Number);
    if (parts.length !== 3) return null;
    var time = String(item.reserve_time || item.reservation_time || item.time || '00:00').split(':').map(Number);
    return new Date(parts[0],parts[1]-1,parts[2],time[0]||0,time[1]||0,time[2]||0,0);
  }

  function tableIds(item) {
    var ids = [];
    function add(value) { var id = Number(value); if (Number.isFinite(id) && id > 0 && ids.indexOf(String(id)) === -1) ids.push(String(id)); }
    add(item && item.table_id);
    if (item && Array.isArray(item.tables)) item.tables.forEach(function (table) { add(table && typeof table === 'object' ? (table.table_id || table.id) : table); });
    return ids;
  }

  function statusOf(item) { return String((item && (item.status_name || item.status || item.reservation_status)) || '').toLowerCase(); }
  function customerName(item) { return item.customer_name || [item.first_name,item.last_name].filter(Boolean).join(' ') || item.guest_name || 'Guest'; }
  function partySize(item) { return Number(item.guest_num || item.guests || item.party_size || item.covers || 0) || 0; }
  function tableLabel(item) {
    var names = [];
    if (Array.isArray(item.tables)) item.tables.forEach(function (table) { if (table && typeof table === 'object') names.push(table.table_name || table.name || table.table_number); });
    if (names.length) return names.filter(Boolean).join(', ');
    var ids = tableIds(item);
    return ids.length ? ids.map(function(id){return 'Table ' + id;}).join(', ') : 'Unassigned';
  }

  function inRange(item) {
    var start = reservationStart(item);
    if (!start || start < filterState.start || start > filterState.end) return false;
    if (filterState.tableId && tableIds(item).indexOf(String(filterState.tableId)) === -1) return false;
    return true;
  }

  function filteredReservations() {
    return reservations().filter(inRange).sort(function (a,b) { return reservationStart(a) - reservationStart(b); });
  }

  function humanDate(date) {
    try { return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(date); }
    catch (e) { return inputDate(date); }
  }
  function humanTime(date) {
    try { return new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(date); }
    catch (e) { return pad(date.getHours()) + ':' + pad(date.getMinutes()); }
  }
  function rangeLabel() { return inputDate(filterState.start) === inputDate(filterState.end) ? humanDate(filterState.start) : humanDate(filterState.start) + ' – ' + humanDate(filterState.end); }

  function ensureDateFilter() {
    var actions = document.querySelector('.pmd-r2__hero-actions') || document.getElementById('pmd-r2-clean-header') || document.querySelector('#pmd-reservations2 header');
    if (!actions) return null;
    var panel = document.getElementById(FILTER_ID);
    if (panel) return panel;
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
    actions.insertBefore(panel, actions.firstChild);
    panel.querySelector('[data-date-start]').value = inputDate(filterState.start);
    panel.querySelector('[data-date-end]').value = inputDate(filterState.end);
    panel.addEventListener('click', function (event) {
      var button = event.target.closest('[data-range]');
      if (!button) return;
      var now = startOfDay(new Date());
      if (button.dataset.range === 'today') { filterState.start = now; filterState.end = endOfDay(now); }
      if (button.dataset.range === 'tomorrow') { filterState.start = addDays(now,1); filterState.end = endOfDay(filterState.start); }
      if (button.dataset.range === 'week') { filterState.start = now; filterState.end = endOfDay(addDays(now,6)); }
      if (button.dataset.range === 'month') { filterState.start = new Date(now.getFullYear(),now.getMonth(),1); filterState.end = endOfDay(new Date(now.getFullYear(),now.getMonth()+1,0)); }
      panel.querySelector('[data-date-start]').value = inputDate(filterState.start);
      panel.querySelector('[data-date-end]').value = inputDate(filterState.end);
      renderReservationExperience();
    });
    panel.addEventListener('change', function (event) {
      if (event.target.matches('[data-date-start]')) filterState.start = parseInputDate(event.target.value,false) || filterState.start;
      if (event.target.matches('[data-date-end]')) filterState.end = parseInputDate(event.target.value,true) || filterState.end;
      if (filterState.end < filterState.start) filterState.end = endOfDay(filterState.start);
      renderReservationExperience();
    });
    return panel;
  }

  function ensureCardsSection() {
    var root = floor();
    if (!root || !root.parentElement) return null;
    var section = document.getElementById(CARDS_ID);
    if (section) return section;
    section = document.createElement('section');
    section.id = CARDS_ID;
    section.className = 'pmd-r2-reservation-cards-v317';
    root.insertAdjacentElement('afterend', section);
    return section;
  }

  function updateKpis(items) {
    var now = new Date();
    var upcoming = items.filter(function(item){var d=reservationStart(item);return d && d >= now;}).length;
    var pending = items.filter(function(item){var s=statusOf(item);return s.indexOf('pending') !== -1 || s.indexOf('confirm') !== -1;}).length;
    var tables = new Set();
    items.forEach(function(item){tableIds(item).forEach(function(id){tables.add(id);});});
    var values = {today:items.length,upcoming:upcoming,pending:pending,tables:tables.size};
    Object.keys(values).forEach(function(key){
      var value = document.querySelector('[data-r2-v308-value="' + key + '"]');
      if (value) value.textContent = String(values[key]);
    });
    var titles = {
      today: inputDate(filterState.start) === inputDate(filterState.end) ? 'Reservations' : 'Reservations in Range',
      upcoming:'Upcoming Arrivals',pending:'Pending Confirmations',tables:'Reservation Tables'
    };
    Object.keys(titles).forEach(function(key){var card=document.querySelector('[data-r2-v308-card="'+key+'"]');var title=card&&card.querySelector('.pmd-r2-v308-title');if(title) title.textContent=titles[key];});
  }

  function renderReservationCards(items) {
    var section = ensureCardsSection();
    if (!section) return;
    var selected = filterState.tableId ? ('Table ' + (filterState.tableName || filterState.tableId)) : 'All tables';
    var header = '<div class="pmd-r2-reservation-cards-v317__header"><div><span class="pmd-r2-reservation-cards-v317__eyebrow">' + esc(rangeLabel()) + '</span><h2>' + (filterState.tableId ? 'Reservations for ' + esc(selected) : 'Reservations') + '</h2><p>' + esc(selected) + ' · ' + items.length + ' booking' + (items.length === 1 ? '' : 's') + '</p></div>' + (filterState.tableId ? '<button type="button" data-clear-table>Show all tables</button>' : '') + '</div>';
    if (!items.length) {
      section.innerHTML = header + '<div class="pmd-r2-reservation-cards-v317__empty">' + svg('calendar') + '<strong>No reservations found</strong><span>There are no reservations for the selected date range' + (filterState.tableId ? ' and table' : '') + '.</span></div>';
      return;
    }
    var cards = items.map(function(item){
      var start = reservationStart(item);
      var status = statusOf(item) || 'scheduled';
      var note = item.comment || item.notes || item.reservation_note || '';
      var editUrl = bootData().editBaseUrl && item.reservation_id ? bootData().editBaseUrl.replace(/\/$/,'') + '/' + encodeURIComponent(item.reservation_id) : '#';
      return '<article class="pmd-r2-reservation-card-v317"><div class="pmd-r2-reservation-card-v317__top"><span class="pmd-r2-reservation-card-v317__time">' + esc(start ? humanTime(start) : '—') + '</span><span class="pmd-r2-reservation-card-v317__status">' + esc(status) + '</span></div><h3>' + esc(customerName(item)) + '</h3><div class="pmd-r2-reservation-card-v317__meta"><span>' + svg('calendar') + esc(start ? humanDate(start) : 'Date unavailable') + '</span><span>' + svg('users') + esc(partySize(item) ? partySize(item) + ' guests' : 'Guests not set') + '</span><span>' + svg('table') + esc(tableLabel(item)) + '</span></div>' + (note ? '<p class="pmd-r2-reservation-card-v317__note">' + esc(note) + '</p>' : '') + (editUrl !== '#' ? '<a href="' + esc(editUrl) + '">Open reservation</a>' : '') + '</article>';
    }).join('');
    section.innerHTML = header + '<div class="pmd-r2-reservation-cards-v317__grid">' + cards + '</div>';
  }

  function renderReservationExperience() {
    var panel = ensureDateFilter();
    if (panel) {
      var summary = panel.querySelector('[data-date-summary]');
      if (summary) summary.textContent = rangeLabel() + (filterState.tableId ? ' · Table ' + (filterState.tableName || filterState.tableId) : ' · All tables');
    }
    var items = filteredReservations();
    updateKpis(items);
    renderReservationCards(items);
    document.querySelectorAll('#' + FLOOR_ID + ' [data-floor-table]').forEach(function(table){
      table.classList.toggle('pmd-r2-table-selected-v317', Boolean(filterState.tableId && String(table.dataset.floorTable) === String(filterState.tableId)));
    });
  }

  function bindReservationExperience() {
    if (featureBound) return;
    var root = floor();
    if (!root) return;
    featureBound = true;
    root.addEventListener('click', function (event) {
      var table = event.target.closest('[data-floor-table]');
      if (!table || !root.contains(table)) return;
      var state = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null;
      if (state && state.editing) return;
      filterState.tableId = table.dataset.floorTable || null;
      var nameNode = table.querySelector('.pmd-floor-v1__name,[data-floor-table-name],strong');
      filterState.tableName = nameNode ? nameNode.textContent.trim() : filterState.tableId;
      renderReservationExperience();
      setTimeout(function(){var section=document.getElementById(CARDS_ID);if(section)section.scrollIntoView({behavior:'smooth',block:'start'});},30);
    }, true);
    document.addEventListener('click', function(event){if(event.target.closest('[data-clear-table]')){filterState.tableId=null;filterState.tableName=null;renderReservationExperience();}});
    renderReservationExperience();
  }

  function refresh() {
    if (applying) return;
    var root = floor();
    if (!root) return;
    applying = true;
    try {
      var old = document.getElementById('pmd-r2-floor-toolbar-v315');
      if (old) old.remove();
      var toolbar = createToolbar(root);
      preserveAndHideNativeControls(root);
      syncToolbar(root,toolbar);
      bindReservationExperience();
      root.setAttribute('data-pmd-r2-toolbar-authority','v317');
    } finally { applying = false; }
  }

  function boot() {
    refresh();
    var root = floor();
    if (!root) return;
    observer = new MutationObserver(function(){window.requestAnimationFrame(refresh);});
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-pressed','class','style']});
    [0,50,150,300,700,1200,2000,3500,5000,8000].forEach(function(delay){setTimeout(refresh,delay);});
    console.info('[PMD Reservations2 Toolbar + Reservation Experience V3.1.7] Ready',{reservations:reservations().length,floorInstance:Boolean(root.__pmdFloorV1)});
  }

  window.PMDReservations2FloorToolbarV316 = {
    version:'3.1.7',
    refresh:refresh,
    renderReservations:renderReservationExperience,
    setRange:function(start,end){var s=parseInputDate(start,false);var e=parseInputDate(end,true);if(s&&e){filterState.start=s;filterState.end=e;renderReservationExperience();}},
    clearTable:function(){filterState.tableId=null;filterState.tableName=null;renderReservationExperience();},
    audit:function(){var root=floor();return {floor:Boolean(root),instance:Boolean(root&&root.__pmdFloorV1),reservations:reservations().length,filtered:filteredReservations().length,selectedTable:filterState.tableId,range:[inputDate(filterState.start),inputDate(filterState.end)]};}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();