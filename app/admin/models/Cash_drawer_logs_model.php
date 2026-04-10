<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Cash Drawer Logs Model Class
 */
class Cash_drawer_logs_model extends Model
{
    protected $table = 'cash_drawer_logs';
    protected $primaryKey = 'log_id';
    public $timestamps = true;

    protected $fillable = [
        'drawer_id',
        'order_id',
        'staff_id',
        'action',
        'status',
        'message',
        'request_payload',
        'response_payload',
    ];

    protected $casts = [
        'drawer_id' => 'integer',
        'order_id' => 'integer',
        'staff_id' => 'integer',
        'request_payload' => 'array',
        'response_payload' => 'array',
    ];

    public $relation = [
        'belongsTo' => [
            'drawer' => ['Admin\Models\Cash_drawers_model', 'foreignKey' => 'drawer_id'],
            'order' => ['Admin\Models\Orders_model', 'foreignKey' => 'order_id'],
        ],
    ];

    /**
     * Get response data as array
     */
    public function getResponsePayloadAttribute($value)
    {
        if (empty($value)) {
            return [];
        }

        if (is_string($value)) {
            return json_decode($value, true) ?: [];
        }

        return $value ?: [];
    }

    /**
     * Set response data
     */
    public function setResponsePayloadAttribute($value)
    {
        $this->attributes['response_payload'] = is_array($value) ? json_encode($value) : $value;
    }

    public function getRequestPayloadAttribute($value)
    {
        if (empty($value)) {
            return [];
        }

        if (is_string($value)) {
            return json_decode($value, true) ?: [];
        }

        return $value ?: [];
    }

    public function setRequestPayloadAttribute($value)
    {
        $this->attributes['request_payload'] = is_array($value) ? json_encode($value) : $value;
    }

    /**
     * Log drawer event
     */
    public static function logEvent($drawerId, $action, $data = [])
    {
        return static::create([
            'drawer_id' => $drawerId,
            'order_id' => $data['order_id'] ?? null,
            'staff_id' => $data['staff_id'] ?? null,
            'action' => $action,
            'status' => !empty($data['success']) ? 'success' : 'failed',
            'message' => $data['error_message'] ?? null,
            'request_payload' => [
                'location_id' => $data['location_id'] ?? null,
                'trigger_method' => $data['trigger_method'] ?? null,
            ],
            'response_payload' => $data['response_data'] ?? null,
        ]);
    }
}
