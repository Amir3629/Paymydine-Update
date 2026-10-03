#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/restaurant-groups-20261003"

cd "$ROOT"

echo "[PMD] Restaurant Groups deployment preflight"

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree is not clean. Commit or stash your VPS changes first."
  git status --short
  exit 20
fi

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
LOCAL_SHA="$(git rev-parse HEAD)"

if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "ERROR: Current checkout is not the fetched Restaurant Groups commit."
  echo "Current: $LOCAL_SHA"
  echo "Remote : $REMOTE_SHA"
  echo "Run the checkout command shown in the deployment instructions, then rerun this script."
  exit 21
fi

echo "[PMD] Commit: $LOCAL_SHA"

PHP_FILES=(
  "app/Providers/RestaurantGroupsServiceProvider.php"
  "app/Console/Commands/RestaurantGroupsCommand.php"
  "app/admin/classes/User.php"
  "config/app.php"
  "config/pmd_groups.php"
  "routes/pmd-groups.php"
)

while IFS= read -r -d '' file; do
  PHP_FILES+=("$file")
done < <(find app/Services/RestaurantGroups app/Http/Controllers/RestaurantGroups -type f -name '*.php' -print0)

for file in "${PHP_FILES[@]}"; do
  php -l "$file" >/dev/null
done

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-restaurant-groups-v1.js
fi

echo "[PMD] Syntax checks passed"

composer dump-autoload -o --no-interaction
php artisan optimize:clear

ROUTES="$(php artisan route:list 2>&1)"
printf '%s\n' "$ROUTES" | grep -q 'superadmin/groups'
printf '%s\n' "$ROUTES" | grep -q 'group/snapshot'
printf '%s\n' "$ROUTES" | grep -q 'group/publish/preview'
printf '%s\n' "$ROUTES" | grep -q 'pmd-foodcourt'

echo "[PMD] Route wiring passed"

# Additive/idempotent control-plane tables + helper tables in existing tenants.
# Existing tenants are backfilled as independent groups without changing their
# login authority; only newly-linked Business Accounts use shared-owner auth.
php artisan pmd:restaurant-groups install --backfill
php artisan pmd:restaurant-groups health

php artisan optimize:clear

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm
fi

echo
echo "[PMD] Restaurant Groups deployment complete"
echo "[PMD] Open: https://paymydine.com/superadmin/groups"
echo "[PMD] Commit: $LOCAL_SHA"
