import fs from 'node:fs';
import assert from 'node:assert/strict';

const coupon = fs.readFileSync('app/admin/views/pmdcoupons/index.blade.php','utf8');
const menu = fs.readFileSync('app/admin/views/pmdmenus/index.blade.php','utf8');
const couponController = fs.readFileSync('app/admin/controllers/Coupons.php','utf8');
const menuController = fs.readFileSync('app/admin/controllers/Pmdmenus.php','utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-header-expand-search-v160.css','utf8');
const js = fs.readFileSync('app/admin/assets/js/pmd-header-expand-search-v160.js','utf8');

assert.match(coupon,/PMD_HEADER_SINGLE_FRAME_SEARCH_V160: Discounts/);
assert.match(coupon,/PMD_DISCOUNT_FILTERS_SINGLE_TOOLBAR_V160/);
assert.match(coupon,/pmd-coupon-manager__types--toolbar/);
assert.doesNotMatch(coupon,/<div class="pmd-coupon-manager__types" aria-label=/);

assert.match(menu,/PMD_HEADER_SINGLE_FRAME_SEARCH_V160: Menu/);
assert.match(menu,/PMD_MENU_SORT_HEADER_ACTION_V160/);
assert.match(menu,/pmd-menu-manager__sort-toggle--header/);
assert.match(menu,/PMD_MENU_STOCK_FILTERS_IN_CATEGORY_RAIL_V160/);
assert.match(menu,/pmd-menu-manager__stock-filters--categories/);
assert.doesNotMatch(menu,/class="pmd-menu-manager__toolbar" data-pmd-food-toolbar/);

assert.match(css,/PMD_HEADER_SINGLE_FRAME_SEARCH_V160/);
assert.match(css,/border: 1px solid #cfe0ec !important/);
assert.match(css,/\.pmd-header-expand-search__toggle[\s\S]*?border: 0 !important/);
assert.match(css,/pmd-coupon-manager__types--toolbar/);
assert.match(css,/pmd-menu-manager__sort-toggle--header/);
assert.match(css,/pmd-menu-manager__stock-filters--categories/);

assert.match(js,/PMD_HEADER_SINGLE_FRAME_SEARCH_V160/);
assert.match(js,/PMDHeaderExpandSearchV160/);

assert.match(couponController,/pmd-header-expand-search-v160\.css/);
assert.match(menuController,/pmd-header-expand-search-v160\.js/);

console.log('PMD V160 single-frame search + consolidated filters: PASS');
