#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-food-primary-image-r32-backups/20260824_082825"
PM2_USER="ubuntu"
PM2_SERVICE="paymydine-frontend-v2"
FILES=("app/main/routes/menu-highlight-response.php" "app/admin/controllers/Menus.php")
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
for rel in "${FILES[@]}"; do
  cp --preserve=mode,ownership,timestamps "$BACKUP/files/$rel" "$ROOT/$rel"
done
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
echo "PMD FOOD PRIMARY IMAGE R3.2 ROLLED BACK"
