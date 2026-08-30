<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdWorkplaceCodeService;
use App\Services\PmdWorkplaceHubBootstrapService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** PMD_WORKPLACE_ACCESS_CONTROLLER_V2 */
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

        if (!$service->ready()) {
            return view('siteaccess/index_v2', [
                'ready' => false,
                'challenge' => null,
                'identity' => $identity,
                'onlineHub' => false,
                'canRecover' => false,
            ]);
        }

        if ($service->currentHub($request, $identity['location_id']) && !$service->challengeForSession()) {
            return redirect(admin_url('siteaccess/hub'));
        }

        $challenge = $service->challengeForSession();
        if (!$challenge) {
            $destination = (string)session()->get(PmdSiteAccessService::SESSION_DESTINATION, 'workspace');
            return redirect($destination === 'staff' ? admin_url('mywork') : admin_url('dashboard'));
        }

        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);

        return view('siteaccess/index_v2', [
            'ready' => true,
            'challenge' => $challenge,
            'identity' => $identity,
            'onlineHub' => $service->hasOnlineHub((int)$identity['location_id']),
            'canRecover' => $role === PmdDefaultStaffRoleService::OWNER,
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
            $result = app(PmdSiteAccessService::class)->finalizeCurrent($request);
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
        session()->forget(PmdSiteAccessService::SESSION_PENDING);
        return redirect((string)($pending['redirect'] ?? admin_url('dashboard')))
            ->with('success', 'Emergency Workplace Access verified.');
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
        ]);
    }

    public function activatehub(Request $request = null)
    {
        $request = $request ?: request();
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        try {
            [$device, $rawToken] = app(PmdWorkplaceHubBootstrapService::class)->activate($request);
            return redirect(admin_url('siteaccess/hub'))
                ->withCookie($this->hubCookie($rawToken, $request))
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
            return redirect((string)$result['redirect'])->with('success', 'Workplace Access verified.');
        } catch (\Throwable $error) {
            return redirect(admin_url('siteaccess'))->with('error', $error->getMessage());
        }
    }

    private function hubCookie(string $token, Request $request)
    {
        return cookie(PmdSiteAccessService::HUB_COOKIE, $token, 60 * 24 * 365 * 3, '/', null, $request->isSecure(), true, false, 'Lax');
    }
}
