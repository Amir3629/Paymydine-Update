<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Payments_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class Pmdfinance extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    protected const METHOD_CODES = ['card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod', 'cash'];
    protected const PROVIDER_CODES = ['stripe', 'paypal', 'worldline', 'sumup', 'square', 'vr_payment'];

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-finance-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-settings-inline-detail-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        $this->addJs('js/pmd-settings-inline-detail-v1.js');
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Payments & finance');
        Template::setHeading('Payments & finance');

        $payments = collect();
        try {
            $payments = Payments_model::query()->orderBy('priority')->get();
        } catch (\Throwable $error) {
            logger()->warning('PMD finance payment summary failed', ['message' => $error->getMessage()]);
        }

        $methods = $payments->filter(fn ($row) => in_array((string)$row->code, self::METHOD_CODES, true))->values();
        $providers = $payments->filter(fn ($row) => in_array((string)$row->code, self::PROVIDER_CODES, true))->values();
        $providerLabels = $providers->mapWithKeys(fn ($row) => [
            (string)$row->code => (string)($row->name ?: ucfirst(str_replace('_', ' ', (string)$row->code))),
        ])->all();
        $methodProviders = [];
        foreach ($methods as $method) {
            $methodProviders[(string)$method->code] = collect(Payments_model::supportedProvidersForMethod((string)$method->code))
                ->mapWithKeys(fn ($code) => [(string)$code => $providerLabels[(string)$code] ?? ucfirst(str_replace('_', ' ', (string)$code))])
                ->all();
        }

        $this->vars['pmdFinance'] = [
            'methods' => $methods,
            'providers' => $providers,
            'method_providers' => $methodProviders,
            'provider_fields' => $this->inlineProviderFields(),
            'provider_secret_fields' => $this->inlineProviderSecretFields(),
            'settings' => $this->financeSettings(),
            'fiskaly' => $this->fiskalyPayload(),
        ];

        return $this->makeView('pmdfinance/index');
    }

    public function onSaveFinance()
    {
        $input = (array)post('finance', []);

        $validator = Validator::make($input, [
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_menu_price' => ['nullable', 'integer', 'in:0,1'],
            'invoice_customer_template' => ['nullable', 'in:classic,modern,minimal'],
            'invoice_customer_footer_text' => ['nullable', 'string', 'max:500'],
            'invoice_prefix_preset' => ['nullable', 'string', 'max:40'],
            'invoice_prefix' => ['nullable', 'string', 'max:80'],
            'invoice_paper_width' => ['nullable', 'in:58mm,80mm,112mm,a4'],
            'invoice_font_size_preset' => ['nullable', 'in:small,normal'],
            'invoice_logo' => ['nullable', 'string', 'max:500'],
            'invoice_print_hint' => ['nullable', 'string', 'max:1500'],
            'fiskaly_environment' => ['nullable', 'in:test,live'],
            'fiskaly_api_key' => ['nullable', 'string', 'max:4096'],
            'fiskaly_api_secret' => ['nullable', 'string', 'max:4096'],
            'fiskaly_organization_id' => ['nullable', 'string', 'max:255'],
            'fiskaly_tss_id' => ['nullable', 'string', 'max:255'],
            'fiskaly_client_id' => ['nullable', 'string', 'max:255'],
            'fiskaly_cash_register_id' => ['nullable', 'string', 'max:255'],
            'fiskaly_admin_pin' => ['nullable', 'string', 'max:255'],
            'fiskaly_time_admin_pin' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $clean = $validator->validated();

        $values = [
            'tax_mode' => !empty($input['tax_mode']) ? 1 : 0,
            'tax_percentage' => (float)($clean['tax_percentage'] ?? 0),
            'tax_menu_price' => (int)($clean['tax_menu_price'] ?? 0),
            'tax_delivery_charge' => !empty($input['tax_delivery_charge']) ? 1 : 0,
            'invoice_logo' => trim((string)($clean['invoice_logo'] ?? '')),
            'invoice_customer_template' => (string)($clean['invoice_customer_template'] ?? 'classic'),
            'invoice_customer_footer_text' => trim((string)($clean['invoice_customer_footer_text'] ?? '')),
            'invoice_prefix_preset' => (string)($clean['invoice_prefix_preset'] ?? 'custom'),
            'invoice_prefix' => trim((string)($clean['invoice_prefix'] ?? '')),
            'invoice_receipt_mode' => !empty($input['invoice_receipt_mode']) ? 1 : 0,
            'invoice_paper_width' => (string)($clean['invoice_paper_width'] ?? '80mm'),
            'invoice_compact_mode' => !empty($input['invoice_compact_mode']) ? 1 : 0,
            'invoice_font_size_preset' => (string)($clean['invoice_font_size_preset'] ?? 'normal'),
            'invoice_show_logo' => !empty($input['invoice_show_logo']) ? 1 : 0,
            'invoice_show_qr' => !empty($input['invoice_show_qr']) ? 1 : 0,
            'invoice_show_fiskaly' => !empty($input['invoice_show_fiskaly']) ? 1 : 0,
            'invoice_auto_print_dialog' => !empty($input['invoice_auto_print_dialog']) ? 1 : 0,
            'invoice_auto_print_after_paid' => !empty($input['invoice_auto_print_after_paid']) ? 1 : 0,
            'invoice_print_hint' => trim((string)($clean['invoice_print_hint'] ?? '')),
        ];

        DB::transaction(function () use ($values, $input, $clean) {
            // PMD_FINANCE_SETTINGS_TENANT_AUTHORITY_R37
            // Keep the framework settings manager populated for compatibility,
            // but make the current tenant settings table the durable authority.
            // The owner page and the public VAT API must read the same rows.
            setting()->set($values);
            setting()->save();
            $this->persistFinanceSettingsDirect($values);
            $this->saveFiskaly($input, $clean);
        });

        flash()->success('Payments & finance settings saved.');

        return ['#pmd-owner-save-status' => '<span>Saved</span>'];
    }

    /**
     * Presentation-only schema for the Finance in-page modal.
     * Payments.php remains the save/validation/provider authority.
     */
    protected function inlineProviderFields(): array
    {
        $mode = [
            'transaction_mode' => ['label' => 'Connection mode', 'type' => 'select', 'default' => 'test', 'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production'], 'help' => 'Use test credentials first, then switch to live after verification.'],
        ];

        return [
            'stripe' => array_merge($mode, [
                'test_publishable_key' => ['label' => 'Test Publishable Key'],
                'live_publishable_key' => ['label' => 'Live Public Key'],
                'test_secret_key' => ['label' => 'Test Secret Key', 'secret' => true],
                'live_secret_key' => ['label' => 'Live Secret Key', 'secret' => true],
                'currency' => ['label' => 'Currency', 'default' => 'EUR'],
            ]),
            'paypal' => array_merge($mode, [
                'test_client_id' => ['label' => 'Sandbox Client ID'],
                'test_client_secret' => ['label' => 'Sandbox Client Secret', 'secret' => true],
                'live_client_id' => ['label' => 'Live Client ID'],
                'live_client_secret' => ['label' => 'Live Client Secret', 'secret' => true],
                'brand_name' => ['label' => 'Checkout Brand Name'],
                'currency' => ['label' => 'Currency', 'default' => 'EUR'],
            ]),
            'square' => array_merge($mode, [
                'test_access_token' => ['label' => 'Sandbox Access Token', 'secret' => true],
                'test_location_id' => ['label' => 'Sandbox Location ID'],
                'live_access_token' => ['label' => 'Live Access Token', 'secret' => true],
                'live_location_id' => ['label' => 'Live Location ID'],
                'currency' => ['label' => 'Currency', 'default' => 'EUR'],
            ]),
            'sumup' => [
                'auth_mode' => ['label' => 'Auth Mode', 'type' => 'select', 'default' => 'access_token', 'options' => ['access_token' => 'Access Token (current)']],
                'access_token' => ['label' => 'Access Token', 'secret' => true, 'help' => 'Leave blank to keep the stored token.'],
                'url' => ['label' => 'API Base URL', 'default' => 'https://api.sumup.com'],
                'id_application' => ['label' => 'Merchant Code', 'help' => 'Optional; PayMyDine can resolve it from SumUp when the token is valid.'],
                'connection_status' => ['label' => 'Connection status', 'readonly' => true, 'default' => 'Unknown'],
                'merchant_email' => ['label' => 'Merchant Email', 'readonly' => true],
                'last_tested_at' => ['label' => 'Last Test Time', 'readonly' => true],
            ],
            'worldline' => [
                'api_endpoint' => ['label' => 'API Endpoint', 'default' => 'https://api.preprod.connect.worldline-solutions.com'],
                'merchant_id' => ['label' => 'Merchant ID'],
                'api_key_id' => ['label' => 'API Key ID'],
                'secret_api_key' => ['label' => 'Secret API Key', 'secret' => true],
                'webhook_secret' => ['label' => 'Webhook Secret', 'secret' => true],
                'terminal_id' => ['label' => 'Terminal Device ID'],
                'terminal_environment' => ['label' => 'Terminal Environment', 'type' => 'select', 'default' => 'test', 'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production']],
            ],
            'vr_payment' => [
                'mode' => ['label' => 'Mode', 'type' => 'select', 'default' => 'test', 'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production']],
                'api_base_url' => ['label' => 'API Base URL'],
                'space_id' => ['label' => 'Space ID'],
                'user_id' => ['label' => 'User ID'],
                'auth_key' => ['label' => 'Auth Key', 'secret' => true],
                'webhook_signing_key' => ['label' => 'Webhook Signing Key', 'secret' => true],
                'preferred_integration_mode' => ['label' => 'Preferred Integration', 'type' => 'select', 'default' => 'payment_page', 'options' => ['payment_page' => 'Hosted Payment Page']],
                'api_endpoint' => ['label' => 'Terminal API Endpoint'],
                'merchant_id' => ['label' => 'Terminal Merchant ID'],
                'terminal_id' => ['label' => 'Terminal Device ID'],
            ],
        ];
    }

    protected function inlineProviderSecretFields(): array
    {
        return [
            'stripe' => ['test_secret_key', 'live_secret_key'],
            'paypal' => ['test_client_secret', 'live_client_secret'],
            'square' => ['test_access_token', 'live_access_token'],
            'sumup' => ['access_token'],
            'worldline' => ['secret_api_key', 'webhook_secret'],
            'vr_payment' => ['auth_key', 'webhook_signing_key'],
        ];
    }

    protected function financeSettingsConnection(): string
    {
        return app()->bound('tenant') ? 'tenant' : DB::getDefaultConnection();
    }

    /**
     * PMD_FINANCE_SETTINGS_TENANT_AUTHORITY_R37
     * Persist the owner-facing finance values into the same tenant settings
     * rows consumed by /api/v1/vat-settings. This avoids the stale/global
     * settings-manager path that can look saved until the page is refreshed.
     */
    protected function persistFinanceSettingsDirect(array $values): void
    {
        $connection = $this->financeSettingsConnection();

        if (!Schema::connection($connection)->hasTable('settings')) {
            throw new \RuntimeException('Tenant settings table not found.');
        }

        $columns = Schema::connection($connection)->getColumnListing('settings');
        $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
        $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);

        if (!$keyColumn || !$valueColumn) {
            throw new \RuntimeException('Tenant settings table columns are not recognized.');
        }

        $table = DB::connection($connection)->table('settings');

        foreach ($values as $key => $value) {
            $payload = [$valueColumn => (string)$value];
            if (in_array('serialized', $columns, true)) $payload['serialized'] = 0;
            if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();

            $exists = $table->where($keyColumn, $key)->exists();
            if ($exists) {
                $table->where($keyColumn, $key)->update($payload);
                continue;
            }

            $insert = array_merge([$keyColumn => $key], $payload);
            if (in_array('created_at', $columns, true)) $insert['created_at'] = now();
            $table->insert($insert);
        }

        $taxKeys = ['tax_mode', 'tax_percentage', 'tax_menu_price', 'tax_delivery_charge'];
        $stored = $table->whereIn($keyColumn, $taxKeys)->get([$keyColumn, $valueColumn]);
        $storedMap = [];
        foreach ($stored as $row) {
            $storedMap[(string)$row->{$keyColumn}] = (string)$row->{$valueColumn};
        }

        foreach ($taxKeys as $key) {
            if (!array_key_exists($key, $values) || !array_key_exists($key, $storedMap)) {
                throw new \RuntimeException('Tax settings persistence verification failed for '.$key.'.');
            }
            if ((string)$storedMap[$key] !== (string)$values[$key]) {
                throw new \RuntimeException('Tax settings persistence verification mismatch for '.$key.'.');
            }
        }
    }

    protected function financeSettings(): array
    {
        $keys = [
            'tax_mode' => 0,
            'tax_percentage' => 0,
            'tax_menu_price' => 0,
            'tax_delivery_charge' => 0,
            'invoice_logo' => '',
            'invoice_customer_template' => 'classic',
            'invoice_customer_footer_text' => 'Thank you',
            'invoice_prefix_preset' => 'custom',
            'invoice_prefix' => '',
            'invoice_receipt_mode' => 1,
            'invoice_paper_width' => '80mm',
            'invoice_compact_mode' => 1,
            'invoice_font_size_preset' => 'normal',
            'invoice_show_logo' => 1,
            'invoice_show_qr' => 1,
            'invoice_show_fiskaly' => 1,
            'invoice_auto_print_dialog' => 0,
            'invoice_auto_print_after_paid' => 0,
            'invoice_print_hint' => '',
        ];

        // Read from the current tenant DB first, exactly like the public VAT API.
        // setting() remains only a compatibility fallback for missing rows.
        $direct = [];
        try {
            $connection = $this->financeSettingsConnection();
            if (Schema::connection($connection)->hasTable('settings')) {
                $columns = Schema::connection($connection)->getColumnListing('settings');
                $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
                $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);

                if ($keyColumn && $valueColumn) {
                    $rows = DB::connection($connection)
                        ->table('settings')
                        ->whereIn($keyColumn, array_keys($keys))
                        ->get([$keyColumn, $valueColumn]);

                    foreach ($rows as $row) {
                        $direct[(string)$row->{$keyColumn}] = $row->{$valueColumn};
                    }
                }
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD finance direct settings load failed', ['message' => $error->getMessage()]);
        }

        foreach ($keys as $key => $fallback) {
            if (array_key_exists($key, $direct)) {
                $keys[$key] = $direct[$key];
                continue;
            }

            try {
                $keys[$key] = setting($key, $fallback);
            } catch (\Throwable $error) {
                $keys[$key] = $fallback;
            }
        }

        return $keys;
    }

    protected function fiskalyPayload(): array
    {
        $defaults = [
            'fiskaly_is_enabled' => 0,
            'fiskaly_environment' => 'test',
            'fiskaly_api_key' => '',
            'fiskaly_api_secret' => '',
            'fiskaly_organization_id' => '',
            'fiskaly_tss_id' => '',
            'fiskaly_client_id' => '',
            'fiskaly_cash_register_id' => '',
            'fiskaly_admin_pin' => '',
            'fiskaly_time_admin_pin' => '',
        ];

        try {
            $connection = app()->bound('tenant') ? 'tenant' : DB::getDefaultConnection();
            if (!Schema::connection($connection)->hasTable('fiskaly_configs')) {
                return $defaults;
            }

            $row = DB::connection($connection)->table('fiskaly_configs')->where('location_id', 1)->first();
            if (!$row) return $defaults;

            $meta = json_decode((string)($row->meta ?? '{}'), true) ?: [];

            return [
                'fiskaly_is_enabled' => (int)($row->is_enabled ?? 0),
                'fiskaly_environment' => (string)($row->environment ?? 'test'),
                'fiskaly_api_key' => (string)($row->api_key ?? ''),
                'fiskaly_api_secret' => '',
                'fiskaly_organization_id' => (string)($row->organization_id ?? ''),
                'fiskaly_tss_id' => (string)($row->tss_id ?? ''),
                'fiskaly_client_id' => (string)($row->client_id ?? ''),
                'fiskaly_cash_register_id' => (string)($row->cash_register_id ?? ''),
                'fiskaly_admin_pin' => '',
                'fiskaly_time_admin_pin' => '',
                'has_api_secret' => !empty($row->api_secret),
                'has_admin_pin' => !empty($meta['admin_pin']),
                'has_time_admin_pin' => !empty($meta['time_admin_pin']),
            ];
        } catch (\Throwable $error) {
            logger()->warning('PMD finance Fiskaly load failed', ['message' => $error->getMessage()]);
            return $defaults;
        }
    }

    protected function saveFiskaly(array $input, array $clean): void
    {
        try {
            $connection = app()->bound('tenant') ? 'tenant' : DB::getDefaultConnection();
            if (!Schema::connection($connection)->hasTable('fiskaly_configs')) return;

            $table = DB::connection($connection)->table('fiskaly_configs');
            $existing = $table->where('location_id', 1)->first();
            $meta = json_decode((string)($existing->meta ?? '{}'), true) ?: [];

            if (trim((string)($clean['fiskaly_admin_pin'] ?? '')) !== '') {
                $meta['admin_pin'] = trim((string)$clean['fiskaly_admin_pin']);
            }
            if (trim((string)($clean['fiskaly_time_admin_pin'] ?? '')) !== '') {
                $meta['time_admin_pin'] = trim((string)$clean['fiskaly_time_admin_pin']);
            }

            $apiSecret = trim((string)($clean['fiskaly_api_secret'] ?? ''));
            if ($apiSecret === '') $apiSecret = (string)($existing->api_secret ?? '');

            $table->updateOrInsert(
                ['location_id' => 1],
                [
                    'provider' => 'fiskaly',
                    'environment' => (string)($clean['fiskaly_environment'] ?? 'test'),
                    'api_key' => trim((string)($clean['fiskaly_api_key'] ?? '')),
                    'api_secret' => $apiSecret,
                    'organization_id' => trim((string)($clean['fiskaly_organization_id'] ?? '')),
                    'tss_id' => trim((string)($clean['fiskaly_tss_id'] ?? '')),
                    'client_id' => trim((string)($clean['fiskaly_client_id'] ?? '')),
                    'cash_register_id' => trim((string)($clean['fiskaly_cash_register_id'] ?? '')),
                    'is_enabled' => !empty($input['fiskaly_is_enabled']) ? 1 : 0,
                    'meta' => json_encode($meta),
                    'updated_at' => now(),
                    'created_at' => $existing->created_at ?? now(),
                ]
            );
        } catch (\Throwable $error) {
            logger()->error('PMD finance Fiskaly save failed', ['message' => $error->getMessage()]);
            throw $error;
        }
    }
}
