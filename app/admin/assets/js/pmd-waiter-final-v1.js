(function () {
  'use strict';

  if (window.PMDWaiterFinalV1) return;

  var root = document.querySelector('[data-pmd-waiter-final-root]');
  if (!root) return;

  var launcher = root.querySelector('[data-final-launcher]');
  var grid = root.querySelector('[data-final-table-grid]');
  var loading = root.querySelector('[data-final-loading]');
  var empty = root.querySelector('[data-final-empty]');
  var areas = root.querySelector('[data-final-areas]');
  var search = root.querySelector('[data-final-search]');
  var clearSearch = root.querySelector('[data-final-clear-search]');
  var sync = root.querySelector('[data-final-sync]');
  var updated = root.querySelector('[data-final-updated]');
  var drawer = root.querySelector('[data-final-drawer]');
  var drawerList = root.querySelector('[data-final-drawer-list]');
  var posLayer = root.querySelector('[data-final-pos-layer]');
  var posHost = root.querySelector('[data-final-pos-host]');
  var posLoading = root.querySelector('[data-final-pos-loading]');
  var toastBox = root.querySelector('[data-final-toast]');

  var dataUrl = root.getAttribute('data-data-url') || '/admin/pmd-waiter-dashboard-v9-tenant-data';
  var overlayTemplate = root.getAttribute('data-overlay-url') || '/admin/pmd-waiter-pos-v1/overlay/{table}';
  var notificationsUrl = root.getAttribute('data-notifications-url') || '/admin/notifications-api?limit=20';
  var reservationsUrl = root.getAttribute('data-reservations-url') || '/admin/reservations';
  var floorOperationsUrl = root.getAttribute('data-floor-operations-url') || '/admin/dashboardwaiter';

  var state = {
    payload: null,
    tables: [],
    orders: [],
    notifications: [],
    filter: localStorage.getItem('pmd-waiter-final-filter') || 'open',
    area: 'all',
    query: '',
    drawerTab: 'attention',
    loading: false,
    request: null,
    notificationRequest: null,
    tablePoll: null,
    notificationPoll: null,
    posAbort: null,
    posInstance: null,
    activeTableId: null,
    historyPushed: false,
    toastTimer: null,
    updatedAt: 0,
    refreshCount: 0,
    notificationRefreshCount: 0
  };

  function one(selector, parent) {
    return (parent || root).querySelector(selector);
  }

  function all(selector, parent) {
    return Array.prototype.slice.call((parent || root).querySelectorAll(selector));
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character];
    });
  }

  function num(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function yes(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function currency() {
    return clean(state.payload && state.payload.currency) || '€';
  }

  function money(value) {
    return currency() + num(value, 0).toFixed(2);
  }

  function dateValue(value) {
    var parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatClock(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit'}).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function durationLabel(timestamp) {
    if (!timestamp) return '';
    var minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'JUST OPENED';
    if (minutes < 60) return minutes + ' MIN';
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    return hours + 'H' + (remainder ? ' ' + remainder + 'M' : '');
  }

  function setText(selector, value) {
    var element = one(selector);
    if (element) element.textContent = String(value == null ? '' : value);
  }

  function toast(message, isError) {
    if (!toastBox) return;
    toastBox.textContent = clean(message);
    toastBox.classList.toggle('is-error', !!isError);
    toastBox.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toastBox.classList.remove('is-visible');
    }, 3200);
  }

  function setSync(mode, label) {
    if (!sync) return;
    sync.classList.toggle('is-online', mode === 'online');
    sync.classList.toggle('is-error', mode === 'error');
    sync.classList.toggle('is-loading', mode === 'loading');
    var text = sync.querySelector('b');
    if (text) text.textContent = label || mode.toUpperCase();
  }

  async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, options || {}));

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) {
      var error = new Error(payload.message || payload.error || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function tableNumber(table) {
    return clean(table.number || table.table_number || table.table_no || table.id || table.table_id);
  }

  function tableId(table) {
    return clean(table.id || table.table_id || table.location_table_id || tableNumber(table));
  }

  function tableName(table) {
    var number = tableNumber(table);
    var name = clean(table.name || table.label || table.table_name || '');
    if (!name || name === number || name.toLowerCase() === ('table ' + number).toLowerCase()) return 'TABLE ' + number;
    return name.toUpperCase();
  }

  function tableArea(table) {
    return clean(table.section || table.table_section || table.table_zone || table.zone || table.floor_name || 'Main') || 'Main';
  }

  function orderKeys(order) {
    return [
      order.table_id,
      order.location_table_id,
      order.table_number,
      order.table_no,
      order.table_ref,
      order.table
    ].map(clean).filter(Boolean);
  }

  function orderTimestamp(order) {
    return dateValue(order.opened_at || order.created_at || order.order_date || order.updated_at || '');
  }

  function orderRemaining(order) {
    var settlement = clean(order.settlement_status || '').toLowerCase();
    if (['paid', 'settled', 'closed'].indexOf(settlement) !== -1) return 0;
    return Math.max(0, num(order.total || order.order_total, 0) - num(order.settled_amount, 0));
  }

  function deriveTables(payload) {
    var rawTables = Array.isArray(payload.tables)
      ? payload.tables
      : ((((payload.sections || {}).floor_plan || {}).tables) || []);

    var orders = Array.isArray(payload.orders)
      ? payload.orders
      : (Array.isArray(payload.current_orders) ? payload.current_orders : []);

    var orderMap = {};

    orders.slice().sort(function (a, b) {
      return orderTimestamp(b) - orderTimestamp(a);
    }).forEach(function (order) {
      orderKeys(order).forEach(function (key) {
        if (!orderMap[key]) orderMap[key] = [];
        if (orderMap[key].indexOf(order) === -1) orderMap[key].push(order);
      });
    });

    state.orders = orders;

    return rawTables.map(function (raw) {
      var id = tableId(raw);
      var number = tableNumber(raw);
      var linked = orderMap[id] || orderMap[number] || [];
      var latest = linked[0] || null;
      var explicitOpen = num(raw.open_orders, 0);
      var openOrders = Math.max(explicitOpen, linked.length);
      var due = num(raw.due || raw.payment_due || raw.pending_value, 0);

      if (!due) {
        due = linked.reduce(function (sum, order) {
          return sum + orderRemaining(order);
        }, 0);
      }

      var note = linked.some(function (order) {
        return clean(order.comment || order.note || '') !== ''
          || (Array.isArray(order.item_notes) && order.item_notes.length > 0);
      });

      var ready = num(raw.ready || raw.ready_orders || raw.ready_count, 0);
      var waiterCall = yes(raw.waiter_call)
        || yes(raw.needs_waiter)
        || yes(raw.call_waiter)
        || /waiter.?call/.test(clean(raw.attention_type || raw.status).toLowerCase());

      var cleaning = yes(raw.cleaning_required)
        || yes(raw.needs_cleaning)
        || /clean/.test(clean(raw.attention_type || '').toLowerCase());

      var rawStatus = clean(
        raw.status
        || raw.latest_order_status
        || (latest && (latest.status_label || latest.status))
        || ''
      );

      var itemCount = linked.reduce(function (sum, order) {
        return sum + num(order.total_items || order.items_count, Array.isArray(order.items) ? order.items.length : 0);
      }, 0);

      var assigned = yes(raw.assigned) || yes(raw.is_assigned) || yes(raw.mine);
      var stateKey = 'free';
      var stateLabel = 'FREE';

      if (waiterCall) {
        stateKey = 'attention';
        stateLabel = 'WAITER CALL';
      } else if (cleaning) {
        stateKey = 'attention';
        stateLabel = 'CLEANING';
      } else if (ready > 0 || /ready|serve/.test(rawStatus.toLowerCase())) {
        stateKey = 'ready';
        stateLabel = 'READY';
      } else if (due > 0 && openOrders > 0) {
        stateKey = 'payment';
        stateLabel = 'PAYMENT';
      } else if (openOrders > 0) {
        stateKey = 'open';
        stateLabel = 'OPEN';
      }

      return {
        raw: raw,
        id: id || number,
        number: number,
        name: tableName(raw),
        area: tableArea(raw),
        capacity: num(raw.capacity || raw.table_capacity, 0),
        assigned: assigned,
        openOrders: openOrders,
        linkedOrders: linked,
        latestOrder: latest,
        due: due,
        ready: ready,
        note: note,
        waiterCall: waiterCall,
        cleaning: cleaning,
        attention: waiterCall || cleaning || ready > 0 || note,
        itemCount: itemCount,
        rawStatus: rawStatus,
        state: stateKey,
        stateLabel: stateLabel,
        openedAt: latest ? orderTimestamp(latest) : 0
      };
    }).filter(function (table) {
      return table.id && table.number;
    });
  }

  function mineAvailable() {
    return state.tables.some(function (table) { return table.assigned; });
  }

  function filteredTables() {
    var query = state.query.toLowerCase();
    var hasMine = mineAvailable();

    return state.tables.filter(function (table) {
      if (state.filter === 'mine' && hasMine && !table.assigned) return false;
      if (state.filter === 'open' && table.openOrders < 1) return false;
      if (state.filter === 'attention' && !table.attention) return false;
      if (state.filter === 'free' && table.openOrders > 0) return false;
      if (state.area !== 'all' && table.area !== state.area) return false;

      if (query) {
        var haystack = [table.number, table.name, table.area, table.stateLabel, table.rawStatus].join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      var priority = {attention:0, ready:1, payment:2, open:3, free:4};
      if (priority[a.state] !== priority[b.state]) return priority[a.state] - priority[b.state];
      if (a.openedAt !== b.openedAt) return a.openedAt - b.openedAt;
      return a.number.localeCompare(b.number, undefined, {numeric:true, sensitivity:'base'});
    });
  }

  function tablePrimary(table) {
    if (table.waiterCall) return 'GUEST REQUEST';
    if (table.cleaning) return 'CLEANING REQUIRED';
    if (table.ready > 0) return table.ready + ' READY TO SERVE';
    if (table.due > 0) return money(table.due) + ' DUE';
    if (table.openOrders > 0) return table.itemCount + (table.itemCount === 1 ? ' ITEM' : ' ITEMS');
    if (table.capacity > 0) return table.capacity + ' SEATS';
    return 'START ORDER';
  }

  function tableSecondary(table) {
    if (table.note) return 'ORDER NOTE';
    if (table.openedAt) return 'OPEN ' + durationLabel(table.openedAt);
    return table.area.toUpperCase();
  }

  function cornerMarkup(table) {
    var rows = [];
    if (table.waiterCall) rows.push('<span class="pmd-final-badge is-call">!</span>');
    else if (table.ready > 0) rows.push('<span class="pmd-final-badge is-ready">' + esc(table.ready) + '</span>');
    else if (table.note) rows.push('<span class="pmd-final-badge is-note">N</span>');
    return rows.join('');
  }

  function tableMarkup(table) {
    var meta = table.openedAt ? durationLabel(table.openedAt) : table.area.toUpperCase();
    return '' +
      '<button type="button" class="pmd-final-table is-' + esc(table.state) + '" data-final-open-table="' + esc(table.id) + '">' +
        '<span class="pmd-final-table-status">' + esc(table.stateLabel) + '</span>' +
        cornerMarkup(table) +
        '<strong class="pmd-final-table-number">' + esc(table.number) + '</strong>' +
        '<span class="pmd-final-table-name">' + esc(table.name) + '</span>' +
        '<span class="pmd-final-table-divider"></span>' +
        '<span class="pmd-final-table-primary">' + esc(tablePrimary(table)) + '</span>' +
        '<span class="pmd-final-table-secondary"><b>' + esc(tableSecondary(table)) + '</b><small>' + esc(meta) + '</small></span>' +
      '</button>';
  }

  function renderAreas() {
    if (!areas) return;
    var names = Array.from(new Set(state.tables.map(function (table) { return table.area; }))).sort();
    var rows = ['all'].concat(names);
    areas.innerHTML = rows.map(function (name) {
      var label = name === 'all' ? 'ALL AREAS' : name.toUpperCase();
      return '<button type="button" class="' + (state.area === name ? 'is-active' : '') + '" data-final-area="' + esc(name) + '">' + esc(label) + '</button>';
    }).join('');
  }

  function renderCounts() {
    var hasMine = mineAvailable();
    var mine = hasMine ? state.tables.filter(function (table) { return table.assigned; }).length : state.tables.length;
    var openCount = state.tables.filter(function (table) { return table.openOrders > 0; }).length;
    var attention = state.tables.filter(function (table) { return table.attention; }).length;
    var free = state.tables.filter(function (table) { return table.openOrders < 1; }).length;
    var due = state.tables.reduce(function (sum, table) { return sum + table.due; }, 0);
    var readyCalls = state.tables.filter(function (table) { return table.ready > 0 || table.waiterCall || table.cleaning; }).length;

    setText('[data-final-count-mine]', mine);
    setText('[data-final-count-open]', openCount);
    setText('[data-final-count-attention]', attention);
    setText('[data-final-count-free]', free);
    setText('[data-final-count-all]', state.tables.length);
    setText('[data-final-stat-open]', openCount);
    setText('[data-final-stat-ready]', readyCalls);
    setText('[data-final-stat-due]', money(due));
    setText('[data-final-stat-free]', free);

    all('[data-final-alert-count]').forEach(function (badge) {
      badge.textContent = attention;
      badge.hidden = attention < 1;
    });
  }

  function renderFilters() {
    all('[data-final-filter]').forEach(function (button) {
      var active = button.getAttribute('data-final-filter') === state.filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderTables() {
    var rows = filteredTables();
    loading.hidden = true;
    grid.innerHTML = rows.map(tableMarkup).join('');
    empty.hidden = rows.length > 0;
    renderCounts();
    renderFilters();
    renderAreas();
    if (drawer.classList.contains('is-open')) renderDrawer();
  }

  function updateUser(payload) {
    var user = payload.user || {};
    var name = clean(user.name || user.username || user.email || 'Waiter');
    setText('[data-final-user]', name.toUpperCase() + ' · LIVE SERVICE');
  }

  async function refreshTables(silent) {
    if (state.loading || !posLayer.hidden) return;
    state.loading = true;

    if (!state.payload) {
      loading.hidden = false;
      empty.hidden = true;
    }

    if (state.request) state.request.abort();
    state.request = typeof AbortController === 'function' ? new AbortController() : null;
    setSync('loading', 'SYNCING');

    try {
      var separator = dataUrl.indexOf('?') === -1 ? '?' : '&';
      var payload = await fetchJson(dataUrl + separator + '_=' + Date.now(), {
        signal: state.request ? state.request.signal : undefined
      });

      state.payload = payload;
      state.tables = deriveTables(payload);
      state.updatedAt = Date.now();
      state.refreshCount += 1;

      if (state.filter === 'mine' && !mineAvailable()) state.filter = 'open';

      updateUser(payload);
      renderTables();
      setSync('online', 'LIVE');
      if (updated) updated.textContent = 'UPDATED ' + formatClock(state.updatedAt);
      if (!silent) toast('LIVE TABLES UPDATED');
    } catch (error) {
      if (error.name === 'AbortError') return;
      setSync('error', navigator.onLine ? 'DATA ERROR' : 'OFFLINE');
      loading.hidden = true;
      if (!state.payload) {
        empty.hidden = false;
        var title = empty.querySelector('strong');
        var subtitle = empty.querySelector('span');
        if (title) title.textContent = 'LIVE DATA UNAVAILABLE';
        if (subtitle) subtitle.textContent = error.message || 'Could not load the restaurant tables.';
      }
      if (!silent) toast(error.message || 'COULD NOT REFRESH', true);
    } finally {
      state.loading = false;
      state.request = null;
    }
  }

  function normalizeNotification(item) {
    var payload = {};
    try {
      payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : (item.payload || {});
    } catch (error) {}

    var tableId = clean(item.table_id || payload.table_id || payload.location_table_id || '');
    var title = clean(item.title || payload.title || item.type || 'Service update');
    var message = clean(item.message || payload.message || payload.status_name || payload.status || '');
    var time = item.created_at || item.updated_at || payload.created_at || '';

    return {
      id: clean(item.id || payload.id || Math.random()),
      tableId: tableId,
      title: title,
      message: message,
      type: clean(item.type || payload.type || 'activity'),
      time: time
    };
  }

  async function refreshNotifications(silent) {
    if (state.notificationRequest) state.notificationRequest.abort();
    state.notificationRequest = typeof AbortController === 'function' ? new AbortController() : null;

    try {
      var separator = notificationsUrl.indexOf('?') === -1 ? '?' : '&';
      var payload = await fetchJson(notificationsUrl + separator + '_=' + Date.now(), {
        signal: state.notificationRequest ? state.notificationRequest.signal : undefined
      });
      var rows = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.notifications) ? payload.notifications : []);
      state.notifications = rows.map(normalizeNotification);
      state.notificationRefreshCount += 1;
      if (drawer.classList.contains('is-open') && state.drawerTab === 'notifications') renderDrawer();
    } catch (error) {
      if (!silent && error.name !== 'AbortError') toast('NOTIFICATIONS COULD NOT REFRESH', true);
    } finally {
      state.notificationRequest = null;
    }
  }

  function attentionRows() {
    return state.tables.filter(function (table) { return table.attention; });
  }

  function drawerAttentionMarkup() {
    var rows = attentionRows();
    if (!rows.length) return '<div class="pmd-final-drawer-empty"><strong>ALL CLEAR</strong><span>No active waiter call, ready item, cleaning request or order note.</span></div>';

    return rows.map(function (table) {
      return '<button type="button" class="pmd-final-drawer-row" data-final-drawer-table="' + esc(table.id) + '">' +
        '<b>' + esc(table.number) + '</b>' +
        '<span><strong>' + esc(table.stateLabel) + '</strong><small>' + esc(tablePrimary(table)) + ' · ' + esc(table.area) + '</small></span>' +
        '<i>›</i>' +
      '</button>';
    }).join('');
  }

  function drawerNotificationsMarkup() {
    if (!state.notifications.length) return '<div class="pmd-final-drawer-empty"><strong>NO RECENT ACTIVITY</strong><span>New order, waiter, payment and reservation notifications will appear here.</span></div>';

    return state.notifications.map(function (item) {
      var attribute = item.tableId ? ' data-final-drawer-table="' + esc(item.tableId) + '"' : '';
      return '<button type="button" class="pmd-final-drawer-row is-activity"' + attribute + '>' +
        '<b>' + esc(item.type.slice(0, 1).toUpperCase() || '•') + '</b>' +
        '<span><strong>' + esc(item.title) + '</strong><small>' + esc(item.message || 'Service activity') + (item.time ? ' · ' + esc(formatClock(item.time)) : '') + '</small></span>' +
        '<i>' + (item.tableId ? '›' : '') + '</i>' +
      '</button>';
    }).join('');
  }

  function renderDrawer() {
    all('[data-final-drawer-tab]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-final-drawer-tab') === state.drawerTab);
    });
    drawerList.innerHTML = state.drawerTab === 'notifications' ? drawerNotificationsMarkup() : drawerAttentionMarkup();
  }

  function openDrawer(tab) {
    state.drawerTab = tab || 'attention';
    renderDrawer();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-final-drawer-open');
    if (state.drawerTab === 'notifications') refreshNotifications(true);
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pmd-final-drawer-open');
  }

  function overlayUrl(tableId) {
    return overlayTemplate.replace('{table}', encodeURIComponent(String(tableId)));
  }

  function findTable(tableId) {
    return state.tables.find(function (table) { return String(table.id) === String(tableId); }) || null;
  }

  function showPosLayer(tableId) {
    state.activeTableId = String(tableId);
    posLayer.hidden = false;
    posLayer.setAttribute('aria-hidden', 'false');
    posLoading.classList.remove('is-hidden');
    launcher.hidden = true;
    document.body.classList.add('pmd-final-pos-open');
  }

  function hidePosLayer() {
    posLayer.hidden = true;
    posLayer.setAttribute('aria-hidden', 'true');
    posLoading.classList.remove('is-hidden');
    launcher.hidden = false;
    document.body.classList.remove('pmd-final-pos-open');
    state.activeTableId = null;
  }

  function destroyPos() {
    if (state.posAbort) {
      state.posAbort.abort();
      state.posAbort = null;
    }

    var instance = state.posInstance;
    state.posInstance = null;

    if (instance && typeof instance.destroy === 'function') {
      try { instance.destroy(); } catch (error) {}
    }

    if (window.PMDWaiterPOS === instance) window.PMDWaiterPOS = null;
    posHost.replaceChildren();
  }

  function closePos(fromHistory) {
    destroyPos();
    hidePosLayer();

    if (!fromHistory && state.historyPushed && history.state && history.state.pmdWaiterFinalV1) {
      state.historyPushed = false;
      history.back();
    } else {
      state.historyPushed = false;
    }

    refreshTables(true);
    refreshNotifications(true);
  }

  function requestClosePos() {
    if (state.historyPushed && history.state && history.state.pmdWaiterFinalV1) history.back();
    else closePos(true);
  }

  async function openPos(tableId) {
    var table = findTable(tableId);
    if (!table) {
      toast('TABLE IS NO LONGER AVAILABLE', true);
      return;
    }

    closeDrawer();
    destroyPos();
    showPosLayer(tableId);

    if (!window.PMDWaiterPOSApp || typeof window.PMDWaiterPOSApp.mount !== 'function') {
      hidePosLayer();
      toast('POS ENGINE IS NOT AVAILABLE', true);
      return;
    }

    state.posAbort = typeof AbortController === 'function' ? new AbortController() : null;

    history.pushState({pmdWaiterFinalV1:true, tableId:String(tableId)}, '', location.pathname + '?table=' + encodeURIComponent(String(tableId)));
    state.historyPushed = true;

    try {
      var payload = await fetchJson(overlayUrl(tableId) + '?_=' + Date.now(), {
        signal: state.posAbort ? state.posAbort.signal : undefined
      });
      state.posAbort = null;

      if (!payload.html || !payload.bootstrap) throw new Error('Table order data is incomplete.');

      payload.bootstrap.settings = payload.bootstrap.settings || {};
      payload.bootstrap.settings.dashboard_url = location.pathname;

      var holder = document.createElement('div');
      holder.innerHTML = payload.html;
      var posRoot = holder.querySelector('[data-pmd-pos-root]');
      if (!posRoot) throw new Error('The order workspace could not be created.');

      posHost.replaceChildren(posRoot);
      state.posInstance = window.PMDWaiterPOSApp.mount(posRoot, payload.bootstrap, {
        embedded: true,
        onClose: requestClosePos
      });

      posLoading.classList.add('is-hidden');
      window.dispatchEvent(new CustomEvent('pmd:waiter-standard-v2-opened', {
        detail: {tableId:String(tableId), table:table, pos:state.posInstance, final:true}
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      toast(error.message || 'COULD NOT OPEN TABLE', true);
      closePos(false);
    }
  }

  function applyTheme(theme) {
    var value = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', value);
    document.documentElement.setAttribute('data-pmd-waiter-theme', value);
    localStorage.setItem('pmd-waiter-final-theme', value);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'dark' ? '#0f1720' : '#f3f6f8');
    all('[data-final-theme]').forEach(function (button) {
      button.textContent = value === 'dark' ? '☀' : '◐';
      button.setAttribute('aria-label', value === 'dark' ? 'Use light mode' : 'Use dark mode');
    });
  }

  function initialTheme() {
    var stored = localStorage.getItem('pmd-waiter-final-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setFilter(filter) {
    if (['mine', 'open', 'attention', 'free', 'all'].indexOf(filter) === -1) return;
    if (filter === 'mine' && !mineAvailable()) filter = 'open';
    state.filter = filter;
    localStorage.setItem('pmd-waiter-final-filter', filter);
    renderTables();
  }

  function bind() {
    root.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;

      var filter = target.closest('[data-final-filter]');
      if (filter) return setFilter(filter.getAttribute('data-final-filter'));

      var area = target.closest('[data-final-area]');
      if (area) {
        state.area = area.getAttribute('data-final-area') || 'all';
        renderTables();
        return;
      }

      var table = target.closest('[data-final-open-table]');
      if (table) return openPos(table.getAttribute('data-final-open-table'));

      var drawerTable = target.closest('[data-final-drawer-table]');
      if (drawerTable) return openPos(drawerTable.getAttribute('data-final-drawer-table'));

      var drawerTab = target.closest('[data-final-drawer-tab]');
      if (drawerTab) {
        state.drawerTab = drawerTab.getAttribute('data-final-drawer-tab') || 'attention';
        renderDrawer();
        if (state.drawerTab === 'notifications') refreshNotifications(true);
        return;
      }

      if (target.closest('[data-final-alerts]')) return openDrawer('attention');
      if (target.closest('[data-final-close-drawer]')) return closeDrawer();
      if (target.closest('[data-final-refresh]')) {
        refreshTables(false);
        refreshNotifications(true);
        return;
      }
      if (target.closest('[data-final-theme]')) {
        applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        return;
      }
      if (target.closest('[data-final-reservations]')) {
        window.open(reservationsUrl, '_blank', 'noopener');
        return;
      }
      if (target.closest('[data-final-floor-operations]')) {
        window.open(floorOperationsUrl, '_blank', 'noopener');
        return;
      }
      if (target.closest('[data-final-clear-search]')) {
        state.query = '';
        search.value = '';
        clearSearch.hidden = true;
        renderTables();
        search.focus();
        return;
      }
      if (target.closest('[data-final-reset]')) {
        state.filter = 'all';
        state.area = 'all';
        state.query = '';
        search.value = '';
        clearSearch.hidden = true;
        renderTables();
        return;
      }
      if (target.closest('[data-final-cancel-pos]')) requestClosePos();
    });

    search.addEventListener('input', function () {
      state.query = search.value.trim();
      clearSearch.hidden = !state.query;
      renderTables();
    });

    window.addEventListener('popstate', function () {
      if (!posLayer.hidden) closePos(true);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (drawer.classList.contains('is-open')) closeDrawer();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && posLayer.hidden) {
        refreshTables(true);
        refreshNotifications(true);
      }
    });

    window.addEventListener('online', function () {
      if (posLayer.hidden) refreshTables(true);
    });

    window.addEventListener('offline', function () {
      setSync('error', 'OFFLINE');
    });
  }

  function start() {
    applyTheme(initialTheme());
    bind();
    renderFilters();
    refreshTables(true);
    refreshNotifications(true);

    state.tablePoll = setInterval(function () {
      if (!document.hidden && posLayer.hidden) refreshTables(true);
    }, 15000);

    state.notificationPoll = setInterval(function () {
      if (!document.hidden) refreshNotifications(true);
    }, 15000);

    var requested = new URLSearchParams(location.search).get('table');
    if (requested) {
      var waitForData = setInterval(function () {
        if (!state.tables.length) return;
        clearInterval(waitForData);
        openPos(requested);
      }, 100);
      setTimeout(function () { clearInterval(waitForData); }, 10000);
    }

    console.info('[PMD] Waiter Final V1 isolated workstation active');
  }

  window.PMDWaiterFinalV1 = {
    version: 'pmd-waiter-final-v1',
    refresh: function () { return Promise.all([refreshTables(false), refreshNotifications(true)]); },
    openTable: openPos,
    closeTable: requestClosePos,
    openAlerts: function () { openDrawer('attention'); },
    setTheme: applyTheme,
    debug: function () {
      return {
        version: 'pmd-waiter-final-v1',
        active: true,
        theme: root.getAttribute('data-theme'),
        launcherVisible: !launcher.hidden,
        posOpen: !posLayer.hidden,
        activeTableId: state.activeTableId,
        filter: state.filter,
        area: state.area,
        tables: state.tables.length,
        openTables: state.tables.filter(function (table) { return table.openOrders > 0; }).length,
        attentionTables: attentionRows().length,
        notifications: state.notifications.length,
        refreshCount: state.refreshCount,
        notificationRefreshCount: state.notificationRefreshCount,
        polling: {
          tables: !!state.tablePoll,
          notifications: !!state.notificationPoll,
          intervalMs: 15000
        },
        mutationObservers: 0,
        themeDecoratorLoaded: typeof window.PMDWaiterStandardV221 !== 'undefined'
      };
    }
  };

  start();
})();
