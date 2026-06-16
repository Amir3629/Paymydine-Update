#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine/frontend

echo "=== PayMyDine Claude Roadmap Status ==="
date
echo ""

echo "=== Build / typecheck / smoke commands ==="
echo "npm run build"
echo "node node_modules/typescript/bin/tsc --noEmit --pretty false"
echo "npm run smoke:prod"
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

echo "=== Theme route prop status ==="
wc -l features/customer-menu/theme/themeRouteTypes.ts features/customer-menu/theme/*ThemeRoute.tsx 2>/dev/null | sort -n
grep -R "Record<string, any>" features/customer-menu/theme --include='*.ts' --include='*.tsx' || echo "✅ no Record<string, any> in theme folder"
echo ""

echo "=== Remaining any in theme folder sample ==="
grep -R ": any\\|as any" features/customer-menu/theme --include='*.ts' --include='*.tsx' | sed -n '1,120p' || true
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
grep -R "new MutationObserver\\|style.setProperty\\|querySelector" features/customer-menu/legacy-dom-repairs --include='*.ts' | wc -l | awk '{print "legacy repair DOM operations:", $1}'
echo ""

echo "=== CMS store inventory ==="
wc -l store/cms-store.ts store/*store.ts 2>/dev/null | sort -n
grep -nE "appliedCoupon|loadVATSettings|loadTaxSettings|loadMerchantSettings|paymentOptions|tipSettings|taxSettings|merchantSettings" store/cms-store.ts | sed -n '1,160p' || true
echo ""

echo "=== Possible dev/test public routes ==="
find app -maxdepth 4 \( -name page.tsx -o -name route.ts \) | sort | grep -E "test|worldline|themes/kazen|debug|dev|dashboard" || true
echo ""

echo "=== Current frontend git commits ==="
git -C /var/www/paymydine log --oneline -18 -- frontend | sed -n '1,40p'
