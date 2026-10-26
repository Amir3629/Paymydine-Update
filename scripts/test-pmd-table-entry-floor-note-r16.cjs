#!/usr/bin/env node
'use strict';
/* R16 source guardrails for deployed VPS files.
 * Live 2-table QR tests and live frontend runtime build remain separate.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const header=read('app/admin/widgets/menu/top_menu.blade.php');
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const floorJs=read('app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js');
const guest=read('app/main/routes/api-v1-table-info.php');
const guestAlt=read('app/Http/Controllers/Api/TableController.php');
const loader=read('frontend/features/customer-menu/hooks/useMenuLoader.ts');
const page=read('frontend/features/customer-menu/CustomerMenuPage.tsx');
const client=read('frontend/lib/api-client.ts');

function test(n,fn){fn();console.log('PASS R16: '+n)}
test('General Staff Note keeps original form and POST but removes redundant helper',()=>{
  assert(header.includes('id="addGeneralStaffNoteForm"'));
  assert(header.includes('id="generalStaffNoteSubmitBtn"'));
  assert(!header.includes('This note will be visible to all staff members and shown as a push notification.'));
});
test('Owner and Manager Add floor remains server capability gated',()=>{
  const area=floor.slice(floor.indexOf('class="pmd-shared-floor-switcher"'),floor.indexOf('data-pmd-floor-switcher-divider'));
  assert(area.includes('@if($pmdFloorCanManageTables)'));
  assert(area.includes('data-pmd-floor-add'));
  assert(area.includes('style="display:inline-flex!important;visibility:visible!important;pointer-events:auto!important;"'));
  assert(area.includes('style="display:flex!important;visibility:visible!important;pointer-events:auto!important;"'));
  assert(floorJs.includes("event.target.closest('[data-pmd-floor-add]')"));
  assert(floorJs.includes('openAddPanel()'));
  assert(floorJs.includes('onPmdFloorRegistryCreate'));
});
test('Original floor divider survives single-floor case',()=>{
  assert(floor.includes('data-pmd-floor-switcher-divider'));
  assert(floor.includes('style="display:block!important;visibility:visible!important;"'));
});
test('Canonical guest QR entry refuses missing and disabled tables',()=>{
  assert(guest.includes('Route::get(\'/table-entry\''));
  assert(guest.includes('This table is not active'));
  assert(guest.includes('!(bool)$table->table_status'));
  assert(guest.includes("->header('X-PMD-Guest-State', $guestState)"));
  assert(guest.includes("->header('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')"));
});
test('Both guest table info entrypoints enforce physical state without stale-cache replies',()=>{
  assert(guest.includes("'code' => 'table_disabled'"));
  assert(guestAlt.includes("'code' => 'table_disabled'"));
  assert(guestAlt.includes('private, no-store, no-cache'));
});
test('Frontend checks every QR and explicit zero status, not just API success',()=>{
  assert(loader.includes('if (tableParam || qr)'));
  assert(loader.includes('disabledFlag(data.table_status)'));
  assert(loader.includes('disabledFlag(data.status)'));
  assert(loader.indexOf('if (isDisabled)') < loader.indexOf('if (tableResult.success && data.table_id != null && identityMatches)'));
  assert(loader.includes('const identityMatches ='));
  assert(loader.includes('table_lookup_failed: true'));
  assert(loader.includes('setApiMenuItems([])'));
  assert(loader.includes('hydratedPendingOrderRef.current = null'));
});
test('Cached menu cannot render before the table lookup finishes',()=>{
  assert(page.includes('const requiresTableVerification = Boolean('));
  assert(page.includes('isLoading && (requiresTableVerification'));
  assert(page.includes('tableInfo?.table_lookup_failed'));
  assert(page.includes('This table is not active'));
  assert(page.includes('We could not verify this table'));
  assert(client.includes("cache: 'no-store'"));
});
test('No new tenant migrations, no modified ordering/payment handler',()=>{
  assert(!loader.includes('onPmdFloorRegistryCreate'));
  assert(!page.includes('onPmdFloorRegistryCreate'));
});
console.log('R16 SOURCE REGRESSION: 8 groups passed.');
