#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm run smoke:prod
npm run checkout:safety

theme_any_count=$(grep -R "\bany\b" features/customer-menu/theme --include='*.ts' --include='*.tsx' | wc -l | awk '{print $1}')
if [[ "$theme_any_count" -gt 5 ]]; then
  echo "❌ theme folder any count is $theme_any_count; expected <= 5"
  exit 1
fi
echo "✅ theme folder any count: $theme_any_count"

if grep -Eq 'export type Theme[A-Za-z0-9_]+\s*=\s*any\b' features/customer-menu/theme/themeRouteTypes.ts; then
  echo "❌ themeRouteTypes.ts still exports aliases directly equal to any"
  exit 1
fi
echo "✅ themeRouteTypes.ts has no aliases directly equal to any"

customer_menu_lines=$(wc -l < features/customer-menu/CustomerMenuPage.tsx | awk '{print $1}')
if [[ "$customer_menu_lines" -gt 650 ]]; then
  echo "❌ CustomerMenuPage.tsx is $customer_menu_lines lines; expected <= 650"
  exit 1
fi
echo "✅ CustomerMenuPage.tsx line count: $customer_menu_lines"

if [[ -f features/customer-menu/legacy-dom-repairs/footerLogoInstaller.ts ]]; then
  echo "❌ footerLogoInstaller.ts still exists"
  exit 1
fi
echo "✅ footerLogoInstaller.ts removed"

python - <<'PY'
from pathlib import Path
core = Path('features/customer-menu/checkout/PaymentModalCore.tsx').read_text()
call = core.find('handlePaymentFlow({')
window = core[call:call + 4000] if call >= 0 else ''
if 'resolveSubmittedPaymentAmount' not in window:
    raise SystemExit('❌ resolveSubmittedPaymentAmount is not passed to handlePaymentFlow')
print('✅ resolveSubmittedPaymentAmount is passed to handlePaymentFlow')
PY

if ! grep -q 'check_status "/checkout" "307"' scripts/pmd-frontend-smoke.sh; then
  echo "❌ /checkout -> 307 expectation is missing"
  exit 1
fi
echo "✅ /checkout -> 307 expectation present"

if [[ ! -f features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs.ts ]]; then
  if [[ ! -f tests/payment-modal-e2e-visual.md && ! -f scripts/pmd-payment-modal-e2e.sh ]]; then
    echo "❌ usePaymentModalDomRepairs.ts removed without explicit E2E/visual coverage marker"
    exit 1
  fi
fi
echo "✅ usePaymentModalDomRepairs.ts retained or covered"

echo "✅ final frontend acceptance passed"
