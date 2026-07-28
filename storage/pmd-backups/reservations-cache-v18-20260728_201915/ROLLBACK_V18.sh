#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-cache-v18-20260728_201915"

cp -a   "$BACKUP/default.blade.php"   "$ROOT/app/admin/views/_layouts/default.blade.php"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

if [[ -f "$BACKUP/.env" ]]; then
    cp -a       "$BACKUP/.env"       "$ROOT/.env"
fi

cd "$ROOT"

php artisan config:clear
php artisan view:clear
php artisan config:cache
php artisan view:cache

echo "Reservations Cache V18 rolled back."
