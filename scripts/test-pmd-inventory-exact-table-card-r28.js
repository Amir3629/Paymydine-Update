#!/usr/bin/env node
/* PMD_INVENTORY_EXACT_TABLE_CARD_R28: static, no-write regressions. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const get = name => fs.readFileSync(path.join(root,name),'utf8');
const css = get('app/admin/assets/css/pmd-inventory-exact-table-card-r28.css');
const js = get('app/admin/assets/js/pmd-inventory-exact-table-card-r28.js');
const controller = get('app/admin/controllers/Pmdmenus.php');
const legacy = get('app/admin/assets/css/pmd-inventory-ui-polish-r26.css');
const r27 = get('app/admin/assets/js/pmd-inventory-table-card-parity-r27.js');
const required = (text,needle,why) => assert.ok(text.includes(needle),why+': '+needle);
assert.doesNotThrow(() => new vm.Script(js),'JS syntax');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces');
required(legacy,'.pmd-inv-r26-refined','R26 historical competing styles');
required(css,'#pmd-inventory-v1.pmd-inv-r26-ready.pmd-inv-r27-ready.pmd-inv-r28-ready','R28 higher-priority cascade');
required(css,'.pmd-inv-r25-overlay.pmd-inv-r26-refined','R28 defeats R26 modal declarations');
required(css,'.pmd-inv-r19-editor-actions > button.pmd-inv-r19-primary[data-pmd-inv-r28-save="1"]','R28 defeats R26 Save button declarations');
required(css,'linear-gradient(180deg,#0b765e 0%,#075c47 100%)','exact Floor jade gradient');
required(css,'grid-template-columns:42px 104px 42px!important','exact Floor compact steppers');
required(css,'width:min(650px,calc(100vw - 32px))!important','Floor R36 modal width');
required(css,'height:40px!important','Floor R36 footer height');
required(css,'min-width:150px!important','Floor R36 Save width');
required(css,'border-radius:14px!important','Floor R36 footer radius');
required(css,'radial-gradient(circle at 10% 7%','Floor mint glass layer');
required(css,'radial-gradient(circle at 62% 9%','Floor blue glass layer');
required(css,'radial-gradient(circle at 35% 50%','Floor rose glass layer');
required(css,'.pmd-inv-r28-field-title > svg','mint SVG field titles');
required(css,'.pmd-inv-r19-main-categories > button.is-active','Supplies selected state');
required(css,'.pmd-inv-r19-shopping-controls button.is-active','Shopping period selected state');
required(css,'@media(max-width:700px)','mobile breakpoint');
required(css,'@media(prefers-reduced-motion:reduce)','reduced motion');
required(r27,'portal.showModal()','R27 full-window native modal kept');
required(js,'data-r19-purchase-main-key','R19 Supplies click retained');
required(js,'var savePath','exact Save Table diskette SVG');
required(js,"label.insertBefore(title, label.firstChild)","original R19 label remains");
required(js,"button.appendChild(symbol)","original action button stays");
required(js,"button.setAttribute('aria-pressed'","accessible category state");
required(js,".observe(host,{childList:true})","direct-only observer prevents mutation loop");
assert.ok(!/fetch\(|XMLHttpRequest|api\.request\(/.test(js),'R28 must not write to backend');
assert.ok(!js.includes('data-pmd-floor-table-manager-save'),'Category filter must not pose as Floor Save action');
assert.ok(!js.includes("setAttribute('data-r19-"),'Never change original R19 action attributes');
for (const asset of ['pmd-inventory-exact-table-card-r28.js','pmd-inventory-exact-table-card-r28.css']) {
  assert.equal(controller.split(asset).length-1,1,'Route only registers once: '+asset);
}
console.log('PASS: R28 exact Create Table card, Save icon, selected category tiles, selector precedence and intact R19/R27 logic.');
