#!/usr/bin/env node
/* PMD R43: Floor natural DOM motion + Quick POS brand green.
 * Runs exclusively on staged copies of live R42 VPS files.
 */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=process.argv[2]||process.cwd();
const read=x=>fs.readFileSync(path.join(base,x),'utf8');
const floor=read('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');
const oldCss=read('app/admin/assets/css/pmd-floor-note-range-r42.css');
const audit=read('app/admin/assets/js/pmd-floor-note-range-r42-audit.js');
const pos=read('app/admin/views/pmd_quick_pos_v1.blade.php');
const posCss=read('app/admin/assets/css/pmd-qpos-primary-brand-green-r43.css');
const canonical=read('app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS R43: '+name);}

check('R42 temporary table ghosts are entirely removed, never duplicate numbers',()=>{
 assert(floor.includes('PMD_NATIVE_FLOOR_TRANSLATE_R43'));
 for(const obsolete of [
  'startFloorFlightR42(', 'clearFloorFlightR42(', 'floorFlightR42',
  "document.body.appendChild(host)", "copy.classList.add('pmd-r42-floor-ghost')",
  "root.classList.add('pmd-r42-floor-flight-active')"
 ])assert(!floor.includes(obsolete),'Ghost engine still present: '+obsolete);
 assert(!oldCss.includes('.pmd-r42-floor-flight-active'));
 assert(!oldCss.includes('visibility:hidden!important'));
 assert(!oldCss.includes('.pmd-r42-floor-ghost'));
 assert(oldCss.includes('content:none!important'));
});

check('Animate CSS translate longhand, never the native important centering transform',()=>{
 const start=floor.indexOf('    /* PMD_NATIVE_FLOOR_TRANSLATE_R43');
 const end=floor.indexOf('    function render() {',start);
 assert(start>0&&end>start);
 const section=floor.slice(start,end);
 assert(section.includes("window.CSS.supports('translate', '1px 1px')"));
 assert(section.includes("{translate: dx.toFixed(3) + 'px ' + dy.toFixed(3) + 'px'}"));
 assert(section.includes("{translate: '0px 0px'}"));
 assert(section.includes("fill:'none'"));
 assert(!section.includes("node.style.transform"));
 assert(!section.includes('cloneNode('));
 assert(!section.includes('style.left'));
 assert(!section.includes('style.top'));
 assert(!section.includes('opacity:'));
 assert(!section.includes('source.width'));
 assert(section.includes("node.offsetWidth || target.width"));
 assert(section.includes("node.offsetHeight || target.height"));
});

check('Execute actual R43 controller on 2 real table nodes and verify local-scale motion',()=>{
 const start=floor.indexOf('    var floorViewSnapshotR41 = null;');
 const end=floor.indexOf('    function render() {',start);
 assert(start>=0&&end>start);
 const log=[];
 const root={attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
 let pending=null;
 const window={
   CSS:{supports:(prop,v)=>prop==='translate'&&v==='1px 1px'},
   matchMedia:()=>({matches:false}),
   setTimeout:(fn,ms)=>{pending={fn,ms};return 123;},
   clearTimeout:()=>{pending=null;}
 };
 function makeNode(id,rect,offsetWidth,offsetHeight){
   const node={id,rect,offsetWidth,offsetHeight,animations:[],getAttribute:key=>key==='data-floor-table'?id:null,
     getBoundingClientRect(){return rect;},
     animate(frames,options){
       const animation={frames,options,cancel(){log.push('cancel:'+id);}};
       log.push('animate:'+id);node.animations.push(animation);return animation;
     }};
   return node;
 }
 const n1=makeNode('table-1',{left:300,top:320,width:100,height:80},200,160);
 const n2=makeNode('table-2',{left:400,top:420,width:100,height:80},200,160);
 const canvas={querySelectorAll:(selector)=>selector==='[data-floor-table]'?[n1,n2]:[]};
 const snapshots=[
   {reason:'layout',cards:[
     {id:'table-1',rect:{left:100,top:120,width:100,height:80,centerX:150,centerY:160}},
     {id:'table-2',rect:{left:420,top:435,width:100,height:80,centerX:470,centerY:475}}
   ]},
   {reason:'layout',cards:[
     {id:'table-1',rect:{left:300,top:320,width:100,height:80,centerX:350,centerY:360}},
     {id:'table-2',rect:{left:400,top:420,width:100,height:80,centerX:450,centerY:460}}
   ]}
 ];
 const state={initialized:true,transitionReason:'layout'};
 const actual=new Function('canvas','root','state','transitionSnapshot',
  'sourceForNewCard','window',
  floor.slice(start,end)+'\nreturn {captureFloorViewR41,finishFloorViewR41};');
 const core=actual(canvas,root,state,()=>snapshots.shift(),
   (node,snap)=>snap.cards.find(c=>c.id===node.id)?.rect||null,window);
 core.captureFloorViewR41();
 core.finishFloorViewR41();
 assert.strictEqual(n1.animations.length,1);
 assert.strictEqual(n2.animations.length,1);
 assert.strictEqual(n1.animations[0].frames[0].translate,'-400.000px -400.000px');
 assert.strictEqual(n1.animations[0].frames[1].translate,'0px 0px');
 assert.strictEqual(n2.animations[0].frames[0].translate,'40.000px 30.000px');
 assert.strictEqual(n1.animations[0].options.duration,380);
 assert.strictEqual(n1.animations[0].options.fill,'none');
 assert.strictEqual(pending.ms,420);
 assert.strictEqual(state.transitionReason,null);
 // A second immediate toggle MUST cancel previous motion safely.
 core.captureFloorViewR41();
 assert(log.includes('cancel:table-1'));
 assert(log.includes('cancel:table-2'));
 assert.strictEqual(root.attrs['data-pmd-floor-user-view-transition'],'true');
 core.finishFloorViewR41();
 pending.fn();
 assert.strictEqual(root.attrs['data-pmd-floor-user-view-transition'],undefined);
 assert.deepStrictEqual(log.filter(x=>x==='animate:table-1'||x==='animate:table-2').slice(0,2),
   ['animate:table-1','animate:table-2']);
});

check('Reduced-motion and no-translate fallback never create visual duplicates',()=>{
 const start=floor.indexOf('    var floorViewSnapshotR41 = null;');
 const end=floor.indexOf('    function render() {',start);
 const snap={reason:'layout',cards:[{id:'a',rect:{left:0,top:0,width:80,height:80,centerX:40,centerY:40}}]};
 let count=0;
 const node={offsetWidth:80,offsetHeight:80,getAttribute:()=> 'a',
   getBoundingClientRect:()=>({left:100,top:100,width:80,height:80}),
   animate:()=>{count++;return {cancel(){}};}};
 const canvas={querySelectorAll:()=>[node]};
 function run(supported,reduced) {
   const root={setAttribute(){},removeAttribute(){}};
   const state={initialized:true,transitionReason:'layout'};
   const window={CSS:{supports:()=>supported},matchMedia:()=>({matches:reduced}),
      clearTimeout(){},setTimeout(){return 1;}};
   const get=new Function('canvas','root','state','transitionSnapshot','sourceForNewCard','window',
     floor.slice(start,end)+'\nreturn {captureFloorViewR41,finishFloorViewR41};');
   const ctl=get(canvas,root,state,()=>snap,()=>snap.cards[0].rect,window);
   ctl.captureFloorViewR41();ctl.finishFloorViewR41();
   assert.strictEqual(state.transitionReason,null);
 }
 run(false,false);run(true,true);
 assert.strictEqual(count,0);
});

check('Floor R38 first-paint and real data/coordinates stay managed by canonical engine',()=>{
 assert(floor.includes('reuseStableRowNodesR38(rowMarkupR38, structuralSnapshot)'));
 assert(floor.includes('restoreCanonicalFullFloor();'));
 assert(floor.includes('captureCanonicalFullFloor();'));
 assert(floor.includes('      render();\n\n      fit();'));
 assert(floor.includes('finishFloorViewR41();'));
 const start=floor.indexOf('    function render() {');
 const end=floor.indexOf('    function setStripMode(value) {',start);
 assert(!floor.slice(start,end).includes('captureFloorViewR41();'));
});

check('Quick POS uses normal PMD primary jade only; semantic status buttons unchanged',()=>{
 assert(pos.includes('class="pmd-qpos-body"'));
 assert(pos.includes('id="pmd-quick-pos"'));
 assert(posCss.includes('body.pmd-qpos-body #pmd-quick-pos :is('));
 assert(posCss.includes('linear-gradient(180deg,#0b765e 0%,#075c47 100%)'));
 assert(canonical.includes('linear-gradient(180deg,#0b765e 0%,#075c47 100%)'));
 assert(posCss.includes('.pmd-qpos-floor-tabs button.is-active'));
 assert(posCss.includes('.pmd-qpos-new-check'));
 assert(posCss.includes('.pmd-qpos-history-rail-button-v85'));
 assert(posCss.includes('.pmd-qpos-payment-methods button[data-payment-method="cash"].is-active'));
 assert(posCss.includes('.pmd-qpos-open-checks .pmd-qpos-check-pay-v114'));
 assert(posCss.includes('.pmd-qpos-confirm-accept:not(.is-danger)'));
 assert(posCss.includes(':not(:disabled):not([aria-disabled="true"])'));
 assert(!posCss.includes('.pmd-qpos-table[data-status='));
 assert(!posCss.includes('.pmd-qpos-cart-actions .pay'));
 assert(!posCss.includes('data-payment-method="direct_terminal"'));
 assert(!posCss.includes('.pmd-qpos-product'));
 assert(!posCss.includes('[data-qpos-table-cleaning]'));
 assert(!posCss.includes('background:#032f25'));
});

check('POS stylesheet loads after Web/Android parity and other existing CSS',()=>{
 const first=pos.indexOf('pmd-quick-pos-v1.css?v=');
 const parity=pos.indexOf('pmd-qpos-web-parity-v112.css?v=');
 const reservation=pos.indexOf("asset('app/admin/assets/css/pmd-qpos-reservation-rail-r2.css')");
 const branded=pos.indexOf("asset('app/admin/assets/css/pmd-qpos-primary-brand-green-r43.css')");
 const head=pos.indexOf('</head>');
 assert(first>=0&&parity>=0&&reservation>first&&reservation>parity);
 assert(branded>reservation&&head>branded);
 assert(pos.includes('filemtime(base_path(\'app/admin/assets/css/pmd-qpos-primary-brand-green-r43.css\'))'));
});

check('Read-only audit reports REAL table count and has no ghost renderer',()=>{
 assert(audit.includes('window.PMDFloorR43'));
 assert(audit.includes("version:'43.0.0'"));
 assert(audit.includes("document.querySelectorAll('.pmd-r42-floor-ghost').length"));
 assert(audit.includes("card.getAnimations().length"));
 assert(!audit.includes('appendChild('));
 assert(!audit.includes('fetch('));
 assert.strictEqual((posCss.match(/\{/g)||[]).length,(posCss.match(/\}/g)||[]).length);
 assert.strictEqual((oldCss.match(/\{/g)||[]).length,(oldCss.match(/\}/g)||[]).length);
});

console.log('R43 STAGED QA: '+passed+' groups passed');
