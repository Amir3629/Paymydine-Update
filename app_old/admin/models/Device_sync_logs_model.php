<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Device Sync Logs Model
 * Tracks all device sync operations
 */
class Device_sync_logs_model extends Model
{
    protected $table = 'device_sync_logs';

    protected $primaryKey = 'sync_log_id';

    public $timestamps = true;

    protected $fillable = [
        'device_id',
        'sync_type',
        'records_synced',
        'records_failed',
        'status',
        'error_message',
        'sync_details',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'device_id' => 'integer',
        'records_synced' => 'integer',
        'records_failed' => 'integer',
        'sync_details' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
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
     * Scope: Successful syncs
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope: Failed syncs
     */
    public function scopeFailed($query)
    {
        return $query->whereIn('status', ['failed', 'partial']);
    }

    /**
     * Scope: Recent logs
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Calculate duration in seconds
     * @return int|null
     */
    public function getDurationAttribute()
    {
        if ($this->started_at && $this->completed_at) {
            return $this->completed_at->diffInSeconds($this->started_at);
        }
        return null;
    }

    /**
     * Get success rate percentage
     * @return float|null
     */
    public function getSuccessRateAttribute()
    {
        $total = $this->records_synced + $this->records_failed;
        if ($total > 0) {
            return round(($this->records_synced / $total) * 100, 2);
        }
        return null;
    }
}

