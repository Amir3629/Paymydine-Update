<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Staff_schedules_model extends Model
{
    protected $table = 'staff_schedules';
    protected $primaryKey = 'schedule_id';
    public $timestamps = true;

    protected $fillable = [
        'name',
        'time_in',
        'time_out',
        'status',
    ];

    protected $casts = [
        'status' => 'boolean',
        'time_in' => 'time',
        'time_out' => 'time',
    ];

    public $relation = [
        'belongsToMany' => [
            'staffs' => ['Admin\Models\Staffs_model', 'table' => 'staff_schedule_assignments', 'pivotKey' => 'schedule_id', 'relatedPivotKey' => 'staff_id'],
        ],
    ];
}

