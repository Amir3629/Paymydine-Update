'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const pos = read('mobile/android/app/src/main/java/com/paymydine/mobile/device/DeviceShellManager.kt');
const service = read('mobile/android/app/src/main/java/com/paymydine/mobile/device/DeviceControlService.kt');
const http = read('mobile/android/app/src/main/java/com/paymydine/mobile/device/DevicePlatformClient.kt');
const table = read('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/TableDisplayApp.kt');
const tableHttp = read('mobile/android/app/src/main/java/com/paymydine/mobile/tabledisplay/DevicePlatformClient.kt');

test('POS commands never report completion before a visible screen change', () => {
  assert.ok(pos.includes('PMD_DEVICE_CONTROL_FOREGROUND_ACK_V148'));
  assert.ok(pos.includes('withContext(Dispatchers.Main.immediate)'));
  for (const [name, next] of [
    ['WAKE','SLEEP'],['SLEEP','SET_BRIGHTNESS'],['SET_BRIGHTNESS','IDENTIFY'],['IDENTIFY','RELOAD_APP']
  ]) {
    const start = pos.indexOf('"' + name + '" -> {');
    const end = pos.indexOf('"' + next + '" -> {', start);
    assert.ok(start >= 0 && end > start, name + ' route missing');
    const segment = pos.slice(start,end);
    assert.ok(segment.includes('appliedToVisibleScreen'), name + ' does not check foreground');
    assert.ok(segment.includes('if (appliedToVisibleScreen) "completed" else "acknowledged"'));
  }
  const reload = pos.slice(pos.indexOf('"RELOAD_APP" -> {'), pos.indexOf('"REBOOT" -> {'));
  assert.ok(reload.includes('"acknowledged"'));
  assert.ok(!reload.includes('"completed"'));
});

test('Native POS heartbeat errors are observable without logging credentials', () => {
  assert.ok(service.includes('PMD_DEVICE_HEARTBEAT_SAFE_DIAGNOSTIC_V148'));
  assert.ok(service.includes('consecutiveFailures'));
  assert.ok(service.includes('CancellationException'));
  assert.ok(service.includes('Log.w(TAG, "Device heartbeat unavailable;'));
  assert.ok(!service.includes('.getOrDefault(15L)'));
  assert.ok(http.includes('class DevicePlatformHttpException(val httpStatus: Int)'));
  assert.ok(http.includes('throw DevicePlatformHttpException(status)'));
  assert.ok(!service.includes('error.message'));
  assert.ok(!service.includes('deviceToken()'));
  assert.ok(!service.includes('tenantHost()'));
});

test('Table Z80 control heartbeat reports 401/403 without secrets or busy-loop', () => {
  assert.ok(table.includes('PMD_Z80_HEARTBEAT_SAFE_DIAGNOSTIC_V148'));
  assert.ok(table.includes('CancellationException'));
  assert.ok(table.includes('delay(nextPollSeconds.coerceIn(5L, 60L) * 1_000L)'));
  assert.ok(tableHttp.includes('throw DevicePlatformHttpException(status)'));
  assert.ok(!table.includes('Log.w("PMDTableControl", error.message'));
});

test('Receipt/payment and bank NFC are not conflated with device control', () => {
  const provider = read('app/Services/Payments/ProviderCapabilityRegistry.php');
  assert.ok(provider.includes("'z100_internal_nfc_acquiring_implemented' => false"));
  assert.ok(provider.includes("'android_softpos_sdk_approved_for_z100' => false"));
  assert.ok(!service.includes('settlement'));
  assert.ok(!pos.includes('collectPaymentMethod('));
});
