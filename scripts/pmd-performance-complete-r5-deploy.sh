#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R5_BRANCH:-origin/fix/platform-performance-complete-r5}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r5-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r5-stage.XXXXXX)"

FILES=(
  "app/admin/ServiceProvider.php"
  "app/admin/assets/js/pmd-site-access-hub-v12.js"
  "app/admin/controllers/Dashboard2.php"
  "app/Services/PmdKitchenOperationsSchemaService.php"
  "app/admin/controllers/Shifts.php"
)

cleanup_stage() {
  rm -rf "$STAGE"
}
trap cleanup_stage EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine COMPLETE PERFORMANCE R5 DEPLOY"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r5

echo
echo "===== STAGE + VALIDATE ALL R5 FILES ====="

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: live file missing: $file" >&2
    exit 1
  fi

  staged="$STAGE/$file"
  mkdir -p "$(dirname "$staged")"
  git show "$BRANCH:$file" > "$staged"

  case "$file" in
    *.php)
      php -l "$staged"
      ;;
    *.js)
      if command -v node >/dev/null 2>&1; then
        node --check "$staged"
      fi
      ;;
  esac

  echo "VALIDATED $file"
done

echo
echo "===== BACKUP CURRENT LIVE FILES ====="

mkdir -p "$BACKUP"

for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY VALIDATED FILES ====="

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  owner="$(stat -c '%u:%g' "$file")"
  mode="$(stat -c '%a' "$file")"

  cat "$staged" > "$file"
  chown "$owner" "$file"
  chmod "$mode" "$file"

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
