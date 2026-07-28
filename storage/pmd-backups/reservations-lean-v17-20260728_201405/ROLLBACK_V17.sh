#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-lean-v17-20260728_201405"

cp -a   "$BACKUP/default.blade.php"   "$ROOT/app/admin/views/_layouts/default.blade.php"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cd "$ROOT"

php artisan view:clear
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Reservations V17 rolled back."
