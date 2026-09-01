#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
V17D_CSS="app/admin/assets/css/pmd-shifts-planner-polish-v17d.css"
LEGACY_CSS="app/admin/assets/css/pmd-shifts-planner-ux-v15.css"
NEW_CSS="app/admin/assets/css/pmd-shifts-no-plus-v17e.css"
MARKER="PMD_SHIFTS_NO_PLUS_V17E"
BACKUP="/tmp/pmd-shifts-no-plus-v17e-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-no-plus-v17e.XXXXXX)"
APPLY_STARTED=0
NEW_CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17E"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
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
test -f "$V17D_CSS" || { echo "STOP: missing live V17D CSS"; exit 21; }
test -f "$LEGACY_CSS" || { echo "STOP: missing legacy V15 CSS source"; exit 22; }

grep -Fq "pmd-shifts-planner-polish-v17d.css" "$CONTROLLER" || {
    echo "STOP: V17D is not registered in live Shifts.php"
    exit 23
}

grep -Fq ".pmd-shifts-final-slot::after" "$LEGACY_CSS" || {
    echo "STOP: legacy plus pseudo-element selector not found"
    exit 24
}

grep -Fq "content: '+' !important" "$LEGACY_CSS" || {
    echo "STOP: legacy plus content rule not found"
    exit 25
}

if grep -Fq "pmd-shifts-no-plus-v17e.css" "$CONTROLLER"; then
    if [ -f "$NEW_CSS" ] && grep -Fq "$MARKER" "$NEW_CSS"; then
        echo "V17E is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17E production state"
    exit 26
fi

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$CONTROLLER")" "$TMPROOT/$(dirname "$NEW_CSS")"
cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"

cat > "$TMPROOT/$NEW_CSS" <<'CSS'
/* PMD_SHIFTS_NO_PLUS_V17E */

/*
 * V15 still owns a legacy ::after plus icon. V17D hid the real child <span>,
 * but that pseudo-element remained visible on hover. Keep every slot button
 * fully clickable while making all create-target decoration visually inert.
 */
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot::before,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot::after {
  content:none!important;
  display:none!important;
  opacity:0!important;
  visibility:hidden!important;
  width:0!important;
  height:0!important;
  min-width:0!important;
  min-height:0!important;
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  transform:none!important;
  pointer-events:none!important;
}

body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot > span {
  display:none!important;
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
}

body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot:hover,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-slot:active {
  background:transparent!important;
  box-shadow:none!important;
  transform:none!important;
  filter:none!important;
}

/* Retire any stale floating-plus artifact from the older fast planner too. */
body.pmd-shifts-page .pmd-shifts-slot-plus-v15-fast,
body.pmd-shifts-page [data-pmd-shifts-slot-plus-v15-fast] {
  display:none!important;
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
anchor = "        $this->addCss('css/pmd-shifts-planner-polish-v17d.css');"
new = "        $this->addCss('css/pmd-shifts-no-plus-v17e.css');"
marker = "        // PMD_SHIFTS_NO_PLUS_V17E"

if new not in s:
    if s.count(anchor) != 1:
        raise SystemExit(f"STOP: expected exactly one V17D CSS registration, found {s.count(anchor)}")
    s = s.replace(anchor, anchor + "\n" + marker + "\n" + new, 1)

p.write_text(s)
print("Shifts.php: V17E no-plus CSS registered after V17D")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-no-plus-v17e.css" "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$NEW_CSS"
grep -Fq ".pmd-shifts-final-slot::after" "$TMPROOT/$NEW_CSS"
grep -Fq "content:none!important" "$TMPROOT/$NEW_CSS"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17E TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$NEW_CSS" ]; then
    NEW_CSS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_CSS")"
    sudo cp -a "$NEW_CSS" "$BACKUP/$NEW_CSS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 2 V17E TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"
sudo chown --reference="$V17D_CSS" "$NEW_CSS"
sudo chmod --reference="$V17D_CSS" "$NEW_CSS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
grep -nF "PMD_SHIFTS_NO_PLUS_V17E" "$CONTROLLER"
grep -nF "pmd-shifts-no-plus-v17e.css" "$CONTROLLER"
grep -nF "$MARKER" "$NEW_CSS" | head -1
grep -nF ".pmd-shifts-final-slot::after" "$NEW_CSS" | head -1
grep -nF "content:none!important" "$NEW_CSS" | head -1

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS CELL PLUS V17E REMOVED"
echo "========================================"
echo "Behavior now:"
echo "  - no plus icon is rendered from the real slot child"
echo "  - no plus icon is rendered from V15 ::after pseudo-elements"
echo "  - no stale V15F floating plus survives"
echo "  - mouse hover has no slot decoration"
echo "  - the entire cell remains clickable"
echo "  - shift create/save/group overlap logic is untouched"
echo "Backup: $BACKUP"
