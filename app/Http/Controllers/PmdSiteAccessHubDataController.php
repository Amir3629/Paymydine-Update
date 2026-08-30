<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessQrTokenService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdWorkplaceCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** PMD_WORKPLACE_CASHIER_DATA_V1 */
class PmdSiteAccessHubDataController
{
    public function __invoke(Request $request): JsonResponse
    {
        if (!AdminAuth::isLogged()) {
            return response()->json(['ok' => false], 401);
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $locationId = (int)($identity['location_id'] ?? 0);
        if ($locationId < 1) {
            return response()->json(['ok' => false], 422);
        }

        $hub = $site->currentHub($request, $locationId);
        if (!$hub) {
            return response()->json(['ok' => false], 403);
        }

        $code = app(PmdWorkplaceCodeService::class)->current($locationId);
        $qr = app(PmdSiteAccessQrService::class);
        $tokens = app(PmdSiteAccessQrTokenService::class);

        $pending = $site->pendingChallengesForHub($request)
            ->take(6)
            ->map(function ($item) use ($qr, $tokens) {
                $svg = null;
                try {
                    $svg = $qr->svg($tokens->signedUrl($item), 3);
                } catch (\Throwable $error) {
                    logger()->warning('PMD Cashier login QR render failed', [
                        'challenge_id' => (int)$item->id,
                        'message' => $error->getMessage(),
                    ]);
                }

                return [
                    'id' => (int)$item->id,
                    'staff_name' => (string)($item->staff_name ?: 'Team member'),
                    'device_name' => (string)($item->requested_device_name ?: 'Browser device'),
                    'expires_at' => (string)$item->expires_at,
                    'qr_svg' => $svg,
                ];
            })
            ->values();

        return response()->json([
            'ok' => true,
            'workplace_code' => (string)$code['code'],
            'code_expires_in' => (int)$code['expires_in'],
            'pending' => $pending,
        ])->header('Cache-Control', 'no-store');
    }
}
