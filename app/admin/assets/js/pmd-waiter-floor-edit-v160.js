(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_FLOOR_EDIT_V160) return;
  window.PMD_WAITER_FLOOR_EDIT_V160 = true;

  var ROOT_SELECTOR = '#pmd-waiter-dashboard-root';
  var MAP_SELECTOR = ROOT_SELECTOR + ' .pmd-w5-floor-map-real';
  var TABLE_SELECTOR = MAP_SELECTOR + ' .pmd-w5-table[data-table]:not(.pmd-v160-drag-proxy)';
  var EDIT_SELECTOR = ROOT_SELECTOR + ' [data-w19-edit]';
  var SAVE_SELECTOR = ROOT_SELECTOR + ' [data-w19-save]';
  var COMPACT_SELECTOR = ROOT_SELECTOR + ' .pmd-w19-tools button[data-w19-compact]';
  var MAP_PAD = 14;
  var TABLE_GAP = 10;
  var DROP_SEARCH_STEP = 8;
  var DROP_SEARCH_ANGLES = 96;

  var drag = null;
  var pendingPoint = null;
  var moveRaf = 0;
  var suppressClickUntil = 0;
  var observer = null;
  var observedRoot = null;
  var applyTimer = 0;
  var editSnapshot = null;
  var recoveryRuns = 0;
  var recoveredColumnLayouts = 0;
  var dropAdjustments = 0;
  var proxyMoves = 0;

  function root() {
    return document.querySelector(ROOT_SELECTOR);
  }

  function floorMap() {
    var r = root();
    return r ? r.querySelector('.pmd-w5-floor-map-real') : null;
  }

  function tables() {
    var map = floorMap();
    return map ? Array.prototype.slice.call(map.querySelectorAll('.pmd-w5-table[data-table]:not(.pmd-v160-drag-proxy)')) : [];
  }

  function toolbarState() {
    return window.PMDWaiterFloorToolbar && window.PMDWaiterFloorToolbar.state
      ? window.PMDWaiterFloorToolbar.state
      : null;
  }

  function isEditing() {
    var r = root();
    var state = toolbarState();
    return !!(
      (state && state.edit) ||
      (r && (
        r.classList.contains('pmd-w19-editing') ||
        r.classList.contains('pmd-v21-editing') ||
        r.classList.contains('pmd-v22-editing')
      ))
    );
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

  function percent(value) {
    return (Math.round(value * 100) / 100).toFixed(2) + '%';
  }

  function parsePercent(value) {
    var parsed = parseFloat(String(value == null ? '' : value).replace('%', ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function distanceSquared(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function setImportant(element, property, value) {
    if (!element || !element.style) return;
    element.style.setProperty(property, value, 'important');
  }

  function markAuthority() {
    var r = root();
    var map = floorMap();
    if (r) r.classList.add('pmd-v160-layout-authority');
    if (map) map.setAttribute('data-pmd-v160-layout-authority', '1');
  }

  /* The floor tile itself is a button. Resolve the tile first and reject only
   * a real interactive child inside it, such as the unmerge control. */
  function tableFromEvent(event) {
    var target = event && event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return null;

    var table = target.closest(TABLE_SELECTOR);
    if (!table) return null;

    var childControl = target.closest('a, input, textarea, select, .pmd-w19-unmerge, .pmd-v40-unmerge, .pmd-v18-unmerge');
    if (childControl && childControl !== table && table.contains(childControl)) return null;

    return table;
  }

  function tableKey(table, index) {
    return String(table && table.getAttribute('data-table') || ('index-' + index));
  }

  function captureLayout() {
    var map = floorMap();
    if (!map) return null;
    var mapRect = map.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return null;

    return tables().map(function (table, index) {
      var rect = table.getBoundingClientRect();
      var leftPercent = parsePercent(table.style.left);
      var topPercent = parsePercent(table.style.top);
      var xRatio = leftPercent === null
        ? (rect.left - mapRect.left + rect.width / 2) / mapRect.width
        : leftPercent / 100;
      var yRatio = topPercent === null
        ? (rect.top - mapRect.top + rect.height / 2) / mapRect.height
        : topPercent / 100;

      return {
        key: tableKey(table, index),
        table: table,
        xRatio: xRatio,
        yRatio: yRatio
      };
    });
  }

  function writeRatio(table, xRatio, yRatio) {
    if (!table) return;
    setImportant(table, 'left', percent(xRatio * 100));
    setImportant(table, 'top', percent(yRatio * 100));
    setImportant(table, 'position', 'absolute');
    setImportant(table, 'right', 'auto');
    setImportant(table, 'bottom', 'auto');
    setImportant(table, 'margin', '0');
    setImportant(table, 'transform', 'translate(-50%, -50%)');
  }

  function restoreLayout(snapshot) {
    if (!snapshot || !snapshot.length) return false;
    var current = tables();
    var byKey = new Map();
    current.forEach(function (table, index) {
      byKey.set(tableKey(table, index), table);
    });

    snapshot.forEach(function (item) {
      var table = item.table && item.table.isConnected ? item.table : byKey.get(item.key);
      if (table) writeRatio(table, item.xRatio, item.yRatio);
    });
    return true;
  }

  function forceExpanded() {
    if (!isCompact()) return;
    if (window.PMDFloorDeterministicV190 && typeof window.PMDFloorDeterministicV190.expand === 'function') {
      window.PMDFloorDeterministicV190.expand();
      return;
    }
    var button = document.querySelector(COMPACT_SELECTOR);
    if (button) button.click();
  }

  function freezeEditGeometry(snapshot) {
    var r = root();
    if (!r) return;
    r.classList.add('pmd-v160-edit-freeze');
    markAuthority();
    restoreLayout(snapshot);

    requestAnimationFrame(function () {
      markAuthority();
      if (!drag) restoreLayout(snapshot);
      r.classList.remove('pmd-v160-edit-freeze');
    });
  }

  function tableRectAt(center, width, height) {
    return {
      left: center.x - width / 2,
      top: center.y - height / 2,
      right: center.x + width / 2,
      bottom: center.y + height / 2
    };
  }

  function rectanglesOverlap(a, b, gap) {
    gap = typeof gap === 'number' ? gap : TABLE_GAP;
    return !(
      a.right + gap <= b.left ||
      a.left >= b.right + gap ||
      a.bottom + gap <= b.top ||
      a.top >= b.bottom + gap
    );
  }

  function occupiedRects(ignoreTable, mapRect) {
    var map = floorMap();
    if (!map) return [];

    return tables().filter(function (table) {
      if (!table || table === ignoreTable) return false;
      var style = getComputedStyle(table);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    }).map(function (table) {
      var rect = table.getBoundingClientRect();
      return {
        table: table,
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top
      };
    });
  }

  function centerIsClear(center, width, height, occupied) {
    var candidate = tableRectAt(center, width, height);
    return !occupied.some(function (rect) {
      return rectanglesOverlap(candidate, rect, TABLE_GAP);
    });
  }


  function clampCenterToMap(center, width, height, mapRect) {
    return {
      x: clamp(center.x, width / 2 + MAP_PAD, mapRect.width - width / 2 - MAP_PAD),
      y: clamp(center.y, height / 2 + MAP_PAD, mapRect.height - height / 2 - MAP_PAD)
    };
  }

  /* Collision is intentionally resolved only after pointer release. Search in
   * expanding rings around the exact drop point and use the first clear ring,
   * which gives the closest practical free position with TABLE_GAP spacing. */
  function nearestFreeCenter(desired, state, occupied, mapRect) {
    desired = clampCenterToMap(desired, state.width, state.height, mapRect);
    if (centerIsClear(desired, state.width, state.height, occupied)) return desired;

    var maxRadius = Math.ceil(Math.sqrt(
      mapRect.width * mapRect.width + mapRect.height * mapRect.height
    ));

    for (var radius = DROP_SEARCH_STEP; radius <= maxRadius; radius += DROP_SEARCH_STEP) {
      var samples = Math.min(
        DROP_SEARCH_ANGLES,
        Math.max(24, Math.ceil((Math.PI * 2 * radius) / 12))
      );
      var clear = [];
      var seen = new Set();

      for (var index = 0; index < samples; index++) {
        var angle = (Math.PI * 2 * index) / samples;
        var point = clampCenterToMap({
          x: desired.x + Math.cos(angle) * radius,
          y: desired.y + Math.sin(angle) * radius
        }, state.width, state.height, mapRect);
        var key = Math.round(point.x * 2) + ':' + Math.round(point.y * 2);
        if (seen.has(key)) continue;
        seen.add(key);

        if (centerIsClear(point, state.width, state.height, occupied)) {
          clear.push(point);
        }
      }

      if (clear.length) {
        clear.sort(function (a, b) {
          return distanceSquared(a, desired) - distanceSquared(b, desired);
        });
        return clear[0];
      }
    }

    var start = clampCenterToMap(state.startCenter, state.width, state.height, mapRect);
    if (centerIsClear(start, state.width, state.height, occupied)) return start;
    return desired;
  }

  function writeCenter(table, center, mapRect) {
    writeRatio(table, center.x / mapRect.width, center.y / mapRect.height);
  }

  /* The visual drag proxy lives outside the waiter dashboard and uses viewport
   * pixels. It deliberately has no translate transform, so no floor authority
   * can create a half-width / half-height jump. */
  function writeProxyCenter(proxy, center, mapRect, width, height) {
    if (!proxy || !mapRect) return;
    setImportant(proxy, 'left', (mapRect.left + center.x - width / 2).toFixed(2) + 'px');
    setImportant(proxy, 'top', (mapRect.top + center.y - height / 2).toFixed(2) + 'px');
    setImportant(proxy, 'transform', 'none');
  }

  function stripProxyIdentity(proxy) {
    if (!proxy) return;
    [proxy].concat(Array.prototype.slice.call(proxy.querySelectorAll('[id], [name]'))).forEach(function (node) {
      node.removeAttribute('id');
      node.removeAttribute('name');
    });
  }

  function createDragProxy(table, map, mapRect, tableRect, startCenter) {
    if (!table || !map || !document.body) return null;

    var visual = getComputedStyle(table);
    var proxy = table.cloneNode(true);
    stripProxyIdentity(proxy);

    proxy.setAttribute('data-pmd-v160-proxy-table', table.getAttribute('data-table') || '');
    proxy.removeAttribute('data-table');

    /* Critical isolation: V175c/V183 search globally for the real floor-table
     * classes. Keep none of those classes on the proxy. */
    proxy.className = 'pmd-v160-drag-proxy pmd-v160-dragging-table';
    proxy.setAttribute('data-pmd-v160-proxy', '1');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.setAttribute('tabindex', '-1');

    setImportant(proxy, 'pointer-events', 'none');
    setImportant(proxy, 'position', 'fixed');
    setImportant(proxy, 'right', 'auto');
    setImportant(proxy, 'bottom', 'auto');
    setImportant(proxy, 'margin', '0');
    setImportant(proxy, 'width', tableRect.width + 'px');
    setImportant(proxy, 'height', tableRect.height + 'px');
    setImportant(proxy, 'min-width', tableRect.width + 'px');
    setImportant(proxy, 'min-height', tableRect.height + 'px');
    setImportant(proxy, 'max-width', tableRect.width + 'px');
    setImportant(proxy, 'max-height', tableRect.height + 'px');
    setImportant(proxy, 'box-sizing', 'border-box');
    setImportant(proxy, 'display', 'flex');
    setImportant(proxy, 'align-items', 'center');
    setImportant(proxy, 'justify-content', 'center');
    setImportant(proxy, 'appearance', 'none');
    setImportant(proxy, '-webkit-appearance', 'none');

    setImportant(proxy, 'background', visual.background);
    setImportant(proxy, 'border', visual.border);
    setImportant(proxy, 'border-radius', visual.borderRadius);
    setImportant(proxy, 'box-shadow', visual.boxShadow);
    setImportant(proxy, 'color', visual.color);
    setImportant(proxy, '-webkit-text-fill-color', visual.webkitTextFillColor || visual.color);
    setImportant(proxy, 'font-family', visual.fontFamily);
    setImportant(proxy, 'font-size', visual.fontSize);
    setImportant(proxy, 'font-weight', visual.fontWeight);
    setImportant(proxy, 'line-height', visual.lineHeight);
    setImportant(proxy, 'letter-spacing', visual.letterSpacing);
    setImportant(proxy, 'text-align', visual.textAlign);
    setImportant(proxy, 'padding', visual.padding);
    setImportant(proxy, 'overflow', 'visible');

    setImportant(proxy, 'transform', 'none');
    setImportant(proxy, 'transition', 'none');
    setImportant(proxy, 'animation', 'none');
    setImportant(proxy, 'visibility', 'visible');
    setImportant(proxy, 'opacity', '1');
    setImportant(proxy, 'z-index', '2147483000');
    setImportant(proxy, 'contain', 'layout paint style');
    setImportant(proxy, 'isolation', 'isolate');
    setImportant(proxy, 'will-change', 'left, top');
    setImportant(proxy, 'user-select', 'none');

    document.body.appendChild(proxy);
    writeProxyCenter(proxy, startCenter, mapRect, tableRect.width, tableRect.height);
    return proxy;
  }

  function hideDragSource(table) {
    if (!table) return;
    table.classList.add('pmd-v160-drag-source');
    setImportant(table, 'visibility', 'hidden');
    setImportant(table, 'pointer-events', 'none');
  }

  function restoreDragSource(table) {
    if (!table) return;
    table.classList.remove('pmd-v160-drag-source');
    table.style.removeProperty('visibility');
    table.style.removeProperty('pointer-events');
    table.style.removeProperty('transition');
  }

  function removeDragProxy(proxy) {
    if (proxy && proxy.parentNode) proxy.parentNode.removeChild(proxy);
  }


  function desiredCenterFromPoint(point, state, mapRect) {
    return clampCenterToMap({
      x: point.x - mapRect.left - state.offsetX + state.width / 2,
      y: point.y - mapRect.top - state.offsetY + state.height / 2
    }, state.width, state.height, mapRect);
  }

  /* During drag, follow the pointer exactly. Overlap is allowed here by design;
   * the nearest non-overlapping position is calculated only on pointer release. */
  function applyPendingMove() {
    if (moveRaf) {
      cancelAnimationFrame(moveRaf);
      moveRaf = 0;
    }
    if (!drag || !pendingPoint) return;

    var map = floorMap();
    if (!map || !map.isConnected || !drag.table.isConnected || !drag.proxy || !drag.proxy.isConnected) return;

    var mapRect = map.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;

    var desired = desiredCenterFromPoint(pendingPoint, drag, mapRect);
    writeProxyCenter(drag.proxy, desired, mapRect, drag.width, drag.height);
    drag.currentCenter = desired;
    drag.moved = drag.moved || distanceSquared(desired, drag.startCenter) > 4;
    proxyMoves++;
  }

  function queueMove(event) {
    if (!drag || !event || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return;
    pendingPoint = {x:event.clientX, y:event.clientY};
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(function () {
      moveRaf = 0;
      applyPendingMove();
    });
  }

  function disableLegacyPostDropSnap() {
    [window.PMDWaiterV60No404SmartSnap, window.PMDWaiterV61StableKioskNoJump].forEach(function (api) {
      if (!api || api.__pmdV160NoPostDropSnap) return;
      api.snapTable = function () { return false; };
      api.snapAll = function () { return 0; };
      api.__pmdV153SnapDisabled = true;
      api.__pmdV156SingleDropOnly = true;
      api.__pmdV160NoPostDropSnap = true;
    });
  }

  function startDrag(event, table) {
    if (!isEditing() || isCompact() || !table) return false;
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    if (event.isPrimary === false) return false;
    if (table.classList.contains('pmd-w19-in-merge') || table.classList.contains('pmd-v40-in-merge')) return false;

    var map = floorMap();
    if (!map) return false;

    markAuthority();
    disableLegacyPostDropSnap();

    var mapRect = map.getBoundingClientRect();
    var tableRect = table.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height || !tableRect.width || !tableRect.height) return false;

    var startCenter = {
      x: tableRect.left - mapRect.left + tableRect.width / 2,
      y: tableRect.top - mapRect.top + tableRect.height / 2
    };

    var proxy = createDragProxy(table, map, mapRect, tableRect, startCenter);
    if (!proxy) return false;

    drag = {
      table: table,
      proxy: proxy,
      pointerId: event.pointerId,
      offsetX: event.clientX - tableRect.left,
      offsetY: event.clientY - tableRect.top,
      width: tableRect.width,
      height: tableRect.height,
      startCenter: startCenter,
      currentCenter: startCenter,
      moved: false
    };
    pendingPoint = {x:event.clientX, y:event.clientY};

    var r = root();
    if (r) r.classList.add('pmd-v160-floor-dragging');
    hideDragSource(table);
    table.setAttribute('data-pmd-v160-dragging', '1');

    try {
      if (typeof table.setPointerCapture === 'function' && event.pointerId !== undefined) {
        table.setPointerCapture(event.pointerId);
      }
    } catch (error) {}

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return true;
  }

  function moveDrag(event) {
    if (!drag) return;
    if (drag.pointerId !== undefined && event.pointerId !== undefined && drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    queueMove(event);
  }


  function finishDrag(event) {
    if (!drag) return;
    if (event && drag.pointerId !== undefined && event.pointerId !== undefined && drag.pointerId !== event.pointerId) return;

    if (event && typeof event.clientX === 'number') {
      pendingPoint = {x:event.clientX, y:event.clientY};
      applyPendingMove();
    }

    var finished = drag;
    var map = floorMap();
    var mapRect = map && map.getBoundingClientRect();
    var desired = finished.currentCenter || finished.startCenter;
    var settled = desired;

    if (mapRect && mapRect.width && mapRect.height && finished.table && finished.table.isConnected) {
      var occupied = occupiedRects(finished.table, mapRect);
      settled = nearestFreeCenter(desired, finished, occupied, mapRect);
      writeCenter(finished.table, settled, mapRect);
    }

    var adjusted = distanceSquared(settled, desired) > 1;
    drag = null;
    pendingPoint = null;

    if (moveRaf) {
      cancelAnimationFrame(moveRaf);
      moveRaf = 0;
    }

    try {
      if (finished.table && typeof finished.table.releasePointerCapture === 'function' && finished.pointerId !== undefined) {
        finished.table.releasePointerCapture(finished.pointerId);
      }
    } catch (error) {}

    if (finished.table) finished.table.removeAttribute('data-pmd-v160-dragging');

    var revealRealTable = function () {
      removeDragProxy(finished.proxy);
      restoreDragSource(finished.table);
    };

    if (adjusted && finished.proxy && finished.proxy.isConnected && mapRect) {
      dropAdjustments++;
      finished.proxy.classList.remove('pmd-v160-dragging-table');
      finished.proxy.classList.add('pmd-v160-settling-table');
      setImportant(
        finished.proxy,
        'transition',
        'left 170ms cubic-bezier(.2,.8,.2,1), top 170ms cubic-bezier(.2,.8,.2,1)'
      );
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          writeProxyCenter(finished.proxy, settled, mapRect, finished.width, finished.height);
        });
      });
      setTimeout(revealRealTable, 220);
    } else {
      revealRealTable();
    }

    var r = root();
    if (r) r.classList.remove('pmd-v160-floor-dragging');
    if (finished.moved) suppressClickUntil = Date.now() + 700;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  function visibleRows() {
    var map = floorMap();
    if (!map) return [];
    var mapRect = map.getBoundingClientRect();
    return tables().filter(function (table) {
      var style = getComputedStyle(table);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    }).map(function (table) {
      var rect = table.getBoundingClientRect();
      return {
        table: table,
        rect: rect,
        centerX: rect.left - mapRect.left + rect.width / 2,
        centerY: rect.top - mapRect.top + rect.height / 2
      };
    });
  }

  function sortTablesForGrid(rows) {
    return rows.slice().sort(function (a, b) {
      var aNumber = parseFloat(String(a.table.getAttribute('data-table') || '').replace(/[^0-9.\-]/g, ''));
      var bNumber = parseFloat(String(b.table.getAttribute('data-table') || '').replace(/[^0-9.\-]/g, ''));
      if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) return aNumber - bNumber;
      return String(a.table.getAttribute('data-table') || '').localeCompare(String(b.table.getAttribute('data-table') || ''));
    });
  }

  function showRecoveryNotice() {
    var map = floorMap();
    if (!map || map.querySelector('.pmd-v160-recovery-notice')) return;
    var notice = document.createElement('div');
    notice.className = 'pmd-v160-recovery-notice';
    notice.setAttribute('role', 'status');
    notice.innerHTML = '<strong>Floor layout recovered</strong><span>The broken single-column layout was safely arranged. Open Edit Layout and press Save once to keep it.</span>';
    map.appendChild(notice);
    setTimeout(function () { notice.classList.add('is-visible'); }, 20);
  }

  function arrangeGrid(rows, mapRect) {
    if (!rows.length || !mapRect.width || !mapRect.height) return false;
    rows = sortTablesForGrid(rows);

    var maxWidth = Math.max.apply(Math, rows.map(function (row) { return row.rect.width; }));
    var maxHeight = Math.max.apply(Math, rows.map(function (row) { return row.rect.height; }));
    var usableWidth = Math.max(maxWidth, mapRect.width - MAP_PAD * 2);
    var usableHeight = Math.max(maxHeight, mapRect.height - MAP_PAD * 2);
    var aspect = usableWidth / Math.max(1, usableHeight);
    var shape = maxHeight / Math.max(1, maxWidth);
    var columns = Math.ceil(Math.sqrt(rows.length * aspect * shape));
    columns = clamp(columns, 2, rows.length);

    while (columns > 2 && usableWidth / columns < maxWidth + TABLE_GAP) columns--;
    var gridRows = Math.ceil(rows.length / columns);
    while (gridRows * (maxHeight + TABLE_GAP) > usableHeight && columns < rows.length) {
      columns++;
      gridRows = Math.ceil(rows.length / columns);
    }

    var cellWidth = usableWidth / columns;
    var cellHeight = usableHeight / gridRows;

    rows.forEach(function (row, index) {
      var column = index % columns;
      var rowIndex = Math.floor(index / columns);
      var center = {
        x: MAP_PAD + cellWidth * (column + 0.5),
        y: MAP_PAD + cellHeight * (rowIndex + 0.5)
      };
      writeCenter(row.table, center, mapRect);
    });

    return true;
  }

  function repairBrokenColumnLayout() {
    recoveryRuns++;
    var map = floorMap();
    if (!map || map.getAttribute('data-pmd-v160-column-recovered') === '1') return false;
    if (drag) return false;

    var mapRect = map.getBoundingClientRect();
    var rows = visibleRows();
    if (rows.length < 6 || !mapRect.width || !mapRect.height) return false;

    var centersX = rows.map(function (row) { return row.centerX; });
    var centersY = rows.map(function (row) { return row.centerY; });
    var maxTableWidth = Math.max.apply(Math, rows.map(function (row) { return row.rect.width; }));
    var maxTableHeight = Math.max.apply(Math, rows.map(function (row) { return row.rect.height; }));
    var xSpan = Math.max.apply(Math, centersX) - Math.min.apply(Math, centersX);
    var ySpan = Math.max.apply(Math, centersY) - Math.min.apply(Math, centersY);
    var overflowCount = rows.filter(function (row) {
      return row.rect.left < mapRect.left - 3 || row.rect.right > mapRect.right + 3 || row.rect.top < mapRect.top - 3 || row.rect.bottom > mapRect.bottom + 3;
    }).length;

    var clearlyOneColumn = xSpan <= Math.max(maxTableWidth * 1.35, mapRect.width * 0.10);
    var cannotFitVertically = ySpan + maxTableHeight > mapRect.height - MAP_PAD * 2;
    if (!clearlyOneColumn || (!cannotFitVertically && overflowCount === 0)) return false;

    if (!arrangeGrid(rows, mapRect)) return false;
    map.setAttribute('data-pmd-v160-column-recovered', '1');
    recoveredColumnLayouts++;
    showRecoveryNotice();
    console.info('[PMD] V160 repaired invalid single-column waiter floor layout', {
      tables: rows.length,
      overflowCount: overflowCount,
      xSpan: Math.round(xSpan),
      ySpan: Math.round(ySpan)
    });
    return true;
  }

  function overlapPairs() {
    var map = floorMap();
    if (!map) return [];
    var mapRect = map.getBoundingClientRect();
    var rows = occupiedRects(null, mapRect);
    var pairs = [];

    for (var i = 0; i < rows.length; i++) {
      for (var j = i + 1; j < rows.length; j++) {
        if (rectanglesOverlap(rows[i], rows[j], 0)) {
          pairs.push([
            rows[i].table.getAttribute('data-table') || '',
            rows[j].table.getAttribute('data-table') || ''
          ]);
        }
      }
    }
    return pairs;
  }

  function ensureLegend() {
    var map = floorMap();
    if (!map) return;

    var button = map.querySelector(':scope > .pmd-v61-map-info-btn');
    var card = map.querySelector(':scope > .pmd-v61-map-legend');

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-v61-map-info-btn';
      button.textContent = 'i';
      map.appendChild(button);
    }

    if (!card) {
      card = document.createElement('div');
      card.className = 'pmd-v61-map-legend';
      map.appendChild(card);
    }

    button.id = 'pmd-v160-floor-info-button';
    button.setAttribute('aria-label', 'Show floor color guide');
    button.setAttribute('aria-controls', 'pmd-v160-floor-color-guide');
    button.setAttribute('title', 'Floor color guide');

    card.id = 'pmd-v160-floor-color-guide';
    card.setAttribute('role', 'tooltip');
    if (card.getAttribute('data-pmd-v160-legend') !== '1' || !card.querySelector('.pmd-v155-legend-ribbon')) {
      card.setAttribute('data-pmd-v160-legend', '1');
      card.innerHTML = [
        '<h4>Floor status colors</h4>',
        '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-available"></span><div><b>Available</b><br>Ready for a guest.</div></div>',
        '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-occupied"></span><div><b>Occupied</b><br>Guests are seated at this table.</div></div>',
        '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-cleaning"></span><div><b>Needs cleaning</b><br>Not ready for the next guest.</div></div>',
        '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v154-dot-reserved"></span><div><b>Reserved</b><br>Held for an upcoming arrival.</div></div>',
        '<div class="pmd-v155-legend-ribbon"><span>PAID</span><span>PARTIAL</span> Payment ribbons appear only after money is recorded.</div>'
      ].join('');
    }

    if (button.getAttribute('data-pmd-v160-click-bound') !== '1') {
      button.setAttribute('data-pmd-v160-click-bound', '1');
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        card.classList.toggle('is-open');
      });
    }
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(function () {
      bindObserver();
      markAuthority();
      disableLegacyPostDropSnap();
      ensureLegend();
      repairBrokenColumnLayout();
    }, 60);
  }

  function onPointerDown(event) {
    var target = event && event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;

    if (target.closest(EDIT_SELECTOR)) {
      markAuthority();
      forceExpanded();
      editSnapshot = captureLayout();
      return;
    }

    var table = tableFromEvent(event);
    if (table) startDrag(event, table);
  }

  function onClickCapture(event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;

    if (Date.now() < suppressClickUntil && target.closest(TABLE_SELECTOR)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (target.closest(EDIT_SELECTOR)) {
      markAuthority();
      forceExpanded();
      var snapshot = editSnapshot || captureLayout();
      editSnapshot = null;
      setTimeout(function () { freezeEditGeometry(snapshot); }, 0);
      setTimeout(disableLegacyPostDropSnap, 220);
      return;
    }

    if (target.closest(SAVE_SELECTOR)) {
      var r = root();
      var snapshotBeforeSave = captureLayout();
      if (r) r.classList.add('pmd-v160-saving');
      markAuthority();
      restoreLayout(snapshotBeforeSave);
      disableLegacyPostDropSnap();
      requestAnimationFrame(function () { restoreLayout(snapshotBeforeSave); });
      setTimeout(function () {
        restoreLayout(snapshotBeforeSave);
        disableLegacyPostDropSnap();
      }, 80);
      setTimeout(function () {
        if (r) r.classList.remove('pmd-v160-saving');
      }, 2600);
    }
  }

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', moveDrag, true);
  window.addEventListener('pointerup', finishDrag, true);
  window.addEventListener('pointercancel', finishDrag, true);
  window.addEventListener('blur', finishDrag, true);
  window.addEventListener('click', onClickCapture, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    scheduleApply();
    setTimeout(function () {
      markAuthority();
      disableLegacyPostDropSnap();
      repairBrokenColumnLayout();
    }, 220);
  }, true);

  function bindObserver() {
    var currentRoot = root();
    if (!currentRoot || currentRoot === observedRoot) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleApply);
    observer.observe(currentRoot, {childList:true, subtree:true});
    observedRoot = currentRoot;
  }

  bindObserver();
  markAuthority();
  disableLegacyPostDropSnap();
  ensureLegend();
  setTimeout(function () {
    markAuthority();
    disableLegacyPostDropSnap();
    repairBrokenColumnLayout();
  }, 260);
  setTimeout(repairBrokenColumnLayout, 900);

  window.PMDWaiterFloorEditV160 = {
    active: true,
    apply: function () {
      markAuthority();
      disableLegacyPostDropSnap();
      ensureLegend();
      repairBrokenColumnLayout();
    },
    recoverColumn: function () {
      var r = root();
      var map = floorMap();
      if (map) map.removeAttribute('data-pmd-v160-column-recovered');
      return repairBrokenColumnLayout();
    },
    overlaps: overlapPairs,
    debug: function () {
      var map = floorMap();
      var tableNodes = map ? map.querySelectorAll('.pmd-w5-table[data-table]') : [];
      var api = window.PMDWaiterV61StableKioskNoJump || window.PMDWaiterV60No404SmartSnap;
      var out = {
        version: 'pmd-waiter-floor-edit-v160.6',
        active: true,
        editing: isEditing(),
        toolbarEdit: !!(toolbarState() && toolbarState().edit),
        tableTag: tableNodes.length ? tableNodes[0].tagName : null,
        compact: isCompact(),
        dragging: !!drag,
        collisionMode: 'drop-only-nearest-free',
        dragVisual: 'body-fixed-classless-proxy',
        tableGap: TABLE_GAP,
        dropAdjustments: dropAdjustments,
        proxyMoves: proxyMoves,
        proxyActive: !!(drag && drag.proxy && drag.proxy.isConnected),
        tableCount: tableNodes.length,
        overlapPairs: overlapPairs(),
        legacyPostDropSnapDisabled: !!(api && api.__pmdV160NoPostDropSnap),
        authorityClass: !!(root() && root().classList.contains('pmd-v160-layout-authority')),
        recoveryRuns: recoveryRuns,
        recoveredColumnLayouts: recoveredColumnLayouts,
        columnRecovered: !!(map && map.getAttribute('data-pmd-v160-column-recovered') === '1'),
        legendButton: !!document.querySelector(MAP_SELECTOR + ' .pmd-v61-map-info-btn'),
        legendCard: !!document.querySelector(MAP_SELECTOR + ' .pmd-v61-map-legend')
      };
      console.log(out);
      return out;
    },
    stop: function () {
      if (observer) observer.disconnect();
      if (moveRaf) cancelAnimationFrame(moveRaf);
      if (drag) {
        removeDragProxy(drag.proxy);
        restoreDragSource(drag.table);
        drag = null;
      }
      observer = null;
      observedRoot = null;
      moveRaf = 0;
    }
  };

  console.info('[PMD] Waiter floor edit V160.6 body-fixed classless proxy authority active');
})();
