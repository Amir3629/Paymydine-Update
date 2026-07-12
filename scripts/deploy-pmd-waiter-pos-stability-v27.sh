#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-stability-v27-${STAMP}"
SUCCESS=0

FILES=(
  "app/admin/assets/js/pmd-waiter-pos-simple-v27.js"
  "app/admin/assets/css/pmd-waiter-pos-simple-v27.css"
  "app/admin/views/waiter_pos.blade.php"
  "app/admin/views/_meta/assets.json"
)

cd "$REPO"

restore() {
  echo "⚠️ Restoring previous waiter POS stability files"
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
printf ' PMD Waiter POS V2.7 stability + single submit\n'
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
  tmp="/tmp/pmd-v27-$(echo "$file" | tr '/.' '__')-${STAMP}"
  git show "origin/$BRANCH:$file" > "$tmp"
  [ -s "$tmp" ] || { echo "❌ Empty branch file: $file"; exit 1; }
  mkdir -p "$(dirname "$file")"
  install -m 0644 "$tmp" "$file"
done

echo "✅ V2.7 files installed"

node --check app/admin/assets/js/pmd-waiter-pos-simple-v27.js
python3 -m json.tool app/admin/views/_meta/assets.json >/dev/null

grep -q 'pmd-waiter-pos-simple-v27.js' app/admin/views/_meta/assets.json
grep -q 'pmd-waiter-pos-simple-v27.css' app/admin/views/_meta/assets.json
! grep -q 'pmd-waiter-pos-polish-v26.js' app/admin/views/_meta/assets.json
grep -q 'PMD_WAITER_POS_POLISH_V26 = true' app/admin/assets/js/pmd-waiter-pos-simple-v27.js
grep -q "observe(menu, {childList: true})" app/admin/assets/js/pmd-waiter-pos-simple-v27.js
grep -q 'pmd-pos-action.hold' app/admin/assets/css/pmd-waiter-pos-simple-v27.css
grep -q 'linear-gradient(90deg' app/admin/assets/css/pmd-waiter-pos-simple-v27.css
grep -q 'PMDWaiterPOSSimpleV27.install' app/admin/views/waiter_pos.blade.php

echo "✅ JavaScript, JSON and stability guards passed"

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS V2.7 stability installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Close every PayMyDine tab, reopen /admin/dashboardwaiter and hard-refresh.\n'
printf 'Expected log: [PMD] Waiter POS stability v2.7 loader active\n'
