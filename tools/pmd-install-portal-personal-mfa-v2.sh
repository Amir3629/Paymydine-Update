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

TMPROOT="$(mktemp -d /tmp/pmd-portal-mfa-v2.XXXXXX)"
PATCHER="$TMPROOT/patch_integration.py"
BACKUP="/tmp/pmd-portal-mfa-v2-backup-$(date +%Y%m%d-%H%M%S)"
SOURCE_WORKTREE=""
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
        echo "ERROR DETECTED - ROLLING BACK PORTAL MFA FILES"
        set +e

        for f in "${EXISTING[@]}"; do
            sudo cp -a "$BACKUP/$f" "$f"
        done

        if [ "$MIGRATION_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$MIGRATION" "$MIGRATION"
        else
            sudo rm -f "$MIGRATION"
        fi

        if [ "$SERVICE_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$SERVICE" "$SERVICE"
        else
            sudo rm -f "$SERVICE"
        fi

        if [ "$TRAIT_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$TRAIT" "$TRAIT"
        else
            sudo rm -f "$TRAIT"
        fi

        if [ "$VIEW_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$VIEW" "$VIEW"
        else
            sudo rm -f "$VIEW"
        fi

        echo "ROLLBACK COMPLETE"
        echo "Backup kept at: $BACKUP"
    fi

    if [ -n "$SOURCE_WORKTREE" ]; then
        git worktree remove --force "$SOURCE_WORKTREE" >/dev/null 2>&1 || true
    fi

    rm -rf "$TMPROOT"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

for f in "${EXISTING[@]}"; do
    test -f "$f" || { echo "STOP: production file missing: $f"; exit 20; }
done

echo "Fetching Portal MFA feature branch only..."
git fetch origin "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
git cat-file -e "${REF}^{commit}"

for f in "${NEWFILES[@]}"; do
    git cat-file -e "${REF}:${f}" || { echo "STOP: feature file missing in branch: $f"; exit 21; }
done

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "========================================"

for f in "${ALLFILES[@]}"; do
    mkdir -p "$TMPROOT/$(dirname "$f")"
done

for f in "${EXISTING[@]}"; do
    cp "$f" "$TMPROOT/$f"
done

for f in "${NEWFILES[@]}"; do
    git show "${REF}:${f}" > "$TMPROOT/$f"
    test -s "$TMPROOT/$f"
done

cat > "$PATCHER" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
LOGIN = root / 'app/admin/controllers/Login.php'
TRUSTED = root / 'app/Services/PmdTrustedLoginDeviceService.php'
LIFECYCLE = root / 'app/Services/SuperAdminTenantLifecycleService.php'
GATE = root / 'app/Services/PmdSiteAccessWorkspaceGateService.php'
TRAIT = root / 'app/admin/traits/HandlesPortalMfa.php'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


def patch_login():
    p = LOGIN
    s = p.read_text()
    marker = 'PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1'
    if marker in s:
        print('Login.php: integration already present')
        return

    import_anchor = 'use Admin\\Traits\\ValidatesForm;'
    s = replace_once(
        s,
        import_anchor,
        'use Admin\\Traits\\HandlesPortalMfa;\n' + import_anchor,
        'Login trait import'
    )

    trait_anchor = '    use ValidatesForm;'
    s = replace_once(
        s,
        trait_anchor,
        '    use ValidatesForm;\n    use HandlesPortalMfa;',
        'Login trait use'
    )

    index_anchor = '''        if (AdminAuth::isLogged()) {\n            if (session()->has(self::PMD_OWNER_SECURITY_SESSION)) {'''
    index_new = '''        if (AdminAuth::isLogged()) {\n            // PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1\n            $portalMfa = $this->pmdPortalMfaIndexResponse();\n            if ($portalMfa) {\n                Template::setTitle('Staff Portal Security - PayMyDine');\n                return $portalMfa;\n            }\n\n            if (session()->has(self::PMD_OWNER_SECURITY_SESSION)) {'''
    s = replace_once(s, index_anchor, index_new, 'Login index portal hook')

    resume_anchor = '        // PMD_TRUSTED_PASSWORD_POST_RESUME_V3'
    portal_block = '''        // PMD_PORTAL_PERSONAL_MFA_DESTINATION_V1\n        // username + "portal" always uses the person's own Authenticator.\n        // Never create or wait for a Workplace/Admin approval challenge here.\n        if ($destination === 'staff') {\n            try {\n                $this->pmdBeginPortalMfa();\n                return redirect(admin_url('login'));\n            } catch (ValidationException $error) {\n                throw $error;\n            } catch (\\Throwable $error) {\n                logger()->error('PMD Portal MFA start failed', [\n                    'user_id' => (int)optional(AdminAuth::getUser())->getKey(),\n                    'message' => $error->getMessage(),\n                ]);\n\n                $this->pmdAbortBootstrapLogin(\n                    'Portal security is temporarily unavailable. Try again shortly.'\n                );\n            }\n        }\n\n'''
    s = replace_once(
        s,
        resume_anchor,
        portal_block + resume_anchor,
        'Login pre-trusted portal branch'
    )

    p.write_text(s)
    print('Login.php: patched')


def patch_trusted():
    p = TRUSTED
    s = p.read_text()

    if 'PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1' not in s:
        anchor = '''    public function rememberVerifiedResponse(Request $request, $response)\n    {'''
        new = '''    public function rememberVerifiedResponse(Request $request, $response)\n    {\n        // PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1\n        // Personal Portal TOTP verifies only the current Portal session. It must\n        // never create/renew a token that could bypass future Workspace approval.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return $response;\n        }'''
        s = replace_once(s, anchor, new, 'Trusted remember portal guard')

    if 'PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1' not in s:
        anchor = '''    public function resumeIfPossible(Request $request)\n    {'''
        new = '''    public function resumeIfPossible(Request $request)\n    {\n        // PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1\n        // Even a browser trusted for Workspace must enter the Staff Portal's\n        // personal Authenticator code after a fresh usernameportal + password.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return null;\n        }'''
        s = replace_once(s, anchor, new, 'Trusted resume portal guard')

    p.write_text(s)
    print('PmdTrustedLoginDeviceService.php: patched')


def patch_lifecycle():
    p = LIFECYCLE
    s = p.read_text()
    marker = 'PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1'
    if marker in s:
        print('SuperAdminTenantLifecycleService.php: integration already present')
        return

    empty_anchor = '''        'pmd_site_access_recovery_codes',\n        'pmd_owner_mfa',\n\n        // Reservations / floor / service activity'''
    empty_new = '''        'pmd_site_access_recovery_codes',\n        'pmd_owner_mfa',\n        'pmd_portal_mfa',\n\n        // Reservations / floor / service activity'''
    s = replace_once(
        s,
        empty_anchor,
        empty_new,
        'Lifecycle empty Portal security table'
    )

    migration_anchor = '''        $ownerMigration = base_path(\n            'app/system/database/migrations/2026_08_30_123000_create_pmd_owner_mfa_table.php'\n        );\n\n        if (!is_file($siteMigration) || !is_file($ownerMigration)) {'''
    migration_new = '''        $ownerMigration = base_path(\n            'app/system/database/migrations/2026_08_30_123000_create_pmd_owner_mfa_table.php'\n        );\n        // PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1\n        $portalMigration = base_path(\n            'app/system/database/migrations/2026_09_01_000000_create_pmd_portal_mfa_table.php'\n        );\n\n        if (\n            !is_file($siteMigration)\n            || !is_file($ownerMigration)\n            || !is_file($portalMigration)\n        ) {'''
    s = replace_once(s, migration_anchor, migration_new, 'Lifecycle portal migration path')

    require_anchor = '''        require_once $siteMigration;\n        require_once $ownerMigration;\n\n        (new \\System\\Database\\Migrations\\CreatePmdSiteAccessTables())->up();\n        (new \\System\\Database\\Migrations\\CreatePmdOwnerMfaTable())->up();'''
    require_new = '''        require_once $siteMigration;\n        require_once $ownerMigration;\n        require_once $portalMigration;\n\n        (new \\System\\Database\\Migrations\\CreatePmdSiteAccessTables())->up();\n        (new \\System\\Database\\Migrations\\CreatePmdOwnerMfaTable())->up();\n        (new \\System\\Database\\Migrations\\CreatePmdPortalMfaTable())->up();'''
    s = replace_once(s, require_anchor, require_new, 'Lifecycle portal migration run')

    verify_anchor = '''            'pmd_site_access_recovery_codes',\n            'pmd_owner_mfa',\n        ] as $table) {'''
    verify_new = '''            'pmd_site_access_recovery_codes',\n            'pmd_owner_mfa',\n            'pmd_portal_mfa',\n        ] as $table) {'''
    s = replace_once(s, verify_anchor, verify_new, 'Lifecycle portal table verification')

    p.write_text(s)
    print('SuperAdminTenantLifecycleService.php: patched')


def patch_gate():
    p = GATE
    s = p.read_text()
    marker = 'PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1'
    if marker in s:
        print('PmdSiteAccessWorkspaceGateService.php: integration already present')
        return

    hook_anchor = '''        $relative = $this->relativeAdminPath($request);\n        if (str_starts_with($relative, '_pmd/language-switch')) return null;\n\n        if (session()->has('pmd_login_owner_security_v1')) {'''
    hook_new = '''        $relative = $this->relativeAdminPath($request);\n        if (str_starts_with($relative, '_pmd/language-switch')) return null;\n\n        // PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1\n        // A usernameportal session is a Staff Portal session, never an Admin\n        // workspace session. Personal TOTP may open /admin/mywork only.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return $this->portalGateResponse(\n                $request,\n                $site,\n                $identity,\n                $locationId,\n                $relative\n            );\n        }\n\n        if (session()->has('pmd_login_owner_security_v1')) {'''
    s = replace_once(s, hook_anchor, hook_new, 'Portal route isolation hook')

    method_anchor = '''    private function relativeAdminPath(Request $request): string\n    {'''
    portal_method = '''    private function portalGateResponse(\n        Request $request,\n        PmdSiteAccessService $site,\n        array $identity,\n        int $locationId,\n        string $relative\n    ) {\n        // Login and its AJAX MFA handlers must remain reachable while the\n        // personal Authenticator step is pending. Static Admin assets are safe.\n        foreach (['login', 'logout', '_assets', '_pmd/language-switch'] as $allowed) {\n            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) {\n                return null;\n            }\n        }\n\n        if (session()->has('pmd_login_portal_security_v1')) {\n            return redirect(admin_url('login'));\n        }\n\n        $binding = app(PmdSiteAccessSessionBindingService::class);\n        $portalVerified = $site->isWorkspaceVerified($locationId)\n            && (string)session()->get(\n                PmdSiteAccessService::SESSION_VERIFIED_METHOD,\n                ''\n            ) === 'portal_totp'\n            && $binding->isBoundToCurrentUser();\n\n        if (!$portalVerified) {\n            return redirect(admin_url('login'))->with(\n                'error',\n                'Complete your personal Portal Authenticator check.'\n            );\n        }\n\n        if ($relative === 'mywork' || str_starts_with($relative, 'mywork/')) {\n            return null;\n        }\n\n        // Read-only session heartbeat is allowed so normal work-session expiry\n        // behavior remains available without opening any Admin business route.\n        if ($relative === 'siteaccess/session/ping') return null;\n\n        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {\n            return redirect(admin_url('mywork'));\n        }\n\n        return response(\n            'This Staff Portal session cannot perform Admin workspace actions.',\n            403,\n            ['Cache-Control' => 'no-store']\n        );\n    }\n\n'''
    s = replace_once(
        s,
        method_anchor,
        portal_method + method_anchor,
        'Portal route isolation method'
    )

    p.write_text(s)
    print('PmdSiteAccessWorkspaceGateService.php: patched')


def patch_trait():
    p = TRAIT
    s = p.read_text()
    marker = 'PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2'
    if marker in s:
        print('HandlesPortalMfa.php: staff-profile guard already present')
        return

    anchor = '''        $userId = (int)($identity['user_id'] ?? 0);\n        $locationId = (int)($identity['location_id'] ?? 0);\n\n        if ($userId < 1 || $locationId < 1) {\n            throw new ValidationException([\n                'username' => 'Portal security is not ready for this account.',\n            ]);\n        }'''
    new = '''        $userId = (int)($identity['user_id'] ?? 0);\n        $staffId = (int)($identity['staff_id'] ?? 0);\n        $locationId = (int)($identity['location_id'] ?? 0);\n\n        // PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2\n        // Portal access belongs to a real Team/Staff identity. A framework\n        // super-user without a Staff profile remains an Admin-only account.\n        if ($userId < 1 || $staffId < 1 || $locationId < 1) {\n            throw new ValidationException([\n                'username' => 'This account needs an active Team profile before Staff Portal can be used.',\n            ]);\n        }'''
    s = replace_once(s, anchor, new, 'Portal Staff profile guard')
    p.write_text(s)
    print('HandlesPortalMfa.php: staff-profile guard added')


for file in [LOGIN, TRUSTED, LIFECYCLE, GATE, TRAIT]:
    if not file.is_file():
        raise SystemExit(f'STOP: required file missing: {file}')

patch_login()
patch_trusted()
patch_lifecycle()
patch_gate()
patch_trait()
PY

python3 "$PATCHER" "$TMPROOT"

echo ""
echo "========================================"
echo "3. VERIFY TEMP FILES - NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$LOGIN"
php -l "$TMPROOT/$TRUSTED"
php -l "$TMPROOT/$LIFECYCLE"
php -l "$TMPROOT/$GATE"
php -l "$TMPROOT/$MIGRATION"
php -l "$TMPROOT/$SERVICE"
php -l "$TMPROOT/$TRAIT"

grep -Fq "PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1" "$TMPROOT/$LOGIN"
grep -Fq "PMD_PORTAL_PERSONAL_MFA_DESTINATION_V1" "$TMPROOT/$LOGIN"
grep -Fq "PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1" "$TMPROOT/$TRUSTED"
grep -Fq "PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1" "$TMPROOT/$TRUSTED"
grep -Fq "PMD_NEW_TENANT_PORTAL_MFA_SCHEMA_V1" "$TMPROOT/$LIFECYCLE"
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
echo "5. APPLY ONLY PORTAL MFA TARGET FILES"
echo "========================================"

APPLY_STARTED=1

for f in "${EXISTING[@]}"; do
    sudo tee "$f" >/dev/null < "$TMPROOT/$f"
done

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
grep -nF "PMD_PORTAL_PERSONAL_MFA_DESTINATION_V1" "$LOGIN"
grep -nF "PMD_PORTAL_MFA_NO_PERSISTENT_TRUST_V1" "$TRUSTED"
grep -nF "PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1" "$TRUSTED"
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
echo "8. SYNC THE SAME INTEGRATION TO PR #194"
echo "========================================"

SOURCE_WORKTREE="/tmp/pmd-portal-source-v2-$(date +%Y%m%d-%H%M%S)-$$"
SOURCE_SYNC="NOT_ATTEMPTED"
SOURCE_SHA=""

if git worktree add --detach "$SOURCE_WORKTREE" "$REF" >/dev/null 2>&1; then
    if python3 "$PATCHER" "$SOURCE_WORKTREE" \
       && php -l "$SOURCE_WORKTREE/$LOGIN" >/dev/null \
       && php -l "$SOURCE_WORKTREE/$TRUSTED" >/dev/null \
       && php -l "$SOURCE_WORKTREE/$LIFECYCLE" >/dev/null \
       && php -l "$SOURCE_WORKTREE/$GATE" >/dev/null \
       && php -l "$SOURCE_WORKTREE/$MIGRATION" >/dev/null \
       && php -l "$SOURCE_WORKTREE/$SERVICE" >/dev/null \
       && php -l "$SOURCE_WORKTREE/$TRAIT" >/dev/null \
       && git -C "$SOURCE_WORKTREE" diff --check; then

        git -C "$SOURCE_WORKTREE" add -- \
            "$LOGIN" "$TRUSTED" "$LIFECYCLE" "$GATE" "$TRAIT"

        if git -C "$SOURCE_WORKTREE" diff --cached --quiet; then
            SOURCE_SYNC="ALREADY_SYNCED"
            SOURCE_SHA="$(git -C "$SOURCE_WORKTREE" rev-parse HEAD)"
        elif git -C "$SOURCE_WORKTREE" \
              -c user.name="PayMyDine Portal MFA" \
              -c user.email="portal-mfa@paymydine.local" \
              commit -m "Integrate and isolate personal Portal MFA login" >/dev/null \
             && git -C "$SOURCE_WORKTREE" push origin "HEAD:refs/heads/$BRANCH"; then
            SOURCE_SYNC="PUSHED"
            SOURCE_SHA="$(git -C "$SOURCE_WORKTREE" rev-parse HEAD)"
        else
            SOURCE_SYNC="PUSH_FAILED"
        fi
    else
        SOURCE_SYNC="SOURCE_VERIFY_FAILED"
    fi
else
    SOURCE_SYNC="WORKTREE_FAILED"
fi

git worktree remove --force "$SOURCE_WORKTREE" >/dev/null 2>&1 || true
SOURCE_WORKTREE=""

echo ""
echo "========================================"
echo "SUCCESS - LIVE PORTAL MFA V2 INSTALLED"
echo "========================================"
echo "Behavior:"
echo "  username         -> existing Workspace security"
echo "  usernameportal   -> personal Authenticator -> /admin/mywork"
echo "  first Portal use -> QR + first 6-digit code"
echo "  later Portal use -> personal 6-digit Authenticator code"
echo "  Portal path      -> NO Admin/Owner approval challenge"
echo "  Portal session   -> restricted to /admin/mywork"
echo "  Portal MFA       -> NO new persistent Workspace trusted-login token"
echo ""
echo "Backup: $BACKUP"
echo "GitHub PR: https://github.com/Amir3629/Paymydine-Update/pull/194"
echo "Source sync: $SOURCE_SYNC"
if [ -n "$SOURCE_SHA" ]; then echo "Source SHA: $SOURCE_SHA"; fi

echo ""
echo "TARGET FILES:"
printf '  %s\n' "${ALLFILES[@]}"
