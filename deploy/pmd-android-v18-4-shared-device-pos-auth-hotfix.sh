#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-781a8d841f64dd1674600a89152aa1b8f0c21729}"
TARGET_COMMIT="${TARGET_COMMIT:-51738636165ae99d69cebe95ad9d808b5531c46f}"

FILES=(
  "app/Services/PmdSiteAccessWorkspaceGateService.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
)

log(){ printf '\n[PMD V18.4 POS AUTH FIX] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.4 POS AUTH FIX][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git php tar grep stat; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v184-pos-auth-$STAMP"
BACKUP="$BACKUP_DIR/android-v184-pos-auth-before-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate"
tar -czf "$BACKUP" "${FILES[@]}"
log "Backup: $BACKUP"

for rel in "${FILES[@]}"; do
  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel" \
    || fail "Base file missing: $rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel" \
    || fail "Target file missing: $rel"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "BASE:$rel" \
    -L "V18.4:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] \
    || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    fail "Three-way merge conflict. Live files were NOT changed. Candidate: $STAGE/candidate/$rel"
  fi

  php -l "$STAGE/candidate/$rel" >/dev/null \
    || fail "PHP syntax failed: $rel"
done

log "Validating shared-device POS authorization contract..."
grep -q "PMD_MOBILE_SHARED_DEVICE_REVOCATION_V2" \
  "$STAGE/candidate/app/Services/PmdSiteAccessWorkspaceGateService.php" \
  || fail "Shared-device revocation marker missing."
grep -q "PMD_MOBILE_OWNER_DEVICE_PROOF_V3" \
  "$STAGE/candidate/app/Services/PmdSiteAccessWorkspaceGateService.php" \
  || fail "Owner device-proof marker missing."
grep -q "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V3" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "Owner canonical security continuation marker missing."
grep -q "PMD_ANDROID_DEVICE_TRUST_BEFORE_STAFF_LOGIN_V3" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "Android device-trust login marker missing."
grep -q "destination === 'staff'" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "Portal/My Work routing marker missing."

# Critical regression guard: the GENERAL mobile Android revocation check must
# not bind the trusted device row to the current human user_id.
general_block="$STAGE/general-mobile-check.txt"
sed -n '/PMD_MOBILE_SHARED_DEVICE_REVOCATION_V2/,/if (!\$mobileDeviceValid)/p' \
  "$STAGE/candidate/app/Services/PmdSiteAccessWorkspaceGateService.php" \
  > "$general_block"
if grep -q "where('user_id'" "$general_block"; then
  fail "General shared-device check still binds device to pairer user_id."
fi

log "Installing V18.4 files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v184-new"
  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Clearing caches..."
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
grep -n "PMD_MOBILE_SHARED_DEVICE_REVOCATION_V2" \
  "$PMD_ROOT/app/Services/PmdSiteAccessWorkspaceGateService.php" | head -1
grep -n "PMD_MOBILE_OWNER_DEVICE_PROOF_V3" \
  "$PMD_ROOT/app/Services/PmdSiteAccessWorkspaceGateService.php" | head -1
grep -n "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V3" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" | head -1
grep -n "PMD_ANDROID_DEVICE_TRUST_BEFORE_STAFF_LOGIN_V3" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" | head -1

cat <<EOF

============================================================
PayMyDine Android V18.4 POS authorization fix deployed.

Root cause fixed:
  The Android device row stores the historical user who paired the tablet.
  After a different staff member signed in, the Workspace Gate compared that
  historical pairer user_id with the CURRENT staff user_id and rejected POS.

New authority model:
  - device_id + location + not-revoked = restaurant tablet trust
  - Staff Grant + session binding = current human identity
  - Owner keeps canonical Owner MFA/security on shared tablets
  - usernameportal routes to My Work

No APK reinstall required.
No database changes.
No pairing/device reset.
No Clear Data.

Backup:
  $BACKUP
============================================================
EOF
