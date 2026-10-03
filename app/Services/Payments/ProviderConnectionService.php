<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class ProviderConnectionService
{
    public function __construct(
        protected ProviderCapabilityRegistry $capabilities
    ) {
    }

    public function state(?string $providerCode = null): array
    {
        if (!Schema::hasTable('terminal_provider_configs')) {
            return [
                'providers' => [],
                'schema_ready' => false,
            ];
        }

        $query = DB::table('terminal_provider_configs')
            ->orderBy('provider_code')
            ->orderBy('environment');

        if ($providerCode !== null && trim($providerCode) !== '') {
            $query->where('provider_code', strtolower(trim($providerCode)));
        }

        $rows = $query->get();
        $providers = [];

        foreach ($rows as $row) {
            $code = strtolower(trim((string)$row->provider_code));
            $environment = strtolower(trim((string)$row->environment));
            $definition = $this->capabilities->provider($code);
            $metadata = $this->decodeJson($row->metadata ?? null);

            $providers[$code] ??= [
                'provider_code' => $code,
                'label' => $definition['label'] ?? $code,
                'catalogue_capabilities' => $definition['capabilities'] ?? [],
                'catalogue_payment_methods' => $definition['payment_methods'] ?? [],
                'environments' => [],
            ];

            $providers[$code]['environments'][$environment] = [
                'environment' => $environment,
                'configured' => !empty($row->access_token_encrypted)
                    || !empty($row->merchant_code),
                'is_active' => (bool)$row->is_active,
                'connection_status' => (string)($row->connection_status ?? 'not_configured'),
                'merchant_code' => (string)($row->merchant_code ?? ''),
                'app_id' => (string)($row->app_id ?? ''),
                'api_base_url' => (string)($row->api_base_url ?? ''),
                'secret_saved' => !empty($row->access_token_encrypted),
                'affiliate_key_saved' => !empty($row->affiliate_key_encrypted),
                'last_tested_at' => $row->last_tested_at ?? null,
                'last_error' => $row->last_error ?? null,
                'discovered_capabilities' => array_values((array)($metadata['capabilities'] ?? [])),
                'discovered_payment_methods' => array_values((array)($metadata['payment_methods'] ?? [])),
                'metadata' => $this->publicMetadata($metadata),
            ];
        }

        return [
            'providers' => array_values($providers),
            'schema_ready' => true,
        ];
    }

    public function connection(string $providerCode, string $environment): ?object
    {
        $this->assertSchema();

        return DB::table('terminal_provider_configs')
            ->where('provider_code', strtolower(trim($providerCode)))
            ->where('environment', $this->normalizeEnvironment($environment))
            ->first();
    }

    public function credentials(string $providerCode, string $environment): array
    {
        $row = $this->connection($providerCode, $environment);

        if (!$row) {
            return [];
        }

        return [
            'provider_code' => strtolower(trim((string)$row->provider_code)),
            'environment' => strtolower(trim((string)$row->environment)),
            'api_base_url' => (string)($row->api_base_url ?? ''),
            'access_token' => $this->decryptNullable($row->access_token_encrypted ?? null),
            'affiliate_key' => $this->decryptNullable($row->affiliate_key_encrypted ?? null),
            'merchant_code' => (string)($row->merchant_code ?? ''),
            'app_id' => (string)($row->app_id ?? ''),
            'is_active' => (bool)$row->is_active,
            'connection_status' => (string)($row->connection_status ?? 'not_configured'),
            'metadata' => $this->decodeJson($row->metadata ?? null),
        ];
    }

    public function markRuntimeDiscovery(
        string $providerCode,
        string $environment,
        array $capabilities,
        array $paymentMethods,
        array $extraMetadata = []
    ): void {
        $this->assertSchema();

        $row = $this->connection($providerCode, $environment);
        $metadata = $this->decodeJson($row->metadata ?? null);

        $metadata = array_merge($metadata, $extraMetadata, [
            'capabilities' => array_values(array_unique(array_filter($capabilities))),
            'payment_methods' => array_values(array_unique(array_filter($paymentMethods))),
            'discovered_at' => now()->toIso8601String(),
        ]);

        DB::table('terminal_provider_configs')
            ->where('provider_code', strtolower(trim($providerCode)))
            ->where('environment', $this->normalizeEnvironment($environment))
            ->update([
                'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
    }

    protected function normalizeEnvironment(string $environment): string
    {
        $environment = strtolower(trim($environment));

        return in_array($environment, ['test', 'production'], true)
            ? $environment
            : 'production';
    }

    protected function assertSchema(): void
    {
        if (!Schema::hasTable('terminal_provider_configs')) {
            throw new RuntimeException('Provider connection schema is not ready.');
        }
    }

    protected function decryptNullable(?string $value): string
    {
        if (!$value) {
            return '';
        }

        try {
            return (string)Crypt::decryptString($value);
        } catch (\Throwable) {
            return '';
        }
    }

    protected function decodeJson($value): array
    {
        if (!$value) {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode((string)$value, true);

        return is_array($decoded) ? $decoded : [];
    }

    protected function publicMetadata(array $metadata): array
    {
        unset(
            $metadata['access_token'],
            $metadata['secret'],
            $metadata['api_key'],
            $metadata['affiliate_key']
        );

        return $metadata;
    }
}
