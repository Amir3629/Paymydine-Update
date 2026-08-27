<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Models\Payments_model;
use App\Services\Payments\PaymobOmanConfigSchema;
use App\Services\Payments\PaymobOmanConnectionService;
use App\Services\Payments\PaymobOmanRuntimeService;
use App\Services\Payments\ProviderCapabilityRegistry;
use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\LocationPlatformContext;
use App\Services\Platform\TenantRegionalPaymentCatalogService;
use App\Services\Payments\PaymobOmanTenantCatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * PMD_PAYMENT_MARKET_SETTINGS_R4
 *
 * LocationPlatformContext is the only market authority for this controller.
 * It exposes only the providers/methods belonging to the current location and
 * owns the Oman-specific Paymob admin bridge without expanding legacy global
 * Payments.php enums.
 */
final class PaymentMarketSettings extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    /**
     * Fail closed until PMD order checkout -> Paymob callback -> idempotent shared
     * settlement is wired and sandbox-verified. Admin credential setup/testing is
     * already safe; guest offering is deliberately not.
     */
    private const PAYMOB_GUEST_RUNTIME_READY = false;

    public function state(
        LocationPlatformContext $context,
        ProviderCapabilityRegistry $capabilities,
        PaymobOmanConfigSchema $paymobSchema,
        PaymobOmanConnectionService $paymobConnection
    ) {
        $market = $this->resolvedMarket($context);
        $profile = $market['profile'];
        $country = (string)$market['country_code'];

        // Idempotent catalogue preparation. Nothing is auto-enabled.
        (new TenantRegionalPaymentCatalogService())->ensureForCountry($country);
        if ($country === CountryPlatformProfileRegistry::OMAN) {
            (new PaymobOmanTenantCatalogService())->ensureCurrentTenant(false);
        }

        $providerDefinitions = (array)($profile['payments']['providers'] ?? []);
        $providers = [];
        foreach ($providerDefinitions as $code => $marketDefinition) {
            $row = Payments_model::query()->where('code', (string)$code)->first();
            $registry = $capabilities->provider((string)$code);

            $item = [
                'code' => (string)$code,
                'label' => (string)($registry['label'] ?? ucfirst(str_replace('_', ' ', (string)$code))),
                'enabled' => (bool)($row->status ?? false),
                'market' => (array)$marketDefinition,
                'implemented_capabilities' => array_values((array)($registry['implemented_capabilities'] ?? [])),
                'implemented_payment_methods' => array_values((array)($registry['implemented_payment_methods'] ?? [])),
            ];

            if ((string)$code === PaymobOmanConfigSchema::PROVIDER_CODE) {
                $saved = $row && method_exists($row, 'getConfigData') ? (array)$row->getConfigData() : [];
                $item['admin_config'] = $paymobSchema->safeAdminConfig($saved);
                $item['connection'] = $paymobConnection->state();
                $item['fields'] = $this->publicFieldSchema($paymobSchema);
                $item['guest_runtime_ready'] = self::PAYMOB_GUEST_RUNTIME_READY;
            }

            $providers[] = $item;
        }

        $methods = [];
        foreach ((array)($profile['payments']['methods'] ?? []) as $variantCode => $definition) {
            $definition = (array)$definition;
            $storageCode = $this->storageCodeForMethod($country, (string)$variantCode, $definition);
            $row = Payments_model::query()->where('code', $storageCode)->first();
            if (!$row && $storageCode !== (string)$variantCode) {
                $storageCode = (string)$variantCode;
                $row = Payments_model::query()->where('code', $storageCode)->first();
            }

            $providerCode = trim((string)($row->provider_code ?? ''));
            if ($providerCode === '' && $row && method_exists($row, 'getConfigData')) {
                $providerCode = trim((string)($row->getConfigData()['provider_code'] ?? ''));
            }

            $methods[] = [
                'code' => (string)$variantCode,
                'storage_code' => $storageCode,
                'label' => (string)($definition['label'] ?? $variantCode),
                'canonical_method' => (string)($definition['canonical_method'] ?? ''),
                'provider_candidates' => array_values((array)($definition['provider_candidates'] ?? [])),
                'provider_code' => $providerCode !== '' ? $providerCode : null,
                'enabled' => (bool)($row->status ?? false),
                'is_default' => (bool)($row->is_default ?? false),
                'brands' => array_values((array)($definition['brands'] ?? [])),
                'guest_runtime_ready' => !in_array(PaymobOmanConfigSchema::PROVIDER_CODE, (array)($definition['provider_candidates'] ?? []), true)
                    || self::PAYMOB_GUEST_RUNTIME_READY,
            ];
        }

        $paymobRuntime = null;
        if ($country === CountryPlatformProfileRegistry::OMAN) {
            try {
                $paymobRuntime = (new PaymobOmanRuntimeService($paymobConnection->runtimeConfig()))->state();
                $paymobRuntime['guest_runtime_ready'] = self::PAYMOB_GUEST_RUNTIME_READY;
            } catch (\Throwable $error) {
                $paymobRuntime = [
                    'provider' => 'paymob',
                    'methods' => [],
                    'guest_runtime_ready' => self::PAYMOB_GUEST_RUNTIME_READY,
                    'error' => $error->getMessage(),
                ];
            }
        }

        return response()->json([
            'ok' => true,
            'profile_version' => $market['profile_version'] ?? null,
            'location_id' => $market['location_id'] ?? null,
            'location_name' => $market['location_name'] ?? null,
            'country_code' => $country,
            'country_name' => (string)($profile['country_name'] ?? $country),
            'timezone' => (string)($profile['timezone'] ?? ''),
            'currency' => (array)($profile['currency'] ?? []),
            'languages' => (array)($profile['languages'] ?? []),
            'provider_codes' => array_values(array_keys($providerDefinitions)),
            'providers' => $providers,
            'methods' => $methods,
            'paymob_runtime' => $paymobRuntime,
            'paymob_guest_runtime_ready' => self::PAYMOB_GUEST_RUNTIME_READY,
            'fiskaly_visible' => $country === CountryPlatformProfileRegistry::GERMANY,
        ]);
    }

    public function savePaymob(
        Request $request,
        LocationPlatformContext $context,
        PaymobOmanConfigSchema $schema
    ) {
        $market = $this->resolvedMarket($context);
        $this->assertOman($market);

        (new PaymobOmanTenantCatalogService())->ensureCurrentTenant(false);
        $row = Payments_model::query()->where('code', PaymobOmanConfigSchema::PROVIDER_CODE)->first();
        if (!$row) {
            return response()->json(['ok' => false, 'message' => 'Paymob provider row is missing.'], 409);
        }

        $incoming = (array)$request->input('config', []);
        $validator = Validator::make($incoming, $schema->validationRules());
        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $current = method_exists($row, 'getConfigData') ? (array)$row->getConfigData() : [];
        $stored = $schema->prepareForStorage($validator->validated(), $current);
        $requestedEnable = filter_var($request->input('enabled', false), FILTER_VALIDATE_BOOLEAN);

        if ($requestedEnable && !self::PAYMOB_GUEST_RUNTIME_READY) {
            return response()->json([
                'ok' => false,
                'message' => 'Paymob credentials can be saved and tested now, but guest payments remain locked until the PMD checkout/callback settlement runtime is completed and sandbox-verified.',
                'guest_runtime_ready' => false,
            ], 409);
        }

        $row->setConfigData($stored);
        // Configuration can be stored/tested now, but provider offering remains
        // disabled until the guarded runtime flag is deliberately released.
        $row->status = self::PAYMOB_GUEST_RUNTIME_READY && $requestedEnable ? 1 : 0;
        $row->is_default = 0;
        $row->save();

        Log::info('PMD_PAYMOB_OMAN_ADMIN_SAVED_R4', [
            'enabled' => (bool)$row->status,
            'mode' => $stored['transaction_mode'] ?? 'test',
            'country_code' => 'OM',
            'guest_runtime_ready' => self::PAYMOB_GUEST_RUNTIME_READY,
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'Paymob Oman configuration saved. You can test the API connection; guest offering remains locked until the settlement runtime passes sandbox QA.',
            'guest_runtime_ready' => self::PAYMOB_GUEST_RUNTIME_READY,
        ]);
    }

    public function testPaymob(
        Request $request,
        LocationPlatformContext $context,
        PaymobOmanConfigSchema $schema,
        PaymobOmanConnectionService $connection
    ) {
        $market = $this->resolvedMarket($context);
        $this->assertOman($market);

        (new PaymobOmanTenantCatalogService())->ensureCurrentTenant(false);
        $incoming = (array)$request->input('config', []);
        $validator = Validator::make($incoming, $schema->validationRules());
        if ($validator->fails()) {
            return response()->json(['ok' => false, 'message' => $validator->errors()->first()], 422);
        }

        // Unsaved plaintext overrides are used for this request only. Persisted
        // credentials remain encrypted and are not echoed in the response.
        $result = $connection->test($validator->validated(), true);
        $ok = (bool)($result['ok'] ?? false);

        return response()->json([
            'ok' => $ok,
            'message' => (string)($result['message'] ?? ($ok ? 'Paymob connection is working.' : 'Paymob connection failed.')),
            'connected' => (bool)($result['connected'] ?? $ok),
            'market' => 'Oman',
            'currency' => 'OMR',
            'guest_runtime_ready' => self::PAYMOB_GUEST_RUNTIME_READY,
            'state' => $result['state'] ?? null,
        ], $ok ? 200 : 422);
    }

    public function saveMethod(
        Request $request,
        string $code,
        LocationPlatformContext $context,
        PaymobOmanConnectionService $paymobConnection
    ) {
        $market = $this->resolvedMarket($context);
        $profile = $market['profile'];
        $country = (string)$market['country_code'];
        $methods = (array)($profile['payments']['methods'] ?? []);
        $code = strtolower(trim($code));

        if (!isset($methods[$code])) {
            return response()->json(['ok' => false, 'message' => 'Payment method does not belong to this location market.'], 404);
        }

        (new TenantRegionalPaymentCatalogService())->ensureForCountry($country);
        if ($country === CountryPlatformProfileRegistry::OMAN) {
            (new PaymobOmanTenantCatalogService())->ensureCurrentTenant(false);
        }

        $definition = (array)$methods[$code];
        $candidates = array_values((array)($definition['provider_candidates'] ?? []));
        $provider = strtolower(trim((string)$request->input('provider_code', '')));
        $enabled = filter_var($request->input('enabled', false), FILTER_VALIDATE_BOOLEAN);

        if (!$candidates) {
            $provider = '';
        } elseif ($provider !== '' && !in_array($provider, $candidates, true)) {
            return response()->json(['ok' => false, 'message' => 'Selected provider is not available for this market method.'], 422);
        }

        if ($enabled && $candidates && $provider === '') {
            return response()->json(['ok' => false, 'message' => 'Select a provider before offering this payment method.'], 422);
        }

        if ($enabled && $provider === PaymobOmanConfigSchema::PROVIDER_CODE && !self::PAYMOB_GUEST_RUNTIME_READY) {
            return response()->json([
                'ok' => false,
                'message' => 'Paymob guest payment methods remain locked until checkout/callback settlement is completed and sandbox-verified.',
                'guest_runtime_ready' => false,
            ], 409);
        }

        if ($enabled && $provider === PaymobOmanConfigSchema::PROVIDER_CODE) {
            $providerRow = Payments_model::query()->where('code', PaymobOmanConfigSchema::PROVIDER_CODE)->first();
            if (!$providerRow || !(bool)$providerRow->status) {
                return response()->json(['ok' => false, 'message' => 'Configure and enable Paymob first.'], 422);
            }

            $readiness = $paymobConnection->readiness();
            if (!($readiness['ready'] ?? false)) {
                return response()->json([
                    'ok' => false,
                    'message' => (string)($readiness['structural']['message'] ?? 'Paymob configuration is not ready.'),
                ], 422);
            }

            $runtime = (new PaymobOmanRuntimeService($paymobConnection->runtimeConfig()))->state();
            $methodState = (array)($runtime['methods'][$code] ?? []);
            if (!($methodState['integration_configured'] ?? false)) {
                return response()->json(['ok' => false, 'message' => 'The Paymob Integration ID for this Oman payment method is not configured.'], 422);
            }
        }

        $storageCode = $this->storageCodeForMethod($country, $code, $definition);
        $row = Payments_model::query()->where('code', $storageCode)->first();
        if (!$row && $storageCode !== $code) {
            $storageCode = $code;
            $row = Payments_model::query()->where('code', $storageCode)->first();
        }
        if (!$row) {
            return response()->json(['ok' => false, 'message' => 'Payment method storage row is missing.'], 409);
        }

        $connection = $row->getConnection();
        $table = $row->getTable();
        $columns = $connection->getSchemaBuilder()->getColumnListing($table);
        $update = [];
        if (in_array('status', $columns, true)) $update['status'] = $enabled ? 1 : 0;
        if (in_array('is_default', $columns, true) && !$enabled) $update['is_default'] = 0;
        if (in_array('provider_code', $columns, true)) $update['provider_code'] = $provider !== '' ? $provider : null;

        $jsonColumn = in_array('meta', $columns, true) ? 'meta' : (in_array('data', $columns, true) ? 'data' : null);
        if ($jsonColumn) {
            $raw = $row->getAttribute($jsonColumn);
            $meta = is_array($raw) ? $raw : (is_string($raw) ? (json_decode($raw, true) ?: []) : []);
            $meta['provider_code'] = $provider !== '' ? $provider : null;
            $meta['market_country'] = $country;
            $meta['market_variant'] = $code;
            $update[$jsonColumn] = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
        if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();

        if ($update) {
            $connection->table($table)->where('code', $storageCode)->update($update);
        }

        Log::info('PMD_MARKET_PAYMENT_METHOD_SAVED_R4', [
            'country_code' => $country,
            'variant_code' => $code,
            'storage_code' => $storageCode,
            'provider_code' => $provider !== '' ? $provider : null,
            'enabled' => $enabled,
        ]);

        return response()->json(['ok' => true, 'message' => 'Payment method updated for this location market.']);
    }

    private function resolvedMarket(LocationPlatformContext $context): array
    {
        $state = $context->state();
        if (!($state['resolved'] ?? false) || empty($state['profile']) || empty($state['country_code'])) {
            abort(response()->json([
                'ok' => false,
                'message' => 'The restaurant location market is not resolved. Save its Country in Superadmin first.',
            ], 409));
        }
        return $state;
    }

    private function assertOman(array $market): void
    {
        if (($market['country_code'] ?? null) !== CountryPlatformProfileRegistry::OMAN) {
            abort(response()->json(['ok' => false, 'message' => 'Paymob Oman settings are available only to Oman locations.'], 403));
        }
    }

    private function storageCodeForMethod(string $country, string $variantCode, array $definition): string
    {
        $canonical = strtolower(trim((string)($definition['canonical_method'] ?? '')));

        // Germany already has mature runtime integrations on canonical method
        // rows. Keep those rows as storage authority while the UI uses regional
        // labels. Oman online methods use their regional rows so Paymob cannot
        // leak into Germany/global provider assignments.
        if ($country === CountryPlatformProfileRegistry::GERMANY && $canonical !== '') {
            if (Payments_model::query()->where('code', $canonical)->exists()) return $canonical;
        }

        // Cash can reuse the mature providerless cash row in any market.
        if ($canonical === 'cash') {
            foreach (['cod', 'cash'] as $cashCode) {
                if (Payments_model::query()->where('code', $cashCode)->exists()) return $cashCode;
            }
        }

        return $variantCode;
    }

    private function publicFieldSchema(PaymobOmanConfigSchema $schema): array
    {
        $result = [];
        foreach ($schema->fields() as $name => $field) {
            $result[$name] = [
                'label' => $field['label'] ?? ucwords(str_replace('_', ' ', (string)$name)),
                'type' => $field['type'] ?? (!empty($field['secret']) ? 'password' : 'text'),
                'secret' => !empty($field['secret']),
                'readonly' => !empty($field['readonly']),
                'default' => $field['default'] ?? null,
                'options' => (array)($field['options'] ?? []),
                'help' => $field['help'] ?? null,
            ];
        }
        return $result;
    }
}
