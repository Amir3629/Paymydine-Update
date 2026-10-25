#!/usr/bin/env node
/* PMD_INVENTORY_BARCODE_FLOOR_R31_REGRESSION
 * Read-only source tests + isolated DOM simulation for scroll scrubber.
 * Requires no database, network, login, browser or mutation of live files.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');

const actualLayout = read('app/admin/views/_layouts/default.blade.php');
const adminController = read('app/admin/classes/AdminController.php');
const inventory = read('app/admin/views/pmdinventory/index.blade.php');
const floor = read('app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php');
const oldInventory = read('app/admin/assets/css/pmd-inventory-workspace-r19.css');
const oldFloor = read('app/admin/assets/css/pmd-shared-floor-multi-floor-v1.css');
const r28 = read('app/admin/assets/css/pmd-inventory-exact-table-card-r28.css');
const dialogs = read('app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js');
const nativeModal = read('app/admin/assets/js/pmd-inventory-table-card-parity-r27.js');
const css = read('app/admin/assets/css/pmd-inventory-barcode-floor-r31.css');
const js = read('app/admin/assets/js/pmd-inventory-scrollbar-r31.js');

function has(haystack,needle,label){assert.ok(haystack.includes(needle),label||needle);}
has(adminController,"'~/app/admin/views/_layouts'","Real Admin layout authority");
has(actualLayout,'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT','R30 live layout present');
assert.equal(actualLayout.split('data-pmd-inventory-barcode-floor-r31="css"').length-1,1,
  'R31 CSS loaded exactly ONCE in real template');
assert.equal(actualLayout.split('data-pmd-inventory-barcode-floor-r31="js"').length-1,1,
  'R31 JS loaded exactly ONCE in real template');
const r31 = actualLayout.indexOf('PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS');
assert.ok(r31 > actualLayout.indexOf('PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT'),
  'R31 loaded after R30');
assert.ok(r31 < actualLayout.indexOf('</head>'),'R31 stylesheet loaded in actual head');

for(const mode of ['stock','purchases','waste','shopping']){
  has(inventory,'data-r19-mode="'+mode+'"','Mode '+mode+' preserved');
}
has(inventory,'data-r19-purchase-search','Catalog search retained');
has(inventory,'data-r19-receipt-input','AI invoice upload retained');
has(inventory,'data-r19-barcode-open','Barcode action retained');
has(inventory,'data-r19-barcode-input','Original scanner input retained');
has(inventory,'data-r24-camera-start','Camera start retained');
has(inventory,'data-r24-camera-stop','Camera stop retained');
has(inventory,'data-r19-barcode-link','Barcode link retained');
has(inventory,'data-r19-barcode-new','New item retained');
has(inventory,'data-r19-purchase-sub','Purchase categories retained');
has(inventory,'data-r19-purchase-sub-key','Category filter identity retained');
has(dialogs,"original.click()","R25 close must still call original R19 handler");
has(dialogs,"data-r24-camera-stop","R25 close must stop camera");
has(nativeModal,'portal.showModal()',"Full-viewport native dialog retained");
has(r28,'PMD_INVENTORY_EXACT_TABLE_CARD_R28',"Original Table design remains authority");
has(oldInventory,'.pmd-inv-r23-barcode__input input',"Original scanner had inner styling");
has(oldFloor,'.pmd-shared-floor-switcher__floor.is-active',"Prior light-blue active state found");
has(floor,'data-pmd-floor-table-manager-role="{{ $pmdFloorTableManagerRole }}"',
  'Floor owner/manager role available server-side');
has(floor,'data-pmd-floor-add','Existing floor-add control intact; visual hide only');
has(floor,'data-pmd-floor-manage','Edit floor stays in markup');
has(css,'nav.pmd-inv-r19-modes.pmd-inv-r24-modes','Four tabs styled');
has(css,'button[data-r19-mode]:is(.is-active,[aria-current="page"])','Selected nav style');
has(css,'label.pmd-inv-r19-scan','File upload LABEL gets primary button skin');
has(css,'button.pmd-inv-r23-barcode-button[data-r19-barcode-open]','Barcode button gets quiet Table skin');
has(css,'.pmd-inv-r23-barcode__head {\n  display:none!important;','Double barcode text suppressed, DOM intact');
has(css,'label.pmd-inv-r23-barcode__input > input[data-r19-barcode-input]','Inner scanner border is removed');
has(css,'border:0!important;\n  border-color:transparent!important;','Input has zero border');
has(css,'.pmd-inv-r23-barcode__input > input::placeholder','Scanner placeholder remains legible');
has(css,'[data-pmd-inv-r25-dialog="barcode"]','Only barcode card receives frame reset');
has(css,'.pmd-inv-r24-barcode-tools > button[hidden]','Camera hidden state respected');
has(css,'[data-r19-purchase-sub][hidden]','R19 hidden subcategory state respected');
has(css,'::-webkit-scrollbar-thumb','3px native scrollbar thumb');
has(css,'.pmd-inv-r31-scrollbar__thumb','Always-visible macOS track thumb');
has(css,'data-pmd-floor-table-manager-role="owner"','Owner-only floor scope');
has(css,'data-pmd-floor-table-manager-role="manager"','Manager-only floor scope');
has(css,'[data-pmd-floor-add] {\n  display:none!important','Add floor hidden only on authorized switcher');
has(css,'button.pmd-shared-floor-switcher__floor:is(.is-active,[aria-selected="true"])',
  'Active floor matches Table selected state');
has(css,'linear-gradient(180deg,#0b765e 0%,#075c47 100%)',
  'Exact Create Table Jade primary gradient');
has(css,'@media(max-width:700px)','Mobile layout remains responsive');
has(css,'@media(prefers-reduced-motion:reduce)','Reduced motion guarded');
has(js,"window.PMDInventoryScrollbarR31 = {",'Singleton runtime with QA diagnostics');
has(js,"list.scrollLeft = Math.round(x / travel * available)",'Track drag scrolls real list');
assert.ok(!/fetch\(|XMLHttpRequest|\.submit\(|\.click\(|preventDefault\(\)\s*;\s*original/.test(js),
  'R31 must not call business APIs or original action handlers');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,
  'CSS braces balance');
assert.doesNotThrow(()=>new vm.Script(js),'R31 JS parses');

function element(tag) {
  const handlers={};
  return {
    localName:tag,
    className:'',hidden:false,
    children:[],parentNode:null,
    attributes:{},style:{width:'',transform:''},
    clientWidth:300,scrollWidth:300,scrollLeft:0,
    setAttribute(name,value){this.attributes[name]=String(value)},
    getAttribute(name){return this.attributes[name]||null},
    hasAttribute(name){return Object.hasOwn(this.attributes,name)},
    appendChild(child){child.parentNode=this;this.children.push(child);return child},
    insertBefore(child){child.parentNode=this;this.children.push(child);return child},
    addEventListener(type,fn){handlers[type]=fn},
    fire(type,event){if(handlers[type])handlers[type](event)},
    getClientRects(){return this.hidden?[]:[{}]},
    getBoundingClientRect(){const width=Number.parseFloat(this.style.width)||this.clientWidth;return {left:0,right:width,width}},
    hasPointerCapture(){return false},
    setPointerCapture(){},
    releasePointerCapture(){},
    __handlers:handlers
  };
}
const rootEl=element('section');
const list=element('div');
const parent=element('div');
list.parentNode=parent;
list.scrollWidth=1000;
list.setAttribute('data-r19-purchase-sub','');
rootEl.querySelectorAll=()=>[list];
const doc={
  readyState:'complete',
  querySelector(selector){return selector.includes('#pmd-inventory-v1')?rootEl:null},
  createElement:element
};
const win={
  requestAnimationFrame(fn){fn();},
  addEventListener(){}
};
class FakeResizeObserver{constructor(fn){this.cb=fn}observe(){}}
class FakeMutationObserver{constructor(fn){this.cb=fn}observe(){}}
vm.runInNewContext(js,{window:win,document:doc,
  ResizeObserver:FakeResizeObserver,
  MutationObserver:FakeMutationObserver,
  Promise,Array,Math},{timeout:1500});
assert.ok(win.PMDInventoryScrollbarR31,'Runtime installed');
assert.equal(win.PMDInventoryScrollbarR31.count(),1,'One Purchase strip');
const rail=parent.children[0];
assert.equal(rail.className,'pmd-inv-r31-scrollbar','Visible track inserted AFTER original R19 list');
assert.equal(rail.hidden,false,'Overflow must show the 3px scrubber');
const thumb=rail.children[0];
assert.equal(thumb.style.width,'90px','Thumb scales to 300/1000 fraction');
const scrollBefore=list.scrollLeft;
rail.fire('pointerdown',{button:0,pointerId:7,clientX:200,preventDefault(){}});
assert.ok(list.scrollLeft > scrollBefore,'Click/drag on scrubber moves actual native strip');
rail.fire('pointerup',{pointerId:7});
list.hidden=true;win.PMDInventoryScrollbarR31.refresh();
assert.equal(rail.hidden,true,'Hidden Inventory mode also hides track');
list.hidden=false;list.scrollWidth=300;win.PMDInventoryScrollbarR31.refresh();
assert.equal(rail.hidden,true,'No overflow => no unnecessary scrollbar');
assert.equal(list.children.length,0,'Original category children never moved or rewritten');
console.log('PASS: R31 real Admin layout, all Inventory handlers, single barcode frame, mode skins, persistent thin scrollbar, Owner/Manager floor roles and DOM scrubber regression.');
