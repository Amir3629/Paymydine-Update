#!/usr/bin/env node
/* PMD R39: behavior and source regression against staged CURRENT VPS files */
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const base=process.argv[2]||process.cwd();
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const blade=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const multi=read('app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js');
const css=read('app/admin/assets/css/pmd-floor-manage-size-parity-r39.css');
const audit=read('app/admin/assets/js/pmd-floor-manage-audit-r39.js');
const layout=read('app/admin/views/_layouts/default.blade.php');
const registry=read('app/admin/Services/PmdSharedFloorRegistryV1.php');
const controller=read('app/admin/classes/PmdCleanWorkspaceControllerV1.php');
let count=0;
const test=(name,fn)=>{fn();console.log('PASS R39: '+name);count++;};

test('Edit floor is first-paint visible even for one default Floor',()=>{
 const tab=blade.indexOf('@if($pmdR38ShowManagementFloorTab)');
 const manage=blade.indexOf('data-pmd-floor-manage-always-visible-r39="1"');
 const end=blade.indexOf('@endif',manage);
 assert(tab>=0&&manage>tab&&end>manage);
 const segment=blade.slice(manage,end);
 assert(segment.includes('data-pmd-floor-manage-custom-visible="1"'));
 assert(segment.includes('aria-hidden="false"'));
 assert(segment.includes('display:inline-flex!important'));
 assert(!segment.includes('@if(!$pmdHasCustomFloor)'));
 assert(!segment.includes(' hidden @endif'));
 assert(blade.slice(tab,manage).includes('@if($pmdFloorCanManageTables)'));
});
test('Coordinator authorizes manage independently of additional Floors',()=>{
 assert(multi.includes('var showManage = config.can_manage === true;'));
 assert(multi.includes('var showFloorTabs = floors.length > 1 || config.can_manage === true;'));
 assert(multi.includes('setManageVisibility(liveManage, showManage);'));
 assert(multi.includes('activeFloorIsMain()'));
 assert(!multi.includes('var showManage = hasCustomFloor();'));
 const fragment=multi.slice(multi.indexOf('var showManage = config.can_manage === true;'));
 assert(fragment.includes('switcherDomReusedCountR35'));
});
test('Real setManageVisibility honors true/false, aria, and server state without delay',()=>{
 const a=multi.indexOf('    function setManageVisibility(');
 const b=multi.indexOf('    // PMD_EDIT_FLOOR_CUSTOM_EXISTENCE_V5_JS_END',a);
 assert(a>=0&&b>a);
 const func=new Function(multi.slice(a,b)+'\nreturn setManageVisibility;')();
 const props=new Map();
 const node={
   hidden:true,
   attrs:new Map([['aria-hidden','true'],['data-pmd-floor-manage-custom-visible','0']]),
   getAttribute:function(k){return this.attrs.get(k)||null;},
   setAttribute:function(k,v){this.attrs.set(k,String(v));},
   style:{
     getPropertyValue:k=>props.get(k)?.value||'',
     getPropertyPriority:k=>props.get(k)?.priority||'',
     setProperty:(k,value,priority)=>props.set(k,{value,priority})
   }
 };
 func(node,true);
 assert.strictEqual(node.hidden,false);
 assert.strictEqual(node.getAttribute('aria-hidden'),'false');
 assert.strictEqual(node.getAttribute('data-pmd-floor-manage-custom-visible'),'1');
 assert.deepStrictEqual(props.get('display'),{value:'inline-flex',priority:'important'});
 assert.deepStrictEqual(props.get('pointer-events'),{value:'auto',priority:'important'});
 func(node,false);
 assert.strictEqual(node.hidden,true);
 assert.strictEqual(node.getAttribute('aria-hidden'),'true');
 assert.deepStrictEqual(props.get('display'),{value:'none',priority:'important'});
});
test('Real backend allows default Floor rename, forbids deletion, guards location/role',()=>{
 const renameStart=registry.indexOf('public function renameFloor(');
 const deleteStart=registry.indexOf('public function deleteFloor(',renameStart);
 assert(renameStart>=0&&deleteStart>renameStart);
 const rename=registry.slice(renameStart,deleteStart);
 const remove=registry.slice(deleteStart,registry.indexOf('public function assignTable(',deleteStart));
 assert(rename.includes('$isDefaultFloor ='));
 assert(rename.includes('!$isDefaultFloor'));
 assert(rename.includes("'name'] = $name;"));
 assert(rename.includes('$this->persist('));
 assert(remove.includes('$this->isDefaultFloorId('));
 assert(remove.includes('The default Floor cannot be removed.'));
 const handler=controller.slice(controller.indexOf('public function onPmdFloorRegistryRename()'),controller.indexOf('public function onPmdFloorRegistryDelete()'));
 assert(handler.includes('$this->pmdAssertCanManageFloorTables();'));
 assert(handler.includes('Active Floor location changed.'));
 assert(handler.includes('->renameFloor('));
 assert(blade.includes("'locked' =>")&&blade.includes('rename it, but it cannot be removed'));
});
test('Left and right toolbar controls have same desktop/mobile dimensions',()=>{
 for(const part of ['.pmd-shared-floor-switcher__floor','.pmd-shared-floor-switcher__manage','button.pmd-floor-table-manager__toolbar-button.is-add','button.pmd-floor-table-manager__toolbar-button.is-edit']){
   assert(css.includes(part),part);
 }
 assert(css.includes('min-width:140px!important'));
 assert(css.includes('height:52px!important'));
 assert(css.includes('min-width:116px!important'));
 assert(css.includes('height:46px!important'));
 assert(css.includes('width:max-content!important'));
 assert(!css.includes('> button.pmd-floor-table-manager__toolbar-button'));
});
test('Only Owner/Manager routes load R39; modal and Add table remain intact',()=>{
 assert(layout.includes('PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD'));
 assert(layout.includes("request()->is('admin/ownerdashboard*')"));
 assert(layout.includes("request()->is('admin/managerdashboard*')"));
 assert(layout.includes('data-pmd-floor-r39="css"'));
 assert(layout.includes('data-pmd-floor-r39="js"'));
 assert(blade.includes('data-pmd-floor-manage-panel'));
 assert(blade.includes('data-pmd-floor-manage-save'));
 assert(blade.includes('data-pmd-floor-table-add'));
 assert(blade.includes('data-pmd-floor-table-edit'));
 assert(audit.includes('window.PMDEditFloorR39={version:'));
 assert(audit.includes('editFloorVisible'));
});
console.log('R39 staged VPS tests passed: '+count);
