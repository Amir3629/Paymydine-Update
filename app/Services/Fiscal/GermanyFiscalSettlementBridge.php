<?php

namespace App\Services\Fiscal;

use Admin\Services\Fiskaly\FiskalySignDeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_GERMANY_FISCAL_SETTLEMENT_BRIDGE_V69
 *
 * Connects a completed PMD payment lifecycle to the existing SIGN DE service.
 * Payment recording remains authoritative even when the external TSE is
 * temporarily unavailable; failures are returned and logged for reconciliation.
 *
 * No country is inferred here. An enabled tenant Fiskaly configuration is the
 * authority that this restaurant/location requires SIGN DE fiscalization.
 */
final class GermanyFiscalSettlementBridge
{
    public function finalizeIfEnabled(
        int $orderId,
        ?string $paymentMethod = null,
        ?string $paymentReference = null
    ): array {
        if ($orderId < 1 || !Schema::hasTable('orders')) {
            return $this->notRequired('Order is unavailable.');
        }

        $order = DB::table('orders')
            ->where('order_id', $orderId)
            ->first();

        if (!$order) {
            return $this->notRequired('Order is unavailable.');
        }

        $locationId = max(1, (int)($order->location_id ?? 1));

        if (!Schema::hasTable('fiskaly_configs')) {
            return $this->notRequired('Fiskaly is not configured for this tenant.');
        }

        $query = DB::table('fiskaly_configs')
            ->where('provider', 'fiskaly')
            ->where('is_enabled', 1);

        if (Schema::hasColumn('fiskaly_configs', 'location_id')) {
            $config = (clone $query)
                ->where('location_id', $locationId)
                ->orderByDesc(
                    Schema::hasColumn('fiskaly_configs', 'fiskaly_config_id')
                        ? 'fiskaly_config_id'
                        : 'location_id'
                )
                ->first();

            if (!$config && $locationId !== 1) {
                $config = (clone $query)
                    ->where('location_id', 1)
                    ->orderByDesc(
                        Schema::hasColumn('fiskaly_configs', 'fiskaly_config_id')
                            ? 'fiskaly_config_id'
                            : 'location_id'
                    )
                    ->first();
            }
        } else {
            $config = $query->first();
        }

        if (!$config) {
            return $this->notRequired('Fiskaly is disabled for this location.');
        }

        $requiredFields = ['api_key', 'api_secret', 'tss_id', 'client_id'];
        $missing = [];

        foreach ($requiredFields as $field) {
            if (trim((string)($config->{$field} ?? '')) === '') {
                $missing[] = $field;
            }
        }

        if ($missing) {
            $result = [
                'required' => true,
                'ok' => false,
                'provider' => 'fiskaly',
                'status' => 'configuration_incomplete',
                'order_id' => $orderId,
                'location_id' => $locationId,
                'message' => 'Fiskaly/TSE configuration is incomplete: '.implode(', ', $missing).'.',
                'missing' => $missing,
            ];

            Log::error('PMD_GERMANY_FISCAL_CONFIGURATION_INCOMPLETE_V69', $result);

            return $result;
        }

        $method = $this->normalizePaymentMethod(
            $paymentMethod
                ?: (string)($order->settlement_method ?? $order->payment ?? '')
        );
        $reference = trim((string)(
            $paymentReference
                ?: ($order->settlement_reference ?? '')
        ));

        try {
            $response = app(FiskalySignDeService::class)->finalizeOrder(
                $orderId,
                $locationId,
                $method,
                $reference !== '' ? $reference : null
            );

            $txId = trim((string)($response['tx_id'] ?? ''));
            $txNumber = trim((string)($response['number'] ?? ''));
            $state = strtoupper(trim((string)($response['state'] ?? 'FINISHED')));

            $result = [
                'required' => true,
                'ok' => $state === 'FINISHED',
                'provider' => 'fiskaly',
                'status' => strtolower($state ?: 'finished'),
                'order_id' => $orderId,
                'location_id' => $locationId,
                'payment_method' => $method,
                'transaction_id' => $txId !== '' ? $txId : null,
                'transaction_number' => $txNumber !== '' ? $txNumber : null,
                'message' => $state === 'FINISHED'
                    ? 'TSE fiscalization finished.'
                    : 'TSE fiscalization returned state '.$state.'.',
            ];

            Log::info('PMD_GERMANY_FISCAL_SETTLEMENT_V69', $result);

            return $result;
        } catch (\Throwable $error) {
            $result = [
                'required' => true,
                'ok' => false,
                'provider' => 'fiskaly',
                'status' => 'failed',
                'order_id' => $orderId,
                'location_id' => $locationId,
                'payment_method' => $method,
                'message' => 'Payment was recorded, but TSE fiscalization requires reconciliation.',
            ];

            Log::error('PMD_GERMANY_FISCAL_SETTLEMENT_FAILED_V69', $result + [
                'error' => $error->getMessage(),
            ]);

            return $result;
        }
    }

    private function normalizePaymentMethod(?string $method): string
    {
        $value = strtolower(trim((string)$method));

        if (in_array($value, ['cash', 'bar', 'cash_payment'], true)) {
            return 'cash';
        }

        if ($value === '') {
            return 'card';
        }

        return $value;
    }

    private function notRequired(string $message): array
    {
        return [
            'required' => false,
            'ok' => true,
            'provider' => 'fiskaly',
            'status' => 'not_enabled',
            'message' => $message,
        ];
    }
}
