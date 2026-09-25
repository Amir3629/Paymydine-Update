#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="3598d16948bb8b6389ef10a73bc06217b7d6a0c3"

FILES=(
  "app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Middleware/PmdAdminRetiredPagesR77.php"
  "app/admin/Services/PmdDefaultStaffRoleService.php"
  "app/admin/controllers/Reservations.php"
)

ROUTE_FILE="routes/admin-app-before.php"

log(){ printf '\n[PayMyDine V131] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V131][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V131 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V131 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v131-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v131-canonical-reservations-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}" "$ROUTE_FILE"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

MENU="$STAGE/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
SESSION="$STAGE/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
RETIRED="$STAGE/app/Http/Middleware/PmdAdminRetiredPagesR77.php"
ROLES="$STAGE/app/admin/Services/PmdDefaultStaffRoleService.php"
RESERVATIONS="$STAGE/app/admin/controllers/Reservations.php"
ROUTES="$STAGE/$ROUTE_FILE"

log "Validating canonical Reservations V131 before touching live files"

grep -Fq 'PMD_RESERVATIONS_CANONICAL_NAV_V131' "$MENU" ||
  fail "V131 side-menu canonical marker missing"

grep -Fq "href=\"{{ admin_url('reservations') }}\"" "$MENU" ||
  fail "Side menu does not target /admin/reservations"

if grep -Fq "href=\"{{ admin_url('reservations2') }}\"" "$MENU"; then
  fail "Side menu still targets Reservations2"
fi

grep -Fq 'PMD_RESERVATIONS_CANONICAL_ROUTE_V131' "$SESSION" ||
  fail "V131 mobile canonical route marker missing"

grep -Fq "\$route = 'reservations';" "$SESSION" ||
  fail "Mobile Reservations bootstrap does not target canonical route"

grep -Fq 'PMD_RESERVATIONS2_LEGACY_ALIAS_V131' "$RETIRED" ||
  fail "Reservations2 legacy alias marker missing"

grep -Fq "'reservations2' =>" "$RETIRED" ||
  fail "Reservations2 exact legacy alias missing"

grep -Fq "'reservations2/' =>" "$RETIRED" ||
  fail "Reservations2 descendant legacy alias missing"

if grep -Fq 'PMD_RESERVATIONS2_CURRENT_SURFACE_V130' "$RETIRED"; then
  fail "Obsolete V130 direct Reservations2 surface is still active"
fi

grep -Fq "'admin/reservations' =>" "$ROLES" ||
  fail "Role authority canonical Reservations normalization missing"

grep -Fq "'admin/reservationslab'" "$ROLES" ||
  fail "Role authority Reservationslab implementation mapping missing"

grep -Fq "\$is('reservations')" "$ROLES" ||
  fail "Cashier canonical Reservations permission path missing"

grep -Fq "\$is('reservations2')" "$ROLES" ||
  fail "Stale Reservations2 migration permission path missing"

grep -Fq 'PMD_RESERVATIONS_CANONICAL_CONTROLLER_FALLBACK_V131' "$RESERVATIONS" ||
  fail "Legacy Reservations controller canonical fallback marker missing"

grep -Fq "return redirect(admin_url('reservations'));" "$RESERVATIONS" ||
  fail "Legacy Reservations controller does not converge on canonical route"

if grep -Fq "return redirect(admin_url('reservations2'));" "$RESERVATIONS"; then
  fail "Legacy Reservations controller still revives Reservations2"
fi

grep -Fq "'reservationslab' =>" "$ROUTES" ||
  fail "Canonical router Reservationslab mapping missing"

grep -Fq "? 'reservationslab'" "$ROUTES" ||
  fail "/admin/reservations does not select Reservationslab for current document navigation"

for php_file in "$SESSION" "$RETIRED" "$ROLES" "$RESERVATIONS"; do
  php -l "$php_file" >/dev/null ||
    fail "PHP syntax failed: $php_file"
done

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  log "Backing up current live V131 targets"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V131 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  parent_dir="$(dirname "$dst")"

  sudo mkdir -p "$parent_dir"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$parent_dir")"
    gid="$(stat -c '%g' "$parent_dir")"
    mode="644"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "Clearing Laravel runtime caches"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 ||
  php artisan view:clear >/dev/null 2>&1 ||
  true
sudo -u www-data php artisan route:clear >/dev/null 2>&1 ||
  php artisan route:clear >/dev/null 2>&1 ||
  true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 ||
  php artisan cache:clear >/dev/null 2>&1 ||
  true

log "Post-deploy verification"

grep -Fq "href=\"{{ admin_url('reservations') }}\""   app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php ||
  fail "Live side menu canonical Reservations link verification failed"

grep -Fq "\$route = 'reservations';"   app/Http/Controllers/PmdMobileWorkspaceSessionController.php ||
  fail "Live mobile Reservations canonical route verification failed"

grep -Fq 'PMD_RESERVATIONS2_LEGACY_ALIAS_V131'   app/Http/Middleware/PmdAdminRetiredPagesR77.php ||
  fail "Live Reservations2 legacy alias verification failed"

grep -Fq "return redirect(admin_url('reservations'));"   app/admin/controllers/Reservations.php ||
  fail "Live legacy Reservations controller convergence verification failed"

grep -Fq "'reservationslab' =>" "$ROUTE_FILE" ||
  fail "Live canonical Reservations router mapping is missing"

for php_file in   app/Http/Controllers/PmdMobileWorkspaceSessionController.php   app/Http/Middleware/PmdAdminRetiredPagesR77.php   app/admin/Services/PmdDefaultStaffRoleService.php   app/admin/controllers/Reservations.php
do
  php -l "$php_file" >/dev/null ||
    fail "Live PHP syntax failed: $php_file"
done

cat <<'EOF'

============================================================
 PAYMYDINE V131 CANONICAL RESERVATIONS COMPLETE
============================================================

CANONICAL RESERVATIONS
  Side menu
    = /admin/reservations

  Android mobile bootstrap
    = /admin/reservations

  Server document authority
    = /admin/reservations
    = internally served by Reservationslab
    = no browser redirect to Reservations2

LEGACY MIGRATION
  /admin/reservations2
    = legacy alias only
    = redirects to /admin/reservations

  /admin/reservations2/*
    = migrates to /admin/reservations/*

  Cached Android side-menu HTML
    = safe
    = an old Reservations2 link still lands on the new canonical page

PRESERVED
  V130 retired-page safety
  V129 Android Cloud re-entry and mobile invoices
  V128 Cashier Reservations authority
  V127 and earlier Quick POS behavior

NO APK UPDATE REQUIRED
  Android 0.3.38 V129 remains the correct build.

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
fi
