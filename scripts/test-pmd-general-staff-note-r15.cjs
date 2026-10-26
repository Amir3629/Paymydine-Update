#!/usr/bin/env node
'use strict';
/* R15: regression assertions for the real General Staff Note entrypoint.
 * Run on the staged installer copy AND on the deployed VPS.
 * Live browser rendering is verified separately, not simulated here.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const js = read('app/admin/assets/js/pmd-general-note-notification-r14.js');
const css = read('app/admin/assets/css/pmd-general-note-notification-r14.css');
const header = read('app/admin/widgets/menu/top_menu.blade.php');
const owner = read('app/admin/assets/js/pmd-owner-hour-team-notes-r11.js');
new vm.Script(js,{filename:'pmd-general-note-notification-r14.js'});
assert(header.includes('id="addGeneralStaffNoteModal"'), 'Keep the original modal.');
assert(header.includes('id="addGeneralStaffNoteForm"'), 'Do not replace existing form.');
assert(header.includes('id="generalStaffNoteSubmitBtn"'), 'Do not replace save action.');
assert(header.includes('id="notif-note-btn"'), 'Keep the notification entrypoint.');
assert(header.includes('20261026-r15'), 'New CSS/JS must be cache-busted.');
assert(js.includes("modal.classList.remove('fade')"), 'Remove the broken Bootstrap opening animation.');
assert(js.includes("modal.parentElement !== document.body"), 'Portal actual original modal to BODY.');
assert(js.includes("modal.setAttribute('data-pmd-general-note-r15', '1')"), 'Single scoped R15 authority required.');
assert(js.includes("close.textContent = '\\u00d7'") || js.includes("close.textContent = '\u00d7'"), 'Close must use a visible text glyph, not broken SVG.');
assert(js.includes("header.appendChild(close)"), 'R15 must add a real visible close button.');
assert(js.includes("cssImportant(obsolete, 'display', 'none')"), 'Hide duplicate old R41/R42 close controls.');
assert(js.includes("label.textContent = 'Cancel'"), 'Cancel must have its own visible text node.');
assert(js.includes("$(modal).modal('hide')"), 'Original Bootstrap lifecycle must close once.');
assert(!js.includes('fetch('), 'Do not introduce new API calls.');
assert(!js.includes('cloneNode('), 'Never clone a bound Bootstrap form.');
assert(css.includes('#addGeneralStaffNoteModal[data-pmd-general-note-r15="1"]'), 'R15 css must outrank older sheets.');
assert(css.includes('animation:none!important;transition:none!important;transform:none!important'), 'No open/close slide/zoom.');
assert(css.includes('button[data-pmd-r15-note-close]'), 'Visible close control styles required.');
assert(css.includes('-webkit-text-fill-color:#143b32!important'), 'Safari text close must be visible.');
assert(css.includes('button.btn-secondary > [data-pmd-r15-cancel-label]'), 'No clipped Cancel text.');
assert(css.includes('button.btn-secondary::after'), 'Legacy button pseudo markers must be suppressed.');
assert(css.includes('linear-gradient(180deg,#0b765e,#075c47)'), 'Brand jade buttons required.');
assert(css.includes('width:min(630px,100%)'), 'Use Owner calendar note card width.');
assert(owner.includes('pmd-owner-hour-note-card'), 'Owner note authority remains untouched.');
console.log('PASS R15: original note form/API retained, static open, visible close/Cancel, Owner-calendar card and jade actions.');
