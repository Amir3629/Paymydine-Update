#!/usr/bin/env node
/* PMD R42: production-safe regression tests for installed R41 source.
 * Run on a STAGED copy; never create/modify tables, notes, orders or staff.
 */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.argv[2]||process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css41=read('app/admin/assets/css/pmd-notification-floor-range-r41.css');
const css42=read('app/admin/assets/css/pmd-floor-note-range-r42.css');
const native=read('app/admin/assets/css/pmd-floor-v1-native-smart-v20.css');
const menu=read('app/admin/widgets/menu/top_menu.blade.php');
const history=read('app/admin/assets/js/fix-history-button-centering.js');
const floor=read('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');
const analytic=read('app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php');
const analyticJs=read('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js');
const audit=read('app/admin/assets/js/pmd-floor-note-range-r42-audit.js');
const head=read('app/admin/views/_layouts/default.blade.php');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS R42: '+name);}
check('R41 blue-alignment-guide pseudo is not revived; Floor retains real root and stage frame',()=>{
 assert(native.includes('rgba(38, 137, 232, .72)'));
 const p=css41.indexOf('#pmd-r2-shared-floor-canvas-v310::after');
 assert(p>=0);
 const pseudo=css41.slice(p,p+170);
 assert(pseudo.includes('content:none!important'));
 assert(pseudo.includes('display:none!important'));
 assert(!pseudo.includes('display:block!important'));
 assert(css42.includes('#pmd-r2-shared-floor-canvas-v310::after'));
 assert(css42.includes('background:transparent!important'));
 assert(css41.includes('border-radius:18px!important;background:#f8fbfd!important;overflow:visible!important'));
 assert(css41.includes('border-radius:17px!important;overflow:hidden!important'));
});
check('Note close is a visible x, calls existing modal hide once and preserves notes API',()=>{
 assert(menu.includes('class="pmd-note-close-r42" aria-label="Close"'));
 assert(menu.includes('<span aria-hidden="true">&times;</span>'));
 assert(menu.includes("onclick=\"$('#addGeneralStaffNoteModal').modal('hide');\""));
 assert(!menu.includes('class="btn-close pmd-note-close-r41"'));
 assert(menu.includes('id="generalStaffNoteSubmitBtn"'));
 assert(menu.includes('<span class="pmd-note-save-label-r42">Save Note</span>'));
 assert(!menu.includes('<i class="fa fa-save"></i>'));
 assert(menu.includes("fetch('/admin/notifications-api/note-suggestions'"));
 assert(menu.includes("fetch('/admin/notifications-api/general-staff-note'"));
 assert(menu.includes("'X-CSRF-TOKEN': '{{ csrf_token() }}'"));
 assert(css42.includes('.pmd-note-close-r42 > span'));
 assert(css42.includes('visibility:visible!important'));
 assert(css42.includes('.pmd-note-save-label-r42'));
 assert(css42.includes('white-space:nowrap!important'));
});
check('Note and History buttons compact and equal size; notification panel remains functional',()=>{
 assert(css42.includes('width:480px!important'));
 assert(css42.includes('#notification-panel #notif-note-btn,'));
 assert(css42.includes('#notification-panel #notif-history-link {'));
 assert(css42.includes('width:88px!important'));
 assert(css42.includes('height:36px!important'));
 assert(css42.includes('text-transform:none!important'));
 assert(history.includes("historyLink.style.setProperty('height', '36px', 'important')"));
 assert(history.includes("historyLink.style.setProperty('padding', '0 12px', 'important')"));
 assert(menu.includes("id=\"header-notification-toggle\""));
 assert(menu.includes('id="notification-list"'));
 assert(menu.includes('href="{{ url(\'/admin/history\') }}"'));
});
check('Sales vertical rails have only real count above unframed long track',()=>{
 assert(analytic.includes('data-pmd-lab-range-unit="days"'));
 assert(analytic.includes('data-pmd-lab-range-unit="hours"'));
 assert(analytic.includes('data-pmd-lab-range-value'));
 assert(!analytic.includes('pmd-dashboard-lab-analytics__range-label">Range</span>'));
 assert(css42.includes('grid-template-rows:19px minmax(0,1fr)!important'));
 assert(css42.includes('border:0!important'));
 assert(css42.includes('background:transparent!important'));
 assert(css42.includes('box-shadow:none!important'));
 assert(css42.includes('.pmd-r41-range-label small {'));
 assert(css42.includes('display:none!important'));
 assert(css42.includes('[data-pmd-lab-range-track]'));
 assert(css42.includes('height:100%!important'));
 assert(analyticJs.includes('setPointerCapture'));
 assert(analyticJs.includes("track.setAttribute('aria-valuetext'"));
});
check('Floor user-only ghost flight is not invoked by refresh/render/first paint',()=>{
 const capture=floor.indexOf('    function captureFloorViewR41() {');
 const render=floor.indexOf('    function render() {',capture);
 const strip=floor.indexOf('    function setStripMode(value) {');
 const finish=floor.indexOf('      finishFloorViewR41();',strip);
 assert(capture>=0&&render>capture&&strip>render&&finish>strip);
 assert(floor.slice(strip,finish).includes('captureFloorViewR41();'));
 assert(floor.slice(strip,finish).includes('restoreCanonicalFullFloor();'));
 assert(floor.slice(strip,finish).includes('      render();\n\n      fit();'));
 assert(!floor.slice(render,strip).includes('startFloorFlightR42('));
 assert(floor.includes("copy.removeAttribute('data-floor-table')"));
 assert(floor.includes("copy.removeAttribute('data-status')"));
 assert(floor.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"));
 assert(floor.includes("root.classList.add('pmd-r42-floor-flight-active')"));
 assert(css42.includes('.pmd-r42-floor-flight-active'));
 assert(css42.includes('visibility:hidden!important'));
});
check('Execute real R42 FLIP with old and final viewport coordinates and safe cleanup',()=>{
 const start=floor.indexOf('    var floorViewSnapshotR41 = null;');
 const end=floor.indexOf('    function render() {',start);
 assert(start>=0&&end>start);
 const events=[],attributes={},classes=new Set();
 const cssStyle=()=>({values:{},setProperty(k,v,p){this.values[k]={value:v,priority:p||''};},removeProperty(k){delete this.values[k];}});
 const makeClone=()=>({
   classList:{add:x=>events.push('ghost-class:'+x)},
   style:cssStyle(),children:[],attributes:{},
   removeAttribute(x){delete this.attributes[x];},
   setAttribute(k,v){this.attributes[k]=v;},
   querySelectorAll:()=>[],
   animate(frames,opts){events.push('flight-animate');this.frames=frames;this.opts=opts;return {};}
 });
 const firstRect={left:120,top:280,width:108,height:88,centerX:174,centerY:324};
 const newRect={left:290,top:360,width:108,height:88};
 const original={
   getAttribute:x=>x==='data-floor-table'?'table-1':x==='data-status'?'available':'',
   getBoundingClientRect:()=>newRect
 };
 const originalList=[original];
 const canvas={querySelectorAll:s=>s==='[data-floor-table]'?originalList:[]};
 let flying=null;
 const body={appendChild(node){node.parentNode=this;flying=node;events.push('flight-host-added');},
   removeChild(node){if(flying===node)flying=null;node.parentNode=null;events.push('flight-host-removed');}};
 const document={
   body,
   createElement(tag){assert.strictEqual(tag,'div');return {
     tagName:tag,attributes:{},entries:[],parentNode:null,
     setAttribute(k,v){this.attributes[k]=v;},
     appendChild(node){this.entries.push(node);events.push('ghost-added');}
   };}
 };
 const stage={getBoundingClientRect(){events.push('measure-previous-stage');return {height:156};}};
 const rootEl={
   classList:{add:k=>{classes.add(k);events.push('add-class:'+k);},
     remove:k=>{classes.delete(k);events.push('remove-class:'+k);}},
   querySelector:s=>s==='[data-floor-stage]'?stage:null,
   setAttribute(k,v){attributes[k]=v;},
   removeAttribute(k){delete attributes[k];}
 };
 let timer=null;
 const window={
   matchMedia:()=>({matches:false}),
   getComputedStyle:()=>({getPropertyValue:k=>({
     background:'rgb(34,201,111)',color:'rgb(6,27,20)',
     'background-color':'rgb(34,201,111)','border-color':'rgb(8,124,77)',
     'border-width':'1px','border-style':'solid','border-radius':'24px',
     'font-family':'Arial','font-size':'13px','font-weight':'700',
     padding:'8px',opacity:'1'
   }[k]||'')}),
   setTimeout(fn,ms){timer={fn,ms};return 11;},
   clearTimeout(){timer=null;}
 };
 const state={initialized:true,transitionReason:'layout'};
 const snapshot={reason:'layout',cards:[{id:'table-1',members:[],rect:firstRect,clone:makeClone()}]};
 const execute=new Function('canvas','root','state','transitionSnapshot','animateStructuralRender','window','document','clean',
   floor.slice(start,end)+'\nreturn {captureFloorViewR41,finishFloorViewR41};');
 const ops=execute(canvas,rootEl,state,()=>{events.push('snapshot-old');return snapshot;},
   ()=>{throw Error('R41 transform animation should not run during flight');},
   window,document,s=>String(s).trim());
 ops.captureFloorViewR41();
 assert(flying);
 assert(classes.has('pmd-r42-floor-flight-active'));
 const copy=flying.entries[0];
 assert.strictEqual(copy.style.values.left.value,'120px');
 assert.strictEqual(copy.style.values.top.value,'280px');
 assert.strictEqual(copy.style.values.background.value,'rgb(34,201,111)');
 assert.strictEqual(copy.style.values.transform.priority,'important');
 events.push('render-canonical-final');
 events.push('fit-final');
 ops.finishFloorViewR41();
 assert.strictEqual(copy.frames[0].left,'120px');
 assert.strictEqual(copy.frames[0].top,'280px');
 assert.strictEqual(copy.frames[1].left,'290px');
 assert.strictEqual(copy.frames[1].top,'360px');
 assert.strictEqual(copy.opts.duration,420);
 assert.deepStrictEqual(events.filter(x=>['snapshot-old','render-canonical-final','fit-final','flight-animate'].includes(x)),
  ['snapshot-old','render-canonical-final','fit-final','flight-animate']);
 assert.strictEqual(timer.ms,455);
 timer.fn();
 assert.strictEqual(flying,null);
 assert(!classes.has('pmd-r42-floor-flight-active'));
 assert.strictEqual(attributes['data-pmd-floor-user-view-transition'],undefined);
 assert.strictEqual(state.transitionReason,null);
});
check('CSS and real Admin head assets load; audit is read-only',()=>{
 assert(head.includes('PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD'));
 assert(head.includes("filemtime(base_path('app/admin/assets/css/pmd-floor-note-range-r42.css'))"));
 assert(head.includes("filemtime(base_path('app/admin/assets/js/pmd-floor-note-range-r42-audit.js'))"));
 assert(head.includes('PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD'));
 assert(head.includes('PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD'));
 assert(audit.includes('blueFloorPseudoElementDisabled'));
 assert(audit.includes('notificationButtonSizes'));
 assert(audit.includes('flightCopies'));
 assert(!audit.includes('MutationObserver'));
 assert(!audit.includes('fetch('));
 assert.strictEqual((css42.match(/\{/g)||[]).length,(css42.match(/\}/g)||[]).length);
});
console.log('R42 STAGED REGRESSIONS: '+checks+' groups passed');
