#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
CSS_REL="css/pmd-shifts-refresh-stability-v17i.css"
CSS_FILE="app/admin/assets/${CSS_REL}"
ANCHOR="        \$this->addCss('css/pmd-shifts-planner-ux-v15.css');"
MARKER="PMD_SHIFTS_REFRESH_STABILITY_V17I"
BACKUP="/tmp/pmd-shifts-refresh-stability-v17i-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-refresh-stability-v17i.XXXXXX)"
APPLY_STARTED=0
CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17I"
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

# Production already has a dedicated Shifts shell. Do not touch global layout.
grep -Fq "PMD_SHIFTS_EXACT_LAYOUT_BYPASS_FINAL" app/admin/assets/js/pmd-admin-exact-layout-v1.js || {
    echo "STOP: production Shifts exact-layout bypass marker is missing"
    echo "No files changed."
    exit 21
}

grep -Fq "path.indexOf('/admin/shifts') === 0" app/admin/assets/js/pmd-admin-exact-layout-v1.js || {
    echo "STOP: /admin/shifts is not visibly excluded from exact-layout runtime"
    echo "No files changed."
    exit 22
}

if grep -Fq "$MARKER" "$CONTROLLER"; then
    test -f "$CSS_FILE" || { echo "STOP: V17I registration exists but CSS file is missing"; exit 23; }
    grep -Fq "$MARKER" "$CSS_FILE" || { echo "STOP: V17I CSS exists without marker"; exit 24; }
    echo "V17I is already installed. Nothing changed."
    exit 0
fi

ANCHOR_COUNT="$(grep -Fxc "$ANCHOR" "$CONTROLLER" || true)"
if [ "$ANCHOR_COUNT" -ne 1 ]; then
    echo "STOP: expected exactly one final V15 CSS anchor in Shifts.php"
    echo "Found: $ANCHOR_COUNT"
    echo "No files changed."
    exit 25
fi

echo "Exact-layout Shifts bypass confirmed"
echo "Final CSS anchor confirmed"
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
/* PMD_SHIFTS_REFRESH_STABILITY_V17I
 * Refresh-only visual stability authority.
 *
 * Production no longer loads the old Shifts first-paint file that used to
 * neutralize generic opacity/transform/transition boot effects. Keep the V17
 * geometry exactly as-is and only prevent late paint/rasterization motion.
 */

html body.pmd-shifts-page .page-wrapper,
html body.pmd-shifts-page .page-content,
html body.pmd-shifts-page #pmd-shifts,
html body.pmd-shifts-page [data-pmd-shifts-day-surface],
html body.pmd-shifts-page [data-pmd-shifts-hour-host],
html body.pmd-shifts-page .pmd-shifts-final-screen {
  opacity:1!important;
  visibility:visible!important;
  filter:none!important;
  animation:none!important;
  animation-name:none!important;
  animation-delay:0s!important;
  animation-duration:0s!important;
  transition:none!important;
  transition-property:none!important;
  transform:none!important;
  translate:none!important;
  will-change:auto!important;
}

/* The timeline itself must not acquire a late transition from old/global CSS.
 * Do NOT alter left/width/top/height/transform geometry of shift bars here. */
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale-row,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale > span,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-person,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-track,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shifts,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift * {
  animation:none!important;
  animation-name:none!important;
  animation-delay:0s!important;
  animation-duration:0s!important;
  transition:none!important;
  transition-property:none!important;
  will-change:auto!important;
}

/* In-page day loading must keep the currently rendered plane visually solid.
 * V17F still owns the actual data fetch/cache and DOM replacement. */
html body.pmd-shifts-page.is-day-loading .pmd-shifts-final-screen,
html body.pmd-shifts-page.is-day-loading [data-pmd-shifts-hour-host],
html body.pmd-shifts-page.is-transitioning .page-content,
html body.pmd-shifts-page .page-content.is-transitioning {
  opacity:1!important;
  visibility:visible!important;
  filter:none!important;
  transform:none!important;
  translate:none!important;
  transition:none!important;
  animation:none!important;
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
anchor = "        $this->addCss('css/pmd-shifts-planner-ux-v15.css');"
new = (
    anchor
    + "\n        // PMD_SHIFTS_REFRESH_STABILITY_V17I"
    + "\n        $this->addCss('css/pmd-shifts-refresh-stability-v17i.css');"
)

if s.count(anchor) != 1:
    raise SystemExit(f"STOP: temp anchor count={s.count(anchor)}")

s = s.replace(anchor, new, 1)
p.write_text(s)
print("Shifts.php: V17I registered after the final legacy V15 CSS")
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
grep -Fq "transition:none!important" "$TMPROOT/$CSS_FILE"
grep -Fq "will-change:auto!important" "$TMPROOT/$CSS_FILE"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17I TARGETS"
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
echo "5. APPLY ONLY 2 TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$CSS_FILE" >/dev/null < "$TMPROOT/$CSS_FILE"

# Match neighboring Shifts CSS permissions without broad chmod/chown.
REF_CSS="app/admin/assets/css/pmd-shifts-zero-cell-hover-v17g.css"
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
grep -nF "transition:none!important" "$CSS_FILE" | head -5

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS REFRESH STABILITY V17I INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - refresh cannot fade/translate/animate the Shifts hour surface"
echo "  - timeline labels and shift bars have no boot transition"
echo "  - V17H2 190px TEAM geometry is untouched"
echo "  - V17F fast date navigation is untouched"
echo "  - V17G zero-hover behavior is untouched"
echo "  - exact-layout and Side Menu global files are untouched"
echo "  - shift save/group merge/MFA logic is untouched"
echo "Backup: $BACKUP"
