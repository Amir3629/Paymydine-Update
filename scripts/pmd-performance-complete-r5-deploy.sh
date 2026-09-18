#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R5_BRANCH:-origin/fix/platform-performance-complete-r5}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r5-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r5-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

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

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R5 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2

    for file in "${FILES[@]}"; do
      if [ ! -f "$BACKUP/$file" ]; then
        continue
      fi

      uid="$(stat -c '%u' "$BACKUP/$file")"
      gid="$(stat -c '%g' "$BACKUP/$file")"
      mode="$(stat -c '%a' "$BACKUP/$file")"
      restore_tmp="$ROOT/$file.pmd-r5-rollback-$STAMP.tmp"

      sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
      sudo mv -f "$restore_tmp" "$ROOT/$file"
      echo "RESTORED $file" >&2
    done

    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

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

DEPLOY_STARTED=1

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  uid="$(stat -c '%u' "$file")"
  gid="$(stat -c '%g' "$file")"
  mode="$(stat -c '%a' "$file")"
  live_tmp="$ROOT/$file.pmd-r5-$STAMP.tmp"

  sudo install -o "$uid" -g "$gid" -m "$mode" "$staged" "$live_tmp"
  sudo mv -f "$live_tmp" "$ROOT/$file"

  if ! cmp -s "$staged" "$ROOT/$file"; then
    echo "ERROR: deployed content mismatch: $file" >&2
    exit 1
  fi

  echo "DEPLOYED + VERIFIED $file"
done

echo
echo "===== POST-DEPLOY PHP SYNTAX ====="
php -l app/admin/ServiceProvider.php
php -l app/admin/controllers/Dashboard2.php
php -l app/Services/PmdKitchenOperationsSchemaService.php
php -l app/admin/controllers/Shifts.php

echo
echo "===== R5 CONTENT VERIFICATION ====="
for file in "${FILES[@]}"; do
  if cmp -s "$STAGE/$file" "$file"; then
    echo "MATCH $file"
  else
    echo "MISMATCH $file" >&2
    exit 1
  fi
done

echo
echo "===== RELOAD PHP-FPM ====="
sudo systemctl reload php8.3-fpm

echo
echo "===== HEALTH ====="
sudo systemctl is-active php8.3-fpm
sudo nginx -t

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " R5 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
