'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function file(p) { return fs.readFileSync(p, 'utf8'); }

const audit = file('scripts/pmd-z100-live-readiness-v145.php');
const service = file('app/Services/PmdDevicePlatformService.php');
const view = file('app/admin/views/pmddevices/index.blade.php');
const local = file('mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt');
const pos = file('mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt');
const controller = file('mobile/android/app/src/main/java/com/paymydine/mobile/device/DeviceControlService.kt');

test('audit hard-pins Tomo, verifies database and enforces read-only transaction', () => {
  assert.match(audit, /\$host !== 'tomo\.paymydine\.com'/);
  assert.match(audit, /'database\.connections\.tenant\.database'/);
  assert.match(audit, /strcasecmp\(\(string\)\$db->getDatabaseName\(\), \$dbName\)/);
  assert.match(audit, /SET TRANSACTION READ ONLY/);
  assert.match(audit, /\$db->beginTransaction\(\)/);
  assert.match(audit, /\$db->rollBack\(\)/);
  assert.match(audit, /READ_ONLY_TOMO_AUDIT=PASS/);
});

test('never reads provider credentials, trusted device tokens or private payloads', () => {
  assert.match(audit, /SELECT only approved metadata fields/);
  assert.match(audit, /terminal_provider_configs', \[/);
  assert.match(audit, /'provider_code', 'environment', 'connection_status'/);
  assert.doesNotMatch(audit, /->get\(\)->all\(\)/);
  assert.doesNotMatch(audit, /\$config->(?:credentials|token|merchant_id|api_key)/);
  assert.doesNotMatch(audit, /->(?:insert|insertGetId|update|delete|upsert|truncate|create)\s*\(/);
});

test('audit differentiates mobile activity from command heartbeat', () => {
  assert.match(audit, /trusted_activity_recent_90s/);
  assert.match(audit, /device_platform_heartbeat_recent_90s/);
  assert.match(audit, /latest_command/);
  assert.match(audit, /preliminary_physical_reader_ready/);
  assert.match(audit, /simulator/);
});

test('server shows only successful platform heartbeats as Device Control online', () => {
  assert.match(service, /PMD_DEVICE_HEARTBEAT_AUTHORITY_V145/);
  assert.match(service, /\$seen = \$live->last_seen_at \?\? null/);
  assert.doesNotMatch(service, /\$seen = \$live->last_seen_at \?\? \$device->last_seen_at/);
  assert.match(service, /'last_device_command' => \$lastCommand/);
  assert.match(service, /'device_command_capable' => in_array\('device_platform_v1'/);
});

test('control buttons are disabled when disconnected or incapable', () => {
  assert.match(view, /PMD_DEVICE_HEARTBEAT_STATUS_V145/);
  assert.match(view, /No Device Platform heartbeat within 90 seconds/);
  assert.match(view, /device reported completion/);
  assert.match(view, /waiting for device acknowledgement/);
  for (const c of ['WAKE','SLEEP','SET_BRIGHTNESS','IDENTIFY','RELOAD_APP','REBOOT']) {
    assert.match(view, new RegExp('value="' + c + '" @if\\(!\\$pmdDeviceControlReadyV145\\) disabled'));
  }
});

test('root cause of Cash-only is in Android local-first transport, not VPS payments', () => {
  assert.match(local, /\.put\("terminal_providers", JSONArray\(\)\)/);
  assert.match(local, /Card and terminal payments need an internet connection/);
  assert.match(pos, /PMD_ANDROID_POS_STICKY_LOCAL_V20/);
  assert.match(pos, /transportMode = TransportMode\.LOCAL/);
  assert.match(controller, /\.getOrDefault\(15L\)/);
});
