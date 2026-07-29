#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-live-profiler-20260728_213817"

cp -a   "$BACKUP/Reservations2.php"   "$ROOT/app/admin/controllers/Reservations2.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Reservations live profiler removed."
