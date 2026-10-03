<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use Illuminate\Http\JsonResponse;

/** PMD_WORK_SESSION_KEEPALIVE_CONTROLLER_V1 */
class PmdSiteAccessSessionPingController
{
    public function __invoke(): JsonResponse
    {
        if (!AdminAuth::isLogged()) {
            return response()->json(['ok' => false], 401)
                ->header('Cache-Control', 'no-store');
        }

        return response()->json([
            'ok' => true,
            'verified_until' => session()->get(PmdSiteAccessService::SESSION_VERIFIED_UNTIL),
        ])->header('Cache-Control', 'no-store');
    }
}
