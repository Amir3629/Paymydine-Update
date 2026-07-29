#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-final-runtime-v23-20260728_215718"
MANIFEST="/var/www/paymydine/storage/pmd-backups/reservations-final-runtime-v23-20260728_215718/manifest.txt"

while IFS='|' read -r EXISTED REL; do
    [[ -z "$REL" ]] && continue

    TARGET="$ROOT/$REL"

    if [[ "$EXISTED" == "1" ]]; then
        mkdir -p "$(dirname "$TARGET")"
        cp -a "$BACKUP/$REL" "$TARGET"
    else
        rm -f "$TARGET"
    fi
done < "$MANIFEST"

cd "$ROOT"

php artisan optimize:clear
php artisan config:cache
php artisan view:cache

systemctl reload php8.3-fpm.service

echo "Reservations Runtime V23 rolled back."
