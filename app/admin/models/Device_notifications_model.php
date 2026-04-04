<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Device Notifications Model
 * Stores notifications and alerts for device events
 */
class Device_notifications_model extends Model
{
    protected $table = 'device_notifications';

    protected $primaryKey = 'notification_id';

    public $timestamps = true;

    protected $fillable = [
        'device_id',
        'type',
        'title',
        'message',
        'severity',
        'metadata',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'device_id' => 'integer',
        'metadata' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public $relation = [
        'belongsTo' => [
            'device' => ['Admin\Models\FingerDevices_model', 'foreignKey' => 'device_id'],
        ],
    ];

    /**
     * Scope: Unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope: By device
     */
    public function scopeByDevice($query, $deviceId)
    {
        return $query->where('device_id', $deviceId);
    }

    /**
     * Scope: By severity
     */
    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope: Critical notifications
     */
    public function scopeCritical($query)
    {
        return $query->whereIn('severity', ['critical', 'error']);
    }

    /**
     * Mark notification as read
     * @return bool
     */
    public function markAsRead(): bool
    {
        $this->is_read = true;
        $this->read_at = now();
        return $this->save();
    }

    /**
     * Get severity color class
     * @return string
     */
    public function getSeverityColorAttribute(): string
    {
        return match($this->severity) {
            'critical' => 'danger',
            'error' => 'danger',
            'warning' => 'warning',
            'info' => 'info',
            default => 'secondary'
        };
    }

    /**
     * Get severity icon
     * @return string
     */
    public function getSeverityIconAttribute(): string
    {
        return match($this->severity) {
            'critical' => 'fa-exclamation-triangle',
            'error' => 'fa-times-circle',
            'warning' => 'fa-exclamation-circle',
            'info' => 'fa-info-circle',
            default => 'fa-bell'
        };
    }
}

