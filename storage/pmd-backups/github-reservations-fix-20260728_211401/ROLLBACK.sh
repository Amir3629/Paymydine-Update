#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/github-reservations-fix-20260728_211401"

cd "$ROOT"

for FILE in   app/admin/classes/AdminController.php   app/admin/controllers/Reservations2.php
do
    cp -a "$BACKUP/$FILE" "$ROOT/$FILE"
done

for FILE in   app/admin/assets/js/pmd-reservations2-global-bridge-v20.js   app/admin/assets/css/pmd-reservations-waiter-cards-v1.css   app/admin/assets/js/pmd-reservations-waiter-cards-v1.js
do
    if [[ -e "$BACKUP/$FILE" ]]; then
        cp -a "$BACKUP/$FILE" "$ROOT/$FILE"
    else
        rm -f "$ROOT/$FILE"
    fi
done

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "GitHub Reservations fix rolled back."
