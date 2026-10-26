#!/usr/bin/env bash
# PMD_PR551_OWNER_HOUR_TEAM_NOTES_INCREMENTAL_INSTALL_R11
# Deploy role-targeted persisted Owner Hour team notes and Staff Portal receipts. Install tenant schema separately, explicitly.
# Fetch the feature branch from origin immediately before running this installer.
set -Eeuo pipefail
ROOT=/var/www/paymydine
BASE=44b26657b0569ff87af4da0b317291cb7b8cc765
REF=FETCH_HEAD
cd "$ROOT"
if (( EUID == 0 )); then
  echo 'STOP: run as ubuntu/deployment account, not root.' >&2
  exit 2
fi
for cmd in git php node flock mktemp cmp sha256sum awk; do
  command -v "$cmd" >/dev/null || { echo "STOP: missing $cmd" >&2; exit 2; }
done
[[ "$(git rev-parse --show-toplevel)" == "$ROOT" ]] || { echo 'STOP: unexpected git root' >&2; exit 2; }
exec 9>/tmp/pmd-pr551-install.lock
flock -n 9 || { echo 'STOP: PR551 installer already running' >&2; exit 2; }
git cat-file -e "$BASE^{commit}" || { echo 'STOP: reviewed base missing (fetch main)' >&2; exit 2; }
git cat-file -e "$REF^{commit}" || { echo 'STOP: branch FETCH_HEAD missing' >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$REF" || { echo 'STOP: branch is not based on reviewed main' >&2; exit 2; }

files=(
  app/Http/Controllers/PmdOwnerStaffHourNotesR11Controller.php
  app/Http/Controllers/PmdStaffPortalV5Controller.php
  app/Services/PmdOwnerStaffHourNotesR11.php
  app/admin/assets/css/pmd-owner-hour-team-notes-r11.css
  app/admin/assets/css/pmd-staff-hour-notes-r11.css
  app/admin/assets/js/pmd-owner-hour-team-notes-r11.js
  app/admin/assets/js/pmd-staff-hour-notes-r11.js
  app/admin/routes.php
  app/admin/views/dashboardlab/index.blade.php
  app/admin/views/pmd-staff-portal/_hour_notes_r11.blade.php
  app/admin/views/pmd-staff-portal/index_v5.blade.php
  app/system/database/migrations/2026_10_26_170000_create_pmd_owner_staff_hour_notes_r11.php
  routes/pmd-owner-staff-notes-r11.php
  scripts/pmd-owner-staff-hour-notes-schema-r11.php
)
allowed=( "${files[@]}" scripts/pmd-install-pr551-owner-hour-team-notes-r11.sh )
mapfile -t changed < <(git diff --name-only "$BASE" "$REF")
if (( ${#changed[@]} != ${#allowed[@]} )); then
  printf 'STOP: changed-path count differs from reviewed PR551\n' >&2
  printf '%s\n' "${changed[@]}" >&2
  exit 2
fi
for p in "${changed[@]}"; do
  accepted=0
  for expected in "${allowed[@]}"; do
    if [[ "$p" == "$expected" ]]; then accepted=1; break; fi
  done
  (( accepted )) || { echo "STOP: unexpected changed file $p" >&2; exit 2; }
done
git diff --check "$BASE" "$REF"

stage="$(mktemp -d /tmp/pmd-pr551-stage-XXXXXX)"
backup=''
applying=0
completed=0
cleanup() {
  status=$?
  if (( status != 0 && applying == 1 && completed == 0 )) && [[ -n "$backup" ]]; then
    echo 'Install interrupted: restoring backed-up live files.' >&2
    while IFS=$'\t' read -r kind p expected_sha; do
      if [[ "$kind" == existing ]]; then
        cp -p "$backup/before/$p" "$ROOT/$p" || true
      else
        rm -f "$ROOT/$p" || true
      fi
    done < "$backup/manifest.tsv"
    php artisan view:clear >/dev/null 2>&1 || true
  fi
  rm -rf "$stage"
  if (( status != 0 )); then
    echo "STOP: PR551 not installed. Backup: ${backup:-none}" >&2
  fi
}
trap cleanup EXIT
mkdir -p "$stage/base" "$stage/incoming" "$stage/merged"

echo '=== PREFLIGHT: PRESERVE EXISTING VPS CHANGES ==='
for p in "${files[@]}"; do
  for kind in base incoming merged; do
    mkdir -p "$stage/$kind/$(dirname "$p")"
  done
  if [[ -L "$p" || ( -e "$p" && ! -f "$p" ) ]]; then
    echo "STOP: nonregular path $p" >&2; exit 2
  fi
  git show "$REF:$p" > "$stage/incoming/$p"
  if git cat-file -e "$BASE:$p" 2>/dev/null; then
    [[ -f "$p" ]] || { echo "STOP: missing current VPS file $p" >&2; exit 2; }
    git show "$BASE:$p" > "$stage/base/$p"
    if cmp -s "$p" "$stage/base/$p"; then
      cp "$stage/incoming/$p" "$stage/merged/$p"
    elif cmp -s "$p" "$stage/incoming/$p"; then
      cp "$p" "$stage/merged/$p"
    else
      if ! git merge-file -p --diff3 "$p" "$stage/base/$p" "$stage/incoming/$p" > "$stage/merged/$p"; then
        echo "STOP: source conflict with VPS modification: $p" >&2
        echo 'No live file has been modified.' >&2
        exit 2
      fi
      echo "Merged with existing VPS modifications: $p"
    fi
  else
    if [[ -e "$p" ]] && ! cmp -s "$p" "$stage/incoming/$p"; then
      echo "STOP: new PR file differs from existing VPS file: $p" >&2
      exit 2
    fi
    cp "$stage/incoming/$p" "$stage/merged/$p"
  fi
done

echo '=== PREFLIGHT: OWNER AND STAFF NOTES R11 ==='
for p in \
  app/Http/Controllers/PmdOwnerStaffHourNotesR11Controller.php \
  app/Http/Controllers/PmdStaffPortalV5Controller.php \
  app/Services/PmdOwnerStaffHourNotesR11.php \
  app/admin/routes.php \
  app/system/database/migrations/2026_10_26_170000_create_pmd_owner_staff_hour_notes_r11.php \
  routes/pmd-owner-staff-notes-r11.php \
  scripts/pmd-owner-staff-hour-notes-schema-r11.php; do
  php -l "$stage/merged/$p"
done
node --check "$stage/merged/app/admin/assets/js/pmd-owner-hour-team-notes-r11.js"
node --check "$stage/merged/app/admin/assets/js/pmd-staff-hour-notes-r11.js"
grep -Fq 'PMD_OWNER_STAFF_HOUR_NOTES_R11' "$stage/merged/app/Services/PmdOwnerStaffHourNotesR11.php" || { echo 'STOP: backend service missing' >&2; exit 2; }
grep -Fq 'PMD_OWNER_STAFF_HOUR_NOTES_ROUTES_R11' "$stage/merged/routes/pmd-owner-staff-notes-r11.php" || { echo 'STOP: protected route file missing' >&2; exit 2; }
grep -Fq "require_once base_path('routes/pmd-owner-staff-notes-r11.php')" "$stage/merged/app/admin/routes.php" || { echo 'STOP: route loader missing' >&2; exit 2; }
grep -Fq 'PMD_OWNER_HOUR_TEAM_NOTES_CLIENT_R11' "$stage/merged/app/admin/assets/js/pmd-owner-hour-team-notes-r11.js" || { echo 'STOP: Owner Hour UI missing' >&2; exit 2; }
grep -Fq 'PMD_STAFF_HOUR_NOTES_CLIENT_R11' "$stage/merged/app/admin/assets/js/pmd-staff-hour-notes-r11.js" || { echo 'STOP: Staff app UI missing' >&2; exit 2; }
grep -Fq 'pmd-owner-hour-team-notes-r11.js' "$stage/merged/app/admin/views/dashboardlab/index.blade.php" || { echo 'STOP: Owner assets not wired' >&2; exit 2; }
grep -Fq 'data-pmd-owner-hour-notes-csrf="{{ csrf_token() }}"' "$stage/merged/app/admin/views/dashboardlab/index.blade.php" || { echo 'STOP: Owner CSRF token source missing' >&2; exit 2; }
grep -Fq "host.getAttribute('data-pmd-owner-hour-notes-csrf')" "$stage/merged/app/admin/assets/js/pmd-owner-hour-team-notes-r11.js" || { echo 'STOP: Owner POST CSRF header missing' >&2; exit 2; }
grep -Fq "database.connections.tenant.database" "$stage/merged/scripts/pmd-owner-staff-hour-notes-schema-r11.php" || { echo 'STOP: tenant-specific schema mapping missing' >&2; exit 2; }
if grep -Fq "Config::set('database.connections.mysql.database'" "$stage/merged/scripts/pmd-owner-staff-hour-notes-schema-r11.php"; then
  echo 'STOP: unsafe central mysql schema configuration detected' >&2
  exit 2
fi
grep -Fq 'pmd-staff-hour-notes-r11.js' "$stage/merged/app/admin/views/pmd-staff-portal/index_v5.blade.php" || { echo 'STOP: Staff app assets not wired' >&2; exit 2; }
grep -Fq "pmd-staff-portal._hour_notes_r11" "$stage/merged/app/admin/views/pmd-staff-portal/index_v5.blade.php" || { echo 'STOP: Staff inbox partial not wired' >&2; exit 2; }
node - "$stage/merged/app/admin/assets/css/pmd-owner-hour-team-notes-r11.css" \
        "$stage/merged/app/admin/assets/css/pmd-staff-hour-notes-r11.css" <<'PMD_R11_CSS_CHECK'
const fs=require('fs');
for (const file of process.argv.slice(2)) {
  const css=fs.readFileSync(file,'utf8');
  const opens=(css.match(/{/g)||[]).length;
  const closes=(css.match(/}/g)||[]).length;
  if(opens!==closes||opens<12) {console.error('STOP: invalid CSS '+file);process.exit(2);}
  console.log('CSS OK '+file+' ('+opens+' rules)');
}
PMD_R11_CSS_CHECK

backup="$HOME/pmd-pr551-owner-hour-notes-r11-backup-$(date +%Y%m%d_%H%M%S)-$$"
mkdir -m 700 "$backup"
mkdir -p "$backup/before"
printf '%s\n' "$ROOT" > "$backup/root-path"
printf '%s\n' "$(git rev-parse "$REF")" > "$backup/installed-source-commit"
: > "$backup/manifest.tsv"
for p in "${files[@]}"; do
  kind=new
  if [[ -f "$p" ]]; then
    kind=existing
    mkdir -p "$backup/before/$(dirname "$p")"
    cp -p "$p" "$backup/before/$p"
  fi
  expected_sha="$(sha256sum "$stage/merged/$p" | awk '{print $1}')"
  printf '%s\t%s\t%s\n' "$kind" "$p" "$expected_sha" >> "$backup/manifest.tsv"
done

cat > "$backup/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
backup="$(cd "$(dirname "$0")" && pwd -P)"
root="$(cat "$backup/root-path")"
cd "$root"
while IFS=$'\t' read -r kind p expected_sha; do
  [[ -f "$p" ]] || { echo "STOP: deployed file missing: $p" >&2; exit 2; }
  actual_sha="$(sha256sum "$p" | awk '{print $1}')"
  [[ "$actual_sha" == "$expected_sha" ]] || { echo "STOP: deployed file changed after install: $p" >&2; exit 2; }
done < "$backup/manifest.tsv"
while IFS=$'\t' read -r kind p expected_sha; do
  if [[ "$kind" == existing ]]; then
    cp -p "$backup/before/$p" "$p"
  else
    rm -f "$p"
  fi
done < "$backup/manifest.tsv"
php artisan view:clear
echo 'PR551 rollback complete.'
ROLLBACK
chmod 700 "$backup/rollback.sh"

echo '=== INSTALL EXACT 14 FILES ==='
applying=1
for p in "${files[@]}"; do
  if [[ -f "$p" ]]; then
    cat "$stage/merged/$p" > "$p"
  else
    mkdir -p "$(dirname "$p")"
    install -m 0644 "$stage/merged/$p" "$p"
  fi
done
for p in "${files[@]}"; do
  cmp -s "$stage/merged/$p" "$p" || { echo "STOP: copy verification failed: $p" >&2; exit 2; }
done
php artisan view:clear
completed=1
applying=0
echo 'SUCCESS: PR551 Owner Hour Team Notes R11 source installed (14 files, R10 preserved).'
echo "BACKUP: $backup"
echo "ROLLBACK: bash $backup/rollback.sh"
echo 'NEXT: Install R11 tenant schema explicitly: php scripts/pmd-owner-staff-hour-notes-schema-r11.php --tenant=tomo --apply
NEXT: Repeat per restaurant tenant; no schema was changed by the source installer.'
