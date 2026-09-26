import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu = fs.readFileSync('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php','utf8');
const i18n = fs.readFileSync('app/admin/views/_partials/pmd_admin_i18n.blade.php','utf8');
const shifts = fs.readFileSync('app/admin/controllers/Shifts.php','utf8');
const info = fs.readFileSync('app/admin/assets/js/pmd-kpi-info-v2.js','utf8');

assert.match(menu,/PMD_SM2_LANGUAGE_NATIVE_ITEM_PARITY_V157/);
assert.match(menu,/data-pmd-sm2-language-inline/);
assert.doesNotMatch(menu,/class="pmd-sm2__item pmd-sm2__language-item"/);
assert.doesNotMatch(menu,/svg class="pmd-sm2__language-icon"/);

assert.match(i18n,/pmd-kpi-info-v2\.js/);
assert.match(shifts,/PMD_KPI_INFO_DYNAMIC_SELECTION_V157/);
assert.match(shifts,/addJs\('js\/pmd-kpi-info-v2\.js'\)/);

assert.match(info,/PMD_KPI_CURRENT_IDENTITY_OBSERVER_V157/);
assert.match(info,/new MutationObserver/);
assert.match(info,/pmd-shifts-kpi-data/);
assert.match(info,/pmd-dashboard-lab-kpi-data/);
assert.match(info,/syncCard\(card, \{close: false\}\)/);
assert.match(info,/window\.PMDKpiInfoV2 = api/);

console.log('PMD V157 sidebar language parity + dynamic KPI info: PASS');
