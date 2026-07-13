from pathlib import Path
import re

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text()


def replace_exact(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'Missing exact block: {label}')
    text = text.replace(old, new, 1)


def replace_regex(pattern, replacement, label):
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected one regex match for {label}, got {count}')


replace_exact(
    "  var TABLE_SELECTOR = MAP_SELECTOR + ' .pmd-w5-table[data-table]';",
    "  var TABLE_SELECTOR = MAP_SELECTOR + ' .pmd-w5-table[data-table]:not(.pmd-v160-drag-proxy)';",
    'table selector excludes drag proxy'
)

replace_exact(
    '  var dropAdjustments = 0;',
    '  var dropAdjustments = 0;\n  var proxyMoves = 0;',
    'proxy move counter'
)

write_center = """  function writeCenter(table, center, mapRect) {
    writeRatio(table, center.x / mapRect.width, center.y / mapRect.height);
  }
"""

proxy_helpers = write_center + """
  function stripProxyIdentity(proxy) {
    if (!proxy) return;
    [proxy].concat(Array.prototype.slice.call(proxy.querySelectorAll('[id], [name]'))).forEach(function (node) {
      node.removeAttribute('id');
      node.removeAttribute('name');
    });
  }

  function createDragProxy(table, map, mapRect, tableRect, startCenter) {
    if (!table || !map) return null;

    var proxy = table.cloneNode(true);
    stripProxyIdentity(proxy);
    proxy.classList.remove('pmd-v160-drag-source', 'pmd-v160-settling-table', 'pmd-v160-collision-blocked');
    proxy.classList.add('pmd-v160-drag-proxy', 'pmd-v160-dragging-table');
    proxy.setAttribute('data-pmd-v160-proxy', '1');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.setAttribute('tabindex', '-1');

    setImportant(proxy, 'pointer-events', 'none');
    setImportant(proxy, 'position', 'absolute');
    setImportant(proxy, 'right', 'auto');
    setImportant(proxy, 'bottom', 'auto');
    setImportant(proxy, 'margin', '0');
    setImportant(proxy, 'width', tableRect.width + 'px');
    setImportant(proxy, 'height', tableRect.height + 'px');
    setImportant(proxy, 'min-width', tableRect.width + 'px');
    setImportant(proxy, 'min-height', tableRect.height + 'px');
    setImportant(proxy, 'max-width', tableRect.width + 'px');
    setImportant(proxy, 'max-height', tableRect.height + 'px');
    setImportant(proxy, 'transform', 'translate(-50%, -50%)');
    setImportant(proxy, 'transition', 'none');
    setImportant(proxy, 'animation', 'none');
    setImportant(proxy, 'visibility', 'visible');
    setImportant(proxy, 'opacity', '1');
    setImportant(proxy, 'z-index', '10030');

    map.appendChild(proxy);
    writeCenter(proxy, startCenter, mapRect);
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
"""
replace_exact(write_center, proxy_helpers, 'drag proxy helpers')

replace_regex(
    r"  function applyPendingMove\(\) \{.*?\n  \}\n\n  function queueMove\(event\) \{",
    """  function applyPendingMove() {
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
    writeCenter(drag.proxy, desired, mapRect);
    drag.currentCenter = desired;
    drag.moved = drag.moved || distanceSquared(desired, drag.startCenter) > 4;
    proxyMoves++;
  }

  function queueMove(event) {""",
    'proxy-only pointer movement'
)

replace_exact(
    """    drag = {
      table: table,
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
""",
    """    var proxy = createDragProxy(table, map, mapRect, tableRect, startCenter);
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
""",
    'start drag creates proxy'
)

replace_exact(
    """    var r = root();
    if (r) r.classList.add('pmd-v160-floor-dragging');
    table.classList.add('pmd-v160-dragging-table');
    table.classList.remove('pmd-v160-collision-blocked');
    table.setAttribute('data-pmd-v160-dragging', '1');
""",
    """    var r = root();
    if (r) r.classList.add('pmd-v160-floor-dragging');
    hideDragSource(table);
    table.setAttribute('data-pmd-v160-dragging', '1');
""",
    'hide real source while proxy moves'
)

replace_regex(
    r"  function finishDrag\(event\) \{.*?\n  \}\n\n  function visibleRows\(\) \{",
    """  function finishDrag(event) {
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
          writeCenter(finished.proxy, settled, mapRect);
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

  function visibleRows() {""",
    'proxy settlement and source reveal'
)

text = text.replace('pmd-waiter-floor-edit-v160.4', 'pmd-waiter-floor-edit-v160.5')
text = text.replace(
    "console.info('[PMD] Waiter floor edit V160.4 drop-only nearest-free authority active');",
    "console.info('[PMD] Waiter floor edit V160.5 isolated-proxy drop authority active');"
)

replace_exact(
    """        collisionMode: 'drop-only-nearest-free',
        tableGap: TABLE_GAP,
        dropAdjustments: dropAdjustments,
""",
    """        collisionMode: 'drop-only-nearest-free',
        dragVisual: 'isolated-proxy',
        tableGap: TABLE_GAP,
        dropAdjustments: dropAdjustments,
        proxyMoves: proxyMoves,
        proxyActive: !!(drag && drag.proxy && drag.proxy.isConnected),
""",
    'debug proxy fields'
)

replace_exact(
    """    stop: function () {
      if (observer) observer.disconnect();
      if (moveRaf) cancelAnimationFrame(moveRaf);
      observer = null;
""",
    """    stop: function () {
      if (observer) observer.disconnect();
      if (moveRaf) cancelAnimationFrame(moveRaf);
      if (drag) {
        removeDragProxy(drag.proxy);
        restoreDragSource(drag.table);
        drag = null;
      }
      observer = null;
""",
    'safe proxy cleanup on stop'
)

required = [
    "pmd-waiter-floor-edit-v160.5",
    "dragVisual: 'isolated-proxy'",
    'function createDragProxy',
    'writeCenter(drag.proxy, desired, mapRect)',
    'setTimeout(revealRealTable, 220)',
    "console.info('[PMD] Waiter floor edit V160.5 isolated-proxy drop authority active')",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing required V160.5 marker: {marker}')

if 'writeCenter(drag.table, desired, mapRect)' in text:
    raise SystemExit('Real table is still moved during pointer drag')

path.write_text(text)
print('PMD_V160_5_PATCH_OK')
