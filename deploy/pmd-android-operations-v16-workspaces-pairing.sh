#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-3178a7d04cff17776504ca0fb66ab7bbf121d644}"
TARGET_COMMIT="${TARGET_COMMIT:-238be414837664013b5ac6fba2a19e489ef742be}"

APK_NAME="PayMyDine-POS-Tablet-Preview-0.3.1.apk"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="a9e8a5d63779c1f836b843c09959c81782c99a419372114b6ccd1f12bb365352"

FILES=(
  "app/Http/Controllers/PmdMobilePairController.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Controllers/PmdRestaurantSignInApprovalController.php"
  "app/Http/Controllers/PmdSiteAccessHubDataController.php"
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Services/PmdSiteAccessService.php"
  "app/admin/assets/js/pmd-ownerboard-workplace-access-v1.js"
  "app/admin/assets/js/pmd-site-access-hub-v13.js"
  "app/admin/controllers/Siteaccess.php"
  "app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php"
  "routes/pmd-mobile-sync-v1.php"
  "app/admin/views/pmdsettings/index.blade.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PMD POS V16] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V16][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V16][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum php tar stat; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null     || fail "Required commit unavailable: $ref"
done

log "Checking the proven tablet POS shell before changing server files..."
grep -q "PMD_QPOS_ANDROID_TOUCH_RAIL_FIT_V49"   "$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"   || fail "V14 tablet control-fit CSS marker is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v16-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v16-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-operations-v16-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-operations-v16-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate" "$CONFLICT"

log "Verifying Android Operations 0.3.1 release before touching live files..."
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_NAME"
curl -fL --retry 3 --retry-delay 2 "$SHA_URL" -o "$STAGE/$APK_NAME.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_NAME" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_NAME.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]]   || fail "APK SHA-256 mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]]   || fail "Release checksum sidecar mismatch: expected=$EXPECTED_APK_SHA256 sidecar=$SIDE_APK_SHA256"

log "APK verified: $ACTUAL_APK_SHA256"

EXISTING=()
for rel in "${FILES[@]}"; do
  if [[ -e "$PMD_ROOT/$rel" ]]; then
    EXISTING+=("$rel")
  fi
done

if [[ ${#EXISTING[@]} -gt 0 ]]; then
  tar -czf "$BACKUP" "${EXISTING[@]}"
else
  tar -czf "$BACKUP" --files-from /dev/null
fi

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo "apk=$APK_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"
log "Building V16 candidates with three-way merge protection..."

for rel in "${FILES[@]}"; do
  mkdir -p     "$STAGE/base/$(dirname "$rel")"     "$STAGE/target/$(dirname "$rel")"     "$STAGE/candidate/$(dirname "$rel")"     "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel"     || fail "Target file missing from $TARGET_COMMIT: $rel"

  if "${GIT[@]}" cat-file -e "$BASE_COMMIT:$rel" 2>/dev/null; then
    [[ -f "$PMD_ROOT/$rel" ]]       || fail "Existing baseline file is missing live: $rel"

    "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel"

    set +e
    git merge-file -p --diff3       -L "LIVE:$rel"       -L "BASE:$rel"       -L "V16:$rel"       "$PMD_ROOT/$rel"       "$STAGE/base/$rel"       "$STAGE/target/$rel"       > "$STAGE/candidate/$rel"
    rc=$?
    set -e

    if [[ $rc -ne 0 ]]       || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
      cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
      fail "Merge conflict. No V16 files were installed. Conflict saved: $CONFLICT/$rel"
    fi
  else
    if [[ -e "$PMD_ROOT/$rel" ]]; then
      if cmp -s "$PMD_ROOT/$rel" "$STAGE/target/$rel"; then
        cp -f "$STAGE/target/$rel" "$STAGE/candidate/$rel"
      else
        cp -f "$PMD_ROOT/$rel" "$CONFLICT/$rel.live"
        cp -f "$STAGE/target/$rel" "$CONFLICT/$rel.target"
        fail "New V16 path already exists with different live content: $rel. No files were installed."
      fi
    else
      cp -f "$STAGE/target/$rel" "$STAGE/candidate/$rel"
    fi
  fi
done

log "Validating staged server contract..."
grep -q "PMD_MOBILE_PAIR_DASHBOARD_WAIT_V4"   "$STAGE/candidate/app/Http/Controllers/PmdMobilePairController.php"   || fail "Dashboard waiting flow marker is missing."
grep -q "PMD_MOBILE_PAIR_DASHBOARD_APPROVAL_V4"   "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobilePairingService.php"   || fail "Dashboard approval service marker is missing."
grep -q "PMD_MOBILE_PAIR_APPROVAL_CARD_DEVICE_V5"   "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobilePairingService.php"   || fail "Android approval-card identity marker is missing."
grep -q "completeApprovedChallenge"   "$STAGE/candidate/app/Http/Controllers/PmdRestaurantSignInApprovalController.php"   || fail "Restaurant inline approval does not complete Android pairing."
grep -q "Android device connection"   "$STAGE/candidate/app/admin/assets/js/pmd-site-access-hub-v13.js"   || fail "Bottom-right Android approval card UI is missing."
grep -q "mobile/workspace/open"   "$STAGE/candidate/routes/pmd-mobile-sync-v1.php"   || fail "Android workspace session route is missing."
grep -q "pmd_mobile_pair_requests"   "$STAGE/candidate/app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php"   || fail "Android pairing-request storage definition is missing."
grep -q "PayMyDine-POS-Tablet-Preview-0.3.1.apk"   "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"   || fail "Settings does not point at Android Operations 0.3.1."
grep -q "Android Restaurant App"   "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"   || fail "Android Restaurant App label is missing."
grep -q "20260921-androidpair-v16"   "$STAGE/candidate/app/admin/views/pmd_quick_pos_v1.blade.php"   || fail "Quick POS Android approval cache-bust is missing."

if grep -qi "confirmdevice" "$STAGE/candidate/app/Http/Controllers/PmdMobilePairController.php"; then
  fail "Legacy confirmdevice flow detected in Android pairing controller."
fi

PHP_FILES=(
  "app/Http/Controllers/PmdMobilePairController.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Controllers/PmdRestaurantSignInApprovalController.php"
  "app/Http/Controllers/PmdSiteAccessHubDataController.php"
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Services/PmdSiteAccessService.php"
  "app/admin/controllers/Siteaccess.php"
  "app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php"
  "routes/pmd-mobile-sync-v1.php"
)

for rel in "${PHP_FILES[@]}"; do
  php -l "$STAGE/candidate/$rel" >/dev/null     || fail "PHP syntax failed in staged file: $rel"
done

log "All staged files validated. Installing atomically..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"

  if [[ -e "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$(dirname "$dst")")"
    gid="$(stat -c '%g' "$(dirname "$dst")")"
    mode="644"
  fi

  tmp="${dst}.pmd-v16-new"
  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Clearing Laravel/TastyIgniter caches..."
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1   || warn "optimize:clear returned non-zero"

if command -v systemctl >/dev/null 2>&1   && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_MOBILE_PAIR_DASHBOARD_WAIT_V4"   "$PMD_ROOT/app/Http/Controllers/PmdMobilePairController.php" | head -1
grep -n "PMD_MOBILE_PAIR_APPROVAL_CARD_DEVICE_V5"   "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -1
grep -n "Android device connection"   "$PMD_ROOT/app/admin/assets/js/pmd-site-access-hub-v13.js" | head -1
grep -n "mobile/workspace/open"   "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1
grep -n "$APK_NAME"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
grep -n "Operations Preview 0.3.1"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
grep -n "20260921-androidpair-v16"   "$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php" | head -1

cat <<EOF

============================================================
PayMyDine Android Operations V16 deployed.

Android preview:
  $APK_NAME
  0.3.1-pos-shell-debug
  versionCode 14
  package com.paymydine.mobile.pospreview

Verified APK SHA-256:
  $ACTUAL_APK_SHA256

What V16 enables:
  - Branded PayMyDine Android app + PMD launcher icon.
  - First-use workspace choice: Cashier / Waiter, KDS, Reservations.
  - No Android self-confirm / confirmdevice page.
  - Canonical Login/MFA identifies the staff member.
  - Android request appears in the existing bottom-right restaurant approval UI.
  - Approval card shows the intended Android workspace and six-digit match code.
  - Trusted Cashier / Manager / Owner can Approve or Decline.
  - Native local-first KDS entry point is available to authorized KDS roles.
  - Reservations uses the authenticated canonical Cloud workspace.
  - POS/Waiter offline local-first + Restaurant Edge behavior remains intact.
  - Offline payment remains fail-closed.

Storage:
  The mobile pairing service provisions missing pmd-sync-v1 tables on first
  approved pairing if needed. V16 does not run a global migration command.

Backup:
  $BACKUP
  $META

No git reset --hard.
No forced global migrations.
Existing live files were three-way merged; no dirty live file was blindly overwritten.
============================================================
EOF
