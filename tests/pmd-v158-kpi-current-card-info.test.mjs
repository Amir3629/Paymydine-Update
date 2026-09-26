import fs from 'node:fs';
import assert from 'node:assert/strict';

const info = fs.readFileSync('app/admin/assets/js/pmd-kpi-info-v3.js','utf8');
const i18n = fs.readFileSync('app/admin/views/_partials/pmd_admin_i18n.blade.php','utf8');
const shifts = fs.readFileSync('app/admin/controllers/Shifts.php','utf8');
const view = fs.readFileSync('app/admin/views/pmdshifts/index.blade.php','utf8');

assert.match(info,/PMD_KPI_VISIBLE_CARD_IDENTITY_V158/);
assert.match(info,/PMD_KPI_CLICK_REVERIFY_V158/);
assert.match(info,/visibleTitle\(card\)/);
assert.match(info,/Object\.keys\(cards \|\| \{\}\)/);
assert.match(info,/data-pmd-shifts-kpi-key/);
assert.match(info,/version: '3\.0\.0-current-card-v158'/);

assert.match(i18n,/pmd-kpi-info-v3\.js/);
assert.match(shifts,/PMD_KPI_INFO_CURRENT_CARD_AUTHORITY_V158/);
assert.match(shifts,/addJs\('js\/pmd-kpi-info-v3\.js'\)/);

// Exact regression: Month shifts must own its own explanation.
assert.match(
  view,
  /'month_shifts'[\s\S]*?'info' => 'Number of planned shifts in the current month\.'/m
);
assert.match(
  view,
  /'present_now'[\s\S]*?'info' => 'How many scheduled team members are checked in right now\.'/m
);

console.log('PMD V158 current-card KPI info authority: PASS');
