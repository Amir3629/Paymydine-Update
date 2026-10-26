#!/usr/bin/env node
/* R40 Floor button compact width and first-paint active jade regression. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=process.argv[2]||process.cwd();
const read=(p)=>fs.readFileSync(path.join(dir,p),'utf8');
const css=read('app/admin/assets/css/pmd-floor-manage-size-parity-r39.css');
const auditJs=read('app/admin/assets/js/pmd-floor-manage-audit-r39.js');
const canonical=read('app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css');
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const multi=read('app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js');
const layout=read('app/admin/views/_layouts/default.blade.php');
let passed=0;const test=(label,fn)=>{fn();passed++;console.log('PASS R40: '+label);};
test('Desktop and mobile all four controls shrink equally and heights stay unchanged',()=>{
 for(const selector of [
  '.pmd-shared-floor-switcher > button.pmd-shared-floor-switcher__floor',
  '.pmd-shared-floor-switcher > button.pmd-shared-floor-switcher__manage',
  'button.pmd-floor-table-manager__toolbar-button.is-add',
  'button.pmd-floor-table-manager__toolbar-button.is-edit'
 ])assert(css.includes(selector),'missing size selector: '+selector);
 assert(css.includes('min-width:124px!important'));
 assert(css.includes('min-width:108px!important'));
 assert(css.includes('height:52px!important'));
 assert(css.includes('height:46px!important'));
 assert(css.includes('padding:0 13px!important'));
 assert(css.includes('padding:0 10px!important'));
 assert(!css.includes('min-width:140px!important'));
 assert(!css.includes('min-width:116px!important'));
});
test('Selected Floor first paint exactly matches Add table primary jade',()=>{
 const brand='linear-gradient(180deg,#0b765e 0%,#075c47 100%)';
 assert(canonical.includes(brand),'R34 Add Table primary jade no longer matches expectation');
 assert(css.includes('PMD_SELECTED_FLOOR_BRAND_JADE_R40'));
 const active=css.slice(css.indexOf('PMD_SELECTED_FLOOR_BRAND_JADE_R40'));
 assert(active.includes('button.pmd-shared-floor-switcher__floor:is(.is-active,[aria-selected="true"])'));
 assert(active.includes('background-image:'+brand+'!important'));
 assert(active.includes('border:1px solid #064b3c!important'));
 assert(active.includes('color:#fff!important'));
 assert(active.includes('background-image:none!important'));
 assert(active.includes('button.pmd-shared-floor-switcher__floor:not(.is-active):not([aria-selected="true"])'));
 assert(active.includes('#pmd-r2-floor-toolbar-v316'));
 assert(active.includes('[data-pmd-floor-table-manager="true"]'));
});
test('Hover and keyboard focus keep active tab jade; no default CSS transform/animation',()=>{
 const active=css.slice(css.indexOf('PMD_SELECTED_FLOOR_BRAND_JADE_R40'));
 assert(active.includes(':hover:not(:disabled)'));
 assert(active.includes('linear-gradient(180deg,#086c56 0%,#064b3c 100%)'));
 assert(active.includes(':focus-visible'));
 assert(active.includes('outline-offset:2px!important'));
 assert(css.includes('transform:none!important'));
 assert(css.includes('transition:none!important'));
 assert(css.includes('animation:none!important'));
});
test('Existing authorized Edit floor and default single Floor first-paint behavior preserved',()=>{
 assert(floor.includes('data-pmd-floor-manage-always-visible-r39="1"'));
 assert(floor.includes('data-pmd-floor-manage-custom-visible="1"'));
 assert(floor.includes('data-pmd-floor-table-add')&&floor.includes('data-pmd-floor-table-edit'));
 assert(floor.includes("class=\"pmd-shared-floor-switcher__floor{{ $pmdFloorRegistryItemActive ? ' is-active' : '' }}\""));
 assert(floor.includes('aria-selected="{{ $pmdFloorRegistryItemActive ? \'true\' : \'false\' }}"'));
 assert(multi.includes('var showManage = config.can_manage === true;'));
 assert(multi.includes('var showFloorTabs = floors.length > 1 || config.can_manage === true;'));
});
test('CSS remains scoped and existing R39 asset is server-linked with filemtime busting',()=>{
 assert(css.includes('html body.pmd-dashboard-lab-page'));
 assert(css.includes('[data-pmd-floor-table-manager="true"]'));
 assert(layout.includes('PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD'));
 assert(layout.includes("filemtime(base_path('app/admin/assets/css/pmd-floor-manage-size-parity-r39.css'))"));
 assert(layout.includes("filemtime(base_path('app/admin/assets/js/pmd-floor-manage-audit-r39.js'))"));
 const opens=(css.match(/\{/g)||[]).length,closes=(css.match(/\}/g)||[]).length;
 assert.strictEqual(opens,closes,'CSS curly braces not balanced');
});
test('Read-only browser audit reports computed background of real selected tab',()=>{
 const attrs={};
 function makeButton(label,selected,bg,color) {
   const attributes={'aria-selected':selected?'true':'false'};
   return {
     textContent:label,
     hidden:false,disabled:false,
     classList:{contains:(c)=>c==='is-active'&&selected},
     getAttribute:(key)=>attributes[key]??null,
     getBoundingClientRect:()=>({width:124,height:52}),
     bg:bg,color:color
   };
 }
 const active=makeButton('Main Floor',true,'linear-gradient(rgb(11, 118, 94), rgb(7, 92, 71))','rgb(255, 255, 255)');
 const inactive=makeButton('Second',false,'none','rgb(21, 60, 53)');
 const switcher={hidden:false,querySelectorAll:()=>[active,inactive]};
 const edit=makeButton('Edit floor',false,'none','rgb(21, 60, 53)');
 const add=makeButton('Add table',false,'linear-gradient(...)','#fff');
 const root={
   getAttribute:(k)=>k==='data-pmd-floor-table-manager'?'true':k==='data-pmd-active-floor-id'?'default':k==='data-pmd-active-floor-name'?'Main Floor':null,
   querySelector:(q)=>q==='[data-pmd-floor-switcher]'?switcher:q==='[data-pmd-floor-manage]'?edit:q==='[data-pmd-floor-table-add]'?add:q==='[data-pmd-floor-table-edit]'?edit:null
 };
 const document={
   getElementById:()=>root,
   querySelectorAll:()=>[{}]
 };
 const win={
   getComputedStyle:(el)=>({fontSize:'14px',display:'inline-flex',visibility:'visible',backgroundColor:'#0b765e',backgroundImage:el.bg,color:el.color}),
   PMDSharedFloorMultiFloorV1:{audit:()=>({floorCount:2})}
 };
 new Function('window','document',auditJs)(win,document);
 assert.strictEqual(typeof win.PMDFloorR40.audit,'function');
 assert.strictEqual(typeof win.PMDEditFloorR39.audit,'function');
 const out=win.PMDFloorR40.audit();
 assert.strictEqual(out.floorTabs.length,2);
 assert.strictEqual(out.floorTabs[0].isSelected,true);
 assert(out.floorTabs[0].backgroundImage.includes('rgb(11, 118, 94)'));
 assert.strictEqual(out.floorTabs[0].textColor,'rgb(255, 255, 255)');
 assert.strictEqual(out.floorTabs[1].isSelected,false);
 assert.strictEqual(out.editFloorVisible,true);
 assert.strictEqual(out.addTable.width,124);
});
console.log('R40 staged tests complete: '+passed+' groups');
