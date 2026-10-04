<?php

namespace App\Http\Controllers;

use App\Services\PmdKioskPairingService;
use App\Services\PmdTableDisplayService;
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

        /*
         * PMD_KIOSK_CUSTOMER_THEME_SYNC_V9
         *
         * The physical kiosk has its own touch-first layout, but the restaurant
         * identity and visual theme come from the same canonical Customer Menu
         * settings as QR ordering and Table Display. Android also sends the
         * currently paired palette in the query string; those values are used
         * only when they are valid colors and therefore cannot inject CSS.
         */
        $surfaceProfile = app(PmdTableDisplayService::class)->customerSurfaceProfile();
        $serverTheme = (array)($surfaceProfile['theme'] ?? []);
        $serverRestaurant = (array)($surfaceProfile['restaurant'] ?? []);

        $validColor = static function ($value, string $fallback): string {
            $value = trim((string)$value);
            return preg_match('/^#[0-9a-fA-F]{6}$/', $value) ? strtoupper($value) : $fallback;
        };

        // Server settings are authoritative so saving Customer Menu settings
        // changes the next kiosk session without re-pairing/reinstalling Android.
        // The Android query palette is only a fallback during a temporary server
        // settings gap.
        $theme = [
            'id' => trim((string)($serverTheme['id'] ?? 'kazen_japanese')) ?: 'kazen_japanese',
            'background' => $validColor(
                $serverTheme['background'] ?? null,
                $validColor($request->query('kiosk_bg'), '#F5F1EB')
            ),
            'text' => $validColor(
                $serverTheme['text'] ?? null,
                $validColor($request->query('kiosk_text'), '#25231F')
            ),
            'muted' => $validColor(
                $serverTheme['muted'] ?? null,
                $validColor($request->query('kiosk_muted'), '#777168')
            ),
            'accent' => $validColor(
                $serverTheme['accent'] ?? null,
                $validColor($request->query('kiosk_accent'), '#B5413F')
            ),
            'surface' => $validColor(
                $serverTheme['surface'] ?? null,
                $validColor($request->query('kiosk_surface'), '#FBF8F3')
            ),
            'is_dark' => (bool)($serverTheme['is_dark'] ?? false),
        ];

        $restaurantName = trim((string)($serverRestaurant['name'] ?? ''));
        if ($restaurantName === '') {
            $restaurantName = trim((string)$request->query('kiosk_name', 'PayMyDine'));
        }
        $restaurantName = mb_substr($restaurantName ?: 'PayMyDine', 0, 120);

        $restaurantLogo = trim((string)($serverRestaurant['logo'] ?? ''));
        if ($restaurantLogo === '') {
            $restaurantLogo = trim((string)$request->query('kiosk_logo', ''));
        }
        if (strlen($restaurantLogo) > 2048) {
            $restaurantLogo = '';
        }

        $config = [
            'version' => 'blade-v8-theme-v10',
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
            'restaurant' => [
                'name' => $restaurantName,
                'logo' => $restaurantLogo,
            ],
            'theme' => $theme,
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
