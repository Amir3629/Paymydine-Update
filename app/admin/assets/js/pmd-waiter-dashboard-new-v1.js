(function () {
  'use strict';

  if (window.PMDWaiterDashboardNewV1) return;

  var root = document.querySelector('[data-pmd-waiter-new-root]');
  if (!root) return;

  var launcher = root.querySelector('[data-waiter-launcher]');
  var tableGrid = root.querySelector('[data-table-grid]');
  var tableLoading = root.querySelector('[data-table-loading]');
  var tableEmpty = root.querySelector('[data-table-empty]');
  var sectionNav = root.querySelector('[data-table-sections]');
  var searchInput = root.querySelector('[data-table-search]');
  var clearSearchButton = root.querySelector('[data-clear-search]');
  var syncState = root.querySelector('[data-sync-state]');
  var lastUpdated = root.querySelector('[data-last-updated]');
  var alertDrawer = root.querySelector('[data-alert-drawer]');
  var alertList = root.querySelector('[data-alert-list]');
  var posLayer = root.querySelector('[data-new-pos-layer]');
  var posHost = root.querySelector('[data-new-pos-host]');
  var posLoading = root.querySelector('[data-new-pos-loading]');
  var toastElement = root.querySelector('[data-waiter-toast]');

  var dataUrl = root.getAttribute('data-data-url') || '/admin/pmd-waiter-dashboard-v9-tenant-data';
  var overlayTemplate = root.getAttribute('data-overlay-url') || '/admin/pmd-waiter-pos-v1/overlay/{table}';
  var standaloneTemplate = root.getAttribute('data-standalone-url') || '/admin/waiter-pos/{table}';

  var state = {
    payload: null,
    tables: [],
    orders: [],
    filter: localStorage.getItem('pmd-waiter-new-filter') || 'mine',
    section: 'all',
    search: '',
    loading: false,
    request: null,
    poll: null,
    loadedAt: 0,
    posInstance: null,
    posAbort: null,
    activeTableId: null,
    historyPushed: false,
    toastTimer: null
  };

  function $(selector, parent) {
    return (parent || root).querySelector(selector);
  }

  function $$(selector, parent) {
    return Array.prototype.slice.call((parent || root).querySelectorAll(selector));
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character];
    });
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function truthy(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function currencySymbol() {
    if (state.payload && state.payload.currency) return String(state.payload.currency);
    return '€';
  }

  function money(value) {
    return currencySymbol() + number(value, 0).toFixed(2);
  }

  function setText(selector, value) {
    var element = $(selector);
    if (element) element.textContent = String(value == null ? '' : value);
  }

  function toast(message, isError) {
    if (!toastElement) return;
    toastElement.textContent = String(message || '');
    toastElement.classList.toggle('is-error', !!isError);
    toastElement.classList.add('is-show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toastElement.classList.remove('is-show');
    }, 3200);
  }

  function setSync(mode, label) {
    if (!syncState) return;
    syncState.classList.toggle('is-online', mode === 'online');
    syncState.classList.toggle('is-error', mode === 'error');
    var text = syncState.querySelector('span');
    if (text) text.textContent = label || mode;
  }

  function dateLabel(timestamp) {
    if (!timestamp) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(timestamp));
    } catch (error) {
      return new Date(timestamp).toLocaleTimeString();
    }
  }

  function tableSection(table) {
    return clean(
      table.section ||
      table.table_section ||
      table.table_zone ||
      table.floor_name ||
      table.zone ||
      'Main'
    ) || 'Main';
  }

  function tableNumber(table) {
    return clean(table.number || table.table_number || table.table_no || table.id || '');
  }

  function tableName(table) {
    var label = clean(table.label || table.name || table.table_name || '');
    var numberLabel = tableNumber(table);
    if (!label || label === numberLabel || label === 'Table ' + numberLabel) return 'Table ' + numberLabel;
    return label;
  }

  function orderTableId(order) {
    return String(order.table_id || order.location_table_id || order.table_ref || order.table_number || order.table_no || '');
  }

  function deriveTables(payload) {
    var rawTables = Array.isArray(payload.tables)
      ? payload.tables
      : (((payload.sections || {}).floor_plan || {}).tables || []);

    var orders = Array.isArray(payload.orders)
      ? payload.orders
      : (Array.isArray(payload.current_orders) ? payload.current_orders : []);

    var ordersByTable = {};
    orders.forEach(function (order) {
      var keys = [
        String(order.table_id || ''),
        String(order.table_number || ''),
        String(order.table_no || ''),
        String(order.table_ref || '')
      ].filter(Boolean);

      keys.forEach(function (key) {
        if (!ordersByTable[key]) ordersByTable[key] = [];
        if (ordersByTable[key].indexOf(order) === -1) ordersByTable[key].push(order);
      });
    });

    state.orders = orders;

    return rawTables.map(function (table) {
      var id = String(table.id || table.table_id || table.location_table_id || '');
      var numberLabel = tableNumber(table);
      var linkedOrders = ordersByTable[id] || ordersByTable[numberLabel] || [];
      var openOrders = Math.max(number(table.open_orders, 0), linkedOrders.length);
      var due = number(table.due, 0);

      if (!due && linkedOrders.length) {
        due = linkedOrders.reduce(function (sum, order) {
          var settlement = clean(order.settlement_status || '').toLowerCase();
          if (['paid', 'settled', 'closed'].indexOf(settlement) !== -1) return sum;
          return sum + Math.max(0, number(order.total, 0) - number(order.settled_amount, 0));
        }, 0);
      }

      var ready = number(table.ready, 0);
      var kitchen = number(table.kitchen, 0);
      var rawStatus = clean(table.status || table.latest_order_status || '').toLowerCase();
      var assigned = truthy(table.assigned) || truthy(table.is_assigned) || truthy(table.mine);
      var status = 'free';

      if (ready > 0 || /ready|serve/.test(rawStatus)) {
        status = 'ready';
      } else if (kitchen > 0 || /kitchen|prepar|cook|sent/.test(rawStatus)) {
        status = 'kitchen';
      } else if (due > 0 && openOrders > 0) {
        status = 'payment';
      } else if (/paid|settled|closing/.test(rawStatus)) {
        status = 'paid';
      } else if (openOrders > 0 || /active|open|received|pending/.test(rawStatus)) {
        status = 'active';
      }

      var hasNote = linkedOrders.some(function (order) {
        return clean(order.comment || order.note || '') !== '' || (Array.isArray(order.item_notes) && order.item_notes.length > 0);
      });

      return {
        raw: table,
        id: id || numberLabel,
        number: numberLabel,
        name: tableName(table),
        section: tableSection(table),
        capacity: number(table.capacity || table.table_capacity, 0),
        assigned: assigned,
        openOrders: openOrders,
        due: due,
        dueLabel: clean(table.due_label) || money(due),
        ready: ready,
        kitchen: kitchen,
        status: status,
        statusLabel: statusLabel(status),
        attention: status === 'ready' || ready > 0 || hasNote,
        hasNote: hasNote,
        orders: linkedOrders
      };
    }).filter(function (table) {
      return table.id && table.number;
    });
  }

  function statusLabel(status) {
    return {
      free: 'Free',
      active: 'Open order',
      kitchen: 'In kitchen',
      ready: 'Ready',
      payment: 'Payment due',
      paid: 'Paid',
      unassigned: 'Other waiter'
    }[status] || 'Table';
  }

  function mineHasAssignments() {
    return state.tables.some(function (table) { return table.assigned; });
  }

  function filteredTables() {
    var query = state.search.toLowerCase();
    var hasAssignments = mineHasAssignments();

    return state.tables.filter(function (table) {
      if (state.filter === 'mine' && hasAssignments && !table.assigned) return false;
      if (state.filter === 'open' && table.openOrders < 1) return false;
      if (state.filter === 'attention' && !table.attention) return false;
      if (state.section !== 'all' && table.section !== state.section) return false;

      if (query) {
        var haystack = [table.number, table.name, table.section, table.statusLabel].join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }

      return true;
    }).sort(function (a, b) {
      if (a.attention !== b.attention) return a.attention ? -1 : 1;
      if (a.openOrders !== b.openOrders) return b.openOrders - a.openOrders;
      return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  function tableMeta(table) {
    if (table.ready > 0) return table.ready + ' ready';
    if (table.kitchen > 0) return table.kitchen + ' in kitchen';
    if (table.due > 0) return table.dueLabel + ' due';
    if (table.openOrders > 0) return table.openOrders + (table.openOrders === 1 ? ' open order' : ' open orders');
    if (table.capacity > 0) return table.capacity + ' seats';
    return 'Tap to start';
  }

  function tableSecondary(table) {
    if (table.hasNote) return 'Order note';
    if (table.orders.length) {
      var latest = table.orders[0];
      return clean(latest.status_label || latest.status || 'Active service');
    }
    return table.section;
  }

  function tableMarkup(table) {
    var alert = '';
    if (table.ready > 0) alert = '<span class="pmd-waiter-table-alert">READY</span>';
    else if (table.hasNote) alert = '<span class="pmd-waiter-table-alert">NOTE</span>';
    else if (table.openOrders > 1) alert = '<span class="pmd-waiter-table-alert">' + esc(table.openOrders) + '</span>';

    return '' +
      '<button type="button" class="pmd-waiter-table is-' + esc(table.status) + '" data-open-table="' + esc(table.id) + '" aria-label="Open ' + esc(table.name) + '">' +
        '<span class="pmd-waiter-table-head">' +
          '<span class="pmd-waiter-table-status">' + esc(table.statusLabel) + '</span>' +
          alert +
        '</span>' +
        '<span class="pmd-waiter-table-main">' +
          '<span class="pmd-waiter-table-number">' + esc(table.number) + '</span>' +
          '<span class="pmd-waiter-table-name">' + esc(table.name) + '</span>' +
        '</span>' +
        '<span class="pmd-waiter-table-foot">' +
          '<span class="pmd-waiter-table-meta">' +
            '<strong>' + esc(tableMeta(table)) + '</strong>' +
            '<span>' + esc(tableSecondary(table)) + '</span>' +
          '</span>' +
          '<span class="pmd-waiter-table-open" aria-hidden="true">›</span>' +
        '</span>' +
      '</button>';
  }

  function renderSections() {
    if (!sectionNav) return;
    var sections = Array.from(new Set(state.tables.map(function (table) { return table.section; }))).sort();
    var rows = ['all'].concat(sections);

    sectionNav.innerHTML = rows.map(function (section) {
      var label = section === 'all' ? 'All areas' : section;
      return '<button type="button" class="' + (state.section === section ? 'is-active' : '') + '" data-table-section="' + esc(section) + '">' + esc(label) + '</button>';
    }).join('');
  }

  function renderCounts() {
    var mine = state.tables.filter(function (table) { return table.assigned; }).length;
    if (!mineHasAssignments()) mine = state.tables.length;
    var open = state.tables.filter(function (table) { return table.openOrders > 0; }).length;
    var attention = state.tables.filter(function (table) { return table.attention; }).length;
    var due = state.tables.reduce(function (sum, table) { return sum + table.due; }, 0);

    setText('[data-count-mine]', mine);
    setText('[data-count-all]', state.tables.length);
    setText('[data-count-open]', open);
    setText('[data-count-attention]', attention);
    setText('[data-summary-open]', open);
    setText('[data-summary-attention]', attention);
    setText('[data-summary-due]', money(due));

    $$('[data-alert-count]').forEach(function (badge) {
      badge.textContent = attention;
      badge.hidden = attention < 1;
    });

    $$('[data-mobile-alert-count]').forEach(function (badge) {
      badge.textContent = attention;
      badge.hidden = attention < 1;
    });
  }

  function renderTabs() {
    $$('[data-table-filter]').forEach(function (button) {
      var active = button.getAttribute('data-table-filter') === state.filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    $$('[data-mobile-view]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-mobile-view') === state.filter);
    });
  }

  function renderAlerts() {
    if (!alertList) return;
    var attentionTables = state.tables.filter(function (table) { return table.attention; });

    if (!attentionTables.length) {
      alertList.innerHTML = '<div class="pmd-waiter-alert-empty"><strong>Everything is clear</strong><span>No table needs immediate attention.</span></div>';
      return;
    }

    alertList.innerHTML = attentionTables.map(function (table) {
      var icon = table.ready > 0 ? '✓' : '!';
      return '' +
        '<button type="button" class="pmd-waiter-alert-item" data-alert-table="' + esc(table.id) + '">' +
          '<b>' + icon + '</b>' +
          '<span><strong>' + esc(table.name) + ' · ' + esc(table.statusLabel) + '</strong><small>' + esc(tableMeta(table)) + ' · ' + esc(tableSecondary(table)) + '</small></span>' +
          '<i aria-hidden="true">›</i>' +
        '</button>';
    }).join('');
  }

  function renderTables() {
    var rows = filteredTables();
    tableLoading.hidden = true;
    tableGrid.innerHTML = rows.map(tableMarkup).join('');
    tableEmpty.hidden = rows.length > 0;
    renderTabs();
    renderCounts();
    renderSections();
    renderAlerts();
  }

  function updateUser(payload) {
    var user = payload.user || {};
    var name = clean(user.name || user.username || user.email || 'Waiter');
    setText('[data-waiter-user]', name + ' · live service');
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

    var json = await response.json().catch(function () { return {}; });
    if (!response.ok || json.ok === false) {
      var error = new Error(json.message || json.error || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return json;
  }

  async function refresh(silent) {
    if (state.loading) return;
    state.loading = true;

    if (!state.payload) {
      tableLoading.hidden = false;
      tableEmpty.hidden = true;
    }

    if (state.request) state.request.abort();
    state.request = typeof AbortController === 'function' ? new AbortController() : null;
    setSync('loading', 'Refreshing');

    try {
      var separator = dataUrl.indexOf('?') === -1 ? '?' : '&';
      var payload = await fetchJson(dataUrl + separator + '_=' + Date.now(), {
        signal: state.request ? state.request.signal : undefined
      });

      state.payload = payload;
      state.tables = deriveTables(payload);
      state.loadedAt = Date.now();
      updateUser(payload);
      renderTables();
      setSync('online', 'Live');
      if (lastUpdated) lastUpdated.textContent = 'Updated ' + dateLabel(state.loadedAt);
      if (!silent) toast('Tables refreshed');
    } catch (error) {
      if (error.name === 'AbortError') return;
      setSync('error', 'Offline');
      tableLoading.hidden = true;
      if (!state.payload) {
        tableEmpty.hidden = false;
        tableEmpty.querySelector('strong').textContent = 'Could not load tables';
        tableEmpty.querySelector('span').textContent = error.message || 'Check the connection and retry.';
      }
      if (!silent) toast(error.message || 'Could not refresh tables.', true);
    } finally {
      state.loading = false;
      state.request = null;
    }
  }

  function setFilter(filter) {
    if (['mine', 'all', 'open', 'attention'].indexOf(filter) === -1) return;
    state.filter = filter;
    localStorage.setItem('pmd-waiter-new-filter', filter);
    renderTables();
  }

  function openAlerts() {
    if (!alertDrawer) return;
    renderAlerts();
    alertDrawer.classList.add('is-open');
    alertDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeAlerts() {
    if (!alertDrawer) return;
    alertDrawer.classList.remove('is-open');
    alertDrawer.setAttribute('aria-hidden', 'true');
    if (!state.posInstance && !state.posAbort) document.body.style.overflow = '';
  }

  function overlayUrl(tableId) {
    return overlayTemplate.replace('{table}', encodeURIComponent(String(tableId)));
  }

  function standaloneUrl(tableId) {
    return standaloneTemplate.replace('{table}', encodeURIComponent(String(tableId)));
  }

  function findTable(tableId) {
    return state.tables.find(function (table) { return String(table.id) === String(tableId); }) || null;
  }

  function showPosLayer(tableId) {
    state.activeTableId = String(tableId);
    posLayer.hidden = false;
    posLayer.setAttribute('aria-hidden', 'false');
    posLoading.classList.remove('is-hidden');
    posHost.innerHTML = '';
    launcher.setAttribute('aria-hidden', 'true');
    document.body.classList.add('pmd-waiter-new-pos-open');
  }

  function hidePosLayer() {
    posLayer.hidden = true;
    posLayer.setAttribute('aria-hidden', 'true');
    posLoading.classList.remove('is-hidden');
    posHost.innerHTML = '';
    launcher.removeAttribute('aria-hidden');
    document.body.classList.remove('pmd-waiter-new-pos-open');
    state.activeTableId = null;
  }

  function destroyPos() {
    if (state.posAbort) {
      state.posAbort.abort();
      state.posAbort = null;
    }

    if (state.posInstance && typeof state.posInstance.destroy === 'function') {
      try { state.posInstance.destroy(); } catch (error) {}
    }

    state.posInstance = null;
    if (window.PMDWaiterPOS === state.posInstance) window.PMDWaiterPOS = null;
  }

  function closePos(fromHistory) {
    destroyPos();
    hidePosLayer();

    if (!fromHistory && state.historyPushed && history.state && history.state.pmdWaiterPosNewOverlay) {
      state.historyPushed = false;
      history.back();
    } else {
      state.historyPushed = false;
    }

    refresh(true);
  }

  function requestClosePos() {
    if (state.historyPushed && history.state && history.state.pmdWaiterPosNewOverlay) {
      history.back();
    } else {
      closePos(true);
    }
  }

  async function openPos(tableId) {
    var table = findTable(tableId);
    if (!table) {
      toast('Table is no longer available. Refresh and try again.', true);
      return;
    }

    closeAlerts();
    destroyPos();
    showPosLayer(tableId);

    if (!window.PMDWaiterPOSApp || typeof window.PMDWaiterPOSApp.mount !== 'function') {
      hidePosLayer();
      toast('The waiter POS engine is not available.', true);
      return;
    }

    if (typeof AbortController === 'function') state.posAbort = new AbortController();

    history.pushState(
      { pmdWaiterPosNewOverlay: true, tableId: String(tableId) },
      '',
      location.pathname + '?table=' + encodeURIComponent(String(tableId))
    );
    state.historyPushed = true;

    try {
      var payload = await fetchJson(overlayUrl(tableId) + '?_=' + Date.now(), {
        signal: state.posAbort ? state.posAbort.signal : undefined
      });

      state.posAbort = null;
      posHost.innerHTML = payload.html || '';
      var posRoot = posHost.querySelector('[data-pmd-pos-root]');

      if (!posRoot || !payload.bootstrap) {
        throw new Error('The table order workspace could not be created.');
      }

      state.posInstance = window.PMDWaiterPOSApp.mount(posRoot, payload.bootstrap, {
        embedded: true,
        onClose: requestClosePos
      });

      if (window.PMDWaiterPOSProductDetailsV3 && typeof window.PMDWaiterPOSProductDetailsV3.install === 'function') {
        window.PMDWaiterPOSProductDetailsV3.install(posRoot, state.posInstance);
      }

      if (window.PMDWaiterPOSSimpleV27 && typeof window.PMDWaiterPOSSimpleV27.install === 'function') {
        window.PMDWaiterPOSSimpleV27.install(posRoot, state.posInstance);
      }

      posLoading.classList.add('is-hidden');
    } catch (error) {
      if (error.name === 'AbortError') return;
      toast(error.message || 'Could not open this table.', true);
      closePos(false);
    }
  }

  function bindEvents() {
    root.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;

      var filterButton = target.closest('[data-table-filter]');
      if (filterButton) {
        setFilter(filterButton.getAttribute('data-table-filter'));
        return;
      }

      var mobileFilter = target.closest('[data-mobile-view]');
      if (mobileFilter) {
        setFilter(mobileFilter.getAttribute('data-mobile-view'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      var sectionButton = target.closest('[data-table-section]');
      if (sectionButton) {
        state.section = sectionButton.getAttribute('data-table-section') || 'all';
        renderTables();
        return;
      }

      var tableButton = target.closest('[data-open-table]');
      if (tableButton) {
        openPos(tableButton.getAttribute('data-open-table'));
        return;
      }

      var alertTable = target.closest('[data-alert-table]');
      if (alertTable) {
        openPos(alertTable.getAttribute('data-alert-table'));
        return;
      }

      if (target.closest('[data-refresh]')) {
        refresh(false);
        return;
      }

      if (target.closest('[data-open-alerts]')) {
        openAlerts();
        return;
      }

      if (target.closest('[data-close-alerts]')) {
        closeAlerts();
        return;
      }

      if (target.closest('[data-clear-search]')) {
        state.search = '';
        searchInput.value = '';
        clearSearchButton.hidden = true;
        renderTables();
        searchInput.focus();
        return;
      }

      if (target.closest('[data-reset-filters]')) {
        state.filter = 'all';
        state.section = 'all';
        state.search = '';
        searchInput.value = '';
        clearSearchButton.hidden = true;
        renderTables();
        return;
      }

      if (target.closest('[data-cancel-pos-load]')) {
        requestClosePos();
      }
    });

    searchInput.addEventListener('input', function () {
      state.search = searchInput.value.trim();
      clearSearchButton.hidden = !state.search;
      renderTables();
    });

    window.addEventListener('popstate', function () {
      if (!posLayer.hidden) closePos(true);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (alertDrawer && alertDrawer.classList.contains('is-open')) {
        closeAlerts();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && posLayer.hidden) refresh(true);
    });

    window.addEventListener('online', function () {
      if (posLayer.hidden) refresh(true);
    });

    window.addEventListener('offline', function () {
      setSync('error', 'Offline');
    });
  }

  function startPolling() {
    clearInterval(state.poll);
    state.poll = setInterval(function () {
      if (!document.hidden && posLayer.hidden) refresh(true);
    }, 15000);
  }

  function debug() {
    var visible = filteredTables();
    var result = {
      version: 'pmd-waiter-dashboard-new-v1',
      route: location.pathname,
      dataUrl: dataUrl,
      tables: state.tables.length,
      visibleTables: visible.length,
      assignedTables: state.tables.filter(function (table) { return table.assigned; }).length,
      openTables: state.tables.filter(function (table) { return table.openOrders > 0; }).length,
      attentionTables: state.tables.filter(function (table) { return table.attention; }).length,
      filter: state.filter,
      section: state.section,
      search: state.search,
      posOpen: !posLayer.hidden,
      activeTableId: state.activeTableId,
      posEngine: typeof window.PMDWaiterPOSApp,
      paymentEngine: typeof window.PMDWaiterPOSPaymentV2,
      lastLoadedAt: state.loadedAt ? new Date(state.loadedAt).toISOString() : null
    };
    console.log('[PMD] Waiter dashboard new V1 debug', result);
    return result;
  }

  window.PMDWaiterDashboardNewV1 = {
    active: true,
    refresh: function () { return refresh(false); },
    openTable: openPos,
    closeTable: requestClosePos,
    debug: debug,
    standaloneUrl: standaloneUrl
  };

  bindEvents();
  renderTabs();
  refresh(true);
  startPolling();

  console.info('[PMD] Waiter dashboard new V1 mobile table launcher active');
})();
