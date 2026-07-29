#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SAFETY="/var/www/paymydine/storage/pmd-backups/reservations-v22-ui-broken-20260728_215048"

cp -a   "$SAFETY/Reservations2.php"   "$ROOT/app/admin/controllers/Reservations2.php"

cp -a   "$SAFETY/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cp -a   "$SAFETY/pmd-reservations2-floor-toolbar-v316.js"   "$ROOT/app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service
