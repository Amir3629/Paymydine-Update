#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
FINAL_CSS="app/admin/assets/css/pmd-shifts-planner-v17.css"
NEW_REL="css/pmd-shifts-canonical-firstpaint-v17h.css"
NEW_CSS="app/admin/assets/${NEW_REL}"
MARKER="PMD_SHIFTS_HOUR_FIRST_PAINT_V17H"
BACKUP="/tmp/pmd-shifts-hour-first-paint-v17h-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-hour-first-paint-v17h.XXXXXX)"
APPLY_STARTED=0
NEW_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17H"
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
test -f "$FINAL_CSS" || { echo "STOP: missing final V17 planner CSS"; exit 21; }

grep -Fq "grid-template-columns:190px minmax(1680px,1fr)!important;" "$FINAL_CSS" || {
    echo "STOP: final V17 TEAM/timeline geometry is no longer 190px"
    exit 22
}

if grep -Fq "$MARKER" "$CONTROLLER"; then
    test -f "$NEW_CSS" || { echo "STOP: V17H controller marker exists but CSS is missing"; exit 23; }
    grep -Fq "grid-template-columns:190px minmax(1680px,1fr)!important;" "$NEW_CSS" || {
        echo "STOP: V17H CSS exists but expected 190px geometry is missing"
        exit 24
    }
    echo "V17H is already installed. Nothing changed."
    exit 0
fi

mapfile -t CANONICAL_RELS < <(
    grep -oE "css/pmd-shifts-canonical-[A-Za-z0-9_-]+\.css" "$CONTROLLER" \
      | grep -vF "pmd-shifts-canonical-firstpaint-v17h.css" \
      | sort -u
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

OLD_RULE="grid-template-columns:220px minmax(1680px,1fr)!important;"
NEW_RULE="grid-template-columns:190px minmax(1680px,1fr)!important;"

OLD_COUNT="$(grep -oF "$OLD_RULE" "$OLD_CSS" | wc -l | tr -d ' ')"
if [ "$OLD_COUNT" -ne 1 ]; then
    echo "STOP: expected exactly ONE 220px first-paint geometry rule in active canonical CSS"
    echo "Found: $OLD_COUNT"
    echo "Active canonical: $OLD_CSS"
    exit 27
fi

echo "Active canonical: $OLD_CSS"
echo "Final V17 geometry: 190px"
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

python3 - "$TMPROOT/$NEW_CSS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
old = "grid-template-columns:220px minmax(1680px,1fr)!important;"
new = "grid-template-columns:190px minmax(1680px,1fr)!important;"

count = s.count(old)
if count != 1:
    raise SystemExit(f"STOP: temp canonical 220px rule count={count}")

s = s.replace(old, new, 1)
s = "/* PMD_SHIFTS_HOUR_FIRST_PAINT_V17H\n * Fresh production canonical clone. Only TEAM/timeline first-paint geometry\n * is aligned with final V17: 220px -> 190px.\n */\n" + s
p.write_text(s)
print("Canonical first-paint geometry: 220px -> 190px")
PY

python3 - "$TMPROOT/$CONTROLLER" "$OLD_REL" "$NEW_REL" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
old_rel = sys.argv[2]
new_rel = sys.argv[3]
s = p.read_text()
old_line = f"        $this->addCss('{old_rel}');"
new_line = (
    "        // PMD_SHIFTS_HOUR_FIRST_PAINT_V17H\n"
    f"        $this->addCss('{new_rel}');"
)

if s.count(old_line) != 1:
    raise SystemExit(f"STOP: canonical controller registration count={s.count(old_line)}")

s = s.replace(old_line, new_line, 1)
p.write_text(s)
print("Shifts.php: active canonical replaced at the SAME early load position")
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-canonical-firstpaint-v17h.css" "$TMPROOT/$CONTROLLER"
grep -Fq "$MARKER" "$TMPROOT/$NEW_CSS"
grep -Fq "$NEW_RULE" "$TMPROOT/$NEW_CSS"
if grep -Fq "$OLD_RULE" "$TMPROOT/$NEW_CSS"; then
    echo "STOP: 220px geometry survived in prepared V17H CSS"
    exit 30
fi
cmp -s "$OLD_CSS" "$TMPROOT/$NEW_CSS" && {
    echo "STOP: prepared canonical unexpectedly identical to old canonical"
    exit 31
}

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 2 V17H TARGETS"
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
grep -nF "pmd-shifts-canonical-firstpaint-v17h.css" "$CONTROLLER"
grep -nF "$MARKER" "$NEW_CSS" | head -1
grep -nF "$NEW_RULE" "$NEW_CSS" | head -3

if grep -Fq "$OLD_REL" "$CONTROLLER"; then
    echo "STOP: old canonical registration still present after apply"
    exit 40
fi

if grep -Fq "$OLD_RULE" "$NEW_CSS"; then
    echo "STOP: live V17H CSS still contains 220px geometry"
    exit 41
fi

echo "LIVE FILE CHECKS PASSED"

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS HOUR FIRST-PAINT V17H PINNED"
echo "========================================"
echo "Behavior now:"
echo "  - first server paint uses the same 190px TEAM rail as final V17"
echo "  - hour boundaries no longer move when later Shifts CSS settles"
echo "  - fresh canonical filename bypasses stale Safari/CDN CSS cache"
echo "  - old active canonical file is NOT modified"
echo "  - V17F fast date navigation remains untouched"
echo "  - V17G zero-hover behavior remains untouched"
echo "  - shift save/group merge/MFA logic is untouched"
echo "Backup: $BACKUP"
