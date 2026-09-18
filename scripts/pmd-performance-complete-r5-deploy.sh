#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R5_BRANCH:-origin/fix/platform-performance-complete-r5}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r5-$STAMP"

FILES=(
  "app/admin/ServiceProvider.php"
  "app/admin/assets/js/pmd-site-access-hub-v12.js"
  "app/admin/controllers/Dashboard2.php"
  "app/Services/PmdKitchenOperationsSchemaService.php"
  "app/admin/controllers/Shifts.php"
)

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine COMPLETE PERFORMANCE R5 DEPLOY"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r5

mkdir -p "$BACKUP"

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: live file missing: $file" >&2
    exit 1
  fi

  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$file" "$BACKUP/$file"

  tmp="$(mktemp)"
  git show "$BRANCH:$file" > "$tmp"

  case "$file" in
    *.php)
      php -l "$tmp"
      ;;
    *.js)
      if command -v node >/dev/null 2>&1; then
        node --check "$tmp"
      fi
      ;;
  esac

  owner="$(stat -c '%u:%g' "$file")"
  mode="$(stat -c '%a' "$file")"

  cat "$tmp" > "$file"
  chown "$owner" "$file"
  chmod "$mode" "$file"
  rm -f "$tmp"

  echo "DEPLOYED $file"
done

echo
echo "===== POST-DEPLOY PHP SYNTAX ====="
php -l app/admin/ServiceProvider.php
php -l app/admin/controllers/Dashboard2.php
php -l app/Services/PmdKitchenOperationsSchemaService.php
php -l app/admin/controllers/Shifts.php

echo
echo "===== RELOAD PHP-FPM ====="
sudo systemctl reload php8.3-fpm

echo
echo "===== HEALTH ====="
sudo systemctl is-active php8.3-fpm
sudo nginx -t

echo
echo "=============================================================="
echo " R5 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
