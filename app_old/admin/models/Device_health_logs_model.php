<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Device Health Logs Model
 * Monitors device status and operational health
 */
class Device_health_logs_model extends Model
{
    protected $table = 'device_health_logs';

    protected $primaryKey = 'health_log_id';

    public $timestamps = true;

    protected $fillable = [
        'device_id',
        'status',
        'response_time',
        'users_count',
        'attendance_count',
        'memory_usage',
        'disk_usage',
        'firmware_version',
        'error_details',
        'device_info',
        'checked_at',
    ];

    protected $casts = [
        'device_id' => 'integer',
        'response_time' => 'integer',
        'users_count' => 'integer',
        'attendance_count' => 'integer',
        'memory_usage' => 'decimal:2',
        'disk_usage' => 'decimal:2',
        'device_info' => 'array',
        'checked_at' => 'datetime',
    ];

    public $relation = [
        'belongsTo' => [
            'device' => ['Admin\Models\FingerDevices_model', 'foreignKey' => 'device_id'],
        ],
    ];

    /**
     * Scope: By device
     */
    public function scopeByDevice($query, $deviceId)
    {
        return $query->where('device_id', $deviceId);
    }

    /**
     * Scope: Online devices
     */
    public function scopeOnline($query)
    {
        return $query->where('status', 'online');
    }

    /**
     * Scope: Offline devices
     */
    public function scopeOffline($query)
    {
        return $query->where('status', 'offline');
    }

    /**
     * Scope: Recent checks
     */
    public function scopeRecent($query, $hours = 24)
    {
        return $query->where('checked_at', '>=', now()->subHours($hours));
    }

    /**
     * Scope: Latest check for each device
     */
    public function scopeLatestPerDevice($query)
    {
        return $query->whereIn('health_log_id', function($q) {
            $q->selectRaw('MAX(health_log_id)')
              ->from('device_health_logs')
              ->groupBy('device_id');
        });
    }

    /**
     * Check if device is healthy
     * @return bool
     */
    public function isHealthy(): bool
    {
        return $this->status === 'online' && 
               ($this->response_time === null || $this->response_time < 5000) &&
               ($this->memory_usage === null || $this->memory_usage < 90) &&
               ($this->disk_usage === null || $this->disk_usage < 90);
    }
}

