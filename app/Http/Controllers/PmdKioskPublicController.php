<?php

namespace App\Http\Controllers;

use App\Services\PmdKioskPairingService;
use App\Services\PmdTableDisplayService;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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


    /**
     * PMD_KIOSK_TERMINAL_ONLY_PAYMENT_V17
     *
     * The kiosk browser never receives payment-provider credentials or a kiosk
     * bearer token. Android calls this endpoint with its Keystore-backed kiosk
     * credential. The server resolves the restaurant's connected terminal and
     * starts the normal TerminalPaymentService authority.
     */
    public function terminalPayment(Request $request): JsonResponse
    {
        $device = app(PmdKioskPairingService::class)->authenticate($request);
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
        ]);

        $orderId = (int)$data['order_id'];
        $order = Schema::hasTable('orders')
            ? DB::table('orders')->where('order_id', $orderId)->first()
            : null;
        if (!$order) {
            return response()->json([
                'ok' => false,
                'message' => 'Kiosk order was not found.',
            ], 404);
        }

        $locationId = (int)($device->location_id ?? 0);
        if (
            $locationId < 1
            || (
                Schema::hasColumn('orders', 'location_id')
                && (int)($order->location_id ?? 0) > 0
                && (int)$order->location_id !== $locationId
            )
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'This order belongs to another restaurant.',
            ], 403);
        }

        $terminal = $this->terminalForKiosk($device);
        if (!$terminal) {
            return response()->json([
                'ok' => false,
                'message' => 'No active payment terminal is connected to this kiosk restaurant.',
            ], 409);
        }

        $provider = strtolower(trim((string)($terminal->provider_code ?? '')));
        $reader = trim((string)($terminal->reader_id ?? ''));
        $result = app(TerminalPaymentService::class)->createAttempt(
            $orderId,
            $provider,
            $reader !== '' ? $reader : (string)($terminal->terminal_device_id ?? '')
        );

        if (!(bool)($result['success'] ?? false)) {
            return response()->json([
                'ok' => false,
                'message' => (string)(
                    $result['error']
                    ?? $result['message']
                    ?? 'The payment terminal could not start.'
                ),
            ], 409);
        }

        return response()->json([
            'ok' => true,
            'attempt_id' => (int)($result['attempt_id'] ?? 0),
            'status' => strtolower(trim((string)($result['status'] ?? 'pending'))),
            'message' => (string)($result['message'] ?? 'Present card on the terminal.'),
            'payment_recorded' => (bool)($result['payment_recorded'] ?? false),
            'terminal' => [
                'id' => (int)($terminal->terminal_device_id ?? 0),
                'label' => trim((string)($terminal->reader_label ?? '')) ?: 'Payment terminal',
                'provider' => $provider,
            ],
        ])->header('Cache-Control', 'no-store, private');
    }

    public function terminalPaymentStatus(
        Request $request,
        $attempt
    ): JsonResponse {
        $device = app(PmdKioskPairingService::class)->authenticate($request);
        $attemptId = (int)$attempt;
        if ($attemptId < 1 || !Schema::hasTable('payment_attempts')) {
            return response()->json([
                'ok' => false,
                'message' => 'Payment attempt is invalid.',
            ], 422);
        }

        $attemptRow = DB::table('payment_attempts')
            ->where('id', $attemptId)
            ->first();
        if (!$attemptRow) {
            return response()->json([
                'ok' => false,
                'message' => 'Payment attempt was not found.',
            ], 404);
        }

        $orderId = (int)($attemptRow->order_id ?? 0);
        $order = $orderId > 0 && Schema::hasTable('orders')
            ? DB::table('orders')->where('order_id', $orderId)->first()
            : null;
        if (!$order) {
            return response()->json([
                'ok' => false,
                'message' => 'Payment order was not found.',
            ], 404);
        }

        $locationId = (int)($device->location_id ?? 0);
        if (
            $locationId < 1
            || (
                Schema::hasColumn('orders', 'location_id')
                && (int)($order->location_id ?? 0) > 0
                && (int)$order->location_id !== $locationId
            )
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'This payment belongs to another restaurant.',
            ], 403);
        }

        $result = app(TerminalPaymentService::class)->refreshAttempt($attemptId);

        return response()->json([
            'ok' => (bool)($result['success'] ?? false),
            'attempt_id' => $attemptId,
            'order_id' => $orderId,
            'status' => strtolower(trim((string)($result['status'] ?? 'pending'))),
            'message' => (string)(
                $result['message']
                ?? $result['error']
                ?? 'Payment terminal status updated.'
            ),
            'payment_recorded' => (bool)($result['payment_recorded'] ?? false),
            'simulated' => (bool)($result['simulated'] ?? false),
        ])->header('Cache-Control', 'no-store, private');
    }

    private function terminalForKiosk($device)
    {
        if (!Schema::hasTable('terminal_devices')) {
            return null;
        }

        $locationId = (int)($device->location_id ?? 0);
        if ($locationId < 1) {
            return null;
        }

        $platform = json_decode(
            (string)($device->platform_info ?? '{}'),
            true
        );
        $preferredId = is_array($platform)
            ? (int)($platform['terminal_device_id'] ?? 0)
            : 0;

        $base = DB::table('terminal_devices')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->whereNotNull('provider_code')
            ->where('provider_code', '!=', '');

        if ($preferredId > 0) {
            $preferred = (clone $base)
                ->where('terminal_device_id', $preferredId)
                ->first();
            if ($preferred) {
                return $preferred;
            }
        }

        // Prefer a provider-reported ready/online reader; otherwise use the
        // first explicitly active terminal. Provider services still validate
        // the selected terminal before creating a payment attempt.
        if (Schema::hasColumn('terminal_devices', 'terminal_status')) {
            $ready = (clone $base)
                ->whereRaw(
                    "LOWER(COALESCE(terminal_status, '')) IN (?, ?, ?, ?)",
                    ['ready', 'online', 'connected', 'available']
                )
                ->orderBy('terminal_device_id')
                ->first();
            if ($ready) {
                return $ready;
            }
        }

        return $base->orderBy('terminal_device_id')->first();
    }
}
