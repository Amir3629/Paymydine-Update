import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const shifts = read('app/admin/controllers/Shifts.php');
const rota = read(
  'app/admin/views/pmdshifts/_server_rota_v13.blade.php'
);
const attendance = read(
  'app/admin/assets/js/pmd-shifts-live-attendance-v3.js'
);
const dayNav = read(
  'app/admin/assets/js/pmd-shifts-inpage-day-nav-v18e.js'
);
const stability = read(
  'app/admin/assets/css/pmd-shifts-refresh-stability-v17i.css'
);

assert.ok(
  shifts.includes('PMD_SHIFT_FRAME_GEOMETRY_READONLY_V135'),
  'Shifts V135 runtime registration marker missing'
);
assert.ok(
  shifts.includes("pmd-shifts-live-attendance-v3.js"),
  'Shifts must load attendance v3'
);
assert.equal(
  shifts.includes("pmd-shifts-live-attendance-v2.js"),
  false,
  'Shifts must not load the old attendance v2 runtime'
);

assert.ok(
  rota.includes('PMD_SHIFT_FRAME_FIRST_PAINT_V135'),
  'server critical frame marker missing'
);
assert.ok(
  rota.includes('id="pmd-shifts-frame-first-paint-v135"'),
  'server critical frame style block missing'
);
assert.ok(
  rota.includes('grid-template-columns:220px minmax(900px,1fr)!important'),
  'server row geometry lock missing'
);
assert.ok(
  rota.includes('min-height:72px!important'),
  'server row/track height lock missing'
);
assert.ok(
  rota.includes('inset:9px 0!important'),
  'server shift-layer inset lock missing'
);
assert.ok(
  rota.includes('grid-template-rows:min-content min-content!important'),
  'server button content geometry lock missing'
);
assert.ok(
  rota.includes('border-left:4px solid var(--pmd-role-accent)!important'),
  'server button frame lock missing'
);
assert.ok(
  rota.includes('font-family:"PMDShiftsRobotoStable"'),
  'server button stable font authority missing'
);
assert.ok(
  rota.includes(
    'style="left:{{ number_format($left,4'
  ) &&
    rota.includes(
      'width:{{ number_format($width,4'
    ),
  'server inline horizontal bar authority missing'
);

assert.ok(
  attendance.includes('PMD_SHIFT_FRAME_GEOMETRY_READONLY_V135'),
  'attendance v3 geometry-readonly marker missing'
);
for (const forbidden of [
  "style.setProperty('left'",
  "style.setProperty('right'",
  "style.setProperty('width'",
  'function repairGeometry',
  'function shiftTimes',
  'function minutes(clock)'
]) {
  assert.equal(
    attendance.includes(forbidden),
    false,
    'attendance runtime must not own shift geometry: ' + forbidden
  );
}
assert.ok(
  attendance.includes('paintAttendance(payload)'),
  'attendance state refresh must remain active'
);
assert.ok(
  attendance.includes(
    'currentState === nextState && currentLabel === nextLabel'
  ),
  'attendance identical-state DOM write guard must remain'
);

assert.ok(
  dayNav.includes('PMD_SHIFTS_SERVER_FIRST_BOOT_SKIP_V13'),
  'server-first normal refresh guard missing'
);
assert.ok(
  dayNav.includes(
    "serverInitial.getAttribute('data-date')"
  ),
  'day-nav must verify the server-rendered selected day'
);
assert.ok(
  dayNav.includes('renderHourView(boot.selected_day)'),
  'day-nav fallback renderer must remain for non-server initial states'
);

assert.ok(
  stability.includes('PMD_SHIFTS_REFRESH_STABILITY_V17I'),
  'existing refresh stability authority must remain'
);
assert.ok(
  stability.includes('transition:none!important'),
  'late transitions must remain disabled'
);

new Function(attendance);
new Function(dayNav);

console.log(
  'PMD V135 Shifts shift-frame first-paint stability: PASS'
);
