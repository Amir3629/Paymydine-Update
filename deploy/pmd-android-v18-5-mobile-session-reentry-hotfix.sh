#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-51738636165ae99d69cebe95ad9d808b5531c46f}"
TARGET_COMMIT="${TARGET_COMMIT:-4e9501478ebc7bdf0ef862bddbc139e236d502e7}"
REL="app/Services/PmdSiteAccessWorkspaceGateService.php"

log(){ printf '\n[PMD V18.5 SESSION REENTRY FIX] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.5 SESSION REENTRY FIX][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git php tar grep stat sed; do
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

[[ -f "$PMD_ROOT/$REL" ]] || fail "Live Workspace Gate is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v185-session-reentry-$STAMP"
BACKUP="$BACKUP_DIR/android-v185-session-reentry-before-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR" "$STAGE"
tar -czf "$BACKUP" "$REL"
log "Backup: $BACKUP"

"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$STAGE/base.php"
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$STAGE/target.php"

set +e
git merge-file -p --diff3 \
  -L "LIVE:$REL" \
  -L "BASE:$REL" \
  -L "V18.5:$REL" \
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

php -l "$STAGE/candidate.php" >/dev/null \
  || fail "PHP syntax failed."

log "Validating mobile session re-entry contract..."
grep -q "PMD_MOBILE_SESSION_REENTRY_BYPASS_V5" "$STAGE/candidate.php" \
  || fail "Mobile session re-entry marker missing."
grep -q "\$relative === 'mobile/pos/open'" "$STAGE/candidate.php" \
  || fail "POS mobile re-entry bypass missing."
grep -q "\$relative === 'mobile/workspace/open'" "$STAGE/candidate.php" \
  || fail "Role workspace mobile re-entry bypass missing."
grep -q "PMD_MOBILE_SHARED_DEVICE_REVOCATION_V2" "$STAGE/candidate.php" \
  || fail "V18.4 shared-device revocation fix is missing."
grep -q "PMD_MOBILE_OWNER_DEVICE_PROOF_V3" "$STAGE/candidate.php" \
  || fail "Owner security guard is missing."

# Make sure only the authenticated mobile session bootstrap endpoints are
# bypassed. Do not accidentally bypass the actual POS/workspace pages.
block="$STAGE/reentry-block.txt"
sed -n '/PMD_MOBILE_SESSION_REENTRY_BYPASS_V5/,/PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1/p' \
  "$STAGE/candidate.php" > "$block"
if grep -qE "relative === '(pos|pos/waiter|reservations|owner|manager)'" "$block"; then
  fail "Unsafe workspace bypass detected."
fi

log "Installing V18.5 Workspace Gate..."
uid="$(stat -c '%u' "$PMD_ROOT/$REL")"
gid="$(stat -c '%g' "$PMD_ROOT/$REL")"
mode="$(stat -c '%a' "$PMD_ROOT/$REL")"
tmp="$PMD_ROOT/$REL.pmd-v185-new"
cp -f "$STAGE/candidate.php" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$PMD_ROOT/$REL"

log "Clearing caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_MOBILE_SESSION_REENTRY_BYPASS_V5" "$PMD_ROOT/$REL" | head -1
grep -n "mobile/pos/open" "$PMD_ROOT/$REL" | head -1
grep -n "mobile/workspace/open" "$PMD_ROOT/$REL" | head -1
grep -n "PMD_MOBILE_SHARED_DEVICE_REVOCATION_V2" "$PMD_ROOT/$REL" | head -1

cat <<EOF

============================================================
PayMyDine Android V18.5 session re-entry fix deployed.

Root cause:
  The Android WebView could carry an OLD Admin session cookie.
  Workspace Gate evaluated that stale session BEFORE /mobile/pos/open
  reached its bearer-authenticated controller, so the controller never got
  a chance to replace the stale session with the new signed-in staff session.

Fix:
  - /admin/mobile/pos/open may reach its own bearer-auth controller
  - /admin/mobile/workspace/open may reach its own bearer-auth controller
  - actual POS/workspace pages are NOT bypassed
  - bearer token, Staff Grant, role, location and permissions remain verified
  - V18.4 shared-device revocation checks remain active after session creation

No APK reinstall required.
No database changes.
No pairing reset.
No Clear Data.

Backup:
  $BACKUP
============================================================
EOF
