'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const settings = read('app/admin/views/pmdsettings/index.blade.php');
const view = read('app/admin/views/pmddevices/index.blade.php');
const service = read('app/Services/PmdDevicePlatformService.php');
const controller = read('app/admin/controllers/Pmddevices.php');
const fleet = read('app/admin/assets/js/pmd-device-fleet-v150.js');
const css = read('app/admin/assets/css/pmd-device-fleet-v150.css');

test('Settings directly downloads signed ZCS Device 0.6.6 without replacing the Staff App', () => {
  assert.ok(settings.includes('data-pmd-device-app-download-v21'));
  assert.ok(settings.includes('PMD_DEVICE_APP_0_6_6_ZCS_Z100_V150'));
  assert.ok(settings.includes('/releases/download/pmd-device-app-preview/PayMyDine-Device-App-0.6.6.apk'));
  assert.ok(!settings.includes('/releases/download/pmd-device-app-preview/PayMyDine-Device-App-0.6.4.apk'));
  assert.ok(settings.includes('data-pmd-staff-app-download-v1'));
  assert.ok(settings.includes('data-pmd-staff-app-download-pending-v1'));
});

test('All registered Staff/Waiter, POS, Table, Kiosk kinds remain discoverable, even offline', () => {
  const from=service.indexOf('public function devices(');
  const to=service.indexOf('public function heartbeat(', from);
  const body=service.slice(from,to);
  for (const needle of ["'staff_personal'", "'table_display'", "'cashier'",
    "'kds'", "'kiosk'", "'screen_remote_supported'", "'fleet_group'",
    "whereNull('revoked_at')", 'has_device_heartbeat']) assert.ok(body.includes(needle), needle);
  assert.ok(!body.includes("where('device_kind', 'table_display')"));
  assert.ok(!body.includes('->whereNotNull(\'last_seen_at\')'));
  assert.ok(body.includes("DB::table('pmd_site_access_devices')"));
});

test('UI prioritizes connected devices and exposes staff, table, offline, all saved and search', () => {
  for(const filter of ['online','staff','table','offline','all']) {
    assert.ok(view.includes('data-pmd-device-filter="' + filter + '"'), filter);
  }
  assert.ok(view.includes('data-pmd-device-search'));
  assert.ok(view.includes('data-pmd-device-row'));
  assert.ok(view.includes('data-pmd-device-id'));
  assert.ok(view.includes('data-pmd-device-more'));
  assert.ok(view.includes('data-pmd-device-expanded'));
  assert.ok(fleet.includes("var activeFilter = 'online'"));
  assert.ok(fleet.includes("row.hidden = !match"));
  assert.ok(fleet.includes("key === 'staff' || key === 'table'"));
  assert.ok(css.includes('[hidden]{display:none!important}'));
});

test('Only an actual managed POS workspace can be remotely blanked, never a generic personal phone', () => {
  assert.ok(service.includes('PMD_DEVICE_FLEET_CLASSIFICATION_V150'));
  assert.ok(service.includes("$kind !== 'site_hub'"));
  assert.ok(service.includes("'pos', 'cashier'"));
  assert.ok(view.includes('screen_remote_supported'));
  assert.ok(view.includes("Staff attendance phones cannot be remotely put to sleep."));
  assert.ok(service.includes('PMD_GLOBAL_POWER_SKIP_PERSONAL_V149'));
});

test('Renaming requires explicit manager authorization and restricts tenant and pairing', () => {
  assert.ok(controller.includes('public function onRenamePmdDevicePlatform()'));
  const body = controller.slice(
    controller.indexOf('public function onRenamePmdDevicePlatform()'),
    controller.indexOf('public function onStartPmdTableDeployment()')
  );
  assert.ok(body.includes('$this->assertDevicePlatformManager()'));
  assert.ok(body.includes('$this->devicePlatformLocationId()'));
  const rename=service.slice(service.indexOf('public function renameDevice('),service.indexOf('public function heartbeat('));
  assert.ok(rename.includes("->where('location_id', $locationId)"));
  assert.ok(rename.includes("->whereNull('revoked_at')"));
  assert.ok(rename.includes('mb_strlen($name)'));
  assert.ok(!rename.includes('device_token'));
  assert.ok(view.includes('data-request="onRenamePmdDevicePlatform"'));
});

test('Fleet JS cannot bypass device permissions or submit commands',()=>{
  assert.ok(controller.includes('PMD_DEVICE_COMMAND_SERIALIZED_SUBMITTER_V144'));
  for(const forbidden of ['fetch(', 'XMLHttpRequest', 'POST', 'deviceToken', 'localStorage', 'issueNewTurn']) {
    assert.ok(!fleet.includes(forbidden), forbidden);
  }
});
