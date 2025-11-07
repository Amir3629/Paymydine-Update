<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Carbon\Carbon;
use Igniter\Flame\Database\Model;

/**
 * Notifications Model Class
 */
class Notifications_model extends Model
{
    use Locationable;

    /**
     * @var string The database table name
     */
    protected $table = 'notifications';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'notification_id';

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
        'tenant_id' => 'integer',
        'table_id' => 'integer',
        'acted_by' => 'integer',
        'payload' => 'array',
        'seen_at' => 'datetime',
        'acted_at' => 'datetime',
    ];

    public $appends = ['time_ago', 'type_icon', 'status_label'];

    public $relation = [
        'belongsTo' => [
            'table' => 'Admin\Models\Tables_model',
            'acted_by_staff' => 'Admin\Models\Staffs_model',
        ],
        'hasMany' => [
            'recipients' => 'Admin\Models\Notification_recipients_model',
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
     * Get the type icon attribute
     */
    public function getTypeIconAttribute()
    {
        $icons = [
            'waiter_call' => 'bell',
            'valet_request' => 'car',
            'table_note' => 'note',
            'order_ready' => 'check-circle',
            'payment_issue' => 'alert-circle',
            'system_alert' => 'info'
        ];
        
        return $icons[$this->type] ?? 'bell';
    }

    /**
     * Get the status label attribute
     */
    public function getStatusLabelAttribute()
    {
        $labels = [
            'new' => 'New',
            'seen' => 'Seen',
            'in_progress' => 'In Progress',
            'resolved' => 'Resolved'
        ];
        
        return $labels[$this->status] ?? 'Unknown';
    }

    /**
     * Scope to get notifications by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get notifications by type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get notifications for a specific table
     */
    public function scopeForTable($query, $tableId)
    {
        return $query->where('table_id', $tableId);
    }

    /**
     * Scope to get new notifications
     */
    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    /**
     * Scope to get notifications by priority
     */
    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Mark notification as seen
     */
    public function markAsSeen($staffId = null)
    {
        $this->update([
            'status' => 'seen',
            'seen_at' => now(),
            'acted_by' => $staffId,
            'acted_at' => now(),
        ]);
    }

    /**
     * Mark notification as in progress
     */
    public function markInProgress($staffId = null)
    {
        $this->update([
            'status' => 'in_progress',
            'acted_by' => $staffId,
            'acted_at' => now(),
        ]);
    }

    /**
     * Mark notification as resolved
     */
    public function markResolved($staffId = null)
    {
        $this->update([
            'status' => 'resolved',
            'acted_by' => $staffId,
            'acted_at' => now(),
        ]);
    }

    /**
     * Create a new notification
     */
    public static function createNotification($data)
    {
        return self::create([
            'tenant_id' => $data['tenant_id'],
            'type' => $data['type'],
            'title' => $data['title'],
            'message' => $data['message'],
            'table_id' => $data['table_id'] ?? null,
            'table_name' => $data['table_name'] ?? null,
            'payload' => $data['payload'] ?? null,
            'status' => $data['status'] ?? 'new',
            'priority' => $data['priority'] ?? 'medium',
        ]);
    }

    /**
     * Get notification counts by status
     */
    public static function getCountsByStatus($tenantId = null)
    {
        $query = self::query();
        
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }
        
        return $query->selectRaw('
            SUM(CASE WHEN status = "new" THEN 1 ELSE 0 END) as new,
            SUM(CASE WHEN status = "seen" THEN 1 ELSE 0 END) as seen,
            SUM(CASE WHEN status = "in_progress" THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = "resolved" THEN 1 ELSE 0 END) as resolved,
            COUNT(*) as total
        ')->first();
    }
}