<?php

namespace Admin\Models;

use Admin\Classes\PaymentGateways;
use Igniter\Flame\Database\Model;
use Igniter\Flame\Database\Traits\Purgeable;
use Igniter\Flame\Database\Traits\Sortable;
use Igniter\Flame\Exception\ApplicationException;
use Igniter\Flame\Exception\ValidationException;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Schema;

/**
 * Payments Model Class
 */
class Payments_model extends Model
{
    use Sortable;
    use Purgeable;

    const SORT_ORDER = 'priority';

    /**
     * @var string The database table name
     */
    protected $table = 'payments';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'payment_id';

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        $this->applyStorageMapping();
    }

    protected $fillable = ['name', 'code', 'class_name', 'description', 'meta', 'provider_code', 'status', 'is_default', 'priority', 'sort_order'];

    public $timestamps = true;

    protected $casts = ['meta' => 'array'];

    protected $jsonable = [];

    protected $purgeable = ['payment'];

    protected static $defaultPayment;

    protected const METHOD_PROVIDER_MATRIX = [
        'card' => ['stripe', 'worldline', 'vr_payment'],
        'apple_pay' => ['stripe', 'vr_payment'],
        'google_pay' => ['stripe', 'vr_payment'],
        'wero' => ['stripe', 'worldline', 'vr_payment'],
        'paypal' => ['paypal', 'stripe', 'vr_payment'],
        'cod' => [],
        'cash' => [],
    ];

    public function getDropdownOptions()
    {
        return $this->isEnabled()->dropdown('name', 'code');
    }

    public static function listDropdownOptions()
    {
        $all = self::select('code', 'name', 'description')->isEnabled()->get();
        $collection = $all->keyBy('code')->map(function ($model) {
            return [$model->name, $model->description];
        });

        return $collection;
    }

    public static function onboardingIsComplete()
    {
        return self::isEnabled()->count() > 0;
    }

    public function listGateways()
    {
        $result = [];
        $this->gatewayManager = PaymentGateways::instance();
        foreach ($this->gatewayManager->listGateways() as $code => $gateway) {
            $result[$gateway['code']] = $gateway['name'];
        }

        return $result;
    }

    //
    // Accessors & Mutators
    //

    public function setCodeAttribute($value)
    {
        $this->attributes['code'] = str_slug($value, '_');
    }

    public function scopeIsEnabled($query)
    {
        return $query->where('status', 1);
    }

    //
    // Events
    //

    protected function afterFetch()
    {
        $this->applyGatewayClass();

        $payload = $this->getConfigPayload();
        if (is_array($payload))
            $this->attributes = array_merge($payload, $this->attributes);
    }

    protected function beforeSave()
    {
        $this->applyStorageMapping();

        if (strlen((string)$this->code)) {
            $existing = self::query()->where('code', (string)$this->code)->first();
            if ($existing && ((string)$this->getKey() === '' || (int)$this->getKey() === 0 || !$this->exists)) {
                $this->setAttribute($this->getKeyName(), $existing->getKey());
                $this->exists = true;
            }
        }

        // This only happens during updates (edits) — it maintains its current behavior.
        if (!$this->exists) {
            return;
        }

        if ($this->is_default) {
            $this->makeDefault();
        }

        // Collect form payload from all known roots used by admin forms.
        $posted = [];
        foreach (['Payment', 'Payments', 'payment', 'payments'] as $root) {
            $rootPayload = post($root);
            if (is_array($rootPayload)) {
                $posted = array_merge($posted, $rootPayload);
            }
        }

        // Remove fields that do NOT belong to the JSON data (they are form columns/controls).
        foreach ([
            'payment',        // gateway select
            'name',
            'code',
            'priority',
            'status',
            'is_default',
            'description',
            'class_name',
        ] as $k) {
            unset($posted[$k]);
        }

        if (array_key_exists('provider_code', $posted)) {
            $this->provider_code = strlen((string)$posted['provider_code']) ? (string)$posted['provider_code'] : null;
            unset($posted['provider_code']);
        }
        
        if (!empty($posted)) {
            $current = $this->getConfigPayload();
            $this->setConfigPayload(array_merge($current, $posted));
        }

        if (!$this->provider_code && in_array((string)$this->code, ['cod', 'cash'], true)) {
            $this->provider_code = null;
        }

        // Keep only real DB columns for the resolved storage table.
        $realColumns = Schema::getColumnListing($this->getTable());
        foreach (array_keys($this->attributes) as $name) {
            if (in_array($name, $realColumns, true)) continue;
            unset($this->attributes[$name]);
        }
    }

    //
    // Manager
    //

    /**
     * Extends this class with the gateway class
     *
     * @param string $class Class name
     *
     * @return bool
     */
    public function applyGatewayClass($class = null)
    {
        if (is_null($class))
            $class = $this->class_name;

        if (!class_exists($class)) {
            $class = null;
        }

        if ($class && !$this->isClassExtendedWith($class)) {
            $this->extendClassWith($class);
        }

        $this->class_name = $class;

        return !is_null($class);
    }

    public function renderPaymentForm($controller)
    {
        $this->beforeRenderPaymentForm($this, $controller);

        $paymentMethodFile = strtolower(class_basename($this->class_name));
        $partialName = 'payregister/'.$paymentMethodFile;

        return $controller->renderPartial($partialName, ['paymentMethod' => $this]);
    }

    public function getGatewayClass()
    {
        return $this->class_name;
    }

    public function getGatewayObject($class = null)
    {
        if (!$class) {
            $class = $this->class_name;
        }

        return $this->asExtension($class);
    }

    //
    // Helpers
    //

    public function makeDefault()
    {
        if (!$this->status) {
            throw new ValidationException(['status' => sprintf(
                lang('admin::lang.alert_error_set_default'), $this->name
            )]);
        }

        $this->timestamps = false;
        $this->newQuery()->where('is_default', '!=', 0)->update(['is_default' => 0]);
        $this->newQuery()->where($this->getKeyName(), $this->getKey())->update(['is_default' => 1]);
        $this->timestamps = true;
    }

    public static function getDefault()
    {
        if (self::$defaultPayment !== null) {
            return self::$defaultPayment;
        }

        $defaultPayment = self::isEnabled()->where('is_default', true)->first();

        if (!$defaultPayment) {
            if ($defaultPayment = self::isEnabled()->first()) {
                $defaultPayment->makeDefault();
            }
        }

        return self::$defaultPayment = $defaultPayment;
    }

    /**
     * Return all payments
     *
     * @return array
     */
    public static function listPayments()
    {
        return self::isEnabled()->get()->filter(function ($model) {
            return strlen($model->class_name) > 0;
        });
    }

    public static function syncAll()
    {
        $payments = self::pluck('code')->all();

        $gatewayManager = PaymentGateways::instance();
        foreach ($gatewayManager->listGateways() as $code => $gateway) {
            if (in_array($code, $payments)) continue;

            $model = self::make([
                'code' => $code,
                'name' => Lang::get($gateway['name']),
                'description' => Lang::get($gateway['description']),
                'class_name' => $gateway['class'],
                'status' => $code === 'cod',
                'is_default' => $code === 'cod',
            ]);

            $model->applyGatewayClass();
            $model->save();
        }

        PaymentGateways::createPartials();
    }

    //
    // Payment Profiles
    //

    /**
     * Finds and returns a customer payment profile for this payment method.
     * @param \Admin\Models\Customers_model $customer Specifies customer to find a profile for.
     * @return \Admin\Models\Payment_profiles_model|object Returns the payment profile object or NULL if the payment profile doesn't exist.
     */
    public function findPaymentProfile($customer)
    {
        if (!$customer)
            return null;

        $query = Payment_profiles_model::query();

        return $query->where('customer_id', $customer->customer_id)
            ->where('payment_id', $this->getKey())
            ->first();
    }

    /**
     * Initializes a new empty customer payment profile.
     * This method should be used by payment methods internally.
     * @param \Admin\Models\Customers_model $customer Specifies customer to initialize a profile for.
     * @return \Admin\Models\Payment_profiles_model Returns the payment profile object or NULL if the payment profile doesn't exist.
     */
    public function initPaymentProfile($customer)
    {
        $profile = new Payment_profiles_model();
        $profile->customer_id = $customer->customer_id;
        $profile->payment_id = $this->getKey();

        return $profile;
    }

    public function paymentProfileExists($customer)
    {
        return (bool)$this->findPaymentProfile($customer);
    }

    public function deletePaymentProfile($customer)
    {
        $gatewayObj = $this->getGatewayObject();

        $profile = $this->findPaymentProfile($customer);

        if (!$profile) {
            throw new ApplicationException(lang('admin::lang.customers.alert_customer_payment_profile_not_found'));
        }

        $gatewayObj->deletePaymentProfile($customer, $profile);

        $profile->delete();
    }

    protected function applyStorageMapping(): void
    {
        $schema = $this->getConnection()->getSchemaBuilder();

        $methodTables = ['payment_methods', 'ti_payment_methods'];
        $legacyTables = ['payments', 'ti_payments'];

        foreach ($methodTables as $tableName) {
            if ($schema->hasTable($tableName)) {
                $this->table = $tableName;
                $this->primaryKey = 'id';
                $this->casts = ['meta' => 'array'];
                $this->jsonable = [];
                return;
            }
        }

        foreach ($legacyTables as $tableName) {
            if ($schema->hasTable($tableName)) {
                $this->table = $tableName;
                $this->primaryKey = 'payment_id';
                $this->casts = ['data' => 'array'];
                $this->jsonable = [];
                return;
            }
        }

        $this->table = 'payments';
        $this->primaryKey = 'payment_id';
        $this->casts = ['data' => 'array'];
        $this->jsonable = [];
    }

    protected function usesPaymentMethodsStorage(): bool
    {
        return in_array($this->getTable(), ['payment_methods', 'ti_payment_methods'], true);
    }

    public function getPriorityAttribute($value)
    {
        if ($this->usesPaymentMethodsStorage()) {
            return (int)($this->attributes['sort_order'] ?? 0);
        }

        return $value;
    }

    public function setPriorityAttribute($value): void
    {
        if ($this->usesPaymentMethodsStorage()) {
            $this->attributes['sort_order'] = (int)$value;
            return;
        }

        $this->attributes['priority'] = $value;
    }

    public function getDataAttribute($value)
    {
        if ($this->usesPaymentMethodsStorage()) {
            $meta = $this->attributes['meta'] ?? $this->meta ?? [];
            return is_array($meta) ? $meta : (is_string($meta) ? (json_decode($meta, true) ?: []) : []);
        }

        return is_array($value) ? $value : (is_string($value) ? (json_decode($value, true) ?: []) : []);
    }

    public function setDataAttribute($value): void
    {
        $normalized = is_array($value) ? $value : (is_string($value) ? (json_decode($value, true) ?: []) : []);
        if ($this->usesPaymentMethodsStorage()) {
            $this->attributes['meta'] = $normalized;
            return;
        }

        $this->attributes['data'] = json_encode($normalized);
    }

    protected function getConfigPayload(): array
    {
        if ($this->usesPaymentMethodsStorage()) {
            return (array)$this->getDataAttribute($this->attributes['meta'] ?? null);
        }

        return (array)$this->getDataAttribute($this->attributes['data'] ?? null);
    }

    protected function setConfigPayload(array $payload): void
    {
        if (array_key_exists('supported_providers', $payload)) {
            $payload['supported_providers'] = $this->normalizeSupportedProviders($payload['supported_providers']);
        }

        if ($this->usesPaymentMethodsStorage()) {
            $this->attributes['meta'] = $payload;
            return;
        }

        $this->attributes['data'] = json_encode($payload);
    }

    public function getConfigData(): array
    {
        return $this->getConfigPayload();
    }

    public function setConfigData(array $payload): void
    {
        $this->setConfigPayload($payload);
    }

    public function isMethodStorageResolved(): bool
    {
        $this->applyStorageMapping();
        return $this->usesPaymentMethodsStorage();
    }

    public static function supportedProviderMatrix(): array
    {
        return self::METHOD_PROVIDER_MATRIX;
    }

    public static function supportedProvidersForMethod(string $methodCode): array
    {
        return self::METHOD_PROVIDER_MATRIX[strtolower($methodCode)] ?? [];
    }

    public function getSupportedProvidersAttribute($value): array
    {
        $payload = $this->getConfigPayload();
        if (array_key_exists('supported_providers', $payload)) {
            return $this->normalizeSupportedProviders($payload['supported_providers']);
        }

        return self::supportedProvidersForMethod((string)$this->code);
    }

    public function setSupportedProvidersAttribute($value): void
    {
        $payload = $this->getConfigPayload();
        $payload['supported_providers'] = $this->normalizeSupportedProviders($value);
        $this->setConfigPayload($payload);
    }

    protected function normalizeSupportedProviders($value): array
    {
        $items = array_values(array_filter(array_map(
            fn ($v) => strtolower(trim((string)$v)),
            is_array($value) ? $value : []
        ), fn (string $v) => $v !== ''));

        return array_values(array_unique($items));
    }
}
