#!/usr/bin/env node
'use strict';
/* R17F: Do not confuse an old or unrelated Next process with the new QR build. */
const assert = require('node:assert/strict');
const MARKER = 'r17f-disabled-table-active';
function isVerifiedHealth(v) {
  return !!v && v.success === true
    && v.service === 'paymydine-frontend-v2'
    && v.qrGuardRelease === MARKER
    && (v.port === undefined || Number(v.port) === 3002);
}
if (process.argv.includes('--self-test')) {
  const good = {success:true,service:'paymydine-frontend-v2',qrGuardRelease:MARKER,port:3002};
  assert(isVerifiedHealth(good), 'New build must pass');
  for (const invalid of [
    null, {}, {...good,qrGuardRelease:undefined},
    {...good,qrGuardRelease:'r17e'}, {...good,service:'paymydine-landing'},
    {...good,success:false}, {...good,port:3000}
  ]) assert(!isVerifiedHealth(invalid), 'Old, failed and unrelated health must be rejected');
  console.log('PASS R17F: health identity only accepts the new QR guard build.');
} else {
  let raw = '';
  process.stdin.on('data',chunk => raw += chunk).on('end',() => {
    try {
      if (isVerifiedHealth(JSON.parse(raw))) {
        process.stdout.write('verified-r17f\n');
        return;
      }
    } catch (_) {}
    process.exitCode = 1;
  });
}
