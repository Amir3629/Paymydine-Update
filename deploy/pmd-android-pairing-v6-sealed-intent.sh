#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-884454f94b00c5254ad5104f3180e8c11bfb531c}"
TARGET_COMMIT="${TARGET_COMMIT:-1a537c49f218f7eb5e431de7dc0d704c02da60b9}"

log(){ printf '\n[PMD Pairing V6] %s\n' "$*"; }
warn(){ printf '\n[PMD Pairing V6][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD Pairing V6][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

FILES=(
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/admin/controllers/Login.php"
)

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null     || fail "Required commit unavailable: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "V6 target is not present on current origin/main."
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pairing-v6-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pairing-v6-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pairing-v6-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pairing-v6-before-$STAMP.txt"

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
  echo "git_status_before:"
  "${GIT[@]}" status --short -- "${FILES[@]}" || true
} > "$META"

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Required live file missing: $rel"
done
tar -czf "$BACKUP" "${FILES[@]}"
log "Backup: $BACKUP"

show_file(){
  local ref="$1" rel="$2" out="$3"
  mkdir -p "$(dirname "$out")"
  "${GIT[@]}" show "$ref:$rel" > "$out"
}

log "Three-way merging sealed pairing intent fix..."
for rel in "${FILES[@]}"; do
  base="$STAGE/base/$rel"
  target="$STAGE/target/$rel"
  merged="$STAGE/tree/$rel"

  show_file "$BASE_COMMIT" "$rel" "$base"
  show_file "$TARGET_COMMIT" "$rel" "$target"
  mkdir -p "$(dirname "$merged")"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "V5_BASE:$rel"     -L "V6_TARGET:$rel"     "$PMD_ROOT/$rel" "$base" "$target" > "$merged"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    out="$CONFLICT/$rel"
    mkdir -p "$(dirname "$out")"
    cp -f "$merged" "$out"
    fail "Merge conflict in $rel. Saved: $out"
  fi

  printf '[PMD Pairing V6] merged: %s\n' "$rel"
done

log "Validating staged PHP..."
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null     || fail "PHP syntax failed: ${phpfile#$STAGE/tree/}"
done < <(find "$STAGE/tree" -type f -name '*.php' -print0)

PAIRING="$STAGE/tree/app/Services/PmdMobileSync/PmdMobilePairingService.php"
LOGIN="$STAGE/tree/app/admin/controllers/Login.php"

grep -q "PMD_MOBILE_PAIR_SEALED_INTENT_V2" "$PAIRING"   || fail "Sealed pairing intent marker missing."
grep -q "pmd_mobile_pair_intent_v2" "$PAIRING"   || fail "Encrypted pairing cookie name missing."
grep -q "queueIntentCookie" "$PAIRING"   || fail "Encrypted pairing cookie writer missing."
grep -q "PMD_MOBILE_PAIR_PREAUTH_RESUME_V2" "$LOGIN"   || fail "Pre-auth pairing destination capture missing."

log "Installing two validated V6 files atomically..."
for rel in "${FILES[@]}"; do
  src="$STAGE/tree/$rel"
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v6-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

for rel in "${FILES[@]}"; do
  php -l "$PMD_ROOT/$rel" >/dev/null     || fail "Post-install PHP syntax failed: $rel"
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
fi

log "Verification:"
grep -n "PMD_MOBILE_PAIR_SEALED_INTENT_V2"   "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -1
grep -n "INTENT_COOKIE"   "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -2
grep -n "PMD_MOBILE_PAIR_PREAUTH_RESUME_V2"   "$PMD_ROOT/app/admin/controllers/Login.php" | head -1

cat <<EOF

============================================================
PayMyDine Android Pairing V6 deployed.

What V6 fixes:
  - /mobile/pair/start stores the PKCE pairing destination in:
      1) Laravel session
      2) encrypted + HttpOnly + Secure + host-only 15-minute cookie
  - Login captures pairing intent BEFORE authentication/session rotation.
  - If the normal session loses the intent, Login restores it from the
    encrypted cookie and continues to Android pairing instead of Dashboard.

Backup:
  $BACKUP
  $META

No git reset --hard.
No global migrations.
No authentication bypass.
============================================================
EOF
