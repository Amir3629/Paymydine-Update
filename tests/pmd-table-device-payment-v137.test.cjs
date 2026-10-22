'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const js = fs.readFileSync('app/admin/assets/js/pmd-table-display-waiter-payment-v1.js', 'utf8');
const match = js.match(/  function isRecordedCardPaymentV137\(result\) \{[\s\S]*?\n  \}/);
assert.ok(match, 'canonical confirmation predicate exists');
const sandbox = vm.createContext({});
vm.runInContext(match[0], sandbox);
const confirmed = (payload) => vm.runInContext('isRecordedCardPaymentV137(input)', vm.createContext({
  input: payload,
  isRecordedCardPaymentV137: sandbox.isRecordedCardPaymentV137,
}));
assert.equal(confirmed({status:'paid',payment_recorded:true,simulated:false}), true);
assert.equal(confirmed({status:'PAID',payment_recorded:true,simulated:false}), true);
assert.equal(confirmed({status:'paid',payment_recorded:false}), false);
assert.equal(confirmed({status:'paid'}), false);
assert.equal(confirmed({status:'pending',payment_recorded:true}), false);
assert.equal(confirmed({status:'failed',payment_recorded:true}), false);
assert.equal(confirmed({status:'paid',payment_recorded:true,simulated:true}), false);
assert.equal(confirmed({status:'paid',payment_recorded:1,simulated:false}), false);
assert.equal(confirmed(null), false);
assert.match(js, /!isRecordedCardPaymentV137\(json\)/);
assert.match(js, /if \(isRecordedCardPaymentV137\(json\)\)/);
assert.doesNotMatch(js, /json\.payment_recorded \|\| status === 'paid'/);
console.log('PASS table-device payment only confirms canonical recorded/provider paid');
