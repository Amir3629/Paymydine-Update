#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-safe-test-v21-20260728_212931"

cp -a   "$BACKUP/app/admin/classes/AdminController.php"   "$ROOT/app/admin/classes/AdminController.php"

cp -a   "$BACKUP/app/admin/views/_layouts/default.blade.php"   "$ROOT/app/admin/views/_layouts/default.blade.php"

cp -a   "$BACKUP/app/admin/assets/js/pmd-mediafinder-autofix.js"   "$ROOT/app/admin/assets/js/pmd-mediafinder-autofix.js"

if [[ "0" == "1" ]]; then
    cp -a       "$BACKUP/app/admin/assets/css/pmd-reservations-waiter-cards-v1.css"       "$ROOT/app/admin/assets/css/pmd-reservations-waiter-cards-v1.css"
else
    rm -f       "$ROOT/app/admin/assets/css/pmd-reservations-waiter-cards-v1.css"
fi

if [[ "0" == "1" ]]; then
    cp -a       "$BACKUP/app/admin/assets/js/pmd-reservations-waiter-cards-v1.js"       "$ROOT/app/admin/assets/js/pmd-reservations-waiter-cards-v1.js"
else
    rm -f       "$ROOT/app/admin/assets/js/pmd-reservations-waiter-cards-v1.js"
fi

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Reservations Safe Test V21 rolled back."
