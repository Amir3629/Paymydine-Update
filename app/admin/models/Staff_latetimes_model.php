<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Staff_latetimes_model extends Model
{
    protected $table = 'staff_latetimes';
    protected $primaryKey = 'latetime_id';
    public $timestamps = true;

    protected $fillable = [
        'staff_id',
        'attendance_id',
        'duration',
        'latetime_date',
        'notes',
    ];

    protected $casts = [
        'latetime_date' => 'date',
        'duration' => 'string',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
            'attendance' => ['Admin\Models\Staff_attendance_model', 'foreignKey' => 'attendance_id'],
        ],
    ];
}

