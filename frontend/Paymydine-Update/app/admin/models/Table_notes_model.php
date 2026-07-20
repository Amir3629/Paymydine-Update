<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;

/**
 * Table Notes Model Class
 */
class Table_notes_model extends Model
{
    use Locationable;

    /**
     * @var string The database table name
     */
    protected $table = 'ti_table_notes';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'note_id';

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
        'timestamp' => 'datetime',
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
            'new' => 'New',
            'read' => 'Read',
            'archived' => 'Archived'
        ];
        
        return $labels[$this->status] ?? 'Unknown';
    }

    /**
     * Scope to get notes by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get new notes
     */
    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    /**
     * Scope to get notes for a specific table
     */
    public function scopeForTable($query, $tableId)
    {
        return $query->where('table_id', $tableId);
    }

    /**
     * Mark note as read
     */
    public function markRead()
    {
        $this->update(['status' => 'read']);
    }

    /**
     * Mark note as archived
     */
    public function markArchived()
    {
        $this->update(['status' => 'archived']);
    }

    /**
     * Create a new table note
     */
    public static function createNote($data)
    {
        return self::create([
            'table_id' => $data['table_id'],
            'note' => $data['note'],
            'timestamp' => $data['timestamp'],
            'status' => 'new',
        ]);
    }
}