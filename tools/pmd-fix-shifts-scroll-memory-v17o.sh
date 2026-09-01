#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
ACTIVE_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17n.js"
NEW_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17o.js"
MARKER="PMD_SHIFTS_SCROLL_MEMORY_V17O"
BACKUP="/tmp/pmd-shifts-v17o-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17o.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17O"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"

        if [ "$NEW_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_JS" "$NEW_JS"
        else
            sudo rm -f "$NEW_JS"
        fi

        echo "ROLLBACK COMPLETE"
        echo "Backup kept at: $BACKUP"
    fi

    rm -rf "$TMPROOT"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

test -f "$CONTROLLER" || { echo "STOP: missing $CONTROLLER"; exit 20; }
test -f "$ACTIVE_JS" || { echo "STOP: missing active V17N renderer"; exit 21; }

grep -Fq "pmd-shifts-inpage-day-nav-v17n.js" "$CONTROLLER" || {
    if grep -Fq "pmd-shifts-inpage-day-nav-v17o.js" "$CONTROLLER" && [ -f "$NEW_JS" ] && grep -Fq "$MARKER" "$NEW_JS"; then
        echo "V17O is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: V17N is no longer the active Shifts renderer"
    exit 22
}

grep -Fq "PMD_SHIFTS_MIDNIGHT_TIMELINE_V17N" "$ACTIVE_JS" || {
    echo "STOP: V17N midnight timeline marker missing"
    exit 23
}

grep -Fq "PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M" "$ACTIVE_JS" || {
    echo "STOP: V17M dynamic width marker missing from V17N renderer"
    exit 24
}

grep -Fq "var dayStart = 0;" "$ACTIVE_JS" || {
    echo "STOP: V17N 00:00 timeline start missing"
    exit 25
}

grep -Fq "var dayEnd = 1440;" "$ACTIVE_JS" || {
    echo "STOP: V17N 24:00 timeline end missing"
    exit 26
}

python3 - "$ACTIVE_JS" <<'PY'
from pathlib import Path
import sys
s = Path(sys.argv[1]).read_text()
anchors = {
    'renderHourView': '  function renderHourView(key) {',
    'host innerHTML': "    host.innerHTML = '' +",
    'host visible': '    host.hidden = false;',
    'prefetch comment': '  // Warm the most likely next clicks after first paint, without blocking it.',
}
for name, anchor in anchors.items():
    count = s.count(anchor)
    if count != 1:
        raise SystemExit(f'STOP: {name} anchor expected once, found {count}')
print('V17N scroll-memory patch anchors confirmed')
PY

echo "V17N midnight + dynamic-width authorities confirmed"
echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$CONTROLLER")"
mkdir -p "$TMPROOT/$(dirname "$NEW_JS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$ACTIVE_JS" "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_SCROLL_MEMORY_V17O'

if marker in s:
    raise SystemExit('STOP: V17O marker unexpectedly already present in copied V17N renderer')

render_anchor = '  function renderHourView(key) {'
helper = r'''  // PMD_SHIFTS_SCROLL_MEMORY_V17O
  // Remember the user's horizontal planner position in this browser. The key is
  // intentionally date-independent so previous/next day navigation and a later
  // visit to Shifts reopen at the same part of the 24-hour timeline.
  var pmdShiftsScrollStorageKeyV17O = 'pmd.shifts.planner.scroll-left.v17o';
  var pmdShiftsScrollSaveTimerV17O = 0;

  function plannerScrollerV17O() {
    return root.querySelector('.pmd-shifts-final-scroll');
  }

  function readPlannerScrollV17O() {
    try {
      var value = Number(window.localStorage.getItem(pmdShiftsScrollStorageKeyV17O));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function writePlannerScrollV17O(value) {
    value = Math.max(0, Number(value || 0));
    try {
      window.localStorage.setItem(pmdShiftsScrollStorageKeyV17O, String(Math.round(value)));
    } catch (error) {}
  }

  function persistPlannerScrollV17O(scroller) {
    scroller = scroller || plannerScrollerV17O();
    if (!scroller) return;
    writePlannerScrollV17O(scroller.scrollLeft || 0);
  }

  function applyPlannerScrollV17O(scroller, saved) {
    if (!scroller || !scroller.isConnected) return;
    var max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = Math.min(Math.max(0, saved), max);
  }

  function restorePlannerScrollV17O() {
    var scroller = plannerScrollerV17O();
    if (!scroller) return;
    var saved = readPlannerScrollV17O();

    // Apply once synchronously, then once on the next frame in case Safari has
    // not finished calculating scrollWidth at the exact moment markup changed.
    applyPlannerScrollV17O(scroller, saved);
    window.requestAnimationFrame(function () {
      applyPlannerScrollV17O(scroller, saved);
    });
  }

  root.addEventListener('scroll', function (event) {
    var scroller = event.target;
    if (!scroller || !scroller.classList || !scroller.classList.contains('pmd-shifts-final-scroll')) return;

    if (pmdShiftsScrollSaveTimerV17O) {
      window.clearTimeout(pmdShiftsScrollSaveTimerV17O);
    }
    pmdShiftsScrollSaveTimerV17O = window.setTimeout(function () {
      pmdShiftsScrollSaveTimerV17O = 0;
      persistPlannerScrollV17O(scroller);
    }, 90);
  }, true);

  window.addEventListener('pagehide', function () {
    persistPlannerScrollV17O();
  });

'''
if s.count(render_anchor) != 1:
    raise SystemExit(f'STOP: renderHourView anchor count={s.count(render_anchor)}')
s = s.replace(render_anchor, helper + render_anchor, 1)

inner_anchor = "    host.innerHTML = '' +"
inner_new = "    persistPlannerScrollV17O();\n\n" + inner_anchor
if s.count(inner_anchor) != 1:
    raise SystemExit(f'STOP: host.innerHTML anchor count={s.count(inner_anchor)}')
s = s.replace(inner_anchor, inner_new, 1)

visible_anchor = '    host.hidden = false;'
visible_new = visible_anchor + '\n    restorePlannerScrollV17O();'
if s.count(visible_anchor) != 1:
    raise SystemExit(f'STOP: host.hidden anchor count={s.count(visible_anchor)}')
s = s.replace(visible_anchor, visible_new, 1)

prefetch_anchor = '  // Warm the most likely next clicks after first paint, without blocking it.'
prefetch_new = '  // Restore the server-first planner position on a normal page open.\n  restorePlannerScrollV17O();\n\n' + prefetch_anchor
if s.count(prefetch_anchor) != 1:
    raise SystemExit(f'STOP: initial restore anchor count={s.count(prefetch_anchor)}')
s = s.replace(prefetch_anchor, prefetch_new, 1)

p.write_text(s)
print('V17O JS: persistent horizontal planner position prepared')
PY

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
old = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17n.js');"
new = "        // PMD_SHIFTS_SCROLL_MEMORY_V17O\n        $this->addJs('js/pmd-shifts-inpage-day-nav-v17o.js');"

if s.count(old) != 1:
    raise SystemExit(f'STOP: V17N JS registration count={s.count(old)}')
s = s.replace(old, new, 1)
p.write_text(s)
print('Shifts.php: fresh V17O renderer fingerprint prepared')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NEW_JS"

grep -Fq "$MARKER" "$TMPROOT/$NEW_JS"
grep -Fq "pmd-shifts-inpage-day-nav-v17o.js" "$TMPROOT/$CONTROLLER"
grep -Fq "var dayStart = 0;" "$TMPROOT/$NEW_JS"
grep -Fq "var dayEnd = 1440;" "$TMPROOT/$NEW_JS"
grep -Fq "PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M" "$TMPROOT/$NEW_JS"
grep -Fq "window.localStorage.setItem" "$TMPROOT/$NEW_JS"
grep -Fq "restorePlannerScrollV17O();" "$TMPROOT/$NEW_JS"

if grep -Fq "MutationObserver" "$TMPROOT/$NEW_JS"; then
    echo "STOP: V17O must not add a MutationObserver"
    exit 30
fi

if grep -Fq "setInterval(" "$TMPROOT/$NEW_JS"; then
    echo "STOP: V17O must not add a polling interval"
    exit 31
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17O TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY CONTROLLER + NEW V17O JS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"
sudo chown --reference="$ACTIVE_JS" "$NEW_JS"
sudo chmod --reference="$ACTIVE_JS" "$NEW_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$NEW_JS"
grep -nF "$MARKER" "$CONTROLLER" "$NEW_JS"
grep -nF "pmd-shifts-inpage-day-nav-v17o.js" "$CONTROLLER"
grep -nF "pmd.shifts.planner.scroll-left.v17o" "$NEW_JS"
grep -nF "restorePlannerScrollV17O" "$NEW_JS" | head -10

if grep -Fq "MutationObserver" "$NEW_JS"; then
    echo "STOP: unexpected MutationObserver in live V17O"
    exit 40
fi

if grep -Fq "setInterval(" "$NEW_JS"; then
    echo "STOP: unexpected polling interval in live V17O"
    exit 41
fi

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS SCROLL MEMORY V17O INSTALLED"
echo "========================================"
echo ""
echo "Behavior now:"
echo "  - horizontal planner position is remembered in this browser"
echo "  - reopening Shifts restores the previous left/right position"
echo "  - previous/next/calendar day changes keep the same horizontal position"
echo "  - storage is per restaurant origin/browser and independent of selected day"
echo "  - scroll writes are debounced; there is no MutationObserver or polling loop"
echo "  - V17N 00:00-24:00 timeline and V17M bar widths remain intact"
echo "  - Shift save/group merge/pause/MFA/Portal logic is untouched"
echo ""
echo "Backup: $BACKUP"
echo "Previous active renderer kept untouched: $ACTIVE_JS"
