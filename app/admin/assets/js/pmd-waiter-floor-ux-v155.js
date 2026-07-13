(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_FLOOR_UX_V155) return;
  window.PMD_WAITER_FLOOR_UX_V155 = true;

  var ENDPOINT = '/admin/pmd-waiter-table-states-v154';
  var state = {
    loading: false,
    updates: 0,
    lastError: null,
    tables: [],
    byNumber: new Map(),
    confirmTimer: null,
    legendObserver: null,
    legendTarget: null
  };

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }

  function tableNumber(el) {
    return clean(el && el.getAttribute('data-table')).replace(/^table\s*/i, '');
  }

  function selectedTableNumber() {
    var r = root();
    if (!r) return '';

    var selected = r.querySelector(
      '.pmd-w5-floor-map-real .pmd-w5-table[data-table].is-selected,' +
      '.pmd-w5-floor-map-real .pmd-w5-table[data-table].pmd-w12-selected,' +
      '.pmd-w5-floor-map-real .pmd-w5-table[data-table].pmd-w19-selected'
    );
    if (selected) return tableNumber(selected);

    var note = r.querySelector('.pmd-w5-selected-note.is-show');
    var match = clean(note && note.textContent).match(/selected table:\s*table\s*([^\s]+)/i);
    return match ? clean(match[1]) : '';
  }

  function rebuildIndex(tables) {
    state.tables = Array.isArray(tables) ? tables : [];
    state.byNumber = new Map();
    state.tables.forEach(function (info) {
      state.byNumber.set(clean(info.table_number), info);
    });
  }

  function decorateTable(table, info) {
    if (!table || !info) return;

    table.setAttribute('data-pmd-v155-ready', '1');
    table.setAttribute('data-pmd-v155-table-state', info.table_status || 'available');
    table.setAttribute('data-pmd-v155-payment-state', info.payment_status || 'none');
    table.setAttribute('data-pmd-v155-order-state', info.order_status || 'none');
    table.title = [
      info.table_label || ('Table ' + info.table_number),
      'Table: ' + (info.table_status_label || 'Available'),
      info.order_status_label && info.order_status !== 'none' ? 'Order: ' + info.order_status_label : '',
      info.payment_status && info.payment_status !== 'none' ? 'Payment: ' + info.payment_status_label : ''
    ].filter(Boolean).join(' · ');

    var stack = table.querySelector(':scope > .pmd-v154-state-stack');
    if (!stack) return;

    var tableChip = stack.querySelector('.pmd-v154-table-chip');
    var paymentChip = stack.querySelector('.pmd-v154-payment-chip');
    var orderChip = stack.querySelector('.pmd-v154-order-chip');

    if (tableChip) {
      tableChip.tabIndex = -1;
      tableChip.setAttribute('aria-hidden', 'true');
    }

    if (paymentChip) {
      var payment = clean(info.payment_status).toLowerCase();
      paymentChip.textContent = payment === 'paid' ? 'PAID' : (payment === 'partial' ? 'PARTIAL' : '');
      paymentChip.hidden = payment !== 'paid' && payment !== 'partial';
    }

    if (orderChip) {
      orderChip.textContent = '';
      orderChip.hidden = true;
      orderChip.setAttribute('aria-hidden', 'true');
    }
  }

  function decorateTables() {
    var r = root();
    if (!r) return;

    r.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (table) {
      var info = state.byNumber.get(tableNumber(table));
      if (info) decorateTable(table, info);
    });

    document.querySelectorAll('.pmd-v154-modal').forEach(function (modal) { modal.remove(); });
    decorateLegend();
    renderQuickActions();
  }

  function decorateLegend() {
    var legend = document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-legend');
    var button = document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-info-btn');
    if (button) {
      button.textContent = 'i';
      button.title = 'Floor status guide';
    }
    if (!legend) return;

    if (state.legendTarget !== legend) {
      if (state.legendObserver) state.legendObserver.disconnect();
      state.legendTarget = legend;
      state.legendObserver = new MutationObserver(function () {
        if (!legend.querySelector('.pmd-v155-legend-ribbon')) decorateLegend();
      });
      state.legendObserver.observe(legend, {childList:true});
    }

    if (legend.querySelector('.pmd-v155-legend-ribbon')) return;

    legend.setAttribute('data-pmd-v155-legend', '1');
    legend.innerHTML = [
      '<h4>Floor status</h4>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-available"></span><div><b>Available</b><br>Ready for a guest.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-occupied"></span><div><b>Occupied</b><br>Guest is using the table.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-cleaning"></span><div><b>Needs cleaning</b><br>Not ready for seating.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-reserved"></span><div><b>Reserved</b><br>Held for an arrival.</div></div>',
      '<div class="pmd-v155-legend-ribbon"><span>PAID</span><span>PARTIAL</span> Payment ribbon appears only after money is recorded.</div>'
    ].join('');
  }

  function actionsFor(info) {
    if (!info) return [];
    if (info.table_status === 'occupied') {
      return [
        {status:'cleaning', label:'Needs cleaning', reason:'customer_left'},
        {status:'available', label:'Mark available', reason:'customer_left_skip_cleaning', skip_cleaning:true, confirm:true}
      ];
    }
    if (info.table_status === 'cleaning') {
      return [
        {status:'available', label:'Cleaning complete', reason:'cleaning_complete'},
        {status:'occupied', label:'Seat guest', reason:'guest_seated'}
      ];
    }
    if (info.table_status === 'reserved') {
      return [
        {status:'occupied', label:'Guests arrived', reason:'reserved_guests_seated'},
        {status:'available', label:'Release table', reason:'reservation_cancelled', confirm:true}
      ];
    }
    return [
      {status:'occupied', label:'Mark occupied', reason:'guest_seated'},
      {status:'reserved', label:'Reserve', reason:'table_reserved'}
    ];
  }

  function statusTone(status) {
    return ['available','occupied','cleaning','reserved'].indexOf(status) >= 0 ? status : 'available';
  }

  function renderQuickActions() {
    var r = root();
    if (!r) return;

    var tabs = r.querySelector('section.pmd-w5-board .pmd-w5-tabs') || r.querySelector('.pmd-w5-tabs');
    if (!tabs) return;

    tabs.querySelectorAll(':scope > .pmd-v155-table-actions').forEach(function (node) { node.remove(); });

    var number = selectedTableNumber();
    var info = state.byNumber.get(number);
    if (!number || !info) return;

    var holder = document.createElement('div');
    holder.className = 'pmd-v155-table-actions';
    holder.setAttribute('data-table-number', number);
    holder.innerHTML = [
      '<span class="pmd-v155-selected-status is-' + esc(statusTone(info.table_status)) + '">',
        '<b>Table ' + esc(number) + '</b>',
        '<small>' + esc(info.table_status_label || info.table_status) + '</small>',
      '</span>',
      actionsFor(info).map(function (action, index) {
        return '<button type="button" class="pmd-v155-status-action" data-pmd-v155-action="' + index + '">' + esc(action.label) + '</button>';
      }).join(''),
      '<span class="pmd-v155-action-message" aria-live="polite"></span>'
    ].join('');

    tabs.appendChild(holder);
    var actions = actionsFor(info);
    holder.querySelectorAll('[data-pmd-v155-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = actions[Number(button.getAttribute('data-pmd-v155-action'))];
        if (!action) return;

        if (action.confirm && button.getAttribute('data-confirm-ready') !== '1') {
          holder.querySelectorAll('[data-confirm-ready]').forEach(function (other) {
            other.removeAttribute('data-confirm-ready');
            other.textContent = actions[Number(other.getAttribute('data-pmd-v155-action'))].label;
          });
          button.setAttribute('data-confirm-ready', '1');
          button.textContent = 'Confirm ' + action.label.toLowerCase();
          clearTimeout(state.confirmTimer);
          state.confirmTimer = setTimeout(function () {
            button.removeAttribute('data-confirm-ready');
            button.textContent = action.label;
          }, 4000);
          return;
        }

        updateStatus(info, action, holder);
      });
    });
  }

  function updateStatus(info, action, holder) {
    var message = holder.querySelector('.pmd-v155-action-message');
    var buttons = holder.querySelectorAll('button');
    buttons.forEach(function (button) { button.disabled = true; });
    message.textContent = 'Updating…';
    message.classList.remove('is-error', 'is-success');

    fetch(ENDPOINT + '/' + encodeURIComponent(info.table_id), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      },
      body: JSON.stringify({
        status: action.status,
        reason: action.reason,
        skip_cleaning: !!action.skip_cleaning
      })
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || ('HTTP ' + response.status));
          return data;
        });
      })
      .then(function () {
        message.textContent = 'Updated';
        message.classList.add('is-success');
        return refresh(true);
      })
      .catch(function (error) {
        message.textContent = clean(error && error.message ? error.message : error);
        message.classList.add('is-error');
      })
      .finally(function () {
        buttons.forEach(function (button) { button.disabled = false; });
      });
  }

  function refresh(force) {
    if (state.loading) return Promise.resolve(null);
    if (!force && document.hidden) return Promise.resolve(null);
    state.loading = true;

    return fetch(ENDPOINT + '?v155=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {Accept:'application/json','X-Requested-With':'XMLHttpRequest'}
    })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error(data && data.message ? data.message : 'Invalid table-state response');
        rebuildIndex(data.tables);
        state.updates++;
        state.lastError = null;
        decorateTables();
        return data;
      })
      .catch(function (error) {
        state.lastError = clean(error && error.message ? error.message : error);
        console.warn('[PMD] Waiter floor UX v155 refresh failed:', state.lastError);
        decorateTables();
        return null;
      })
      .finally(function () { state.loading = false; });
  }

  // V154's large modal is replaced by inline actions. Its trigger is made
  // non-interactive by CSS; this capture guard also protects against cached CSS.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || !target.closest('.pmd-v154-table-chip')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    var table = target.closest('.pmd-w5-table[data-table]');
    if (table) table.click();
  }, true);

  // Selection belongs to the stable V5 floor. Render the inline operations
  // immediately after its click handler has updated the selected-table class.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || !target.closest(
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table],' +
      '#pmd-waiter-dashboard-root .pmd-w5-tabs button'
    )) return;
    setTimeout(renderQuickActions, 30);
  }, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    setTimeout(function () { decorateTables(); refresh(false); }, 90);
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh(true);
  });

  window.PMDWaiterFloorUXV155 = {
    refresh: function () { return refresh(true); },
    apply: decorateTables,
    debug: function () {
      return {
        version: 'pmd-waiter-floor-ux-v155',
        active: true,
        tableCount: state.tables.length,
        selectedTable: selectedTableNumber(),
        updates: state.updates,
        lastError: state.lastError,
        modalCount: document.querySelectorAll('.pmd-v154-modal').length,
        quickActionBars: document.querySelectorAll('.pmd-v155-table-actions').length,
        visibleOrderStatusChips: Array.from(document.querySelectorAll('.pmd-v154-order-chip')).filter(function (el) {
          return getComputedStyle(el).display !== 'none';
        }).length,
        visibleUnpaidChips: Array.from(document.querySelectorAll('.pmd-v154-payment-chip[data-payment-state="unpaid"]')).filter(function (el) {
          return getComputedStyle(el).display !== 'none';
        }).length
      };
    }
  };

  refresh(true);
  setTimeout(function () { refresh(true); }, 700);
  setInterval(function () { refresh(false); }, 15000);
  console.info('[PMD] Waiter floor UX v155 active');
})();

/* PMD Waiter Floor final authority V156
 * Resolves collision only for the table that was just dropped while keeping
 * the dangerous whole-floor snapAll routine disabled.
 */
(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_FLOOR_FINAL_V156) return;
  window.PMD_WAITER_FLOOR_FINAL_V156 = true;

  var MAP_PAD = 10;
  var TABLE_GAP = 18;
  var patchedApis = 0;
  var patchAttempts = 0;
  var collisionCorrections = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function floorMap() {
    var r = root();
    return r ? r.querySelector('.pmd-w5-floor-map-real') : null;
  }

  function isCompact() {
    var r = root();
    var map = floorMap();
    return !!(
      (r && (r.classList.contains('pmd-w19-compact') || r.classList.contains('pmd-w89-compact'))) ||
      (map && map.classList.contains('pmd-v40-compact-authority') && !map.hasAttribute('data-pmd-v153-save-shield'))
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pct(value) {
    return (Math.round(value * 100) / 100).toFixed(2) + '%';
  }

  function rectAt(centerX, centerY, width, height) {
    return {
      left: centerX - width / 2,
      top: centerY - height / 2,
      right: centerX + width / 2,
      bottom: centerY + height / 2
    };
  }

  function overlapsWithGap(a, b) {
    return !(
      a.right + TABLE_GAP <= b.left ||
      a.left >= b.right + TABLE_GAP ||
      a.bottom + TABLE_GAP <= b.top ||
      a.top >= b.bottom + TABLE_GAP
    );
  }

  function occupiedRects(ignoreTable, mapRect) {
    var map = floorMap();
    if (!map) return [];

    return Array.from(map.querySelectorAll('.pmd-w5-table[data-table]')).filter(function (table) {
      if (!table || table === ignoreTable) return false;
      var style = getComputedStyle(table);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    }).map(function (table) {
      var rect = table.getBoundingClientRect();
      return {
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top
      };
    });
  }

  function isClear(candidate, occupied) {
    return !occupied.some(function (rect) {
      return overlapsWithGap(candidate, rect);
    });
  }

  function currentCenter(table, mapRect) {
    var rect = table.getBoundingClientRect();
    return {
      x: rect.left - mapRect.left + rect.width / 2,
      y: rect.top - mapRect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }

  function nearestFreeCenter(table) {
    var map = floorMap();
    if (!map || !table) return null;

    var mapRect = map.getBoundingClientRect();
    var start = currentCenter(table, mapRect);
    if (!mapRect.width || !mapRect.height || !start.width || !start.height) return null;

    var minX = start.width / 2 + MAP_PAD;
    var maxX = mapRect.width - start.width / 2 - MAP_PAD;
    var minY = start.height / 2 + MAP_PAD;
    var maxY = mapRect.height - start.height / 2 - MAP_PAD;
    if (maxX < minX || maxY < minY) return null;

    var originX = clamp(start.x, minX, maxX);
    var originY = clamp(start.y, minY, maxY);
    var occupied = occupiedRects(table, mapRect);
    var direct = rectAt(originX, originY, start.width, start.height);

    if (isClear(direct, occupied)) {
      return {
        x: originX,
        y: originY,
        moved: Math.abs(originX - start.x) > 0.5 || Math.abs(originY - start.y) > 0.5,
        reason: 'boundary'
      };
    }

    /* Search outward from the exact drop point, so only the dragged table
     * moves and it takes the nearest visually natural free position. */
    var maxRadius = Math.ceil(Math.hypot(mapRect.width, mapRect.height));
    for (var radius = 6; radius <= maxRadius; radius += 6) {
      for (var degrees = 0; degrees < 360; degrees += 12) {
        var radians = degrees * Math.PI / 180;
        var x = clamp(originX + Math.cos(radians) * radius, minX, maxX);
        var y = clamp(originY + Math.sin(radians) * radius, minY, maxY);
        var candidate = rectAt(x, y, start.width, start.height);
        if (isClear(candidate, occupied)) {
          return {x:x, y:y, moved:true, reason:'collision-radius-' + radius};
        }
      }
    }

    /* Dense-layout fallback: scan the complete usable map and choose the
     * closest valid point. This makes overlap impossible whenever free space
     * of the table's size actually exists anywhere on the floor. */
    var best = null;
    var bestDistance = Infinity;
    for (var gridY = minY; gridY <= maxY; gridY += 6) {
      for (var gridX = minX; gridX <= maxX; gridX += 6) {
        var gridCandidate = rectAt(gridX, gridY, start.width, start.height);
        if (!isClear(gridCandidate, occupied)) continue;
        var dx = gridX - originX;
        var dy = gridY - originY;
        var distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = {x:gridX, y:gridY, moved:true, reason:'collision-grid'};
        }
      }
    }

    return best;
  }

  function snapDroppedTable(table, reason) {
    if (isCompact() || !table || !table.matches || !table.matches(
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]'
    )) return false;

    var map = floorMap();
    var center = nearestFreeCenter(table);
    if (!map || !center || !center.moved) return false;

    var mapRect = map.getBoundingClientRect();
    var nextLeft = pct((center.x / mapRect.width) * 100);
    var nextTop = pct((center.y / mapRect.height) * 100);

    table.classList.add('pmd-v61-smart-snapping');
    table.setAttribute('data-pmd-v156-collision-corrected', '1');
    table.style.left = nextLeft;
    table.style.top = nextTop;
    table.style.position = 'absolute';
    table.style.transform = 'translate(-50%, -50%)';

    setTimeout(function () {
      table.classList.remove('pmd-v61-smart-snapping');
      table.removeAttribute('data-pmd-v156-collision-corrected');
    }, 260);

    collisionCorrections++;
    console.info('[PMD] V156 moved dropped table to nearest free position:', {
      table: table.getAttribute('data-table') || '',
      reason: reason || 'drop',
      correction: center.reason,
      left: nextLeft,
      top: nextTop,
      gap: TABLE_GAP
    });
    return true;
  }

  function uniqueApis() {
    var list = [
      window.PMDWaiterV60No404SmartSnap,
      window.PMDWaiterV61StableKioskNoJump
    ];
    return list.filter(function (api, index) {
      return api && list.indexOf(api) === index;
    });
  }

  function patchSingleDropSnap(api) {
    if (!api) return false;
    if (api.__pmdV156SingleDropOnly) return true;

    if (typeof api.__pmdV153OriginalSnapTable === 'function') {
      api.__pmdV156OriginalSnapTable = api.__pmdV153OriginalSnapTable;
    } else if (!api.__pmdV153SnapDisabled && typeof api.snapTable === 'function') {
      api.__pmdV156OriginalSnapTable = api.snapTable;
    }

    api.snapTable = snapDroppedTable;
    api.snapAll = function () { return 0; };
    api.__pmdV156SingleDropOnly = true;
    api.__pmdV153SnapDisabled = true;
    return true;
  }

  function installCollisionAuthority() {
    patchAttempts++;
    var count = 0;
    uniqueApis().forEach(function (api) {
      if (patchSingleDropSnap(api)) count++;
    });
    patchedApis = Math.max(patchedApis, count);
    return count;
  }

  function annotatePaymentWaitingKpi() {
    var r = root();
    if (!r) return false;

    var cards = Array.from(r.querySelectorAll('.pmd-w5-kpis > .pmd-w5-kpi'));
    if (!cards.length) return false;

    var target = cards.find(function (card) {
      var heading = card.querySelector('h3');
      return /payment\s+waiting/i.test(String(heading ? heading.textContent : card.textContent));
    }) || cards[3];

    if (!target) return false;
    target.setAttribute('data-pmd-v156-kpi', 'payment-waiting');
    return true;
  }

  function apply() {
    installCollisionAuthority();
    annotatePaymentWaitingKpi();
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    apply();
    setTimeout(apply, 80);
    setTimeout(apply, 350);
  }, true);

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;
    if (target.closest('[data-w19-edit], [data-w19-save], .pmd-w5-kpis')) {
      setTimeout(apply, 0);
      setTimeout(apply, 180);
    }
  }, true);

  apply();
  setTimeout(apply, 220);
  setTimeout(apply, 1100);

  window.PMDWaiterFloorFinalV156 = {
    apply: apply,
    snapTable: snapDroppedTable,
    debug: function () {
      var r = root();
      var table = r && r.querySelector('.pmd-w5-floor-map-real .pmd-w5-table[data-table]');
      var selected = r && r.querySelector(
        '.pmd-w5-floor-map-real .pmd-w5-table.is-selected,' +
        '.pmd-w5-floor-map-real .pmd-w5-table.pmd-w12-selected,' +
        '.pmd-w5-floor-map-real .pmd-w5-table.pmd-w19-selected'
      );
      var payment = r && r.querySelector('[data-pmd-v156-kpi="payment-waiting"]');
      var api = uniqueApis()[0] || null;
      var tableStyle = table ? getComputedStyle(table) : null;
      var selectedStyle = selected ? getComputedStyle(selected) : null;
      var paymentStyle = payment ? getComputedStyle(payment) : null;

      return {
        version: 'pmd-waiter-floor-final-v156',
        active: true,
        tableGap: TABLE_GAP,
        patchAttempts: patchAttempts,
        patchedApis: patchedApis,
        collisionCorrections: collisionCorrections,
        singleDropSnapActive: !!(api && api.__pmdV156SingleDropOnly),
        snapAllDisabled: !!(api && typeof api.snapAll === 'function' && api.snapAll('debug') === 0),
        firstTableSize: tableStyle ? {width:tableStyle.width, height:tableStyle.height} : null,
        selectedOutline: selectedStyle ? selectedStyle.outlineStyle : null,
        selectedFilter: selectedStyle ? selectedStyle.filter : null,
        paymentWaitingBackground: paymentStyle ? paymentStyle.backgroundImage : null
      };
    }
  };

  console.info('[PMD] Waiter floor final authority v156 active');
})();

/* PMD Waiter Dashboard V157: card status is a live read-only indicator. */
(function () {
  'use strict';
  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_DASHBOARD_V157) return;
  window.PMD_WAITER_DASHBOARD_V157 = true;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function statusText(card) {
    var top = card.querySelector('.pmd-w5-card-top');
    if (top) {
      var pills = Array.from(top.querySelectorAll('.pmd-w5-pill')).map(function (node) {
        return clean(node.textContent);
      }).filter(function (text) {
        return text && !/^table\b/i.test(text) && !/note\s*\/\s*change/i.test(text);
      });
      if (pills.length) return pills[pills.length - 1];
    }
    return clean(card.getAttribute('data-status')) || 'Received';
  }

  function tone(text) {
    var value = clean(text).toLowerCase();
    if (/deliver|served|complete/.test(value)) return 'delivered';
    if (/ready|serve/.test(value)) return 'ready';
    if (/prepar|cook|kitchen|sent/.test(value)) return 'preparing';
    return 'received';
  }

  function paymentText(status) {
    var value = clean(status).toLowerCase();
    if (/partial/.test(value)) return 'Partial';
    if (/paid|settled|closed|complete/.test(value)) return 'Paid';
    return 'Waiting';
  }

  function decorateCard(card) {
    var actions = card.querySelector('.pmd-w5-card-actions');
    if (!actions) return;

    var status = statusText(card);
    card.setAttribute('data-pmd-v157-current-status', status);

    var old = actions.querySelector('[data-status-one]');
    var display = actions.querySelector('.pmd-v157-order-status');
    if (!display) {
      display = document.createElement('div');
      display.className = 'pmd-v157-order-status';
      display.setAttribute('role', 'status');
      display.setAttribute('aria-live', 'polite');
      if (old) old.replaceWith(display);
      else actions.appendChild(display);
    }
    display.setAttribute('data-tone', tone(status));
    display.innerHTML = '<small>Kitchen status</small><strong></strong>';
    display.querySelector('strong').textContent = status || 'Received';

    var pay = actions.querySelector('[data-pay-one]');
    if (pay) {
      pay.innerHTML = '<span>Payment</span><small></small>';
      pay.querySelector('small').textContent = paymentText(status);
      pay.setAttribute('data-payment-state', paymentText(status).toLowerCase());
    }
  }

  function apply() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;
    root.querySelectorAll('article.pmd-w5-card[data-order]').forEach(decorateCard);
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 260);
  }, true);

  apply();
  setTimeout(apply, 220);
  setTimeout(apply, 1000);

  window.PMDWaiterDashboardV157 = {
    apply: apply,
    debug: function () {
      var root = document.querySelector('#pmd-waiter-dashboard-root');
      return {
        active: true,
        cards: root ? root.querySelectorAll('article.pmd-w5-card[data-order]').length : 0,
        staticStatusCards: root ? root.querySelectorAll('.pmd-v157-order-status').length : 0,
        statusDropdownButtons: root ? root.querySelectorAll('[data-status-one]').length : 0
      };
    }
  };

  console.info('[PMD] Waiter dashboard V157 card status authority active');
})();

/* PMD Waiter Dashboard V158: black floor numbers, clickable next status, undo, edit menu mode. */
(function () {
  'use strict';
  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_DASHBOARD_V158) return;
  window.PMD_WAITER_DASHBOARD_V158 = true;

  var STATUS_ENDPOINT = '/admin/pmd-waiter-dashboard-v5-status-update';
  var STATUS_OPTIONS_ENDPOINT = '/admin/pmd-waiter-dashboard-v6-status-options';
  var statusOptionsCache = null;
  var busyOrders = new Set();
  var lastStatusChange = null;
  var STEPS = ['received', 'preparing', 'ready', 'delivered'];
  var LABELS = {
    received: 'Received',
    preparing: 'Preparing',
    ready: 'Ready',
    delivered: 'Delivered'
  };

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }

  function statusText(card) {
    var current = clean(card.getAttribute('data-pmd-v158-current-status')) || clean(card.getAttribute('data-pmd-v157-current-status'));
    if (current) return current;

    var top = card.querySelector('.pmd-w5-card-top');
    if (top) {
      var pills = Array.from(top.querySelectorAll('.pmd-w5-pill')).map(function (node) {
        return clean(node.textContent);
      }).filter(function (text) {
        return text && !/^table\b/i.test(text) && !/note\s*\/\s*change/i.test(text) && !/old\s*open/i.test(text);
      });
      if (pills.length) return pills[pills.length - 1];
    }
    return clean(card.getAttribute('data-status')) || 'Received';
  }

  function tone(text) {
    var value = clean(text).toLowerCase();
    if (/deliver|served|complete|closed/.test(value)) return 'delivered';
    if (/ready|serve/.test(value)) return 'ready';
    if (/prepar|cook|kitchen|progress|sent/.test(value)) return 'preparing';
    return 'received';
  }

  function nextStep(step) {
    var index = STEPS.indexOf(step);
    if (index < 0) return 'preparing';
    return STEPS[Math.min(index + 1, STEPS.length - 1)];
  }

  function previousStep(step) {
    var index = STEPS.indexOf(step);
    if (index <= 0) return 'received';
    return STEPS[index - 1];
  }

  function paymentText(status) {
    var value = clean(status).toLowerCase();
    if (/partial/.test(value)) return 'Partial';
    if (/paid|settled|closed|complete/.test(value)) return 'Paid';
    return 'Waiting';
  }

  function paymentFromCard(card) {
    var text = clean(card.textContent);
    if (/partial/i.test(text)) return 'Partial';
    if (/paid|settled/i.test(text) && !/unpaid/i.test(text)) return 'Paid';
    return paymentText(statusText(card));
  }

  async function loadOptions() {
    if (statusOptionsCache) return statusOptionsCache;
    try {
      var response = await fetch(STATUS_OPTIONS_ENDPOINT + '?ts=' + Date.now(), {
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      var json = await response.json().catch(function () { return null; });
      if (response.ok && json && json.ok && Array.isArray(json.options)) {
        statusOptionsCache = json.options.map(function (item) {
          return {
            label: clean(item.label || item.name || item.title || item.value || ''),
            value: clean(item.value || item.id || item.status_id || item.label || '')
          };
        }).filter(function (item) { return item.label && item.value; });
        return statusOptionsCache;
      }
    } catch (error) {}
    statusOptionsCache = [];
    return statusOptionsCache;
  }

  function optionMatchesStep(option, step) {
    var text = clean(option.label + ' ' + option.value).toLowerCase();
    if (step === 'received') return /received|new|open|pending|placed|submitted/.test(text) && !/paid|complete|closed/.test(text);
    if (step === 'preparing') return /prepar|cook|kitchen|progress|sent/.test(text);
    if (step === 'ready') return /ready/.test(text) || /serve/.test(text);
    if (step === 'delivered') return /deliver|served|complete/.test(text) && !/cancel/.test(text);
    return false;
  }

  async function statusValueFor(step) {
    var options = await loadOptions();
    var chosen = options.find(function (option) { return optionMatchesStep(option, step); });
    return chosen ? chosen.value : LABELS[step];
  }

  async function postStatus(orderId, step) {
    var value = await statusValueFor(step);
    var response = await fetch(STATUS_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      },
      body: JSON.stringify({ order_id: String(orderId), status_label: value })
    });
    var json = await response.json().catch(function () { return null; });
    if (!response.ok || !json || !json.ok) {
      throw new Error((json && json.error) || ('HTTP ' + response.status));
    }
    return json;
  }

  function refreshDashboard() {
    if (window.PMDWaiterDashboard && typeof window.PMDWaiterDashboard.refresh === 'function') {
      return window.PMDWaiterDashboard.refresh();
    }
    document.dispatchEvent(new CustomEvent('pmd-waiter-dashboard-rendered'));
    apply();
    return Promise.resolve();
  }

  async function advanceStatus(card, button) {
    var orderId = clean(card.getAttribute('data-order'));
    if (!orderId || busyOrders.has(orderId)) return;

    var fromText = statusText(card);
    var fromStep = tone(fromText);
    var toStep = nextStep(fromStep);
    if (fromStep === 'delivered' && toStep === 'delivered') return;

    busyOrders.add(orderId);
    button.disabled = true;
    button.querySelector('strong').textContent = 'Saving...';

    try {
      await postStatus(orderId, toStep);
      lastStatusChange = { orderId: orderId, fromStep: fromStep, toStep: toStep, fromText: fromText };
      updateUndoButton();
      await refreshDashboard();
    } catch (error) {
      alert('Status تغییر نکرد: ' + error.message);
    } finally {
      busyOrders.delete(orderId);
      button.disabled = false;
      setTimeout(apply, 100);
    }
  }

  async function undoLastStatus() {
    if (!lastStatusChange) return;
    var change = lastStatusChange;
    var undo = document.querySelector('#pmd-waiter-dashboard-root .pmd-v158-undo');
    if (undo) undo.disabled = true;

    try {
      await postStatus(change.orderId, change.fromStep || previousStep(change.toStep));
      lastStatusChange = null;
      updateUndoButton();
      await refreshDashboard();
    } catch (error) {
      alert('Undo انجام نشد: ' + error.message);
      updateUndoButton();
    } finally {
      setTimeout(apply, 100);
    }
  }

  function updateUndoButton() {
    var undo = document.querySelector('#pmd-waiter-dashboard-root .pmd-v158-undo');
    if (!undo) return;
    undo.disabled = !lastStatusChange;
    undo.textContent = lastStatusChange ? ('Undo ' + LABELS[lastStatusChange.toStep]) : 'Undo';
  }

  function ensureToolbar() {
    var r = root();
    if (!r) return;
    var board = r.querySelector('section.pmd-w5-board');
    var grid = board && board.querySelector('.pmd-w5-grid');
    if (!board || !grid) return;

    var toolbar = board.querySelector(':scope > .pmd-v158-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'pmd-v158-toolbar';
      toolbar.innerHTML = '<button type="button" class="pmd-v158-undo" disabled>Undo</button>';
      board.insertBefore(toolbar, grid);
      toolbar.querySelector('.pmd-v158-undo').addEventListener('click', undoLastStatus);
    }
    updateUndoButton();
  }

  function decorateCard(card) {
    var actions = card.querySelector('.pmd-w5-card-actions');
    if (!actions) return;

    var orderId = clean(card.getAttribute('data-order'));
    var status = statusText(card);
    var step = tone(status);
    card.setAttribute('data-pmd-v158-current-status', status);

    var legacy = actions.querySelector('[data-status-one]');
    var display = actions.querySelector('.pmd-v158-order-status') || actions.querySelector('.pmd-v157-order-status');
    if (!display || display.tagName !== 'BUTTON') {
      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'pmd-v158-order-status';
      next.setAttribute('data-v158-status-one', orderId);
      if (display) display.replaceWith(next);
      else if (legacy) legacy.replaceWith(next);
      else actions.appendChild(next);
      display = next;
    }

    display.className = 'pmd-v158-order-status';
    display.setAttribute('data-v158-status-one', orderId);
    display.setAttribute('data-tone', step);
    display.title = step === 'delivered' ? 'Already delivered' : ('Click to mark ' + LABELS[nextStep(step)]);
    display.innerHTML = '<strong></strong>';
    display.querySelector('strong').textContent = LABELS[step] || status || 'Received';
    display.disabled = busyOrders.has(orderId) || step === 'delivered';
    display.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      advanceStatus(card, display);
    };

    var pay = actions.querySelector('[data-pay-one]');
    if (pay && !pay.querySelector('small')) {
      pay.innerHTML = '<span>Payment</span><small></small>';
    }
    if (pay && pay.querySelector('small')) {
      var payment = paymentFromCard(card);
      pay.querySelector('small').textContent = payment;
      pay.setAttribute('data-payment-state', payment.toLowerCase());
    }
  }

  function sortCardsRowFirst() {
    var r = root();
    if (!r) return;
    var grid = r.querySelector('.pmd-w5-grid');
    if (!grid) return;
    var cards = Array.from(grid.querySelectorAll(':scope > article.pmd-w5-card[data-order]'));
    if (cards.length < 2) return;

    cards.sort(function (a, b) {
      var ap = a.classList.contains('is-note') ? 0 : 1;
      var bp = b.classList.contains('is-note') ? 0 : 1;
      if (ap !== bp) return ap - bp;
      var at = Number(a.getAttribute('data-table'));
      var bt = Number(b.getAttribute('data-table'));
      if (isFinite(at) && isFinite(bt) && at !== bt) return at - bt;
      return String(a.getAttribute('data-order') || '').localeCompare(String(b.getAttribute('data-order') || ''));
    }).forEach(function (card) { grid.appendChild(card); });
  }

  function forceBlackFloorNumbers() {
    var r = root();
    if (!r) return;
    r.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (table) {
      table.setAttribute('data-pmd-v158-black-number', '1');
      var span = table.querySelector(':scope > span') || table.querySelector('span');
      if (span) {
        span.style.color = '#050505';
        span.style.webkitTextFillColor = '#050505';
        span.style.textShadow = 'none';
      }
    });
  }

  function apply() {
    var r = root();
    if (!r) return;
    forceBlackFloorNumbers();
    ensureToolbar();
    sortCardsRowFirst();
    r.querySelectorAll('article.pmd-w5-card[data-order]').forEach(decorateCard);
  }

  document.addEventListener('click', function (event) {
    var edit = event.target && event.target.closest && event.target.closest('#pmd-waiter-dashboard-root [data-edit]');
    if (!edit) return;

    var card = edit.closest('article.pmd-w5-card[data-order]');
    if (!card) return;
    var orderId = clean(edit.getAttribute('data-edit') || card.getAttribute('data-order'));
    var tableNo = clean(card.getAttribute('data-table'));
    if (!orderId || !tableNo) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.href = '/table/' + encodeURIComponent(tableNo) + '/menu?waiter=1&quick=1&edit_order=' + encodeURIComponent(orderId) + '&order_id=' + encodeURIComponent(orderId) + '&mode=edit';
  }, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 260);
  }, true);

  var observer = new MutationObserver(function () { setTimeout(apply, 0); });
  function bootObserver() {
    var r = root();
    if (r) observer.observe(r, {childList: true, subtree: true});
  }

  apply();
  bootObserver();
  setTimeout(apply, 220);
  setTimeout(apply, 1000);
  setInterval(forceBlackFloorNumbers, 1500);

  window.PMDWaiterDashboardV158 = {
    apply: apply,
    undo: undoLastStatus,
    debug: function () {
      var r = root();
      var cards = r ? Array.from(r.querySelectorAll('article.pmd-w5-card[data-order]')) : [];
      var firstTable = r && r.querySelector('.pmd-w5-floor-map-real .pmd-w5-table[data-table] > span');
      var floor = r && r.querySelector('.pmd-w5-floor-map-real:not(.pmd-v40-compact-authority)');
      return {
        active: true,
        cards: cards.length,
        clickableStatusButtons: r ? r.querySelectorAll('.pmd-v158-order-status').length : 0,
        kitchenLabelsVisible: r ? Array.from(r.querySelectorAll('.pmd-v158-order-status small,.pmd-v157-order-status small')).filter(function (el) { return getComputedStyle(el).display !== 'none'; }).length : 0,
        undoAvailable: !!lastStatusChange,
        firstFloorNumberColor: firstTable ? getComputedStyle(firstTable).color : null,
        floorHeight: floor ? getComputedStyle(floor).height : null,
        editModeUrlExample: cards[0] ? ('/table/' + encodeURIComponent(cards[0].getAttribute('data-table') || '') + '/menu?waiter=1&quick=1&edit_order=' + encodeURIComponent(cards[0].getAttribute('data-order') || '') + '&order_id=' + encodeURIComponent(cards[0].getAttribute('data-order') || '') + '&mode=edit') : null
      };
    }
  };

  console.info('[PMD] Waiter dashboard V158 status/edit authority active');
})();


/* PMD Waiter Dashboard V159: one real order-status button, deeper full-screen floor. */
(function () {
  'use strict';
  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_DASHBOARD_V159) return;
  window.PMD_WAITER_DASHBOARD_V159 = true;

  var STATUS_ENDPOINT = '/admin/pmd-waiter-dashboard-v5-status-update';
  var STATUS_OPTIONS_ENDPOINT = '/admin/pmd-waiter-dashboard-v6-status-options';
  var statusOptionsCache = null;
  var busyOrders = new Set();
  var lastChange = null;
  var STEPS = ['received', 'preparing', 'ready', 'delivered'];
  var LABELS = {received:'Received', preparing:'Preparing', ready:'Ready', delivered:'Delivered'};

  function root() { return document.querySelector('#pmd-waiter-dashboard-root'); }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }
  function tone(text) {
    var value = clean(text).toLowerCase();
    if (/deliver|served|complete|closed/.test(value)) return 'delivered';
    if (/ready|serve/.test(value)) return 'ready';
    if (/prepar|cook|kitchen|progress|sent/.test(value)) return 'preparing';
    return 'received';
  }
  function nextStep(step) {
    var index = STEPS.indexOf(step);
    return index < 0 ? 'preparing' : STEPS[Math.min(index + 1, STEPS.length - 1)];
  }
  function statusText(card) {
    var current = clean(card.getAttribute('data-pmd-v159-current-status')) || clean(card.getAttribute('data-pmd-v158-current-status')) || clean(card.getAttribute('data-pmd-v157-current-status'));
    if (current) return current;
    var statusButton = card.querySelector('.pmd-v159-order-status strong,.pmd-v158-order-status strong,.pmd-v157-order-status strong,[data-status-one]');
    if (statusButton) {
      var buttonText = clean(statusButton.textContent);
      if (buttonText && !/^status$/i.test(buttonText)) return buttonText;
    }
    var top = card.querySelector('.pmd-w5-card-top');
    if (top) {
      var pills = Array.from(top.querySelectorAll('.pmd-w5-pill')).map(function (node) { return clean(node.textContent); }).filter(function (text) {
        return text && !/^table\b/i.test(text) && !/note\s*\/\s*change/i.test(text) && !/old\s*open/i.test(text);
      });
      if (pills.length) return pills[pills.length - 1];
    }
    return clean(card.getAttribute('data-status')) || 'Received';
  }
  function paymentFromCard(card) {
    var text = clean(card.textContent).toLowerCase();
    if (/partial/.test(text)) return 'Partial';
    if (/paid|settled/.test(text) && !/unpaid/.test(text)) return 'Paid';
    return 'Waiting';
  }

  async function loadOptions() {
    if (statusOptionsCache) return statusOptionsCache;
    try {
      var response = await fetch(STATUS_OPTIONS_ENDPOINT + '?ts=' + Date.now(), {
        credentials: 'same-origin',
        headers: {'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
      });
      var json = await response.json().catch(function () { return null; });
      if (response.ok && json && json.ok && Array.isArray(json.options)) {
        statusOptionsCache = json.options.map(function (item) {
          return {label: clean(item.label || item.name || item.title || item.value || ''), value: clean(item.value || item.id || item.status_id || item.label || '')};
        }).filter(function (item) { return item.label && item.value; });
        return statusOptionsCache;
      }
    } catch (error) {}
    statusOptionsCache = [];
    return statusOptionsCache;
  }
  function optionMatchesStep(option, step) {
    var text = clean(option.label + ' ' + option.value).toLowerCase();
    if (step === 'received') return /received|new|open|pending|placed|submitted/.test(text) && !/paid|complete|closed/.test(text);
    if (step === 'preparing') return /prepar|cook|kitchen|progress|sent/.test(text);
    if (step === 'ready') return /ready/.test(text) || /serve/.test(text);
    if (step === 'delivered') return /deliver|served|complete/.test(text) && !/cancel/.test(text);
    return false;
  }
  async function statusValueFor(step) {
    var options = await loadOptions();
    var chosen = options.find(function (option) { return optionMatchesStep(option, step); });
    return chosen ? chosen.value : LABELS[step];
  }
  async function postStatus(orderId, step) {
    var value = await statusValueFor(step);
    var response = await fetch(STATUS_ENDPOINT, {
      method: 'POST', credentials: 'same-origin',
      headers: {'Accept':'application/json','Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf()},
      body: JSON.stringify({order_id: String(orderId), status_label: value})
    });
    var json = await response.json().catch(function () { return null; });
    if (!response.ok || !json || !json.ok) throw new Error((json && json.error) || ('HTTP ' + response.status));
    return json;
  }
  function refreshDashboard() {
    if (window.PMDWaiterDashboard && typeof window.PMDWaiterDashboard.refresh === 'function') {
      return window.PMDWaiterDashboard.refresh();
    }
    document.dispatchEvent(new CustomEvent('pmd-waiter-dashboard-rendered'));
    apply();
    return Promise.resolve();
  }

  function forceFullFloor() {
    var r = root();
    if (!r) return;
    r.classList.add('pmd-v159-authority');
    var map = r.querySelector('.pmd-w5-floor-map-real:not(.pmd-v40-compact-authority)');
    if (map) map.setAttribute('data-pmd-v159-full-floor', '1');
  }
  function forceBlackFloorNumbers() {
    var r = root();
    if (!r) return;
    r.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (table) {
      table.setAttribute('data-pmd-v159-black-number', '1');
      table.style.textShadow = 'none';
      table.querySelectorAll(':scope > span, :scope > b, :scope > strong').forEach(function (node) {
        node.style.color = '#050505';
        node.style.webkitTextFillColor = '#050505';
        node.style.textShadow = 'none';
      });
    });
  }

  function ensureToolbar() {
    var r = root();
    if (!r) return;
    var board = r.querySelector('section.pmd-w5-board');
    var grid = board && board.querySelector('.pmd-w5-grid');
    if (!board || !grid) return;
    var toolbar = board.querySelector(':scope > .pmd-v158-toolbar, :scope > .pmd-v159-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'pmd-v159-toolbar pmd-v158-toolbar';
      toolbar.innerHTML = '<button type="button" class="pmd-v159-undo pmd-v158-undo" disabled>Undo</button>';
      board.insertBefore(toolbar, grid);
    } else {
      toolbar.classList.add('pmd-v159-toolbar');
      var existing = toolbar.querySelector('.pmd-v158-undo,.pmd-v159-undo');
      if (existing) existing.classList.add('pmd-v159-undo');
    }
    var undo = toolbar.querySelector('.pmd-v159-undo');
    if (undo && !undo.dataset.pmdV159Bound) {
      undo.dataset.pmdV159Bound = '1';
      undo.addEventListener('click', undoLast, true);
    }
    updateUndoButton();
  }
  function updateUndoButton() {
    var undo = document.querySelector('#pmd-waiter-dashboard-root .pmd-v159-undo') || document.querySelector('#pmd-waiter-dashboard-root .pmd-v158-undo');
    if (!undo) return;
    undo.disabled = !lastChange;
    undo.textContent = lastChange ? ('Undo ' + (LABELS[lastChange.toStep] || 'status')) : 'Undo';
  }
  async function undoLast(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!lastChange) return;
    var undo = document.querySelector('#pmd-waiter-dashboard-root .pmd-v159-undo') || document.querySelector('#pmd-waiter-dashboard-root .pmd-v158-undo');
    if (undo) undo.disabled = true;
    try {
      await postStatus(lastChange.orderId, lastChange.fromStep || 'received');
      lastChange = null;
      updateUndoButton();
      await refreshDashboard();
    } catch (error) {
      alert('Undo انجام نشد: ' + error.message);
      updateUndoButton();
    } finally {
      setTimeout(apply, 80);
    }
  }

  function removeDuplicateStatusControls(actions, keep) {
    Array.from(actions.querySelectorAll('.pmd-v157-order-status,.pmd-v158-order-status,.pmd-v159-order-status,[data-status-one],[data-v158-status-one],[data-v159-status-one]')).forEach(function (node) {
      if (node !== keep && !node.matches('[data-pay-one]')) node.remove();
    });
  }
  function decorateCard(card) {
    var actions = card.querySelector('.pmd-w5-card-actions');
    if (!actions) return;
    var orderId = clean(card.getAttribute('data-order'));
    var step = tone(statusText(card));
    card.setAttribute('data-pmd-v159-current-status', LABELS[step]);

    var candidates = Array.from(actions.querySelectorAll('.pmd-v159-order-status,.pmd-v158-order-status,.pmd-v157-order-status,[data-status-one]')).filter(function (node) {
      return !node.matches('[data-pay-one]');
    });
    var status = candidates.find(function (node) { return node.classList.contains('pmd-v159-order-status'); }) || candidates.find(function (node) { return node.classList.contains('pmd-v158-order-status'); }) || candidates[0];
    if (!status) {
      status = document.createElement('button');
      status.type = 'button';
      actions.appendChild(status);
    }
    if (status.tagName !== 'BUTTON') {
      var replacement = document.createElement('button');
      replacement.type = 'button';
      status.replaceWith(replacement);
      status = replacement;
    }
    removeDuplicateStatusControls(actions, status);

    status.className = 'pmd-v159-order-status pmd-v158-order-status';
    status.setAttribute('data-v159-status-one', orderId);
    status.setAttribute('data-v158-status-one', orderId);
    status.setAttribute('data-tone', step);
    status.title = step === 'delivered' ? 'Already delivered' : ('Click to mark ' + LABELS[nextStep(step)]);
    status.innerHTML = '<strong></strong>';
    status.querySelector('strong').textContent = LABELS[step] || 'Received';
    status.disabled = busyOrders.has(orderId) || step === 'delivered';
    status.onclick = async function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!orderId || busyOrders.has(orderId)) return;
      var fromStep = tone(statusText(card));
      var toStep = nextStep(fromStep);
      if (fromStep === 'delivered' && toStep === 'delivered') return;
      busyOrders.add(orderId);
      status.disabled = true;
      status.querySelector('strong').textContent = 'Saving...';
      try {
        await postStatus(orderId, toStep);
        lastChange = {orderId: orderId, fromStep: fromStep, toStep: toStep};
        updateUndoButton();
        await refreshDashboard();
      } catch (error) {
        alert('Status تغییر نکرد: ' + error.message);
      } finally {
        busyOrders.delete(orderId);
        setTimeout(apply, 100);
      }
    };

    var pay = actions.querySelector('[data-pay-one]');
    if (pay) {
      pay.innerHTML = '<span>Payment</span><small></small>';
      var payment = paymentFromCard(card);
      pay.querySelector('small').textContent = payment.toUpperCase();
      pay.setAttribute('data-payment-state', payment.toLowerCase());
    }
  }
  function sortCardsRowFirst() {
    var r = root();
    if (!r) return;
    var grid = r.querySelector('.pmd-w5-grid');
    if (!grid) return;
    var cards = Array.from(grid.querySelectorAll(':scope > article.pmd-w5-card[data-order]'));
    cards.sort(function (a, b) {
      var at = Number(a.getAttribute('data-table'));
      var bt = Number(b.getAttribute('data-table'));
      if (isFinite(at) && isFinite(bt) && at !== bt) return at - bt;
      return String(a.getAttribute('data-order') || '').localeCompare(String(b.getAttribute('data-order') || ''));
    }).forEach(function (card) { grid.appendChild(card); });
  }
  function apply() {
    forceFullFloor();
    forceBlackFloorNumbers();
    ensureToolbar();
    sortCardsRowFirst();
    var r = root();
    if (!r) return;
    r.querySelectorAll('article.pmd-w5-card[data-order]').forEach(decorateCard);
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    apply(); requestAnimationFrame(apply); setTimeout(apply, 100); setTimeout(apply, 380);
  }, true);
  var observer = new MutationObserver(function () { setTimeout(apply, 30); });
  function boot() { var r = root(); if (r) observer.observe(r, {childList:true, subtree:true}); }
  apply(); boot(); setTimeout(apply, 300); setTimeout(apply, 1200); setInterval(function () { forceFullFloor(); forceBlackFloorNumbers(); }, 1500);

  window.PMDWaiterDashboardV159 = {
    apply: apply,
    undo: undoLast,
    debug: function () {
      var r = root();
      var cards = r ? Array.from(r.querySelectorAll('article.pmd-w5-card[data-order]')) : [];
      var duplicateCards = cards.filter(function (card) { return card.querySelectorAll('.pmd-v157-order-status,.pmd-v158-order-status,.pmd-v159-order-status,[data-status-one]').length > 1; }).length;
      var floor = r && r.querySelector('.pmd-w5-floor-map-real:not(.pmd-v40-compact-authority)');
      var firstTable = r && r.querySelector('.pmd-w5-floor-map-real .pmd-w5-table[data-table] > span');
      return {
        active: true,
        cards: cards.length,
        statusButtons: r ? r.querySelectorAll('.pmd-v159-order-status').length : 0,
        duplicateStatusCards: duplicateCards,
        undoAvailable: !!lastChange,
        floorHeight: floor ? getComputedStyle(floor).height : null,
        firstFloorNumberColor: firstTable ? getComputedStyle(firstTable).color : null
      };
    }
  };
  console.info('[PMD] Waiter dashboard V159 single-status + full-floor authority active');
})();






















