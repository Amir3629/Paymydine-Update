<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Staff Attendance Model Class
 */
class Staff_attendance_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'staff_attendance';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'attendance_id';

    /**
     * @var array The model table column to convert to dates on insert/update
     */
    public $timestamps = true;

    protected $guarded = [];

    protected $casts = [
        'staff_id' => 'integer',
        'location_id' => 'integer',
        'device_id' => 'integer',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
            'location' => ['Admin\Models\Locations_model', 'foreignKey' => 'location_id'],
            'device' => ['Admin\Models\FingerDevices_model', 'foreignKey' => 'device_id'],
        ],
    ];

    /**
     * Scope a query to only include today's attendance
     */
    public function scopeToday($query)
    {
        return $query->whereDate('check_in_time', today());
    }

    /**
     * Scope a query to filter by staff ID
     */
    public function scopeByStaff($query, $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    /**
     * Scope a query to filter by location
     */
    public function scopeByLocation($query, $locationId)
    {
        return $query->where('location_id', $locationId);
    }

    /**
     * Get active check-ins (not checked out)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('check_out_time');
    }

    /**
     * Calculate hours worked
     */
    public function getHoursWorkedAttribute()
    {
        if (!$this->check_out_time) {
            return null;
        }

        $checkIn = \Carbon\Carbon::parse($this->check_in_time);
        $checkOut = \Carbon\Carbon::parse($this->check_out_time);

        return $checkIn->diffInHours($checkOut, true);
    }

    /**
     * Check if staff was late and calculate late time
     */
    public function checkAndRecordLateTime()
    {
        $staff = $this->staff;
        if (!$staff) {
            return;
        }

        // Get staff's schedule for the check-in date
        $schedule = $this->getStaffSchedule($staff->staff_id, $this->check_in_time);
        if (!$schedule || !$schedule->time_in) {
            return;
        }

        $checkInTime = \Carbon\Carbon::parse($this->check_in_time);
        $scheduledTime = \Carbon\Carbon::parse($this->check_in_time->format('Y-m-d') . ' ' . $schedule->time_in);

        // If check-in is after scheduled time, record late time
        if ($checkInTime->greaterThan($scheduledTime)) {
            $diff = $scheduledTime->diff($checkInTime);
            $duration = sprintf('%02d:%02d:%02d', $diff->h, $diff->i, $diff->s);

            \Admin\Models\Staff_latetimes_model::updateOrCreate(
                [
                    'staff_id' => $staff->staff_id,
                    'attendance_id' => $this->attendance_id,
                    'latetime_date' => $this->check_in_time->format('Y-m-d'),
                ],
                [
                    'duration' => $duration,
                ]
            );
        }
    }

    /**
     * Check if staff worked overtime and calculate overtime
     */
    public function checkAndRecordOvertime()
    {
        if (!$this->check_out_time) {
            return;
        }

        $staff = $this->staff;
        if (!$staff) {
            return;
        }

        // Get staff's schedule for the check-out date
        $schedule = $this->getStaffSchedule($staff->staff_id, $this->check_out_time);
        if (!$schedule || !$schedule->time_out) {
            return;
        }

        $checkOutTime = \Carbon\Carbon::parse($this->check_out_time);
        $scheduledTime = \Carbon\Carbon::parse($this->check_out_time->format('Y-m-d') . ' ' . $schedule->time_out);

        // If check-out is after scheduled time, record overtime
        if ($checkOutTime->greaterThan($scheduledTime)) {
            $diff = $scheduledTime->diff($checkOutTime);
            $duration = sprintf('%02d:%02d:%02d', $diff->h, $diff->i, $diff->s);

            \Admin\Models\Staff_overtimes_model::updateOrCreate(
                [
                    'staff_id' => $staff->staff_id,
                    'attendance_id' => $this->attendance_id,
                    'overtime_date' => $this->check_out_time->format('Y-m-d'),
                ],
                [
                    'duration' => $duration,
                ]
            );
        }
    }

    /**
     * Get staff schedule for a specific date
     */
    protected function getStaffSchedule($staffId, $date)
    {
        $dateStr = is_object($date) ? $date->format('Y-m-d') : \Carbon\Carbon::parse($date)->format('Y-m-d');
        
        // Get active schedule assignment for this staff and date
        $assignment = \Illuminate\Support\Facades\DB::table('staff_schedule_assignments')
            ->join('staff_schedules', 'staff_schedule_assignments.schedule_id', '=', 'staff_schedules.schedule_id')
            ->where('staff_schedule_assignments.staff_id', $staffId)
            ->where('staff_schedules.status', 1)
            ->where(function($query) use ($dateStr) {
                $query->whereNull('staff_schedule_assignments.effective_from')
                      ->orWhere('staff_schedule_assignments.effective_from', '<=', $dateStr);
            })
            ->where(function($query) use ($dateStr) {
                $query->whereNull('staff_schedule_assignments.effective_to')
                      ->orWhere('staff_schedule_assignments.effective_to', '>=', $dateStr);
            })
            ->select('staff_schedules.*')
            ->first();

        if ($assignment) {
            $schedule = new \Admin\Models\Staff_schedules_model();
            $schedule->schedule_id = $assignment->schedule_id;
            $schedule->name = $assignment->name;
            $schedule->time_in = $assignment->time_in;
            $schedule->time_out = $assignment->time_out;
            $schedule->status = $assignment->status;
            return $schedule;
        }

        return null;
    }
}

