#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
GUARD="app/admin/assets/js/pmd-waiter-pos-dashboard-direct-guard-v23.js"
ASSETS="app/admin/views/_meta/assets.json"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-direct-guard-v23-${STAMP}"
TMP_GUARD="/tmp/pmd-waiter-pos-direct-guard-v23-${STAMP}.js"
TMP_ASSETS="/tmp/pmd-waiter-pos-assets-v23-${STAMP}.json"
SUCCESS=0

cd "$REPO"

restore() {
  echo "⚠️ Restoring previous files"
  if [ -f "$BACKUP/$GUARD" ]; then
    mkdir -p "$(dirname "$GUARD")"
    cp -a "$BACKUP/$GUARD" "$GUARD"
  else
    rm -f "$GUARD"
  fi
  if [ -f "$BACKUP/$ASSETS" ]; then
    mkdir -p "$(dirname "$ASSETS")"
    cp -a "$BACKUP/$ASSETS" "$ASSETS"
  fi
  chmod 0644 "$GUARD" "$ASSETS" 2>/dev/null || true
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
printf ' PMD Waiter POS direct routing guard v23\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }
[ -f "$ASSETS" ] || { echo "❌ assets.json is missing"; exit 1; }

mkdir -p "$BACKUP/$(dirname "$GUARD")" "$BACKUP/$(dirname "$ASSETS")"
[ -f "$GUARD" ] && cp -a "$GUARD" "$BACKUP/$GUARD" || true
cp -a "$ASSETS" "$BACKUP/$ASSETS"

echo "✅ Existing files backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
git show "origin/$BRANCH:$GUARD" > "$TMP_GUARD"
git show "origin/$BRANCH:$ASSETS" > "$TMP_ASSETS"

[ -s "$TMP_GUARD" ] || { echo "❌ Guard file is empty"; exit 1; }
[ -s "$TMP_ASSETS" ] || { echo "❌ assets.json is empty"; exit 1; }

node --check "$TMP_GUARD"
python3 -m json.tool "$TMP_ASSETS" >/dev/null
grep -q 'dashboard-direct-guard-v23' "$TMP_GUARD"
grep -q 'pmd-waiter-pos-dashboard-direct-guard-v23.js' "$TMP_ASSETS"
grep -q 'data-pmd-pos-direct-guard' "$TMP_GUARD"
grep -q "addEventListener('click'" "$TMP_GUARD"

install -m 0644 "$TMP_GUARD" "$GUARD"
install -m 0644 "$TMP_ASSETS" "$ASSETS"

node --check "$GUARD"
python3 -m json.tool "$ASSETS" >/dev/null
grep -q 'dashboard-direct-guard-v23' "$GUARD"
grep -q 'pmd-waiter-pos-dashboard-direct-guard-v23.js' "$ASSETS"

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS direct routing guard v23 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo PM2, PHP-FPM or Next.js restart is required.\n'
printf 'Close all PayMyDine tabs, reopen /admin/dashboardwaiter, then hard-refresh.\n'
printf 'Expected log: [PMD] Waiter POS dashboard direct guard v23 active\n'
