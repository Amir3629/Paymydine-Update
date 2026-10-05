#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
HELPER="app/main/routes/tenant-media-guard.php"
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
cp -a "$BACKUP/files/." "$ROOT/"
if [[ -f "$BACKUP/helper-was-new" ]]; then
  rm -f "$ROOT/$HELPER"
fi
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
echo "TENANT MEDIA R1 CODE ROLLBACK COMPLETE"
echo "NOTE: tenant DB cleanup is intentionally not restored automatically."
