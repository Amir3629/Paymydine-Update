(function () {
  'use strict';

  if (window.PMDWaiterWorkstationV3) return;

  var root = document.querySelector('[data-pmd-waiter-workstation-v3]');
  if (!root) return;

  var launcher = root.querySelector('[data-w3-launcher]');
  var grid = root.querySelector('[data-w3-grid]');
  var loading = root.querySelector('[data-w3-loading]');
  var empty = root.querySelector('[data-w3-empty]');
  var areas = root.querySelector('[data-w3-areas]');
  var search = root.querySelector('[data-w3-search]');
  var clearSearch = root.querySelector('[data-w3-clear-search]');
  var live = root.querySelector('[data-w3-live]');
  var updated = root.querySelector('[data-w3-updated]');
  var drawer = root.querySelector('[data-w3-drawer]');
  var drawerList = root.querySelector('[data-w3-drawer-list]');
  var posLayer = root.querySelector('[data-w3-pos-layer]');
  var posHost = root.querySelector('[data-w3-pos-host]');
  var toastBox = root.querySelector('[data-w3-toast]');

  var dataUrl = root.getAttribute('data-data-url') || '/admin/pmd-waiter-dashboard-v9-tenant-data';
  var overlayTemplate = root.getAttribute('data-overlay-url') || '/admin/pmd-waiter-pos-v1/overlay/{table}';
  var notificationsUrl = root.getAttribute('data-notifications-url') || '/admin/notifications-api?limit=30';
  var reservationsUrl = root.getAttribute('data-reservations-url') || '/admin/reservations-waiter-final';
  var floorOperationsUrl = root.getAttribute('data-floor-operations-url') || '/admin/dashboardwaiter-final-operations';

  var state = {
    payload: null,
    tables: [],
    orders: [],
    notifications: [],
    filter: localStorage.getItem('pmd-w3-filter') || 'open',
    area: 'all',
    query: '',
    drawerTab: 'attention',
    tableAbort: null,
    notificationAbort: null,
    openAbort: null,
    pos: null,
    activeTableId: null,
    openingTableId: null,
    historyPushed: false,
    refreshTimer: null,
    notificationTimer: null,
    toastTimer: null,
    decorateRaf: 0,
    refreshCount: 0,
    notificationRefreshCount: 0
  };

  function one(selector, parent) { return (parent || root).querySelector(selector); }
  function all(selector, parent) { return Array.prototype.slice.call((parent || root).querySelectorAll(selector)); }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }
  function num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  function yes(value) { return value === true || value === 1 || value === '1' || value === 'true'; }
  function currency() { return clean(state.payload && state.payload.currency) || '€'; }
  function money(value) { return currency() + num(value, 0).toFixed(2); }
  function dateValue(value) { var n = Date.parse(value || ''); return Number.isFinite(n) ? n : 0; }

  function durationLabel(timestamp) {
    if (!timestamp) return '';
    var minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'JUST OPENED';
    if (minutes < 60) return minutes + ' MIN';
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return hours + 'H' + (rest ? ' ' + rest + 'M' : '');
  }

  function setText(selector, value) {
    var el = one(selector);
    if (el) el.textContent = String(value == null ? '' : value);
  }

  function toast(message, error) {
    if (!toastBox) return;
    toastBox.textContent = clean(message);
    toastBox.classList.toggle('is-error', !!error);
    toastBox.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { toastBox.classList.remove('is-visible'); }, 3200);
  }

  function setLive(mode, text) {
    if (!live) return;
    live.className = 'pmd-w3-live is-' + mode;
    var b = live.querySelector('b');
    if (b) b.textContent = text || mode.toUpperCase();
  }

  async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
    }, options || {}));
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) {
      var error = new Error(payload.message || payload.error || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function tableNumber(table) { return clean(table.number || table.table_number || table.table_no || table.id || table.table_id); }
  function tableId(table) { return clean(table.id || table.table_id || table.location_table_id || tableNumber(table)); }
  function tableArea(table) { return clean(table.section || table.table_section || table.table_zone || table.zone || table.floor_name || 'Main') || 'Main'; }
  function orderTimestamp(order) { return dateValue(order.opened_at || order.created_at || order.order_date || order.updated_at || ''); }
  function orderKeys(order) {
    return [order.table_id, order.location_table_id, order.table_number, order.table_no, order.table_ref, order.table]
      .map(clean).filter(Boolean);
  }
  function orderRemaining(order) {
    var status = clean(order.settlement_status).toLowerCase();
    if (['paid','settled','closed'].indexOf(status) !== -1) return 0;
    return Math.max(0, num(order.total || order.order_total, 0) - num(order.settled_amount, 0));
  }

  function deriveTables(payload) {
    var rawTables = Array.isArray(payload.tables)
      ? payload.tables
      : ((((payload.sections || {}).floor_plan || {}).tables) || []);
    var orders = Array.isArray(payload.orders)
      ? payload.orders
      : (Array.isArray(payload.current_orders) ? payload.current_orders : []);
    var map = {};

    orders.slice().sort(function (a, b) { return orderTimestamp(b) - orderTimestamp(a); }).forEach(function (order) {
      orderKeys(order).forEach(function (key) {
        if (!map[key]) map[key] = [];
        if (map[key].indexOf(order) === -1) map[key].push(order);
      });
    });

    state.orders = orders;

    return rawTables.map(function (raw) {
      var id = tableId(raw);
      var number = tableNumber(raw);
      var linked = map[id] || map[number] || [];
      var latest = linked[0] || null;
      var openOrders = Math.max(num(raw.open_orders, 0), linked.length);
      var due = num(raw.due || raw.payment_due || raw.pending_value, 0);
      if (!due) due = linked.reduce(function (sum, order) { return sum + orderRemaining(order); }, 0);

      var note = linked.some(function (order) {
        return clean(order.comment || order.note) !== '' || (Array.isArray(order.item_notes) && order.item_notes.length > 0);
      });
      var ready = num(raw.ready || raw.ready_orders || raw.ready_count, 0);
      var waiterCall = yes(raw.waiter_call) || yes(raw.needs_waiter) || yes(raw.call_waiter)
        || /waiter.?call/.test(clean(raw.attention_type || raw.status).toLowerCase());
      var cleaning = yes(raw.cleaning_required) || yes(raw.needs_cleaning)
        || /clean/.test(clean(raw.attention_type).toLowerCase());
      var rawStatus = clean(raw.status || raw.latest_order_status || (latest && (latest.status_label || latest.status)) || '');
      var itemCount = linked.reduce(function (sum, order) {
        return sum + num(order.total_items || order.items_count, Array.isArray(order.items) ? order.items.length : 0);
      }, 0);
      var assigned = yes(raw.assigned) || yes(raw.is_assigned) || yes(raw.mine);
      var key = 'free';
      var label = 'FREE';

      if (waiterCall) { key = 'attention'; label = 'WAITER CALL'; }
      else if (cleaning) { key = 'attention'; label = 'CLEANING'; }
      else if (ready > 0 || /ready|serve/.test(rawStatus.toLowerCase())) { key = 'ready'; label = 'READY'; }
      else if (due > 0 && openOrders > 0) { key = 'payment'; label = 'PAYMENT'; }
      else if (openOrders > 0) { key = 'open'; label = 'OPEN'; }

      return {
        id: id || number,
        number: number,
        area: tableArea(raw),
        capacity: num(raw.capacity || raw.table_capacity, 0),
        assigned: assigned,
        openOrders: openOrders,
        linkedOrders: linked,
        due: due,
        ready: ready,
        note: note,
        waiterCall: waiterCall,
        cleaning: cleaning,
        attention: waiterCall || cleaning || ready > 0 || note,
        itemCount: itemCount,
        rawStatus: rawStatus,
        state: key,
        stateLabel: label,
        openedAt: latest ? orderTimestamp(latest) : 0
      };
    }).filter(function (table) { return table.id && table.number; });
  }

  function mineAvailable() { return state.tables.some(function (table) { return table.assigned; }); }

  function visibleTables() {
    var query = state.query.toLowerCase();
    var hasMine = mineAvailable();
    var priority = {attention:0, ready:1, payment:2, open:3, free:4};

    return state.tables.filter(function (table) {
      if (state.filter === 'mine' && hasMine && !table.assigned) return false;
      if (state.filter === 'open' && table.openOrders < 1) return false;
      if (state.filter === 'attention' && !table.attention) return false;
      if (state.filter === 'free' && table.openOrders > 0) return false;
      if (state.area !== 'all' && table.area !== state.area) return false;
      if (query) {
        var haystack = [table.number, table.area, table.stateLabel, table.rawStatus].join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (priority[a.state] !== priority[b.state]) return priority[a.state] - priority[b.state];
      if (a.openedAt !== b.openedAt) return a.openedAt - b.openedAt;
      return a.number.localeCompare(b.number, undefined, {numeric:true, sensitivity:'base'});
    });
  }

  function tableMain(table) {
    if (table.waiterCall) return 'GUEST REQUEST';
    if (table.cleaning) return 'CLEANING REQUIRED';
    if (table.ready > 0) return table.ready + ' READY TO SERVE';
    if (table.due > 0) return money(table.due) + ' DUE';
    if (table.openOrders > 0) return table.itemCount + (table.itemCount === 1 ? ' ITEM' : ' ITEMS');
    return table.capacity > 0 ? table.capacity + ' SEATS' : 'START ORDER';
  }

  function tableSub(table) {
    if (table.note) return 'ORDER NOTE';
    if (table.openedAt) return 'OPEN ' + durationLabel(table.openedAt);
    return table.area.toUpperCase();
  }

  function cardMarkup(table) {
    return '<button type="button" class="pmd-w3-table is-' + esc(table.state) + (state.openingTableId === table.id ? ' is-opening' : '') + '" data-w3-open-table="' + esc(table.id) + '">' +
      '<span class="pmd-w3-table-state">' + esc(table.stateLabel) + '</span>' +
      (table.note ? '<span class="pmd-w3-note" title="Order note">N</span>' : '') +
      '<strong>' + esc(table.number) + '</strong>' +
      '<small>TABLE ' + esc(table.number) + ' · ' + esc(table.area.toUpperCase()) + '</small>' +
      '<div><b>' + esc(tableMain(table)) + '</b><span>' + esc(tableSub(table)) + '</span></div>' +
      '<i>' + (state.openingTableId === table.id ? 'OPENING…' : 'OPEN') + '</i>' +
    '</button>';
  }

  function updateCounts() {
    var open = state.tables.filter(function (t) { return t.openOrders > 0; });
    var attention = state.tables.filter(function (t) { return t.attention; });
    var free = state.tables.filter(function (t) { return t.openOrders < 1; });
    var mine = state.tables.filter(function (t) { return t.assigned; });
    var due = state.tables.reduce(function (sum, t) { return sum + t.due; }, 0);
    var ready = state.tables.filter(function (t) { return t.waiterCall || t.cleaning || t.ready > 0; }).length;

    setText('[data-w3-count-mine]', mineAvailable() ? mine.length : open.length);
    setText('[data-w3-count-open]', open.length);
    setText('[data-w3-count-attention]', attention.length);
    setText('[data-w3-count-free]', free.length);
    setText('[data-w3-count-all]', state.tables.length);
    setText('[data-w3-stat-open]', open.length);
    setText('[data-w3-stat-ready]', ready);
    setText('[data-w3-stat-due]', money(due));
    setText('[data-w3-stat-free]', free.length);
    var alertCount = one('[data-w3-alert-count]');
    if (alertCount) {
      alertCount.textContent = attention.length;
      alertCount.hidden = attention.length < 1;
    }
  }

  function renderAreas() {
    var names = [];
    state.tables.forEach(function (table) { if (names.indexOf(table.area) === -1) names.push(table.area); });
    names.sort(function (a, b) { return a.localeCompare(b, undefined, {numeric:true}); });
    if (state.area !== 'all' && names.indexOf(state.area) === -1) state.area = 'all';
    areas.innerHTML = ['all'].concat(names).map(function (name) {
      var label = name === 'all' ? 'ALL AREAS' : name.toUpperCase();
      return '<button type="button" data-w3-area="' + esc(name) + '" class="' + (state.area === name ? 'is-active' : '') + '">' + esc(label) + '</button>';
    }).join('');
  }

  function renderTables() {
    all('[data-w3-filter]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-w3-filter') === state.filter);
    });
    renderAreas();
    updateCounts();
    var rows = visibleTables();
    grid.innerHTML = rows.map(cardMarkup).join('');
    empty.hidden = rows.length > 0 || !state.payload;
    loading.hidden = !!state.payload;
  }

  async function refreshTables(silent) {
    if (state.tableAbort) state.tableAbort.abort();
    state.tableAbort = typeof AbortController === 'function' ? new AbortController() : null;
    if (!silent) setLive('loading', 'SYNCING');

    try {
      var payload = await fetchJson(dataUrl + '?_=' + Date.now(), {signal:state.tableAbort ? state.tableAbort.signal : undefined});
      state.payload = payload;
      state.tables = deriveTables(payload);
      state.refreshCount += 1;
      setText('[data-w3-user]', clean(payload.user && (payload.user.name || payload.user.username)) || 'LIVE SERVICE');
      updated.textContent = 'UPDATED ' + new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit'}).format(new Date());
      setLive('online', navigator.onLine === false ? 'OFFLINE' : 'LIVE');
      renderTables();
    } catch (error) {
      if (error.name === 'AbortError') return;
      setLive('error', 'OFFLINE');
      if (!state.payload) {
        loading.hidden = true;
        empty.hidden = false;
        empty.querySelector('strong').textContent = 'LIVE DATA UNAVAILABLE';
        empty.querySelector('span').textContent = error.message || 'Could not load tables.';
      }
      if (!silent) toast(error.message || 'Could not refresh tables.', true);
    } finally {
      state.tableAbort = null;
      scheduleRefresh();
    }
  }

  function normalizeNotification(item) {
    var payload = {};
    try { payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : (item.payload || {}); } catch (ignored) {}
    return {
      id: clean(item.id || payload.id || Math.random()),
      tableId: clean(item.table_id || payload.table_id || payload.location_table_id),
      title: clean(item.title || payload.title || item.type || 'Service update'),
      message: clean(item.message || payload.message || payload.status_name || payload.status),
      type: clean(item.type || payload.type || 'activity'),
      time: item.created_at || item.updated_at || payload.created_at || ''
    };
  }

  async function refreshNotifications(silent) {
    if (state.notificationAbort) state.notificationAbort.abort();
    state.notificationAbort = typeof AbortController === 'function' ? new AbortController() : null;
    try {
      var sep = notificationsUrl.indexOf('?') === -1 ? '?' : '&';
      var payload = await fetchJson(notificationsUrl + sep + '_=' + Date.now(), {signal:state.notificationAbort ? state.notificationAbort.signal : undefined});
      var rows = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.notifications) ? payload.notifications : []);
      state.notifications = rows.map(normalizeNotification);
      state.notificationRefreshCount += 1;
      if (!drawer.hidden && state.drawerTab === 'notifications') renderDrawer();
    } catch (error) {
      if (!silent && error.name !== 'AbortError') toast('Could not refresh activity.', true);
    } finally {
      state.notificationAbort = null;
      scheduleNotifications();
    }
  }

  function renderDrawer() {
    all('[data-w3-drawer-tab]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-w3-drawer-tab') === state.drawerTab);
    });
    var rows;
    if (state.drawerTab === 'notifications') {
      rows = state.notifications.map(function (item) {
        return '<button type="button" class="pmd-w3-drawer-row"' + (item.tableId ? ' data-w3-drawer-table="' + esc(item.tableId) + '"' : '') + '>' +
          '<b>' + esc((item.type || 'A').slice(0, 1).toUpperCase()) + '</b><span><strong>' + esc(item.title) + '</strong><small>' + esc(item.message || 'Service activity') + '</small></span><i>›</i></button>';
      });
    } else {
      rows = state.tables.filter(function (table) { return table.attention; }).map(function (table) {
        return '<button type="button" class="pmd-w3-drawer-row" data-w3-drawer-table="' + esc(table.id) + '">' +
          '<b>' + esc(table.number) + '</b><span><strong>' + esc(table.stateLabel) + '</strong><small>' + esc(tableMain(table)) + ' · ' + esc(table.area) + '</small></span><i>›</i></button>';
      });
    }
    drawerList.innerHTML = rows.length ? rows.join('') : '<div class="pmd-w3-drawer-empty"><strong>ALL CLEAR</strong><span>No active service alert.</span></div>';
  }

  function openDrawer(tab) {
    state.drawerTab = tab || 'attention';
    renderDrawer();
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-w3-drawer-open');
    if (state.drawerTab === 'notifications') refreshNotifications(true);
  }

  function closeDrawer() {
    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pmd-w3-drawer-open');
  }

  function overlayUrl(tableId) { return overlayTemplate.replace('{table}', encodeURIComponent(String(tableId))); }
  function findTable(tableId) { return state.tables.find(function (t) { return String(t.id) === String(tableId); }) || null; }

  function scheduleDecorate(posRoot) {
    cancelAnimationFrame(state.decorateRaf);
    state.decorateRaf = requestAnimationFrame(function () { decoratePos(posRoot); });
  }

  function decorateProducts(posRoot) {
    if (!state.pos || !state.pos.state) return;
    var palette = ['#ef3e4a','#f59e0b','#20b85a','#2878ff','#8b5cf6','#06a6b8','#e14d9a','#f97316'];
    all('[data-pos-product]', posRoot).forEach(function (card, index) {
      var item = state.pos.state.menu.find(function (row) { return String(row.id) === String(card.getAttribute('data-pos-product')); });
      var category = item && Array.isArray(item.category_ids) && item.category_ids.length ? num(item.category_ids[0], index) : index;
      card.style.setProperty('--pmd-w3-tile', palette[Math.abs(category) % palette.length]);
      var name = card.querySelector('.pmd-pos-product-name');
      card.setAttribute('aria-label', 'Add ' + (name ? clean(name.textContent) : 'item'));
    });
  }

  function ensureMorePanel(posRoot) {
    var checkout = posRoot.querySelector('.pmd-pos-checkout');
    if (!checkout || checkout.querySelector('[data-w3-more-panel]')) return;
    var panel = document.createElement('section');
    panel.className = 'pmd-w3-more-panel';
    panel.setAttribute('data-w3-more-panel', '');
    panel.hidden = true;
    panel.innerHTML = [
      '<header><strong>CHECK & TABLE TOOLS</strong><button type="button" data-w3-close-more>×</button></header>',
      '<div>',
        '<button type="button" data-w3-tool="operations">TRANSFER / MERGE</button>',
        '<button type="button" data-w3-tool="service">SEATS / COURSES</button>',
        '<button type="button" data-w3-tool="void">VOID / REOPEN</button>',
        '<button type="button" data-w3-tool="reservations">RESERVATIONS</button>',
      '</div>',
      '<small>Operational tools open in the authenticated waiter operations screen.</small>'
    ].join('');
    checkout.appendChild(panel);

    var secondary = posRoot.querySelector('.pmd-pos-secondary-actions');
    if (secondary && !secondary.querySelector('[data-w3-more]')) {
      var more = document.createElement('button');
      more.type = 'button';
      more.setAttribute('data-w3-more', '');
      more.textContent = 'MORE';
      secondary.appendChild(more);
    }
  }

  function decoratePos(posRoot) {
    if (!posRoot) return;
    posRoot.classList.add('pmd-w3-pos');
    decorateProducts(posRoot);
    ensureMorePanel(posRoot);

    var payment = posRoot.querySelector('[data-pos-payment]');
    var edit = posRoot.querySelector('[data-pos-edit-order]');
    var print = posRoot.querySelector('[data-pos-print]');
    if (payment) payment.textContent = 'PAY / SPLIT';
    if (edit) edit.textContent = 'EDIT CHECK';
    if (print) print.textContent = 'RECEIPT';

    var mobile = posRoot.querySelector('[data-pos-mobile-cart]');
    if (mobile) {
      mobile.removeAttribute('hidden');
      var title = mobile.querySelector('b');
      if (title) title.textContent = 'ORDER';
      if (!mobile.querySelector('[data-w3-cart-arrow]')) {
        var arrow = document.createElement('i');
        arrow.setAttribute('data-w3-cart-arrow', '');
        arrow.textContent = '›';
        mobile.appendChild(arrow);
      }
    }

    if (!posRoot._pmdW3Bound) {
      posRoot._pmdW3Bound = true;
      posRoot.addEventListener('click', function (event) {
        var target = event.target && event.target.nodeType === 1 ? event.target : null;
        if (!target) return;
        if (target.closest('[data-pos-product], [data-pos-category], [data-pos-inc], [data-pos-dec], [data-pos-remove], [data-pos-view]')) {
          setTimeout(function () { scheduleDecorate(posRoot); }, 0);
        }
        if (target.closest('[data-w3-more]')) {
          var panel = posRoot.querySelector('[data-w3-more-panel]');
          if (panel) panel.hidden = !panel.hidden;
        }
        if (target.closest('[data-w3-close-more]')) {
          var closePanel = posRoot.querySelector('[data-w3-more-panel]');
          if (closePanel) closePanel.hidden = true;
        }
        var tool = target.closest('[data-w3-tool]');
        if (tool) {
          var name = tool.getAttribute('data-w3-tool');
          if (name === 'reservations') window.open(reservationsUrl, '_blank', 'noopener');
          else window.open(floorOperationsUrl + '#' + encodeURIComponent(name), '_blank', 'noopener');
        }
      }, true);
      var menuSearch = posRoot.querySelector('[data-pos-search]');
      if (menuSearch) menuSearch.addEventListener('input', function () { setTimeout(function () { scheduleDecorate(posRoot); }, 0); });
    }
  }

  function destroyPos() {
    if (state.openAbort) { state.openAbort.abort(); state.openAbort = null; }
    if (state.pos && typeof state.pos.destroy === 'function') {
      try { state.pos.destroy(); } catch (ignored) {}
    }
    if (window.PMDWaiterPOS === state.pos) window.PMDWaiterPOS = null;
    state.pos = null;
    state.activeTableId = null;
    posHost.replaceChildren();
  }

  function revealPos(tableId) {
    state.activeTableId = String(tableId);
    launcher.hidden = true;
    posLayer.hidden = false;
    posLayer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-w3-pos-open');
  }

  function hidePos() {
    posLayer.hidden = true;
    posLayer.setAttribute('aria-hidden', 'true');
    launcher.hidden = false;
    document.body.classList.remove('pmd-w3-pos-open');
  }

  function requestClosePos(fromHistory) {
    destroyPos();
    hidePos();
    if (!fromHistory && state.historyPushed && history.state && history.state.pmdWaiterW3) {
      state.historyPushed = false;
      history.back();
    } else {
      state.historyPushed = false;
    }
    refreshTables(true);
    refreshNotifications(true);
  }

  async function openPos(tableId) {
    if (state.openingTableId) return;
    var table = findTable(tableId);
    if (!table) return toast('Table is no longer available.', true);
    if (!window.PMDWaiterPOSApp || typeof window.PMDWaiterPOSApp.mount !== 'function') return toast('POS engine is unavailable.', true);

    state.openingTableId = String(tableId);
    renderTables();
    closeDrawer();
    destroyPos();
    state.openAbort = typeof AbortController === 'function' ? new AbortController() : null;

    try {
      var payload = await fetchJson(overlayUrl(tableId) + '?_=' + Date.now(), {signal:state.openAbort ? state.openAbort.signal : undefined});
      if (!payload.html || !payload.bootstrap) throw new Error('Table order data is incomplete.');

      var holder = document.createElement('div');
      holder.innerHTML = payload.html;
      var posRoot = holder.querySelector('[data-pmd-pos-root]');
      if (!posRoot) throw new Error('Order workspace could not be created.');

      payload.bootstrap.settings = payload.bootstrap.settings || {};
      payload.bootstrap.settings.dashboard_url = location.pathname;
      posHost.replaceChildren(posRoot);
      state.pos = window.PMDWaiterPOSApp.mount(posRoot, payload.bootstrap, {
        embedded: true,
        onClose: function () { requestClosePos(false); }
      });
      decoratePos(posRoot);
      revealPos(tableId);
      history.pushState({pmdWaiterW3:true, tableId:String(tableId)}, '', location.pathname + '?table=' + encodeURIComponent(String(tableId)));
      state.historyPushed = true;
      window.dispatchEvent(new CustomEvent('pmd:waiter-workstation-v3-opened', {detail:{tableId:String(tableId), pos:state.pos}}));
    } catch (error) {
      if (error.name !== 'AbortError') toast(error.message || 'Could not open table.', true);
      destroyPos();
      hidePos();
    } finally {
      state.openAbort = null;
      state.openingTableId = null;
      if (!launcher.hidden) renderTables();
    }
  }

  function setFilter(filter) {
    if (['mine','open','attention','free','all'].indexOf(filter) === -1) return;
    if (filter === 'mine' && !mineAvailable()) filter = 'open';
    state.filter = filter;
    localStorage.setItem('pmd-w3-filter', filter);
    renderTables();
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(function () {
      if (!document.hidden && !launcher.hidden && navigator.onLine !== false) refreshTables(true);
      else scheduleRefresh();
    }, 20000);
  }

  function scheduleNotifications() {
    clearTimeout(state.notificationTimer);
    state.notificationTimer = setTimeout(function () {
      if (!document.hidden && navigator.onLine !== false) refreshNotifications(true);
      else scheduleNotifications();
    }, 30000);
  }

  function bind() {
    root.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;
      var filter = target.closest('[data-w3-filter]');
      if (filter) return setFilter(filter.getAttribute('data-w3-filter'));
      var area = target.closest('[data-w3-area]');
      if (area) { state.area = area.getAttribute('data-w3-area') || 'all'; return renderTables(); }
      var table = target.closest('[data-w3-open-table]');
      if (table) return openPos(table.getAttribute('data-w3-open-table'));
      var drawerTable = target.closest('[data-w3-drawer-table]');
      if (drawerTable) return openPos(drawerTable.getAttribute('data-w3-drawer-table'));
      var drawerTab = target.closest('[data-w3-drawer-tab]');
      if (drawerTab) { state.drawerTab = drawerTab.getAttribute('data-w3-drawer-tab'); renderDrawer(); if (state.drawerTab === 'notifications') refreshNotifications(true); return; }
      if (target.closest('[data-w3-alerts]')) return openDrawer('attention');
      if (target.closest('[data-w3-close-drawer]')) return closeDrawer();
      if (target.closest('[data-w3-refresh]')) { refreshTables(false); refreshNotifications(true); return; }
      if (target.closest('[data-w3-reservations]')) { window.open(reservationsUrl, '_blank', 'noopener'); return; }
      if (target.closest('[data-w3-operations]')) { window.open(floorOperationsUrl, '_blank', 'noopener'); return; }
      if (target.closest('[data-w3-clear-search]')) { state.query = ''; search.value = ''; clearSearch.hidden = true; renderTables(); search.focus(); return; }
      if (target.closest('[data-w3-reset]')) { state.filter = 'all'; state.area = 'all'; state.query = ''; search.value = ''; clearSearch.hidden = true; renderTables(); }
    });

    search.addEventListener('input', function () {
      state.query = search.value.trim();
      clearSearch.hidden = !state.query;
      renderTables();
    });

    window.addEventListener('popstate', function () {
      if (!posLayer.hidden) requestClosePos(true);
    });
    window.addEventListener('online', function () { setLive('online', 'LIVE'); if (!launcher.hidden) refreshTables(true); });
    window.addEventListener('offline', function () { setLive('error', 'OFFLINE'); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && launcher && !launcher.hidden) { refreshTables(true); refreshNotifications(true); }
    });
    window.addEventListener('pmd:waiter-pos-order-updated', function () {
      if (state.pos) setTimeout(function () { if (state.pos && typeof state.pos.refresh === 'function') state.pos.refresh(true); }, 150);
    });
  }

  bind();
  refreshTables(false);
  refreshNotifications(true);

  window.PMDWaiterWorkstationV3 = {
    version: 'pmd-waiter-workstation-v3',
    active: true,
    refresh: function () { return refreshTables(false); },
    openTable: openPos,
    closeTable: function () { requestClosePos(false); },
    debug: function () {
      return {
        version: 'pmd-waiter-workstation-v3',
        active: true,
        tables: state.tables.length,
        filter: state.filter,
        area: state.area,
        openingTableId: state.openingTableId,
        activeTableId: state.activeTableId,
        posMounted: !!state.pos,
        paymentOpen: !!(state.pos && state.pos.state && state.pos.state.payment && state.pos.state.payment.open),
        notifications: state.notifications.length,
        refreshCount: state.refreshCount,
        notificationRefreshCount: state.notificationRefreshCount,
        permanentIntervals: 0,
        mutationObservers: 0
      };
    }
  };

  console.info('[PMD] Waiter Workstation V3 isolated POS active');
})();
