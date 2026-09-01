#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="feature/portal-personal-mfa-20260901"
REF="refs/remotes/origin/${BRANCH}"

cd "$ROOT"

LOGIN="app/admin/controllers/Login.php"
LIFECYCLE="app/Services/SuperAdminTenantLifecycleService.php"
MIGRATION="app/system/database/migrations/2026_09_01_000000_create_pmd_portal_mfa_table.php"
SERVICE="app/Services/PmdPortalTotpService.php"
TRAIT="app/admin/traits/HandlesPortalMfa.php"
VIEW="app/admin/views/auth/login_portal_mfa_v1.blade.php"
QR="app/Services/PmdPortalQrService.php"

FEATURE_FILES=("$MIGRATION" "$SERVICE" "$TRAIT" "$VIEW" "$QR")
ALLFILES=("$LOGIN" "$LIFECYCLE" "${FEATURE_FILES[@]}")

TMPROOT="$(mktemp -d /tmp/pmd-portal-mfa-v4.XXXXXX)"
PATCHER="$TMPROOT/patch_live.py"
BACKUP="/tmp/pmd-portal-mfa-v4-backup-$(date +%Y%m%d-%H%M%S)"
APPLY_STARTED=0
QR_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK PORTAL MFA V4 FILES"
        set +e
        for f in "$LOGIN" "$LIFECYCLE" "$MIGRATION" "$SERVICE" "$TRAIT" "$VIEW"; do
            sudo cp -a "$BACKUP/$f" "$f"
        done
        if [ "$QR_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$QR" "$QR"
        else
            sudo rm -f "$QR"
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

for f in "$LOGIN" "$LIFECYCLE" "$MIGRATION" "$SERVICE" "$TRAIT" "$VIEW"; do
    test -f "$f" || { echo "STOP: required production file missing: $f"; exit 20; }
done

grep -Fq "PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1" "$LOGIN" || { echo "STOP: Portal MFA V3 Login integration marker missing."; exit 21; }
grep -Fq "PMD_PORTAL_PERSONAL_MFA_DESTINATION_V1" "$LOGIN" || { echo "STOP: Portal destination integration missing."; exit 22; }
grep -Fq "PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1" "$LIFECYCLE" || { echo "STOP: Portal MFA tenant lifecycle integration missing."; exit 23; }

echo "Fetching Portal MFA feature branch only..."
git fetch origin "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
git cat-file -e "${REF}^{commit}"
for f in "${FEATURE_FILES[@]}"; do
    git cat-file -e "${REF}:${f}" || { echo "STOP: feature file missing in branch: $f"; exit 24; }
done

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE CHANGES IN /tmp"
echo "========================================"

for f in "${ALLFILES[@]}"; do mkdir -p "$TMPROOT/$(dirname "$f")"; done
cp "$LOGIN" "$TMPROOT/$LOGIN"
cp "$LIFECYCLE" "$TMPROOT/$LIFECYCLE"
for f in "${FEATURE_FILES[@]}"; do
    git show "${REF}:${f}" > "$TMPROOT/$f"
    test -s "$TMPROOT/$f"
done

cat > "$PATCHER" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
login = root / "app/admin/controllers/Login.php"
lifecycle = root / "app/Services/SuperAdminTenantLifecycleService.php"

def method_block(text: str, signature: str, label: str):
    start = text.find(signature)
    if start < 0: raise SystemExit(f"STOP: {label} signature not found")
    brace = text.find("{", start)
    if brace < 0: raise SystemExit(f"STOP: {label} opening brace not found")
    depth = 0; quote = None; escaped = False
    for i in range(brace, len(text)):
        ch = text[i]
        if quote is not None:
            if escaped: escaped = False; continue
            if ch == "\\": escaped = True; continue
            if ch == quote: quote = None
            continue
        if ch in ("'", '"'): quote = ch; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return start, i + 1
    raise SystemExit(f"STOP: {label} closing brace not found")

def patch_login():
    p = login; s = p.read_text()
    if "PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1" not in s:
        raise SystemExit("STOP: Login V3 integration missing")
    a, b = method_block(s, "    public function __construct()", "Login constructor")
    block = s[a:b]
    if "'onPortalMfaConfirm'," not in block:
        anchor = "            'onOwnerMfaVerify',"
        if block.count(anchor) != 1: raise SystemExit("STOP: Login throttle anchor not found exactly once")
        block = block.replace(anchor, anchor + "\n            'onPortalMfaConfirm',\n            'onPortalMfaVerify',\n            'onPortalMfaRecover',", 1)
    else:
        if "'onPortalMfaVerify'," not in block:
            anchor = "            'onPortalMfaConfirm',"
            if block.count(anchor) != 1: raise SystemExit("STOP: Portal confirm throttle anchor ambiguous")
            block = block.replace(anchor, anchor + "\n            'onPortalMfaVerify',", 1)
        if "'onPortalMfaRecover'," not in block:
            anchor = "            'onPortalMfaVerify',"
            if block.count(anchor) != 1: raise SystemExit("STOP: Portal verify throttle anchor ambiguous")
            block = block.replace(anchor, anchor + "\n            'onPortalMfaRecover',", 1)
    for item in ["'onPortalMfaConfirm',", "'onPortalMfaVerify',", "'onPortalMfaRecover',"]:
        if item not in block: raise SystemExit(f"STOP: Login throttle missing {item}")
    p.write_text(s[:a] + block + s[b:])
    print("Login.php: recovery throttle verified")

def patch_lifecycle():
    p = lifecycle; s = p.read_text()
    if "PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1" not in s:
        raise SystemExit("STOP: tenant lifecycle Portal MFA marker missing")
    recovery = "pmd_portal_mfa_recovery_codes"
    const_sig = "private const EMPTY_ON_NEW_TENANT = ["
    cs = s.find(const_sig)
    if cs < 0: raise SystemExit("STOP: EMPTY_ON_NEW_TENANT not found")
    ce = s.find("];", cs)
    if ce < 0: raise SystemExit("STOP: EMPTY_ON_NEW_TENANT closing token not found")
    block = s[cs:ce]
    if "'pmd_portal_mfa'," not in block: raise SystemExit("STOP: pmd_portal_mfa missing from tenant empty list")
    if f"'{recovery}'," not in block:
        anchor = "        'pmd_portal_mfa',"
        if block.count(anchor) != 1: raise SystemExit("STOP: tenant empty Portal MFA anchor ambiguous")
        block = block.replace(anchor, anchor + f"\n        '{recovery}',", 1)
        s = s[:cs] + block + s[ce:]
    ms, me = method_block(s, "    private function ensureWorkplaceSecuritySchema(): void", "ensureWorkplaceSecuritySchema")
    method = s[ms:me]
    if "'pmd_portal_mfa'," not in method: raise SystemExit("STOP: pmd_portal_mfa verification missing in security schema method")
    if f"'{recovery}'," not in method:
        anchor = "            'pmd_portal_mfa',"
        if method.count(anchor) != 1: raise SystemExit("STOP: security verification Portal MFA anchor ambiguous")
        method = method.replace(anchor, anchor + f"\n            '{recovery}',", 1)
        s = s[:ms] + method + s[me:]
    p.write_text(s)
    print("SuperAdminTenantLifecycleService.php: recovery schema integrated")

patch_login(); patch_lifecycle()
PY

python3 "$PATCHER" "$TMPROOT"

echo ""
echo "========================================"
echo "3. VERIFY ALL TEMP FILES"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$LOGIN"
php -l "$TMPROOT/$LIFECYCLE"
php -l "$TMPROOT/$MIGRATION"
php -l "$TMPROOT/$SERVICE"
php -l "$TMPROOT/$TRAIT"
php -l "$TMPROOT/$QR"
grep -Fq "PMD_PORTAL_TOTP_V2" "$TMPROOT/$SERVICE"
grep -Fq "PMD_PORTAL_PERSONAL_MFA_LOGIN_V2" "$TMPROOT/$TRAIT"
grep -Fq "PMD_PORTAL_MFA_LOGIN_VIEW_V2" "$TMPROOT/$VIEW"
grep -Fq "PMD_PORTAL_QR_V1" "$TMPROOT/$QR"
grep -Fq "pmd_portal_mfa_recovery_codes" "$TMPROOT/$MIGRATION"
grep -Fq "pmd_portal_mfa_recovery_codes" "$TMPROOT/$LIFECYCLE"
grep -Fq "'onPortalMfaRecover'," "$TMPROOT/$LOGIN"

cat > "$TMPROOT/qr-smoke.php" <<PHP
<?php
require ${TMPROOT@Q}.'/app/Services/PmdPortalQrService.php';
\$service = new App\Services\PmdPortalQrService();
\$svg = \$service->svg('otpauth://totp/PayMyDine%3Atest%40mimoza?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=PayMyDine', 4);
if (strpos(\$svg, '<svg') === false || strlen(\$svg) < 1000) { fwrite(STDERR, "QR smoke test failed\n"); exit(50); }
echo "QR smoke test OK\n";
PHP
php "$TMPROOT/qr-smoke.php"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 7 TARGET FILES"
echo "========================================"
mkdir -p "$BACKUP"
for f in "$LOGIN" "$LIFECYCLE" "$MIGRATION" "$SERVICE" "$TRAIT" "$VIEW"; do
    sudo mkdir -p "$BACKUP/$(dirname "$f")"
    sudo cp -a "$f" "$BACKUP/$f"
done
if [ -e "$QR" ]; then QR_EXISTED=1; sudo mkdir -p "$BACKUP/$(dirname "$QR")"; sudo cp -a "$QR" "$BACKUP/$QR"; fi
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY PORTAL MFA V4 FILES"
echo "========================================"
APPLY_STARTED=1
sudo tee "$LOGIN" >/dev/null < "$TMPROOT/$LOGIN"
sudo tee "$LIFECYCLE" >/dev/null < "$TMPROOT/$LIFECYCLE"
sudo tee "$MIGRATION" >/dev/null < "$TMPROOT/$MIGRATION"
sudo tee "$SERVICE" >/dev/null < "$TMPROOT/$SERVICE"
sudo tee "$TRAIT" >/dev/null < "$TMPROOT/$TRAIT"
sudo tee "$VIEW" >/dev/null < "$TMPROOT/$VIEW"
sudo tee "$QR" >/dev/null < "$TMPROOT/$QR"
sudo chown --reference="app/Services/PmdPortalTotpService.php" "$QR"
sudo chmod --reference="app/Services/PmdPortalTotpService.php" "$QR"

echo ""
echo "========================================"
echo "6. VERIFY LIVE SOURCE"
echo "========================================"
php -l "$LOGIN"
php -l "$LIFECYCLE"
php -l "$MIGRATION"
php -l "$SERVICE"
php -l "$TRAIT"
php -l "$QR"
grep -nF "PMD_PORTAL_TOTP_V2" "$SERVICE"
grep -nF "PMD_PORTAL_PERSONAL_MFA_LOGIN_V2" "$TRAIT"
grep -nF "PMD_PORTAL_MFA_LOGIN_VIEW_V2" "$VIEW"
grep -nF "PMD_PORTAL_QR_V1" "$QR"
grep -nF "pmd_portal_mfa_recovery_codes" "$MIGRATION"
grep -nF "pmd_portal_mfa_recovery_codes" "$LIFECYCLE"
grep -nF "onPortalMfaRecover" "$LOGIN"
echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR CACHE"
echo "========================================"
sudo -u www-data php artisan optimize:clear || true
APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - LIVE PORTAL MFA V4 INSTALLED"
echo "========================================"
echo "Fixes:"
echo "  - local real Authenticator QR (no third-party QR service)"
echo "  - compact desktop page with fixed full-screen background"
echo "  - mobile scroll only when actually needed"
echo "  - 8 personal single-use recovery codes"
echo "  - recovery code revokes old phone and forces a new QR"
echo "  - one Portal Authenticator per user across tenant locations"
echo "  - enrollment secret encrypted inside server-side session"
echo "  - MFA/recovery pages sent with no-store / no-referrer headers"
echo "  - recovery verification shares Login throttle"
echo ""
echo "Backup: $BACKUP"
echo "GitHub PR: https://github.com/Amir3629/Paymydine-Update/pull/194"
echo ""
echo "IMPORTANT:"
echo "  Refresh the current Portal setup page."
echo "  Existing unfinished setup gets a new V2 enrollment secret."
echo "  Scan the NEW QR, enter its current 6-digit code, then save recovery codes."
