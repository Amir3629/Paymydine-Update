<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Notification Recipients Model Class
 */
class Notification_recipients_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'ti_notification_recipients';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'recipient_id';

    /**
     * @var array The model table column to convert to dates on insert/update
     */
    public $timestamps = true;

    /**
     * The storage format of the model's date columns.
     *
     * @var string
     */
    protected $dateFormat = 'Y-m-d H:i:s';

    protected $guarded = [];

    protected $casts = [
        'notification_id' => 'integer',
        'staff_id' => 'integer',
        'read_at' => 'datetime',
    ];

    public $appends = ['time_ago', 'status_label'];

    public $relation = [
        'belongsTo' => [
            'notification' => 'Admin\Models\Notifications_model',
            'staff' => 'Admin\Models\Staffs_model',
        ],
    ];

    /**
     * Get the time ago attribute
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at ? $this->created_at->diffForHumans() : null;
    }

    /**
     * Get the status label attribute
     */
    public function getStatusLabelAttribute()
    {
        $labels = [
            'unread' => 'Unread',
            'read' => 'Read',
            'dismissed' => 'Dismissed'
        ];
        
        return $labels[$this->status] ?? 'Unknown';
    }

    /**
     * Scope to get recipients by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get unread recipients
     */
    public function scopeUnread($query)
    {
        return $query->where('status', 'unread');
    }

    /**
     * Scope to get recipients for a specific staff member
     */
    public function scopeForStaff($query, $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    /**
     * Mark recipient as read
     */
    public function markRead()
    {
        $this->update([
            'status' => 'read',
            'read_at' => now(),
        ]);
    }

    /**
     * Mark recipient as dismissed
     */
    public function markDismissed()
    {
        $this->update(['status' => 'dismissed']);
    }

    /**
     * Create a new notification recipient
     */
    public static function createRecipient($data)
    {
        return self::create([
            'notification_id' => $data['notification_id'],
            'staff_id' => $data['staff_id'],
            'role' => $data['role'],
            'status' => 'unread',
        ]);
    }
}