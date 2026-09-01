#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/SuperAdminR2Controller.php"
GATE="app/Services/PmdSiteAccessWorkspaceGateService.php"
VIEW="app/admin/views/superadmin_r2/restaurants.blade.php"
NEW_SERVICE="app/Services/PmdSuperAdminOwnerMfaResetService.php"
OLD_SERVICE="app/Services/PmdSuperAdminOwnerPortalMfaResetService.php"
OWNER_TOTP="app/Services/PmdOwnerTotpService.php"

BACKUP="/tmp/pmd-superadmin-owner-mfa-v18b-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-superadmin-owner-mfa-v18b.XXXXXX)"
APPLY_STARTED=0
NEW_SERVICE_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK SUPERADMIN OWNER MFA V18B"
        set +e

        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$GATE" "$GATE"
        sudo cp -a "$BACKUP/$VIEW" "$VIEW"

        if [ "$NEW_SERVICE_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_SERVICE" "$NEW_SERVICE"
        else
            sudo rm -f "$NEW_SERVICE"
        fi

        echo "ROLLBACK COMPLETE"
        echo "Backup kept at: $BACKUP"
    fi

    rm -rf "$TMPROOT"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

for path in "$CONTROLLER" "$GATE" "$VIEW" "$OLD_SERVICE" "$OWNER_TOTP"; do
    test -f "$path" || { echo "STOP: missing $path"; exit 20; }
done

grep -Fq "PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1" "$CONTROLLER" || {
    echo "STOP: V18 SuperAdmin reset controller is not installed"
    exit 21
}
grep -Fq "PmdSuperAdminOwnerPortalMfaResetService" "$CONTROLLER" || {
    if grep -Fq "PmdSuperAdminOwnerMfaResetService" "$CONTROLLER" \
       && grep -Fq "PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B" "$GATE" \
       && test -f "$NEW_SERVICE"; then
        echo "V18B is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: unexpected/mixed SuperAdmin Owner MFA controller state"
    exit 22
}
grep -Fq "Reset Owner MFA" "$VIEW" || { echo "STOP: Reset Owner MFA button missing"; exit 23; }
grep -Fq "class PmdSiteAccessWorkspaceGateService" "$GATE" || { echo "STOP: workspace gate authority missing"; exit 24; }
grep -Fq "PmdOwnerTotpService::SESSION_VERIFIED" "$OWNER_TOTP" || {
    grep -Fq "public const SESSION_VERIFIED" "$OWNER_TOTP" || {
        echo "STOP: Owner TOTP session proof API missing"
        exit 25
    }
}
grep -Fq "public const TABLE = 'pmd_owner_mfa'" "$OWNER_TOTP" || {
    echo "STOP: Owner MFA table authority unexpected"
    exit 26
}

git cat-file -e "$REF:$NEW_SERVICE" || {
    echo "STOP: V18B Owner MFA reset service missing on fetched branch"
    exit 27
}

python3 - "$GATE" <<'PY'
from pathlib import Path
import sys
s = Path(sys.argv[1]).read_text()
anchor = """        $binding = app(PmdSiteAccessSessionBindingService::class);
        $workspaceVerified = $site->isWorkspaceVerified($locationId)
            && $binding->isBoundToCurrentUser();

        foreach (['siteaccess', 'login', 'logout', '_assets'] as $allowed) {
"""
marker = 'PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B'
if marker not in s and s.count(anchor) != 1:
    raise SystemExit(f'STOP: workspace gate insertion anchor count={s.count(anchor)}')
print('Workspace gate anchor OK')
PY

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$GATE" "$VIEW" "$NEW_SERVICE"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$GATE" "$TMPROOT/$GATE"
cp "$VIEW" "$TMPROOT/$VIEW"
git show "$REF:$NEW_SERVICE" > "$TMPROOT/$NEW_SERVICE"
test -s "$TMPROOT/$NEW_SERVICE"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()

old = 'PmdSuperAdminOwnerPortalMfaResetService'
new = 'PmdSuperAdminOwnerMfaResetService'
if new not in s:
    if old not in s:
        raise SystemExit('STOP: old SuperAdmin reset service reference missing')
    s = s.replace(old, new)

s = s.replace('owner_portal_mfa_emergency_reset', 'owner_mfa_emergency_reset')
s = s.replace('PMD SuperAdmin Owner Portal MFA emergency reset refused/failed', 'PMD SuperAdmin Owner MFA emergency reset refused/failed')
s = s.replace('PMD SuperAdmin Owner Portal MFA emergency reset', 'PMD SuperAdmin Owner MFA emergency reset')
s = s.replace('Owner Portal MFA reset failed.', 'Owner MFA reset failed.')

p.write_text(s)
print('SuperAdminR2Controller.php: actual Owner MFA reset service wired')
PY

python3 - "$TMPROOT/$VIEW" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
old = "Reset the Owner Portal Authenticator for this restaurant? The old Authenticator and all Portal recovery codes will stop working. The Owner must sign in with their password and enroll a new QR."
new = "Reset the Owner Authenticator for this restaurant? The current Authenticator and all trusted Owner sign-ins will be revoked. The Owner must sign in with their password and connect a new QR."
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('STOP: Reset Owner MFA confirmation text anchor missing')
p.write_text(s)
print('restaurants.blade.php: confirmation now describes the real Owner reset')
PY

python3 - "$TMPROOT/$GATE" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B'

if 'use Illuminate\\Support\\Facades\\DB;' not in s:
    anchor = 'use Illuminate\\Http\\Request;'
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: DB import anchor count={s.count(anchor)}')
    s = s.replace(anchor, anchor + '\nuse Illuminate\\Support\\Facades\\DB;', 1)

if marker not in s:
    anchor = """        $binding = app(PmdSiteAccessSessionBindingService::class);
        $workspaceVerified = $site->isWorkspaceVerified($locationId)
            && $binding->isBoundToCurrentUser();

        foreach (['siteaccess', 'login', 'logout', '_assets'] as $allowed) {
"""
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: workspace guard anchor count={s.count(anchor)}')

    block = r'''        $binding = app(PmdSiteAccessSessionBindingService::class);
        $workspaceVerified = $site->isWorkspaceVerified($locationId)
            && $binding->isBoundToCurrentUser();

        // PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B
        // A SuperAdmin Owner-MFA reset must invalidate the already-open Owner
        // workspace as well as remembered browsers. Direct Owner-TOTP sessions
        // are tied to the currently-active factor generation; trusted-login
        // sessions are tied to the exact still-active trusted device row.
        if ($isOwner && $workspaceVerified) {
            $ownerTotp = app(PmdOwnerTotpService::class);
            $ownerUserId = (int)$identity['user_id'];
            $method = (string)session()->get(PmdSiteAccessService::SESSION_VERIFIED_METHOD, '');
            $deviceId = (int)session()->get(PmdSiteAccessService::SESSION_VERIFIED_DEVICE, 0);
            $ownerSessionValid = false;

            if ($ownerTotp->ready() && $ownerTotp->enabled($ownerUserId)) {
                if ($method === 'trusted_login_device') {
                    try {
                        $trusted = app(PmdTrustedLoginDeviceService::class)
                            ->current($request, $identity);
                        $ownerSessionValid = $deviceId > 0
                            && $trusted
                            && (int)$trusted->id === $deviceId;
                    } catch (\Throwable $error) {
                        $ownerSessionValid = false;
                    }
                } else {
                    $proof = (array)session()->get(PmdOwnerTotpService::SESSION_VERIFIED, []);
                    $verifiedAt = (int)($proof['verified_at'] ?? 0);
                    $confirmedAt = 0;

                    try {
                        $confirmed = DB::table(PmdOwnerTotpService::TABLE)
                            ->where('user_id', $ownerUserId)
                            ->whereNotNull('confirmed_at')
                            ->whereNull('disabled_at')
                            ->orderByDesc('updated_at')
                            ->orderByDesc('id')
                            ->value('confirmed_at');
                        $confirmedAt = $confirmed ? (int)strtotime((string)$confirmed) : 0;
                    } catch (\Throwable $error) {
                        $confirmedAt = 0;
                    }

                    $ownerSessionValid = $ownerTotp->sessionVerified(
                            $ownerUserId,
                            $locationId,
                            86400
                        )
                        && $verifiedAt > 0
                        && $confirmedAt > 0
                        && $confirmedAt <= ($verifiedAt + 1);
                }
            }

            if (!$ownerSessionValid) {
                try {
                    $site->clearVerification();
                    $workSession->clear();
                    $ownerTotp->clearSessionVerification();
                    AdminAuth::logout();
                } catch (\Throwable $error) {
                }

                session()->invalidate();
                session()->regenerateToken();

                return redirect(admin_url('login?owner=security-reset'))->with(
                    'error',
                    'Your Owner Authenticator or trusted sign-in was reset by PayMyDine Support. Sign in again and connect a new Authenticator.'
                );
            }
        }

        foreach (['siteaccess', 'login', 'logout', '_assets'] as $allowed) {
'''
    s = s.replace(anchor, block, 1)

p.write_text(s)
print('PmdSiteAccessWorkspaceGateService.php: Owner reset session guard prepared')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$GATE"
php -l "$TMPROOT/$NEW_SERVICE"
php -l "$TMPROOT/$VIEW"

grep -Fq "PmdSuperAdminOwnerMfaResetService" "$TMPROOT/$CONTROLLER"
! grep -Fq "PmdSuperAdminOwnerPortalMfaResetService" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B" "$TMPROOT/$GATE"
grep -Fq "PmdOwnerTotpService::TABLE" "$TMPROOT/$NEW_SERVICE"
grep -Fq "PmdTrustedLoginDeviceService::KIND" "$TMPROOT/$NEW_SERVICE"
grep -Fq "connect a new QR" "$TMPROOT/$VIEW"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 4 V18B TARGETS"
echo "========================================"

for path in "$CONTROLLER" "$GATE" "$VIEW"; do
    sudo mkdir -p "$BACKUP/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP/$path"
done

if [ -e "$NEW_SERVICE" ]; then
    NEW_SERVICE_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$NEW_SERVICE")"
    sudo cp -a "$NEW_SERVICE" "$BACKUP/$NEW_SERVICE"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 4 V18B TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$GATE" >/dev/null < "$TMPROOT/$GATE"
sudo tee "$VIEW" >/dev/null < "$TMPROOT/$VIEW"
sudo tee "$NEW_SERVICE" >/dev/null < "$TMPROOT/$NEW_SERVICE"

sudo chown --reference="$OLD_SERVICE" "$NEW_SERVICE"
sudo chmod --reference="$OLD_SERVICE" "$NEW_SERVICE"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
php -l "$GATE"
php -l "$NEW_SERVICE"
php -l "$VIEW"

grep -nF "PmdSuperAdminOwnerMfaResetService" "$CONTROLLER"
grep -nF "PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B" "$GATE"
grep -nF "class PmdSuperAdminOwnerMfaResetService" "$NEW_SERVICE"
grep -nF "connect a new QR" "$VIEW"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SUPERADMIN OWNER MFA RESET V18B INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - Reset Owner MFA targets pmd_owner_mfa (the QR used by Owner admin login)"
echo "  - the Owner's trusted_login rows are revoked so remembered browsers cannot bypass new QR setup"
echo "  - the current Owner workspace session is rejected on its next request"
echo "  - after password login, Owner login queues setup because the old Owner factor is inactive"
echo "  - a NEW QR is rendered by the existing canonical Owner login setup flow"
echo "  - Workplace Hub/site_hub is NOT revoked"
echo "  - Staff Portal MFA is NOT changed by this support action"
echo "  - password is NOT changed and login is never approved by reset"
echo "Backup: $BACKUP"
