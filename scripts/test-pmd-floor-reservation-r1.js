'use strict';
/* PMD_FLOOR_RESERVATION_R1_JS_TESTS
 * node scripts/test-pmd-floor-reservation-r1.js
 * Pure read-only JS tests; no browser or database required.
 */
const assert = require('node:assert/strict');
const helper = require('../app/admin/assets/js/pmd-floor-reservation-state-r1.js');
const now = 2000000000000;
const start = now + 10 * 60000;
const rows = [{ table_id: 42, table_no: '7', start_ms: start, end_ms: start + 3600000 }];
assert.equal(helper.classify(rows, 42, '7', now, 15), 'upcoming');
assert.equal(helper.classify(rows, 42, '7', now, 5), 'free');
assert.equal(helper.classify(rows, 43, '7', now, 15), 'free');
assert.equal(helper.classify(rows, 0, '7', now, 15), 'upcoming');
assert.equal(helper.classify(rows, 42, '7', start, 15), 'busy');
assert.equal(helper.classify(rows, 42, '7', start + 3600000, 15), 'free');
assert.equal(helper.effectiveStatus('occupied', 'upcoming'), 'occupied');
assert.equal(helper.effectiveStatus('disabled', 'busy'), 'disabled');
assert.equal(helper.effectiveStatus('cleaning', 'busy'), 'cleaning');
assert.equal(helper.effectiveStatus('available', 'upcoming'), 'reserved');
assert.equal(helper.visualPhase('available', 'upcoming'), 'upcoming');
assert.equal(helper.visualPhase('occupied', 'upcoming'), 'none');
assert.equal(helper.nextBoundary(rows, now, 15), start);
assert.equal(helper.nextBoundary(rows, now - 20 * 60000, 15), start - 15 * 60000);
assert.equal(helper.safeMinutes(999), 120);
assert.equal(helper.safeMinutes('bad'), 15);
assert.equal(helper.safeMinutes(0), 0);
console.log('PASS: Floor reservation JS contract (17 checks)');
