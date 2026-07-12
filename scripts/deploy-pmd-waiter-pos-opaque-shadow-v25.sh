#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
CSS="app/admin/assets/css/pmd-waiter-pos-shadow-host-v25.css"
ASSETS="app/admin/views/_meta/assets.json"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-opaque-shadow-v25-${STAMP}"
TMP_CSS="/tmp/pmd-waiter-pos-shadow-host-v25-${STAMP}.css"
TMP_ASSETS="/tmp/pmd-waiter-pos-assets-v25-${STAMP}.json"
SUCCESS=0

cd "$REPO"

restore() {
  echo "⚠️ Restoring previous files"
  if [ -f "$BACKUP/$CSS" ]; then
    mkdir -p "$(dirname "$CSS")"
    cp -a "$BACKUP/$CSS" "$CSS"
  else
    rm -f "$CSS"
  fi
  if [ -f "$BACKUP/$ASSETS" ]; then
    mkdir -p "$(dirname "$ASSETS")"
    cp -a "$BACKUP/$ASSETS" "$ASSETS"
  fi
  chmod 0644 "$CSS" "$ASSETS" 2>/dev/null || true
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
printf ' PMD Waiter POS opaque shadow host v2.5\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }
[ -f "$ASSETS" ] || { echo "❌ assets.json is missing"; exit 1; }

mkdir -p "$BACKUP/$(dirname "$CSS")" "$BACKUP/$(dirname "$ASSETS")"
[ -f "$CSS" ] && cp -a "$CSS" "$BACKUP/$CSS" || true
cp -a "$ASSETS" "$BACKUP/$ASSETS"

echo "✅ Existing files backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
git show "origin/$BRANCH:$CSS" > "$TMP_CSS"
git show "origin/$BRANCH:$ASSETS" > "$TMP_ASSETS"

[ -s "$TMP_CSS" ] || { echo "❌ CSS file is empty"; exit 1; }
[ -s "$TMP_ASSETS" ] || { echo "❌ assets.json is empty"; exit 1; }

python3 -m json.tool "$TMP_ASSETS" >/dev/null
grep -q 'pmd-waiter-pos-shadow-host-v25.css' "$TMP_ASSETS"
grep -q 'data-pmd-pos-viewport-host="overlay"' "$TMP_CSS"
grep -q -- '--pmd-pos-bg: #eef3f8' "$TMP_CSS"
grep -q 'background-color: #eef3f8 !important' "$TMP_CSS"

install -m 0644 "$TMP_CSS" "$CSS"
install -m 0644 "$TMP_ASSETS" "$ASSETS"

python3 -m json.tool "$ASSETS" >/dev/null
grep -q 'pmd-waiter-pos-shadow-host-v25.css' "$ASSETS"
grep -q 'background-color: #eef3f8 !important' "$CSS"

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS opaque shadow host v2.5 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Close all PayMyDine tabs, reopen /admin/dashboardwaiter, and hard-refresh.\n'
printf 'The dashboard must no longer be visible behind the POS workspace.\n'
