<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Controls per-location Turkey partner configuration.
 *
 * Raw secrets must NOT be stored here. credential_reference is expected to
 * point at the application's secret-management/config mechanism.
 */
final class TurkeyIntegrationConfigurationService
{
    public function __construct(
        private ?TurkeyTenantContext $context = null,
        private ?TurkeyIntegrationRegistry $registry = null
    ) {
        $this->context = $context ?: new TurkeyTenantContext();
        $this->registry = $registry ?: new TurkeyIntegrationRegistry();
    }

    public function configure(string $code, array $config, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $definition = $this->registry->definition($code);
        if (!$definition) {
            throw new \InvalidArgumentException('Unknown Türkiye integration: '.$code);
        }
        if (!Schema::hasTable('pmd_tr_integrations')) {
            throw new \RuntimeException('Türkiye integration foundation is not provisioned.');
        }

        $locationId = (int)($state['location_id'] ?? 0);
        $safe = $this->sanitizeConfig($config);
        $missing = $this->missingRequired($definition, $safe);
        $status = $missing ? 'configuration_incomplete' : 'configured_not_verified';

        DB::table('pmd_tr_integrations')->updateOrInsert(
            ['location_id' => $locationId ?: null, 'code' => strtolower($code)],
            [
                'provider' => isset($safe['provider']) ? (string)$safe['provider'] : null,
                'kind' => (string)$definition['kind'],
                'status' => $status,
                'enabled' => 0,
                'production_ready' => 0,
                'config_json' => json_encode($safe, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'credential_reference' => $safe['credential_reference'] ?? $safe['client_secret_reference'] ?? null,
                'contract_reference' => $safe['contract_reference'] ?? $safe['partner_contract_reference'] ?? null,
                'certification_reference' => $safe['certification_reference'] ?? null,
                'last_error' => $missing ? 'Missing: '.implode(', ', $missing) : null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return $this->state($code, $locationId);
    }

    /**
     * Production activation is explicit and fail-closed. Calling configure()
     * never makes a regulated/private integration live.
     */
    public function markVerified(string $code, array $evidence, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $definition = $this->registry->definition($code);
        if (!$definition) throw new \InvalidArgumentException('Unknown Türkiye integration: '.$code);

        $locationId = (int)($state['location_id'] ?? 0);
        $row = DB::table('pmd_tr_integrations')
            ->where('location_id', $locationId ?: null)
            ->where('code', strtolower($code))
            ->first();
        if (!$row) throw new \RuntimeException('Integration must be configured before verification.');

        $config = json_decode((string)($row->config_json ?? ''), true) ?: [];
        $missing = $this->missingRequired($definition, $config);
        if ($missing) {
            throw new \RuntimeException('Cannot verify integration; missing configuration: '.implode(', ', $missing));
        }

        $verificationRef = trim((string)($evidence['verification_reference'] ?? ''));
        if ($verificationRef === '') {
            throw new \InvalidArgumentException('verification_reference is required.');
        }

        // Regulated fiscal/payment integrations require explicit evidence that
        // the external partner/device approval is complete; PMD does not infer it.
        if ((bool)$definition['regulated']) {
            $approval = strtolower(trim((string)($evidence['external_approval_status'] ?? '')));
            if (!in_array($approval, ['approved', 'active', 'certified'], true)) {
                throw new \RuntimeException('Regulated integration requires approved/active/certified external evidence.');
            }
        }

        DB::table('pmd_tr_integrations')
            ->where('location_id', $locationId ?: null)
            ->where('code', strtolower($code))
            ->update([
                'status' => 'verified',
                'enabled' => 1,
                'production_ready' => 1,
                'certification_reference' => $evidence['certification_reference'] ?? $verificationRef,
                'contract_reference' => $evidence['contract_reference'] ?? ($row->contract_reference ?? null),
                'last_verified_at' => now(),
                'last_error' => null,
                'updated_at' => now(),
            ]);

        return $this->state($code, $locationId);
    }

    public function disable(string $code, ?int $locationId = null, ?string $reason = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        DB::table('pmd_tr_integrations')
            ->where('location_id', $locationId ?: null)
            ->where('code', strtolower($code))
            ->update([
                'status' => 'disabled',
                'enabled' => 0,
                'production_ready' => 0,
                'last_error' => $reason,
                'updated_at' => now(),
            ]);
        return $this->state($code, $locationId);
    }

    public function state(string $code, ?int $locationId = null): array
    {
        $tenant = $this->context->requireTurkey($locationId);
        $locationId = (int)($tenant['location_id'] ?? 0);
        $definition = $this->registry->definition($code);
        $row = Schema::hasTable('pmd_tr_integrations')
            ? DB::table('pmd_tr_integrations')->where('location_id', $locationId ?: null)->where('code', strtolower($code))->first()
            : null;

        return [
            'code' => strtolower($code),
            'location_id' => $locationId ?: null,
            'definition' => $definition,
            'status' => $row->status ?? ($definition['default_status'] ?? 'not_catalogued'),
            'enabled' => (bool)($row->enabled ?? false),
            'production_ready' => (bool)($row->production_ready ?? false),
            'last_verified_at' => $row->last_verified_at ?? null,
            'last_error' => $row->last_error ?? null,
        ];
    }

    private function missingRequired(array $definition, array $config): array
    {
        $missing = [];
        foreach ((array)($definition['required_config'] ?? []) as $key) {
            if (!array_key_exists($key, $config) || trim((string)$config[$key]) === '') $missing[] = $key;
        }
        return $missing;
    }

    private function sanitizeConfig(array $config): array
    {
        $forbidden = ['password', 'secret', 'client_secret', 'api_key', 'private_key', 'token', 'access_token'];
        foreach ($forbidden as $key) {
            if (array_key_exists($key, $config)) {
                throw new \InvalidArgumentException('Do not store raw secret field '.$key.' in Türkiye integration config; use a *_reference field.');
            }
        }
        return $config;
    }
}
