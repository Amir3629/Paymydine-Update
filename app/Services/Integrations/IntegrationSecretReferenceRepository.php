<?php

namespace App\Services\Integrations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class IntegrationSecretReferenceRepository
{
    public function __construct(private ?SecretReferenceService $secrets = null)
    {
        $this->secrets = $secrets ?: new SecretReferenceService();
    }

    public function put(
        string $providerCode,
        string $environment,
        string $secretName,
        string $reference,
        ?int $locationId = null,
        ?string $countryCode = null
    ): array {
        $this->assertSchema();
        $providerCode = strtolower(trim($providerCode));
        $environment = strtolower(trim($environment)) ?: 'production';
        $secretName = strtolower(trim($secretName));
        $reference = (string)$this->secrets->normalize($reference);

        if ($providerCode === '' || $secretName === '') {
            throw new \InvalidArgumentException('provider_code and secret_name are required.');
        }

        DB::table('pmd_integration_secret_references')->updateOrInsert(
            [
                'location_id' => $locationId,
                'provider_code' => $providerCode,
                'environment' => $environment,
                'secret_name' => $secretName,
            ],
            [
                'country_code' => $countryCode ? strtoupper(trim($countryCode)) : null,
                'secret_reference' => $reference,
                'enabled' => 1,
                'last_error' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return $this->state($providerCode, $environment, $secretName, $locationId);
    }

    public function state(string $providerCode, string $environment, string $secretName, ?int $locationId = null): array
    {
        if (!Schema::hasTable('pmd_integration_secret_references')) {
            return ['configured' => false, 'reference' => null, 'resolves' => false];
        }

        $row = DB::table('pmd_integration_secret_references')
            ->where('provider_code', strtolower(trim($providerCode)))
            ->where('environment', strtolower(trim($environment)) ?: 'production')
            ->where('secret_name', strtolower(trim($secretName)))
            ->where('location_id', $locationId)
            ->first();

        if (!$row) return ['configured' => false, 'reference' => null, 'resolves' => false];

        return [
            'configured' => (bool)$row->enabled,
            'reference' => (string)$row->secret_reference,
            'resolves' => (bool)$row->enabled && $this->secrets->exists((string)$row->secret_reference),
            'last_resolved_at' => $row->last_resolved_at ?? null,
            'last_error' => $row->last_error ?? null,
        ];
    }

    public function resolve(string $providerCode, string $environment, string $secretName, ?int $locationId = null): string
    {
        $this->assertSchema();
        $query = DB::table('pmd_integration_secret_references')
            ->where('provider_code', strtolower(trim($providerCode)))
            ->where('environment', strtolower(trim($environment)) ?: 'production')
            ->where('secret_name', strtolower(trim($secretName)))
            ->where('location_id', $locationId);
        $row = $query->first();
        if (!$row || !$row->enabled) return '';

        try {
            $value = $this->secrets->resolve((string)$row->secret_reference);
            $query->update([
                'last_resolved_at' => $value !== '' ? now() : ($row->last_resolved_at ?? null),
                'last_error' => $value === '' ? 'Secret reference did not resolve to a value.' : null,
                'updated_at' => now(),
            ]);
            return $value;
        } catch (\Throwable $error) {
            $query->update(['last_error' => $error->getMessage(), 'updated_at' => now()]);
            return '';
        }
    }

    public function remove(string $providerCode, string $environment, string $secretName, ?int $locationId = null): void
    {
        if (!Schema::hasTable('pmd_integration_secret_references')) return;
        DB::table('pmd_integration_secret_references')
            ->where('provider_code', strtolower(trim($providerCode)))
            ->where('environment', strtolower(trim($environment)) ?: 'production')
            ->where('secret_name', strtolower(trim($secretName)))
            ->where('location_id', $locationId)
            ->delete();
    }

    private function assertSchema(): void
    {
        if (!Schema::hasTable('pmd_integration_secret_references')) {
            throw new \RuntimeException('PMD integration secret-reference schema is not ready.');
        }
    }
}
