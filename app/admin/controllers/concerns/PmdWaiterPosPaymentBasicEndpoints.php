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

trait PmdWaiterPosPaymentBasicEndpoints
{
    public function paymentSummary($orderId = null)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        return response()->json($this->buildPaymentSummary($order));
    }

    public function validatePaymentCoupon($orderId = null)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        $payload = $this->requestPayload();
        $code = strtoupper(trim((string)($payload['code'] ?? '')));
        $summary = $this->buildPaymentSummary($order);
        $baseAmount = (float)($payload['amount'] ?? $summary['settlement']['remaining_amount']);

        $coupon = $this->couponResult($code, max(0, $baseAmount));
        $status = $coupon['ok'] ? 200 : 422;
        return response()->json($coupon, $status);
    }

}
