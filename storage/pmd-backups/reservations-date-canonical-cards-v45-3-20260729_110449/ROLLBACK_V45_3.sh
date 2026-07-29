#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"

cp -a \
  "$BACKUP_DIR/index.blade.php" \
  "$ROOT/app/admin/views/reservations2/index.blade.php"

cp -a \
  "$BACKUP_DIR/pmd-reservations2-stability-v3.js" \
  "$ROOT/app/admin/assets/js/pmd-reservations2-stability-v3.js"

cd "$ROOT"

php artisan optimize:clear || true
php artisan config:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

systemctl reload php8.3-fpm.service

echo "Canonical Cards Date Button V45.3 rolled back."
