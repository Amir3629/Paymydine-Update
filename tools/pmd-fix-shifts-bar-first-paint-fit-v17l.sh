#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
MANIFEST="app/admin/views/_meta/assets.json"
CSS_REL="css/pmd-shifts-bar-first-paint-fit-v17l.css"
CSS_FILE="app/admin/assets/${CSS_REL}"
ANCHOR="        \$this->addCss('css/pmd-shifts-font-first-paint-v17j.css');"
MARKER="PMD_SHIFTS_BAR_FIRST_PAINT_FIT_V17L"
BACKUP="/tmp/pmd-shifts-bar-first-paint-v17l-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-bar-first-paint-v17l.XXXXXX)"
APPLY_STARTED=0
CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17L"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        if [ "$CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CSS_FILE" "$CSS_FILE"
        else
            sudo rm -f "$CSS_FILE"
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
test -f "$MANIFEST" || { echo "STOP: missing $MANIFEST"; exit 21; }

# V17L is specifically the companion to V17K. Do not install on a page that
# still uses the late-paint V1 attendance runtime.
grep -Fq 'js/pmd-shifts-live-attendance-v2.js' "$MANIFEST" || {
    echo "STOP: V17K attendance V2 is not active in the Admin manifest"
    echo "No files changed."
    exit 22
}

if grep -Fq "$MARKER" "$CONTROLLER"; then
    test -f "$CSS_FILE" || { echo "STOP: V17L registration exists but CSS is missing"; exit 23; }
    grep -Fq "$MARKER" "$CSS_FILE" || { echo "STOP: V17L CSS exists without marker"; exit 24; }
    echo "V17L is already installed. Nothing changed."
    exit 0
fi

ANCHOR_COUNT="$(grep -Fxc "$ANCHOR" "$CONTROLLER" || true)"
if [ "$ANCHOR_COUNT" -ne 1 ]; then
    echo "STOP: expected exactly one V17J CSS anchor"
    echo "Found: $ANCHOR_COUNT"
    echo "No files changed."
    exit 25
fi

echo "V17K no-late-paint runtime confirmed"
echo "V17J first-paint CSS anchor confirmed"
echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$CONTROLLER")"
mkdir -p "$TMPROOT/$(dirname "$CSS_FILE")"
cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"

cat > "$TMPROOT/$CSS_FILE" <<'CSS'
/* PMD_SHIFTS_BAR_FIRST_PAINT_FIT_V17L
 * Static first-paint replacement for the useful typography portion that used
 * to be injected by pmd-shifts-live-attendance-v1.js after DOMContentLoaded.
 *
 * V17K correctly removed that late JS injection because it caused the visible
 * refresh blink. These rules restore the same proven bar-content fit from the
 * initial stylesheet cascade, with ZERO runtime geometry writes.
 */

html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift {
  align-content:center!important;
  grid-template-rows:auto auto!important;
  gap:3px!important;
  padding:7px 10px!important;
  line-height:1.15!important;
}

html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift > strong {
  display:block!important;
  margin:0!important;
  font-size:12px!important;
  line-height:1.2!important;
  font-variant-numeric:tabular-nums!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}

html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift > span {
  display:block!important;
  margin:0!important;
  font-size:10px!important;
  line-height:1.2!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
anchor = "        $this->addCss('css/pmd-shifts-font-first-paint-v17j.css');"
new = (
    anchor
    + "\n        // PMD_SHIFTS_BAR_FIRST_PAINT_FIT_V17L"
    + "\n        $this->addCss('css/pmd-shifts-bar-first-paint-fit-v17l.css');"
)

if s.count(anchor) != 1:
    raise SystemExit(f"STOP: temp V17J anchor count={s.count(anchor)}")

s = s.replace(anchor, new, 1)
p.write_text(s)
print("Shifts.php: V17L static bar-fit CSS registered after V17J")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$CONTROLLER"
grep -Fq "$CSS_REL" "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$CSS_FILE"
grep -Fq 'padding:7px 10px!important' "$TMPROOT/$CSS_FILE"
grep -Fq 'grid-template-rows:auto auto!important' "$TMPROOT/$CSS_FILE"

# V17L must be CSS-only. Do not accidentally reintroduce runtime geometry.
if grep -Eq 'repairGeometry|style\.setProperty|MutationObserver|setInterval|setTimeout' "$TMPROOT/$CSS_FILE"; then
    echo "STOP: unexpected runtime marker found in CSS"
    exit 30
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17L TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

if [ -e "$CSS_FILE" ]; then
    CSS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$CSS_FILE")"
    sudo cp -a "$CSS_FILE" "$BACKUP/$CSS_FILE"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY CONTROLLER + NEW CSS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$CSS_FILE" >/dev/null < "$TMPROOT/$CSS_FILE"

REF_CSS="app/admin/assets/css/pmd-shifts-font-first-paint-v17j.css"
if [ -f "$REF_CSS" ]; then
    sudo chown --reference="$REF_CSS" "$CSS_FILE"
    sudo chmod --reference="$REF_CSS" "$CSS_FILE"
fi

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
grep -nF "$MARKER" "$CONTROLLER"
grep -nF "$CSS_REL" "$CONTROLLER"
grep -nF "$MARKER" "$CSS_FILE" | head -1
grep -nF 'padding:7px 10px!important' "$CSS_FILE"
grep -nF 'line-height:1.2!important' "$CSS_FILE"
grep -Fq 'js/pmd-shifts-live-attendance-v2.js' "$MANIFEST"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS BAR FIRST-PAINT FIT V17L INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - shift time + label fit vertically from the FIRST painted frame"
echo "  - the proven old 7px/10px bar spacing is now static CSS, not late JS"
echo "  - V17K remains the active attendance runtime"
echo "  - no repairGeometry / inline left-right-width rewrite is restored"
echo "  - no MutationObserver or timer was added"
echo "  - shift geometry, save/group merge/date navigation/MFA/Portal logic are untouched"
echo "Backup: $BACKUP"
