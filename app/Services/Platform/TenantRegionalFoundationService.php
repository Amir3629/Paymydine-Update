<?php

namespace App\Services\Platform;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TENANT_REGIONAL_FOUNDATION_R1
 *
 * Makes a supported country profile materially usable inside one tenant.
 * Countries and currencies are catalogue data, so PMD may safely ensure them.
 * Language packs are code/content assets and are NOT fabricated here.
 */
final class TenantRegionalFoundationService
{
    public function ensure(array $profile): array
    {
        $country = $this->ensureCountry($profile);
        $currency = $this->ensureCurrency($profile, $country['country_id'] ?? null);

        return [
            'ok' => (bool)($country['ok'] ?? false) && (bool)($currency['ok'] ?? false),
            'country' => $country,
            'currency' => $currency,
        ];
    }

    private function ensureCountry(array $profile): array
    {
        if (!Schema::hasTable('countries')) {
            return ['ok' => false, 'message' => 'countries table is missing.'];
        }

        $columns = Schema::getColumnListing('countries');
        $countryCode = strtoupper((string)$profile['country_code']);
        $iso3 = strtoupper((string)$profile['country_iso3']);
        $name = (string)$profile['country_name'];

        $query = DB::table('countries')->where(function ($q) use ($columns, $countryCode, $iso3, $name) {
            if (in_array('iso_code_2', $columns, true)) $q->orWhereRaw('UPPER(iso_code_2) = ?', [$countryCode]);
            if (in_array('iso_code_3', $columns, true)) $q->orWhereRaw('UPPER(iso_code_3) = ?', [$iso3]);
            if (in_array('country_name', $columns, true)) $q->orWhereRaw('LOWER(country_name) = ?', [strtolower($name)]);
        });
        $row = $query->first();

        if (!$row) {
            $payload = [];
            if (in_array('country_name', $columns, true)) $payload['country_name'] = $name;
            if (in_array('iso_code_2', $columns, true)) $payload['iso_code_2'] = $countryCode;
            if (in_array('iso_code_3', $columns, true)) $payload['iso_code_3'] = $iso3;
            if (in_array('format', $columns, true)) $payload['format'] = '';
            if (in_array('status', $columns, true)) $payload['status'] = 1;
            if (in_array('flag', $columns, true)) $payload['flag'] = '';
            if (in_array('priority', $columns, true)) $payload['priority'] = 0;
            if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
            if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();
            if (in_array('date_added', $columns, true)) $payload['date_added'] = now();
            if (in_array('date_updated', $columns, true)) $payload['date_updated'] = now();

            $id = DB::table('countries')->insertGetId($payload);
            return ['ok' => true, 'country_id' => (int)$id, 'created' => true, 'enabled' => true];
        }

        $id = (int)($row->country_id ?? 0);
        $update = [];
        if (in_array('status', $columns, true) && (int)($row->status ?? 0) !== 1) $update['status'] = 1;
        if (in_array('country_name', $columns, true) && (string)($row->country_name ?? '') !== $name) $update['country_name'] = $name;
        if (in_array('iso_code_2', $columns, true) && strtoupper((string)($row->iso_code_2 ?? '')) !== $countryCode) $update['iso_code_2'] = $countryCode;
        if (in_array('iso_code_3', $columns, true) && strtoupper((string)($row->iso_code_3 ?? '')) !== $iso3) $update['iso_code_3'] = $iso3;
        if ($update) {
            if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
            if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
            DB::table('countries')->where('country_id', $id)->update($update);
        }

        return ['ok' => $id > 0, 'country_id' => $id ?: null, 'created' => false, 'enabled' => true];
    }

    private function ensureCurrency(array $profile, ?int $countryId): array
    {
        if (!Schema::hasTable('currencies')) {
            return ['ok' => false, 'message' => 'currencies table is missing.'];
        }

        $columns = Schema::getColumnListing('currencies');
        $currency = (array)$profile['currency'];
        $code = strtoupper((string)$currency['code']);
        $row = DB::table('currencies')->whereRaw('UPPER(currency_code) = ?', [$code])->first();
        $definition = $this->currencyDefinition($code, $profile);

        if (!$row) {
            $payload = $this->filterCurrencyPayload($columns, array_merge($definition, [
                'country_id' => $countryId ?: 0,
                'currency_status' => 1,
            ]));
            $id = DB::table('currencies')->insertGetId($payload);
            return ['ok' => true, 'currency_id' => (int)$id, 'currency_code' => $code, 'created' => true, 'enabled' => true];
        }

        $id = (int)($row->currency_id ?? 0);
        $update = $this->filterCurrencyPayload($columns, $definition);
        if (in_array('country_id', $columns, true) && $countryId) $update['country_id'] = $countryId;
        if (in_array('currency_status', $columns, true)) $update['currency_status'] = 1;
        unset($update['created_at'], $update['date_added']);
        if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
        if (in_array('date_modified', $columns, true)) $update['date_modified'] = now();
        if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
        DB::table('currencies')->where('currency_id', $id)->update($update);

        return ['ok' => $id > 0, 'currency_id' => $id ?: null, 'currency_code' => $code, 'created' => false, 'enabled' => true];
    }

    private function currencyDefinition(string $code, array $profile): array
    {
        return match ($code) {
            'OMR' => [
                'currency_name' => 'Omani Rial',
                'currency_code' => 'OMR',
                // Keep within old PMD schema's varchar(3) while rendering clearly.
                'currency_symbol' => 'OMR',
                'currency_rate' => 1,
                'symbol_position' => 1,
                'thousand_sign' => ',',
                'decimal_sign' => '.',
                'decimal_position' => '3',
                'iso_alpha2' => 'OM',
                'iso_alpha3' => 'OMN',
                'iso_numeric' => 512,
                'flag' => '',
                'currency_status' => 1,
            ],
            'TRY' => [
                'currency_name' => 'Turkish Lira',
                'currency_code' => 'TRY',
                'currency_symbol' => '₺',
                'currency_rate' => 1,
                'symbol_position' => 1,
                'thousand_sign' => '.',
                'decimal_sign' => ',',
                'decimal_position' => '2',
                'iso_alpha2' => 'TR',
                'iso_alpha3' => 'TUR',
                'iso_numeric' => 949,
                'flag' => '',
                'currency_status' => 1,
            ],
            'CAD' => [
                'currency_name' => 'Canadian Dollar',
                'currency_code' => 'CAD',
                'currency_symbol' => '$',
                'currency_rate' => 1,
                'symbol_position' => 1,
                'thousand_sign' => ',',
                'decimal_sign' => '.',
                'decimal_position' => '2',
                'iso_alpha2' => 'CA',
                'iso_alpha3' => 'CAN',
                'iso_numeric' => 124,
                'flag' => '',
                'currency_status' => 1,
            ],
            'EUR' => [
                'currency_name' => 'Euro',
                'currency_code' => 'EUR',
                'currency_symbol' => '€',
                'currency_rate' => 1,
                'symbol_position' => 1,
                'thousand_sign' => ',',
                'decimal_sign' => '.',
                'decimal_position' => '2',
                'iso_alpha2' => 'DE',
                'iso_alpha3' => 'DEU',
                'iso_numeric' => 978,
                'flag' => '',
                'currency_status' => 1,
            ],
            default => [
                'currency_name' => $code,
                'currency_code' => $code,
                'currency_symbol' => $code,
                'currency_rate' => 1,
                'symbol_position' => 1,
                'thousand_sign' => ',',
                'decimal_sign' => '.',
                'decimal_position' => (string)($profile['currency']['minor_exponent'] ?? 2),
                'iso_alpha2' => (string)$profile['country_code'],
                'iso_alpha3' => (string)$profile['country_iso3'],
                'iso_numeric' => 0,
                'flag' => '',
                'currency_status' => 1,
            ],
        };
    }

    private function filterCurrencyPayload(array $columns, array $payload): array
    {
        $result = [];
        foreach ($payload as $key => $value) {
            if (in_array($key, $columns, true)) $result[$key] = $value;
        }
        if (in_array('created_at', $columns, true) && !isset($result['created_at'])) $result['created_at'] = now();
        if (in_array('updated_at', $columns, true) && !isset($result['updated_at'])) $result['updated_at'] = now();
        if (in_array('date_added', $columns, true) && !isset($result['date_added'])) $result['date_added'] = now();
        if (in_array('date_modified', $columns, true)) $result['date_modified'] = now();
        if (in_array('date_updated', $columns, true)) $result['date_updated'] = now();
        return $result;
    }
}
