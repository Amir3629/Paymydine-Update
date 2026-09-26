import fs from 'node:fs';
import assert from 'node:assert/strict';

const shifts=fs.readFileSync('app/admin/controllers/Shifts.php','utf8');
const css=fs.readFileSync('app/admin/assets/css/pmd-kpi-info-v1.css','utf8');
const js=fs.readFileSync('app/admin/assets/js/pmd-kpi-info-v1.js','utf8');
const history=fs.readFileSync('app/admin/controllers/History.php','utf8');

assert.match(shifts,/PMD_SHIFTS_KPI_INFO_ASSET_PARITY_V155/);
assert.match(shifts,/addCss\('css\/pmd-kpi-info-v1\.css'\)/);
assert.match(shifts,/addJs\('js\/pmd-kpi-info-v1\.js'\)/);
assert.match(css,/PMD_SHIFTS_KPI_INFO_PARITY_V155/);
assert.match(js,/data-pmd-shifts-kpi-menu/);
assert.match(js,/data-pmd-shifts-kpi-option/);
assert.match(history,/PMD_HISTORY_AUTH_LIFECYCLE_V155/);
assert.doesNotMatch(history,/parent::__construct\(\);\s*\$this->pmdAssertHistoryAccess\(\)/);
assert.match(history,/public function index\(\)[\s\S]*?\$this->pmdAssertHistoryAccess\(\)/);
assert.match(history,/public function index_onDelete\(\)[\s\S]*?\$this->pmdAssertHistoryAccess\(\)/);
console.log('PMD V155 KPI parity + History lifecycle: PASS');
