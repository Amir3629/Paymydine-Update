(function () {
  'use strict';

  var VERSION = '3.3.0';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var FILTER_ID = 'pmd-r2-date-filter-v317';
  var HOST_ID = 'pmd-r2-empty-content-v305';
  var CARDS_ID = 'pmd-r2-reservation-cards-v317';
  var SEARCH_ID = 'pmd-r2-search-v330';
  var PANEL_ID = 'pmd-r2-reservation-panel-v330';
  var TOOLTIP_ID = 'pmd-r2-table-tooltip-v330';
  var applying = false;
  var featureBound = false;
  var toolbarObserver = null;
  var selectedPanel = null;

  var state = {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
    tableId: null,
    tableName: null,
    query: '',
    quick: 'all'
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
    table: '<path d="M3 10h18M5 10v8M19 10v8M4 6h16a1 1 0 0 1 1 1v3H3V7a1 1 0 0 1 1-1z"></path>',
    search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>',
    more: '<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>',
    eye: '<path d="M2 12s3.5-7 10-7s10 7 10 7s-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.61a2 2 0 0 1-.45 2.11L8 9.72a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.83.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92Z"></path>',
    check: '<path d="m20 6-11 11-5-5"></path>',
    seat: '<path d="M7 13v-2a3 3 0 0 1 6 0v2"></path><path d="M5 13h12a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2Z"></path><path d="M5 18v3M17 18v3"></path>',
    x: '<path d="M18 6 6 18M6 6l12 12"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>'
  };

  function floor() { return document.getElementById(FLOOR_ID); }
  function bootData() { return window.PMD_RESERVATIONS2_BOOT || {}; }
  function reservations() { return Array.isArray(bootData().reservations) ? bootData().reservations : []; }
  function pad(value) { return String(value).padStart(2, '0'); }
  function startOfDay(date) { var d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
  function endOfDay(date) { var d = new Date(date); d.setHours(23, 59, 59, 999); return d; }
  function addDays(date, days) { var d = new Date(date); d.setDate(d.getDate() + days); return d; }
  function inputDate(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function parseInputDate(value, end) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return end ? endOfDay(date) : startOfDay(date);
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'})[character];
    });
  }
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (icons[name] || '') + '</svg>';
  }
  function reservationId(item) { return Number(item && (item.reservation_id || item.id)) || 0; }
  function customerName(item) { return item.customer_name || [item.first_name, item.last_name].filter(Boolean).join(' ') || item.guest_name || 'Guest'; }
  function partySize(item) { return Number(item.guest_num || item.guests || item.party_size || item.covers || 0) || 0; }
  function phoneOf(item) { return String(item.telephone || item.phone || item.customer_telephone || '').trim(); }
  function emailOf(item) { return String(item.email || item.customer_email || '').trim(); }
  function noteOf(item) { return String(item.comment || item.notes || item.reservation_note || '').trim(); }

  function reservationStart(item) {
    var direct = item && (item.reservation_datetime || item.start_at || item.starts_at);
    var date = direct ? new Date(direct) : null;
    if (date && !Number.isNaN(date.getTime())) return date;
    var rawDate = item && (item.reserve_date || item.reservation_date || item.booking_date || item.date);
    if (!rawDate) return null;
    var parts = String(rawDate).slice(0, 10).split(/[-\/]/).map(Number);
    if (parts.length !== 3) return null;
    var time = String(item.reserve_time || item.reservation_time || item.booking_time || item.time || '00:00').split(':').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], time[0] || 0, time[1] || 0, time[2] || 0, 0);
  }

  function tableIds(item) {
    var ids = [];
    function add(value) {
      var id = Number(value);
      if (Number.isFinite(id) && id > 0 && ids.indexOf(String(id)) === -1) ids.push(String(id));
    }
    add(item && item.table_id);
    if (item && Array.isArray(item.tables)) {
      item.tables.forEach(function (table) {
        add(table && typeof table === 'object' ? (table.table_id || table.id) : table);
      });
    }
    return ids;
  }

  function tableLabel(item) {
    var names = [];
    if (item && Array.isArray(item.tables)) {
      item.tables.forEach(function (table) {
        if (table && typeof table === 'object') names.push(table.table_name || table.name || table.table_number);
      });
    }
    names = names.filter(Boolean);
    if (names.length) return names.join(', ');
    var ids = tableIds(item);
    return ids.length ? ids.map(function (id) { return 'Table ' + id; }).join(', ') : 'Unassigned';
  }

  function rawStatus(item) {
    return String((item && (item.status_name || (item.status && item.status.status_name) || item.reservation_status || item.status)) || '').trim().toLowerCase();
  }

  function statusPresentation(item) {
    var raw = rawStatus(item);
    if (/cancel|declin|reject/.test(raw)) return {key: 'cancelled', label: 'Cancelled'};
    if (/seat|occup|complete|finish/.test(raw)) return {key: 'seated', label: 'Seated'};
    if (/arriv|check.?in/.test(raw)) return {key: 'arrived', label: 'Arrived'};
    return {key: 'confirmed', label: 'Confirmed'};
  }

  function isVip(item) {
    return Boolean(
      item && (
        item.is_vip ||
        item.vip ||
        (item.customer && (item.customer.is_vip || item.customer.vip)) ||
        /\bvip\b/i.test(noteOf(item))
      )
    );
  }

  function humanDate(date) {
    try { return new Intl.DateTimeFormat(undefined, {day: 'numeric', month: 'short', year: 'numeric'}).format(date); }
    catch (error) { return inputDate(date); }
  }

  function humanTime(date) {
    try { return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit'}).format(date); }
    catch (error) { return pad(date.getHours()) + ':' + pad(date.getMinutes()); }
  }

  function rangeLabel() {
    return inputDate(state.start) === inputDate(state.end)
      ? humanDate(state.start)
      : humanDate(state.start) + ' – ' + humanDate(state.end);
  }

  function relativeTime(item) {
    var presentation = statusPresentation(item);
    if (presentation.key === 'cancelled') return 'Cancelled';
    if (presentation.key === 'seated') return 'Guest seated';
    var start = reservationStart(item);
    if (!start) return 'Time unavailable';
    var minutes = Math.round((start.getTime() - Date.now()) / 60000);
    if (minutes > 0 && minutes < 60) return 'Starts in ' + minutes + ' min';
    if (minutes >= 60 && minutes < 1440) return 'Starts in ' + Math.round(minutes / 60) + ' h';
    if (minutes >= 1440) return 'Starts in ' + Math.round(minutes / 1440) + ' d';
    var elapsed = Math.abs(minutes);
    if (elapsed < 60) return 'Started ' + elapsed + ' min ago';
    if (elapsed < 1440) return 'Started ' + Math.round(elapsed / 60) + ' h ago';
    return humanDate(start);
  }

  function editUrl(item) {
    var base = bootData().editBaseUrl;
    var id = reservationId(item);
    return base && id ? String(base).replace(/\/$/, '') + '/' + encodeURIComponent(id) : '#';
  }

  function createUrl(tableId) {
    var base = bootData().createUrl || '#';
    if (!tableId || base === '#') return base;
    var separator = base.indexOf('?') === -1 ? '?' : '&';
    return base + separator + 'table_id=' + encodeURIComponent(tableId) + '&reserve_date=' + encodeURIComponent(inputDate(state.start));
  }

  function nativeControl(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector)).find(function (control) {
      return !control.closest('#' + TOOLBAR_ID);
    }) || null;
  }

  function activateNative(root, selector, fallback) {
    var button = nativeControl(root, selector);
    if (button) {
      button.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
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
      window.requestAnimationFrame(refreshToolbar);
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
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Floor map controls');
    [
      {key: 'edit', icon: 'edit', text: 'Edit', title: 'Edit layout', selector: '[data-floor-edit]'},
      {key: 'save', icon: 'save', text: 'Save', title: 'Save layout', selector: '[data-floor-save]'},
      {key: 'zoom-out', icon: 'zoomOut', title: 'Zoom out', selector: '[data-floor-zoom-out]'},
      {key: 'fit', icon: 'fit', title: 'Full Floor', selector: '[data-floor-fit]', fallback: function () { if (root.__pmdFloorV1 && root.__pmdFloorV1.fit) root.__pmdFloorV1.fit(); }},
      {key: 'zoom-in', icon: 'zoomIn', title: 'Zoom in', selector: '[data-floor-zoom-in]'},
      {key: 'strip', icon: 'strip', text: 'One row', title: 'One row tables', selector: '[data-floor-strip]'}
    ].forEach(function (item) {
      toolbar.appendChild(makeButton({
        key: item.key,
        icon: item.icon,
        text: item.text,
        title: item.title,
        onClick: function () { activateNative(root, item.selector, item.fallback); }
      }));
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
    var floorState = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null;
    var editNative = nativeControl(root, '[data-floor-edit]');
    var editing = Boolean(floorState && floorState.editing) || Boolean(editNative && editNative.getAttribute('aria-pressed') === 'true');
    var edit = toolbar.querySelector('[data-pmd-r2-tool="edit"]');
    var save = toolbar.querySelector('[data-pmd-r2-tool="save"]');
    if (edit) edit.hidden = editing;
    if (save) save.hidden = !editing;
    var stripNative = nativeControl(root, '[data-floor-strip]');
    var strip = toolbar.querySelector('[data-pmd-r2-tool="strip"]');
    if (strip) {
      var pressed = Boolean(floorState && (floorState.stripMode || floorState.oneRowMode)) || Boolean(stripNative && stripNative.getAttribute('aria-pressed') === 'true');
      strip.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      var label = strip.querySelector('span');
      if (label) label.textContent = pressed ? 'Floor' : 'One row';
    }
  }

  function ensureDateFilter() {
    var actions = document.querySelector('.pmd-r2__hero-actions') || document.querySelector('.pmd-r2-clean-header__actions') || document.getElementById('pmd-r2-clean-header');
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
    panel.querySelector('[data-date-start]').value = inputDate(state.start);
    panel.querySelector('[data-date-end]').value = inputDate(state.end);
    panel.addEventListener('click', function (event) {
      var button = event.target.closest('[data-range]');
      if (!button) return;
      var now = startOfDay(new Date());
      if (button.dataset.range === 'today') { state.start = now; state.end = endOfDay(now); }
      if (button.dataset.range === 'tomorrow') { state.start = addDays(now, 1); state.end = endOfDay(state.start); }
      if (button.dataset.range === 'week') { state.start = now; state.end = endOfDay(addDays(now, 6)); }
      if (button.dataset.range === 'month') { state.start = new Date(now.getFullYear(), now.getMonth(), 1); state.end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)); }
      panel.querySelector('[data-date-start]').value = inputDate(state.start);
      panel.querySelector('[data-date-end]').value = inputDate(state.end);
      renderExperience();
    });
    panel.addEventListener('change', function (event) {
      if (event.target.matches('[data-date-start]')) state.start = parseInputDate(event.target.value, false) || state.start;
      if (event.target.matches('[data-date-end]')) state.end = parseInputDate(event.target.value, true) || state.end;
      if (state.end < state.start) state.end = endOfDay(state.start);
      renderExperience();
    });
    return panel;
  }

  function ensureSearchControl() {
    var actions = document.querySelector('.pmd-r2__hero-actions') || document.querySelector('.pmd-r2-clean-header__actions') || document.querySelector('[data-pmd-header-actions]');
    if (!actions) return null;
    var wrap = document.getElementById(SEARCH_ID);
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.id = SEARCH_ID;
    wrap.className = 'pmd-r2-search-v330';
    wrap.setAttribute('data-pmd-r2-header-order', 'search');
    wrap.innerHTML =
      '<div class="pmd-r2-search-field-v330">' +
        '<input type="search" autocomplete="off" placeholder="Search name, phone, reservation ID or table" aria-label="Search reservations">' +
        '<button type="button" data-search-clear aria-label="Clear search">' + svg('x') + '</button>' +
      '</div>' +
      '<button type="button" class="pmd-r2-search-trigger-v330" aria-label="Search reservations" aria-expanded="false">' + svg('search') + '</button>';
    actions.appendChild(wrap);
    var trigger = wrap.querySelector('.pmd-r2-search-trigger-v330');
    var input = wrap.querySelector('input');
    var clear = wrap.querySelector('[data-search-clear]');
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var open = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) setTimeout(function () { input.focus(); }, 40);
    });
    input.addEventListener('input', function () {
      state.query = input.value.trim();
      wrap.classList.toggle('has-value', Boolean(state.query));
      renderExperience();
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (input.value) {
          input.value = '';
          state.query = '';
          renderExperience();
        } else {
          wrap.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      }
    });
    clear.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      input.value = '';
      state.query = '';
      wrap.classList.remove('has-value');
      input.focus();
      renderExperience();
    });
    return wrap;
  }

  function ensureCardsSection() {
    var root = floor();
    if (!root) return null;
    var host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      root.insertAdjacentElement('afterend', host);
    }
    host.classList.add('pmd-r2-reservation-host-v330');
    host.removeAttribute('aria-hidden');
    var section = document.getElementById(CARDS_ID);
    if (!section) {
      section = document.createElement('section');
      section.id = CARDS_ID;
      section.className = 'pmd-r2-reservation-cards-v317 pmd-r2-reservation-workspace-v330';
    }
    if (section.parentElement !== host) host.appendChild(section);
    return section;
  }

  function inRange(item) {
    var start = reservationStart(item);
    if (!start || start < state.start || start > state.end) return false;
    if (state.tableId && tableIds(item).indexOf(String(state.tableId)) === -1) return false;
    return true;
  }

  function matchesSearch(item) {
    if (!state.query) return true;
    var query = state.query.toLowerCase();
    var haystack = [
      customerName(item),
      phoneOf(item),
      emailOf(item),
      String(reservationId(item)),
      tableLabel(item),
      noteOf(item)
    ].join(' ').toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function matchesQuick(item) {
    var quick = state.quick;
    var start = reservationStart(item);
    var raw = rawStatus(item);
    var presentation = statusPresentation(item);
    if (quick === 'all') return true;
    if (quick === 'today') return start && inputDate(start) === inputDate(new Date());
    if (quick === 'upcoming') return start && start >= new Date() && presentation.key !== 'cancelled';
    if (quick === 'pending') return /pending|await|unconfirm/.test(raw);
    if (quick === 'arrived') return /arriv|check.?in/.test(raw);
    if (quick === 'confirmed') return presentation.key === 'confirmed';
    if (quick === 'seated') return presentation.key === 'seated';
    if (quick === 'cancelled') return presentation.key === 'cancelled';
    if (quick === 'vip') return isVip(item);
    if (quick === 'tables') return tableIds(item).length > 0;
    return true;
  }

  function filteredReservations() {
    return reservations().filter(function (item) {
      return inRange(item) && matchesSearch(item) && matchesQuick(item);
    }).sort(function (left, right) {
      return reservationStart(left) - reservationStart(right);
    });
  }

  function tableRangeReservations(tableId) {
    return reservations().filter(function (item) {
      var start = reservationStart(item);
      return start && start >= state.start && start <= state.end && tableIds(item).indexOf(String(tableId)) !== -1;
    }).sort(function (left, right) {
      return reservationStart(left) - reservationStart(right);
    });
  }

  function updateKpis(items) {
    var now = new Date();
    var rangeItems = reservations().filter(inRange);
    var upcoming = rangeItems.filter(function (item) {
      var date = reservationStart(item);
      return date && date >= now && statusPresentation(item).key !== 'cancelled';
    }).length;
    var pending = rangeItems.filter(function (item) { return /pending|await|unconfirm/.test(rawStatus(item)); }).length;
    var tables = new Set();
    rangeItems.forEach(function (item) { tableIds(item).forEach(function (id) { tables.add(id); }); });
    var values = {today: rangeItems.length, upcoming: upcoming, pending: pending, tables: tables.size};
    Object.keys(values).forEach(function (key) {
      var value = document.querySelector('[data-r2-v308-value="' + key + '"]');
      if (value) value.textContent = String(values[key]);
    });
    var titles = {
      today: inputDate(state.start) === inputDate(state.end) ? 'Reservations' : 'Reservations in Range',
      upcoming: 'Upcoming Arrivals',
      pending: 'Pending Confirmations',
      tables: 'Reservation Tables'
    };
    Object.keys(titles).forEach(function (key) {
      var card = document.querySelector('[data-r2-v308-card="' + key + '"]');
      var title = card && card.querySelector('.pmd-r2-v308-title');
      if (title) title.textContent = titles[key];
      if (card) {
        card.classList.toggle('pmd-r2-kpi-active-v330',
          (key === 'today' && state.quick === 'today') ||
          (key === 'upcoming' && state.quick === 'upcoming') ||
          (key === 'pending' && state.quick === 'pending') ||
          (key === 'tables' && state.quick === 'tables')
        );
      }
    });
  }

  function filterChipsMarkup() {
    var filters = [
      ['all', 'All'],
      ['today', 'Today'],
      ['upcoming', 'Upcoming'],
      ['arrived', 'Arrived'],
      ['pending', 'Pending'],
      ['confirmed', 'Confirmed'],
      ['seated', 'Seated'],
      ['cancelled', 'Cancelled'],
      ['vip', 'VIP']
    ];
    return '<div class="pmd-r2-card-filters-v330" role="toolbar" aria-label="Reservation filters">' + filters.map(function (filter) {
      return '<button type="button" data-reservation-filter="' + filter[0] + '" class="' + (state.quick === filter[0] ? 'is-active' : '') + '">' + esc(filter[1]) + '</button>';
    }).join('') + '</div>';
  }

  function addCardMarkup(tableId, tableName) {
    return '<article class="pmd-r2-add-reservation-card-v330" data-add-reservation-table="' + esc(tableId) + '" tabindex="0" role="link">' +
      '<div><strong>' + svg('plus') + '</strong><h3>Add Reservation</h3><p>New booking for ' + esc(tableName || ('Table ' + tableId)) + '</p></div>' +
    '</article>';
  }

  function actionMenuMarkup(item) {
    var id = reservationId(item);
    var status = statusPresentation(item).key;
    var phone = phoneOf(item);
    var rows = [
      ['view', 'eye', 'View Details'],
      ['edit', 'edit', 'Edit'],
      ['arrive', 'check', 'Mark as Arrived'],
      ['seat', 'seat', 'Seat Guest'],
      ['cancel', 'x', 'Cancel Reservation'],
      ['call', 'phone', 'Call Customer']
    ];
    return '<div class="pmd-r2-card-menu-v330" data-card-menu hidden>' + rows.map(function (row) {
      var action = row[0];
      var hidden = (action === 'cancel' && status === 'cancelled') || (action === 'seat' && status === 'seated');
      var disabled = action === 'call' && !phone;
      if (hidden) return '';
      return '<button type="button" data-card-action="' + action + '" data-reservation-id="' + id + '"' + (disabled ? ' disabled' : '') + '>' + svg(row[1]) + '<span>' + esc(row[2]) + '</span></button>';
    }).join('') + '</div>';
  }

  function cardMarkup(item) {
    var start = reservationStart(item);
    var presentation = statusPresentation(item);
    var id = reservationId(item);
    var url = editUrl(item);
    var guests = partySize(item);
    return '<article class="pmd-r2-reservation-card-v317 pmd-r2-reservation-card-v330" data-reservation-id="' + id + '" data-edit-url="' + esc(url) + '" tabindex="0" role="link">' +
      '<div class="pmd-r2-reservation-card-v330__head">' +
        '<div><h3>' + esc(customerName(item)) + '</h3><span class="pmd-r2-reservation-card-v330__relative">' + esc(relativeTime(item)) + '</span></div>' +
        '<div class="pmd-r2-reservation-card-v330__actions">' +
          '<time>' + esc(start ? humanTime(start) : '—') + '</time>' +
          '<button type="button" class="pmd-r2-card-more-v330" data-card-more aria-label="Reservation actions" aria-expanded="false">' + svg('more') + '</button>' +
          actionMenuMarkup(item) +
        '</div>' +
      '</div>' +
      '<span class="pmd-r2-status-v330 pmd-r2-status-v330--' + presentation.key + '">' + esc(presentation.label) + '</span>' +
      '<div class="pmd-r2-reservation-card-v330__meta">' +
        '<span>' + svg('calendar') + esc(start ? humanDate(start) : 'Date unavailable') + '</span>' +
        '<span>' + svg('table') + esc(tableLabel(item)) + '</span>' +
        '<span>' + svg('users') + esc(guests ? guests + ' guests' : 'Guests not set') + '</span>' +
      '</div>' +
      (isVip(item) ? '<span class="pmd-r2-vip-v330">VIP</span>' : '') +
    '</article>';
  }

  function renderReservationCards(items) {
    var section = ensureCardsSection();
    if (!section) return;
    var selectedName = state.tableName || (state.tableId ? 'Table ' + state.tableId : 'All tables');
    var header = '<div class="pmd-r2-reservation-cards-v317__header pmd-r2-reservation-header-v330">' +
      '<div><span class="pmd-r2-reservation-cards-v317__eyebrow">' + esc(rangeLabel()) + '</span><h2>' + (state.tableId ? 'Reservations for ' + esc(selectedName) : 'Reservations') + '</h2><p>' + esc(selectedName) + ' · ' + items.length + ' booking' + (items.length === 1 ? '' : 's') + (state.query ? ' · Search: “' + esc(state.query) + '”' : '') + '</p></div>' +
      (state.tableId ? '<button type="button" data-clear-table>Show all tables</button>' : '') +
    '</div>' + filterChipsMarkup();
    var cards = '';
    if (state.tableId) cards += addCardMarkup(state.tableId, selectedName);
    cards += items.map(cardMarkup).join('');
    if (!items.length) {
      cards += '<div class="pmd-r2-reservation-cards-v317__empty">' + svg('calendar') + '<strong>No reservations found</strong><span>No reservations match this date range, table and filter.</span></div>';
    }
    section.innerHTML = header + '<div class="pmd-r2-reservation-cards-v317__grid">' + cards + '</div>';
  }

  function ensurePanel() {
    var overlay = document.getElementById(PANEL_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = PANEL_ID;
    overlay.className = 'pmd-r2-panel-overlay-v330';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<aside class="pmd-r2-panel-v330" role="dialog" aria-modal="true" aria-label="Reservation details"><header><div data-panel-title></div><button type="button" data-panel-close aria-label="Close">' + svg('x') + '</button></header><div class="pmd-r2-panel-v330__body" data-panel-body></div></aside>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-panel-close]')) closePanel();
    });
    overlay.querySelector('.pmd-r2-panel-v330').addEventListener('click', function (event) { event.stopPropagation(); });
    return overlay;
  }

  function openPanel(titleMarkup, bodyMarkup, descriptor) {
    var overlay = ensurePanel();
    overlay.querySelector('[data-panel-title]').innerHTML = titleMarkup;
    overlay.querySelector('[data-panel-body]').innerHTML = bodyMarkup;
    selectedPanel = descriptor;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pmd-r2-panel-open-v330');
  }

  function closePanel() {
    var overlay = document.getElementById(PANEL_ID);
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pmd-r2-panel-open-v330');
    selectedPanel = null;
  }

  function panelActionButtons(item) {
    var id = reservationId(item);
    var phone = phoneOf(item);
    return '<div class="pmd-r2-panel-actions-v330">' +
      '<button type="button" data-panel-action="edit" data-reservation-id="' + id + '">' + svg('edit') + 'Edit</button>' +
      '<button type="button" data-panel-action="arrive" data-reservation-id="' + id + '">' + svg('check') + 'Mark as Arrived</button>' +
      '<button type="button" data-panel-action="seat" data-reservation-id="' + id + '">' + svg('seat') + 'Seat Guest</button>' +
      '<button type="button" class="is-danger" data-panel-action="cancel" data-reservation-id="' + id + '">' + svg('x') + 'Cancel</button>' +
      '<button type="button" data-panel-action="call" data-reservation-id="' + id + '"' + (phone ? '' : ' disabled') + '>' + svg('phone') + 'Call</button>' +
    '</div>';
  }

  function openReservationPanel(item) {
    if (!item) return;
    var start = reservationStart(item);
    var presentation = statusPresentation(item);
    var guests = partySize(item);
    var title = '<span class="pmd-r2-panel-eyebrow-v330">Reservation #' + reservationId(item) + '</span><h2>' + esc(customerName(item)) + '</h2><span class="pmd-r2-status-v330 pmd-r2-status-v330--' + presentation.key + '">' + esc(presentation.label) + '</span>';
    var body = '<div class="pmd-r2-panel-summary-v330">' +
      '<div><span>Date & time</span><strong>' + esc(start ? humanDate(start) + ' · ' + humanTime(start) : 'Unavailable') + '</strong><small>' + esc(relativeTime(item)) + '</small></div>' +
      '<div><span>Table</span><strong>' + esc(tableLabel(item)) + '</strong></div>' +
      '<div><span>Guests</span><strong>' + esc(guests ? guests + ' guests' : 'Not set') + '</strong></div>' +
      '<div><span>Phone</span><strong>' + esc(phoneOf(item) || 'Not provided') + '</strong></div>' +
      '<div><span>Email</span><strong>' + esc(emailOf(item) || 'Not provided') + '</strong></div>' +
    '</div>' +
    (noteOf(item) ? '<div class="pmd-r2-panel-note-v330"><span>Notes</span><p>' + esc(noteOf(item)) + '</p></div>' : '') +
    panelActionButtons(item);
    openPanel(title, body, {type: 'reservation', id: reservationId(item)});
  }

  function miniReservationMarkup(item) {
    var start = reservationStart(item);
    var presentation = statusPresentation(item);
    return '<button type="button" class="pmd-r2-table-reservation-row-v330" data-panel-reservation="' + reservationId(item) + '">' +
      '<div><strong>' + esc(customerName(item)) + '</strong><span>' + esc(partySize(item) ? partySize(item) + ' guests' : 'Guests not set') + '</span></div>' +
      '<div><time>' + esc(start ? humanTime(start) : '—') + '</time><span class="pmd-r2-status-v330 pmd-r2-status-v330--' + presentation.key + '">' + esc(presentation.label) + '</span></div>' +
    '</button>';
  }

  function openTablePanel(tableId, tableName) {
    var items = tableRangeReservations(tableId);
    var label = tableName || ('Table ' + tableId);
    var title = '<span class="pmd-r2-panel-eyebrow-v330">' + esc(rangeLabel()) + '</span><h2>' + esc(label) + '</h2><p>' + items.length + ' reservation' + (items.length === 1 ? '' : 's') + ' in the active date range</p>';
    var body = '<a class="pmd-r2-panel-add-v330" href="' + esc(createUrl(tableId)) + '"><strong>' + svg('plus') + '</strong><div><h3>Add Reservation</h3><p>New booking for ' + esc(label) + '</p></div></a>' +
      '<div class="pmd-r2-table-reservations-v330">' + (items.length ? items.map(miniReservationMarkup).join('') : '<div class="pmd-r2-panel-empty-v330">No reservations for this table in the selected date range.</div>') + '</div>';
    openPanel(title, body, {type: 'table', id: String(tableId), name: label});
  }

  function reservationById(id) {
    return reservations().find(function (item) { return reservationId(item) === Number(id); }) || null;
  }

  function replaceReservation(updated) {
    if (!updated) return;
    var id = reservationId(updated);
    var list = reservations();
    var index = list.findIndex(function (item) { return reservationId(item) === id; });
    if (index !== -1) list[index] = updated;
    else list.push(updated);
  }

  function showToast(message, danger) {
    var toast = document.createElement('div');
    toast.className = 'pmd-r2-toast-v330' + (danger ? ' is-danger' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 220);
    }, 2600);
  }

  function performStatusAction(action, item) {
    if (!item || !window.jQuery || typeof window.jQuery.request !== 'function') {
      showToast('Reservation action is unavailable.', true);
      return;
    }
    if (action === 'cancel' && !window.confirm('Cancel this reservation?')) return;
    var handler = bootData().actionHandler || 'index_onPmdReservationAction';
    document.documentElement.classList.add('pmd-r2-action-busy-v330');
    window.jQuery.request(handler, {
      data: {recordId: reservationId(item), action: action},
      success: function (data) {
        document.documentElement.classList.remove('pmd-r2-action-busy-v330');
        if (data && data.reservation) replaceReservation(data.reservation);
        renderExperience();
        if (selectedPanel && selectedPanel.type === 'reservation') openReservationPanel(reservationById(selectedPanel.id));
        if (selectedPanel && selectedPanel.type === 'table') openTablePanel(selectedPanel.id, selectedPanel.name);
        showToast((data && data.message) || 'Reservation updated.');
      },
      error: function (xhr) {
        document.documentElement.classList.remove('pmd-r2-action-busy-v330');
        var message = 'Could not update the reservation.';
        try {
          var json = xhr.responseJSON || JSON.parse(xhr.responseText || '{}');
          message = json.X_IGNITER_ERROR_MESSAGE || json.message || message;
        } catch (error) {}
        showToast(message, true);
      }
    });
  }

  function handleReservationAction(action, item) {
    if (!item) return;
    if (action === 'view') { openReservationPanel(item); return; }
    if (action === 'edit') { var url = editUrl(item); if (url !== '#') window.location.href = url; return; }
    if (action === 'call') { var phone = phoneOf(item); if (phone) window.location.href = 'tel:' + phone.replace(/[^+\d]/g, ''); return; }
    if (action === 'arrive' || action === 'seat' || action === 'cancel') performStatusAction(action, item);
  }

  function closeCardMenus(except) {
    document.querySelectorAll('[data-card-menu]').forEach(function (menu) {
      if (menu !== except) menu.hidden = true;
    });
    document.querySelectorAll('[data-card-more]').forEach(function (button) {
      if (!except || button.nextElementSibling !== except) button.setAttribute('aria-expanded', 'false');
    });
  }

  function ensureTooltip() {
    var tooltip = document.getElementById(TOOLTIP_ID);
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.id = TOOLTIP_ID;
    tooltip.className = 'pmd-r2-table-tooltip-v330';
    tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function tableNodeId(node) {
    return node && (node.dataset.floorTable || node.dataset.tableId || node.getAttribute('data-table-id')) || null;
  }

  function tableNodeName(node, id) {
    if (!node) return 'Table ' + id;
    var name = node.querySelector('.pmd-floor-v1__name,[data-floor-table-name],strong');
    return (name && name.textContent.trim()) || node.getAttribute('aria-label') || ('Table ' + id);
  }

  function showTableTooltip(node) {
    var id = tableNodeId(node);
    if (!id) return;
    var tooltip = ensureTooltip();
    var items = tableRangeReservations(id);
    var now = new Date();
    var item = items.find(function (reservation) { return reservationStart(reservation) >= now; }) || items[0];
    if (item) {
      var start = reservationStart(item);
      tooltip.innerHTML = '<strong>' + esc(customerName(item)) + '</strong><span>' + esc(start ? humanTime(start) : '—') + ' · ' + esc(partySize(item) ? partySize(item) + ' guests' : 'Guests not set') + '</span><small>' + esc(relativeTime(item)) + '</small>';
    } else {
      tooltip.innerHTML = '<strong>' + esc(tableNodeName(node, id)) + '</strong><span>No reservation in the selected date range</span>';
    }
    var rect = node.getBoundingClientRect();
    tooltip.classList.add('is-visible');
    var tipRect = tooltip.getBoundingClientRect();
    var left = Math.min(window.innerWidth - tipRect.width - 12, Math.max(12, rect.left + rect.width / 2 - tipRect.width / 2));
    var top = Math.max(12, rect.top - tipRect.height - 10);
    tooltip.style.left = Math.round(left) + 'px';
    tooltip.style.top = Math.round(top) + 'px';
  }

  function hideTableTooltip() {
    var tooltip = document.getElementById(TOOLTIP_ID);
    if (tooltip) tooltip.classList.remove('is-visible');
  }

  function renderExperience() {
    var datePanel = ensureDateFilter();
    ensureSearchControl();
    if (datePanel) {
      var summary = datePanel.querySelector('[data-date-summary]');
      if (summary) summary.textContent = rangeLabel() + (state.tableId ? ' · ' + (state.tableName || 'Table ' + state.tableId) : ' · All tables');
    }
    var items = filteredReservations();
    updateKpis(items);
    renderReservationCards(items);
    document.querySelectorAll('#' + FLOOR_ID + ' [data-floor-table]').forEach(function (table) {
      table.classList.toggle('pmd-r2-table-selected-v317', Boolean(state.tableId && String(table.dataset.floorTable) === String(state.tableId)));
    });
  }

  function bindKpis() {
    document.addEventListener('click', function (event) {
      var card = event.target.closest('[data-r2-v308-card]');
      if (!card) return;
      var key = card.getAttribute('data-r2-v308-card');
      if (key === 'today') {
        state.start = startOfDay(new Date());
        state.end = endOfDay(new Date());
        state.quick = 'today';
      } else if (key === 'upcoming') state.quick = 'upcoming';
      else if (key === 'pending') state.quick = 'pending';
      else if (key === 'tables') state.quick = 'tables';
      var panel = document.getElementById(FILTER_ID);
      if (panel) {
        var startInput = panel.querySelector('[data-date-start]');
        var endInput = panel.querySelector('[data-date-end]');
        if (startInput) startInput.value = inputDate(state.start);
        if (endInput) endInput.value = inputDate(state.end);
      }
      renderExperience();
      var section = document.getElementById(CARDS_ID);
      if (section) section.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
  }

  function bindExperience() {
    if (featureBound) return;
    var root = floor();
    if (!root) return;
    featureBound = true;

    root.addEventListener('click', function (event) {
      var table = event.target.closest('[data-floor-table]');
      if (!table || !root.contains(table)) return;
      var floorState = root.__pmdFloorV1 && root.__pmdFloorV1.getState ? root.__pmdFloorV1.getState() : null;
      if (floorState && floorState.editing) return;
      state.tableId = tableNodeId(table);
      state.tableName = tableNodeName(table, state.tableId);
      state.quick = 'all';
      renderExperience();
      openTablePanel(state.tableId, state.tableName);
    }, true);

    root.addEventListener('mouseover', function (event) {
      var table = event.target.closest('[data-floor-table]');
      if (table && root.contains(table)) showTableTooltip(table);
    });
    root.addEventListener('mouseout', function (event) {
      var table = event.target.closest('[data-floor-table]');
      if (table && (!event.relatedTarget || !table.contains(event.relatedTarget))) hideTableTooltip();
    });

    document.addEventListener('click', function (event) {
      var clearTable = event.target.closest('[data-clear-table]');
      if (clearTable) {
        state.tableId = null;
        state.tableName = null;
        closePanel();
        renderExperience();
        return;
      }

      var filter = event.target.closest('[data-reservation-filter]');
      if (filter) {
        state.quick = filter.dataset.reservationFilter || 'all';
        renderExperience();
        return;
      }

      var add = event.target.closest('[data-add-reservation-table]');
      if (add) {
        window.location.href = createUrl(add.dataset.addReservationTable);
        return;
      }

      var more = event.target.closest('[data-card-more]');
      if (more) {
        event.preventDefault();
        event.stopPropagation();
        var menu = more.nextElementSibling;
        var opening = menu && menu.hidden;
        closeCardMenus(opening ? menu : null);
        if (menu) menu.hidden = !opening;
        more.setAttribute('aria-expanded', opening ? 'true' : 'false');
        return;
      }

      var cardAction = event.target.closest('[data-card-action]');
      if (cardAction) {
        event.preventDefault();
        event.stopPropagation();
        closeCardMenus();
        handleReservationAction(cardAction.dataset.cardAction, reservationById(cardAction.dataset.reservationId));
        return;
      }

      var panelAction = event.target.closest('[data-panel-action]');
      if (panelAction) {
        event.preventDefault();
        handleReservationAction(panelAction.dataset.panelAction, reservationById(panelAction.dataset.reservationId));
        return;
      }

      var panelReservation = event.target.closest('[data-panel-reservation]');
      if (panelReservation) {
        openReservationPanel(reservationById(panelReservation.dataset.panelReservation));
        return;
      }

      var card = event.target.closest('.pmd-r2-reservation-card-v330');
      if (card && !event.target.closest('button,a')) {
        var url = card.dataset.editUrl;
        if (url && url !== '#') window.location.href = url;
        return;
      }

      if (!event.target.closest('.pmd-r2-card-menu-v330')) closeCardMenus();
      var search = document.getElementById(SEARCH_ID);
      if (search && !search.contains(event.target) && !state.query) {
        search.classList.remove('is-open');
        var trigger = search.querySelector('.pmd-r2-search-trigger-v330');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeCardMenus();
        closePanel();
        hideTableTooltip();
      }
      var card = event.target.closest && event.target.closest('.pmd-r2-reservation-card-v330,[data-add-reservation-table]');
      if (card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (card.hasAttribute('data-add-reservation-table')) window.location.href = createUrl(card.dataset.addReservationTable);
        else if (card.dataset.editUrl && card.dataset.editUrl !== '#') window.location.href = card.dataset.editUrl;
      }
    });

    bindKpis();
    renderExperience();
  }

  function refreshToolbar() {
    if (applying) return;
    var root = floor();
    if (!root) return;
    applying = true;
    try {
      var old = document.getElementById('pmd-r2-floor-toolbar-v315');
      if (old) old.remove();
      var toolbar = createToolbar(root);
      preserveAndHideNativeControls(root);
      syncToolbar(root, toolbar);
      bindExperience();
      root.setAttribute('data-pmd-r2-toolbar-authority', 'v330');
    } finally {
      applying = false;
    }
  }

  function boot() {
    refreshToolbar();
    var root = floor();
    if (!root) return;
    toolbarObserver = new MutationObserver(function () {
      window.requestAnimationFrame(refreshToolbar);
    });
    toolbarObserver.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-pressed', 'class']});
    [0, 100, 350, 900, 1800].forEach(function (delay) { setTimeout(refreshToolbar, delay); });
    console.info('[PMD Reservations2 Workspace V' + VERSION + '] Ready', {
      reservations: reservations().length,
      floorInstance: Boolean(root.__pmdFloorV1),
      tableRangeConnected: true,
      search: true,
      actions: true
    });
  }

  window.PMDReservations2FloorToolbarV316 = {
    version: VERSION,
    refresh: refreshToolbar,
    renderReservations: renderExperience,
    setRange: function (start, end) {
      var parsedStart = parseInputDate(start, false);
      var parsedEnd = parseInputDate(end, true);
      if (parsedStart && parsedEnd) {
        state.start = parsedStart;
        state.end = parsedEnd;
        renderExperience();
      }
    },
    clearTable: function () {
      state.tableId = null;
      state.tableName = null;
      closePanel();
      renderExperience();
    },
    openReservation: function (id) { openReservationPanel(reservationById(id)); },
    audit: function () {
      var root = floor();
      return {
        floor: Boolean(root),
        instance: Boolean(root && root.__pmdFloorV1),
        reservations: reservations().length,
        filtered: filteredReservations().length,
        selectedTable: state.tableId,
        range: [inputDate(state.start), inputDate(state.end)],
        query: state.query,
        quickFilter: state.quick,
        cardsSection: Boolean(document.getElementById(CARDS_ID)),
        searchButton: Boolean(document.getElementById(SEARCH_ID)),
        sidePanel: Boolean(document.getElementById(PANEL_ID))
      };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
