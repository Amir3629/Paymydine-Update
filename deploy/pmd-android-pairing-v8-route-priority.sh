#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-tomo.paymydine.com}"
BASE_COMMIT="${BASE_COMMIT:-ed0f018569d6033bf39f0bed0b35ef5f8256330c}"
TARGET_COMMIT="${TARGET_COMMIT:-fb968f70caf80a06ceb84a4397d250e0562c0090}"

log(){ printf '\n[PMD Pairing V8] %s\n' "$*"; }
warn(){ printf '\n[PMD Pairing V8][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD Pairing V8][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

FILES=(
  "routes.php"
  "routes/pmd-mobile-sync-v1.php"
)

log "Checkout: $PMD_ROOT"
log "Host:     $PMD_HOST"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null     || fail "Required commit unavailable: $ref"
done

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "V8 target is not present on current origin/main."
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pairing-v8-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pairing-v8-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pairing-v8-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pairing-v8-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"

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

log "Three-way merging early route registration..."
for rel in "${FILES[@]}"; do
  base="$STAGE/base/$rel"
  target="$STAGE/target/$rel"
  merged="$STAGE/tree/$rel"

  show_file "$BASE_COMMIT" "$rel" "$base"
  show_file "$TARGET_COMMIT" "$rel" "$target"
  mkdir -p "$(dirname "$merged")"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "V7_BASE:$rel"     -L "V8_TARGET:$rel"     "$PMD_ROOT/$rel" "$base" "$target" > "$merged"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$merged"; then
    out="$CONFLICT/$rel"
    mkdir -p "$(dirname "$out")"
    cp -f "$merged" "$out"
    fail "Merge conflict in $rel. Saved: $out"
  fi

  printf '[PMD Pairing V8] merged: %s\n' "$rel"
done

log "Validating staged PHP..."
php -l "$STAGE/tree/routes.php" >/dev/null   || fail "PHP syntax failed: routes.php"
php -l "$STAGE/tree/routes/pmd-mobile-sync-v1.php" >/dev/null   || fail "PHP syntax failed: routes/pmd-mobile-sync-v1.php"

grep -q "PMD_MOBILE_SYNC_EARLY_ROOT_LOADER_V8" "$STAGE/tree/routes.php"   || fail "Root early-loader marker missing."
grep -q "PMD_MOBILE_SYNC_DIRECT_REGISTER_V8" "$STAGE/tree/routes/pmd-mobile-sync-v1.php"   || fail "Direct route registration marker missing."
if grep -q "App::before(function" "$STAGE/tree/routes/pmd-mobile-sync-v1.php"; then
  fail "Mobile route file is still deferred through App::before()."
fi

log "Installing validated V8 route files atomically..."
for rel in "${FILES[@]}"; do
  src="$STAGE/tree/$rel"
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v8-new"
  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

php -l "$PMD_ROOT/routes.php" >/dev/null   || fail "Post-install PHP syntax failed: routes.php"
php -l "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" >/dev/null   || fail "Post-install PHP syntax failed: mobile routes"

log "Clearing route/application caches..."
php artisan optimize:clear || warn "optimize:clear returned non-zero"
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Deployed markers:"
grep -n "PMD_MOBILE_SYNC_EARLY_ROOT_LOADER_V8" "$PMD_ROOT/routes.php" | head -1
grep -n "PMD_MOBILE_SYNC_DIRECT_REGISTER_V8" "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1

log "Running live first-hop smoke test against $PMD_HOST..."
REQ="$(cat /proc/sys/kernel/random/uuid)"
CHALLENGE="$(printf 'A%.0s' {1..43})"
TMP="$(mktemp -d /tmp/pmd-v8-smoke.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

START="https://$PMD_HOST/admin/mobile/pair/start?code_challenge=$CHALLENGE&pair_request=$REQ"

curl -sS   --connect-timeout 15   --max-time 30   -c "$TMP/cookies.txt"   -D "$TMP/start.headers"   -o "$TMP/start.body"   "$START"

STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/start.headers")"
LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$TMP/start.headers")"

echo "[PMD Pairing V8] pair/start status: $STATUS"
if [[ "$LOCATION" == *"pmd_pair="* ]]; then
  echo "[PMD Pairing V8] pair/start location: <login with signed pmd_pair>"
else
  echo "[PMD Pairing V8] pair/start location: $LOCATION"
fi

[[ "$STATUS" == "302" ]]   || fail "Live pair/start returned HTTP $STATUS instead of 302."

[[ "$LOCATION" == *"/admin/login?pmd_pair="* ]]   || fail "Live pair/start still bypasses PmdMobilePairController (missing signed pmd_pair redirect)."

grep -qi 'pmd_mobile_pair_intent_v2=' "$TMP/start.headers"   || fail "Live pair/start did not set encrypted pairing intent cookie."

curl -sS   --connect-timeout 15   --max-time 30   -b "$TMP/cookies.txt"   -c "$TMP/cookies.txt"   -D "$TMP/login.headers"   -o "$TMP/login.html"   "$LOCATION"

LOGIN_STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/login.headers")"
[[ "$LOGIN_STATUS" == "200" ]]   || fail "Signed Login page returned HTTP $LOGIN_STATUS."

grep -q "PMD_MOBILE_PAIR_SIGNED_LOGIN_FORM_V3" "$TMP/login.html"   || fail "Live Login page is not rendering the V7 signed-handoff view."

grep -Eq 'name=["'\'' ]*pmd_pair["'\'' ]*' "$TMP/login.html"   || fail "Live Login form is missing hidden pmd_pair."

cat <<EOF

============================================================
PayMyDine Android Pairing V8 deployed and LIVE smoke-tested.

LIVE FIRST-HOP: PASS

Confirmed on:
  https://$PMD_HOST

The production request now reaches PmdMobilePairController before
the Admin catch-all/auth redirect, and the signed handoff reaches
the real Login form.

Backup:
  $BACKUP
  $META

No git reset --hard.
No global migrations.
No authentication bypass.
============================================================
EOF

trap - EXIT
rm -rf "$TMP"
