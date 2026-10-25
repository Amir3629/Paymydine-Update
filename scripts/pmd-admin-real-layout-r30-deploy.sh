#!/usr/bin/env bash
# PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT_SAFE_DEPLOY
# R29 installed in an unused "layouts/default" template; real controllers use
# "app/admin/views/_layouts/default.blade.php". Fix ONLY the real shell.
# Does not pull/merge/reset/checkout or overwrite R26-R29 and local VPS work.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-admin-real-layout-r30-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"

live=app/admin/views/_layouts/default.blade.php
controller=app/admin/classes/AdminController.php
css=app/admin/assets/css/pmd-admin-control-language-r29.css
js=app/admin/assets/js/pmd-admin-control-language-r29.js
testfile=scripts/test-pmd-admin-real-layout-r30.js
for file in "$live" "$controller" "$css" "$js"; do
  if [ ! -s "$file" ]; then
    echo "STOP: Missing prerequisite $file. No changes made." >&2
    exit 1
  fi
done
if ! grep -Fq "'~/app/admin/views/_layouts'" "$controller" ||
   ! grep -Fq 'PMD_PLATFORM_CARD_SYSTEM_V3_REAL_ADMIN_LAYOUT_HEAD' "$live"; then
  echo "STOP: Live AdminController/layout are not the expected version. No changes made." >&2
  exit 1
fi
if ! grep -Fq 'data-pmd-admin-action-r29="primary"' "$css" ||
   ! grep -Fq 'pmd-admin-controls-r29-ready' "$js"; then
  echo "STOP: R29 assets are missing their control-language implementation." >&2
  exit 1
fi
if grep -Fq 'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT' "$live"; then
  echo "ALREADY INSTALLED: R30 real layout asset references are present."
  exit 0
fi
if [ -e "$testfile" ]; then
  echo "STOP: Refusing to overwrite pre-existing $testfile." >&2
  exit 1
fi

backup="$HOME/pmd-backups/admin-real-layout-r30-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original/$(dirname "$live")"
mkdir -p "$stage/$(dirname "$live")"
mkdir -p "$stage/$(dirname "$controller")"
mkdir -p "$stage/$(dirname "$css")"
mkdir -p "$stage/$(dirname "$js")"
mkdir -p "$stage/$(dirname "$testfile")"
cp -p "$live" "$backup/original/$live"
cp -p "$live" "$stage/$live"
cp -p "$controller" "$stage/$controller"
cp -p "$css" "$stage/$css"
cp -p "$js" "$stage/$js"
git show "$revision:$testfile" > "$stage/$testfile"

# Insert into *current VPS* _layouts/default, never Github's huge older copy.
python3 - "$stage/$live" <<'PY'
from pathlib import Path
import sys

file = Path(sys.argv[1])
src = file.read_text(encoding='utf-8')
marker = '<!-- /PMD_PLATFORM_CARD_SYSTEM_V3_REAL_ADMIN_LAYOUT_HEAD -->'
if src.count(marker) != 1 or src.count('</head>') != 1:
    raise SystemExit('STOP: Real Admin layout has unexpected head structure.')
if src.index(marker) >= src.index('</head>'):
    raise SystemExit('STOP: Admin reference marker outside <head>.')
if 'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT' in src:
    raise SystemExit('STOP: R30 marker already exists in staged real layout.')

block = """<!-- PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT: actual AdminController _layouts/default.blade.php.
     R29's layouts/default.blade.php is not the live Admin shell. -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-admin-control-language-r29.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-admin-control-language-r29.css')) ?: 20261025) }}"
      data-pmd-admin-control-language-r29="css"
      data-pmd-admin-control-layout-r30="real">
<script defer
        src="{{ asset('app/admin/assets/js/pmd-admin-control-language-r29.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-admin-control-language-r29.js')) ?: 20261025) }}"
        data-pmd-admin-control-language-r29="js"
        data-pmd-admin-control-layout-r30="real"></script>
<!-- /PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT -->"""
src = src.replace('</head>',block+'\n\n</head>',1)
file.write_text(src,encoding='utf-8')
PY

node --check "$stage/$js"
node --check "$stage/$testfile"
node "$stage/$testfile"
echo "PREFLIGHT PASS: Real controller _layouts/default now references R29 in actual <head>."

applied=0
rollback() {
  result=$?
  if [ "$result" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "ERROR: R30 deployment failed. Restoring original real layout..." >&2
    cp -p "$backup/original/$live" "$live" || true
    rm -f "$testfile"
    php artisan view:clear || true
  fi
}
trap rollback EXIT

applied=1
cp -p "$stage/$live" "$live"
install -m 644 "$stage/$testfile" "$testfile"
node "$testfile"
php artisan view:clear
applied=0

echo "SUCCESS: R30 installed R29 into the actual Admin layout (_layouts/default)."
echo "Inventory: /admin/menu?workspace=inventory"
echo "Backup: $backup"
echo "Browser proof: the page HTML now contains data-pmd-admin-control-layout-r30=real."
git status --short -- "$live" "$testfile"
