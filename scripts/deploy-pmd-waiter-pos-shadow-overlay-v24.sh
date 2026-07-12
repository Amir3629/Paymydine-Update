#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
SHADOW="app/admin/assets/js/pmd-waiter-pos-dashboard-shadow-bridge-v24.js"
ASSETS="app/admin/views/_meta/assets.json"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-shadow-overlay-v24-${STAMP}"
TMP_SHADOW="/tmp/pmd-waiter-pos-shadow-bridge-v24-${STAMP}.js"
TMP_ASSETS="/tmp/pmd-waiter-pos-assets-v24-${STAMP}.json"
SUCCESS=0

cd "$REPO"

restore() {
  echo "⚠️ Restoring previous Waiter POS asset configuration"
  if [ -f "$BACKUP/$SHADOW" ]; then
    mkdir -p "$(dirname "$SHADOW")"
    cp -a "$BACKUP/$SHADOW" "$SHADOW"
  else
    rm -f "$SHADOW"
  fi
  if [ -f "$BACKUP/$ASSETS" ]; then
    mkdir -p "$(dirname "$ASSETS")"
    cp -a "$BACKUP/$ASSETS" "$ASSETS"
  fi
  chmod 0644 "$SHADOW" "$ASSETS" 2>/dev/null || true
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
printf ' PMD Waiter POS isolated shadow overlay v2.4\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }
[ -f "$ASSETS" ] || { echo "❌ assets.json is missing"; exit 1; }

mkdir -p "$BACKUP/$(dirname "$SHADOW")" "$BACKUP/$(dirname "$ASSETS")"
[ -f "$SHADOW" ] && cp -a "$SHADOW" "$BACKUP/$SHADOW" || true
cp -a "$ASSETS" "$BACKUP/$ASSETS"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
git show "origin/$BRANCH:$SHADOW" > "$TMP_SHADOW"
git show "origin/$BRANCH:$ASSETS" > "$TMP_ASSETS"

[ -s "$TMP_SHADOW" ] || { echo "❌ Shadow bridge is empty"; exit 1; }
[ -s "$TMP_ASSETS" ] || { echo "❌ assets.json is empty"; exit 1; }

node --check "$TMP_SHADOW"
python3 -m json.tool "$TMP_ASSETS" >/dev/null
grep -q 'dashboard-shadow-bridge-v2.4' "$TMP_SHADOW"
grep -q 'attachShadow' "$TMP_SHADOW"
grep -q 'document.documentElement.appendChild' "$TMP_SHADOW"
grep -q 'pmd-waiter-pos-dashboard-shadow-bridge-v24.js' "$TMP_ASSETS"
grep -q 'pmd-waiter-pos-dashboard-direct-guard-v23.js' "$TMP_ASSETS"
! grep -q 'pmd-waiter-pos-dashboard-bridge-v2.js' "$TMP_ASSETS"

install -m 0644 "$TMP_SHADOW" "$SHADOW"
install -m 0644 "$TMP_ASSETS" "$ASSETS"

node --check "$SHADOW"
python3 -m json.tool "$ASSETS" >/dev/null
grep -q 'dashboard-shadow-bridge-v2.4' "$SHADOW"
grep -q 'pmd-waiter-pos-dashboard-shadow-bridge-v24.js' "$ASSETS"
! grep -q 'pmd-waiter-pos-dashboard-bridge-v2.js' "$ASSETS"

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS isolated shadow overlay v2.4 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo migration, PM2, PHP-FPM or Next.js restart was performed.\n'
printf 'Close every PayMyDine tab, reopen /admin/dashboardwaiter, and hard-refresh.\n'
printf 'Expected log: [PMD] Waiter POS dashboard shadow bridge v2.4 active\n'
