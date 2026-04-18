<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Staff_overtimes_model extends Model
{
    protected $table = 'staff_overtimes';
    protected $primaryKey = 'overtime_id';
    public $timestamps = true;

    protected $fillable = [
        'staff_id',
        'attendance_id',
        'duration',
        'overtime_date',
        'notes',
    ];

    protected $casts = [
        'overtime_date' => 'date',
        'duration' => 'string',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
            'attendance' => ['Admin\Models\Staff_attendance_model', 'foreignKey' => 'attendance_id'],
        ],
    ];
}

