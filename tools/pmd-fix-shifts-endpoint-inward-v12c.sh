#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

BRANCH="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
CSS="app/admin/assets/css/pmd-shifts-endpoint-labels-v12c.css"
BACKUP="/tmp/pmd-shifts-endpoint-v12c-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-endpoint-v12c.XXXXXX)"
APPLY_STARTED=0
CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V12C"
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
grep -Fq "pmd-shifts-endpoint-labels-v12b.css" "$CONTROLLER" || {
    echo "STOP: V12B endpoint CSS is not registered on production"
    exit 21
}
git cat-file -e "${BRANCH}:${CSS}" || {
    echo "STOP: V12C CSS missing from feature branch"
    exit 22
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
new_line = "        $this->addCss('css/pmd-shifts-endpoint-labels-v12c.css');"
marker = "        // PMD_SHIFTS_ENDPOINT_LABEL_INWARD_V12C"
if new_line in s:
    print('Shifts.php: V12C already registered')
    raise SystemExit(0)
anchor = "        $this->addCss('css/pmd-shifts-endpoint-labels-v12b.css');"
if s.count(anchor) != 1:
    raise SystemExit(f'STOP: expected exactly one V12B CSS anchor, found {s.count(anchor)}')
s = s.replace(anchor, anchor + "\n" + marker + "\n" + new_line, 1)
p.write_text(s)
print('Shifts.php: V12C registered after V12B')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"
php -l "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_ENDPOINT_LABEL_INWARD_V12C" "$TMPROOT/$CONTROLLER"
grep -Fq "translate(0, -50%)" "$TMPROOT/$CSS"
grep -Fq "translate(-100%, -50%)" "$TMPROOT/$CSS"
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

REF_CSS="app/admin/assets/css/pmd-shifts-endpoint-labels-v12b.css"
if [ -f "$REF_CSS" ]; then
    sudo chown --reference="$REF_CSS" "$CSS"
    sudo chmod --reference="$REF_CSS" "$CSS"
fi

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"
php -l "$CONTROLLER"
grep -nF "PMD_SHIFTS_ENDPOINT_LABEL_INWARD_V12C" "$CONTROLLER"
grep -nF "pmd-shifts-endpoint-labels-v12c.css" "$CONTROLLER"
grep -nF "translate(0, -50%)" "$CSS"
grep -nF "translate(-100%, -50%)" "$CSS"
echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS ENDPOINT LABELS V12C FIXED"
echo "========================================"
echo "Fixes:"
echo "  - opening 06:00 stays on the correct boundary but renders fully inside the timeline"
echo "  - opening 06:00 is no longer hidden behind sticky TEAM"
echo "  - closing 06:00 renders inward from the right boundary"
echo "  - 08:00/10:00/etc remain centered exactly as before"
echo "  - no schedule, toolbar, OTP, Portal MFA, Member, or notification logic changed"
echo "Backup: $BACKUP"
