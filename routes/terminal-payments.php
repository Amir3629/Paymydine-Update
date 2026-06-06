<?php

use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['web'])->prefix(config('system.adminUri', 'admin'))->group(function () {
    Route::post('/orders/terminal-payment-attempt', function (Request $request, TerminalPaymentService $service) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Payments')) {
            abort(403, 'Payment permission required.');
        }

        $data = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
            'provider_code' => ['required', 'string', 'max:50'],
            'terminal_id' => ['nullable', 'string', 'max:120'],
        ]);

        return response()->json($service->createAttempt((int)$data['order_id'], (string)$data['provider_code'], $data['terminal_id'] ?? null));
    });

    Route::get('/orders/{orderId}/terminal-payment-attempts', function ($orderId) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Payments')) {
            abort(403, 'Payment permission required.');
        }
        if (!\Illuminate\Support\Facades\Schema::hasTable('payment_attempts')) {
            return response()->json(['success' => true, 'attempts' => []]);
        }
        $attempts = \Illuminate\Support\Facades\DB::table('payment_attempts')
            ->where('order_id', (int)$orderId)
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json(['success' => true, 'attempts' => $attempts]);
    });
});
