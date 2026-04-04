<?php

namespace Admin\Controllers;
use Illuminate\Validation\Rule;

use Admin\Classes\PaymentGateways;
use Admin\Facades\AdminMenu;
use Admin\Models\Payments_model;
use Exception;
use Igniter\Flame\Database\Model;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use System\Helpers\ValidationHelper;

class Payments extends \Admin\Classes\AdminController
{
    protected const METHOD_CODES = ['card', 'apple_pay', 'google_pay', 'paypal', 'cod'];
    protected const PROVIDER_CODES = ['stripe', 'paypal', 'worldline', 'sumup', 'square'];

    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Payments_model',
            'title' => 'lang:admin::lang.payments.text_title',
            'emptyMessage' => 'lang:admin::lang.payments.text_empty',
            'defaultSort' => ['updated_at', 'DESC'],
            'configFile' => 'payments_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.payments.text_form_name',
        'model' => 'Admin\Models\Payments_model',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'payments/edit/{code}',
            'redirectClose' => 'payments',
            'redirectNew' => 'payments/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'payments/edit/{code}',
            'redirectClose' => 'payments',
            'redirectNew' => 'payments/create',
        ],
        'delete' => [
            'redirect' => 'payments',
        ],
        'configFile' => 'payments_model',
    ];

    protected $requiredPermissions = 'Admin.Payments';

    protected $gateway;

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('payments', 'sales');
    }

    public function index()
    {
        $requestedMode = (string)request()->get('mode', '');
        $sessionMode = (string)session('payments.form_mode', 'methods');
        $mode = in_array($requestedMode, ['methods', 'providers'], true) ? $requestedMode : $sessionMode;
        if (!in_array($mode, ['methods', 'providers'], true)) {
            $mode = 'methods';
        }

        session(['payments.form_mode' => $mode]);

        if ($requestedMode === '') {
            return \Redirect::to(admin_url('payments?mode='.$mode));
        }

        $this->syncMethodRecords();
        $this->syncProviderRecords();

        $this->asExtension('ListController')->index();
    }

    public function providers()
    {
        $this->syncProviderRecords();
        session(['payments.form_mode' => 'providers']);
        return \Redirect::to(admin_url('payments?mode=providers'));
    }

    /**
     * Finds a Model record by its primary identifier, used by edit actions. This logic
     * can be changed by overriding it in the controller.
     *
     * @param string $paymentCode
     *
     * @return Model
     * @throws \Exception
     */
    public function formFindModelObject($paymentCode = null)
    {
        if (!strlen($paymentCode)) {
            throw new Exception(lang('admin::lang.payments.alert_setting_missing_id'));
        }

        $model = $this->formCreateModelObject();

        // Prepare query and find model record
        $query = $model->newQuery();
        $this->fireEvent('admin.controller.extendFormQuery', [$query]);
        $this->formExtendQuery($query);
        $result = $query->whereCode($paymentCode)->first();

        if (!$result)
            throw new Exception(sprintf(lang('admin::lang.form.not_found'), $paymentCode));

        $result = $this->formExtendModel($result) ?: $result;

        return $result;
    }

    protected function getGateway($code)
    {
        if ($this->gateway !== null) {
            return $this->gateway;
        }

        if (!$gateway = PaymentGateways::instance()->findGateway($code)) {
            throw new Exception(sprintf(lang('admin::lang.payments.alert_code_not_found'), $code));
        }

        return $this->gateway = $gateway;
    }

    public function formExtendModel($model)
    {
        // Always apply gateway class to ensure methods are available
        $model->applyGatewayClass();

        return $model;
    }

    public function formExtendFields($form)
    {
        $model = $form->model;
        $isMethodRecord = in_array((string)$model->code, self::METHOD_CODES, true) && !$this->isProvidersMode();
        $isProviderRecord = in_array((string)$model->code, self::PROVIDER_CODES, true)
            && ($this->isProvidersMode() || !in_array((string)$model->code, self::METHOD_CODES, true));

        if ($isMethodRecord && (string)$model->code !== 'cod') {
            $form->addFields([
                'provider_code' => [
                    'label' => 'Provider',
                    'type' => 'select',
                    'span' => 'left',
                    'options' => $this->getCompatibleProviders($model->code),
                    'placeholder' => 'Select provider',
                    'comment' => 'Only providers compatible with this method are shown.',
                    'default' => $this->extractProviderCode($model),
                ],
            ]);
        }

        if ($isProviderRecord) {
            if (method_exists($form, 'removeField')) {
                $form->removeField('is_default');
                $form->removeField('priority');
                $form->removeField('description');
                $form->removeField('code');
            }
            if ($nameField = $form->getField('name')) {
                $nameField->readOnly = true;
                $nameField->disabled = false;
                $nameField->comment = 'Provider name is fixed and managed by system defaults.';
            }

            $providerFields = $this->getProviderSpecificFields((string)$model->code);
            if (!empty($providerFields)) {
                $form->addTabFields($providerFields);
            }
            $this->formConfig['form']['toolbar']['buttons']['test_api_connection'] = [
                'label' => 'Test API Connection',
                'class' => 'btn btn-outline-secondary',
                'data-request' => 'onTestProviderConnection',
                'data-request-form' => '#edit-form',
            ];
        } elseif (!$isMethodRecord && $model->exists && $model->class_name && class_exists($model->class_name)) {
            // Fallback for non-provider records that still rely on gateway-defined fields.
            $gateway = new $model->class_name();
            if (method_exists($gateway, 'getConfigFields')) {
                $configFields = $gateway->getConfigFields();
                if (is_array($configFields) && $configFields) {
                    $form->addTabFields($configFields);
                }
            }
        }

        if (!$isProviderRecord && isset($this->formConfig['form']['toolbar']['buttons']['test_api_connection'])) {
            unset($this->formConfig['form']['toolbar']['buttons']['test_api_connection']);
        }

        // code is editable on edit
        if ($form->context !== 'create') {
            if ($field = $form->getField('code')) {
                $field->disabled = false;
            }
        }
    }

    public function formBeforeCreate($model)
    {
        if (!strlen($code = post('Payment.payment')))
            throw new ApplicationException(lang('admin::lang.payments.alert_invalid_code'));

        $paymentGateway = PaymentGateways::instance()->findGateway($code);

        $model->class_name = $paymentGateway['class'];
    }

    public function formValidate($model, $form)
    {
        $isProviderRecord = in_array((string)$model->code, self::PROVIDER_CODES, true)
            && ($this->isProvidersMode() || !in_array((string)$model->code, self::METHOD_CODES, true));

        $rules = [
            'payment'     => ['sometimes', 'required', 'alpha_dash'],
            'name'        => ['required', 'min:2', 'max:128'],
            'code' => [
                'sometimes',
                'required',
                'alpha_dash',
                Rule::unique('payments', 'code')->ignore(optional($model)->payment_id, 'payment_id'),
            ],
            'priority'    => $isProviderRecord ? ['sometimes', 'nullable', 'integer'] : ['required', 'integer'],
            'description' => ['max:255'],
            'is_default'  => $isProviderRecord ? ['sometimes', 'nullable', 'integer'] : ['required', 'integer'],
            'status'      => ['required', 'integer'],
        ];

        $messages = [];
        $attributes = [
            'payment'     => lang('admin::lang.payments.label_payments'),
            'name'        => lang('admin::lang.label_name'),
            'code'        => lang('admin::lang.payments.label_code'),
            'priority'    => lang('admin::lang.payments.label_priority'),
            'description' => lang('admin::lang.label_description'),
            'is_default'  => lang('admin::lang.payments.label_default'),
            'status'      => lang('lang:admin::lang.label_status'),
        ];

        // Only merge gateway-provided validation if the methods exist
        if ($form->model->exists && method_exists($form->model, 'getConfigRules')) {
            $parsedRules = ValidationHelper::prepareRules($form->model->getConfigRules());

            if ($mergeRules = Arr::get($parsedRules, 'rules', $parsedRules)) {
                $rules = array_merge($rules, $mergeRules);
            }

            if (method_exists($form->model, 'getConfigValidationMessages')) {
                if ($mergeMessages = $form->model->getConfigValidationMessages()) {
                    $messages = array_merge($messages, $mergeMessages);
                }
            }

            if (method_exists($form->model, 'getConfigValidationAttributes')) {
                if ($mergeAttributes = Arr::get($parsedRules, 'attributes', $form->model->getConfigValidationAttributes())) {
                    $attributes = array_merge($attributes, $mergeAttributes);
                }
            }
        }

        return $this->validatePasses($form->getSaveData(), $rules, $messages, $attributes);
    }

    public function create()
    {
        // Disallow creation via URL – bounce back to list
        return \Redirect::to(admin_url('payments'));
    }

    /**
     * Hard-block deletion of payment methods from admin.
     * This overrides the FormController's edit_onDelete handler.
     */
    public function edit_onDelete($context = null)
    {
        abort(403, 'Deleting payment methods is disabled.');
    }

    /**
     * Force-disable list checkboxes and bulk actions at runtime.
     */
    public function listExtendColumns($widget)
    {
        if (isset($widget->showCheckboxes)) { $widget->showCheckboxes = false; }
        if (isset($widget->bulkActions))   { $widget->bulkActions   = [];    }
    }

    public function formBeforeSave($model)
    {
        if (in_array((string)$model->code, self::METHOD_CODES, true) && !$this->isProvidersMode()) {
            $providerCode = post('provider_code', post('Payment.provider_code'));
            $providerCode = strlen((string)$providerCode) ? (string)$providerCode : null;
            $this->validateProviderCompatibility((string)$model->code, $providerCode);

            $data = is_array($model->data) ? $model->data : [];
            $data['provider_code'] = $providerCode;
            $model->data = $data;
        }

        $isProviderRecord = in_array((string)$model->code, self::PROVIDER_CODES, true)
            && ($this->isProvidersMode() || !in_array((string)$model->code, self::METHOD_CODES, true));
        if ($isProviderRecord) {
            if (!strlen((string)$model->name)) {
                $model->name = (string)($model->getOriginal('name') ?: $model->name);
            }
            $postedProviderData = $this->extractPostedProviderPayload((string)$model->code);
            $normalizedProviderData = $this->filterProviderDataFromPost((string)$model->code, $postedProviderData, is_array($model->data) ? $model->data : []);
            $model->data = $normalizedProviderData;
            $this->applyNormalizedProviderDataToPost((array)post('Payment', []), $normalizedProviderData);
            $model->is_default = 0;
            if (!isset($model->priority) || $model->priority === null || $model->priority === '') {
                $model->priority = $this->providerPriorityDefaults()[(string)$model->code] ?? 100;
            }
        }

        $postedStatus = post('status');

        if ($postedStatus === null) {
            $postedStatus = post('Payment.status');
        }

        if ($postedStatus === null) {
            $postedStatus = post('Payments.status');
        }

        if ($postedStatus === null && request()->has('status')) {
            $postedStatus = request()->input('status');
        }

        if ($postedStatus === null) {
            $postedStatus = $model->status;
        }

        if ((int)$postedStatus !== 1) {
            $model->is_default = 0;
        }

        $postedDefault = post('is_default');

        if ($postedDefault === null) {
            $postedDefault = post('Payment.is_default');
        }

        if ($postedDefault === null) {
            $postedDefault = post('Payments.is_default');
        }

        if ((int)$postedDefault === 1) {
            $model->status = 1;
        }
    }

    public function listExtendQuery($query)
    {
        $mode = (string)request()->get('mode', (string)session('payments.form_mode', 'methods'));
        if (!in_array($mode, ['methods', 'providers'], true)) {
            $mode = 'methods';
        }

        if ($mode === 'providers' || str_contains(request()->path(), 'payments/providers')) {
            $this->syncProviderRecords();
            $query->whereIn('code', self::PROVIDER_CODES);
            return;
        }

        $query->whereIn('code', self::METHOD_CODES);
    }

    public function formAfterSave($model)
    {
        $isProviderRecord = in_array((string)$model->code, self::PROVIDER_CODES, true)
            && ($this->isProvidersMode() || !in_array((string)$model->code, self::METHOD_CODES, true));
        if (!$isProviderRecord) {
            return;
        }

        $data = is_array($model->data) ? $model->data : [];
        if ((string)$model->code === 'worldline') {
            $this->syncProviderIntoPosConfig('worldline', [
                'url' => $data['api_endpoint'] ?? null,
                'username' => $data['api_key_id'] ?? null,
                'access_token' => $data['secret_api_key'] ?? null,
                'id_application' => $data['merchant_id'] ?? null,
                'password' => $data['webhook_secret'] ?? null,
            ]);
        } elseif ((string)$model->code === 'sumup') {
            $this->syncProviderIntoPosConfig('sumup', [
                'url' => $data['url'] ?? null,
                'access_token' => $data['access_token'] ?? null,
                'id_application' => $data['id_application'] ?? null,
            ]);
        }
    }

    protected function syncMethodRecords(): void
    {
        $defaults = [
            'card' => ['name' => 'Card', 'priority' => 1, 'provider_code' => 'stripe'],
            'apple_pay' => ['name' => 'Apple Pay', 'priority' => 2, 'provider_code' => 'stripe'],
            'google_pay' => ['name' => 'Google Pay', 'priority' => 3, 'provider_code' => 'stripe'],
            'paypal' => ['name' => 'PayPal', 'priority' => 4, 'provider_code' => 'paypal'],
            'cod' => ['name' => 'Cash', 'priority' => 5, 'provider_code' => null],
        ];

        $providerClassMap = $this->resolveProviderGatewayClasses();
        foreach ($defaults as $code => $cfg) {
            $row = Payments_model::query()->where('code', $code)->first();
            $payload = [
                'name' => $cfg['name'],
                'description' => $cfg['name'].' payment method',
                'priority' => $cfg['priority'],
                'status' => true,
                'is_default' => $code === 'cod',
            ];

            $providerCode = $cfg['provider_code'];
            if ($providerCode && isset($providerClassMap[$providerCode])) {
                $payload['class_name'] = $providerClassMap[$providerCode];
            }

            if (!$row) {
                $row = new Payments_model();
                $row->code = $code;
            }
            foreach ($payload as $k => $v) {
                $row->{$k} = $v;
            }
            $data = is_array($row->data) ? $row->data : [];
            $data['provider_code'] = $cfg['provider_code'];
            $row->data = $data;
            $row->save();
        }
    }

    protected function resolveProviderGatewayClasses(): array
    {
        $rows = Payments_model::query()
            ->whereIn('code', ['stripe', 'paypal', 'paypalexpress', 'worldline', 'sumup', 'square'])
            ->get(['code', 'class_name']);
        $map = [];
        foreach ($rows as $row) {
            $key = $row->code === 'paypalexpress' ? 'paypal' : $row->code;
            if (!empty($row->class_name) && !isset($map[$key])) {
                $map[$key] = $row->class_name;
            }
        }
        return $map;
    }

    protected function syncProviderRecords(): void
    {
        Payments_model::syncAll();

        $providerDefaults = collect($this->providerPriorityDefaults())
            ->mapWithKeys(fn ($priority, $code) => [$code => ['name' => ucfirst($code === 'sumup' ? 'SumUp' : $code), 'priority' => $priority]])
            ->toArray();
        $providerDefaults['paypal']['name'] = 'PayPal';
        $providerDefaults['worldline']['name'] = 'Worldline';
        $providerDefaults['stripe']['name'] = 'Stripe';
        $providerDefaults['square']['name'] = 'Square';

        $classMap = $this->resolveProviderGatewayClasses();
        foreach ($providerDefaults as $code => $cfg) {
            $row = Payments_model::query()->where('code', $code)->first();
            if (!$row) {
                $row = new Payments_model();
                $row->code = $code;
            }

            $row->name = $row->name ?: $cfg['name'];
            $row->description = $row->description ?: ($cfg['name'].' provider configuration');
            $row->priority = $row->priority ?: $cfg['priority'];
            if (!empty($classMap[$code])) {
                $row->class_name = $row->class_name ?: $classMap[$code];
            }
            $data = is_array($row->data) ? $row->data : [];
            $data['supported_methods'] = $data['supported_methods'] ?? $this->defaultProviderSupportedMethods()[$code] ?? [];
            $row->data = $data;
            if ($row->status === null) {
                $row->status = false;
            }
            $row->save();
        }
    }

    protected function getPaymentProviderSettings(): array
    {
        $defaults = [
            ['code' => 'stripe', 'name' => 'Stripe', 'supported_methods' => ['card', 'apple_pay', 'google_pay']],
            ['code' => 'paypal', 'name' => 'PayPal', 'supported_methods' => ['paypal']],
            ['code' => 'worldline', 'name' => 'Worldline', 'supported_methods' => ['card']],
            ['code' => 'sumup', 'name' => 'SumUp', 'supported_methods' => ['card']],
            ['code' => 'square', 'name' => 'Square', 'supported_methods' => ['card']],
        ];

        $row = \DB::table('settings')
            ->where('sort', 'paymydine')
            ->where('item', 'payment_providers')
            ->first();
        $decoded = $row ? json_decode((string)$row->value, true) : null;
        if (!is_array($decoded) || !count($decoded)) return $defaults;

        $decodedByCode = collect($decoded)->keyBy('code');
        return collect($defaults)->map(function ($base) use ($decodedByCode) {
            $stored = (array)$decodedByCode->get($base['code'], []);
            return [
                'code' => $base['code'],
                'name' => $stored['name'] ?? $base['name'],
                'supported_methods' => array_values($stored['supported_methods'] ?? $base['supported_methods']),
            ];
        })->values()->all();
    }

    protected function getCompatibleProviders(string $methodCode): array
    {
        if ($methodCode === 'cod') {
            return ['' => 'No provider (Cash)'];
        }

        $options = [];
        foreach ($this->getPaymentProviderSettings() as $provider) {
            $supported = (array)($provider['supported_methods'] ?? []);
            if (in_array($methodCode, $supported, true)) {
                $options[(string)$provider['code']] = (string)($provider['name'] ?? strtoupper((string)$provider['code']));
            }
        }
        return $options;
    }

    protected function validateProviderCompatibility(string $methodCode, ?string $providerCode): void
    {
        if ($methodCode === 'cod') {
            if ($providerCode !== null && $providerCode !== '') {
                throw new ApplicationException('Cash method must not have a provider.');
            }
            return;
        }

        $compatible = array_keys($this->getCompatibleProviders($methodCode));
        if (!$providerCode || !in_array($providerCode, $compatible, true)) {
            throw new ApplicationException("Provider '{$providerCode}' is not compatible with '{$methodCode}'.");
        }
    }

    protected function extractProviderCode($model): ?string
    {
        if (!is_array($model->data)) return null;
        $code = $model->data['provider_code'] ?? null;
        return strlen((string)$code) ? (string)$code : null;
    }

    protected function isProvidersMode(): bool
    {
        $mode = (string)request()->get('mode', '');
        if ($mode === 'providers') {
            return true;
        }
        if ((string)session('payments.form_mode', '') === 'providers') {
            return true;
        }
        $referer = (string)request()->headers->get('referer', '');
        return str_contains($referer, 'mode=providers');
    }

    protected function defaultProviderSupportedMethods(): array
    {
        return [
            'stripe' => ['card', 'apple_pay', 'google_pay'],
            'paypal' => ['paypal'],
            'worldline' => ['card'],
            'sumup' => ['card'],
            'square' => ['card'],
        ];
    }

    protected function providerPriorityDefaults(): array
    {
        return [
            'stripe' => 100,
            'paypal' => 101,
            'worldline' => 102,
            'sumup' => 103,
            'square' => 104,
        ];
    }

    protected function getProviderSpecificFields(string $providerCode): array
    {
        $commonModeField = [
            'transaction_mode' => [
                'label' => 'Connection mode',
                'type' => 'select',
                'span' => 'left',
                'default' => 'test',
                'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production'],
                'comment' => 'Use test credentials first, then switch to live after verification.',
            ],
        ];

        $fields = [
            'stripe' => array_merge($commonModeField, [
                'test_secret_key' => ['label' => 'Test Secret Key', 'type' => 'text', 'span' => 'left', 'comment' => 'Starts with sk_test_. Saved value is shown; replace to update.'],
                'live_secret_key' => ['label' => 'Live Secret Key', 'type' => 'text', 'span' => 'right', 'comment' => 'Starts with sk_live_. Saved value is shown; replace to update.'],
                'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'left', 'default' => 'EUR', 'comment' => '3-letter ISO code, for example EUR or USD.'],
            ]),
            'paypal' => array_merge($commonModeField, [
                'test_client_id' => ['label' => 'Sandbox Client ID', 'type' => 'text', 'span' => 'left', 'comment' => 'From PayPal Developer dashboard (sandbox app).'],
                'test_client_secret' => ['label' => 'Sandbox Client Secret', 'type' => 'text', 'span' => 'right', 'comment' => 'Saved value is shown; replace to update.'],
                'live_client_id' => ['label' => 'Live Client ID', 'type' => 'text', 'span' => 'left', 'comment' => 'From your live PayPal app credentials.'],
                'live_client_secret' => ['label' => 'Live Client Secret', 'type' => 'text', 'span' => 'right', 'comment' => 'Saved value is shown; replace to update.'],
                'brand_name' => ['label' => 'Checkout Brand Name', 'type' => 'text', 'span' => 'left', 'comment' => 'Shown on PayPal checkout page to customers.'],
                'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'right', 'default' => 'EUR', 'comment' => '3-letter ISO code, for example EUR or USD.'],
            ]),
            'square' => array_merge($commonModeField, [
                'test_access_token' => ['label' => 'Sandbox Access Token', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],
                'test_location_id' => ['label' => 'Sandbox Location ID', 'type' => 'text', 'span' => 'right', 'comment' => 'Location ID used to create payment links.'],
                'live_access_token' => ['label' => 'Live Access Token', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],
                'live_location_id' => ['label' => 'Live Location ID', 'type' => 'text', 'span' => 'right', 'comment' => 'Production location for payment links.'],
                'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'left', 'default' => 'EUR', 'comment' => '3-letter ISO code, for example EUR or USD.'],
            ]),
            'sumup' => [
                'access_token' => ['label' => 'Access Token', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],
                'url' => ['label' => 'API Base URL', 'type' => 'text', 'span' => 'right', 'default' => 'https://api.sumup.com', 'comment' => 'Use default unless SumUp provides another endpoint.'],
                'id_application' => ['label' => 'Merchant Code', 'type' => 'text', 'span' => 'left', 'comment' => 'SumUp merchant code. If empty, system attempts auto-resolve.'],
            ],
            'worldline' => [
                'api_endpoint' => ['label' => 'API Endpoint', 'type' => 'text', 'span' => 'left', 'default' => 'https://api.preprod.connect.worldline-solutions.com', 'comment' => 'Preprod or live Connect API endpoint URL.'],
                'merchant_id' => ['label' => 'Merchant ID', 'type' => 'text', 'span' => 'right', 'comment' => 'Worldline merchant identifier.'],
                'api_key_id' => ['label' => 'API Key ID', 'type' => 'text', 'span' => 'left', 'comment' => 'Public API key identifier from Worldline portal.'],
                'secret_api_key' => ['label' => 'Secret API Key', 'type' => 'text', 'span' => 'right', 'comment' => 'Saved value is shown; replace to update.'],
                'webhook_secret' => ['label' => 'Webhook Secret (optional)', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],
            ],
        ];

        return $fields[$providerCode] ?? [];
    }

    protected function filterProviderDataFromPost(string $providerCode, array $posted, array $current): array
    {
        $fieldNames = array_keys($this->getProviderSpecificFields($providerCode));
        $secretFields = $this->providerSecretFields($providerCode);
        $filtered = [];
        foreach ($fieldNames as $name) {
            if (array_key_exists($name, $posted)) {
                $value = $posted[$name];
                if (in_array($name, $secretFields, true)) {
                    $isExplicitClear = is_string($value) && trim(strtolower($value)) === '__clear__';
                    $isBlank = is_string($value) ? trim($value) === '' : ($value === null);
                    if ($isExplicitClear) {
                        $filtered[$name] = '';
                        continue;
                    }
                    if ($isBlank && array_key_exists($name, $current)) {
                        $filtered[$name] = $current[$name];
                        continue;
                    }
                }
                $filtered[$name] = $value;
            } elseif (array_key_exists($name, $current)) {
                $filtered[$name] = $current[$name];
            }
        }
        $filtered['supported_methods'] = $current['supported_methods'] ?? ($this->defaultProviderSupportedMethods()[$providerCode] ?? []);

        return $filtered;
    }

    protected function extractPostedProviderPayload(string $providerCode): array
    {
        $payload = [];
        $fieldNames = array_keys($this->getProviderSpecificFields($providerCode));

        foreach (['Payment', 'Payments', 'payment', 'payments'] as $root) {
            $rootPayload = post($root);
            if (is_array($rootPayload)) {
                $payload = array_merge($payload, $rootPayload);
            }
        }

        $allPost = post();
        if (is_array($allPost)) {
            foreach ($fieldNames as $fieldName) {
                if (array_key_exists($fieldName, $allPost)) {
                    $payload[$fieldName] = $allPost[$fieldName];
                }
            }
        }

        return $payload;
    }

    protected function applyNormalizedProviderDataToPost(array $paymentPayload, array $normalizedProviderData): void
    {
        $paymentPayload = array_merge($paymentPayload, $normalizedProviderData);
        request()->request->set('Payment', $paymentPayload);
        request()->request->set('Payments', $paymentPayload);
    }

    protected function providerSecretFields(string $providerCode): array
    {
        return [
            'stripe' => ['test_secret_key', 'live_secret_key'],
            'paypal' => ['test_client_secret', 'live_client_secret'],
            'square' => ['test_access_token', 'live_access_token'],
            'sumup' => ['access_token'],
            'worldline' => ['secret_api_key', 'webhook_secret'],
        ][$providerCode] ?? [];
    }

    public function onTestProviderConnection()
    {
        $code = (string)post('code', post('Payment.code', (string)($this->params[0] ?? '')));
        $model = Payments_model::query()->where('code', $code)->first();
        if (!$model || !in_array($code, self::PROVIDER_CODES, true)) {
            throw new ApplicationException('Provider record not found.');
        }

        $data = (array)$model->data;
        $result = ['success' => false, 'message' => 'Connection test not configured for this provider.'];

        if ($code === 'stripe') {
            $mode = $data['transaction_mode'] ?? 'test';
            $secretKey = $mode === 'live' ? ($data['live_secret_key'] ?? null) : ($data['test_secret_key'] ?? null);
            if (!$secretKey) throw new ApplicationException('Missing Stripe secret key for selected mode.');
            $resp = Http::withBasicAuth($secretKey, '')->acceptJson()->get('https://api.stripe.com/v1/account');
            $result = ['success' => $resp->ok(), 'message' => $resp->ok() ? 'Stripe connection successful.' : 'Stripe connection failed.', 'status' => $resp->status()];
        } elseif ($code === 'paypal') {
            $mode = $data['transaction_mode'] ?? 'test';
            $clientId = $mode === 'live' ? ($data['live_client_id'] ?? null) : ($data['test_client_id'] ?? null);
            $clientSecret = $mode === 'live' ? ($data['live_client_secret'] ?? null) : ($data['test_client_secret'] ?? null);
            if (!$clientId || !$clientSecret) throw new ApplicationException('Missing PayPal credentials for selected mode.');
            $base = $mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
            $resp = Http::asForm()->withBasicAuth($clientId, $clientSecret)->post($base.'/v1/oauth2/token', ['grant_type' => 'client_credentials']);
            $result = ['success' => $resp->ok(), 'message' => $resp->ok() ? 'PayPal token request successful.' : 'PayPal authentication failed.', 'status' => $resp->status()];
        } elseif ($code === 'square') {
            $mode = $data['transaction_mode'] ?? 'test';
            $token = $mode === 'live' ? ($data['live_access_token'] ?? null) : ($data['test_access_token'] ?? null);
            if (!$token) throw new ApplicationException('Missing Square access token for selected mode.');
            $base = $mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
            $resp = Http::withHeaders(['Authorization' => 'Bearer '.$token, 'Accept' => 'application/json'])->get($base.'/v2/locations');
            $result = ['success' => $resp->ok(), 'message' => $resp->ok() ? 'Square connection successful.' : 'Square API request failed.', 'status' => $resp->status()];
        } elseif ($code === 'sumup') {
            $token = $data['access_token'] ?? null;
            $base = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');
            if (!$token) throw new ApplicationException('Missing SumUp access token.');
            $resp = Http::withToken($token)->acceptJson()->get($base.'/v0.1/me');
            $result = ['success' => $resp->ok(), 'message' => $resp->ok() ? 'SumUp connection successful.' : 'SumUp API request failed.', 'status' => $resp->status()];
        } elseif ($code === 'worldline') {
            $diagnostics = app(\Admin\Classes\WorldlineHostedCheckoutService::class)->getConfigForDiagnostics();
            $result = ['success' => true, 'message' => 'Worldline configuration resolved from active tenant POS mapping.', 'environment' => $diagnostics['environment'] ?? 'unknown'];
        }

        if (request()->ajax()) {
            return response()->json($result);
        }

        flash()->{$result['success'] ? 'success' : 'danger'}($result['message']);
    }

    protected function syncProviderIntoPosConfig(string $deviceCode, array $values): void
    {
        $device = \Admin\Models\Pos_devices_model::query()->whereRaw('LOWER(code) = ?', [strtolower($deviceCode)])->first();
        if (!$device) {
            return;
        }

        $config = \Admin\Models\Pos_configs_model::withoutGlobalScopes()
            ->where('device_id', $device->device_id)
            ->orderByDesc('config_id')
            ->first();

        if (!$config) {
            $config = new \Admin\Models\Pos_configs_model();
            $config->device_id = $device->device_id;
        }

        foreach ($values as $key => $value) {
            if ($value !== null && $value !== '') {
                $config->{$key} = $value;
            }
        }
        $config->save();
    }


}
