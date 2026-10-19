#!/usr/bin/env node
/*
 * PMD_SERVICE_CALENDAR_UI_R2_CONTRACT
 * No network or tenant writes. Checks only the three changed page files.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const css = read('app/admin/assets/css/pmd-settings-service-calendar-r1.css');
const js = read('app/admin/assets/js/pmd-settings-service-calendar-r1.js');
const blade = read('app/admin/views/pmdsettings/restaurant.blade.php');

new Function(js);
assert(css.includes('PMD_RESTAURANT_SERVICE_CALENDAR_UI_R2'));
assert(css.includes('grid-template-columns:repeat(7,minmax(0,1fr))'));
assert(css.includes('[data-pmd-service-window]'));
assert(css.includes('[data-pmd-service-closed-list]'));
assert(css.includes('@media (max-width:560px)'));
assert((css.match(/{/g) || []).length === (css.match(/}/g) || []).length);
for (const name of [
  'data-pmd-hours-row','data-pmd-hours-enabled','data-pmd-service-windows',
  'data-pmd-service-add','data-pmd-service-remove','data-pmd-service-hint',
  'data-pmd-service-calendar','data-pmd-service-closed-json',
  'data-pmd-service-closed-count','data-pmd-service-date-input',
  'schedule[advance_days]','schedule[closed_dates_json]'
]) {
  assert(blade.includes(name), 'Missing original data or new UI control: ' + name);
}
assert(js.includes("toggle.checked = false"), 'Deleting last service must close the day');
assert(js.includes('readableDate.format(date)'), 'Closure dates need localized labels');
assert(js.includes("document.createElement('button')"), 'Chips must remain accessible buttons');
assert(js.includes('notifyDirty()'), 'Existing contextual save workflow must stay');
assert(!/fetch\s*\(/.test(js), 'UI polish must not add a second API writer');

const a = js.indexOf('    function minutes(clock) {');
const b = js.indexOf('    function setHint(row', a);
assert(a >= 0 && b > a, 'Independent period suggestion is unavailable');
const funcs = new Function(js.slice(a, b) + 'return {minutes,proposeWindow};')();
const fake = pairs => ({
  querySelectorAll: () => pairs.map(([start, end]) => ({
    querySelector: selector => ({
      value: selector === '[data-pmd-service-open]' ? start : end
    })
  }))
});
assert.strictEqual(funcs.minutes('18:35'), 1115);
assert.strictEqual(funcs.minutes('25:00'), null);
assert.deepStrictEqual(funcs.proposeWindow(fake([['11:30','15:00']])), ['18:00','22:00']);
assert.deepStrictEqual(funcs.proposeWindow(fake([['00:00','23:59']])), ['','']);
assert.deepStrictEqual(funcs.proposeWindow(fake([['18:00','22:00']])), ['11:30','15:00']);
assert.deepStrictEqual(funcs.proposeWindow(fake([['21:00','02:00']])), ['11:30','15:00']);

console.log('PASS: calendar R2 UI, 24h parsing, non-overlapping suggestions, form controls and responsive CSS');
