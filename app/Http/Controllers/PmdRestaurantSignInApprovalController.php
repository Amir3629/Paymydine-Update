<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdRestaurantApprovalPresenceService;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkplaceCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** PMD_RESTAURANT_SIGNIN_APPROVAL_V3 */
class PmdRestaurantSignInApprovalController
{
    public function data(Request $request): JsonResponse
    {
        $authority = $this->authority($request);
        if (!$authority) return $this->forbidden();

        $identity = $authority['identity'];
        $locationId = (int)$identity['location_id'];

        // This is intentionally cache-only presence. The UI polls frequently;
        // do not create a database audit row for every display refresh.
        app(PmdRestaurantApprovalPresenceService::class)->touch($locationId);

        $code = app(PmdWorkplaceCodeService::class)->current($locationId);
        $qrSvg = null;
        try {
            // The QR contains exactly the same six digits shown beside it.
            // It grants nothing by itself; the pending Login session still has
            // to submit the code and pass tenant/location/challenge checks.
            $qrSvg = app(PmdSiteAccessQrService::class)->svg((string)$code['code'], 3);
        } catch (\Throwable $error) {
            logger()->warning('PMD restaurant approval QR render failed', [
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
        }

        $pending = DB::table('pmd_site_access_challenges')
            ->leftJoin(
                'staffs',
                'staffs.staff_id',
                '=',
                'pmd_site_access_challenges.staff_id'
            )
            ->where('pmd_site_access_challenges.location_id', $locationId)
            ->where('pmd_site_access_challenges.status', 'pending')
            ->where('pmd_site_access_challenges.expires_at', '>', now())
            ->select([
                'pmd_site_access_challenges.id',
                'pmd_site_access_challenges.staff_id',
                'pmd_site_access_challenges.requested_device_name',
                'pmd_site_access_challenges.expires_at',
                'pmd_site_access_challenges.created_at',
                'staffs.staff_name',
            ])
            ->orderBy('pmd_site_access_challenges.created_at')
            ->limit(8)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => (int)$item->id,
                    'staff_id' => (int)($item->staff_id ?? 0),
                    'staff_name' => (string)($item->staff_name ?: 'Team member'),
                    'device_name' => (string)($item->requested_device_name ?: 'Browser device'),
                    'expires_at' => (string)$item->expires_at,
                ];
            })
            ->values();

        return response()->json([
            'ok' => true,
            'authority' => $authority['method'],
            'role' => $authority['role'],
            'workplace_code' => (string)$code['code'],
            'code_expires_in' => (int)$code['expires_in'],
            'qr_svg' => $qrSvg,
            'pending' => $pending,
        ])->header('Cache-Control', 'no-store');
    }

    public function approve(Request $request): JsonResponse
    {
        return $this->decide($request, true);
    }

    public function decline(Request $request): JsonResponse
    {
        return $this->decide($request, false);
    }

    private function decide(Request $request, bool $approve): JsonResponse
    {
        $authority = $this->authority($request);
        if (!$authority) return $this->forbidden();

        $identity = $authority['identity'];
        $challengeId = max(0, (int)$request->input('challenge_id', 0));
        if ($challengeId < 1) {
            return response()->json(['ok' => false, 'message' => 'Login request is required.'], 422);
        }

        $challenge = DB::table('pmd_site_access_challenges')
            ->where('id', $challengeId)
            ->where('location_id', (int)$identity['location_id'])
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();

        if (!$challenge) {
            return response()->json(['ok' => false, 'message' => 'Login request expired.'], 409);
        }

        $values = [
            'status' => $approve ? 'approved' : 'declined',
            'approved_by_device_id' => $authority['device_id'],
            'approved_by_staff_id' => (int)$identity['staff_id'] ?: null,
            'updated_at' => now(),
        ];
        if ($approve) $values['approved_at'] = now();

        $updated = DB::table('pmd_site_access_challenges')
            ->where('id', $challengeId)
            ->where('status', 'pending')
            ->update($values);

        if ($updated !== 1) {
            return response()->json(['ok' => false, 'message' => 'Login request changed.'], 409);
        }

        /** @var PmdSiteAccessService $site */
        $site = $authority['site'];
        $site->audit(
            $approve ? 'challenge_approved' : 'challenge_declined',
            true,
            $identity,
            $authority['device_id'],
            $challengeId,
            $request,
            [
                'authority' => $authority['method'],
                'role' => $authority['role'],
                'surface' => 'restaurant_inline_approval',
            ]
        );

        return response()->json(['ok' => true]);
    }

    private function authority(Request $request): ?array
    {
        if (!AdminAuth::isLogged()) return null;

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) return null;

        $identity = $site->identity();
        $locationId = (int)($identity['location_id'] ?? 0);
        $userId = (int)($identity['user_id'] ?? 0);
        if ($locationId < 1 || $userId < 1) return null;

        $roles = app(PmdDefaultStaffRoleService::class);
        $role = $roles->roleCodeForUser($identity['user'] ?? null);
        if (!in_array($role, [
            PmdDefaultStaffRoleService::OWNER,
            PmdDefaultStaffRoleService::MANAGER,
            PmdDefaultStaffRoleService::CASHIER,
        ], true)) {
            return null;
        }

        $hub = $site->currentHub($request, $locationId);
        if ($hub) {
            $site->touchDevice((int)$hub->id);
            return [
                'site' => $site,
                'identity' => $identity,
                'role' => $role,
                'method' => 'trusted_restaurant_device',
                'device_id' => (int)$hub->id,
            ];
        }

        // A Cashier can approve only from a trusted restaurant browser.
        if ($role === PmdDefaultStaffRoleService::CASHIER) return null;

        $bound = app(PmdSiteAccessSessionBindingService::class)
            ->isBoundToCurrentUser();
        if (!$bound || !$site->isWorkspaceVerified($locationId)) return null;

        $method = (string)session()->get(
            PmdSiteAccessService::SESSION_VERIFIED_METHOD,
            ''
        );

        if ($role === PmdDefaultStaffRoleService::OWNER) {
            // PMD_OWNER_RECOVERY_APPROVAL_AUTHORITY_V1
            // A one-time Owner recovery code is a full emergency second factor for
            // this bound PMD session, just like personal TOTP. It never creates a
            // permanent trusted browser and remains auditable as owner_recovery.
            if (!in_array($method, ['owner_totp', 'owner_recovery'], true)) return null;
            return [
                'site' => $site,
                'identity' => $identity,
                'role' => $role,
                'method' => $method === 'owner_recovery'
                    ? 'owner_recovery_session'
                    : 'owner_totp_session',
                'device_id' => null,
            ];
        }

        // A Manager may approve after their own PMD second factor completed.
        if ($role === PmdDefaultStaffRoleService::MANAGER) {
            return [
                'site' => $site,
                'identity' => $identity,
                'role' => $role,
                'method' => 'manager_verified_session',
                'device_id' => null,
            ];
        }

        return null;
    }

    private function forbidden(): JsonResponse
    {
        return response()->json([
            'ok' => false,
            'message' => 'Restaurant sign-in authority is not available on this session.',
        ], 403)->header('Cache-Control', 'no-store');
    }
}
