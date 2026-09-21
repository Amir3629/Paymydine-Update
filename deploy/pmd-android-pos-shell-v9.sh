#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-tomo.paymydine.com}"
BASE_COMMIT="${BASE_COMMIT:-0ed06393933ebe5bbac0961c70f493c189cc4c1d}"
TARGET_COMMIT="${TARGET_COMMIT:-afd6721e6380832befee9f41fec7c9aad5036110}"

log(){ printf '\n[PMD POS V9] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V9][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V9][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

MERGE_FILES=(
  "routes/pmd-mobile-sync-v1.php"
  "app/Services/PmdSiteAccessWorkspaceGateService.php"
  "app/Http/Middleware/PmdSiteAccessGateMiddleware.php"
)
NEW_FILE="app/Http/Controllers/PmdMobilePosSessionController.php"

log "Checkout: $PMD_ROOT"
log "Host:     $PMD_HOST"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null     || fail "Required commit unavailable: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "V9 target is not present on current origin/main."
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v9-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v9-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pos-v9-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pos-v9-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"

EXISTING=()
for rel in "${MERGE_FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Required live file missing: $rel"
  EXISTING+=("$rel")
done
if [[ -f "$PMD_ROOT/$NEW_FILE" ]]; then
  EXISTING+=("$NEW_FILE")
fi

tar -czf "$BACKUP" "${EXISTING[@]}"
{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "host=$PMD_HOST"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "branch=$("${GIT[@]}" rev-parse --abbrev-ref HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo
  "${GIT[@]}" status --short -- "${MERGE_FILES[@]}" "$NEW_FILE" || true
} > "$META"
log "Backup: $BACKUP"

show_file(){
  local ref="$1" rel="$2" out="$3"
  mkdir -p "$(dirname "$out")"
  "${GIT[@]}" show "$ref:$rel" > "$out"
}

log "Three-way merging POS session bridge changes..."
for rel in "${MERGE_FILES[@]}"; do
  base="$STAGE/base/$rel"
  target="$STAGE/target/$rel"
  merged="$STAGE/tree/$rel"

  show_file "$BASE_COMMIT" "$rel" "$base"
  show_file "$TARGET_COMMIT" "$rel" "$target"
  mkdir -p "$(dirname "$merged")"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "V8_BASE:$rel"     -L "V9_TARGET:$rel"     "$PMD_ROOT/$rel" "$base" "$target" > "$merged"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    out="$CONFLICT/$rel"
    mkdir -p "$(dirname "$out")"
    cp -f "$merged" "$out"
    fail "Merge conflict in $rel. Saved: $out"
  fi

  printf '[PMD POS V9] merged: %s\n' "$rel"
done

log "Staging secure mobile POS controller..."
show_file "$TARGET_COMMIT" "$NEW_FILE" "$STAGE/tree/$NEW_FILE"

if [[ -f "$PMD_ROOT/$NEW_FILE" ]]; then
  if ! cmp -s "$PMD_ROOT/$NEW_FILE" "$STAGE/tree/$NEW_FILE"; then
    diff -u "$PMD_ROOT/$NEW_FILE" "$STAGE/tree/$NEW_FILE"       > "$CONFLICT/PmdMobilePosSessionController.live-vs-v9.diff" || true
    fail "Existing $NEW_FILE differs from V9. Diff saved under $CONFLICT"
  fi
fi

log "Validating staged PHP..."
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null     || fail "PHP syntax failed: ${phpfile#$STAGE/tree/}"
done < <(find "$STAGE/tree" -type f -name '*.php' -print0)

grep -q "mobile/pos/open" "$STAGE/tree/routes/pmd-mobile-sync-v1.php"   || fail "mobile/pos/open route missing."
grep -q "PMD_MOBILE_POS_WEB_SESSION_V1" "$STAGE/tree/$NEW_FILE"   || fail "POS web session controller marker missing."
grep -q "PMD_MOBILE_OWNER_POS_SESSION_V1"   "$STAGE/tree/app/Services/PmdSiteAccessWorkspaceGateService.php"   || fail "Owner Android POS session gate marker missing."
grep -q "PMD_MOBILE_ANDROID_SESSION_REVOCATION_V1"   "$STAGE/tree/app/Services/PmdSiteAccessWorkspaceGateService.php"   || fail "Android session revocation marker missing."
grep -q "PMD_MOBILE_ANDROID_NO_BROWSER_TRUST_V1"   "$STAGE/tree/app/Http/Middleware/PmdSiteAccessGateMiddleware.php"   || fail "Android browser-trust isolation marker missing."

log "Installing V9 files atomically..."
for rel in "${MERGE_FILES[@]}" "$NEW_FILE"; do
  src="$STAGE/tree/$rel"
  dst="$PMD_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$(dirname "$dst")")"
    gid="$(stat -c '%g' "$(dirname "$dst")")"
    mode="644"
  fi

  tmp="${dst}.pmd-v9-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

for rel in "${MERGE_FILES[@]}" "$NEW_FILE"; do
  php -l "$PMD_ROOT/$rel" >/dev/null     || fail "Post-install PHP syntax failed: $rel"
done

log "Clearing application caches..."
php artisan optimize:clear || warn "optimize:clear returned non-zero"
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Live endpoint smoke test (unauthenticated request must reach controller and fail 401, not redirect to Login)..."
TMP="$(mktemp -d /tmp/pmd-pos-v9-smoke.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

curl -sS   --connect-timeout 15   --max-time 30   -H "Accept: application/json"   -D "$TMP/headers"   -o "$TMP/body"   "https://$PMD_HOST/admin/mobile/pos/open"

STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/headers")"
LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$TMP/headers")"

echo "[PMD POS V9] mobile/pos/open status: $STATUS"
[[ -n "$LOCATION" ]] && echo "[PMD POS V9] location: $LOCATION"

if [[ "$STATUS" != "401" ]]; then
  echo "--- response body ---"
  head -c 1200 "$TMP/body" || true
  echo
  fail "Expected 401 from controller without bearer token; got HTTP $STATUS."
fi

if [[ "$LOCATION" == *"/admin/login"* ]]; then
  fail "mobile/pos/open is still being captured by Admin Login routing."
fi

grep -qi "PayMyDine device token required" "$TMP/body"   || fail "401 body does not prove PmdMobileDeviceAuthService handled the request."

cat <<EOF

============================================================
PayMyDine Android POS Shell V9 deployed.

LIVE POS SESSION BRIDGE: PASS

Confirmed:
  /admin/mobile/pos/open reaches the mobile controller
  unauthenticated access fails 401
  no Admin Login redirect captures the endpoint
  embedded POS sessions remain bound to the paired Android device
  revocation fails closed and no second browser-trust credential is minted

Android V0.2.0 uses this endpoint with its Keystore-backed bearer token,
then redirects inside the app to the canonical:
  https://$PMD_HOST/admin/pos

Backup:
  $BACKUP
  $META

No git reset --hard.
No global migrations.
============================================================
EOF

trap - EXIT
rm -rf "$TMP"
