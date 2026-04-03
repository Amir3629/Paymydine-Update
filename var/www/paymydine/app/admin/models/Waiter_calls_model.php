<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;

/**
 * Waiter Calls Model Class
 */
class Waiter_calls_model extends Model
{
    use Locationable;

    /**
     * @var string The database table name
     */
    protected $table = 'ti_waiter_calls';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'call_id';

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
        'table_id' => 'integer',
    ];

    public $appends = ['time_ago', 'status_label'];

    public $relation = [
        'belongsTo' => [
            'table' => 'Admin\Models\Tables_model',
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
            'pending' => 'Pending',
            'acknowledged' => 'Acknowledged',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled'
        ];
        
        return $labels[$this->status] ?? 'Unknown';
    }

    /**
     * Scope to get calls by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get pending calls
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get calls for a specific table
     */
    public function scopeForTable($query, $tableId)
    {
        return $query->where('table_id', $tableId);
    }

    /**
     * Mark call as acknowledged
     */
    public function markAcknowledged()
    {
        $this->update(['status' => 'acknowledged']);
    }

    /**
     * Mark call as completed
     */
    public function markCompleted()
    {
        $this->update(['status' => 'completed']);
    }

    /**
     * Mark call as cancelled
     */
    public function markCancelled()
    {
        $this->update(['status' => 'cancelled']);
    }

    /**
     * Create a new waiter call
     */
    public static function createCall($data)
    {
        return self::create([
            'table_id' => $data['table_id'],
            'message' => $data['message'],
            'status' => 'pending',
        ]);
    }
}