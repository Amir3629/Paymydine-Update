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
        'location_id',
        'action',
        'trigger_method',
        'success',
        'error_message',
        'response_data',
    ];

    protected $casts = [
        'drawer_id' => 'integer',
        'order_id' => 'integer',
        'location_id' => 'integer',
        'success' => 'boolean',
        'response_data' => 'array',
    ];

    public $relation = [
        'belongsTo' => [
            'drawer' => ['Admin\Models\Cash_drawers_model', 'foreignKey' => 'drawer_id'],
            'order' => ['Admin\Models\Orders_model', 'foreignKey' => 'order_id'],
            'location' => ['Admin\Models\Locations_model', 'foreignKey' => 'location_id'],
        ],
    ];

    /**
     * Get response data as array
     */
    public function getResponseDataAttribute($value)
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
    public function setResponseDataAttribute($value)
    {
        $this->attributes['response_data'] = is_array($value) ? json_encode($value) : $value;
    }

    /**
     * Log drawer event
     */
    public static function logEvent($drawerId, $action, $data = [])
    {
        return static::create([
            'drawer_id' => $drawerId,
            'order_id' => $data['order_id'] ?? null,
            'location_id' => $data['location_id'] ?? null,
            'action' => $action,
            'trigger_method' => $data['trigger_method'] ?? null,
            'success' => $data['success'] ?? true,
            'error_message' => $data['error_message'] ?? null,
            'response_data' => $data['response_data'] ?? null,
        ]);
    }
}
