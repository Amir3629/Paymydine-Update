#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

required_files=(
  "features/customer-menu/theme/GoldThemeRoute.tsx"
  "features/customer-menu/theme/ModernGreenThemeRoute.tsx"
  "features/customer-menu/theme/OrganicThemeRoute.tsx"
  "features/customer-menu/theme/KazenThemeRoute.tsx"
  "features/customer-menu/theme/themeRouteTypes.ts"
  "features/customer-menu/CustomerMenuThemeRoutes.tsx"
  "components/themes/gold-luxury"
  "components/themes/modern-green"
  "components/themes/organic-botanical-paper"
  "components/themes/kazen-japanese"
)

for path in "${required_files[@]}"; do
  [[ -e "$path" ]] || fail "missing theme architecture path: $path"
done
pass "all 4 theme route files and component folders exist"

grep -q "GoldThemeRoute" features/customer-menu/CustomerMenuThemeRoutes.tsx || fail "Gold route not wired"
grep -q "ModernGreenThemeRoute" features/customer-menu/CustomerMenuThemeRoutes.tsx || fail "Modern Green route not wired"
grep -q "OrganicThemeRoute" features/customer-menu/CustomerMenuThemeRoutes.tsx || fail "Organic route not wired"
grep -q "KazenThemeRoute" features/customer-menu/CustomerMenuThemeRoutes.tsx || fail "Kazen route not wired"
pass "all 4 theme routes are wired"

if grep -RIn "CustomerMenuThemeRouteProps = Record<string, any>" features/customer-menu/theme/themeRouteTypes.ts; then
  fail "themeRouteTypes still aliases props directly to Record<string, any>"
fi
pass "theme route props are not direct Record<string, any>"

for file in \
  features/customer-menu/theme/GoldThemeRoute.tsx \
  features/customer-menu/theme/ModernGreenThemeRoute.tsx \
  features/customer-menu/theme/OrganicThemeRoute.tsx \
  features/customer-menu/theme/KazenThemeRoute.tsx
do
  grep -q "PaymentModal" "$file" || fail "$file does not include PaymentModal"
  grep -q "ThemeActionBoundary" "$file" || fail "$file does not include ThemeActionBoundary"
done
pass "all theme routes keep PaymentModal and ThemeActionBoundary"

echo "✅ theme smoke guard passed"
