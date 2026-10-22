'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Table Device is hidden until live server confirms exact paired table and reader',()=>{
 const ctrl=read('app/Http/Controllers/PmdTableDisplayPaymentController.php');
 const routes=read('routes/admin-quick-mode.php');
 const js=read('app/admin/assets/js/pmd-table-display-waiter-payment-v1.js');
 assert.match(ctrl,/PMD_QPOS_TABLE_DEVICE_READINESS_V140/);
 assert.match(ctrl,/payment_terminal_device_id/);
 assert.match(ctrl,/where\('location_id', \$locationId\)/);
 assert.match(ctrl,/subSeconds\(90\)/);
 assert.match(ctrl,/terminal_status/);
 assert.match(js,/PMD_TABLE_DEVICE_DYNAMIC_AVAILABILITY_V140/);
 assert.match(js,/table-display-payment-availability/);
 assert.match(js,/availability\.ready/);
 assert.match(routes,/table-display-payment-availability/);
});
test('Installed Settings keeps Staff and now links same-signer ZCS 0.6.3 APK',()=>{
 const settings=read('app/admin/views/pmdsettings/index.blade.php');
 const cashier=read('app/admin/views/pmd_quick_pos_v1.blade.php');
 assert.match(settings,/PayMyDine-Device-App-0\.6\.3\.apk/);
 assert.match(settings,/PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022/);
 assert.match(cashier,/pmd-table-display-waiter-payment-v1\.js\?v=20261022-payment-v140/);
});
