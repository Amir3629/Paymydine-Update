import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu = fs.readFileSync('app/admin/assets/css/pmd-menu-manager-v129.css', 'utf8');
const discount = fs.readFileSync('app/admin/assets/css/pmd-coupon-manager-v13.css', 'utf8');

assert.match(menu, /PMD_MENU_KPI_COLOR_SEPARATION_V147/);
assert.match(menu, /data-pmd-menu-kpi="categories"/);
assert.match(menu, /background: #eef6ff !important/);
assert.match(menu, /color: #285f91 !important/);

assert.match(discount, /PMD_DISCOUNT_KPI_COLOR_SEPARATION_V147/);
assert.match(discount, /nth-child\(2\)/);
assert.match(discount, /background: #f7f1fd !important/);
assert.match(discount, /color: #7a43a7 !important/);

console.log('PMD V147 Menu + Discount KPI color separation: PASS');
