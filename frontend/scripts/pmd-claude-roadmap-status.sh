#!/usr/bin/env bash
set -euo pipefail

if [ -d /var/www/paymydine/frontend ]; then
  FRONTEND_DIR="/var/www/paymydine/frontend"
else
  FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

REPO_DIR="$(cd "$FRONTEND_DIR/.." && pwd)"
cd "$FRONTEND_DIR"

echo "=== PayMyDine Claude Roadmap Status ==="
date -u
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
  features/customer-menu/hooks/useCustomerMenuFooterLogoVisibility.ts \
  features/customer-menu/hooks/useCustomerCheckoutModalState.ts \
  features/customer-menu/hooks/useCustomerLocalOpenOrderHydration.ts \
  features/customer-menu/hooks/useCustomerMenuDerivedData.ts \
  features/customer-menu/CustomerMenuPage.tsx 2>/dev/null || true

echo ""
echo "=== Checkout decomposition ==="
wc -l \
  features/customer-menu/checkout/NeutralReviewPanels.tsx \
  features/customer-menu/checkout/NeutralSplitBillPanel.tsx \
  features/customer-menu/checkout/NeutralOrderStatusPanel.tsx \
  features/customer-menu/checkout/NeutralPaymentPanel.tsx \
  features/customer-menu/checkout/NeutralCheckoutShell.tsx \
  features/customer-menu/checkout/PaymentModalCore.tsx 2>/dev/null || true

echo ""
echo "=== Checkout safety audit ==="
if [ -x scripts/pmd-checkout-safety-audit.sh ] || [ -f scripts/pmd-checkout-safety-audit.sh ]; then
  echo "✅ scripts/pmd-checkout-safety-audit.sh present"
  bash scripts/pmd-checkout-safety-audit.sh || true
else
  echo "❌ scripts/pmd-checkout-safety-audit.sh missing"
fi

echo ""
echo "=== Submitted payment amount resolver guard ==="
python3 - <<'PY'
from pathlib import Path
core_path = Path("features/customer-menu/checkout/PaymentModalCore.tsx")
flow_path = Path("features/customer-menu/checkout/paymentModalPaymentFlow.ts")

core = core_path.read_text() if core_path.exists() else ""
flow = flow_path.read_text() if flow_path.exists() else ""

defines = "const resolveSubmittedPaymentAmount" in core or "resolveSubmittedPaymentAmount = " in core
uses = "resolveSubmittedPaymentAmount()" in flow or "resolveSubmittedPaymentAmount" in flow

idx = core.find("handlePaymentFlow({")
tail = core[idx:idx + 2500] if idx >= 0 else ""
passes = "resolveSubmittedPaymentAmount," in tail

print(f"PaymentModalCore defines resolver: {'✅' if defines else '❌'}")
print(f"paymentModalPaymentFlow uses resolver: {'✅' if uses else '❌'}")
print(f"handlePaymentFlow receives resolver: {'✅' if passes else '❌'}")
PY

echo ""
echo "=== Theme route prop status ==="
wc -l \
  features/customer-menu/theme/OrganicThemeRoute.tsx \
  features/customer-menu/theme/GoldThemeRoute.tsx \
  features/customer-menu/theme/ModernGreenThemeRoute.tsx \
  features/customer-menu/theme/themeRouteTypes.ts \
  features/customer-menu/theme/KazenThemeRoute.tsx 2>/dev/null || true

THEME_ANY_COUNT="$({ grep -RIn --include='*.ts' --include='*.tsx' '\bany\b' features/customer-menu/theme 2>/dev/null || true; } | wc -l | tr -d ' ')"
echo "remaining theme any count: ${THEME_ANY_COUNT}"

if grep -RIn --include='*.ts' --include='*.tsx' 'Record<string, any>' features/customer-menu/theme >/dev/null 2>&1; then
  echo "⚠️ Record<string, any> still present in theme folder"
else
  echo "✅ no Record<string, any> in theme folder"
fi

echo ""
echo "=== Remaining any in theme folder sample ==="
{ grep -RIn --include='*.ts' --include='*.tsx' '\bany\b' features/customer-menu/theme 2>/dev/null || true; } | sed -n '1,60p'

echo ""
echo "=== Legacy CSS inventory ==="
wc -l \
  app/globals.css \
  app/nuclear-fix.css \
  styles/global/paymydine-legacy-globals.css \
  styles/customer/checkout/checkout-theme-compat.css \
  styles/customer/themes/kazen-menu-compat.css \
  app/globals-clean.css \
  styles/globals.css \
  styles/global/legacy/*.css 2>/dev/null | sort -n || true

if [ -f scripts/pmd-legacy-css-guard.sh ]; then
  echo ""
  echo "=== Legacy CSS guard ==="
  bash scripts/pmd-legacy-css-guard.sh || true
fi

echo ""
echo "=== Legacy DOM repairs inventory ==="
wc -l features/customer-menu/legacy-dom-repairs/* 2>/dev/null || true

if [ -f features/customer-menu/legacy-dom-repairs/useCheckoutVisualRepairs.ts ]; then
  echo "❌ useCheckoutVisualRepairs.ts returned; it should stay removed"
else
  echo "✅ useCheckoutVisualRepairs.ts removed"
fi

for file in \
  features/customer-menu/legacy-dom-repairs/useOrganicCheckoutDomPolish.ts \
  features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs.ts
do
  if [ -f "$file" ]; then
    echo "✅ remaining high-risk repair kept: $file"
  else
    echo "❌ expected high-risk repair missing: $file"
  fi
done

if [ -f features/customer-menu/legacy-dom-repairs/footerLogoInstaller.ts ]; then
  echo "❌ footerLogoInstaller still exists"
else
  echo "✅ footerLogoInstaller removed"
fi

LEGACY_DOM_OPS="$(grep -RInE 'querySelector|appendChild|MutationObserver|getElementById|innerHTML|classList|style\.' features/customer-menu/legacy-dom-repairs 2>/dev/null | wc -l | tr -d ' ')"
echo "legacy repair DOM operations: ${LEGACY_DOM_OPS}"

echo ""
echo "=== CMS store inventory ==="
wc -l store/language-store.ts store/cart-store.ts store/theme-store.ts store/cms-store.ts 2>/dev/null || true
grep -nE "paymentOptions|tipSettings|taxSettings|appliedCoupon|merchantSettings|loadVATSettings|loadTaxSettings|loadMerchantSettings" store/cms-store.ts 2>/dev/null | sed -n '1,80p' || true

echo ""
echo "=== Possible dev/test public routes ==="
find app -maxdepth 3 -type f \( -name 'page.tsx' -o -name 'route.ts' \) \
  | grep -E 'debug|dashboard|worldline-test|themes/kazen|worldline-return' \
  | sort || true

echo ""
echo "=== Current frontend git commits ==="
cd "$REPO_DIR"
git log --oneline -18 -- frontend | sed -n '1,80p'


echo ""
echo "=== Legacy CSS Phase 6C status ==="
if [ -f styles/customer/actions/action-controls-compat.css ]; then
  echo "✅ action-controls-compat.css extracted"
else
  echo "❌ action-controls-compat.css missing"
fi
if [ -f styles/global/legacy/legacy-03.css ]; then
  LEGACY03_LINES="$(wc -l < styles/global/legacy/legacy-03.css | tr -d ' ')"
  echo "legacy-03.css lines: $LEGACY03_LINES"
fi
