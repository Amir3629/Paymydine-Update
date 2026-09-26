import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu = fs.readFileSync('app/admin/views/pmdmenus/index.blade.php','utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-header-expand-search-v160.css','utf8');
const accountant = fs.readFileSync('app/admin/controllers/Accountantlab.php','utf8');

assert.match(menu,/PMD_MENU_CATEGORY_SCROLL_FIXED_FILTERS_V161/);
assert.match(menu,/pmd-menu-manager__category-rail-shell/);
assert.match(menu,/pmd-menu-manager__categories--scroll/);
assert.match(menu,/pmd-menu-manager__category-fixed-actions/);
assert.match(menu,/data-pmd-food-categories/);
assert.match(menu,/data-pmd-stock-filter="all"/);

assert.match(css,/PMD_MENU_CATEGORY_SCROLL_FIXED_FILTERS_V161/);
assert.match(css,/\.pmd-menu-manager__categories--scroll[\s\S]*overflow-x: auto !important/);
assert.match(css,/\.pmd-menu-manager__category-fixed-actions[\s\S]*flex: 0 0 auto !important/);

assert.match(accountant,/PMD_ACCOUNTANT_EXTRA_CHOOSER_KPIS_V161/);
assert.match(accountant,/'tips_month' => \[/);
assert.match(accountant,/'tipped_orders' => \[/);
assert.match(accountant,/\$accountantOrder\[\] = \$extraKey/);
assert.match(accountant,/PMD_ACCOUNTANT_TOP_KPI_SURFACE_RESTORE_V3_5_1/);

console.log('PMD V161 Menu category rail + Accountant extra KPIs: PASS');
