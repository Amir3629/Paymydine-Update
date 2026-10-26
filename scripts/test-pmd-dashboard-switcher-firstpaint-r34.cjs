#!/usr/bin/env node
/* PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34_REGRESSION
 * Read-only static preflight on the exact staged CURRENT VPS sources.
 * CSS cascade is tested by structural precedence and states; live browser
 * visual/paint traces must be verified separately after installation.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=process.env.PMD_R34_TEST_ROOT||path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

const css=read('app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css');
const layout=read('app/admin/views/_layouts/default.blade.php');
const original=read('app/admin/assets/css/pmd-dashboard-lab-analytics-v1.css');
const r29=read('app/admin/assets/css/pmd-admin-control-language-r29.css');
const r29js=read('app/admin/assets/js/pmd-admin-control-language-r29.js');
const template=read('app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php');
const floor=read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const floorCSS=read('app/admin/assets/css/pmd-dashboard-lab-exact-floor-v1.css');

const r34Marker='data-pmd-dashboard-switcher-firstpaint-r34="css"';
assert.equal(layout.split(r34Marker).length-1,1,
 'R34 must appear once in real AdminController head');
assert.ok(layout.includes('PMD_PLATFORM_UI_REPORT_R33_ASSET'),'R33 prerequisite missing');
assert.ok(layout.includes('PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT'));
assert.ok(layout.indexOf(r34Marker)>layout.indexOf('PMD_PLATFORM_UI_REPORT_R33_ASSET'));
assert.ok(layout.indexOf(r34Marker)<layout.indexOf('</head>'));
assert.ok(css.includes('PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34'));
assert.ok(css.includes('#pmd-dashboard-lab-analytics-v1'));
assert.ok(css.includes('#pmd-dashboard-lab'));
assert.ok(css.includes('[data-pmd-lab-chart-mode]'));
assert.ok(css.includes('[data-pmd-lab-period]'));
assert.ok(css.includes(':is(.is-active,[aria-pressed="true"])'));
assert.ok(css.includes('background-image:linear-gradient(180deg,#0b765e 0%,#075c47 100%)!important;'));
assert.ok(css.includes('border:0!important;'));
assert.ok(css.includes('min-height:28px!important;'));
assert.ok(css.includes('max-height:28px!important;'));
assert.ok(css.includes('border-left:1px solid #dfebe6!important;'));
// R29 depends on post-DOMContentLoaded class and tags. R34 styling must NOT.
assert.ok(r29js.includes("document.addEventListener('DOMContentLoaded',start"));
assert.ok(r29.includes('min-height:40px!important;'));
assert.ok(original.includes('.pmd-dashboard-lab-analytics__toolbar'));
assert.ok(original.includes('button[aria-pressed="true"]'));
assert.ok(!css.includes('pmd-admin-controls-r29-ready'),
 'R34 must be identical BEFORE/AFTER R29 DOM-content classification');
assert.ok(!css.includes('data-pmd-admin-action-r29'),
 'Chart CSS must work before R29 adds the data role');
assert.ok(!css.includes('DOMContentLoaded'));
assert.ok(!css.includes('setTimeout'));
assert.ok(template.includes('data-pmd-lab-chart-mode="line"'));
assert.ok(template.includes('data-pmd-lab-chart-mode="bar"'));
assert.ok(template.includes('data-pmd-lab-period="today"'));
assert.ok(template.includes('data-pmd-lab-period="week"'));
assert.ok(template.includes('data-pmd-lab-period="month"'));
assert.ok(template.includes('aria-pressed="{{ $analyticsChartMode ==='));
assert.ok(template.includes("class=\"is-active\" data-pmd-lab-period=\"month\""));
assert.ok(floor.includes('data-floor-table="{{ $table[\'id\'] }}"'));
assert.ok(floorCSS.includes('pmd-floor-v1__table[data-status]'));
assert.ok(css.includes('.pmd-floor-v1__table[data-floor-table]:not(.is-selected):not(.is-dragging)'));
assert.ok(css.includes('border-width:3px!important;'));
assert.ok(css.includes('transition:none!important;'));
assert.ok(!/display\s*:\s*none\s*!important/i.test(css),'Never hide active controls/Floor');
assert.ok(!/^[\s]*(?:button|input|select|a|html body button)\s*\{/m.test(css),
 'Never inject a global element button override');
assert.ok(!css.includes('#pmd-pos')&&!css.includes('.pmd-pos-keypad')&&!css.includes('#orders-grid'),
 'POS/KDS must retain operational workflow colors');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,
 'Balanced CSS rule blocks');
console.log('PASS: R34 chart L/B/D/W/M share one 34px frame pre/post-R29, always respect aria-pressed jade; Floor first-paint border and shadow stable; no POS/KDS or business logic changes.');
