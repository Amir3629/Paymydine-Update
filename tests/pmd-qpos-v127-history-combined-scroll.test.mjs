import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(
  'app/admin/assets/js/pmd-quick-pos-v1.js',
  'utf8'
);
const parityJs = fs.readFileSync(
  'app/admin/assets/js/pmd-qpos-web-parity-v112.js',
  'utf8'
);
const css = fs.readFileSync(
  'app/admin/assets/css/pmd-quick-pos-v1.css',
  'utf8'
);
const parityCss = fs.readFileSync(
  'app/admin/assets/css/pmd-qpos-web-parity-v112.css',
  'utf8'
);
const view = fs.readFileSync(
  'app/admin/views/pmd_quick_pos_v1.blade.php',
  'utf8'
);
const controller = fs.readFileSync(
  'app/admin/controllers/PmdQuickPosV1.php',
  'utf8'
);
const batch = fs.readFileSync(
  'app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php',
  'utf8'
);
const routes = fs.readFileSync(
  'routes/admin-quick-mode.php',
  'utf8'
);
const invoice = fs.readFileSync(
  'app/admin/views/orders/customer_invoice.blade.php',
  'utf8'
);
const combinedInvoice = fs.readFileSync(
  'app/admin/views/orders/combined_invoice_v127.blade.php',
  'utf8'
);
const floorScroll = fs.readFileSync(
  'app/admin/assets/css/pmd-floor-scroll-chain-v127.css',
  'utf8'
);
const ownerboard = fs.readFileSync(
  'app/admin/controllers/Ownerboard.php',
  'utf8'
);
const dashboard = fs.readFileSync(
  'app/admin/controllers/Dashboardlab.php',
  'utf8'
);
const clean = fs.readFileSync(
  'app/admin/classes/PmdCleanWorkspaceControllerV1.php',
  'utf8'
);
const reservations = fs.readFileSync(
  'app/admin/views/reservations2/index.blade.php',
  'utf8'
);
const floorView = fs.readFileSync(
  'app/admin/views/floor/index.blade.php',
  'utf8'
);

assert.equal(parityJs, js);
assert.equal(parityCss, css);

assert.ok(js.includes('PMD_QPOS_HISTORY_COMBINED_V127'));
assert.ok(js.includes('historyCombinedOrderIdsV127'));
assert.ok(js.includes('historyCombinedItemsV127'));
assert.ok(js.includes('/admin/pos/payment-batch-invoice?order_ids='));
assert.ok(js.includes('PMD_QPOS_MOBILE_CART_CHECKOUT_HIDE_V127'));
assert.ok(js.includes('is-mobile-checkout-reached-v127'));

assert.ok(css.includes('PMD_QPOS_MOBILE_HISTORY_SCROLL_V127'));
assert.ok(css.includes('.is-mobile-checkout-reached-v127'));
assert.ok(css.includes('overflow-y: visible !important'));
assert.ok(css.includes('touch-action: pan-y !important'));

assert.ok(controller.includes('PMD_QPOS_HISTORY_COMBINED_DATA_V127'));
assert.ok(controller.includes("'items' => $historyItemsV127"));
assert.ok(controller.includes("'combined_order_ids' => $combinedOrderIdsV127"));
assert.ok(controller.includes("'order_entries' => $historyOrderEntriesV127"));
assert.ok(controller.includes("'version' => 'pmd-qpos-history-v127'"));

assert.ok(batch.includes('PMD_QPOS_COMBINED_INVOICE_V127'));
assert.ok(batch.includes('public function batchInvoiceV127()'));
assert.ok(batch.includes("'Quick POS combined payment: '.implode(',', $ids)"));
assert.ok(routes.includes('PMD_QPOS_COMBINED_INVOICE_ROUTE_V127'));
assert.ok(routes.includes("'batchInvoiceV127'"));

assert.ok(combinedInvoice.includes('PMD_QPOS_COMBINED_INVOICE_VIEW_V127'));
assert.ok(combinedInvoice.includes('Combined Invoice'));
assert.ok(combinedInvoice.includes('pmdInvoiceBackV127'));
assert.ok(invoice.includes('PMD_INVOICE_BACK_V127'));
assert.ok(invoice.includes('pmdInvoiceBackV127'));

assert.ok(floorScroll.includes('PMD_FLOOR_SCROLL_CHAIN_V127'));
assert.ok(floorScroll.includes('overscroll-behavior-y: auto !important'));
assert.ok(floorScroll.includes('touch-action: pan-x pan-y !important'));
assert.ok(ownerboard.includes('pmd-floor-scroll-chain-v127.css'));
assert.ok(dashboard.includes('pmd-floor-scroll-chain-v127.css'));
assert.ok(clean.includes('pmd-floor-scroll-chain-v127.css'));
assert.ok(reservations.includes('pmd-floor-scroll-chain-v127.css'));
assert.ok(floorView.includes('pmd-floor-scroll-chain-v127.css'));
assert.ok(view.includes('pmd-floor-scroll-chain-v127.css'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v127'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v127'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v127'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v127'));

assert.ok(css.includes('PMD_QPOS_KEYBOARD_CATEGORY_POSITION_V126'));
assert.ok(css.includes('PMD_QPOS_HISTORY_FOOD_PREVIEW_V125'));
assert.ok(js.includes('PMD_QPOS_HISTORY_ITERATION_HOTFIX_V124'));
assert.ok(js.includes('PMD_QPOS_BATCH_MAIN_PAY_V122'));

console.log(
  'PMD V127 combined History/invoice + mobile rail + touch scroll handoff: PASS'
);
