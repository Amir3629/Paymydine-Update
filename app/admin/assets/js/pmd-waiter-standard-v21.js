(function () {
  'use strict';

  if (window.PMDWaiterStandardV21) return;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var grid = root.querySelector('[data-v2-table-grid]');
  var dataUrl = root.getAttribute('data-data-url') || '/admin/pmd-waiter-dashboard-v9-tenant-data';
  var refreshTimer = null;
  var gridObserver = null;
  var launcherRequest = null;
  var lastPayload = null;
  var posObserver = null;
  var activePos = null;
  var activePosRoot = null;
  var applyingLauncher = false;
  var applyingPos = false;
  var recentKey = 'pmd-waiter-v21-recent:' + location.host;

  var state = {
    version: 'pmd-waiter-standard-v2.1',
    launcherEnhancements: 0,
    posEnhancements: 0,
    hiddenInvalidProducts: 0,
    guestDefaultFixes: 0,
    serviceStatusTables: 0,
    paymentMetaTables: 0,
    sentItemStatuses: 0,
    moreMenuInstalled: false,
    paySplitPromoted: false,
    online: navigator.onLine,
    lastError: '',
    lastRefreshAt: 0
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function yes(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function money(value, payload) {
    var symbol = clean(payload && payload.currency) || '€';
    return symbol + num(value, 0).toFixed(2);
  }

  function formatAge(timestamp, prefix) {
    if (!timestamp) return '';
    var minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return (prefix || 'Opened') + ' now';
    if (minutes < 60) return (prefix || 'Opened') + ' ' + minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return (prefix || 'Opened') + ' ' + hours + 'h' + (rest ? ' ' + rest + 'm' : '');
  }

  function parseDate(value) {
    var timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function tableNumber(table) {
    return clean(table.number || table.table_number || table.table_no || table.id || table.table_id);
  }

  function tableId(table) {
    return clean(table.id || table.table_id || table.location_table_id || tableNumber(table));
  }

  function orderKeys(order) {
    return [order.table_id, order.location_table_id, order.table_number, order.table_no, order.table_ref, order.table]
      .map(clean).filter(Boolean);
  }

  function orderRemaining(order) {
    var settlement = clean(order.settlement_status || '').toLowerCase();
    if (['paid','settled','closed'].indexOf(settlement) !== -1) return 0;
    return Math.max(0, num(order.total || order.order_total, 0) - num(order.settled_amount, 0));
  }

  function orderStatus(order) {
    return clean(order.status_name || order.status_label || order.kitchen_status || order.status || '').toLowerCase();
  }

  function itemStatus(item, order) {
    var status = clean(item && (item.kitchen_status || item.status_name || item.status_label || item.status) || '').toLowerCase();
    if (!status) status = orderStatus(order);
    if (/ready|complete|completed/.test(status)) return {key:'ready', label:'READY'};
    if (/serve|served|delivered/.test(status)) return {key:'served', label:'SERVED'};
    if (/cancel|void|reject/.test(status)) return {key:'cancelled', label:'CANCELLED'};
    if (/kitchen|cook|prepar|process|accept|received|sent/.test(status)) return {key:'kitchen', label:'IN KITCHEN'};
    return {key:'sent', label:'SENT'};
  }

  function rawTables(payload) {
    return Array.isArray(payload.tables)
      ? payload.tables
      : ((((payload.sections || {}).floor_plan || {}).tables) || []);
  }

  function rawOrders(payload) {
    return Array.isArray(payload.orders)
      ? payload.orders
      : (Array.isArray(payload.current_orders) ? payload.current_orders : []);
  }

  function buildTableMeta(payload) {
    var orders = rawOrders(payload).slice().sort(function (a, b) {
      return parseDate(b.updated_at || b.created_at || b.order_date) - parseDate(a.updated_at || a.created_at || a.order_date);
    });
    var orderMap = {};

    orders.forEach(function (order) {
      orderKeys(order).forEach(function (key) {
        if (!orderMap[key]) orderMap[key] = [];
        if (orderMap[key].indexOf(order) === -1) orderMap[key].push(order);
      });
    });

    return rawTables(payload).map(function (raw) {
      var id = tableId(raw);
      var number = tableNumber(raw);
      var linked = orderMap[id] || orderMap[number] || [];
      var latest = linked[0] || null;
      var rawStatus = clean(raw.status || raw.latest_order_status || (latest && (latest.status_name || latest.status_label || latest.status)) || '').toLowerCase();
      var openOrders = Math.max(num(raw.open_orders, 0), linked.length);
      var due = num(raw.due || raw.payment_due || raw.pending_value, 0);
      if (!due) due = linked.reduce(function (sum, order) { return sum + orderRemaining(order); }, 0);
      var note = linked.some(function (order) {
        return clean(order.comment || order.note || '') !== '' ||
          (Array.isArray(order.item_notes) && order.item_notes.length > 0) ||
          (Array.isArray(order.items) && order.items.some(function (item) { return clean(item.comment || item.note || '') !== ''; }));
      });
      var ready = num(raw.ready || raw.ready_orders || raw.ready_count, 0);
      var waiterCall = yes(raw.waiter_call) || yes(raw.needs_waiter) || yes(raw.call_waiter) || /waiter.?call/.test(clean(raw.attention_type || raw.status).toLowerCase());
      var cleaning = yes(raw.cleaning_required) || yes(raw.needs_cleaning) || /clean/.test(clean(raw.attention_type || '').toLowerCase());
      var serviceKey = 'free';
      var serviceLabel = 'FREE';
      var priority = 50;
      var agePrefix = 'Opened';

      if (ready > 0 || /ready/.test(rawStatus)) {
        serviceKey = 'ready'; serviceLabel = ready > 1 ? ready + ' READY' : 'READY'; priority = 1; agePrefix = 'Ready';
      } else if (waiterCall) {
        serviceKey = 'attention'; serviceLabel = 'WAITER CALL'; priority = 2; agePrefix = 'Waiting';
      } else if (cleaning) {
        serviceKey = 'attention'; serviceLabel = 'CLEANING'; priority = 3; agePrefix = 'Waiting';
      } else if (/served|delivered/.test(rawStatus)) {
        serviceKey = 'served'; serviceLabel = 'SERVED'; priority = 5;
      } else if (/kitchen|cook|prepar|process|accept|received|sent/.test(rawStatus)) {
        serviceKey = 'kitchen'; serviceLabel = 'IN KITCHEN'; priority = 6;
      } else if (openOrders > 0) {
        serviceKey = 'open'; serviceLabel = 'OPEN'; priority = 7;
      }

      if (note && priority > 4) priority = 4;

      var itemCount = linked.reduce(function (sum, order) {
        return sum + num(order.total_items || order.items_count, Array.isArray(order.items) ? order.items.length : 0);
      }, 0);

      var openedAt = latest ? parseDate(latest.created_at || latest.order_date || latest.updated_at) : 0;
      var changedAt = latest ? parseDate(latest.status_updated_at || latest.updated_at || latest.created_at) : 0;
      var ageAt = (serviceKey === 'ready' || serviceKey === 'attention') ? (changedAt || openedAt) : openedAt;
      var corner = '';
      if (serviceKey === 'ready') corner = ready > 1 ? String(ready) : 'R';
      else if (waiterCall) corner = '!';
      else if (cleaning) corner = 'C';
      else if (note) corner = 'NOTE';
      else if (due > 0) corner = '€';

      return {
        id: id || number,
        number: number,
        serviceKey: serviceKey,
        serviceLabel: serviceLabel,
        priority: priority,
        openOrders: openOrders,
        due: due,
        itemCount: itemCount,
        note: note,
        ready: ready,
        waiterCall: waiterCall,
        cleaning: cleaning,
        ageText: formatAge(ageAt, agePrefix),
        corner: corner,
        latest: latest,
        linked: linked,
        capacity: num(raw.capacity || raw.table_capacity, 0)
      };
    }).filter(function (row) { return row.id && row.number; });
  }

  function ensureMetaElement(card, className, tagName) {
    var el = card.querySelector('.' + className);
    if (!el) {
      el = document.createElement(tagName || 'span');
      el.className = className;
      card.appendChild(el);
    }
    return el;
  }

  function enhanceLauncher(payload) {
    if (!grid || applyingLauncher || !payload) return;
    applyingLauncher = true;
    if (gridObserver) gridObserver.disconnect();

    try {
      var rows = buildTableMeta(payload);
      var currentCards = Array.prototype.slice.call(grid.querySelectorAll('[data-v2-open-table]'));
      var map = {};
      rows.forEach(function (row) { map[String(row.id)] = row; map[String(row.number)] = row; });

      currentCards.forEach(function (card) {
        var id = card.getAttribute('data-v2-open-table');
        var row = map[String(id)];
        if (!row) return;

        card.className = card.className.replace(/\bis-(free|open|payment|ready|attention|paid|kitchen|served)\b/g, '').replace(/\s+/g, ' ').trim();
        card.classList.add('is-' + row.serviceKey, 'pmd-v21-table-key');
        card.setAttribute('data-v21-priority', String(row.priority));
        card.setAttribute('data-v21-number', String(row.number));

        var status = card.querySelector('.pmd-v2-table-state');
        if (status) status.textContent = row.serviceLabel;

        var primary = card.querySelector('.pmd-v2-table-info b');
        var secondary = card.querySelector('.pmd-v2-table-info small');
        if (primary) {
          if (row.serviceKey === 'free') primary.textContent = row.capacity > 0 ? row.capacity + ' SEATS' : 'START ORDER';
          else if (row.itemCount > 0) primary.textContent = row.itemCount + (row.itemCount === 1 ? ' ITEM' : ' ITEMS');
          else primary.textContent = row.openOrders + (row.openOrders === 1 ? ' OPEN CHECK' : ' OPEN CHECKS');
        }
        if (secondary) secondary.textContent = row.ageText || (row.serviceKey === 'free' ? 'AVAILABLE NOW' : 'ACTIVE SERVICE');

        var oldCorner = card.querySelector('.pmd-v2-table-corner');
        if (oldCorner) oldCorner.remove();
        if (row.corner) {
          var corner = document.createElement('span');
          corner.className = 'pmd-v2-table-corner pmd-v21-corner is-' + row.serviceKey;
          corner.textContent = row.corner;
          corner.title = row.corner === 'NOTE' ? 'Order note' : row.serviceLabel;
          card.appendChild(corner);
        }

        var payment = ensureMetaElement(card, 'pmd-v21-payment-meta');
        if (row.due > 0) {
          payment.hidden = false;
          payment.textContent = money(row.due, payload) + ' DUE';
        } else {
          payment.hidden = true;
          payment.textContent = '';
        }

        var age = ensureMetaElement(card, 'pmd-v21-age-meta');
        age.textContent = row.ageText || '';
        age.hidden = !row.ageText;
      });

      currentCards.sort(function (a, b) {
        var pa = num(a.getAttribute('data-v21-priority'), 99);
        var pb = num(b.getAttribute('data-v21-priority'), 99);
        if (pa !== pb) return pa - pb;
        return clean(a.getAttribute('data-v21-number')).localeCompare(clean(b.getAttribute('data-v21-number')), undefined, {numeric:true});
      }).forEach(function (card) { grid.appendChild(card); });

      var openCount = rows.filter(function (row) { return row.openOrders > 0; }).length;
      var attentionCount = rows.filter(function (row) { return row.priority <= 4; }).length;
      var openEl = root.querySelector('[data-v2-count-open]');
      var attentionEl = root.querySelector('[data-v2-count-attention]');
      if (openEl) openEl.textContent = openCount;
      if (attentionEl) attentionEl.textContent = attentionCount;

      state.serviceStatusTables = rows.filter(function (row) { return row.serviceKey !== 'free'; }).length;
      state.paymentMetaTables = rows.filter(function (row) { return row.due > 0; }).length;
      state.launcherEnhancements += 1;
      state.lastRefreshAt = Date.now();
    } finally {
      applyingLauncher = false;
      observeGrid();
    }
  }

  async function refreshLauncher() {
    if (launcherRequest) launcherRequest.abort();
    launcherRequest = typeof AbortController === 'function' ? new AbortController() : null;
    try {
      var separator = dataUrl.indexOf('?') === -1 ? '?' : '&';
      var response = await fetch(dataUrl + separator + 'v21=' + Date.now(), {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: launcherRequest ? launcherRequest.signal : undefined,
        headers: {'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
      });
      var payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.message || ('HTTP ' + response.status));
      lastPayload = payload;
      enhanceLauncher(payload);
      state.lastError = '';
    } catch (error) {
      if (error.name !== 'AbortError') state.lastError = error.message || 'Launcher refresh failed';
    } finally {
      launcherRequest = null;
    }
  }

  function observeGrid() {
    if (!grid || !window.MutationObserver) return;
    if (!gridObserver) {
      gridObserver = new MutationObserver(function (records) {
        if (applyingLauncher || !lastPayload) return;
        var changed = records.some(function (record) { return record.type === 'childList'; });
        if (changed) requestAnimationFrame(function () { enhanceLauncher(lastPayload); });
      });
    }
    gridObserver.observe(grid, {childList:true});
  }

  function validMenuItem(item) {
    if (!item || item.id == null) return false;
    var name = clean(item.name);
    var slug = name.toLowerCase();
    if (!name || num(item.price, 0) <= 0) return false;
    if (['kj','test','demo','item','product','untitled','new item'].indexOf(slug) !== -1) return false;
    if (yes(item.disabled) || yes(item.is_disabled) || item.available === false || item.is_available === false) return false;
    return true;
  }

  function hashColor(value) {
    var palette = ['#1769aa','#16894a','#8a5a16','#76508c','#a04636','#25737b','#6a6f2a','#505f83'];
    var text = String(value == null ? 'all' : value);
    var hash = 0;
    for (var i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
    return palette[Math.abs(hash) % palette.length];
  }

  function getRecent() {
    try {
      var rows = JSON.parse(localStorage.getItem(recentKey) || '[]');
      return Array.isArray(rows) ? rows.map(String).slice(0, 20) : [];
    } catch (error) { return []; }
  }

  function rememberRecent(id) {
    var value = String(id);
    var rows = getRecent().filter(function (row) { return row !== value; });
    rows.unshift(value);
    try { localStorage.setItem(recentKey, JSON.stringify(rows.slice(0, 20))); } catch (error) {}
  }

  function activeOrder(pos) {
    if (!pos || !pos.state) return null;
    var statePos = pos.state;
    if (!statePos.activeOrderId) return statePos.openOrders[0] || null;
    return statePos.openOrders.find(function (order) { return String(order.order_id) === String(statePos.activeOrderId); }) || statePos.openOrders[0] || null;
  }

  function syncGuests(pos, posRoot) {
    var posState = pos.state;
    var order = activeOrder(pos);
    var desired = 1;
    if (order) desired = Math.max(1, num(order.guest_count || order.guests || order.covers, 1));
    else if (Array.isArray(posState.cart) && posState.cart.length > 0) desired = Math.max(1, num(posState.guestCount, 1));

    if (num(posState.guestCount, 1) !== desired) {
      posState.guestCount = desired;
      state.guestDefaultFixes += 1;
    }

    var guestEl = posRoot.querySelector('[data-pos-guests]');
    if (guestEl) guestEl.textContent = desired;
    var row = posRoot.querySelector('.pmd-pos-guest-row');
    if (row && !row.querySelector('.pmd-v21-capacity')) {
      var capacity = num(posState.table && posState.table.capacity, 0);
      if (capacity > 0) {
        var capacityEl = document.createElement('small');
        capacityEl.className = 'pmd-v21-capacity';
        capacityEl.textContent = 'CAPACITY ' + capacity;
        row.appendChild(capacityEl);
      }
    }
  }

  function filterProducts(pos, posRoot) {
    var posState = pos.state;
    var before = posState.menu.length;
    posState.menu = posState.menu.filter(validMenuItem);
    state.hiddenInvalidProducts += Math.max(0, before - posState.menu.length);

    var menuById = {};
    posState.menu.forEach(function (item) { menuById[String(item.id)] = item; });
    Array.prototype.slice.call(posRoot.querySelectorAll('[data-pos-product]')).forEach(function (button) {
      var id = String(button.getAttribute('data-pos-product'));
      var item = menuById[id];
      if (!item) {
        button.remove();
        return;
      }
      var category = Array.isArray(item.category_ids) && item.category_ids.length ? item.category_ids[0] : 'all';
      button.style.setProperty('--pmd-v21-product-accent', hashColor(category));
      button.classList.add('pmd-v21-product-key');
      button.setAttribute('aria-label', clean(item.name) + ' ' + money(item.price, {currency:posState.settings.currency || '€'}));
      var plus = button.querySelector('.pmd-pos-plus');
      if (plus) plus.textContent = item.has_options ? 'OPTIONS' : 'ADD';
    });
  }

  function installVirtualCategories(pos, posRoot) {
    var categories = posRoot.querySelector('[data-pos-categories]');
    var menu = posRoot.querySelector('[data-pos-menu]');
    if (!categories || !menu) return;

    if (!categories.querySelector('[data-v21-virtual="popular"]')) {
      var allButton = categories.querySelector('[data-pos-category="all"]');
      ['recent','popular'].reverse().forEach(function (mode) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'pmd-pos-category pmd-v21-virtual-category';
        button.setAttribute('data-v21-virtual', mode);
        button.textContent = mode === 'popular' ? 'POPULAR' : 'RECENT';
        categories.insertBefore(button, allButton || categories.firstChild);
      });
    }

    function applyVirtual(mode) {
      Array.prototype.slice.call(categories.querySelectorAll('.pmd-pos-category')).forEach(function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-v21-virtual') === mode);
      });
      var recent = getRecent();
      var allowed = {};
      pos.state.menu.forEach(function (item, index) {
        var popular = yes(item.is_bestseller) || yes(item.bestseller) || yes(item.is_featured) || yes(item.chef_recommended) || yes(item.is_popular) || index < 12;
        if (mode === 'popular' && popular) allowed[String(item.id)] = true;
        if (mode === 'recent' && recent.indexOf(String(item.id)) !== -1) allowed[String(item.id)] = true;
      });
      Array.prototype.slice.call(menu.querySelectorAll('[data-pos-product]')).forEach(function (button) {
        button.hidden = !allowed[String(button.getAttribute('data-pos-product'))];
      });
    }

    Array.prototype.slice.call(categories.querySelectorAll('[data-v21-virtual]')).forEach(function (button) {
      if (button.getAttribute('data-v21-bound') === '1') return;
      button.setAttribute('data-v21-bound', '1');
      button.addEventListener('click', function () { applyVirtual(button.getAttribute('data-v21-virtual')); });
    });

    if (menu.getAttribute('data-v21-recent-bound') !== '1') {
      menu.setAttribute('data-v21-recent-bound', '1');
      menu.addEventListener('click', function (event) {
        var button = event.target.closest('[data-pos-product]');
        if (button) rememberRecent(button.getAttribute('data-pos-product'));
      }, true);
    }
  }

  function decorateSentItems(pos, posRoot) {
    var order = activeOrder(pos);
    var items = order && Array.isArray(order.items) ? order.items : [];
    var nodes = Array.prototype.slice.call(posRoot.querySelectorAll('.pmd-pos-sent-item'));
    nodes.forEach(function (node, index) {
      var item = items[index] || {};
      var status = itemStatus(item, order || {});
      var badge = node.querySelector('.pmd-v21-item-status');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'pmd-v21-item-status';
        node.appendChild(badge);
      }
      badge.className = 'pmd-v21-item-status is-' + status.key;
      badge.textContent = status.label;
    });
    state.sentItemStatuses = nodes.length;
  }

  function remainingForOrder(pos) {
    var order = activeOrder(pos);
    return order ? orderRemaining(order) : 0;
  }

  function installMoreAndPayment(pos, posRoot) {
    var checkout = posRoot.querySelector('.pmd-pos-checkout');
    var actions = posRoot.querySelector('.pmd-pos-actions');
    var secondary = posRoot.querySelector('.pmd-pos-secondary-actions');
    var payment = posRoot.querySelector('[data-pos-payment]');
    var edit = posRoot.querySelector('[data-pos-edit-order]');
    var print = posRoot.querySelector('[data-pos-print]');
    var viewToggle = posRoot.querySelector('.pmd-pos-view-toggle');
    if (!checkout || !actions || !secondary || !payment) return;

    payment.classList.add('pmd-v21-pay-primary');
    if (payment.parentElement !== actions) actions.appendChild(payment);
    var remaining = remainingForOrder(pos);
    payment.textContent = 'PAY / SPLIT' + (remaining > 0 ? ' · ' + money(remaining, {currency:pos.state.settings.currency || '€'}) : '');
    state.paySplitPromoted = true;

    var moreWrap = checkout.querySelector('.pmd-v21-more-wrap');
    if (!moreWrap) {
      moreWrap = document.createElement('div');
      moreWrap.className = 'pmd-v21-more-wrap';
      moreWrap.innerHTML = '<button type="button" class="pmd-v21-more-button" aria-expanded="false">MORE</button><div class="pmd-v21-more-menu" hidden></div>';
      secondary.parentNode.insertBefore(moreWrap, secondary.nextSibling);
      var trigger = moreWrap.querySelector('.pmd-v21-more-button');
      var menu = moreWrap.querySelector('.pmd-v21-more-menu');
      trigger.addEventListener('click', function () {
        var open = menu.hidden;
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (event) {
        if (!moreWrap.contains(event.target)) {
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var moreMenu = moreWrap.querySelector('.pmd-v21-more-menu');
    [edit, print].forEach(function (button) {
      if (button && button.parentElement !== moreMenu) moreMenu.appendChild(button);
    });
    if (viewToggle && viewToggle.parentElement !== moreMenu) moreMenu.appendChild(viewToggle);
    secondary.hidden = true;
    state.moreMenuInstalled = true;
  }

  function installConnectivity(posRoot) {
    var waiter = posRoot.querySelector('.pmd-pos-waiter');
    if (!waiter) return;
    waiter.classList.add('pmd-v21-connectivity');
    waiter.setAttribute('data-v21-online', navigator.onLine ? '1' : '0');
    if (!navigator.onLine && waiter.textContent.indexOf('OFFLINE') === -1) waiter.textContent = clean(waiter.textContent) + ' · OFFLINE DRAFT';
  }

  function enhancePos(pos, posRoot) {
    if (!pos || !pos.state || !posRoot || applyingPos) return;
    applyingPos = true;
    if (posObserver) posObserver.disconnect();

    try {
      activePos = pos;
      activePosRoot = posRoot;
      syncGuests(pos, posRoot);
      filterProducts(pos, posRoot);
      installVirtualCategories(pos, posRoot);
      decorateSentItems(pos, posRoot);
      installMoreAndPayment(pos, posRoot);
      installConnectivity(posRoot);
      posRoot.classList.add('pmd-waiter-standard-v21-active');
      state.posEnhancements += 1;
    } finally {
      applyingPos = false;
      observePos();
    }
  }

  function observePos() {
    if (!activePosRoot || !window.MutationObserver) return;
    if (!posObserver) {
      posObserver = new MutationObserver(function (records) {
        if (applyingPos || !activePos || !activePosRoot) return;
        var relevant = records.some(function (record) {
          return record.type === 'childList' && (
            record.target.closest('[data-pos-menu]') ||
            record.target.closest('[data-pos-categories]') ||
            record.target.closest('[data-pos-sent-list]') ||
            record.target.closest('[data-pos-cart-list]') ||
            record.target.closest('.pmd-pos-checkout') ||
            record.target.matches('[data-pos-menu],[data-pos-categories],[data-pos-sent-list],[data-pos-cart-list]')
          );
        });
        if (relevant) requestAnimationFrame(function () { enhancePos(activePos, activePosRoot); });
      });
    }
    posObserver.observe(activePosRoot, {childList:true, subtree:true});
  }

  function updateOnlineState() {
    state.online = navigator.onLine;
    if (activePosRoot) installConnectivity(activePosRoot);
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    var pos = detail.pos || window.PMDWaiterPOS;
    var posRoot = document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]');
    requestAnimationFrame(function () { enhancePos(pos, posRoot); });
  });

  window.addEventListener('pmd:waiter-pos-order-updated', function () {
    if (activePos && activePosRoot) setTimeout(function () { enhancePos(activePos, activePosRoot); }, 80);
    setTimeout(refreshLauncher, 250);
  });

  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);

  observeGrid();
  refreshLauncher();
  refreshTimer = setInterval(refreshLauncher, 15000);

  window.PMDWaiterStandardV21 = {
    active: true,
    refresh: refreshLauncher,
    enhancePos: function () { if (activePos && activePosRoot) enhancePos(activePos, activePosRoot); },
    destroy: function () {
      clearInterval(refreshTimer);
      if (gridObserver) gridObserver.disconnect();
      if (posObserver) posObserver.disconnect();
      if (launcherRequest) launcherRequest.abort();
    },
    debug: function () {
      return {
        version: state.version,
        active: true,
        online: state.online,
        launcherEnhancements: state.launcherEnhancements,
        posEnhancements: state.posEnhancements,
        hiddenInvalidProducts: state.hiddenInvalidProducts,
        guestDefaultFixes: state.guestDefaultFixes,
        serviceStatusTables: state.serviceStatusTables,
        paymentMetaTables: state.paymentMetaTables,
        sentItemStatuses: state.sentItemStatuses,
        moreMenuInstalled: state.moreMenuInstalled,
        paySplitPromoted: state.paySplitPromoted,
        posOpen: !!activePosRoot,
        lastRefreshAt: state.lastRefreshAt,
        lastError: state.lastError,
        base: window.PMDWaiterStandardV2 && typeof window.PMDWaiterStandardV2.debug === 'function'
          ? window.PMDWaiterStandardV2.debug()
          : null,
        pos: activePos && typeof activePos.debug === 'function' ? activePos.debug() : null
      };
    }
  };

  console.info('[PMD] Waiter Standard POS V2.1 complete operations layer active');
})();
