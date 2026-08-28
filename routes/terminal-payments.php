<?php

use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

$__pmdTerminalCentralDatabase = (string)config('database.connections.mysql.database');

$__pmdSumupCallback = function (Request $request, $attemptId) use ($__pmdTerminalCentralDatabase) {
    $host = strtolower(trim((string)$request->getHost()));
    try {
        $base = (array)config('database.connections.mysql');
        $centralConfig = $base;
        $centralConfig['database'] = $__pmdTerminalCentralDatabase;
        Config::set('database.connections.sumup_central_runtime', $centralConfig);
        DB::purge('sumup_central_runtime');
        DB::reconnect('sumup_central_runtime');
        $central = DB::connection('sumup_central_runtime');
        $tenant = $central->table('tenants')->where('domain', $host)->first();
        if (!$tenant || empty($tenant->database)) {
            return response()->json(['ok' => false, 'message' => 'Tenant not found.'], 404);
        }
        $tenantConfig = $base;
        $tenantConfig['database'] = (string)$tenant->database;
        Config::set('database.connections.sumup_callback_runtime', $tenantConfig);
        DB::purge('sumup_callback_runtime');
        DB::reconnect('sumup_callback_runtime');
        DB::setDefaultConnection('sumup_callback_runtime');
        $result = app(TerminalPaymentService::class)->handleSumupCallback((int)$attemptId, (array)$request->all());
        return response()->json(['ok' => true, 'result' => $result]);
    } catch (\Throwable $e) {
        report($e);
        return response()->json(['ok' => false, 'message' => 'Callback processing failed.'], 500);
    }
};

Route::post('/terminal-payments/sumup/callback/{attemptId}', $__pmdSumupCallback)
    ->where('attemptId', '[0-9]+')
    ->name('pmd.sumup.terminal.callback.legacy');

Route::post('/'.trim((string)config('system.adminUri', 'admin'), '/').'/terminal-payments/sumup/callback/{attemptId}', $__pmdSumupCallback)
    ->where('attemptId', '[0-9]+')
    ->name('pmd.sumup.terminal.callback');

Route::middleware(['web'])->prefix(config('system.adminUri', 'admin'))->group(function () {
    // PMD_LOCATION_CLOCK_STATE_ROUTE_R9
    // Read-only. Header Blade stays presentation-only; timezone/database work
    // happens here after the Admin request has a valid tenant/location context.
    Route::get('/location-clock/state', function (\App\Services\Platform\LocationClockStateService $clock) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Unauthenticated.'], 401);
        }

        try {
            $response = response()->json([
                'ok' => true,
                'clock' => $clock->state(),
            ]);
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
            return $response;
        } catch (\Throwable $error) {
            report($error);
            return response()->json([
                'ok' => false,
                'message' => 'Location clock state is unavailable.',
            ], 500);
        }
    })->name('pmd.location-clock.state');

    Route::get('/payment-providers', [\Admin\Controllers\PaymentProviders::class, 'index'])
        ->name('pmd.payment-providers.index');
    Route::get('/payment-providers/state', [\Admin\Controllers\PaymentProviders::class, 'state'])
        ->name('pmd.payment-providers.state');

    // PMD_PAYMENT_MARKET_SETTINGS_R4
    // Finance UI reads only the current LocationPlatformContext and therefore
    // never mixes Oman providers/methods into Germany (or vice versa).
    Route::get('/payment-market/state', [\Admin\Controllers\PaymentMarketSettings::class, 'state'])
        ->name('pmd.payment-market.state');
    Route::post('/payment-market/paymob/save', [\Admin\Controllers\PaymentMarketSettings::class, 'savePaymob'])
        ->name('pmd.payment-market.paymob.save');
    Route::post('/payment-market/paymob/test', [\Admin\Controllers\PaymentMarketSettings::class, 'testPaymob'])
        ->name('pmd.payment-market.paymob.test');
    Route::post('/payment-market/methods/{code}', [\Admin\Controllers\PaymentMarketSettings::class, 'saveMethod'])
        ->where('code', '[A-Za-z0-9_-]+')
        ->name('pmd.payment-market.methods.save');

    // Provider-connection aliases. Devices should only pair/manage hardware;
    // provider credentials live under Payments > Providers.
    Route::get('/payment-providers/sumup/state', [\Admin\Controllers\SumupTerminalSettings::class, 'state']);
    Route::post('/payment-providers/sumup/connection', [\Admin\Controllers\SumupTerminalSettings::class, 'saveConnection']);
    Route::post('/payment-providers/sumup/connection/test', [\Admin\Controllers\SumupTerminalSettings::class, 'testConnection']);
    Route::post('/payment-providers/sumup/environment', [\Admin\Controllers\SumupTerminalSettings::class, 'activateEnvironment']);
    Route::post('/payment-providers/sumup/apple-pay-domain-file', [\Admin\Controllers\SumupTerminalSettings::class, 'saveApplePayDomainFile']);

    Route::post('/orders/terminal-payment-attempt', function (Request $request, TerminalPaymentService $service) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Payments')) abort(403, 'Payment permission required.');
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
            'provider_code' => ['required', 'string', 'max:50'],
            'terminal_id' => ['nullable', 'string', 'max:120'],
            'terminal_device_id' => ['nullable', 'integer', 'min:1'],
        ]);
        $terminal = isset($data['terminal_device_id']) ? (string)$data['terminal_device_id'] : ($data['terminal_id'] ?? null);
        return response()->json($service->createAttempt((int)$data['order_id'], (string)$data['provider_code'], $terminal));
    });

    Route::post('/terminal-payments/attempts/{attemptId}/refresh', function ($attemptId, TerminalPaymentService $service) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Payments')) abort(403, 'Payment permission required.');
        return response()->json($service->refreshAttempt((int)$attemptId));
    })->where('attemptId', '[0-9]+');

    Route::get('/orders/{orderId}/terminal-payment-attempts', function ($orderId) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Payments')) abort(403, 'Payment permission required.');
        if (!\Illuminate\Support\Facades\Schema::hasTable('payment_attempts')) return response()->json(['success' => true, 'attempts' => []]);
        $attempts = DB::table('payment_attempts')->where('order_id', (int)$orderId)->orderByDesc('id')->limit(20)->get();
        return response()->json(['success' => true, 'attempts' => $attempts]);
    })->where('orderId', '[0-9]+');

    // Compatibility routes kept while the Devices page migrates to pairing-only.
    Route::get('/pmddevices/sumup/state', [\Admin\Controllers\SumupTerminalSettings::class, 'state']);
    Route::post('/pmddevices/sumup/connection', [\Admin\Controllers\SumupTerminalSettings::class, 'saveConnection']);
    Route::post('/pmddevices/sumup/connection/test', [\Admin\Controllers\SumupTerminalSettings::class, 'testConnection']);
    Route::post('/pmddevices/sumup/environment', [\Admin\Controllers\SumupTerminalSettings::class, 'activateEnvironment']);

    // Canonical Cloud API reader hardware authority. Test is verified as a
    // SumUp sandbox merchant before pairing so Virtual Solo cannot silently be
    // attempted against a live merchant. Upstream error status is preserved.
    Route::post('/pmddevices/sumup/readers/sync', [\Admin\Controllers\SumupCloudReaderController::class, 'sync']);
    Route::post('/pmddevices/sumup/readers/pair', [\Admin\Controllers\SumupCloudReaderController::class, 'pair']);

    Route::post('/pmddevices/sumup/readers/{terminalId}/test', [\Admin\Controllers\SumupTerminalSettings::class, 'testReader'])->where('terminalId', '[0-9]+');
    Route::delete('/pmddevices/sumup/readers/{terminalId}', [\Admin\Controllers\SumupTerminalSettings::class, 'removeReader'])->where('terminalId', '[0-9]+');
});

// PMD_PAYMOB_OMAN_ROUTE_LOADER_R11
require_once __DIR__.'/paymob-oman.php';
