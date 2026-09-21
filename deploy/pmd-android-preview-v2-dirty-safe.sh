#!/usr/bin/env bash
set -Eeuo pipefail

# PayMyDine Android preview deployment for a DIRTY live checkout.
#
# This script is intentionally conservative:
# - it NEVER runs git reset --hard
# - it NEVER overwrites dirty live hook files blindly
# - it stages a 3-way merge first, validates all PHP, then copies atomically
# - it backs up every target file before changing anything
#
# Run:
#   sudo PMD_ROOT=/var/www/paymydine bash /tmp/pmd-android-preview-v2-dirty-safe.sh

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-23cc0a8d41d33569f8a56e1feb187b7f95c3eb6e}"
TARGET_COMMIT="${TARGET_COMMIT:-cd73ce8982be3b365f6611836f96c192f5876176}"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/PayMyDine-Android-Local-First-Preview.apk"

log()  { printf '\n[PMD Android V2] %s\n' "$*"; }
warn() { printf '\n[PMD Android V2][WARN] %s\n' "$*" >&2; }
fail() { printf '\n[PMD Android V2][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan not found under $PMD_ROOT"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

REMOTE_URL="$("${GIT[@]}" remote get-url origin 2>/dev/null || true)"
case "$REMOTE_URL" in
  *Amir3629/Paymydine-Update*) ;;
  *) fail "Unexpected origin remote: $REMOTE_URL" ;;
esac

log "Checkout: $PMD_ROOT"
log "Origin:   $REMOTE_URL"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit is missing after fetch: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "Pinned Android deployment commit is not an ancestor of origin/main."
fi

HOOK_FILES=(
  "app/admin/views/pmdsettings/index.blade.php"
  "app/Services/PmdSiteAccessService.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
  "app/admin/controllers/KitchenDisplay.php"
  "app/admin/controllers/Login.php"
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/routes.php"
)

NEW_FILES=(
  "app/Http/Controllers/PmdMobileBootstrapController.php"
  "app/Http/Controllers/PmdMobileEdgeController.php"
  "app/Http/Controllers/PmdMobileKdsController.php"
  "app/Http/Controllers/PmdMobilePairController.php"
  "app/Http/Controllers/PmdMobileSyncController.php"
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
  "app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php"
  "routes/pmd-mobile-sync-v1.php"
)

ALL_FILES=("${HOOK_FILES[@]}" "${NEW_FILES[@]}")

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE_DIR="$PMD_ROOT/storage/pmd-android-v2-stage-$STAMP"
CONFLICT_DIR="$PMD_ROOT/storage/pmd-android-v2-conflicts-$STAMP"
BACKUP_TAR="$BACKUP_DIR/android-preview-v2-before-$STAMP.tar.gz"
BACKUP_META="$BACKUP_DIR/android-preview-v2-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE_DIR" "$CONFLICT_DIR"

cleanup_stage_on_error() {
  local rc=$?
  if [[ $rc -ne 0 ]]; then
    warn "Deployment stopped safely. No staged merge is copied after a validation failure."
    warn "Stage:     $STAGE_DIR"
    warn "Conflicts: $CONFLICT_DIR"
    warn "Backup:    $BACKUP_TAR"
  fi
}
trap cleanup_stage_on_error EXIT

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "branch=$("${GIT[@]}" rev-parse --abbrev-ref HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "android_base=$BASE_COMMIT"
  echo "android_target=$TARGET_COMMIT"
  echo
  echo "git_status_before:"
  "${GIT[@]}" status --short || true
} > "$BACKUP_META"

EXISTING=()
for rel in "${ALL_FILES[@]}"; do
  [[ -e "$PMD_ROOT/$rel" ]] && EXISTING+=("$rel")
done
if (("${#EXISTING[@]}" > 0)); then
  tar -czf "$BACKUP_TAR" "${EXISTING[@]}"
else
  tar -czf "$BACKUP_TAR" --files-from /dev/null
fi
log "Backup created: $BACKUP_TAR"

show_to_file() {
  local ref="$1"
  local rel="$2"
  local out="$3"
  if "${GIT[@]}" cat-file -e "$ref:$rel" 2>/dev/null; then
    mkdir -p "$(dirname "$out")"
    "${GIT[@]}" show "$ref:$rel" > "$out"
    return 0
  fi
  return 1
}

log "Preparing clean 3-way merges for live hook files..."
for rel in "${HOOK_FILES[@]}"; do
  live="$PMD_ROOT/$rel"
  base="$STAGE_DIR/.base/$rel"
  theirs="$STAGE_DIR/.target/$rel"
  merged="$STAGE_DIR/tree/$rel"
  conflict="$CONFLICT_DIR/$rel"

  [[ -f "$live" ]] || fail "Required live hook file is missing: $rel"
  show_to_file "$BASE_COMMIT" "$rel" "$base" \
    || fail "Android merge base does not contain hook file: $rel"
  show_to_file "$TARGET_COMMIT" "$rel" "$theirs" \
    || fail "Android target does not contain hook file: $rel"

  mkdir -p "$(dirname "$merged")" "$(dirname "$conflict")"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "ANDROID_BASE:$rel" \
    -L "ANDROID_TARGET:$rel" \
    "$live" "$base" "$theirs" > "$merged"
  rc=$?
  set -e

  if [[ $rc -eq 1 ]]; then
    cp -f "$merged" "$conflict"
    fail "3-way merge conflict in $rel. Conflict copy saved to $conflict"
  elif [[ $rc -gt 1 ]]; then
    fail "git merge-file failed for $rel with status $rc"
  fi

  if grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    cp -f "$merged" "$conflict"
    fail "Conflict markers detected in $rel. Conflict copy saved to $conflict"
  fi

  printf '[PMD Android V2] merged: %s\n' "$rel"
done

log "Preparing Android-only new files..."
for rel in "${NEW_FILES[@]}"; do
  target="$STAGE_DIR/tree/$rel"
  mkdir -p "$(dirname "$target")"
  show_to_file "$TARGET_COMMIT" "$rel" "$target" \
    || fail "Android target is missing required new file: $rel"

  if [[ -e "$PMD_ROOT/$rel" ]]; then
    if cmp -s "$PMD_ROOT/$rel" "$target"; then
      printf '[PMD Android V2] already current: %s\n' "$rel"
    else
      # A pre-existing local version of a supposedly new Android file may be a
      # manual hotfix. Never overwrite it silently.
      diffcopy="$CONFLICT_DIR/${rel}.live-vs-android.diff"
      mkdir -p "$(dirname "$diffcopy")"
      diff -u "$PMD_ROOT/$rel" "$target" > "$diffcopy" || true
      fail "Local file already exists and differs from Android target: $rel. Diff saved to $diffcopy"
    fi
  else
    printf '[PMD Android V2] new: %s\n' "$rel"
  fi
done

log "Running staged PHP syntax checks..."
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null \
    || fail "PHP syntax failed: ${phpfile#$STAGE_DIR/tree/}"
done < <(find "$STAGE_DIR/tree" -type f -name '*.php' -print0)

SETTINGS="$STAGE_DIR/tree/app/admin/views/pmdsettings/index.blade.php"
ROUTES="$STAGE_DIR/tree/app/admin/routes.php"
PAIR_CTRL="$STAGE_DIR/tree/app/Http/Controllers/PmdMobilePairController.php"
PAIR_SVC="$STAGE_DIR/tree/app/Services/PmdMobileSync/PmdMobilePairingService.php"

grep -q "Android Tablet / POS" "$SETTINGS" \
  || fail "Staged Settings merge lost Android Tablet / POS."
grep -q "pmd-mobile-sync-v1.php" "$ROUTES" \
  || fail "Staged admin routes merge lost mobile route loader."
grep -q "code_verifier" "$PAIR_CTRL" \
  || fail "Staged pairing controller is missing PKCE verifier."
grep -q "ensureMobileSyncStorage" "$PAIR_SVC" \
  || fail "Staged pairing service is missing tenant schema recovery."

log "All staged merges are conflict-free and syntax-valid."
log "Installing staged files atomically..."

for rel in "${ALL_FILES[@]}"; do
  src="$STAGE_DIR/tree/$rel"
  dst="$PMD_ROOT/$rel"
  [[ -f "$src" ]] || fail "Staged file unexpectedly missing: $rel"

  mkdir -p "$(dirname "$dst")"

  if [[ -e "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$PMD_ROOT")"
    gid="$(stat -c '%g' "$PMD_ROOT")"
    mode="644"
  fi

  tmp="${dst}.pmd-android-v2-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Post-install validation..."
for rel in "${ALL_FILES[@]}"; do
  case "$rel" in
    *.php)
      php -l "$PMD_ROOT/$rel" >/dev/null \
        || fail "Post-install PHP syntax failed: $rel"
      ;;
  esac
done

grep -q "Android Tablet / POS" "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" \
  || fail "Android Settings entry is missing after install."
grep -q "pmd-mobile-sync-v1.php" "$PMD_ROOT/app/admin/routes.php" \
  || fail "Mobile route loader is missing after install."
[[ -d "$PMD_ROOT/app/Services/PmdMobileSync" ]] \
  || fail "PmdMobileSync service directory is missing after install."

log "Clearing Laravel/TastyIgniter caches..."
php artisan optimize:clear || warn "optimize:clear returned non-zero"
php artisan view:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

log "Reloading PHP-FPM..."
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet php8.3-fpm.service; then
    systemctl reload php8.3-fpm.service
    echo "[PMD Android V2] Reloaded php8.3-fpm.service"
  else
    found=0
    while IFS= read -r svc; do
      [[ -n "$svc" ]] || continue
      if systemctl is-active --quiet "$svc"; then
        systemctl reload "$svc" 2>/dev/null || systemctl restart "$svc"
        echo "[PMD Android V2] Reloaded $svc"
        found=1
      fi
    done < <(
      systemctl list-unit-files --type=service --no-legend 2>/dev/null \
        | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}'
    )
    [[ "$found" -eq 1 ]] || warn "No active PHP-FPM service found."
  fi
fi

log "Checking APK..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSIL --max-time 25 "$APK_URL" >/dev/null \
    && echo "[PMD Android V2] APK is reachable." \
    || warn "APK reachability check failed from this VPS."
fi

log "Verification summary:"
grep -n "Android Tablet / POS" "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1 || true
grep -n "pmd-mobile-sync-v1.php" "$PMD_ROOT/app/admin/routes.php" | head -1 || true
ls -1 "$PMD_ROOT/app/Services/PmdMobileSync" || true

cat <<EOF

============================================================
PayMyDine Android dirty-safe deployment completed.

Live root:
  $PMD_ROOT

Backup:
  $BACKUP_TAR
  $BACKUP_META

APK:
  $APK_URL

Next:
  1. Hard-refresh Settings.
  2. Open Cashier App.
  3. Download Android Tablet / POS.
  4. Install APK on tablet and pair it once online.

No git reset --hard was used.
No live dirty hook file was blindly overwritten.
============================================================
EOF

trap - EXIT
