<?php

namespace Admin\Models;

use Admin\Traits\Assignable;
use Admin\Traits\HasInvoice;
use Admin\Traits\Locationable;
use Admin\Traits\LogsStatusHistory;
use Admin\Traits\ManagesOrderItems;
use Carbon\Carbon;
use Igniter\Flame\Auth\Models\User;
use Igniter\Flame\Database\Casts\Serialize;
use Igniter\Flame\Database\Model;
use Illuminate\Support\Facades\Request;
use Main\Classes\MainController;
use System\Traits\SendsMailTemplate;
use Illuminate\Support\Facades\DB;

/**
 * Orders Model Class
 */
class Orders_model extends Model
{
    use HasInvoice;
    use ManagesOrderItems;
    use LogsStatusHistory;
    use SendsMailTemplate;
    use Locationable;
    use Assignable;

    const DELIVERY = 'delivery';

    const COLLECTION = 'collection';

    /**
     * @var string The database table name
     */
    protected $table = 'orders';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'order_id';

    protected $timeFormat = 'H:i';

    public $guarded = ['ip_address', 'user_agent', 'hash', 'total_items', 'order_total'];

    protected $hidden = ['cart'];

    protected $allowedFields = ['text'];


    // Insert order data
    public function insertOrder($data)
    {
        return $this->insert($data); // Data ko insert karega
    }
    protected $fillable = ['order_type', 'order_total', 'created_at', 'updated_at'];



        // Order model ko load



    /**
     * @var array The model table column to convert to dates on insert/update
     */
    public $timestamps = true;

    public $appends = ['customer_name', 'order_type_name', 'order_date_time', 'formatted_address'];

    protected $casts = [
        'customer_id' => 'integer',
        'location_id' => 'integer',
        'address_id' => 'integer',
        'total_items' => 'integer',
        'cart' => Serialize::class,
        'order_date' => 'date',
        'order_time' => 'time',
        'order_total' => 'float',
        'notify' => 'boolean',
        'processed' => 'boolean',
        'order_time_is_asap' => 'boolean',
    ];

    public $relation = [
        'belongsTo' => [
            'customer' => 'Admin\Models\Customers_model',
            'location' => 'Admin\Models\Locations_model',
            'address' => 'Admin\Models\Addresses_model',
            'payment_method' => ['Admin\Models\Payments_model', 'foreignKey' => 'payment', 'otherKey' => 'code'],
        ],
        'hasMany' => [
            'payment_logs' => 'Admin\Models\Payment_logs_model',
            'order_notes' => 'Admin\Models\Order_notes_model',
        ],
    ];



    public static $allowedSortingColumns = [
        'order_id asc', 'order_id desc',
        'created_at asc', 'created_at desc',
    ];

    public function listCustomerAddresses()
    {
        if (!$this->customer)
            return [];

        return $this->customer->addresses()->get();
    }



    //
    // Events
    //

    // protected function beforeCreate()
    // {
    //     $this->generateHash();

    //     $this->ip_address = Request::getClientIp();
    //     $this->user_agent = Request::userAgent();
    // }

    protected function beforeCreate()
{
    $this->generateHash();
    $this->ip_address = Request::getClientIp();
    $this->user_agent = Request::userAgent();
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
            if (isset($_SESSION['table'])) {
                $tableId = $_SESSION['table'];
                $tableData = DB::table('tables')->where('table_id', $tableId)->first();
                if ($tableData) {
                    $this->order_type = $tableData->table_name;
                } else {
                    $this->order_type = 'Unknown Table';
                }
                unset($_SESSION['table']);
            }

    }
}

    protected function afterCreate()
{
    // Create notification for new order (with received status)
    try {
        if (\App\Helpers\SettingsHelper::areNewOrderNotificationsEnabled()) {
            $notificationData = [
                'tenant_id' => $this->location_id ?? 1,
                'order_id' => $this->order_id,
                'table_id' => $this->table_id ?? null,
                'status' => 'received',
                'status_name' => 'Received',
                'message' => 'New order received',
                'priority' => 'high'
            ];
            
            // Use the order's order_type_name attribute if available
            if (!empty($this->order_type_name)) {
                $notificationData['table_name'] = $this->order_type_name;
            }
            
            \App\Helpers\NotificationHelper::createOrderNotification($notificationData);
        }
    } catch (\Exception $e) {
        // Log notification error but don't fail the order creation
        \Log::warning('Failed to create new order notification from model', [
            'order_id' => $this->order_id,
            'error' => $e->getMessage()
        ]);
    }
}




    //
    // Scopes
    //

    public function scopeListFrontEnd($query, $options = [])
    {
        extract(array_merge([
            'customer' => null,
            'dateTimeFilter' => [],
            'location' => null,
            'sort' => 'address_id desc',
            'search' => '',
            'status' => null,
            'page' => 1,
            'pageLimit' => 20,
        ], $options));

        $searchableFields = ['order_id', 'first_name', 'last_name', 'email', 'telephone'];

        if (is_null($status)) {
            $query->where('status_id', '>=', 1);
        } else {
            if (!is_array($status))
                $status = [$status];

            $query->whereIn('status_id', $status);
        }

        if ($location instanceof Locations_model) {
            $query->where('location_id', $location->getKey());
        } elseif (strlen($location)) {
            $query->where('location_id', $location);
        }

        if ($customer instanceof User) {
            $query->where('customer_id', $customer->getKey());
        } elseif (strlen($customer)) {
            $query->where('customer_id', $customer);
        }

        if (!is_array($sort)) {
            $sort = [$sort];
        }

        foreach ($sort as $_sort) {
            if (in_array($_sort, self::$allowedSortingColumns)) {
                $parts = explode(' ', $_sort);
                if (count($parts) < 2) {
                    array_push($parts, 'desc');
                }
                [$sortField, $sortDirection] = $parts;
                $query->orderBy($sortField, $sortDirection);
            }
        }

        $search = trim($search);
        if (strlen($search)) {
            $query->search($search, $searchableFields);
        }

        $startDateTime = array_get($dateTimeFilter, 'orderDateTime.startAt', false);
        $endDateTime = array_get($dateTimeFilter, 'orderDateTime.endAt', false);
        if ($startDateTime && $endDateTime)
            $query = $this->scopeWhereBetweenOrderDateTime($query, Carbon::parse($startDateTime)->format('Y-m-d H:i:s'), Carbon::parse($endDateTime)->format('Y-m-d H:i:s'));

        $this->fireEvent('model.extendListFrontEndQuery', [$query]);

        return $query->paginate($pageLimit, $page);
    }

    public function scopeWhereBetweenOrderDateTime($query, $start, $end)
    {
        $query->whereRaw('ADDTIME(order_date, order_time) between ? and ?', [$start, $end]);

        return $query;
    }

    //
    // Accessors & Mutators
    //

    public function getCustomerNameAttribute($value)
    {
        if (empty(trim($this->last_name))) {
            return $this->order_type;
        }

        return $this->first_name . ' ' . $this->last_name;
    }
    public function getOrderTypeNameAttribute()
    {
        $orderType = trim((string) $this->order_type);
        $comment = (string) ($this->comment ?? '');

        $isReady2OrderImport = stripos($comment, 'ready2order') !== false
            || stripos($comment, 'r2o-invoice') !== false
            || stripos($comment, 'Imported from ready2order') !== false;

        if ($isReady2OrderImport && $comment !== '') {
            if (preg_match('/mapped_local_table_name=([^|]+)/u', $comment, $m)) {
                $name = trim($m[1]);
                if ($name !== '') {
                    return $name;
                }
            }

            if (preg_match('/table_name=([^|]+)/u', $comment, $m)) {
                $name = trim($m[1]);
                if ($name !== '') {
                    return $name;
                }
            }
        }

        if ($orderType === 'delivery') {
            return 'Delivery';
        }

        if (strtolower($orderType) === 'cashier') {
            return 'Cashier';
        }

        if (is_numeric($orderType)) {
            $table = \DB::table('tables')->where('table_id', $orderType)->first();
            if ($table) {
                if (!empty($table->table_name)) {
                    return $table->table_name;
                }

                return (isset($table->table_no) && (int) $table->table_no === 0)
                    ? 'Cashier'
                    : 'Table '.((int) $table->table_no);
            }
        }

        if ($orderType !== '' && !preg_match('/^(table\s*)?$/i', $orderType)) {
            return $orderType;
        }

        if (preg_match('/(?:Table\s*)?(\d+)/', $orderType, $matches)) {
            return 'Table '.((int) $matches[1]);
        }

        if (!$this->location) {
            return $orderType;
        }

        return optional(
            $this->location->availableOrderTypes()->get($orderType)
        )->getLabel() ?: $orderType;
    }

    public function getOrderDatetimeAttribute($value)
    {
        if (!isset($this->attributes['order_date'])
            && !isset($this->attributes['order_time'])
        ) return null;

        return make_carbon($this->attributes['order_date'])
            ->setTimeFromTimeString($this->attributes['order_time']);
    }

    public function getFormattedAddressAttribute($value)
    {
        return $this->address ? $this->address->formatted_address : null;
    }

    //
    // Helpers
    //

    public function isCompleted()
    {
        if (!$this->isPaymentProcessed())
            return false;

        return $this->hasStatus(setting('completed_order_status'));
    }

    public function isCanceled()
    {
        return $this->hasStatus(setting('canceled_order_status'));
    }

    public function isCancelable()
    {
        if (!$timeout = $this->location->getOrderCancellationTimeout($this->order_type))
            return false;

        if (!$this->order_datetime->isFuture())
            return false;

        return $this->order_datetime->diffInRealMinutes() > $timeout;
    }

    /**
     * Check if an order was successfully placed
     *
     * @param int $order_id
     *
     * @return bool TRUE on success, or FALSE on failure
     */
    public function isPaymentProcessed()
    {

        return $this->processed && !empty($this->status_id);
    }

    public function isDeliveryType()
    {
        return $this->order_type == static::DELIVERY;
    }

    public function isCollectionType()
    {
        return $this->order_type == static::COLLECTION;
    }

    /**
     * Return the dates of all orders
     *
     * @return array
     */
    public function getOrderDates()
    {
        return $this->pluckDates('created_at');
    }

    public function markAsCanceled(array $statusData = [])
    {
        $canceled = false;
        if ($this->addStatusHistory(setting('canceled_order_status'), $statusData)) {
            $canceled = true;

            $this->fireSystemEvent('admin.order.canceled');
        }

        return $canceled;
    }

    public function markAsPaymentProcessed()
    {
        if (!$this->processed) {
            $this->fireSystemEvent('admin.order.beforePaymentProcessed');

            $this->processed = 1;
            $this->save();

            $this->fireSystemEvent('admin.order.paymentProcessed');
        }

        return $this->processed;
    }

    public function logPaymentAttempt($message, $isSuccess, $request = [], $response = [], $isRefundable = false)
    {
        Payment_logs_model::logAttempt($this, $message, $isSuccess, $request, $response, $isRefundable);
    }

    public function updateOrderStatus($id, $options = [])
    {
                $id = $id ?: $this->status_id ?: setting('default_order_status');
                session(['_previous.url' => url()->full()]);
                $previousUrl = session('_previous.url');

                parse_str(parse_url($previousUrl, PHP_URL_QUERY), $query);

                if (isset($query['order-payment']) && $query['order-payment'] === 'true' && isset($query['u-order'])) {

               $status = DB::table('statuses')->where('status_name', 'Paid')->first();
               $id=$status->status_id;
              // dd('updateOrderStatus')    ;
                }

               return $this->addStatusHistory(
            Statuses_model::find($id), $options
        );
    }

    /**
     * Generate a unique hash for this order.
     * @return string
     */
    protected function generateHash()
    {
        $this->hash = $this->createHash();
        while ($this->newQuery()->where('hash', $this->hash)->count() > 0) {
            $this->hash = $this->createHash();
        }
    }

    /**
     * Create a hash for this order.
     * @return string
     */
    protected function createHash()
    {
        return md5(uniqid('order', microtime()));
    }

    //
    // Mail
    //

    public function mailGetRecipients($type)
    {
        $emailSetting = setting('order_email');
        is_array($emailSetting) || $emailSetting = [];

        $recipients = [];
        if (in_array($type, $emailSetting)) {
            switch ($type) {
                case 'customer':
                    $recipients[] = [$this->email, $this->customer_name];
                    break;
                case 'location':
                    $recipients[] = [$this->location->location_email, $this->location->location_name];
                    break;
                case 'admin':
                    $recipients[] = [setting('site_email'), setting('site_name')];
                    break;
            }
        }

        return $recipients;
    }

    public function mailGetReplyTo($type)
    {
        $replyTo = [];
        if (in_array($type, (array)setting('order_email', []))) {
            switch ($type) {
                case 'location':
                case 'admin':
                    $replyTo = [$this->email, $this->customer_name];
                    break;
            }
        }

        return $replyTo;
    }

    /**
     * Return the order data to build mail template
     *
     * @return array
     */
    public function mailGetData()
    {
        $model = $this->fresh();

        $data = $model->toArray();
        $data['order'] = $model;
        $data['order_number'] = $model->order_id;
        $data['order_id'] = $model->order_id;
        $data['first_name'] = $model->first_name;
        $data['last_name'] = $model->last_name;
        $data['customer_name'] = $model->customer_name;
        $data['email'] = $model->email;
        $data['telephone'] = $model->telephone;
        $data['order_comment'] = $model->comment;

        $data['order_type'] = $model->order_type_name;
        $data['order_time'] = Carbon::createFromTimeString($model->order_time)->isoFormat(lang('system::lang.moment.time_format'));
        $data['order_date'] = $model->order_date->isoFormat(lang('system::lang.moment.date_format'));
        $data['order_added'] = $model->created_at->isoFormat(lang('system::lang.moment.date_time_format'));

        $data['invoice_id'] = $model->invoice_number;
        $data['invoice_number'] = $model->invoice_number;
        $data['invoice_date'] = $model->invoice_date ? $model->invoice_date->isoFormat(lang('system::lang.moment.date_format')) : null;

        $data['order_payment'] = $model->payment_method->name ?? lang('admin::lang.orders.text_no_payment');

        
        
        $data['order_menus'] = [];
        $menus = $model->getOrderMenusWithOptions();

        $readTaxSetting = function ($key, $default = null) {
            try {
                $value = setting($key, null);
                if ($value !== null && $value !== '') {
                    return $value;
                }
            } catch (\Throwable $e) {}

            try {
                $row = \Illuminate\Support\Facades\DB::table('settings')
                    ->where('item', $key)
                    ->first();

                if ($row && $row->value !== null && $row->value !== '') {
                    return $row->value;
                }
            } catch (\Throwable $e) {}

            return $default;
        };

        $pmdTaxPercent = (float) $readTaxSetting('tax_percentage', 0);
        $pmdTaxIncluded = ((string) $readTaxSetting('tax_menu_price', '1')) === '1';
        $pmdGrossFactor = $pmdTaxIncluded ? (1 + ($pmdTaxPercent / 100)) : 1;

        $displaySubtotal = 0.0;

        foreach ($menus as $menu) {
            $optionData = [];

            $displayMenuPrice = (float) ($menu->price ?? 0);
            $displayMenuSubtotal = (float) ($menu->subtotal ?? 0);

            if ($pmdTaxIncluded && $pmdTaxPercent > 0) {
                $displayMenuPrice = round($displayMenuPrice * $pmdGrossFactor, 2);
                $displayMenuSubtotal = round($displayMenuSubtotal * $pmdGrossFactor, 2);
            } else {
                $displayMenuPrice = round($displayMenuPrice, 2);
                $displayMenuSubtotal = round($displayMenuSubtotal, 2);
            }

            $displaySubtotal += $displayMenuSubtotal;

            foreach ($menu->menu_options->groupBy('order_option_group') as $menuItemOptionGroupName => $menuItemOptions) {
                $optionData[] = $menuItemOptionGroupName;
                foreach ($menuItemOptions as $menuItemOption) {
                    $displayOptionValue = (float) $menuItemOption->quantity * (float) $menuItemOption->order_option_price;

                    if ($pmdTaxIncluded && $pmdTaxPercent > 0) {
                        $displayOptionValue = round($displayOptionValue * $pmdGrossFactor, 2);
                    } else {
                        $displayOptionValue = round($displayOptionValue, 2);
                    }

                    $optionData[] = $menuItemOption->quantity
                        .'&nbsp;'.lang('admin::lang.text_times').'&nbsp;'
                        .$menuItemOption->order_option_name
                        .lang('admin::lang.text_equals')
                        .currency_format($displayOptionValue);
                }
            }

            $data['order_menus'][] = [
                'menu_name' => $menu->name,
                'menu_quantity' => $menu->quantity,
                'menu_price' => currency_format($displayMenuPrice),
                'menu_subtotal' => currency_format($displayMenuSubtotal),
                'menu_options' => implode('<br /> ', $optionData),
                'menu_comment' => $menu->comment,
            ];
        }

        $data['order_totals'] = [];
        $orderTotalsByCode = collect($model->getOrderTotals())->keyBy('code');

        $tipValue = round((float) optional($orderTotalsByCode->get('tip'))->value, 2);
        $discountValue = round(abs((float) optional($orderTotalsByCode->get('discount'))->value), 2);

        $displayTaxValue = $pmdTaxIncluded && $pmdTaxPercent > 0
            ? round($displaySubtotal - ($displaySubtotal / (1 + ($pmdTaxPercent / 100))), 2)
            : round((float) optional($orderTotalsByCode->get('tax'))->value, 2);

        $displayTaxTitle = $pmdTaxIncluded
            ? ('VAT included ('.rtrim(rtrim(number_format($pmdTaxPercent, 2, '.', ''), '0'), '.').'%)')
            : htmlspecialchars_decode(optional($orderTotalsByCode->get('tax'))->title ?? 'Tax');

        $displayTotal = round(($pmdTaxIncluded ? $displaySubtotal : ($displaySubtotal + $displayTaxValue)) + $tipValue - $discountValue, 2);

        $data['order_totals'][] = [
            'order_total_title' => 'Subtotal',
            'order_total_value' => currency_format($displaySubtotal),
            'priority' => 1,
        ];

        if ($displayTaxValue > 0) {
            $data['order_totals'][] = [
                'order_total_title' => $displayTaxTitle,
                'order_total_value' => currency_format($displayTaxValue),
                'priority' => 2,
            ];
        }

        if ($tipValue > 0) {
            $data['order_totals'][] = [
                'order_total_title' => 'Tip',
                'order_total_value' => currency_format($tipValue),
                'priority' => 3,
            ];
        }

        if ($discountValue > 0) {
            $data['order_totals'][] = [
                'order_total_title' => 'Discount',
                'order_total_value' => currency_format(-1 * $discountValue),
                'priority' => 4,
            ];
        }

        $data['order_totals'][] = [
            'order_total_title' => 'Total',
            'order_total_value' => currency_format($displayTotal),
            'priority' => 99,
        ];

        $data['order_address'] = lang('admin::lang.orders.text_collection_order_type');


        if ($model->address)
            $data['order_address'] = format_address($model->address->toArray(), false);

        if ($model->location) {
            $data['location_logo'] = $model->location->thumb;
            $data['location_name'] = $model->location->location_name;
            $data['location_email'] = $model->location->location_email;
            $data['location_telephone'] = $model->location->location_telephone;
            $data['location_address'] = format_address($model->location->getAddress());
        }

        $statusHistory = Status_history_model::applyRelated($model)->whereStatusIsLatest($model->status_id)->first();
        $data['status_name'] = $statusHistory ? optional($statusHistory->status)->status_name : null;
        $data['status_comment'] = $statusHistory ? $statusHistory->comment : null;

        $controller = MainController::getController() ?: new MainController;
        $data['order_view_url'] = $controller->pageUrl('account/order', [
            'hash' => $model->hash,
        ]);

        return $data;
    }

}

