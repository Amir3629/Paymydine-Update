#!/usr/bin/env bash
set -Eeuo pipefail
PMD_ROOT=/var/www/paymydine
PMD_V2_ROOT=/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815
PMD_SERVICE=paymydine-frontend-v2
PMD_PORT=3002
BACKUP=/var/www/paymydine/storage/pmd-google-business-overlay-backup-20260920_174153

if [[ -f "$BACKUP/new-files.txt" ]]; then
  while IFS= read -r rel; do
    [[ -n "$rel" ]] && rm -f "$PMD_ROOT/$rel"
  done < "$BACKUP/new-files.txt"
fi

cp -a "$BACKUP/files/." "$PMD_ROOT/"

if [[ -f "$BACKUP/new-dirs.txt" ]]; then
  tac "$BACKUP/new-dirs.txt" | while IFS= read -r dir; do
    [[ -n "$dir" ]] && rmdir "$dir" 2>/dev/null || true
  done
fi

rm -rf "$PMD_V2_ROOT/.next"
if [[ -d "$BACKUP/next.previous" ]]; then
  mv "$BACKUP/next.previous" "$PMD_V2_ROOT/.next"
fi

cd "$PMD_ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm || true
fi
sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null
curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null

echo "Google integration rollback complete. Unrelated VPS files/index were not touched."
