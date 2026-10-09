#!/usr/bin/env bash
# Check-only by default. Run in a staging checkout before any production rollout.
set -euo pipefail
ROOT="${PMD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MODE="${1:---check-only}"
case "$MODE" in
  --check-only|--apply) ;;
  *) echo 'Usage: bash scripts/deploy-restaurant-groups-v1.sh [--check-only|--apply]' >&2; exit 2 ;;
esac
cd "$ROOT"
bash scripts/check-restaurant-groups-v2.sh
if [ "$MODE" = '--check-only' ]; then exit 0; fi
if [ "${PMD_GROUPS_REVIEWED_DEPLOY:-}" != 'yes' ] || [ "${PMD_GROUPS_BACKUP_VERIFIED:-}" != 'yes' ]; then
  echo 'ERROR: Verify a restorable database backup and review staging results first.' >&2
  echo 'Then explicitly set PMD_GROUPS_REVIEWED_DEPLOY=yes and PMD_GROUPS_BACKUP_VERIFIED=yes.' >&2
  exit 20
fi
if [ -n "$(git status --porcelain)" ]; then
  echo 'ERROR: Working tree is not clean. No installation was performed.' >&2
  git status --short
  exit 21
fi
command -v composer >/dev/null || { echo 'ERROR: Composer is required.' >&2; exit 22; }
LOCAL_SHA="$(git rev-parse HEAD)"
printf '[PMD] Installing reviewed checkout: %s\n' "$LOCAL_SHA"
# Do not fetch, reset, change branch, or install dependencies automatically.
composer dump-autoload -o --no-interaction
php artisan optimize:clear
ROUTES="$(php artisan route:list 2>&1)"
for route in 'superadmin/groups' 'group/snapshot' 'group/publish/preview' 'pmd-foodcourt'; do
  grep -Fq "$route" <<< "$ROUTES" || { echo "ERROR: Missing route: $route" >&2; exit 23; }
done
# Central tables only. Existing restaurant databases are NOT backfilled here.
php artisan pmd:restaurant-groups install
php artisan pmd:restaurant-groups health
php artisan optimize:clear
if [ -n "${PMD_PHP_FPM_SERVICE:-}" ]; then
  [[ "$PMD_PHP_FPM_SERVICE" =~ ^php[0-9]+\.[0-9]+-fpm(\.service)?$ ]] || { echo 'ERROR: Invalid PHP-FPM service name.' >&2; exit 24; }
  sudo systemctl reload "$PMD_PHP_FPM_SERVICE"
fi
printf '[PMD] Central schema installed for %s. Verify login, MFA, provisioning and publishing in staging.\n' "$LOCAL_SHA"
echo '[PMD] Existing restaurant databases were not backfilled. This is not an end-to-end acceptance result.'
