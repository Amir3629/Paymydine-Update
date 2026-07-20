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

  var stableFloorSection = null;
  var stableFloorMap = null;
  var stableFloorObserver = null;
  var stableFloorRetryTimer = 0;
  var stableFloorReconciling = false;
  var stableFloorLastScrollTop = 0;
  var stableFloorReplacementsBlocked = 0;
  var stableFloorAdoptions = 0;
  var stableFloorTablesAdded = 0;
  var stableFloorTablesRemoved = 0;
  var stableFloorStatusSyncs = 0;
  var stableFloorNumberRepairs = 0;
  var stableFloorBadgeSuppressions = 0;

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

  /* V175c globally writes transform:none to anything it identifies as a floor
   * tile. Expanded waiter-floor coordinates are stored as CENTER percentages,
   * so removing translate(-50%, -50%) shifts a table by half its own size.
   * Block only that invalid write, and only for registered real floor tables. */
  var transformStyleOwners = window.PMD_V160_TRANSFORM_STYLE_OWNERS || new WeakMap();
  window.PMD_V160_TRANSFORM_STYLE_OWNERS = transformStyleOwners;

  function installRealTableTransformGuard() {
    if (window.PMD_V160_REAL_TABLE_TRANSFORM_GUARD) return;

    var originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    window.PMD_V160_ORIGINAL_STYLE_SET_PROPERTY = originalSetProperty;

    CSSStyleDeclaration.prototype.setProperty = function (property, value, priority) {
      var owner = transformStyleOwners.get(this);
      var prop = String(property == null ? '' : property).toLowerCase();
      var val = String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase();

      if (
        owner &&
        owner.isConnected &&
        prop === 'transform' &&
        val === 'none' &&
        !isCompact()
      ) {
        var map = floorMap();
        if (map && map.contains(owner)) {
          return originalSetProperty.call(
            this,
            property,
            'translate(-50%, -50%)',
            'important'
          );
        }
      }

      return originalSetProperty.apply(this, arguments);
    };

    window.PMD_V160_REAL_TABLE_TRANSFORM_GUARD = true;
  }

  function registerRealTableTransforms() {
    installRealTableTransformGuard();

    tables().forEach(function (table) {
      if (!table || !table.style) return;
      transformStyleOwners.set(table.style, table);
      setImportant(table, 'transform', 'translate(-50%, -50%)');
    });
  }

  function markAuthority() {
    var r = root();
    var map = floorMap();
    if (r) r.classList.add('pmd-v160-layout-authority');
    if (map) map.setAttribute('data-pmd-v160-layout-authority', '1');
    registerRealTableTransforms();
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

  /*
   * PMD_V191_CONTROL_OBSTACLE
   *
   * Real tables remain normal collision objects.
   * Invisible interface reserves can additionally use:
   *
   *   data-pmd-v160-obstacle="1"
   *
   * During dragging overlap remains allowed. On pointer release,
   * nearestFreeCenter treats the control reserve like an occupied
   * rectangle and selects the closest valid free position.
   */
  function occupiedRects(ignoreTable, mapRect) {
    var map = floorMap();
    if (!map) return [];

    var rects = tables().filter(function (table) {
      if (!table || table === ignoreTable) return false;

      var style = getComputedStyle(table);

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) !== 0
      );
    }).map(function (table) {
      var rect = table.getBoundingClientRect();

      return {
        table: table,
        obstacle: null,
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top
      };
    });

    Array.prototype.slice.call(
      map.querySelectorAll(
        '[data-pmd-v160-obstacle="1"]'
      )
    ).forEach(function (obstacle) {
      if (!obstacle || !obstacle.isConnected) return;

      var style = getComputedStyle(obstacle);
      var rect = obstacle.getBoundingClientRect();

      /*
       * The reserve is intentionally transparent. Its opacity and
       * visibility therefore do not determine whether it is active.
       */
      if (
        style.display === 'none' ||
        !rect.width ||
        !rect.height
      ) {
        return;
      }

      rects.push({
        table: null,
        obstacle: obstacle,
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top
      });
    });

    return rects;
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

    var tableNumber = String(table.getAttribute('data-table') || '').trim();
    var visual = getComputedStyle(table);
    var borderLeftWidth = parseFloat(visual.borderLeftWidth) || 0;
    var borderTopWidth = parseFloat(visual.borderTopWidth) || 0;
    var proxy = document.createElement('div');

    proxy.className = 'pmd-v160-drag-proxy pmd-v160-dragging-table';
    proxy.setAttribute('data-pmd-v160-proxy', '1');
    proxy.setAttribute('data-pmd-v160-proxy-table', tableNumber);
    proxy.setAttribute('aria-hidden', 'true');

    /* Copy only concrete visual properties. Never clone the live table DOM:
     * it contains hidden Available/status text and duplicate number nodes whose
     * suppression depends on live-table selectors. */
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
    setImportant(proxy, 'display', 'block');
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
    setImportant(proxy, 'padding', '0');
    setImportant(proxy, 'overflow', 'visible');

    setImportant(proxy, 'transform', 'none');
    setImportant(proxy, 'transition', 'none');
    setImportant(proxy, 'animation', 'none');
    setImportant(proxy, 'visibility', 'visible');
    setImportant(proxy, 'opacity', '1');
    setImportant(proxy, 'z-index', '2147483000');
    setImportant(proxy, 'contain', 'none');
    setImportant(proxy, 'isolation', 'isolate');
    setImportant(proxy, 'will-change', 'left, top');
    setImportant(proxy, 'user-select', 'none');

    function copyVisualTree(source, target) {
      if (!source || !target) return;

      var computed = getComputedStyle(source);
      [
        'display', 'box-sizing', 'width', 'height', 'min-width', 'min-height',
        'max-width', 'max-height', 'margin', 'padding', 'background', 'border',
        'border-radius', 'box-shadow', 'color', '-webkit-text-fill-color',
        'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
        'letter-spacing', 'text-align', 'text-shadow', 'white-space', 'opacity',
        'visibility', 'overflow', 'object-fit', 'object-position'
      ].forEach(function (property) {
        var value = computed.getPropertyValue(property);
        if (value) setImportant(target, property, value);
      });

      var sourceChildren = Array.prototype.slice.call(source.children || []);
      var targetChildren = Array.prototype.slice.call(target.children || []);
      sourceChildren.forEach(function (child, index) {
        if (targetChildren[index]) copyVisualTree(child, targetChildren[index]);
      });
    }

    function stripVisualIdentity(node) {
      if (!node) return;
      [node].concat(Array.prototype.slice.call(node.querySelectorAll('[id], [name], [data-table], [data-table-number], [data-table-no]'))).forEach(function (item) {
        item.removeAttribute('id');
        item.removeAttribute('name');
        item.removeAttribute('data-table');
        item.removeAttribute('data-table-number');
        item.removeAttribute('data-table-no');
      });
    }

    /* Exactly one center number. */
    var numberSource = table.querySelector(':scope > .pmd-v175c-table-number');
    var number = document.createElement('span');
    number.className = 'pmd-v160-proxy-number';
    number.textContent = tableNumber;

    var numberVisual = getComputedStyle(numberSource || table);
    setImportant(number, 'position', 'absolute');
    setImportant(number, 'left', '50%');
    setImportant(number, 'top', '50%');
    setImportant(number, 'right', 'auto');
    setImportant(number, 'bottom', 'auto');
    setImportant(number, 'transform', 'translate(-50%, -50%)');
    setImportant(number, 'margin', '0');
    setImportant(number, 'padding', '0');
    setImportant(number, 'display', 'block');
    setImportant(number, 'width', 'auto');
    setImportant(number, 'height', 'auto');
    setImportant(number, 'background', 'transparent');
    setImportant(number, 'border', '0');
    setImportant(number, 'box-shadow', 'none');
    setImportant(number, 'font-family', numberVisual.fontFamily || visual.fontFamily);
    setImportant(number, 'font-size', numberVisual.fontSize || visual.fontSize);
    setImportant(number, 'font-weight', numberVisual.fontWeight || visual.fontWeight);
    setImportant(number, 'font-style', numberVisual.fontStyle || 'normal');
    setImportant(number, 'line-height', numberVisual.lineHeight || '1');
    setImportant(number, 'letter-spacing', numberVisual.letterSpacing || 'normal');
    setImportant(number, 'color', numberVisual.color || visual.color);
    setImportant(number, '-webkit-text-fill-color', numberVisual.webkitTextFillColor || numberVisual.color || visual.color);
    setImportant(number, 'text-shadow', numberVisual.textShadow || 'none');
    setImportant(number, 'white-space', 'nowrap');
    setImportant(number, 'opacity', '1');
    setImportant(number, 'visibility', 'visible');
    setImportant(number, 'pointer-events', 'none');
    setImportant(number, 'z-index', '2');
    proxy.appendChild(number);

    /* Copy only small visible direct children at the top-right corner. These are
     * the waiter/cleaning/note badge and the order-count badge. */
    var visibleCornerBadges = Array.prototype.slice.call(table.children).filter(function (child) {
      if (!child || child === numberSource) return false;

      var childStyle = getComputedStyle(child);
      if (childStyle.display === 'none' || childStyle.visibility === 'hidden' || Number(childStyle.opacity) === 0) return false;

      var rect = child.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.width > 66 || rect.height > 66) return false;

      var className = String(child.className || '');
      var isKnownBadge = /badge|attention|order-count/i.test(className) || child.hasAttribute('data-pmd-kind');
      var nearTopRight = rect.left >= tableRect.right - 72 && rect.top <= tableRect.top + 36;
      return isKnownBadge && nearTopRight;
    });

    visibleCornerBadges.forEach(function (sourceBadge, index) {
      var badgeRect = sourceBadge.getBoundingClientRect();
      var badge = sourceBadge.cloneNode(true);
      stripVisualIdentity(badge);
      copyVisualTree(sourceBadge, badge);

      badge.className = 'pmd-v160-proxy-corner-badge pmd-v160-proxy-corner-badge-' + index;
      setImportant(badge, 'position', 'absolute');
      setImportant(badge, 'left', (badgeRect.left - tableRect.left - borderLeftWidth).toFixed(2) + 'px');
      setImportant(badge, 'top', (badgeRect.top - tableRect.top - borderTopWidth).toFixed(2) + 'px');
      setImportant(badge, 'right', 'auto');
      setImportant(badge, 'bottom', 'auto');
      setImportant(badge, 'width', badgeRect.width + 'px');
      setImportant(badge, 'height', badgeRect.height + 'px');
      setImportant(badge, 'min-width', badgeRect.width + 'px');
      setImportant(badge, 'min-height', badgeRect.height + 'px');
      setImportant(badge, 'max-width', badgeRect.width + 'px');
      setImportant(badge, 'max-height', badgeRect.height + 'px');
      setImportant(badge, 'margin', '0');
      setImportant(badge, 'transform', 'none');
      setImportant(badge, 'transition', 'none');
      setImportant(badge, 'animation', 'none');
      setImportant(badge, 'visibility', 'visible');
      setImportant(badge, 'opacity', '1');
      setImportant(badge, 'pointer-events', 'none');
      setImportant(badge, 'z-index', String(20 + index));
      proxy.appendChild(badge);
    });

    proxy.setAttribute('data-pmd-v160-proxy-badges', String(visibleCornerBadges.length));
    document.body.appendChild(proxy);
    writeProxyCenter(proxy, startCenter, mapRect, tableRect.width, tableRect.height);
    return proxy;
  }

  function hideDragSource(table) {
    if (!table) return;
    table.classList.add('pmd-v160-drag-source');

    /*
     * V160.11:
     * Parent opacity hides the complete original table subtree.
     * Badge authorities cannot override a parent's composited opacity.
     * The drag proxy remains the only visible moving representation.
     */
    setImportant(table, 'opacity', '0');
    setImportant(table, 'visibility', 'hidden');
    setImportant(table, 'pointer-events', 'none');
  }

  function restoreDragSource(table) {
    if (!table) return;
    table.classList.remove('pmd-v160-drag-source');
    table.style.removeProperty('opacity');
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
      transformStyleOwners.set(finished.table.style, finished.table);
      writeCenter(finished.table, settled, mapRect);
      setImportant(finished.table, 'transform', 'translate(-50%, -50%)');
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

  function stableInstallCss() {
    if (document.getElementById('pmd-v160-stable-floor-invariants')) return;

    var style = document.createElement('style');
    style.id = 'pmd-v160-stable-floor-invariants';

    style.textContent = [
      '#pmd-waiter-dashboard-root .pmd-w5-table[data-table] > .pmd-v175c-table-number{',
      'position:absolute!important;',
      'left:50%!important;',
      'top:50%!important;',
      'right:auto!important;',
      'bottom:auto!important;',
      'width:auto!important;',
      'height:auto!important;',
      'display:block!important;',
      'margin:0!important;',
      'padding:0!important;',
      'background:transparent!important;',
      'border:0!important;',
      'font-size:30px!important;',
      'line-height:1!important;',
      'font-weight:950!important;',
      'text-align:center!important;',
      'white-space:nowrap!important;',
      'color:#05070d!important;',
      '-webkit-text-fill-color:#05070d!important;',
      'text-shadow:none!important;',
      'transform:translate(-50%,-50%)!important;',
      'pointer-events:none!important;',
      'z-index:20!important;',
      '}',

      '#pmd-waiter-dashboard-root ',
      '.pmd-w5-table[data-table]:has(> .pmd-v175c-attention-badge) > small,',
      '#pmd-waiter-dashboard-root ',
      '.pmd-w5-table[data-table]:has(> .pmd-v175c-attention-badge) ',
      '> .pmd-v183-order-count-badge{',
      'display:none!important;',
      'visibility:hidden!important;',
      'opacity:0!important;',
      'pointer-events:none!important;',
      '}',

      '#pmd-waiter-dashboard-root ',
      '.pmd-w5-table[data-table] > .pmd-v175c-attention-badge{',
      'visibility:visible!important;',
      'opacity:1!important;',
      '}'
    ].join('');

    (document.head || document.documentElement).appendChild(style);
  }

  function stableSection(currentRoot) {
    if (!currentRoot) return null;
    var sections = Array.prototype.slice.call(currentRoot.querySelectorAll('section.pmd-w5-floor'));
    for (var index = 0; index < sections.length; index++) {
      if (sections[index].querySelector('.pmd-w5-floor-map-real')) return sections[index];
    }
    return null;
  }

  function stableMapFor(section) {
    return section ? section.querySelector('.pmd-w5-floor-map-real') : null;
  }

  function stableTables(map) {
    return map
      ? Array.prototype.slice.call(map.querySelectorAll('.pmd-w5-table[data-table]:not(.pmd-v160-drag-proxy)'))
      : [];
  }

  function stableNo(table) {
    return String(table && table.getAttribute('data-table') || '').replace(/\s+/g, '').trim();
  }

  function stableText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function stableByNumber(map) {
    var result = new Map();
    stableTables(map).forEach(function (table) {
      var number = stableNo(table);
      if (number && !result.has(number)) result.set(number, table);
    });
    return result;
  }

  function stableOrderCounts(table) {
    if (!table) return [];
    return Array.prototype.slice.call(table.children).filter(function (child) {
      if (!child || child.nodeType !== 1) return false;
      if (child.classList.contains('pmd-v175c-attention-badge')) return false;
      if (child.classList.contains('pmd-v175c-table-number')) return false;
      return child.tagName === 'SMALL' || /order[-_ ]?count|pmd-v183-order-count-badge/i.test(String(child.className || ''));
    });
  }

  function stableEnsureNumber(table) {
    var number = stableNo(table);
    if (!number) return null;

    var label = table.querySelector(':scope > .pmd-v175c-table-number');
    if (!label) {
      label = Array.prototype.slice.call(table.children).find(function (child) {
        return child.tagName === 'SPAN' && stableText(child.textContent) === number;
      }) || null;

      if (!label) {
        label = document.createElement('span');
        table.appendChild(label);
      }

      label.classList.add('pmd-v175c-table-number');
      stableFloorNumberRepairs++;
    }

    if (label.textContent !== number) {
      label.textContent = number;
      stableFloorNumberRepairs++;
    }

    label.classList.remove('pmd-v175c-hide-dupe-number');
    label.removeAttribute('aria-hidden');

    /*
     * V160.11 exact table-number center authority.
     * Do not rely on grid/flex inherited from older floor layers.
     */
    setImportant(label, 'position', 'absolute');
    setImportant(label, 'left', '50%');
    setImportant(label, 'top', '50%');
    setImportant(label, 'right', 'auto');
    setImportant(label, 'bottom', 'auto');
    setImportant(label, 'width', 'auto');
    setImportant(label, 'height', 'auto');
    setImportant(label, 'display', 'block');
    setImportant(label, 'margin', '0');
    setImportant(label, 'padding', '0');
    setImportant(label, 'transform', 'translate(-50%, -50%)');
    setImportant(label, 'font-size', '30px');
    setImportant(label, 'line-height', '1');
    setImportant(label, 'font-weight', '950');
    setImportant(label, 'text-align', 'center');
    setImportant(label, 'white-space', 'nowrap');
    setImportant(label, 'pointer-events', 'none');
    setImportant(label, 'z-index', '20');

    Array.prototype.slice.call(table.childNodes).forEach(function (node) {
      if (node === label) return;
      if (node.nodeType === 3) {
        if (stableText(node.nodeValue) === number) node.nodeValue = '';
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.classList.contains('pmd-v175c-attention-badge')) return;
      if (stableOrderCounts(table).indexOf(node) !== -1) return;
      if (stableText(node.textContent) !== number) return;
      node.classList.add('pmd-v175c-hide-dupe-number');
      node.setAttribute('aria-hidden', 'true');
      setImportant(node, 'display', 'none');
    });

    return label;
  }

  function stableEnsureSingleBadge(table) {
    var attention = Array.prototype.slice.call(
      table.querySelectorAll(':scope > .pmd-v175c-attention-badge')
    );

    attention.slice(1).forEach(function (badge) {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    });

    var primaryAttention = attention.length ? attention[0] : null;
    var counts = stableOrderCounts(table);

    counts.forEach(function (count, index) {
      count.classList.add('pmd-v183-order-count-badge');
      var suppress = !!primaryAttention || index > 0;

      if (suppress) {
        if (!count.classList.contains('pmd-v160-suppressed-order-count')) {
          stableFloorBadgeSuppressions++;
          count.classList.add('pmd-v160-suppressed-order-count');
        }
        count.setAttribute('aria-hidden', 'true');
        setImportant(count, 'display', 'none');
      } else {
        count.classList.remove('pmd-v160-suppressed-order-count');
        count.removeAttribute('aria-hidden');
        if (count.style.getPropertyValue('display') === 'none') count.style.removeProperty('display');
      }
    });
  }

  function stableNormalizeTable(table) {
    if (!table) return;

    table.classList.add('pmd-v175c-floor-tile');
    transformStyleOwners.set(table.style, table);

    setImportant(table, 'position', 'absolute');
    setImportant(table, 'right', 'auto');
    setImportant(table, 'bottom', 'auto');
    setImportant(table, 'margin', '0');
    setImportant(table, 'width', '104px');
    setImportant(table, 'height', '86px');
    setImportant(table, 'min-width', '104px');
    setImportant(table, 'min-height', '86px');
    setImportant(table, 'max-width', '104px');
    setImportant(table, 'max-height', '86px');
    setImportant(table, 'transform', 'translate(-50%, -50%)');
    setImportant(table, 'transition', 'none');
    setImportant(table, 'animation', 'none');
    setImportant(table, 'overflow', 'visible');

    stableEnsureNumber(table);
    stableEnsureSingleBadge(table);
  }

  function stableNormalizeAll() {
    stableTables(stableFloorMap).forEach(stableNormalizeTable);
  }

  function stableSyncCount(oldTable, freshTable) {
    var fresh = stableOrderCounts(freshTable);
    var current = stableOrderCounts(oldTable);

    if (!fresh.length) {
      current.forEach(function (count) {
        if (count.parentNode) count.parentNode.removeChild(count);
      });
      return;
    }

    var count = current.length ? current[0] : null;
    if (!count) {
      count = fresh[0].cloneNode(true);
      oldTable.appendChild(count);
    }

    var nextText = stableText(fresh[0].textContent);
    if (stableText(count.textContent) !== nextText) count.textContent = nextText;

    current.slice(1).forEach(function (extra) {
      if (extra.parentNode) extra.parentNode.removeChild(extra);
    });
  }

  function stableSyncTable(oldTable, freshTable) {
    var dataClasses = [
      'is-active', 'is-ready', 'is-payment', 'is-urgent', 'is-selected',
      'has-orders', 'busy', 'available', 'free', 'payment', 'waiting',
      'note', 'call', 'needs', 'attention'
    ];

    dataClasses.forEach(function (className) {
      oldTable.classList.toggle(className, freshTable.classList.contains(className));
    });

    ['title', 'aria-label', 'aria-pressed'].forEach(function (attribute) {
      var value = freshTable.getAttribute(attribute);
      if (value == null) oldTable.removeAttribute(attribute);
      else oldTable.setAttribute(attribute, value);
    });

    stableSyncCount(oldTable, freshTable);
    stableNormalizeTable(oldTable);
    stableFloorStatusSyncs++;
  }

  function stableInsertTable(table) {
    var anchor = stableFloorMap && stableFloorMap.querySelector(
      ':scope > .pmd-v61-map-info-btn, :scope > .pmd-v61-map-legend, :scope > .pmd-v160-recovery-notice'
    );
    stableFloorMap.insertBefore(table, anchor || null);
  }

  function stableAdopt(section) {
    var map = stableMapFor(section);
    if (!section || !map) return false;
    stableFloorSection = section;
    stableFloorMap = map;
    stableFloorAdoptions++;
    stableNormalizeAll();
    return true;
  }

  function stableReconcile(reason) {
    var currentRoot = root();
    if (!currentRoot || stableFloorReconciling) return false;

    var freshSection = stableSection(currentRoot);
    if (!freshSection) return false;
    if (!stableFloorSection || !stableFloorMap) return stableAdopt(freshSection);

    if (freshSection === stableFloorSection) {
      stableNormalizeAll();
      return false;
    }

    var freshMap = stableMapFor(freshSection);
    if (!freshMap) return false;

    stableFloorReconciling = true;
    try {
      var freshByNo = stableByNumber(freshMap);
      var oldByNo = stableByNumber(stableFloorMap);

      freshByNo.forEach(function (freshTable, number) {
        var oldTable = oldByNo.get(number);
        if (oldTable) {
          stableSyncTable(oldTable, freshTable);
        } else {
          stableNormalizeTable(freshTable);
          stableInsertTable(freshTable);
          stableFloorTablesAdded++;
        }
      });

      if (freshByNo.size > 0) {
        oldByNo.forEach(function (oldTable, number) {
          if (!freshByNo.has(number)) {
            oldTable.remove();
            stableFloorTablesRemoved++;
          }
        });
      }

      freshSection.replaceWith(stableFloorSection);
      stableFloorReplacementsBlocked++;
      stableNormalizeAll();
      markAuthority();
      ensureLegend();
      currentRoot.scrollTop = stableFloorLastScrollTop;
      return true;
    } finally {
      stableFloorReconciling = false;
    }
  }

  function stableInstall() {
    stableInstallCss();
    var currentRoot = root();
    if (!currentRoot) {
      clearTimeout(stableFloorRetryTimer);
      stableFloorRetryTimer = setTimeout(stableInstall, 40);
      return;
    }

    if (!stableFloorSection) stableAdopt(stableSection(currentRoot));
    if (stableFloorObserver) return;

    stableFloorLastScrollTop = currentRoot.scrollTop || 0;
    currentRoot.addEventListener('scroll', function () {
      stableFloorLastScrollTop = currentRoot.scrollTop || 0;
    }, {passive:true});

    stableFloorObserver = new MutationObserver(function (mutations) {
      if (stableFloorReconciling) return;

      var currentSection = stableSection(currentRoot);
      if (currentSection && currentSection !== stableFloorSection) {
        stableReconcile('root-replacement');
        return;
      }

      var touchesFloor = mutations.some(function (mutation) {
        var target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : null;
        return !!(target && stableFloorSection && (
          target === stableFloorSection || stableFloorSection.contains(target)
        ));
      });

      if (touchesFloor) stableNormalizeAll();
    });

    stableFloorObserver.observe(currentRoot, {childList:true, subtree:true});
  }

  function stableVisibleBadgeCount(table) {
    return Array.prototype.slice.call(table.children).filter(function (child) {
      if (!child.classList) return false;
      var badge = child.classList.contains('pmd-v175c-attention-badge') ||
        child.classList.contains('pmd-v183-order-count-badge') || child.tagName === 'SMALL';
      if (!badge) return false;
      var style = getComputedStyle(child);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    }).length;
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
    stableInstall();
    stableReconcile('dashboard-rendered');
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
  stableInstall();
  stableReconcile('v160-boot');
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
      stableInstall();
      stableReconcile('manual-apply');
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
        version: 'pmd-waiter-floor-edit-v160.14',
        active: true,
        editing: isEditing(),
        toolbarEdit: !!(toolbarState() && toolbarState().edit),
        tableTag: tableNodes.length ? tableNodes[0].tagName : null,
        compact: isCompact(),
        dragging: !!drag,
        collisionMode: 'drop-only-nearest-free',
        dragVisual: 'body-fixed-clean-shell',
        proxyContent: 'one-number-visible-corner-badges-only',
        badgeOrigin: 'border-box-corrected',
        dragSourceIsolation: 'parent-opacity-zero',
        tableNumberCenter: 'absolute-50-50',
        cornerBadgeLook: 'refined-small-apple-bite',
        blackBadgeRingRemoved: true,
        floorDomMode: 'stable-section-reconcile',
        firstPaintNumberLocked: !!document.getElementById('pmd-v160-stable-floor-invariants'),
        singleBadgeCssInvariant: true,
        stableFloorConnected: !!(stableFloorSection && stableFloorSection.isConnected),
        stableFloorNodePreserved: stableSection(root()) === stableFloorSection,
        v5FloorReplacementsBlocked: stableFloorReplacementsBlocked,
        stableFloorAdoptions: stableFloorAdoptions,
        stableFloorTablesAdded: stableFloorTablesAdded,
        stableFloorTablesRemoved: stableFloorTablesRemoved,
        stableFloorStatusSyncs: stableFloorStatusSyncs,
        canonicalNumberRepairs: stableFloorNumberRepairs,
        suppressedSecondaryBadges: stableFloorBadgeSuppressions,
        numberMismatchTables: Array.prototype.slice.call(tableNodes).filter(function (table) {
          var number = table.getAttribute('data-table') || '';
          var labels = table.querySelectorAll(':scope > .pmd-v175c-table-number');
          return labels.length !== 1 || stableText(labels[0].textContent) !== number;
        }).map(function (table) { return table.getAttribute('data-table') || ''; }),
        multipleVisibleBadgeTables: Array.prototype.slice.call(tableNodes).filter(function (table) {
          return stableVisibleBadgeCount(table) > 1;
        }).map(function (table) { return table.getAttribute('data-table') || ''; }),
        tableGap: TABLE_GAP,
        dropAdjustments: dropAdjustments,
        proxyMoves: proxyMoves,
        proxyActive: !!(drag && drag.proxy && drag.proxy.isConnected),
        transformGuardActive: !!window.PMD_V160_REAL_TABLE_TRANSFORM_GUARD,
        transformMismatchTables: Array.prototype.slice.call(tableNodes).filter(function (table) {
          return table.style.getPropertyValue('transform') !== 'translate(-50%, -50%)';
        }).map(function (table) {
          return table.getAttribute('data-table') || '';
        }),
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
      if (stableFloorObserver) stableFloorObserver.disconnect();
      clearTimeout(stableFloorRetryTimer);
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

  /*
   * V160.14 exact badge-only bite authority.
   *
   * Never targets generic SMALL/SPAN elements.
   * Only these real status elements are affected:
   *   .pmd-v175c-attention-badge
   *   .pmd-v183-order-count-badge
   *   .pmd-v160-proxy-corner-badge
   */
  (function installExactBadgeOnlyBiteV16014() {
    if (window.PMD_EXACT_BADGE_BITE_V16014) return;
    window.PMD_EXACT_BADGE_BITE_V16014 = true;

    var ROOT = '#pmd-waiter-dashboard-root';
    var TABLE = ROOT + ' .pmd-w5-floor-map-real .pmd-w5-table[data-table]';
    var PROXY = 'body > .pmd-v160-drag-proxy';

    var rootObserver = null;
    var observedRoot = null;
    var bodyObserver = null;
    var raf = 0;

    function imp(element, property, value) {
      if (!element || !element.style) return;

      if (
        element.style.getPropertyValue(property) === value &&
        element.style.getPropertyPriority(property) === 'important'
      ) {
        return;
      }

      element.style.setProperty(property, value, 'important');
    }

    function directChildren(holder, className) {
      if (!holder) return [];

      return Array.prototype.slice.call(holder.children).filter(function (child) {
        return child.classList && child.classList.contains(className);
      });
    }

    function attentionBadges(holder) {
      return directChildren(holder, 'pmd-v175c-attention-badge');
    }

    function orderBadges(holder) {
      return directChildren(holder, 'pmd-v183-order-count-badge');
    }

    function proxyBadges(holder) {
      return directChildren(holder, 'pmd-v160-proxy-corner-badge');
    }

    function visible(element) {
      if (!element || !element.isConnected) return false;

      var style = getComputedStyle(element);
      var rect = element.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function floorBackground() {
      var map = document.querySelector(
        ROOT + ' .pmd-w5-floor-map-real'
      );

      if (!map) return '#ffffff';

      var color = getComputedStyle(map).backgroundColor;

      if (
        !color ||
        color === 'transparent' ||
        color === 'rgba(0, 0, 0, 0)'
      ) {
        return '#ffffff';
      }

      return color;
    }

    function ensureCutout(holder, activeBadge) {
      var existing = Array.prototype.slice
        .call(holder.children)
        .find(function (child) {
          return child.classList &&
            child.classList.contains('pmd-v160-bite-cutout');
        }) || null;

      if (!activeBadge) {
        if (existing) existing.remove();
        holder.classList.remove('pmd-v160-has-bite');
        return null;
      }

      var cutout = existing;

      if (!cutout) {
        cutout = document.createElement('span');
        cutout.className = 'pmd-v160-bite-cutout';
        cutout.setAttribute('aria-hidden', 'true');
        holder.insertBefore(cutout, activeBadge);
      }

      holder.classList.add('pmd-v160-has-bite');

      imp(holder, 'overflow', 'visible');

      imp(cutout, 'position', 'absolute');
      imp(cutout, 'top', '-18px');
      imp(cutout, 'right', '-18px');
      imp(cutout, 'left', 'auto');
      imp(cutout, 'bottom', 'auto');

      imp(cutout, 'width', '38px');
      imp(cutout, 'height', '38px');
      imp(cutout, 'min-width', '38px');
      imp(cutout, 'min-height', '38px');
      imp(cutout, 'max-width', '38px');
      imp(cutout, 'max-height', '38px');

      imp(cutout, 'display', 'block');
      imp(cutout, 'margin', '0');
      imp(cutout, 'padding', '0');

      imp(cutout, 'background', floorBackground());
      imp(cutout, 'border', '0');
      imp(cutout, 'border-radius', '999px');
      imp(cutout, 'box-shadow', 'none');

      imp(cutout, 'transform', 'none');
      imp(cutout, 'transition', 'none');
      imp(cutout, 'animation', 'none');

      imp(cutout, 'pointer-events', 'none');
      imp(cutout, 'z-index', '140');

      return cutout;
    }

    function hideBadge(badge) {
      if (!badge) return;

      imp(badge, 'display', 'none');
      imp(badge, 'visibility', 'hidden');
      imp(badge, 'opacity', '0');
      imp(badge, 'pointer-events', 'none');

      badge.setAttribute('aria-hidden', 'true');
    }

    function showBadge(badge, type) {
      if (!badge) return;

      badge.removeAttribute('aria-hidden');

      imp(badge, 'position', 'absolute');
      imp(badge, 'inset', 'auto');
      imp(badge, 'top', '-12px');
      imp(badge, 'right', '-12px');
      imp(badge, 'left', 'auto');
      imp(badge, 'bottom', 'auto');

      imp(badge, 'width', '30px');
      imp(badge, 'height', '30px');
      imp(badge, 'min-width', '30px');
      imp(badge, 'min-height', '30px');
      imp(badge, 'max-width', '30px');
      imp(badge, 'max-height', '30px');

      imp(badge, 'display', 'flex');
      imp(badge, 'align-items', 'center');
      imp(badge, 'justify-content', 'center');

      imp(badge, 'margin', '0');
      imp(badge, 'padding', '0');
      imp(badge, 'box-sizing', 'border-box');

      /*
       * These direct inline !important values beat V183's existing
       * black-ring inline declarations.
       */
      imp(badge, 'background', 'transparent');
      imp(badge, 'background-color', 'transparent');

      imp(badge, 'border', '0');
      imp(badge, 'border-top', '0');
      imp(badge, 'border-right', '0');
      imp(badge, 'border-bottom', '0');
      imp(badge, 'border-left', '0');

      imp(badge, 'outline', '0');
      imp(badge, 'box-shadow', 'none');
      imp(badge, 'border-radius', '0');

      imp(badge, 'color', '#061225');
      imp(badge, '-webkit-text-fill-color', '#061225');
      imp(badge, 'font-size', type === 'order' ? '18px' : '24px');
      imp(badge, 'font-weight', '950');
      imp(badge, 'line-height', '1');
      imp(badge, 'text-align', 'center');
      imp(badge, 'text-shadow', 'none');

      imp(badge, 'overflow', 'visible');
      imp(badge, 'opacity', '1');
      imp(badge, 'visibility', 'visible');

      imp(badge, 'transform', 'none');
      imp(badge, 'translate', 'none');
      imp(badge, 'transition', 'none');
      imp(badge, 'animation', 'none');

      imp(badge, 'pointer-events', 'none');
      imp(badge, 'z-index', '150');

      var image = badge.querySelector('img');

      if (image) {
        imp(image, 'width', '26px');
        imp(image, 'height', '26px');
        imp(image, 'min-width', '26px');
        imp(image, 'min-height', '26px');
        imp(image, 'max-width', '26px');
        imp(image, 'max-height', '26px');

        imp(image, 'display', 'block');
        imp(image, 'object-fit', 'contain');

        imp(image, 'background', 'transparent');
        imp(image, 'border', '0');
        imp(image, 'outline', '0');
        imp(image, 'box-shadow', 'none');

        imp(image, 'margin', '0');
        imp(image, 'padding', '0');

        imp(image, 'transform', 'none');
        imp(image, 'transition', 'none');
        imp(image, 'animation', 'none');
      }
    }

    function centerNumber(table) {
      if (!table) return;

      var number = directChildren(
        table,
        'pmd-v175c-table-number'
      )[0];

      if (!number) return;

      imp(number, 'position', 'absolute');
      imp(number, 'inset', 'auto');

      imp(number, 'left', '50%');
      imp(number, 'top', '50%');
      imp(number, 'right', 'auto');
      imp(number, 'bottom', 'auto');

      imp(number, 'width', 'auto');
      imp(number, 'height', 'auto');

      imp(number, 'display', 'block');
      imp(number, 'margin', '0');
      imp(number, 'padding', '0');

      imp(number, 'background', 'transparent');
      imp(number, 'border', '0');
      imp(number, 'box-shadow', 'none');

      imp(number, 'font-size', '30px');
      imp(number, 'font-weight', '950');
      imp(number, 'line-height', '1');
      imp(number, 'text-align', 'center');
      imp(number, 'white-space', 'nowrap');

      imp(number, 'transform', 'translate(-50%, -50%)');
      imp(number, 'transition', 'none');
      imp(number, 'animation', 'none');

      imp(number, 'pointer-events', 'none');
      imp(number, 'z-index', '20');
    }

    function polishHolder(holder, isProxy) {
      if (!holder) return;

      var attention = isProxy
        ? proxyBadges(holder)
        : attentionBadges(holder);

      var orders = isProxy
        ? []
        : orderBadges(holder);

      var active = null;
      var type = 'attention';

      /*
       * Attention/cleaning/note wins over the order count.
       * Otherwise use exactly one order-count badge.
       */
      var visibleAttention = attention.filter(visible);
      var visibleOrders = orders.filter(visible);

      if (visibleAttention.length) {
        active = visibleAttention[0];
        type = 'attention';
      } else if (visibleOrders.length) {
        active = visibleOrders[0];
        type = 'order';
      } else if (attention.length) {
        active = attention[0];
        type = 'attention';
      } else if (orders.length) {
        active = orders[0];
        type = 'order';
      }

      attention.forEach(function (badge) {
        if (badge === active) showBadge(badge, 'attention');
        else hideBadge(badge);
      });

      orders.forEach(function (badge) {
        if (badge === active) showBadge(badge, 'order');
        else hideBadge(badge);
      });

      ensureCutout(holder, active);

      if (!isProxy) centerNumber(holder);
    }

    function apply() {
      Array.prototype.slice
        .call(document.querySelectorAll(TABLE))
        .forEach(function (table) {
          polishHolder(table, false);
        });

      Array.prototype.slice
        .call(document.querySelectorAll(PROXY))
        .forEach(function (proxy) {
          polishHolder(proxy, true);
        });

      bindRootObserver();
    }

    function schedule() {
      if (raf) return;

      raf = requestAnimationFrame(function () {
        raf = 0;
        apply();
      });
    }

    function bindRootObserver() {
      var currentRoot = document.querySelector(ROOT);

      if (!currentRoot || currentRoot === observedRoot) return;

      if (rootObserver) rootObserver.disconnect();

      rootObserver = new MutationObserver(schedule);
      rootObserver.observe(currentRoot, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      observedRoot = currentRoot;
    }

    bodyObserver = new MutationObserver(schedule);
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener(
      'pmd-waiter-dashboard-rendered',
      schedule,
      true
    );

    bindRootObserver();
    apply();

    setTimeout(apply, 100);
    setTimeout(apply, 300);
    setTimeout(apply, 900);
    setTimeout(apply, 1800);

    window.PMDCornerBiteV16014 = {
      active: true,
      apply: apply,

      debug: function () {
        var tables = Array.prototype.slice.call(
          document.querySelectorAll(TABLE)
        );

        var blackRingBadges = tables.flatMap(function (table) {
          return attentionBadges(table).concat(orderBadges(table));
        }).filter(function (badge) {
          var style = getComputedStyle(badge);

          return (
            parseFloat(style.borderTopWidth) > 0 ||
            style.boxShadow !== 'none'
          );
        }).map(function (badge) {
          return badge.closest('[data-table]')
            ? badge.closest('[data-table]').getAttribute('data-table')
            : '';
        });

        var offCenterNumbers = tables.filter(function (table) {
          var number = directChildren(
            table,
            'pmd-v175c-table-number'
          )[0];

          if (!number) return true;

          var tableRect = table.getBoundingClientRect();
          var numberRect = number.getBoundingClientRect();

          var dx = Math.abs(
            tableRect.left + tableRect.width / 2 -
            (numberRect.left + numberRect.width / 2)
          );

          var dy = Math.abs(
            tableRect.top + tableRect.height / 2 -
            (numberRect.top + numberRect.height / 2)
          );

          return dx > 1 || dy > 1;
        }).map(function (table) {
          return table.getAttribute('data-table') || '';
        });

        var result = {
          version: 'pmd-waiter-floor-edit-v160.14',
          style: 'refined-small-apple-bite',
          biteGeometry: {
            cutoutSizePx: 38,
            cutoutOffsetPx: -18,
            tableOverlapPx: 20,
            badgeSizePx: 30,
            badgeOffsetPx: -12
          },
          blackRingBadges: blackRingBadges,
          offCenterNumbers: offCenterNumbers,
          cutouts: document.querySelectorAll(
            TABLE + ' > .pmd-v160-bite-cutout'
          ).length,
          proxyCutouts: document.querySelectorAll(
            PROXY + ' > .pmd-v160-bite-cutout'
          ).length
        };

        console.log(result);
        return result;
      },

      stop: function () {
        if (rootObserver) rootObserver.disconnect();
        if (bodyObserver) bodyObserver.disconnect();
        if (raf) cancelAnimationFrame(raf);

        rootObserver = null;
        bodyObserver = null;
        observedRoot = null;
        raf = 0;
      }
    };
  })();

  console.info('[PMD] Waiter floor edit V160.14 refined small Apple-bite active');
})();
