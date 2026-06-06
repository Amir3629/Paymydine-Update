<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * FingerDevices Model Class
 * Manages ZKTeco biometric devices
 */
class FingerDevices_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'finger_devices';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'device_id';

    /**
     * @var array The model table column to convert to dates on insert/update
     */
    public $timestamps = true;

    protected $guarded = [];

    protected $fillable = [
        'name',
        'ip',
        'port',
        'serial_number',
        'description',
        'status',
        'location_id',
    ];

    protected $casts = [
        'port' => 'integer',
        'status' => 'boolean',
        'location_id' => 'integer',
    ];

    public $relation = [
        'belongsTo' => [
            'location' => ['Admin\Models\Locations_model', 'foreignKey' => 'location_id'],
        ],
        'hasMany' => [
            'attendances' => ['Admin\Models\Staff_attendance_model', 'foreignKey' => 'device_id'],
        ],
    ];

    /**
     * Scope a query to only include active devices
     */
    public function scopeIsActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Get device connection string
     */
    public function getConnectionString()
    {
        return $this->ip . ':' . ($this->port ?? 4370);
    }

    /**
     * Test device connectivity
     */
    public function testConnection()
    {
        $helper = new \App\Helpers\FingerHelper();
        return $helper->testConnection($this->ip, $this->port ?? 4370);
    }
}

