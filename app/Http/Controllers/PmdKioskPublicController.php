<?php

namespace App\Http\Controllers;

use App\Services\PmdKioskPairingService;
use App\Services\PmdTableDisplayService;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class PmdKioskPublicController
{

    // PMD_KIOSK_BLADE_TERMINAL_V8
    // PMD_KIOSK_INSTANT_MENU_V12
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

        // PMD_KIOSK_CANONICAL_DIGITAL_MENU_HERO_V22_4
        // This is the hero used by Customer Menu (uploaded restaurant hero or
        // selected-theme hero fallback). It is independent from Android's old
        // prefetched menu-photo hero so the service chooser never falls back to
        // the first food image.
        $serviceHero = trim((string)($serverRestaurant['hero'] ?? ''));
        if (
            strlen($serviceHero) > 2048 ||
            (
                $serviceHero !== '' &&
                !str_starts_with($serviceHero, '/') &&
                !preg_match('#^https?://#i', $serviceHero)
            )
        ) {
            $serviceHero = '';
        }

        // PMD_KIOSK_INITIAL_HERO_V13
        // Android already prefetches restaurant menu photography on the welcome
        // screen. Pass that image into the first Blade frame so the menu never
        // paints a large empty hero box while bootstrap is still revalidating.
        $initialHero = trim((string)$request->query('kiosk_hero', ''));
        if (
            strlen($initialHero) > 2048 ||
            (
                $initialHero !== '' &&
                !str_starts_with($initialHero, '/') &&
                !preg_match('#^https?://#i', $initialHero)
            )
        ) {
            $initialHero = '';
        }

        $config = [
            'version' => 'blade-v8-theme-v13',
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
            'hero' => $initialHero,
            'serviceHero' => $serviceHero,
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


    /** PMD_KIOSK_TERMINAL_PAYMENT_V18 */
    public function startTerminalPayment(
        Request $request,
        TerminalPaymentService $payments
    ): JsonResponse {
        $device = app(PmdKioskPairingService::class)->authenticate($request);
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
            'kiosk_session' => ['required', 'string', 'max:100'],
        ]);

        $orderId = (int)$data['order_id'];
        $session = $this->assertKioskOrderForDevice(
            $device,
            $orderId,
            (string)$data['kiosk_session']
        );

        $platform = json_decode(
            (string)($device->platform_info ?? '{}'),
            true
        );
        $platform = is_array($platform) ? $platform : [];
        $terminalId = max(
            0,
            (int)($platform['payment_terminal_device_id'] ?? 0)
        );
        $provider = strtolower(trim(
            (string)($platform['payment_terminal_provider'] ?? '')
        ));

        if ($terminalId < 1 || $provider === '') {
            return response()->json([
                'ok' => false,
                'status' => 'unavailable',
                'message' => 'No payment terminal is linked to this kiosk.',
            ], 409);
        }

        $result = $payments->createAttempt(
            $orderId,
            $provider,
            (string)$terminalId
        );

        if (!($result['success'] ?? false)) {
            return response()->json([
                'ok' => false,
                'status' => (string)($result['status'] ?? 'failed'),
                'message' => (string)(
                    $result['error']
                    ?? $result['message']
                    ?? 'The payment terminal could not start.'
                ),
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'kiosk_session' => $session,
            'attempt_id' => (int)($result['attempt_id'] ?? 0),
            'status' => (string)($result['status'] ?? 'pending'),
            'message' => (string)($result['message'] ?? 'Present card on the terminal.'),
            'payment_recorded' => (bool)($result['payment_recorded'] ?? false),
        ]);
    }

    /** PMD_KIOSK_TERMINAL_PAYMENT_V18 */
    public function refreshTerminalPayment(
        Request $request,
        $attemptId,
        TerminalPaymentService $payments
    ): JsonResponse {
        $device = app(PmdKioskPairingService::class)->authenticate($request);
        $session = preg_replace(
            '/[^A-Za-z0-9._:-]/',
            '',
            trim((string)$request->input('kiosk_session', ''))
        );
        if ($session === '') {
            return response()->json([
                'ok' => false,
                'status' => 'failed',
                'message' => 'Kiosk session is required.',
            ], 422);
        }

        $attempt = DB::table('payment_attempts')
            ->where('id', (int)$attemptId)
            ->first();
        if (!$attempt) {
            return response()->json([
                'ok' => false,
                'status' => 'failed',
                'message' => 'Payment attempt was not found.',
            ], 404);
        }

        $this->assertKioskOrderForDevice(
            $device,
            (int)$attempt->order_id,
            $session
        );

        $result = $payments->refreshAttempt((int)$attemptId);

        return response()->json([
            'ok' => (bool)($result['success'] ?? false),
            'attempt_id' => (int)($result['attempt_id'] ?? $attemptId),
            'status' => (string)($result['status'] ?? 'pending'),
            'message' => (string)(
                $result['message']
                ?? $result['error']
                ?? 'Waiting for the payment terminal.'
            ),
            'payment_recorded' => (bool)($result['payment_recorded'] ?? false),
        ]);
    }

    private function assertKioskOrderForDevice(
        $device,
        int $orderId,
        string $session
    ): string {
        $session = preg_replace(
            '/[^A-Za-z0-9._:-]/',
            '',
            trim($session)
        );
        if ($session === '') {
            abort(422, 'Kiosk session is required.');
        }

        $order = DB::table('orders')->where('order_id', $orderId)->first();
        if (
            !$order
            || (int)($order->location_id ?? 0) !== (int)$device->location_id
            || !str_contains(
                (string)($order->comment ?? ''),
                '[kiosk_session:'.$session.']'
            )
        ) {
            abort(403, 'This order does not belong to the current kiosk session.');
        }

        return $session;
    }
}
