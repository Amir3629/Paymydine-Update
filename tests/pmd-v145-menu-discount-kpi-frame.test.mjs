import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu = fs.readFileSync('app/admin/assets/css/pmd-menu-manager-v129.css', 'utf8');
const discount = fs.readFileSync('app/admin/assets/css/pmd-coupon-manager-v13.css', 'utf8');
const controller = fs.readFileSync('app/admin/controllers/Coupons.php', 'utf8');

assert.match(menu, /PMD_MENU_KPI_FRAME_V145/);
assert.match(menu, /height: 100px !important/);
assert.match(menu, /min-height: 100px !important/);
assert.match(menu, /max-height: 100px !important/);

assert.match(discount, /PMD_DISCOUNT_KPI_FRAME_V145/);
assert.match(discount, /height: 100px !important/);
assert.match(discount, /min-height: 100px !important/);
assert.match(discount, /max-height: 100px !important/);

assert.match(controller, /PMD_DISCOUNT_KPI_FRAME_CACHE_BUST_V145/);
assert.match(controller, /filemtime/);

console.log('PMD V145 Menu + Discount KPI frame: PASS');
