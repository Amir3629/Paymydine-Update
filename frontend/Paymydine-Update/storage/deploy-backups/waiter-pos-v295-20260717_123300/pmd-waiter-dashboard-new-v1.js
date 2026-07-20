(function () {

  function pmdInstallFinalPOSLayout(posRoot, attempt) {
    if (!posRoot || posRoot.dataset.pmdV292Installed === '1') {
      return;
    }

    /*
     * V2.9.3 permanent fix:
     * In the real mounted POS, posRoot itself is .pmd-pos-app.
     * querySelector() only searches descendants, not the node itself.
     */
    var app = posRoot.matches('.pmd-pos-app')
      ? posRoot
      : posRoot.querySelector('.pmd-pos-app');
    var workspace = posRoot.querySelector('.pmd-pos-workspace');
    var catalog = posRoot.querySelector('.pmd-pos-catalog');
    var categories = posRoot.querySelector(
      '[data-pos-categories], .pmd-pos-categories'
    );
    var cart = posRoot.querySelector('.pmd-pos-cart');
    var oldTopbar = posRoot.querySelector('.pmd-pos-topbar');

    if (!app || !workspace || !catalog || !categories || !cart) {
      attempt = Number(attempt || 0);

      if (attempt < 100) {
        setTimeout(function () {
          pmdInstallFinalPOSLayout(posRoot, attempt + 1);
        }, 50);
        return;
      }

      console.error('[PMD] V2.9.3 POS nodes still missing after retry', {
        app: !!app,
        workspace: !!workspace,
        catalog: !!catalog,
        categories: !!categories,
        cart: !!cart,
        attempts: attempt
      });
      return;
    }

    function clean(node) {
      return String(node && node.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    var titleNode = oldTopbar &&
      oldTopbar.querySelector('.pmd-pos-table-title strong');
    var areaNode = oldTopbar &&
      oldTopbar.querySelector('.pmd-pos-table-title span');
    var oldBack = oldTopbar &&
      oldTopbar.querySelector('.pmd-pos-back');

    var tableTitle = clean(titleNode) || posRoot.dataset.pmdTableTitle || 'TABLE';
    var areaTitle = clean(areaNode) || posRoot.dataset.pmdAreaTitle || 'WAITER POS';

    posRoot.querySelectorAll(
      '.pmd-pos-topbar,' +
      '.pmd-pos-tools,' +
      '.pmd-pos-search-wrap,' +
      '.pmd-pos-search,' +
      '.pmd-pos-search-icon,' +
      '.pmd-pos-view-toggle'
    ).forEach(function (node) {
      node.remove();
    });

    var existingRail = posRoot.querySelector('.pmd-pos-v292-left-rail');
    if (existingRail) {
      existingRail.remove();
    }

    var rail = document.createElement('aside');
    rail.className = 'pmd-pos-v292-left-rail';

    var railTitle = document.createElement('div');
    railTitle.className = 'pmd-pos-v292-title';

    var strong = document.createElement('strong');
    strong.textContent = tableTitle;

    var span = document.createElement('span');
    span.textContent = areaTitle;

    railTitle.appendChild(strong);
    railTitle.appendChild(span);

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'pmd-pos-v292-back';
    back.textContent = 'BACK TO TABLES';

    back.addEventListener('click', function () {
      if (oldBack) {
        oldBack.click();
        return;
      }

      var host = posRoot.closest('.pmd-v2-pos-host');
      var closeButton = host && host.querySelector('[data-v2-pos-close]');

      if (closeButton) {
        closeButton.click();
        return;
      }

      document.dispatchEvent(
        new CustomEvent('pmd:waiter-pos-close', { bubbles: true })
      );
    });

    rail.appendChild(railTitle);
    rail.appendChild(categories);
    rail.appendChild(back);

    posRoot.setAttribute('data-pmd-pos-root', '1');
    posRoot.dataset.pmdV292Installed = '1';
    app.classList.add('pmd-pos-v292-active');

    workspace.insertBefore(rail, workspace.firstChild);
    workspace.appendChild(catalog);
    workspace.appendChild(cart);

    console.info(
      '[PMD] Waiter POS V2.9.3 async-safe final layout active'
    );
  }


  'use strict';

  if (window.PMDWaiterStandardV2) return;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var launcher = root.querySelector('[data-v2-launcher]');
  var grid = root.querySelector('[data-v2-table-grid]');
  var loading = root.querySelector('[data-v2-loading]');
  var empty = root.querySelector('[data-v2-empty]');
  var areas = root.querySelector('[data-v2-areas]');
  var search = root.querySelector('[data-v2-search]');
  var clearSearch = root.querySelector('[data-v2-clear-search]');
  var sync = root.querySelector('[data-v2-sync]');
  var updated = root.querySelector('[data-v2-updated]');
  var alertDrawer = root.querySelector('[data-v2-alert-drawer]');
  var alertList = root.querySelector('[data-v2-alert-list]');
  var posLayer = root.querySelector('[data-v2-pos-layer]');
  var posHost = root.querySelector('[data-v2-pos-host]');
  var posLoading = root.querySelector('[data-v2-pos-loading]');
  var toastBox = root.querySelector('[data-v2-toast]');

  var dataUrl = root.getAttribute('data-data-url') || '/admin/pmd-waiter-dashboard-v9-tenant-data';
  var overlayTemplate = root.getAttribute('data-overlay-url') || '/admin/pmd-waiter-pos-v1/overlay/{table}';
  var standaloneTemplate = root.getAttribute('data-standalone-url') || '/admin/waiter-pos/{table}';

  var state = {
    payload: null,
    tables: [],
    orders: [],
    filter: (function () {
      var saved = localStorage.getItem('pmd-waiter-standard-v2-filter') || 'all';
      return saved === 'attention' ? 'call' : saved;
    })(),
    area: 'all',
    query: '',
    loading: false,
    request: null,
    poll: null,
    posAbort: null,
    posInstance: null,
    activeTableId: null,
    historyPushed: false,
    toastTimer: null,
    updatedAt: 0
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

  function formatMoney(value) {
    var symbol = clean(state.payload && state.payload.currency) || '€';
    return symbol + num(value, 0).toFixed(2);
  }

  function formatTime(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit'}).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function setText(selector, value) {
    var element = one(selector);
    if (element) element.textContent = String(value == null ? '' : value);
  }

  function toast(message, error) {
    if (!toastBox) return;
    toastBox.textContent = clean(message);
    toastBox.classList.toggle('is-error', !!error);
    toastBox.classList.add('is-show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toastBox.classList.remove('is-show');
    }, 3200);
  }

  function setSync(mode, label) {
    if (!sync) return;
    sync.classList.toggle('is-online', mode === 'online');
    sync.classList.toggle('is-error', mode === 'error');
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

  function orderDate(order) {
    var raw = order.updated_at || order.created_at || order.order_date || '';
    var timestamp = Date.parse(raw);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function orderRemaining(order) {
    var settlement = clean(order.settlement_status || '').toLowerCase();
    if (['paid', 'settled', 'closed'].indexOf(settlement) !== -1) return 0;
    return Math.max(0, num(order.total || order.order_total, 0) - num(order.settled_amount, 0));
  }


  function waiterCallTableKeys(payload) {
    var keys = {};
    var seen = [];

    function add(value) {
      var key = clean(value);
      if (key) keys[key] = true;
    }

    function visit(value, depth) {
      if (!value || depth > 5) return;

      if (Array.isArray(value)) {
        value.forEach(function (row) { visit(row, depth + 1); });
        return;
      }

      if (typeof value !== 'object') return;
      if (seen.indexOf(value) !== -1) return;
      seen.push(value);

      var type = clean(
        value.type
        || value.alert_type
        || value.attention_type
        || value.event
        || value.kind
        || value.action
        || value.title
        || value.message
        || value.status
        || ''
      ).toLowerCase();

      var isWaiterCall =
        /waiter[\s_-]*call|call[\s_-]*waiter|needs[\s_-]*waiter|service[\s_-]*call/.test(type)
        || yes(value.waiter_call)
        || yes(value.needs_waiter)
        || yes(value.call_waiter);

      if (isWaiterCall) {
        [
          value.table_id,
          value.location_table_id,
          value.table_number,
          value.table_no,
          value.table_ref,
          value.table,
          value.resource_id,
          value.subject_id
        ].forEach(add);

        if (value.data && typeof value.data === 'object') {
          [
            value.data.table_id,
            value.data.location_table_id,
            value.data.table_number,
            value.data.table_no,
            value.data.table_ref,
            value.data.table
          ].forEach(add);
        }
      }

      Object.keys(value).forEach(function (name) {
        if (/alerts?|notifications?|attention|calls?|events?|service/i.test(name)) {
          visit(value[name], depth + 1);
        }
      });
    }

    [
      payload.alerts,
      payload.service_alerts,
      payload.notifications,
      payload.attention,
      payload.waiter_calls,
      payload.calls,
      payload.events,
      payload.sections
    ].forEach(function (value) { visit(value, 0); });

    return keys;
  }

  function deriveTables(payload) {
    var rawTables = Array.isArray(payload.tables)
      ? payload.tables
      : ((((payload.sections || {}).floor_plan || {}).tables) || []);

    var orders = Array.isArray(payload.orders)
      ? payload.orders
      : (Array.isArray(payload.current_orders) ? payload.current_orders : []);

    var orderMap = {};
    var waiterCallKeys = waiterCallTableKeys(payload);

    orders.slice().sort(function (a, b) {
      return orderDate(b) - orderDate(a);
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
        || !!waiterCallKeys[id]
        || !!waiterCallKeys[number]
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

      var settlement = clean(latest && latest.settlement_status).toLowerCase();
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
        stateLabel = settlement === 'partial' ? 'PARTIAL' : 'PAYMENT';
      } else if (openOrders > 0) {
        stateKey = 'open';
        stateLabel = 'OPEN';
      } else if (/paid|settled/.test(rawStatus.toLowerCase())) {
        stateKey = 'paid';
        stateLabel = 'PAID';
      }

      var itemCount = linked.reduce(function (sum, order) {
        return sum + num(order.total_items || order.items_count, Array.isArray(order.items) ? order.items.length : 0);
      }, 0);

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
        stateLabel: stateLabel
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
      if (state.filter === 'call' && !table.waiterCall) return false;
      if (state.filter === 'note' && !table.note) return false;
      if (state.filter === 'attention' && !table.attention) return false;
      if (state.area !== 'all' && table.area !== state.area) return false;

      if (query) {
        var haystack = [
          table.number,
          table.name,
          table.area,
          table.stateLabel,
          table.rawStatus
        ].join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (a.attention !== b.attention) return a.attention ? -1 : 1;
      if (a.openOrders !== b.openOrders) return b.openOrders - a.openOrders;
      return a.number.localeCompare(b.number, undefined, {numeric:true, sensitivity:'base'});
    });
  }

  function tablePrimary(table) {
    if (table.waiterCall) return 'CALL WAITER';
    if (table.cleaning) return 'CLEAN TABLE';
    if (table.ready > 0) return table.ready + ' READY';
    if (table.due > 0) return formatMoney(table.due) + ' DUE';
    if (table.openOrders > 0) return table.openOrders + (table.openOrders === 1 ? ' OPEN CHECK' : ' OPEN CHECKS');
    if (table.capacity > 0) return table.capacity + ' SEATS';
    return 'START ORDER';
  }

  function tableSecondary(table) {
    var latest = table.latestOrder;
    if (table.note) return 'ORDER NOTE';
    if (table.itemCount > 0) return table.itemCount + (table.itemCount === 1 ? ' ITEM' : ' ITEMS');
    if (latest) {
      var status = clean(latest.status_label || latest.status);
      if (status) return status.toUpperCase();
    }
    return table.area.toUpperCase();
  }

  function tableMarkup(table) {
    var corner = '';
    if (table.waiterCall) corner = '<span class="pmd-v2-table-corner">!</span>';
    else if (table.cleaning) corner = '<span class="pmd-v2-table-corner">C</span>';
    else if (table.ready > 0) corner = '<span class="pmd-v2-table-corner">' + esc(table.ready) + '</span>';
    else if (table.note) corner = '<span class="pmd-v2-table-corner">N</span>';

    return '' +
      '<button type="button" class="pmd-v2-table-key is-' + esc(table.state) + '" data-pmd-has-note="' + (table.note ? '1' : '0') + '" data-pmd-waiter-call="' + (table.waiterCall ? '1' : '0') + '" data-v2-open-table="' + esc(table.id) + '">' +
        '<span class="pmd-v2-table-state">' + esc(table.stateLabel) + '</span>' +
        corner +
        '<strong>' + esc(table.number) + '</strong>' +
        '<span class="pmd-v2-table-name">' + esc(table.name) + '</span>' +
        '<span class="pmd-v2-table-info"><b>' + esc(tablePrimary(table)) + '</b><small>' + esc(tableSecondary(table)) + '</small></span>' +
      '</button>';
  }

  function renderAreas() {
    if (!areas) return;
    var names = Array.from(new Set(state.tables.map(function (table) { return table.area; }))).sort();
    var rows = ['all'].concat(names);
    areas.innerHTML = rows.map(function (name) {
      var label = name === 'all' ? 'ALL AREAS' : name.toUpperCase();
      return '<button type="button" class="' + (state.area === name ? 'is-active' : '') + '" data-v2-area="' + esc(name) + '">' + esc(label) + '</button>';
    }).join('');
  }

  function renderCounts() {
    var hasMine = mineAvailable();
    var mine = hasMine ? state.tables.filter(function (table) { return table.assigned; }).length : state.tables.length;
    var open = state.tables.filter(function (table) { return table.openOrders > 0; }).length;
    var calls = state.tables.filter(function (table) { return table.waiterCall; }).length;
    var notes = state.tables.filter(function (table) { return table.note; }).length;
    var attention = state.tables.filter(function (table) { return table.attention; }).length;

    setText('[data-v2-count-mine]', mine);
    setText('[data-v2-count-all]', state.tables.length);
    setText('[data-v2-count-open]', open);
    setText('[data-v2-count-call]', calls);
    setText('[data-v2-count-note]', notes);
    setText('[data-v2-count-attention]', attention);

    all('[data-v2-alert-count]').forEach(function (badge) {
      badge.textContent = attention;
      badge.hidden = attention < 1;
    });
  }

  function renderFilters() {
    all('[data-v2-filter]').forEach(function (button) {
      var active = button.getAttribute('data-v2-filter') === state.filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderAlerts() {
    if (!alertList) return;
    var rows = state.tables.filter(function (table) { return table.attention; });

    if (!rows.length) {
      alertList.innerHTML = '<div class="pmd-v2-alert-empty"><strong>ALL CLEAR</strong><span>No active waiter, cleaning, note or ready alert.</span></div>';
      return;
    }

    alertList.innerHTML = rows.map(function (table) {
      return '' +
        '<button type="button" data-v2-alert-table="' + esc(table.id) + '">' +
          '<b>' + esc(table.number) + '</b>' +
          '<span><strong>' + esc(table.stateLabel) + '</strong><small>' + esc(tablePrimary(table)) + ' · ' + esc(tableSecondary(table)) + '</small></span>' +
          '<i>›</i>' +
        '</button>';
    }).join('');
  }

  function renderTables() {
    var rows = filteredTables();
    loading.hidden = true;
    grid.innerHTML = rows.map(tableMarkup).join('');
    empty.hidden = rows.length > 0;
    renderCounts();
    renderFilters();
    renderAreas();
    renderAlerts();
  }

  function updateUser(payload) {
    var user = payload.user || {};
    var name = clean(user.name || user.username || user.email || 'Waiter');
    setText('[data-v2-user]', name.toUpperCase() + ' · LIVE SERVICE');
  }

  async function refresh(silent) {
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

      if (state.filter === 'mine' && !mineAvailable()) state.filter = 'all';

      updateUser(payload);

      /*
       * V2.4 lifecycle owns the visible launcher cards. The original silent
       * 15-second polling used grid.innerHTML and destroyed every card,
       * producing repeated legacy/fallback flashes. Keep the initial render
       * and explicit user-driven renders, but never replace a populated
       * lifecycle grid during background polling.
       */
      var lifecycleOwnsGrid = !!(
        window.PMDWaiterV241SafeLifecycle
        && grid
        && grid.querySelector('[data-v2-open-table]')
      );

      if (!silent || !lifecycleOwnsGrid) {
        renderTables();
      } else {
        renderCounts();
        renderFilters();
        renderAreas();
        renderAlerts();

        window.dispatchEvent(new CustomEvent('pmd:waiter-launcher-data-refreshed', {
          detail: {
            source: 'core-silent-poll',
            updatedAt: state.updatedAt
          }
        }));
      }

      setSync('online', 'LIVE');
      if (updated) updated.textContent = 'UPDATED ' + formatTime(state.updatedAt);
      if (!silent) toast('LIVE TABLES UPDATED');
    } catch (error) {
      if (error.name === 'AbortError') return;
      setSync('error', 'OFFLINE');
      loading.hidden = true;
      if (!state.payload) {
        empty.hidden = false;
        var title = empty.querySelector('strong');
        var subtitle = empty.querySelector('span');
        if (title) title.textContent = 'DATA ERROR';
        if (subtitle) subtitle.textContent = error.message || 'Could not load live tables.';
      }
      if (!silent) toast(error.message || 'COULD NOT REFRESH', true);
    } finally {
      state.loading = false;
      state.request = null;
    }
  }

  function setFilter(filter) {
    if (['mine', 'all', 'open', 'call', 'note', 'attention'].indexOf(filter) === -1) return;
    if (filter === 'mine' && !mineAvailable()) filter = 'all';
    state.filter = filter;
    localStorage.setItem('pmd-waiter-standard-v2-filter', filter);
    renderTables();
  }

  function openAlerts() {
    renderAlerts();
    alertDrawer.classList.add('is-open');
    alertDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeAlerts() {
    alertDrawer.classList.remove('is-open');
    alertDrawer.setAttribute('aria-hidden', 'true');
    if (posLayer.hidden) document.body.style.overflow = '';
  }

  function overlayUrl(tableId) {
    return overlayTemplate.replace('{table}', encodeURIComponent(String(tableId)));
  }

  function standaloneUrl(tableId) {
    return standaloneTemplate.replace('{table}', encodeURIComponent(String(tableId)));
  }

  function findTable(tableId) {
    return state.tables.find(function (table) {
      return String(table.id) === String(tableId);
    }) || null;
  }

  function showPosLayer(tableId) {
    state.activeTableId = String(tableId);
    posLayer.hidden = false;
    posLayer.setAttribute('aria-hidden', 'false');
    posLoading.classList.remove('is-hidden');
    launcher.hidden = true;
    document.body.classList.add('pmd-waiter-v2-pos-open');
    document.body.style.overflow = 'hidden';
  }

  function hidePosLayer() {
    posLayer.hidden = true;
    posLayer.setAttribute('aria-hidden', 'true');
    posLoading.classList.remove('is-hidden');
    launcher.hidden = false;
    document.body.classList.remove('pmd-waiter-v2-pos-open');
    document.body.style.overflow = '';
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

    if (!fromHistory && state.historyPushed && history.state && history.state.pmdWaiterStandardV2) {
      state.historyPushed = false;
      history.back();
    } else {
      state.historyPushed = false;
    }

    refresh(true);
  }

  function requestClosePos() {
    if (state.historyPushed && history.state && history.state.pmdWaiterStandardV2) {
      history.back();
    } else {
      closePos(true);
    }
  }

  async function openPos(tableId) {
    var table = findTable(tableId);
    if (!table) {
      toast('TABLE IS NO LONGER AVAILABLE', true);
      return;
    }

    closeAlerts();
    destroyPos();
    showPosLayer(tableId);

    if (!window.PMDWaiterPOSApp || typeof window.PMDWaiterPOSApp.mount !== 'function') {
      hidePosLayer();
      toast('POS ENGINE IS NOT AVAILABLE', true);
      return;
    }

    state.posAbort = typeof AbortController === 'function' ? new AbortController() : null;

    history.pushState(
      {pmdWaiterStandardV2:true, tableId:String(tableId)},
      '',
      location.pathname + '?table=' + encodeURIComponent(String(tableId))
    );
    state.historyPushed = true;

    try {
      var payload = await fetchJson(overlayUrl(tableId) + '?_=' + Date.now(), {
        signal: state.posAbort ? state.posAbort.signal : undefined
      });

      state.posAbort = null;

      if (!payload.html || !payload.bootstrap) {
        throw new Error('Table order data is incomplete.');
      }

      payload.bootstrap.settings = payload.bootstrap.settings || {};
      payload.bootstrap.settings.dashboard_url = location.pathname;

      var holder = document.createElement('div');
      holder.innerHTML = payload.html;
      var posRoot = holder.querySelector('[data-pmd-pos-root]');

      if (!posRoot) {
        throw new Error('The order workspace could not be created.');
      }

      posHost.replaceChildren(posRoot);

      state.posInstance = window.PMDWaiterPOSApp.mount(posRoot, payload.bootstrap, {
        embedded: true,
        onClose: requestClosePos
      });

      requestAnimationFrame(function () {
        var initialTopbar = posRoot.querySelector('.pmd-pos-topbar');
        var initialTable = initialTopbar &&
          initialTopbar.querySelector('.pmd-pos-table-title strong');
        var initialArea = initialTopbar &&
          initialTopbar.querySelector('.pmd-pos-table-title span');

        if (initialTable) {
          posRoot.dataset.pmdTableTitle =
            String(initialTable.textContent || '').trim();
        }

        if (initialArea) {
          posRoot.dataset.pmdAreaTitle =
            String(initialArea.textContent || '').trim();
        }

        pmdInstallFinalPOSLayout(posRoot, 0);
      });


      /*
       * V2.8.8: This is the real active POS mount path.
       * Apply the dashboard-style rebuild directly to the mounted root.
       */
/*
       * V2.8.9: remove old POS chrome from the real mounted page.
       * This intentionally removes:
       * - complete top header
       * - back/waiter/table title/theme/clear-cart controls
       * - search row and view-mode buttons
       */
      [
        '.pmd-pos-topbar',
        '.pmd-pos-tools',
        '.pmd-pos-search-wrap',
        '.pmd-pos-view-toggle'
      ].forEach(function (selector) {
        posRoot.querySelectorAll(selector).forEach(function (node) {
          node.remove();
        });
      });

      var posApp = posRoot.querySelector('.pmd-pos-app');
      var workspace = posRoot.querySelector('.pmd-pos-workspace');
      var catalog = posRoot.querySelector('.pmd-pos-catalog');
      var menuScroll = posRoot.querySelector('.pmd-pos-menu-scroll');

      if (posApp) {
        posApp.classList.add('pmd-pos-v289-clean');
      }

      if (workspace) {
        workspace.style.height = '100dvh';
        workspace.style.minHeight = '100dvh';
      }

      if (catalog) {
        catalog.style.height = '100dvh';
        catalog.style.gridTemplateRows = 'minmax(0, 1fr)';
      }

      if (menuScroll) {
        menuScroll.style.minHeight = '0';
      }

      console.info(
        '[PMD] Waiter POS V2.8.9 old header and search removed'
      );

      /*
       * V2.9.1: apply the final three-column layout on the exact
       * live POS root used by this page.
       */
posLoading.classList.add('is-hidden');
      window.dispatchEvent(new CustomEvent('pmd:waiter-standard-v2-opened', {
        detail: {tableId:String(tableId), table:table, pos:state.posInstance}
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      toast(error.message || 'COULD NOT OPEN TABLE', true);
      closePos(false);
    }
  }

  function bind() {
    root.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;

      var filter = target.closest('[data-v2-filter]');
      if (filter) {
        setFilter(filter.getAttribute('data-v2-filter'));
        return;
      }

      var area = target.closest('[data-v2-area]');
      if (area) {
        state.area = area.getAttribute('data-v2-area') || 'all';
        renderTables();
        return;
      }

      var table = target.closest('[data-v2-open-table]');
      if (table) {
        openPos(table.getAttribute('data-v2-open-table'));
        return;
      }

      var alertTable = target.closest('[data-v2-alert-table]');
      if (alertTable) {
        openPos(alertTable.getAttribute('data-v2-alert-table'));
        return;
      }

      if (target.closest('[data-v2-refresh]')) {
        refresh(false);
        return;
      }

      if (target.closest('[data-v2-alerts]')) {
        openAlerts();
        return;
      }

      if (target.closest('[data-v2-close-alerts]')) {
        closeAlerts();
        return;
      }

      if (target.closest('[data-v2-clear-search]')) {
        state.query = '';
        search.value = '';
        clearSearch.hidden = true;
        renderTables();
        search.focus();
        return;
      }

      if (target.closest('[data-v2-reset]')) {
        state.filter = 'all';
        state.area = 'all';
        state.query = '';
        search.value = '';
        clearSearch.hidden = true;
        renderTables();
        return;
      }

      if (target.closest('[data-v2-cancel-pos]')) {
        requestClosePos();
      }
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
      if (alertDrawer.classList.contains('is-open')) closeAlerts();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && posLayer.hidden) refresh(true);
    });

    window.addEventListener('online', function () {
      if (posLayer.hidden) refresh(true);
    });

    window.addEventListener('offline', function () {
      setSync('error', 'OFFLINE');
    });
  }

  function start() {
    bind();
    renderFilters();
    refresh(true);
    state.poll = setInterval(function () {
      if (!document.hidden && posLayer.hidden) refresh(true);
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

    console.info('[PMD] Waiter Standard POS V2 active');
  }

  window.PMDWaiterStandardV2 = {
    refresh: function () { return refresh(false); },
    openTable: openPos,
    closeTable: requestClosePos,
    debug: function () {
      return {
        version: 'pmd-waiter-standard-v2',
        tenant: state.payload && state.payload.tenant_db,
        tables: state.tables.length,
        orders: state.orders.length,
        filter: state.filter,
        area: state.area,
        visibleTables: filteredTables().length,
        attentionTables: state.tables.filter(function (table) { return table.attention; }).length,
        posOpen: !posLayer.hidden,
        activeTableId: state.activeTableId,
        posMounted: !!state.posInstance,
        legacyPolishLoaded: !!(
          window.PMDWaiterPOSSimpleV27
          || window.PMDWaiterPOSProductDetailsV3
        )
      };
    },
    destroy: function () {
      clearInterval(state.poll);
      if (state.request) state.request.abort();
      destroyPos();
    }
  };

  start();
})();
