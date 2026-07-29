#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
VIEW="/var/www/paymydine/app/admin/views/reservations2/index.blade.php"
BACKUP="/var/www/paymydine/storage/pmd-backups/restore-working-v34-1-20260729_002653"

cp -a   "$BACKUP/index.blade.php"   "$VIEW"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

systemctl reload php8.3-fpm.service

echo "Restore operation rolled back."
