#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
php -l app/Services/SuperAdminTenantLifecycleService.php >/dev/null
php -l app/Http/Controllers/RestaurantGroups/SuperAdminController.php >/dev/null
while IFS= read -r -d '' file; do php -l "$file" >/dev/null; done < <(find app/Services/RestaurantGroups tests/restaurant-groups -type f \( -name '*.php' -o -name '*.inc' \) -print0)
php tests/restaurant-groups/provisioning-r4.php
# No application bootstrap, database installation, .env edits, or service reload.
