#!/usr/bin/env bash
# PMD_INVENTORY_FOCUS_FORMS_V1_SAFE_DEPLOY
# Install only the Inventory presentation assets and their controller includes.
# Retain the Inventory four-tab VPS patch and unrelated local modifications.
set -Eeuo pipefail

if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-inventory-focus-dialogs-v1-deploy.sh --apply" >&2
  exit 2
fi

cd /var/www/paymydine || exit 1
rev="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
controller=app/admin/controllers/Pmdmenus.php
css=app/admin/assets/css/pmd-inventory-focus-dialogs-v1.css
js=app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js
testfile=scripts/test-pmd-inventory-focus-dialogs-v1.js

# This enhancement assumes the previous four-tab Inventory update was installed.
if ! grep -Fq 'PMD_INVENTORY_FOUR_TABS_V1' app/admin/views/pmdinventory/index.blade.php; then
  echo "STOP: Install the Inventory four-tab update before the focus-dialog UI." >&2
  exit 1
fi
if grep -Fq 'PMD_INVENTORY_FOCUS_FORMS_V1' "$controller"; then
  echo "STOP: Inventory dialog assets already registered." >&2
  exit 1
fi
for path in "$css" "$js" "$testfile"; do
  if [ -e "$path" ]; then
    echo "STOP: New asset path already exists: $path" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/inventory-focus-dialogs-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$stage/$(dirname "$controller")" "$stage/$(dirname "$css")" \
         "$stage/$(dirname "$js")" "$stage/$(dirname "$testfile")" "$backup/original"

cp -p "$controller" "$backup/original/Pmdmenus.php"
cp -p "$controller" "$stage/$controller"
for path in "$css" "$js" "$testfile"; do
  git show "$rev:$path" > "$stage/$path"
done

# Do not require the VPS controller to match a GitHub commit: other
# locally installed PR changes are expected. Only insert scoped include lines.
python3 - "$stage/$controller" <<'PY'
from pathlib import Path
import sys

file = Path(sys.argv[1])
source = file.read_text(encoding='utf-8')
anchors = [
    ("            'app/admin/assets/css/pmd-menu-inventory-unified-r20.css',",
     "\n            // PMD_INVENTORY_FOCUS_FORMS_V1: simple catalogue and focused forms."
     "\n            'app/admin/assets/css/pmd-inventory-focus-dialogs-v1.css',"),
    ("            'app/admin/assets/js/pmd-menu-inventory-unified-r20.js',",
     "\n            // PMD_INVENTORY_FOCUS_FORMS_V1: original R19 actions stay authoritative."
     "\n            'app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js',"),
]
for anchor, addition in anchors:
    if source.count(anchor) != 1:
        raise SystemExit('STOP: Menu controller asset anchor is not unique; nothing installed.')
    source = source.replace(anchor, anchor + addition, 1)
file.write_text(source, encoding='utf-8')
PY

php -l "$stage/$controller"
node --check "$stage/$js"
node --check "$stage/$testfile"
node "$stage/$testfile"
echo "PREFLIGHT PASS: Inventory dialog patch validated before touching live files."

changed=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$changed" -eq 1 ]; then
    echo "ERROR: Restoring original Menu controller and removing new Inventory assets." >&2
    cp "$backup/original/Pmdmenus.php" "$controller" || true
    rm -f "$css" "$js" "$testfile"
    php artisan view:clear || true
  fi
}
trap rollback EXIT

changed=1
cp "$stage/$controller" "$controller"
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$js" "$js"
install -m 644 "$stage/$testfile" "$testfile"

node "$testfile"
php artisan view:clear

changed=0
echo "SUCCESS: Inventory focus dialogs and compact catalogue installed."
echo "Backup: $backup"
git status --short -- "$controller" "$css" "$js" "$testfile"
