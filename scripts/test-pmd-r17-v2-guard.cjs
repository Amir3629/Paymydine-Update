#!/usr/bin/env node
'use strict';
// Execute the ACTUAL V2 normalizeTable TypeScript function against guest QR
// payloads. Compiles only its helper closure (no server/network access).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(process.argv[2] || '');
if (!root || !fs.existsSync(path.join(root, 'src/server/normalize.ts'))) {
  console.error('Usage: node scripts/test-pmd-r17-v2-guard.cjs ACTIVE_V2_DIR');
  process.exit(2);
}
const ts = require(path.join(root, 'node_modules/typescript'));
const normalize = fs.readFileSync(path.join(root, 'src/server/normalize.ts'), 'utf8');
const helpersStart = normalize.indexOf('const str =');
const helpersEnd = normalize.indexOf('const nullableNumber =', helpersStart);
const functionStart = normalize.indexOf('export function normalizeTable(');
const functionEnd = normalize.indexOf('\n}\n\nfunction orderLines(', functionStart);
assert(helpersStart > 0 && helpersEnd > helpersStart && functionStart > helpersEnd && functionEnd > functionStart, 'Unexpected V2 normalizeTable syntax; fail closed');
const source = normalize.slice(helpersStart, helpersEnd) +
  '\n' + normalize.slice(functionStart, functionEnd + 2).replace('export function normalizeTable', 'function normalizeTable');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true
});
assert(!compiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error), 'V2 QR normalizer failed TS compilation');
const fn = vm.runInNewContext(compiled.outputText + '\nnormalizeTable;', {console}, {timeout: 1000});
const ctx = {tableId:null,tableNo:'6',qr:null};
const test = (name, input, expectedValid, expectedDisabled, context=ctx) => {
  const r = fn(input,context);
  assert.equal(r.valid,expectedValid,name+' valid');
  assert.equal(Boolean(r.disabled),expectedDisabled,name+' disabled');
  console.log('PASS R17 V2 QR: '+name);
};
test('active table opens menu',{success:true,data:{table_id:42,table_no:6,status:1}},true,false);
test('active but physically occupied is still enabled',{success:true,data:{table_id:42,table_no:6,status:'occupied'}},true,false);
test('canonical API disabled response',{success:false,code:'table_disabled',table_disabled:true,data:{table_id:42,table_no:6,status:false}},false,true);
test('legacy API success:true/table_status:0',{success:true,data:{table_id:42,table_no:6,table_status:0}},false,true);
test('legacy success:true/status:false',{success:true,data:{table_id:42,table_no:6,status:false}},false,true);
test('legacy success:true/status string zero',{success:true,data:{table_id:42,table_no:6,status:'0'}},false,true);
test('legacy success:true/enabled:false',{success:true,data:{table_id:42,table_no:6,enabled:false}},false,true);
test('missing/unknown table',{success:false,error:'Table not found'},false,false);
test('QR number mismatch fails closed',{success:true,data:{table_id:42,table_no:7,status:1}},false,false);

const table = fs.readFileSync(path.join(root,'app/table/[tableId]/page.tsx'),'utf8');
const home = fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');
assert(table.includes('bootstrap.table.disabled || !bootstrap.table.valid'), 'Direct /table V2 route is unguarded');
assert(home.includes('PMD_V2_HOME_QR_FAIL_CLOSED_R17') || home.includes('CustomerMenuRoute'), 'Query QR V2 route is unguarded');
if (home.includes('CustomerMenuRoute')) {
  const route = fs.readFileSync(path.join(root,'app/CustomerMenuRoute.tsx'),'utf8');
  assert(route.includes('bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)'), 'Modern Home route missing table gating');
}
console.log('PASS R17 V2: both direct and query QR routes are guarded.');
