<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** PMD_CASHIER_TRUSTED_DEVICE_RESUME_V1 */
class PmdCashierTrustedDeviceResumeController
{
    public function __invoke(Request $request): JsonResponse
    {
        if (!AdminAuth::isLogged()) {
            return response()->json(['ok' => false], 401)
                ->header('Cache-Control', 'no-store');
        }

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) {
            return response()->json(['ok' => false], 503)
                ->header('Cache-Control', 'no-store');
        }

        $identity = $site->identity();
        $locationId = (int)($identity['location_id'] ?? 0);
        $userId = (int)($identity['user_id'] ?? 0);
        if ($locationId < 1 || $userId < 1) {
            return response()->json(['ok' => false], 403)
                ->header('Cache-Control', 'no-store');
        }

        $role = app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser($identity['user'] ?? null);

        // PMD_CASHIER_ONLY_PERSISTENT_TRUST_V1
        // The restaurant device credential may skip the Workplace Code only for
        // the Cashier role. Manager/Waiter/Accountant/Reservations/Team Member
        // continue to require a fresh code/QR/direct approval on each new login.
        // Owner remains on the personal TOTP path.
        if ($role !== PmdDefaultStaffRoleService::CASHIER) {
            return response()->json(['ok' => false], 403)
                ->header('Cache-Control', 'no-store');
        }

        $hub = $site->currentHub($request, $locationId);
        if (!$hub) {
            return response()->json(['ok' => false], 403)
                ->header('Cache-Control', 'no-store');
        }

        $challenge = $site->challengeForSession();
        if (
            !$challenge
            || (int)$challenge->user_id !== $userId
            || (int)$challenge->location_id !== $locationId
            || (string)$challenge->purpose !== PmdSiteAccessService::PURPOSE_WORKSPACE
            || (string)$challenge->status !== 'pending'
        ) {
            return response()->json(['ok' => false], 409)
                ->header('Cache-Control', 'no-store');
        }

        $site->touchDevice((int)$hub->id);

        $updated = DB::table('pmd_site_access_challenges')
            ->where('id', (int)$challenge->id)
            ->where('user_id', $userId)
            ->where('location_id', $locationId)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->update([
                'status' => 'approved',
                'approved_by_device_id' => (int)$hub->id,
                'approved_by_staff_id' => (int)($identity['staff_id'] ?? 0) ?: null,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

        if ($updated !== 1) {
            return response()->json(['ok' => false], 409)
                ->header('Cache-Control', 'no-store');
        }

        try {
            $result = $site->finalizeCurrent($request);
            app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
            $policy = app(PmdWorkSessionPolicyService::class)->apply($site->identity());

            $site->audit(
                'cashier_trusted_device_login',
                true,
                $site->identity(),
                (int)$hub->id,
                (int)$challenge->id,
                $request,
                [
                    'surface' => 'canonical_login',
                    'session_until' => $policy['expires_at']->toIso8601String(),
                    'session_reason' => $policy['reason'],
                ]
            );

            return response()->json([
                'ok' => true,
                'redirect' => (string)$result['redirect'],
            ])->header('Cache-Control', 'no-store');
        } catch (\Throwable $error) {
            logger()->error('PMD trusted Cashier device resume failed', [
                'user_id' => $userId,
                'location_id' => $locationId,
                'challenge_id' => (int)$challenge->id,
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Cashier device verification failed.',
            ], 409)->header('Cache-Control', 'no-store');
        }
    }
}
