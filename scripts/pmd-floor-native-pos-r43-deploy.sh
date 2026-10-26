#!/usr/bin/env bash
# PMD R43: remove R42 duplicate table ghosts; animate native CSS translate
# on real Floor tables and bring Quick POS dark-green buttons to PMD jade.
# Safe target: dirty VPS with successful R42 patch. No checkout/pull/reset.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || {
  echo "Usage: bash pmd-floor-native-pos-r43-deploy.sh --apply"
  exit 2
}
cd /var/www/paymydine || exit 1

BASE=321e90581e8ee33d9bd11767b4de3acda0e92cb5
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/platform-r43-$stamp"
stage="$(mktemp -d)"
installed=0
changed=(
 app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js
 app/admin/assets/css/pmd-floor-note-range-r42.css
 app/admin/assets/js/pmd-floor-note-range-r42-audit.js
 app/admin/views/pmd_quick_pos_v1.blade.php
)
new_assets=(
 app/admin/assets/css/pmd-qpos-primary-brand-green-r43.css
)
readonly=(
 app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css
)
qa_file=scripts/test-pmd-floor-native-pos-r43.cjs

rollback() {
  local status=$?
  trap - EXIT
  if [[ "$status" -ne 0 && "$installed" == 1 ]]; then
    echo "R43 error: restoring only R43 touched files from $backup"
    for file in "${changed[@]}"; do
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
  exit "$status"
}
trap rollback EXIT

git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
for file in "${changed[@]}" "${readonly[@]}"; do
  [[ -f "$file" ]] || { echo "STOP: missing live prerequisite: $file"; exit 1; }
  mkdir -p "$stage/root/$(dirname "$file")"
  cp -p "$file" "$stage/root/$file"
done
grep -q 'PMD_FLOOR_VISUAL_FLIGHT_R42' app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js || {
  echo "STOP: R42 Floor engine not detected."; exit 1;
}
grep -q 'PMD_QPOS_QUICK_RESERVATIONS_R128' app/admin/views/pmd_quick_pos_v1.blade.php || {
  echo "STOP: expected canonical Quick POS layout not detected."; exit 1;
}
grep -q 'PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD' app/admin/views/_layouts/default.blade.php || {
  echo "STOP: R42 Admin asset wiring not detected."; exit 1;
}
if grep -q 'PMD_QPOS_PRIMARY_BRAND_GREEN_R43' app/admin/views/pmd_quick_pos_v1.blade.php; then
  echo "STOP: R43 already installed; refusing duplicate patch."; exit 1;
fi

git diff --binary "$BASE" "$REF" -- "${changed[@]}" > "$stage/r43.patch"
test -s "$stage/r43.patch"
(
  cd "$stage/root"
  git apply --check "$stage/r43.patch"
  git apply "$stage/r43.patch"
)
for file in "${new_assets[@]}"; do
  mkdir -p "$stage/root/$(dirname "$file")"
  git show "$REF:$file" > "$stage/root/$file"
  test -s "$stage/root/$file"
done

mkdir -p "$stage/root/scripts"
git show "$REF:$qa_file" > "$stage/root/$qa_file"
node --check "$stage/root/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
node --check "$stage/root/app/admin/assets/js/pmd-floor-note-range-r42-audit.js"
node --check "$stage/root/$qa_file"
node "$stage/root/$qa_file" "$stage/root"

# One definitive global Admin asset link already uses filemtime. The R43
# Quick POS link is added only to the standalone POS view. Do not inject
# into the general Admin layout or modify theme/DB/per-tenant settings.
echo "PREFLIGHT PASS: R43 fully staged against the CURRENT dirty VPS."

mkdir -p "$backup"
for file in "${changed[@]}"; do
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
for file in "${changed[@]}" "${new_assets[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$stage/root/$file" "$file"
done
# Browser cache busting for R42 linked CSS / audit and exact Floor script.
for file in "${changed[@]}" "${new_assets[@]}"; do
  touch "$file"
done
php artisan view:clear
installed=0

echo "SUCCESS: R43 real-table Floor movement and standard-green Quick POS actions installed."
echo "Backup: $backup"
echo "Owner/Manager browser check: window.PMDFloorR43.audit()"
echo "No data migration, checkout, reset or POS payment changes performed."
git status --short
