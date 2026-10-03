#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
V2_ROOT="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
cp -a "$BACKUP/files/." "$ROOT/"
rm -rf "$V2_ROOT/.next"
[[ -d "$BACKUP/next.previous" ]] && mv "$BACKUP/next.previous" "$V2_ROOT/.next"
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u ubuntu -H pm2 restart paymydine-frontend-v2 --update-env
printf '\nRESTAURANT IDENTITY R25 ROLLBACK COMPLETE\n'
