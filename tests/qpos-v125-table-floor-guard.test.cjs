'use strict';
// Focused regression test for the two canonical Quick POS JavaScript builds.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, 'Missing function: ' + signature);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = brace; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error('Unclosed function: ' + signature);
}

for (const path of [
  'app/admin/assets/js/pmd-quick-pos-v1.js',
  'app/admin/assets/js/pmd-qpos-web-parity-v112.js',
]) {
  const src = fs.readFileSync(path, 'utf8');
  const state = {
    activeFloorId: '10', defaultFloorId: '10',
    floors: [{id: 10}, {id: 20}],
    tables: [
      {id: 1, floor_id: 10},
      {id: 2, floor_id: 20},
      {id: 3},
      {id: 4, floor_id: ''},
      {id: 5, floor_id: 999},
    ],
  };
  const ctx = vm.createContext({state});
  vm.runInContext(extractFunction(src, 'function activeFloorTables()'), ctx);
  const visible = () => Array.from(vm.runInContext('activeFloorTables()', ctx), t => t.id);
  assert.deepEqual(visible(), [1,3,4,5], 'default floor fallback');
  state.activeFloorId = '20';
  assert.deepEqual(visible(), [2], 'explicit custom floor only');
  state.activeFloorId = '10';
  state.floors = [];
  assert.deepEqual(visible(), [1,2,3,4,5], 'no floor metadata: show all tables');
  state.floors = [{id:10},{id:20}];
  state.activeFloorId = '';
  assert.deepEqual(visible(), [1,2,3,4,5], 'no active floor: show all tables');
  assert.match(src, /PMD_QPOS_PRESERVE_TABLE_FLOOR_V125/);
  assert.match(src, /PMD_QPOS_TABLE_FLOOR_FALLBACK_V125/);
  console.log('PASS ' + path);
}
console.log('PASS QPOS V125 table floor regression');
