#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

[[ -f playwright.config.ts ]] || fail "missing playwright.config.ts"
[[ -f e2e/checkout-full.spec.ts ]] || fail "missing checkout-full.spec.ts"
pass "Playwright config and checkout spec exist"

node -e '
const pkg=require("./package.json")
for (const script of ["e2e:checkout","e2e:checkout:headed","e2e:checkout:report"]) {
  if (!pkg.scripts?.[script]) {
    console.error("missing script", script)
    process.exit(1)
  }
}
'
pass "Playwright package scripts exist"

grep -q '@playwright/test' package.json || fail "@playwright/test dependency missing"
pass "@playwright/test dependency is present"

grep -q 'pmd-menu-add-to-cart' features/customer-menu/components/ExpandingToolbarMenuItemCard.tsx || fail "missing add-to-cart test selector"
grep -q 'pmd-checkout-modal' features/customer-menu/checkout/NeutralCheckoutShell.tsx || fail "missing checkout modal test selector"
pass "stable E2E selectors are present"

grep -q 'do NOT submit real payment\|without real payment' e2e/checkout-full.spec.ts || fail "checkout E2E must document no real payment behavior"
pass "checkout E2E documents no-real-payment boundary"

if grep -nE 'Confirm cash payment|Pay with Wero|Pay with PayPal|Pay with Card|Pay in full' e2e/checkout-full.spec.ts; then
  fail "checkout E2E must not click real payment submit labels"
fi
pass "checkout E2E avoids real payment submit actions"

echo "✅ Playwright checkout E2E guard passed"
