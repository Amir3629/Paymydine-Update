'use strict';
/* PMD_FLOOR_PALETTE_POS_R2_TESTS
 * node scripts/test-pmd-floor-palette-pos-r2.js
 * Read-only test. Mocked POS DOM and authenticated read-only endpoint.
 */
const assert = require('node:assert/strict');
const helper = require('../app/admin/assets/js/pmd-floor-reservation-state-r1.js');
const rail = require('../app/admin/assets/js/pmd-qpos-reservation-rail-r2.js');

const now = Date.now();
const start = now + 8 * 60000;
const windows = [{table_id:10,table_no:'10',start_ms:start,end_ms:start+60*60000}];

assert.equal(rail.tablePhase('available',10,windows,now,15,helper),'upcoming');
assert.equal(rail.tablePhase('available',10,windows,now,5,helper),'none');
assert.equal(rail.tablePhase('available',10,windows,start,15,helper),'busy');
assert.equal(rail.tablePhase('available',10,windows,start+60*60000,15,helper),'none');
assert.equal(rail.tablePhase('available',11,windows,now,15,helper),'none');
assert.equal(rail.tablePhase('occupied',10,windows,now,15,helper),'none');
assert.equal(rail.tablePhase('cleaning',10,windows,now,15,helper),'none');
assert.equal(rail.tablePhase('disabled',10,windows,now,15,helper),'none');
assert.equal(rail.tablePhase('reserved',10,windows,now,15,helper),'none');
assert.equal(rail.tablePhase('reserved',10,windows,start,15,helper),'busy');
assert.equal(rail.tablePhase('attention',10,windows,start,15,helper),'busy');

function button(id,status) {
  const attrs = {'data-qpos-table':String(id),'data-status':status};
  return {
    attrs,
    getAttribute(key){return Object.prototype.hasOwnProperty.call(attrs,key)?attrs[key]:null;},
    setAttribute(key,value){attrs[key]=String(value);},
    removeAttribute(key){delete attrs[key];}
  };
}
let buttons=[button(10,'available'),button(11,'available'),button(12,'occupied')];
const handler = {};
const railNode={querySelectorAll(){return buttons;}};
const app={querySelector(){return railNode;}};
const doc={
  visibilityState:'visible',
  getElementById(id){return id==='pmd-quick-pos'?app:null;},
  querySelector(s){return s==='meta[name="csrf-token"]'?{content:'csrf-test-token'}:null;},
  addEventListener(name,fn){handler[name]=fn;}
};
let fetchCalls=[];
let timeoutCalls=0;
const env={
 document:doc,
 PMDFloorReservationStateR1:helper,
 navigator:{onLine:true},
 console:{warn(){}},
 addEventListener(name,fn){handler[name]=fn;},
 setTimeout(){timeoutCalls++;return timeoutCalls;},
 clearTimeout(){},
 fetch(url,opts){
   fetchCalls.push({url,opts});
   return Promise.resolve({
     ok:true,json(){return Promise.resolve({windows,notice_minutes:15});}
   });
 }
};
async function main(){
 const instance=rail.mount(env);
 assert.ok(instance,'POS rail enhancer mounts');
 await instance.refresh();
 assert.equal(fetchCalls.length,1,'No duplicate request while pending');
 assert.equal(fetchCalls[0].url,'/admin/pos/reservation-busy');
 assert.equal(fetchCalls[0].opts.method,'POST');
 assert.equal(fetchCalls[0].opts.credentials,'same-origin');
 assert.equal(fetchCalls[0].opts.headers['X-CSRF-TOKEN'],'csrf-test-token');
 assert.equal(buttons[0].getAttribute('data-pmd-qpos-reservation-phase'),'upcoming');
 assert.equal(buttons[1].getAttribute('data-pmd-qpos-reservation-phase'),null);
 assert.equal(buttons[2].getAttribute('data-pmd-qpos-reservation-phase'),null);
 assert.ok(timeoutCalls>0,'Next reservation threshold has a timer');
 buttons[0].setAttribute('data-status','occupied');
 instance.paint();
 assert.equal(buttons[0].getAttribute('data-pmd-qpos-reservation-phase'),null,'Physical occupancy wins');
 buttons=[button(10,'available')];
 handler['pmd:qpos:tables-rendered']();
 assert.equal(buttons[0].getAttribute('data-pmd-qpos-reservation-phase'),'upcoming',
   'New POS rail DOM receives reservation state after live rebuild');
 assert.equal(fetchCalls.length,1,'No extra DB fetch on every table render');
 console.log('PASS: QPOS reservation rail visual/CSRF/event contract (21 assertions)');
}
main().catch(function(error){console.error(error);process.exitCode=1;});
