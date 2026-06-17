#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

tiny_lines=$(wc -l < features/customer-menu/checkout/PaymentModal.tsx | awk '{print $1}')
if [[ "$tiny_lines" -gt 20 ]]; then
  fail "PaymentModal.tsx is $tiny_lines lines; expected tiny entrypoint"
fi
pass "PaymentModal.tsx remains tiny checkout entrypoint"

core_lines=$(wc -l < features/customer-menu/checkout/PaymentModalCore.tsx | awk '{print $1}')
if [[ "$core_lines" -gt 805 ]]; then
  fail "PaymentModalCore.tsx is $core_lines lines; expected <= 805 while panel split is staged"
fi
pass "PaymentModalCore.tsx line count: $core_lines"

router_lines=$(wc -l < features/customer-menu/checkout/CheckoutShellRouter.tsx | awk '{print $1}')
if [[ "$router_lines" -gt 45 ]]; then
  fail "CheckoutShellRouter.tsx is $router_lines lines; expected small router after themed route split"
fi
pass "CheckoutShellRouter.tsx line count: $router_lines"

for f in \
  features/customer-menu/checkout/CheckoutReviewPanel.tsx \
  features/customer-menu/checkout/CheckoutSplitPanel.tsx \
  features/customer-menu/checkout/CheckoutPaymentPanel.tsx \
  features/customer-menu/checkout/CheckoutReceiptPanel.tsx \
  features/customer-menu/checkout/ThemedCheckoutShellRoutes.tsx \
  features/customer-menu/checkout/NeutralReviewPanels.tsx \
  features/customer-menu/checkout/NeutralPaymentPanel.tsx \
  features/customer-menu/checkout/NeutralSplitBillPanel.tsx \
  features/customer-menu/checkout/NeutralOrderStatusPanel.tsx \
  features/customer-menu/checkout/paymentModalVisualStyles.ts \
  features/customer-menu/checkout/hooks/useCheckoutSplitState.ts \
  features/customer-menu/checkout/hooks/usePaymentModalRuntimeState.ts \
  features/customer-menu/checkout/paymentModalContextLabels.ts
do
  [[ -f "$f" ]] || fail "missing checkout panel/helper file: $f"
done
pass "checkout panel/helper decomposition files are present"

grep -q 'PaymentModalCore' features/customer-menu/checkout/PaymentModal.tsx || fail "PaymentModal entrypoint does not delegate to PaymentModalCore"
pass "PaymentModal entrypoint delegates to PaymentModalCore"

grep -q 'createPaymentModalVisualStyles' features/customer-menu/checkout/PaymentModalCore.tsx || fail "PaymentModalCore does not use extracted visual style helper"
pass "PaymentModalCore uses extracted visual style helper"

grep -q 'getPaymentModalContextLabels' features/customer-menu/checkout/PaymentModalCore.tsx || fail "PaymentModalCore does not use extracted context label helper"
pass "PaymentModalCore uses extracted context label helper"

grep -q 'useCheckoutSplitState' features/customer-menu/checkout/PaymentModalCore.tsx || fail "PaymentModalCore does not use extracted split state hook"
grep -q 'usePaymentModalRuntimeState' features/customer-menu/checkout/PaymentModalCore.tsx || fail "PaymentModalCore does not use extracted runtime state hook"
pass "PaymentModalCore uses extracted split/runtime state hooks"

grep -q 'renderThemedCheckoutShellRoute' features/customer-menu/checkout/CheckoutShellRouter.tsx || fail "CheckoutShellRouter does not delegate themed shell routes"
grep -q 'ModernGreenCheckoutShell' features/customer-menu/checkout/ThemedCheckoutShellRoutes.tsx || fail "ThemedCheckoutShellRoutes missing ModernGreenCheckoutShell"
grep -q 'KazenJapaneseCheckoutShell' features/customer-menu/checkout/ThemedCheckoutShellRoutes.tsx || fail "ThemedCheckoutShellRoutes missing KazenJapaneseCheckoutShell"
pass "themed checkout shell routes extracted"

for symbol in \
  CheckoutReviewPanel \
  CheckoutSplitPanel \
  CheckoutPaymentPanel \
  CheckoutReceiptPanel
do
  grep -q "$symbol" features/customer-menu/checkout/NeutralCheckoutShell.tsx || fail "NeutralCheckoutShell does not use $symbol"
done
pass "NeutralCheckoutShell uses canonical checkout panel boundaries"

echo "✅ payment modal architecture guard passed"
