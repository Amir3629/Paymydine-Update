#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"

cp -a \
  "$BACKUP_DIR/index.blade.php" \
  "$ROOT/app/admin/views/reservations2/index.blade.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

systemctl reload php8.3-fpm.service

echo "Hour/Calendar Spacing V37 rolled back."
