#!/usr/bin/env bash
# PMD R36. Applies only scoped dashboard improvements to the LIVE dirty VPS tree.
# Fail closed on any prior-version drift; never checkout/pull/reset or change data.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || { echo "Usage: script --apply"; exit 2; }
cd /var/www/paymydine || exit 1
BASE=f7fc179221e4258fce22f634f792ea8c50e6275d
REF=FETCH_HEAD
paths=(
 app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
 app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php
 app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js
)
new_assets=(
 app/admin/assets/css/pmd-dashboard-floor-empty-r36.css
 app/admin/assets/js/pmd-dashboard-empty-r36.js
)
layout=app/admin/views/_layouts/default.blade.php
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/dashboard-r36-$stamp"
work="$(mktemp -d)"
installed=0
cleanup(){
  local status=$?
  if [[ "$status" -ne 0 && "$installed" == 1 ]]; then
    echo "ERROR: restoring R36 backup..."
    for file in "${paths[@]}" "$layout"; do
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
  exit "$status"
}
trap cleanup EXIT
git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
mkdir -p "$work/stage"
for file in "${paths[@]}" "$layout"; do
  mkdir -p "$work/stage/$(dirname "$file")"
  cp -p "$file" "$work/stage/$file"
done
git diff --binary "$BASE" "$REF" -- "${paths[@]}" > "$work/update.patch"
test -s "$work/update.patch"
(cd "$work/stage" && git apply --check "$work/update.patch" && git apply "$work/update.patch")
for file in "${new_assets[@]}"; do
  mkdir -p "$work/stage/$(dirname "$file")"
  git show "$REF:$file" > "$work/stage/$file"
  test -s "$work/stage/$file"
done
# Existing installed R33/R34/R35 layout additions are preserved byte for byte.
python3 - "$work/stage/$layout" <<'PY'
import sys
from pathlib import Path
p=Path(sys.argv[1])
s=p.read_text()
if "PMD_DASHBOARD_FLOOR_EMPTY_R36" in s:
    raise SystemExit("STOP: R36 already installed; refusing duplicate CSS/JS.")
if s.count("</head>") != 1 or "PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT" not in s:
    raise SystemExit("STOP: actual Admin head missing/ambiguous.")
new="""<!-- PMD_DASHBOARD_FLOOR_EMPTY_R36 -->
@if(request()->is('admin/ownerdashboard*') || request()->is('admin/managerdashboard*') || request()->is('admin/accountantdashboard*') || request()->is('admin/dashboardlab*') || request()->is('admin/managerlab*') || request()->is('admin/accountantlab*'))
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-floor-empty-r36.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-dashboard-floor-empty-r36.css')) ?: 20261026) }}" data-pmd-dashboard-r36="css">
<script defer src="{{ asset('app/admin/assets/js/pmd-dashboard-empty-r36.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-dashboard-empty-r36.js')) ?: 20261026) }}" data-pmd-dashboard-r36="js"></script>
@endif
<!-- /PMD_DASHBOARD_FLOOR_EMPTY_R36 -->
"""
p.write_text(s.replace("</head>",new+"\n</head>",1))
PY
node --check "$work/stage/app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js"
node --check "$work/stage/app/admin/assets/js/pmd-dashboard-empty-r36.js"
grep -q 'data-pmd-floor-empty-add-r36' "$work/stage/app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
grep -q 'No sales recorded in this period' "$work/stage/app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php"
grep -q 'PMD_DASHBOARD_FLOOR_EMPTY_R36' "$work/stage/$layout"
grep -q 'min-height:52px!important' "$work/stage/app/admin/assets/css/pmd-dashboard-floor-empty-r36.css"
echo "PREFLIGHT PASS: R36 staged against current VPS files, JS syntax and admin-head wiring."
mkdir -p "$backup"
for file in "${paths[@]}" "$layout"; do
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
for file in "${paths[@]}" "$layout" "${new_assets[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$work/stage/$file" "$file"
done
php artisan view:clear
installed=0
echo "SUCCESS: R36 floor switchers and empty Dashboard states installed."
echo "Backup: $backup"
echo "Owner: /admin/ownerdashboard"
echo "Manager: /admin/managerdashboard"
echo "Check: link[data-pmd-dashboard-r36=css] and window.PMDDashboardR36"
git status --short
