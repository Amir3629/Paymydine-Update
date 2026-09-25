#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="6c87be7f9acd06a9e49bc94af73eacec9ed5509e"

FILE="app/Http/Middleware/PmdAdminRetiredPagesR77.php"

log(){ printf '\n[PayMyDine V130] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V130][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V130 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V130 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v130-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v130-reservations2-current-surface-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE/$(dirname "$FILE")"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

"${GIT[@]}" show "${SOURCE_COMMIT}:$FILE" > "$STAGE/$FILE"

MW="$STAGE/$FILE"

log "Validating Reservations2 current-surface authority before touching live files"

grep -Fq 'PMD_RESERVATIONS2_CURRENT_SURFACE_V130' "$MW" ||
  fail "V130 Reservations2 current-surface marker missing"

grep -Fq "\$relative === 'reservations2'" "$MW" ||
  fail "Reservations2 exact-path protection missing"

grep -Fq "'reservations2/'" "$MW" ||
  fail "Reservations2 descendant-path protection missing"

LEGACY_BLOCK="$(
  sed -n '/private const LEGACY_EXACT = \[/,/^    \];/p' "$MW"
)"

if printf '%s\n' "$LEGACY_BLOCK" | grep -Fq "'reservations2'"; then
  fail "Reservations2 is still listed as a retired exact page"
fi

grep -Fq "'X-PMD-Legacy-Redirect'" "$MW" ||
  fail "Legacy redirect authority unexpectedly missing"

php -l "$MW" >/dev/null ||
  fail "PHP syntax failed: $FILE"

if [[ -f "$FILE" ]]; then
  log "Backing up current live middleware"
  sudo tar -czf "$BACKUP" -- "$FILE"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing V130 middleware"
dst="$PMD_ROOT/$FILE"
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

sudo install -m "$mode" -o "$uid" -g "$gid" "$MW" "$dst"
echo "UPDATED: $FILE"

log "Clearing Laravel runtime caches"
sudo -u www-data php artisan route:clear >/dev/null 2>&1 ||
  php artisan route:clear >/dev/null 2>&1 ||
  true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 ||
  php artisan cache:clear >/dev/null 2>&1 ||
  true

log "Post-deploy verification"

grep -Fq 'PMD_RESERVATIONS2_CURRENT_SURFACE_V130' "$FILE" ||
  fail "Live V130 marker verification failed"

LIVE_LEGACY_BLOCK="$(
  sed -n '/private const LEGACY_EXACT = \[/,/^    \];/p' "$FILE"
)"

if printf '%s\n' "$LIVE_LEGACY_BLOCK" | grep -Fq "'reservations2'"; then
  fail "Live Reservations2 is still marked retired"
fi

grep -Fq "\$relative === 'reservations2'" "$FILE" ||
  fail "Live Reservations2 exact-path protection missing"

php -l "$FILE" >/dev/null ||
  fail "Live PHP syntax failed"

cat <<EOF

============================================================
 PAYMYDINE V130 RESERVATIONS2 CURRENT SURFACE COMPLETE
============================================================

ROOT CAUSE REMOVED
  /admin/reservations2
    = no longer listed in PmdAdminRetiredPagesR77::LEGACY_EXACT
    = no longer redirected to /admin/dashboard
    = explicitly protected as a current Reservations workspace
    = descendants under /admin/reservations2/* are protected too

PRESERVED
  V129 Android Cloud re-entry and mobile invoices
  V128 Cashier Reservations authority
  V127 and earlier Quick POS behavior
  all other retired-page redirects

NO APK UPDATE REQUIRED
  Android 0.3.38 V129 remains the correct mobile build.

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
fi
