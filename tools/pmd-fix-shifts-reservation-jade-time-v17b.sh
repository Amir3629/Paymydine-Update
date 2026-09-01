#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
OLD_CSS="app/admin/assets/css/pmd-shifts-planner-v17.css"
OLD_JS="app/admin/assets/js/pmd-shifts-planner-v17.js"
NEW_CSS="app/admin/assets/css/pmd-shifts-reservation-jade-time-v17b.css"
NEW_JS="app/admin/assets/js/pmd-shifts-reservation-jade-time-v17b.js"

BACKUP="/tmp/pmd-shifts-jade-time-v17b-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-jade-time-v17b.XXXXXX)"
APPLY_STARTED=0
NEW_CSS_EXISTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17B"
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
test -f "$OLD_CSS" || { echo "STOP: missing live V17 CSS"; exit 21; }
test -f "$OLD_JS" || { echo "STOP: missing live V17 JS reference"; exit 22; }

if grep -Fq "pmd-shifts-reservation-jade-time-v17b.js" "$CONTROLLER"; then
    if grep -Fq "pmd-shifts-reservation-jade-time-v17b.css" "$CONTROLLER"; then
        echo "V17B is already registered in production. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17B controller registration state"
    exit 23
fi

grep -Fq "pmd-shifts-planner-v17.css" "$CONTROLLER" || {
    echo "STOP: V17 CSS registration missing from production controller"
    exit 24
}

grep -Fq "pmd-shifts-planner-v17.js" "$CONTROLLER" || {
    echo "STOP: V17 JS registration missing from production controller"
    exit 25
}

git cat-file -e "$REF:$NEW_CSS" || { echo "STOP: V17B CSS missing on fetched branch"; exit 26; }
git cat-file -e "$REF:$NEW_JS" || { echo "STOP: V17B JS missing on fetched branch"; exit 27; }

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$CONTROLLER")" \
  "$TMPROOT/$(dirname "$NEW_CSS")" \
  "$TMPROOT/$(dirname "$NEW_JS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
git show "$REF:$NEW_CSS" > "$TMPROOT/$NEW_CSS"
git show "$REF:$NEW_JS" > "$TMPROOT/$NEW_JS"

test -s "$TMPROOT/$NEW_CSS"
test -s "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old_css = "        $this->addCss('css/pmd-shifts-planner-v17.css');"
new_css = "        $this->addCss('css/pmd-shifts-reservation-jade-time-v17b.css');"
old_js = "        $this->addJs('js/pmd-shifts-planner-v17.js');"
new_js = "        $this->addJs('js/pmd-shifts-reservation-jade-time-v17b.js');"
marker = "        // PMD_SHIFTS_RESERVATION_JADE_TIME_V17B"

if s.count(old_css) != 1:
    raise SystemExit(f"STOP: V17 CSS registration count={s.count(old_css)}")
if s.count(old_js) != 1:
    raise SystemExit(f"STOP: V17 JS registration count={s.count(old_js)}")
if new_css in s or new_js in s:
    raise SystemExit("STOP: unexpected partial V17B registration")

# Keep V17 CSS because it owns hourly cells + narrow Team rail.
# Add only the Reservation Jade visual override after it.
s = s.replace(old_css, old_css + "\n" + marker + "\n" + new_css, 1)

# Replace only the V17 time/break runtime. All server-side V17 rules stay intact.
s = s.replace(old_js, new_js, 1)

p.write_text(s)
print("Shifts.php: V17B Reservation Jade assets prepared")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NEW_JS"

grep -Fq "PMD_SHIFTS_RESERVATION_JADE_TIME_V17B" "$TMPROOT/$NEW_CSS"
grep -Fq "PMD_SHIFTS_RESERVATION_JADE_TIME_V17B" "$TMPROOT/$NEW_JS"
grep -Fq "pmd-shifts-planner-v17.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-reservation-jade-time-v17b.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-reservation-jade-time-v17b.js" "$TMPROOT/$CONTROLLER"

if grep -Fq "pmd-shifts-planner-v17.js" "$TMPROOT/$CONTROLLER"; then
    echo "STOP: old V17 JS is still registered in temp controller"
    exit 30
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 3 V17B TARGETS"
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
echo "5. APPLY ONLY THE 3 V17B TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"

sudo chown --reference="$OLD_CSS" "$NEW_CSS"
sudo chmod --reference="$OLD_CSS" "$NEW_CSS"
sudo chown --reference="$OLD_JS" "$NEW_JS"
sudo chmod --reference="$OLD_JS" "$NEW_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$NEW_JS"

grep -nF "PMD_SHIFTS_RESERVATION_JADE_TIME_V17B" "$CONTROLLER"
grep -nF "pmd-shifts-reservation-jade-time-v17b.css" "$CONTROLLER"
grep -nF "pmd-shifts-reservation-jade-time-v17b.js" "$CONTROLLER"
grep -nF "PMD_SHIFTS_RESERVATION_JADE_TIME_V17B" "$NEW_CSS" | head -1
grep -nF "PMD_SHIFTS_RESERVATION_JADE_TIME_V17B" "$NEW_JS" | head -1

if grep -Fq "pmd-shifts-planner-v17.js" "$CONTROLLER"; then
    echo "STOP: old V17 JS still registered live"
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
echo "SUCCESS - SHIFTS RESERVATION JADE TIME V17B INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - Start and End use the Reservation Composer Jade wheel model"
echo "  - no separate Selected summary bars"
echo "  - fixed center highlight + top/bottom fade"
echo "  - hour/minute/AM-PM values scroll and snap to center"
echo "  - repeated middle-cycle recenter prevents Safari scroll-edge ugliness"
echo "  - no popup time modal and no MutationObserver"
echo "  - V17 overlap merge, legal break enforcement, hourly cells and Team width remain intact"
echo "  - old V17 files remain untouched for rollback/reference"
echo "Backup: $BACKUP"
