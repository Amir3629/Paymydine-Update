#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
FAST_CSS="app/admin/assets/css/pmd-shifts-planner-ux-v15-fast.css"
FAST_JS="app/admin/assets/js/pmd-shifts-planner-ux-v15-fast.js"
OLD_CSS="app/admin/assets/css/pmd-shifts-planner-ux-v15.css"
OLD_JS="app/admin/assets/js/pmd-shifts-planner-ux-v15.js"
BACKUP="/tmp/pmd-shifts-planner-v15f-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-planner-v15f.XXXXXX)"
FAST_CSS_EXISTED=0
FAST_JS_EXISTED=0
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V15F"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        if [ "$FAST_CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$FAST_CSS" "$FAST_CSS"
        else
            sudo rm -f "$FAST_CSS"
        fi
        if [ "$FAST_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$FAST_JS" "$FAST_JS"
        else
            sudo rm -f "$FAST_JS"
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
test -f "$OLD_CSS" || { echo "STOP: V15 CSS missing"; exit 21; }
test -f "$OLD_JS" || { echo "STOP: V15 JS missing"; exit 22; }

git cat-file -e "$REF:$FAST_CSS"
git cat-file -e "$REF:$FAST_JS"

python3 - "$CONTROLLER" <<'PY'
from pathlib import Path
import sys
s = Path(sys.argv[1]).read_text()
old_js = "$this->addJs('js/pmd-shifts-planner-ux-v15.js');"
fast_js = "$this->addJs('js/pmd-shifts-planner-ux-v15-fast.js');"
old_css = "$this->addCss('css/pmd-shifts-planner-ux-v15.css');"
if old_css not in s:
    raise SystemExit('STOP: V15 CSS registration missing')
if old_js not in s and fast_js not in s:
    raise SystemExit('STOP: neither old nor fast V15 JS registration found')
print('Production V15 registration anchors OK')
PY

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$CONTROLLER")" \
  "$TMPROOT/$(dirname "$FAST_CSS")" \
  "$TMPROOT/$(dirname "$FAST_JS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
git show "$REF:$FAST_CSS" > "$TMPROOT/$FAST_CSS"
git show "$REF:$FAST_JS" > "$TMPROOT/$FAST_JS"

test -s "$TMPROOT/$FAST_CSS"
test -s "$TMPROOT/$FAST_JS"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()

old_css = "        $this->addCss('css/pmd-shifts-planner-ux-v15.css');"
fast_css = "        $this->addCss('css/pmd-shifts-planner-ux-v15-fast.css');"
old_js = "        $this->addJs('js/pmd-shifts-planner-ux-v15.js');"
fast_js = "        $this->addJs('js/pmd-shifts-planner-ux-v15-fast.js');"
marker = "        // PMD_SHIFTS_PLANNER_PERFORMANCE_V15F"

if fast_css not in s:
    if s.count(old_css) != 1:
        raise SystemExit(f'STOP: V15 CSS anchor count={s.count(old_css)}')
    s = s.replace(old_css, old_css + "\n" + marker + "\n" + fast_css, 1)

if old_js in s:
    if s.count(old_js) != 1:
        raise SystemExit(f'STOP: old V15 JS count={s.count(old_js)}')
    s = s.replace(old_js, fast_js, 1)
elif fast_js not in s:
    raise SystemExit('STOP: fast V15 JS registration unavailable')

p.write_text(s)
print('Shifts.php: heavy V15 runtime replaced by V15F fast runtime')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$FAST_JS"

grep -Fq "PMD_SHIFTS_PLANNER_PERFORMANCE_V15F" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-planner-ux-v15-fast.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-planner-ux-v15-fast.js" "$TMPROOT/$CONTROLLER"
if grep -Fq "addJs('js/pmd-shifts-planner-ux-v15.js')" "$TMPROOT/$CONTROLLER"; then
    echo "STOP: heavy V15 JS is still registered"
    exit 30
fi

grep -Fq "PMD_SHIFTS_PLANNER_UX_V15_FAST" "$TMPROOT/$FAST_CSS"
grep -Fq "PMD_SHIFTS_PLANNER_UX_V15_FAST" "$TMPROOT/$FAST_JS"
grep -Fq "singleSlotPlus" "$TMPROOT/$FAST_JS"
if grep -Fq "subtree: true" "$TMPROOT/$FAST_JS"; then
    echo "STOP: fast runtime unexpectedly contains subtree observer"
    exit 31
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 3 TARGETS"
echo "========================================"

mkdir -p \
  "$BACKUP/$(dirname "$CONTROLLER")" \
  "$BACKUP/$(dirname "$FAST_CSS")" \
  "$BACKUP/$(dirname "$FAST_JS")"

sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"
if [ -e "$FAST_CSS" ]; then
    FAST_CSS_EXISTED=1
    sudo cp -a "$FAST_CSS" "$BACKUP/$FAST_CSS"
fi
if [ -e "$FAST_JS" ]; then
    FAST_JS_EXISTED=1
    sudo cp -a "$FAST_JS" "$BACKUP/$FAST_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 3 TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$FAST_CSS" >/dev/null < "$TMPROOT/$FAST_CSS"
sudo tee "$FAST_JS" >/dev/null < "$TMPROOT/$FAST_JS"

sudo chown --reference="$OLD_CSS" "$FAST_CSS"
sudo chmod --reference="$OLD_CSS" "$FAST_CSS"
sudo chown --reference="$OLD_JS" "$FAST_JS"
sudo chmod --reference="$OLD_JS" "$FAST_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$FAST_JS"

grep -nF "PMD_SHIFTS_PLANNER_PERFORMANCE_V15F" "$CONTROLLER"
grep -nF "pmd-shifts-planner-ux-v15-fast.js" "$CONTROLLER"
grep -nF "pmd-shifts-planner-ux-v15-fast.css" "$CONTROLLER"
grep -nF "PMD_SHIFTS_PLANNER_UX_V15_FAST" "$FAST_JS" | head -1
grep -nF "PMD_SHIFTS_PLANNER_UX_V15_FAST" "$FAST_CSS" | head -1

if grep -Fq "addJs('js/pmd-shifts-planner-ux-v15.js')" "$CONTROLLER"; then
    echo "STOP: heavy V15 JS is still live"
    exit 40
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
echo "SUCCESS - SHIFTS V15F PERFORMANCE FIX INSTALLED"
echo "========================================"
echo "Performance changes:"
echo "  - removes the heavy V15 subtree MutationObserver"
echo "  - uses one floating plus for the whole planner instead of one rendered plus per slot"
echo "  - disables per-slot transform/shadow/transition pseudo-elements"
echo "  - time wheel DOM is created only when the user opens it"
echo "  - removes expensive time-wheel backdrop blur in Safari"
echo "  - full-cell click, date repair, V13 navigation, V14 calendar and V15 modal styling remain"
echo "Backup: $BACKUP"
