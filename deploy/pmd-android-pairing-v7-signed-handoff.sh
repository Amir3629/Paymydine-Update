#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-6cff8bfaeb1788838dc83639619d5901bfcf7842}"
TARGET_COMMIT="${TARGET_COMMIT:-1805cd559829185bed874d710a036560f5a4c179}"

log(){ printf '\n[PMD Pairing V7] %s\n' "$*"; }
warn(){ printf '\n[PMD Pairing V7][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD Pairing V7][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

FILES=(
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Http/Controllers/PmdMobilePairController.php"
  "app/admin/controllers/Login.php"
  "app/admin/views/auth/login_workplace_v4.blade.php"
)

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null     || fail "Required commit unavailable: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "V7 target is not present on current origin/main."
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pairing-v7-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pairing-v7-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pairing-v7-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pairing-v7-before-$STAMP.txt"

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

log "Three-way merging V7 into current dirty live files..."
for rel in "${FILES[@]}"; do
  base="$STAGE/base/$rel"
  target="$STAGE/target/$rel"
  merged="$STAGE/tree/$rel"

  show_file "$BASE_COMMIT" "$rel" "$base"
  show_file "$TARGET_COMMIT" "$rel" "$target"
  mkdir -p "$(dirname "$merged")"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "V6_BASE:$rel"     -L "V7_TARGET:$rel"     "$PMD_ROOT/$rel" "$base" "$target" > "$merged"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    out="$CONFLICT/$rel"
    mkdir -p "$(dirname "$out")"
    cp -f "$merged" "$out"
    fail "Merge conflict in $rel. Saved: $out"
  fi

  printf '[PMD Pairing V7] merged: %s\n' "$rel"
done

log "Validating staged PHP controllers/services..."
for rel in   "app/Services/PmdMobileSync/PmdMobilePairingService.php"   "app/Http/Controllers/PmdMobilePairController.php"   "app/admin/controllers/Login.php"
do
  php -l "$STAGE/tree/$rel" >/dev/null     || fail "PHP syntax failed: $rel"
done

PAIRING="$STAGE/tree/app/Services/PmdMobileSync/PmdMobilePairingService.php"
PAIR_CONTROLLER="$STAGE/tree/app/Http/Controllers/PmdMobilePairController.php"
LOGIN="$STAGE/tree/app/admin/controllers/Login.php"
VIEW="$STAGE/tree/app/admin/views/auth/login_workplace_v4.blade.php"

grep -q "PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3" "$PAIRING"   || fail "Signed handoff service marker missing."
grep -q "HANDOFF_PARAM" "$PAIRING"   || fail "Signed handoff parameter missing."
grep -q "loginUrl" "$PAIR_CONTROLLER"   || fail "Pair controller login handoff missing."
grep -q "PMD_MOBILE_PAIR_SIGNED_LOGIN_RESTORE_V3" "$LOGIN"   || fail "Login signed restore marker missing."
grep -q "PMD_MOBILE_PAIR_SIGNED_LOGIN_FORM_V3" "$VIEW"   || fail "Login form hidden handoff marker missing."

log "Installing four validated V7 files atomically..."
for rel in "${FILES[@]}"; do
  src="$STAGE/tree/$rel"
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v7-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

for rel in   "app/Services/PmdMobileSync/PmdMobilePairingService.php"   "app/Http/Controllers/PmdMobilePairController.php"   "app/admin/controllers/Login.php"
do
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
grep -n "PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3"   "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -1
grep -n "PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3"   "$PMD_ROOT/app/Http/Controllers/PmdMobilePairController.php" | head -1
grep -n "PMD_MOBILE_PAIR_SIGNED_LOGIN_RESTORE_V3"   "$PMD_ROOT/app/admin/controllers/Login.php" | head -1
grep -n "PMD_MOBILE_PAIR_SIGNED_LOGIN_FORM_V3"   "$PMD_ROOT/app/admin/views/auth/login_workplace_v4.blade.php" | head -1

cat <<EOF

============================================================
PayMyDine Android Pairing V7 deployed.

V7 removes first-login dependence on session/cookie continuity:

  Android pair/start
    -> signed 15-minute pmd_pair handoff
    -> /admin/login?pmd_pair=...
    -> hidden pmd_pair field survives AJAX Login POST
    -> Login verifies HMAC + tenant host + age + PKCE/request format
    -> canonical Password/MFA/Site Access remains required
    -> pairing resumes instead of role dashboard

The handoff contains no password, no TOTP, no device token, and no PKCE verifier.

Backup:
  $BACKUP
  $META

No git reset --hard.
No global migrations.
No authentication bypass.
============================================================
EOF
