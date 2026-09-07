<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use App\Services\Turkey\TurkeyIntegrationConfigurationService;
use App\Services\Turkey\TurkeyPaymentMethodService;
use App\Services\Turkey\TurkeyReadinessService;
use App\Services\Turkey\TurkeyTenantContext;
use App\Services\Turkey\TurkeyTenantProvisioningService;
use App\Services\Turkey\YemeksepetiPartnerClient;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Owner/developer-facing Türkiye integration settings.
 *
 * This controller is intentionally country-gated. It never activates a
 * regulated integration just because a form was saved or a sandbox test passed.
 */
final class Pmdturkey extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-turkey-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-turkey-settings-r1.css');
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Türkiye setup');
        Template::setHeading('Türkiye setup');

        $locationId = $this->currentLocationId();
        app(TurkeyTenantContext::class)->requireTurkey($locationId);
        app(TurkeyTenantProvisioningService::class)->ensure($locationId);

        $this->vars['pmdTurkey'] = $this->payload($locationId);
        return $this->makeView('pmdturkey/index');
    }

    public function onProvisionTurkey()
    {
        $locationId = $this->currentLocationId();
        $result = app(TurkeyTenantProvisioningService::class)->ensure($locationId);
        flash()->success('Türkiye tenant schema is ready.');
        return ['#pmd-tr-action-status' => '<span class="pmd-tr-status-ok">Schema '.$result['schema_version'].' ready</span>'];
    }

    public function onSaveFiscal()
    {
        $locationId = $this->currentLocationId();
        $input = (array)post('turkey', []);
        $fiscal = (array)($input['fiscal'] ?? []);
        $edoc = (array)($input['edocument'] ?? []);

        $validator = Validator::make(['fiscal' => $fiscal, 'edocument' => $edoc], [
            'fiscal.manufacturer' => ['nullable', 'string', 'max:120'],
            'fiscal.device_model' => ['nullable', 'string', 'max:120'],
            'fiscal.device_serial' => ['nullable', 'string', 'max:190'],
            'fiscal.integration_topology' => ['nullable', 'in:eft_pos_integrated,computer_connected'],
            'fiscal.security_agreement_reference' => ['nullable', 'string', 'max:500'],
            'fiscal.certification_status' => ['nullable', 'string', 'max:100'],
            'edocument.provider' => ['nullable', 'string', 'max:120'],
            'edocument.merchant_identifier' => ['nullable', 'string', 'max:190'],
            'edocument.environment' => ['nullable', 'in:sandbox,production'],
            'edocument.credential_reference' => ['nullable', 'string', 'max:500'],
            'edocument.activation_status' => ['nullable', 'string', 'max:100'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);

        $config = app(TurkeyIntegrationConfigurationService::class);
        $config->configure('yn_okc', $this->trimArray($fiscal), $locationId);
        $config->configure('e_document', $this->trimArray($edoc), $locationId);

        flash()->success('Türkiye fiscal settings saved. Saving does not certify or activate a real YN ÖKC.');
        return ['#pmd-tr-action-status' => '<span class="pmd-tr-status-ok">Fiscal settings saved</span>'];
    }

    public function onSavePayments()
    {
        $locationId = $this->currentLocationId();
        $input = (array)post('turkey', []);

        foreach (['acquirer', 'tr_qr_fast', 'fast_request'] as $code) {
            $values = (array)($input[$code] ?? []);
            $validator = Validator::make($values, [
                'provider' => ['nullable', 'string', 'max:120'],
                'merchant_id' => ['nullable', 'string', 'max:190'],
                'environment' => ['nullable', 'in:sandbox,production'],
                'credential_reference' => ['nullable', 'string', 'max:500'],
                'contract_status' => ['nullable', 'string', 'max:100'],
                'activation_status' => ['nullable', 'string', 'max:100'],
            ]);
            if ($validator->fails()) throw new ValidationException($validator);
            app(TurkeyIntegrationConfigurationService::class)->configure($code, $this->trimArray($values), $locationId);
        }

        flash()->success('Türkiye payment connection settings saved. They remain disabled until the real provider is approved/activated.');
        return ['#pmd-tr-action-status' => '<span class="pmd-tr-status-ok">Payment settings saved</span>'];
    }

    public function onSaveDelivery()
    {
        $locationId = $this->currentLocationId();
        $values = (array)((array)post('turkey', [])['yemeksepeti'] ?? []);
        $validator = Validator::make($values, [
            'environment' => ['nullable', 'in:sandbox,production'],
            'client_id' => ['nullable', 'string', 'max:190'],
            'client_secret_reference' => ['nullable', 'string', 'max:500'],
            'merchant_or_partner_id' => ['nullable', 'string', 'max:190'],
            'chain_id' => ['nullable', 'string', 'max:190'],
            'vendor_id' => ['nullable', 'string', 'max:190'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);

        app(TurkeyIntegrationConfigurationService::class)->configure('yemeksepeti', $this->trimArray($values), $locationId);
        flash()->success('Yemeksepeti settings saved. Use Test Sandbox Connection after the referenced secret exists on the server.');
        return ['#pmd-tr-action-status' => '<span class="pmd-tr-status-ok">Yemeksepeti settings saved</span>'];
    }

    public function onTestYemeksepeti()
    {
        $locationId = $this->currentLocationId();
        $service = app(TurkeyIntegrationConfigurationService::class);
        $config = $service->configuration('yemeksepeti', $locationId);

        try {
            $result = app(YemeksepetiPartnerClient::class)->testConnection($config);
            $service->recordTestResult('yemeksepeti', true, null, $locationId);
            flash()->success('Yemeksepeti '.$result['environment'].' OAuth connection succeeded. This is not production activation.');
            return ['#pmd-tr-yemek-test-status' => '<span class="pmd-tr-status-ok">Connection OK · '.$result['environment'].'</span>'];
        } catch (\Throwable $error) {
            $service->recordTestResult('yemeksepeti', false, $error->getMessage(), $locationId);
            flash()->error('Yemeksepeti connection failed: '.$error->getMessage());
            return ['#pmd-tr-yemek-test-status' => '<span class="pmd-tr-status-bad">Connection failed</span>'];
        }
    }

    public function onSaveCommunications()
    {
        $locationId = $this->currentLocationId();
        $input = (array)post('turkey', []);

        $schemas = [
            'iys' => [
                'integrator' => ['nullable', 'string', 'max:120'],
                'brand_or_legal_entity' => ['nullable', 'string', 'max:190'],
                'environment' => ['nullable', 'in:sandbox,production'],
                'credential_reference' => ['nullable', 'string', 'max:500'],
                'contract_status' => ['nullable', 'string', 'max:100'],
            ],
            'sms' => [
                'provider' => ['nullable', 'string', 'max:120'],
                'sender_id' => ['nullable', 'string', 'max:100'],
                'credential_reference' => ['nullable', 'string', 'max:500'],
            ],
            'whatsapp' => [
                'provider' => ['nullable', 'string', 'max:120'],
                'business_account_reference' => ['nullable', 'string', 'max:190'],
                'credential_reference' => ['nullable', 'string', 'max:500'],
            ],
        ];

        foreach ($schemas as $code => $rules) {
            $values = (array)($input[$code] ?? []);
            $validator = Validator::make($values, $rules);
            if ($validator->fails()) throw new ValidationException($validator);
            app(TurkeyIntegrationConfigurationService::class)->configure($code, $this->trimArray($values), $locationId);
        }

        flash()->success('Türkiye communication settings saved. Marketing consent/IYS remains separate from transactional OTP/service messages.');
        return ['#pmd-tr-action-status' => '<span class="pmd-tr-status-ok">Communication settings saved</span>'];
    }

    private function payload(int $locationId): array
    {
        $config = app(TurkeyIntegrationConfigurationService::class);
        $codes = [
            'yn_okc', 'e_document', 'acquirer', 'tr_qr_fast', 'fast_request',
            'yemeksepeti', 'iys', 'sms', 'whatsapp',
        ];
        $integrations = [];
        foreach ($codes as $code) {
            $integrations[$code] = [
                'state' => $config->state($code, $locationId),
                'config' => $config->configuration($code, $locationId),
            ];
        }

        return [
            'location_id' => $locationId,
            'readiness' => app(TurkeyReadinessService::class)->report($locationId),
            'payment_methods' => app(TurkeyPaymentMethodService::class)->methods($locationId),
            'integrations' => $integrations,
            'secret_reference_examples' => [
                'env:PMD_TR_YEMEKSEPETI_CLIENT_SECRET',
                'config:services.turkey.yemeksepeti.client_secret',
            ],
        ];
    }

    private function currentLocationId(): int
    {
        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) return (int)$location->location_id;
        } catch (\Throwable) {
        }

        try {
            $id = (int)AdminLocation::getSession('id');
            if ($id > 0) return $id;
        } catch (\Throwable) {
        }

        return 1;
    }

    private function trimArray(array $values): array
    {
        foreach ($values as $key => $value) {
            if (is_string($value)) $values[$key] = trim($value);
        }
        return $values;
    }
}
