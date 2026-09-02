<?php

namespace Admin\Models;

use Admin\Classes\PaymentGateways;
use Admin\Traits\PaymentProfiles;
use Igniter\Flame\Database\Model;
use Illuminate\Support\Facades\Log;

class Payments_model extends Model
{
    use PaymentProfiles;

    protected $table = 'payment_methods';
    protected $primaryKey = 'id';

    protected $guarded = [];
    protected $casts = [
        'data' => 'array',
        'status' => 'boolean',
        'is_default' => 'boolean',
    ];

    protected static $defaultPayment;

    protected static $pmdResolvedStorage = [];

    protected const METHOD_PROVIDER_MATRIX = [
        'card' => ['stripe', 'worldline', 'sumup', 'vr_payment'],
        'apple_pay' => ['stripe', 'worldline', 'sumup', 'vr_payment'],
        'google_pay' => ['stripe', 'worldline', 'sumup', 'vr_payment'],
        'wero' => ['worldline', 'vr_payment'],
        'paypal' => ['paypal', 'worldline', 'stripe', 'vr_payment'],
        'cod' => [],
        'cash' => [],
    ];

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        $this->applyStorageMapping();
    }

    protected function applyStorageMapping(): void
    {
        try {
            $connection = $this->getConnectionName() ?: config('database.default');
            $cacheKey = (string)$connection;
            if (!array_key_exists($cacheKey, self::$pmdResolvedStorage)) {
                $schema = $this->getConnection()->getSchemaBuilder();
                $hasPaymentMethods = $schema->hasTable('payment_methods');
                $hasPayments = $schema->hasTable('payments');

                $table = $hasPaymentMethods ? 'payment_methods' : ($hasPayments ? 'payments' : 'payment_methods');
                $columns = [];
                try {
                    if ($schema->hasTable($table)) {
                        $columns = $schema->getColumnListing($table);
                    }
                } catch (\Throwable $ignored) {
                    $columns = [];
                }

                self::$pmdResolvedStorage[$cacheKey] = [
                    'table' => $table,
                    'primaryKey' => $table === 'payments' ? 'payment_id' : 'id',
                    'dataColumn' => in_array('data', $columns, true) ? 'data' : (in_array('meta', $columns, true) ? 'meta' : null),
                    'hasStatus' => in_array('status', $columns, true),
                    'hasDefault' => in_array('is_default', $columns, true),
                    'hasProviderCode' => in_array('provider_code', $columns, true),
                ];
            }

            $mapping = self::$pmdResolvedStorage[$cacheKey];
            $this->setTable($mapping['table']);
            $this->setKeyName($mapping['primaryKey']);
        } catch (\Throwable $e) {
            Log::warning('PMD payments storage mapping failed', ['message' => $e->getMessage()]);
        }
    }

    protected function storageMapping(): array
    {
        $this->applyStorageMapping();
        $connection = $this->getConnectionName() ?: config('database.default');
        return self::$pmdResolvedStorage[(string)$connection] ?? [
            'table' => $this->getTable(),
            'primaryKey' => $this->getKeyName(),
            'dataColumn' => 'data',
            'hasStatus' => true,
            'hasDefault' => true,
            'hasProviderCode' => true,
        ];
    }

    public function getConfigData(): array
    {
        $mapping = $this->storageMapping();
        $column = $mapping['dataColumn'];
        if (!$column) return [];
        $raw = $this->getAttribute($column);
        if (is_array($raw)) return $raw;
        if (is_object($raw)) return (array)$raw;
        if (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    public function setConfigData(array $data): self
    {
        $mapping = $this->storageMapping();
        if ($mapping['dataColumn']) {
            $this->setAttribute($mapping['dataColumn'], $data);
        }
        return $this;
    }

    public function getDataAttribute($value)
    {
        if (is_array($value)) return $value;
        if (is_object($value)) return (array)$value;
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    public function setDataAttribute($value)
    {
        $mapping = $this->storageMapping();
        $column = $mapping['dataColumn'] ?: 'data';
        $this->attributes[$column] = is_string($value) ? $value : json_encode($value ?: []);
    }

    public function getProviderCodeAttribute($value)
    {
        $mapping = $this->storageMapping();
        if ($mapping['hasProviderCode']) return $value;
        $data = $this->getConfigData();
        return $data['provider_code'] ?? null;
    }

    public function setProviderCodeAttribute($value)
    {
        $mapping = $this->storageMapping();
        if ($mapping['hasProviderCode']) {
            $this->attributes['provider_code'] = $value;
            return;
        }
        $data = $this->getConfigData();
        $data['provider_code'] = $value;
        $this->setConfigData($data);
    }

    protected function beforeSave()
    {
        if (!$this->exists) {
            $this->prepareAttributesForResolvedStorage();
            return;
        }

        if ($this->is_default) {
            $this->makeDefault();
        }

        $posted = [];
        foreach (['Payment', 'Payments', 'payment', 'payments'] as $root) {
            $rootPayload = post($root);
            if (is_array($rootPayload)) {
                $posted = array_merge($posted, $rootPayload);
            }
        }

        foreach ([
            'payment',
            'name',
            'code',
            'priority',
            'status',
            'is_default',
            'class_name',
            'provider_code',
        ] as $virtual) {
            unset($posted[$virtual]);
        }

        if (!empty($posted)) {
            $data = $this->getConfigData();
            foreach ($posted as $key => $value) {
                if ($value === '' && in_array($key, ['secret_api_key', 'webhook_secret', 'access_token', 'client_secret'], true)) {
                    continue;
                }
                $data[$key] = $value;
            }
            $this->setConfigData($data);
        }

        $this->prepareAttributesForResolvedStorage();
    }

    protected function prepareAttributesForResolvedStorage(): void
    {
        $this->applyStorageMapping();
        $mapping = $this->storageMapping();

        if ($mapping['dataColumn']) {
            $raw = $this->getAttribute($mapping['dataColumn']);
            if (is_array($raw) || is_object($raw)) {
                $this->attributes[$mapping['dataColumn']] = json_encode($raw);
            }
        }

        foreach (['data', 'meta'] as $column) {
            if ($column !== $mapping['dataColumn']) {
                unset($this->attributes[$column]);
            }
        }
        if (!$mapping['hasProviderCode']) unset($this->attributes['provider_code']);
        if (!$mapping['hasStatus']) unset($this->attributes['status']);
        if (!$mapping['hasDefault']) unset($this->attributes['is_default']);
    }

    public function applyGatewayClass($class = null)
    {
        if (is_null($class))
            $class = $this->class_name;

        if (!class_exists($class))
            return false;

        $this->extendClassWith($class);

        return $this;
    }

    public function getGatewayObject($class = null)
    {
        if (is_null($class))
            $class = $this->class_name;

        if (!class_exists($class))
            return null;

        $this->extendClassWith($class);

        return $this->asExtension($class);
    }

    public function makeDefault()
    {
        if (!$this->status) {
            return;
        }

        static::query()->where('is_default', 1)->where($this->getKeyName(), '<>', $this->getKey())->update(['is_default' => 0]);
    }

    public static function getDefault()
    {
        if (self::$defaultPayment)
            return self::$defaultPayment;

        $defaultPayment = self::isEnabled()->where('is_default', 1)->first();
        if (!$defaultPayment)
            $defaultPayment = self::isEnabled()->first();

        return self::$defaultPayment = $defaultPayment;
    }

    public static function listPayments()
    {
        return self::isEnabled()->get()->filter(function ($model) {
            return $model->getGatewayObject();
        });
    }

    public static function syncAll()
    {
        PaymentGateways::createPartials();
    }

    public function findPaymentProfile($customer)
    {
        if (!$customer)
            return null;

        return $this->payment_profiles()
            ->where('customer_id', $customer->getKey())
            ->first();
    }

    public function initPaymentProfile($customer)
    {
        $profile = new Payment_profiles_model();
        $profile->customer_id = $customer->getKey();
        $profile->payment_method_id = $this->getKey();
        $profile->payment_data = [];
        return $profile;
    }

    public function scopeIsEnabled($query)
    {
        $mapping = (new static)->storageMapping();
        if (!$mapping['hasStatus']) return $query;
        return $query->where('status', 1);
    }

    public static function methodProviderMatrix(): array
    {
        return self::METHOD_PROVIDER_MATRIX;
    }

    public static function supportedProvidersForMethod(string $methodCode): array
    {
        $methodCode = strtolower(trim($methodCode));
        $candidates = self::METHOD_PROVIDER_MATRIX[$methodCode] ?? [];
        if (!$candidates) {
            return [];
        }

        $registry = new \App\Services\Payments\ProviderCapabilityRegistry();

        return array_values(array_filter(
            $candidates,
            static fn (string $provider): bool => $registry->implementsPaymentMethod($provider, $methodCode)
        ));
    }
}
