#!/usr/bin/env node
/* R35: deterministic, read-only Node regression for Floor first paint.
 * No browser, credentials, network, DB or writes involved.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=process.env.PMD_R35_TEST_ROOT||path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(ROOT,name),'utf8');
const js=read('app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js');
const css=read('app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css');
const layout=read('app/admin/views/_layouts/default.blade.php');
const floorBlade=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const floorCore=read('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');

assert.ok(css.includes('PMD_DASHBOARD_FLOOR_FLAT_TABLES_R35'));
assert.ok(css.includes('border-width:1px!important;'));
assert.match(css,/\.pmd-floor-v1__table\[data-floor-table\]:not\(\.is-selected\):not\(\.is-dragging\)[^{]*\{[^}]*box-shadow:none!important/s);
assert.match(css,/\.pmd-floor-v1__table\[data-floor-table\]:not\(\.is-selected\):not\(\.is-dragging\):hover\s*\{[^}]*box-shadow:none!important/s);
assert.ok(!/box-shadow\s*:\s*0\s+0\s+0\s+6px/.test(css),'R34 colored outer halo must not return');
assert.ok(css.includes('button:is([data-pmd-lab-chart-mode],[data-pmd-lab-period])'));
assert.ok(css.includes('background-image:linear-gradient(180deg,#0b765e 0%,#075c47 100%)!important;'));
assert.ok(layout.includes('data-pmd-dashboard-switcher-firstpaint-r34="css"'));
assert.ok(layout.includes('PMD_PLATFORM_UI_REPORT_R33_ASSET'));
assert.ok(floorBlade.includes('data-pmd-floor-boot-source="server"'));
assert.ok(floorBlade.includes('data-pmd-active-floor-id="{{ $pmdFloorActiveId }}"'));
assert.ok(floorCore.includes('PMD_DASHBOARD_LAB_SERVER_DOM_ADOPTION_V2'));
assert.ok(floorCore.includes('canvas.innerHTML ='),'Underlying renderer still exists for real interactions');
assert.ok(js.includes('PMD_SHARED_FLOOR_SERVER_DOM_ADOPTION_R35'));
assert.ok(js.includes('PMD_SHARED_FLOOR_BOOT_NO_REPAINT_R35'));
assert.ok(js.includes('bootFloorDomPreservedR35'));
assert.ok(js.includes('switcherDomReusedCountR35'));
assert.ok(!js.includes('window.location.reload()'));

// Extract actual shared Floor helpers into a tiny deterministic harness.
function extract(start,end) {
  const a=js.indexOf(start);
  const b=js.indexOf(end,a+start.length);
  assert.ok(a>0&&b>a,'Missing helper anchors: '+start);
  return js.slice(a,b);
}
const switcherSource=extract('    function renderSwitcher() {','    function applyActiveFloor(');
const activeSource=extract('    function applyActiveFloor(','    function adoptRegistry(');

class FakeElement {
  constructor(attrs={},text='') {
    this.attributes={...attrs};
    this.textContent=text;
    this.className=attrs.class||'';
    this.type='';
    this.classList={
      contains:(name)=>this.className.split(/\s+/).includes(name),
      toggle:(name,force)=>{
        const parts=new Set(this.className.split(/\s+/).filter(Boolean));
        if(force)parts.add(name); else parts.delete(name);
        this.className=[...parts].join(' ');
      }
    };
  }
  getAttribute(name){return this.attributes[name]===undefined?null:this.attributes[name];}
  hasAttribute(name){return this.attributes[name]!==undefined;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  get outerHTML(){
    return '<button data-pmd-floor-switch="'+String(this.getAttribute('data-pmd-floor-switch')||'')+'">'+this.textContent+'</button>';
  }
}
const floors=[{id:'main',name:'Indoor'},{id:'second',name:'Second'}];
const floorNode=(floor,selected)=>new FakeElement({
  'data-pmd-floor-switch':floor.id,
  'aria-selected':selected?'true':'false',
  role:'tab',
  class:'pmd-shared-floor-switcher__floor'+(selected?' is-active':'')
},floor.name);
const first=floorNode(floors[0],true);
const second=floorNode(floors[1],false);
const add=new FakeElement({'data-pmd-floor-add':''},'Add floor');
const manage=new FakeElement({'data-pmd-floor-manage':''},'Edit floor');
const divider={hidden:false};
const switcher={
  children:[first,second,add,manage],
  hidden:false,
  htmlWriteCount:0,
  set innerHTML(v){this.htmlWriteCount++;this.lastHtml=v;},
  querySelector(selector){
    if(selector.includes('[data-pmd-floor-add]'))return add;
    if(selector.includes('[data-pmd-floor-manage]'))return manage;
    return null;
  }
};
const clean=x=>String(x??'').trim();
const root={querySelector:selector=>selector==='[data-pmd-floor-switcher-divider]'?divider:null};
const runSwitcher=new Function('switcher','floors','root','clean','document','hasCustomFloor','setManageVisibility',
  "var activeId='main'; var switcherDomReusedCountR35=0;\n"+
  switcherSource+
  "\nreturn {render:renderSwitcher,setActive:function(id){activeId=id;},reused:function(){return switcherDomReusedCountR35;}};");
const switchHarness=runSwitcher(switcher,floors,root,clean,
  {createElement:()=>new FakeElement()},()=>true,()=>{});
switchHarness.render();
assert.equal(switcher.htmlWriteCount,0,'Initial SSR floor tabs must NOT be replaced');
assert.equal(switchHarness.reused(),1);
switchHarness.setActive('second');
switchHarness.render();
assert.equal(switcher.htmlWriteCount,0,'Switching an existing floor must update existing buttons');
assert.equal(first.classList.contains('is-active'),false);
assert.equal(second.classList.contains('is-active'),true);
assert.equal(second.getAttribute('aria-selected'),'true');
assert.strictEqual(switcher.children[1],second,'DOM identity must be retained');
floors.push({id:'third',name:'Third'});
switchHarness.render();
assert.equal(switcher.htmlWriteCount,1,'New registry Floor must still reconstruct the switcher');

// The original Floor core render() replaces canvas.innerHTML. R35 bypasses
// that only for initial matching boot, never for a user switching Floor.
let clearCalls=0;
const attrs={
  'data-pmd-floor-boot-source':'server',
  'data-pmd-floor-hydrated':'true',
  'data-pmd-active-floor-id':'main'
};
const floorRoot={
  getAttribute:name=>attrs[name]??null,
  setAttribute:(name,value)=>{attrs[name]=String(value);},
  querySelector:()=>null
};
const state={
  editing:false,active:null,selectedDisplayId:null,mergeMode:false,
  mergeSelection:[],payload:{},tables:[]
};
const instance={clearSelection:()=>{clearCalls++;},fit:()=>{throw Error('Unexpected fit during boot');}};
const key=x=>clean(x).toLowerCase();
const allTables=[{id:'1',floor:'Indoor'},{id:'2',floor:'Second'}];
const activeFactory=new Function(
  'root','state','instance','window','CustomEvent','floorById',
  'canonicalFloorName','floorNameFor','allTables','key','clean',
  'writeCookie','renderSwitcher','updateTableFloorSelect',
  "var activeId='main'; var activeName='Indoor'; var bootFloorDomPreservedR35=false;\n"+
  activeSource+
  "\nreturn {apply:applyActiveFloor,preserved:function(){return bootFloorDomPreservedR35;}};"
);
const eventTypes=[];
const activeHarness=activeFactory(
  floorRoot,state,instance,
  {dispatchEvent:event=>eventTypes.push(event.type)},
  function Event(name,{detail}){this.type=name;this.detail=detail;},
  id=>floors.find(x=>x.id===id),x=>x,x=>x.floor,allTables,key,clean,
  ()=>{},()=>{},()=>{}
);
assert.equal(activeHarness.apply('main',{
  persist:true,refit:false,reuseServerDom:true
}),true);
assert.equal(clearCalls,0,'Boot must NOT repaint identical server Floor DOM');
assert.equal(activeHarness.preserved(),true);
assert.equal(state.tables.length,1,'Active Floor filter still applies');
assert.equal(attrs['data-pmd-active-floor-id'],'main');
assert.equal(activeHarness.apply('second',{persist:false,refit:false}),true);
assert.equal(clearCalls,1,'User switching Floors MUST re-render');
assert.equal(state.tables.length,1);
assert.equal(attrs['data-pmd-active-floor-id'],'second');
assert.equal(eventTypes.length,2);
console.log('PASS R35: flat table borders/no halos; SSR Floor cards and tabs retained at boot; floor selection and registry changes still work; R34 jade chart controls preserved.');
