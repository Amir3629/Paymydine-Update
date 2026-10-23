'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');

test('tenant Admin registers real Z100 device heartbeat routes', () => {
  const loader = read('app/admin/routes.php');
  assert.match(loader, /PMD_DEVICE_PLATFORM_DIRECT_ADMIN_LOADER_V146/);
  assert.match(loader, /require_once base_path\('routes\/pmd-device-platform-v1.php'\)/);
});
test('only genuine Device Platform heartbeats count as connected', () => {
  const service = read('app/Services/PmdDevicePlatformService.php');
  assert.match(service, /PMD_DEVICE_HEARTBEAT_AUTHORITY_V145/);
  assert.match(service, /\$seen = \$live->last_seen_at \?\? null/);
  assert.match(service, /'device_command_capable' => in_array\('device_platform_v1'/);
  assert.match(service, /'last_device_command' => \$lastCommand/);
  assert.match(service, /->limit\(500\)/);
});
test('Devices UI shows unacknowledged and expired command truthfully', () => {
  const view = read('app/admin/views/pmddevices/index.blade.php');
  assert.match(view, /PMD_DEVICE_HEARTBEAT_STATUS_V145/);
  assert.match(view, /No Device Platform heartbeat within 90 seconds/);
  assert.match(view, /waiting for device acknowledgement/);
  assert.match(view, /device reported completion/);
  for(const code of ['WAKE', 'SLEEP', 'SET_BRIGHTNESS','IDENTIFY','RELOAD_APP','REBOOT']) {
    assert.match(view, new RegExp('value="' + code + '" @if\\(!\\$pmdDeviceControlReadyV145\\) disabled'));
  }
  assert.match(view, /data-pmd-device-command-form-v144/);
});
