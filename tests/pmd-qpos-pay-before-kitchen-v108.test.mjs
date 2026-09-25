import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const js = read('app/admin/assets/js/pmd-quick-pos-v1.js');
const save = read('app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php');
const quick = read('app/admin/controllers/PmdQuickPosV1.php');
const persist = read('app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php');
const settle = read('app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php');
const terminal = read('app/Services/TerminalPayments/TerminalPaymentService.php');
const kds = read('app/admin/controllers/KitchenDisplay.php');

assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
assert.ok(js.includes("submitOrder(payBeforeKitchen ? 'hold' : 'send', 'pay')"));
assert.ok(!js.includes("submitOrder('send', 'pay');"));
assert.ok(js.includes('payment_gate: snapshot.paymentGate'));
assert.ok(js.includes('snapshot.forceNewCheck ||'));

assert.ok(save.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
assert.ok(save.includes("paymentGate ? 'send' : $mode"));
assert.ok(save.includes("'payment_gate' => $paymentGate"));
assert.ok(save.includes('PMD_MOBILE_PAY_BEFORE_KITCHEN_V108'));
assert.ok(save.includes('PMD_DELIVERY_PAY_BEFORE_KITCHEN_V108'));

assert.ok(quick.includes('PMD_QPOS_PICKUP_PAY_BEFORE_KITCHEN_V108'));
assert.ok(quick.includes("paymentGate ? 'send' : $mode"));
assert.ok(persist.includes('PMD_QPOS_PAYMENT_GATE_IDENTITY_V108'));

assert.ok(
  settle.includes("if (Schema::hasColumn('orders', 'processed') && $newStatus === 'paid')")
);
assert.ok(
  terminal.includes("'processed'=>1")
);
assert.ok(
  kds.includes("->whereIn('status_id', $this->pmdKitchenStatusIdsV82())") &&
  kds.includes("->where('processed', 1)")
);

console.log('PMD Quick POS V108 pay-before-kitchen contract: PASS');
