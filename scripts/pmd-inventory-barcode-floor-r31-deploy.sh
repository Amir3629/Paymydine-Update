#!/usr/bin/env bash
# PMD_INVENTORY_BARCODE_FLOOR_R31_SAFE_DEPLOY
# Existing VPS contains PR 544-554 applied locally; do NOT merge or checkout.
# Installs two NEW scoped front-end assets and ONE link block in ACTUAL
# AdminController _layouts/default; preserves all backend and existing assets.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-inventory-barcode-floor-r31-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"

live=app/admin/views/_layouts/default.blade.php
css=app/admin/assets/css/pmd-inventory-barcode-floor-r31.css
js=app/admin/assets/js/pmd-inventory-scrollbar-r31.js
regression=scripts/test-pmd-inventory-barcode-floor-r31.js
fixtures=(
  app/admin/classes/AdminController.php
  app/admin/views/pmdinventory/index.blade.php
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/assets/css/pmd-inventory-workspace-r19.css
  app/admin/assets/js/pmd-inventory-workspace-r19.js
  app/admin/assets/css/pmd-shared-floor-multi-floor-v1.css
  app/admin/assets/css/pmd-inventory-exact-table-card-r28.css
  app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js
  app/admin/assets/js/pmd-inventory-table-card-parity-r27.js
)
for file in "$live" "${fixtures[@]}"; do
  if [ ! -s "$file" ]; then
    echo "STOP: Required existing file missing: $file. No changes made." >&2
    exit 1
  fi
done

if ! grep -Fq 'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT' "$live" ||
   ! grep -Fq "data-pmd-admin-control-layout-r30=" "$live" ||
   ! grep -Fq '.pmd-inv-r28-ready' app/admin/assets/css/pmd-inventory-exact-table-card-r28.css; then
  echo "STOP: Real R30 and Inventory R28 prerequisite layout/assets not detected." >&2
  exit 1
fi

if grep -Fq 'PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS' "$live"; then
  if [ -s "$css" ] && [ -s "$js" ] && [ -s "$regression" ]; then
    echo "ALREADY INSTALLED: R31 actual Admin head + all assets are present."
    exit 0
  fi
  echo "STOP: Partial R31 deployment detected; do not overwrite existing assets." >&2
  exit 1
fi
for file in "$css" "$js" "$regression"; do
  if [ -e "$file" ]; then
    echo "STOP: Existing R31 file would be overwritten: $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/inventory-barcode-floor-r31-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original/$(dirname "$live")"
mkdir -p "$stage/$(dirname "$live")"
cp -p "$live" "$backup/original/$live"
cp -p "$live" "$stage/$live"

# Stage test fixtures from CURRENT VPS, not the potentially outdated Github
# copy. Regression must describe the exact code we are about to patch.
for file in "${fixtures[@]}"; do
  mkdir -p "$stage/$(dirname "$file")"
  cp -p "$file" "$stage/$file"
done
for file in "$css" "$js" "$regression"; do
  mkdir -p "$stage/$(dirname "$file")"
  git show "$revision:$file" > "$stage/$file"
  test -s "$stage/$file"
done

python3 - "$stage/$live" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
content = path.read_text(encoding='utf-8')
anchor = '<!-- /PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT -->'
if content.count(anchor) != 1 or content.count('</head>') != 1:
    raise SystemExit('STOP: R30 real layout anchor/head is not unique.')
if content.index(anchor) > content.index('</head>'):
    raise SystemExit('STOP: R30 anchor is outside actual <head>.')
if 'PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS' in content:
    raise SystemExit('STOP: R31 assets already mounted in staging.')

block = """<!-- PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS: after R19-R30, actual Admin layout -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-inventory-barcode-floor-r31.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-inventory-barcode-floor-r31.css')) ?: 20261025) }}"
      data-pmd-inventory-barcode-floor-r31="css">
<script defer
        src="{{ asset('app/admin/assets/js/pmd-inventory-scrollbar-r31.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-inventory-scrollbar-r31.js')) ?: 20261025) }}"
        data-pmd-inventory-barcode-floor-r31="js"></script>
<!-- /PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS -->"""
path.write_text(content.replace(anchor,anchor+'\n'+block,1),encoding='utf-8')
PY

# No live mutation until both syntax and DOM mock assertions pass.
node --check "$stage/$js"
node --check "$stage/$regression"
node "$stage/$regression"
echo "PREFLIGHT PASS: R31 correct real Admin head, 4 tabs, barcode native input, 3px scrubber and Owner/Manager roles."

applied=0
rollback() {
  result=$?
  if [ "$result" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "ERROR: R31 installation failed; restoring the original layout..." >&2
    cp -p "$backup/original/$live" "$live" || true
    rm -f "$css" "$js" "$regression"
    php artisan view:clear || true
  fi
}
trap rollback EXIT

applied=1
cp -p "$stage/$live" "$live"
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$js" "$js"
install -m 644 "$stage/$regression" "$regression"

node "$regression"
php artisan view:clear
applied=0

echo "SUCCESS: R31 Inventory controls, fixed barcode modal and Owner/Manager floor tabs installed."
echo "Backup: $backup"
echo "Inventory: /admin/menu?workspace=inventory"
echo "Browser proof: [data-pmd-inventory-barcode-floor-r31=css] and window.PMDInventoryScrollbarR31."
git status --short -- "$live" "$css" "$js" "$regression"
