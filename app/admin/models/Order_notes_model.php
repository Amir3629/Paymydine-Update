<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;
use Illuminate\Support\Facades\DB;

/**
 * Order Notes Model Class
 */
class Order_notes_model extends Model
{
    use Locationable;

    /**
     * @var string The database table name
     */
    protected $table = 'order_notes';

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
        'order_id' => 'integer',
        'staff_id' => 'integer',
    ];

    public $appends = ['time_ago', 'date_added_since', 'staff_name'];

    public $relation = [
        'belongsTo' => [
            'order' => ['Admin\Models\Orders_model', 'foreignKey' => 'order_id'],
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
        ],
    ];
    
    /**
     * Get location through order relationship
     * This is required by the Locationable trait
     * Order notes don't have a direct location_id, so we get it through the order
     * Note: This is a placeholder relationship for trait compatibility
     * The actual location filtering is handled in applyLocationScope override
     */
    public function location()
    {
        // Return a belongsTo relationship for Locationable trait compatibility
        // The actual location comes through $this->order->location
        // Location filtering is handled in the applyLocationScope override
        return $this->belongsTo(
            'Admin\Models\Locations_model',
            'order_id', // Placeholder - not actually used for queries
            'location_id'
        );
    }
    
    /**
     * Override applyLocationScope to handle location filtering through order
     * This is needed because order_notes doesn't have a direct location_id column
     */
    protected function applyLocationScope($builder, $userLocation)
    {
        $locationId = is_object($userLocation)
            ? $userLocation->getKey()
            : $userLocation;

        if (!is_array($locationId))
            $locationId = [$locationId];

        // Filter order_notes by location through the order relationship
        // This is the actual implementation since order_notes.location_id doesn't exist
        $builder->whereHas('order', function($query) use ($locationId) {
            $query->whereIn('location_id', $locationId);
        });
    }
    
    /**
     * Override locationableIsSingleRelationType to return true
     * This tells the trait that location is a single relation (not many-to-many)
     */
    public function locationableIsSingleRelationType()
    {
        return true;
    }

    /**
     * Get the time ago attribute
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at ? $this->created_at->diffForHumans() : null;
    }

    /**
     * Get the date added since attribute (for datatable)
     */
    public function getDateAddedSinceAttribute()
    {
        return $this->created_at 
            ? $this->created_at->isoFormat(lang('system::lang.moment.date_time_format_short'))
            : null;
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
     * Scope to get notes for a specific order
     */
    public function scopeForOrder($query, $orderId)
    {
        return $query->where('order_id', $orderId);
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

