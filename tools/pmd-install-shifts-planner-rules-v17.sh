#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
INDEX="app/admin/views/pmdshifts/index.blade.php"
SERVER="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
SERVICE="app/Services/PmdShiftPlannerRuleService.php"
NEW_MAIN="app/admin/assets/js/pmd-shifts-inpage-day-nav-v17.js"
CSS="app/admin/assets/css/pmd-shifts-planner-v17.css"
UIJS="app/admin/assets/js/pmd-shifts-planner-v17.js"
REF_SERVICE="app/Services/PmdKitchenOperationsSchemaService.php"
REF_CSS="app/admin/assets/css/pmd-shifts-planner-ux-v15-fast.css"
REF_JS="app/admin/assets/js/pmd-shifts-planner-ux-v15-fast.js"

BACKUP="/tmp/pmd-shifts-planner-v17-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-planner-v17.XXXXXX)"
APPLY_STARTED=0
NEW_MAIN_EXISTED=0
SERVICE_EXISTED=0
CSS_EXISTED=0
UIJS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17"
        set +e

        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$INDEX" "$INDEX"
        sudo cp -a "$BACKUP/$SERVER" "$SERVER"

        if [ "$NEW_MAIN_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_MAIN" "$NEW_MAIN"
        else
            sudo rm -f "$NEW_MAIN"
        fi

        if [ "$SERVICE_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$SERVICE" "$SERVICE"
        else
            sudo rm -f "$SERVICE"
        fi

        if [ "$CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CSS" "$CSS"
        else
            sudo rm -f "$CSS"
        fi

        if [ "$UIJS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$UIJS" "$UIJS"
        else
            sudo rm -f "$UIJS"
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
test -f "$INDEX" || { echo "STOP: missing $INDEX"; exit 21; }
test -f "$SERVER" || { echo "STOP: missing $SERVER"; exit 22; }
test -f "$REF_SERVICE" || { echo "STOP: missing service reference"; exit 23; }
test -f "$REF_CSS" || { echo "STOP: missing CSS reference"; exit 24; }
test -f "$REF_JS" || { echo "STOP: missing JS reference"; exit 25; }

if grep -Fq "PMD_SHIFTS_PLANNER_RULES_V17" "$CONTROLLER"; then
    echo "V17 is already registered in production. Nothing changed."
    exit 0
fi

ACTIVE_MAIN="$(python3 - <<'PY'
from pathlib import Path
import re
s = Path('app/admin/controllers/Shifts.php').read_text()
matches = re.findall(r"\$this->addJs\('js/(pmd-shifts-inpage-day-nav-v(?:13|16)\.js)'\);", s)
if len(matches) != 1:
    raise SystemExit('STOP: expected exactly one active V13/V16 day renderer, found %d' % len(matches))
print(matches[0])
PY
)"
ACTIVE_MAIN="app/admin/assets/js/$ACTIVE_MAIN"

test -f "$ACTIVE_MAIN" || { echo "STOP: active renderer missing: $ACTIVE_MAIN"; exit 26; }

echo "Active Shifts day renderer: $ACTIVE_MAIN"

git cat-file -e "$REF:$SERVICE" || { echo "STOP: V17 service missing on fetched branch"; exit 27; }
git cat-file -e "$REF:$CSS" || { echo "STOP: V17 CSS missing on fetched branch"; exit 28; }
git cat-file -e "$REF:$UIJS" || { echo "STOP: V17 JS missing on fetched branch"; exit 29; }

grep -Fq "public function saveshift()" "$CONTROLLER" || { echo "STOP: saveshift missing"; exit 30; }
grep -Fq "PMD_SHIFTS_EXTEND_EXISTING_V1" "$CONTROLLER" || { echo "STOP: existing coalesce authority missing"; exit 31; }
grep -Fq "data-pmd-shift-label" "$INDEX" || { echo "STOP: Shift name input missing"; exit 32; }
grep -Fq "pmd-shifts-final-slots" "$SERVER" || { echo "STOP: server slots missing"; exit 33; }
grep -Fq "data-pmd-fixed-date" "$ACTIVE_MAIN" || {
    echo "STOP: active renderer has no immutable date authority; refusing to retire V15F observer"
    exit 34
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$INDEX" "$SERVER" "$NEW_MAIN" "$SERVICE" "$CSS" "$UIJS"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$INDEX" "$TMPROOT/$INDEX"
cp "$SERVER" "$TMPROOT/$SERVER"
cp "$ACTIVE_MAIN" "$TMPROOT/$NEW_MAIN"

git show "$REF:$SERVICE" > "$TMPROOT/$SERVICE"
git show "$REF:$CSS" > "$TMPROOT/$CSS"
git show "$REF:$UIJS" > "$TMPROOT/$UIJS"

test -s "$TMPROOT/$SERVICE"
test -s "$TMPROOT/$CSS"
test -s "$TMPROOT/$UIJS"

python3 - "$TMPROOT/$CONTROLLER" "$ACTIVE_MAIN" <<'PY'
from pathlib import Path
import re
import sys

p = Path(sys.argv[1])
active_main = sys.argv[2].split('/')[-1]
s = p.read_text()

# Import server-side planning rules.
import_anchor = 'use App\\Services\\PmdOperationalRosterReconciler;'
import_line = 'use App\\Services\\PmdShiftPlannerRuleService;'
if import_line not in s:
    if import_anchor not in s:
        raise SystemExit('STOP: controller service import anchor missing')
    s = s.replace(import_anchor, import_anchor + '\n' + import_line, 1)

# Shift name is optional; empty remains empty and never silently becomes "Shift".
old_validator = "            'label' => ['required', 'string', 'max:64'],"
new_validator = "            'label' => ['nullable', 'string', 'max:64'],"
if new_validator not in s:
    if s.count(old_validator) != 1:
        raise SystemExit(f'STOP: Shift label validator anchor count={s.count(old_validator)}')
    s = s.replace(old_validator, new_validator, 1)

old_label = "                'label' => trim((string)$clean['label']) ?: 'Shift',"
new_label = "                'label' => trim((string)($clean['label'] ?? ''))," 
if new_label not in s:
    if s.count(old_label) != 1:
        raise SystemExit(f'STOP: Shift label fallback anchor count={s.count(old_label)}')
    s = s.replace(old_label, new_label, 1)

# Server-side break minimum. UI cannot undercut this via DevTools/manual POST.
old_break = "                $values['break_minutes'] = max(0, min(240, (int)($clean['break_minutes'] ?? 30)));"
new_break = """                $values['break_minutes'] = app(PmdShiftPlannerRuleService::class)->normalizeBreakMinutes(
                    !empty($clean['starts_at']) ? (string)$clean['starts_at'] : null,
                    !empty($clean['ends_at']) ? (string)$clean['ends_at'] : null,
                    (int)($clean['break_minutes'] ?? 0)
                );"""
if 'normalizeBreakMinutes(' not in s:
    if s.count(old_break) != 1:
        raise SystemExit(f'STOP: break storage anchor count={s.count(old_break)}')
    s = s.replace(old_break, new_break, 1)

# New single-person create: union all overlaps/touching ranges for that person.
merge_marker = '            // PMD_SHIFTS_PERSON_OVERLAP_UNION_V17'
merge_anchor = """            $merged = $this->coalesceShiftRange(
                $locationId,"""
if merge_marker not in s:
    if s.count(merge_anchor) != 1:
        raise SystemExit(f'STOP: coalesce call anchor count={s.count(merge_anchor)}')
    merge_block = """            // PMD_SHIFTS_PERSON_OVERLAP_UNION_V17
            // Quick-create/new one-person shifts extend the existing personal
            // coverage range instead of drawing stacked overlapping bars.
            // Explicit Edit Shift (id > 0) remains a direct edit operation.
            if (
                $id < 1
                && count($personIds) === 1
                && !empty($clean['starts_at'])
                && !empty($clean['ends_at'])
            ) {
                $personMerge = app(PmdShiftPlannerRuleService::class)->mergeSinglePersonCreate(
                    $locationId,
                    $shiftDate,
                    $shiftId,
                    (int)$personIds[0]
                );
                if (!empty($personMerge['merged'])) {
                    $message = 'Existing shift extended. Team confirmation is required again.';
                }
            }

"""
    s = s.replace(merge_anchor, merge_block + merge_anchor, 1)

# Replace only the active production day renderer with a new fingerprint.
old_main = "        $this->addJs('js/%s');" % active_main
new_main = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v17.js');"
if new_main not in s:
    if s.count(old_main) != 1:
        raise SystemExit(f'STOP: active renderer registration count={s.count(old_main)}')
    s = s.replace(old_main, new_main, 1)

# Retire V15F runtime and any unfinished V16 enhancement. V17 owns these jobs
# without MutationObserver or pointerover/pointerout listeners.
remove_assets = [
    "        $this->addCss('css/pmd-shifts-planner-ux-v15-fast.css');\n",
    "        $this->addJs('js/pmd-shifts-planner-ux-v15-fast.js');\n",
    "        $this->addCss('css/pmd-shifts-hourly-inline-time-v16.css');\n",
    "        $this->addJs('js/pmd-shifts-inline-time-v16.js');\n",
]
for line in remove_assets:
    s = s.replace(line, '')

# Clean obsolete marker comments if present.
s = s.replace('        // PMD_SHIFTS_PLANNER_PERFORMANCE_V15F\n', '')
s = s.replace('        // PMD_SHIFTS_HOURLY_INLINE_TIME_V16\n', '')

css_new = "        $this->addCss('css/pmd-shifts-planner-v17.css');"
js_new = "        $this->addJs('js/pmd-shifts-planner-v17.js');"
marker = '        // PMD_SHIFTS_PLANNER_RULES_V17'

if css_new not in s:
    css_anchor = "        $this->addCss('css/pmd-shifts-big-calendar-v14.css');"
    if css_anchor not in s:
        raise SystemExit('STOP: V14 CSS registration anchor missing')
    s = s.replace(css_anchor, css_anchor + '\n' + marker + '\n' + css_new, 1)

if js_new not in s:
    js_anchor = "        $this->addJs('js/pmd-shifts-big-calendar-v14.js');"
    if js_anchor not in s:
        raise SystemExit('STOP: V14 JS registration anchor missing')
    s = s.replace(js_anchor, js_anchor + '\n' + js_new, 1)

p.write_text(s)
print('Shifts.php: overlap union + legal pause + V17 lean assets prepared')
PY

python3 - "$TMPROOT/$INDEX" <<'PY'
from pathlib import Path
import re
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_OPTIONAL_LABEL_V17'

if marker not in s:
    matches = list(re.finditer(r'<input\b[^>]*data-pmd-shift-label[^>]*>', s))
    if len(matches) != 1:
        raise SystemExit(f'STOP: expected one Shift label input, found {len(matches)}')

    old = matches[0].group(0)
    new = re.sub(r'\srequired(?=\s|>)', '', old)
    new = re.sub(r'\svalue="[^"]*"', ' value=""', new)
    if 'placeholder=' not in new:
        new = new[:-1] + ' placeholder="Optional">'

    s = s[:matches[0].start()] + new + s[matches[0].end():]

    # Put the marker next to the form so a later installer can audit it.
    form_anchor = '<form class="pmd-shifts__modal-form"'
    pos = s.find(form_anchor)
    if pos < 0:
        raise SystemExit('STOP: Shift modal form anchor missing')
    s = s[:pos] + '{{-- PMD_SHIFTS_OPTIONAL_LABEL_V17 --}}\n                ' + s[pos:]

p.write_text(s)
print('Shift name: optional and blank by default')
PY

python3 - "$TMPROOT/$SERVER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V17'

if marker not in s:
    if '$slot += 30' in s:
        if s.count('$slot += 30') != 1:
            raise SystemExit('STOP: multiple server 30-minute slot loops')
        s = s.replace('$slot += 30', '$slot += 60', 1)
    elif '$slot += 60' not in s:
        raise SystemExit('STOP: server slot step is neither 30 nor 60')

    anchor = '<div class="pmd-shifts-final-slots">'
    if anchor not in s:
        raise SystemExit('STOP: server slot container missing')
    s = s.replace(anchor, '{{-- PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V17 --}}\n                            ' + anchor, 1)

p.write_text(s)
print('Server first paint: one quick-create target per hour')
PY

python3 - "$TMPROOT/$NEW_MAIN" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_HOURLY_QUICK_CREATE_V17'

if marker not in s:
    if 'value += 30' in s:
        if s.count('value += 30') != 1:
            raise SystemExit('STOP: multiple dynamic 30-minute slot loops')
        s = s.replace('value += 30', 'value += 60', 1)
    elif 'value += 60' not in s:
        raise SystemExit('STOP: dynamic slot step is neither 30 nor 60')

    old_label = "if (labelInput) labelInput.value = 'Shift';"
    new_label = "if (labelInput) labelInput.value = '';"
    if old_label in s:
        if s.count(old_label) != 1:
            raise SystemExit('STOP: multiple default Shift label assignments')
        s = s.replace(old_label, new_label, 1)
    elif new_label not in s:
        raise SystemExit('STOP: Shift reset label assignment not found')

    if 'data-pmd-fixed-date' not in s:
        raise SystemExit('STOP: immutable dynamic date markup missing')

    s = '/* PMD_SHIFTS_HOURLY_QUICK_CREATE_V17 */\n' + s

p.write_text(s)
print('Dynamic day renderer: hourly targets + blank Shift name preserved')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$INDEX"
php -l "$TMPROOT/$SERVER"
php -l "$TMPROOT/$SERVICE"
node --check "$TMPROOT/$NEW_MAIN"
node --check "$TMPROOT/$UIJS"

grep -Fq "PMD_SHIFTS_PLANNER_RULES_V17" "$TMPROOT/$CONTROLLER"
grep -Fq "PmdShiftPlannerRuleService" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_PERSON_OVERLAP_UNION_V17" "$TMPROOT/$CONTROLLER"
grep -Fq "normalizeBreakMinutes" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_OPTIONAL_LABEL_V17" "$TMPROOT/$INDEX"
grep -Fq "PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V17" "$TMPROOT/$SERVER"
grep -Fq '$slot += 60' "$TMPROOT/$SERVER"
grep -Fq "PMD_SHIFTS_HOURLY_QUICK_CREATE_V17" "$TMPROOT/$NEW_MAIN"
grep -Fq "value += 60" "$TMPROOT/$NEW_MAIN"
grep -Fq "labelInput.value = '';" "$TMPROOT/$NEW_MAIN"
grep -Fq "data-pmd-fixed-date" "$TMPROOT/$NEW_MAIN"
grep -Fq "PMD_SHIFT_PLANNER_RULES_V17" "$TMPROOT/$SERVICE"
grep -Fq "repeat(24" "$TMPROOT/$CSS"
grep -Fq "PMD_SHIFTS_PLANNER_V17" "$TMPROOT/$UIJS"

if grep -Fq "pmd-shifts-planner-ux-v15-fast.js" "$TMPROOT/$CONTROLLER"; then
    echo "STOP: heavy V15F runtime still registered in temp controller"
    exit 40
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 7 V17 TARGETS"
echo "========================================"

for path in "$CONTROLLER" "$INDEX" "$SERVER" "$NEW_MAIN" "$SERVICE" "$CSS" "$UIJS"; do
    mkdir -p "$BACKUP/$(dirname "$path")"
done

sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"
sudo cp -a "$INDEX" "$BACKUP/$INDEX"
sudo cp -a "$SERVER" "$BACKUP/$SERVER"

if [ -e "$NEW_MAIN" ]; then
    NEW_MAIN_EXISTED=1
    sudo cp -a "$NEW_MAIN" "$BACKUP/$NEW_MAIN"
fi
if [ -e "$SERVICE" ]; then
    SERVICE_EXISTED=1
    sudo cp -a "$SERVICE" "$BACKUP/$SERVICE"
fi
if [ -e "$CSS" ]; then
    CSS_EXISTED=1
    sudo cp -a "$CSS" "$BACKUP/$CSS"
fi
if [ -e "$UIJS" ]; then
    UIJS_EXISTED=1
    sudo cp -a "$UIJS" "$BACKUP/$UIJS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 7 V17 TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$INDEX" >/dev/null < "$TMPROOT/$INDEX"
sudo tee "$SERVER" >/dev/null < "$TMPROOT/$SERVER"
sudo tee "$NEW_MAIN" >/dev/null < "$TMPROOT/$NEW_MAIN"
sudo tee "$SERVICE" >/dev/null < "$TMPROOT/$SERVICE"
sudo tee "$CSS" >/dev/null < "$TMPROOT/$CSS"
sudo tee "$UIJS" >/dev/null < "$TMPROOT/$UIJS"

sudo chown --reference="$ACTIVE_MAIN" "$NEW_MAIN"
sudo chmod --reference="$ACTIVE_MAIN" "$NEW_MAIN"
sudo chown --reference="$REF_SERVICE" "$SERVICE"
sudo chmod --reference="$REF_SERVICE" "$SERVICE"
sudo chown --reference="$REF_CSS" "$CSS"
sudo chmod --reference="$REF_CSS" "$CSS"
sudo chown --reference="$REF_JS" "$UIJS"
sudo chmod --reference="$REF_JS" "$UIJS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
php -l "$INDEX"
php -l "$SERVER"
php -l "$SERVICE"
node --check "$NEW_MAIN"
node --check "$UIJS"

grep -nF "PMD_SHIFTS_PLANNER_RULES_V17" "$CONTROLLER"
grep -nF "PMD_SHIFTS_PERSON_OVERLAP_UNION_V17" "$CONTROLLER"
grep -nF "PMD_SHIFTS_OPTIONAL_LABEL_V17" "$INDEX"
grep -nF "PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V17" "$SERVER"
grep -nF "PMD_SHIFTS_HOURLY_QUICK_CREATE_V17" "$NEW_MAIN"
grep -nF "PMD_SHIFT_PLANNER_RULES_V17" "$SERVICE"
grep -nF "PMD_SHIFTS_PLANNER_V17" "$CSS" | head -1
grep -nF "PMD_SHIFTS_PLANNER_V17" "$UIJS" | head -1

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS PLANNER RULES V17 INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - new single-person overlapping/touching shifts UNION into one continuous shift"
echo "  - shared shifts are not stretched for other staff; only the selected person is detached/merged"
echo "  - Edit Shift remains a direct edit and does not trigger create-time overlap union"
echo "  - Germany pause default/enforcement: >6h => 30 min, >9h => 45 min"
echo "  - pause presets: 0 / 20 / 30 / 45 / 60 / Custom; choices below minimum are disabled"
echo "  - Shift name is optional and blank for new shifts; no hidden 'Shift' fallback"
echo "  - quick-create grid has one real target per hour"
echo "  - Start/End number wheels are always visible inside the Shift card"
echo "  - Team column reduced from 220px to 190px"
echo "  - V15F MutationObserver/floating-plus runtime is retired for better Safari performance"
echo "  - date lock, V13 in-page navigation and V14 big calendar remain preserved"
echo "Backup: $BACKUP"
echo "Previous active day renderer kept untouched: $ACTIVE_MAIN"
