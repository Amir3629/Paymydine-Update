#!/usr/bin/env bash
# PMD_ADMIN_CONTROL_LANGUAGE_R29_SAFE_DEPLOY
# New JS/CSS only, carefully inserted into four existing Admin shells.
# Never git merge/reset/checkout: VPS includes locally deployed PR 544-552.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-admin-control-language-r29-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1

revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
css=app/admin/assets/css/pmd-admin-control-language-r29.css
js=app/admin/assets/js/pmd-admin-control-language-r29.js
regression=scripts/test-pmd-admin-control-language-r29.js
layouts=(
  app/admin/views/layouts/default.blade.php
  app/admin/views/superadmin_r2/layout.blade.php
  app/admin/views/waiter_pos.blade.php
  app/admin/views/kitchendisplay/index.blade.php
)

if [ ! -s app/admin/assets/css/pmd-inventory-exact-table-card-r28.css ] ||
   [ ! -s app/admin/assets/js/pmd-inventory-exact-table-card-r28.js ]; then
  echo "STOP: Inventory R28 local visual authority not installed." >&2
  exit 1
fi
for file in "${layouts[@]}"; do
  if [ ! -s "$file" ]; then
    echo "STOP: Missing required Admin layout: $file" >&2
    exit 1
  fi
  if grep -Fq 'PMD_ADMIN_CONTROL_LANGUAGE_R29' "$file"; then
    echo "STOP: R29 already present in $file. Nothing changed." >&2
    exit 1
  fi
done
for file in "$css" "$js" "$regression"; do
  if [ -e "$file" ]; then
    echo "STOP: R29 target already exists: $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/admin-control-language-r29-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
for file in "${layouts[@]}"; do
  mkdir -p "$backup/original/$(dirname "$file")" "$stage/$(dirname "$file")"
  cp -p "$file" "$backup/original/$file"
  cp -p "$file" "$stage/$file"
done
for file in "$css" "$js" "$regression"; do
  mkdir -p "$stage/$(dirname "$file")"
  git show "$revision:$file" > "$stage/$file"
done

# Add only two asset references to CURRENT VPS layout files.
# Never replace them wholesale with Github's older main versions.
python3 - "$stage" <<'PY'
from pathlib import Path
import sys

stage = Path(sys.argv[1])
layouts = [
    'app/admin/views/layouts/default.blade.php',
    'app/admin/views/superadmin_r2/layout.blade.php',
    'app/admin/views/waiter_pos.blade.php',
    'app/admin/views/kitchendisplay/index.blade.php',
]
block = """<!-- PMD_ADMIN_CONTROL_LANGUAGE_R29: shared visual roles; business buttons remain untouched. -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-admin-control-language-r29.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-admin-control-language-r29.css')) ?: 20261025) }}"
      data-pmd-admin-control-language-r29="css">
<script defer
        src="{{ asset('app/admin/assets/js/pmd-admin-control-language-r29.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-admin-control-language-r29.js')) ?: 20261025) }}"
        data-pmd-admin-control-language-r29="js"></script>
<!-- /PMD_ADMIN_CONTROL_LANGUAGE_R29 -->
"""
for file in layouts:
    p = stage / file
    txt = p.read_text(encoding='utf-8')
    anchor = "@stack('page-head')\n</head>" if '/superadmin_r2/' in file else '</head>'
    if txt.count(anchor) != 1 or 'PMD_ADMIN_CONTROL_LANGUAGE_R29' in txt:
        raise SystemExit('STOP: Layout anchor missing, duplicated or already patched: ' + file)
    if '/superadmin_r2/' in file:
        txt = txt.replace(anchor, "@stack('page-head')\n" + block + '</head>', 1)
    else:
        txt = txt.replace(anchor, block + '</head>', 1)
    p.write_text(txt, encoding='utf-8')
PY

node --check "$stage/$js"
node --check "$stage/$regression"
node "$stage/$regression"
echo "PREFLIGHT PASS: Admin, Superadmin, Waiter POS and KDS layouts; native select, actions and regression."

applied=0
rollback() {
  result=$?
  if [ "$result" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "ERROR: R29 apply failed. Reverting R29-only changes..." >&2
    for file in "${layouts[@]}"; do
      cp -p "$backup/original/$file" "$file" || true
    done
    rm -f "$css" "$js" "$regression"
    php artisan view:clear || true
  fi
}
trap rollback EXIT

applied=1
for file in "${layouts[@]}"; do
  cp -p "$stage/$file" "$file"
done
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$js" "$js"
install -m 644 "$stage/$regression" "$regression"

node "$regression"
php artisan view:clear
applied=0

echo "SUCCESS: R29 unified Admin action language + Inventory rounded native dropdowns."
echo "Backup: $backup"
echo "Note: POS/KDS transactional touch controls retain their own sizes and workflow status colors."
git status --short -- "${layouts[@]}" "$css" "$js" "$regression"
