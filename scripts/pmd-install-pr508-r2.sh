#!/usr/bin/env bash
# PMD_PR508_PRESERVE_LOCAL_INSTALL_R2
# Merge the small PR508 follow-up onto production's local modifications.
# No git checkout/reset, and no schema writes (separate explicit step).
set -Eeuo pipefail
cd /var/www/paymydine

BASE_REF="origin/pmd-pr507"
PATCH_REF="origin/pmd-pr508"
for ref in "$BASE_REF" "$PATCH_REF"; do
  git cat-file -e "$ref^{commit}" || {
    echo "STOP: Missing $ref. Fetch both PRs first."
    exit 2
  }
done
command -v php >/dev/null
command -v node >/dev/null
command -v python3 >/dev/null

existing=(
  app/admin/assets/css/pmd-manager-online-staff-v1.css
  app/admin/controllers/Dashboardlab.php
  app/admin/controllers/Managerlab.php
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

STAMP="$(date -u +%Y%m%d%H%M%S)"
BACKUP="$HOME/pmd-pr508-preserved-$STAMP"
test ! -e "$BACKUP" || {
  echo "STOP: backup path already exists"
  exit 2
}
mkdir -p "$BACKUP/baseline" "$BACKUP/incoming" "$BACKUP/old" "$BACKUP/staged"

echo "=== STAGE PR507 BASELINE + PR508 SOURCE ==="
for path in "${all[@]}"; do
  mkdir -p "$BACKUP/incoming/$(dirname "$path")" \
    "$BACKUP/staged/$(dirname "$path")"
  git show "$PATCH_REF:$path" > "$BACKUP/incoming/$path"
done
for path in "${existing[@]}"; do
  test -f "$path" && test -w "$path" || {
    echo "STOP: existing target missing/unwritable: $path"
    exit 2
  }
  mkdir -p "$BACKUP/baseline/$(dirname "$path")" \
    "$BACKUP/old/$(dirname "$path")"
  git show "$BASE_REF:$path" > "$BACKUP/baseline/$path"
  cp -p "$path" "$BACKUP/old/$path"
done
for path in "${added[@]}"; do
  test ! -e "$path" && test -w "$(dirname "$path")" || {
    echo "STOP: new file already exists or directory unwritable: $path"
    exit 2
  }
  cp "$BACKUP/incoming/$path" "$BACKUP/staged/$path"
done

echo "=== PRESERVE VPS MODIFICATIONS ==="
# Merge unrelated local changes, and fail BEFORE installation on conflicts.
# These paths do not own Menu header HTML and can be three-way merged safely.
merged=(
  app/admin/assets/css/pmd-manager-online-staff-v1.css
  app/admin/controllers/Dashboardlab.php
  app/admin/controllers/Managerlab.php
  scripts/pmd-online-staff-tenant-schema-r1.php
)
for path in "${merged[@]}"; do
  if cmp -s "$path" "$BACKUP/baseline/$path"; then
    cp "$BACKUP/incoming/$path" "$BACKUP/staged/$path"
    echo "PR507 baseline: $path"
  else
    echo "Three-way merging local changes: $path"
    if ! git merge-file -p \
      -L "VPS local" -L "PR507 baseline" -L "PR508 update" \
      "$path" "$BACKUP/baseline/$path" "$BACKUP/incoming/$path" \
      > "$BACKUP/staged/$path"; then
      echo "STOP: three-way conflict in $path. No live files changed."
      echo "Backups and conflict output in $BACKUP"
      exit 3
    fi
  fi
done

# Two potentially locally customized Menu files: INSERT the precise new
# block at one unique anchor without replacing any of the original content.
# Source block comes exclusively from fetched PR508.
python3 - \
  "app/admin/controllers/Pmdmenus.php" \
  "app/admin/views/pmdmenus/index.blade.php" \
  "$BACKUP" <<'PY'
from pathlib import Path
import sys

controller, view, backup = sys.argv[1:]
folder = Path(backup)

specs = [
    (controller,
     '        // PMD_MENU_COMPACT_HEADER_ASSETS_R1',
     "        AdminMenu::setContext('menus', 'restaurant');"),
    (view,
     '        {{-- PMD_MENU_COMPACT_TOOLS_R1',
     '        {{-- PMD_MENU_SORT_HEADER_ACTION_V160 --}}'),
]
for name, marker, anchor in specs:
    incoming = (folder / 'incoming' / name).read_text()
    original = Path(name).read_text()
    if incoming.count(marker) != 1 or incoming.count(anchor) != 1:
        raise SystemExit(f'STOP: PR508 source anchor invalid in {name}')
    pos = incoming.index(marker)
    end = incoming.index(anchor, pos)
    block = incoming[pos:end]
    if not block.strip():
        raise SystemExit(f'STOP: empty PR508 injection in {name}')
    if marker in original:
        if block not in original:
            raise SystemExit(f'STOP: locally modified PR508 block in {name}')
        patched = original
    else:
        if original.count(anchor) != 1:
            raise SystemExit(f'STOP: local header anchor missing/ambiguous in {name}')
        patched = original.replace(anchor, block + anchor, 1)
    (folder / 'staged' / name).write_text(patched)
    print('Preserved local content + added Menu block:', name)
PY

echo "=== PRE-INSTALL SYNTAX ==="
for path in \
  app/admin/controllers/Dashboardlab.php \
  app/admin/controllers/Managerlab.php \
  app/admin/controllers/Pmdmenus.php \
  scripts/pmd-online-staff-tenant-schema-r1.php
do
  php -l "$BACKUP/staged/$path"
done
node --check "$BACKUP/staged/app/admin/assets/js/pmd-menu-header-tools-r1.js"
node --check "$BACKUP/staged/scripts/test-pmd-menu-header-tools-r1.js"

INSTALLING=0
restore_if_failed() {
  result=$?
  if [[ "$result" -ne 0 && "$INSTALLING" -eq 1 ]]; then
    echo "=== ROLLBACK TO EXACT PRE-INSTALL VPS FILES ==="
    for path in "${existing[@]}"; do
      cp -p "$BACKUP/old/$path" "$path" || true
    done
    for path in "${added[@]}"; do
      rm -f "$path" || true
    done
    php artisan view:clear || true
  fi
  if [[ "$result" -ne 0 ]]; then
    echo "FAILED. Source backups/staging: $BACKUP"
  fi
}
trap restore_if_failed EXIT

echo "=== INSTALL PRESERVING LOCAL CHANGES ==="
INSTALLING=1
for path in "${all[@]}"; do
  cp "$BACKUP/staged/$path" "$path"
done

echo "=== REGRESSION TESTS ==="
node scripts/test-pmd-menu-header-tools-r1.js
php scripts/test-pmd-online-staff-card-v1.php
php artisan view:clear

INSTALLING=0
echo "SUCCESS: PR508 LOCAL-PRESERVING INSTALL"
echo "BACKUP: $BACKUP"
echo "NOTICE: This installer does NOT create the Tomo presence table."
