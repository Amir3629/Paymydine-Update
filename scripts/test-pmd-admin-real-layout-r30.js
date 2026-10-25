#!/usr/bin/env node
/* PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT_TEST
 * Read-only regression for the controller's ACTUAL Admin layout, not the
 * similarly named unused Blade template targeted by R29.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const load = p => fs.readFileSync(path.join(root,p),'utf8');
const actual = load('app/admin/views/_layouts/default.blade.php');
const controller = load('app/admin/classes/AdminController.php');
const css = load('app/admin/assets/css/pmd-admin-control-language-r29.css');
const js = load('app/admin/assets/js/pmd-admin-control-language-r29.js');
const prefix = 'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT';
const refCSS='data-pmd-admin-control-language-r29="css"';
const refJS='data-pmd-admin-control-language-r29="js"';

assert.ok(controller.includes("$this->layout = $this->layout ?: 'default'"),
  'AdminController default must resolve to default layout');
assert.ok(controller.includes("'~/app/admin/views/_layouts'"),
  'AdminController actual layout location must be _layouts');
assert.ok(actual.includes('PMD_PLATFORM_CARD_SYSTEM_V3_REAL_ADMIN_LAYOUT_HEAD'),
  'Verify this is the real Admin shell, not the unused layouts/default');
assert.equal(actual.split('<!-- '+prefix+':').length-1,1,
  'One R30 marker in the real layout');
assert.equal(actual.split(refCSS).length-1,1,'R29 CSS loaded exactly once in active layout');
assert.equal(actual.split(refJS).length-1,1,'R29 JS loaded exactly once in active layout');
assert.equal(actual.split('data-pmd-admin-control-layout-r30="real"').length-1,2,
  'Both CSS and JS include the R30 live-layout proof');
assert.equal(actual.split('</head>').length-1,1,'One real document head');
const r30 = actual.indexOf('<!-- '+prefix+':');
assert.ok(r30 > actual.indexOf('PMD_PLATFORM_CARD_SYSTEM_V3_REAL_ADMIN_LAYOUT_HEAD'),
  'R30 loaded AFTER old Admin button styles');
assert.ok(r30 < actual.indexOf('</head>'),'R30 styles actually in head');
assert.ok(actual.includes('get_style_tags()'),'Real view contains Admin compiled CSS');
assert.ok(actual.indexOf('<body class="page') > actual.indexOf('</head>'),
  'R30 styles load before visible UI renders');
assert.ok(actual.includes('@filemtime(base_path('),
  'Cache-busting tied to real asset mtimes');
assert.ok(actual.includes('data-pmd-admin-control-language-r29="js"') &&
          actual.includes('<script defer'),'R29 role-runtime deferred');
assert.ok(css.includes('select:not([multiple]):not([size])'),
  'Inventory native dropdown radius fix in R29 CSS');
assert.ok(css.includes('border-radius:16px!important'),
  'Inventory 16px select shape is actually registered');
assert.ok(css.includes('linear-gradient(180deg,#0b765e 0%,#075c47 100%)'),
  'Create Table approved gradient');
assert.ok(css.includes('data-pmd-admin-action-r29="primary"'),
  'Shared Admin primary skin exists');
assert.ok(js.includes('pmd-admin-controls-r29-ready'),
  'Runtime enables corresponding root class');
assert.ok(js.includes('MutationObserver'),
  'Dynamic Admin control tags are applied');
assert.ok(js.includes('#pmd-inventory-v1'),
  'R28 Inventory business controls keep their own styles');
assert.doesNotThrow(()=>new vm.Script(js),'R29 JS parses');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,
  'R29 CSS brace balance');
console.log('PASS: Real AdminController _layouts/default actually loads R29 CSS/JS after legacy styles; Inventory select, buttons and live-layout evidence wired.');
