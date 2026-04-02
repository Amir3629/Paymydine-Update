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
        if ((string)request()->get('mode', '') === 'providers') {
            session(['payments.form_mode' => 'providers']);
        } else {
            session()->forget('payments.form_mode');
        }

        $this->syncMethodRecords();

        $this->asExtension('ListController')->index();
    }

    public function providers()
    {
        $this->syncProviderRecords();
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

        // Provider edit pages keep existing integration config fields.
        if (!$isMethodRecord && $model->exists && $model->class_name && class_exists($model->class_name)) {
            $gateway = new $model->class_name();
            if (method_exists($gateway, 'getConfigFields')) {
                $configFields = $gateway->getConfigFields();
                if (is_array($configFields) && $configFields) {
                    $form->addTabFields($configFields);
                }
            }
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
        $rules = [
            'payment'     => ['sometimes', 'required', 'alpha_dash'],
            'name'        => ['required', 'min:2', 'max:128'],
            'code' => [
                'sometimes',
                'required',
                'alpha_dash',
                Rule::unique('payments', 'code')->ignore(optional($model)->payment_id, 'payment_id'),
            ],
            'priority'    => ['required', 'integer'],
            'description' => ['max:255'],
            'is_default'  => ['required', 'integer'],
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
        $mode = (string)request()->get('mode', '');
        if ($mode === 'providers' || str_contains(request()->path(), 'payments/providers')) {
            $this->syncProviderRecords();
            $query->whereIn('code', self::PROVIDER_CODES);
            return;
        }

        $query->whereIn('code', self::METHOD_CODES);
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

        $providerDefaults = [
            'stripe' => ['name' => 'Stripe', 'priority' => 100],
            'paypal' => ['name' => 'PayPal', 'priority' => 101],
            'worldline' => ['name' => 'Worldline', 'priority' => 102],
            'sumup' => ['name' => 'SumUp', 'priority' => 103],
            'square' => ['name' => 'Square', 'priority' => 104],
        ];

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


}
