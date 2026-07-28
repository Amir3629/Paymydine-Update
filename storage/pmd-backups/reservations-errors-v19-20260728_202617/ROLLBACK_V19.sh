#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-errors-v19-20260728_202617"

cd "$BACKUP"

find app -type f -print0 |
while IFS= read -r -d '' RELATIVE; do
    mkdir -p       "$ROOT/$(dirname "$RELATIVE")"

    cp -a       "$BACKUP/$RELATIVE"       "$ROOT/$RELATIVE"
done

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "V19 rollback completed."
