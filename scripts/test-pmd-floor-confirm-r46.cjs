#!/usr/bin/env node
'use strict';
/* R46 staged contract test for exactly the two live R45 assets.
 * No browser/network writes and no native confirmation.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const jsPath=process.argv[2], cssPath=process.argv[3];
const root=process.argv[4] || '/var/www/paymydine';
if (!jsPath || !cssPath) {
  console.error('Usage: node test-pmd-floor-confirm-r46.cjs JS_FILE CSS_FILE [LIVE_ROOT]');
  process.exit(2);
}
const js=fs.readFileSync(jsPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const check=(description,fn)=>{
  fn();console.log('PASS R46: '+description);
};
check('R45 shared confirm JS parses',()=>new Function(js));
check('neutral X/Cancel markers, no change to destructive submit',()=>{
  assert.equal(js.split('PMD_R46_NEUTRAL_REMOVE_CONFIRM').length-1,1);
  assert(js.includes("close.setAttribute('data-pmd-r46-neutral', 'close')"));
  assert(js.includes("cancel.setAttribute('data-pmd-r46-neutral', 'cancel')"));
  assert(js.includes("submit.className = 'pmd-r45-confirm-submit'"));
  assert(js.includes("submit.addEventListener('click', function () { done(true); })"));
});
check('R45 safety prose hidden without removing original action locks',()=>{
  assert(css.includes('PMD_R46_HIDE_TABLE_SAFETY_PROSE'));
  assert(css.includes('[data-pmd-r45-table-safety]'));
  assert(css.includes('display:none!important;'));
  assert(css.includes('.pmd-floor-table-manager__delete:disabled'));
  assert(css.includes('.pmd-floor-table-manager__enabled-toggle-r39:disabled'));
  assert(css.includes('.pmd-r45-confirm-submit {'));
  assert(css.includes('background:#b63a4d!important'));
  assert(css.includes('html body > .pmd-r45-confirm-layer'));
});
check('R46 X and Cancel CSS scoped only to R45 confirmation',()=>{
  assert(css.includes('.pmd-r45-confirm-heading button.pmd-r45-confirm-close'));
  assert(css.includes('.pmd-r45-confirm-actions button.pmd-r45-confirm-cancel'));
  assert(css.includes('-webkit-text-fill-color:#21483e!important'));
  assert(!/html body\s+button\s*\{/.test(css.slice(css.indexOf('PMD_R46_HIDE_TABLE_SAFETY_PROSE'))));
});
if (fs.existsSync(root+'/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js')) {
  const floor=fs.readFileSync(root+'/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js','utf8');
  check('real Edit Table still disables actions by R45 safety state',()=>{
    assert(floor.includes("var safetyNoticeR45 = panel.querySelector('[data-pmd-r45-table-safety]')"));
    assert(floor.includes('currentSafetyAllowedR45 = false'));
    assert(floor.includes('window.PMDFloorConfirmR45.open'));
    assert(floor.includes('updateSafetyNoticeR45()'));
  });
}
(async()=>{
  const events=new Map();
  const doc={
    activeElement:null,
    body:null,
    createElement(tag){
      return {
        tag, children:[],attributes:{},listeners:{},textContent:'',
        style:{decl:{},setProperty(k,v,p){this.decl[k]={v,p};}},
        setAttribute(k,v){this.attributes[k]=v;},
        appendChild(c){this.children.push(c);return c;},
        addEventListener(k,f){this.listeners[k]=f;},
        remove(){this.removed=true;},
        focus(){doc.activeElement=this;},
      };
    },
    addEventListener(k,f){events.set(k,f);},
    removeEventListener(k){events.delete(k);},
    contains(){return true;},
  };
  doc.body=doc.createElement('body');
  const win={};
  new Function('window','document',js)(win,doc);
  function inspect(){
    const layer=doc.body.children.at(-1);
    const card=layer.children[1];
    const close=card.children[0].children[1];
    const cancel=card.children[2].children[0];
    const submit=card.children[2].children[1];
    for (const n of [close,cancel]) {
      assert.equal(n.style.decl['background-color'].v,'#fff');
      assert.equal(n.style.decl['background-color'].p,'important');
      assert.equal(n.style.decl['-webkit-text-fill-color'].v,'#21483e');
      assert.equal(n.style.decl['color'].v,'#21483e');
      assert.equal(n.style.decl['border'].p,'important');
    }
    assert.equal(submit.style.decl['background'],undefined);
    assert.equal(card.attributes['aria-modal'],'true');
    assert.equal(card.attributes['role'],'alertdialog');
    return {layer,close,cancel,submit};
  }
  const cancelled=win.PMDFloorConfirmR45.open({title:'Remove table',message:'Delete?',confirmLabel:'Remove table'});
  const a=inspect();
  a.cancel.listeners.click();
  assert.equal(await cancelled,false);
  assert(a.layer.removed);
  assert(!events.has('keydown'));
  console.log('PASS R46: white Cancel preserves false resolution, focus cleanup and accessibility');

  const accepted=win.PMDFloorConfirmR45.open({title:'Remove floor'});
  const b=inspect();
  b.submit.listeners.click();
  assert.equal(await accepted,true);
  assert(b.layer.removed);
  console.log('PASS R46: original red destructive confirmation still resolves true');
})().catch(e=>{console.error(e);process.exitCode=1});
