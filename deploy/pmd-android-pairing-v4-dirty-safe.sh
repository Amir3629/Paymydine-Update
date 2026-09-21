#!/usr/bin/env bash
set -Eeuo pipefail

# PayMyDine Android Pairing V4 - dirty-safe VPS patch.
#
# Adds browser-independent pairing completion:
# the Android app polls its PKCE-bound pair request, so returning manually from
# the browser no longer leaves the app stuck waiting for a custom deep link.
#
# Run:
#   sudo PMD_ROOT=/var/www/paymydine bash /tmp/pmd-android-pairing-v4-dirty-safe.sh

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-67878f5ac6b43b8dc2b4fa48b37ee9bba1d889a6}"
TARGET_COMMIT="${TARGET_COMMIT:-2c89e3d41a7bf29d73bbc3ea24db7fe058eaded2}"

log()  { printf '\n[PMD Pairing V4] %s\n' "$*"; }
warn() { printf '\n[PMD Pairing V4][WARN] %s\n' "$*" >&2; }
fail() { printf '\n[PMD Pairing V4][ERROR] %s\n' "$*" >&2; exit 1; }

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

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable after fetch: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "Pairing V4 target is not present on origin/main."
fi

FILES=(
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Http/Controllers/PmdMobilePairController.php"
  "routes/pmd-mobile-sync-v1.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pairing-v4-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pairing-v4-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pairing-v4-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pairing-v4-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "branch=$("${GIT[@]}" rev-parse --abbrev-ref HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo
  "${GIT[@]}" status --short || true
} > "$META"

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Required live file missing: $rel"
done
tar -czf "$BACKUP" "${FILES[@]}"
log "Backup: $BACKUP"

show_file() {
  local ref="$1" rel="$2" out="$3"
  mkdir -p "$(dirname "$out")"
  "${GIT[@]}" show "$ref:$rel" > "$out"
}

log "Three-way merging Pairing V4..."
for rel in "${FILES[@]}"; do
  base="$STAGE/base/$rel"
  target="$STAGE/target/$rel"
  merged="$STAGE/tree/$rel"

  show_file "$BASE_COMMIT" "$rel" "$base"
  show_file "$TARGET_COMMIT" "$rel" "$target"
  mkdir -p "$(dirname "$merged")"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "PAIRING_V3_BASE:$rel" \
    -L "PAIRING_V4:$rel" \
    "$PMD_ROOT/$rel" "$base" "$target" > "$merged"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    out="$CONFLICT/$rel"
    mkdir -p "$(dirname "$out")"
    cp -f "$merged" "$out"
    fail "Merge conflict in $rel. Saved: $out"
  fi

  if grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    out="$CONFLICT/$rel"
    mkdir -p "$(dirname "$out")"
    cp -f "$merged" "$out"
    fail "Conflict markers found in $rel. Saved: $out"
  fi

  printf '[PMD Pairing V4] merged: %s\n' "$rel"
done

log "Validating staged PHP..."
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null \
    || fail "PHP syntax failed: ${phpfile#$STAGE/tree/}"
done < <(find "$STAGE/tree" -type f -name '*.php' -print0)

grep -q "pairExchangeSecret" \
  "$STAGE/tree/app/Services/PmdMobileSync/PmdMobilePairingService.php" \
  || fail "Deterministic PKCE exchange fallback missing."

grep -q "pair_request" \
  "$STAGE/tree/app/Http/Controllers/PmdMobilePairController.php" \
  || fail "Pair status controller contract missing."

grep -q "pair/status" \
  "$STAGE/tree/routes/pmd-mobile-sync-v1.php" \
  || fail "Pair polling route missing."

log "Installing validated V4 files atomically..."
for rel in "${FILES[@]}"; do
  src="$STAGE/tree/$rel"
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-pair-v4-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Post-install validation..."
for rel in "${FILES[@]}"; do
  php -l "$PMD_ROOT/$rel" >/dev/null \
    || fail "Post-install PHP syntax failed: $rel"
done

grep -q "pair/status" "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" \
  || fail "Pair status route missing after install."

log "Clearing caches..."
php artisan optimize:clear || warn "optimize:clear returned non-zero"
php artisan view:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
else
  warn "php8.3-fpm is not active/detected; reload your PHP-FPM service manually if needed."
fi

log "Verification:"
grep -n "pair/status" "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1
grep -n "pairExchangeSecret" "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -1
grep -n "pair_request" "$PMD_ROOT/app/Http/Controllers/PmdMobilePairController.php" | head -1

cat <<EOF

============================================================
PayMyDine Android Pairing V4 deployed.

Backup:
  $BACKUP
  $META

V4 behavior:
  - Browser security is still authoritative.
  - Android now has a PKCE-bound request id.
  - After browser approval, Android can recover the exchange by polling.
  - A blocked custom-scheme callback is no longer fatal.

No git reset --hard.
No global migrations.
============================================================
EOF
