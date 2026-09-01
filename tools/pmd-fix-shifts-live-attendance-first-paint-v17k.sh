#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

MANIFEST="app/admin/views/_meta/assets.json"
OLD_JS="app/admin/assets/js/pmd-shifts-live-attendance-v1.js"
NEW_JS="app/admin/assets/js/pmd-shifts-live-attendance-v2.js"
OLD_PATH="js/pmd-shifts-live-attendance-v1.js"
NEW_PATH="js/pmd-shifts-live-attendance-v2.js"
OLD_NAME="pmd-shifts-live-attendance-v1-js"
NEW_NAME="pmd-shifts-live-attendance-v2-js"
MARKER="PMD_SHIFTS_LIVE_ATTENDANCE_V2_NO_LATE_SHIFT_PAINT"
BACKUP="/tmp/pmd-shifts-live-attendance-v17k-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-live-attendance-v17k.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0
OLD_JS_SHA_BEFORE=""

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17K"
        set +e

        sudo cp -a "$BACKUP/$MANIFEST" "$MANIFEST"

        if [ "$NEW_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_JS" "$NEW_JS"
        else
            sudo rm -f "$NEW_JS"
        fi

        echo "ROLLBACK COMPLETE"
        echo "Old V1 runtime was never modified."
        echo "Backup kept at: $BACKUP"
    fi

    rm -rf "$TMPROOT"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

test -f "$MANIFEST" || { echo "STOP: missing $MANIFEST"; exit 20; }
test -f "$OLD_JS" || { echo "STOP: missing $OLD_JS"; exit 21; }

python3 - "$MANIFEST" "$OLD_PATH" "$NEW_PATH" "$OLD_NAME" "$NEW_NAME" <<'PY'
from pathlib import Path
import json
import sys

path = Path(sys.argv[1])
old_path, new_path, old_name, new_name = sys.argv[2:]
raw = path.read_text()
json.loads(raw)

if new_path in raw or new_name in raw:
    print("V17K manifest target already present")
    raise SystemExit(10)

if raw.count(old_path) != 1:
    raise SystemExit(f"STOP: old attendance path count={raw.count(old_path)}")
if raw.count(old_name) != 1:
    raise SystemExit(f"STOP: old attendance asset-name count={raw.count(old_name)}")

print("Global Admin manifest loads the V1 attendance runtime exactly once")
PY
rc=$?
if [ "$rc" -eq 10 ]; then
    if [ -f "$NEW_JS" ] && grep -Fq "$MARKER" "$NEW_JS"; then
        echo "V17K is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17K production state"
    exit 22
elif [ "$rc" -ne 0 ]; then
    exit "$rc"
fi

grep -Fq "PMD_SHIFTS_LIVE_ATTENDANCE_V1" "$OLD_JS" || {
    echo "STOP: V1 runtime marker missing"
    exit 23
}

grep -Fq "body.pmd-shifts-page .pmd-shifts-final-shift{align-content:center!important" "$OLD_JS" || {
    echo "STOP: expected late shift-bar CSS injector is not present"
    exit 24
}

grep -Fq "function repairGeometry()" "$OLD_JS" || {
    echo "STOP: expected repairGeometry() authority is not present"
    exit 25
}

CALLS="$(python3 - "$OLD_JS" <<'PY'
from pathlib import Path
import sys
lines = Path(sys.argv[1]).read_text().splitlines()
print(sum(1 for line in lines if line.strip() == 'repairGeometry();'))
PY
)"

if [ "$CALLS" -lt 2 ]; then
    echo "STOP: expected live repairGeometry calls not found; count=$CALLS"
    exit 26
fi

OLD_JS_SHA_BEFORE="$(sha256sum "$OLD_JS" | awk '{print $1}')"

echo "Late shift-bar CSS injector confirmed"
echo "Live geometry rewrite calls confirmed: $CALLS"
echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$MANIFEST")"
mkdir -p "$TMPROOT/$(dirname "$NEW_JS")"
cp "$MANIFEST" "$TMPROOT/$MANIFEST"
cp "$OLD_JS" "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_LIVE_ATTENDANCE_V2_NO_LATE_SHIFT_PAINT'

if marker not in s:
    anchor = "/* PMD_SHIFTS_LIVE_ATTENDANCE_V1 */"
    if s.count(anchor) != 1:
        raise SystemExit(f"STOP: V1 marker count={s.count(anchor)}")
    s = s.replace(
        anchor,
        anchor + "\n/* " + marker + "\n * Attendance may update badges/KPIs after load, but it must never restyle\n * or recompute already-painted shift bars. Server/V17 own bar geometry/text.\n */",
        1,
    )

late_fragments = [
    "      'body.pmd-shifts-page .pmd-shifts-final-shift{align-content:center!important;grid-template-rows:auto auto!important;gap:3px!important;padding:7px 10px!important;line-height:1.15!important;}' +\n",
    "      'body.pmd-shifts-page .pmd-shifts-final-shift strong{display:block!important;margin:0!important;font-size:12px!important;line-height:1.2!important;font-variant-numeric:tabular-nums!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}' +\n",
    "      'body.pmd-shifts-page .pmd-shifts-final-shift span{display:block!important;margin:0!important;font-size:10px!important;line-height:1.2!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}' +\n",
]

for fragment in late_fragments:
    if s.count(fragment) != 1:
        raise SystemExit('STOP: expected late shift style fragment missing or duplicated')
    s = s.replace(fragment, '', 1)

lines = s.splitlines()
removed_calls = 0
out = []
for line in lines:
    if line.strip() == 'repairGeometry();':
        removed_calls += 1
        continue
    out.append(line)

if removed_calls < 2:
    raise SystemExit(f'STOP: removed only {removed_calls} repairGeometry calls')

s = '\n'.join(out) + '\n'

if 'body.pmd-shifts-page .pmd-shifts-final-shift{align-content:center!important' in s:
    raise SystemExit('STOP: late shift-bar CSS still present')
if any(line.strip() == 'repairGeometry();' for line in s.splitlines()):
    raise SystemExit('STOP: live repairGeometry call still present')
if marker not in s:
    raise SystemExit('STOP: V2 marker missing')

p.write_text(s)
print(f'V2 runtime prepared: removed {removed_calls} post-paint geometry rewrites')
print('V2 runtime prepared: removed late shift-bar typography/padding injection')
PY

python3 - "$TMPROOT/$MANIFEST" "$OLD_PATH" "$NEW_PATH" "$OLD_NAME" "$NEW_NAME" <<'PY'
from pathlib import Path
import json
import sys

p = Path(sys.argv[1])
old_path, new_path, old_name, new_name = sys.argv[2:]
s = p.read_text()

if s.count(old_path) != 1 or s.count(old_name) != 1:
    raise SystemExit('STOP: manifest V1 authority changed during preparation')

s = s.replace(old_path, new_path, 1)
s = s.replace(old_name, new_name, 1)

obj = json.loads(s)
entries = obj.get('script', [])
paths = [str(item.get('path', '')) for item in entries if isinstance(item, dict)]
names = [str(item.get('name', '')) for item in entries if isinstance(item, dict)]

if paths.count(new_path) != 1 or names.count(new_name) != 1:
    raise SystemExit('STOP: V2 manifest entry not unique')
if old_path in paths or old_name in names:
    raise SystemExit('STOP: V1 manifest entry still active')

p.write_text(s)
print('Admin asset manifest prepared: V1 -> fresh V2 filename')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

node --check "$TMPROOT/$NEW_JS"
python3 -m json.tool "$TMPROOT/$MANIFEST" >/dev/null
grep -Fq "$MARKER" "$TMPROOT/$NEW_JS"
grep -Fq "$NEW_PATH" "$TMPROOT/$MANIFEST"
grep -Fq "$NEW_NAME" "$TMPROOT/$MANIFEST"

if grep -Fq "body.pmd-shifts-page .pmd-shifts-final-shift{align-content:center!important" "$TMPROOT/$NEW_JS"; then
    echo "STOP: temp V2 still contains late shift-bar CSS"
    exit 30
fi

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys
lines = Path(sys.argv[1]).read_text().splitlines()
calls = [line for line in lines if line.strip() == 'repairGeometry();']
if calls:
    raise SystemExit(f'STOP: temp V2 still has {len(calls)} repairGeometry calls')
print('No post-paint shift geometry calls remain')
PY

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE MANIFEST + V2 TARGET"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$MANIFEST")"
sudo cp -a "$MANIFEST" "$BACKUP/$MANIFEST"

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"
echo "V1 runtime remains untouched: $OLD_JS"

echo ""
echo "========================================"
echo "5. APPLY ONLY V2 + MANIFEST SWITCH"
echo "========================================"

APPLY_STARTED=1

sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"
sudo chown --reference="$OLD_JS" "$NEW_JS"
sudo chmod --reference="$OLD_JS" "$NEW_JS"

# tee preserves the existing manifest inode/ownership/mode.
sudo tee "$MANIFEST" >/dev/null < "$TMPROOT/$MANIFEST"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

node --check "$NEW_JS"
python3 -m json.tool "$MANIFEST" >/dev/null

grep -nF "$NEW_PATH" "$MANIFEST"
grep -nF "$NEW_NAME" "$MANIFEST"
grep -nF "$MARKER" "$NEW_JS" | head -1

if grep -Fq "$OLD_PATH" "$MANIFEST"; then
    echo "STOP: old V1 path is still active in manifest"
    exit 40
fi

if grep -Fq "body.pmd-shifts-page .pmd-shifts-final-shift{align-content:center!important" "$NEW_JS"; then
    echo "STOP: live V2 still contains late shift-bar CSS"
    exit 41
fi

python3 - "$NEW_JS" <<'PY'
from pathlib import Path
import sys
lines = Path(sys.argv[1]).read_text().splitlines()
calls = [line for line in lines if line.strip() == 'repairGeometry();']
if calls:
    raise SystemExit(f'STOP: live V2 still has {len(calls)} repairGeometry calls')
print('LIVE: zero post-paint repairGeometry calls')
PY

OLD_JS_SHA_AFTER="$(sha256sum "$OLD_JS" | awk '{print $1}')"
if [ "$OLD_JS_SHA_AFTER" != "$OLD_JS_SHA_BEFORE" ]; then
    echo "STOP: V1 source changed unexpectedly"
    exit 42
fi

echo "LIVE: V1 source SHA unchanged"
echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS LATE REPAINT V17K REMOVED"
echo "========================================"
echo "Behavior now:"
echo "  - Admin manifest loads a fresh pmd-shifts-live-attendance-v2.js URL"
echo "  - attendance runtime no longer injects padding/line-height/gap into shift bars after first paint"
echo "  - attendance runtime no longer rewrites shift left/right/width on boot, day-render, or 15s polling"
echo "  - attendance badges and Present/Missing KPI refresh remain active"
echo "  - server/V17 shift geometry stays authoritative from the first paint"
echo "  - old V1 runtime remains on disk untouched for rollback/reference"
echo "  - Shift save/group merge/date navigation/MFA/Portal logic is untouched"
echo "Backup: $BACKUP"
