#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-order-visibility-v150-${STAMP}"
SUCCESS=0

FILES=(
  "app/admin/controllers/PmdWaiterDashboardV150.php"
  "routes/admin-quick-mode.php"
)

cd "$REPO"

restore() {
  echo "⚠️ Restoring pre-V150 files"
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      mkdir -p "$(dirname "$file")"
      cp -a "$BACKUP/$file" "$file"
    elif [ -f "$BACKUP/.missing/$file" ]; then
      rm -f "$file"
    fi
  done
}

on_exit() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$SUCCESS" -ne 1 ]; then
    restore
  fi
  exit "$status"
}
trap on_exit EXIT

printf '\n================================================\n'
printf ' PMD waiter order visibility V150\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }

mkdir -p "$BACKUP/.missing"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
  else
    mkdir -p "$BACKUP/.missing/$(dirname "$file")"
    : > "$BACKUP/.missing/$file"
  fi
done

echo "✅ Existing files backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"

for file in "${FILES[@]}"; do
  tmp="/tmp/pmd-v150-$(basename "$file")-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

php -l app/admin/controllers/PmdWaiterDashboardV150.php
php -l routes/admin-quick-mode.php

grep -q "class PmdWaiterDashboardV150 extends PmdWaiterDashboardV149" app/admin/controllers/PmdWaiterDashboardV150.php
grep -q "'order_type'" app/admin/controllers/PmdWaiterDashboardV150.php
grep -q "tableReferenceMaps" app/admin/controllers/PmdWaiterDashboardV150.php
grep -q "resolveOrderTable" app/admin/controllers/PmdWaiterDashboardV150.php
grep -q "PmdWaiterDashboardV150::class, 'data'" routes/admin-quick-mode.php
grep -q "PmdWaiterDashboardV150::class, 'audit'" routes/admin-quick-mode.php

# Best effort only. TastyIgniter may report a permission warning while the
# directly loaded PHP route/controller files are already active.
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter order visibility V150 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo migration, database write, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Hard-refresh /admin/dashboardwaiter and verify order #1882 / Table 12.\n'
