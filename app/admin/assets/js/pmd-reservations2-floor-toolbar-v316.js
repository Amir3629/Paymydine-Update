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
/* PMD Reservations2 Reservation Cards Always V3.2.0 */
(function () {
  'use strict';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var SECTION_ID =
    'pmd-r2-reservation-cards-v320';

  var GRID_ID =
    'pmd-r2-reservation-grid-v320';

  var selectedTableId = null;
  var selectedTableName = null;
  var bound = false;

  function floor() {
    return document.getElementById(
      FLOOR_ID
    );
  }

  function bootData() {
    return window.PMD_RESERVATIONS2_BOOT || {};
  }

  function reservations() {
    var data = bootData();

    if (
      Array.isArray(data.reservations)
    ) {
      return data.reservations;
    }

    if (
      Array.isArray(
        window.PMD_RESERVATIONS2_RESERVATIONS
      )
    ) {
      return window
        .PMD_RESERVATIONS2_RESERVATIONS;
    }

    return [];
  }

  function esc(value) {
    return String(
      value == null ? '' : value
    ).replace(
      /[&<>'"]/g,
      function (character) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[character];
      }
    );
  }

  function reservationDate(item) {
    var direct =
      item &&
      (
        item.reservation_datetime ||
        item.start_at ||
        item.starts_at
      );

    if (direct) {
      var directDate = new Date(direct);

      if (
        !Number.isNaN(
          directDate.getTime()
        )
      ) {
        return directDate;
      }
    }

    var rawDate =
      item &&
      (
        item.reserve_date ||
        item.reservation_date ||
        item.date
      );

    if (!rawDate) {
      return null;
    }

    var dateParts = String(rawDate)
      .slice(0, 10)
      .split(/[-\/]/)
      .map(Number);

    if (dateParts.length !== 3) {
      return null;
    }

    var rawTime = String(
      (
        item.reserve_time ||
        item.reservation_time ||
        item.time ||
        '00:00:00'
      )
    );

    var timeParts = rawTime
      .split(':')
      .map(Number);

    return new Date(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2],
      timeParts[0] || 0,
      timeParts[1] || 0,
      timeParts[2] || 0,
      0
    );
  }

  function isToday(date) {
    if (!date) {
      return false;
    }

    var now = new Date();

    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate()
    );
  }

  function tableIds(item) {
    var ids = [];

    function add(value) {
      var number = Number(value);

      if (
        Number.isFinite(number) &&
        number > 0
      ) {
        var id = String(number);

        if (
          ids.indexOf(id) === -1
        ) {
          ids.push(id);
        }
      }
    }

    add(item && item.table_id);

    if (
      item &&
      Array.isArray(item.tables)
    ) {
      item.tables.forEach(
        function (table) {
          if (
            table &&
            typeof table === 'object'
          ) {
            add(
              table.table_id ||
              table.id
            );
          } else {
            add(table);
          }
        }
      );
    }

    return ids;
  }

  function tableLabel(item) {
    var names = [];

    if (
      item &&
      Array.isArray(item.tables)
    ) {
      item.tables.forEach(
        function (table) {
          if (
            table &&
            typeof table === 'object'
          ) {
            var name =
              table.table_name ||
              table.name ||
              table.table_number;

            if (name) {
              names.push(name);
            }
          }
        }
      );
    }

    if (names.length) {
      return names.join(', ');
    }

    var ids = tableIds(item);

    if (ids.length) {
      return ids.map(
        function (id) {
          return 'Table ' + id;
        }
      ).join(', ');
    }

    return 'Unassigned';
  }

  function guestName(item) {
    return (
      item.customer_name ||
      item.guest_name ||
      [
        item.first_name,
        item.last_name
      ].filter(Boolean).join(' ') ||
      'Guest'
    );
  }

  function guestCount(item) {
    return Number(
      item.guest_num ||
      item.guests ||
      item.party_size ||
      item.covers ||
      0
    ) || 0;
  }

  function statusLabel(item) {
    return String(
      item.status_name ||
      item.status ||
      item.reservation_status ||
      'Pending'
    );
  }

  function formatTime(date) {
    if (!date) {
      return '--:--';
    }

    try {
      return new Intl.DateTimeFormat(
        undefined,
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      ).format(date);
    } catch (error) {
      return String(
        date.getHours()
      ).padStart(2, '0') +
        ':' +
        String(
          date.getMinutes()
        ).padStart(2, '0');
    }
  }

  function ensureSection() {
    var floorRoot = floor();

    if (!floorRoot) {
      return null;
    }

    var section =
      document.getElementById(
        SECTION_ID
      );

    if (section) {
      return section;
    }

    section =
      document.createElement('section');

    section.id = SECTION_ID;
    section.className =
      'pmd-r2-reservation-cards-v320';

    section.innerHTML =
      '<div class="pmd-r2-reservation-cards-v320__head">' +
        '<div>' +
          '<strong data-r2-card-title>' +
            'Today’s reservations' +
          '</strong>' +
          '<span data-r2-card-subtitle>' +
            'All tables' +
          '</span>' +
        '</div>' +
        '<button type="button" ' +
          'data-r2-show-all hidden>' +
          'Show all tables' +
        '</button>' +
      '</div>' +
      '<div id="' + GRID_ID + '" ' +
        'class="pmd-r2-reservation-grid-v320">' +
      '</div>';

    floorRoot.insertAdjacentElement(
      'afterend',
      section
    );

    var reset =
      section.querySelector(
        '[data-r2-show-all]'
      );

    reset.addEventListener(
      'click',
      function () {
        selectedTableId = null;
        selectedTableName = null;

        clearTableSelection();
        render();
      }
    );

    return section;
  }

  function clearTableSelection() {
    var root = floor();

    if (!root) {
      return;
    }

    root.querySelectorAll(
      '[data-pmd-r2-selected-table-v320]'
    ).forEach(
      function (node) {
        node.removeAttribute(
          'data-pmd-r2-selected-table-v320'
        );
      }
    );
  }

  function filteredToday() {
    return reservations()
      .filter(
        function (item) {
          var date =
            reservationDate(item);

          if (!isToday(date)) {
            return false;
          }

          if (!selectedTableId) {
            return true;
          }

          return tableIds(item)
            .indexOf(
              String(selectedTableId)
            ) !== -1;
        }
      )
      .sort(
        function (left, right) {
          return (
            reservationDate(left) -
            reservationDate(right)
          );
        }
      );
  }

  function cardMarkup(item) {
    var date =
      reservationDate(item);

    var guests =
      guestCount(item);

    return (
      '<article ' +
        'class="pmd-r2-reservation-card-v320">' +

        '<div ' +
          'class="pmd-r2-reservation-card-v320__top">' +

          '<div>' +
            '<strong>' +
              esc(guestName(item)) +
            '</strong>' +

            '<span>' +
              esc(statusLabel(item)) +
            '</span>' +
          '</div>' +

          '<time>' +
            esc(formatTime(date)) +
          '</time>' +

        '</div>' +

        '<div ' +
          'class="pmd-r2-reservation-card-v320__meta">' +

          '<span>' +
            esc(tableLabel(item)) +
          '</span>' +

          '<span>' +
            esc(
              guests ?
                guests + ' guests' :
                'Guest count unavailable'
            ) +
          '</span>' +

        '</div>' +

      '</article>'
    );
  }

  function emptyMarkup() {
    var title = selectedTableId
      ? 'No reservations for ' +
        esc(
          selectedTableName ||
          'Table ' + selectedTableId
        ) +
        ' today'
      : 'No reservations for today';

    var subtitle = selectedTableId
      ? 'This table has no reservations scheduled for today.'
      : 'Reservations scheduled for today will appear here.';

    return (
      '<div ' +
        'class="pmd-r2-reservation-empty-v320">' +

        '<div ' +
          'class="pmd-r2-reservation-empty-v320__icon">' +
          '▣' +
        '</div>' +

        '<strong>' +
          title +
        '</strong>' +

        '<span>' +
          subtitle +
        '</span>' +

      '</div>'
    );
  }

  function render() {
    var section =
      ensureSection();

    if (!section) {
      return;
    }

    var grid =
      document.getElementById(
        GRID_ID
      );

    var title =
      section.querySelector(
        '[data-r2-card-title]'
      );

    var subtitle =
      section.querySelector(
        '[data-r2-card-subtitle]'
      );

    var reset =
      section.querySelector(
        '[data-r2-show-all]'
      );

    if (
      selectedTableId
    ) {
      title.textContent =
        'Reservations for ' +
        (
          selectedTableName ||
          'Table ' + selectedTableId
        );

      subtitle.textContent =
        'Today';

      reset.hidden = false;
    } else {
      title.textContent =
        'Today’s reservations';

      subtitle.textContent =
        'All tables';

      reset.hidden = true;
    }

    var items =
      filteredToday();

    grid.innerHTML =
      items.length
        ? items.map(
            cardMarkup
          ).join('')
        : emptyMarkup();

    section.setAttribute(
      'data-reservation-count',
      String(items.length)
    );
  }

  function tableIdFromNode(node) {
    if (!node) {
      return null;
    }

    var direct =
      node.getAttribute(
        'data-table-id'
      ) ||
      node.getAttribute(
        'data-floor-table-id'
      ) ||
      node.dataset.tableId ||
      node.dataset.id;

    if (
      direct &&
      Number(direct) > 0
    ) {
      return String(
        Number(direct)
      );
    }

    var text = String(
      node.textContent || ''
    ).replace(/\s+/g, ' ').trim();

    var match =
      text.match(/\b(\d+)\b/);

    return match
      ? String(
          Number(match[1])
        )
      : null;
  }

  function tableNameFromNode(
    node,
    id
  ) {
    var label =
      node.getAttribute(
        'aria-label'
      ) ||
      node.getAttribute(
        'title'
      ) ||
      '';

    if (label) {
      return label;
    }

    return 'Table ' + id;
  }

  function bindTableClicks() {
    if (bound) {
      return;
    }

    bound = true;

    document.addEventListener(
      'click',
      function (event) {
        var root = floor();

        if (
          !root ||
          !root.contains(
            event.target
          )
        ) {
          return;
        }

        var tableNode =
          event.target.closest(
            '[data-table-id],' +
            '[data-floor-table-id],' +
            '.pmd-floor-v1__table,' +
            '.pmd-floor-table,' +
            '[class*="table-card"]'
          );

        if (
          !tableNode ||
          !root.contains(tableNode)
        ) {
          return;
        }

        if (
          event.target.closest(
            'button,' +
            'a,' +
            'input,' +
            'select,' +
            'textarea'
          )
        ) {
          return;
        }

        var id =
          tableIdFromNode(
            tableNode
          );

        if (!id) {
          return;
        }

        selectedTableId = id;
        selectedTableName =
          tableNameFromNode(
            tableNode,
            id
          );

        clearTableSelection();

        tableNode.setAttribute(
          'data-pmd-r2-selected-table-v320',
          'true'
        );

        render();

        var section =
          ensureSection();

        if (section) {
          section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      },
      true
    );
  }

  function boot() {
    ensureSection();
    bindTableClicks();
    render();

    setTimeout(render, 150);
    setTimeout(render, 500);
    setTimeout(render, 1200);

    console.info(
      '[PMD Reservations2 Reservation Cards V3.2.0] Ready',
      {
        reservations:
          reservations().length,
        section:
          Boolean(
            document.getElementById(
              SECTION_ID
            )
          )
      }
    );
  }

  window
    .PMDReservations2CardsV320 = {
      version: '3.2.0',

      refresh: render,

      showAll: function () {
        selectedTableId = null;
        selectedTableName = null;
        clearTableSelection();
        render();
      },

      audit: function () {
        var section =
          document.getElementById(
            SECTION_ID
          );

        return {
          floor:
            Boolean(floor()),

          section:
            Boolean(section),

          grid:
            Boolean(
              document.getElementById(
                GRID_ID
              )
            ),

          reservations:
            reservations().length,

          today:
            reservations().filter(
              function (item) {
                return isToday(
                  reservationDate(item)
                );
              }
            ).length,

          selectedTable:
            selectedTableId,

          visibleCards:
            section
              ? section.querySelectorAll(
                  '.pmd-r2-reservation-card-v320'
                ).length
              : 0,

          emptyState:
            Boolean(
              section &&
              section.querySelector(
                '.pmd-r2-reservation-empty-v320'
              )
            )
        };
      }
    };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once: true}
    );
  } else {
    boot();
  }
})();

/* PMD Reservations2 Scroll + Range Cards V3.2.2 */
(function () {
  'use strict';

  var ROOT_ID = 'pmd-reservations2';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var SECTION_ID = 'pmd-r2-reservation-cards-v320';

  function root() {
    return document.getElementById(ROOT_ID);
  }

  function floor() {
    return document.getElementById(FLOOR_ID);
  }

  function section() {
    return document.getElementById(SECTION_ID);
  }

  function unlockElement(node) {
    if (!node || node === document.documentElement) {
      return;
    }

    node.classList.add(
      'pmd-r2-scroll-parent-v322'
    );

    node.style.setProperty(
      'height',
      'auto',
      'important'
    );

    node.style.setProperty(
      'min-height',
      '0',
      'important'
    );

    node.style.setProperty(
      'max-height',
      'none',
      'important'
    );

    node.style.setProperty(
      'overflow-y',
      'visible',
      'important'
    );
  }

  function unlockPage() {
    var page = root();

    if (!page) {
      return;
    }

    document.documentElement.classList.add(
      'pmd-r2-scroll-v322'
    );

    document.documentElement.style.setProperty(
      'overflow-y',
      'auto',
      'important'
    );

    document.body.style.setProperty(
      'overflow-y',
      'auto',
      'important'
    );

    document.body.style.setProperty(
      'height',
      'auto',
      'important'
    );

    var current = page.parentElement;
    var limit = 0;

    while (
      current &&
      current !== document.body &&
      limit < 10
    ) {
      unlockElement(current);
      current = current.parentElement;
      limit += 1;
    }

    page.style.setProperty(
      'height',
      'auto',
      'important'
    );

    page.style.setProperty(
      'max-height',
      'none',
      'important'
    );

    page.style.setProperty(
      'overflow',
      'visible',
      'important'
    );
  }

  function reservationDate(item) {
    if (!item) {
      return null;
    }

    var datetime =
      item.reservation_datetime ||
      item.start_at ||
      item.starts_at;

    if (datetime) {
      var parsedDatetime =
        new Date(datetime);

      if (
        !Number.isNaN(
          parsedDatetime.getTime()
        )
      ) {
        return parsedDatetime;
      }
    }

    var rawDate =
      item.reserve_date ||
      item.reservation_date ||
      item.booking_date ||
      item.date;

    if (!rawDate) {
      return null;
    }

    var dateText =
      String(rawDate).slice(0, 10);

    var parts =
      dateText.split(/[-/]/).map(Number);

    if (parts.length !== 3) {
      return null;
    }

    var rawTime = String(
      item.reserve_time ||
      item.reservation_time ||
      item.booking_time ||
      item.time ||
      '00:00:00'
    );

    var timeParts =
      rawTime.split(':').map(Number);

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      timeParts[0] || 0,
      timeParts[1] || 0,
      timeParts[2] || 0
    );
  }

  function dateKey(date) {
    if (!date) {
      return null;
    }

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, '0'),
      String(
        date.getDate()
      ).padStart(2, '0')
    ].join('-');
  }

  function activeRange() {
    /*
     * Read From/To inputs already managed by V317/V318.
     */
    var filter =
      document.getElementById(
        'pmd-r2-date-filter-v317'
      );

    var inputs = filter
      ? Array.prototype.slice.call(
          filter.querySelectorAll(
            'input[type="date"]'
          )
        )
      : [];

    var today = dateKey(new Date());

    var from =
      inputs[0] && inputs[0].value
        ? inputs[0].value
        : today;

    var to =
      inputs[1] && inputs[1].value
        ? inputs[1].value
        : from;

    return {
      from: from,
      to: to
    };
  }

  function loadedReservations() {
    var boot =
      window.PMD_RESERVATIONS2_BOOT || {};

    return Array.isArray(
      boot.reservations
    )
      ? boot.reservations
      : [];
  }

  function reservationsInRange() {
    var range = activeRange();

    return loadedReservations().filter(
      function (item) {
        var key = dateKey(
          reservationDate(item)
        );

        return Boolean(
          key &&
          key >= range.from &&
          key <= range.to
        );
      }
    );
  }

  function updateEmptyMessage() {
    var cardsSection = section();

    if (!cardsSection) {
      return;
    }

    var empty =
      cardsSection.querySelector(
        '.pmd-r2-reservation-empty-v320'
      );

    if (!empty) {
      return;
    }

    var total =
      loadedReservations().length;

    var filtered =
      reservationsInRange().length;

    var range =
      activeRange();

    var title =
      empty.querySelector('strong');

    var description =
      empty.querySelector(
        'span:not(.pmd-r2-reservation-empty-v320__icon)'
      );

    if (title) {
      title.textContent =
        filtered === 0
          ? 'No reservations in the selected date range'
          : filtered + ' reservations';
    }

    if (description) {
      description.textContent =
        total +
        ' reservations are loaded. ' +
        filtered +
        ' match ' +
        range.from +
        (
          range.to !== range.from
            ? ' to ' + range.to
            : ''
        ) +
        '.';
    }
  }

  function refresh() {
    unlockPage();

    /*
     * Ask the existing card runtime to render first.
     */
    if (
      window.PMDReservations2CardsV320 &&
      typeof window
        .PMDReservations2CardsV320
        .refresh === 'function'
    ) {
      window
        .PMDReservations2CardsV320
        .refresh();
    }

    updateEmptyMessage();
  }

  function bindDateInputs() {
    var filter =
      document.getElementById(
        'pmd-r2-date-filter-v317'
      );

    if (!filter || filter.dataset.v322Bound) {
      return;
    }

    filter.dataset.v322Bound = 'true';

    filter.addEventListener(
      'change',
      function () {
        setTimeout(refresh, 0);
      }
    );

    filter.addEventListener(
      'click',
      function () {
        setTimeout(refresh, 0);
      }
    );
  }

  function audit() {
    var page = root();
    var cardsSection = section();
    var pageRect = page
      ? page.getBoundingClientRect()
      : null;

    return {
      root: Boolean(page),
      floor: Boolean(floor()),
      section: Boolean(cardsSection),

      totalReservations:
        loadedReservations().length,

      matchingRange:
        reservationsInRange().length,

      range: activeRange(),

      documentScrollHeight:
        document.documentElement
          .scrollHeight,

      viewportHeight:
        window.innerHeight,

      canScroll:
        document.documentElement
          .scrollHeight >
        window.innerHeight,

      htmlOverflowY:
        getComputedStyle(
          document.documentElement
        ).overflowY,

      bodyOverflowY:
        getComputedStyle(
          document.body
        ).overflowY,

      rootHeight:
        pageRect
          ? Math.round(pageRect.height)
          : null,

      sectionDisplay:
        cardsSection
          ? getComputedStyle(
              cardsSection
            ).display
          : null
    };
  }

  function boot() {
    refresh();
    bindDateInputs();

    /*
     * Limited startup passes only.
     * No permanent observer or interval.
     */
    setTimeout(function () {
      bindDateInputs();
      refresh();
    }, 300);

    setTimeout(function () {
      bindDateInputs();
      refresh();
    }, 1000);

    console.info(
      '[PMD Reservations2 Scroll + Range Cards V3.2.2] Ready',
      audit()
    );
  }

  window.PMDReservations2ScrollV322 = {
    version: '3.2.2',
    refresh: refresh,
    audit: audit
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once: true}
    );
  } else {
    boot();
  }
})();
