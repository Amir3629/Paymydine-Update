#!/usr/bin/env bash
set -euo pipefail

if [[ -d /var/www/paymydine/frontend ]]; then
  FRONTEND_DIR=/var/www/paymydine/frontend
  REPO_DIR=/var/www/paymydine
else
  FRONTEND_DIR=$(cd "$(dirname "$0")/.." && pwd)
  REPO_DIR=$(cd "$FRONTEND_DIR/.." && pwd)
fi

cd "$FRONTEND_DIR"

echo "=== PayMyDine Claude Roadmap Status ==="
date
echo "frontend: $FRONTEND_DIR"
echo "repo: $REPO_DIR"
echo ""

echo "=== Build / typecheck / smoke commands ==="
echo "npm run build"
echo "node node_modules/typescript/bin/tsc --noEmit --pretty false"
echo "npm run smoke:prod (/checkout -> 307 is expected)"
echo "npm run checkout:safety"
echo ""

echo "=== CustomerMenuPage + extracted hooks ==="
wc -l \
  features/customer-menu/CustomerMenuPage.tsx \
  features/customer-menu/hooks/*.ts 2>/dev/null | sort -n
echo ""

echo "=== Checkout decomposition ==="
wc -l \
  features/customer-menu/checkout/PaymentModalCore.tsx \
  features/customer-menu/checkout/NeutralCheckoutShell.tsx \
  features/customer-menu/checkout/NeutralReviewPanels.tsx \
  features/customer-menu/checkout/NeutralSplitBillPanel.tsx \
  features/customer-menu/checkout/NeutralOrderStatusPanel.tsx \
  features/customer-menu/checkout/NeutralPaymentPanel.tsx 2>/dev/null | sort -n
echo ""

echo "=== Checkout safety audit ==="
if [[ -x scripts/pmd-checkout-safety-audit.sh ]]; then
  echo "✅ scripts/pmd-checkout-safety-audit.sh present"
  bash scripts/pmd-checkout-safety-audit.sh || true
else
  echo "❌ scripts/pmd-checkout-safety-audit.sh missing"
fi
echo ""

echo "=== Submitted payment amount resolver guard ==="
python - <<'PY'
from pathlib import Path
core = Path('features/customer-menu/checkout/PaymentModalCore.tsx').read_text()
flow = Path('features/customer-menu/checkout/paymentModalPaymentFlow.ts').read_text()
call = core.find('handlePaymentFlow({')
window = core[call:call + 4000] if call >= 0 else ''
print('PaymentModalCore defines resolver:', '✅' if 'resolveSubmittedPaymentAmount' in core else '❌')
print('paymentModalPaymentFlow uses resolver:', '✅' if 'resolveSubmittedPaymentAmount' in flow else '❌')
print('handlePaymentFlow receives resolver:', '✅' if 'resolveSubmittedPaymentAmount' in window else '❌')
PY
echo ""

echo "=== Theme route prop status ==="
wc -l features/customer-menu/theme/themeRouteTypes.ts features/customer-menu/theme/*ThemeRoute.tsx 2>/dev/null | sort -n
THEME_ANY_COUNT=$(grep -R "\bany\b" features/customer-menu/theme --include='*.ts' --include='*.tsx' | wc -l | awk '{print $1}')
echo "remaining theme any count: $THEME_ANY_COUNT"
grep -R "Record<string, any>" features/customer-menu/theme --include='*.ts' --include='*.tsx' || echo "✅ no Record<string, any> in theme folder"
echo ""

echo "=== Remaining any in theme folder sample ==="
grep -R "\bany\b" features/customer-menu/theme --include='*.ts' --include='*.tsx' | sed -n '1,120p' || true
echo ""

echo "=== Legacy CSS inventory ==="
wc -l \
  app/globals.css \
  app/globals-clean.css \
  app/nuclear-fix.css \
  styles/global/paymydine-legacy-globals.css \
  styles/global/legacy/*.css \
  styles/globals.css 2>/dev/null | sort -n
echo ""

echo "=== Legacy DOM repairs inventory ==="
wc -l features/customer-menu/legacy-dom-repairs/* 2>/dev/null | sort -n
for file in \
  features/customer-menu/legacy-dom-repairs/useCheckoutVisualRepairs.ts \
  features/customer-menu/legacy-dom-repairs/useOrganicCheckoutDomPolish.ts \
  features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs.ts; do
  [[ -f "$file" ]] && echo "✅ remaining repair kept: $file" || echo "❌ missing protected repair: $file"
done
[[ ! -f features/customer-menu/legacy-dom-repairs/footerLogoInstaller.ts ]] && echo "✅ footerLogoInstaller removed" || echo "⚠️ footerLogoInstaller still present"
grep -R "new MutationObserver\|style.setProperty\|querySelector" features/customer-menu/legacy-dom-repairs --include='*.ts' | wc -l | awk '{print "legacy repair DOM operations:", $1}'
echo ""

echo "=== CMS store inventory ==="
wc -l store/cms-store.ts store/*store.ts 2>/dev/null | sort -n
grep -nE "appliedCoupon|loadVATSettings|loadTaxSettings|loadMerchantSettings|paymentOptions|tipSettings|taxSettings|merchantSettings" store/cms-store.ts | sed -n '1,160p' || true
echo ""

echo "=== Possible dev/test public routes ==="
find app -maxdepth 4 \( -name page.tsx -o -name route.ts \) | sort | grep -E "test|worldline|themes/kazen|debug|dev|dashboard" || true
echo ""

echo "=== Current frontend git commits ==="
git -C "$REPO_DIR" log --oneline -18 -- frontend | sed -n '1,40p'
<<<<<<< HEAD


echo ""
echo "=== Final frontend sprint guards ==="
echo "PMD_FINAL_FRONTEND_SPRINT_AUDIT_20260617"

echo ""
echo "Checkout safety script:"
if [ -f scripts/pmd-checkout-safety-audit.sh ]; then
  echo "✅ scripts/pmd-checkout-safety-audit.sh exists"
else
  echo "❌ scripts/pmd-checkout-safety-audit.sh missing"
fi

echo ""
echo "Payment amount resolver guard:"
if grep -q "resolveSubmittedPaymentAmount" features/customer-menu/checkout/PaymentModalCore.tsx && grep -q "resolveSubmittedPaymentAmount" features/customer-menu/checkout/paymentModalPaymentFlow.ts; then
  echo "✅ resolveSubmittedPaymentAmount is wired into checkout payment flow"
else
  echo "❌ resolveSubmittedPaymentAmount guard failed"
fi

echo ""
echo "Footer logo installer removal:"
if [ ! -f features/customer-menu/legacy-dom-repairs/footerLogoInstaller.ts ] && [ -f features/customer-menu/components/MenuPayMyDineFooterLogo.tsx ]; then
  echo "✅ footerLogoInstaller removed and React footer logo exists"
else
  echo "❌ footer logo React replacement incomplete"
fi

echo ""
echo "Remaining protected DOM repairs:"
find features/customer-menu/legacy-dom-repairs -maxdepth 1 -type f -name "*.ts" -print | sort

echo ""
echo "Theme any count:"
grep -RIn "\bany\b" features/customer-menu/theme --include="*.ts" --include="*.tsx" | wc -l
=======
>>>>>>> 1f673822 (refactor: extract customer menu page helper hook)
