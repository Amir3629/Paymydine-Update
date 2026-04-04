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

    protected static ?array $resolvedStorage = null;

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        $this->applyStorageMapping();
    }

    protected $fillable = ['name', 'code', 'class_name', 'description', 'data', 'status', 'is_default', 'priority'];

    public $timestamps = true;

    protected $casts = [
        'data' => 'array',
        'status' => 'boolean',
        'is_default' => 'boolean',
        'priority' => 'integer',
    ];

    protected $jsonable = ['data'];

    protected $purgeable = ['payment'];

    protected static $defaultPayment;

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

        if (is_array($this->data))
            $this->attributes = array_merge($this->data, $this->attributes);
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
        
        if (!empty($posted)) {
            $current = is_array($this->data) ? $this->data : [];
            $this->data = array_merge($current, $posted);
        }

        // Remove attributes that cannot be filled (prevents attempts to save non-existent columns).
        foreach (array_keys($this->attributes) as $name) {
            if (in_array($name, $this->fillable)) continue;
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
        if (self::$resolvedStorage === null) {
            if (Schema::hasTable('payment_methods')) {
                self::$resolvedStorage = ['table' => 'payment_methods', 'key' => 'id'];
            } else {
                self::$resolvedStorage = ['table' => 'payments', 'key' => 'payment_id'];
            }
        }

        $this->table = self::$resolvedStorage['table'];
        $this->primaryKey = self::$resolvedStorage['key'];
    }
}
