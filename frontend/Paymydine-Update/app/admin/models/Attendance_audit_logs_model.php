<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Attendance Audit Logs Model
 * Tracks all changes made to attendance records
 */
class Attendance_audit_logs_model extends Model
{
    protected $table = 'attendance_audit_logs';

    protected $primaryKey = 'audit_id';

    public $timestamps = true;

    protected $fillable = [
        'attendance_id',
        'action',
        'changed_by',
        'old_values',
        'new_values',
        'reason',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'attendance_id' => 'integer',
        'changed_by' => 'integer',
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public $relation = [
        'belongsTo' => [
            'attendance' => ['Admin\Models\Staff_attendance_model', 'foreignKey' => 'attendance_id'],
            'changedBy' => ['Admin\Models\Staffs_model', 'foreignKey' => 'changed_by'],
        ],
    ];

    /**
     * Scope: By attendance
     */
    public function scopeByAttendance($query, $attendanceId)
    {
        return $query->where('attendance_id', $attendanceId);
    }

    /**
     * Scope: By action
     */
    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Recent audits
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get changed fields
     * @return array
     */
    public function getChangedFieldsAttribute(): array
    {
        if (!$this->old_values || !$this->new_values) {
            return [];
        }

        $changed = [];
        foreach ($this->new_values as $key => $newValue) {
            $oldValue = $this->old_values[$key] ?? null;
            if ($oldValue !== $newValue) {
                $changed[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue
                ];
            }
        }

        return $changed;
    }
}

