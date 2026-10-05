#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-food-placeholder-media-r3-backups/20260824_065105"
V2_ROOT="/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
HELPER="app/main/routes/pmd-tenant-media-owner-r3.php"
PM2_USER="ubuntu"
PM2_SERVICE="paymydine-frontend-v2"
FILES=(
  app/admin/controllers/Pmdmenus.php
  app/main/routes/menu-highlight-response.php
  app/main/routes/api-health-media.php
  app/main/routes/pmd-frontend-v2-media.php
  routes/root-app-before.php
  routes/api.php
  app/Services/SuperAdminTenantLifecycleService.php
  frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/normalize.ts
  frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx
  frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/app/globals.css
)
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
for rel in "${FILES[@]}"; do
  if [[ -f "$BACKUP/files/$rel" ]]; then
    cp --preserve=mode,ownership,timestamps "$BACKUP/files/$rel" "$ROOT/$rel"
  fi
done
if [[ -f "$BACKUP/helper-was-new" ]]; then
  rm -f "$ROOT/$HELPER"
elif [[ -f "$BACKUP/files/$HELPER" ]]; then
  cp --preserve=mode,ownership,timestamps "$BACKUP/files/$HELPER" "$ROOT/$HELPER"
fi
if [[ -d "$BACKUP/next.previous" ]]; then
  rm -rf "$V2_ROOT/.next"
  mv "$BACKUP/next.previous" "$V2_ROOT/.next"
fi
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
echo "PMD FOOD PLACEHOLDER / MEDIA R3 ROLLED BACK"
