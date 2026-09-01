#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

CONTROLLER="app/admin/controllers/Shifts.php"
SERVER="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
ACTIVE_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17m.js"
NEW_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17n.js"
MARKER="PMD_SHIFTS_MIDNIGHT_TIMELINE_V17N"
BACKUP="/tmp/pmd-shifts-v17n-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17n.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17N"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$SERVER" "$SERVER"

        if [ "$NEW_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_JS" "$NEW_JS"
        else
            sudo rm -f "$NEW_JS"
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
test -f "$SERVER" || { echo "STOP: missing $SERVER"; exit 21; }
test -f "$ACTIVE_JS" || { echo "STOP: missing active V17M renderer"; exit 22; }

grep -Fq "pmd-shifts-inpage-day-nav-v17m.js" "$CONTROLLER" || {
    echo "STOP: V17M is no longer the active Shifts renderer"
    exit 23
}

grep -Fq "PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M" "$ACTIVE_JS" || {
    echo "STOP: V17M geometry authority marker missing"
    exit 24
}

grep -Fq 'var dayStart = 360;' "$ACTIVE_JS" || {
    echo "STOP: expected JS 06:00 timeline start missing"
    exit 25
}

grep -Fq 'var dayEnd = 1800;' "$ACTIVE_JS" || {
    echo "STOP: expected JS 30:00 timeline end missing"
    exit 26
}

grep -Fq '$tick = 360;' "$SERVER" || {
    echo "STOP: expected server 06:00 scale start missing"
    exit 27
}

grep -Fq '$slot = 360;' "$SERVER" || {
    echo "STOP: expected server 06:00 slot start missing"
    exit 28
}

if grep -Fq "pmd-shifts-inpage-day-nav-v17n.js" "$CONTROLLER"; then
    if [ -f "$NEW_JS" ] && grep -Fq "$MARKER" "$NEW_JS" && grep -Fq "$MARKER" "$SERVER"; then
        echo "V17N is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed V17N production state"
    exit 29
fi

echo "V17M dynamic-width authority confirmed"
echo "Server 06:00 first-paint authority confirmed"
echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$SERVER" "$NEW_JS"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$SERVER" "$TMPROOT/$SERVER"
cp "$ACTIVE_JS" "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_MIDNIGHT_TIMELINE_V17N'

replacements = [
    ('    var dayStart = 360;', '    var dayStart = 0;'),
    ('    var dayEnd = 1800;', '    var dayEnd = 1440;'),
    ('    var left = ((window.start - 360) / total) * 100;', '    var left = (window.start / total) * 100;'),
    ('    var start = Math.max(360, Number(group.start || 360));', '    var start = Math.max(0, Number(group.start == null ? 0 : group.start));'),
    ('    var end = Math.min(1800, Number(group.end || start + 30));', '    var end = Math.min(1440, Number(group.end == null ? start + 30 : group.end));'),
    ('    if (end <= start) end = Math.min(1800, start + 30);', '    if (end <= start) end = Math.min(1440, start + 30);'),
    ('    var left = ((start - 360) / 1440) * 100;', '    var left = (start / 1440) * 100;'),
    ('    for (var value = 360; value <= 1800; value += 120) {', '    for (var value = 0; value <= 1440; value += 120) {'),
    ('    for (var value = 360; value < 1800; value += 60) {', '    for (var value = 0; value < 1440; value += 60) {'),
]

for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'STOP: JS anchor count={count}: {old}')
    s = s.replace(old, new, 1)

fn = '  function finalTimelineWindow(shift) {'
if s.count(fn) != 1:
    raise SystemExit(f'STOP: finalTimelineWindow count={s.count(fn)}')
s = s.replace(fn, '  // ' + marker + '\n' + fn, 1)

# Make the right endpoint unambiguous while preserving minuteLabel elsewhere.
scale_old = "      labels.push('<span>' + escapeHtml(minuteLabel(value)) + '</span>');"
scale_new = "      labels.push('<span>' + escapeHtml(value === 1440 ? '24:00' : minuteLabel(value)) + '</span>');"
if s.count(scale_old) != 1:
    raise SystemExit(f'STOP: scale label anchor count={s.count(scale_old)}')
s = s.replace(scale_old, scale_new, 1)

if 'var dayStart = 360;' in s or 'var dayEnd = 1800;' in s:
    raise SystemExit('STOP: old JS timeline boundary remains')

p.write_text(s)
print('V17N JS: timeline moved from 06:00-30:00 to 00:00-24:00')
PY

python3 - "$TMPROOT/$SERVER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_MIDNIGHT_TIMELINE_V17N'

if marker in s:
    print('Server V17N marker already present in temp')
    raise SystemExit(0)

replacements = [
    ('                            $tick = 360;', '                            $tick = 0;'),
    ('                            $tick <= 1800;', '                            $tick <= 1440;'),
    ('                                    $slot = 360;', '                                    $slot = 0;'),
    ('                                    $slot < 1800;', '                                    $slot < 1440;'),
    ('                                                1800,\n                                                $start + 480', '                                                1440,\n                                                $start + 480'),
    ('                                            360,\n                                            $start', '                                            0,\n                                            $start'),
    ('                                            1800,\n                                            $end', '                                            1440,\n                                            $end'),
    ('                                                1800,\n                                                $drawStart + 30', '                                                1440,\n                                                $drawStart + 30'),
    ('                                            ($drawStart - 360)\n                                            /\n                                            1440', '                                            $drawStart\n                                            /\n                                            1440'),
]

for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'STOP: server anchor count={count}: {old!r}')
    s = s.replace(old, new, 1)

# Render the final boundary as 24:00 instead of a duplicate 00:00.
old_label = """                                {{
                                    sprintf(
                                        '%02d:%02d',
                                        intdiv($tick, 60) % 24,
                                        $tick % 60
                                    )
                                }}"""
new_label = """                                {{
                                    $tick === 1440
                                        ? '24:00'
                                        : sprintf(
                                            '%02d:%02d',
                                            intdiv($tick, 60) % 24,
                                            $tick % 60
                                        )
                                }}"""
if s.count(old_label) != 1:
    raise SystemExit(f'STOP: server scale label block count={s.count(old_label)}')
s = s.replace(old_label, new_label, 1)

anchor = '    // PMD_SHIFTS_DATE_LOCALE_SERVER_V7'
if s.count(anchor) != 1:
    raise SystemExit(f'STOP: server marker anchor count={s.count(anchor)}')
s = s.replace(anchor, '    // ' + marker + '\n' + anchor, 1)

if '$tick = 360;' in s or '$slot = 360;' in s:
    raise SystemExit('STOP: old server timeline start remains')

p.write_text(s)
print('Server first paint: timeline moved to 00:00-24:00')
PY

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
old = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17m.js');"
new = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17n.js');"
marker = '        // PMD_SHIFTS_MIDNIGHT_TIMELINE_V17N'

if s.count(old) != 1:
    raise SystemExit(f'STOP: V17M JS registration count={s.count(old)}')
s = s.replace(old, marker + '\n' + new, 1)
p.write_text(s)
print('Shifts.php: V17N renderer fingerprint prepared')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NEW_JS"
grep -Fq "$MARKER" "$TMPROOT/$NEW_JS"
grep -Fq "$MARKER" "$TMPROOT/$SERVER"
grep -Fq 'var dayStart = 0;' "$TMPROOT/$NEW_JS"
grep -Fq 'var dayEnd = 1440;' "$TMPROOT/$NEW_JS"
grep -Fq 'for (var value = 0; value < 1440; value += 60)' "$TMPROOT/$NEW_JS"
grep -Fq '$tick = 0;' "$TMPROOT/$SERVER"
grep -Fq '$tick <= 1440;' "$TMPROOT/$SERVER"
grep -Fq '$slot = 0;' "$TMPROOT/$SERVER"
grep -Fq '$slot < 1440;' "$TMPROOT/$SERVER"
grep -Fq "pmd-shifts-inpage-day-nav-v17n.js" "$TMPROOT/$CONTROLLER"

# Preserve the V17M fix: dynamic widths must remain !important.
grep -Fq "width:' + width.toFixed(4) + '% !important" "$TMPROOT/$NEW_JS"
grep -Fq 'PMD_SHIFTS_DYNAMIC_BAR_GEOMETRY_V17M' "$TMPROOT/$NEW_JS"

# Do not reintroduce the repaint machinery already removed from Shifts.
if grep -Eq 'repairGeometry|MutationObserver|setInterval\(' "$TMPROOT/$NEW_JS"; then
    echo "STOP: forbidden late repaint machinery detected"
    exit 30
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 3 V17N TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

mkdir -p "$BACKUP/$(dirname "$SERVER")"
sudo cp -a "$SERVER" "$BACKUP/$SERVER"

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY CONTROLLER + SERVER ROTA + NEW JS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$SERVER" >/dev/null < "$TMPROOT/$SERVER"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"

sudo chown --reference="$ACTIVE_JS" "$NEW_JS"
sudo chmod --reference="$ACTIVE_JS" "$NEW_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$NEW_JS"
grep -nF "$MARKER" "$CONTROLLER"
grep -nF "$MARKER" "$SERVER" | head -1
grep -nF "$MARKER" "$NEW_JS" | head -1
grep -nF 'var dayStart = 0;' "$NEW_JS"
grep -nF 'var dayEnd = 1440;' "$NEW_JS"
grep -nF '$tick = 0;' "$SERVER"
grep -nF '$slot = 0;' "$SERVER"
grep -Fq "width:' + width.toFixed(4) + '% !important" "$NEW_JS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || sudo php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS MIDNIGHT TIMELINE V17N INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - planning day starts at 00:00 instead of 06:00"
echo "  - planning day ends at 24:00 instead of 06:00 next day"
echo "  - there are still exactly 24 one-hour clickable cells per person"
echo "  - server first paint and in-page day navigation use the same timeline origin"
echo "  - V17M important bar widths remain preserved"
echo "  - overnight shifts are clipped at midnight on the selected day's surface"
echo "  - no save/group merge/pause/MFA/Portal behavior changed"
echo "Backup: $BACKUP"
