<?php

namespace App\Services\TerminalPayments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class TerminalPaymentService
{
    public function createAttempt(int $orderId, string $providerCode, ?string $terminalId = null): array
    {
        if (!Schema::hasTable('payment_attempts')) {
            return ['success' => false, 'error' => 'payment_attempts table is missing. Run migrations first.'];
        }
        $order = DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) return ['success' => false, 'error' => 'Order not found.'];

        $provider = $this->provider($providerCode);
        $config = $this->providerConfig($providerCode);
        $validation = $provider->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return ['success' => false, 'error' => $validation['message'] ?? 'Provider is not configured.'];
        }

        $amount = (float)($order->order_total ?? $order->total ?? 0);
        $currency = (string)($config['currency'] ?? 'EUR');
        $id = DB::table('payment_attempts')->insertGetId([
            'order_id' => $orderId,
            'provider_code' => $providerCode,
            'terminal_id' => $terminalId ?: ($config['terminal_id'] ?? null),
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'pending',
            'request_payload' => json_encode(['order_id' => $orderId, 'amount' => $amount, 'currency' => $currency, 'provider_code' => $providerCode]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Log::info('PMD_TERMINAL_PAYMENT_CREATE', ['attempt_id' => $id, 'order_id' => $orderId, 'provider_code' => $providerCode, 'amount' => $amount, 'currency' => $currency]);

        $attempt = (array)DB::table('payment_attempts')->where('id', $id)->first();
        $result = $provider->createPayment($attempt, $config);
        $status = ($result['ok'] ?? false) ? ($result['status'] ?? 'sent_to_terminal') : 'failed';
        DB::table('payment_attempts')->where('id', $id)->update([
            'status' => $status,
            'provider_reference' => $result['provider_reference'] ?? null,
            'response_payload' => json_encode($this->redact($result)),
            'error_message' => ($result['ok'] ?? false) ? null : ($result['message'] ?? 'Terminal payment failed.'),
            'updated_at' => now(),
        ]);
        Log::info(($result['ok'] ?? false) ? 'PMD_TERMINAL_PAYMENT_SENT' : 'PMD_TERMINAL_PAYMENT_FAILED', ['attempt_id' => $id, 'provider_code' => $providerCode, 'status' => $status]);

        return ['success' => (bool)($result['ok'] ?? false), 'attempt_id' => $id, 'status' => $status, 'message' => $result['message'] ?? null];
    }

    public function provider(string $code): TerminalPaymentProviderInterface
    {
        return match ($code) {
            'worldline' => new WorldlineTerminalProvider(),
            'vr_payment' => new VrPaymentTerminalProvider(),
            default => new NullTerminalProvider($code),
        };
    }

    private function providerConfig(string $code): array
    {
        if (!Schema::hasTable('payment_methods') && !Schema::hasTable('payments')) return [];
        $model = \Admin\Models\Payments_model::query()->where('code', $code)->where('status', 1)->first();
        return $model && method_exists($model, 'getConfigData') ? (array)$model->getConfigData() : [];
    }

    private function redact(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if (preg_match('/secret|token|key|password|certificate/i', (string)$key)) $payload[$key] = '[redacted]';
            elseif (is_array($value)) $payload[$key] = $this->redact($value);
        }
        return $payload;
    }
}
