#!/usr/bin/env node
/* PMD R38 staged-live regression: no DB writes / no browser requirements. */
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=process.argv[2] || process.cwd();
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const coordinator=read('app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js');
const core=read('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');
const layout=read('app/admin/views/_layouts/default.blade.php');
const css=read('app/admin/assets/css/pmd-owner-floor-stability-r38.css');
const diagnostics=read('app/admin/assets/js/pmd-floor-stability-audit-r38.js');
let passed=0;
const check=(name,run)=>{run();console.log('PASS R38: '+name);passed++};
check('Server renders real single management Floor tab, not invented registry labels',()=>{
 assert(floor.includes('$pmdR38ShowManagementFloorTab = $pmdShowFloorTabs || $pmdFloorCanManageTables'));
 assert(floor.includes('@if($pmdR38ShowManagementFloorTab)'));
 assert(floor.includes('@foreach($pmdFloorRegistry as $pmdFloorRegistryItem)'));
 assert(floor.includes('data-pmd-floor-add')&&floor.includes('data-pmd-floor-manage'));
});
check('JS coordinator preserves one management Floor tab and R35 DOM reuse',()=>{
 assert(coordinator.includes('floors.length > 1 || config.can_manage === true'));
 assert(coordinator.includes('reuseSwitcherR35')&&coordinator.includes('reuseServerFloorR35'));
 assert(coordinator.includes('singleFloorTabsHidden: config.can_manage !== true'));
});
check('Prepaint Floor card geometry is fixed while edits/merge stay enabled',()=>{
 const before=floor.indexOf('PMD_FLOOR_R38_FIRST_PAINT_STATIC_TABLES');
 const after=floor.indexOf('<section\n    id="pmd-r2-shared-floor-canvas-v310"');
 assert(before>=0&&after>before);
 assert(floor.includes('transform: translate(-50%, -50%) !important'));
 assert(floor.includes('width: 108px !important')&&floor.includes('height: 88px !important'));
 assert(floor.includes(':not(.is-floor-transitioning)')&&floor.includes(':not(.is-dragging)'));
});
check('Compact donut empty notices centered without moving real revenue graphics',()=>{
 assert(css.includes('data-pmd-lab-analytics-widget="categorySales"'));
 assert(css.includes('data-pmd-lab-analytics-widget="paymentMethods"'));
 assert(css.includes(':has(> .pmd-r36-empty-notice)'));
 assert(css.includes('position:absolute!important')&&css.includes('inset:0!important'));
 assert(!css.includes('.pmd-dashboard-lab-donut > svg'));
});
check('Real Admin head loads CSS before paint and read-only audit',()=>{
 assert(layout.includes('PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD'));
 assert(layout.includes("request()->is('admin/ownerdashboard*')"));
 assert(layout.includes('data-pmd-floor-stability-r38="css"'));
 assert(layout.includes('data-pmd-floor-stability-r38="js"'));
 assert(diagnostics.includes('window.PMDFloorR38={audit:audit')&&diagnostics.includes('tableGeometry'));
});
check('One-row same-ID refresh avoids unconditional canvas.innerHTML replacement',()=>{
 assert(core.includes('function reuseStableRowNodesR38('));
 assert(core.includes('if (!reuseStableRowNodesR38(rowMarkupR38, structuralSnapshot))'));
 assert(core.includes('canvas.innerHTML = rowMarkupR38;'));
 assert(core.includes('state.editing || state.drag || state.mergeMode'));
});
function mockNode(id,status,inner,klass){
 const attrs=new Map([
  ['data-floor-table',id],['data-status',status],
  ['aria-label','Table '+id+' '+status],
  ['style','left:78px;top:66px;width:108px;height:88px'],
  ['class',klass||'pmd-floor-v1__table']
 ]);
 return {
  innerHTML:inner,
  hasAttribute:k=>attrs.has(k),
  getAttribute:k=>attrs.has(k)?attrs.get(k):null,
  setAttribute:(k,v)=>attrs.set(k,v),
  removeAttribute:k=>attrs.delete(k),
  classList:{contains:k=>(' '+(attrs.get('class')||'')+' ').includes(' '+k+' ')}
 };
}
check('Execute real Floor reconciliation against stable, changed and structural fixtures',()=>{
 const a=core.indexOf('    function reuseStableRowNodesR38(');
 const b=core.indexOf('    function render() {',a);
 assert(a>=0&&b>a);
 const live=mockNode('1','available','<strong>1</strong>');
 const canvas={children:[live]};
 let desired=[mockNode('1','available','<strong>1</strong>')];
 const document={createElement:()=>({set innerHTML(str){this.children=desired;}})};
 const root={
  getAttribute:key=>key==='data-pmd-floor-boot-source'?'server':null,
  __pmdR38PreservedRowRenderCount:0
 };
 const state={
  stripMode:true,initialized:true,editing:false,
  drag:null,mergeMode:false,active:null,selectedDisplayId:null
 };
 const run=new Function('root','state','canvas','document',
  core.slice(a,b)+'\nreturn reuseStableRowNodesR38;')(root,state,canvas,document);
 assert.strictEqual(run('same',null),true);
 assert.strictEqual(canvas.children[0],live);
 desired=[mockNode('1','occupied','<strong>1</strong><span>Occupied</span>')];
 assert.strictEqual(run('status',null),true);
 assert.strictEqual(live.getAttribute('data-status'),'occupied');
 assert(live.innerHTML.includes('Occupied'));
 assert.strictEqual(live.getAttribute('style'),'left:78px;top:66px;width:108px;height:88px');
 desired=[mockNode('1','occupied',''),mockNode('2','available','')];
 assert.strictEqual(run('added',null),false);
 desired=[mockNode('1','occupied','','pmd-floor-v1__table is-merged-card')];
 assert.strictEqual(run('merged',null),false);
 desired=[mockNode('1','occupied','')];
 assert.strictEqual(run('transition',{reason:'layout'}),false);
 state.stripMode=false;
 assert.strictEqual(run('full',null),false);
 assert.strictEqual(root.__pmdR38PreservedRowRenderCount,2);
});
console.log('R38 QA COMPLETE: '+passed+' regression groups');
