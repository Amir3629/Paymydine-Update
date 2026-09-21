#!/usr/bin/env bash
set -Eeuo pipefail

# PayMyDine Android Pairing V3 - dirty-safe live VPS patch.
#
# Fixes:
# - pairing URL reaches its controller before generic workspace redirects
# - canonical PayMyDine security is explicitly completed first
# - verified browser session can approve the Android device
# - browser shows a clear Connect/Open PayMyDine flow
#
# Run:
#   sudo PMD_ROOT=/var/www/paymydine bash /tmp/pmd-android-pairing-v3-dirty-safe.sh

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TARGET_COMMIT="${TARGET_COMMIT:-67878f5ac6b43b8dc2b4fa48b37ee9bba1d889a6}"
ANDROID_BASE="${ANDROID_BASE:-cd73ce8982be3b365f6611836f96c192f5876176}"
GATE_BASE="${GATE_BASE:-50ff9beb14c5bc48915e19cb3d7b3044e50ffc3f}"

log()  { printf '\n[PMD Pairing V3] %s\n' "$*"; }
warn() { printf '\n[PMD Pairing V3][WARN] %s\n' "$*" >&2; }
fail() { printf '\n[PMD Pairing V3][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan not found: $PMD_ROOT/artisan"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

REMOTE_URL="$("${GIT[@]}" remote get-url origin 2>/dev/null || true)"
case "$REMOTE_URL" in
  *Amir3629/Paymydine-Update*) ;;
  *) fail "Unexpected origin remote: $REMOTE_URL" ;;
esac

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$TARGET_COMMIT" "$ANDROID_BASE" "$GATE_BASE"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required git commit is unavailable: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "Pairing V3 target is not present on current origin/main."
fi

FILES=(
  "app/Http/Middleware/PmdSiteAccessGateMiddleware.php"
  "app/Services/PmdSiteAccessWorkspaceGateService.php"
  "app/Services/PmdSiteAccessService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Http/Controllers/PmdMobilePairController.php"
  "routes/pmd-mobile-sync-v1.php"
)

base_for() {
  case "$1" in
    app/Http/Middleware/PmdSiteAccessGateMiddleware.php|app/Services/PmdSiteAccessWorkspaceGateService.php)
      printf '%s\n' "$GATE_BASE"
      ;;
    *)
      printf '%s\n' "$ANDROID_BASE"
      ;;
  esac
}

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pairing-v3-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pairing-v3-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pairing-v3-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pairing-v3-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "branch=$("${GIT[@]}" rev-parse --abbrev-ref HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "target=$TARGET_COMMIT"
  echo "android_base=$ANDROID_BASE"
  echo "gate_base=$GATE_BASE"
  echo
  "${GIT[@]}" status --short || true
} > "$META"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Required live file missing: $rel"
  EXISTING+=("$rel")
done
tar -czf "$BACKUP" "${EXISTING[@]}"
log "Backup: $BACKUP"

show_file() {
  local ref="$1" rel="$2" out="$3"
  mkdir -p "$(dirname "$out")"
  "${GIT[@]}" show "$ref:$rel" > "$out"
}

log "Three-way merging Pairing V3 into the current live files..."
for rel in "${FILES[@]}"; do
  base_ref="$(base_for "$rel")"
  base="$STAGE/base/$rel"
  theirs="$STAGE/target/$rel"
  merged="$STAGE/tree/$rel"

  show_file "$base_ref" "$rel" "$base" \
    || fail "Could not read base version: $base_ref:$rel"
  show_file "$TARGET_COMMIT" "$rel" "$theirs" \
    || fail "Could not read Pairing V3 target: $TARGET_COMMIT:$rel"

  mkdir -p "$(dirname "$merged")"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "PAIRING_BASE:$rel" \
    -L "PAIRING_V3:$rel" \
    "$PMD_ROOT/$rel" "$base" "$theirs" > "$merged"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    conflict_file="$CONFLICT/$rel"
    mkdir -p "$(dirname "$conflict_file")"
    cp -f "$merged" "$conflict_file"
    fail "Merge conflict in $rel. Saved: $conflict_file"
  fi

  if grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    conflict_file="$CONFLICT/$rel"
    mkdir -p "$(dirname "$conflict_file")"
    cp -f "$merged" "$conflict_file"
    fail "Conflict markers found in $rel. Saved: $conflict_file"
  fi

  printf '[PMD Pairing V3] merged: %s\n' "$rel"
done

log "Validating staged PHP..."
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null \
    || fail "PHP syntax failed: ${phpfile#$STAGE/tree/}"
done < <(find "$STAGE/tree" -type f -name '*.php' -print0)

grep -q "PMD_MOBILE_PAIR_TRANSPORT_BYPASS_V2"   "$STAGE/tree/app/Http/Middleware/PmdSiteAccessGateMiddleware.php"   || fail "Pairing transport bypass marker missing."

grep -q "mobile/pair/start"   "$STAGE/tree/app/Services/PmdSiteAccessWorkspaceGateService.php"   || fail "Pairing restart preservation missing."

grep -q "pairCurrentVerifiedPersonalDevice"   "$STAGE/tree/app/Services/PmdSiteAccessService.php"   || fail "Verified-session device pairing method missing."

grep -q "approveVerifiedSession"   "$STAGE/tree/app/Services/PmdMobileSync/PmdMobilePairingService.php"   || fail "Verified pairing approval method missing."

grep -q "Connect this Android device?"   "$STAGE/tree/app/Http/Controllers/PmdMobilePairController.php"   || fail "New browser confirmation page missing."

grep -q "mobile/pair/approve"   "$STAGE/tree/routes/pmd-mobile-sync-v1.php"   || fail "Pairing approval route missing."

log "Installing five validated Pairing V3 files atomically..."
for rel in "${FILES[@]}"; do
  src="$STAGE/tree/$rel"
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-pair-v3-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Post-install syntax check..."
for rel in "${FILES[@]}"; do
  php -l "$PMD_ROOT/$rel" >/dev/null \
    || fail "Post-install syntax failed: $rel"
done

log "Clearing application caches..."
php artisan optimize:clear || warn "optimize:clear returned non-zero"
php artisan view:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
else
  warn "php8.3-fpm was not detected as active; reload your PHP-FPM service manually if needed."
fi

log "Verification:"
grep -n "PMD_MOBILE_PAIR_TRANSPORT_BYPASS_V2"   "$PMD_ROOT/app/Http/Middleware/PmdSiteAccessGateMiddleware.php" | head -1
grep -n "mobile/pair/approve"   "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1
grep -n "Connect this Android device?"   "$PMD_ROOT/app/Http/Controllers/PmdMobilePairController.php" | head -1

cat <<EOF

============================================================
PayMyDine Android Pairing V3 deployed.

Backup:
  $BACKUP
  $META

This patch did NOT:
  - reset your git checkout
  - overwrite unrelated dirty files
  - run global migrations

After the new APK is installed:
  App -> Restaurant code -> Connect
  Browser -> normal PayMyDine security
  Browser -> Connect device
  App opens again and finishes bootstrap
============================================================
EOF
