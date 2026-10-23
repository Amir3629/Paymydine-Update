'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const has = (source, required) => assert.ok(source.includes(required), 'Missing contract: ' + required);
const excludes = (source, forbidden) => assert.ok(!source.includes(forbidden), 'Unsafe contract: ' + forbidden);

const service = read('app/Services/PmdTableDisplayService.php');
const route = read('routes/admin-quick-mode.php');
const controller = read('app/Http/Controllers/PmdTableDisplayPaymentController.php');
const waiter = read('app/admin/assets/js/pmd-waiter-pos-payment-v3.js');
const table = read('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/TableDisplayApp.kt');
const tableApi = read('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/ApiClient.kt');
const tableModels = read('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/Models.kt');
const browserDisplay = read('app/admin/assets/js/pmd-table-display-v1.js');
const hardware = read('mobile/android/app/src/main/java/com/paymydine/mobile/hardware/customerdisplay/PosCustomerDisplayJavascriptBridge.kt');

test('Z80 QR request checks active location/table, saved unpaid order and bound live display', () => {
  const from = service.indexOf('public function requestQrPayment(');
  const to = service.indexOf('private function resolveEvent(', from);
  assert.ok(from > 0 && to > from);
  const body = service.slice(from, to);
  for (const key of [
    '$expectedLocationId !== $locationId',
    'assertLiveBoundTableDisplay($locationId, $tableId)',
    '$remaining < 0.01',
    "->where('status', 1)",
    'table_display.qr_payment_requested',
    "'kind' => 'guest_checkout_qr_only'",
    "'payment_recorded' => false"
  ]) has(body, key);
  for (const forbidden of [
    '->createAttempt(', '->settlePayment(', "'payment_recorded' => true"
  ]) excludes(body, forbidden);
  has(route, '/admin/pos/table-display-qr/{order}');
  has(route, "->middleware('throttle:15,1')");
  has(controller, 'PMD_Z80_WAITER_GUEST_QR_ENDPOINT_V147');
  has(controller, '$this->authorizedOperator()');
  has(controller, '->requestQrPayment(');
});

test('Z80 switches to QR checkout only when online and for active unpaid table order', () => {
  for (const key of [
    'PMD_Z80_CHECKOUT_URL_ONLY_ACTIVE_QR_V147',
    "$visibleEvent['type'] === 'qr_payment_requested'",
    "table_display.qr_payment_requested",
    "$liveOrder['remaining_amount']",
    "'checkout_url' => $checkoutUrl",
  ]) has(service, key);
  has(tableModels, 'val checkoutUrl: String');
  has(tableApi, 'checkoutUrl = table.optString("checkout_url")');
  has(tableApi, 'url.protocol == "https"');
  has(tableApi, 'url.host.equals(expected');
  has(table, 'PMD_Z80_DYNAMIC_CHECKOUT_QR_V147');
  has(table, 'if (connected &&');
  has(table, 'state.event.type == "qr_payment_requested"');
  has(table, 'generateQrCode(qrUrl)');
  // Bank SDK is not called for QR events: only payment_requested calls bridge.
  has(table, 'currentEvent.type == "payment_requested"');
  has(browserDisplay, 'PMD_Z80_QR_PREVIEW_CLARITY_V147');
});

test('waiter QR initiates display only; no fake Paid or cross-origin checkout', () => {
  for (const key of [
    'PMD_WAITER_QR_HANDOFF_V147',
    "key: 'guest_qr'",
    "state.payment.method === 'guest_qr'",
    '/admin/pos/table-display-qr/',
    "result.kind !== 'guest_checkout_qr_only'",
    'result.payment_recorded !== false',
    'Await customer payment confirmation',
    'PMD_WAITER_QR_SECURE_ORIGIN_V147',
    'url.origin !== location.origin',
    "url.searchParams.get('order_id')",
    'copyPaymentLink'
  ]) has(waiter, key);
});

test('waiter terminal method only for actual registered ready physical reader', () => {
  const begin = waiter.indexOf('function terminalIsOnline(');
  const end = waiter.indexOf('function mergeTestedTerminal(', begin);
  assert.ok(begin >= 0 && end > begin);
  const code = waiter.slice(begin, end);
  for (const key of [
    'terminalIsPmdVrSimulator(row)',
    'Number(row.terminal_device_id',
    'String(row.reader_id',
    "'online', 'ready', 'connected'"
  ]) has(code, key);
  excludes(code, "'configured'");
  excludes(code, "'sandbox_simulator_ready'");
});

test('Z100 diagnostic is hardware-read-only; never enables acquiring or fake charge', () => {
  for(const key of [
    'PMD_Z100_ANDROID_NFC_NONPAYMENT_DIAGNOSTIC_V147',
    'NfcAdapter.getDefaultAdapter(context)',
    'fun deviceHardwareCapabilities(): String',
    '.put("softpos_payment_enabled", false)',
    '.put("payment_sdk_certified", false)'
  ]) has(hardware, key);
  for(const bad of ['enableReaderMode(', 'IsoDep', 'transceive(', 'collectPaymentMethod(']) excludes(hardware,bad);
  for(const file of [
    'app/admin/assets/js/pmd-quick-pos-v1.js',
    'app/admin/assets/js/pmd-qpos-web-parity-v112.js'
  ]) {
    const code=read(file);
    has(code, 'PMD_Z100_NFC_DIAGNOSTIC_NOT_BANK_ACQUIRING_V147');
    has(code, 'NFC bank payments are NOT enabled');
    has(code, 'Preview payment (demo)');
    excludes(code, 'Contactless reader ready. Card payments still use');
  }
});

test('restaurant end-of-day wake/sleep is separate from payment channels', () => {
  const code = read('app/admin/controllers/Pmddevices.php');
  for (const key of [
    "if ($action === 'OPEN_RESTAURANT')",
    "if ($action === 'CLOSE_RESTAURANT')",
    "'WAKE'", "'SLEEP'", 'PMD_DEVICE_COMMAND_SERIALIZED_SUBMITTER_V144'
  ]) has(code,key);
});
