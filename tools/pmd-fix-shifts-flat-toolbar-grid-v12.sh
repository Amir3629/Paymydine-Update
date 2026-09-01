#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

BRANCH="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
CSS="app/admin/assets/css/pmd-shifts-toolbar-grid-v12.css"
BACKUP="/tmp/pmd-shifts-toolbar-grid-v12-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-toolbar-grid-v12.XXXXXX)"
APPLY_STARTED=0
CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V12"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        if [ "$CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CSS" "$CSS"
        else
            sudo rm -f "$CSS"
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
    echo "STOP: Shifts page body marker missing"
    exit 21
}

if ! grep -Fq "pmd-shifts-canonical-994df35118a2.css" "$CONTROLLER" \
   && ! grep -Fq "pmd-shifts-canonical-92a6ad0051a5.css" "$CONTROLLER"; then
    echo "STOP: expected active Shifts canonical CSS registration not found"
    exit 22
fi

# The production markup must still expose the exact classes this visual patch targets.
grep -RFl "pmd-shifts-final-toolbar" app/admin/views/pmdshifts app/admin/assets/js >/dev/null || {
    echo "STOP: Shifts toolbar markup not found"
    exit 23
}
grep -RFl "pmd-shifts-final-scale" app/admin/views/pmdshifts app/admin/assets/js >/dev/null || {
    echo "STOP: Shifts timeline scale markup not found"
    exit 24
}

git cat-file -e "${BRANCH}:${CSS}" || {
    echo "STOP: V12 CSS missing from feature branch"
    exit 25
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$CONTROLLER")" "$TMPROOT/$(dirname "$CSS")"
cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
git show "${BRANCH}:${CSS}" > "$TMPROOT/$CSS"

test -s "$TMPROOT/$CSS"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

new_line = "        $this->addCss('css/pmd-shifts-toolbar-grid-v12.css');"
marker = "        // PMD_SHIFTS_TOOLBAR_GRID_ALIGNMENT_V12"

if new_line in s:
    print('Shifts.php: V12 CSS already registered')
    raise SystemExit(0)

anchors = [
    "        $this->addCss('css/pmd-shifts-canonical-994df35118a2.css');",
    "        $this->addCss('css/pmd-shifts-canonical-92a6ad0051a5.css');",
]

matches = [a for a in anchors if a in s]
if len(matches) != 1:
    raise SystemExit(f'STOP: expected exactly one canonical CSS anchor, found {len(matches)}')

anchor = matches[0]
s = s.replace(anchor, anchor + "\n" + marker + "\n" + new_line, 1)
p.write_text(s)
print('Shifts.php: V12 visual CSS registered after canonical CSS')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_TOOLBAR_GRID_ALIGNMENT_V12" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-toolbar-grid-v12.css" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_TOOLBAR_GRID_ALIGNMENT_V12" "$TMPROOT/$CSS"
grep -Fq "border: 0 !important" "$TMPROOT/$CSS"
grep -Fq "span:nth-child(13)" "$TMPROOT/$CSS"
grep -Fq "left: 100% !important" "$TMPROOT/$CSS"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 2 TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")" "$BACKUP/$(dirname "$CSS")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$CSS" ]; then
    CSS_EXISTED=1
    sudo cp -a "$CSS" "$BACKUP/$CSS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 2 TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$CSS" >/dev/null < "$TMPROOT/$CSS"

# Preserve asset ownership/mode from the currently loaded Shifts CSS family.
REF_CSS=""
for candidate in \
  app/admin/assets/css/pmd-shifts-canonical-994df35118a2.css \
  app/admin/assets/css/pmd-shifts-canonical-92a6ad0051a5.css \
  app/admin/assets/css/pmd-shifts-v1-6c3f93c60040.css \
  app/admin/assets/css/pmd-shifts-v1.css; do
    if [ -f "$candidate" ]; then
        REF_CSS="$candidate"
        break
    fi
done
if [ -n "$REF_CSS" ]; then
    sudo chown --reference="$REF_CSS" "$CSS"
    sudo chmod --reference="$REF_CSS" "$CSS"
fi

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
grep -nF "PMD_SHIFTS_TOOLBAR_GRID_ALIGNMENT_V12" "$CONTROLLER"
grep -nF "pmd-shifts-toolbar-grid-v12.css" "$CONTROLLER"
grep -nF "PMD_SHIFTS_TOOLBAR_GRID_ALIGNMENT_V12" "$CSS"
grep -nF "span:nth-child(13)" "$CSS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW/CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS FLAT TOOLBAR + GRID V12 INSTALLED"
echo "========================================"
echo "Fixes:"
echo "  - removes only the large date/action toolbar card frame"
echo "  - keeps previous/next date, date text, + Member, and calendar controls"
echo "  - pins 06:00/08:00/... labels to exact 2-hour timeline boundaries"
echo "  - schedule rows, OTP, Portal MFA, Member modal, and notification header untouched"
echo "Backup: $BACKUP"
