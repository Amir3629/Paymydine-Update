#!/usr/bin/env bash
# PMD_PLATFORM_UI_REPORT_R33_VPS_SAFE_DEPLOY
# Applied on top of R31+R32 VPS installations. Scoped CSS only.
# Never git merge, pull, reset, checkout, modify database, or change JS handlers.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-platform-ui-report-r33-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
layout=app/admin/views/_layouts/default.blade.php
css=app/admin/assets/css/pmd-platform-ui-report-r33.css
tests=scripts/test-pmd-platform-ui-report-r33.cjs
fixtures=(
  app/admin/assets/css/pmd-inventory-barcode-floor-r31.css
  app/admin/assets/css/pmd-inventory-exact-table-card-r28.css
  app/admin/assets/css/pmd-admin-control-language-r29.css
  app/admin/views/pmdinventory/index.blade.php
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/views/pmdsettings/restaurant.blade.php
)

test -s "$layout" || { echo "STOP: Real Admin layout not found" >&2; exit 1; }
for file in "${fixtures[@]}"; do
  test -s "$file" || { echo "STOP: Required live R31/R28 fixture missing: $file" >&2; exit 1; }
done
grep -Fq 'PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS' "$layout" ||
  { echo "STOP: R31 layout anchor missing" >&2; exit 1; }
grep -Fq 'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT' "$layout" ||
  { echo "STOP: R29 real layout anchor missing" >&2; exit 1; }
grep -Fq 'PMD_INVENTORY_BARCODE_SINGLE_FOCUS_R32' app/admin/assets/js/fix-form-field-focus-colors.js ||
  { echo "STOP: R32 focus script missing; install R32 first" >&2; exit 1; }
if grep -Fq 'PMD_PLATFORM_UI_REPORT_R33_ASSET' "$layout"; then
  if [ -s "$css" ] && [ -s "$tests" ]; then
    echo "ALREADY INSTALLED: R33 CSS is wired in real layout."
    exit 0
  fi
  echo "STOP: R33 marker exists but install incomplete; manual inspection required" >&2
  exit 1
fi
for file in "$css" "$tests"; do
  if [ -e "$file" ]; then
    echo "STOP: Refusing to overwrite existing $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/platform-ui-r33-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original/$(dirname "$layout")" "$stage/$(dirname "$layout")"
cp -p "$layout" "$backup/original/$layout"
cp -p "$layout" "$stage/$layout"
layout_sha="$(sha256sum "$layout" | awk '{print $1}')"
for file in "${fixtures[@]}"; do
  mkdir -p "$stage/$(dirname "$file")"
  cp -p "$file" "$stage/$file"
done
for file in "$css" "$tests"; do
  mkdir -p "$stage/$(dirname "$file")"
  git show "$revision:$file" > "$stage/$file"
  test -s "$stage/$file"
done

python3 - "$stage/$layout" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1])
src=path.read_text(encoding='utf-8')
anchor='<!-- /PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS -->'
if src.count(anchor)!=1 or 'PMD_PLATFORM_UI_REPORT_R33_ASSET' in src:
    raise SystemExit('STOP: Unique R31 anchor absent or R33 already wired; live file unchanged.')
insert="""<!-- PMD_PLATFORM_UI_REPORT_R33_ASSET: exact R32 browser audit corrections -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-platform-ui-report-r33.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-platform-ui-report-r33.css')) ?: 20261026) }}"
      data-pmd-platform-ui-report-r33="css">
<!-- /PMD_PLATFORM_UI_REPORT_R33_ASSET -->"""
src=src.replace(anchor,anchor+'\n'+insert,1)
path.write_text(src,encoding='utf-8')
PY

node --check "$stage/$tests"
PMD_R33_TEST_ROOT="$stage" node "$stage/$tests"
echo "PREFLIGHT PASS: R33 only CSS + safe real-layout asset insertion."

if [ "$(sha256sum "$layout" | awk '{print $1}')" != "$layout_sha" ]; then
  echo "STOP: Live layout changed concurrently; no deployment performed" >&2
  exit 1
fi
applied=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "ERROR: Reverting R33 layout to backup $backup" >&2
    cp -p "$backup/original/$layout" "$layout" || true
    rm -f "$css" "$tests"
    php artisan view:clear || true
  fi
}
trap rollback EXIT
applied=1
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$tests" "$tests"
cp -p "$stage/$layout" "$layout"
PMD_R33_TEST_ROOT="$PWD" node "$tests"
php artisan view:clear
applied=0
echo "SUCCESS: R33 audited barcode single input + Owner/Manager Add table + Restaurant add actions."
echo "Page: /admin/menu?workspace=inventory"
echo "Backup: $backup"
git status --short -- "$layout" "$css" "$tests"
