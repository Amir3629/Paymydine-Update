#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

for f in \
  features/customer-menu/hooks/useTableQrContext.ts \
  features/customer-menu/hooks/useMenuLoader.ts \
  features/customer-menu/hooks/useCheckoutState.ts \
  features/customer-menu/hooks/useGuestSession.ts
do
  [[ -f "$f" ]] || fail "missing controller hook: $f"
done
pass "customer menu controller hooks are present"

for needle in \
  'useTableQrContext' \
  'useMenuLoader' \
  'useCheckoutState' \
  'useGuestSession'
do
  grep -q "$needle" features/customer-menu/CustomerMenuPage.tsx || fail "CustomerMenuPage does not use $needle"
done
pass "CustomerMenuPage uses extracted controller hooks"

page_lines=$(wc -l < features/customer-menu/CustomerMenuPage.tsx | awk '{print $1}')
if [[ "$page_lines" -gt 460 ]]; then
  fail "CustomerMenuPage.tsx is $page_lines lines; expected <= 460 after controller hook extraction"
fi
pass "CustomerMenuPage.tsx line count: $page_lines"

if grep -q 'getMenuData' features/customer-menu/CustomerMenuPage.tsx; then
  fail "CustomerMenuPage still owns menu loader/getMenuData"
fi
pass "menu loader moved out of CustomerMenuPage"

if grep -q 'buildTableOrderDraftContext' features/customer-menu/CustomerMenuPage.tsx; then
  fail "CustomerMenuPage still owns table order draft context building"
fi
pass "table QR/order context moved out of CustomerMenuPage"

if grep -q 'calculateCartPricingSummary' features/customer-menu/CustomerMenuPage.tsx; then
  fail "CustomerMenuPage still owns checkout pricing summary calculation"
fi
pass "checkout pricing state moved out of CustomerMenuPage"

echo "✅ customer menu controller guard passed"
