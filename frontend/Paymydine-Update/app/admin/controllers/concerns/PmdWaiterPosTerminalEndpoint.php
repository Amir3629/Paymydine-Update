<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosTerminalEndpoint
{
    public function terminalPayment($orderId = null, TerminalPaymentService $service = null)
    {
        $this->assertPaymentPermission();
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        $payload = $this->requestPayload();
        $summary = $this->buildPaymentSummary($order);
        if ((float)$summary['settlement']['settled_amount'] > 0.0001) {
            return response()->json([
                'ok' => false,
                'message' => 'Direct terminal payment is available only before any partial payment. Use External terminal for a manually confirmed split payment.',
            ], 422);
        }

        $provider = strtolower(trim((string)($payload['provider_code'] ?? '')));
        if (!in_array($provider, ['worldline', 'vr_payment'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Choose a configured Worldline or VR Payment terminal provider.',
            ], 422);
        }

        $service = $service ?: app(TerminalPaymentService::class);
        $result = $service->createAttempt((int)$order->getKey(), $provider, trim((string)($payload['terminal_id'] ?? '')) ?: null);

        return response()->json([
            'ok' => (bool)($result['success'] ?? false),
            'message' => (string)($result['message'] ?? ($result['error'] ?? 'Terminal request finished.')),
            'attempt_id' => $result['attempt_id'] ?? null,
            'status' => $result['status'] ?? null,
            'provider_code' => $provider,
            'fake_success_disabled' => true,
        ], !empty($result['success']) ? 200 : 422);
    }

}
