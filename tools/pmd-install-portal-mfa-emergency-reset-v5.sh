#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="feature/portal-personal-mfa-20260901"
REF="refs/remotes/origin/${BRANCH}"

cd "$ROOT"

SHIFTS="app/admin/controllers/Shifts.php"
GATE="app/Services/PmdSiteAccessWorkspaceGateService.php"
PORTAL="app/Services/PmdPortalTotpService.php"
RESET_JS="app/admin/assets/js/pmd-shifts-portal-mfa-reset-v1.js"

TMPROOT="$(mktemp -d /tmp/pmd-portal-reset-v5.XXXXXX)"
PATCHER="$TMPROOT/patch.py"
BACKUP="/tmp/pmd-portal-reset-v5-backup-$(date +%Y%m%d-%H%M%S)"
APPLY_STARTED=0
RESET_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK PORTAL MFA EMERGENCY RESET V5"
        set +e
        sudo cp -a "$BACKUP/$SHIFTS" "$SHIFTS"
        sudo cp -a "$BACKUP/$GATE" "$GATE"
        if [ "$RESET_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$RESET_JS" "$RESET_JS"
        else
            sudo rm -f "$RESET_JS"
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

for f in "$SHIFTS" "$GATE" "$PORTAL"; do
    test -f "$f" || { echo "STOP: required production file missing: $f"; exit 20; }
done

grep -Fq "class Shifts extends AdminController" "$SHIFTS" || { echo "STOP: Shifts controller shape is unexpected."; exit 21; }
grep -Fq "pmd-shifts-canonical-b4d2e55c5e6d.js" "$SHIFTS" || grep -Fq "pmd-shifts-portal-mfa-reset-v1.js" "$SHIFTS" || { echo "STOP: active Shifts JS anchor is missing."; exit 22; }
grep -Fq "PMD_PORTAL_TOTP_V2" "$PORTAL" || { echo "STOP: Portal MFA V4 service is not installed."; exit 23; }
grep -Fq "public function resetUser(int \$userId): bool" "$PORTAL" || { echo "STOP: Portal MFA reset primitive is missing."; exit 24; }

echo "Fetching the Portal MFA feature branch only..."
git fetch origin "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
git cat-file -e "${REF}^{commit}"
git cat-file -e "${REF}:${RESET_JS}" || { echo "STOP: reset UI asset missing from feature branch."; exit 25; }

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$SHIFTS")" "$TMPROOT/$(dirname "$GATE")" "$TMPROOT/$(dirname "$RESET_JS")"
cp "$SHIFTS" "$TMPROOT/$SHIFTS"
cp "$GATE" "$TMPROOT/$GATE"
git show "${REF}:${RESET_JS}" > "$TMPROOT/$RESET_JS"
test -s "$TMPROOT/$RESET_JS"

cat > "$PATCHER" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
shifts = root / 'app/admin/controllers/Shifts.php'
gate = root / 'app/Services/PmdSiteAccessWorkspaceGateService.php'


def method_block(text: str, signature: str, label: str):
    start = text.find(signature)
    if start < 0:
        raise SystemExit(f'STOP: {label} signature not found')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'STOP: {label} opening brace not found')
    depth = 0
    quote = None
    escaped = False
    for i in range(brace, len(text)):
        ch = text[i]
        if quote is not None:
            if escaped:
                escaped = False
                continue
            if ch == '\\':
                escaped = True
                continue
            if ch == quote:
                quote = None
            continue
        if ch in ("'", '"'):
            quote = ch
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1
    raise SystemExit(f'STOP: {label} closing brace not found')


def patch_shifts():
    p = shifts
    s = p.read_text()

    js_line = "        $this->addJs('js/pmd-shifts-portal-mfa-reset-v1.js');"
    if js_line not in s:
        anchor = "        $this->addJs('js/pmd-shifts-canonical-b4d2e55c5e6d.js');"
        if s.count(anchor) != 1:
            raise SystemExit(f'STOP: Shifts JS anchor expected once, found {s.count(anchor)}')
        s = s.replace(
            anchor,
            anchor + "\n        // PMD_SHIFTS_PORTAL_MFA_RESET_ASSET_V1\n" + js_line,
            1,
        )

    marker = 'PMD_SHIFTS_PORTAL_MFA_EMERGENCY_RESET_V1'
    if marker not in s:
        anchor = "    private function assertOwnerOrManager(): void\n    {"
        if s.count(anchor) != 1:
            raise SystemExit(f'STOP: Shifts authority anchor expected once, found {s.count(anchor)}')

        block = r'''    /** PMD_SHIFTS_PORTAL_MFA_EMERGENCY_RESET_V1 */
    public function portalmfastatus()
    {
        $this->assertOwnerOrManager();

        $context = $this->portalMfaResetContext(
            max(0, (int)request()->query('person_id', 0))
        );
        if (!$context) {
            return response()->json([
                'ok' => false,
                'message' => 'This member does not have a Portal login in this restaurant.',
            ], 404)->header('Cache-Control', 'no-store');
        }

        $portal = app(\App\Services\PmdPortalTotpService::class);
        $ready = $portal->ensureReady();
        $hasPortalMfa = $ready
            && $portal->enabled((int)$context['target_user_id']);

        $message = (string)$context['message'];
        if ($context['can_reset']) {
            $message = $hasPortalMfa
                ? 'Emergency reset is available. The old phone and all Portal recovery codes will be revoked.'
                : 'No active Portal Authenticator is enrolled for this member.';
        }

        return response()->json([
            'ok' => true,
            'can_reset' => (bool)$context['can_reset'],
            'has_portal_mfa' => (bool)$hasPortalMfa,
            'target_name' => (string)$context['target_name'],
            'target_role' => (string)$context['target_role'],
            'message' => $message,
        ])->header('Cache-Control', 'no-store');
    }

    public function resetportalmfa()
    {
        $this->assertOwnerOrManager();
        if (!request()->isMethod('post')) abort(405);

        $context = $this->portalMfaResetContext(
            max(0, (int)request()->input('person_id', 0))
        );
        if (!$context) {
            return response()->json([
                'ok' => false,
                'message' => 'This member does not have a Portal login in this restaurant.',
            ], 404)->header('Cache-Control', 'no-store');
        }

        if (!$context['can_reset']) {
            $this->auditPortalMfaEmergencyReset($context, false, [
                'reason' => (string)$context['message'],
            ]);
            return response()->json([
                'ok' => false,
                'message' => (string)$context['message'],
            ], 403)->header('Cache-Control', 'no-store');
        }

        $portal = app(\App\Services\PmdPortalTotpService::class);
        if (!$portal->ensureReady()) {
            return response()->json([
                'ok' => false,
                'message' => 'Portal Authenticator storage is unavailable.',
            ], 503)->header('Cache-Control', 'no-store');
        }

        $targetUserId = (int)$context['target_user_id'];
        $hadActiveFactor = $portal->enabled($targetUserId);
        if (!$portal->resetUser($targetUserId)) {
            $this->auditPortalMfaEmergencyReset($context, false, [
                'reason' => 'reset_service_failed',
            ]);
            return response()->json([
                'ok' => false,
                'message' => 'Portal Authenticator reset failed.',
            ], 500)->header('Cache-Control', 'no-store');
        }

        $this->auditPortalMfaEmergencyReset($context, true, [
            'had_active_factor' => $hadActiveFactor,
        ]);

        $message = $hadActiveFactor
            ? 'Portal Authenticator reset for '.$context['target_name'].'. The old phone and all recovery codes are revoked. Their next usernameportal login must scan a NEW QR.'
            : $context['target_name'].' does not currently have an active Portal Authenticator.';

        return response()->json([
            'ok' => true,
            'message' => $message,
        ])->header('Cache-Control', 'no-store');
    }

    private function portalMfaResetContext(int $personId): ?array
    {
        if ($personId < 1) return null;

        $locationId = $this->locationId();
        $person = DB::table('pmd_operational_people')
            ->where('id', $personId)
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->first();
        if (!$person || empty($person->staff_id)) return null;

        $staff = Staffs_model::with(['role', 'user'])
            ->find((int)$person->staff_id);
        if (!$staff || !$staff->user) return null;

        $roles = app(PmdDefaultStaffRoleService::class);
        $actorUser = AdminAuth::getUser();
        $actorRole = $roles->roleCodeForUser($actorUser);
        $targetRole = $roles->roleCodeForUser($staff->user);
        $actorUserId = $actorUser ? (int)$actorUser->getKey() : 0;
        $targetUserId = (int)$staff->user->getKey();

        $canReset = false;
        $message = 'You cannot reset this Portal Authenticator.';

        if ($targetRole === PmdDefaultStaffRoleService::OWNER) {
            $message = 'Owner Portal Authenticator can only be reset by PayMyDine Support after identity verification.';
        } elseif ($actorUserId > 0 && $actorUserId === $targetUserId) {
            $message = $actorRole === PmdDefaultStaffRoleService::OWNER
                ? 'Owner self-reset is disabled. Contact PayMyDine Support.'
                : 'You cannot emergency-reset your own Portal Authenticator from Shifts.';
        } elseif ($actorRole === PmdDefaultStaffRoleService::OWNER) {
            $canReset = true;
            $message = 'Owner emergency reset is allowed for this member.';
        } elseif ($actorRole === PmdDefaultStaffRoleService::MANAGER) {
            if ($targetRole === PmdDefaultStaffRoleService::MANAGER) {
                $message = 'Only the Owner can reset a Manager Portal Authenticator.';
            } else {
                $canReset = true;
                $message = 'Manager emergency reset is allowed for this staff member.';
            }
        }

        return [
            'location_id' => $locationId,
            'person_id' => (int)$person->id,
            'target_staff_id' => (int)$staff->staff_id,
            'target_user_id' => $targetUserId,
            'target_name' => trim((string)($person->display_name ?: $staff->staff_name)) ?: 'Staff member',
            'target_role' => (string)$targetRole,
            'actor_user_id' => $actorUserId,
            'actor_role' => (string)$actorRole,
            'can_reset' => $canReset,
            'message' => $message,
        ];
    }

    private function auditPortalMfaEmergencyReset(array $context, bool $success, array $extra = []): void
    {
        $metadata = array_merge([
            'surface' => 'shifts_member_modal',
            'actor_role' => (string)($context['actor_role'] ?? ''),
            'target_user_id' => (int)($context['target_user_id'] ?? 0),
            'target_staff_id' => (int)($context['target_staff_id'] ?? 0),
            'target_person_id' => (int)($context['person_id'] ?? 0),
            'target_role' => (string)($context['target_role'] ?? ''),
            'target_name' => (string)($context['target_name'] ?? ''),
        ], $extra);

        try {
            $site = app(\App\Services\PmdSiteAccessService::class);
            $identity = $site->identity();
            $site->audit(
                'portal_mfa_emergency_reset',
                $success,
                $identity,
                null,
                null,
                request(),
                $metadata
            );
        } catch (\Throwable $error) {
            logger()->warning('PMD Portal MFA emergency reset audit failed', [
                'message' => $error->getMessage(),
            ]);
        }

        logger()->info('PMD Portal MFA emergency reset', array_merge($metadata, [
            'success' => $success,
        ]));
    }

'''
        s = s.replace(anchor, block + anchor, 1)

    p.write_text(s)
    print('Shifts.php: emergency Portal MFA reset integrated')


def portal_method_v2():
    return r'''    /** PMD_PORTAL_SESSION_ROUTE_AUTHORITY_V2 */
    private function portalGateResponse(
        Request $request,
        PmdSiteAccessService $site,
        array $identity,
        int $locationId,
        string $relative
    ) {
        foreach (['logout', '_assets', '_pmd/language-switch'] as $allowed) {
            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
        }

        if (session()->has('pmd_login_portal_security_v1')) {
            return redirect(admin_url('login'));
        }

        $binding = app(PmdSiteAccessSessionBindingService::class);
        $portal = app(PmdPortalTotpService::class);
        $proof = (array)session()->get(PmdPortalTotpService::SESSION_VERIFIED, []);
        $verifiedAt = (int)($proof['verified_at'] ?? 0);
        $activeFactor = null;

        try {
            if ($portal->ready()) {
                $activeFactor = \Illuminate\Support\Facades\DB::table(PmdPortalTotpService::TABLE)
                    ->where('user_id', (int)$identity['user_id'])
                    ->whereNotNull('confirmed_at')
                    ->whereNull('disabled_at')
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->first();
            }
        } catch (\Throwable $error) {
            $activeFactor = null;
        }

        $factorConfirmedAt = $activeFactor && !empty($activeFactor->confirmed_at)
            ? (int)strtotime((string)$activeFactor->confirmed_at)
            : 0;

        // The proof must belong to the currently-active factor generation.
        // Resetting or re-enrolling the factor makes old Portal sessions fail
        // on their very next request, even if their work-session cookie exists.
        $factorMatchesProof = $activeFactor
            && $verifiedAt > 0
            && $factorConfirmedAt > 0
            && $factorConfirmedAt <= ($verifiedAt + 1);

        $portalVerified = $site->isWorkspaceVerified($locationId)
            && (string)session()->get(PmdSiteAccessService::SESSION_VERIFIED_METHOD, '') === 'portal_totp'
            && $binding->isBoundToCurrentUser()
            && $portal->sessionVerified(
                (int)$identity['user_id'],
                $locationId,
                86400
            )
            && $factorMatchesProof;

        if (!$portalVerified) {
            try {
                $site->clearVerification();
                app(PmdWorkSessionPolicyService::class)->clear();
                AdminAuth::logout();
            } catch (\Throwable $error) {
            }

            session()->invalidate();
            session()->regenerateToken();

            if ($relative === 'login') return null;

            return redirect(admin_url('login?portal=security-reset'))->with(
                'error',
                'Your Portal Authenticator was reset or changed. Sign in again and use the new factor.'
            );
        }

        if ($relative === 'login') return null;
        if ($relative === 'mywork' || str_starts_with($relative, 'mywork/')) return null;
        if ($relative === 'siteaccess/session/ping') return null;

        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {
            return redirect(admin_url('mywork'));
        }

        return response(
            'This Staff Portal session cannot perform Admin workspace actions.',
            403,
            ['Cache-Control' => 'no-store']
        );
    }
'''


def patch_gate():
    p = gate
    s = p.read_text()

    hook_marker = 'PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1'
    if hook_marker not in s:
        old = """        $relative = $this->relativeAdminPath($request);\n        if (str_starts_with($relative, '_pmd/language-switch')) return null;\n\n        if (session()->has('pmd_login_owner_security_v1')) {"""
        new = """        $relative = $this->relativeAdminPath($request);\n        if (str_starts_with($relative, '_pmd/language-switch')) return null;\n\n        // PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1\n        // usernameportal is a Staff Portal session, never an Admin workspace session.\n        if ((string)session()->get(\n            PmdSiteAccessService::SESSION_DESTINATION,\n            'workspace'\n        ) === 'staff') {\n            return $this->portalGateResponse($request, $site, $identity, $locationId, $relative);\n        }\n\n        if (session()->has('pmd_login_owner_security_v1')) {"""
        if s.count(old) != 1:
            raise SystemExit(f'STOP: Portal gate hook anchor expected once, found {s.count(old)}')
        s = s.replace(old, new, 1)

    signature = '    private function portalGateResponse('
    if signature in s:
        a, b = method_block(s, signature, 'portalGateResponse')
        s = s[:a] + portal_method_v2() + s[b:]
    else:
        anchor = "    private function relativeAdminPath(Request $request): string\n    {"
        if s.count(anchor) != 1:
            raise SystemExit(f'STOP: relativeAdminPath anchor expected once, found {s.count(anchor)}')
        s = s.replace(anchor, portal_method_v2() + "\n" + anchor, 1)

    p.write_text(s)
    print('PmdSiteAccessWorkspaceGateService.php: active-factor revocation integrated')


patch_shifts()
patch_gate()
PY

python3 "$PATCHER" "$TMPROOT"

echo ""
echo "========================================"
echo "3. VERIFY TEMP FILES"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$SHIFTS"
php -l "$TMPROOT/$GATE"
node --check "$TMPROOT/$RESET_JS"

grep -Fq "PMD_SHIFTS_PORTAL_MFA_EMERGENCY_RESET_V1" "$TMPROOT/$SHIFTS"
grep -Fq "pmd-shifts-portal-mfa-reset-v1.js" "$TMPROOT/$SHIFTS"
grep -Fq "portal_mfa_emergency_reset" "$TMPROOT/$SHIFTS"
grep -Fq "PMD_PORTAL_SESSION_ROUTE_AUTHORITY_V2" "$TMPROOT/$GATE"
grep -Fq "PmdPortalTotpService::SESSION_VERIFIED" "$TMPROOT/$GATE"
grep -Fq "PMD_SHIFTS_PORTAL_MFA_RESET_V1" "$TMPROOT/$RESET_JS"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 3 TARGET FILES"
echo "========================================"

mkdir -p "$BACKUP"
for f in "$SHIFTS" "$GATE"; do
    sudo mkdir -p "$BACKUP/$(dirname "$f")"
    sudo cp -a "$f" "$BACKUP/$f"
done
if [ -e "$RESET_JS" ]; then
    RESET_JS_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$RESET_JS")"
    sudo cp -a "$RESET_JS" "$BACKUP/$RESET_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 3 TARGET FILES"
echo "========================================"

APPLY_STARTED=1
sudo tee "$SHIFTS" >/dev/null < "$TMPROOT/$SHIFTS"
sudo tee "$GATE" >/dev/null < "$TMPROOT/$GATE"
sudo tee "$RESET_JS" >/dev/null < "$TMPROOT/$RESET_JS"
sudo chown --reference="app/admin/assets/js/pmd-shifts-canonical-b4d2e55c5e6d.js" "$RESET_JS"
sudo chmod --reference="app/admin/assets/js/pmd-shifts-canonical-b4d2e55c5e6d.js" "$RESET_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE SOURCE"
echo "========================================"

php -l "$SHIFTS"
php -l "$GATE"
node --check "$RESET_JS"

grep -nF "PMD_SHIFTS_PORTAL_MFA_EMERGENCY_RESET_V1" "$SHIFTS"
grep -nF "pmd-shifts-portal-mfa-reset-v1.js" "$SHIFTS"
grep -nF "PMD_PORTAL_SESSION_ROUTE_AUTHORITY_V2" "$GATE"
grep -nF "PMD_SHIFTS_PORTAL_MFA_RESET_V1" "$RESET_JS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR CACHE"
echo "========================================"
sudo -u www-data php artisan optimize:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - PORTAL MFA EMERGENCY RESET V5 INSTALLED"
echo "========================================"
echo "Rules now enforced:"
echo "  Owner -> may reset Manager and normal Staff Portal MFA"
echo "  Manager -> may reset normal Staff Portal MFA only"
echo "  Manager -> may NOT reset another Manager"
echo "  Nobody in Shifts -> may reset Owner Portal MFA"
echo "  Owner lost phone + recovery codes -> PayMyDine Support"
echo "  Reset -> old Authenticator + recovery codes revoked"
echo "  Reset -> old Portal session is rejected on its next request"
echo "  Reset -> next usernameportal login requires a NEW QR"
echo "  Reset -> never approves a login and never bypasses password"
echo ""
echo "Backup: $BACKUP"
echo "GitHub PR: https://github.com/Amir3629/Paymydine-Update/pull/194"
