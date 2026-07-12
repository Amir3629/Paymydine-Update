#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-polish-v26-${STAMP}"
SUCCESS=0

FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosMenuCatalogV26Concern.php"
  "app/admin/controllers/concerns/PmdWaiterPosNoteHistoryV26Concern.php"
  "app/admin/assets/css/pmd-waiter-pos-shadow-host-v25.css"
  "app/admin/assets/css/pmd-waiter-pos-polish-v26.css"
  "app/admin/assets/js/pmd-waiter-pos-polish-v26.js"
  "app/admin/views/waiter_pos.blade.php"
  "app/admin/views/_meta/assets.json"
)

PHP_FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosMenuCatalogV26Concern.php"
  "app/admin/controllers/concerns/PmdWaiterPosNoteHistoryV26Concern.php"
)

cd "$REPO"

restore() {
  echo "⚠️ Restoring previous V2.6 files"
  for file in "${FILES[@]}"; do
    if [ -e "$BACKUP/$file" ]; then
      mkdir -p "$(dirname "$file")"
      cp -a "$BACKUP/$file" "$file"
    else
      rm -f "$file"
    fi
  done
  chmod 0644 "${FILES[@]}" 2>/dev/null || true
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
printf ' PMD Waiter POS V2.6 polish + data integrity\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }
[ -f artisan ] || { echo "❌ artisan is missing"; exit 1; }

mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  if [ -e "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
  fi
done
printf '%s\n' "${FILES[@]}" > "$BACKUP/runtime-files.txt"
git status --short > "$BACKUP/git-status-before.txt" || true

echo "✅ Existing files backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"

for file in "${FILES[@]}"; do
  tmp="/tmp/pmd-v26-$(echo "$file" | tr '/.' '__')-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

echo "✅ V2.6 branch files installed"

for file in "${PHP_FILES[@]}"; do
  php -l "$file"
done
node --check app/admin/assets/js/pmd-waiter-pos-polish-v26.js
python3 -m json.tool app/admin/views/_meta/assets.json >/dev/null

grep -q 'PmdWaiterPosMenuCatalogV26Concern' app/admin/controllers/PmdWaiterPosV1.php
grep -q 'menuPayload insteadof' app/admin/controllers/PmdWaiterPosV1.php
grep -q 'recordWaiterPosNoteHistoryV26' app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php
grep -q "'orderable' => \$priceConfigured" app/admin/controllers/concerns/PmdWaiterPosMenuCatalogV26Concern.php
grep -q "'/api/media/'" app/admin/controllers/concerns/PmdWaiterPosMenuCatalogV26Concern.php
grep -q 'pmd-waiter-pos-polish-v26.css' app/admin/views/_meta/assets.json
grep -q 'pmd-waiter-pos-polish-v26.js' app/admin/views/_meta/assets.json
grep -q 'pmd-pos-owner-gradient' app/admin/assets/css/pmd-waiter-pos-polish-v26.css
grep -q 'pmd-v26-item-notes' app/admin/assets/js/pmd-waiter-pos-polish-v26.js
grep -q 'pmd-waiter-pos-polish-v26.js' app/admin/views/waiter_pos.blade.php

echo "✅ PHP, JavaScript, JSON and V2.6 feature guards passed"

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS V2.6 polish installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Close all PayMyDine tabs, reopen /admin/dashboardwaiter, and hard-refresh.\n'
printf 'Do not submit a real order until the visual/read-only checks pass.\n'
