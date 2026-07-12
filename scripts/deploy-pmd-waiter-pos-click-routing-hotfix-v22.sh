#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
FILE="app/admin/assets/js/pmd-waiter-pos-dashboard-bridge-v2.js"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-click-routing-v22-${STAMP}"
TMP="/tmp/pmd-waiter-pos-dashboard-bridge-v22-${STAMP}.js"
SUCCESS=0

cd "$REPO"

restore() {
  if [ -f "$BACKUP/$FILE" ]; then
    echo "⚠️ Restoring previous bridge file"
    mkdir -p "$(dirname "$FILE")"
    cp -a "$BACKUP/$FILE" "$FILE"
    chmod 0644 "$FILE" || true
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
printf ' PMD Waiter POS click-routing hotfix v2.2\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }
[ -f "$FILE" ] || { echo "❌ Live bridge file is missing: $FILE"; exit 1; }

mkdir -p "$BACKUP/$(dirname "$FILE")"
cp -a "$FILE" "$BACKUP/$FILE"
sha256sum "$FILE" > "$BACKUP/sha256-before.txt"

echo "✅ Existing bridge backed up"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
git show "origin/$BRANCH:$FILE" > "$TMP"

[ -s "$TMP" ] || { echo "❌ Downloaded bridge is empty"; exit 1; }
node --check "$TMP"
grep -q "dashboard-bridge-v2.2" "$TMP"
grep -q "window.addEventListener('click', interceptDashboardClick, true)" "$TMP"
grep -q "data-new-order" "$TMP"
grep -q "openTablePicker" "$TMP"

install -m 0644 "$TMP" "$FILE"
node --check "$FILE"

grep -q "dashboard-bridge-v2.2" "$FILE"
grep -q "interceptor: 'window-capture'" "$FILE"
sha256sum "$FILE" > "$BACKUP/sha256-after.txt"

# The bridge is served as a direct admin asset. Cache clear is best-effort only;
# browser hard refresh is still required after this one-file hotfix.
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS click-routing hotfix v2.2 installed\n'
printf '================================================\n'
printf 'Target commit: %s\n' "$TARGET"
printf 'Backup: %s\n' "$BACKUP"
printf '\nNo PM2, PHP-FPM or Next.js restart is required.\n'
printf 'Hard-refresh /admin/dashboardwaiter before testing.\n'
printf 'Expected console log: [PMD] Waiter POS dashboard bridge v2.2 active\n'
