#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-v7-role-merge-controls-' + STAMP)

CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
CSS = ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css'
ROSTER = ROOT / 'app/Services/PmdOperationalRosterReconciler.php'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'

SERVICE_COMMIT = 'e6d8759f7a20507c9788dc450144c19606bea7ef'
SERVICE_REPO_PATH = 'app/Services/PmdOperationalRosterReconciler.php'

for path in [CONTROLLER, CSS, ROSTER, GATE]:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

controller = CONTROLLER.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
roster = ROSTER.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')

if 'PMD_SITE_ACCESS_WEB_GATE_V2' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: safe PmdSiteAccessGateMiddleware V2 is not active')

for token in [
    'PMD_SHIFTS_CANONICAL_ROSTER_V1',
    'PMD_SHIFTS_EXACT_DUPLICATE_GUARD_V1',
    'PMD_SHIFTS_FINGERPRINTED_ASSETS_V1',
]:
    if token not in controller:
        raise SystemExit(f'ERROR: controller missing {token}; expected V6 production state')

if 'PMD_SHIFTS_CANONICAL_VISUAL_V3' not in css:
    raise SystemExit('ERROR: Shifts CSS is not at V5/V6 visual state')
if 'PMD_OPERATIONAL_ROSTER_RECONCILE_V1' not in roster and 'PMD_OPERATIONAL_ROSTER_RECONCILE_V2' not in roster:
    raise SystemExit('ERROR: unexpected roster reconciler authority')

original_controller = controller
original_css = css
original_roster = roster
created = []


def git_show(commit, path):
    result = subprocess.run(
        ['git', 'show', f'{commit}:{path}'],
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise RuntimeError(f'git show failed for {commit}:{path}: {result.stderr.strip()}')
    return result.stdout


# -------------------------------------------------------------------------
# 1. Staff role -> live Dienstplan role authority.
# -------------------------------------------------------------------------
expected_roster = git_show(SERVICE_COMMIT, SERVICE_REPO_PATH)
if 'PMD_OPERATIONAL_ROSTER_RECONCILE_V2' not in expected_roster:
    raise SystemExit('ERROR: pinned V2 roster reconciler marker missing')
roster = expected_roster
print('PATCH: Sync explicit changed staff roles into Dienstplan + future shift snapshots')


# -------------------------------------------------------------------------
# 2. Legacy/current overlap invariant: same team + same day + overlap/touch
#    is one shift. Old confirmation becomes invalid when schedule changes.
# -------------------------------------------------------------------------
if 'PMD_SHIFTS_COALESCE_RECONFIRM_V1' not in controller:
    people_needle = "\n            $people = DB::table('pmd_operational_people')\n"
    roster_marker_pos = controller.find('PMD_SHIFTS_CANONICAL_ROSTER_V1')
    people_pos = controller.find(people_needle, roster_marker_pos)
    if roster_marker_pos < 0 or people_pos < 0:
        raise SystemExit('ERROR before write: could not locate post-roster people query')

    coalesce_boot = """
            // PMD_SHIFTS_COALESCE_RECONFIRM_V1
            // Enforce one continuous shift for an identical assigned team.
            // Legacy overlaps/touching shifts are collapsed before rendering;
            // changing schedule geometry invalidates the previous confirmation.
            try {
                $this->coalesceShiftRange($locationId, $calendarStart, $calendarEnd);
            } catch (\\Throwable $error) {
                logger()->warning('PMD Shifts overlap normalization failed', [
                    'location_id' => $locationId,
                    'message' => $error->getMessage(),
                ]);
            }
"""
    controller = controller[:people_pos] + coalesce_boot + controller[people_pos:]
    print('PATCH: Normalize legacy overlapping/touching shifts before Dienstplan render')
else:
    print('ALREADY: Shifts coalesce/reconfirm render invariant')

saveshift_pattern = r"\n    public function saveshift\(\)\n    \{.*?\n    \}\n\n    public function removeshift\(\)"

saveshift_replacement = r'''
    public function saveshift()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $input = request()->all();
        $validator = Validator::make($input, [
            'id' => ['nullable', 'integer', 'min:1'],
            'shift_date' => ['required', 'date'],
            'label' => ['required', 'string', 'max:64'],
            'starts_at' => ['nullable', 'date_format:H:i'],
            'ends_at' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'person_ids' => ['nullable', 'array'],
            'person_ids.*' => ['integer', 'min:1'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();
        $locationId = $this->locationId();
        $personIds = array_values(array_unique(array_map('intval', (array)($clean['person_ids'] ?? []))));
        sort($personIds);
        $message = 'Shift saved.';

        // PMD_SHIFTS_EXTEND_EXISTING_V1
        // One team cannot have stacked records for continuous coverage. Save the
        // requested record first, then collapse identical-team overlap/touching
        // records into the earliest continuous shift. Any schedule change resets
        // confirmation/attendance to planned so the team must be confirmed again.
        DB::transaction(function () use ($clean, $locationId, $personIds, &$message) {
            $id = (int)($clean['id'] ?? 0);
            $shiftDate = Carbon::parse($clean['shift_date'])->toDateString();
            $values = [
                'location_id' => $locationId,
                'shift_date' => $shiftDate,
                'label' => trim((string)$clean['label']) ?: 'Shift',
                'starts_at' => !empty($clean['starts_at']) ? $clean['starts_at'].':00' : null,
                'ends_at' => !empty($clean['ends_at']) ? $clean['ends_at'].':00' : null,
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {
                $values['notes'] = trim((string)($clean['notes'] ?? '')) ?: null;
            }
            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
                $values['break_minutes'] = max(0, min(240, (int)($clean['break_minutes'] ?? 30)));
            }

            if ($id > 0) {
                $exists = DB::table('pmd_operational_shifts')
                    ->where('id', $id)
                    ->where('location_id', $locationId)
                    ->exists();
                if (!$exists) abort(404);
                DB::table('pmd_operational_shifts')->where('id', $id)->update($values);
                $shiftId = $id;
                DB::table('pmd_operational_shift_people')->where('shift_id', $shiftId)->delete();
            } else {
                $values['created_at'] = now();
                $shiftId = (int)DB::table('pmd_operational_shifts')->insertGetId($values);
            }

            if ($personIds) {
                $people = DB::table('pmd_operational_people')
                    ->where('location_id', $locationId)
                    ->where('is_active', 1)
                    ->whereIn('id', $personIds)
                    ->get()->keyBy('id');
                $rows = [];
                foreach ($personIds as $personId) {
                    $person = $people->get($personId);
                    if (!$person) continue;
                    $rows[] = [
                        'shift_id' => $shiftId,
                        'person_id' => (int)$person->id,
                        'display_name_snapshot' => (string)$person->display_name,
                        'department_snapshot' => (string)($person->department ?: 'other'),
                        'job_role_snapshot' => trim((string)($person->job_role ?? '')) ?: null,
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if ($rows) DB::table('pmd_operational_shift_people')->insert($rows);
            }

            $merged = $this->coalesceShiftRange(
                $locationId,
                Carbon::parse($shiftDate)->startOfDay(),
                Carbon::parse($shiftDate)->endOfDay()
            );
            if ($merged > 0) {
                $message = 'Existing shift extended. Team confirmation is required again.';
            }
        });

        return $this->redirectBackToSchedule($message);
    }

    private function coalesceShiftRange(int $locationId, Carbon $from, Carbon $to): int
    {
        if ($locationId < 1) return 0;

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereBetween('shift_date', [$from->toDateString(), $to->toDateString()])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->whereNotNull('starts_at')
            ->whereNotNull('ends_at')
            ->orderBy('shift_date')
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get();

        if ($shifts->count() < 2) return 0;

        $shiftIds = $shifts->pluck('id')->map('intval')->all();
        $assignments = DB::table('pmd_operational_shift_people')
            ->whereIn('shift_id', $shiftIds)
            ->whereNotNull('person_id')
            ->orderBy('person_id')
            ->get()
            ->groupBy('shift_id');

        $buckets = [];
        foreach ($shifts as $shift) {
            $personIds = collect($assignments->get($shift->id) ?: [])
                ->pluck('person_id')
                ->map('intval')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();
            if (!$personIds) continue;

            $window = $this->shiftWindowMinutes($shift->starts_at, $shift->ends_at);
            if (!$window) continue;

            $key = Carbon::parse($shift->shift_date)->toDateString().'|'.implode(',', $personIds);
            $buckets[$key][] = [
                'shift' => $shift,
                'start' => $window['start'],
                'end' => $window['end'],
            ];
        }

        $mergedCount = 0;
        foreach ($buckets as $items) {
            usort($items, function ($left, $right) {
                if ($left['start'] !== $right['start']) return $left['start'] <=> $right['start'];
                return (int)$left['shift']->id <=> (int)$right['shift']->id;
            });

            $cluster = [];
            $clusterStart = null;
            $clusterEnd = null;

            foreach ($items as $item) {
                if (!$cluster || $item['start'] <= $clusterEnd) {
                    $cluster[] = $item;
                    $clusterStart = $clusterStart === null ? $item['start'] : min($clusterStart, $item['start']);
                    $clusterEnd = $clusterEnd === null ? $item['end'] : max($clusterEnd, $item['end']);
                    continue;
                }

                $mergedCount += $this->collapseShiftCluster($cluster, (int)$clusterStart, (int)$clusterEnd);
                $cluster = [$item];
                $clusterStart = $item['start'];
                $clusterEnd = $item['end'];
            }

            if ($cluster) {
                $mergedCount += $this->collapseShiftCluster($cluster, (int)$clusterStart, (int)$clusterEnd);
            }
        }

        return $mergedCount;
    }

    private function collapseShiftCluster(array $cluster, int $start, int $end): int
    {
        if (count($cluster) < 2) return 0;

        $canonical = $cluster[0]['shift'];
        $canonicalId = (int)$canonical->id;
        $redundantIds = array_values(array_filter(array_map(
            fn ($item) => (int)$item['shift']->id,
            array_slice($cluster, 1)
        )));

        DB::table('pmd_operational_shifts')
            ->where('id', $canonicalId)
            ->update([
                'starts_at' => $this->shiftMinuteToDbTime($start),
                'ends_at' => $this->shiftMinuteToDbTime($end),
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'updated_at' => now(),
            ]);

        DB::table('pmd_operational_shift_people')
            ->where('shift_id', $canonicalId)
            ->update([
                'attendance_status' => 'planned',
                'is_replacement' => 0,
                'updated_at' => now(),
            ]);

        if ($redundantIds) {
            DB::table('pmd_operational_shifts')
                ->whereIn('id', $redundantIds)
                ->update([
                    'status' => 'cancelled',
                    'quick_counts_json' => null,
                    'confirmed_at' => null,
                    'confirmed_by_staff_id' => null,
                    'updated_at' => now(),
                ]);
        }

        return count($redundantIds);
    }

    private function shiftWindowMinutes($startsAt, $endsAt): ?array
    {
        $start = $this->minutesOfDay($startsAt);
        $end = $this->minutesOfDay($endsAt);
        if ($start === null || $end === null) return null;
        if ($end <= $start) $end += 1440;
        return ['start' => $start, 'end' => $end];
    }

    private function shiftMinuteToDbTime(int $minutes): string
    {
        $minutes %= 1440;
        if ($minutes < 0) $minutes += 1440;
        return sprintf('%02d:%02d:00', intdiv($minutes, 60), $minutes % 60);
    }

    public function removeshift()'''

controller, save_count = re.subn(
    saveshift_pattern,
    lambda _match: saveshift_replacement,
    controller,
    count=1,
    flags=re.S,
)
if save_count != 1:
    raise SystemExit(f'ERROR before write: saveshift replacement matches={save_count}')
print('PATCH: Extend existing identical-team shifts instead of stacking overlaps')
print('PATCH: Reset confirmation/attendance whenever continuous shift geometry changes')

# Remove the old exact-duplicate marker from comments/logic by requiring the
# replacement method to be the sole schedule invariant now.
if 'PMD_SHIFTS_EXTEND_EXISTING_V1' not in controller or 'private function coalesceShiftRange' not in controller:
    raise SystemExit('ERROR before write: new shift coalescing authority missing')


# -------------------------------------------------------------------------
# 3. Exact platform header/toolbar button language.
# -------------------------------------------------------------------------
if 'PMD_SHIFTS_PLATFORM_CONTROLS_V1' not in css:
    css += r'''

/* PMD_SHIFTS_PLATFORM_CONTROLS_V1
 * Match the current Owner/Dashboard header control language exactly.
 * Shifts owns no green filled header/toolbar buttons.
 */
body.pmd-shifts-page #pmd-shifts .pmd-shifts__header-actions{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:10px!important;
  overflow:visible!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__header-icon,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__header-icon.is-primary,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__notification-slot #notifDropdown{
  position:relative!important;
  display:inline-grid!important;
  place-items:center!important;
  box-sizing:border-box!important;
  flex:0 0 46px!important;
  width:46px!important;
  min-width:46px!important;
  max-width:46px!important;
  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;
  margin:0!important;
  padding:0!important;
  border:1px solid #cfe0ec!important;
  border-radius:14px!important;
  background:#fff!important;
  color:#173752!important;
  box-shadow:0 3px 10px rgba(23,55,82,.05)!important;
  line-height:1!important;
  text-decoration:none!important;
  opacity:1!important;
  visibility:visible!important;
  transform:none!important;
  transition:none!important;
  animation:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__header-icon:hover,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__header-icon.is-primary:hover,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__notification-slot #notifDropdown:hover,
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-member-button:hover{
  border-color:#bdd0df!important;
  background:#f4f8fb!important;
  color:#173752!important;
  box-shadow:0 3px 10px rgba(23,55,82,.05)!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__header-icon svg,
body.pmd-shifts-page #pmd-shifts .pmd-shifts__notification-slot #bell-icon svg{
  display:block!important;
  width:21px!important;
  min-width:21px!important;
  max-width:21px!important;
  height:21px!important;
  min-height:21px!important;
  max-height:21px!important;
  fill:none!important;
  stroke:currentColor!important;
  stroke-width:2!important;
  stroke-linecap:round!important;
  stroke-linejoin:round!important;
  pointer-events:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__notification-slot #notifDropdown::after{
  display:none!important;
  content:none!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts__notification-slot #notification-count{
  position:absolute!important;
  top:-7px!important;
  right:-8px!important;
  left:auto!important;
  bottom:auto!important;
  z-index:8!important;
  min-width:18px!important;
  height:18px!important;
  margin:0!important;
  padding:0 4px!important;
  border:2px solid #fff!important;
  border-radius:999px!important;
  background:#d83a31!important;
  color:#fff!important;
  font-size:9px!important;
  font-weight:800!important;
  line-height:14px!important;
  text-align:center!important;
  white-space:nowrap!important;
}
body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-member-button{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:7px!important;
  min-width:0!important;
  width:auto!important;
  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;
  margin:0!important;
  padding:0 14px!important;
  border:1px solid #cfe0ec!important;
  border-radius:14px!important;
  background:#fff!important;
  color:#173752!important;
  box-shadow:0 3px 10px rgba(23,55,82,.05)!important;
  font:inherit!important;
  font-size:13px!important;
  font-weight:750!important;
  line-height:1!important;
  text-decoration:none!important;
  cursor:pointer!important;
  transform:none!important;
  transition:none!important;
  animation:none!important;
}
'''
    print('PATCH: Match Shifts header/+Member controls to Owner Dashboard white controls')
else:
    print('ALREADY: platform Shifts control styling')


# Fresh immutable CSS delivery artifact so Safari/proxies cannot keep the green
# V5 control styling. JS is unchanged in V7.
css_hash = hashlib.sha256(css.encode('utf-8')).hexdigest()[:12]
css_name = f'pmd-shifts-canonical-{css_hash}.css'
css_target = CSS.parent / css_name
css_pattern = r"\$this->addCss\('css/pmd-shifts-canonical-[0-9a-f]{12}\.css'\);"
css_registration = "$this->addCss('css/" + css_name + "');"
controller, css_count = re.subn(css_pattern, lambda _m: css_registration, controller, count=1)
if css_count != 1:
    raise SystemExit(f'ERROR before write: fingerprinted CSS registration matches={css_count}')

for token, text, label in [
    ('PMD_SHIFTS_COALESCE_RECONFIRM_V1', controller, 'controller'),
    ('PMD_SHIFTS_EXTEND_EXISTING_V1', controller, 'controller'),
    ('PMD_SHIFTS_PLATFORM_CONTROLS_V1', css, 'css'),
    ('PMD_OPERATIONAL_ROSTER_RECONCILE_V2', roster, 'roster'),
    (css_name, controller, 'controller'),
]:
    if token not in text:
        raise SystemExit(f'ERROR before write: {label} missing {token}')

BACKUP.mkdir(parents=True, exist_ok=False)
for source in [CONTROLLER, CSS, ROSTER]:
    dest = BACKUP / source.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
print(f'BACKUP: {BACKUP}')

try:
    CONTROLLER.write_text(controller, encoding='utf-8')
    CSS.write_text(css, encoding='utf-8')
    ROSTER.write_text(roster, encoding='utf-8')

    existed = css_target.exists()
    css_target.write_text(css, encoding='utf-8')
    stat = CSS.stat()
    os.chown(css_target, stat.st_uid, stat.st_gid)
    os.chmod(css_target, stat.st_mode & 0o777)
    if not existed:
        created.append(css_target)

    for source in [CONTROLLER, ROSTER]:
        result = subprocess.run(
            ['php', '-l', str(source)],
            cwd=str(ROOT),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError(f'PHP validation failed: {source}')

    if hashlib.sha256(css_target.read_bytes()).hexdigest()[:12] != css_hash:
        raise RuntimeError('fingerprinted CSS content hash mismatch')

except Exception:
    print('ERROR: V7 validation failed; restoring V6 files', file=sys.stderr)
    CONTROLLER.write_text(original_controller, encoding='utf-8')
    CSS.write_text(original_css, encoding='utf-8')
    ROSTER.write_text(original_roster, encoding='utf-8')
    for target in created:
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    raise

print('OK: Shifts V7 role/merge/platform-control patch applied')
print('ASSET_CSS: ' + css_name)
print('OK: safe Site Access middleware V2 was not modified')
print('NOTE: no migration and no auth change in this patch')
