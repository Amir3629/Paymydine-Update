#!/usr/bin/env node
'use strict';
/* R45 staged source regression: exact real handler, safety, accessibility. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=process.argv[2] || process.cwd();
const read=x=>fs.readFileSync(path.join(dir,x),'utf8');
const control=read('app/admin/classes/PmdCleanWorkspaceControllerV1.php');
const registry=read('app/admin/Services/PmdSharedFloorRegistryV1.php');
const safety=read('app/admin/Services/PmdFloorOperationalSafetyR45.php');
const floorJS=read('app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js');
const tableJS=read('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');
const partial=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const layout=read('app/admin/views/_layouts/default.blade.php');
const dialog=read('app/admin/assets/js/pmd-floor-confirm-r45.js');
const css=read('app/admin/assets/css/pmd-floor-operational-safety-r45.css');
const checks=[];
function check(name,fn){fn();checks.push(name);console.log('PASS R45: '+name);}

check('Owner/Manager role and location gates remain on every destructive action',()=>{
 for(const fn of ['onPmdFloorTableManagerDelete','onPmdFloorTableManagerSetEnabled',
                   'onPmdFloorRegistryDelete','onPmdFloorRegistryRemoveSafety']){
  const a=control.indexOf('public function '+fn+'()');
  assert(a>=0,fn);
  const s=control.slice(a,a+500);
  assert(s.includes('$this->pmdAssertCanManageFloorTables();'),fn);
  assert(s.includes('$this->pmdFloorTableManagerLocationId();'),fn);
 }
});
check('Table serializer sends explicit guard flags and physical state for all edit cards',()=>{
 assert(control.includes("->inspectTable((int)($table->table_id ?? 0), $locationId, $table)"));
 for(const t of ["'can_disable' => (bool)$pmdSafetyR45['allowed']",
                 "'can_remove' => (bool)$pmdSafetyR45['allowed']",
                 "'safety_message' => (string)$pmdSafetyR45['message']",
                 "'operational_status' => (string)$pmdSafetyR45['operational_status']"])
  assert(control.includes(t),t);
 assert(tableJS.includes("table.can_remove === true && table.can_disable === true"));
 assert(tableJS.includes('deleteButton.disabled = busy || !currentSafetyAllowedR45'));
 assert(tableJS.includes("isEnabled && !currentSafetyAllowedR45"));
 assert(tableJS.includes('[data-pmd-r45-table-safety]'));
});
check('Server protects disable, legacy save bypass, table removal and table relocation',()=>{
 const setEnabled=control.slice(control.indexOf('public function onPmdFloorTableManagerSetEnabled()'),
                                control.indexOf('public function onPmdFloorTableManagerDelete()'));
 assert(setEnabled.includes('if (!$enabled)'));
 assert(setEnabled.includes('->inspectTable($tableId, $locationId, $table)'));
 assert(setEnabled.includes('], 409)'));
 const save=control.slice(control.indexOf('public function onPmdFloorTableManagerSave()'),
                            control.indexOf('public function onPmdFloorTableManagerSetEnabled()'));
 assert(save.includes('$changingFloor || $disabling'));
 assert(save.includes('->inspectTable($tableId, $locationId, $table)'));
 const del=control.slice(control.indexOf('public function onPmdFloorTableManagerDelete()'),
                           control.indexOf('public function onPmdFloorRegistryCreate()'));
 assert(del.includes('->inspectTable($tableId, $locationId, $table)'));
 assert(del.includes('->assertTableCanChange($tableId, $locationId)'));
 assert(del.includes('} catch (\\DomainException $e)'));
 assert(!del.includes('PMD Floor table delete settlement guard unavailable'));
});
check('Physical status and financial orders are independent; errors fail closed',()=>{
 assert(safety.includes("['available', 'free']"));
 for(const v of ['operational_status','settlement_status','payment_status','settled_amount','table_id'])
  assert(safety.includes(v),v);
 assert(safety.includes("->cursor()"));
 assert(safety.includes("return $this->deny('verification_error'"));
 assert(safety.includes("return $this->deny('unverified_bill'"));
 assert(safety.includes("return $this->deny('orders_unavailable'"));
 assert(!safety.includes("catch (\\Throwable $error) {\n            return ['allowed' => true"));
});
check('Floor remove uses live preflight and service-level protection before reassignment',()=>{
 assert(control.includes('public function onPmdFloorRegistryRemoveSafety()'));
 assert(control.includes('->inspectFloor($locationId, $floorId)'));
 const service=registry.slice(registry.indexOf('public function deleteFloor('),
                              registry.indexOf('public function assignTable('));
 assert(service.includes('->assertFloorCanRemove($locationId, $floorId)'));
 assert(service.indexOf('->assertFloorCanRemove(')<service.indexOf('$this->persist('));
 assert(floorJS.includes("postJson("));
 assert(floorJS.includes("'onPmdFloorRegistryRemoveSafety'"));
 assert(floorJS.includes('manageSafetyCheckingR45'));
 assert(floorJS.includes('manageSafetyR45.allowed !== true'));
 assert(floorJS.includes('refreshManageSafetyR45().then('));
 assert(floorJS.includes('performDeleteActiveFloorR45()'));
 assert(floorJS.includes('[data-pmd-floor-remove-safety-r45]'));
});
check('No browser confirmation on Floor OR table; accessible shared card used instead',()=>{
 const startFloor=floorJS.indexOf('    function deleteActiveFloor()');
 const endFloor=floorJS.indexOf('    window.addEventListener',startFloor);
 assert(startFloor>0&&endFloor>startFloor);
 assert(!floorJS.slice(startFloor,endFloor).includes('window.confirm'));
 assert(floorJS.slice(startFloor,endFloor).includes('window.PMDFloorConfirmR45.open'));
 const startTable=tableJS.indexOf('    function removeTable()');
 const endTable=tableJS.indexOf('    function save() {',startTable);
 assert(startTable>0&&endTable>startTable);
 assert(!tableJS.slice(startTable,endTable).includes('window.confirm'));
 assert(tableJS.slice(startTable,endTable).includes('window.PMDFloorConfirmR45.open'));
 assert(dialog.includes("'alertdialog'"));
 assert(dialog.includes("setAttribute('aria-modal', 'true')"));
 assert(dialog.includes('event.stopImmediatePropagation()'));
 assert(dialog.includes("event.key === 'Tab'"));
 assert(dialog.includes("event.key === 'Escape'"));
 assert(dialog.includes('previousFocus.focus({preventScroll:true})'));
});
check('Edit Floor subtitle is removed; safety notices and dialog have scoped styles',()=>{
 assert(!partial.includes("{{ $pmdFloorManageText['subtitle'] }}"));
 assert(partial.includes('data-pmd-floor-remove-safety-r45'));
 assert(partial.includes('data-pmd-r45-table-safety'));
 assert(css.includes('.pmd-floor-table-manager__delete:disabled'));
 assert(css.includes('.pmd-floor-registry-manager__delete:disabled'));
 assert(css.includes('body > .pmd-r45-confirm-layer'));
 assert(css.includes('z-index:2147483647!important'));
 assert(css.includes('.pmd-r45-confirm-submit'));
 assert(layout.includes('PMD_FLOOR_OPERATIONAL_SAFETY_R45_REAL_HEAD'));
 assert(layout.includes("filemtime(base_path('app/admin/assets/css/pmd-floor-operational-safety-r45.css'))"));
 assert(layout.includes("filemtime(base_path('app/admin/assets/js/pmd-floor-confirm-r45.js'))"));
 assert.strictEqual((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

(async()=>{
 check('Shared JS is syntactically valid without changing Floor core engine',()=>{
  new Function(dialog);
  new Function(floorJS);
  new Function(tableJS);
  assert(tableJS.includes('PMD_NATIVE_FLOOR_TRANSLATE_R43'));
  assert(tableJS.includes('reuseStableRowNodesR38'));
 });
 // Lightweight real dialog execution using a simulated DOM, no window.confirm.
 let confirmation=null;
 const listeners=new Map();
 function node(tag){
   return {
     tag,
     children:[],attributes:{},listeners:{},textContent:'',id:'',
     className:'',type:'',
     setAttribute(k,v){this.attributes[k]=v;},
     appendChild(child){this.children.push(child);child.parentNode=this;return child;},
     addEventListener(ev,fn){this.listeners[ev]=fn;},
     remove(){this.removed=true;},
     focus(){doc.activeElement=this;},
   };
 }
 const doc={
   activeElement:null,body:node('body'),
   createElement:node,
   addEventListener(k,fn){listeners.set(k,fn);},
   removeEventListener(k){listeners.delete(k);},
   contains(n){return Boolean(n);},
 };
 const win={};
 new Function('window','document',dialog)(win,doc);
 const promise=win.PMDFloorConfirmR45.open({
  title:'Remove floor',message:'Only safe tables are moved.',
  confirmLabel:'Remove floor',trigger:doc.body
 });
 const modal=doc.body.children[0];assert(modal,'dialog not mounted');
 const card=modal.children[1];
 const footer=card.children[2];
 footer.children[0].listeners.click();
 confirmation=await promise;
 check('The actual confirmation cancel action resolves false without network writes',()=>{
  assert.strictEqual(confirmation,false);
  assert(modal.removed);
  assert(!listeners.has('keydown'));
 });
 console.log('R45 JS REGRESSIONS: '+checks.length+' groups passed');
})().catch(err=>{console.error(err);process.exitCode=1;});
