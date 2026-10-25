#!/usr/bin/env bash
# PMD_INVENTORY_EXACT_TABLE_CARD_R28_SAFE_DEPLOY
# Incremental repair for an already-installed R26+R27 VPS. No git checkout,
# reset, merge, migration, DB changes or blanket controller replacement.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-inventory-exact-table-card-r28-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1

controller=app/admin/controllers/Pmdmenus.php
css=app/admin/assets/css/pmd-inventory-exact-table-card-r28.css
js=app/admin/assets/js/pmd-inventory-exact-table-card-r28.js
testfile=scripts/test-pmd-inventory-exact-table-card-r28.js
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"

for required in \
  app/admin/assets/css/pmd-inventory-ui-polish-r26.css \
  app/admin/assets/js/pmd-inventory-ui-polish-r26.js \
  app/admin/assets/css/pmd-inventory-table-card-parity-r27.css \
  app/admin/assets/js/pmd-inventory-table-card-parity-r27.js \
  app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js
do
  if [ ! -s "$required" ]; then
    echo "STOP: Missing installed R25/R26/R27 dependency: $required" >&2
    exit 1
  fi
done
if ! grep -Fq 'pmd-inventory-table-card-parity-r27.js' "$controller" ||
   ! grep -Fq 'pmd-inventory-ui-polish-r26.js' "$controller"; then
  echo "STOP: Current Menu controller is not the expected installed R26+R27 version." >&2
  exit 1
fi
if grep -Fq 'pmd-inventory-exact-table-card-r28.js' "$controller"; then
  echo "STOP: R28 assets already registered. No files changed." >&2
  exit 1
fi
for file in "$css" "$js" "$testfile"; do
  if [ -e "$file" ]; then
    echo "STOP: Refusing to overwrite preexisting asset: $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/inventory-exact-table-card-r28-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original" \
  "$stage/$(dirname "$controller")" \
  "$stage/$(dirname "$css")" \
  "$stage/$(dirname "$js")" \
  "$stage/$(dirname "$testfile")"
cp -p "$controller" "$backup/original/Pmdmenus.php"
cp -p "$controller" "$stage/$controller"

# Copy only the prerequisites needed by the read-only regression script.
for existing in \
  app/admin/assets/css/pmd-inventory-ui-polish-r26.css \
  app/admin/assets/js/pmd-inventory-table-card-parity-r27.js
do
  cp -p "$existing" "$stage/$existing"
done

for file in "$css" "$js" "$testfile"; do
  git show "$revision:$file" > "$stage/$file"
done

# Register in the CURRENT installed controller, not the GitHub version.
# In particular keep all existing R19/R24/R25/R26/R27 modifications intact.
python3 - "$stage/$controller" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
src = p.read_text(encoding='utf-8')
pairs = (
    (
        "            'app/admin/assets/css/pmd-inventory-table-card-parity-r27.css',",
        "\n            // PMD_INVENTORY_EXACT_TABLE_CARD_R28: override R26's final specificity."
        "\n            'app/admin/assets/css/pmd-inventory-exact-table-card-r28.css',"
    ),
    (
        "            'app/admin/assets/js/pmd-inventory-table-card-parity-r27.js',",
        "\n            // PMD_INVENTORY_EXACT_TABLE_CARD_R28: keep the real R19 actions."
        "\n            'app/admin/assets/js/pmd-inventory-exact-table-card-r28.js',"
    ),
)
for anchor, replacement in pairs:
    if src.count(anchor) != 1:
        raise SystemExit(
            'STOP: Expected exact R27 asset anchor is missing or duplicated. '
            'Live files have not been modified.'
        )
    src = src.replace(anchor,anchor+replacement,1)
p.write_text(src,encoding='utf-8')
PY

php -l "$stage/$controller"
node --check "$stage/$js"
node --check "$stage/$testfile"
node "$stage/$testfile"
echo "PREFLIGHT PASS: R26 override, Floor R36 card shell and original Inventory handlers validated in staging."

modified=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$modified" -eq 1 ]; then
    echo "ERROR: Reverting R28 only; keeping R26 and R27 untouched." >&2
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

echo "SUCCESS: Inventory R28 exact Create Table card and Save button appearance installed."
echo "Page: /admin/menu?workspace=inventory"
echo "Backup: $backup"
git status --short -- "$controller" "$css" "$js" "$testfile"
