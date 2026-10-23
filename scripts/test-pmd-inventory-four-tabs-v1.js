#!/usr/bin/env node
/* PMD_INVENTORY_FOUR_TABS_V1 read-only regression checks. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const inventory = read('app/admin/views/pmdinventory/index.blade.php');
const modes = inventory.match(/<nav class="pmd-inv-r19-modes[^]*?<\/nav>/);
assert.ok(modes, 'Inventory nav exists');
assert.deepEqual(
  [...modes[0].matchAll(/data-r19-mode="([^"]+)"/g)].map(x => x[1]),
  ['stock', 'purchases', 'waste', 'shopping'],
  'Only the four requested tabs remain'
);
assert.ok(!/data-r24-mode=/.test(modes[0]), 'Advanced tabs absent from inventory nav');
assert.match(modes[0], /class="is-active" aria-current="page" data-r19-mode="stock"/);
assert.match(inventory, /data-r19-pane="overview" hidden>/, 'overview no longer first paints');
assert.match(inventory, /class="pmd-inv-r19-pane is-active" data-r19-pane="stock"/);
for (const mode of ['orders','suppliers','storage','prep','reports']) {
  assert.ok(inventory.includes('data-r24-pane="' + mode + '"'), 'Advanced data preserved for ' + mode);
}
const workspace = read('app/admin/assets/js/pmd-inventory-workspace-r19.js');
assert.match(workspace, /var initialMode = 'stock'/);
assert.match(workspace, /\['stock','purchases','waste','shopping'\]/);
const bridge = read('app/admin/assets/js/pmd-inventory-retained-controls-v1.js');
assert.match(bridge, /moveCard\('\[data-r24-settings-form\]', 'stock'/);
assert.match(bridge, /moveCard\('\[data-r24-receipt-corrections\]', 'purchases'/);
const menus = read('app/admin/controllers/Pmdmenus.php');
assert.ok(menus.includes('pmd-inventory-retained-controls-v1.js'));
const controller = read('app/admin/controllers/Pmdreports.php');
assert.match(controller, /public function inventory\(\)/);
assert.match(controller, /roleCodeForUser\(AdminAuth::getUser\(\)\)/);
assert.match(controller, /PmdInventoryControlService::class/);
assert.match(controller, /protected function inventoryPayload\(\)/);
const reports = read('app/admin/views/pmdreports/index.blade.php');
assert.match(reports, /\$reportRoutes\['inventory'\] = \['Inventory', admin_url\('reports\/inventory'\)\]/);
assert.match(reports, /roleCodeForUser\(/, 'Inventory link respects Owner/Manager access');
assert.match(reports, /_inventory_details_v1/);
const routes = read('routes/admin-app-before.php');
assert.match(routes, /sales\|hourly\|categories\|payments\|transactions\|alerts\|liveorders\|topitems\|reviews\|reservations\|attendance\|inventory/);
const partial = read('app/admin/views/pmdreports/_inventory_details_v1.blade.php');
assert.ok(partial.includes('pmd-report-inventory-stock-data'));
console.log('PASS: Inventory four tabs, retained controls, role-gated Reports route and CSV wiring.');
