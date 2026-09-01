#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
CSS_REL="css/pmd-shifts-font-first-paint-v17j.css"
CSS_FILE="app/admin/assets/${CSS_REL}"
ANCHOR="        \$this->addCss('css/pmd-shifts-refresh-stability-v17i.css');"
MARKER="PMD_SHIFTS_FONT_FIRST_PAINT_V17J"
BACKUP="/tmp/pmd-shifts-font-first-paint-v17j-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-font-first-paint-v17j.XXXXXX)"
APPLY_STARTED=0
CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17J"
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

grep -Fq "PMD_SHIFTS_REFRESH_STABILITY_V17I" "$CONTROLLER" || {
    echo "STOP: V17I is not registered on this production Shifts controller"
    echo "No files changed."
    exit 21
}

for font in \
    app/admin/assets/fonts/Roboto-Regular.woff2 \
    app/admin/assets/fonts/Roboto-Medium.woff2 \
    app/admin/assets/fonts/Roboto-Bold.woff2
do
    test -s "$font" || {
        echo "STOP: required local font missing: $font"
        echo "No files changed."
        exit 22
    }
done

if grep -Fq "$MARKER" "$CONTROLLER"; then
    test -f "$CSS_FILE" || { echo "STOP: V17J registration exists but CSS is missing"; exit 23; }
    grep -Fq "$MARKER" "$CSS_FILE" || { echo "STOP: V17J CSS exists without marker"; exit 24; }
    echo "V17J is already installed. Nothing changed."
    exit 0
fi

ANCHOR_COUNT="$(grep -Fxc "$ANCHOR" "$CONTROLLER" || true)"
if [ "$ANCHOR_COUNT" -ne 1 ]; then
    echo "STOP: expected exactly one V17I CSS anchor"
    echo "Found: $ANCHOR_COUNT"
    echo "No files changed."
    exit 25
fi

echo "V17I anchor confirmed"
echo "Local Roboto files confirmed"
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
/* PMD_SHIFTS_FONT_FIRST_PAINT_V17J
 * Stable timetable typography authority.
 *
 * The global Admin layer loads Google Roboto separately. The Shifts planner
 * must not first paint fallback/Inter glyph metrics and then resize when that
 * remote face becomes available. Use PMD's existing same-origin Roboto files
 * under a Shifts-only family name so the global remote Roboto family cannot
 * replace this timetable after first paint.
 *
 * font-display:optional is deliberate: on a cold/slow font request Safari may
 * keep the immediate fallback for that navigation rather than visibly swapping
 * metrics after paint. Once cached, the literal local Roboto face is used.
 */

@font-face {
  font-family:"PMDShiftsRobotoStable";
  src:url("/app/admin/assets/fonts/Roboto-Regular.woff2") format("woff2");
  font-style:normal;
  font-weight:400;
  font-display:optional;
}
@font-face {
  font-family:"PMDShiftsRobotoStable";
  src:url("/app/admin/assets/fonts/Roboto-Medium.woff2") format("woff2");
  font-style:normal;
  font-weight:500;
  font-display:optional;
}
@font-face {
  font-family:"PMDShiftsRobotoStable";
  src:url("/app/admin/assets/fonts/Roboto-Bold.woff2") format("woff2");
  font-style:normal;
  font-weight:600 900;
  font-display:optional;
}

/* Only the Dienstplan/timetable plane is pinned. Do not change KPI cards,
 * global Admin typography, modal typography, dimensions or positioning. */
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-board,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale-row,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale > span,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-person,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-person *,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-track,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift * {
  font-family:"PMDShiftsRobotoStable",Arial,Helvetica,sans-serif!important;
  font-synthesis:none!important;
  -webkit-font-smoothing:antialiased;
}

/* Time strings keep deterministic digit widths. */
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale > span,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift,
html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift * {
  font-variant-numeric:tabular-nums!important;
  font-feature-settings:"tnum" 1!important;
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
anchor = "        $this->addCss('css/pmd-shifts-refresh-stability-v17i.css');"
new = (
    anchor
    + "\n        // PMD_SHIFTS_FONT_FIRST_PAINT_V17J"
    + "\n        $this->addCss('css/pmd-shifts-font-first-paint-v17j.css');"
)

if s.count(anchor) != 1:
    raise SystemExit(f"STOP: temp V17I anchor count={s.count(anchor)}")

s = s.replace(anchor, new, 1)
p.write_text(s)
print("Shifts.php: V17J local font authority registered after V17I")
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
grep -Fq 'font-family:"PMDShiftsRobotoStable"' "$TMPROOT/$CSS_FILE"
grep -Fq 'Roboto-Regular.woff2' "$TMPROOT/$CSS_FILE"
grep -Fq 'font-display:optional' "$TMPROOT/$CSS_FILE"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17J TARGETS"
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

REF_CSS="app/admin/assets/css/pmd-shifts-refresh-stability-v17i.css"
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
grep -nF 'PMDShiftsRobotoStable' "$CSS_FILE" | head -8

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS FONT FIRST-PAINT V17J INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - timetable hour labels and shift text use a Shifts-only local Roboto family"
echo "  - the global Google Roboto face cannot late-swap this timetable typography"
echo "  - tabular time digits stay metrically stable"
echo "  - V17I no-transition authority remains active"
echo "  - V17H2 geometry, V17F fast day navigation and V17G no-hover remain untouched"
echo "  - no Shift save/group merge/MFA/Portal logic changed"
echo "Backup: $BACKUP"
