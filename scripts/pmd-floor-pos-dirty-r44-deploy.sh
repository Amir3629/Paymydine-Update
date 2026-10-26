#!/usr/bin/env bash
# PMD_R44_DIRTY_VPS_DEPLOY
# Safely installs native Floor motion + correct Quick POS jade on dirty R42 VPS.
# Unlike R43, NEVER git apply the whole custom POS Blade view.
set -euo pipefail

[[ "${1:-}" == "--apply" ]] || {
  echo "Usage: pmd-floor-pos-dirty-r44-deploy.sh --apply"
  exit 2
}
cd /var/www/paymydine || exit 1
BASE=321e90581e8ee33d9bd11767b4de3acda0e92cb5
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/platform-r44-$stamp"
stage="$(mktemp -d)"
installed=0
files=(
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js
  app/admin/assets/css/pmd-floor-note-range-r42.css
  app/admin/assets/js/pmd-floor-note-range-r42-audit.js
  app/admin/views/pmd_quick_pos_v1.blade.php
)
new_file=app/admin/assets/css/pmd-qpos-primary-brand-green-r43.css
canonical=app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css
prepare=scripts/pmd-floor-pos-dirty-r44-prepare.py
qa=scripts/test-pmd-floor-native-pos-r43.cjs

restore_on_error() {
  code=$?
  trap - EXIT
  if [[ "$code" -ne 0 && "$installed" == 1 ]]; then
    echo "R44: installation error; restoring ONLY backed-up R44 paths."
    for f in "${files[@]}"; do
      if [[ -f "$backup/$f" ]]; then cp -p "$backup/$f" "$f"; fi
    done
    if [[ -f "$backup/$new_file" ]]; then
      cp -p "$backup/$new_file" "$new_file"
    else
      rm -f "$new_file"
    fi
    php artisan view:clear || true
  fi
  rm -rf "$stage"
  exit "$code"
}
trap restore_on_error EXIT

git cat-file -e "$BASE^{commit}" || {
  echo "STOP: R42 commit not available in local Git object database."
  exit 1
}
git cat-file -e "$REF^{commit}" || {
  echo "STOP: fetch pinned PR #568 before installing."
  exit 1
}

for f in "${files[@]}"; do
  [[ -f "$f" ]] || { echo "STOP: current VPS file missing: $f"; exit 1; }
  mkdir -p "$stage/root/$(dirname "$f")"
  mkdir -p "$stage/base/$(dirname "$f")"
  mkdir -p "$stage/ref/$(dirname "$f")"
  cp -p "$f" "$stage/root/$f"
  git show "$BASE:$f" > "$stage/base/$f"
  git show "$REF:$f" > "$stage/ref/$f"
done

[[ -f "$canonical" ]] || { echo "STOP: canonical R34 button CSS not found."; exit 1; }
mkdir -p "$stage/root/$(dirname "$canonical")"
cp -p "$canonical" "$stage/root/$canonical"

mkdir -p "$stage/ref/$(dirname "$new_file")"
git show "$REF:$new_file" > "$stage/ref/$new_file"
mkdir -p "$stage/root/scripts"
git show "$REF:$qa" > "$stage/root/$qa"
git show "$REF:$prepare" > "$stage/prepare.py"

# First prove with a simulated dirty Quick POS file that unrelated
# custom markup survives, even when the original POS line 84 differs.
python3 -m py_compile "$stage/prepare.py"
python3 "$stage/prepare.py" --selftest unused "$stage/base" "$stage/ref"
# Then prepare the ACTUAL dirty VPS file copies using exact bounded
# replacements of only the R42 floor animation and ghost CSS regions.
python3 "$stage/prepare.py" --apply "$stage/root" "$stage/base" "$stage/ref"

node --check "$stage/root/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
node --check "$stage/root/app/admin/assets/js/pmd-floor-note-range-r42-audit.js"
node --check "$stage/root/$qa"
node "$stage/root/$qa" "$stage/root"
grep -q 'PMD_R44_DISABLE_STALE_GHOST' "$stage/root/app/admin/assets/css/pmd-floor-note-range-r42.css"
grep -q 'LOCAL_VPS_POS_CUSTOMIZATION' "$stage/root/app/admin/views/pmd_quick_pos_v1.blade.php" && {
  echo "STOP: selftest fixture marker leaked into actual POS file."; exit 1;
}
echo "PREFLIGHT PASS R44: all staging tests passed; real VPS files untouched so far."

mkdir -p "$backup"
for f in "${files[@]}"; do
  mkdir -p "$backup/$(dirname "$f")"
  cp -p "$f" "$backup/$f"
done
if [[ -f "$new_file" ]]; then
  mkdir -p "$backup/$(dirname "$new_file")"
  cp -p "$new_file" "$backup/$new_file"
fi

installed=1
for f in "${files[@]}" "$new_file"; do
  mkdir -p "$(dirname "$f")"
  cp -p "$stage/root/$f" "$f"
  touch "$f"
done
php artisan view:clear
installed=0

echo "SUCCESS R44: surgical Floor fix and Quick POS jade installed."
echo "VPS local POS Blade customizations: PRESERVED"
echo "Backup: $backup"
echo "Audit: window.PMDFloorR43.audit() (ghost count should be zero)"
echo "Safari: Cmd + Shift + R"
git status --short
