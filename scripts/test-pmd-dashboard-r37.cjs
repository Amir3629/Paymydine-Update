#!/usr/bin/env node
/* PMD R37 — run against *staged live VPS* files, not a clean checkout. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.argv[2]||process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
function check(title,fn){fn();checks.push(title);console.log('PASS R37:',title);}
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const floorJs=read('app/admin/assets/js/pmd-dashboard-empty-r36.js');
const floorCss=read('app/admin/assets/css/pmd-dashboard-floor-empty-r36.css');
const analytics=read('app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php');
const client=read('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js');
const staff=read('app/admin/views/_partials/pmd_online_staff_card_v1.blade.php');
const staffJs=read('app/admin/assets/js/pmd-online-staff-live-v1.js');
const resA=read('app/admin/views/_partials/pmd_reservations_lab_cards_v1.blade.php');
const resB=read('app/admin/views/_partials/pmd_reservations_cards_v1.blade.php');
const resJs=read('app/admin/assets/js/pmd-reservations-live-sync-v1.js');
const shifts=read('app/admin/views/pmdshifts/_server_rota_v13.blade.php');
const native=read('app/admin/views/_partials/pmd_floor_map_v1.blade.php');
const css=read('app/admin/assets/css/pmd-shared-empty-states-r37.css');
const js=read('app/admin/assets/js/pmd-shared-empty-states-r37.js');
const layout=read('app/admin/views/_layouts/default.blade.php');
check('R29 explicitly excluded from Floor switcher, while controls remain',()=>{
 assert(/data-pmd-admin-control-ignore[\s\S]{0,50}data-pmd-floor-switcher/.test(floor));
 assert(floor.includes('data-pmd-floor-manage')&&floor.includes('data-pmd-floor-table-add'));
 assert(floorCss.includes('font-family:-apple-system')&&floorCss.includes('letter-spacing:0!important'));
 assert(floorCss.includes('width:132px!important')&&floorCss.includes('height:52px!important'));
});
check('Floor has exactly one icon and no duplicate Add/Create Table callout',()=>{
 const part=floor.slice(floor.indexOf('PMD_DASHBOARD_FLOOR_EMPTY_R37'),floor.indexOf('pmd-floor-v1__canvas-wrap'));
 assert(part.includes('pmd-r37-empty-icon'));
 assert(!part.includes('pmd-floor-r36-empty__icon')&&!part.includes('data-pmd-floor-empty-add-r36'));
 assert(!part.includes('Create your first table'));
 assert(!floorJs.includes('original.click()')&&!floorJs.includes('data-pmd-floor-empty-add-r36'));
});
check('No-data badges centered in chart rather than offset by Range rail',()=>{
 assert(css.includes('.pmd-dashboard-lab-analytics__body > .pmd-r36-empty-notice'));
 assert(css.includes('left:0!important;right:0!important;bottom:0!important'));
 assert(css.includes('width:100%!important')&&css.includes('justify-content:center!important'));
});
check('SSR and live analytics agree on zero-only and real first-data behavior',()=>{
 const reasons=['No payments recorded in this period','No tips recorded in this period','No upcoming events','No active alerts right now','No active alerts reported; some sources are unavailable','No orders in this period','No category sales recorded in this period'];
 for(const label of reasons)assert(analytics.includes(label)&&client.includes(label),label);
 assert(analytics.includes('pmdR37HasPayments')&&client.includes('hasPayments'));
 assert(analytics.includes('pmdR37HasTips')&&client.includes('hasTips'));
 assert(analytics.includes('pmdR37AlertsEmpty')&&client.includes('hasActiveAlerts'));
});
check('Staff Online data-unavailable vs zero remains explicit; first staff replaces notice',()=>{
 assert(staff.includes('!$pmdStaffConnected')&&staff.includes('pmd-r37-empty-message'));
 assert(staffJs.includes('setEmptyNotice(empty, message)'));
 assert(staffJs.includes('content.replaceChildren(list)'));
 assert(staff.includes("Staff presence is unavailable for this location."));
});
check('Reservations SSR and live refresh show identical icon; existing Add reservation stays',()=>{
 for(const file of [resA,resB])assert(file.includes('data-pmd-res-lab-card-create')&&file.includes('pmd-r37-reservations-empty'));
 assert(resJs.includes('pmd-r37-reservations-empty')&&resJs.includes('data-pmd-reservations-empty-card'));
});
check('Shifts + Member and native Floor remain functional',()=>{
 assert(shifts.includes('pmd-r37-shifts-empty')&&shifts.includes('data-pmd-team-open'));
 assert(native.includes('data-floor-empty')&&native.includes('pmd-r37-empty-icon'));
 assert(js.includes('MutationObserver')&&js.includes('empty.hidden'));
});
check('R37 assets load in actual Admin head on the requested pages',()=>{
 assert(layout.includes('PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD'));
 assert(layout.includes("request()->is('admin/reservations*')"));
 assert(layout.includes("request()->is('admin/pmdshifts*')"));
 assert(layout.includes('data-pmd-shared-empty-states-r37="css"'));
 assert(layout.includes('data-pmd-shared-empty-states-r37="js"'));
});
console.log('R37 staging QA complete:',checks.length,'checks');
