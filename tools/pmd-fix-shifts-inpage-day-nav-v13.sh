#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
NEW_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v13.js"
BACKUP="/tmp/pmd-shifts-inpage-day-nav-v13-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-inpage-day-nav-v13.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0
ACTIVE_JS=""

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V13"
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

grep -Fq "pmd-shifts-page" "$CONTROLLER" || {
    echo "STOP: Shifts controller marker missing"
    exit 21
}

ACTIVE_JS="$(python3 - "$CONTROLLER" <<'PY'
from pathlib import Path
import re
import sys

controller = Path(sys.argv[1])
s = controller.read_text()
paths = re.findall(r"\$this->addJs\('js/([^']+\.js)'\);", s)

matches = []
for rel in paths:
    p = Path('app/admin/assets/js') / rel
    if not p.is_file():
        continue
    try:
        text = p.read_text()
    except Exception:
        continue
    required = [
        'function loadDayData(key)',
        'function openHourDay(key)',
        'function changeHourDay(delta)',
        'data-pmd-shifts-prev-day',
        'data-pmd-shifts-next-day',
    ]
    if all(marker in text for marker in required):
        matches.append(str(p))

if len(matches) != 1:
    print('STOP_MATCH_COUNT=' + str(len(matches)), file=sys.stderr)
    for item in matches:
        print(item, file=sys.stderr)
    raise SystemExit(31)

print(matches[0])
PY
)" || {
    echo "STOP: could not identify exactly one active Shifts interaction JS"
    exit 31
}

echo "Active Shifts interaction JS: $ACTIVE_JS"

test -f "$ACTIVE_JS" || { echo "STOP: active JS missing"; exit 32; }

grep -Fq "function loadDayData(key)" "$ACTIVE_JS"
grep -Fq "function openHourDay(key)" "$ACTIVE_JS"
grep -Fq "window.location.href = dayPageUrl(key)" "$ACTIVE_JS" || {
    if ! grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$ACTIVE_JS"; then
        echo "STOP: expected old full-page fallback not found"
        exit 33
    fi
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$CONTROLLER")" "$TMPROOT/$(dirname "$NEW_JS")"
cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$ACTIVE_JS" "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_INPAGE_DAY_NAV_V13'

if marker in s:
    print('V13 JS already patched')
    raise SystemExit(0)

# Keep other Shifts scripts (live attendance, etc.) in sync with the newly
# fetched day by replacing the embedded JSON nodes as well as the closure vars.
old_sync = """        var nextBoot = parseEmbeddedJson(doc, 'pmd-shifts-bootstrap');
        var nextKpis = parseEmbeddedJson(doc, 'pmd-shifts-kpi-data');
        if (!nextBoot || !Array.isArray(nextBoot.shifts)) throw new Error('Shift day payload missing');
        boot = nextBoot;
        if (nextKpis && Object.keys(nextKpis).length) kpiCards = nextKpis;
"""
new_sync = """        var nextBoot = parseEmbeddedJson(doc, 'pmd-shifts-bootstrap');
        var nextKpis = parseEmbeddedJson(doc, 'pmd-shifts-kpi-data');
        if (!nextBoot || !Array.isArray(nextBoot.shifts)) throw new Error('Shift day payload missing');

        // PMD_SHIFTS_INPAGE_DAY_NAV_V13
        // Keep other Shifts runtimes that read the embedded JSON on demand in
        // sync with the day loaded by this closure.
        var liveBootNode = document.getElementById('pmd-shifts-bootstrap');
        var fetchedBootNode = doc.getElementById('pmd-shifts-bootstrap');
        if (liveBootNode && fetchedBootNode) liveBootNode.textContent = fetchedBootNode.textContent || '{}';
        var liveKpiNode = document.getElementById('pmd-shifts-kpi-data');
        var fetchedKpiNode = doc.getElementById('pmd-shifts-kpi-data');
        if (liveKpiNode && fetchedKpiNode) liveKpiNode.textContent = fetchedKpiNode.textContent || '{}';

        boot = nextBoot;
        if (nextKpis && Object.keys(nextKpis).length) kpiCards = nextKpis;
"""
if s.count(old_sync) != 1:
    raise SystemExit(f'STOP: loadDayData JSON sync anchor count={s.count(old_sync)}')
s = s.replace(old_sync, new_sync, 1)

# The current file accidentally removes the loading class at request start.
# Scope the replacement to loadDayData only.
load_start = s.find('  function loadDayData(key) {')
open_start = s.find('\n  function openHourDay(key) {', load_start)
if load_start < 0 or open_start < 0:
    raise SystemExit('STOP: loadDayData/openHourDay boundaries missing')
load_block = s[load_start:open_start]
old_loading = "    root.classList.remove('is-day-loading');"
if old_loading in load_block:
    load_block = load_block.replace(old_loading, "    root.classList.add('is-day-loading');", 1)
    s = s[:load_start] + load_block + s[open_start:]

open_start = s.find('  function openHourDay(key) {')
change_start = s.find('\n  function changeHourDay(delta) {', open_start)
submit_start = s.find('\n  function submitRemoveShift(id) {', change_start)
if open_start < 0 or change_start < 0 or submit_start < 0:
    raise SystemExit('STOP: day navigation function boundaries missing')

new_navigation = r'''  var pmdShiftsDayNavBusyV13 = false;

  function currentVisibleDayV13() {
    var screen = root.querySelector('.pmd-shifts-final-screen[data-date]');
    var value = screen ? String(screen.getAttribute('data-date') || '') : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return String(boot.selected_day || '');
  }

  function showDayNavErrorV13(error) {
    try { console.error('[PMD Shifts V13] In-page day load failed', error); } catch (ignore) {}
    root.setAttribute('data-pmd-shifts-day-load-error', '1');
    window.setTimeout(function () {
      root.removeAttribute('data-pmd-shifts-day-load-error');
    }, 2400);
  }

  function openHourDay(key, options) {
    key = String(key || '');
    options = options || {};
    if (!parseDateKey(key)) return Promise.resolve(false);
    if (key === String(boot.selected_day || '') && options.force !== true) return Promise.resolve(true);
    if (pmdShiftsDayNavBusyV13) return Promise.resolve(false);

    var previousUrl = window.location.href;
    var previousState = window.history ? window.history.state : null;
    pmdShiftsDayNavBusyV13 = true;
    root.setAttribute('aria-busy', 'true');

    return loadDayData(key)
      .then(function () {
        // renderHourView() intentionally replaceStates the loaded day. For a
        // user click, restore the old entry and PUSH the new day so browser
        // Back/Forward remains meaningful without reloading the page.
        if (options.history !== 'none' && window.history) {
          try {
            var targetUrl = dayPageUrl(key);
            window.history.replaceState(previousState, '', previousUrl);
            window.history.pushState({pmdShiftsDayV13:key}, '', targetUrl);
          } catch (error) {}
        }
        return true;
      })
      .catch(function (error) {
        // Never fall back to window.location.href. A failed day request leaves
        // the current screen intact and can simply be retried.
        showDayNavErrorV13(error);
        return false;
      })
      .finally(function () {
        pmdShiftsDayNavBusyV13 = false;
        root.removeAttribute('aria-busy');
        root.classList.remove('is-day-loading');
      });
  }

  function changeHourDay(delta) {
    var current = currentVisibleDayV13() || String(boot.selected_day || '');
    openHourDay(shiftedDate(current, delta));
  }
'''

s = s[:open_start] + new_navigation + s[submit_start:]

# Add History API restoration. popstate must load the day represented by the
# URL but must not create another history entry.
pop_anchor = "  document.addEventListener('keydown', function (event) {"
pop_block = r'''  window.addEventListener('popstate', function () {
    try {
      var url = new URL(window.location.href);
      var key = String(url.searchParams.get('day') || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      if (key === String(boot.selected_day || '')) return;
      openHourDay(key, {history:'none', force:true});
    } catch (error) {}
  });

'''
if s.count(pop_anchor) != 1:
    raise SystemExit(f'STOP: popstate insertion anchor count={s.count(pop_anchor)}')
s = s.replace(pop_anchor, pop_block + pop_anchor, 1)

# Verify the dangerous full-page navigation fallback is gone from this active
# authority. Other unrelated location navigation is not touched.
if "window.location.href = dayPageUrl(key)" in s:
    raise SystemExit('STOP: full-page day fallback still present after patch')
if marker not in s:
    raise SystemExit('STOP: V13 marker missing after patch')

p.write_text(s)
print('Active Shifts JS: in-page day navigation V13 prepared')
PY

python3 - "$TMPROOT/$CONTROLLER" "$ACTIVE_JS" "$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
old_file = Path(sys.argv[2]).name
new_file = Path(sys.argv[3]).name
s = p.read_text()
old_line = f"        $this->addJs('js/{old_file}');"
new_line = f"        $this->addJs('js/{new_file}');"
marker = '        // PMD_SHIFTS_INPAGE_DAY_NAV_V13'

if new_line in s:
    print('Shifts.php: V13 JS already registered')
    raise SystemExit(0)
if s.count(old_line) != 1:
    raise SystemExit(f'STOP: active JS registration count={s.count(old_line)}')
s = s.replace(old_line, marker + "\n" + new_line, 1)
p.write_text(s)
print(f'Shifts.php: replaced {old_file} with {new_file}')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NEW_JS"
grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$TMPROOT/$NEW_JS"
grep -Fq "window.history.pushState" "$TMPROOT/$NEW_JS"
grep -Fq "window.addEventListener('popstate'" "$TMPROOT/$NEW_JS"
if grep -Fq "window.location.href = dayPageUrl(key)" "$TMPROOT/$NEW_JS"; then
    echo "STOP: full-page day fallback remains in V13 temp JS"
    exit 40
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 2 TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")" "$BACKUP/$(dirname "$NEW_JS")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"
if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 2 TARGETS"
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
grep -nF "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$CONTROLLER"
grep -nF "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$NEW_JS"
grep -nF "window.history.pushState" "$NEW_JS"
grep -nF "window.addEventListener('popstate'" "$NEW_JS"
if grep -Fq "window.location.href = dayPageUrl(key)" "$NEW_JS"; then
    echo "STOP: live V13 still contains full-page day fallback"
    exit 41
fi

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS IN-PAGE DAY NAV V13 INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - previous/next arrows fetch the new day without full page reload"
echo "  - crossing month boundaries stays on the same Shifts page"
echo "  - date picker and Today use the same in-page path"
echo "  - URL updates with History API"
echo "  - browser Back/Forward restores days in-page"
echo "  - rapid clicks are serialized to prevent stale-response races"
echo "  - fetch failure leaves the current day visible; there is NO location.href fallback"
echo "  - active live Shifts JS was copied first, so existing production-only behavior is preserved"
echo "Backup: $BACKUP"
echo "Previous active JS kept untouched: $ACTIVE_JS"
