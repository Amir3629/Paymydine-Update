#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-toolbar-real-gap-v34-2-20260729_000052"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

systemctl reload php8.3-fpm.service

echo "Floor Toolbar Real Gap V34.2 rolled back."
