#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BACKUP="/var/www/paymydine/storage/pmd-backups/reservations-lean-v16-20260728_200609"

cd "$BACKUP"

find app -type f -print0 |
while IFS= read -r -d '' relative; do
    mkdir -p       "$ROOT/$(dirname "$relative")"

    cp -a       "$BACKUP/$relative"       "$ROOT/$relative"
done

cd "$ROOT"

php artisan optimize:clear

systemctl reload   php8.3-fpm.service

echo "Reservations Lean V16 rolled back."
