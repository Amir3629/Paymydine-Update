#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
SERVER="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
LIVE_V13="app/admin/assets/js/pmd-shifts-inpage-day-nav-v13.js"
NEW_MAIN="app/admin/assets/js/pmd-shifts-inpage-day-nav-v16.js"
CSS="app/admin/assets/css/pmd-shifts-hourly-inline-time-v16.css"
UIJS="app/admin/assets/js/pmd-shifts-inline-time-v16.js"
REF_CSS="app/admin/assets/css/pmd-shifts-planner-ux-v15-fast.css"
REF_JS="app/admin/assets/js/pmd-shifts-planner-ux-v15-fast.js"

BACKUP="/tmp/pmd-shifts-hourly-inline-v16-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-hourly-inline-v16.XXXXXX)"
NEW_MAIN_EXISTED=0
CSS_EXISTED=0
UIJS_EXISTED=0
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V16"
        set +e

        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$SERVER" "$SERVER"

        if [ "$NEW_MAIN_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_MAIN" "$NEW_MAIN"
        else
            sudo rm -f "$NEW_MAIN"
        fi

        if [ "$CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CSS" "$CSS"
        else
            sudo rm -f "$CSS"
        fi

        if [ "$UIJS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$UIJS" "$UIJS"
        else
            sudo rm -f "$UIJS"
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
test -f "$SERVER" || { echo "STOP: missing $SERVER"; exit 21; }
test -f "$LIVE_V13" || { echo "STOP: missing $LIVE_V13"; exit 22; }
test -f "$REF_CSS" || { echo "STOP: missing $REF_CSS"; exit 23; }
test -f "$REF_JS" || { echo "STOP: missing $REF_JS"; exit 24; }

grep -Fq "pmd-shifts-inpage-day-nav-v13.js" "$CONTROLLER" || {
    echo "STOP: production is not using V13 day navigation"
    exit 25
}

grep -Fq "pmd-shifts-planner-ux-v15-fast.js" "$CONTROLLER" || {
    echo "STOP: V15F fast planner runtime is not registered"
    exit 26
}

grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$LIVE_V13" || {
    echo "STOP: active V13 marker missing"
    exit 27
}

git cat-file -e "$REF:$CSS"
git cat-file -e "$REF:$UIJS"

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$CONTROLLER")" \
  "$TMPROOT/$(dirname "$SERVER")" \
  "$TMPROOT/$(dirname "$NEW_MAIN")" \
  "$TMPROOT/$(dirname "$CSS")" \
  "$TMPROOT/$(dirname "$UIJS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$SERVER" "$TMPROOT/$SERVER"
cp "$LIVE_V13" "$TMPROOT/$NEW_MAIN"
git show "$REF:$CSS" > "$TMPROOT/$CSS"
git show "$REF:$UIJS" > "$TMPROOT/$UIJS"

test -s "$TMPROOT/$CSS"
test -s "$TMPROOT/$UIJS"

python3 - "$TMPROOT/$NEW_MAIN" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = "PMD_SHIFTS_HOURLY_QUICK_CREATE_V16"

if marker not in s:
    loop_old = "for (var value = 360; value < 1800; value += 30) {"
    loop_new = "for (var value = 360; value < 1800; value += 60) {"
    label_old = "if (labelInput) labelInput.value = 'Shift';"
    label_new = "if (labelInput) labelInput.value = '';"

    if s.count(loop_old) != 1:
        raise SystemExit(f"STOP: JS 30-minute slot loop count={s.count(loop_old)}")
    if s.count(label_old) != 1:
        raise SystemExit(f"STOP: JS default Shift label count={s.count(label_old)}")

    anchor = "/* PMD_SHIFTS_INPAGE_DAY_NAV_V13 */"
    if anchor in s:
        s = s.replace(anchor, anchor + "\n/* PMD_SHIFTS_HOURLY_QUICK_CREATE_V16 */", 1)
    else:
        s = "/* PMD_SHIFTS_HOURLY_QUICK_CREATE_V16 */\n" + s

    s = s.replace(loop_old, loop_new, 1)
    s = s.replace(label_old, label_new, 1)
    p.write_text(s)

print("Active day renderer: hourly quick-create + blank new Shift name prepared")
PY

python3 - "$TMPROOT/$SERVER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = "PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V16"

if marker not in s:
    old = "$slot += 30"
    new = "$slot += 60"
    if s.count(old) != 1:
        raise SystemExit(f"STOP: server 30-minute slot step count={s.count(old)}")

    slot_anchor = '<div class="pmd-shifts-final-slots">'
    if s.count(slot_anchor) < 1:
        raise SystemExit("STOP: server slots container missing")

    s = s.replace(
        slot_anchor,
        "{{-- PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V16 --}}\n                            " + slot_anchor,
        1,
    )
    s = s.replace(old, new, 1)
    p.write_text(s)

print("Server first paint: hourly quick-create prepared")
PY

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old_main = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v13.js');"
new_main = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v16.js');"
css_anchor = "        $this->addCss('css/pmd-shifts-planner-ux-v15-fast.css');"
js_anchor = "        $this->addJs('js/pmd-shifts-planner-ux-v15-fast.js');"
css_new = "        $this->addCss('css/pmd-shifts-hourly-inline-time-v16.css');"
js_new = "        $this->addJs('js/pmd-shifts-inline-time-v16.js');"
marker = "        // PMD_SHIFTS_HOURLY_INLINE_TIME_V16"

if new_main not in s:
    if s.count(old_main) != 1:
        raise SystemExit(f"STOP: V13 registration count={s.count(old_main)}")
    s = s.replace(old_main, new_main, 1)

if css_new not in s:
    if s.count(css_anchor) != 1:
        raise SystemExit(f"STOP: V15F CSS anchor count={s.count(css_anchor)}")
    s = s.replace(css_anchor, css_anchor + "\n" + marker + "\n" + css_new, 1)

if js_new not in s:
    if s.count(js_anchor) != 1:
        raise SystemExit(f"STOP: V15F JS anchor count={s.count(js_anchor)}")
    s = s.replace(js_anchor, js_anchor + "\n" + js_new, 1)

p.write_text(s)
print("Shifts.php: V16 renderer + inline wheel assets prepared")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$SERVER"
node --check "$TMPROOT/$NEW_MAIN"
node --check "$TMPROOT/$UIJS"

grep -Fq "PMD_SHIFTS_HOURLY_QUICK_CREATE_V16" "$TMPROOT/$NEW_MAIN"
grep -Fq "value += 60" "$TMPROOT/$NEW_MAIN"
grep -Fq "labelInput.value = '';" "$TMPROOT/$NEW_MAIN"
grep -Fq "PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V16" "$TMPROOT/$SERVER"
grep -Fq '\$slot += 60' "$TMPROOT/$SERVER"
grep -Fq "pmd-shifts-inpage-day-nav-v16.js" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-hourly-inline-time-v16.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-inline-time-v16.js" "$TMPROOT/$CONTROLLER"
grep -Fq "repeat(24" "$TMPROOT/$CSS"
grep -Fq "PMD_SHIFTS_INLINE_TIME_V16" "$TMPROOT/$UIJS"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 5 TARGETS"
echo "========================================"

mkdir -p \
  "$BACKUP/$(dirname "$CONTROLLER")" \
  "$BACKUP/$(dirname "$SERVER")" \
  "$BACKUP/$(dirname "$NEW_MAIN")" \
  "$BACKUP/$(dirname "$CSS")" \
  "$BACKUP/$(dirname "$UIJS")"

sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"
sudo cp -a "$SERVER" "$BACKUP/$SERVER"

if [ -e "$NEW_MAIN" ]; then
    NEW_MAIN_EXISTED=1
    sudo cp -a "$NEW_MAIN" "$BACKUP/$NEW_MAIN"
fi

if [ -e "$CSS" ]; then
    CSS_EXISTED=1
    sudo cp -a "$CSS" "$BACKUP/$CSS"
fi

if [ -e "$UIJS" ]; then
    UIJS_EXISTED=1
    sudo cp -a "$UIJS" "$BACKUP/$UIJS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 5 TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$SERVER" >/dev/null < "$TMPROOT/$SERVER"
sudo tee "$NEW_MAIN" >/dev/null < "$TMPROOT/$NEW_MAIN"
sudo tee "$CSS" >/dev/null < "$TMPROOT/$CSS"
sudo tee "$UIJS" >/dev/null < "$TMPROOT/$UIJS"

sudo chown --reference="$LIVE_V13" "$NEW_MAIN"
sudo chmod --reference="$LIVE_V13" "$NEW_MAIN"
sudo chown --reference="$REF_CSS" "$CSS"
sudo chmod --reference="$REF_CSS" "$CSS"
sudo chown --reference="$REF_JS" "$UIJS"
sudo chmod --reference="$REF_JS" "$UIJS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
php -l "$SERVER"
node --check "$NEW_MAIN"
node --check "$UIJS"

grep -nF "PMD_SHIFTS_HOURLY_INLINE_TIME_V16" "$CONTROLLER"
grep -nF "PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V16" "$SERVER"
grep -nF "PMD_SHIFTS_HOURLY_QUICK_CREATE_V16" "$NEW_MAIN"
grep -nF "value += 60" "$NEW_MAIN" | head -1
grep -nF "labelInput.value = '';" "$NEW_MAIN" | head -1
grep -nF "repeat(24" "$CSS" | head -1
grep -nF "PMD_SHIFTS_INLINE_TIME_V16" "$UIJS" | head -1

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS HOURLY + INLINE TIME V16 INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - quick-create grid has ONE real button per hour (:00 only)"
echo "  - :30 quick-create buttons are no longer generated"
echo "  - whole hourly cell remains clickable and V15F keeps one floating plus"
echo "  - Start and End wheels are always visible inside Add/Edit Shift"
echo "  - wheel supports :00 / :15 / :30 / :45 for precise shift times"
echo "  - new Shift name starts BLANK with a placeholder; existing shift names are preserved"
echo "  - backend starts_at / ends_at inputs and save logic are unchanged"
echo "  - V13 source file remains untouched; V16 is a copied/patched production renderer"
echo "Backup: $BACKUP"
