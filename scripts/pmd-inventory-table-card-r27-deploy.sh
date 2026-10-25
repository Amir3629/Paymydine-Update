#!/usr/bin/env bash
# PMD_INVENTORY_TABLE_CARD_PARITY_R27_SAFE_DEPLOY
# Only Menu Inventory modal presentation, no branch switch, no DB writes.
set -Eeuo pipefail

if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-inventory-table-card-r27-deploy.sh --apply" >&2
  exit 2
fi

cd /var/www/paymydine || exit 1

controller=app/admin/controllers/Pmdmenus.php
css=app/admin/assets/css/pmd-inventory-table-card-parity-r27.css
js=app/admin/assets/js/pmd-inventory-table-card-parity-r27.js
testfile=scripts/test-pmd-inventory-table-card-r27.js
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"

# This VPS intentionally has scoped unmerged PR #544, #547 and #549 files.
# They must remain unchanged. Avoid git pull, reset, checkout, or bulk patches.
if ! grep -Fq 'PMD_INVENTORY_FOUR_TABS_V1' app/admin/views/pmdinventory/index.blade.php; then
  echo "STOP: The installed Inventory four-tab version was not found." >&2
  exit 1
fi
for required in \
  app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js \
  app/admin/assets/css/pmd-inventory-focus-dialogs-v1.css \
  app/admin/assets/js/pmd-inventory-ui-polish-r26.js \
  app/admin/assets/css/pmd-inventory-ui-polish-r26.css
do
  if [ ! -s "$required" ]; then
    echo "STOP: Missing prerequisite: $required" >&2
    exit 1
  fi
done
if grep -Fq 'pmd-inventory-table-card-parity-r27.js' "$controller"; then
  echo "STOP: R27 is already registered; no files were changed." >&2
  exit 1
fi
for file in "$css" "$js" "$testfile"; do
  if [ -e "$file" ]; then
    echo "STOP: The new file already exists: $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/inventory-table-card-r27-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original" \
  "$stage/$(dirname "$controller")" \
  "$stage/$(dirname "$css")" \
  "$stage/$(dirname "$js")" \
  "$stage/$(dirname "$testfile")"
cp -p "$controller" "$backup/original/Pmdmenus.php"
cp -p "$controller" "$stage/$controller"

for file in "$css" "$js" "$testfile"; do
  git show "$revision:$file" > "$stage/$file"
done

# Only extend the installed controller asset manifest.
# No controller methods, routes, view data or inventory writers are modified.
python3 - "$stage/$controller" <<'PY'
from pathlib import Path
import sys

file = Path(sys.argv[1])
text = file.read_text(encoding='utf-8')
anchors = [
    (
        "            'app/admin/assets/css/pmd-inventory-ui-polish-r26.css',",
        "\n            // PMD_INVENTORY_TABLE_CARD_PARITY_R27: native viewport modal."
        "\n            'app/admin/assets/css/pmd-inventory-table-card-parity-r27.css',"
    ),
    (
        "            'app/admin/assets/js/pmd-inventory-ui-polish-r26.js',",
        "\n            // PMD_INVENTORY_TABLE_CARD_PARITY_R27: after R25 and R26."
        "\n            'app/admin/assets/js/pmd-inventory-table-card-parity-r27.js',"
    ),
]
for anchor, addition in anchors:
    if text.count(anchor) != 1:
        raise SystemExit(
            'STOP: Current VPS controller does not match the R26 asset anchors. '
            'No live file was changed.'
        )
    text = text.replace(anchor, anchor + addition, 1)
file.write_text(text, encoding='utf-8')
PY

php -l "$stage/$controller"
node --check "$stage/$js"
node --check "$stage/$testfile"
node "$stage/$testfile"
echo "PREFLIGHT PASS: native modal, shared Table card and VPS asset staging verified."

modified=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$modified" -eq 1 ]; then
    echo "ERROR: Rolling back only the R27 Inventory UI patch." >&2
    cp -p "$backup/original/Pmdmenus.php" "$controller" || true
    rm -f "$css" "$js" "$testfile"
    php artisan view:clear || true
  fi
}
trap rollback EXIT

modified=1
cp "$stage/$controller" "$controller"
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$js" "$js"
install -m 644 "$stage/$testfile" "$testfile"

node "$testfile"
php artisan view:clear
modified=0

echo "SUCCESS: Inventory R27 full-screen glass and Create Table card parity installed."
echo "Backup: $backup"
echo "Inventory: /admin/menu?workspace=inventory"
git status --short -- "$controller" "$css" "$js" "$testfile"
