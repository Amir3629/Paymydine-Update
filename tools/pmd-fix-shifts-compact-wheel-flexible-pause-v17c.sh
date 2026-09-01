#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
SERVICE="app/Services/PmdShiftPlannerRuleService.php"
OLD_CSS="app/admin/assets/css/pmd-shifts-reservation-jade-time-v17b.css"
OLD_JS="app/admin/assets/js/pmd-shifts-reservation-jade-time-v17b.js"
NEW_CSS="app/admin/assets/css/pmd-shifts-reservation-jade-time-v17c.css"
NEW_JS="app/admin/assets/js/pmd-shifts-reservation-jade-time-v17c.js"
MARKER="PMD_SHIFTS_PAUSE_RECOMMENDATION_ONLY_V17C"

BACKUP="/tmp/pmd-shifts-v17c-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17c.XXXXXX)"
APPLY_STARTED=0
NEW_CSS_EXISTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17C"
        set +e

        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$SERVICE" "$SERVICE"

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
test -f "$SERVICE" || { echo "STOP: missing $SERVICE"; exit 21; }
test -f "$OLD_CSS" || { echo "STOP: missing live V17B CSS reference"; exit 22; }
test -f "$OLD_JS" || { echo "STOP: missing live V17B JS reference"; exit 23; }

if grep -Fq "pmd-shifts-reservation-jade-time-v17c.js" "$CONTROLLER"; then
    if grep -Fq "pmd-shifts-reservation-jade-time-v17c.css" "$CONTROLLER" && grep -Fq "$MARKER" "$SERVICE"; then
        echo "V17C is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17C production state"
    exit 24
fi

grep -Fq "pmd-shifts-reservation-jade-time-v17b.css" "$CONTROLLER" || {
    echo "STOP: expected V17B CSS registration missing"
    exit 25
}

grep -Fq "pmd-shifts-reservation-jade-time-v17b.js" "$CONTROLLER" || {
    echo "STOP: expected V17B JS registration missing"
    exit 26
}

grep -Fq "function normalizeBreakMinutes" "$SERVICE" || {
    echo "STOP: V17 break normalization function missing"
    exit 27
}

grep -Fq "minimumBreakMinutes" "$SERVICE" || {
    echo "STOP: V17 break recommendation helper missing"
    exit 28
}

git cat-file -e "$REF:$NEW_CSS" || { echo "STOP: V17C CSS missing on fetched branch"; exit 29; }
git cat-file -e "$REF:$NEW_JS" || { echo "STOP: V17C JS missing on fetched branch"; exit 30; }

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$CONTROLLER")" \
  "$TMPROOT/$(dirname "$SERVICE")" \
  "$TMPROOT/$(dirname "$NEW_CSS")" \
  "$TMPROOT/$(dirname "$NEW_JS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$SERVICE" "$TMPROOT/$SERVICE"
git show "$REF:$NEW_CSS" > "$TMPROOT/$NEW_CSS"
git show "$REF:$NEW_JS" > "$TMPROOT/$NEW_JS"

test -s "$TMPROOT/$NEW_CSS"
test -s "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old_css = "        $this->addCss('css/pmd-shifts-reservation-jade-time-v17b.css');"
new_css = "        $this->addCss('css/pmd-shifts-reservation-jade-time-v17c.css');"
old_js = "        $this->addJs('js/pmd-shifts-reservation-jade-time-v17b.js');"
new_js = "        $this->addJs('js/pmd-shifts-reservation-jade-time-v17c.js');"
old_marker = "        // PMD_SHIFTS_RESERVATION_JADE_TIME_V17B"
new_marker = "        // PMD_SHIFTS_RESERVATION_JADE_TIME_V17C"

if s.count(old_css) != 1:
    raise SystemExit(f"STOP: V17B CSS registration count={s.count(old_css)}")
if s.count(old_js) != 1:
    raise SystemExit(f"STOP: V17B JS registration count={s.count(old_js)}")

s = s.replace(old_css, new_css, 1)
s = s.replace(old_js, new_js, 1)
if old_marker in s:
    s = s.replace(old_marker, new_marker, 1)
elif new_marker not in s:
    raise SystemExit("STOP: V17B marker missing")

p.write_text(s)
print("Shifts.php: V17C assets prepared")
PY

python3 - "$TMPROOT/$SERVICE" <<'PY'
from pathlib import Path
import re
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_PAUSE_RECOMMENDATION_ONLY_V17C'

if marker not in s:
    pattern = re.compile(
        r"    public function normalizeBreakMinutes\(\?string \$startsAt, \?string \$endsAt, int \$requested\): int\n"
        r"    \{\n"
        r"        \$requested = max\(0, min\(240, \$requested\)\);\n"
        r"        return max\(\$requested, \$this->minimumBreakMinutes\(\$startsAt, \$endsAt\)\);\n"
        r"    \}"
    )
    replacement = """    public function normalizeBreakMinutes(?string $startsAt, ?string $endsAt, int $requested): int
    {
        // PMD_SHIFTS_PAUSE_RECOMMENDATION_ONLY_V17C
        // Start/end still drive the suggested default in the UI. Persistence
        // only sanitizes the owner's explicit choice and never raises it.
        return max(0, min(240, $requested));
    }"""
    s, count = pattern.subn(replacement, s, count=1)
    if count != 1:
        raise SystemExit(f'STOP: normalizeBreakMinutes enforcement anchor count={count}')

    merge_pattern = re.compile(
        r"        \$mergedStart = \$this->minuteToDbTime\(\$unionStart\);\n"
        r"        \$mergedEnd = \$this->minuteToDbTime\(\$unionEnd\);\n"
        r"        \$breakMinutes = max\(\n"
        r"            \$breakMinutes,\n"
        r"            \$this->minimumBreakMinutes\(substr\(\$mergedStart, 0, 5\), substr\(\$mergedEnd, 0, 5\)\)\n"
        r"        \);"
    )
    merge_replacement = """        $mergedStart = $this->minuteToDbTime($unionStart);
        $mergedEnd = $this->minuteToDbTime($unionEnd);
        // V17C: an overlap-union preserves the strongest already-planned
        // pause value, but does not manufacture a new mandatory minimum.
        $breakMinutes = max(0, min(240, $breakMinutes));"""
    s, count = merge_pattern.subn(merge_replacement, s, count=1)
    if count != 1:
        raise SystemExit(f'STOP: merged break enforcement anchor count={count}')

p.write_text(s)
print("PmdShiftPlannerRuleService.php: pause changed from enforcement to recommendation-only")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$SERVICE"
node --check "$TMPROOT/$NEW_JS"

grep -Fq "PMD_SHIFTS_RESERVATION_JADE_TIME_V17C" "$TMPROOT/$NEW_CSS"
grep -Fq "PMD_SHIFTS_RESERVATION_JADE_TIME_V17C" "$TMPROOT/$NEW_JS"
grep -Fq "pmd-shifts-reservation-jade-time-v17c.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-reservation-jade-time-v17c.js" "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$SERVICE"

if grep -Fq "return max(\$requested, \$this->minimumBreakMinutes" "$TMPROOT/$SERVICE"; then
    echo "STOP: backend pause minimum is still enforced in temp service"
    exit 40
fi

if grep -Fq "minimumBreakMinutes(substr(\$mergedStart" "$TMPROOT/$SERVICE"; then
    echo "STOP: merged pause minimum is still enforced in temp service"
    exit 41
fi

if grep -Fq "pmd-shifts-reservation-jade-time-v17b.js" "$TMPROOT/$CONTROLLER"; then
    echo "STOP: old V17B JS still registered in temp controller"
    exit 42
fi

if grep -Fq "pmd-shifts-reservation-jade-time-v17b.css" "$TMPROOT/$CONTROLLER"; then
    echo "STOP: old V17B CSS still registered in temp controller"
    exit 43
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 4 V17C TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

mkdir -p "$BACKUP/$(dirname "$SERVICE")"
sudo cp -a "$SERVICE" "$BACKUP/$SERVICE"

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
echo "5. APPLY ONLY THE 4 V17C TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$SERVICE" >/dev/null < "$TMPROOT/$SERVICE"
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
php -l "$SERVICE"
node --check "$NEW_JS"

grep -nF "PMD_SHIFTS_RESERVATION_JADE_TIME_V17C" "$CONTROLLER"
grep -nF "pmd-shifts-reservation-jade-time-v17c.css" "$CONTROLLER"
grep -nF "pmd-shifts-reservation-jade-time-v17c.js" "$CONTROLLER"
grep -nF "$MARKER" "$SERVICE"
grep -nF "PMD_SHIFTS_RESERVATION_JADE_TIME_V17C" "$NEW_CSS" | head -1
grep -nF "PMD_SHIFTS_RESERVATION_JADE_TIME_V17C" "$NEW_JS" | head -1

if grep -Fq "return max(\$requested, \$this->minimumBreakMinutes" "$SERVICE"; then
    echo "STOP: backend pause minimum still enforced live"
    exit 50
fi

if grep -Fq "minimumBreakMinutes(substr(\$mergedStart" "$SERVICE"; then
    echo "STOP: merged pause minimum still enforced live"
    exit 51
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
echo "SUCCESS - SHIFTS COMPACT WHEEL + FLEXIBLE PAUSE V17C INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - Start/End Jade wheels are shorter and tighter"
echo "  - empty vertical wheel space is reduced"
echo "  - pause buttons are no longer inside a large framed panel"
echo "  - Germany / ArbZG / Legal minimum copy is removed from the card"
echo "  - 0 / 20 / 30 / 45 / 60 / Custom are always selectable"
echo "  - shift duration chooses only the initial recommended pause"
echo "  - owner selection is preserved even when below the recommendation"
echo "  - edit mode preserves the saved pause value"
echo "  - backend sanitizes 0..240 only; it no longer raises the owner's value"
echo "  - V17 overlap merge and all schedule/navigation behavior remain intact"
echo "  - old V17B assets remain untouched for rollback/reference"
echo "Backup: $BACKUP"
