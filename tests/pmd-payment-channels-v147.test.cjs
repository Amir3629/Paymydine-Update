'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const text = p => fs.readFileSync(p,'utf8');
const service = text('app/Services/PmdTableDisplayService.php');
const route = text('routes/admin-quick-mode.php');
const controller = text('app/Http/Controllers/PmdTableDisplayPaymentController.php');
const waiter = text('app/admin/assets/js/pmd-waiter-pos-payment-v3.js');
const table = text('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/TableDisplayApp.kt');
const tableApi = text('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/ApiClient.kt');
const tableModels = text('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/Models.kt');
const view = text('app/admin/assets/js/pmd-table-display-v1.js');
const hardware = text('mobile/android/app/src/main/java/com/paymydine/mobile/hardware/customerdisplay/PosCustomerDisplayJavascriptBridge.kt');

test('Z80 QR handoff requires saved unpaid exact-location order and live bound Z80', () => {
  const start = service.indexOf('public function requestQrPayment(');
  const end = service.indexOf('private function resolveEvent(',start);
  assert.ok(start > 0 && end > start);
  const body = service.slice(start,end);
  assert.match(body,/\\$expectedLocationId !== \\$locationId/);
  assert.match(body,/assertLiveBoundTableDisplay\\(\\$locationId, \\$tableId\\)/);
  assert.match(body,/\\$remaining < 0\\.01/);
  assert.match(body,/where\\('status', 1\\)/);
  assert.match(body,/table_display\\.qr_payment_requested/);
  assert.match(body,/kind' => 'guest_checkout_qr_only'/);
  assert.match(body,/payment_recorded' => false/);
  assert.doesNotMatch(body, /createAttempt\\(|settlePayment\\(|payment_transactions.*insert|payment_recorded' => true/);
  assert.match(route,/table-display-qr\\/\\{order\\}/);
  assert.match(route,/middleware\\('throttle:15,1'\\)/);
  assert.match(controller,/PMD_Z80_WAITER_GUEST_QR_ENDPOINT_V147/);
  assert.match(controller,/\\$this->authorizedOperator\\(\\)/);
  assert.match(controller,/requestQrPayment\\(/);
});

test('Z80 uses payment QR only online for currently-unpaid, explicit QR event', () => {
  assert.match(service,/PMD_Z80_CHECKOUT_URL_ONLY_ACTIVE_QR_V147/);
  assert.match(service,/\\$visibleEvent\\['type'\\] === 'qr_payment_requested'/);
  assert.match(service,/\\$order\\['remaining_amount'\\].*0\\.01/);
  assert.match(service,/->whereIn\\('event_type', \\[self::PAYMENT_REQUEST, 'table_display\\.qr_payment_requested'\\]\\)/);
  assert.match(service,/\\$liveOrder\\['remaining_amount'\\].*0\\.01/);
  assert.match(tableModels,/val checkoutUrl: String/);
  assert.match(tableApi,/checkoutUrl = table\\.optString\\("checkout_url"\\)/);
  assert.match(tableApi,/url\\.protocol == "https"/);
  assert.match(tableApi,/url\\.host\\.equals\\(expected/);
  assert.match(table,/PMD_Z80_DYNAMIC_CHECKOUT_QR_V147/);
  assert.match(table,/if \\(connected &&/);
  assert.match(table,/state\\.event\\.type == "qr_payment_requested"/);
  assert.match(table,/generateQrCode\\(qrUrl\\)/);
  assert.match(table,/paymentBridge\\.startPayment\\(currentEvent\\)/);
  assert.match(view,/PMD_Z80_QR_PREVIEW_CLARITY_V147/);
});

test('mobile waiter can request Z80 QR without simulating or settling payment', () => {
  assert.match(waiter,/PMD_WAITER_QR_HANDOFF_V147/);
  assert.match(waiter,/key: 'guest_qr'/);
  assert.match(waiter,/payment\\.method === 'guest_qr'/);
  assert.match(waiter,/\\/admin\\/pos\\/table-display-qr\\//);
  assert.match(waiter,/kind !== 'guest_checkout_qr_only'/);
  assert.match(waiter,/payment_recorded !== false/);
  assert.match(waiter,/Await customer payment confirmation/);
  assert.match(waiter,/guestCheckoutUrl\\(\\)/);
  assert.match(waiter,/PMD_WAITER_QR_SECURE_ORIGIN_V147/);
  assert.match(waiter,/url\\.origin !== location\\.origin/);
  assert.match(waiter,/Number\\(url\\.searchParams\\.get\\('order_id'\\)\\)/);
  assert.match(waiter,/copyPaymentLink/);
  assert.doesNotMatch(waiter,/status === 'sandbox_simulator_ready'/);
});

test('physical terminal selector rejects simulators and configured-only statuses', () => {
  const part = waiter.slice(waiter.indexOf('function terminalIsOnline('),waiter.indexOf('function mergeTestedTerminal('));
  assert.match(part,/terminalIsPmdVrSimulator\\(row\\)/);
  assert.match(part,/Number\\(row\\.terminal_device_id/);
  assert.match(part,/String\\(row\\.reader_id/);
  assert.match(part,/\\['online', 'ready', 'connected'\\]/);
  assert.doesNotMatch(part,/configured/);
});

test('Z100 NFC status is read-only and never marks acquiring operational', () => {
  assert.match(hardware,/PMD_Z100_ANDROID_NFC_NONPAYMENT_DIAGNOSTIC_V147/);
  assert.match(hardware,/NfcAdapter\\.getDefaultAdapter\\(context\\)/);
  assert.match(hardware,/fun deviceHardwareCapabilities\\(\\): String/);
  assert.match(hardware,/\\.put\\("softpos_payment_enabled", false\\)/);
  assert.match(hardware,/\\.put\\("payment_sdk_certified", false\\)/);
  assert.doesNotMatch(hardware, /enableReaderMode|IsoDep|transceive|PaymentIntent|collectPaymentMethod/);
  for(const file of ['app/admin/assets/js/pmd-quick-pos-v1.js','app/admin/assets/js/pmd-qpos-web-parity-v112.js']) {
    const code = text(file);
    assert.match(code,/PMD_Z100_NFC_DIAGNOSTIC_NOT_BANK_ACQUIRING_V147/);
    assert.match(code,/NFC bank payments are NOT enabled/);
    assert.match(code,/Payment preview only/);
    assert.doesNotMatch(code,/Contactless reader ready\\. Card payments still use/);
  }
});

test('end-of-day device controls remain separate and require device acknowledgements',()=>{
  const c = text('app/admin/controllers/Pmddevices.php');
  assert.match(c,/if \\(\\$action === 'OPEN_RESTAURANT'\\)/);
  assert.match(c,/if \\(\\$action === 'CLOSE_RESTAURANT'\\)/);
  assert.match(c,/'WAKE'/);
  assert.match(c,/'SLEEP'/);
  assert.match(c,/PMD_DEVICE_COMMAND_SERIALIZED_SUBMITTER_V144/);
});
