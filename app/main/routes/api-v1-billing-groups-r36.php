<?php

use App\Services\Financial\BillingGroupPaymentService;
use App\Services\Financial\BillingGroupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware([\App\Http\Middleware\TenantDatabaseMiddleware::class])->group(function (): void {
    Route::get('/billing-groups/current', function (Request $request, BillingGroupService $groups) {
        $tableId = trim((string)$request->query('table_id', ''));
        $sessionKey = trim((string)$request->query('session_key', ''));
        if ($tableId === '') {
            return response()->json(['success' => false, 'error' => 'table_id is required'], 422);
        }
        if (!BillingGroupService::schemaReady()) {
            return response()->json(['success' => false, 'error' => 'R36 billing-group schema is not installed'], 503);
        }

        try {
            $summary = $sessionKey !== ''
                ? $groups->synchronizeTableSession($tableId, $sessionKey)
                : $groups->findOpenSummaryForTable($tableId);
            if (!$summary) {
                return response()->json(['success' => true, 'billingGroup' => null]);
            }
            return response()->json(['success' => true, 'billingGroup' => $summary]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 409);
        }
    });

    Route::post('/billing-groups/{publicId}/payments/reserve', function (
        string $publicId,
        Request $request,
        BillingGroupPaymentService $payments
    ) {
        $request->validate([
            'table_id' => 'required|string|max:64',
            'idempotency_key' => 'required|string|max:191',
            'method' => 'required|string|max:50',
            'provider' => 'nullable|string|max:50',
            'principal_cents' => 'nullable|integer|min:1',
            'principal_amount' => 'nullable|numeric|min:0.01',
            'tip_cents' => 'nullable|integer|min:0',
            'discount_cents' => 'nullable|integer|min:0',
            'service_component_cents' => 'nullable|integer|min:0',
            'allocations' => 'nullable|array',
            'allocations.*.order_id' => 'required_with:allocations|integer|min:1',
            'allocations.*.base_cents' => 'nullable|integer|min:1',
            'allocations.*.principal_cents' => 'nullable|integer|min:1',
            'payer_label' => 'nullable|string|max:191',
            'coupon_code' => 'nullable|string|max:191',
            'pay_full_remaining' => 'nullable|boolean',
        ]);

        try {
            $payment = $payments->reserve($publicId, $request->all());
            return response()->json(['success' => true, 'payment' => $payment], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 409);
        }
    });

    Route::post('/billing-group-payments/{paymentId}/settle', function (
        string $paymentId,
        Request $request,
        BillingGroupPaymentService $payments
    ) {
        $request->validate([
            'provider_reference' => 'nullable|string|max:191',
            'provider_confirmed' => 'nullable|boolean',
            'provider_evidence' => 'nullable|array',
            'cash_received_cents' => 'nullable|integer|min:0',
            'cash_received' => 'nullable|numeric|min:0',
        ]);

        try {
            $payment = $payments->settle($paymentId, $request->all());
            return response()->json(['success' => true, 'payment' => $payment]);
        } catch (\Throwable $e) {
            report($e);
            $state = $payments->status($paymentId);
            $reconciliation = is_array($state) && !empty($state['reconciliationRequired']);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'reconciliationRequired' => $reconciliation,
                'payment' => $state,
            ], $reconciliation ? 409 : 422);
        }
    });

    Route::get('/billing-group-payments/{paymentId}', function (
        string $paymentId,
        BillingGroupPaymentService $payments
    ) {
        $state = $payments->status($paymentId);
        if (!$state) {
            return response()->json(['success' => false, 'error' => 'Payment not found'], 404);
        }
        return response()->json(['success' => true, 'payment' => $state]);
    });
});
