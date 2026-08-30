<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkplaceCodeService;
use App\Services\PmdWorkplaceHubBootstrapService;
use App\Services\PmdWorkSessionPolicyService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** PMD_WORKPLACE_ACCESS_CONTROLLER_V3 */
class Siteaccess extends AdminController
{
    protected $requiredPermissions = null;

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-site-access-page');
    }

    public function index(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        $service = app(PmdSiteAccessService::class);
        $identity = $service->identity();
        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        $isOwner = $role === PmdDefaultStaffRoleService::OWNER;
        $ownerTotp = app(PmdOwnerTotpService::class);

        if (!$service->ready()) {
            return view('siteaccess/index_v2', [
                'ready' => false,
                'challenge' => null,
                'identity' => $identity,
                'onlineHub' => false,
                'canRecover' => false,
                'isOwner' => $isOwner,
                'ownerTotpEnabled' => false,
                'localWorkplaceCode' => null,
            ]);
        }

        $hub = $service->currentHub($request, (int)$identity['location_id']);
        if ($hub) $service->touchDevice((int)$hub->id);

        if ($hub && !$service->challengeForSession()) {
            return redirect(admin_url('siteaccess/hub'));
        }

        $challenge = $service->challengeForSession();
        if (!$challenge) {
            $destination = (string)session()->get(PmdSiteAccessService::SESSION_DESTINATION, 'workspace');
            return redirect($destination === 'staff' ? admin_url('mywork') : admin_url('dashboard'));
        }

        $localWorkplaceCode = null;
        if ($hub && (int)$identity['location_id'] > 0) {
            $localWorkplaceCode = app(PmdWorkplaceCodeService::class)->current((int)$identity['location_id']);
        }

        return view('siteaccess/index_v2', [
            'ready' => true,
            'challenge' => $challenge,
            'identity' => $identity,
            'onlineHub' => $service->hasOnlineHub((int)$identity['location_id']),
            'canRecover' => $isOwner,
            'isOwner' => $isOwner,
            'ownerTotpEnabled' => $isOwner && $ownerTotp->enabled((int)$identity['user_id']),
            'localWorkplaceCode' => $localWorkplaceCode,
        ]);
    }

    public function verify(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        $service = app(PmdSiteAccessService::class);
        $identity = $service->identity();
        $challenge = $service->challengeForSession();

        if (!$challenge || (int)$challenge->user_id !== (int)$identity['user_id']) {
            return redirect(admin_url('siteaccess'))->with('error', 'No active workplace verification request.');
        }

        if ($challenge->status !== 'pending') {
            return redirect(admin_url('siteaccess'))->with('error', 'This workplace verification request is no longer pending.');
        }

        if (Carbon::parse($challenge->expires_at)->isPast()) {
            return redirect(admin_url('siteaccess'))->with('error', 'This request expired. Sign in again.');
        }

        $attempts = (int)$challenge->attempts + 1;
        DB::table('pmd_site_access_challenges')
            ->where('id', $challenge->id)
            ->update(['attempts' => $attempts, 'updated_at' => now()]);

        if ($attempts > 8) {
            DB::table('pmd_site_access_challenges')
                ->where('id', $challenge->id)
                ->update(['status' => 'declined', 'updated_at' => now()]);

            $service->audit('workplace_code_locked', false, $identity, null, (int)$challenge->id, $request);
            return redirect(admin_url('siteaccess'))->with('error', 'Too many attempts. Sign in again.');
        }

        $locationId = (int)$challenge->location_id;
        $valid = app(PmdWorkplaceCodeService::class)->verify(
            $locationId,
            (string)$request->input('code', '')
        );

        if (!$valid) {
            $service->audit('workplace_code_failed', false, $identity, null, (int)$challenge->id, $request);
            return redirect(admin_url('siteaccess'))->with('error', 'The workplace code is not correct. Check the code shown on the restaurant Admin/Cashier.');
        }

        if (!$service->hasOnlineHub($locationId)) {
            return redirect(admin_url('siteaccess'))->with('error', 'The restaurant Workplace Access device is offline. Open PMD on the restaurant Admin/Cashier first.');
        }

        DB::table('pmd_site_access_challenges')
            ->where('id', $challenge->id)
            ->update([
                'status' => 'approved',
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

        $service->audit('workplace_code_verified', true, $identity, null, (int)$challenge->id, $request);

        return $this->finalizeResponse($service, $request);
    }

    public function finalize(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);

        try {
            $service = app(PmdSiteAccessService::class);
            $result = $service->finalizeCurrent($request);
            $this->bindAndApplySessionPolicy($service);
            return response()->json(['ok' => true, 'redirect' => $result['redirect']]);
        } catch (\Throwable $error) {
            return response()->json(['ok' => false, 'message' => $error->getMessage()], 409);
        }
    }

    public function status(Request $request = null): JsonResponse
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return response()->json(['ok' => false], 401);

        $service = app(PmdSiteAccessService::class);
        $challenge = $service->challengeForSession();
        if (!$challenge) return response()->json(['ok' => false, 'status' => 'missing'], 404);

        return response()->json([
            'ok' => true,
            'status' => $challenge->status,
            'expires_at' => $challenge->expires_at,
            'online_hub' => $service->hasOnlineHub((int)$challenge->location_id),
        ])->header('Cache-Control', 'no-store');
    }

    public function qr(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        $service = app(PmdSiteAccessService::class);
        $publicId = trim((string)$request->query('challenge', ''));
        $token = trim((string)$request->query('token', ''));
        $sessionChallenge = $service->challengeForSession();
        $identity = $service->identity();

        if (!$sessionChallenge || $publicId !== (string)$sessionChallenge->public_id) {
            return redirect(admin_url('siteaccess'))->with('error', 'This QR code does not belong to your current login request.');
        }
        if (!$service->verifyQrToken($publicId, $token)) {
            return redirect(admin_url('siteaccess'))->with('error', 'This QR code expired or is not valid.');
        }
        if (!$service->hasOnlineHub((int)$identity['location_id'])) {
            return redirect(admin_url('siteaccess'))->with('error', 'Open Workplace Access on the restaurant Admin/Cashier and try again.');
        }

        DB::table('pmd_site_access_challenges')->where('id', $sessionChallenge->id)->update([
            'status' => 'approved',
            'approved_at' => now(),
            'updated_at' => now(),
        ]);
        $service->audit('challenge_qr_verified', true, $identity, null, (int)$sessionChallenge->id, $request);

        return $this->finalizeResponse($service, $request);
    }

    public function recovery(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        $service = app(PmdSiteAccessService::class);
        if (!$service->useRecoveryCode((string)$request->input('recovery_code', ''), $request)) {
            return redirect(admin_url('siteaccess'))->with('error', 'Recovery code is not valid or was already used.');
        }

        $pending = (array)session()->get(PmdSiteAccessService::SESSION_PENDING, []);
        $this->bindAndApplySessionPolicy($service);
        session()->forget(PmdSiteAccessService::SESSION_PENDING);
        return redirect((string)($pending['redirect'] ?? admin_url('dashboard')))
            ->with('success', 'Emergency Workplace Access verified.');
    }

    // PMD_OWNER_AUTHENTICATOR_V1
    public function ownermfasetup(Request $request = null)
    {
        $request = $request ?: request();
        $identity = $this->ownerIdentity();
        if (!$identity) return redirect(admin_url('login'));

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->ready()) {
            return redirect(admin_url('login'))->with('error', 'Owner Authenticator storage is not ready.');
        }
        if ($totp->enabled((int)$identity['user_id'])) {
            return redirect(admin_url('siteaccess/owner-mfa'));
        }

        $enrollment = $totp->enrollment((int)$identity['user_id'], (int)$identity['location_id']);
        return view('siteaccess/owner_mfa', [
            'mode' => 'setup',
            'identity' => $identity,
            'secret' => (string)$enrollment['secret'],
        ]);
    }

    public function ownermfaqr(Request $request = null)
    {
        $request = $request ?: request();
        $identity = $this->ownerIdentity();
        if (!$identity) return response('Owner authentication required.', 401);

        $totp = app(PmdOwnerTotpService::class);
        $enrollment = $totp->enrollment((int)$identity['user_id'], (int)$identity['location_id']);

        try {
            $svg = app(PmdSiteAccessQrService::class)->svg($totp->provisioningUri($enrollment), 6);
        } catch (\Throwable $error) {
            report($error);
            return response('Authenticator QR unavailable.', 500);
        }

        return response($svg, 200)
            ->header('Content-Type', 'image/svg+xml; charset=UTF-8')
            ->header('Cache-Control', 'no-store, private, max-age=0')
            ->header('X-Content-Type-Options', 'nosniff');
    }

    public function ownermfaconfirm(Request $request = null)
    {
        $request = $request ?: request();
        $identity = $this->ownerIdentity();
        if (!$identity) return redirect(admin_url('login'));

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->confirmEnrollment(
            (int)$identity['user_id'],
            (int)$identity['location_id'],
            (string)$request->input('code', '')
        )) {
            return redirect(admin_url('siteaccess/owner-mfa/setup'))
                ->with('error', 'That Authenticator code is not valid. Check the phone time and try again.');
        }

        app(PmdSiteAccessService::class)->audit(
            'owner_totp_enrolled',
            true,
            $identity,
            null,
            null,
            $request
        );

        return redirect(admin_url('siteaccess/hub'))
            ->with('success', 'Owner Authenticator connected. Now activate Workplace Access on the restaurant device.');
    }

    public function ownermfa(Request $request = null)
    {
        $request = $request ?: request();
        $identity = $this->ownerIdentity();
        if (!$identity) return redirect(admin_url('login'));

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->enabled((int)$identity['user_id'])) {
            return redirect(admin_url('siteaccess/owner-mfa/setup'));
        }

        return view('siteaccess/owner_mfa', [
            'mode' => 'verify',
            'identity' => $identity,
        ]);
    }

    public function ownermfaverify(Request $request = null)
    {
        $request = $request ?: request();
        $identity = $this->ownerIdentity();
        if (!$identity) return redirect(admin_url('login'));

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->verify((int)$identity['user_id'], (string)$request->input('code', ''))) {
            app(PmdSiteAccessService::class)->audit('owner_totp_failed', false, $identity, null, null, $request);
            return redirect(admin_url('siteaccess/owner-mfa'))
                ->with('error', 'The Authenticator code is not correct or was already used.');
        }

        $service = app(PmdSiteAccessService::class);
        $pending = (array)session()->get(PmdSiteAccessService::SESSION_PENDING, []);
        $challenge = $service->challengeForSession();
        $target = (string)session()->pull('pmd_owner_totp_after_v1', '');
        if ($target === '') $target = (string)($pending['redirect'] ?? admin_url('dashboard'));

        if ($challenge && (int)$challenge->user_id === (int)$identity['user_id']) {
            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'used',
                'approved_at' => $challenge->approved_at ?: now(),
                'used_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $service->markWorkspaceVerified((int)$identity['location_id'], 'owner_totp', 0);
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);
        session()->forget(PmdSiteAccessService::SESSION_PENDING);

        $service->audit('owner_totp_verified', true, $identity, null, $challenge ? (int)$challenge->id : null, $request, [
            'session_until' => $policy['expires_at']->toIso8601String(),
            'session_reason' => $policy['reason'],
        ]);

        return redirect($target)->with('success', 'Owner Authenticator verified.');
    }

    public function hub(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        $service = app(PmdSiteAccessService::class);
        $identity = $service->identity();
        $locationId = (int)$identity['location_id'];
        $hub = $service->currentHub($request, $locationId);
        if ($hub) $service->touchDevice((int)$hub->id);

        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        $policyEnabled = $service->ready() && $locationId > 0 && $service->policyEnabled($locationId);
        $canConfigure = $policyEnabled
            ? in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)
            : $role === PmdDefaultStaffRoleService::OWNER;

        $workplaceCode = null;
        if ($hub && $locationId > 0) {
            $workplaceCode = app(PmdWorkplaceCodeService::class)->current($locationId);
        }

        return view('siteaccess/hub_v2', [
            'ready' => $service->ready(),
            'identity' => $identity,
            'hub' => $hub,
            'canConfigure' => $canConfigure,
            'policyEnabled' => $policyEnabled,
            'workplaceCode' => $workplaceCode,
            'pending' => $hub ? $service->pendingChallengesForHub($request) : collect(),
            'devices' => $service->ready() && $locationId > 0
                ? $service->activeDevices($locationId)
                : collect(),
            'recoveryCodes' => (array)session()->pull('pmd_site_access_new_recovery_codes', []),
            'ownerTotpEnabled' => app(PmdOwnerTotpService::class)->enabled((int)$identity['user_id']),
        ]);
    }

    public function activatehub(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        try {
            $service = app(PmdSiteAccessService::class);
            $identity = $service->identity();
            $locationId = (int)$identity['location_id'];
            $wasEnabled = $service->policyEnabled($locationId);
            $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);

            if (
                !$wasEnabled
                && $role === PmdDefaultStaffRoleService::OWNER
                && !app(PmdOwnerTotpService::class)->enabled((int)$identity['user_id'])
            ) {
                return redirect(admin_url('siteaccess/owner-mfa/setup'))
                    ->with('error', 'Connect the Owner Authenticator before activating the first restaurant device.');
            }

            [$device, $rawToken] = app(PmdWorkplaceHubBootstrapService::class)->activate($request);

            if (!$wasEnabled) {
                $codes = $service->generateRecoveryCodes($request);
                session()->flash('pmd_site_access_new_recovery_codes', $codes);
            }

            return redirect(admin_url('siteaccess/hub'))
                ->withCookie($this->hubCookie($rawToken, $request))
                ->withCookie($this->hubMarkerCookie($request))
                ->with('success', 'Workplace Access is active on this restaurant device.');
        } catch (\Throwable $error) {
            return redirect(admin_url('siteaccess/hub'))->with('error', $error->getMessage());
        }
    }

    public function heartbeat(Request $request = null): JsonResponse
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return response()->json(['ok' => false], 401);

        $service = app(PmdSiteAccessService::class);
        $identity = $service->identity();
        $locationId = (int)$identity['location_id'];
        $hub = $service->currentHub($request, $locationId);
        if (!$hub) return response()->json(['ok' => false, 'message' => 'This browser is not a trusted workplace device.'], 403);
        $service->touchDevice((int)$hub->id);
        $code = app(PmdWorkplaceCodeService::class)->current($locationId);

        return response()->json([
            'ok' => true,
            'at' => now()->toIso8601String(),
            'workplace_code' => $code['code'],
            'code_expires_in' => $code['expires_in'],
        ])->header('Cache-Control', 'no-store');
    }

    public function hubdata(Request $request = null): JsonResponse
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return response()->json(['ok' => false], 401);

        $service = app(PmdSiteAccessService::class);
        $identity = $service->identity();
        $locationId = (int)$identity['location_id'];
        $hub = $service->currentHub($request, $locationId);
        if (!$hub) return response()->json(['ok' => false], 403);
        $service->touchDevice((int)$hub->id);

        $code = app(PmdWorkplaceCodeService::class)->current($locationId);
        $pending = $service->pendingChallengesForHub($request)->map(function ($item) {
            return [
                'id' => (int)$item->id,
                'public_id' => (string)$item->public_id,
                'staff_name' => (string)($item->staff_name ?: 'Team member'),
                'purpose' => (string)$item->purpose,
                'device_name' => (string)($item->requested_device_name ?: 'Browser device'),
                'qr_url' => (string)$item->qr_url,
                'qr_image_url' => admin_url('siteaccess/hub/qr/'.(int)$item->id),
                'expires_at' => (string)$item->expires_at,
            ];
        })->values();

        return response()->json([
            'ok' => true,
            'workplace_code' => $code['code'],
            'code_expires_in' => $code['expires_in'],
            'pending' => $pending,
        ])->header('Cache-Control', 'no-store');
    }

    public function approve(Request $request = null)
    {
        $request = $request ?: request();
        $id = max(0, (int)$request->input('challenge_id', 0));
        $ok = AdminAuth::isLogged() && app(PmdSiteAccessService::class)->approveChallenge($id, $request);
        if ($request->expectsJson()) return response()->json(['ok' => $ok], $ok ? 200 : 422);
        return redirect(admin_url('siteaccess/hub'))->with($ok ? 'success' : 'error', $ok ? 'Login request approved.' : 'Could not approve this login request.');
    }

    public function decline(Request $request = null)
    {
        $request = $request ?: request();
        $id = max(0, (int)$request->input('challenge_id', 0));
        $ok = AdminAuth::isLogged() && app(PmdSiteAccessService::class)->declineChallenge($id, $request);
        if ($request->expectsJson()) return response()->json(['ok' => $ok], $ok ? 200 : 422);
        return redirect(admin_url('siteaccess/hub'))->with($ok ? 'success' : 'error', $ok ? 'Login request declined.' : 'Could not decline this login request.');
    }

    public function recoverycodes(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));
        try {
            $codes = app(PmdSiteAccessService::class)->generateRecoveryCodes($request);
            session()->flash('pmd_site_access_new_recovery_codes', $codes);
            return redirect(admin_url('siteaccess/hub').'#recovery')->with('success', 'New Owner recovery codes generated. Save them now; PMD will not show them again.');
        } catch (\Throwable $error) {
            return redirect(admin_url('siteaccess/hub'))->with('error', $error->getMessage());
        }
    }

    public function revokedevice(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));
        $id = max(0, (int)$request->input('device_id', 0));
        $ok = app(PmdSiteAccessService::class)->revokeDevice($id, $request);
        return redirect(admin_url('siteaccess/hub'))->with($ok ? 'success' : 'error', $ok ? 'Device trust revoked.' : 'You cannot revoke this device.');
    }

    private function finalizeResponse(PmdSiteAccessService $service, Request $request)
    {
        try {
            $result = $service->finalizeCurrent($request);
            $this->bindAndApplySessionPolicy($service);
            return redirect((string)$result['redirect'])->with('success', 'Workplace Access verified.');
        } catch (\Throwable $error) {
            return redirect(admin_url('siteaccess'))->with('error', $error->getMessage());
        }
    }

    private function bindAndApplySessionPolicy(PmdSiteAccessService $service): array
    {
        $identity = $service->identity();
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        return app(PmdWorkSessionPolicyService::class)->apply($identity);
    }

    private function ownerIdentity(): ?array
    {
        if (!AdminAuth::isLogged()) return null;
        $identity = app(PmdSiteAccessService::class)->identity();
        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        if ($role !== PmdDefaultStaffRoleService::OWNER) abort(403);
        if ((int)$identity['user_id'] < 1 || (int)$identity['location_id'] < 1) abort(403);
        return $identity;
    }

    private function hubCookie(string $token, Request $request)
    {
        return cookie(PmdSiteAccessService::HUB_COOKIE, $token, 60 * 24 * 365 * 3, '/', null, $request->isSecure(), true, false, 'Lax');
    }

    private function hubMarkerCookie(Request $request)
    {
        return cookie('pmd_site_hub_marker_v1', '1', 60 * 24 * 365 * 3, '/', null, $request->isSecure(), false, false, 'Lax');
    }
}
