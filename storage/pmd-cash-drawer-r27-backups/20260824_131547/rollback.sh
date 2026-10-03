#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP_DIR="/var/www/paymydine/storage/pmd-cash-drawer-r27-backups/20260824_131547"
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  mkdir -p "$ROOT/$(dirname "$rel")"
  cp -a "$BACKUP_DIR/files/$rel" "$ROOT/$rel"
done < "$BACKUP_DIR/present.list"
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  rm -f "$ROOT/$rel"
done < "$BACKUP_DIR/missing.list"
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl reload "php8.3-fpm" >/dev/null 2>&1 || true
echo "PMD CASH DRAWER R2.7 CODE ROLLBACK COMPLETE"
echo "Additive tenant schema changes are intentionally preserved."
