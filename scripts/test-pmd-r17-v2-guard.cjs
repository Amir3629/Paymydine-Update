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
test('legacy numeric table_disabled:1',{success:true,data:{table_id:42,table_no:6,table_disabled:1}},false,true);
test('legacy string disabled:true',{success:true,data:{table_id:42,table_no:6,disabled:'true'}},false,true);
test('missing/unknown table',{success:false,error:'Table not found'},false,false);
test('QR number mismatch fails closed',{success:true,data:{table_id:42,table_no:7,status:1}},false,false);

const healthSource = fs.readFileSync(path.join(root,'app/api/health/route.ts'),'utf8');
assert(healthSource.includes("qrGuardRelease: 'r17f-disabled-table-active'"),
  'R17F health identity must be compiled into the new V2 release');
console.log('PASS R17F: new V2 health identity present in staged build sources.');

const table = fs.readFileSync(path.join(root,'app/table/[tableId]/page.tsx'),'utf8');
const home = fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');
assert(table.includes('bootstrap.table.disabled || !bootstrap.table.valid'),
  'Direct /table V2 route is unguarded');
const delegatedHome = home.includes('CustomerMenuRoute');
const standaloneHome = home.includes('PMD_V2_HOME_QR_FAIL_CLOSED_R17');
assert(delegatedHome || standaloneHome, 'Query QR V2 entrypoint is unguarded');

async function verifyDelegatedHome() {
  if (!delegatedHome) {
    console.log('PASS R17C: legacy Home QR guard is present.');
    return;
  }

  const route = fs.readFileSync(path.join(root,'app/CustomerMenuRoute.tsx'),'utf8');
  const existingGuard =
    route.includes('if (!isKiosk)') &&
    route.includes('bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)') &&
    route.includes('return <CustomerTableFallback');
  const r17cGuard =
    route.includes('PMD_V2_CUSTOMER_ROUTE_FAIL_CLOSED_R17C') &&
    route.includes('if (!isKiosk && requestedTable &&') &&
    route.includes('bootstrap.table.disabled || !bootstrap.table.valid') &&
    route.includes('return <PmdGuestTableInactiveR17');
  assert(existingGuard || r17cGuard,
    'Real CustomerMenuRoute does not block a disabled/unverified physical table.');
  const gatingPoint = existingGuard
    ? route.indexOf('bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)')
    : route.indexOf('PMD_V2_CUSTOMER_ROUTE_FAIL_CLOSED_R17C');
  assert(gatingPoint < route.indexOf('<ThemeRenderer themeId={bootstrap.theme.id} />'),
    'The table guard must run before the customer ThemeRenderer.');

  // Execute the REAL staged CustomerMenuRoute TSX server component in a
  // dependency-isolated VM. It must block disabled and unknown tables while
  // preserving valid menus and intentionally tableless kiosk routes.
  const transpiled = ts.transpileModule(route, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });
  assert(!transpiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error),
    'CustomerMenuRoute TypeScript compilation failed');

  const render = (type, props) => ({type, props});
  let tableState = {valid: true, disabled: false, number: '6', id: '42'};
  const imported = (name) => {
    if (name === 'react/jsx-runtime') return {
      jsx: render, jsxs: render, Fragment: 'Fragment',
    };
    if (name === '@/src/runtime/MenuRuntimeContext') return {
      MenuRuntimeProvider: 'MenuRuntimeProvider',
    };
    if (name === '@/src/server/page-context') return {
      getPageContext: async rawSearch => ({
        tableId: rawSearch.table_id || rawSearch.table || null,
        tableNo: rawSearch.table_no || null,
        qr: rawSearch.qr || null,
      }),
    };
    if (name === '@/src/server/bootstrap') return {
      loadCustomerBootstrap: async () => ({
        table: {...tableState},
        theme: {id:'jade'},
        features: {},
        setup: {frontendConfigured:true, status:{hasCategories:true,hasMenuItems:true}},
      }),
    };
    if (name.startsWith('@/')) {
      const namePart = name.split('/').at(-1);
      return {[namePart]: namePart};
    }
    throw new Error('Unexpected customer route module: ' + name);
  };
  const mod = {exports:{}};
  vm.runInNewContext(transpiled.outputText, {
    module:mod, exports:mod.exports, require:imported,
  }, {timeout:1000});
  const component = mod.exports.CustomerMenuRoute;
  assert.equal(typeof component, 'function', 'V2 CustomerMenuRoute not exported');

  async function checkPage(label, rawSearch, state, expected) {
    tableState = state;
    const node = await component({rawSearch});
    assert.equal(node.type,expected,label);
    console.log('PASS R17C Home: ' + label);
  }
  const inactive = existingGuard
    ? 'CustomerTableFallback' : 'PmdGuestTableInactiveR17';
  await checkPage('disabled table blocked',
    {table_no:'6'}, {valid:false,disabled:true,number:'6',id:'42'}, inactive);
  await checkPage('unknown QR table blocked',
    {qr:'invalid-qr'}, {valid:false,disabled:false,number:null,id:null}, inactive);
  await checkPage('valid table menu retained',
    {table_no:'6'}, {valid:true,disabled:false,number:'6',id:'42'},
    'MenuRuntimeProvider');
  await checkPage('tableless menu retained',
    {}, {valid:false,disabled:false,number:null,id:null}, 'MenuRuntimeProvider');
  await checkPage('kiosk bypasses table-dependent fallback intentionally',
    {pmd_kiosk:'1',table_no:'6'}, {valid:false,disabled:true,number:'6',id:'42'},
    'MenuRuntimeProvider');
  console.log('PASS R17C: actual CustomerMenuRoute behavior tested for all modes.');
}

verifyDelegatedHome().then(() => {
  console.log('PASS R17C V2: both direct and query QR routes protected.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
