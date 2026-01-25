<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;

/**
 * Valet Requests Model Class
 */
class Valet_requests_model extends Model
{
    use Locationable;

    /**
     * @var string The database table name
     */
    protected $table = 'ti_valet_requests';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'request_id';

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
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled'
        ];
        
        return $labels[$this->status] ?? 'Unknown';
    }

    /**
     * Scope to get requests by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get pending requests
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get requests for a specific table
     */
    public function scopeForTable($query, $tableId)
    {
        return $query->where('table_id', $tableId);
    }

    /**
     * Mark request as acknowledged
     */
    public function markAcknowledged()
    {
        $this->update(['status' => 'acknowledged']);
    }

    /**
     * Mark request as in progress
     */
    public function markInProgress()
    {
        $this->update(['status' => 'in_progress']);
    }

    /**
     * Mark request as completed
     */
    public function markCompleted()
    {
        $this->update(['status' => 'completed']);
    }

    /**
     * Mark request as cancelled
     */
    public function markCancelled()
    {
        $this->update(['status' => 'cancelled']);
    }

    /**
     * Create a new valet request
     */
    public static function createRequest($data)
    {
        return self::create([
            'table_id' => $data['table_id'],
            'customer_name' => $data['customer_name'],
            'car_make' => $data['car_make'],
            'license_plate' => $data['license_plate'],
            'status' => 'pending',
        ]);
    }
}