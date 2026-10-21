#!/usr/bin/env bash
# PMD_RESERVATIONS_NAV_TIKTOK_R1_SAFE_INSTALL
# Deploy branch on top of already manually installed PR511, retaining VPS local edits.
# File-only; no Git checkout, reset, migrations, DB writes or frontend process restarts.
set -Eeuo pipefail
cd /var/www/paymydine
BASE="refs/remotes/origin/pmd-calendar-ui-r3"
REF="refs/remotes/origin/pmd-feature-resnav-tiktok-r1"
if [[ "${EUID}" -eq 0 ]]; then echo "STOP: run as ubuntu, not root" >&2; exit 2; fi
for tool in git php node sha256sum flock cmp mktemp; do
  command -v "$tool" >/dev/null || { echo "STOP: missing $tool" >&2; exit 2; }
done
exec 9>/tmp/pmd-resnav-tiktok-r1.lock
flock -n 9 || { echo "STOP: another deployment running" >&2; exit 2; }
git cat-file -e "$BASE^{commit}" || { echo "STOP: fetch PR511 first" >&2; exit 2; }
git cat-file -e "$REF^{commit}" || { echo "STOP: fetch feature PR first" >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$REF" || {
  echo "STOP: feature PR is not stacked on PR511" >&2; exit 2
}
allowed=(
  app/Http/Controllers/PmdPublicBookingController.php
  app/admin/Services/PmdReservationsScheduleV1.php
  app/admin/assets/css/pmd-reservation-search-r1.css
  app/admin/controllers/Pmdsettings.php
  app/admin/controllers/Reservations.php
  app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php
  app/admin/views/_partials/pmd_reservations_cards_v1.blade.php
  app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php
  app/admin/views/pmdsettings/restaurant.blade.php
  app/main/routes/main-public-compat.php
  app/main/routes/next-proxy.php
  app/main/routes/theme-settings.php
  frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx
  frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx
  frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts
  frontend/store/cms/defaults.ts
  frontend/store/cms/merchant-settings.ts
  frontend/store/cms/types.ts
  routes/admin-app-before.php
  routes/api.php
  routes/pmd-public-compat-handler.php
  scripts/pmd-install-reservations-nav-tiktok-r1.sh
  scripts/pmd-rollback-reservations-nav-tiktok-r1.sh
  scripts/test-pmd-reservations-nav-tiktok-r1.js
)
mapfile -t diff_files < <(git diff --name-only "$BASE" "$REF")
if (( "${#diff_files[@]}" != "${#allowed[@]}" )); then
  echo "STOP: unexpected changed file count; inspect PR before deploy" >&2
  printf '%s\n' "${diff_files[@]}" >&2
  exit 2
fi
for path in "${diff_files[@]}"; do
  found=0
  for item in "${allowed[@]}"; do
    [[ "$path" == "$item" ]] && { found=1; break; }
  done
  (( found == 1 )) || { echo "STOP: unexpected PR file $path" >&2; exit 2; }
done
stage="$(mktemp -d /tmp/pmd-resnav-tiktok-r1-XXXXXX)"
backup=''
applying=0
success=0
cleanup() {
  result=$?
  if (( result != 0 && applying == 1 && success == 0 )); then
    echo "INSTALL FAILED DURING COPY: restoring backups" >&2
    while IFS=$'\t' read -r kind path expected; do
      if [[ "$kind" == existing ]]; then
        cp -p "$backup/before/$path" "$path" || true
      else
        rm -f "$path" || true
      fi
    done < "$backup/manifest.tsv"
    php artisan view:clear >/dev/null 2>&1 || true
  fi
  rm -rf "$stage"
  if (( result != 0 )); then
    echo "STOP: install not completed. Backup: ${backup:-not created}" >&2
  fi
}
trap cleanup EXIT
mkdir -p "$stage/base" "$stage/incoming" "$stage/merged"
echo "=== MERGE CHANGED FILES WITHOUT OVERWRITING LOCAL EDITS ==="
for path in "${allowed[@]}"; do
  [[ "$path" != /* && "$path" != *'..'* ]] || { echo "STOP: unsafe path" >&2; exit 2; }
  [[ ! -L "$path" && ( ! -e "$path" || -f "$path" ) ]] || {
    echo "STOP: symlink or nonregular file $path" >&2; exit 2;
  }
  mkdir -p "$stage/base/$(dirname "$path")" "$stage/incoming/$(dirname "$path")" "$stage/merged/$(dirname "$path")"
  git show "$REF:$path" > "$stage/incoming/$path"
  if git cat-file -e "$BASE:$path" 2>/dev/null; then
    [[ -f "$path" && -w "$path" ]] || { echo "STOP: existing file missing/unwritable $path" >&2; exit 2; }
    git show "$BASE:$path" > "$stage/base/$path"
    if cmp -s "$path" "$stage/base/$path"; then
      cp "$stage/incoming/$path" "$stage/merged/$path"
    elif cmp -s "$path" "$stage/incoming/$path"; then
      cp "$path" "$stage/merged/$path"
    else
      if ! git merge-file -p --diff3 "$path" "$stage/base/$path" "$stage/incoming/$path" > "$stage/merged/$path"; then
        echo "STOP: local changes conflict with PR: $path" >&2
        echo "No files have been changed yet." >&2
        exit 2
      fi
      echo "Local modifications preserved: $path"
    fi
  else
    if [[ -e "$path" ]] && ! cmp -s "$path" "$stage/incoming/$path"; then
      echo "STOP: new file already exists with different contents: $path" >&2; exit 2
    fi
    cp "$stage/incoming/$path" "$stage/merged/$path"
  fi
done
echo "=== CHECK SYNTAX AND REGRESSION CONTRACT ==="
git diff --check "$BASE" "$REF"
for path in "${allowed[@]}"; do
  case "$path" in
    *.blade.php) ;;
    *.php) php -l "$stage/merged/$path" || exit 2 ;;
    *.js) node --check "$stage/merged/$path" || exit 2 ;;
    *.sh) bash -n "$stage/merged/$path" || exit 2 ;;
  esac
done
node "$stage/merged/scripts/test-pmd-reservations-nav-tiktok-r1.js"

backup="$HOME/pmd-resnav-tiktok-r1-$(date -u +%Y%m%d%H%M%S)-$$"
mkdir -m 700 "$backup"
mkdir -p "$backup/before"
echo /var/www/paymydine > "$backup/root-path"
echo "pmd-resnav-tiktok-r1" > "$backup/.pmd-resnav-tiktok-r1"
: > "$backup/manifest.tsv"
for path in "${allowed[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/before/$(dirname "$path")"
    cp -p "$path" "$backup/before/$path"
    kind=existing
  else
    [[ -d "$(dirname "$path")" && -w "$(dirname "$path")" ]] || {
      echo "STOP: cannot create new file $path" >&2; exit 2
    }
    kind=new
  fi
  hash="$(sha256sum "$stage/merged/$path" | cut -d ' ' -f1)"
  printf '%s\t%s\t%s\n' "$kind" "$path" "$hash" >> "$backup/manifest.tsv"
done
cp "$stage/merged/scripts/pmd-rollback-reservations-nav-tiktok-r1.sh" "$backup/rollback.sh"
chmod 700 "$backup/rollback.sh"

echo "=== INSTALL R1 FILES ==="
applying=1
for path in "${allowed[@]}"; do
  if [[ -f "$path" ]]; then
    cat "$stage/merged/$path" > "$path"
  else
    install -m 0644 "$stage/merged/$path" "$path"
  fi
done
while IFS=$'\t' read -r kind path expected; do
  actual="$(sha256sum "$path" | cut -d ' ' -f1)"
  [[ "$actual" == "$expected" ]] || { echo "STOP: hash mismatch $path" >&2; exit 2; }
done < "$backup/manifest.tsv"
php artisan view:clear
applying=0
success=1
echo 'SUCCESS: RESERVATIONS SEARCH + GERMAN NAV + TIKTOK SOURCE INSTALLED'
echo "BACKUP: $backup"
printf 'ROLLBACK: bash %q %q\n' "$backup/rollback.sh" "$backup"
echo 'Frontend TypeScript source was installed but its Next.js build/process was NOT restarted.'
echo 'Run the frontend build/deploy using your existing VPS process workflow before verifying TikTok in the customer menu.'
echo 'No DB migrations, resets or tenant data writes were run.'
