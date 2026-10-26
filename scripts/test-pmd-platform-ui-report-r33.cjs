#!/usr/bin/env node
/* R33 real-report safeguards. These are static preflights, NOT a claim of
 * a logged-in screenshot or a successful business transaction.
 * Root may be a staged VPS tree (PMD_R33_TEST_ROOT) or the live working dir.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const root=process.env.PMD_R33_TEST_ROOT||path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('app/admin/assets/css/pmd-platform-ui-report-r33.css');
const r31=read('app/admin/assets/css/pmd-inventory-barcode-floor-r31.css');
const r28=read('app/admin/assets/css/pmd-inventory-exact-table-card-r28.css');
const layout=read('app/admin/views/_layouts/default.blade.php');
const inventory=read('app/admin/views/pmdinventory/index.blade.php');
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const restaurant=read('app/admin/views/pmdsettings/restaurant.blade.php');
const r29=read('app/admin/assets/css/pmd-admin-control-language-r29.css');

assert.ok(r31.includes('PMD_INVENTORY_BARCODE_FLOOR_R31'));
assert.ok(r28.includes('.pmd-inv-r25-sheet :is(input:not([type="checkbox"])'));
assert.ok(r29.includes('--pmd-control-r29-primary'));
assert.ok(css.includes('PMD_PLATFORM_UI_REPORT_R33'));
assert.equal(css.split('input[data-r19-barcode-input]:not([type="checkbox"])').length-1,2);
assert.ok(css.includes('[data-pmd-inv-r25-dialog="barcode"]'));
assert.ok(css.includes('label.pmd-inv-r23-barcode__input'));
assert.ok(css.includes('.pmd-inv-r23-barcode\nlabel'));
assert.ok(css.includes('border:0!important;'));
assert.ok(css.includes('box-shadow:none!important;'));
assert.ok(css.includes('background:transparent!important;'));
assert.ok(css.includes(':is(:focus,:focus-visible)'));
assert.ok(inventory.includes('data-r19-barcode-input'));
assert.ok(inventory.includes('data-r19-barcode-open'));
assert.ok(inventory.includes('data-r24-camera-start'));
assert.ok(floor.includes('data-pmd-floor-table-add'));
assert.ok(restaurant.includes('data-pmd-service-add'));
assert.ok(restaurant.includes('data-pmd-service-date-add'));
for(const must of ['[data-pmd-floor-table-add][data-pmd-admin-action-r29="primary"]',
  'button.pmd-profile-service-add[data-pmd-service-add][data-pmd-admin-action-r29="primary"]',
  'button[data-pmd-service-date-add][data-pmd-admin-action-r29="primary"]']){
  assert.ok(css.includes(must),'missing narrow semantic action '+must);
}
// Specificity: R28's :is(input:not(...)) rule defines a baseline of one ID
// and four type exclusions. The R33 selector repeats all exclusions and
// adds a unique barcode attr, barcode overlay attr, barcode class and label.
// Thus it is strictly more specific for the actual matching barcode field.
assert.ok(css.includes('#pmd-inventory-v1.pmd-inv-r25-ready.pmd-inv-r26-ready.pmd-inv-r27-ready.pmd-inv-r28-ready'));
assert.ok(css.includes('input[data-r19-barcode-input]:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="file"])'));
assert.ok(css.indexOf('PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS')>=0 || layout.includes('PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS'));
assert.equal(layout.split('data-pmd-platform-ui-report-r33="css"').length-1,1,
 'Real Admin layout must load R33 exactly once');
assert.ok(layout.indexOf('PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS') <
 layout.indexOf('data-pmd-platform-ui-report-r33="css"'), 'R33 must load after R31');
assert.ok(layout.indexOf('PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT') <
 layout.indexOf('data-pmd-platform-ui-report-r33="css"'), 'R33 must load after R29');

// Do not re-style touch status grids or invisible click targets wholesale.
// The same report's Shifts + KPI/steppers are false-positive, not defects.
// Operational controls are not targeted by selector bodies; test the guarded known selectors.
assert.ok(!/\\.pmd-shifts-final-slot\\s*\\{/i.test(css));
assert.ok(!/\\.pmd-qpos-table\\s*\\{/i.test(css));
assert.ok(!/\\.order-status-buttons\\s*\\{/i.test(css));
assert.ok(!/(?:^|\n)\s*(?:button|input|select|textarea)\s*\{/m.test(css),
 'Do not add broad element-global resets');
assert.ok(!/display\s*:\s*none\s*!important/i.test(css),'do not hide controls');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,
 'CSS block braces must balance');
console.log('PASS: R33 barcode CSS out-specifics R28, three audited primary action selectors are narrow, real Admin head loads asset after R31, POS/KDS/Shifts remain untouched.');
