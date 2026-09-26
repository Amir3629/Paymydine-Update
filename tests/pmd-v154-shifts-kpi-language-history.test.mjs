import fs from 'node:fs';
import assert from 'node:assert/strict';

const shifts = fs.readFileSync('app/admin/controllers/Shifts.php','utf8');
const view = fs.readFileSync('app/admin/views/pmdshifts/index.blade.php','utf8');
const shiftsJs = fs.readFileSync('app/admin/assets/js/pmd-shifts-inpage-day-nav-v18e.js','utf8');
const kpiInfo = fs.readFileSync('app/admin/assets/js/pmd-kpi-info-v1.js','utf8');
const side = fs.readFileSync('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php','utf8');
const history = fs.readFileSync('app/admin/controllers/History.php','utf8');
const historyCfg = fs.readFileSync('app/admin/models/config/history_model.php','utf8');

assert.match(shifts,/PMD_SHIFTS_KPI_CALENDAR_INDEPENDENT_V154/);
assert.match(shifts,/month_name' => \$kpiMonthStart->format\('F'\)/);
assert.match(shifts,/PmdShiftAttendanceSnapshotV134::class[\s\S]*?\$kpiToday/);

assert.match(view,/PMD_SHIFTS_KPI_INFO_V154/);
assert.match(view,/data-pmd-kpi-info-button="1"/);
assert.match(view,/data-pmd-kpi-info-copy=/);
assert.match(view,/How many scheduled team members are checked in right now/);
assert.match(shiftsJs,/data-pmd-kpi-info-copy/);
assert.match(kpiInfo,/PMD_KPI_PAGE_COPY_V154/);

assert.match(side,/PMD_SM2_LANGUAGE_GLOBE_ICON_V154/);
assert.doesNotMatch(side,/class="pmd-sm2__language-code"/);

assert.match(history,/PMD_HISTORY_ROLE_ACCESS_V154/);
assert.match(history,/PmdDefaultStaffRoleService::OWNER/);
assert.match(history,/PmdDefaultStaffRoleService::MANAGER/);
assert.doesNotMatch(history,/protected \$requiredPermissions = 'Admin\.History'/);
assert.doesNotMatch(historyCfg,/permissions' => 'Admin\.History'/);

console.log('PMD V154 Shifts KPI + language icon + History access: PASS');
