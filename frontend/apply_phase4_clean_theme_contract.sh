#!/usr/bin/env bash
set -euo pipefail

APP="/var/www/paymydine/frontend"
ZIP="/tmp/paymydine_phase4_clean_theme_contract.zip"
TMP="/tmp/paymydine-phase4"
TS="$(date +%Y%m%d_%H%M%S)"

cd "$APP"

echo "========================================"
echo " PayMyDine Phase 4 - Clean Theme Contract"
echo "========================================"

echo "== Backup active frontend files =="
tar -czf "$HOME/pmd_before_phase4_clean_theme_contract_$TS.tar.gz" \
  components/themes \
  features/customer-menu/useCustomerThemeSelection.ts \
  features/customer-menu/theme-engine \
  features/menu/use-menu-theme-flags.ts \
  src 2>/dev/null || true

echo "✅ Backup: $HOME/pmd_before_phase4_clean_theme_contract_$TS.tar.gz"

echo "== Extract package =="
rm -rf "$TMP"
unzip -o "$ZIP" -d "$TMP"

if [ ! -d "$TMP/frontend" ]; then
  echo "❌ Package structure invalid: missing frontend/ folder"
  exit 1
fi

echo "== Apply files to REAL frontend root =="
rsync -av "$TMP/frontend/" "$APP/"

# Earlier phases created an unused src/ folder in this project.
# The real app uses root app/, features/, components/, lib/, store/.
# To avoid future confusion, we archive src/ if it contains only the experimental phase files.
if [ -d "$APP/src" ]; then
  if [ -f "$APP/src/app/menu/CustomerMenuPage.tsx" ] || [ -d "$APP/src/theme" ]; then
    echo "== Archive unused experimental src/ folder =="
    mv "$APP/src" "$APP/_unused_src_from_failed_phase_$TS"
    echo "✅ Archived to: $APP/_unused_src_from_failed_phase_$TS"
  fi
fi

echo "== Verify important files =="
for f in \
  features/customer-menu/theme-engine/themeKeys.ts \
  features/customer-menu/theme-engine/customerMenuThemeRegistry.ts \
  components/themes/shared/SharedBottomDock.tsx \
  components/themes/shared/createBottomDockActions.ts \
  components/themes/kazen-japanese/KazenBottomDock.tsx \
  components/themes/modern-green/ModernGreenBottomDock.tsx \
  components/themes/organic-botanical-paper/OrganicBottomDock.tsx \
  components/themes/gold-luxury/GoldBottomDock.tsx \
  features/customer-menu/useCustomerThemeSelection.ts \
  features/menu/use-menu-theme-flags.ts
  do
    test -f "$f" || { echo "❌ Missing $f"; exit 1; }
    echo "✅ $f"
  done

echo "== Build =="
npm install
npm run build

echo "== Restart PM2 =="
pm2 restart paymydine-frontend --update-env

echo "== PM2 Status =="
pm2 status | grep paymydine-frontend || true

echo "✅ PHASE 4 COMPLETE"
echo "Open: https://mimoza.paymydine.com/menu?t=phase4_$TS"
