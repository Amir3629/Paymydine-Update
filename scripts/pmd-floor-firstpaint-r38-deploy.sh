#!/usr/bin/env bash
# PMD R38: preserve the existing dirty, patched VPS tree, including R29-R37.
# Applies only a pinned R37->R38 Floor patch. No checkout, pull, reset, DB changes.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || { echo "Usage: pmd-floor-r38-deploy.sh --apply"; exit 2; }
cd /var/www/paymydine || exit 1

BASE=3cb7a069f8db1c31c9452830bf4de5afa20e141f
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/dashboard-r38-$stamp"
work="$(mktemp -d)"
installed=0

patch_paths=(
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js
)
new_assets=(
  app/admin/assets/css/pmd-owner-floor-stability-r38.css
  app/admin/assets/js/pmd-floor-stability-audit-r38.js
)
layout=app/admin/views/_layouts/default.blade.php

cleanup() {
  local code=$?
  trap - EXIT
  if [[ "$code" -ne 0 && "$installed" == 1 ]]; then
    echo "R38 error; restoring the backed-up VPS files."
    for file in "${patch_paths[@]}" "$layout"; do
      [[ ! -f "$backup/$file" ]] || cp -p "$backup/$file" "$file"
    done
    for file in "${new_assets[@]}"; do
      if [[ -f "$backup/$file" ]]; then
        cp -p "$backup/$file" "$file"
      else
        rm -f "$file"
      fi
    done
    php artisan view:clear || true
  fi
  rm -rf "$work"
  exit "$code"
}
trap cleanup EXIT

git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
[[ -f app/admin/assets/css/pmd-shared-empty-states-r37.css ]] || { echo "Missing R37 CSS prerequisite"; exit 1; }
grep -q 'PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD' "$layout" || { echo "Missing R37 head prerequisite"; exit 1; }
grep -q 'data-pmd-floor-empty-r36' app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php || { echo "Missing R37 Floor markup"; exit 1; }

mkdir -p "$work/stage"
for file in "${patch_paths[@]}" "$layout"; do
  [[ -f "$file" ]] || { echo "Missing live file: $file"; exit 1; }
  mkdir -p "$work/stage/$(dirname "$file")"
  cp -p "$file" "$work/stage/$file"
done

git diff --binary "$BASE" "$REF" -- "${patch_paths[@]}" > "$work/r38.patch"
test -s "$work/r38.patch"
(
  cd "$work/stage"
  git apply --check "$work/r38.patch"
  git apply "$work/r38.patch"
)

for file in "${new_assets[@]}"; do
  mkdir -p "$work/stage/$(dirname "$file")"
  git show "$REF:$file" > "$work/stage/$file"
  test -s "$work/stage/$file"
done
mkdir -p "$work/stage/scripts"
git show "$REF:scripts/test-pmd-floor-r38.cjs" > "$work/stage/scripts/test-pmd-floor-r38.cjs"

# Do NOT overwrite the whole Admin shell, which includes locally deployed
# R33/R34/R35/R36/R37 scripts that are absent from some git branches.
python3 - "$work/stage/$layout" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1])
text=path.read_text()
anchor='<!-- /PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD -->'
if text.count(anchor)!=1 or 'PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD' in text:
    raise SystemExit('STOP: expected one R37 head anchor and no existing R38.')
if text.count('</head>')!=1:
    raise SystemExit('STOP: ambiguous live Admin head.')
addition="""<!-- PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD -->
@if(request()->is('admin/ownerdashboard*') || request()->is('admin/dashboardlab*')
    || request()->is('admin/managerdashboard*') || request()->is('admin/managerlab*'))
<link rel="stylesheet"
 href="{{ asset('app/admin/assets/css/pmd-owner-floor-stability-r38.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-owner-floor-stability-r38.css')) ?: 20261026) }}"
 data-pmd-floor-stability-r38="css">
<script defer src="{{ asset('app/admin/assets/js/pmd-floor-stability-audit-r38.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-floor-stability-audit-r38.js')) ?: 20261026) }}" data-pmd-floor-stability-r38="js"></script>
@endif
<!-- /PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD -->"""
path.write_text(text.replace(anchor,anchor+'\n'+addition,1))
PY

node --check "$work/stage/app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js"
node --check "$work/stage/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
node --check "$work/stage/app/admin/assets/js/pmd-floor-stability-audit-r38.js"
node "$work/stage/scripts/test-pmd-floor-r38.cjs" "$work/stage"

echo "PREFLIGHT PASS: R38 validated against CURRENT live VPS files."
mkdir -p "$backup"
for file in "${patch_paths[@]}" "$layout"; do
  mkdir -p "$backup/$(dirname "$file")"
  cp -p "$file" "$backup/$file"
done
for file in "${new_assets[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup/$(dirname "$file")"
    cp -p "$file" "$backup/$file"
  fi
done

installed=1
for file in "${patch_paths[@]}" "$layout" "${new_assets[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$work/stage/$file" "$file"
done
php artisan view:clear
installed=0

echo "SUCCESS: R38 Floor tabs, table first-paint and empty chart centering installed."
echo "Backup: $backup"
echo "Browser diagnostic: window.PMDFloorR38.audit()"
git status --short
