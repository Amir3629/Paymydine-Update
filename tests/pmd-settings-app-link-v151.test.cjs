'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const updater = path.resolve('scripts/pmd-settings-app-link-v151.py');
const template = fs.readFileSync(process.env.PMD_SETTINGS_TEST_FIXTURE || 'app/admin/views/pmdsettings/index.blade.php', 'utf8');
const oldLink = 'https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-device-app-preview/PayMyDine-Device-App-0.6.4.apk';
const newLink = 'https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-device-app-preview/PayMyDine-Device-App-0.6.6.apk';
function run(input) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'pmd-v151-test-'));
  const source = path.join(dir,'settings-original.blade.php');
  const target = path.join(dir,'settings-staged.blade.php');
  fs.writeFileSync(source,input);
  const process = cp.spawnSync('python3',[updater,source,target],{encoding:'utf8'});
  const result = {process,output:fs.existsSync(target)?fs.readFileSync(target,'utf8'):null};
  fs.rmSync(dir,{recursive:true,force:true});
  return result;
}
function fixtureWithLocalEdits() {
  return template
    .replace(newLink,oldLink)
    .replace('PMD_DEVICE_APP_0_6_6_ZCS_Z100_V150','PMD_DEVICE_APP_0_6_4_ZCS_Z100_V23')
    .replace('PayMyDine Device App · Android 0.6.6','PayMyDine Device App · Android')
    .replace('id="pmd-cashier-launcher-menu-v107"','id="pmd-cashier-launcher-menu-v107" data-owner-settings-workspace-v150="preserve-me"')
    .replace('PayMyDine Staff App · Android','PayMyDine Staff App · Android - owner local copy');
}
test('V151 preserves owner/Staff changes even when Settings Git patch context changed at 1206',()=>{
  const input = fixtureWithLocalEdits();
  const a=run(input);
  assert.equal(a.process.status,0,a.process.stderr);
  assert.ok(a.output.includes(newLink));
  assert.ok(a.output.includes('PMD_DEVICE_APP_0_6_6_ZCS_Z100_V150'));
  assert.ok(a.output.includes('PayMyDine Device App · Android 0.6.6'));
  assert.ok(a.output.includes('data-owner-settings-workspace-v150="preserve-me"'));
  assert.ok(a.output.includes('PayMyDine Staff App · Android - owner local copy'));
  const marker='{{-- PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022:';
  assert.equal(a.output.slice(a.output.indexOf(marker)),input.slice(input.indexOf(marker)),
    'All Staff APK settings and subsequent owner customizations must be byte-identical');
  const b=run(a.output);
  assert.equal(b.process.status,0,b.process.stderr);
  assert.equal(b.output,a.output,'link fix is idempotent');
});
test('V152 fixes CUSTOM previous URLs only inside the uniquely identified Device App button',()=>{
  const candidates = [
    'https://tomo.paymydine.com/public/downloads/paymydine/PayMyDine-Device-App-0.6.5.apk',
    '/public/downloads/paymydine/PayMyDine-Device-App-0.5.9-debug.apk',
    'https://other.example/custom-app-download',
    "javascript:alert('test')",
    "{{ url('/public/downloads/paymydine/device-app.apk') }}"
  ];
  for (const oldHref of candidates) {
    const input=fixtureWithLocalEdits().replace(oldLink,oldHref);
    const r=run(input);
    assert.equal(r.process.status,0,oldHref+' :: '+r.process.stderr);
    assert.ok(r.output.includes(newLink));
    assert.ok(!r.output.includes('href="'+oldHref+'"'));
    assert.ok(r.output.includes('PayMyDine Staff App · Android - owner local copy'));
    assert.ok(r.output.includes('data-owner-settings-workspace-v150="preserve-me"'));
    const second=run(r.output);
    assert.equal(second.process.status,0,second.process.stderr);
    assert.equal(second.output,r.output);
  }
});
test('V152 rejects missing, duplicated or ambiguous anchors without touching Settings',()=>{
  const variants=[
    fixtureWithLocalEdits().replace(
      'data-pmd-device-app-download-v21',
      'data-pmd-device-app-download-v21 data-pmd-device-app-download-v21'),
    fixtureWithLocalEdits().replace(
      'data-pmd-device-app-download-v21','data-pmd-device-app-download-v22'),
    fixtureWithLocalEdits().replace(
      'data-pmd-device-app-download-v21',
      'data-pmd-device-app-download-v21 href="https://evil.example/second.apk"'),
    fixtureWithLocalEdits().replace(oldLink,''),
    fixtureWithLocalEdits().replace(
      'data-pmd-device-app-download-v21',
      'data-pmd-device-app-download-v21 data-pmd-staff-app-download-v1')
  ];
  for(const input of variants){
    const r=run(input);
    assert.notEqual(r.process.status,0);
    assert.equal(r.output,null);
    assert.ok(r.process.stderr.includes('STOP'));
  }
});
test('V151 keeps a custom owner label, changing only verified Device APK URL',()=>{
  let input=fixtureWithLocalEdits().replace(
     'PayMyDine Device App · Android',"Device Terminal - owner's personal label");
  const r=run(input);
  assert.equal(r.process.status,0,r.process.stderr);
  assert.ok(r.output.includes("Device Terminal - owner's personal label"));
  assert.ok(r.output.includes(newLink));
});
