<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Menu_combo_items_model extends Model
{
    protected $table = 'menu_combo_items';
    
    protected $primaryKey = 'id';
    
    public $timestamps = true;
    
    protected $fillable = ['combo_id', 'menu_id', 'quantity'];
    
    protected $casts = [
        'combo_id' => 'integer',
        'menu_id' => 'integer',
        'quantity' => 'integer',
    ];
    
    public $relation = [
        'belongsTo' => [
            'combo' => ['Admin\Models\Menu_combos_model', 'foreignKey' => 'combo_id'],
            'menu' => ['Admin\Models\Menus_model', 'foreignKey' => 'menu_id'],
        ],
    ];
    
    public function combo()
    {
        return $this->belongsTo('Admin\Models\Menu_combos_model', 'combo_id', 'combo_id');
    }
    
    public function menu()
    {
        return $this->belongsTo('Admin\Models\Menus_model', 'menu_id', 'menu_id');
    }
}

