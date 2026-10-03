<?php

namespace App\Http\Controllers;

use App\Services\PmdMobileSync\PmdMobileBootstrapService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class PmdMobileBootstrapController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $auth,
        PmdMobileBootstrapService $bootstrap
    ) {
        try {
            $identity = $auth->authenticate($request);

            return response()->json(
                $bootstrap->build($identity),
                200,
                [
                    'Cache-Control' => 'no-store, private',
                    'Pragma' => 'no-cache',
                ]
            );
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $error) {
            throw $error;
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'error' => 'mobile_bootstrap_failed',
                'message' => 'PayMyDine mobile bootstrap is temporarily unavailable.',
            ], 500);
        }
    }
}
