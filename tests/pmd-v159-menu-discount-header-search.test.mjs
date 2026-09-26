import fs from 'node:fs';
import assert from 'node:assert/strict';

const coupon = fs.readFileSync('app/admin/views/pmdcoupons/index.blade.php','utf8');
const menu = fs.readFileSync('app/admin/views/pmdmenus/index.blade.php','utf8');
const couponController = fs.readFileSync('app/admin/controllers/Coupons.php','utf8');
const menuController = fs.readFileSync('app/admin/controllers/Pmdmenus.php','utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-header-expand-search-v159.css','utf8');
const js = fs.readFileSync('app/admin/assets/js/pmd-header-expand-search-v159.js','utf8');

assert.match(coupon,/PMD_HEADER_EXPAND_SEARCH_V159: Discounts/);
assert.match(coupon,/data-pmd-header-search-input[\s\S]*data-pmd-coupon-search/);
assert.doesNotMatch(coupon,/class="pmd-coupon-manager__search"/);

assert.match(menu,/PMD_HEADER_EXPAND_SEARCH_V159: Menu/);
assert.match(menu,/data-pmd-header-search-input[\s\S]*data-pmd-menu-search/);
assert.doesNotMatch(menu,/class="pmd-menu-manager__search"/);

assert.match(couponController,/PMD_HEADER_EXPAND_SEARCH_ASSETS_V159/);
assert.match(menuController,/PMD_HEADER_EXPAND_SEARCH_ASSETS_V159/);
assert.match(couponController,/pmd-header-expand-search-v159\.css/);
assert.match(menuController,/pmd-header-expand-search-v159\.js/);

assert.match(css,/PMD_HEADER_EXPAND_SEARCH_V159/);
assert.match(css,/\.pmd-header-expand-search\.is-open/);
assert.match(css,/transition:[\s\S]*width 220ms/);
assert.match(css,/justify-content: flex-end !important/);

assert.match(js,/PMD_HEADER_EXPAND_SEARCH_V159/);
assert.match(js,/data-pmd-header-search-toggle/);
assert.match(js,/preventScroll: true/);
assert.match(js,/MutationObserver/);

console.log('PMD V159 Menu + Discounts expandable header search: PASS');
