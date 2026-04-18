<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Staff_leaves_model extends Model
{
    protected $table = 'staff_leaves';
    protected $primaryKey = 'leave_id';
    public $timestamps = true;

    protected $fillable = [
        'staff_id',
        'leave_date',
        'leave_time',
        'leave_type',
        'status',
        'reason',
        'notes',
    ];

    protected $casts = [
        'leave_date' => 'date',
        'leave_time' => 'time',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
        ],
    ];
}

