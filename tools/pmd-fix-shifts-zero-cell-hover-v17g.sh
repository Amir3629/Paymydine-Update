#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
REF_CSS="app/admin/assets/css/pmd-shifts-clean-frame-v17f.css"
NEW_CSS="app/admin/assets/css/pmd-shifts-zero-cell-hover-v17g.css"
MARKER="PMD_SHIFTS_ZERO_CELL_HOVER_V17G"
BACKUP="/tmp/pmd-shifts-v17g-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17g.XXXXXX)"
APPLY_STARTED=0
NEW_CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17G"
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
test -f "$REF_CSS" || { echo "STOP: missing live V17F CSS"; exit 21; }

grep -Fq "pmd-shifts-clean-frame-v17f.css" "$CONTROLLER" || {
    echo "STOP: V17F CSS is not registered in live Shifts.php"
    exit 22
}

grep -Fq "PMD_SHIFTS_CLEAN_FRAME_V17F" "$REF_CSS" || {
    echo "STOP: live V17F CSS marker missing"
    exit 23
}

if grep -Fq "pmd-shifts-zero-cell-hover-v17g.css" "$CONTROLLER"; then
    if [ -f "$NEW_CSS" ] && grep -Fq "$MARKER" "$NEW_CSS"; then
        echo "V17G is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17G production state"
    exit 24
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
/* PMD_SHIFTS_ZERO_CELL_HOVER_V17G */

/*
 * Final interaction-paint authority for empty planner slots.
 * Earlier Shifts CSS still contains hover/focus-visible fills. Safari may keep
 * focus after pointer interaction, so neutralize every interactive state.
 * The button stays present, clickable and keyboard-operable.
 */
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-screen .pmd-shifts-final-track .pmd-shifts-final-slots > button.pmd-shifts-final-slot,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-screen .pmd-shifts-final-track .pmd-shifts-final-slots > button.pmd-shifts-final-slot:hover,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-screen .pmd-shifts-final-track .pmd-shifts-final-slots > button.pmd-shifts-final-slot:focus,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-screen .pmd-shifts-final-track .pmd-shifts-final-slots > button.pmd-shifts-final-slot:focus-visible,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-screen .pmd-shifts-final-track .pmd-shifts-final-slots > button.pmd-shifts-final-slot:active {
  -webkit-appearance:none!important;
  appearance:none!important;
  -webkit-tap-highlight-color:transparent!important;
  background:none!important;
  background-color:transparent!important;
  background-image:none!important;
  border:0!important;
  border-color:transparent!important;
  border-radius:0!important;
  outline:0!important;
  outline-color:transparent!important;
  box-shadow:none!important;
  filter:none!important;
  transform:none!important;
  text-shadow:none!important;
  transition:none!important;
  animation:none!important;
}

/* Also beat attribute/global button hover rules that target the create action. */
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot[data-pmd-person-slot-create],
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot[data-pmd-person-slot-create]:hover,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot[data-pmd-person-slot-create]:focus,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot[data-pmd-person-slot-create]:focus-visible,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot[data-pmd-person-slot-create]:active {
  background:none!important;
  background-color:transparent!important;
  background-image:none!important;
  border-color:transparent!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
  transform:none!important;
}

/* No hidden child/pseudo indicator may repaint on any state. */
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot > span,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot::before,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot::after,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot:hover > span,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot:focus > span,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot:focus-visible > span,
html body.pmd-shifts-page #pmd-shifts button.pmd-shifts-final-slot:active > span {
  content:none!important;
  display:none!important;
  visibility:hidden!important;
  opacity:0!important;
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  pointer-events:none!important;
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
anchor = "        $this->addCss('css/pmd-shifts-clean-frame-v17f.css');"
new = "        $this->addCss('css/pmd-shifts-zero-cell-hover-v17g.css');"
marker = "        // PMD_SHIFTS_ZERO_CELL_HOVER_V17G"

if new not in s:
    if s.count(anchor) != 1:
        raise SystemExit(f"STOP: expected exactly one V17F CSS registration, found {s.count(anchor)}")
    s = s.replace(anchor, anchor + "\n" + marker + "\n" + new, 1)

p.write_text(s)
print('Shifts.php: V17G final zero-paint CSS registered after V17F')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$NEW_CSS"
grep -Fq ":focus-visible" "$TMPROOT/$NEW_CSS"
grep -Fq "background:none!important" "$TMPROOT/$NEW_CSS"
grep -Fq "pmd-shifts-zero-cell-hover-v17g.css" "$TMPROOT/$CONTROLLER"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17G TARGETS"
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
echo "5. APPLY ONLY THE 2 V17G TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"
sudo chown --reference="$REF_CSS" "$NEW_CSS"
sudo chmod --reference="$REF_CSS" "$NEW_CSS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
grep -nF "PMD_SHIFTS_ZERO_CELL_HOVER_V17G" "$CONTROLLER"
grep -nF "pmd-shifts-zero-cell-hover-v17g.css" "$CONTROLLER"
grep -nF "$MARKER" "$NEW_CSS" | head -1
grep -nF ":focus-visible" "$NEW_CSS" | head -1
grep -nF "background:none!important" "$NEW_CSS" | head -1

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS CELL HOVER/FOCUS PAINT V17G REMOVED"
echo "========================================"
echo "Behavior now:"
echo "  - empty planning cells never change background on hover"
echo "  - Safari focus/focus-visible state cannot leave a tinted cell behind"
echo "  - active/click state has no fill, shadow, border or animation"
echo "  - no plus/pseudo indicator can reappear"
echo "  - cells remain clickable and keyboard-operable"
echo "  - V17F fast day navigation and hidden planner scrollbar are untouched"
echo "  - shift create/save/group merge/MFA logic is untouched"
echo "Backup: $BACKUP"
