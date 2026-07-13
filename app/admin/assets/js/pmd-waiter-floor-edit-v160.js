(function () {
  'use strict';

  if (!/\/admin\/dashboardwaiter\/?$/.test(location.pathname)) return;
  if (window.PMD_WAITER_FLOOR_EDIT_V160) return;
  window.PMD_WAITER_FLOOR_EDIT_V160 = true;

  var ROOT_SELECTOR = '#pmd-waiter-dashboard-root';
  var MAP_SELECTOR = ROOT_SELECTOR + ' .pmd-w5-floor-map-real';
  var TABLE_SELECTOR = MAP_SELECTOR + ' .pmd-w5-table[data-table]';
  var EDIT_SELECTOR = ROOT_SELECTOR + ' [data-w19-edit]';
  var SAVE_SELECTOR = ROOT_SELECTOR + ' [data-w19-save]';
  var COMPACT_SELECTOR = ROOT_SELECTOR + ' .pmd-w19-tools button[data-w19-compact]';
  var MAP_PAD = 12;
  var TABLE_GAP = 8;
  var MOVE_STEP = 4;

  var drag = null;
  var pendingPoint = null;
  var moveRaf = 0;
  var suppressClickUntil = 0;
  var legendCreated = false;
  var observer = null;
  var observedRoot = null;
  var applyTimer = 0;

  function root() {
    return document.querySelector(ROOT_SELECTOR);
  }

  function floorMap() {
    var r = root();
    return r ? r.querySelector('.pmd-w5-floor-map-real') : null;
  }

  function isEditing() {
    var r = root();
    return !!(r && r.classList.contains('pmd-w19-editing'));
  }

  function isCompact() {
    var r = root();
    return !!(r && r.classList.contains('pmd-w19-compact'));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function percent(value) {
    return (Math.round(value * 100) / 100).toFixed(2) + '%';
  }

  function distanceSquared(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function tableFromEvent(event) {
    var target = event && event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return null;
    if (target.closest('button, a, input, textarea, select, [role="button"], .pmd-w19-unmerge, .pmd-v40-unmerge')) return null;
    return target.closest(TABLE_SELECTOR);
  }

  function tableRectAt(center, width, height) {
    return {
      left: center.x - width / 2,
      top: center.y - height / 2,
      right: center.x + width / 2,
      bottom: center.y + height / 2
    };
  }

  function rectanglesOverlap(a, b) {
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

    return Array.prototype.slice.call(map.querySelectorAll('.pmd-w5-table[data-table]')).filter(function (table) {
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
      return rectanglesOverlap(candidate, rect);
    });
  }

  function walkUntilBlocked(start, target, width, height, occupied) {
    var dx = target.x - start.x;
    var dy = target.y - start.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.5) return {x:start.x, y:start.y};

    var steps = Math.max(1, Math.ceil(distance / MOVE_STEP));
    var last = {x:start.x, y:start.y};

    for (var index = 1; index <= steps; index++) {
      var ratio = index / steps;
      var point = {
        x: start.x + dx * ratio,
        y: start.y + dy * ratio
      };
      if (!centerIsClear(point, width, height, occupied)) break;
      last = point;
    }

    return last;
  }

  function resolveCenter(desired, state, occupied) {
    var line = walkUntilBlocked(state.lastValid, desired, state.width, state.height, occupied);
    if (distanceSquared(line, desired) < 1 && centerIsClear(desired, state.width, state.height, occupied)) {
      return desired;
    }
    var horizontal = walkUntilBlocked(line, {x:desired.x, y:line.y}, state.width, state.height, occupied);
    var vertical = walkUntilBlocked(line, {x:line.x, y:desired.y}, state.width, state.height, occupied);
    var candidates = [line, horizontal, vertical];

    candidates.sort(function (a, b) {
      return distanceSquared(a, desired) - distanceSquared(b, desired);
    });

    return candidates[0] || state.lastValid;
  }

  function writeCenter(table, center, mapRect) {
    table.style.left = percent((center.x / mapRect.width) * 100);
    table.style.top = percent((center.y / mapRect.height) * 100);
    table.style.position = 'absolute';
    table.style.transform = 'translate(-50%, -50%)';
  }

  function applyPendingMove() {
    if (moveRaf) {
      cancelAnimationFrame(moveRaf);
      moveRaf = 0;
    }
    if (!drag || !pendingPoint) return;

    var map = floorMap();
    if (!map || !map.isConnected || !drag.table.isConnected) return;

    var mapRect = map.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;

    var desired = {
      x: pendingPoint.x - mapRect.left - drag.offsetX + drag.width / 2,
      y: pendingPoint.y - mapRect.top - drag.offsetY + drag.height / 2
    };

    desired.x = clamp(desired.x, drag.width / 2 + MAP_PAD, mapRect.width - drag.width / 2 - MAP_PAD);
    desired.y = clamp(desired.y, drag.height / 2 + MAP_PAD, mapRect.height - drag.height / 2 - MAP_PAD);

    var occupied = occupiedRects(drag.table, mapRect);
    var resolved = resolveCenter(desired, drag, occupied);
    var blocked = distanceSquared(resolved, desired) > 2;

    writeCenter(drag.table, resolved, mapRect);
    drag.lastValid = resolved;
    drag.moved = drag.moved || distanceSquared(resolved, drag.startCenter) > 4;
    drag.table.classList.toggle('pmd-v160-collision-blocked', blocked);
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

  function startDrag(event) {
    if (!isEditing() || isCompact()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.isPrimary === false) return;

    var table = tableFromEvent(event);
    if (!table) return;
    if (table.classList.contains('pmd-w19-in-merge') || table.classList.contains('pmd-v40-in-merge')) return;

    var map = floorMap();
    if (!map) return;

    var mapRect = map.getBoundingClientRect();
    var tableRect = table.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height || !tableRect.width || !tableRect.height) return;

    disableLegacyPostDropSnap();

    var startCenter = {
      x: tableRect.left - mapRect.left + tableRect.width / 2,
      y: tableRect.top - mapRect.top + tableRect.height / 2
    };

    drag = {
      table: table,
      pointerId: event.pointerId,
      offsetX: event.clientX - tableRect.left,
      offsetY: event.clientY - tableRect.top,
      width: tableRect.width,
      height: tableRect.height,
      startCenter: startCenter,
      lastValid: startCenter,
      moved: false
    };
    pendingPoint = {x:event.clientX, y:event.clientY};

    var r = root();
    if (r) r.classList.add('pmd-v160-floor-dragging');
    table.classList.add('pmd-v160-dragging-table');
    table.classList.remove('pmd-v160-collision-blocked');
    table.setAttribute('data-pmd-v160-dragging', '1');

    try {
      if (typeof table.setPointerCapture === 'function' && event.pointerId !== undefined) {
        table.setPointerCapture(event.pointerId);
      }
    } catch (error) {}

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
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

    if (finished.table) {
      finished.table.classList.remove('pmd-v160-dragging-table', 'pmd-v160-collision-blocked');
      finished.table.removeAttribute('data-pmd-v160-dragging');
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

  function overlapPairs() {
    var map = floorMap();
    if (!map) return [];
    var mapRect = map.getBoundingClientRect();
    var rows = occupiedRects(null, mapRect);
    var pairs = [];

    for (var i = 0; i < rows.length; i++) {
      for (var j = i + 1; j < rows.length; j++) {
        if (rectanglesOverlap(rows[i], rows[j])) {
          pairs.push([
            rows[i].table.getAttribute('data-table') || '',
            rows[j].table.getAttribute('data-table') || ''
          ]);
        }
      }
    }
    return pairs;
  }

  function ensureExpandedForEdit() {
    setTimeout(function () {
      if (!isEditing() || !isCompact()) return;
      if (window.PMDFloorDeterministicV190 && typeof window.PMDFloorDeterministicV190.expand === 'function') {
        window.PMDFloorDeterministicV190.expand();
        return;
      }
      var button = document.querySelector(COMPACT_SELECTOR);
      if (button) button.click();
    }, 40);
  }

  function ensureLegend() {
    var map = floorMap();
    if (!map) return;

    var button = map.querySelector(':scope > .pmd-v61-map-info-btn');
    var card = map.querySelector(':scope > .pmd-v61-map-legend');
    var createdButton = false;

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-v61-map-info-btn';
      button.textContent = 'i';
      map.appendChild(button);
      createdButton = true;
      legendCreated = true;
    }

    if (!card) {
      card = document.createElement('div');
      card.className = 'pmd-v61-map-legend';
      map.appendChild(card);
      legendCreated = true;
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

    if (createdButton && button.getAttribute('data-pmd-v160-click-bound') !== '1') {
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
      disableLegacyPostDropSnap();
      ensureLegend();
    }, 40);
  }

  window.addEventListener('pointerdown', startDrag, true);
  window.addEventListener('pointermove', moveDrag, true);
  window.addEventListener('pointerup', finishDrag, true);
  window.addEventListener('pointercancel', finishDrag, true);
  window.addEventListener('blur', finishDrag, true);

  window.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;

    if (Date.now() < suppressClickUntil && target && target.closest(TABLE_SELECTOR)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (target && target.closest(EDIT_SELECTOR)) {
      ensureExpandedForEdit();
      setTimeout(disableLegacyPostDropSnap, 0);
      setTimeout(disableLegacyPostDropSnap, 260);
    }

    if (target && target.closest(SAVE_SELECTOR)) {
      setTimeout(disableLegacyPostDropSnap, 0);
      setTimeout(disableLegacyPostDropSnap, 260);
    }
  }, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    scheduleApply();
    setTimeout(disableLegacyPostDropSnap, 180);
    setTimeout(ensureLegend, 220);
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
  disableLegacyPostDropSnap();
  ensureLegend();
  setTimeout(disableLegacyPostDropSnap, 220);
  setTimeout(ensureLegend, 260);

  window.PMDWaiterFloorEditV160 = {
    active: true,
    apply: function () {
      disableLegacyPostDropSnap();
      ensureLegend();
    },
    overlaps: overlapPairs,
    debug: function () {
      var map = floorMap();
      var tables = map ? map.querySelectorAll('.pmd-w5-table[data-table]') : [];
      var api = window.PMDWaiterV61StableKioskNoJump || window.PMDWaiterV60No404SmartSnap;
      var out = {
        version: 'pmd-waiter-floor-edit-v160',
        active: true,
        editing: isEditing(),
        compact: isCompact(),
        dragging: !!drag,
        tableCount: tables.length,
        overlapPairs: overlapPairs(),
        legacyPostDropSnapDisabled: !!(api && api.__pmdV160NoPostDropSnap),
        legendButton: !!document.querySelector(MAP_SELECTOR + ' .pmd-v61-map-info-btn'),
        legendCard: !!document.querySelector(MAP_SELECTOR + ' .pmd-v61-map-legend'),
        legendCreatedByV160: legendCreated
      };
      console.log(out);
      return out;
    },
    stop: function () {
      if (observer) observer.disconnect();
      if (moveRaf) cancelAnimationFrame(moveRaf);
      observer = null;
      observedRoot = null;
      moveRaf = 0;
    }
  };

  console.info('[PMD] Waiter floor edit V160 smooth no-overlap authority active');
})();
