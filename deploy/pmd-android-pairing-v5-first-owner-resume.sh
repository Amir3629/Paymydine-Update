#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-b0f3d5b386081ce933777c7573b19cfcb8cfddff}"
TARGET_COMMIT="${TARGET_COMMIT:-52079f0d4f47907a842960214525bc619f020b7b}"
REL="app/Http/Controllers/PmdFirstWorkplaceDeviceController.php"

log(){ printf '\n[PMD Pairing V5] %s\n' "$*"; }
warn(){ printf '\n[PMD Pairing V5][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD Pairing V5][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/$REL" ]] || fail "Missing live file: $PMD_ROOT/$REL"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null || fail "Missing commit: $ref"
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pairing-v5-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pairing-v5-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pairing-v5-before-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"
tar -czf "$BACKUP" "$REL"
log "Backup: $BACKUP"

BASE="$STAGE/base.php"
TARGET="$STAGE/target.php"
MERGED="$STAGE/merged.php"

"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$BASE"
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$TARGET"

log "Three-way merging first-Owner pairing resume fix..."
set +e
git merge-file -p --diff3   -L "LIVE:$REL"   -L "V4_BASE:$REL"   -L "V5_TARGET:$REL"   "$PMD_ROOT/$REL" "$BASE" "$TARGET" > "$MERGED"
rc=$?
set -e

if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$MERGED"; then
  cp -f "$MERGED" "$CONFLICT/PmdFirstWorkplaceDeviceController.php"
  fail "Merge conflict. Saved: $CONFLICT/PmdFirstWorkplaceDeviceController.php"
fi

php -l "$MERGED" >/dev/null || fail "PHP syntax validation failed."

grep -q "PMD_MOBILE_PAIR_FIRST_OWNER_RESUME_V1" "$MERGED"   || fail "V5 pairing resume marker missing."

uid="$(stat -c '%u' "$PMD_ROOT/$REL")"
gid="$(stat -c '%g' "$PMD_ROOT/$REL")"
mode="$(stat -c '%a' "$PMD_ROOT/$REL")"
tmp="$PMD_ROOT/${REL}.pmd-v5-new"

cp -f "$MERGED" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$PMD_ROOT/$REL"

php -l "$PMD_ROOT/$REL" >/dev/null || fail "Post-install syntax validation failed."

log "Clearing caches..."
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
grep -n "PMD_MOBILE_PAIR_FIRST_OWNER_RESUME_V1" "$PMD_ROOT/$REL" | head -1
grep -n "mobile/pair/start" "$PMD_ROOT/$REL" | head -1

cat <<EOF

============================================================
PayMyDine Android Pairing V5 deployed.

What V5 fixes:
  - Owner starts Android pairing on a restaurant with no Site Access hub yet.
  - Owner completes password + Authenticator security.
  - Browser becomes the first restaurant security device.
  - Instead of dropping to the role dashboard, flow resumes at:
      /admin/mobile/pair/start
  - Browser then shows:
      Connect this Android device?

Backup:
  $BACKUP

No git reset --hard.
No global migrations.
============================================================
EOF
