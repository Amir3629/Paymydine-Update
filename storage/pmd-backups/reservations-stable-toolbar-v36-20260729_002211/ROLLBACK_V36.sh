#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
VIEW="/var/www/paymydine/app/admin/views/reservations2/index.blade.php"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-stable-toolbar-v36-20260729_002211"

cp -a   "$BACKUP/index.blade.php"   "$VIEW"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

systemctl reload php8.3-fpm.service

echo "Stable Floor Toolbar V36 rolled back."
