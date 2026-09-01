#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
ACTIVE_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17f.js"
NEW_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17m.js"
REF_CSS="app/admin/assets/css/pmd-shifts-bar-first-paint-fit-v17l.css"
NEW_CSS="app/admin/assets/css/pmd-shifts-bar-fit-v17m.css"
MARKER_JS="PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M"
MARKER_CSS="PMD_SHIFTS_BAR_TEXT_FIT_V17M"
BACKUP="/tmp/pmd-shifts-v17m-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17m.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0
NEW_CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17M"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"

        if [ "$NEW_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_JS" "$NEW_JS"
        else
            sudo rm -f "$NEW_JS"
        fi

        if [ "$NEW_CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_CSS" "$NEW_CSS"
        else
            sudo rm -f "$NEW_CSS"
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
test -f "$ACTIVE_JS" || { echo "STOP: missing active V17F day renderer"; exit 21; }
test -f "$REF_CSS" || { echo "STOP: missing V17L CSS"; exit 22; }

grep -Fq "pmd-shifts-inpage-day-nav-v17f.js" "$CONTROLLER" || {
    echo "STOP: V17F is no longer the active Shifts day renderer"
    exit 23
}

grep -Fq "pmd-shifts-bar-first-paint-fit-v17l.css" "$CONTROLLER" || {
    echo "STOP: V17L bar-fit CSS is not registered"
    exit 24
}

grep -Fq "function finalShiftMarkup(shift, person)" "$ACTIVE_JS" || {
    echo "STOP: finalShiftMarkup() missing from active renderer"
    exit 25
}

grep -Fq "var total = 1440;" "$ACTIVE_JS" || {
    echo "STOP: expected 24-hour timeline geometry missing"
    exit 26
}

# The server-rendered bars already use !important geometry. The active dynamic
# renderer must still contain the weaker non-important single-shift style for
# this patch to be valid.
python3 - "$ACTIVE_JS" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()
old = "        ' style=\"left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%\"' +"
new = "        ' style=\"left:' + left.toFixed(4) + '% !important;width:' + width.toFixed(4) + '% !important;max-width:none !important;min-width:24px !important;box-sizing:border-box !important\"' +"

if old not in s and new not in s:
    raise SystemExit('STOP: dynamic single-shift geometry anchor missing')
if s.count(old) > 1 or s.count(new) > 1:
    raise SystemExit('STOP: ambiguous dynamic single-shift geometry anchor')
print('Dynamic single-shift geometry anchor OK')
PY

if grep -Fq "$MARKER_JS" "$ACTIVE_JS"; then
    echo "STOP: active V17F unexpectedly already contains V17M marker"
    exit 27
fi

if grep -Fq "pmd-shifts-inpage-day-nav-v17m.js" "$CONTROLLER" || grep -Fq "pmd-shifts-bar-fit-v17m.css" "$CONTROLLER"; then
    if [ -f "$NEW_JS" ] && [ -f "$NEW_CSS" ] && grep -Fq "$MARKER_JS" "$NEW_JS" && grep -Fq "$MARKER_CSS" "$NEW_CSS"; then
        echo "V17M is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17M production state"
    exit 28
fi

echo "V17F renderer confirmed"
echo "V17L first-paint bar fit confirmed"
echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$NEW_JS" "$NEW_CSS"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$ACTIVE_JS" "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M'
old = "        ' style=\"left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%\"' +"
new = "        ' style=\"left:' + left.toFixed(4) + '% !important;width:' + width.toFixed(4) + '% !important;max-width:none !important;min-width:24px !important;box-sizing:border-box !important\"' +"

if marker not in s:
    if s.count(old) != 1:
        raise SystemExit(f'STOP: dynamic single-shift geometry anchor count={s.count(old)}')
    s = s.replace(old, new, 1)

    fn = '  function finalShiftMarkup(shift, person) {'
    if s.count(fn) != 1:
        raise SystemExit(f'STOP: finalShiftMarkup function count={s.count(fn)}')
    s = s.replace(fn, '  // ' + marker + '\n' + fn, 1)

if new not in s:
    raise SystemExit('STOP: important dynamic geometry was not installed')
if old in s:
    raise SystemExit('STOP: weak dynamic geometry still remains')

p.write_text(s)
print('V17M JS: dynamic bar geometry now matches server first paint')
PY

cat > "$TMPROOT/$NEW_CSS" <<'CSS'
/* PMD_SHIFTS_BAR_TEXT_FIT_V17M
 * Final static text fit for Shifts bars.
 * Keep this in CSS from first paint. Do not reintroduce late JS styling.
 */

html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift {
  align-content:center!important;
  grid-template-rows:min-content min-content!important;
  row-gap:1px!important;
  padding:4px 10px!important;
  min-height:0!important;
  box-sizing:border-box!important;
}

html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift > strong {
  display:block!important;
  margin:0!important;
  font-size:12px!important;
  line-height:1.1!important;
  font-variant-numeric:tabular-nums!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}

html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift > span {
  display:block!important;
  margin:0!important;
  font-size:10px!important;
  line-height:1.1!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

css_anchor = "        $this->addCss('css/pmd-shifts-bar-first-paint-fit-v17l.css');"
css_new = "        $this->addCss('css/pmd-shifts-bar-fit-v17m.css');"
js_old = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17f.js');"
js_new = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17m.js');"
marker = "        // PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M"

if css_new not in s:
    if s.count(css_anchor) != 1:
        raise SystemExit(f'STOP: V17L CSS registration count={s.count(css_anchor)}')
    s = s.replace(css_anchor, css_anchor + '\n' + marker + '\n' + css_new, 1)

if js_new not in s:
    if s.count(js_old) != 1:
        raise SystemExit(f'STOP: V17F JS registration count={s.count(js_old)}')
    s = s.replace(js_old, js_new, 1)

p.write_text(s)
print('Shifts.php: V17M CSS registered and V17F renderer fingerprint advanced to V17M')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NEW_JS"
grep -Fq "$MARKER_JS" "$TMPROOT/$NEW_JS"
grep -Fq "$MARKER_CSS" "$TMPROOT/$NEW_CSS"
grep -Fq "width:' + width.toFixed(4) + '% !important" "$TMPROOT/$NEW_JS"
grep -Fq "max-width:none !important" "$TMPROOT/$NEW_JS"
grep -Fq "padding:4px 10px!important" "$TMPROOT/$NEW_CSS"
grep -Fq "pmd-shifts-inpage-day-nav-v17m.js" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-bar-fit-v17m.css" "$TMPROOT/$CONTROLLER"

# V17M must not restore the repaint machinery removed by V17K.
if grep -Eq 'repairGeometry|MutationObserver|setInterval\(' "$TMPROOT/$NEW_JS"; then
    echo "STOP: forbidden late-repaint machinery detected in V17M renderer"
    exit 30
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 3 V17M TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

if [ -e "$NEW_CSS" ]; then
    NEW_CSS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_CSS")"
    sudo cp -a "$NEW_CSS" "$BACKUP/$NEW_CSS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY CONTROLLER + 2 NEW ASSETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"

sudo chown --reference="$ACTIVE_JS" "$NEW_JS"
sudo chmod --reference="$ACTIVE_JS" "$NEW_JS"
sudo chown --reference="$REF_CSS" "$NEW_CSS"
sudo chmod --reference="$REF_CSS" "$NEW_CSS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$NEW_JS"
grep -nF "$MARKER_JS" "$NEW_JS" | head -1
grep -nF "$MARKER_CSS" "$NEW_CSS" | head -1
grep -nF "pmd-shifts-inpage-day-nav-v17m.js" "$CONTROLLER"
grep -nF "pmd-shifts-bar-fit-v17m.css" "$CONTROLLER"
grep -Fq "width:' + width.toFixed(4) + '% !important" "$NEW_JS"
grep -Fq "max-width:none !important" "$NEW_JS"
grep -Fq "padding:4px 10px!important" "$NEW_CSS"

# Old files remain untouched for rollback/reference.
test -f "$ACTIVE_JS"
test -f "$REF_CSS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS DYNAMIC WIDTH + TEXT FIT V17M INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - server first paint and in-page day renderer use the same important bar geometry"
echo "  - 06:00-22:00 remains a long bar after changing days and coming back"
echo "  - 10:00-22:00 remains proportional after in-page navigation"
echo "  - shift time/label get extra vertical breathing room without changing row height"
echo "  - no late geometry repaint, MutationObserver, polling geometry, or blink is restored"
echo "  - V17F cache/prefetch behavior is preserved inside the new V17M renderer"
echo "  - Shift save/group merge/MFA/Portal logic is untouched"
echo "Backup: $BACKUP"
