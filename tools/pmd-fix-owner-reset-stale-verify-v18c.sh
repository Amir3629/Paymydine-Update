#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

LOGIN="app/admin/controllers/Login.php"
OWNER_TOTP="app/Services/PmdOwnerTotpService.php"
RESET_SERVICE="app/Services/PmdSuperAdminOwnerMfaResetService.php"
GATE="app/Services/PmdSiteAccessWorkspaceGateService.php"
MARKER="PMD_OWNER_SUPPORT_RESET_STALE_VERIFY_GUARD_V18C"

BACKUP="/tmp/pmd-owner-reset-stale-verify-v18c-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-owner-reset-stale-verify-v18c.XXXXXX)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK OWNER RESET V18C"
        set +e
        sudo cp -a "$BACKUP/$LOGIN" "$LOGIN"
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

for path in "$LOGIN" "$OWNER_TOTP" "$RESET_SERVICE" "$GATE"; do
    test -f "$path" || { echo "STOP: missing $path"; exit 20; }
done

grep -Fq "private function pmdOwnerSecurityViewState(): ?array" "$LOGIN" || {
    echo "STOP: canonical Owner security view-state function missing"
    exit 21
}

grep -Fq "public const TABLE = 'pmd_owner_mfa'" "$OWNER_TOTP" || {
    echo "STOP: Owner MFA table authority unexpected"
    exit 22
}

grep -Fq "PMD_SUPERADMIN_OWNER_MFA_RESET_V18B" "$RESET_SERVICE" || {
    echo "STOP: V18B reset service is not installed"
    exit 23
}

grep -Fq "PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B" "$GATE" || {
    echo "STOP: V18B workspace-session guard is not installed"
    exit 24
}

if grep -Fq "$MARKER" "$LOGIN"; then
    echo "V18C stale verify guard is already installed. Nothing changed."
    exit 0
fi

python3 - "$LOGIN" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()
anchor = """        $mode = (string)($state['mode'] ?? '');
        $security = [
"""
if s.count(anchor) != 1:
    raise SystemExit(f"STOP: Owner security mode anchor count={s.count(anchor)}")
print("Owner Login stale-verify anchor OK")
PY

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$LOGIN")"
cp "$LOGIN" "$TMPROOT/$LOGIN"

python3 - "$TMPROOT/$LOGIN" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_OWNER_SUPPORT_RESET_STALE_VERIFY_GUARD_V18C'

if marker in s:
    print('Login.php: V18C already present in temp copy')
    raise SystemExit(0)

anchor = """        $mode = (string)($state['mode'] ?? '');
        $security = [
"""

if s.count(anchor) != 1:
    raise SystemExit(f'STOP: Owner security mode anchor count={s.count(anchor)}')

replacement = r'''        $mode = (string)($state['mode'] ?? '');

        // PMD_OWNER_SUPPORT_RESET_STALE_VERIFY_GUARD_V18C
        // A Support reset disables pmd_owner_mfa and revokes trusted Owner
        // sign-ins. A browser that was already parked on the old 6-digit
        // verify screen must NOT be allowed to keep that authenticated state,
        // and must NOT be silently converted straight to QR enrollment.
        // Returning null makes index() call pmdInvalidateIncompleteSecurityLogin(),
        // which logs the Owner out and invalidates the whole session. The Owner
        // must then enter the password again; only that fresh password login may
        // queue setup and render a brand-new Authenticator QR.
        if ($mode === 'verify') {
            $totp = app(PmdOwnerTotpService::class);
            $userId = (int)$identity['user_id'];

            if (!$totp->ready() || !$totp->enabled($userId)) {
                logger()->warning('PMD stale Owner TOTP verify session rejected', [
                    'user_id' => $userId,
                    'location_id' => (int)$identity['location_id'],
                    'reason' => $totp->ready()
                        ? 'factor_inactive_or_support_reset'
                        : 'owner_mfa_storage_unavailable',
                ]);

                return null;
            }
        }

        $security = [
'''

s = s.replace(anchor, replacement, 1)
p.write_text(s)
print('Login.php: stale Owner verify session now fails closed after reset')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$LOGIN"
grep -Fq "$MARKER" "$TMPROOT/$LOGIN"
grep -Fq "pmdInvalidateIncompleteSecurityLogin" "$TMPROOT/$LOGIN"
grep -Fq "factor_inactive_or_support_reset" "$TMPROOT/$LOGIN"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY LOGIN.PHP"
echo "========================================"

sudo mkdir -p "$BACKUP/$(dirname "$LOGIN")"
sudo cp -a "$LOGIN" "$BACKUP/$LOGIN"
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY LOGIN.PHP"
echo "========================================"

APPLY_STARTED=1
sudo tee "$LOGIN" >/dev/null < "$TMPROOT/$LOGIN"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$LOGIN"
grep -nF "$MARKER" "$LOGIN"
grep -nF "factor_inactive_or_support_reset" "$LOGIN"

echo "LIVE FILE CHECKS PASSED"

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - OWNER RESET STALE VERIFY V18C INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - an old Owner 6-digit verify screen cannot survive a Support reset"
echo "  - on its next server request/refresh, that stale authenticated session is invalidated"
echo "  - the Owner must enter the password again"
echo "  - because pmd_owner_mfa is inactive, the fresh password login queues setup"
echo "  - the existing canonical Login flow then renders a NEW Authenticator QR"
echo "  - stale sessions are NOT silently promoted straight into QR enrollment"
echo "  - Workplace Hub/site_hub remains untouched"
echo "  - Staff Portal MFA remains untouched"
echo "Backup: $BACKUP"
