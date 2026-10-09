#!/usr/bin/env bash
# Source checks only: no Composer, Artisan, schema installation, or service reload.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v php >/dev/null || { echo 'ERROR: PHP CLI is required.' >&2; exit 1; }
php -r 'exit(PHP_VERSION_ID >= 80000 ? 0 : 1);' || { echo 'ERROR: PHP 8+ is required.' >&2; exit 1; }
for dir in app/Services/RestaurantGroups app/Http/Controllers/RestaurantGroups; do
  [ -d "$dir" ] || { echo "ERROR: Missing directory: $dir" >&2; exit 1; }
  while IFS= read -r -d '' file; do php -l "$file" >/dev/null; done < <(find "$dir" -type f -name '*.php' -print0)
done
for file in app/Providers/RestaurantGroupsServiceProvider.php app/Console/Commands/RestaurantGroupsCommand.php app/admin/classes/User.php config/app.php config/pmd_groups.php routes/pmd-groups.php; do
  php -l "$file" >/dev/null
done
command -v node >/dev/null || { echo 'ERROR: Node.js is required for JavaScript validation.' >&2; exit 1; }
node --check app/admin/assets/js/pmd-restaurant-groups-v1.js
bash -n scripts/deploy-restaurant-groups-v1.sh
php tests/restaurant-groups/security.php
echo 'Source checks passed. No database or runtime deployment was performed.'
