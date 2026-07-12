#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-table-state-v154-${STAMP}"

FILES=(
  "app/admin/database/migrations/2026_07_12_000200_add_waiter_table_operational_status.php"
  "app/admin/controllers/PmdWaiterTableStateV154.php"
  "app/admin/models/Tables_model.php"
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosTableStateV154Concern.php"
  "app/admin/assets/js/pmd-waiter-floor-stability-v153.js"
  "app/admin/assets/css/pmd-waiter-floor-stability-v153.css"
  "app/admin/assets/js/pmd-waiter-table-state-v154.js"
  "app/admin/assets/css/pmd-waiter-table-state-v154.css"
  "app/admin/views/_meta/assets.json"
  "routes/admin-quick-mode.php"
)

cd "$REPO"

printf '\n================================================\n'
printf ' PMD independent waiter table lifecycle V154\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ Git repository not found"; exit 1; }
[ -f artisan ] || { echo "❌ artisan not found"; exit 1; }
[ -d vendor ] || { echo "❌ vendor directory missing"; exit 1; }

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
  tmp="/tmp/pmd-v154-$(basename "$file")-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

echo "✅ V154 files installed"

php -l app/admin/database/migrations/2026_07_12_000200_add_waiter_table_operational_status.php
php -l app/admin/controllers/PmdWaiterTableStateV154.php
php -l app/admin/models/Tables_model.php
php -l app/admin/controllers/PmdWaiterPosV1.php
php -l app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php
php -l app/admin/controllers/concerns/PmdWaiterPosTableStateV154Concern.php
php -l routes/admin-quick-mode.php
node --check app/admin/assets/js/pmd-waiter-floor-stability-v153.js
node --check app/admin/assets/js/pmd-waiter-table-state-v154.js
python3 -m json.tool app/admin/views/_meta/assets.json >/dev/null

grep -q "payment_does_not_release_table" app/admin/controllers/PmdWaiterTableStateV154.php
grep -q "loadRecentOrdersIncludingPaid" app/admin/controllers/PmdWaiterTableStateV154.php
grep -q "operational_status" app/admin/database/migrations/2026_07_12_000200_add_waiter_table_operational_status.php
grep -q "pmd_table_status_history" app/admin/database/migrations/2026_07_12_000200_add_waiter_table_operational_status.php
grep -q "markTableOccupiedForWaiterOrderV154" app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php
grep -q "pmd-waiter-table-states-v154" routes/admin-quick-mode.php
grep -q "PMD_WAITER_TABLE_STATE_V154" app/admin/assets/js/pmd-waiter-table-state-v154.js
grep -q "pmd-waiter-table-state-v154.css" app/admin/views/_meta/assets.json
grep -q "pmd-waiter-table-state-v154.js" app/admin/views/_meta/assets.json

echo "✅ Syntax and lifecycle guards passed"

if command -v composer >/dev/null 2>&1; then
  composer dump-autoload -o >/dev/null
fi

php artisan igniter:up
php artisan optimize:clear >/dev/null 2>&1 || true

printf '\n================================================\n'
printf ' ✅ Waiter table lifecycle V154 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nTable, payment and order states are independent.\n'
printf 'Paid does not release a table.\n'
printf 'No PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Close all PayMyDine tabs and hard-refresh /admin/dashboardwaiter.\n'
