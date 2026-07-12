#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-floor-stability-v153-${STAMP}"
SUCCESS=0

FILES=(
  "app/admin/assets/js/pmd-waiter-floor-stability-v153.js"
  "app/admin/assets/css/pmd-waiter-floor-stability-v153.css"
  "app/admin/views/_meta/assets.json"
)

cd "$REPO"

restore() {
  echo "⚠️ Restoring pre-V153 files"
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
printf ' PMD waiter floor stability + colors V153\n'
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
  tmp="/tmp/pmd-v153-$(basename "$file")-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

node --check app/admin/assets/js/pmd-waiter-floor-stability-v153.js
python3 -m json.tool app/admin/views/_meta/assets.json >/dev/null

grep -q 'PMD_WAITER_FLOOR_STABILITY_V153' app/admin/assets/js/pmd-waiter-floor-stability-v153.js
grep -q 'beginSaveShield' app/admin/assets/js/pmd-waiter-floor-stability-v153.js
grep -q '__pmdV153SnapDisabled' app/admin/assets/js/pmd-waiter-floor-stability-v153.js
grep -q 'data-pmd-v153-state="free"' app/admin/assets/css/pmd-waiter-floor-stability-v153.css
grep -q 'data-pmd-v153-state="order"' app/admin/assets/css/pmd-waiter-floor-stability-v153.css
grep -q 'pmd-waiter-floor-stability-v153.css' app/admin/views/_meta/assets.json
grep -q 'pmd-waiter-floor-stability-v153.js' app/admin/views/_meta/assets.json

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter floor stability V153 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo database write, migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Save no longer runs global smart-snap. Free tables are green; active-order tables are red.\n'
printf 'Close all PayMyDine tabs and hard-refresh /admin/dashboardwaiter.\n'
