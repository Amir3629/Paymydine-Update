<?php

namespace App\Http\Controllers;

use Admin\Controllers\KitchenDisplay;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

final class PmdMobileKdsController extends Controller
{
    public function snapshot(
        Request $request,
        PmdMobileDeviceAuthService $auth
    ) {
        try {
            $identity = $auth->authenticate($request);
            $user = $identity['user'] ?? null;

            if (!$user || !$user->hasPermission('Admin.KitchenDisplay')) {
                abort(403, 'Kitchen Display permission required.');
            }

            $station = trim((string)$request->query('station', ''));

            /** @var KitchenDisplay $kds */
            $kds = app(KitchenDisplay::class);

            return response()->json(
                $kds->pmdMobileSnapshot(
                    $identity,
                    $station !== '' ? $station : null
                ),
                200,
                [
                    'Cache-Control' => 'no-store, private',
                    'Pragma' => 'no-cache',
                ]
            );
        } catch (HttpExceptionInterface $error) {
            return response()->json([
                'ok' => false,
                'error' => 'mobile_kds_rejected',
                'message' => $error->getMessage()
                    ?: 'PayMyDine KDS request was rejected.',
            ], $error->getStatusCode());
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'error' => 'mobile_kds_failed',
                'message' => 'PayMyDine KDS snapshot is temporarily unavailable.',
            ], 500);
        }
    }
}
