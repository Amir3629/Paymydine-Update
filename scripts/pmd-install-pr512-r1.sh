#!/usr/bin/env bash
# PMD_PR512_R1_LOCAL_PRESERVING_INSTALLER
# PR511 is installed as file-only overlays. This is source-only, no DB writes,
# git checkout/reset, schema changes or unreviewed frontend process restarts.
set -Eeuo pipefail
cd /var/www/paymydine
if [[ "$EUID" -eq 0 ]]; then echo "STOP: run as ubuntu/deployment user, not root" >&2; exit 2; fi
for cmd in git php node sha256sum cmp mktemp flock sort diff awk install; do
  command -v "$cmd" >/dev/null || { echo "STOP: missing prerequisite $cmd" >&2; exit 2; }
done
exec 9>/tmp/pmd-pr512-r1.lock
flock -n 9 || { echo "STOP: another PR512 install/rollback is active" >&2; exit 2; }
BASE=refs/remotes/origin/pmd-pr511
REF=refs/remotes/origin/pmd-pr512
git cat-file -e "$BASE^{commit}" || { echo "STOP: fetch PR511 first" >&2; exit 2; }
git cat-file -e "$REF^{commit}" || { echo "STOP: fetch PR512 first" >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$REF" || {
  echo "STOP: fetched PR512 no longer descends from PR511; review before proceeding." >&2
  exit 2
}
[[ -f artisan && -d .git ]] || { echo "STOP: unexpected application checkout" >&2; exit 2; }
files=(
  app/Http/Controllers/PmdPublicBookingController.php
  app/admin/Services/PmdReservationsScheduleV1.php
  app/admin/assets/css/pmd-reservations-search-r1.css
  app/admin/assets/js/pmd-reservations-search-r1.js
  app/admin/controllers/Pmdsettings.php
  app/admin/controllers/Reservations.php
  app/admin/i18n/platform/de.php
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
  resources/views/pmd/public-booking.blade.php
  routes/admin-app-before.php
  routes/api.php
  routes/pmd-public-compat-handler.php
  scripts/pmd-install-pr512-r1.sh
  scripts/pmd-rollback-pr512-r1.sh
  scripts/test-pmd-reservation-search-nav-tiktok-r1.js
)
mapfile -t real_diff < <(git diff --name-only "$BASE" "$REF" | LC_ALL=C sort)
mapfile -t expected < <(printf '%s\n' "${files[@]}" | LC_ALL=C sort)
if ! diff -u <(printf '%s\n' "${expected[@]}") <(printf '%s\n' "${real_diff[@]}"); then
  echo "STOP: PR512 contains unexpected changes or the allowlist is stale." >&2; exit 2;
fi
stage="$(mktemp -d /tmp/pmd-pr512-stage-XXXXXX)"
backup=''
applying=0
success=0
cleanup() {
  code=$?
  if (( code != 0 && applying == 1 && success == 0 )); then
    echo "STOP: partial installation detected; restoring all original files." >&2
    while IFS=$'\t' read -r kind path digest; do
      if [[ "$kind" == existing ]]; then
        cp -p "$backup/before/$path" "$path" || true
      else
        rm -f -- "$path" || true
      fi
    done < "$backup/manifest.tsv"
    php artisan view:clear >/dev/null 2>&1 || true
  fi
  rm -rf -- "$stage"
  if (( code != 0 )); then
    echo "FAILED: no successful deployment. Backup: ${backup:-not created}" >&2
  fi
}
trap cleanup EXIT
mkdir -p "$stage/base" "$stage/new" "$stage/merged"
echo "=== STAGE SOURCE AND THREE-WAY MERGE VPS MODIFICATIONS ==="
for path in "${files[@]}"; do
  [[ "$path" != /* && "$path" != *'..'* && ! -L "$path" ]] || {
    echo "STOP: unsafe path $path" >&2; exit 2;
  }
  [[ ! -e "$path" || -f "$path" ]] || { echo "STOP: unexpected file type $path" >&2; exit 2; }
  mkdir -p "$stage/base/$(dirname "$path")" "$stage/new/$(dirname "$path")" "$stage/merged/$(dirname "$path")"
  git show "$REF:$path" > "$stage/new/$path"
  if git cat-file -e "$BASE:$path" 2>/dev/null; then
    [[ -f "$path" && -w "$path" ]] || { echo "STOP: missing/unwritable live file $path" >&2; exit 2; }
    git show "$BASE:$path" > "$stage/base/$path"
    if cmp -s "$path" "$stage/base/$path"; then
      cp "$stage/new/$path" "$stage/merged/$path"
    elif cmp -s "$path" "$stage/new/$path"; then
      cp "$path" "$stage/merged/$path"
    else
      if ! git merge-file -p --diff3 "$path" "$stage/base/$path" "$stage/new/$path" > "$stage/merged/$path"; then
        echo "STOP: local content conflicts with PR512: $path. No production files modified." >&2
        exit 2
      fi
      echo "Preserved nonconflicting VPS modifications: $path"
    fi
  else
    if [[ -e "$path" ]] && ! cmp -s "$path" "$stage/new/$path"; then
      echo "STOP: new PR512 path already exists with different local content: $path" >&2
      exit 2
    fi
    [[ -w "$(dirname "$path")" ]] || { echo "STOP: cannot create file $path" >&2; exit 2; }
    cp "$stage/new/$path" "$stage/merged/$path"
  fi
done
echo "=== VALIDATE EVERYTHING BEFORE INSTALL ==="
git diff --check "$BASE" "$REF"
node --check "$stage/merged/app/admin/assets/js/pmd-reservations-search-r1.js"
node --check "$stage/merged/scripts/test-pmd-reservation-search-nav-tiktok-r1.js"
bash -n "$stage/merged/scripts/pmd-install-pr512-r1.sh"
bash -n "$stage/merged/scripts/pmd-rollback-pr512-r1.sh"
phpFiles=(
  app/Http/Controllers/PmdPublicBookingController.php
  app/admin/Services/PmdReservationsScheduleV1.php
  app/admin/controllers/Pmdsettings.php
  app/admin/controllers/Reservations.php
  app/admin/i18n/platform/de.php
  app/main/routes/main-public-compat.php
  app/main/routes/next-proxy.php
  app/main/routes/theme-settings.php
  routes/admin-app-before.php
  routes/api.php
  routes/pmd-public-compat-handler.php
)
for path in "${phpFiles[@]}"; do
  php -l "$stage/merged/$path" || { echo "STOP: PHP lint failed: $path" >&2; exit 2; }
done
# If production already has TypeScript installed, make it available ONLY inside
# this disposable stage for no-write syntax transpilation.
if [[ -d frontend/node_modules/typescript ]]; then
  mkdir -p "$stage/merged/frontend/node_modules"
  ln -s "$(pwd -P)/frontend/node_modules/typescript" "$stage/merged/frontend/node_modules/typescript"
fi
node "$stage/merged/scripts/test-pmd-reservation-search-nav-tiktok-r1.js"

backup="$HOME/pmd-pr512-r1-$(date -u +%Y%m%d%H%M%S)-$$"
mkdir -m 700 "$backup"
mkdir -p "$backup/before"
printf '%s\n' /var/www/paymydine > "$backup/root-path"
printf 'pmd-pr512-r1\n' > "$backup/.pmd-pr512-r1"
: > "$backup/manifest.tsv"
for path in "${files[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/before/$(dirname "$path")"
    cp -p "$path" "$backup/before/$path"
    kind=existing
  else
    kind=new
  fi
  sha="$(sha256sum "$stage/merged/$path" | awk '{print $1}')"
  printf '%s\t%s\t%s\n' "$kind" "$path" "$sha" >> "$backup/manifest.tsv"
done
cp "$stage/merged/scripts/pmd-rollback-pr512-r1.sh" "$backup/rollback.sh"
chmod 700 "$backup/rollback.sh"
echo "=== INSTALL TESTED SOURCE FILES ==="
applying=1
for path in "${files[@]}"; do
  if [[ -f "$path" ]]; then
    cat "$stage/merged/$path" > "$path"
  else
    install -m 0644 "$stage/merged/$path" "$path"
  fi
done
for path in "${files[@]}"; do
  expected_sha="$(sha256sum "$stage/merged/$path" | awk '{print $1}')"
  installed_sha="$(sha256sum "$path" | awk '{print $1}')"
  [[ "$expected_sha" == "$installed_sha" ]] || {
    echo "STOP: installed source checksum mismatch for $path" >&2; exit 2;
  }
done
php artisan view:clear
success=1
applying=0
echo "SUCCESS: PR512 SOURCE PATCH INSTALLED — RESERVATION SEARCH, DE SIDEBAR, TIKTOK"
echo "BACKUP: $backup"
printf 'ROLLBACK: bash %q %q\n' "$backup/rollback.sh" "$backup"
echo "No tenant DB data, schema, guest orders, existing reservations, or payments were changed by this installer."
echo "IMPORTANT: Next.js TSX source updated, but the PUBLIC NEXT.JS FRONTEND MUST BE BUILT AND ACTIVATED SEPARATELY."
echo "Verify Laravel Reservations and /book first. Do not restart PM2/Next without a verified frontend build and runtime path."
