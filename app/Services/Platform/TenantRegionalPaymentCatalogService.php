<?php

namespace App\Services\Platform;

use Admin\Models\Payments_model;

/**
 * PMD_TENANT_REGIONAL_PAYMENT_CATALOG_R1
 *
 * Installs country-specific payment method identities into ONLY the current
 * tenant. Every new row is disabled and unassigned. Provider integrations are
 * responsible for their own connection/readiness metadata afterwards.
 */
final class TenantRegionalPaymentCatalogService
{
    public function __construct(
        private ?CountryPlatformProfileRegistry $profiles = null
    ) {
        $this->profiles = $profiles ?: new CountryPlatformProfileRegistry();
    }

    public function ensureForCountry(string $country): array
    {
        $profile = $this->profiles->requireProfile($country);
        $model = new Payments_model();
        $connection = $model->getConnection();
        $schema = $connection->getSchemaBuilder();
        $table = $model->getTable();

        if (!$schema->hasTable($table)) {
            return ['ok' => false, 'message' => 'Payment catalogue table is missing: '.$table];
        }

        $columns = $schema->getColumnListing($table);
        $created = [];
        $updated = [];
        $priority = 70;

        foreach ((array)$profile['payments']['methods'] as $code => $definition) {
            $definition = (array)$definition;
            $meta = [
                'kind' => 'regional_method',
                'market_country' => (string)$profile['country_code'],
                'market_country_name' => (string)$profile['country_name'],
                'currency' => (string)$profile['currency']['code'],
                'currency_minor_exponent' => (int)$profile['currency']['minor_exponent'],
                'canonical_method' => (string)($definition['canonical_method'] ?? ''),
                'provider_candidates' => array_values((array)($definition['provider_candidates'] ?? [])),
                'paymob_integration_key' => $definition['paymob_integration_key'] ?? null,
                'brands' => array_values((array)($definition['brands'] ?? [])),
            ];

            $existing = $connection->table($table)->where('code', $code)->first();
            if (!$existing) {
                $connection->table($table)->insert($this->insertPayload(
                    $columns,
                    $code,
                    (string)$definition['label'],
                    $priority,
                    $meta
                ));
                $created[] = $code;
            } else {
                $changed = $this->mergeMetadata($connection, $table, $columns, $code, $meta);
                if ($changed) $updated[] = $code;
            }
            $priority += 5;
        }

        return [
            'ok' => true,
            'country_code' => $profile['country_code'],
            'table' => $table,
            'created' => $created,
            'updated' => $updated,
            'new_rows_enabled' => false,
            'message' => 'Regional payment catalogue prepared. Provider assignment/readiness still controls offering.',
        ];
    }

    private function insertPayload(array $columns, string $code, string $name, int $priority, array $meta): array
    {
        $payload = ['code' => $code, 'name' => $name];
        if (in_array('status', $columns, true)) $payload['status'] = 0;
        if (in_array('is_default', $columns, true)) $payload['is_default'] = 0;
        if (in_array('priority', $columns, true)) $payload['priority'] = $priority;
        if (in_array('sort_order', $columns, true)) $payload['sort_order'] = $priority;
        if (in_array('provider_code', $columns, true)) $payload['provider_code'] = null;
        if (in_array('description', $columns, true)) $payload['description'] = $name.' regional configuration';
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

    private function mergeMetadata($connection, string $table, array $columns, string $code, array $required): bool
    {
        $jsonColumn = in_array('meta', $columns, true)
            ? 'meta'
            : (in_array('data', $columns, true) ? 'data' : null);
        if (!$jsonColumn) return false;

        $row = $connection->table($table)->where('code', $code)->first();
        if (!$row) return false;

        $current = [];
        $raw = $row->{$jsonColumn} ?? null;
        if (is_array($raw)) $current = $raw;
        elseif (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $current = $decoded;
        }

        $merged = array_merge($current, $required);
        if ($merged === $current) return false;

        $update = [$jsonColumn => json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}'];
        if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
        if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
        $connection->table($table)->where('code', $code)->update($update);
        return true;
    }
}
