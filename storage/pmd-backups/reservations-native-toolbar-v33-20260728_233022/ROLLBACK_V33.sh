#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-native-toolbar-v33-20260728_233022"

cp -a   "$BACKUP/index.blade.php"   "$ROOT/app/admin/views/reservations2/index.blade.php"

cp -a   "$BACKUP/pmd_floor_map_v1.blade.php"   "$ROOT/app/admin/views/_partials/pmd_floor_map_v1.blade.php"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

systemctl reload php8.3-fpm.service

echo "Real Native Floor Toolbar V33 rolled back."
