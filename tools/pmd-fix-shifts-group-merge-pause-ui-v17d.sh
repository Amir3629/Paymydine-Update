#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/Shifts.php"
SERVICE="app/Services/PmdShiftPlannerRuleService.php"
NEW_CSS="app/admin/assets/css/pmd-shifts-planner-polish-v17d.css"
NEW_JS="app/admin/assets/js/pmd-shifts-planner-polish-v17d.js"
REF_CSS="app/admin/assets/css/pmd-shifts-reservation-jade-time-v17c.css"
REF_JS="app/admin/assets/js/pmd-shifts-reservation-jade-time-v17c.js"

BACKUP="/tmp/pmd-shifts-v17d-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-v17d.XXXXXX)"
APPLY_STARTED=0
NEW_CSS_EXISTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V17D"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$SERVICE" "$SERVICE"

        if [ "$NEW_CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_CSS" "$NEW_CSS"
        else
            sudo rm -f "$NEW_CSS"
        fi

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
test -f "$SERVICE" || { echo "STOP: missing $SERVICE"; exit 21; }
test -f "$REF_CSS" || { echo "STOP: missing V17C CSS reference"; exit 22; }
test -f "$REF_JS" || { echo "STOP: missing V17C JS reference"; exit 23; }

grep -Fq "PMD_SHIFTS_PLANNER_RULES_V17" "$CONTROLLER" || {
    echo "STOP: V17 planner rules are not installed"
    exit 24
}
grep -Fq "pmd-shifts-reservation-jade-time-v17c.css" "$CONTROLLER" || {
    echo "STOP: V17C CSS is not active"
    exit 25
}
grep -Fq "pmd-shifts-reservation-jade-time-v17c.js" "$CONTROLLER" || {
    echo "STOP: V17C JS is not active"
    exit 26
}
grep -Fq "PMD_SHIFTS_PERSON_OVERLAP_UNION_V17" "$CONTROLLER" || {
    if grep -Fq "PMD_SHIFTS_PERSON_GROUP_OVERLAP_UNION_V17D" "$CONTROLLER"; then
        echo "V17D group merge controller marker already present."
    else
        echo "STOP: V17 single-person overlap anchor missing"
        exit 27
    fi
}
grep -Fq "PMD_SHIFTS_PAUSE_RECOMMENDATION_ONLY_V17C" "$SERVICE" || {
    echo "STOP: V17C recommendation-only backend is not installed"
    exit 28
}
grep -Fq "public function mergeSinglePersonCreate" "$SERVICE" || {
    echo "STOP: V17 personal merge service missing"
    exit 29
}

git cat-file -e "$REF:$NEW_CSS" || { echo "STOP: V17D CSS missing on fetched branch"; exit 30; }
git cat-file -e "$REF:$NEW_JS" || { echo "STOP: V17D JS missing on fetched branch"; exit 31; }

if grep -Fq "PMD_SHIFTS_PERSON_GROUP_OVERLAP_UNION_V17D" "$CONTROLLER" \
   && grep -Fq "PMD_SHIFTS_GROUP_OVERLAP_UNION_V17D" "$SERVICE" \
   && grep -Fq "pmd-shifts-planner-polish-v17d.css" "$CONTROLLER" \
   && grep -Fq "pmd-shifts-planner-polish-v17d.js" "$CONTROLLER"; then
    echo "V17D is already installed. Nothing changed."
    exit 0
fi

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$SERVICE" "$NEW_CSS" "$NEW_JS"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$SERVICE" "$TMPROOT/$SERVICE"
git show "$REF:$NEW_CSS" > "$TMPROOT/$NEW_CSS"
git show "$REF:$NEW_JS" > "$TMPROOT/$NEW_JS"

test -s "$TMPROOT/$NEW_CSS"
test -s "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

css_line = "        $this->addCss('css/pmd-shifts-planner-polish-v17d.css');"
js_line = "        $this->addJs('js/pmd-shifts-planner-polish-v17d.js');"
marker = "        // PMD_SHIFTS_GROUP_MERGE_PAUSE_UI_V17D"

if css_line not in s:
    anchor = "        $this->addCss('css/pmd-shifts-reservation-jade-time-v17c.css');"
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: V17C CSS registration count={s.count(anchor)}')
    s = s.replace(anchor, anchor + "\n" + marker + "\n" + css_line, 1)

if js_line not in s:
    anchor = "        $this->addJs('js/pmd-shifts-reservation-jade-time-v17c.js');"
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: V17C JS registration count={s.count(anchor)}')
    s = s.replace(anchor, anchor + "\n" + js_line, 1)

old_marker = "            // PMD_SHIFTS_PERSON_OVERLAP_UNION_V17"
new_marker = "            // PMD_SHIFTS_PERSON_GROUP_OVERLAP_UNION_V17D"
if new_marker not in s:
    start = s.find(old_marker)
    end_anchor = "            $merged = $this->coalesceShiftRange("
    end = s.find(end_anchor, start)
    if start < 0 or end < 0:
        raise SystemExit('STOP: V17 personal-overlap block boundaries not found')

    block = """            // PMD_SHIFTS_PERSON_GROUP_OVERLAP_UNION_V17D
            // New creates are normalized per selected person. People who already
            // have overlapping/touching coverage are detached from the new shared
            // record and merged into their own existing coverage. People without
            // overlap remain together on the new group shift. Explicit Edit Shift
            // (id > 0) remains a direct edit and never triggers this create rule.
            if (
                $id < 1
                && $personIds
                && !empty($clean['starts_at'])
                && !empty($clean['ends_at'])
            ) {
                $personMerge = app(PmdShiftPlannerRuleService::class)->mergeCreateForPeople(
                    $locationId,
                    $shiftDate,
                    $shiftId,
                    $personIds
                );
                if ((int)($personMerge['merged_people'] ?? 0) > 0) {
                    $message = 'Existing shift coverage extended. Team confirmation is required again.';
                }
            }

"""
    s = s[:start] + block + s[end:]

p.write_text(s)
print('Shifts.php: V17D group-overlap authority + polish assets prepared')
PY

python3 - "$TMPROOT/$SERVICE" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_GROUP_OVERLAP_UNION_V17D'

if marker not in s:
    anchor = "    /**\n     * Merge a newly-created one-person shift with every overlapping/touching\n"
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: mergeSinglePersonCreate doc anchor count={s.count(anchor)}')

    method = r'''    /** PMD_SHIFTS_GROUP_OVERLAP_UNION_V17D
     * Normalize a new multi-person create independently for every selected person.
     *
     * The shared new shift remains intact for people without existing overlap.
     * A person with existing overlap is detached from that shared new shift, given
     * a temporary one-person clone, then passed through the existing personal-union
     * authority. This prevents a group create from stretching unrelated coworkers.
     */
    public function mergeCreateForPeople(
        int $locationId,
        string $shiftDate,
        int $newShiftId,
        array $personIds
    ): array {
        $personIds = array_values(array_unique(array_filter(array_map('intval', $personIds), function ($id) {
            return $id > 0;
        })));
        sort($personIds);

        if ($locationId < 1 || $newShiftId < 1 || !$personIds) {
            return ['merged_people' => 0, 'separated_people' => 0, 'remaining_group_people' => 0];
        }

        if (count($personIds) === 1) {
            $result = $this->mergeSinglePersonCreate(
                $locationId,
                $shiftDate,
                $newShiftId,
                (int)$personIds[0]
            );

            return [
                'merged_people' => !empty($result['merged']) ? 1 : 0,
                'separated_people' => 0,
                'remaining_group_people' => 1,
            ];
        }

        $newShift = DB::table('pmd_operational_shifts')
            ->where('id', $newShiftId)
            ->where('location_id', $locationId)
            ->whereDate('shift_date', $shiftDate)
            ->lockForUpdate()
            ->first();

        if (!$newShift) {
            return ['merged_people' => 0, 'separated_people' => 0, 'remaining_group_people' => 0];
        }

        $assignments = DB::table('pmd_operational_shift_people')
            ->where('shift_id', $newShiftId)
            ->whereIn('person_id', $personIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('person_id');

        $mergedPeople = 0;
        $separatedPeople = 0;

        foreach ($personIds as $personId) {
            $assignment = $assignments->get($personId);
            if (!$assignment) continue;

            if (!$this->personHasOverlappingCoverage(
                $locationId,
                $shiftDate,
                $newShiftId,
                $personId,
                $newShift->starts_at ?? null,
                $newShift->ends_at ?? null
            )) {
                continue;
            }

            // Remove only this person from the new shared shift. Other selected
            // people keep the exact group timing unless they independently overlap.
            DB::table('pmd_operational_shift_people')
                ->where('shift_id', $newShiftId)
                ->where('person_id', $personId)
                ->delete();

            $clone = [
                'location_id' => $locationId,
                'shift_date' => $shiftDate,
                // A create operation must extend the existing person's coverage,
                // not silently rename or rewrite that existing shift.
                'label' => '',
                'starts_at' => $newShift->starts_at,
                'ends_at' => $newShift->ends_at,
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {
                $clone['notes'] = null;
            }
            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
                $clone['break_minutes'] = max(0, min(240, (int)($newShift->break_minutes ?? 0)));
            }

            $cloneId = (int)DB::table('pmd_operational_shifts')->insertGetId($clone);

            DB::table('pmd_operational_shift_people')->insert([
                'shift_id' => $cloneId,
                'person_id' => $personId,
                'display_name_snapshot' => (string)$assignment->display_name_snapshot,
                'department_snapshot' => (string)($assignment->department_snapshot ?: 'other'),
                'job_role_snapshot' => trim((string)($assignment->job_role_snapshot ?? '')) ?: null,
                'attendance_status' => 'planned',
                'is_replacement' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $result = $this->mergeSinglePersonCreate(
                $locationId,
                $shiftDate,
                $cloneId,
                $personId
            );

            $separatedPeople++;
            if (!empty($result['merged'])) $mergedPeople++;
        }

        $remaining = DB::table('pmd_operational_shift_people')
            ->where('shift_id', $newShiftId)
            ->count();

        if ($separatedPeople > 0) {
            if ($remaining < 1) {
                DB::table('pmd_operational_shifts')
                    ->where('id', $newShiftId)
                    ->update([
                        'status' => 'cancelled',
                        'quick_counts_json' => null,
                        'confirmed_at' => null,
                        'confirmed_by_staff_id' => null,
                        'updated_at' => now(),
                    ]);
            } else {
                DB::table('pmd_operational_shifts')
                    ->where('id', $newShiftId)
                    ->update([
                        'status' => 'planned',
                        'quick_counts_json' => null,
                        'confirmed_at' => null,
                        'confirmed_by_staff_id' => null,
                        'updated_at' => now(),
                    ]);

                DB::table('pmd_operational_shift_people')
                    ->where('shift_id', $newShiftId)
                    ->update([
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'updated_at' => now(),
                    ]);
            }
        }

        return [
            'merged_people' => $mergedPeople,
            'separated_people' => $separatedPeople,
            'remaining_group_people' => (int)$remaining,
        ];
    }

'''
    s = s.replace(anchor, method + anchor, 1)

    helper_anchor = "    private function windowMinutes(?string $startsAt, ?string $endsAt): ?array\n"
    if s.count(helper_anchor) != 1:
        raise SystemExit(f'STOP: windowMinutes helper anchor count={s.count(helper_anchor)}')

    helper = r'''    private function personHasOverlappingCoverage(
        int $locationId,
        string $shiftDate,
        int $excludedShiftId,
        int $personId,
        ?string $startsAt,
        ?string $endsAt
    ): bool {
        $newWindow = $this->windowMinutes($startsAt, $endsAt);
        if (!$newWindow) return false;

        $candidates = DB::table('pmd_operational_shift_people as assignment')
            ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
            ->where('assignment.person_id', $personId)
            ->where('shift.location_id', $locationId)
            ->whereDate('shift.shift_date', $shiftDate)
            ->where('shift.id', '<>', $excludedShiftId)
            ->whereNotIn('shift.status', ['cancelled', 'canceled'])
            ->whereNotNull('shift.starts_at')
            ->whereNotNull('shift.ends_at')
            ->select(['shift.starts_at', 'shift.ends_at'])
            ->lockForUpdate()
            ->get();

        foreach ($candidates as $candidate) {
            $window = $this->windowMinutes($candidate->starts_at ?? null, $candidate->ends_at ?? null);
            if (!$window) continue;
            if ($window['start'] <= $newWindow['end'] && $newWindow['start'] <= $window['end']) {
                return true;
            }
        }

        return false;
    }

'''
    s = s.replace(helper_anchor, helper + helper_anchor, 1)

p.write_text(s)
print('PmdShiftPlannerRuleService.php: per-person group overlap union prepared')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$SERVICE"
node --check "$TMPROOT/$NEW_JS"

grep -Fq "PMD_SHIFTS_PERSON_GROUP_OVERLAP_UNION_V17D" "$TMPROOT/$CONTROLLER"
grep -Fq "mergeCreateForPeople(" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_GROUP_OVERLAP_UNION_V17D" "$TMPROOT/$SERVICE"
grep -Fq "public function mergeCreateForPeople" "$TMPROOT/$SERVICE"
grep -Fq "private function personHasOverlappingCoverage" "$TMPROOT/$SERVICE"
grep -Fq "pmd-shifts-planner-polish-v17d.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-planner-polish-v17d.js" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_PLANNER_POLISH_V17D" "$TMPROOT/$NEW_CSS"
grep -Fq "PMD_SHIFTS_PLANNER_POLISH_V17D" "$TMPROOT/$NEW_JS"

if grep -Fq "count(\$personIds) === 1" "$TMPROOT/$CONTROLLER"; then
    echo "STOP: controller still contains single-person-only create gate"
    exit 40
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 4 V17D TARGETS"
echo "========================================"

sudo mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

sudo mkdir -p "$BACKUP/$(dirname "$SERVICE")"
sudo cp -a "$SERVICE" "$BACKUP/$SERVICE"

if [ -e "$NEW_CSS" ]; then
    NEW_CSS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_CSS")"
    sudo cp -a "$NEW_CSS" "$BACKUP/$NEW_CSS"
fi

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 4 V17D TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$SERVICE" >/dev/null < "$TMPROOT/$SERVICE"
sudo tee "$NEW_CSS" >/dev/null < "$TMPROOT/$NEW_CSS"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"

sudo chown --reference="$REF_CSS" "$NEW_CSS"
sudo chmod --reference="$REF_CSS" "$NEW_CSS"
sudo chown --reference="$REF_JS" "$NEW_JS"
sudo chmod --reference="$REF_JS" "$NEW_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
php -l "$SERVICE"
node --check "$NEW_JS"

grep -nF "PMD_SHIFTS_PERSON_GROUP_OVERLAP_UNION_V17D" "$CONTROLLER"
grep -nF "public function mergeCreateForPeople" "$SERVICE"
grep -nF "pmd-shifts-planner-polish-v17d.css" "$CONTROLLER"
grep -nF "pmd-shifts-planner-polish-v17d.js" "$CONTROLLER"
grep -nF "PMD_SHIFTS_PLANNER_POLISH_V17D" "$NEW_CSS" | head -1
grep -nF "PMD_SHIFTS_PLANNER_POLISH_V17D" "$NEW_JS" | head -1

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS GROUP MERGE + PAUSE UI V17D INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - group creates normalize overlap independently for every selected person"
echo "  - an existing personal/shared shift is extended instead of drawing a second overlapping bar"
echo "  - unrelated coworkers on a shared existing shift keep their original timing"
echo "  - selected people without overlap remain together on the new group shift"
echo "  - explicit Edit Shift remains a direct edit"
echo "  - pause presets are larger and stay on one row"
echo "  - the Custom pause field is always visible in that same row"
echo "  - preset clicks update the Custom field; manual Custom input updates the real break value"
echo "  - cell plus icons and mouse-hover decoration are removed while cells stay clickable"
echo "Backup: $BACKUP"
