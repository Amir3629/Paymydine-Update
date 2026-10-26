#!/usr/bin/env bash
# PMD_R16_GUEST_TABLE_AND_FLOOR_VISIBILITY_INCREMENTAL_INSTALLER
# Base: user's successfully installed R15 plus R45B floor safety.
# No reset, checkout, blanket pull, migrations or destructive actions.
set -Eeuo pipefail
cd /var/www/paymydine
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || {
  echo 'Usage: bash pmd-install-table-entry-floor-note-r16.sh --check|--apply'
  exit 2
}
BASE=9f45223b0002746714a228f90e67831e03796524
BRANCH=codex/disabled-table-entry-create-floor-note-r16-20261026
FILES=(
  app/admin/widgets/menu/top_menu.blade.php
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/main/routes/api-v1-table-info.php
  app/Http/Controllers/Api/TableController.php
  frontend/features/customer-menu/hooks/useMenuLoader.ts
  frontend/features/customer-menu/CustomerMenuPage.tsx
  frontend/lib/api-client.ts
  scripts/test-pmd-table-entry-floor-note-r16.cjs
)
echo '== FETCH R16 =='
git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}" || { echo 'STOP: R15 base commit missing'; exit 3; }

# Fail before writing anything if R45B has not been installed: we will not
# inadvertently mask missing critical table/floor destructive-action safety.
grep -q 'PMD_R45_DESTRUCTIVE_GUARD' app/admin/classes/PmdCleanWorkspaceControllerV1.php || {
  echo 'STOP: R45B destructive-action guard missing from live VPS.'
  exit 3
}
grep -q 'PMD_R45_FLOOR_LIFECYCLE_GUARD' app/admin/Services/PmdSharedFloorRegistryV1.php || {
  echo 'STOP: R45B Floor lifecycle safety is not installed.'
  exit 3
}

STAGE="$(mktemp -d -t pmd-r16-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-table-entry-r16-backup-$(date +%Y%m%d_%H%M%S)-$$"
installed=0
complete=0
cleanup() {
  status=$?
  trap - EXIT
  if [[ "$installed" == 1 && "$complete" == 0 ]]; then
    echo 'R16 encountered an installation error. Restoring exact old files.'
    while IFS="$(printf '\t')" read -r kind file; do
      if [[ "$kind" == E ]]; then cp -p "$BACKUP/originals/$file" "$file"
      elif [[ "$kind" == N ]]; then rm -f -- "$file"
      fi
    done < "$BACKUP/files"
    php artisan view:clear || true
  fi
  rm -rf "$STAGE"
  exit "$status"
}
trap cleanup EXIT
mkdir -p "$STAGE" "$BACKUP/originals"
: > "$BACKUP/files"
CHANGED=()

# Fetch the narrow adapter from the exact same commit as R16 source.
# The live VPS Floor markup differs from R15 because R45B already updated
# Edit floor and operational safety; never overwrite that with old Floor HTML.
mkdir -p "$STAGE/tmp"
git show "${HEAD_SHA}:scripts/pmd-r16-floor-live-adapter.py" > "$STAGE/tmp/floor-adapter.py"
python3 -c 'import ast,sys;ast.parse(open(sys.argv[1]).read())' "$STAGE/tmp/floor-adapter.py"

echo '== PREFLIGHT: 3-way merge vs installed R15, retain local R45B modifications =='
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")" "$STAGE/tmp"
  git show "${HEAD_SHA}:$file" > "$STAGE/tmp/target"
  if [[ -L "$file" ]]; then echo "STOP unsafe symlink: $file"; exit 4; fi
  if git cat-file -e "${BASE}:$file" 2>/dev/null; then
    [[ -f "$file" ]] || { echo "STOP R15 source missing: $file"; exit 4; }
    git show "${BASE}:$file" > "$STAGE/tmp/base"
    if [[ "$file" == "app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php" ]]; then
      # R45B has its own R39 Edit Floor and R45 destructive-action UI.
      # Insert only the authorized Add Floor visibility into CURRENT VPS
      # markup, with exact unique-anchor checks and no adjacent changes.
      python3 "$STAGE/tmp/floor-adapter.py" "$file" "$STAGE/$file"
      if grep -q 'data-pmd-floor-manage-always-visible-r39' "$file"; then
        grep -q 'data-pmd-floor-manage-always-visible-r39' "$STAGE/$file" || {
          echo 'STOP: R39 Edit floor would be lost.'; exit 4;
        }
      fi
      # The adapter must be idempotent and must not add duplicate controls.
      python3 "$STAGE/tmp/floor-adapter.py" "$STAGE/$file" "$STAGE/tmp/floor-verify"
      cmp -s "$STAGE/$file" "$STAGE/tmp/floor-verify" || {
        echo 'STOP: adapted Floor is not idempotent.'; exit 4;
      }
      if cmp -s "$file" "$STAGE/$file"; then
        echo "ALREADY CURRENT: $file"
        continue
      fi
    elif cmp -s "$file" "$STAGE/tmp/target"; then
      cp -p "$file" "$STAGE/$file"
      echo "ALREADY CURRENT: $file"
      continue
    elif cmp -s "$file" "$STAGE/tmp/base"; then
      cp -p "$STAGE/tmp/target" "$STAGE/$file"
    elif ! git merge-file -p "$file" "$STAGE/tmp/base" "$STAGE/tmp/target" > "$STAGE/$file"; then
      echo "STOP: conflicting VPS customization (no files changed): $file"
      exit 4
    fi
    printf 'E\t%s\n' "$file" >> "$BACKUP/files"
  else
    if [[ -e "$file" ]]; then
      if cmp -s "$file" "$STAGE/tmp/target"; then
        cp -p "$file" "$STAGE/$file"
        echo "ALREADY CURRENT: $file"
        continue
      fi
      echo "STOP new R16 path already exists with different content: $file"
      exit 4
    fi
    cp -p "$STAGE/tmp/target" "$STAGE/$file"
    printf 'N\t%s\n' "$file" >> "$BACKUP/files"
  fi
  CHANGED+=("$file")
done

# Existing Floor renderer is an unchanged dependency of the regression test.
mkdir -p "$STAGE/app/admin/assets/js"
cp -p app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js "$STAGE/app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js"

echo '== PREFLIGHT: syntax, runtime invariants and R45B permissions =='
php -l "$STAGE/app/main/routes/api-v1-table-info.php"
php -l "$STAGE/app/Http/Controllers/Api/TableController.php"
php -l "$STAGE/app/admin/widgets/menu/top_menu.blade.php"
php -l "$STAGE/app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
node --check "$STAGE/scripts/test-pmd-table-entry-floor-note-r16.cjs"
node "$STAGE/scripts/test-pmd-table-entry-floor-note-r16.cjs"
if [[ "$MODE" == "--check" ]]; then
  echo 'PREFLIGHT PASS R16: staged files passed checks; live VPS was not modified.'
  echo 'R16 includes Next.js source changes. A controlled frontend build/reload will be needed after --apply.'
  exit 0
fi

if [[ "${#CHANGED[@]}" == 0 ]]; then
  echo 'ALREADY INSTALLED: R16 source paths are current.'
  exit 0
fi

printf '%s\n' "$PWD" > "$BACKUP/root"
while IFS="$(printf '\t')" read -r kind file; do
  if [[ "$kind" == E ]]; then
    mkdir -p "$BACKUP/originals/$(dirname "$file")"
    cp -p "$file" "$BACKUP/originals/$file"
  fi
done < "$BACKUP/files"
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cat "$B/root")"
while IFS="$(printf '\t')" read -r kind file; do
  if [[ "$kind" == E ]]; then cp -p "$B/originals/$file" "$ROOT/$file"
  elif [[ "$kind" == N ]]; then rm -f -- "$ROOT/$file"
  fi
done < "$B/files"
cd "$ROOT"
php artisan view:clear
echo 'R16 source restored. If Next.js was rebuilt separately, rebuild/redeploy the old frontend as well.'
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

echo "== INSTALL R16 FILES: ${#CHANGED[@]} =="
installed=1
for file in "${CHANGED[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$STAGE/$file" "$file"
done
node scripts/test-pmd-table-entry-floor-note-r16.cjs
php artisan view:clear
complete=1
echo 'SUCCESS R16: Notes helper removed, permission-gated Create floor restored, table QR availability guards patched.'
echo 'No R45B safety files, DB schema, restaurant records or orders changed.'
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo 'FRONTEND PENDING: frontend TypeScript source was installed but the running Next.js build is NOT automatically changed.'
echo 'Before deploying the frontend, verify the real active PM2 process directory and build it through the existing production release workflow.'
echo 'Inspect: pm2 jlist | node -e '\''let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{for(const p of JSON.parse(s))if(/paymydine.*frontend/i.test(p.name))console.log(p.name,p.pm2_env.pm_cwd,p.pm2_env.status)})'\'''
