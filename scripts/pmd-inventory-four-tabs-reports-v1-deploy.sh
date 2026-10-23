#!/usr/bin/env bash
# PMD_INVENTORY_FOUR_TABS_REPORTS_V1_SAFE_DEPLOY
# Strictly scoped, fail-closed deployment; respects unrelated dirty VPS files.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-inventory-four-tabs-reports-v1-deploy.sh --apply" >&2
  exit 2
fi

cd /var/www/paymydine || exit 1
base=d633788ce17d428f4f35b05f252275981acf8f2a
rev="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"

modified=(
  app/admin/views/pmdinventory/index.blade.php
  app/admin/assets/js/pmd-inventory-workspace-r19.js
  app/admin/controllers/Pmdmenus.php
  app/admin/controllers/Pmdreports.php
  app/admin/views/pmdreports/index.blade.php
  routes/admin-app-before.php
)
added=(
  app/admin/assets/js/pmd-inventory-retained-controls-v1.js
  app/admin/assets/js/pmd-reports-inventory-v1.js
  app/admin/views/pmdreports/_inventory_details_v1.blade.php
  scripts/test-pmd-inventory-four-tabs-v1.js
)

if grep -Fq 'PMD_INVENTORY_FOUR_TABS_V1' app/admin/views/pmdinventory/index.blade.php; then
  echo "STOP: Inventory four-tab update already present; inspect the deployment before retrying." >&2
  exit 1
fi

# Verify GitHub PR cannot cause unrelated paths to be written by this deploy.
while IFS= read -r file; do
  case "$file" in
    app/admin/views/pmdinventory/index.blade.php|app/admin/assets/js/pmd-inventory-workspace-r19.js|app/admin/controllers/Pmdmenus.php|app/admin/controllers/Pmdreports.php|app/admin/views/pmdreports/index.blade.php|routes/admin-app-before.php|app/admin/assets/js/pmd-inventory-retained-controls-v1.js|app/admin/assets/js/pmd-reports-inventory-v1.js|app/admin/views/pmdreports/_inventory_details_v1.blade.php|scripts/test-pmd-inventory-four-tabs-v1.js|scripts/pmd-inventory-four-tabs-reports-v1-deploy.sh)
      ;;
    *)
      echo "STOP: Unexpected PR path: $file" >&2
      exit 1
      ;;
  esac
done < <(git diff --name-only "$base" "$rev")

for file in "${added[@]}"; do
  if [ -e "$file" ]; then
    echo "STOP: New destination already exists: $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/inventory-four-tabs-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$stage" "$backup/original"

# The stage generator merges three versions (GitHub base / current VPS /
# requested PR) and stops on an overlapping change BEFORE live writes.
PMD_BASE="$base" PMD_REV="$rev" PMD_STAGE="$stage" PMD_BACKUP="$backup" python3 - <<'PY'
import sys
import os
from pathlib import Path
import subprocess

base = os.environ['PMD_BASE']
rev = os.environ['PMD_REV']
stage = Path(os.environ['PMD_STAGE'])
backup = Path(os.environ['PMD_BACKUP'])
modified = [
    'app/admin/views/pmdinventory/index.blade.php',
    'app/admin/assets/js/pmd-inventory-workspace-r19.js',
    'app/admin/controllers/Pmdmenus.php',
    'app/admin/controllers/Pmdreports.php',
    'app/admin/views/pmdreports/index.blade.php',
    'routes/admin-app-before.php',
]
added = [
    'app/admin/assets/js/pmd-inventory-retained-controls-v1.js',
    'app/admin/assets/js/pmd-reports-inventory-v1.js',
    'app/admin/views/pmdreports/_inventory_details_v1.blade.php',
    'scripts/test-pmd-inventory-four-tabs-v1.js',
]

def source(revision, name):
    proc = subprocess.run(['git', 'show', revision + ':' + name],
                          capture_output=True, check=True)
    return proc.stdout.decode('utf-8')

def merge_text(name, live, old, new):
    # Use Git's three-way text merge instead of fragile exact-string anchors.
    # The operation takes place ONLY under the backup staging directory.
    work = stage / '_merge' / name
    work.mkdir(parents=True, exist_ok=True)
    current_file = work / 'current'
    ancestor_file = work / 'ancestor'
    incoming_file = work / 'incoming'
    current_file.write_text(live, encoding='utf-8')
    ancestor_file.write_text(old, encoding='utf-8')
    incoming_file.write_text(new, encoding='utf-8')
    result = subprocess.run(
        [
            'git', 'merge-file', '-p',
            '-L', 'VPS-local', '-L', 'GitHub-base', '-L', 'PR-544',
            str(current_file), str(ancestor_file), str(incoming_file),
        ],
        capture_output=True,
    )
    if result.returncode != 0:
        diagnostic = work / 'merge-preview.txt'
        diagnostic.write_bytes(result.stdout)
        print(
            'STOP: Overlapping or incompatible changes in ' + name +
            '. No live application file has been changed. Merge preview: ' +
            str(diagnostic),
            file=sys.stderr,
        )
        if result.stderr:
            print(result.stderr.decode('utf-8', errors='replace'), file=sys.stderr)
        raise SystemExit(1)
    return result.stdout.decode('utf-8')

for name in modified:
    live_file = Path(name)
    live = live_file.read_text('utf-8')
    updated = merge_text(name, live, source(base, name), source(rev, name))
    destination = stage / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(updated, encoding='utf-8')
    original = backup / 'original' / name
    original.parent.mkdir(parents=True, exist_ok=True)
    original.write_bytes(live_file.read_bytes())
    original.chmod(live_file.stat().st_mode & 0o777)

for name in added:
    destination = stage / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(source(rev, name), encoding='utf-8')
PY

for file in app/admin/controllers/Pmdmenus.php app/admin/controllers/Pmdreports.php routes/admin-app-before.php; do
  php -l "$stage/$file"
done
for file in app/admin/assets/js/pmd-inventory-workspace-r19.js app/admin/assets/js/pmd-inventory-retained-controls-v1.js app/admin/assets/js/pmd-reports-inventory-v1.js scripts/test-pmd-inventory-four-tabs-v1.js; do
  node --check "$stage/$file"
done

# Run the structural regression suite against staged files before touching VPS.
node "$stage/scripts/test-pmd-inventory-four-tabs-v1.js"
echo "PREFLIGHT PASS: all six file merges and ten staged files verified."

installed=0
rollback() {
  code=$?
  if [ "$code" -ne 0 ] && [ "$installed" -eq 1 ]; then
    echo "ERROR: Reverting inventory update from $backup" >&2
    for file in "${modified[@]}"; do
      cp -p "$backup/original/$file" "$file" || true
    done
    for file in "${added[@]}"; do
      rm -f "$file" || true
    done
    php artisan view:clear || true
  fi
}
trap rollback EXIT

installed=1
for file in "${modified[@]}"; do
  cp "$stage/$file" "$file"
done
for file in "${added[@]}"; do
  mkdir -p "$(dirname "$file")"
  install -m 644 "$stage/$file" "$file"
done

node scripts/test-pmd-inventory-four-tabs-v1.js
php artisan route:clear
php artisan view:clear
installed=0

echo "SUCCESS: Inventory now has Stock, Purchases, Waste and Shopping."
echo "Reports: /admin/reports/inventory"
echo "Backup: $backup"
git status --short -- "${modified[@]}" "${added[@]}"
