#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
while IFS= read -r -d '' file; do php -l "$file" >/dev/null; done < <(find app/Services/RestaurantGroups tests/restaurant-groups -type f \( -name '*.php' -o -name '*.inc' \) -print0)
php tests/restaurant-groups/security.php
php tests/restaurant-groups/publication-r3.php
if command -v node >/dev/null 2>&1; then node --check app/admin/assets/js/pmd-restaurant-groups-v1.js; fi
printf '%s\n' 'Static and isolated service checks passed. MySQL and full application acceptance are separate.'
