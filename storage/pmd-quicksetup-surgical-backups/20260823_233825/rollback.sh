#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
V2_ROOT="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BACKUP="$(cd "$(dirname "$0")" && pwd)"

[ "$EUID" -eq 0 ] || {
  echo "Run rollback with sudo"
  exit 1
}

if [ -f "$BACKUP/new-files.txt" ]; then
  while IFS= read -r rel; do
    [ -n "$rel" ] && rm -f "$ROOT/$rel"
  done < "$BACKUP/new-files.txt"
fi

cp -a "$BACKUP/files/." "$ROOT/"

rm -rf "$V2_ROOT/.next"

if [ -d "$BACKUP/next.previous" ]; then
  mv "$BACKUP/next.previous" "$V2_ROOT/.next"
fi

cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true

systemctl is-active --quiet php8.3-fpm \
  && systemctl reload php8.3-fpm \
  || true

sudo -u ubuntu -H pm2 restart paymydine-frontend-v2 --update-env

echo "QUICK SETUP V1 ROLLED BACK"
