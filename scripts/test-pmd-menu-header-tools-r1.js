#!/usr/bin/env node
/* PMD_MENU_TOOLS_CONTRACT_R1
 * Static regression: the canonical header's existing controls must remain
 * in place and the compact UI must use separate proxy attributes.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const view = read('app/admin/views/pmdmenus/index.blade.php');
const css = read('app/admin/assets/css/pmd-menu-header-tools-r1.css');
const js = read('app/admin/assets/js/pmd-menu-header-tools-r1.js');
const ctrl = read('app/admin/controllers/Pmdmenus.php');

const requiredSources = [
  'data-pmd-stock-usage-setup-r22',
  'data-pmd-menu-capacity-open',
  'data-pmd-menu-prep-firstpaint-slot',
  'data-pmd-menu-ai-firstpaint-slot',
  'data-pmd-menu-sort-toggle',
  'data-pmd-header-expand-search',
  'data-pmd-workspace-toggle-r23',
  'data-pmd-menu-notif-slot',
  'data-pmd-menu-header-primary',
  'data-pmd-menu-header-secondary'
];
for (const attr of requiredSources) {
  if (!view.includes(attr)) throw new Error('Removed existing header action: ' + attr);
}
for (const kind of ['stock', 'capacity', 'timing', 'ai', 'sort']) {
  if (!view.includes('data-pmd-menu-tool-r1="' + kind + '"')) {
    throw new Error('Missing Tools proxy ' + kind);
  }
  if (!js.includes(kind + ': ')) throw new Error('Missing JS forwarder ' + kind);
}
if (!view.includes('data-pmd-menu-tools-panel-r1') ||
    !css.includes('[data-pmd-menu-tools-panel-r1][hidden]') ||
    !ctrl.includes('pmd-menu-header-tools-r1.css') ||
    !ctrl.includes('pmd-menu-header-tools-r1.js')) {
  throw new Error('Missing compact disclosure asset contract');
}
if (!js.includes('source.click()')) throw new Error('Original action not forwarded');
new Function(js);
console.log('PASS: Menu compact tools preserves existing action slots and forwards 5 tools');
