from pathlib import Path
import re

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text()

if "pmd-waiter-floor-edit-v160.3" not in text:
    raise SystemExit('Expected V160.3 source')

text = text.replace(
    "  var MOVE_STEP = 3;\n",
    "  var DROP_SEARCH_STEP = 8;\n  var DROP_SEARCH_ANGLES = 96;\n"
)
text = text.replace(
    "  var recoveredColumnLayouts = 0;\n",
    "  var recoveredColumnLayouts = 0;\n  var dropAdjustments = 0;\n"
)

new_resolution = r'''
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

  function writeCenter(table, center, mapRect) {'''

text, count = re.subn(
    r"\n  function walkUntilBlocked\(start, target, width, height, occupied\) \{.*?\n  function writeCenter\(table, center, mapRect\) \{",
    "\n" + new_resolution,
    text,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'resolution block replacements: {count}')

new_move = r'''
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
    if (!map || !map.isConnected || !drag.table.isConnected) return;

    var mapRect = map.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;

    var desired = desiredCenterFromPoint(pendingPoint, drag, mapRect);
    writeCenter(drag.table, desired, mapRect);
    drag.currentCenter = desired;
    drag.moved = drag.moved || distanceSquared(desired, drag.startCenter) > 4;
    drag.table.classList.remove('pmd-v160-collision-blocked');
  }

  function queueMove(event) {'''

text, count = re.subn(
    r"\n  function applyPendingMove\(\) \{.*?\n  function queueMove\(event\) \{",
    "\n" + new_move,
    text,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'move block replacements: {count}')

text = text.replace(
    "      startCenter: startCenter,\n      lastValid: startCenter,\n      moved: false\n",
    "      startCenter: startCenter,\n      currentCenter: startCenter,\n      moved: false\n"
)

new_finish = r'''
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

    if (finished.table) {
      finished.table.classList.remove('pmd-v160-dragging-table', 'pmd-v160-collision-blocked');
      finished.table.removeAttribute('data-pmd-v160-dragging');

      if (adjusted && mapRect) {
        dropAdjustments++;
        finished.table.classList.add('pmd-v160-settling-table');
        setImportant(
          finished.table,
          'transition',
          'left 170ms cubic-bezier(.2,.8,.2,1), top 170ms cubic-bezier(.2,.8,.2,1)'
        );
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            writeCenter(finished.table, settled, mapRect);
          });
        });
        setTimeout(function () {
          if (!finished.table) return;
          finished.table.classList.remove('pmd-v160-settling-table');
          finished.table.style.removeProperty('transition');
        }, 230);
      } else if (mapRect) {
        writeCenter(finished.table, settled, mapRect);
      }
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

  function visibleRows() {'''

text, count = re.subn(
    r"\n  function finishDrag\(event\) \{.*?\n  function visibleRows\(\) \{",
    "\n" + new_finish,
    text,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'finish block replacements: {count}')

text = text.replace("version: 'pmd-waiter-floor-edit-v160.3'", "version: 'pmd-waiter-floor-edit-v160.4'")
text = text.replace(
    "        dragging: !!drag,\n",
    "        dragging: !!drag,\n        collisionMode: 'drop-only-nearest-free',\n        tableGap: TABLE_GAP,\n        dropAdjustments: dropAdjustments,\n"
)
text = text.replace(
    "[PMD] Waiter floor edit V160.3 button-safe drag authority active",
    "[PMD] Waiter floor edit V160.4 drop-only nearest-free authority active"
)

required = [
    "pmd-waiter-floor-edit-v160.4",
    "collisionMode: 'drop-only-nearest-free'",
    "function nearestFreeCenter",
    "Overlap is allowed here by design",
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing token: {token}')

if 'function resolveCenter' in text or 'function walkUntilBlocked' in text:
    raise SystemExit('old continuous collision resolver remains')

path.write_text(text)
print('Patched waiter floor to V160.4 drop-only collision resolution')
