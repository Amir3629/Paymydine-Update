'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const service = read('app/Services/PmdTableDisplayService.php');
const control = read('app/Http/Controllers/PmdTableDisplayPaymentController.php');
const routes = read('routes/admin-quick-mode.php');
const waiter = read('app/admin/assets/js/pmd-waiter-pos-payment-v3.js');
const waiterPolicy = read('app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js');
const waiterStandalone = read('app/admin/views/waiter_pos.blade.php');
const waiterDashboard = read('app/admin/views/waiter_dashboard_new.blade.php');
const display = read('app/admin/assets/js/pmd-table-display-v1.js');
const matrix = read('app/Services/Payments/ProviderCapabilityRegistry.php');
const has = (txt, piece) => assert.ok(txt.includes(piece), 'Missing ' + piece);

test('Waiter QR request is authenticated, location bound, throttled and cannot authorize a charge', () => {
  has(control, 'PMD_Z80_WAITER_GUEST_QR_ENDPOINT_V147');
  has(control, '$this->authorizedOperator()');
  has(control, '->requestQrPayment(');
  has(service, 'PMD_Z80_SAME_TABLE_LOCATION_GUARD_V147');
  has(service, '$this->locationId($tableId) !== $locationId');
  has(routes, '/admin/pos/table-display-qr/{order}');
  has(routes, "->middleware('throttle:15,1')");
  const start=service.indexOf('public function requestQrPayment(');
  const end=service.indexOf('private function resolveEvent(',start);
  assert.ok(start > 0 && end > start);
  const qr=service.slice(start,end);
  for(const k of [
    '$expectedLocationId !== $locationId', 'assertLiveBoundTableDisplay(',
    '$remaining < 0.01', "->where('status', 1)",
    "'payment_recorded' => false", "'kind' => 'guest_checkout_qr_only'",
    "table_display.qr_payment_requested"
  ]) has(qr,k);
  assert.ok(!qr.includes('->createAttempt('));
  assert.ok(!qr.includes("'payment_recorded' => true"));
});

test('Z80 QR is temporary; old and paid orders do not re-display payment QR', () => {
  has(service,'PMD_Z80_CHECKOUT_URL_ONLY_ACTIVE_QR_V147');
  has(service,"$visibleEvent['type'] === 'qr_payment_requested'");
  has(service,"$liveOrder['remaining_amount']");
  has(service,"'checkout_url' => $checkoutUrl");
  has(display,'PMD_Z80_QR_PREVIEW_CLARITY_V147');
});

test('Waiter cash, QR and live external reader remain separate', () => {
  for (const key of [
    "key: 'cash'", "key: 'guest_qr'", "key: 'direct_terminal'",
    'PMD_WAITER_MOBILE_REAL_READER_ONLY_V147',
    'terminalIsPmdVrSimulator(row)', "url.origin !== location.origin",
    '/admin/pos/table-display-qr/', "result.payment_recorded !== false",
    'Await customer payment confirmation', 'copyPaymentLink'
  ]) has(waiter,key);
});

test('provider matrix NEVER advertises unapproved Z100 SoftPOS/acquirer', () => {
  has(matrix,'PMD_PAYMENT_ACCEPTANCE_CHANNELS_V147');
  has(matrix,"'z100_internal_nfc_acquiring_implemented' => false");
  has(matrix,"'android_softpos_sdk_approved_for_z100' => false");
  has(matrix,"'z80_qr_display_bank_processing' => false");
  has(matrix,"'external_reader_api_implemented' => $supportsTerminal");
});

test('Standalone waiter and both dashboards actually load V147, never hidden by cashier policy', () => {
  has(waiterStandalone, 'PMD_WAITER_STANDALONE_V147');
  has(waiterStandalone, 'pmd-waiter-pos-payment-v3.js');
  assert.ok(!waiterStandalone.includes('pmd-waiter-pos-payment-v2.js'));
  const matches = waiterDashboard.match(/pmd-waiter-pos-payment-v3.js/g) || [];
  assert.equal(matches.length, 2, 'Both dashboard variants must use V3');
  assert.equal((waiterDashboard.match(/v=20261023-147/g) || []).length >= 4,true);
  has(waiterPolicy, 'PMD_WAITER_QR_VISIBLE_V147');
  has(waiterPolicy, "(!cashierMode && key === 'guest_qr')");
  has(waiterPolicy, "state.payment.method !== 'guest_qr'");
  has(waiterPolicy, 'cashierMode || state.payment.method');
  has(waiter, "key: 'guest_qr'");
});

test('Restaurant shift Wake/Sleep is independent of checkout actions', () => {
  const ops = read('app/admin/controllers/Pmddevices.php');
  const device = read('app/Services/PmdDevicePlatformService.php');
  has(ops, "if ($action === 'OPEN_RESTAURANT')");
  has(ops, "if ($action === 'CLOSE_RESTAURANT')");
  has(ops, "'WAKE'");
  has(ops, "'SLEEP'");
  has(device, "'device_platform_v1'");
});
