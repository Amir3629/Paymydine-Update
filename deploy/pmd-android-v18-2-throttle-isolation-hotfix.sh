#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-87254f01f9a66ab06b479b379b052d48f57f13df}"
TARGET_COMMIT="${TARGET_COMMIT:-18dcfb28ac12649662367c2af6e556451aea4036}"
REL="routes/pmd-mobile-sync-v1.php"

log(){ printf '\n[PMD V18.2 THROTTLE FIX] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.2 THROTTLE FIX][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git php tar grep; do
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

[[ -f "$PMD_ROOT/$REL" ]] || fail "Live mobile routes file is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v182-throttle-$STAMP"
BACKUP="$BACKUP_DIR/android-v182-mobile-routes-before-$STAMP.tar.gz"
mkdir -p "$BACKUP_DIR" "$STAGE"

tar -czf "$BACKUP" "$REL"
log "Backup: $BACKUP"

"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$STAGE/base.php"
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$STAGE/target.php"

set +e
git merge-file -p --diff3 \
  -L "LIVE:$REL" \
  -L "BASE:$REL" \
  -L "V18.2:$REL" \
  "$PMD_ROOT/$REL" \
  "$STAGE/base.php" \
  "$STAGE/target.php" \
  > "$STAGE/candidate.php"
rc=$?
set -e

if [[ $rc -ne 0 ]] \
  || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate.php"; then
  fail "Three-way merge conflict. Live file was NOT changed. Candidate: $STAGE/candidate.php"
fi

log "Validating isolated throttle buckets..."
grep -q "throttle:60,1,pmd-mobile-pair-status" "$STAGE/candidate.php" \
  || fail "pair/status throttle prefix missing."
grep -q "throttle:30,1,pmd-mobile-pair-exchange" "$STAGE/candidate.php" \
  || fail "pair/exchange throttle prefix missing."
grep -q "throttle:20,1,pmd-mobile-staff-login" "$STAGE/candidate.php" \
  || fail "staff login throttle prefix missing."
grep -q "throttle:30,1,pmd-mobile-pos-open" "$STAGE/candidate.php" \
  || fail "POS open throttle prefix missing."
grep -q "throttle:30,1,pmd-mobile-workspace-open" "$STAGE/candidate.php" \
  || fail "workspace open throttle prefix missing."

php -l "$STAGE/candidate.php" >/dev/null \
  || fail "PHP syntax check failed."

uid="$(stat -c '%u' "$PMD_ROOT/$REL")"
gid="$(stat -c '%g' "$PMD_ROOT/$REL")"
mode="$(stat -c '%a' "$PMD_ROOT/$REL")"
tmp="$PMD_ROOT/$REL.pmd-v182-new"
cp -f "$STAGE/candidate.php" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$PMD_ROOT/$REL"

log "Clearing route/application caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "pmd-mobile-pair-status" "$PMD_ROOT/$REL"
grep -n "pmd-mobile-pair-exchange" "$PMD_ROOT/$REL"
grep -n "pmd-mobile-staff-login" "$PMD_ROOT/$REL"
grep -n "pmd-mobile-pos-open" "$PMD_ROOT/$REL"
grep -n "pmd-mobile-workspace-open" "$PMD_ROOT/$REL"

cat <<EOF

============================================================
PayMyDine Android V18.2 throttle isolation deployed.

Why HTTP 429 happened:
  pairing status polling, pairing exchange, staff login and workspace open
  shared the same Laravel/IP rate-limit counter.

What changed:
  each Android mobile endpoint now has an independent throttle prefix.

No APK reinstall required.
No database changes.
No pairing/device data changes.

Backup:
  $BACKUP
============================================================
EOF
