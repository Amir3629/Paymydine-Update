import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const themeIds = [
  'noir-editorial',
  'verdant-modern',
  'lumiere-fine-dining',
  'kazen-japanese',
  'azzurra-coastal',
  'neon-cocktail-bar',
  'art-deco-speakeasy',
  'shahrazad-persian',
  'anatolia-turkish',
  'ember-steakhouse',
]

for (const themeId of themeIds) {
  const dir = path.join(root, 'src', 'themes', themeId)
  const tsx = fs.readdirSync(dir).find((name) => name.endsWith('.tsx'))
  if (!tsx) {
    failures.push(`${themeId}: missing TSX theme entry`)
    continue
  }
  const content = fs.readFileSync(path.join(dir, tsx), 'utf8')
  const required = [
    'RestaurantLogo',
    'LanguageSelect',
    '<HeaderValetButton />',
    'PlatformFooter',
    'RuntimeOverlays',
    'ThemeBottomToolBar',
    'openItem',
  ]
  for (const marker of required) {
    if (!content.includes(marker)) failures.push(`${themeId}: missing ${marker}`)
  }
}

// PMD_SHARED_TOOLBAR_FEATURE_AUDIT_R28D
// Shared runtime owns behavior; each of the ten themes only renders the shared toolbar.
const toolbarPath = path.join(root, 'src/runtime/components/ThemeBottomToolBar.tsx')
if (!fs.existsSync(toolbarPath)) {
  failures.push('ThemeBottomToolBar: shared toolbar file is missing')
} else {
  const toolbar = fs.readFileSync(toolbarPath, 'utf8')
  for (const marker of [
    "openService('waiter')",
    "openService('note')",
    "openService('valet')",
    'openCheckout()',
    'openCart()',
    'data-pmd-unified-bottom-bar="r14"',
  ]) {
    if (!toolbar.includes(marker)) failures.push(`ThemeBottomToolBar: missing ${marker}`)
  }
}

// PMD_HEADER_VALET_R31
const sharedPieces = fs.readFileSync(path.join(root, 'src/runtime/components/SharedPieces.tsx'), 'utf8')
for (const marker of ['export function HeaderValetButton', 'data-pmd-header-valet="r31"', "openService('valet')", 'PMD_HEADER_VALET_ALWAYS_VISIBLE_R31C']) {
  if (!sharedPieces.includes(marker)) failures.push(`SharedPieces header valet: missing ${marker}`)
}
const sharedPiecesCss = fs.readFileSync(path.join(root, 'src/runtime/components/SharedPieces.module.css'), 'utf8')
for (const marker of ['PMD_HEADER_VALET_R31', '.headerValetButton', '.headerValetLabel']) {
  if (!sharedPiecesCss.includes(marker)) failures.push(`SharedPieces header valet CSS: missing ${marker}`)
}

const runtime = fs.readFileSync(path.join(root, 'src/runtime/MenuRuntimeContext.tsx'), 'utf8')
for (const marker of [
  'confirmCartItems',
  'submitTableOrder',
  'fetchTableOrder',
  'callWaiter',
  'requestValet',
  'setInterval',
  'markOrderPaid',
]) {
  if (!runtime.includes(marker)) failures.push(`MenuRuntimeContext: missing ${marker}`)
}

const overlays = fs.readFileSync(path.join(root, 'src/runtime/components/RuntimeOverlays.tsx'), 'utf8')
for (const marker of [
  "'full'",
  "'equal'",
  "'items'",
  "'shares'",
  'validateCoupon',
  'tipPercent',
  'payExistingOrder',
  'startHostedProviderPayment',
  'PayPalButton',
  'selectedItemsPayload',
  'submitTableOrder',
]) {
  if (!overlays.includes(marker)) failures.push(`RuntimeOverlays: missing ${marker}`)
}

// PMD_FRONTEND_V2_PAID_ORDER_REVIEW_R30
const reviewClientApi = fs.readFileSync(path.join(root, 'src/lib/client-api.ts'), 'utf8')
for (const marker of ['export async function submitReview', "'/api/v1/reviews'"]) {
  if (!reviewClientApi.includes(marker)) failures.push(`client-api: missing ${marker}`)
}
for (const marker of ['submitReview', 'data-pmd-paid-order-review="r30"', 'PaidOrderReviewCard']) {
  if (!overlays.includes(marker)) failures.push(`RuntimeOverlays review: missing ${marker}`)
}

// PMD_MULTI_ORDER_PAYMENT_R32 / PMD_R36_GROUP_PAYMENT_AUTHORITY
// R32's child-order loop remains only as a legacy compatibility fallback. New R36
// single- and multi-order payments must reserve and settle the server Billing Group.
const multiOrderClient = fs.readFileSync(path.join(root, 'src/lib/client-api.ts'), 'utf8')
const multiOrderReturn = fs.readFileSync(path.join(root, 'app/payment/return/PaymentReturnClient.tsx'), 'utf8')
const multiOrderPaypal = fs.readFileSync(path.join(root, 'src/runtime/components/PayPalButton.tsx'), 'utf8')
const multiOrderStripe = fs.readFileSync(path.join(root, 'src/runtime/components/StripeInlinePayment.tsx'), 'utf8')
const multiOrderCss = fs.readFileSync(path.join(root, 'src/runtime/components/RuntimeOverlays.module.css'), 'utf8')
for (const marker of ['MultiOrderPaymentPanel', 'data-pmd-multi-order-picker="r32"', 'data-pmd-multi-order-payment="r32"', 'orderAllocations']) {
  if (!overlays.includes(marker)) failures.push(`RuntimeOverlays multi-order: missing ${marker}`)
}
for (const marker of [
  'ExistingOrderPaymentAllocation',
  'reserveExistingOrderGroupPayment',
  'settleBillingGroupPayment',
  'settleExistingOrderGroup',
  'billingGroupPaymentId',
  'Final Bill payment reservation is missing',
  'couponCode: allocation.couponCode',
  'attempt < 3',
  'orderAllocations',
]) {
  if (!multiOrderClient.includes(marker)) failures.push(`client-api R36 group payment: missing ${marker}`)
}
for (const marker of [
  'PMD_R36_PAYMENT_RETURN_AUTHORITY',
  'settleExistingOrderGroup',
  'pending.orderAllocations',
  'pending.billingGroupPaymentId',
  'Final Bill was settled atomically',
  'Do not pay again',
]) {
  if (!multiOrderReturn.includes(marker)) failures.push(`PaymentReturnClient R36 group payment: missing ${marker}`)
}
for (const marker of [
  'reserveExistingOrderGroupPayment',
  'settleExistingOrderGroup',
  'orderAllocations',
  'r36ReservationRef',
  'billing_group_payment_id',
  'Do not pay again',
]) {
  if (!multiOrderPaypal.includes(marker)) failures.push(`PayPalButton R36 group payment: missing ${marker}`)
}
for (const marker of [
  'reserveExistingOrderGroupPayment',
  'settleExistingOrderGroup',
  'orderAllocations',
  'r36ReservationRef',
  'billing_group_payment_id',
  'Do not pay again',
]) {
  if (!multiOrderStripe.includes(marker)) failures.push(`StripeInlinePayment R36 group payment: missing ${marker}`)
}
for (const marker of ['PMD_MULTI_ORDER_PAYMENT_R32', '.multiOrderSelectionSummary', '.multiOrderList', 'data-pmd-multi-order-picker="r32"']) {
  if (!multiOrderCss.includes(marker)) failures.push(`RuntimeOverlays CSS multi-order: missing ${marker}`)
}

// PMD_DIRECT_KITCHEN_SEND_R33B
const directOrderRuntime = fs.readFileSync(path.join(root, 'src/runtime/MenuRuntimeContext.tsx'), 'utf8')
for (const marker of [
  'PMD_DIRECT_KITCHEN_SEND_R33B',
  'await confirmCartItems({',
  'await submitTableOrderApi({',
  'Only now is the personal cart allowed to disappear.',
  "setOverlay('checkout')",
]) {
  if (!directOrderRuntime.includes(marker)) failures.push(`MenuRuntimeContext direct-send: missing ${marker}`)
}
const directOrderOverlays = fs.readFileSync(path.join(root, 'src/runtime/components/RuntimeOverlays.tsx'), 'utf8')
for (const marker of [
  'PMD_DIRECT_KITCHEN_SEND_R33B',
  'data-pmd-direct-kitchen-send="r33b"',
  'data-pmd-direct-send-recovery="r33b"',
  'data-pmd-multi-guest-payment-hint="r33b"',
  'r33DirectOrderCopy',
  'orderingGuestCount > 1',
]) {
  if (!directOrderOverlays.includes(marker)) failures.push(`RuntimeOverlays direct-send: missing ${marker}`)
}

// PMD_CHECKOUT_DIRECT_TABLE_ORDERS_R34
const checkoutRoutingR34 = fs.readFileSync(path.join(root, 'src/runtime/MenuRuntimeContext.tsx'), 'utf8')
for (const marker of [
  'PMD_CHECKOUT_DIRECT_TABLE_ORDERS_R34',
  "setOverlay('checkout')",
]) {
  if (!checkoutRoutingR34.includes(marker)) failures.push(`MenuRuntimeContext checkout routing R34: missing ${marker}`)
}
if (checkoutRoutingR34.includes("setOverlay(cart.length > 0 ? 'cart' : 'checkout')")) {
  failures.push('MenuRuntimeContext checkout routing R34: legacy cart-first redirect is still present')
}

const sharedOverlayCssR34 = fs.readFileSync(path.join(root, 'src/runtime/components/RuntimeOverlays.module.css'), 'utf8')
for (const marker of [
  'PMD_SHARED_ACTION_ICON_ALIGNMENT_R34',
  '.primary > svg',
  '.tab > svg',
  '.method > svg',
  'justify-content: center',
]) {
  if (!sharedOverlayCssR34.includes(marker)) failures.push(`RuntimeOverlays shared icon alignment R34: missing ${marker}`)
}

// PMD_SPLIT_PAYMENT_SAFETY_R35
for (const marker of [
  'PMD_SPLIT_PAYMENT_SAFETY_R35',
  'prepareSplitPaymentIntent',
  'data-pmd-split-safety',
  'prepareSplitIntent=',
]) {
  if (!overlays.includes(marker) && !multiOrderClient.includes(marker) && !multiOrderPaypal.includes(marker)) {
    failures.push(`R35 split safety: missing ${marker}`)
  }
}

const normalizer = fs.readFileSync(path.join(root, 'src/server/normalize.ts'), 'utf8')
for (const marker of [
  'allergens',
  'halal',
  'vegetarian',
  'vegan',
  'nutrition',
  'options',
  'isChefRecommended',
  'isBestseller',
  'prepTimeMinutes',
  'normalizeSocial',
  'normalizeFeatures',
  'normalizePayments',
]) {
  if (!normalizer.includes(marker)) failures.push(`normalize.ts: missing ${marker}`)
}

const i18n = fs.readFileSync(path.join(root, 'src/lib/i18n.ts'), 'utf8')
for (const locale of ['en', 'de', 'fa', 'tr', 'ja']) {
  if (!new RegExp(`const\\s+${locale}\\s*:`).test(i18n)) failures.push(`i18n: locale ${locale} is missing`)
}
if (!i18n.includes("['fa', 'ar', 'he', 'ur']")) failures.push('i18n: RTL locale handling is missing')

if (failures.length) {
  console.error('PMD V2 FEATURE COVERAGE AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`PMD V2 FEATURE COVERAGE AUDIT: PASS (${themeIds.length} themes + shared business flows)`)
