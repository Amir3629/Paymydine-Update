#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-toolbar-outside-v24-20260728_221106"

cp -a   "$BACKUP/pmd-reservations2-floor-toolbar-v316.js"   "$ROOT/app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Floor Toolbar V24 rolled back."
