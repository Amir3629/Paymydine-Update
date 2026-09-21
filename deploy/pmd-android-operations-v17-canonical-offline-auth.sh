#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-e6f6054c08c422c3aad4d8d61a7d63b8bf113689}"
TARGET_COMMIT="${TARGET_COMMIT:-fbbe0979955920a7478963c5826ed416e6a0f443}"

APK_NAME="PayMyDine-POS-Tablet-Preview-0.3.2.apk"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="1c1b9ef7670292916160edf66afa4bf6d22b0e8a201c2138189cf1ee302a2a54"

FILES=(
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
  "routes/pmd-mobile-sync-v1.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PMD POS V17] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V17][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V17][ERROR] %s\n' "$*" >&2; exit 1; }

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

log "Checking the V16 Android Operations contract before changing live files..."
grep -q "mobile/workspace/open"   "$PMD_ROOT/routes/pmd-mobile-sync-v1.php"   || fail "V16 workspace route is missing."
grep -q "Android Restaurant App"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php"   || fail "V16 Android Settings card is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v17-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v17-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-operations-v17-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-operations-v17-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate" "$CONFLICT"

log "Verifying Android Operations 0.3.2 release before touching live files..."
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
log "Building V17 candidates with three-way merge protection..."

for rel in "${FILES[@]}"; do
  mkdir -p     "$STAGE/base/$(dirname "$rel")"     "$STAGE/target/$(dirname "$rel")"     "$STAGE/candidate/$(dirname "$rel")"     "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel"     || fail "Target file missing from $TARGET_COMMIT: $rel"

  if "${GIT[@]}" cat-file -e "$BASE_COMMIT:$rel" 2>/dev/null; then
    [[ -f "$PMD_ROOT/$rel" ]]       || fail "Existing baseline file is missing live: $rel"

    "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel"

    set +e
    git merge-file -p --diff3       -L "LIVE:$rel"       -L "BASE:$rel"       -L "V17:$rel"       "$PMD_ROOT/$rel"       "$STAGE/base/$rel"       "$STAGE/target/$rel"       > "$STAGE/candidate/$rel"
    rc=$?
    set -e

    if [[ $rc -ne 0 ]]       || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
      cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
      fail "Merge conflict. No V17 files were installed. Conflict saved: $CONFLICT/$rel"
    fi
  else
    if [[ -e "$PMD_ROOT/$rel" ]]; then
      if cmp -s "$PMD_ROOT/$rel" "$STAGE/target/$rel"; then
        cp -f "$STAGE/target/$rel" "$STAGE/candidate/$rel"
      else
        cp -f "$PMD_ROOT/$rel" "$CONFLICT/$rel.live"
        cp -f "$STAGE/target/$rel" "$CONFLICT/$rel.target"
        fail "New V17 path already exists with different live content: $rel. No files were installed."
      fi
    else
      cp -f "$STAGE/target/$rel" "$STAGE/candidate/$rel"
    fi
  fi
done

log "Validating staged V17 server contract..."
grep -q "PMD_ANDROID_WORKSPACE_REAUTH_V1"   "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php"   || fail "Workspace re-auth controller marker is missing."
grep -q "Hash::check"   "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php"   || fail "Workspace password verification is missing."
grep -q "workspace/authorize"   "$STAGE/candidate/routes/pmd-mobile-sync-v1.php"   || fail "Workspace authorization route is missing."
grep -q "throttle:8,15"   "$STAGE/candidate/routes/pmd-mobile-sync-v1.php"   || fail "Workspace authorization throttle is missing."
grep -q "$APK_NAME"   "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"   || fail "Settings does not point at Android Operations 0.3.2."
grep -q "Operations Preview 0.3.2"   "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"   || fail "Settings Android preview label is not 0.3.2."

php -l "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" >/dev/null   || fail "PHP syntax failed in workspace re-auth controller."
php -l "$STAGE/candidate/routes/pmd-mobile-sync-v1.php" >/dev/null   || fail "PHP syntax failed in mobile routes."

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

  tmp="${dst}.pmd-v17-new"
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
grep -n "PMD_ANDROID_WORKSPACE_REAUTH_V1"   "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" | head -1
grep -n "workspace/authorize"   "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1
grep -n "$APK_NAME"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
grep -n "Operations Preview 0.3.2"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1

cat <<EOF

============================================================
PayMyDine Android Operations V17 deployed.

Android preview:
  $APK_NAME
  0.3.2-operations-debug
  versionCode 15
  package com.paymydine.mobile.pospreview

Verified APK SHA-256:
  $ACTUAL_APK_SHA256

What V17 enables:
  - Offline POS uses the canonical PayMyDine Quick POS visual contract.
  - The packaged offline shell uses the exact pmd-quick-pos-v1.css from the web platform.
  - Tables, menu, cart, guests, notes and Hold/Send stay backed by SQLite/Restaurant Edge.
  - Pay/Profile/History/table controls stay visible in their normal POS locations.
  - Payments and uncertified table mutations remain fail-closed offline.
  - Cashier/Waiter, KDS and Reservations require username/password re-auth on open/switch.
  - Passwords are never stored on Android.
  - Only an encrypted short-lived workspace continuation lease is stored in Android Keystore.
  - Offline continuation is limited to the last successfully authorized workspace.
  - Existing dashboard-based Android pairing/approval remains unchanged.

Backup:
  $BACKUP
  $META

No git reset --hard.
No migrations.
No live dirty file was blindly overwritten.
============================================================
EOF
