<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;
use Admin\Facades\AdminLocation;
use Illuminate\Support\Facades\DB;

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
    
    public $appends = ['total_tips', 'cash_tips', 'card_tips', 'tip_count'];
    
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
    
    /**
     * Get total tips amount from orders for this shift
     */
    public function getTotalTipsAttribute()
    {
        return $this->calculateTotalTips();
    }
    
    /**
     * Get cash tips amount from orders for this shift
     */
    public function getCashTipsAttribute()
    {
        return $this->calculateCashTips();
    }
    
    /**
     * Get card tips amount from orders for this shift
     */
    public function getCardTipsAttribute()
    {
        // Calculate directly using internal methods to avoid recursion
        $totalTips = $this->calculateTotalTips();
        $cashTips = $this->calculateCashTips();
        return max(0.00, $totalTips - $cashTips);
    }
    
    /**
     * Internal method to calculate total tips (used to avoid recursion)
     */
    protected function calculateTotalTips()
    {
        if (!$this->shift_date) {
            return 0.00;
        }
        
        $date = $this->shift_date instanceof \Carbon\Carbon 
            ? $this->shift_date->format('Y-m-d') 
            : (is_string($this->shift_date) ? $this->shift_date : date('Y-m-d', strtotime($this->shift_date)));
        
        $query = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.order_id', '=', 'o.order_id')
            ->where('ot.code', 'tip')
            ->whereDate('o.order_date', $date);
        
        if ($this->location_id) {
            $query->where('o.location_id', $this->location_id);
        }
        
        $result = $query->sum('ot.value');
        return (float) ($result ?? 0.00);
    }
    
    /**
     * Internal method to calculate cash tips (used to avoid recursion)
     */
    protected function calculateCashTips()
    {
        if (!$this->shift_date) {
            return 0.00;
        }
        
        $date = $this->shift_date instanceof \Carbon\Carbon 
            ? $this->shift_date->format('Y-m-d') 
            : (is_string($this->shift_date) ? $this->shift_date : date('Y-m-d', strtotime($this->shift_date)));
        
        $query = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.order_id', '=', 'o.order_id')
            ->join('order_totals as pm', function($join) {
                $join->on('pm.order_id', '=', 'o.order_id')
                     ->where('pm.code', '=', 'payment_method');
            })
            ->where('ot.code', 'tip')
            ->whereDate('o.order_date', $date)
            ->where(function($q) {
                $q->where('pm.value', 'like', '%cash%')
                  ->orWhere('pm.value', 'like', '%Cash%')
                  ->orWhere('pm.value', '=', 'cash');
            });
        
        if ($this->location_id) {
            $query->where('o.location_id', $this->location_id);
        }
        
        $result = $query->sum('ot.value');
        return (float) ($result ?? 0.00);
    }
    
    /**
     * Get total number of tip transactions for this shift
     */
    public function getTipCountAttribute()
    {
        if (!$this->shift_date) {
            return 0;
        }
        
        $date = $this->shift_date instanceof \Carbon\Carbon 
            ? $this->shift_date->format('Y-m-d') 
            : (is_string($this->shift_date) ? $this->shift_date : date('Y-m-d', strtotime($this->shift_date)));
        
        $query = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.order_id', '=', 'o.order_id')
            ->where('ot.code', 'tip')
            ->whereDate('o.order_date', $date);
        
        if ($this->location_id) {
            $query->where('o.location_id', $this->location_id);
        }
        
        $result = $query->count();
        return (int) ($result ?? 0);
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

