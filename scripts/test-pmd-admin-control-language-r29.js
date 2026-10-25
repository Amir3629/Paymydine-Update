#!/usr/bin/env node
/* PMD_ADMIN_CONTROL_LANGUAGE_R29
 * Safe to run on production: static source + isolated DOM mock only.
 * No actual DOM actions, requests, writes or data mutations.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(base,file),'utf8');

const css = read('app/admin/assets/css/pmd-admin-control-language-r29.css');
const js = read('app/admin/assets/js/pmd-admin-control-language-r29.js');
const layouts = [
  'app/admin/views/layouts/default.blade.php',
  'app/admin/views/superadmin_r2/layout.blade.php',
  'app/admin/views/waiter_pos.blade.php',
  'app/admin/views/kitchendisplay/index.blade.php'
];
assert.doesNotThrow(() => new vm.Script(js),'Syntax of Admin R29 JS');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS balanced braces');
assert.ok(css.includes('linear-gradient(180deg,#0b765e 0%,#075c47 100%)'),'Exact Create Table gradient');
assert.ok(css.includes('--pmd-control-r29-radius:14px'),'Exact Create Table button radius');
assert.ok(css.includes('--pmd-control-r29-field-radius:16px'),'Create Table form field radius');
assert.ok(css.includes('M5 4h11l3 3v13H5z'),'Exact Create Table save icon path');
assert.ok(css.includes('data-pmd-admin-action-r29="choice"'),'Selected filter styling');
assert.ok(css.includes('data-pmd-admin-action-r29="danger"'),'Danger controls remain distinct');
assert.ok(css.includes('data-pmd-admin-action-r29="icon"'),'Icon controls retain separate geometry');
assert.ok(css.includes('#pmd-inventory-v1.pmd-inv-r26-ready.pmd-inv-r27-ready.pmd-inv-r28-ready'),'Inventory R26/R28 override');
assert.ok(css.includes('-webkit-appearance:none!important'),'Square native Safari dropdown appearance removed');
assert.ok(css.includes('border-radius:16px!important'),'Native Inventory dropdown corners');
assert.ok(css.includes('select:not([multiple]):not([size])'),'Inventory native single-select only');
assert.ok(css.includes("html[dir=\"rtl\"]"),'RTL native-select chevron position');
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'),'Reduced motion');
assert.ok(!/fetch\(|XMLHttpRequest|api\.request\(/.test(js),'No API behavior');
assert.ok(!/\.click\(\)|preventDefault\(\)|submit\(\)/.test(js),'Never dispatch button actions');
assert.ok(js.includes('MutationObserver'),'Dynamic admin controls get consistent skins');
assert.ok(js.includes('#pmd-inventory-v1'),'R28 Inventory buttons left intact');
assert.ok(js.includes('[data-pmd-pos-root]'),'POS operational targets excluded');
assert.ok(js.includes('[data-pmd-kds-display]'),'KDS workflow excluded');
assert.ok(js.includes('#pmd-side-menu2'),'Sidebar functional navigation excluded');
assert.ok(js.includes('[data-pmd-floor-table-manager-portal]'),'Create Table kept authoritative');

for (const file of layouts) {
  const content = read(file);
  assert.equal(content.split('data-pmd-admin-control-language-r29="css"').length-1,1,'CSS once in '+file);
  assert.equal(content.split('data-pmd-admin-control-language-r29="js"').length-1,1,'JS once in '+file);
  assert.ok(content.indexOf('data-pmd-admin-control-language-r29="css"') < content.lastIndexOf('</head>'),'Stylesheet in head '+file);
}
assert.ok(read(layouts[0]).includes('@styles'),'Default Admin asset authority preserved');
assert.ok(read(layouts[1]).includes("@stack('page-head')"),'Superadmin asset authority preserved');
assert.ok(read(layouts[2]).includes('PMDWaiterPOSApp.mount'),'POS runtime kept');
assert.ok(read(layouts[3]).includes('data-pmd-kds-display="v1"'),'KDS runtime kept');

function element(tag, klass, label, initial, parent) {
  const attrs = Object.assign({},initial||{});
  return {
    nodeType:1,localName:tag,className:klass||'',textContent:label||'',
    value:undefined,attributes:Object.keys(attrs).map(name=>({name})),
    parentNode:parent||null,children:[],multiple:false,
    getAttribute(name){return Object.prototype.hasOwnProperty.call(attrs,name)?attrs[name]:null;},
    hasAttribute(name){return Object.prototype.hasOwnProperty.call(attrs,name);},
    setAttribute(name,value){
      attrs[name]=String(value);
      if(!this.attributes.some(x=>x.name===name))this.attributes.push({name});
    },
    matches(pattern){return pattern.includes('button')||pattern.includes('select')||pattern.includes('a.btn')?tag!=='div':false;},
    closest(pattern){
      if(this.parentNode && this.parentNode.excluded && pattern.includes(this.parentNode.excluded))return this.parentNode;
      if(this.enhanced && pattern.includes('.selectize-control'))return this.enhanced;
      return null;
    },
    querySelector(pattern){
      if(pattern.includes('input[type="radio"]') && this.containsChoice)return {};
      return this.hasSvg && pattern.includes('svg')?{}:null;
    },
    querySelectorAll(){return []}
  };
}
const samples=[
  element('button','btn btn-primary','Save settings'),
  element('button','btn btn-danger','Delete'),
  element('button','btn btn-secondary','Cancel'),
  element('button','pmd-tabs-choice','Stock',{'aria-pressed':'true'}),
  element('button','icon-button','',{'aria-label':'Notifications'}),
  element('select','form-select',''),
  element('select','form-select','',{'multiple':''}),
  element('button','btn','Edit',{}, {excluded:'#pmd-side-menu2'}),
  element('button','btn','Edit',{}, {excluded:'[data-pmd-pos-root]'}),
  element('button','btn','Edit',{}, {excluded:'[data-pmd-kds-display]'}),
  element('button','btn','Edit',{}, {excluded:'[data-pmd-floor-table-manager-portal]'}),
  element('button','btn','Edit',{}, {excluded:'#pmd-inventory-v1'}),
  element('button','btn','Edit')
];
samples[4].hasSvg=true;
const body = {
  nodeType:1,localName:'body',
  classList:{add(name){this[name]=true}},
  matches(){return false},
  querySelectorAll(){return samples}
};
let observed, observer;
const doc = {readyState:'complete',body,
  querySelectorAll(){return samples.filter(x=>x.hasAttribute('data-pmd-admin-action-r29'))}
};
class MutationObserverFake {
  constructor(fn){observer=this;this.cb=fn;}
  observe(root,opts){observed={root,opts};}
}
const sandbox={document:doc,window:{},MutationObserver:MutationObserverFake,Set,Array,Promise};
vm.runInNewContext(js,sandbox,{timeout:1500});
function role(i){return samples[i].getAttribute('data-pmd-admin-action-r29');}
assert.equal(role(0),'primary');
assert.equal(samples[0].getAttribute('data-pmd-admin-action-icon-r29'),'save');
assert.equal(role(1),'danger');
assert.equal(role(2),'secondary');
assert.equal(role(3),'choice');
assert.equal(role(4),'icon');
assert.equal(samples[5].getAttribute('data-pmd-admin-select-r29'),'1');
assert.equal(samples[6].hasAttribute('data-pmd-admin-select-r29'),false);
for(let i=7;i<=11;i++)assert.equal(role(i),null,'Special functional element must be untouched '+i);
assert.equal(role(12),'secondary','Action in generic card still styled');
assert.ok(observed&&observed.opts.subtree===true&&observed.opts.childList===true);
assert.ok(sandbox.window.PMDAdminControlLanguageR29,'One singleton registered');
const dynamic = element('button','btn btn-primary','Confirm purchase');
dynamic.querySelectorAll=()=>[];
observer.cb([{addedNodes:[dynamic]}]);
Promise.resolve().then(function () {
  assert.equal(dynamic.getAttribute('data-pmd-admin-action-r29'),'primary','AJAX-inserted action receives role');
  console.log('PASS: R29 global Admin variants, exact Floor gradient, Inventory select corners, 4 layouts and safe runtime classification.');
}).catch(function(error){console.error(error);process.exitCode=1;});
