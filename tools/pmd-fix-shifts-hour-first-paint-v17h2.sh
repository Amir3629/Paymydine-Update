#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
FINAL_CSS="app/admin/assets/css/pmd-shifts-planner-v17.css"
NEW_REL="css/pmd-shifts-canonical-firstpaint-v17h2.css"
NEW_CSS="app/admin/assets/${NEW_REL}"
MARKER="PMD_SHIFTS_HOUR_FIRST_PAINT_V17H2"
OLD_RULE="grid-template-columns:220px minmax(1680px,1fr)!important;"
NEW_RULE="grid-template-columns:190px minmax(1680px,1fr)!important;"
BACKUP="/tmp/pmd-shifts-hour-first-paint-v17h2-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-hour-first-paint-v17h2.XXXXXX)"
APPLY_STARTED=0
NEW_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17H2"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        if [ "$NEW_EXISTED" -eq 1 ]; then
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
test -f "$FINAL_CSS" || { echo "STOP: missing $FINAL_CSS"; exit 21; }

grep -Fq "$NEW_RULE" "$FINAL_CSS" || {
    echo "STOP: final V17 geometry is no longer 190px"
    exit 22
}

if grep -Fq "$MARKER" "$CONTROLLER"; then
    test -f "$NEW_CSS" || { echo "STOP: V17H2 registration exists but CSS is missing"; exit 23; }
    grep -Fq "$NEW_RULE" "$NEW_CSS" || { echo "STOP: V17H2 CSS geometry is invalid"; exit 24; }
    echo "V17H2 is already installed. Nothing changed."
    exit 0
fi

mapfile -t CANONICAL_RELS < <(
    grep -oE "css/pmd-shifts-canonical-[A-Za-z0-9_-]+\.css" "$CONTROLLER" 2>/dev/null \
      | grep -vF "pmd-shifts-canonical-firstpaint-v17h" \
      | sort -u || true
)

if [ "${#CANONICAL_RELS[@]}" -ne 1 ]; then
    echo "STOP: expected exactly ONE active canonical Shifts CSS registration"
    echo "Found: ${#CANONICAL_RELS[@]}"
    printf '%s\n' "${CANONICAL_RELS[@]}"
    exit 25
fi

OLD_REL="${CANONICAL_RELS[0]}"
OLD_CSS="app/admin/assets/${OLD_REL}"
test -f "$OLD_CSS" || { echo "STOP: active canonical CSS missing: $OLD_CSS"; exit 26; }

OLD_COUNT="$(python3 - "$OLD_CSS" "$OLD_RULE" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[1]).read_text().count(sys.argv[2]))
PY
)"

if [ "$OLD_COUNT" -ne 1 ]; then
    echo "STOP: expected exactly ONE 220px first-paint geometry rule"
    echo "Found: $OLD_COUNT"
    echo "Active canonical: $OLD_CSS"
    exit 27
fi

echo "Active canonical: $OLD_CSS"
echo "First paint: 220px"
echo "Final V17: 190px"
echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$CONTROLLER")"
mkdir -p "$TMPROOT/$(dirname "$NEW_CSS")"
cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$OLD_CSS" "$TMPROOT/$NEW_CSS"

python3 - "$TMPROOT/$NEW_CSS" "$OLD_RULE" "$NEW_RULE" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
old, new = sys.argv[2], sys.argv[3]
s = p.read_text()
if s.count(old) != 1:
    raise SystemExit(f"STOP: temp 220px rule count={s.count(old)}")
s = s.replace(old, new, 1)
s = "/* PMD_SHIFTS_HOUR_FIRST_PAINT_V17H2\n * Production canonical clone with first-paint TEAM rail aligned to final V17.\n */\n" + s
p.write_text(s)
print("Canonical first-paint geometry aligned: 220px -> 190px")
PY

python3 - "$TMPROOT/$CONTROLLER" "$OLD_REL" "$NEW_REL" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
old_rel, new_rel = sys.argv[2], sys.argv[3]
s = p.read_text()
old_line = f"        $this->addCss('{old_rel}');"
if s.count(old_line) != 1:
    raise SystemExit(f"STOP: active canonical registration count={s.count(old_line)}")
new_line = "        // PMD_SHIFTS_HOUR_FIRST_PAINT_V17H2\n" + f"        $this->addCss('{new_rel}');"
s = s.replace(old_line, new_line, 1)
p.write_text(s)
print("Shifts.php: fresh V17H2 canonical registered at the same early position")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$CONTROLLER"
grep -Fq "$NEW_REL" "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$NEW_CSS"
grep -Fq "$NEW_RULE" "$TMPROOT/$NEW_CSS"
if grep -Fq "$OLD_RULE" "$TMPROOT/$NEW_CSS"; then
    echo "STOP: 220px geometry survived in prepared CSS"
    exit 30
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"
if [ -e "$NEW_CSS" ]; then
    NEW_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_CSS")"
    sudo cp -a "$NEW_CSS" "$BACKUP/$NEW_CSS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 2 TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"
sudo chown --reference="$OLD_CSS" "$NEW_CSS"
sudo chmod --reference="$OLD_CSS" "$NEW_CSS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
grep -nF "$MARKER" "$CONTROLLER"
grep -nF "$NEW_REL" "$CONTROLLER"
grep -nF "$MARKER" "$NEW_CSS" | head -1
grep -nF "$NEW_RULE" "$NEW_CSS" | head -3

if grep -Fq "$OLD_REL" "$CONTROLLER"; then
    echo "STOP: old canonical registration still present after apply"
    exit 40
fi
if grep -Fq "$OLD_RULE" "$NEW_CSS"; then
    echo "STOP: live V17H2 CSS still contains 220px geometry"
    exit 41
fi

echo "LIVE FILE CHECKS PASSED"
APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS HOUR FIRST-PAINT V17H2 PINNED"
echo "========================================"
echo "Behavior now:"
echo "  - first paint and final V17 both use a 190px TEAM rail"
echo "  - hour/timeline boundaries no longer jump during refresh"
echo "  - fresh CSS filename bypasses stale Safari/CDN cache"
echo "  - old production canonical CSS is left untouched"
echo "  - V17F fast date navigation is untouched"
echo "  - V17G no-hover behavior is untouched"
echo "  - shift save/group merge/MFA logic is untouched"
echo "Backup: $BACKUP"
