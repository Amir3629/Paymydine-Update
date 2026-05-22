<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Menu_images_model extends Model
{
    protected $table = 'menu_images';

    protected $fillable = [
        'menu_id',
        'image_path',
        'sort_order',
    ];
}

