#!/usr/bin/env bash
# PMD_PR551_NO_HOVER_TITLES_INCREMENTAL_INSTALL_R4
# Deploy global tooltip suppression on Owner/Manager/Admin, standalone staff UI, classic themes and React source over installed R3.
# Fetch the feature branch from origin immediately before running this installer.
set -Eeuo pipefail
ROOT=/var/www/paymydine
BASE=e4d903881e30a4a189413361703d452f6680d0bb
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
  app/admin/assets/js/pmd-no-hover-titles-global-r4.js
  app/admin/views/auth/login_portal_mfa_v1.blade.php
  app/admin/views/auth/login_standalone.blade.php
  app/admin/views/auth/login_workplace_v3.blade.php
  app/admin/views/auth/login_workplace_v4.blade.php
  app/admin/views/auth/login_workspace_v2.blade.php
  app/admin/views/index.blade.php
  app/admin/views/kitchendisplay/index.blade.php
  app/admin/views/layouts/default.blade.php
  app/admin/views/location_requests.blade.php
  app/admin/views/login.blade.php
  app/admin/views/new.blade.php
  app/admin/views/pmd-staff-portal/index.blade.php
  app/admin/views/pmd-staff-portal/index_v5.blade.php
  app/admin/views/pmd-staff-portal/login.blade.php
  app/admin/views/pmd-staff-portal/management_v1.blade.php
  app/admin/views/pmd-ui-kit.blade.php
  app/admin/views/pmd_quick_pos_v1.blade.php
  app/admin/views/settings.blade.php
  app/admin/views/siteaccess/hub.blade.php
  app/admin/views/siteaccess/hub_v2.blade.php
  app/admin/views/siteaccess/index.blade.php
  app/admin/views/siteaccess/index_v2.blade.php
  app/admin/views/siteaccess/owner_mfa.blade.php
  app/admin/views/superadmin_r2/layout.blade.php
  app/admin/views/superadmin_r2/login.blade.php
  app/admin/views/waiter_dashboard_final.blade.php
  app/admin/views/waiter_dashboard_final2.blade.php
  app/admin/views/waiter_dashboard_new.blade.php
  app/admin/views/waiter_pos.blade.php
  app/admin/views/waiter_workstation_v3.blade.php
  frontend/app/clientLayout.tsx
  frontend/components/ui/sidebar.tsx
  themes/paymydine/paymydine-theme/_layouts/default.blade.php
  themes/tastyigniter-orange/_partials/scripts.blade.php
  themes/tastyigniter-orange1/_partials/scripts.blade.php
  themes/tastyigniter-typical/_partials/scripts.blade.php
)
allowed=( "${files[@]}" scripts/pmd-install-pr551-no-hover-titles-r4.sh )
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

echo '=== PREFLIGHT: GLOBAL TOOLTIP SUPPRESSION ==='
node --check "$stage/merged/app/admin/assets/js/pmd-no-hover-titles-global-r4.js"
grep -Fq 'PMD_NO_HOVER_TITLES_GLOBAL_R4' "$stage/merged/app/admin/assets/js/pmd-no-hover-titles-global-r4.js" || { echo 'STOP: hover suppression runtime is missing' >&2; exit 2; }
grep -Fq 'pmd-no-hover-titles-global-r4.js' "$stage/merged/app/admin/views/layouts/default.blade.php" || { echo 'STOP: Admin global layout is not wired' >&2; exit 2; }
grep -Fq 'pmd-no-hover-titles-global-r4.js' "$stage/merged/app/admin/views/auth/login_workplace_v4.blade.php" || { echo 'STOP: Login view is not wired' >&2; exit 2; }
grep -Fq 'pmd-no-hover-titles-global-r4.js' "$stage/merged/themes/tastyigniter-typical/_partials/scripts.blade.php" || { echo 'STOP: Customer theme is not wired' >&2; exit 2; }
grep -Fq 'PMD_CUSTOMER_NO_HOVER_TITLES_R4' "$stage/merged/frontend/app/clientLayout.tsx" || { echo 'STOP: React customer observer missing' >&2; exit 2; }
grep -Fq 'PMD_CUSTOMER_SIDEBAR_NO_HOVER_TITLES_R4' "$stage/merged/frontend/components/ui/sidebar.tsx" || { echo 'STOP: React sidebar change missing' >&2; exit 2; }

backup="$HOME/pmd-pr551-no-hover-titles-r4-backup-$(date +%Y%m%d_%H%M%S)-$$"
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

echo '=== INSTALL EXACT 37 FILES ==='
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
echo 'SUCCESS: PR551 global hover-title suppression R4 installed in source files.'
echo "BACKUP: $backup"
echo "ROLLBACK: bash $backup/rollback.sh"
echo 'Next: hard-refresh Admin/Owner/Manager/Reservations/Login/Staff pages. React customer changes additionally require the normal Next.js build/restart.'
