#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
CSS="app/admin/assets/css/pmd-shifts-planner-ux-v15.css"
JS="app/admin/assets/js/pmd-shifts-planner-ux-v15.js"
REF_CSS="app/admin/assets/css/pmd-shifts-big-calendar-v14.css"
REF_JS="app/admin/assets/js/pmd-shifts-big-calendar-v14.js"
V13_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v13.js"
BACKUP="/tmp/pmd-shifts-planner-ux-v15-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-planner-ux-v15.XXXXXX)"
CSS_EXISTED=0
JS_EXISTED=0
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V15"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        if [ "$CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CSS" "$CSS"
        else
            sudo rm -f "$CSS"
        fi
        if [ "$JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$JS" "$JS"
        else
            sudo rm -f "$JS"
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
test -f "$V13_JS" || { echo "STOP: V13 in-page navigation JS missing"; exit 21; }
test -f "$REF_CSS" || { echo "STOP: V14 calendar CSS missing"; exit 22; }
test -f "$REF_JS" || { echo "STOP: V14 calendar JS missing"; exit 23; }

grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$V13_JS" || {
    echo "STOP: V13 day navigation marker missing"
    exit 24
}
grep -Fq "pmd-shifts-big-calendar-v14.css" "$CONTROLLER" || {
    echo "STOP: V14 calendar CSS is not registered"
    exit 25
}
grep -Fq "pmd-shifts-big-calendar-v14.js" "$CONTROLLER" || {
    echo "STOP: V14 calendar JS is not registered"
    exit 26
}

git cat-file -e "$REF:$CSS"
git cat-file -e "$REF:$JS"

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$CONTROLLER")" \
  "$TMPROOT/$(dirname "$CSS")" \
  "$TMPROOT/$(dirname "$JS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
git show "$REF:$CSS" > "$TMPROOT/$CSS"
git show "$REF:$JS" > "$TMPROOT/$JS"

test -s "$TMPROOT/$CSS"
test -s "$TMPROOT/$JS"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

css_anchor = "        $this->addCss('css/pmd-shifts-big-calendar-v14.css');"
js_anchor = "        $this->addJs('js/pmd-shifts-big-calendar-v14.js');"
css_new = "        $this->addCss('css/pmd-shifts-planner-ux-v15.css');"
js_new = "        $this->addJs('js/pmd-shifts-planner-ux-v15.js');"
marker = "        // PMD_SHIFTS_PLANNER_UX_V15"

if css_new not in s:
    if s.count(css_anchor) != 1:
        raise SystemExit(f"STOP: V14 CSS anchor count={s.count(css_anchor)}")
    s = s.replace(css_anchor, css_anchor + "\n" + marker + "\n" + css_new, 1)

if js_new not in s:
    if s.count(js_anchor) != 1:
        raise SystemExit(f"STOP: V14 JS anchor count={s.count(js_anchor)}")
    s = s.replace(js_anchor, js_anchor + "\n" + js_new, 1)

p.write_text(s)
print("Shifts.php: V15 planner UX assets registered after V14")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$JS"

grep -Fq "PMD_SHIFTS_PLANNER_UX_V15" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_PLANNER_UX_V15" "$TMPROOT/$CSS"
grep -Fq "PMD_SHIFTS_PLANNER_UX_V15" "$TMPROOT/$JS"
grep -Fq "data-pmd-fixed-date" "$TMPROOT/$JS"
grep -Fq "data-pmd-time-wheel-open-v15" "$TMPROOT/$JS"
grep -Fq ".pmd-shifts-final-slot::after" "$TMPROOT/$CSS"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 3 TARGETS"
echo "========================================"

mkdir -p \
  "$BACKUP/$(dirname "$CONTROLLER")" \
  "$BACKUP/$(dirname "$CSS")" \
  "$BACKUP/$(dirname "$JS")"

sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$CSS" ]; then
    CSS_EXISTED=1
    sudo cp -a "$CSS" "$BACKUP/$CSS"
fi

if [ -e "$JS" ]; then
    JS_EXISTED=1
    sudo cp -a "$JS" "$BACKUP/$JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 3 TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$CSS" >/dev/null < "$TMPROOT/$CSS"
sudo tee "$JS" >/dev/null < "$TMPROOT/$JS"

sudo chown --reference="$REF_CSS" "$CSS"
sudo chmod --reference="$REF_CSS" "$CSS"
sudo chown --reference="$REF_JS" "$JS"
sudo chmod --reference="$REF_JS" "$JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$JS"

grep -nF "PMD_SHIFTS_PLANNER_UX_V15" "$CONTROLLER"
grep -nF "PMD_SHIFTS_PLANNER_UX_V15" "$CSS"
grep -nF "PMD_SHIFTS_PLANNER_UX_V15" "$JS"
grep -nF "data-pmd-time-wheel-open-v15" "$JS" | head -2
grep -nF ".pmd-shifts-final-slot::after" "$CSS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS PLANNER UX V15 INSTALLED"
echo "========================================"
echo "Fixes:"
echo "  - date row remains visible immediately after in-page day changes"
echo "  - entire empty planning slot is clickable"
echo "  - tiny repeated plus icons are hidden; one large plus appears on the active cell"
echo "  - Add/Edit Shift modal gets stronger visual hierarchy"
echo "  - Start/End use a Jade-inspired hour/minute/AM-PM wheel"
echo "  - real starts_at/ends_at inputs remain in the form and backend save logic is unchanged"
echo "  - V13 in-page navigation and V14 big calendar remain untouched"
echo "Backup: $BACKUP"
