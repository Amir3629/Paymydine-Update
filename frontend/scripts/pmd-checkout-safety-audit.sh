#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

failures=0

check_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "✅ present: $file"
  else
    echo "❌ missing: $file"
    failures=$((failures + 1))
  fi
}

check_grep() {
  local pattern="$1"
  local file="$2"
  local label="$3"
  if grep -Eq "$pattern" "$file"; then
    echo "✅ $label"
  else
    echo "❌ $label"
    failures=$((failures + 1))
  fi
}

check_file "features/customer-menu/checkout/PaymentModalCore.tsx"
check_file "features/customer-menu/checkout/paymentModalPaymentFlow.ts"
check_file "features/customer-menu/checkout/PaymentMethodForm.tsx"
check_file "features/customer-menu/checkout/CheckoutModalHost.tsx"
check_file "features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs.ts"
check_file "app/checkout/page.tsx"

check_grep 'resolveSubmittedPaymentAmount' "features/customer-menu/checkout/paymentModalPaymentFlow.ts" "payment flow accepts/uses resolveSubmittedPaymentAmount"
check_grep 'resolveSubmittedPaymentAmount' "features/customer-menu/checkout/PaymentModalCore.tsx" "PaymentModalCore defines/passes resolveSubmittedPaymentAmount"
check_grep 'handlePaymentFlow\(\{' "features/customer-menu/checkout/PaymentModalCore.tsx" "PaymentModalCore calls handlePaymentFlow with object args"

python - <<'PY'
from pathlib import Path
core = Path('features/customer-menu/checkout/PaymentModalCore.tsx').read_text()
call_index = core.find('handlePaymentFlow({')
if call_index < 0:
    raise SystemExit('❌ handlePaymentFlow call not found')
window = core[call_index:call_index + 4000]
if 'resolveSubmittedPaymentAmount' not in window:
    raise SystemExit('❌ resolveSubmittedPaymentAmount is not passed into handlePaymentFlow call window')
print('✅ resolveSubmittedPaymentAmount passed into handlePaymentFlow')

smoke = Path('scripts/pmd-frontend-smoke.sh').read_text()
if 'check_status "/checkout" "307"' not in smoke:
    raise SystemExit('❌ production smoke does not assert /checkout -> 307')
print('✅ production smoke keeps /checkout -> 307 expected')
PY

if [[ "$failures" -ne 0 ]]; then
  echo "❌ checkout safety audit failed with $failures file/pattern issue(s)"
  exit 1
fi

echo "✅ checkout safety audit passed"
