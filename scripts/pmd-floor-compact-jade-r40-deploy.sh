#!/usr/bin/env bash
# PMD Floor R40: narrower controls + jade selected tab.
# Patch only two existing assets on the current (dirty) VPS R39 installation.
# No checkout/pull/reset/merge, no Blade/backend/DB modifications.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || { echo "Usage: bash pmd-floor-compact-jade-r40-deploy.sh --apply"; exit 2; }
cd /var/www/paymydine || exit 1

BASE=3fb73cfc49e7ba97cb8ae8cf5de3208445d54a1a
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/dashboard-r40-$stamp"
stage="$(mktemp -d)"
installed=0

targets=(
 app/admin/assets/css/pmd-floor-manage-size-parity-r39.css
 app/admin/assets/js/pmd-floor-manage-audit-r39.js
)
checks=(
 app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css
 app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
 app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js
 app/admin/views/_layouts/default.blade.php
)

rollback() {
  local status=$?
  trap - EXIT
  if [[ "$status" -ne 0 && "$installed" == 1 ]]; then
    echo "R40 error: restoring the original R39 assets."
    for file in "${targets[@]}"; do
      [[ ! -f "$backup/$file" ]] || cp -p "$backup/$file" "$file"
    done
  fi
  rm -rf "$stage"
  exit "$status"
}
trap rollback EXIT

git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
for file in "${targets[@]}" "${checks[@]}"; do
  [[ -f "$file" ]] || { echo "STOP: prerequisite missing: $file"; exit 1; }
done
grep -q 'PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD' app/admin/views/_layouts/default.blade.php || {
 echo "STOP: live R39 Admin asset links are missing."; exit 1;
}
grep -q 'data-pmd-floor-manage-always-visible-r39="1"' app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php || {
 echo "STOP: the R39 Edit floor markup is missing."; exit 1;
}

mkdir -p "$stage/root"
for file in "${targets[@]}" "${checks[@]}"; do
  mkdir -p "$stage/root/$(dirname "$file")"
  cp -p "$file" "$stage/root/$file"
done

git diff --binary "$BASE" "$REF" -- "${targets[@]}" > "$stage/r40.patch"
test -s "$stage/r40.patch"
(
  cd "$stage/root"
  git apply --check "$stage/r40.patch"
  git apply "$stage/r40.patch"
)

mkdir -p "$stage/root/scripts"
git show "$REF:scripts/test-pmd-floor-compact-r40.cjs" > "$stage/root/scripts/test-pmd-floor-compact-r40.cjs"
node --check "$stage/root/app/admin/assets/js/pmd-floor-manage-audit-r39.js"
node --check "$stage/root/scripts/test-pmd-floor-compact-r40.cjs"
node "$stage/root/scripts/test-pmd-floor-compact-r40.cjs" "$stage/root"

echo "PREFLIGHT PASS: R40 applied to a staging copy of CURRENT VPS files."
mkdir -p "$backup"
for file in "${targets[@]}"; do
  mkdir -p "$backup/$(dirname "$file")"
  cp -p "$file" "$backup/$file"
done

installed=1
for file in "${targets[@]}"; do
  cp -p "$stage/root/$file" "$file"
  # Layout's dynamic filemtime() uses this timestamp for browser cache busting.
  touch "$file"
done
installed=0

echo "SUCCESS: R40 compact Floor buttons and selected brand-green tab are installed."
echo "Backup: $backup"
echo "Safari audit: window.PMDFloorR40.audit()"
echo "Refresh with Cmd + Shift + R."
git status --short
