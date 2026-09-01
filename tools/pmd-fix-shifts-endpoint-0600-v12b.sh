#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

BRANCH="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
BASE_CSS="app/admin/assets/css/pmd-shifts-toolbar-grid-v12.css"
CSS="app/admin/assets/css/pmd-shifts-endpoint-labels-v12b.css"
BACKUP="/tmp/pmd-shifts-endpoint-v12b-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-endpoint-v12b.XXXXXX)"
APPLY_STARTED=0
CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V12B"
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
test -f "$BASE_CSS" || { echo "STOP: V12 CSS missing: $BASE_CSS"; exit 21; }

grep -Fq "pmd-shifts-toolbar-grid-v12.css" "$CONTROLLER" || {
    echo "STOP: V12 CSS is not registered in live Shifts.php"
    exit 22
}

git cat-file -e "${BRANCH}:${CSS}" || {
    echo "STOP: V12B CSS missing from feature branch"
    exit 23
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

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
anchor = "        $this->addCss('css/pmd-shifts-toolbar-grid-v12.css');"
new = "        $this->addCss('css/pmd-shifts-endpoint-labels-v12b.css');"
marker = "        // PMD_SHIFTS_ENDPOINT_LABEL_CENTER_V12B"

if new not in s:
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: expected V12 CSS anchor once, found {s.count(anchor)}')
    s = s.replace(anchor, anchor + "\n" + marker + "\n" + new, 1)
    p.write_text(s)
    print('Shifts.php: V12B endpoint override registered after V12')
else:
    print('Shifts.php: V12B already registered')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_ENDPOINT_LABEL_CENTER_V12B" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-endpoint-labels-v12b.css" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_ENDPOINT_LABEL_CENTER_V12B" "$TMPROOT/$CSS"
grep -Fq "span:first-child" "$TMPROOT/$CSS"
grep -Fq "span:last-child" "$TMPROOT/$CSS"
grep -Fq "translate(-50%, -50%)" "$TMPROOT/$CSS"

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

sudo tee "$CSS" >/dev/null < "$TMPROOT/$CSS"
sudo chown --reference="$BASE_CSS" "$CSS"
sudo chmod --reference="$BASE_CSS" "$CSS"
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
grep -nF "PMD_SHIFTS_ENDPOINT_LABEL_CENTER_V12B" "$CONTROLLER"
grep -nF "pmd-shifts-endpoint-labels-v12b.css" "$CONTROLLER"
grep -nF "PMD_SHIFTS_ENDPOINT_LABEL_CENTER_V12B" "$CSS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - BOTH 06:00 ENDPOINT LABELS V12B CENTERED"
echo "========================================"
echo "Fixes:"
echo "  - first 06:00 now centers on the opening timeline boundary"
echo "  - final 06:00 now centers on the closing timeline boundary"
echo "  - both use the same transform as 08:00, 10:00, 12:00, etc."
echo "  - no schedule, toolbar, OTP, Portal MFA, Member, or notification logic changed"
echo "Backup: $BACKUP"
