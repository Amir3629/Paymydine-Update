#!/usr/bin/env bash
# PMD_INVENTORY_UI_POLISH_R26_SAFE_DEPLOY
# Scoped presentation only: no git checkout/merge/reset, no DB, no stock writes.
set -Eeuo pipefail

if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-inventory-ui-polish-r26-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1

controller=app/admin/controllers/Pmdmenus.php
css=app/admin/assets/css/pmd-inventory-ui-polish-r26.css
js=app/admin/assets/js/pmd-inventory-ui-polish-r26.js
testfile=scripts/test-pmd-inventory-ui-polish-r26.js
rev="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"

if ! grep -Fq "PMD_INVENTORY_FOUR_TABS_V1" app/admin/views/pmdinventory/index.blade.php; then
  echo "STOP: Inventory four-tab update must already be on this VPS." >&2
  exit 1
fi
if ! grep -Fq "pmd-inventory-focus-dialogs-v1.js" "$controller" ||
   [ ! -f app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js ] ||
   [ ! -f app/admin/assets/css/pmd-inventory-focus-dialogs-v1.css ]; then
  echo "STOP: Inventory R25 dialogs must be installed before this refinement." >&2
  exit 1
fi
if grep -Fq "pmd-inventory-ui-polish-r26.js" "$controller"; then
  echo "STOP: Inventory R26 is already registered. Do not reinstall blindly." >&2
  exit 1
fi
for file in "$css" "$js" "$testfile"; do
  if [ -e "$file" ]; then
    echo "STOP: The new destination exists: $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/inventory-r26-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original" "$stage/$(dirname "$controller")" \
  "$stage/$(dirname "$css")" "$stage/$(dirname "$js")" \
  "$stage/$(dirname "$testfile")"
cp -p "$controller" "$backup/original/Pmdmenus.php"
cp -p "$controller" "$stage/$controller"

for file in "$css" "$js" "$testfile"; do
  git show "$rev:$file" > "$stage/$file"
done

# The VPS legitimately has locally installed PR #544 + #547 asset changes.
# Append new assets immediately after the installed R25 includes only.
python3 - "$stage/$controller" <<'PY'
from pathlib import Path
import sys
file = Path(sys.argv[1])
text = file.read_text(encoding='utf-8')
updates = [
    (
        "            'app/admin/assets/css/pmd-inventory-focus-dialogs-v1.css',",
        "\n            // PMD_INVENTORY_UI_POLISH_R26: scoped form/list design."
        "\n            'app/admin/assets/css/pmd-inventory-ui-polish-r26.css',"
    ),
    (
        "            'app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js',",
        "\n            // PMD_INVENTORY_UI_POLISH_R26: preserve stock handlers."
        "\n            'app/admin/assets/js/pmd-inventory-ui-polish-r26.js',"
    ),
]
for anchor, addition in updates:
    if text.count(anchor) != 1:
        raise SystemExit("STOP: Menu controller includes differ from expected. Live files unchanged.")
    text = text.replace(anchor, anchor + addition, 1)
file.write_text(text, encoding='utf-8')
PY

php -l "$stage/$controller"
node --check "$stage/$js"
node --check "$stage/$testfile"
node "$stage/$testfile"
echo "PREFLIGHT PASS: R26 forms, count and shopping UI validated in staging."

changed=0
rollback() {
  code=$?
  if [ "$code" -ne 0 ] && [ "$changed" -eq 1 ]; then
    echo "ERROR: Rolling back only Inventory R26 UI files." >&2
    cp -p "$backup/original/Pmdmenus.php" "$controller" || true
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

echo "SUCCESS: Inventory R26 UI polish installed."
echo "Page: /admin/menu?workspace=inventory"
echo "Backup: $backup"
git status --short -- "$controller" "$css" "$js" "$testfile"
