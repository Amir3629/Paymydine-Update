#!/usr/bin/env node
'use strict';
/* PMD_V2_PERF_R47_REGRESSIONS: source contracts and actual pure snapshot
 * comparisons. Does not send money, create payment sessions or hit the network.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.argv[2] || process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = read('src/runtime/MenuRuntimeContext.tsx');
const smart = read('src/runtime/SmartMenuRuntimeContext.tsx');
const overlay = read('src/runtime/components/RuntimeOverlays.tsx');
const health = read('app/api/health/route.ts');
let count = 0;
function check(description, fn) {
  fn(); count += 1; console.log('PASS R47: ' + description);
}
function extractSnapshot(name, src) {
  const head = 'function ' + name + '<T>(previous: T, next: T): boolean {';
  const start = src.indexOf(head);
  assert(start >= 0, name + ' missing');
  const end = src.indexOf('\n}', start);
  assert(end > start, name + ' unclosed');
  const js = 'function ' + name + '(previous, next) {' +
    src.slice(start + head.length, end) + '\n}';
  return new Function('"use strict"; return (' + js + ')')();
}
const example = {
  orderId: 14, status: 'awaiting_payment', orderOrigin: 'guest_self',
  totals: { remainingAmount: 32.5, paid: 0 },
  items: [{ menuId: '4', quantity: 2, unpaidQuantity: 2, guestSessionId: 's1' }],
};
const copy = () => JSON.parse(JSON.stringify(example));

check('unchanged base order snapshot preserves React identity', () => {
  const compare = extractSnapshot('sameOrderSnapshotR47', base);
  assert.equal(compare([example], [copy()]), true);
  assert.equal(compare(null, null), true);
  assert.equal(compare([], []), true);
});
check('base snapshot detects changed payment, kitchen and guest items', () => {
  const compare = extractSnapshot('sameOrderSnapshotR47', base);
  for (const changed of [
    { ...copy(), totals: { ...example.totals, remainingAmount: 0 } },
    { ...copy(), status: 'paid' },
    { ...copy(), items: [{ ...example.items[0], quantity: 3 }] },
  ]) assert.equal(compare([copy()], [changed]), false);
});
check('unchanged R60T private snapshot preserves React identity', () => {
  const compare = extractSnapshot('sameFlowSnapshotR47', smart);
  assert.equal(compare([example], [copy()]), true);
  assert.equal(compare([example], [{ ...copy(), status: 'kitchen_released' }]), false);
});
check('ONE shared smart guest runtime for all menu, toolbar and checkout consumers', () => {
  assert(smart.includes('PMD_V2_PERF_R47_SHARED_GUEST_RUNTIME'));
  assert(smart.includes('const SmartRuntimeValueContext = createContext<SmartRuntimeValue | null>(null)'));
  assert(smart.includes('function SmartRuntimeValueProvider({ children }'));
  assert(smart.includes('const value = useSmartMenuRuntimeValue()'));
  assert(smart.includes('<SmartRuntimeValueContext.Provider value={value}>'));
  assert(smart.includes('<SmartRuntimeValueProvider>{children}</SmartRuntimeValueProvider>'));
  const start = smart.indexOf('export function useMenuRuntime(): SmartRuntimeValue {');
  const end = smart.indexOf('function useSmartMenuRuntimeValue(): SmartRuntimeValue {',start);
  assert(start > 0 && end > start);
  const consumer = smart.slice(start,end);
  assert(consumer.includes('useContext(SmartRuntimeValueContext)'));
  assert(!consumer.includes('useState('));
  assert(!consumer.includes('useEffect('));
  assert(!consumer.includes('useBaseMenuRuntime()'));
  assert.equal(smart.split('function useSmartMenuRuntimeValue(): SmartRuntimeValue {').length-1,1);
  assert.equal(smart.split('const flowRequestSeqR47 = useRef(0)').length-1,1);
  assert(read('tsconfig.json').includes('SmartMenuRuntimeContext.tsx'));
});
check('scheduled base 3-second poll cannot overlap itself', () => {
  assert(base.includes('PMD_V2_PERF_R47_POLL_SINGLE_FLIGHT'));
  assert(base.includes("if (cancelled || polling || document.visibilityState === 'hidden') return"));
  assert(base.includes('try { await refreshOrder() }'));
  assert(base.includes('finally { polling = false }'));
  assert(base.includes('window.setInterval(run, 3000)'));
  assert(base.includes('const refreshOrder = useCallback(async () => {'));
  assert(!base.includes('setTableOrders(next.orders)'));
});
check('latest explicit order refresh wins over older pending poll response', () => {
  assert(base.includes('PMD_V2_PERF_R47_LATEST_REQUEST_WINS'));
  assert(base.includes('const sequence = ++orderRequestSeqR47.current'));
  assert(base.includes('if (sequence !== orderRequestSeqR47.current) return'));
  assert(smart.includes('PMD_V2_PERF_R47_LATEST_PRIVATE_REQUEST'));
  assert(smart.includes('const sequence = ++flowRequestSeqR47.current'));
  assert(smart.includes('if (sequence !== flowRequestSeqR47.current) return'));
});
check('private R60T polling does not rely on public array identity', () => {
  assert(smart.includes('PMD_V2_PERF_R47_PRIVATE_POLL_INDEPENDENT'));
  assert(smart.includes('try { await refreshFlow() }'));
  assert(smart.includes('finally { polling = false }'));
  assert(smart.includes('window.setInterval(run, 3000)'));
  assert(!smart.includes('[base.tableOrders, flowGuestSessionId, isR60tActive, refreshFlow]'));
  assert(smart.includes('refreshOrder: refreshFlow'));
  assert(smart.includes('window.addEventListener(\'focus\', onFocus)'));
  assert(smart.includes('document.addEventListener(\'visibilitychange\', onVisible)'));
});
check('payment capability GET is single-flight, short-lived and tenant origin scoped', () => {
  assert(overlay.includes('PMD_V2_PERF_R47_PAYPAL_SINGLE_FLIGHT'));
  assert(overlay.includes('paypalFallbackCacheR47 = new Map'));
  assert(overlay.includes('window.location.host.toLowerCase()'));
  assert(overlay.includes('now - cached.at < 30000'));
  assert(overlay.includes('if (cached && now - cached.at < 30000) return cached.promise'));
  assert(overlay.includes("cache: 'no-store'"));
  assert(overlay.includes("paypalFallbackCacheR47.set(host, { at: now, promise })"));
});
check('explicitly disabled PayPal never revived by compatibility fallback', () => {
  assert(overlay.includes("const hasExplicitPaypal = payments.some((entry) => String(entry.code || '').toLowerCase() === 'paypal')"));
  assert(overlay.includes('if (hasExplicitPaypal) return'));
  assert(overlay.includes('if (!paypalFallback || hasExplicitPaypal) return rows'));
  assert(overlay.includes('payments.filter((entry) => entry.enabled !== false)'));
});
check('Worldline card prewarm happens ONLY for selected method', () => {
  assert(overlay.includes('PMD_V2_PERF_R47_SELECTED_CARD_ONLY'));
  const at = overlay.indexOf('const canPrewarmWorldlineCard =');
  assert(at >= 0);
  const section = overlay.slice(at, overlay.indexOf('const applyCoupon = async', at));
  assert(section.includes("selectedCode === 'card'"));
  assert(section.includes("selectedProvider === 'worldline'"));
  assert(!section.includes('paymentChoices.some'));
  assert(overlay.includes('WorldlineCardSessionPrewarmer'));
});
check('touch controls and mobile modal blur retain visual accessibility', () => {
  const globals = read('app/globals.css');
  const modal = read('src/runtime/components/RuntimeOverlays.module.css');
  assert(globals.includes('PMD_V2_PERF_R47_TOUCH_ACTION'));
  assert(globals.includes('touch-action: manipulation;'));
  assert(modal.includes('PMD_V2_PERF_R47_MOBILE_BACKDROP'));
  assert(modal.includes('@media (max-width: 759px)'));
  assert(modal.includes('backdrop-filter: blur(3px)'));
  assert(modal.includes('backdrop-filter: blur(10px)'));
  assert(modal.includes('cursor: pointer;'));
});
check('actual payment settlement authority, grouping and provider buttons remain', () => {
  for (const x of [
    'prepareSplitPaymentIntent(', 'startHostedProviderPayment(', 'payExistingOrder(',
    'finalizeExistingOrderPayment(', '<StripeInlinePayment', '<SquareInlinePayment',
    '<SumupInlinePayment', '<PayPalButton', '<WorldlineDirectMethodButton',
    '<WorldlineCardSessionPrewarmer', '<MultiOrderPaymentPanel',
    '<PaymentPanel', "data-pmd-payment-order-id",
  ]) assert(overlay.includes(x), x);
});
check('QR guard is retained and health identifies the NEW performance build', () => {
  assert(health.includes("qrGuardRelease: 'r17f-disabled-table-active'"));
  assert(health.includes("perfRelease: 'r47-checkout-fast-open'"));
  const table = read('app/table/[tableId]/page.tsx');
  const home = read('app/CustomerMenuRoute.tsx');
  assert(table.includes('PMD_V2_TABLE_ROUTE_FAIL_CLOSED_R17'));
  assert(home.includes('PMD_V2_CUSTOMER_ROUTE_FAIL_CLOSED_R17C'));
});
console.log('R47 performance source regressions: ' + count + ' groups passed.');
