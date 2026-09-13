#!/usr/bin/env bash
set -euo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LOADER="$PMD_ROOT/app/main/routes/main-app-before.php"
ROUTE_DIR="$PMD_ROOT/app/main/routes"
ROUTE_TARGET="$ROUTE_DIR/pmd-frontend-v2-theme.php"
FIELDS_TARGET="$PMD_ROOT/themes/frontend-theme/_meta/fields.php"
STAMP="$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "$LOADER" ]]; then
  echo "ERROR: missing $LOADER" >&2
  exit 1
fi
if [[ ! -f "$FIELDS_TARGET" ]]; then
  echo "ERROR: missing $FIELDS_TARGET" >&2
  exit 1
fi

mkdir -p "$PMD_ROOT/storage/pmd-v2-backups/$STAMP"
cp "$LOADER" "$PMD_ROOT/storage/pmd-v2-backups/$STAMP/main-app-before.php"
cp "$FIELDS_TARGET" "$PMD_ROOT/storage/pmd-v2-backups/$STAMP/frontend-theme-fields.php"
if [[ -f "$ROUTE_TARGET" ]]; then
  cp "$ROUTE_TARGET" "$PMD_ROOT/storage/pmd-v2-backups/$STAMP/pmd-frontend-v2-theme.php"
fi

cp "$HERE/pmd-frontend-v2-theme.php" "$ROUTE_TARGET"
cp "$HERE/../admin/frontend-theme-fields-v2.php" "$FIELDS_TARGET"

python3 - "$LOADER" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
needle = "        require_once __DIR__.'/theme-settings.php';"
insert = "        require_once __DIR__.'/theme-settings.php';\n        require_once __DIR__.'/pmd-frontend-v2-theme.php';"
if "pmd-frontend-v2-theme.php" not in s:
    if needle not in s:
        raise SystemExit('ERROR: theme-settings loader marker not found; no file changed')
    s = s.replace(needle, insert, 1)
    p.write_text(s)
PY

php -l "$ROUTE_TARGET"
php -l "$FIELDS_TARGET"
php -l "$LOADER"

echo "Installed V2-only theme bridge."
echo "Backup: $PMD_ROOT/storage/pmd-v2-backups/$STAMP"
echo "Legacy /simple-theme was not modified."
echo "Verify: curl -sS https://mimoza.paymydine.com/api/v1/frontend-theme-v2"
