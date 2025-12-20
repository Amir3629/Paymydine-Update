<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Igniter\Flame\Database\Attach\HasMedia;
use Igniter\Flame\Database\Model;

class Menu_combos_model extends Model
{
    use Locationable;
    use HasMedia;

    const LOCATIONABLE_RELATION = 'locations';

    protected $table = 'menu_combos';
    
    protected $primaryKey = 'combo_id';
    
    public $timestamps = true;
    
    protected $fillable = [
        'combo_name',
        'combo_description',
        'combo_price',
        'location_id',
        'combo_status',
        'combo_priority',
        'thumb',
    ];
    
    protected $guarded = [];
    
    protected $casts = [
        'combo_price' => 'float',
        'location_id' => 'integer',
        'combo_status' => 'boolean',
        'combo_priority' => 'integer',
    ];
    
    public $relation = [
        'hasMany' => [
            'combo_items' => ['Admin\Models\Menu_combo_items_model', 'foreignKey' => 'combo_id', 'delete' => true],
        ],
        'morphToMany' => [
            'locations' => ['Admin\Models\Locations_model', 'name' => 'locationable'],
        ],
    ];
    
    public $mediable = ['thumb'];
    
    public function combo_items()
    {
        return $this->hasMany('Admin\Models\Menu_combo_items_model', 'combo_id', 'combo_id');
    }
    
    public function menus()
    {
        return $this->belongsToMany(
            'Admin\Models\Menus_model',
            'menu_combo_items',
            'combo_id',
            'menu_id'
        )->withPivot('quantity');
    }
    
    public function getTotalItemsAttribute()
    {
        return $this->combo_items->sum('quantity');
    }
    
    public function getItemsCountAttribute()
    {
        return $this->combo_items->count() . ' items';
    }
    
    public function getFormattedItemsAttribute()
    {
        $this->load('combo_items.menu');
        $itemsList = [];
        foreach ($this->combo_items as $item) {
            $qty = $item->quantity > 1 ? " (x{$item->quantity})" : '';
            $itemsList[] = ($item->menu ? $item->menu->menu_name : 'Unknown') . $qty;
        }
        return !empty($itemsList) ? "Includes: " . implode(", ", $itemsList) : '';
    }
}

