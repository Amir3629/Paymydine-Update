#!/usr/bin/env node
/* PMD R41: run on a STAGED copy of the current dirty VPS. No server writes. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=process.argv[2]||process.cwd();
const read=(p)=>fs.readFileSync(path.join(dir,p),'utf8');
const menu=read('app/admin/widgets/menu/top_menu.blade.php');
const analytics=read('app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php');
const analyticsJs=read('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js');
const floorJs=read('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');
const css=read('app/admin/assets/css/pmd-notification-floor-range-r41.css');
const modalJs=read('app/admin/assets/js/pmd-notification-floor-range-r41.js');
const history=read('app/admin/assets/js/fix-history-button-centering.js');
const head=read('app/admin/views/_layouts/default.blade.php');
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
let count=0;
const check=(label,fn)=>{fn();count++;console.log('PASS R41: '+label);};

check('Staff Note keeps original POST/CSRF/suggestions and uses a real accessible close SVG',()=>{
 assert(menu.includes('id="addGeneralStaffNoteModal" data-pmd-general-staff-note-r41="1"'));
 assert(menu.includes('class="btn-close pmd-note-close-r41" data-dismiss="modal" data-bs-dismiss="modal" aria-label="Close"'));
 assert(menu.includes('<path d="M6 6l12 12M18 6L6 18"></path>'));
 assert(!menu.includes('aria-label="Close" aria-hidden="true"'));
 assert(menu.includes('id="generalStaffNoteSubmitBtn"'));
 assert(menu.includes('data-request="onAddGeneralStaffNote"'));
 assert(menu.includes("fetch('/admin/notifications-api/general-staff-note'"));
 assert(menu.includes("fetch('/admin/notifications-api/note-suggestions'"));
 assert(menu.includes("$('#addGeneralStaffNoteModal').modal('hide')"));
 assert(!menu.includes("$cancel[0].style.setProperty('background'"));
});

check('Real note dialog is portaled, centered, branded, keyboard-safe and responsive',()=>{
 assert(css.includes('html body #addGeneralStaffNoteModal.modal.show'));
 assert(css.includes('display:flex!important;align-items:center!important;justify-content:center!important;'));
 assert(css.includes('z-index:2147483600!important'));
 assert(css.includes('.pmd-note-close-r41 svg'));
 assert(css.includes('width:min(760px,calc(100vw - 30px))'));
 assert(css.includes('border-radius:16px!important'));
 assert(css.includes('linear-gradient(180deg,#0b765e,#075c47)'));
 assert(css.includes('#addGeneralStaffNoteModal .modal-footer .btn:focus-visible'));
 assert(css.includes('@media(max-width:760px)'));
 assert(modalJs.includes('document.body.appendChild(modal)'));
 assert(modalJs.includes('modal.parentElement !== document.body'));
 assert(!modalJs.includes('cloneNode('));
});

check('Note and History controls have matching height even after legacy inline sizing script',()=>{
 assert(css.includes('html body #notification-panel #notif-note-btn,'));
 assert(css.includes('html body #notification-panel #notif-history-link {'));
 assert(css.includes('height:42px!important;min-height:42px!important'));
 assert(history.includes("historyLink.style.setProperty('height', '42px', 'important')"));
 assert(history.includes("historyLink.style.setProperty('padding', '0 14px', 'important')"));
 assert(!history.includes("historyLink.style.setProperty('height', '36px', 'important')"));
});

check('Server first-paint rails expose real count and unit, never the word Range',()=>{
 const pairs=[
  ['salesOverTime','days','$analyticsSalesWindowValue','$analyticsSalesWindowMax'],
  ['salesByHour','hours','$analyticsHourWindowValue','$analyticsHourWindowMax']
 ];
 pairs.forEach(([key,unit,val,max])=>{
   const pos=analytics.indexOf('data-pmd-lab-range-control="'+key+'"');
   assert(pos>=0,key);
   const chunk=analytics.slice(pos,pos+2200);
   assert(chunk.includes('data-pmd-lab-range-unit="'+unit+'"'));
   assert(chunk.includes('data-pmd-lab-range-value'));
   assert(chunk.includes('{{ '+val+' }} / {{ '+max+' }}'));
   assert(chunk.includes('aria-valuetext="Last {{ '+val+' }} of {{ '+max+' }} '+unit+'"'));
 });
 assert(!analytics.includes('pmd-dashboard-lab-analytics__range-label">Range</span>'));
});

check('Rail fills card height, has a longer track and keeps Safari-independent controls',()=>{
 assert(css.includes('.pmd-r41-range-rail'));
 assert(css.includes('top:63px!important;bottom:20px!important'));
 assert(css.includes('height:auto!important;min-height:0!important;max-height:none!important'));
 assert(css.includes('grid-template-rows:42px minmax(0,1fr)!important'));
 assert(css.includes('[data-pmd-lab-range-track]'));
 assert(css.includes('height:100%!important'));
 assert(css.includes('writing-mode:horizontal-tb!important'));
 assert(analyticsJs.includes('function pointerRangeValue('));
 assert(analyticsJs.includes('setPointerCapture'));
 assert(analyticsJs.includes("event.key === 'ArrowUp'"));
});

check('Execute actual range sync: updates human label and accessible aria-valuetext',()=>{
 const begin=analyticsJs.indexOf('  function syncRangeRail(key, value) {');
 const end=analyticsJs.indexOf('  // PMD_ANALYTICS_RANGE_COOKIE_V1',begin);
 assert(begin>=0&&end>begin);
 const attrs={};
 const label={textContent:'5 / 31'};
 const rail={
   getAttribute:key=>key==='data-pmd-lab-range-unit'?'days':null,
   querySelector:sel=>sel==='[data-pmd-lab-range-track]'?track:sel==='[data-pmd-lab-range-value]'?label:null,
   style:{setProperty:(k,v)=>{attrs[k]=v;}}
 };
 const track={setAttribute:(key,value)=>{attrs[key]=value;}};
 const input={min:'5',max:'31',value:'5'};
 const source='function clampRange(input,rawValue){var min=Number(input.min),max=Number(input.max),v=Math.round(Number(rawValue));return Math.max(min,Math.min(max,v));}';
 const fn=new Function('rangeControl','rangeInput',source+'\n'+analyticsJs.slice(begin,end)+'\nreturn syncRangeRail;')(
   ()=>rail,()=>input);
 fn('salesOverTime',19);
 assert.strictEqual(label.textContent,'19 / 31');
 assert.strictEqual(input.value,'19');
 assert.strictEqual(attrs['aria-valuenow'],'19');
 assert.strictEqual(attrs['aria-valuetext'],'Last 19 of 31 days');
 assert.strictEqual(attrs['--pmd-range-progress'],'53.8462%');
});

check('Floor has visible round frame in row/full without clipping its external toolbar',()=>{
 assert(css.includes('#pmd-r2-shared-floor-canvas-v310::after'));
 assert(css.includes('border-radius:18px!important;pointer-events:none!important'));
 assert(css.includes('> .pmd-floor-v1__stage'));
 assert(css.includes('border-radius:17px!important;overflow:hidden!important'));
 assert(css.includes('border-radius:18px!important;background:#f8fbfd!important;overflow:visible!important'));
 assert(floor.includes('id="pmd-r2-shared-floor-canvas-v310"'));
});

check('Explicit Floor mode capture -> final fit -> FLIP and no firstpaint animation',()=>{
 const start=floorJs.indexOf('    var floorViewSnapshotR41 = null;');
 const end=floorJs.indexOf('    function render() {',start);
 assert(start>=0&&end>start);
 const events=[];
 const snapshot={reason:'layout',cards:[{id:'1',rect:{centerX:77,centerY:65}}]};
 let timer=null,attrs={};
 const root={
   querySelector:sel=>sel==='[data-floor-stage]'?{getBoundingClientRect:()=>{events.push('measure-old');return {height:156};}}:null,
   setAttribute:(k,v)=>{attrs[k]=v;events.push('flag');},
   removeAttribute:k=>{delete attrs[k];events.push('cleanup');}
 };
 const win={
   clearTimeout:()=>{timer=null;},
   setTimeout:(callback,ms)=>{timer={callback,ms};return 123;}
 };
 const core=new Function('root','canvas','state','transitionSnapshot','animateStructuralRender','window',
   floorJs.slice(start,end)+'\nreturn {captureFloorViewR41:captureFloorViewR41,finishFloorViewR41:finishFloorViewR41};')(
     root,{}, {initialized:true},
     ()=>{events.push('snapshot');return snapshot;},
     s=>{assert.strictEqual(s,snapshot);events.push('animate-final');},
     win);
 core.captureFloorViewR41();
 events.push('render');
 events.push('fit');
 core.finishFloorViewR41();
 assert.deepStrictEqual(events,['snapshot','flag','measure-old','render','fit','animate-final']);
 assert.strictEqual(timer.ms,420);
 assert.strictEqual(attrs['data-pmd-floor-user-view-transition'],'true');
 timer.callback();
 assert.strictEqual(attrs['data-pmd-floor-user-view-transition'],undefined);
 assert(floorJs.includes('floorViewSnapshotR41 || transitionSnapshot()'));
 assert(floorJs.includes('if (!floorViewSnapshotR41) {'));
 assert(floorJs.includes('finishFloorViewR41();'));
 assert(floorJs.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"));
 assert(css.includes('[data-pmd-floor-user-view-transition="true"]'));
 assert(css.includes('height 360ms cubic-bezier(.2,.8,.2,1)'));
});

check('Actual Admin head R41 assets are linked with filemtime without overriding R29-R40',()=>{
 assert(head.includes('PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD'));
 assert(head.includes("filemtime(base_path('app/admin/assets/css/pmd-notification-floor-range-r41.css'))"));
 assert(head.includes("filemtime(base_path('app/admin/assets/js/pmd-notification-floor-range-r41.js'))"));
 assert(head.includes('PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD'));
 assert(head.includes('PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD'));
 assert(head.includes('PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD'));
 assert.strictEqual((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

console.log('R41 STAGED REGRESSIONS: '+count+' groups successful');
