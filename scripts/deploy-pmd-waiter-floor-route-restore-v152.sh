#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-floor-route-restore-v152-${STAMP}"
SUCCESS=0
FILE="routes/admin-quick-mode.php"

cd "$REPO"

restore() {
  echo "⚠️ Restoring previous route file"
  if [ -f "$BACKUP/$FILE" ]; then
    mkdir -p "$(dirname "$FILE")"
    cp -a "$BACKUP/$FILE" "$FILE"
  fi
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
printf ' PMD waiter floor endpoint restore V152\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }

mkdir -p "$BACKUP/$(dirname "$FILE")"
cp -a "$FILE" "$BACKUP/$FILE"
echo "✅ Existing route file backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
TMP="/tmp/pmd-v152-admin-quick-mode-${STAMP}.php"
git show "origin/$BRANCH:$FILE" > "$TMP"
[ -s "$TMP" ] || { echo "❌ Empty branch file: $FILE"; exit 1; }
install -m 0644 "$TMP" "$FILE"

php -l "$FILE"

grep -q "PmdWaiterDashboardV151::class, 'data'" "$FILE"
! grep -q "PmdWaiterDashboardV151::class, 'floorTables'" "$FILE"
grep -q "do not override /admin/pmd-waiter-dashboard-v9-floor-tables" "$FILE"

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter floor endpoint V152 restored\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo database write, migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'V151 order-card table numbers stay active; legacy floor geometry endpoint is restored.\n'
printf 'Close all PayMyDine tabs and hard-refresh /admin/dashboardwaiter.\n'
