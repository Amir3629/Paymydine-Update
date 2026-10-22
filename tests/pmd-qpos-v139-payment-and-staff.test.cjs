'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');

test('effective Cashier card inventory resolves physical terminals', () => {
  const c = read('app/admin/controllers/PmdWaiterPosV1.php');
  const t = read('app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php');
  assert.match(c, /PmdWaiterPosTerminalProvidersConcern::terminalProviders insteadof/);
  assert.match(t, /PMD_QPOS_TERMINAL_INVENTORY_V139_EFFECTIVE_TRAIT/);
  assert.match(t, /whereNull\('location_id'\)/);
  assert.match(t, /PMD-VR-SIM-/);
  assert.doesNotMatch(t, /simulatorQuery = DB::table/);
});
test('provider paid is not synonymous with recorded settlement', () => {
  const service = read('app/Services/TerminalPayments/TerminalPaymentService.php');
  const table = read('app/Services/PmdTableDisplayService.php');
  const js = read('app/admin/assets/js/pmd-table-display-waiter-payment-v1.js');
  assert.match(service, /PMD_TERMINAL_RECORDED_SETTLEMENT_V139/);
  assert.doesNotMatch(service, /payment_recorded.*\(\$status==='paid'\)/);
  assert.match(table, /PMD_TABLE_DEVICE_IMMEDIATE_SETTLEMENT_GUARD_V139/);
  assert.match(js, /PMD_TABLE_DEVICE_PROVIDER_SETTLEMENT_GUARD_V137/);
});
test('Settings retains Staff and points to signed ZCS 0.6.2 release', () => {
  const settings = read('app/admin/views/pmdsettings/index.blade.php');
  const cashier = read('app/admin/views/pmd_quick_pos_v1.blade.php');
  assert.match(settings, /PayMyDine-Device-App-0\.6\.2\.apk/);
  assert.match(settings, /PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022/);
  assert.match(cashier, /20261022-payment-v139/);
  assert.match(cashier, /20261022-qpos-v125/);
});
