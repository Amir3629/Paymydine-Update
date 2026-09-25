import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const shifts = read('app/admin/controllers/Shifts.php');
const liveController = read(
  'app/Http/Controllers/PmdShiftAttendanceLiveController.php'
);
const snapshot = read(
  'app/admin/Services/PmdShiftAttendanceSnapshotV134.php'
);
const view = read('app/admin/views/pmdshifts/index.blade.php');
const rota = read(
  'app/admin/views/pmdshifts/_server_rota_v13.blade.php'
);
const js = read(
  'app/admin/assets/js/pmd-shifts-live-attendance-v2.js'
);
const css = read(
  'app/admin/assets/css/pmd-shifts-live-first-paint-v134.css'
);

assert.ok(
  snapshot.includes('PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134'),
  'shared V134 attendance snapshot marker missing'
);
assert.ok(
  snapshot.includes("DB::table('staff_attendance')"),
  'staff_attendance must remain the real-presence authority'
);
assert.ok(
  snapshot.includes("'present_now' => $presentNow") &&
    snapshot.includes("'missing_now' => $missingNow"),
  'shared snapshot must own live KPI values'
);

assert.ok(
  shifts.includes('PmdShiftAttendanceSnapshotV134'),
  'Shifts first paint must use shared attendance authority'
);
assert.ok(
  shifts.includes("'live_attendance' => $liveAttendance"),
  'Shifts view payload must include live attendance'
);
assert.ok(
  shifts.includes("array_key_exists('present_now', $liveAttendance)") &&
    shifts.includes("array_key_exists('missing_now', $liveAttendance)"),
  'Shifts first-paint KPIs must come from live attendance'
);
assert.ok(
  shifts.includes("pmd-shifts-live-first-paint-v134.css"),
  'Shifts must load static live-attendance first-paint CSS'
);
assert.ok(
  shifts.includes("pmd-shifts-live-attendance-v2.js"),
  'Shifts must explicitly register live attendance runtime'
);

assert.ok(
  liveController.includes(
    'PmdShiftAttendanceSnapshotV134::class'
  ),
  'live endpoint must use the same shared snapshot'
);
assert.equal(
  liveController.includes("DB::table('staff_attendance')"),
  false,
  'live endpoint must not duplicate attendance computation'
);

assert.ok(
  view.includes("'live_attendance' => $liveAttendance"),
  'embedded Shifts bootstrap must carry attendance snapshot'
);
assert.ok(
  view.includes("'description' => 'checked in right now'"),
  'Present now label must describe real attendance'
);
assert.ok(
  view.includes(
    "'description' => 'scheduled now · not checked in'"
  ),
  'Missing now label must describe real attendance'
);

assert.ok(
  rota.includes('PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134'),
  'server rota first-paint attendance marker missing'
);
assert.ok(
  rota.includes('data-pmd-shifts-live-state-code'),
  'server rota must render attendance badge identity'
);

assert.ok(
  css.includes('PMD_SHIFTS_LIVE_FIRST_PAINT_V134'),
  'static attendance badge CSS marker missing'
);
assert.ok(
  css.includes('.pmd-shifts-live-state.is-not_started'),
  'not-started badge must have first-paint styling'
);

assert.ok(
  js.includes('PMD_SHIFT_ATTENDANCE_IDEMPOTENT_V134'),
  'idempotent hydration marker missing'
);
assert.ok(
  js.includes('bootAttendanceV134'),
  'live runtime must adopt embedded attendance for day navigation'
);
assert.ok(
  js.includes(
    'currentState === nextState && currentLabel === nextLabel'
  ),
  'live runtime must skip identical badge DOM writes'
);
assert.equal(
  js.includes('data-pmd-shifts-live-style'),
  false,
  'runtime must not inject attendance badge CSS after first paint'
);

new Function(js);

console.log(
  'PMD V134 Shifts attendance first-paint stability: PASS'
);
