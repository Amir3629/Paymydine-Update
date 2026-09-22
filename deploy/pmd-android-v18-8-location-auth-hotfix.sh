#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-2c6afefa5d887a5a07bdf5ba6e77243374261aa2}"
TARGET_COMMIT="${TARGET_COMMIT:-27fb1970502226811a907539ee10e040849779a3}"

FILES=(
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Controllers/PmdMobilePosSessionController.php"
)

log(){ printf '\n[PMD V18.8 LOCATION AUTH] %s\n' "$*"; }
warn(){ printf '\n[PMD V18.8 LOCATION AUTH][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD V18.8 LOCATION AUTH][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git php tar stat grep; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

grep -q "PMD_ANDROID_CANONICAL_LOGIN_WAIT_V12" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "V18.7 canonical Android login baseline is missing."

grep -q "PMD_MOBILE_PORTAL_CANONICAL_SECURITY_V12" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "V18.7 workspace session baseline is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v188-location-auth-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v188-location-auth-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v188-location-auth-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v188-location-auth-before-$STAMP.txt"

mkdir -p \
  "$BACKUP_DIR" \
  "$STAGE/base" \
  "$STAGE/target" \
  "$STAGE/candidate" \
  "$CONFLICT"

log "Backing up current mobile session controllers..."
tar -czf "$BACKUP" "${FILES[@]}"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo
  "${GIT[@]}" status --short -- "${FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected three-way merge candidates..."

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"

  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")" \
    "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel" \
    || fail "Base file missing from $BASE_COMMIT: $rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel" \
    || fail "Target file missing from $TARGET_COMMIT: $rel"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "BASE:$rel" \
    -L "V18.8:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] \
    || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.8 files were installed. Candidate: $CONFLICT/$rel"
  fi
done

WORK="$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
POS="$STAGE/candidate/app/Http/Controllers/PmdMobilePosSessionController.php"

log "Validating canonical mobile location authorization..."

for file in "$WORK" "$POS"; do
  grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" "$file" \
    || fail "Canonical location auth marker missing: $file"
  grep -q "PmdMobileStaffGrantService" "$file" \
    || fail "Shared mobile location authority import missing: $file"
  grep -q "userMayUseLocation" "$file" \
    || fail "Canonical location authorization call missing: $file"
  if grep -Fq 'AdminLocation::hasAccess($location)' "$file"; then
    fail "Legacy pivot-only location guard is still present: $file"
  fi
  php -l "$file" >/dev/null \
    || fail "PHP syntax failed: $file"
done

grep -q "PMD_MOBILE_PORTAL_CANONICAL_SECURITY_V12" "$WORK" \
  || fail "Portal canonical security continuation was lost."
grep -q "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V6" "$WORK" \
  || fail "Owner canonical security continuation was lost."
grep -q "routeForRoleCode" "$POS" \
  || fail "POS role routing was lost."

log "Installing validated V18.8 server files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v188-new"
  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Clearing Laravel/TastyIgniter caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" | head -1
grep -n "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobilePosSessionController.php" | head -1
php -l "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
php -l "$PMD_ROOT/app/Http/Controllers/PmdMobilePosSessionController.php"

cat <<EOF

============================================================
PayMyDine Android V18.8 location-auth hotfix deployed.

Fixed:
  - Staff login and workspace-open now use the same restaurant-location authority.
  - Primary staff_location_id is accepted consistently.
  - Explicit attached locations remain accepted.
  - Superuser/Owner location behavior remains unchanged.
  - The legacy pivot-only AdminLocation guard no longer rejects a grant that
    was already valid under canonical mobile staff authorization.

Unchanged:
  - Android APK remains 0.3.5.
  - No database migration.
  - No pairing reset.
  - No Android Clear Data.
  - No password storage change.
  - No payment behavior change.
  - No git reset --hard.

Backup:
  $BACKUP
  $META
============================================================
EOF
