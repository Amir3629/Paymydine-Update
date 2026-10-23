'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('app/admin/assets/js/pmd-device-fleet-v150.js', 'utf8');

test('real fleet JavaScript finds offline Staff phones and keeps Wake/Sleep actions untouched', () => {
  function element(attrs, text = '') {
    const handlers = {};
    return {
      attrs: Object.assign({}, attrs),
      hidden: false,
      textContent: text,
      getAttribute(k) { return this.attrs[k] || null; },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { handlers[k] = fn; },
      emit(k, event) { if (!handlers[k]) throw new Error('missing listener '+k);handlers[k](event); },
      closest(selector) { return selector === '[data-pmd-device-filter]' && this.attrs['data-pmd-device-filter'] ? this : null; }
    };
  }
  const rows = [
    element({'data-pmd-device-id':'129','data-pmd-device-group':'table','data-pmd-device-online':'1'},'Morefun Z80 Table 18 #129'),
    element({'data-pmd-device-id':'43','data-pmd-device-group':'staff','data-pmd-device-online':'0'},'Staff Samsung phone #43'),
    element({'data-pmd-device-id':'115','data-pmd-device-group':'table','data-pmd-device-online':'0'},'Table 40 old #115'),
    element({'data-pmd-device-id':'133','data-pmd-device-group':'staff','data-pmd-device-online':'0'},'Waiter POS #133')
  ];
  const count=element({},'');
  const empty=element({},'');
  const search=element({},'');
  search.value='';
  const tabs=['online','staff','table','offline','all'].map(v=>element({'data-pmd-device-filter':v},''));
  const tally={};
  for (const name of ['online','staff','table','offline','all']) tally[name]=element({},'');
  const toolbar=element({});
  toolbar.querySelector=function(selector) {
    if (selector === '[data-pmd-device-count]') return count;
    if (selector === '[data-pmd-device-search]') return search;
    const match=selector.match(/^\[data-pmd-fleet-tab-count="([^"]+)"\]$/);
    return match ? tally[match[1]] : null;
  };
  toolbar.querySelectorAll=function(){return tabs;};
  toolbar.contains=function(){return true;};
  const list=element({});
  list.querySelectorAll=function(){return rows;};
  list.appendChild=function(){};
  const doc={readyState:'complete',querySelector(q){
    return q==='[data-pmd-device-fleet-toolbar]'?toolbar:
      q==='[data-pmd-device-list]'?list:
      q==='[data-pmd-device-empty]'?empty:null;
  }};
  const win={};
  vm.runInNewContext(script,{window:win,document:doc,console});
  assert.equal(rows.filter(r=>!r.hidden).length,1);
  assert.equal(rows.filter(r=>!r.hidden)[0].getAttribute('data-pmd-device-id'),'129');
  assert.equal(tally.staff.textContent,'(2)');
  assert.equal(tally.table.textContent,'(2)');

  toolbar.emit('click',{target:tabs[1]});
  assert.equal(rows.filter(r=>!r.hidden).length,2);
  assert.ok(rows.filter(r=>!r.hidden).every(r=>r.getAttribute('data-pmd-device-group')==='staff'));
  toolbar.emit('click',{target:tabs[2]});
  assert.equal(rows.filter(r=>!r.hidden).length,2);
  assert.ok(rows.filter(r=>!r.hidden).every(r=>r.getAttribute('data-pmd-device-group')==='table'));

  toolbar.emit('click',{target:tabs[0]});
  search.value='#43';
  search.emit('input',{});
  assert.equal(rows.filter(r=>!r.hidden).length,1,'Search must include offline Staff in All saved');
  assert.equal(rows.filter(r=>!r.hidden)[0].getAttribute('data-pmd-device-id'),'43');
  assert.equal(tabs[4].getAttribute('aria-pressed'),'true');

  search.value='not-a-device';
  search.emit('input',{});
  assert.equal(empty.hidden,false);
  assert.equal(rows.filter(r=>!r.hidden).length,0);

  toolbar.emit('click',{target:tabs[4]});
  search.value='';
  search.emit('input',{});
  assert.equal(rows.filter(r=>!r.hidden).length,4,'All saved includes disconnected old records');
  assert.equal(win.__PMD_DEVICE_FLEET_V150__,true);
});
