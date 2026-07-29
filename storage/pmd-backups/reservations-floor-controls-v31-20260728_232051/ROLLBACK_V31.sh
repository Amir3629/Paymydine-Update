#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-floor-controls-v31-20260728_232051"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Independent Floor Controls V31 rolled back."
