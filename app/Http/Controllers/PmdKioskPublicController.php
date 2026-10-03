<?php

namespace App\Http\Controllers;

use App\Services\PmdKioskPairingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PmdKioskPublicController
{

    // PMD_KIOSK_BLADE_TERMINAL_V8
    // Kiosk web authority deliberately lives in Laravel/Blade, like the native
    // PayMyDine admin/public pages. Customer Next.js is not involved.
    public function screen(Request $request)
    {
        $serviceMode = strtolower(trim((string)$request->query('kiosk_order_type', '')));
        $serviceMode = $serviceMode === 'pickup' ? 'pickup' : 'kiosk';

        $session = trim((string)$request->query('kiosk_session', 'kiosk'));
        if ($session === '' || strlen($session) > 160) {
            $session = 'kiosk';
        }

        $config = [
            'version' => 'blade-v8',
            'session' => $session,
            'serviceMode' => $serviceMode,
            'paymentReturn' => $request->boolean('pmd_payment_return'),
            'bootstrapUrl' => url('/api/v1/frontend-bootstrap-batch-r1'),
            'orderUrl' => url('/api/v1/orders'),
            'payExistingUrl' => url('/api/v1/orders/pay-existing'),
            'paypalConfigUrl' => url('/api/v1/payments/config-public'),
            'paypalCreateUrl' => url('/api/v1/payments/paypal/create-order'),
            'paypalCaptureUrl' => url('/api/v1/payments/paypal/capture-order'),
            'returnUrl' => url('/kiosk/'),
            'resetUrl' => url('/kiosk-reset/'),
        ];

        // TastyIgniter's runtime view finder does not include resources/views
        // on this deployment. Render the standalone kiosk Blade by absolute
        // file path, matching the proven public-booking pattern.
        $html = view()->file(
            base_path('resources/views/pmd/kiosk-terminal.blade.php'),
            [
                'pmdKioskConfig' => $config,
            ]
        )->render();

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('X-PMD-Kiosk-Authority', 'blade-v8');
    }

    public function reset(Request $request)
    {
        $html = view()->file(
            base_path('resources/views/pmd/kiosk-reset.blade.php'),
            [
                'session' => trim((string)$request->query('kiosk_session', 'kiosk')),
            ]
        )->render();

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('X-PMD-Kiosk-Authority', 'blade-v8-reset');
    }

    public function pair(Request $request): JsonResponse
    {
        $code = trim((string)$request->input('code', ''));
        $deviceName = trim((string)$request->input('device_name', ''));
        $installationId = trim((string)$request->input('installation_id', ''));
        $platform = (array)$request->input('platform', []);

        return response()->json(
            app(PmdKioskPairingService::class)->exchange(
                $code,
                $deviceName,
                $installationId,
                $platform,
                $request
            )
        );
    }

    public function state(Request $request): JsonResponse
    {
        return response()->json(
            app(PmdKioskPairingService::class)->stateForDevice($request)
        );
    }
}
