'use strict';
/**
 * PMD_FLOOR_LIVE_EXACT_TABLE_ID_R2
 * Zero-network, read-only regression for canonical Floor live-state matches.
 *
 * node scripts/test-pmd-floor-live-identity-r1.js
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js'),
  'utf8'
);
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Required Floor section is present');
  return source.slice(from, to);
}
const physicalId = section(
  '    function physicalTableId(row) {',
  '    // PMD_PHYSICAL_TABLE_STATUS_EVENT_AUTHORITY_R1'
);
const liveMatch = section(
  '    function liveSnapshotLabel(row) {',
  '    function liveSnapshotStatus(row) {'
);

function matcher(tables) {
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const key = (v) => clean(v).toLowerCase();
  return new Function('allTables', 'clean', 'key', [
    physicalId, liveMatch,
    'return { physicalTableId, liveSnapshotMatches };'
  ].join('\n'))(tables, clean, key);
}

const table10 = { dbTableId: 42, number: '10', raw: { table_id: 42, table_no: '10' } };
const differentDb10 = { dbTableId: 10, number: '7', raw: { table_id: 10, table_no: '7' } };
const row10 = { table_id: 42, number: '10', status: 'available' };
const rowDb10 = { table_id: 10, number: '7', status: 'occupied' };
const match = matcher([table10, differentDb10]);

assert.equal(match.physicalTableId(table10), 42,
  'Exact DB table ID is preferred over display number');
assert.equal(match.liveSnapshotMatches(table10, rowDb10, [row10, rowDb10]), false,
  'Snapshot for another physical ID cannot recolor Table 10');
assert.equal(match.liveSnapshotMatches(table10, row10, [row10, rowDb10]), true,
  'Canonical table ID reconciliation succeeds');
assert.equal(matcher([table10, differentDb10])
  .liveSnapshotMatches(table10, { number: '10' }, [{ number: '10' }]), true,
  'Unique legacy label-only snapshot supported');
assert.equal(matcher([table10, { dbTableId: 99, number: '10' }])
  .liveSnapshotMatches(table10, { number: '10' }, [{ number: '10' }]), false,
  'Duplicate labels cannot write statuses between floors');
assert.equal(source.includes("window.addEventListener('pmd:notification:new'"), false,
  'Notification is not allowed to optimistically mark tables occupied');
assert.match(source, /table\.baseStatus = status;[\s\S]{0,180}table\.status = effective;/,
  'Live physical status is reconciled with the reservation phase');
assert.match(source, /function liveSnapshotStatus\(row\)/,
  'Live snapshots retain an explicit canonical status classifier');

console.log('PASS: Floor live table identity and no-flicker (8 checks)');
