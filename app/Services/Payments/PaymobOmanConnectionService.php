<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\Log;

/**
 * PMD_PAYMOB_OMAN_CONNECTION_R1
 *
 * Tenant-scoped connection reader/tester for the Paymob provider row.
 * The admin controller remains responsible for validating/saving form input.
 * This service never copies credentials across tenants and never enables methods.
 */
final class PaymobOmanConnectionService
{
    private PaymobOmanConfigSchema $schema;

    public function __construct(?PaymobOmanConfigSchema $schema = null)
    {
        $this->schema = $schema ?: new PaymobOmanConfigSchema();
    }

    public function providerRecord(): ?Payments_model
    {
        try {
            return Payments_model::query()->where('code', PaymobOmanConfigSchema::PROVIDER_CODE)->first();
        } catch (\Throwable $error) {
            Log::warning('PMD_PAYMOB_PROVIDER_LOOKUP_FAILED', ['message' => $error->getMessage()]);
            return null;
        }
    }

    public function savedConfig(): array
    {
        $record = $this->providerRecord();
        if (!$record) return [];

        try {
            return method_exists($record, 'getConfigData') ? (array)$record->getConfigData() : (array)$record->data;
        } catch (\Throwable $error) {
            Log::warning('PMD_PAYMOB_CONFIG_READ_FAILED', ['message' => $error->getMessage()]);
            return [];
        }
    }

    public function runtimeConfig(?array $override = null): array
    {
        return $this->schema->runtimeConfig($override ?? $this->savedConfig());
    }

    public function state(): array
    {
        $record = $this->providerRecord();
        $saved = $this->savedConfig();
        $runtime = new PaymobOmanRuntimeService($this->schema->runtimeConfig($saved));
        $state = $runtime->state();

        return array_merge($state, [
            'provider_record_exists' => $record !== null,
            'provider_status' => (int)($record->status ?? 0),
            'provider_enabled' => (int)($record->status ?? 0) === 1,
            'connection_status' => (string)($saved['connection_status'] ?? 'Not tested'),
            'last_tested_at' => $saved['last_tested_at'] ?? null,
        ]);
    }

    /**
     * Test API Key using either saved values or the current unsaved admin form values.
     * This creates no Intention and charges nothing.
     */
    public function test(?array $override = null, bool $persistResult = true): array
    {
        $saved = $this->savedConfig();
        $candidate = array_merge($saved, (array)($override ?? []));
        $runtimeConfig = $this->schema->runtimeConfig($candidate);
        $runtime = new PaymobOmanRuntimeService($runtimeConfig);
        $result = $runtime->testConnection();

        if ($persistResult) {
            $this->persistTestResult($candidate, $result);
        }

        return array_merge($result, [
            'state' => (new PaymobOmanRuntimeService($runtimeConfig))->state(),
        ]);
    }

    /** Runtime readiness is stricter than successful API-Key authentication. */
    public function readiness(?array $override = null): array
    {
        $candidate = array_merge($this->savedConfig(), (array)($override ?? []));

        return $this->schema->readiness($candidate);
    }

    private function persistTestResult(array $candidate, array $result): void
    {
        $record = $this->providerRecord();
        if (!$record || !method_exists($record, 'getConfigData') || !method_exists($record, 'setConfigData')) return;

        try {
            $current = (array)$record->getConfigData();
            $current['connection_status'] = ($result['ok'] ?? false) ? 'Connected' : 'Connection failed';
            $current['last_tested_at'] = now()->toIso8601String();
            $current['last_connection_error'] = ($result['ok'] ?? false)
                ? null
                : trim((string)($result['message'] ?? 'Paymob connection failed.'));
            $current['market_country'] = 'OM';
            $current['provider_region'] = 'OMN';
            $current['currency'] = 'OMR';
            $current['api_base_url'] = PaymobApiClient::OMAN_BASE_URL;

            // Persist only status metadata here. Credentials remain the admin form's
            // save responsibility and are never copied from $candidate by this method.
            $record->setConfigData($current);
            $record->save();
        } catch (\Throwable $error) {
            Log::warning('PMD_PAYMOB_CONNECTION_RESULT_SAVE_FAILED', ['message' => $error->getMessage()]);
        }
    }
}
