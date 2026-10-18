'use strict';
/**
 * PMD_FLOOR_LIVE_EXACT_TABLE_ID_R1
 * Zero-network, read-only regression tests for Floor live-snapshot matching.
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
  assert.ok(from >= 0 && to > from, 'Required live Floor section is present');
  return source.slice(from, to);
}
const exactIdFunctions = section(
  '    function physicalTableId(row) {',
  '    function notificationMeansOpenOrder(detail) {'
);
const liveRowFunctions = section(
  '    function liveSnapshotLabel(row) {',
  '    function liveSnapshotStatus(row) {'
);

function matcher(tables, rows) {
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const key = (v) => clean(v).toLowerCase();
  // Execute only the two pure function blocks extracted from the canonical
  // source so the assertions do not silently test copied logic.
  return new Function('allTables', 'clean', 'key', [
    exactIdFunctions, liveRowFunctions,
    'return { physicalTableId, notificationCandidates, tableMatchesNotification, liveSnapshotMatches };'
  ].join('\n'))(tables, clean, key);
}

const table10 = { dbTableId: 42, number: '10', raw: { table_id: 42, table_no: '10' } };
const differentDb10 = { dbTableId: 10, number: '7', raw: { table_id: 10, table_no: '7' } };
const row10 = { table_id: 42, number: '10', status: 'available' };
const rowDb10 = { table_id: 10, number: '7', status: 'occupied' };
const match = matcher([table10, differentDb10], [row10, rowDb10]);
const eventIds = match.notificationCandidates({
  notification: { table_id: 10 },
  payload: { table_name: 'Table 10' }
});
assert.equal(match.tableMatchesNotification(table10, eventIds), false,
  'DB table ID 10 must not mark separately identified Table 10 red');
assert.equal(match.tableMatchesNotification(differentDb10, eventIds), true,
  'Exact database table ID is accepted');
assert.equal(match.liveSnapshotMatches(table10, rowDb10, [row10, rowDb10]), false,
  'Snapshot for another physical ID cannot recolor Table 10');
assert.equal(match.liveSnapshotMatches(table10, row10, [row10, rowDb10]), true,
  'Canonical table ID reconciliation succeeds');
assert.equal(match.notificationCandidates({
  notification: { table_name: 'Table 10' }
}).length, 0, 'Label-only events never optimistically change physical occupancy');
assert.equal(matcher([table10, differentDb10], [{ number: '10' }])
  .liveSnapshotMatches(table10, { number: '10' }, [{ number: '10' }]), true,
  'Unique label-only legacy snapshot is supported');
assert.equal(matcher([table10, { dbTableId: 99, number: '10' }], [{ number: '10' }])
  .liveSnapshotMatches(table10, { number: '10' }, [{ number: '10' }]), false,
  'Duplicate table labels cannot write status across floors');

console.log('PASS: Floor live table ID/label reconciliation (7 checks)');
