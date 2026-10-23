'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');
const php=read('app/Services/PmdDevicePlatformService.php');
const view=read('app/admin/views/pmddevices/index.blade.php');
const ops=read('app/admin/controllers/Pmddevices.php');
const bridge=read('mobile/android/app/src/main/java/com/paymydine/mobile/hardware/customerdisplay/PosCustomerDisplayJavascriptBridge.kt');
const probe=read('mobile/android/app/src/main/java/com/paymydine/mobile/hardware/customerdisplay/PosNfcPresenceProbe.kt');
const pos=read('mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt');
const js=read('app/admin/assets/js/pmd-qpos-web-parity-v112.js');
const js2=read('app/admin/assets/js/pmd-quick-pos-v1.js');

test('global manual close reaches POS even when POS automatic schedule is disabled', () => {
  const b=php.slice(php.indexOf('public function desiredState('),php.indexOf('public function openingWindow('));
  const manual=b.indexOf('PMD_RESTAURANT_GLOBAL_MANUAL_POWER_V149');
  const disabled=b.indexOf('if (!$managed)');
  assert.ok(manual>=0 && disabled>manual);
  assert.ok(b.includes("'pos'"));assert.ok(b.includes("'manual_'.$manual"));assert.ok(b.includes('$physicalScreen && $manual'));
  assert.ok(b.includes("'table_display'"));
  assert.ok(!b.slice(manual,disabled).includes("'site_hub'"));
  assert.ok(php.includes('PMD_GLOBAL_POWER_SKIP_PERSONAL_V149'));
  assert.ok(php.includes('->pluck(\'device_mode\', \'device_id\')'));
});
test('successful authenticated heartbeat upgrades legacy Device Platform capability',()=>{
 const b=php.slice(php.indexOf('public function heartbeat('),php.indexOf('public function recordLog('));
 for(const word of ['PMD_DEVICE_HEARTBEAT_SELF_REGISTER_CAPABILITY_V149',"'device_platform_v1'","->whereNull('revoked_at')","->where('location_id', $locationId)"])assert.ok(b.includes(word));
});
test('Device UI queues pending commands honestly, requiring connected device for reboot',()=>{
 assert.ok(view.includes('PMD_DEVICE_QUEUE_OFFLINE_EXPLAIN_V149'));
 assert.ok(view.includes("$pmdDeviceControlReadyV145 = !empty($device['device_command_capable'])"));
 assert.ok(view.includes("|| empty($device['online'])"));
 assert.ok(view.includes('Queued commands expire after 10 minutes'));
 assert.ok(ops.includes('execution needs device heartbeat'));
});
test('Android NFC probe only detects a tag, reads no personal data, cannot charge',()=>{
 assert.ok(probe.includes('PMD_Z100_FOREGROUND_NFC_PRESENCE_V149'));
 for(const needle of ['enableReaderMode(', 'disableReaderMode(', 'FLAG_READER_SKIP_NDEF_CHECK', 'onPause()', 'bank_acquiring_active']) {
   assert.ok((probe+'\n'+pos).includes(needle),needle);
 }
 for(const forbidden of ['tag.id','tag.getId(', 'IsoDep', 'transceive(', 'readMifare', 'getTechList(', 'getNdef', 'Pan', 'paymentIntent']) {
   assert.ok(!probe.includes(forbidden),forbidden);
 }
 assert.ok(bridge.includes('startNfcPresenceTest()'));
 assert.ok(bridge.includes('nfcPresenceTestStatus()'));
 assert.equal((pos.match(/PosCustomerDisplayJavascriptBridge\(customerDisplay, this@PosActivity, nfcPresenceProbe\)/g)||[]).length,2);
 assert.ok(pos.includes('nfcPresenceProbe.stop()'));
});
test('Both bundled Cashier scripts offer a real result or actionable error',()=>{
 for(const s of [js,js2]){
   assert.ok(s.includes('PMD_Z100_ACTUAL_NFC_TAG_PRESENCE_TEST_V149'));
   assert.ok(s.includes('nfcPresenceTestStatus'));
   assert.ok(s.includes('tag_detected'));
   assert.ok(s.includes('android_nfc_unavailable'));
   assert.ok(s.includes('Install the newer Device APK'));
   assert.ok(s.includes('No card will be charged'));
 }
});
