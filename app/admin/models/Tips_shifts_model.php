<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;
use Admin\Facades\AdminLocation;

class Tips_shifts_model extends Model
{
    protected $table = 'tips_shifts';
    
    protected $primaryKey = 'shift_id';
    
    public $timestamps = true;
    
    protected $fillable = ['shift_date', 'location_id', 'description', 'notes'];
    
    protected $casts = [
        'shift_date' => 'date',
        'location_id' => 'integer',
    ];
    
    public $relation = [
        'belongsTo' => [
            'location' => 'Admin\Models\Locations_model',
        ],
    ];
    
    public function location()
    {
        return $this->belongsTo('Admin\Models\Locations_model', 'location_id', 'location_id');
    }
    
    public static function getOrCreateShift($date, $locationId = null)
    {
        if (!$locationId) {
            $locationId = AdminLocation::getId();
        }
        
        return static::firstOrCreate(
            [
                'shift_date' => $date,
                'location_id' => $locationId,
            ],
            [
                'notes' => '',
            ]
        );
    }
    
    public function getLocationOptions()
    {
        return \Admin\Models\Locations_model::getDropdownOptions();
    }
    
    public function scopeWhereHasLocation($query, $locationId)
    {
        return $query->where('location_id', $locationId);
    }
    
    protected function beforeSave()
    {
        // Ensure shift_date is set - default to today if not provided
        if (empty($this->shift_date)) {
            $this->shift_date = date('Y-m-d');
        }
        
        // Ensure location_id is set - default to current location if not provided
        if (empty($this->location_id)) {
            $this->location_id = AdminLocation::getId() ?: 1;
        }
    }
}

