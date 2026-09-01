#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="feature/portal-personal-mfa-20260901"
REF="refs/remotes/origin/${BRANCH}"
cd "$ROOT"

LOGIN="app/admin/controllers/Login.php"
TRUSTED="app/Services/PmdTrustedLoginDeviceService.php"
LIFECYCLE="app/Services/SuperAdminTenantLifecycleService.php"
GATE="app/Services/PmdSiteAccessWorkspaceGateService.php"
MIGRATION="app/system/database/migrations/2026_09_01_000000_create_pmd_portal_mfa_table.php"
SERVICE="app/Services/PmdPortalTotpService.php"
TRAIT="app/admin/traits/HandlesPortalMfa.php"
VIEW="app/admin/views/auth/login_portal_mfa_v1.blade.php"

EXISTING=("$LOGIN" "$TRUSTED" "$LIFECYCLE" "$GATE")
NEWFILES=("$MIGRATION" "$SERVICE" "$TRAIT" "$VIEW")
ALLFILES=("${EXISTING[@]}" "${NEWFILES[@]}")

TMPROOT="$(mktemp -d /tmp/pmd-portal-mfa-v3.XXXXXX)"
PATCHER="$TMPROOT/patch.py"
BACKUP="/tmp/pmd-portal-mfa-v3-backup-$(date +%Y%m%d-%H%M%S)"
APPLY_STARTED=0
MIGRATION_EXISTED=0
SERVICE_EXISTED=0
TRAIT_EXISTED=0
VIEW_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK PORTAL MFA V3 FILES"
        set +e
        for f in "${EXISTING[@]}"; do
            sudo cp -a "$BACKUP/$f" "$f"
        done
        if [ "$MIGRATION_EXISTED" -eq 1 ]; then sudo cp -a "$BACKUP/$MIGRATION" "$MIGRATION"; else sudo rm -f "$MIGRATION"; fi
        if [ "$SERVICE_EXISTED" -eq 1 ]; then sudo cp -a "$BACKUP/$SERVICE" "$SERVICE"; else sudo rm -f "$SERVICE"; fi
        if [ "$TRAIT_EXISTED" -eq 1 ]; then sudo cp -a "$BACKUP/$TRAIT" "$TRAIT"; else sudo rm -f "$TRAIT"; fi
        if [ "$VIEW_EXISTED" -eq 1 ]; then sudo cp -a "$BACKUP/$VIEW" "$VIEW"; else sudo rm -f "$VIEW"; fi
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
for f in "${EXISTING[@]}"; do
    test -f "$f" || { echo "STOP: missing production file: $f"; exit 20; }
done

git fetch origin "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
git cat-file -e "${REF}^{commit}"
for f in "${NEWFILES[@]}"; do
    git cat-file -e "${REF}:${f}" || { echo "STOP: missing feature file: $f"; exit 21; }
done

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "========================================"
for f in "${ALLFILES[@]}"; do mkdir -p "$TMPROOT/$(dirname "$f")"; done
for f in "${EXISTING[@]}"; do cp "$f" "$TMPROOT/$f"; done
for f in "${NEWFILES[@]}"; do
    git show "${REF}:${f}" > "$TMPROOT/$f"
    test -s "$TMPROOT/$f"
done

cat > "$PATCHER" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
LOGIN = root / 'app/admin/controllers/Login.php'
TRUSTED = root / 'app/Services/PmdTrustedLoginDeviceService.php'
LIFECYCLE = root / 'app/Services/SuperAdminTenantLifecycleService.php'
GATE = root / 'app/Services/PmdSiteAccessWorkspaceGateService.php'
TRAIT = root / 'app/admin/traits/HandlesPortalMfa.php'


def once(s, old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'STOP: {label}: expected 1 anchor, found {n}')
    return s.replace(old, new, 1)


def patch_login():
    p = LOGIN
    s = p.read_text()
    if 'PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1' not in s:
        s = once(s, 'use Admin\\Traits\\ValidatesForm;', 'use Admin\\Traits\\HandlesPortalMfa;\nuse Admin\\Traits\\ValidatesForm;', 'Login import')
        s = once(s, '    use ValidatesForm;', '    use ValidatesForm;\n    use HandlesPortalMfa;', 'Login trait')
        old = """        if (AdminAuth::isLogged()) {\n            if (session()->has(self::PMD_OWNER_SECURITY_SESSION)) {"""
        new = """        if (AdminAuth::isLogged()) {\n            // PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1\n            $portalMfa = $this->pmdPortalMfaIndexResponse();\n            if ($portalMfa) {\n                Template::setTitle('Staff Portal Security - PayMyDine');\n                return $portalMfa;\n            }\n\n            if (session()->has(self::PMD_OWNER_SECURITY_SESSION)) {"""
        s = once(s, old, new, 'Login index hook')
        anchor = '        // PMD_TRUSTED_PASSWORD_POST_RESUME_V3'
        block = """        // PMD_PORTAL_PERSONAL_MFA_DESTINATION_V1\n        // username + \"portal\" always uses the person's own Authenticator.\n        // Never create or wait for a Workplace/Admin approval challenge here.\n        if ($destination === 'staff') {\n            try {\n                $this->pmdBeginPortalMfa();\n                return redirect(admin_url('login'));\n            } catch (ValidationException $error) {\n                throw $error;\n            } catch (\\Throwable $error) {\n                logger()->error('PMD Portal MFA start failed', [\n                    'user_id' => (int)optional(AdminAuth::getUser())->getKey(),\n                    'message' => $error->getMessage(),\n                ]);\n                $this->pmdAbortBootstrapLogin(\n                    'Portal security is temporarily unavailable. Try again shortly.'\n                );\n            }\n        }\n\n"""
        s = once(s, anchor, block + anchor, 'Login Portal branch')
    if "'onPortalMfaConfirm'," not in s:
        s = once(
            s,
            "            'onOwnerMfaVerify',",
            "            'onOwnerMfaVerify',\n            'onPortalMfaConfirm',\n            'onPortalMfaVerify',",
            'Login Portal throttle'
        )
    p.write_text(s)
    print('Login.php: patched')


def patch_trusted():
    p = TRUSTED
    s = p.read_text()
    if 'PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1' not in s:
        old = """    public function rememberVerifiedResponse(Request $request, $response)\n    {"""
        new = """    public function rememberVerifiedResponse(Request $request, $response)\n    {\n        // PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1\n        // Portal TOTP verifies only this Portal session and must never create\n        // or renew a token that can bypass later Workspace security.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return $response;\n        }"""
        s = once(s, old, new, 'Trusted remember guard')
    if 'PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1' not in s:
        old = """    public function resumeIfPossible(Request $request)\n    {"""
        new = """    public function resumeIfPossible(Request $request)\n    {\n        // PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1\n        // usernameportal always requires the person's Portal Authenticator.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return null;\n        }"""
        s = once(s, old, new, 'Trusted resume guard')
    p.write_text(s)
    print('PmdTrustedLoginDeviceService.php: patched')


def patch_lifecycle():
    p = LIFECYCLE
    s = p.read_text()
    if 'PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1' in s:
        print('SuperAdminTenantLifecycleService.php: already patched')
        return

    # 1) Add pmd_portal_mfa only inside EMPTY_ON_NEW_TENANT.
    const_start = s.find('private const EMPTY_ON_NEW_TENANT = [')
    if const_start < 0:
        raise SystemExit('STOP: Lifecycle EMPTY_ON_NEW_TENANT start not found')
    const_end = s.find('\n    ];', const_start)
    if const_end < 0:
        raise SystemExit('STOP: Lifecycle EMPTY_ON_NEW_TENANT end not found')
    const_block = s[const_start:const_end]
    if "'pmd_portal_mfa'" not in const_block:
        owner_line = re.search(r"(?m)^(?P<i>[ \t]*)'pmd_owner_mfa',[ \t]*$", const_block)
        if not owner_line:
            raise SystemExit('STOP: Lifecycle owner MFA entry not found in EMPTY_ON_NEW_TENANT')
        insert_at = owner_line.end()
        const_block = const_block[:insert_at] + "\n" + owner_line.group('i') + "'pmd_portal_mfa'," + const_block[insert_at:]
        s = s[:const_start] + const_block + s[const_end:]

    # 2) Restrict all schema edits to ensureWorkplaceSecuritySchema().
    method_sig = 'private function ensureWorkplaceSecuritySchema(): void'
    method_start = s.find(method_sig)
    if method_start < 0:
        raise SystemExit('STOP: ensureWorkplaceSecuritySchema() not found')
    next_method = s.find('\n    private function ', method_start + len(method_sig))
    if next_method < 0:
        raise SystemExit('STOP: lifecycle next method boundary not found')
    block = s[method_start:next_method]

    owner_migration = re.search(
        r"(?ms)^(?P<i>[ \t]*)\$ownerMigration\s*=\s*base_path\(\s*['\"]app/system/database/migrations/2026_08_30_123000_create_pmd_owner_mfa_table\.php['\"]\s*\);",
        block,
    )
    if not owner_migration:
        raise SystemExit('STOP: owner migration assignment not found structurally')
    indent = owner_migration.group('i')
    portal_assignment = (
        "\n" + indent + "// PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1\n"
        + indent + "$portalMigration = base_path(\n"
        + indent + "    'app/system/database/migrations/2026_09_01_000000_create_pmd_portal_mfa_table.php'\n"
        + indent + ");\n"
        + indent + "if (!is_file($portalMigration)) {\n"
        + indent + "    throw new \\RuntimeException('Portal MFA migration file is missing.');\n"
        + indent + "}"
    )
    block = block[:owner_migration.end()] + portal_assignment + block[owner_migration.end():]

    if 'require_once $portalMigration;' not in block:
        m = re.search(r'(?m)^(?P<i>[ \t]*)require_once\s+\$ownerMigration\s*;[ \t]*$', block)
        if not m:
            raise SystemExit('STOP: require_once ownerMigration not found structurally')
        block = block[:m.end()] + "\n" + m.group('i') + 'require_once $portalMigration;' + block[m.end():]

    if 'CreatePmdPortalMfaTable' not in block:
        m = re.search(r'(?m)^(?P<i>[ \t]*)\(new\s+\\System\\Database\\Migrations\\CreatePmdOwnerMfaTable\(\)\)->up\(\);[ \t]*$', block)
        if not m:
            raise SystemExit('STOP: Owner MFA migration up() call not found structurally')
        block = block[:m.end()] + "\n" + m.group('i') + '(new \\System\\Database\\Migrations\\CreatePmdPortalMfaTable())->up();' + block[m.end():]

    # Add verification entry only to the foreach table list inside this method.
    if "'pmd_portal_mfa'" not in block:
        loops = list(re.finditer(r'(?ms)foreach\s*\(\s*\[(?P<body>.*?)\]\s+as\s+\$table\s*\)', block))
        candidates = [m for m in loops if "'pmd_owner_mfa'" in m.group('body')]
        if len(candidates) != 1:
            raise SystemExit(f'STOP: expected one security verification foreach, found {len(candidates)}')
        m = candidates[0]
        body = m.group('body')
        owner_line = re.search(r"(?m)^(?P<i>[ \t]*)'pmd_owner_mfa',[ \t]*$", body)
        if not owner_line:
            raise SystemExit('STOP: owner MFA line missing in security verification foreach')
        body = body[:owner_line.end()] + "\n" + owner_line.group('i') + "'pmd_portal_mfa'," + body[owner_line.end():]
        block = block[:m.start('body')] + body + block[m.end('body'):]

    s = s[:method_start] + block + s[next_method:]
    p.write_text(s)
    print('SuperAdminTenantLifecycleService.php: structurally patched')


def patch_gate():
    p = GATE
    s = p.read_text()
    if 'PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1' not in s:
        old = """        $relative = $this->relativeAdminPath($request);\n        if (str_starts_with($relative, '_pmd/language-switch')) return null;\n\n        if (session()->has('pmd_login_owner_security_v1')) {"""
        new = """        $relative = $this->relativeAdminPath($request);\n        if (str_starts_with($relative, '_pmd/language-switch')) return null;\n\n        // PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1\n        // usernameportal is a Staff Portal session, never an Admin workspace session.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return $this->portalGateResponse($request, $site, $identity, $locationId, $relative);\n        }\n\n        if (session()->has('pmd_login_owner_security_v1')) {"""
        s = once(s, old, new, 'Portal gate hook')

        method_anchor = """    private function relativeAdminPath(Request $request): string\n    {"""
        portal_method = """    private function portalGateResponse(\n        Request $request,\n        PmdSiteAccessService $site,\n        array $identity,\n        int $locationId,\n        string $relative\n    ) {\n        foreach (['login', 'logout', '_assets', '_pmd/language-switch'] as $allowed) {\n            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;\n        }\n\n        if (session()->has('pmd_login_portal_security_v1')) {\n            return redirect(admin_url('login'));\n        }\n\n        $binding = app(PmdSiteAccessSessionBindingService::class);\n        $portalVerified = $site->isWorkspaceVerified($locationId)\n            && (string)session()->get(PmdSiteAccessService::SESSION_VERIFIED_METHOD, '') === 'portal_totp'\n            && $binding->isBoundToCurrentUser();\n\n        if (!$portalVerified) {\n            return redirect(admin_url('login'))->with(\n                'error',\n                'Complete your personal Portal Authenticator check.'\n            );\n        }\n\n        if ($relative === 'mywork' || str_starts_with($relative, 'mywork/')) return null;\n        if ($relative === 'siteaccess/session/ping') return null;\n\n        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {\n            return redirect(admin_url('mywork'));\n        }\n\n        return response(\n            'This Staff Portal session cannot perform Admin workspace actions.',\n            403,\n            ['Cache-Control' => 'no-store']\n        );\n    }\n\n"""
        s = once(s, method_anchor, portal_method + method_anchor, 'Portal gate method')
    p.write_text(s)
    print('PmdSiteAccessWorkspaceGateService.php: patched')


def patch_trait():
    p = TRAIT
    s = p.read_text()
    if 'PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2' not in s:
        old = """        $userId = (int)($identity['user_id'] ?? 0);\n        $locationId = (int)($identity['location_id'] ?? 0);\n\n        if ($userId < 1 || $locationId < 1) {\n            throw new ValidationException([\n                'username' => 'Portal security is not ready for this account.',\n            ]);\n        }"""
        new = """        $userId = (int)($identity['user_id'] ?? 0);\n        $staffId = (int)($identity['staff_id'] ?? 0);\n        $locationId = (int)($identity['location_id'] ?? 0);\n\n        // PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2\n        if ($userId < 1 || $staffId < 1 || $locationId < 1) {\n            throw new ValidationException([\n                'username' => 'This account needs an active Team profile before Staff Portal can be used.',\n            ]);\n        }"""
        s = once(s, old, new, 'Portal Staff profile guard')
    p.write_text(s)
    print('HandlesPortalMfa.php: patched')


for f in [LOGIN, TRUSTED, LIFECYCLE, GATE, TRAIT]:
    if not f.is_file():
        raise SystemExit(f'STOP: required file missing: {f}')
patch_login()
patch_trusted()
patch_lifecycle()
patch_gate()
patch_trait()
PY

python3 "$PATCHER" "$TMPROOT"

echo ""
echo "========================================"
echo "3. VERIFY TEMP - NO PRODUCTION WRITES YET"
echo "========================================"
php -l "$TMPROOT/$LOGIN"
php -l "$TMPROOT/$TRUSTED"
php -l "$TMPROOT/$LIFECYCLE"
php -l "$TMPROOT/$GATE"
php -l "$TMPROOT/$MIGRATION"
php -l "$TMPROOT/$SERVICE"
php -l "$TMPROOT/$TRAIT"

grep -Fq "PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1" "$TMPROOT/$LOGIN"
grep -Fq "onPortalMfaConfirm" "$TMPROOT/$LOGIN"
grep -Fq "PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1" "$TMPROOT/$TRUSTED"
grep -Fq "PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1" "$TMPROOT/$LIFECYCLE"
grep -Fq "pmd_portal_mfa" "$TMPROOT/$LIFECYCLE"
grep -Fq "PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1" "$TMPROOT/$GATE"
grep -Fq "PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2" "$TMPROOT/$TRAIT"
grep -Fq "PMD_PORTAL_TOTP_V1" "$TMPROOT/$SERVICE"
grep -Fq "PMD_PORTAL_MFA_LOGIN_VIEW_V1" "$TMPROOT/$VIEW"
echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 8 TARGET FILES"
echo "========================================"
mkdir -p "$BACKUP"
for f in "${EXISTING[@]}"; do
    sudo mkdir -p "$BACKUP/$(dirname "$f")"
    sudo cp -a "$f" "$BACKUP/$f"
done
if [ -e "$MIGRATION" ]; then MIGRATION_EXISTED=1; sudo mkdir -p "$BACKUP/$(dirname "$MIGRATION")"; sudo cp -a "$MIGRATION" "$BACKUP/$MIGRATION"; fi
if [ -e "$SERVICE" ]; then SERVICE_EXISTED=1; sudo mkdir -p "$BACKUP/$(dirname "$SERVICE")"; sudo cp -a "$SERVICE" "$BACKUP/$SERVICE"; fi
if [ -e "$TRAIT" ]; then TRAIT_EXISTED=1; sudo mkdir -p "$BACKUP/$(dirname "$TRAIT")"; sudo cp -a "$TRAIT" "$BACKUP/$TRAIT"; fi
if [ -e "$VIEW" ]; then VIEW_EXISTED=1; sudo mkdir -p "$BACKUP/$(dirname "$VIEW")"; sudo cp -a "$VIEW" "$BACKUP/$VIEW"; fi
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY PORTAL MFA FILES"
echo "========================================"
APPLY_STARTED=1
for f in "${EXISTING[@]}"; do sudo tee "$f" >/dev/null < "$TMPROOT/$f"; done

sudo tee "$MIGRATION" >/dev/null < "$TMPROOT/$MIGRATION"
sudo chown --reference="app/system/database/migrations/2026_08_30_123000_create_pmd_owner_mfa_table.php" "$MIGRATION"
sudo chmod --reference="app/system/database/migrations/2026_08_30_123000_create_pmd_owner_mfa_table.php" "$MIGRATION"

sudo tee "$SERVICE" >/dev/null < "$TMPROOT/$SERVICE"
sudo chown --reference="app/Services/PmdOwnerTotpService.php" "$SERVICE"
sudo chmod --reference="app/Services/PmdOwnerTotpService.php" "$SERVICE"

sudo tee "$TRAIT" >/dev/null < "$TMPROOT/$TRAIT"
sudo chown --reference="app/admin/traits/ValidatesForm.php" "$TRAIT"
sudo chmod --reference="app/admin/traits/ValidatesForm.php" "$TRAIT"

sudo tee "$VIEW" >/dev/null < "$TMPROOT/$VIEW"
sudo chown --reference="app/admin/views/auth/login_workplace_v4.blade.php" "$VIEW"
sudo chmod --reference="app/admin/views/auth/login_workplace_v4.blade.php" "$VIEW"

echo ""
echo "========================================"
echo "6. VERIFY LIVE SOURCE"
echo "========================================"
php -l "$LOGIN"
php -l "$TRUSTED"
php -l "$LIFECYCLE"
php -l "$GATE"
php -l "$MIGRATION"
php -l "$SERVICE"
php -l "$TRAIT"
grep -nF "PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1" "$LOGIN"
grep -nF "PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1" "$TRUSTED"
grep -nF "PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1" "$LIFECYCLE"
grep -nF "PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1" "$GATE"
grep -nF "PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2" "$TRAIT"
grep -nF "PMD_PORTAL_TOTP_V1" "$SERVICE"
grep -nF "PMD_PORTAL_MFA_LOGIN_VIEW_V1" "$VIEW"
echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR CACHE"
echo "========================================"
sudo -u www-data php artisan optimize:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - LIVE PORTAL MFA V3 INSTALLED"
echo "========================================"
echo "Portal behavior:"
echo "  usernameportal + password -> personal Authenticator"
echo "  first use -> QR + first 6-digit code"
echo "  later use -> personal 6-digit code"
echo "  Portal -> /admin/mywork only"
echo "  Portal -> NO Admin/Owner approval challenge"
echo "  Portal -> NO persistent Workspace trusted-login creation/resume"
echo "  future tenants -> Portal MFA schema included in lifecycle"
echo ""
echo "Backup: $BACKUP"
echo "GitHub PR: https://github.com/Amir3629/Paymydine-Update/pull/194"
