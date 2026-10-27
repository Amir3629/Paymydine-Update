#!/usr/bin/env node
'use strict';
/* R47: accept only the currently compiled QR-safe faster checkout release.
 * A still-running R17F server must never pass the R47 activation gate.
 */
const assert = require('node:assert/strict');
function verified(v) {
  return !!v && v.success === true
    && v.service === 'paymydine-frontend-v2'
    && v.qrGuardRelease === 'r17f-disabled-table-active'
    && v.perfRelease === 'r47-checkout-fast-open'
    && (v.port === undefined || Number(v.port) === 3002);
}
if (process.argv.includes('--self-test')) {
  const good = {
    success:true,service:'paymydine-frontend-v2',
    qrGuardRelease:'r17f-disabled-table-active',
    perfRelease:'r47-checkout-fast-open',port:3002,
  };
  assert(verified(good),'R47 health must pass');
  for(const bad of [
    null,{},{...good,perfRelease:undefined},
    {...good,perfRelease:'r46'},
    {...good,qrGuardRelease:undefined},
    {...good,service:'paymydine-landing'},
    {...good,port:3001},{...good,success:false},
  ]) assert(!verified(bad),'Old, wrong and incomplete builds must not pass');
  console.log('PASS R47: exact two-marker V2 health identity and old-build rejection.');
} else {
  let input='';
  process.stdin.on('data',d=>input+=d).on('end',()=>{
    try { if(verified(JSON.parse(input))) {process.stdout.write('verified-r47\n'); return} } catch {}
    process.exitCode=1;
  });
}
