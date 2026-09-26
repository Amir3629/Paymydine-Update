import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu = fs.readFileSync('app/admin/assets/css/pmd-menu-manager-v129.css', 'utf8');
const discount = fs.readFileSync('app/admin/assets/css/pmd-coupon-manager-v13.css', 'utf8');

for (const css of [menu, discount]) {
  assert.match(css, /font-size: 14px !important/);
  assert.match(css, /font-weight: 850 !important/);
  assert.match(css, /font-size: 30px !important/);
  assert.match(css, /font-weight: 900 !important/);
  assert.match(css, /font-size: 11px !important/);
  assert.match(css, /font-weight: 650 !important/);
  assert.match(css, /font-variant-numeric: tabular-nums !important/);
}

assert.match(menu, /PMD_MENU_KPI_TYPOGRAPHY_V146/);
assert.match(discount, /PMD_DISCOUNT_KPI_TYPOGRAPHY_V146/);
assert.match(discount, /data-pmd-kpi-size="tight"/);

console.log('PMD V146 Menu + Discount KPI typography: PASS');
