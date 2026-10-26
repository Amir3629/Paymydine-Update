#!/usr/bin/env bash
# R35 safe in-place CSS/JS patch for live R34; no checkout, pull or DB writes.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-dashboard-floor-firstpaint-r35-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
base="d0fbd95c59a3e61a341108169445a49d598f5628"
css="app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css"
js="app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js"
testfile="scripts/test-pmd-dashboard-floor-firstpaint-r35.cjs"
layout="app/admin/views/_layouts/default.blade.php"
floor_template="app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
floor_core="app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
git cat-file -e "$base^{commit}" || { echo "STOP: R34 parent missing" >&2; exit 1; }
for f in "$css" "$js" "$layout" "$floor_template" "$floor_core"; do
  test -s "$f" || { echo "STOP: missing live file $f" >&2; exit 1; }
done
grep -Fq 'data-pmd-dashboard-switcher-firstpaint-r34="css"' "$layout" || {
  echo "STOP: R34 real Admin head not installed." >&2
  exit 1
}
grep -Fq "PMD_PLATFORM_UI_REPORT_R33_ASSET" "$layout" || {
  echo "STOP: R33 real Admin prerequisite missing." >&2
  exit 1
}
if grep -Fq "PMD_DASHBOARD_FLOOR_FLAT_TABLES_R35" "$css" &&
   grep -Fq "PMD_SHARED_FLOOR_BOOT_NO_REPAINT_R35" "$js"; then
  echo "ALREADY INSTALLED: R35 flat Floor cards and server DOM reuse."
  exit 0
fi
if grep -Fq "PMD_DASHBOARD_FLOOR_FLAT_TABLES_R35" "$css" ||
   grep -Fq "PMD_SHARED_FLOOR_BOOT_NO_REPAINT_R35" "$js"; then
  echo "STOP: partial R35 installation. Inspect before retry." >&2
  exit 1
fi
test ! -e "$testfile" || { echo "STOP: existing R35 test file" >&2; exit 1; }
command -v patch >/dev/null || { echo "STOP: patch command missing." >&2; exit 1; }
command -v node >/dev/null || { echo "STOP: node command missing." >&2; exit 1; }

backup="$HOME/pmd-backups/dashboard-floor-firstpaint-r35-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
for f in "$css" "$js" "$layout" "$floor_template" "$floor_core"; do
  mkdir -p "$backup/original/$(dirname "$f")" "$stage/$(dirname "$f")"
  cp -p "$f" "$stage/$f"
done
cp -p "$css" "$backup/original/$css"
cp -p "$js" "$backup/original/$js"
mkdir -p "$stage/$(dirname "$testfile")"
git diff --no-ext-diff "$base" "$revision" -- "$css" "$js" > "$backup/r35.patch"
test -s "$backup/r35.patch" || { echo "STOP: R35 patch empty." >&2; exit 1; }
git show "$revision:$testfile" > "$stage/$testfile"
test -s "$stage/$testfile"
patch -p1 --dry-run --fuzz=0 --batch -d "$stage" -i "$backup/r35.patch"
patch -p1 --fuzz=0 --batch -d "$stage" -i "$backup/r35.patch"
node --check "$stage/$js"
node --check "$stage/$testfile"
PMD_R35_TEST_ROOT="$stage" node "$stage/$testfile"
echo "PREFLIGHT PASS: live R34 CSS and Floor JS patched in a separate staging tree."

orig_css_sha="$(sha256sum "$css" | awk '{print $1}')"
orig_js_sha="$(sha256sum "$js" | awk '{print $1}')"
if [ "$(sha256sum "$css" | awk '{print $1}')" != "$orig_css_sha" ] ||
   [ "$(sha256sum "$js" | awk '{print $1}')" != "$orig_js_sha" ]; then
  echo "STOP: live assets changed during R35 staging." >&2
  exit 1
fi
applied=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "R35 failed after installation; restoring from $backup" >&2
    cp -p "$backup/original/$css" "$css" || true
    cp -p "$backup/original/$js" "$js" || true
    rm -f "$testfile"
    php artisan view:clear || true
  fi
}
trap rollback EXIT
applied=1
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$js" "$js"
install -m 644 "$stage/$testfile" "$testfile"
node --check "$js"
PMD_R35_TEST_ROOT="$PWD" node "$testfile"
php artisan view:clear
applied=0
echo "SUCCESS: R35 removed the table halos and prevented identical Floor DOM repaint."
echo "Backup: $backup"
echo "Owner: /admin/ownerdashboard"
echo "Manager: /admin/managerdashboard"
echo "Browser audit: window.PMDSharedFloorMultiFloorV1.audit()"
git status --short -- "$css" "$js" "$testfile"
