#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
ACTIVE_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17.js"
REF_CSS="app/admin/assets/css/pmd-shifts-no-plus-v17e.css"
NEW_CSS="app/admin/assets/css/pmd-shifts-clean-frame-v17f.css"
NEW_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17f.js"
MARKER_CSS="PMD_SHIFTS_CLEAN_FRAME_V17F"
MARKER_JS="PMD_SHIFTS_FAST_DAY_NAV_V17F"
BACKUP="/tmp/pmd-shifts-v17f-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17f.XXXXXX)"
APPLY_STARTED=0
NEW_CSS_EXISTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17F"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"

        if [ "$NEW_CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_CSS" "$NEW_CSS"
        else
            sudo rm -f "$NEW_CSS"
        fi

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
test -f "$ACTIVE_JS" || { echo "STOP: missing active V17 day renderer"; exit 21; }
test -f "$REF_CSS" || { echo "STOP: missing V17E CSS reference"; exit 22; }

grep -Fq "pmd-shifts-inpage-day-nav-v17.js" "$CONTROLLER" || {
    echo "STOP: V17 day renderer is not the active live renderer"
    exit 23
}

grep -Fq "pmd-shifts-no-plus-v17e.css" "$CONTROLLER" || {
    echo "STOP: V17E no-plus CSS is not registered"
    exit 24
}

grep -Fq "function loadDayData(key)" "$ACTIVE_JS" || {
    echo "STOP: loadDayData() missing from active renderer"
    exit 25
}

grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$ACTIVE_JS" || {
    echo "STOP: in-page navigation authority missing"
    exit 26
}

if grep -Fq "pmd-shifts-clean-frame-v17f.css" "$CONTROLLER" || grep -Fq "pmd-shifts-inpage-day-nav-v17f.js" "$CONTROLLER"; then
    if [ -f "$NEW_CSS" ] && [ -f "$NEW_JS" ] && grep -Fq "$MARKER_CSS" "$NEW_CSS" && grep -Fq "$MARKER_JS" "$NEW_JS"; then
        echo "V17F is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17F production state"
    exit 27
fi

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$NEW_CSS" "$NEW_JS"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$ACTIVE_JS" "$TMPROOT/$NEW_JS"

cat > "$TMPROOT/$NEW_CSS" <<'CSS'
/* PMD_SHIFTS_CLEAN_FRAME_V17F */

/* Mouse hover must never paint a planning cell. The button remains clickable. */
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot:hover,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot:active {
  background:transparent!important;
  background-color:transparent!important;
  border-color:transparent!important;
  box-shadow:none!important;
  filter:none!important;
  transform:none!important;
  text-shadow:none!important;
  transition:none!important;
}

body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot::before,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot::after,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot:hover::before,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot:hover::after,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot > span {
  content:none!important;
  display:none!important;
  opacity:0!important;
  visibility:hidden!important;
  background:transparent!important;
  box-shadow:none!important;
  pointer-events:none!important;
}

/* Hide only the planner-frame scrollbars. Scrolling itself stays enabled. */
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scroll {
  scrollbar-width:none!important;
  -ms-overflow-style:none!important;
  scrollbar-gutter:auto!important;
}

body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scroll::-webkit-scrollbar,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scroll::-webkit-scrollbar-track,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scroll::-webkit-scrollbar-thumb,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scroll::-webkit-scrollbar-corner {
  width:0!important;
  height:0!important;
  display:none!important;
  background:transparent!important;
}
CSS

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_FAST_DAY_NAV_V17F'

if marker in s:
    print('V17F day renderer already prepared')
    raise SystemExit(0)

anchor = "  function loadDayData(key) {"
if s.count(anchor) != 1:
    raise SystemExit(f'STOP: loadDayData anchor count={s.count(anchor)}')

helpers = r'''  // PMD_SHIFTS_FAST_DAY_NAV_V17F
  // The existing in-page navigator requests a complete Shifts HTML document
  // for every day, then parses its embedded JSON. Keep that canonical server
  // authority, but reuse very recent results and prefetch only adjacent days.
  var pmdDayCacheV17F = Object.create(null);
  var pmdDayInflightV17F = Object.create(null);
  var pmdDayCacheOrderV17F = [];
  var pmdDayCacheTtlV17F = 15000;
  var pmdDayCacheLimitV17F = 7;

  function rememberDayHtmlV17F(key, html) {
    key = String(key || '');
    pmdDayCacheV17F[key] = {html:String(html || ''), at:Date.now()};
    pmdDayCacheOrderV17F = pmdDayCacheOrderV17F.filter(function (item) { return item !== key; });
    pmdDayCacheOrderV17F.push(key);
    while (pmdDayCacheOrderV17F.length > pmdDayCacheLimitV17F) {
      var oldest = pmdDayCacheOrderV17F.shift();
      if (oldest) delete pmdDayCacheV17F[oldest];
    }
  }

  function cachedDayHtmlV17F(key) {
    var item = pmdDayCacheV17F[String(key || '')];
    if (!item) return null;
    if ((Date.now() - Number(item.at || 0)) > pmdDayCacheTtlV17F) {
      delete pmdDayCacheV17F[String(key || '')];
      return null;
    }
    return String(item.html || '');
  }

  function fetchDayHtmlV17F(key) {
    key = String(key || '');
    var cached = cachedDayHtmlV17F(key);
    if (cached) return Promise.resolve(cached);
    if (pmdDayInflightV17F[key]) return pmdDayInflightV17F[key];

    var url = dayPageUrl(key);
    var request = fetch(url, {
      credentials:'same-origin',
      headers:{'X-Requested-With':'XMLHttpRequest'}
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Shift day request failed');
        return response.text();
      })
      .then(function (html) {
        rememberDayHtmlV17F(key, html);
        return html;
      })
      .finally(function () {
        delete pmdDayInflightV17F[key];
      });

    pmdDayInflightV17F[key] = request;
    return request;
  }

  function prefetchDayV17F(key) {
    key = String(key || '');
    if (!parseDateKey(key)) return;
    if (cachedDayHtmlV17F(key) || pmdDayInflightV17F[key]) return;
    fetchDayHtmlV17F(key).catch(function () {});
  }

  function scheduleAdjacentDayPrefetchV17F(key) {
    key = String(key || '');
    if (!parseDateKey(key)) return;
    var run = function () {
      prefetchDayV17F(shiftedDate(key, -1));
      prefetchDayV17F(shiftedDate(key, 1));
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, {timeout:900});
    } else {
      window.setTimeout(run, 180);
    }
  }

'''

s = s.replace(anchor, helpers + anchor, 1)

old_fetch = """    return fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})\n      .then(function (response) {\n        if (!response.ok) throw new Error('Shift day request failed');\n        return response.text();\n      })\n      .then(function (html) {"""
new_fetch = """    return fetchDayHtmlV17F(key)\n      .then(function (html) {"""
if s.count(old_fetch) != 1:
    raise SystemExit(f'STOP: canonical loadDayData fetch block count={s.count(old_fetch)}')
s = s.replace(old_fetch, new_fetch, 1)

load_start = s.find('  function loadDayData(key) {')
load_end = s.find('\n  var pmdShiftsDayNavBusyV13', load_start)
if load_start < 0 or load_end < 0:
    raise SystemExit('STOP: loadDayData boundaries missing after patch')
load_block = s[load_start:load_end]
render_anchor = '        renderHourView(key);'
if load_block.count(render_anchor) != 1:
    raise SystemExit(f'STOP: render anchor in loadDayData count={load_block.count(render_anchor)}')
load_block = load_block.replace(
    render_anchor,
    render_anchor + '\n        scheduleAdjacentDayPrefetchV17F(key);',
    1
)
s = s[:load_start] + load_block + s[load_end:]

end_anchor = '\n})();'
pos = s.rfind(end_anchor)
if pos < 0:
    raise SystemExit('STOP: script closure ending missing')
initial_prefetch = r'''

  // Warm the most likely next clicks after first paint, without blocking it.
  if (boot && boot.selected_day) {
    scheduleAdjacentDayPrefetchV17F(String(boot.selected_day));
  }
'''
s = s[:pos] + initial_prefetch + s[pos:]

if marker not in s:
    raise SystemExit('STOP: V17F marker missing')
if 'return fetchDayHtmlV17F(key)' not in s:
    raise SystemExit('STOP: loadDayData does not use V17F cache')

p.write_text(s)
print('V17 renderer: short-lived cache + adjacent-day prefetch prepared')
PY

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

css_anchor = "        $this->addCss('css/pmd-shifts-no-plus-v17e.css');"
css_new = "        $this->addCss('css/pmd-shifts-clean-frame-v17f.css');"
js_old = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17.js');"
js_new = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17f.js');"
marker = '        // PMD_SHIFTS_CLEAN_FAST_V17F'

if css_new not in s:
    if s.count(css_anchor) != 1:
        raise SystemExit(f'STOP: V17E CSS registration count={s.count(css_anchor)}')
    s = s.replace(css_anchor, css_anchor + '\n' + marker + '\n' + css_new, 1)

if js_new not in s:
    if s.count(js_old) != 1:
        raise SystemExit(f'STOP: active V17 JS registration count={s.count(js_old)}')
    s = s.replace(js_old, js_new, 1)

p.write_text(s)
print('Shifts.php: V17F CSS registered and fast day renderer activated')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NEW_JS"
grep -Fq "$MARKER_CSS" "$TMPROOT/$NEW_CSS"
grep -Fq "$MARKER_JS" "$TMPROOT/$NEW_JS"
grep -Fq "scrollbar-width:none!important" "$TMPROOT/$NEW_CSS"
grep -Fq "requestIdleCallback" "$TMPROOT/$NEW_JS"
grep -Fq "return fetchDayHtmlV17F(key)" "$TMPROOT/$NEW_JS"
grep -Fq "pmd-shifts-clean-frame-v17f.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-inpage-day-nav-v17f.js" "$TMPROOT/$CONTROLLER"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 3 V17F TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$NEW_CSS" ]; then
    NEW_CSS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_CSS")"
    sudo cp -a "$NEW_CSS" "$BACKUP/$NEW_CSS"
fi

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 3 V17F TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"

sudo chown --reference="$REF_CSS" "$NEW_CSS"
sudo chmod --reference="$REF_CSS" "$NEW_CSS"
sudo chown --reference="$ACTIVE_JS" "$NEW_JS"
sudo chmod --reference="$ACTIVE_JS" "$NEW_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$NEW_JS"
grep -nF "PMD_SHIFTS_CLEAN_FAST_V17F" "$CONTROLLER"
grep -nF "$MARKER_CSS" "$NEW_CSS" | head -1
grep -nF "$MARKER_JS" "$NEW_JS" | head -1
grep -nF "pmd-shifts-inpage-day-nav-v17f.js" "$CONTROLLER"
grep -nF "scrollbar-width:none!important" "$NEW_CSS" | head -1
grep -nF "return fetchDayHtmlV17F(key)" "$NEW_JS" | head -1

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS CLEAN FRAME + FAST DAY NAV V17F INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - empty cells show no mouse-hover color/shadow/animation"
echo "  - cells remain clickable and keyboard focus behavior is preserved"
echo "  - planner-frame scrollbars are visually hidden while scrolling still works"
echo "  - previous/next days are prefetched after first paint"
echo "  - recent day HTML is cached for 15 seconds only"
echo "  - duplicate in-flight requests for the same day are reused"
echo "  - first arbitrary uncached date still waits for the server response"
echo "  - shift save/group merge/MFA/Portal logic is untouched"
echo "Backup: $BACKUP"
