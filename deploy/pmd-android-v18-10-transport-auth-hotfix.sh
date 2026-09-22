#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-e0f657327d4e5bbb97d6faa8d826cfe3f53382ff}"
TARGET_COMMIT="${TARGET_COMMIT:-d2f085d0cdb00e387c1549c2bdb77238e293184c}"

REL="app/admin/Services/PmdDefaultStaffRoleService.php"

log(){ printf '\n[PMD V18.10 ANDROID TRANSPORT AUTH] %s\n' "$*"; }
warn(){ printf '\n[PMD V18.10 ANDROID TRANSPORT AUTH][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD V18.10 ANDROID TRANSPORT AUTH][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/$REL" ]] || fail "Default staff role service is missing."

for cmd in git php tar stat grep; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

# Forward-only: verify V18.8 + V18.9 are already live.
grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobilePosSessionController.php" \
  || fail "V18.8 POS location authority is not installed."
grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "V18.8 workspace location authority is not installed."
grep -q "PMD_ANDROID_PAIRED_DEVICE_PASSWORD_LOGIN_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "V18.9 paired staff login is not installed."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v1810-android-transport-auth-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1810-android-transport-auth-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v1810-transport-auth-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1810-transport-auth-before-$STAMP.txt"

mkdir -p \
  "$BACKUP_DIR" \
  "$STAGE/base/$(dirname "$REL")" \
  "$STAGE/target/$(dirname "$REL")" \
  "$STAGE/candidate/$(dirname "$REL")" \
  "$CONFLICT/$(dirname "$REL")"

log "Backing up current role-boundary service..."
tar -czf "$BACKUP" "$REL"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo
  "${GIT[@]}" status --short -- "$REL" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected three-way merge candidate..."

"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$STAGE/base/$REL" \
  || fail "Base role service missing from $BASE_COMMIT."
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$STAGE/target/$REL" \
  || fail "Target role service missing from $TARGET_COMMIT."

set +e
git merge-file -p --diff3 \
  -L "LIVE:$REL" \
  -L "BASE:$REL" \
  -L "V18.10:$REL" \
  "$PMD_ROOT/$REL" \
  "$STAGE/base/$REL" \
  "$STAGE/target/$REL" \
  > "$STAGE/candidate/$REL"
rc=$?
set -e

if [[ $rc -ne 0 ]] \
  || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$REL"; then
  cp -f "$STAGE/candidate/$REL" "$CONFLICT/$REL"
  fail "Merge conflict. No V18.10 file was installed. Candidate: $CONFLICT/$REL"
fi

ROLE="$STAGE/candidate/$REL"

log "Validating Android transport boundary contract..."

grep -q "PMD_ANDROID_AUTHENTICATED_TRANSPORT_V14" "$ROLE" \
  || fail "Android transport marker missing."
grep -q "admin/mobile/pos/open" "$ROLE" \
  || fail "POS transport route allowance missing."
grep -q "admin/mobile/workspace/open" "$ROLE" \
  || fail "Workspace transport route allowance missing."
grep -q "admin/api/mobile/v1/" "$ROLE" \
  || fail "Mobile API transport allowance missing."

# Existing role isolation must remain intact.
grep -q "self::CASHIER || \$code === self::WAITER" "$ROLE" \
  || fail "Cashier/Waiter route isolation was lost."
grep -q "if (\$code === self::ACCOUNTANT)" "$ROLE" \
  || fail "Accountant route isolation was lost."
grep -q "if (\$code === self::RESERVATIONS)" "$ROLE" \
  || fail "Reservations route isolation was lost."
grep -q "str_starts_with(\$code, self::KDS_PREFIX)" "$ROLE" \
  || fail "KDS station route isolation was lost."

# Permission definitions must still exist; transport allowance does not grant
# capabilities by itself. Users_model continues into PermissionManager after
# mayOpenPath() returns true.
grep -q "'Admin.Orders' => 1" "$ROLE" \
  || fail "POS permission definitions are missing."
grep -q "'Admin.Reservations' => 1" "$ROLE" \
  || fail "Reservations permission definition is missing."
grep -q "'Admin.KitchenDisplay' => 1" "$ROLE" \
  || fail "KDS permission definition is missing."

php -l "$ROLE" >/dev/null \
  || fail "PHP syntax failed in staged role-boundary service."

cat > "$STAGE/transport-matrix.php" <<'PHP'
<?php
require $argv[1];

$roles = new \Admin\Services\PmdDefaultStaffRoleService();

$tests = [
    ['pmd-cashier', 'admin/mobile/pos/open', true],
    ['pmd-waiter', 'admin/mobile/pos/open', true],
    ['pmd-reservations', 'admin/mobile/workspace/open', true],
    ['pmd-kds:grill', 'admin/api/mobile/v1/kds/snapshot', true],
    ['pmd-kds:grill', 'admin/api/mobile/v1/sync/commands', true],
    ['pmd-accountant', 'admin/mobile/workspace/open', true],
    ['pmd-manager', 'admin/mobile/workspace/open', true],

    // Product-workspace isolation must remain closed.
    ['pmd-cashier', 'admin/managerdashboard', false],
    ['pmd-kds:grill', 'admin/pos', false],
    ['pmd-reservations', 'admin/pos', false],

    // Canonical destinations must still work.
    ['pmd-accountant', 'admin/accountantdashboard', true],
    ['pmd-team-member', 'admin/mywork', true],
    ['pmd-sonstige', 'admin/mywork', true],
    ['pmd-kds:grill', 'admin/kitchendisplay/grill', true],
];

$failed = 0;
foreach ($tests as [$role, $path, $expected]) {
    $actual = $roles->mayOpenPath($role, $path);
    printf(
        "%-20s %-44s actual=%-5s expected=%s\n",
        $role,
        $path,
        $actual ? 'true' : 'false',
        $expected ? 'true' : 'false'
    );
    if ($actual !== $expected) {
        $failed++;
    }
}

if ($failed > 0) {
    fwrite(STDERR, "Role transport matrix failed: ".$failed." mismatch(es).\n");
    exit(1);
}
PHP

log "Running staged role/transport matrix..."
php "$STAGE/transport-matrix.php" "$ROLE" \
  || fail "Staged Android transport/role matrix failed."

log "Installing validated V18.10 role-boundary service..."
dst="$PMD_ROOT/$REL"
uid="$(stat -c '%u' "$dst")"
gid="$(stat -c '%g' "$dst")"
mode="$(stat -c '%a' "$dst")"

tmp="${dst}.pmd-v1810-new"
cp -f "$ROLE" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$dst"

log "Clearing Laravel/TastyIgniter caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Running live role/transport matrix..."
php "$STAGE/transport-matrix.php" "$PMD_ROOT/$REL" \
  || fail "Live Android transport/role matrix failed after installation."

log "Verification:"
grep -n "PMD_ANDROID_AUTHENTICATED_TRANSPORT_V14" "$PMD_ROOT/$REL" | head -1
php -l "$PMD_ROOT/$REL"

cat <<EOF

============================================================
PayMyDine Android V18.10 transport authorization hotfix deployed.

Root cause fixed:
  - Managed PayMyDine roles use a route boundary inside hasPermission().
  - Android checked legitimate permissions while request()->path() was a
    transport URL such as /admin/mobile/pos/open or /admin/api/mobile/v1/...
  - The route boundary rejected those transport URLs before the real stored
    permission could be evaluated.
  - Superuser/Admin bypassed that boundary, which is why Admin worked while
    Cashier / Waiter / KDS / Reservations returned HTTP 403.

V18.10 behavior:
  - Authenticated Android transport URLs may reach normal PermissionManager.
  - Transport access itself grants NO role permission.
  - Cashier/Waiter still require Admin.Orders.
  - KDS still requires Admin.KitchenDisplay.
  - Reservations still requires Admin.Reservations.
  - Product workspace route isolation remains enforced.

Verified before + after install:
  - Cashier -> mobile POS transport: PASS
  - Waiter -> mobile POS transport: PASS
  - Reservations -> mobile workspace transport: PASS
  - KDS -> snapshot/sync transport: PASS
  - Accountant/Manager -> mobile workspace transport: PASS
  - Cashier -> Manager Dashboard: BLOCKED
  - KDS -> POS: BLOCKED
  - Reservations -> POS: BLOCKED
  - Accountant -> Accountant Dashboard: PASS
  - Team Member/Sonstige -> My Work: PASS
  - KDS -> assigned station: PASS

Unchanged:
  - Android APK remains 0.3.5.
  - V18.8 location authority remains active.
  - V18.9 username/password login remains active.
  - No database migration.
  - No pairing reset.
  - No Android Clear Data.
  - No payment change.
  - No git reset --hard.

Backup:
  $BACKUP
  $META
============================================================
EOF
