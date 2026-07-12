#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-card-table-number-v151-${STAMP}"
SUCCESS=0

FILES=(
  "app/admin/controllers/PmdWaiterDashboardV151.php"
  "routes/admin-quick-mode.php"
)

cd "$REPO"

restore() {
  echo "⚠️ Restoring pre-V151 files"
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
printf ' PMD waiter card table-number fix V151\n'
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
  tmp="/tmp/pmd-v151-$(basename "$file")-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

php -l app/admin/controllers/PmdWaiterDashboardV151.php
php -l routes/admin-quick-mode.php

grep -q "class PmdWaiterDashboardV151 extends PmdWaiterDashboardV150" app/admin/controllers/PmdWaiterDashboardV151.php
grep -q "sections' =>" app/admin/controllers/PmdWaiterDashboardV151.php
grep -q "'table_number'" app/admin/controllers/PmdWaiterDashboardV151.php
grep -q "PmdWaiterDashboardV151::class, 'data'" routes/admin-quick-mode.php
grep -q "PmdWaiterDashboardV151::class, 'floorTables'" routes/admin-quick-mode.php

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter card table-number V151 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo database write, migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Hard-refresh /admin/dashboardwaiter and verify orders #1884, #1885 and #1886.\n'
