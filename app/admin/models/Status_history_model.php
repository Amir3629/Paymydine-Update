<?php

namespace Admin\Models;

use Carbon\Carbon;
use Igniter\Flame\Database\Model;

/**
 * Status History Model Class
 */
class Status_history_model extends Model
{
    protected $table = 'status_history';
    protected $primaryKey = 'status_history_id';
    protected $guarded = [];
    protected $appends = ['staff_name', 'status_name', 'notified', 'date_added_since'];
    public $timestamps = true;

    protected $casts = [
        'object_id' => 'integer',
        'staff_id' => 'integer',
        'status_id' => 'integer',
        'notify' => 'boolean',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => 'Admin\\Models\\Staffs_model',
            'status' => ['Admin\\Models\\Statuses_model', 'status_id'],
        ],
        'morphTo' => [
            'object' => [],
        ],
    ];

    public static function alreadyExists($model, $statusId)
    {
        return self::where('object_id', $model->getKey())
            ->where('object_type', $model->getMorphClass())
            ->where('status_id', $statusId)->exists();
    }

    public function getStaffNameAttribute($value)
    {
        return ($this->staff && $this->staff->exists) ? $this->staff->staff_name : $value;
    }

    public function getDateAddedSinceAttribute($value)
    {
        return $this->created_at ? time_elapsed($this->created_at) : null;
    }

    public function getStatusNameAttribute($value)
    {
        return ($this->status && $this->status->exists) ? $this->status->status_name : $value;
    }

    public function getNotifiedAttribute()
    {
        return $this->notify == 1 ? lang('admin::lang.text_yes') : lang('admin::lang.text_no');
    }

    /**
     * @param \\Igniter\\Flame\\Database\\Model|mixed $status
     * @param \\Igniter\\Flame\\Database\\Model|mixed $object
     * @param array $options
     * @return static|bool
     */
    public static function createHistory($status, $object, $options = [])
    {
        $statusId = $status->getKey();
        $previousStatus = $object->getOriginal('status_id');

        $model = new static;
        $model->status_id = $statusId;
        $model->object_id = $object->getKey();
        $model->object_type = $object->getMorphClass();
        $model->staff_id = array_get($options, 'staff_id');
        $model->comment = array_get($options, 'comment', $status->status_comment);
        $model->notify = array_get($options, 'notify', $status->notify_customer);

        if ($model->fireSystemEvent('admin.statusHistory.beforeAddStatus', [$object, $statusId, $previousStatus], true) === false)
            return false;

        $model->save();

        // Update using query to prevent model events from firing.
        $object->newQuery()->where($object->getKeyName(), $object->getKey())->update([
            'status_id' => $statusId,
            'status_updated_at' => Carbon::now(),
        ]);

        // PMD_KITCHEN_OPERATIONS_FOUNDATION_R1
        // Status history is already the canonical KDS/Waiter workflow authority.
        // Record kitchen timing facts from the same transition without changing
        // any KDS interaction. Received-card tap remains Preparing; Ready remains
        // the existing Ready action.
        try {
            if ($model->isForOrder()) {
                $orderId = (int)$object->getKey();
                $statusName = trim((string)($status->status_name ?? $model->status_name ?? ''));
                $normalized = strtolower($statusName);
                $lifecycle = app(\\App\\Services\\PmdKitchenEtaLifecycleService::class);

                // A repeated Received/Accepted transition usually means staff sent
                // additional food on an already active order. Recalculate the
                // current due time conservatively while preserving eta_initial_minutes.
                $isReceived = strpos($normalized, 'received') !== false
                    || strpos($normalized, 'accepted') !== false
                    || strpos($normalized, 'confirmed') !== false;
                $alreadyReleased = $isReceived
                    && \\Illuminate\\Support\\Facades\\Schema::hasColumn('orders', 'kitchen_released_at')
                    && \\Illuminate\\Support\\Facades\\DB::table('orders')
                        ->where('order_id', $orderId)
                        ->whereNotNull('kitchen_released_at')
                        ->exists();

                if ($alreadyReleased) {
                    $lifecycle->onItemsSent($orderId, [], null, 'repeat_received_status');
                } else {
                    $lifecycle->onKitchenStatus($orderId, $statusName);
                }
            }
        } catch (\\Throwable $error) {
            \\Log::warning('PMD_KITCHEN_STATUS_LIFECYCLE_FAILED', [
                'order_id' => (int)$object->getKey(),
                'status_id' => (int)$statusId,
                'message' => $error->getMessage(),
            ]);
        }

        return $model;
    }

    public function isForOrder()
    {
        return $this->object_type === Orders_model::make()->getMorphClass();
    }

    public function scopeApplyRelated($query, $model)
    {
        return $query->where('object_type', $model->getMorphClass())
            ->where('object_id', $model->getKey());
    }

    public function scopeWhereStatusIsLatest($query, $statusId)
    {
        return $query->where('status_id', $statusId)->orderBy('created_at', 'desc');
    }
}
