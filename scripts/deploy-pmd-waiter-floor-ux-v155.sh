#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-floor-ux-v155}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-floor-ux-v155-${STAMP}"

FILES=(
  "app/admin/controllers/PmdWaiterTableStateV154.php"
  "app/admin/assets/js/pmd-waiter-floor-ux-v155.js"
  "app/admin/assets/css/pmd-waiter-floor-ux-v155.css"
  "app/admin/views/_meta/assets.json"
)

cd "$REPO"

printf '\n================================================\n'
printf ' PMD Waiter Floor UX V155\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ Git repository not found"; exit 1; }
[ -f artisan ] || { echo "❌ artisan not found"; exit 1; }

mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
  fi
done
echo "✅ Existing files backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"

for file in "${FILES[@]}"; do
  tmp="/tmp/pmd-v155-$(basename "$file")-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

php -l app/admin/controllers/PmdWaiterTableStateV154.php
node --check app/admin/assets/js/pmd-waiter-floor-ux-v155.js
python3 -m json.tool app/admin/views/_meta/assets.json >/dev/null

grep -q "shouldDeriveOccupied" app/admin/controllers/PmdWaiterTableStateV154.php
grep -q "PMD_WAITER_FLOOR_UX_V155" app/admin/assets/js/pmd-waiter-floor-ux-v155.js
grep -q "pmd-v155-table-actions" app/admin/assets/css/pmd-waiter-floor-ux-v155.css
grep -q "pmd-waiter-floor-ux-v155.js" app/admin/views/_meta/assets.json
grep -q "pmd-waiter-floor-ux-v155.css" app/admin/views/_meta/assets.json

php artisan optimize:clear >/dev/null 2>&1 || true

printf '\n================================================\n'
printf ' ✅ Waiter Floor UX V155 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo migration, database write, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Close all PayMyDine tabs and hard-refresh /admin/dashboardwaiter.\n'
printf 'Expected console log: [PMD] Waiter floor UX v155 active\n'
