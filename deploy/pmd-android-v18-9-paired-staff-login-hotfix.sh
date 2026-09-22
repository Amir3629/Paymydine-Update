#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-ff3cf4284c1f56d0d0d71961581eaaa72f8a4948}"
TARGET_COMMIT="${TARGET_COMMIT:-d469519588f48682b062be5e7c0325400b9ccd95}"

REL="app/Http/Controllers/PmdMobileWorkspaceAuthController.php"

log(){ printf '\n[PMD V18.9 PAIRED STAFF LOGIN] %s\n' "$*"; }
warn(){ printf '\n[PMD V18.9 PAIRED STAFF LOGIN][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD V18.9 PAIRED STAFF LOGIN][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/$REL" ]] || fail "Live Android workspace auth controller is missing."

for cmd in git php tar stat grep sed; do
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

# V18.9 is intentionally forward-only from the deployed V18.8 authority fix.
grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "V18.8 workspace location authority is not installed."
grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobilePosSessionController.php" \
  || fail "V18.8 POS location authority is not installed."
grep -q "PMD_ANDROID_CANONICAL_LOGIN_WAIT_V12" \
  "$PMD_ROOT/$REL" \
  || grep -q "PMD_ANDROID_PAIRED_DEVICE_PASSWORD_LOGIN_V13" "$PMD_ROOT/$REL" \
  || fail "Expected Android login baseline is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v189-paired-staff-login-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v189-paired-staff-login-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v189-paired-staff-login-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v189-paired-staff-login-before-$STAMP.txt"

mkdir -p \
  "$BACKUP_DIR" \
  "$STAGE/base/$(dirname "$REL")" \
  "$STAGE/target/$(dirname "$REL")" \
  "$STAGE/candidate/$(dirname "$REL")" \
  "$CONFLICT/$(dirname "$REL")"

log "Backing up current Android staff-login controller..."
tar -czf "$BACKUP" "$REL"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo
  "${GIT[@]}" status --short -- "$REL" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected three-way merge candidate..."

"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$STAGE/base/$REL" \
  || fail "Base controller missing from $BASE_COMMIT."
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$STAGE/target/$REL" \
  || fail "Target controller missing from $TARGET_COMMIT."

set +e
git merge-file -p --diff3 \
  -L "LIVE:$REL" \
  -L "BASE:$REL" \
  -L "V18.9:$REL" \
  "$PMD_ROOT/$REL" \
  "$STAGE/base/$REL" \
  "$STAGE/target/$REL" \
  > "$STAGE/candidate/$REL"
rc=$?
set -e

if [[ $rc -ne 0 ]] \
  || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$REL"; then
  cp -f "$STAGE/candidate/$REL" "$CONFLICT/$REL"
  fail "Merge conflict. No V18.9 file was installed. Candidate: $CONFLICT/$REL"
fi

AUTH="$STAGE/candidate/$REL"

log "Validating paired-device username/password login contract..."

grep -q "PMD_ANDROID_STAFF_LOGIN_ROUTER_V4" "$AUTH" \
  || fail "V18.9 staff login router marker missing."
grep -q "PMD_ANDROID_PAIRED_DEVICE_PASSWORD_LOGIN_V13" "$AUTH" \
  || fail "Paired-device password login marker missing."
grep -q "PMD_ANDROID_NO_SECOND_APPROVAL_V13" "$AUTH" \
  || fail "Second-approval removal marker missing."
grep -q "Hash::check" "$AUTH" \
  || fail "Canonical password verification was lost."
grep -q "userMayUseLocation" "$AUTH" \
  || fail "Restaurant location authorization was lost."
grep -q "roleCodeForUser" "$AUTH" \
  || fail "Role authority was lost."
grep -q "routeForRoleCode" "$AUTH" \
  || fail "Role destination routing was lost."
grep -q "PmdWorkSessionPolicyService" "$AUTH" \
  || fail "Work-session expiry authority was lost."
grep -q "staff_grant" "$AUTH" \
  || fail "Signed Staff Grant response was lost."

if grep -q "beginChallengeForIdentity" "$AUTH"; then
  fail "A second restaurant approval is still present in Android staff login."
fi

# Legacy status() remains for an already-open 0.3.5 wait token, but new
# request() calls must immediately return authorizedResponse().
REQUEST_BLOCK="$STAGE/request-block.txt"
sed -n \
  '/PMD_ANDROID_PAIRED_DEVICE_PASSWORD_REQUEST_V13/,/PMD_ANDROID_CANONICAL_LOGIN_STATUS_V12/p' \
  "$AUTH" > "$REQUEST_BLOCK"
grep -q "authorizedResponse" "$REQUEST_BLOCK" \
  || fail "Android request() does not immediately authorize verified staff."
if grep -q "'status' => 'pending'" "$REQUEST_BLOCK"; then
  fail "Android request() still returns pending approval."
fi

php -l "$AUTH" >/dev/null \
  || fail "PHP syntax failed in Android workspace auth controller."

log "Validated role-routing contract..."
ROLE="$PMD_ROOT/app/admin/Services/PmdDefaultStaffRoleService.php"
for route in ownerdashboard managerdashboard pos accountantdashboard reservations mywork kitchendisplay; do
  grep -q "$route" "$ROLE" \
    || fail "Expected role route is missing from PmdDefaultStaffRoleService: $route"
done

log "Installing validated V18.9 controller..."
dst="$PMD_ROOT/$REL"
uid="$(stat -c '%u' "$dst")"
gid="$(stat -c '%g' "$dst")"
mode="$(stat -c '%a' "$dst")"

tmp="${dst}.pmd-v189-new"
cp -f "$AUTH" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$dst"

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
grep -n "PMD_ANDROID_PAIRED_DEVICE_PASSWORD_LOGIN_V13" "$PMD_ROOT/$REL" | head -1
grep -n "PMD_ANDROID_NO_SECOND_APPROVAL_V13" "$PMD_ROOT/$REL" | head -1
php -l "$PMD_ROOT/$REL"

cat <<EOF

============================================================
PayMyDine Android V18.9 paired staff-login hotfix deployed.

New Android sign-in behavior on an already paired restaurant tablet:
  - Every dashboard/workspace switch still requires username + password.
  - The verified role selects the destination server-side.
  - Manager -> Manager Dashboard
  - Cashier -> Quick POS
  - Waiter -> Waiter POS
  - Accountant -> Accountant Dashboard
  - Reservations -> Reservations
  - KDS role -> assigned KDS station
  - Kitchen Staff / Sonstige -> My Work
  - Owner -> canonical Owner Authenticator, then Owner Dashboard
  - usernameportal -> canonical personal Portal Authenticator, then My Work

Removed:
  - The unrelated second Owner/Manager/Cashier approval required after a
    correct username/password on an already paired Android tablet.

Still enforced:
  - One-time restaurant device pairing approval.
  - Device bearer trust and revocation.
  - Active user/staff state.
  - Canonical password verification.
  - Restaurant location access.
  - Canonical role routing.
  - Signed Staff Grant and work-session expiry.
  - Owner / Portal MFA.

Unchanged:
  - Android APK remains 0.3.5.
  - No database migration.
  - No pairing reset.
  - No Android Clear Data.
  - No payment change.
  - No git reset --hard.

Backup:
  $BACKUP
  $META
============================================================
EOF
