#!/usr/bin/env bash
# PMD R37: patch CURRENT VPS files. Never pull/reset/checkout/merge or modify business data.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || { echo "Usage: $0 --apply"; exit 2; }
cd /var/www/paymydine || exit 1
BASE=762f7182d8858b7954ff032dca1cc36dbbb78e20
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/dashboard-r37-$stamp"
work="$(mktemp -d)"
installed=0
paths=(
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/assets/js/pmd-dashboard-empty-r36.js
  app/admin/assets/css/pmd-dashboard-floor-empty-r36.css
  app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php
  app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js
  app/admin/views/_partials/pmd_online_staff_card_v1.blade.php
  app/admin/assets/js/pmd-online-staff-live-v1.js
  app/admin/views/_partials/pmd_reservations_lab_cards_v1.blade.php
  app/admin/views/_partials/pmd_reservations_cards_v1.blade.php
  app/admin/assets/js/pmd-reservations-live-sync-v1.js
  app/admin/views/pmdshifts/_server_rota_v13.blade.php
  app/admin/views/_partials/pmd_floor_map_v1.blade.php
)
assets=(
  app/admin/assets/css/pmd-shared-empty-states-r37.css
  app/admin/assets/js/pmd-shared-empty-states-r37.js
)
layout=app/admin/views/_layouts/default.blade.php
restore(){
  local status=$?
  trap - EXIT
  if [[ "$status" -ne 0 && "$installed" == 1 ]]; then
    echo "R37 failed; restoring backed-up live sources."
    for file in "${paths[@]}" "$layout"; do
      [[ ! -f "$backup/$file" ]] || cp -p "$backup/$file" "$file"
    done
    for file in "${assets[@]}"; do
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
trap restore EXIT
git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
[[ -f app/admin/assets/css/pmd-dashboard-floor-empty-r36.css ]] || { echo "Missing installed R36 CSS"; exit 1; }
grep -q 'PMD_DASHBOARD_FLOOR_EMPTY_R36' "$layout" || { echo "R36 Admin head prerequisite missing"; exit 1; }
mkdir -p "$work/stage"
for file in "${paths[@]}" "$layout"; do
  [[ -f "$file" ]] || { echo "Missing live file: $file"; exit 1; }
  mkdir -p "$work/stage/$(dirname "$file")"
  cp -p "$file" "$work/stage/$file"
done
git diff --binary "$BASE" "$REF" -- "${paths[@]}" > "$work/r37.patch"
test -s "$work/r37.patch"
(cd "$work/stage" && git apply --check "$work/r37.patch" && git apply "$work/r37.patch")
for file in "${assets[@]}"; do
  mkdir -p "$work/stage/$(dirname "$file")"
  git show "$REF:$file" > "$work/stage/$file"
  test -s "$work/stage/$file"
done
mkdir -p "$work/stage/scripts"
git show "$REF:scripts/test-pmd-dashboard-r37.cjs" > "$work/stage/scripts/test-pmd-dashboard-r37.cjs"
python3 - "$work/stage/$layout" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()
marker="<!-- /PMD_DASHBOARD_FLOOR_EMPTY_R36 -->"
if s.count(marker)!=1 or "PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD" in s:
    raise SystemExit("STOP: R36 marker missing/duplicated or R37 already installed.")
if s.count("</head>")!=1:
    raise SystemExit("STOP: Admin head ambiguous.")
insert="""<!-- PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD -->
@if(
    request()->is('admin/ownerdashboard*') || request()->is('admin/dashboardlab*')
    || request()->is('admin/managerdashboard*') || request()->is('admin/managerlab*')
    || request()->is('admin/accountantdashboard*') || request()->is('admin/accountantlab*')
    || request()->is('admin/reservations*') || request()->is('admin/floor*')
    || request()->is('admin/pmdshifts*') || request()->is('admin/shifts*')
)
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-shared-empty-states-r37.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-shared-empty-states-r37.css')) ?: 20261026) }}" data-pmd-shared-empty-states-r37="css">
<script defer src="{{ asset('app/admin/assets/js/pmd-shared-empty-states-r37.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-shared-empty-states-r37.js')) ?: 20261026) }}" data-pmd-shared-empty-states-r37="js"></script>
@endif
<!-- /PMD_SHARED_EMPTY_STATES_R37_REAL_ADMIN_HEAD -->"""
p.write_text(s.replace(marker,marker+"\n"+insert,1))
PY
for file in \
  app/admin/assets/js/pmd-dashboard-empty-r36.js \
  app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js \
  app/admin/assets/js/pmd-online-staff-live-v1.js \
  app/admin/assets/js/pmd-reservations-live-sync-v1.js \
  app/admin/assets/js/pmd-shared-empty-states-r37.js; do
  node --check "$work/stage/$file"
done
node "$work/stage/scripts/test-pmd-dashboard-r37.cjs" "$work/stage"
echo "PREFLIGHT PASS: R37 patched into CURRENT VPS files; JS syntax and empty-state regressions passed."
mkdir -p "$backup"
for file in "${paths[@]}" "$layout"; do
  mkdir -p "$backup/$(dirname "$file")"
  cp -p "$file" "$backup/$file"
done
for file in "${assets[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup/$(dirname "$file")"
    cp -p "$file" "$backup/$file"
  fi
done
installed=1
for file in "${paths[@]}" "$layout" "${assets[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$work/stage/$file" "$file"
done
php artisan view:clear
installed=0
echo "SUCCESS: R37 Floor tabs, Dashboard empty states, Reservations, Shifts and Staff installed."
echo "Backup: $backup"
echo "Check: window.PMDDashboardR37.audit()"
git status --short
