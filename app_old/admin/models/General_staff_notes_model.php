<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;

/**
 * General Staff Notes Model Class
 */
class General_staff_notes_model extends Model
{
    use Locationable;

    /**
     * @var string The database table name
     */
    protected $table = 'general_staff_notes';

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
        'staff_id' => 'integer',
    ];

    public $appends = ['time_ago', 'staff_name'];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
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
     * Get the staff name attribute
     */
    public function getStaffNameAttribute()
    {
        return $this->staff ? $this->staff->staff_name : 'System';
    }

    /**
     * Scope to get notes by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get active notes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Mark note as archived
     */
    public function archive()
    {
        $this->status = 'archived';
        return $this->save();
    }
}

