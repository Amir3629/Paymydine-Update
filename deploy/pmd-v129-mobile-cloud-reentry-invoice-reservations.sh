#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="8c2e698138bf6d632c29211d8c01b09a9f375624"

APK_NAME="PayMyDine-Android-0.3.38.apk"
APK_SHA256="cf81d646012e68a1039326b2234d23c1b717a41eb796b0c1b6af7ecc9e9ce0a2"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
APK_REL="downloads/paymydine/${APK_NAME}"
APK_SHA_REL="downloads/paymydine/${APK_NAME}.sha256"

FILES=(
  "app/admin/Services/PmdDefaultStaffRoleService.php"
  "app/admin/controllers/Reservations.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PayMyDine V129] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V129][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V129 server source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V129 source commit is unavailable: $SOURCE_COMMIT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v129-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v129-mobile-cloud-reentry-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging pinned V129 server files"
for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

ROLES="$STAGE/app/admin/Services/PmdDefaultStaffRoleService.php"
RESERVATIONS="$STAGE/app/admin/controllers/Reservations.php"
SESSION="$STAGE/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
AUTH="$STAGE/app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
SETTINGS="$STAGE/app/admin/views/pmdsettings/index.blade.php"

log "Validating V128 + V129 server authority before touching live files"

grep -Fq 'PMD_QPOS_MOBILE_INVOICE_RESERVATIONS_AUTHORITY_V128' "$ROLES" ||
  fail "V128 role authority marker missing"

grep -Fq '#^admin/pmd-cashier-order-center/invoice/[0-9]+$#' "$ROLES" ||
  fail "Canonical Cashier invoice route authority missing"

grep -Fq '$isCanonicalCashierInvoiceV128' "$ROLES" ||
  fail "Canonical invoice role guard missing"

grep -Fq '$isCashierReservationsV128' "$ROLES" ||
  fail "Cashier Reservations route authority missing"

grep -Fq "$is('reservations2')" "$ROLES" ||
  fail "Reservations2 route allowance missing"

grep -Fq "'PMD.Workspace.Cashier'" "$RESERVATIONS" ||
  fail "Existing Cashier Reservations permission bridge missing"

grep -Fq "'Admin.DeleteReservations'" "$RESERVATIONS" ||
  fail "Reservation delete protection was lost"

grep -Fq 'PMD_ANDROID_CLOUD_REENTRY_V129' "$SESSION" ||
  fail "V129 mobile Cloud re-entry marker missing"

grep -Fq 'safeNextTargetV129' "$SESSION" ||
  fail "V129 safe Admin continuation missing"

grep -Fq "'next_target_v129'" "$SESSION" ||
  fail "V129 continuation audit marker missing"

grep -Fq 'PmdDefaultStaffRoleService::CASHIER' "$SESSION" ||
  fail "V129 Cashier Reservations mobile bootstrap authority missing"

grep -Fq 'PMD_ANDROID_CLOUD_REENTRY_V129' "$AUTH" ||
  fail "V129 mobile workspace auth marker missing"

grep -Fq '$roles::CASHIER' "$AUTH" ||
  fail "Cashier Reservations mobile surface authority missing"

grep -Fq 'PayMyDine-Android-0.3.38.apk' "$SETTINGS" ||
  fail "Settings does not point to Android 0.3.38"

for php_file in "$ROLES" "$RESERVATIONS" "$SESSION" "$AUTH" "$SETTINGS"; do
  php -l "$php_file" >/dev/null ||
    fail "PHP syntax failed: $php_file"
done

log "Downloading signed Android 0.3.38 V129"
mkdir -p "$STAGE/downloads/paymydine"
curl -fL --retry 3 --retry-delay 2   "$APK_URL"   -o "$STAGE/$APK_REL"

ACTUAL_APK_SHA="$(sha256sum "$STAGE/$APK_REL" | awk '{print $1}')"
[[ "$ACTUAL_APK_SHA" == "$APK_SHA256" ]] ||
  fail "APK SHA-256 mismatch: expected $APK_SHA256, got $ACTUAL_APK_SHA"

printf '%s  %s\n' "$APK_SHA256" "$APK_NAME" > "$STAGE/$APK_SHA_REL"

EXISTING=()
for rel in "${FILES[@]}" "$APK_REL" "$APK_SHA_REL"; do
  [[ -e "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  log "Backing up current live files"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V129 server files"
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

log "Installing checksum-pinned Android 0.3.38 APK"
APK_DIR="$PMD_ROOT/downloads/paymydine"
sudo mkdir -p "$APK_DIR"

apk_uid="$(stat -c '%u' "$APK_DIR")"
apk_gid="$(stat -c '%g' "$APK_DIR")"

sudo install -m 0644 -o "$apk_uid" -g "$apk_gid"   "$STAGE/$APK_REL" "$PMD_ROOT/$APK_REL"

sudo install -m 0644 -o "$apk_uid" -g "$apk_gid"   "$STAGE/$APK_SHA_REL" "$PMD_ROOT/$APK_SHA_REL"

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

grep -Fq '$isCanonicalCashierInvoiceV128'   app/admin/Services/PmdDefaultStaffRoleService.php ||
  fail "Live invoice route authority verification failed"

grep -Fq '$isCashierReservationsV128'   app/admin/Services/PmdDefaultStaffRoleService.php ||
  fail "Live Reservations route authority verification failed"

grep -Fq 'safeNextTargetV129'   app/Http/Controllers/PmdMobileWorkspaceSessionController.php ||
  fail "Live V129 Cloud re-entry verification failed"

grep -Fq '$roles::CASHIER'   app/Http/Controllers/PmdMobileWorkspaceAuthController.php ||
  fail "Live Cashier Reservations mobile authority verification failed"

grep -Fq 'PayMyDine-Android-0.3.38.apk'   app/admin/views/pmdsettings/index.blade.php ||
  fail "Live Settings Android 0.3.38 link verification failed"

LIVE_APK_SHA="$(sha256sum "$PMD_ROOT/$APK_REL" | awk '{print $1}')"
[[ "$LIVE_APK_SHA" == "$APK_SHA256" ]] ||
  fail "Live APK checksum mismatch: expected $APK_SHA256, got $LIVE_APK_SHA"

cat <<EOF

============================================================
 PAYMYDINE V129 MOBILE CLOUD RE-ENTRY DEPLOY COMPLETE
============================================================

SERVER
  Invoice route authority
    = enabled for canonical Cashier / Waiter paid invoice

  Cashier Reservations
    = /admin/reservations2 authorized
    = existing Cashier role rows supported
    = destructive delete permission remains protected

  Android Local-First -> Cloud
    = fresh Admin Web session minted through /admin/mobile/workspace/open
    = bearer device identity + signed Staff Grant verified
    = only same-origin role-authorized Admin targets accepted
    = Invoice and Reservations continue to their exact requested URL

ANDROID
  APK
    = $APK_NAME
  versionCode
    = 51
  versionName
    = 0.3.38-v129-cloud-reentry
  SHA-256
    = $APK_SHA256
  local download
    = /downloads/paymydine/$APK_NAME

PRESERVED
  V128 role authority
  V127 History / combined invoice / touch-scroll
  V126 and earlier Quick POS behavior

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
else
  printf 'Backup: no pre-existing files required backup\n'
fi
