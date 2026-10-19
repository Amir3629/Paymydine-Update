#!/usr/bin/env bash
# PMD_PR508_SAFE_FILES_INSTALL_R1
# Only 4 modified + 3 new files stacked on already-applied PR507.
# No checkout, merge, reset, database writes, migrations or service restart.
set -Eeuo pipefail
cd /var/www/paymydine

BASE_REF="origin/pmd-pr507"
PATCH_REF="origin/pmd-pr508"
git cat-file -e "${BASE_REF}^{commit}" || { echo "ERROR: fetch PR507 first"; exit 1; }
git cat-file -e "${PATCH_REF}^{commit}" || { echo "ERROR: fetch PR508 first"; exit 1; }

existing=(
  app/admin/assets/css/pmd-manager-online-staff-v1.css
  app/admin/controllers/Pmdmenus.php
  app/admin/views/pmdmenus/index.blade.php
  scripts/pmd-online-staff-tenant-schema-r1.php
)
added=(
  app/admin/assets/css/pmd-menu-header-tools-r1.css
  app/admin/assets/js/pmd-menu-header-tools-r1.js
  scripts/test-pmd-menu-header-tools-r1.js
)
all=("${existing[@]}" "${added[@]}")

echo "=== VERIFY CURRENT FILES MATCH PR507 ==="
for path in "${existing[@]}"; do
  test -f "$path" || { echo "STOP: missing $path"; exit 2; }
  test -w "$path" || { echo "STOP: not writable $path"; exit 2; }
  expected="$(git show "${BASE_REF}:${path}" | sha256sum | cut -d ' ' -f 1)"
  observed="$(sha256sum "$path" | cut -d ' ' -f 1)"
  if [[ "$expected" != "$observed" ]]; then
    echo "STOP: local file differs from PR507 baseline: $path"
    echo "No files changed. Preserve and inspect local edits."
    exit 2
  fi
done

for path in "${added[@]}"; do
  if [[ -e "$path" ]] || [[ ! -w "$(dirname "$path")" ]]; then
    echo "STOP: cannot safely create $path"
    exit 2
  fi
done

STAMP="$(date -u +%Y%m%d%H%M%S)"
BACKUP="$HOME/pmd-pr508-backup-$STAMP"
test ! -e "$BACKUP" || { echo "STOP: backup folder exists"; exit 2; }
mkdir -p "$BACKUP/old" "$BACKUP/new"

echo "=== STAGE EXACT PR508 FILES ==="
for path in "${all[@]}"; do
  mkdir -p "$BACKUP/new/$(dirname "$path")"
  git show "${PATCH_REF}:${path}" > "$BACKUP/new/$path"
done

for path in "${existing[@]}"; do
  mkdir -p "$BACKUP/old/$(dirname "$path")"
  cp -p "$path" "$BACKUP/old/$path"
done

echo "=== PRE-INSTALL SYNTAX CHECK ==="
php -l "$BACKUP/new/app/admin/controllers/Pmdmenus.php"
php -l "$BACKUP/new/scripts/pmd-online-staff-tenant-schema-r1.php"
node --check "$BACKUP/new/app/admin/assets/js/pmd-menu-header-tools-r1.js"
node --check "$BACKUP/new/scripts/test-pmd-menu-header-tools-r1.js"

APPLYING=0
on_exit() {
  result=$?
  if [[ "$result" -ne 0 && "$APPLYING" == "1" ]]; then
    echo "=== ROLLBACK FILES: install/test failed ==="
    for path in "${existing[@]}"; do
      cp -p "$BACKUP/old/$path" "$path"
    done
    for path in "${added[@]}"; do
      rm -f "$path"
    done
    php artisan view:clear || true
  fi
  if [[ "$result" -ne 0 ]]; then
    echo "Install failed (exit $result). Backup: $BACKUP"
  fi
}
trap on_exit EXIT

echo "=== APPLY 7 ISOLATED FILES ==="
APPLYING=1
for path in "${all[@]}"; do
  cp "$BACKUP/new/$path" "$path"
done

echo "=== STATIC REGRESSION TEST ==="
node scripts/test-pmd-menu-header-tools-r1.js

echo "=== CLEAR COMPILED VIEWS ==="
php artisan view:clear

APPLYING=0
echo "SUCCESS: PR508 FILES INSTALLED"
echo "BACKUP: $BACKUP"
echo "NOTE: Presence schema unchanged until explicit --apply."
