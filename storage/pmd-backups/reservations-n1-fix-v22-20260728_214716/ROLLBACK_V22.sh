#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-n1-fix-v22-20260728_214716"

cp -a   "$BACKUP/Reservations2.php"   "$ROOT/app/admin/controllers/Reservations2.php"

cp -a   "$BACKUP/pmd-reservations2-floor-toolbar-v316.js"   "$ROOT/app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Reservations N+1 Fix V22 rolled back."
