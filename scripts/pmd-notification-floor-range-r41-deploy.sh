#!/usr/bin/env bash
# PMD R41: Staff Note, Notification buttons, actual Range labels,
# rounded Floor map and final-geometry user-only Floor animation.
# Designed for the dirty R40 VPS. No checkout/pull/reset/merge/migrations.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || { echo "Usage: pmd-notification-floor-range-r41-deploy.sh --apply"; exit 2; }
cd /var/www/paymydine || exit 1

BASE=a86e6b1f99ab6633df95f90393641840c0c08872
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/platform-r41-$stamp"
stage="$(mktemp -d)"
installed=0

changed=(
  app/admin/widgets/menu/top_menu.blade.php
  app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php
  app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js
  app/admin/assets/js/fix-history-button-centering.js
)
new_assets=(
  app/admin/assets/css/pmd-notification-floor-range-r41.css
  app/admin/assets/js/pmd-notification-floor-range-r41.js
)
layout=app/admin/views/_layouts/default.blade.php
read_only=(
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
)
test_file=scripts/test-pmd-notification-floor-range-r41.cjs

restore_on_failure() {
  local code=$?
  trap - EXIT
  if [[ "$code" -ne 0 && "$installed" == 1 ]]; then
    echo "ERROR R41: restoring only previously changed live sources and Admin head."
    for file in "${changed[@]}" "$layout"; do
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
  rm -rf "$stage"
  exit "$code"
}
trap restore_on_failure EXIT

git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
for file in "${changed[@]}" "${read_only[@]}" "$layout"; do
  [[ -f "$file" ]] || { echo "STOP: live prerequisite missing: $file"; exit 1; }
  mkdir -p "$stage/root/$(dirname "$file")"
  cp -p "$file" "$stage/root/$file"
done
grep -q 'PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD' "$layout" || {
  echo "STOP: expected installed R39/R40 Admin head not found."; exit 1;
}
grep -q 'PMD_FLOOR_R38_ROW_RECONCILIATION' app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js || {
  echo "STOP: expected existing R38 no-refresh-blink Floor engine missing."; exit 1;
}
grep -q 'id="addGeneralStaffNoteModal"' app/admin/widgets/menu/top_menu.blade.php || {
  echo "STOP: original Staff Note modal missing."; exit 1;
}

git diff --binary "$BASE" "$REF" -- "${changed[@]}" > "$stage/r41.patch"
test -s "$stage/r41.patch"
(
  cd "$stage/root"
  git apply --check "$stage/r41.patch"
  git apply "$stage/r41.patch"
)
for file in "${new_assets[@]}"; do
  mkdir -p "$stage/root/$(dirname "$file")"
  git show "$REF:$file" > "$stage/root/$file"
  test -s "$stage/root/$file"
done

# Preserve every local R29-R40 <head> addition and installed patch verbatim.
python3 - "$stage/root/$layout" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
text=p.read_text()
anchor='<!-- /PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD -->'
if text.count(anchor)!=1 or 'PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD' in text:
    raise SystemExit('STOP: R39 anchor missing/ambiguous or R41 already installed.')
if text.count('</head>')!=1:
    raise SystemExit('STOP: actual Admin layout has ambiguous head.')
addition="""<!-- PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-notification-floor-range-r41.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-notification-floor-range-r41.css')) ?: 20261026) }}" data-pmd-ui-r41="css">
<script defer src="{{ asset('app/admin/assets/js/pmd-notification-floor-range-r41.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-notification-floor-range-r41.js')) ?: 20261026) }}" data-pmd-ui-r41="js"></script>
<!-- /PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD -->"""
p.write_text(text.replace(anchor,anchor+'\n'+addition,1))
PY

mkdir -p "$stage/root/scripts"
git show "$REF:$test_file" > "$stage/root/$test_file"

for file in \
  app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js \
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js \
  app/admin/assets/js/fix-history-button-centering.js \
  app/admin/assets/js/pmd-notification-floor-range-r41.js; do
  node --check "$stage/root/$file"
done
node --check "$stage/root/$test_file"
node "$stage/root/$test_file" "$stage/root"

echo "PREFLIGHT PASS: R41 staged against actual CURRENT dirty VPS files."
mkdir -p "$backup"
for file in "${changed[@]}" "$layout"; do
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
for file in "${changed[@]}" "$layout" "${new_assets[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$stage/root/$file" "$file"
done
for file in "${changed[@]}" "${new_assets[@]}"; do
  touch "$file"   # filemtime based asset links must bypass Safari cache
done
php artisan view:clear
installed=0

echo "SUCCESS: R41 Staff Note, notification actions, real Range labels, Floor corners and user-only smooth expansion installed."
echo "Backup: $backup"
echo "Safari audit: window.PMDNotificationFloorRangeR41.audit()"
echo "Refresh: Cmd + Shift + R"
git status --short
