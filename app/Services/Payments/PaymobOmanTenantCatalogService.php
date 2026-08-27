<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PAYMOB_OMAN_TENANT_CATALOG_R1
 *
 * Idempotently installs the Oman-specific payment catalogue into the current tenant.
 * It is intentionally NOT run globally: German/other tenants must not receive Oman
 * method rows simply because PMD supports the Oman market.
 *
 * Safety invariant: every created method/provider starts disabled and no credential
 * or provider assignment is copied from another tenant.
 */
final class PaymobOmanTenantCatalogService
{
    private PaymentMarketContext $context;
    private PaymentMarketRegistry $markets;

    public function __construct(
        ?PaymentMarketContext $context = null,
        ?PaymentMarketRegistry $markets = null
    ) {
        $this->markets = $markets ?: new PaymentMarketRegistry();
        $this->context = $context ?: new PaymentMarketContext($this->markets);
    }

    public function ensureCurrentTenant(bool $requireOmanLocation = true): array
    {
        $country = $this->context->countryCode();
        if ($requireOmanLocation && $country !== PaymentMarketRegistry::COUNTRY_OMAN) {
            return [
                'ok' => false,
                'skipped' => true,
                'country_code' => $country,
                'message' => 'Paymob Oman catalogue was not installed because the tenant default restaurant is not in Oman.',
            ];
        }

        $model = new Payments_model();
        $connection = $model->getConnection();
        $schema = $connection->getSchemaBuilder();
        $table = $model->getTable();
        if (!$schema->hasTable($table)) {
            return ['ok' => false, 'skipped' => false, 'message' => 'Payment catalogue table is missing: '.$table];
        }

        $columns = $schema->getColumnListing($table);
        $created = [];
        $updated = [];

        $providerCode = PaymobOmanConfigSchema::PROVIDER_CODE;
        $providerMeta = [
            'kind' => 'provider',
            'market_country' => 'OM',
            'provider_region' => 'OMN',
            'currency' => 'OMR',
            'supported_methods' => ['om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay'],
        ];

        if (!$connection->table($table)->where('code', $providerCode)->exists()) {
            $connection->table($table)->insert($this->insertPayload(
                $columns,
                $providerCode,
                'Paymob (Oman)',
                170,
                null,
                $providerMeta
            ));
            $created[] = $providerCode;
        } else {
            $updated[] = $this->ensureMarketMetadata($connection, $table, $columns, $providerCode, $providerMeta);
        }

        $priority = 70;
        foreach ($this->markets->methodsForCountry('OM') as $variantCode => $definition) {
            $meta = [
                'kind' => 'regional_method',
                'market_country' => 'OM',
                'provider_region' => 'OMN',
                'currency' => 'OMR',
                'canonical_method' => (string)$definition['canonical_method'],
                'provider_code' => 'paymob',
                'paymob_integration_key' => (string)$definition['paymob_integration_key'],
                'brands' => array_values((array)($definition['brands'] ?? [])),
            ];

            if ($connection->table($table)->where('code', $variantCode)->exists()) {
                $updated[] = $this->ensureMarketMetadata($connection, $table, $columns, $variantCode, $meta);
                continue;
            }

            $connection->table($table)->insert($this->insertPayload(
                $columns,
                $variantCode,
                (string)$definition['label'],
                $priority,
                null,
                $meta
            ));
            $created[] = $variantCode;
            $priority += 5;
        }

        return [
            'ok' => true,
            'skipped' => false,
            'country_code' => $country ?: 'OM',
            'table' => $table,
            'created' => $created,
            'updated' => array_values(array_filter($updated)),
            'all_new_rows_enabled' => false,
            'message' => 'Paymob Oman tenant catalogue is installed. All new rows remain Not offered until merchant credentials and Integration IDs are verified.',
        ];
    }

    private function insertPayload(
        array $columns,
        string $code,
        string $name,
        int $priority,
        ?string $providerCode,
        array $meta
    ): array {
        $payload = ['code' => $code, 'name' => $name];
        if (in_array('status', $columns, true)) $payload['status'] = 0;
        if (in_array('is_default', $columns, true)) $payload['is_default'] = 0;
        if (in_array('priority', $columns, true)) $payload['priority'] = $priority;
        if (in_array('sort_order', $columns, true)) $payload['sort_order'] = $priority;
        if (in_array('provider_code', $columns, true)) $payload['provider_code'] = $providerCode;
        if (in_array('description', $columns, true)) $payload['description'] = $name.' configuration';
        if (in_array('class_name', $columns, true)) $payload['class_name'] = '';

        $encoded = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        if (in_array('meta', $columns, true)) $payload['meta'] = $encoded;
        if (in_array('data', $columns, true)) $payload['data'] = $encoded;

        $now = now();
        if (in_array('created_at', $columns, true)) $payload['created_at'] = $now;
        if (in_array('updated_at', $columns, true)) $payload['updated_at'] = $now;
        if (in_array('date_added', $columns, true)) $payload['date_added'] = $now;
        if (in_array('date_updated', $columns, true)) $payload['date_updated'] = $now;

        return $payload;
    }

    private function ensureMarketMetadata($connection, string $table, array $columns, string $code, array $required): ?string
    {
        $jsonColumn = in_array('meta', $columns, true)
            ? 'meta'
            : (in_array('data', $columns, true) ? 'data' : null);
        if (!$jsonColumn) return null;

        $row = $connection->table($table)->where('code', $code)->first();
        if (!$row) return null;

        $current = [];
        $raw = $row->{$jsonColumn} ?? null;
        if (is_array($raw)) {
            $current = $raw;
        } elseif (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $current = $decoded;
        }

        $merged = array_merge($current, $required);
        if ($merged === $current) return null;

        $update = [
            $jsonColumn => json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
        ];
        if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
        if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
        $connection->table($table)->where('code', $code)->update($update);

        return $code;
    }
}
