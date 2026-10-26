#!/usr/bin/env node
/* R32 source and DOM-mock regression: scanner focus is exempt from the old
 * Admin 100ms global inline-important field loop; OTHER fields still work.
 * Also ensures the standalone Playwright auditor is read-only and compiles.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const root=process.env.PMD_R32_TEST_ROOT || path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src=read('app/admin/assets/js/fix-form-field-focus-colors.js');
const audit=read('scripts/pmd-platform-button-audit-r32.cjs');
const inv=read('app/admin/views/pmdinventory/index.blade.php');
const r31=read('app/admin/assets/css/pmd-inventory-barcode-floor-r31.css');
const layout=read('app/admin/views/_layouts/default.blade.php');
assert.ok(inv.includes('data-r19-barcode-input'));
assert.ok(r31.includes('label.pmd-inv-r23-barcode__input > input[data-r19-barcode-input]'));
assert.ok(layout.includes('PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS'));
assert.equal(src.split('// PMD_INVENTORY_BARCODE_SINGLE_FOCUS_R32\n').length-1,1,
  'R32 exception must be present exactly once');
assert.ok(src.includes("control.matches('input[data-r19-barcode-input]')"));
assert.ok(src.includes("control.closest('.pmd-inv-r23-barcode__input')"));
assert.ok(src.includes("control.closest('.pmd-inv-r23-barcode')"));
assert.ok(src.includes('if (clearLegacyScannerFocus(control)) return;'));
assert.equal(src.split('if (clearLegacyScannerFocus(e.target)) return;').length-1,2,
  'Both focusin and focusout must have the guard');
assert.ok(audit.includes('chromium.launchPersistentContext(PROFILE'));
assert.ok(audit.includes('Sign in in Chromium'));
assert.ok(audit.includes('document.querySelectorAll'));
assert.ok(audit.includes('getComputedStyle(node)'));
assert.ok(audit.includes("'buttons.csv'"));
assert.ok(audit.includes("'overview.csv'"));
assert.ok(audit.includes("'barcode-diagnostic.json'"));
assert.ok(audit.includes("const DEBUG=args.includes('--barcode-debug')"));
assert.ok(audit.includes("if(u.origin!==base.origin"));
assert.ok(!/(?:page|locator)\.click\s*\(|\.fill\s*\(|\.press\s*\(|storageState\s*\(|localStorage\.setItem/.test(audit),
  'Auditor must not click, fill, issue writes or export auth state');
assert.doesNotThrow(()=>new vm.Script(src));
assert.doesNotThrow(()=>new vm.Script(audit));

function makeStyle(){
  const state=new Map();
  return {
    setProperty(k,v,priority=''){state.set(k,[String(v),priority]);},
    getPropertyValue(k){return state.get(k)?.[0]||'';},
    getPropertyPriority(k){return state.get(k)?.[1]||'';},
    removeProperty(k){state.delete(k);}
  };
}
function node(isBarcode) {
  const style=makeStyle();
  return {
    nodeType:1,style,
    matches(sel){return isBarcode
      ? sel.includes('input[data-r19-barcode-input]')||sel.includes('input')
      : sel.includes('input')&&!sel.includes('[data-r19-barcode-input]');},
    closest(sel){return isBarcode && (sel.includes('pmd-inv-r23-barcode__input')||sel.includes('pmd-inv-r23-barcode'))?{}:null;}
  };
}
const scanner=node(true),normal=node(false);
scanner.style.setProperty('border-color','rgb(54, 74, 99)','important');
scanner.style.setProperty('box-shadow','0 0 0 4px rgba(54, 74, 99, 0.1)','important');
scanner.style.setProperty('transition','none','important');
const eventHandlers={};
const document={
  activeElement:scanner,readyState:'complete',body:{},
  querySelectorAll(sel) {
    if(sel==='.input-group')return [];
    return [scanner,normal];
  },
  addEventListener(name,handler){eventHandlers[name]=handler;}
};
const window={
  location:{pathname:'/admin/menu'},
  getComputedStyle(el) {
    return {borderColor:el.style.getPropertyValue('border-color')||'rgb(200, 210, 211)',
      boxShadow:el.style.getPropertyValue('box-shadow')||'none'};
  }
};
const context={
  document,window,console:{log(){}},setInterval(){return 1;},
  setTimeout(fn){fn()},MutationObserver:class{observe(){}}
};
vm.runInNewContext(src,context,{timeout:1500});
assert.equal(scanner.style.getPropertyValue('box-shadow'),'',
  'Preexisting illegal scanner focus ring is cleared on initial scan');
assert.equal(scanner.style.getPropertyValue('border-color'),'',
  'Preexisting illegal scanner border is cleared on initial scan');
assert.equal(scanner.style.getPropertyValue('transition'),'');
document.activeElement=scanner;
eventHandlers.focusin({target:scanner});
assert.equal(scanner.style.getPropertyValue('box-shadow'),'',
  'Scanner focusin does not create another box');
document.activeElement=normal;
eventHandlers.focusin({target:normal});
assert.ok(normal.style.getPropertyValue('box-shadow').includes('54, 74, 99'),
  'Normal Admin fields preserve prior focus behavior');
assert.equal(normal.style.getPropertyPriority('box-shadow'),'important');
eventHandlers.focusout({target:scanner});
assert.equal(scanner.style.getPropertyValue('box-shadow'),'',
  'Scanner blur never restores second focus ring');
console.log('PASS: R32 restores single-frame barcode focus while preserving all ordinary Admin form inputs; Playwright auditor is read-only and source-valid.');
