#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== PMD checkout safety audit ==="

fail() {
  echo "❌ $1"
  exit 1
}

pass() {
  echo "✅ $1"
}

test -f features/customer-menu/checkout/PaymentModalCore.tsx || fail "PaymentModalCore.tsx missing"
pass "PaymentModalCore.tsx exists"

test -f features/customer-menu/checkout/paymentModalPaymentFlow.ts || fail "paymentModalPaymentFlow.ts missing"
pass "paymentModalPaymentFlow.ts exists"

test -f features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs.ts || fail "usePaymentModalDomRepairs.ts missing; do not remove without E2E"
pass "protected payment DOM repair is still present"

grep -q "resolveSubmittedPaymentAmount" features/customer-menu/checkout/paymentModalPaymentFlow.ts \
  || fail "paymentModalPaymentFlow does not reference resolveSubmittedPaymentAmount"
pass "payment flow references resolveSubmittedPaymentAmount"

python3 - <<'PY'
from pathlib import Path
text = Path("features/customer-menu/checkout/PaymentModalCore.tsx").read_text()
needle = "resolveSubmittedPaymentAmount,"
idx = text.find("handlePaymentFlow({")
if idx < 0:
    raise SystemExit("❌ handlePaymentFlow call not found")
tail = text[idx:idx+2500]
if needle not in tail:
    raise SystemExit("❌ resolveSubmittedPaymentAmount is not passed into handlePaymentFlow")
print("✅ resolveSubmittedPaymentAmount is passed into handlePaymentFlow")
PY

grep -Eq "/checkout|checkout" scripts/pmd-frontend-smoke.sh || fail "smoke script does not check checkout route"
grep -Eq "307" scripts/pmd-frontend-smoke.sh || fail "smoke script does not preserve /checkout -> 307 expectation"
pass "/checkout -> 307 remains expected in smoke"

test ! -f features/customer-menu/legacy-dom-repairs/footerLogoInstaller.ts \
  || fail "footerLogoInstaller.ts still exists; footer logo should be React-owned"
pass "footerLogoInstaller.ts removed"

test -f features/customer-menu/components/MenuPayMyDineFooterLogo.tsx \
  || fail "MenuPayMyDineFooterLogo.tsx missing"
pass "React footer logo component exists"

echo "✅ checkout safety audit passed"
