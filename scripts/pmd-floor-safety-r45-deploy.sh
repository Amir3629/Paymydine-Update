#!/usr/bin/env bash
# PMD_FLOOR_OPERATIONAL_SAFETY_R45
# Patch dirty R44 VPS in a staging directory with no live writes until
# PHP/JS syntax + mocked real safety service + source regressions pass.
# Never checkout/reset/pull, never replace unrelated POS/VPS customizations.
set -euo pipefail
mode="${1:-}"
[[ "$mode" == "--apply" || "$mode" == "--check" ]] || {
  echo "Usage: pmd-floor-safety-r45-deploy.sh --check|--apply"
  exit 2
}
cd /var/www/paymydine || exit 1

BASE=1111dbbea8a632dd2b07957600ed97dd7facbb5e
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/platform-r45-$stamp"
stage="$(mktemp -d)"
installed=0

changed=(
  app/admin/classes/PmdCleanWorkspaceControllerV1.php
  app/admin/Services/PmdSharedFloorRegistryV1.php
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js
  app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/views/_layouts/default.blade.php
)
created=(
  app/admin/Services/PmdFloorOperationalSafetyR45.php
  app/admin/assets/css/pmd-floor-operational-safety-r45.css
  app/admin/assets/js/pmd-floor-confirm-r45.js
)
prepare=scripts/pmd-floor-safety-r45-prepare.py
jsqa=scripts/test-pmd-floor-safety-r45.cjs
phpqa=scripts/test-pmd-floor-safety-r45.php

rollback() {
  local status=$?
  trap - EXIT
  if [[ "$installed" == 1 && "$status" != 0 ]]; then
    echo "R45 FAILED after starting live install: restoring EXACT pre-R45 files."
    for file in "${changed[@]}"; do
      if [[ -f "$backup/$file" ]]; then cp -p "$backup/$file" "$file"; fi
    done
    for file in "${created[@]}"; do
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

git cat-file -e "$BASE^{commit}" || { echo "STOP R45: R44 base not available."; exit 1; }
git cat-file -e "$REF^{commit}" || { echo "STOP R45: pinned PR must be fetched."; exit 1; }

for file in "${changed[@]}"; do
  [[ -f "$file" ]] || { echo "STOP R45: missing source $file"; exit 1; }
  for dir in root base ref; do mkdir -p "$stage/$dir/$(dirname "$file")"; done
  cp -p "$file" "$stage/root/$file"
  git show "$BASE:$file" > "$stage/base/$file"
  git show "$REF:$file" > "$stage/ref/$file"
done
for file in "${created[@]}"; do
  if [[ -e "$file" ]]; then
    echo "STOP R45: new asset already exists: $file. Do not overwrite."
    exit 1
  fi
  mkdir -p "$stage/ref/$(dirname "$file")"
  git show "$REF:$file" > "$stage/ref/$file"
done

mkdir -p "$stage/root/scripts"
git show "$REF:$prepare" > "$stage/prepare.py"
git show "$REF:$jsqa" > "$stage/root/$jsqa"
git show "$REF:$phpqa" > "$stage/root/$phpqa"

python3 -m py_compile "$stage/prepare.py"
python3 "$stage/prepare.py" --selftest unused "$stage/base" "$stage/ref"
python3 "$stage/prepare.py" --apply "$stage/root" "$stage/base" "$stage/ref"

for file in \
  app/admin/classes/PmdCleanWorkspaceControllerV1.php \
  app/admin/Services/PmdSharedFloorRegistryV1.php \
  app/admin/Services/PmdFloorOperationalSafetyR45.php \
  scripts/test-pmd-floor-safety-r45.php; do
  php -l "$stage/root/$file"
done
for file in \
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js \
  app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js \
  app/admin/assets/js/pmd-floor-confirm-r45.js \
  scripts/test-pmd-floor-safety-r45.cjs; do
  node --check "$stage/root/$file"
done
php "$stage/root/$phpqa" "$stage/root"
node "$stage/root/$jsqa" "$stage/root"
grep -q 'PMD_FLOOR_OPERATIONAL_SAFETY_R45_REAL_HEAD' "$stage/root/app/admin/views/_layouts/default.blade.php"
grep -q 'PMD_R45_DESTRUCTIVE_GUARD' "$stage/root/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_R45_FLOOR_LIFECYCLE_GUARD' "$stage/root/app/admin/Services/PmdSharedFloorRegistryV1.php"

echo "PREFLIGHT PASS R45B: PHP + JS + dirty-layout self-tests on current VPS succeeded."
if [[ "$mode" == "--check" ]]; then
  echo "DRY RUN R45B: No live application files were changed."
  exit 0
fi

mkdir -p "$backup"
for file in "${changed[@]}"; do
  mkdir -p "$backup/$(dirname "$file")"
  cp -p "$file" "$backup/$file"
done

installed=1
for file in "${changed[@]}" "${created[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$stage/root/$file" "$file"
  touch "$file"
done

php artisan view:clear
installed=0

echo "SUCCESS R45B: active/cleaning/reserved/open-bill tables protected from disable/remove."
echo "SUCCESS R45: Floor removal checks all assigned tables and uses a PMD confirmation card."
echo "SUCCESS R45: Edit Floor subtitle removed; no native browser confirmation."
echo "Backup: $backup"
echo "No data migrations, table deletions, direct VPS reset or full checkout performed."
echo "Safari: Cmd + Shift + R on Owner/Manager Dashboard and Reservations."
git status --short
