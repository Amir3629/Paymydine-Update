'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');

const paths = [
  'app/admin/assets/js/pmd-quick-pos-v1.js',
  'app/admin/assets/js/pmd-qpos-web-parity-v112.js',
];
for (const path of paths) {
  test(path + ': stable table and food DOM for Android local bootstrap', () => {
    const code = read(path);
    assert.match(code, /PMD_ANDROID_POS_STABLE_TABLE_DOM_V140/);
    assert.match(code, /__pmdNativeTableMarkupV140 === nextTableHtmlV140/);
    assert.match(code, /PMD_ANDROID_POS_STABLE_FOOD_DOM_V140/);
    assert.match(code, /__pmdNativeFoodMarkupV140 === nextFoodHtmlV140/);
    assert.match(code, /PMD_ANDROID_FOOD_IMAGE_CLOUD_FALLBACK_V140/);
    assert.match(code, /status\.cloud_available !== true/);
    assert.match(code, /url\.host !== window\.location\.host/);
  });
  test(path + ': no phantom Z100 contactless and terminal-only when online', () => {
    const code = read(path);
    assert.match(code, /PMD_ZCS_NO_PREMATURE_NFC_V140/);
    assert.match(code, /PMD_ANDROID_POS_REAL_TERMINAL_ONLY_V140/);
    assert.match(code, /PMD_ANDROID_POS_PAYMENT_METHOD_AVAILABILITY_V140/);
    assert.match(code, /\['online', 'ready', 'connected'\]/);
    assert.match(code, /methods\.push\(\{code: 'direct_terminal', name: 'Terminal'/);
    assert.doesNotMatch(code, /state\.payment\.open \? 'payment' : 'order'/);
    assert.doesNotMatch(code, /headline: 'Tap or insert card'/);
    assert.match(code, /PMD_QPOS_TERMINAL_CANONICAL_SETTLEMENT_GUARD_V141/);
    assert.match(code, /result\.payment_recorded !== true/);
    assert.match(code, /result\.simulated === true/);
    assert.match(code, /confirmedSettlementV141/);
    assert.match(code, /Do not charge the card again/);
  });
}
test('Table Device requires a live paired terminal and server readiness', () => {
  const js = read('app/admin/assets/js/pmd-table-display-waiter-payment-v1.js');
  const ctrl = read('app/Http/Controllers/PmdTableDisplayPaymentController.php');
  const routes = read('routes/admin-quick-mode.php');
  assert.match(js, /PMD_TABLE_DEVICE_DYNAMIC_AVAILABILITY_V140/);
  assert.match(js, /table-display-payment-availability/);
  assert.match(js, /availability\.ready/);
  assert.match(js, /current\.selectedTable/);
  assert.match(ctrl, /PMD_QPOS_TABLE_DEVICE_READINESS_V140/);
  assert.match(ctrl, /payment_terminal_device_id/);
  assert.match(ctrl, /subSeconds\(90\)/);
  assert.match(ctrl, /terminal_status/);
  assert.match(routes, /table-display-payment-availability/);
});
