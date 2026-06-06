<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Models\Staffs_model;
use Admin\Models\Staff_attendance_model;
use Admin\Models\Staff_device_mappings_model;
use Admin\Models\Attendance_audit_logs_model;
use Admin\Models\Device_sync_logs_model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Attendance Tracking Service
 * Handles real-time attendance check-in/check-out from biometric devices
 * Processes attendance data with validation, late time, and overtime calculations
 */
class AttendanceTrackingService
{
    /**
     * Process check-in/check-out from device
     * @param FingerDevices_model $device
     * @param int $userId Device user ID (staff_id)
     * @param string $timestamp
     * @param string $verificationType
     * @return array ['success' => bool, 'action' => 'check_in'|'check_out', 'attendance_id' => int]
     */
    public function processAttendance(FingerDevices_model $device, int $userId, string $timestamp, string $verificationType = 'fingerprint'): array
    {
        DB::beginTransaction();

        try {
            // Find staff member
            $staff = Staffs_model::find($userId);
            if (!$staff) {
                throw new \Exception('Staff member not found');
            }

            // Check if staff is enabled
            if (!$staff->staff_status) {
                throw new \Exception('Staff member is disabled');
            }

            // Get attendance date
            $attendanceDate = date('Y-m-d', strtotime($timestamp));
            $attendanceTime = date('H:i:s', strtotime($timestamp));

            // Check if already checked in today
            $existingAttendance = Staff_attendance_model::where('staff_id', $staff->staff_id)
                ->whereDate('check_in_time', $attendanceDate)
                ->whereNull('check_out_time')
                ->first();

            if ($existingAttendance) {
                // Check out
                $result = $this->processCheckOut($existingAttendance, $timestamp, $device, $verificationType);
                $action = 'check_out';
            } else {
                // Check in
                $result = $this->processCheckIn($staff, $timestamp, $device, $verificationType);
                $action = 'check_in';
            }

            DB::commit();

            return [
                'success' => true,
                'action' => $action,
                'attendance_id' => $result['attendance_id'],
                'staff' => [
                    'staff_id' => $staff->staff_id,
                    'staff_name' => $staff->staff_name,
                ],
                'timestamp' => $timestamp,
                'message' => $action === 'check_in' ? 'Checked in successfully' : 'Checked out successfully'
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to process attendance', [
                'device_id' => $device->device_id,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process check-in
     * @param Staffs_model $staff
     * @param string $timestamp
     * @param FingerDevices_model $device
     * @param string $verificationType
     * @return array
     */
    protected function processCheckIn(Staffs_model $staff, string $timestamp, FingerDevices_model $device, string $verificationType): array
    {
        // Create attendance record
        $attendance = Staff_attendance_model::create([
            'staff_id' => $staff->staff_id,
            'check_in_time' => $timestamp,
            'location_id' => $device->location_id,
            'device_id' => $device->device_id,
            'device_type' => $device->device_type,
            'verification_method' => $verificationType,
            'status' => 'checked_in',
            'timezone' => config('app.timezone'),
        ]);

        // Check for late arrival
        $this->checkLateArrival($attendance);

        // Create audit log
        Attendance_audit_logs_model::create([
            'attendance_id' => $attendance->attendance_id,
            'action' => 'created',
            'new_values' => $attendance->toArray(),
            'ip_address' => request()->ip(),
        ]);

        Log::info('Staff checked in', [
            'staff_id' => $staff->staff_id,
            'device_id' => $device->device_id,
            'check_in_time' => $timestamp
        ]);

        return ['attendance_id' => $attendance->attendance_id];
    }

    /**
     * Process check-out
     * @param Staff_attendance_model $attendance
     * @param string $timestamp
     * @param FingerDevices_model $device
     * @param string $verificationType
     * @return array
     */
    protected function processCheckOut(Staff_attendance_model $attendance, string $timestamp, FingerDevices_model $device, string $verificationType): array
    {
        $oldValues = $attendance->toArray();

        // Update attendance record
        $attendance->check_out_time = $timestamp;
        $attendance->status = 'checked_out';
        $attendance->hours_worked = $this->calculateHoursWorked($attendance->check_in_time, $timestamp);
        $attendance->save();

        // Check for overtime
        $this->checkOvertime($attendance);

        // Create audit log
        Attendance_audit_logs_model::create([
            'attendance_id' => $attendance->attendance_id,
            'action' => 'updated',
            'old_values' => $oldValues,
            'new_values' => $attendance->toArray(),
            'ip_address' => request()->ip(),
        ]);

        Log::info('Staff checked out', [
            'staff_id' => $attendance->staff_id,
            'device_id' => $device->device_id,
            'check_out_time' => $timestamp,
            'hours_worked' => $attendance->hours_worked
        ]);

        return ['attendance_id' => $attendance->attendance_id];
    }

    /**
     * Sync attendance from device
     * @param FingerDevices_model $device
     * @param \DateTime|null $since
     * @return array
     */
    public function syncAttendanceFromDevice(FingerDevices_model $device, ?\DateTime $since = null): array
    {
        $syncLog = Device_sync_logs_model::create([
            'device_id' => $device->device_id,
            'sync_type' => 'attendance_sync',
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        try {
            $driver = DeviceFactory::createDriver($device);
            
            if (!$driver) {
                throw new \Exception('Could not create device driver');
            }

            if (!$driver->connect()) {
                throw new \Exception('Could not connect to device');
            }

            // Get attendance records from device
            $attendanceData = $driver->getAttendance($since);
            $driver->disconnect();

            if (empty($attendanceData)) {
                $syncLog->update([
                    'status' => 'success',
                    'records_synced' => 0,
                    'completed_at' => now(),
                ]);

                return [
                    'success' => true,
                    'synced' => 0,
                    'failed' => 0,
                    'message' => 'No new attendance records'
                ];
            }

            $synced = 0;
            $failed = 0;
            $errors = [];

            foreach ($attendanceData as $record) {
                try {
                    $userId = $record['id'] ?? null;
                    $timestamp = $record['timestamp'] ?? null;
                    $type = $record['type'] ?? 0; // 0 = in, 1 = out, 255 = attendance
                    $verifyType = $this->mapVerificationType($record['state'] ?? 1);

                    if (!$userId || !$timestamp) {
                        continue;
                    }

                    $result = $this->processAttendance($device, $userId, $timestamp, $verifyType);
                    
                    if ($result['success']) {
                        $synced++;
                    } else {
                        $failed++;
                        $errors[] = $result['error'] ?? 'Unknown error';
                    }

                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = $e->getMessage();
                    Log::warning('Failed to process attendance record', [
                        'device_id' => $device->device_id,
                        'record' => $record,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $syncLog->update([
                'status' => $failed > 0 ? 'partial' : 'success',
                'records_synced' => $synced,
                'records_failed' => $failed,
                'sync_details' => [
                    'total_records' => count($attendanceData),
                    'errors' => $errors
                ],
                'completed_at' => now(),
            ]);

            // Update device last sync time
            $device->update([
                'last_sync_at' => now(),
                'connection_status' => 'online',
                'failed_connection_attempts' => 0,
            ]);

            return [
                'success' => true,
                'synced' => $synced,
                'failed' => $failed,
                'message' => "Synced {$synced} records, {$failed} failed"
            ];

        } catch (\Exception $e) {
            $syncLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            // Update device failed attempts
            $device->increment('failed_connection_attempts');
            if ($device->failed_connection_attempts >= 3) {
                $device->update(['connection_status' => 'offline']);
            }

            Log::error('Failed to sync attendance from device', [
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'synced' => 0,
                'failed' => 0,
                'message' => 'Sync failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Auto check-out staff who forgot to check out
     * @param int $hoursThreshold
     * @return array
     */
    public function autoCheckoutForgottenStaff(int $hoursThreshold = 12): array
    {
        $cutoffTime = now()->subHours($hoursThreshold);

        $forgottenAttendances = Staff_attendance_model::whereNull('check_out_time')
            ->where('check_in_time', '<', $cutoffTime)
            ->get();

        $checkedOut = 0;

        foreach ($forgottenAttendances as $attendance) {
            try {
                // Auto check-out at end of expected shift or 8 hours after check-in
                $autoCheckoutTime = $attendance->check_in_time->copy()->addHours(8);
                
                $attendance->check_out_time = $autoCheckoutTime;
                $attendance->status = 'auto_checkout';
                $attendance->hours_worked = $this->calculateHoursWorked($attendance->check_in_time, $autoCheckoutTime);
                $attendance->notes = ($attendance->notes ?? '') . "\nAuto checked-out (forgot to check out)";
                $attendance->save();

                // Create audit log
                Attendance_audit_logs_model::create([
                    'attendance_id' => $attendance->attendance_id,
                    'action' => 'auto_checkout',
                    'reason' => 'Staff forgot to check out - auto checkout after ' . $hoursThreshold . ' hours',
                    'new_values' => $attendance->toArray(),
                ]);

                $checkedOut++;

                Log::info('Auto checked-out staff', [
                    'attendance_id' => $attendance->attendance_id,
                    'staff_id' => $attendance->staff_id,
                    'check_in_time' => $attendance->check_in_time,
                    'auto_checkout_time' => $autoCheckoutTime
                ]);

            } catch (\Exception $e) {
                Log::error('Failed to auto checkout staff', [
                    'attendance_id' => $attendance->attendance_id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'success' => true,
            'checked_out' => $checkedOut,
            'message' => "Auto checked-out {$checkedOut} staff members"
        ];
    }

    /**
     * Calculate hours worked
     * @param \DateTime|string $checkIn
     * @param \DateTime|string $checkOut
     * @return float
     */
    protected function calculateHoursWorked($checkIn, $checkOut): float
    {
        $checkInTime = is_string($checkIn) ? new \DateTime($checkIn) : $checkIn;
        $checkOutTime = is_string($checkOut) ? new \DateTime($checkOut) : $checkOut;

        $diff = $checkOutTime->getTimestamp() - $checkInTime->getTimestamp();
        return round($diff / 3600, 2); // Convert seconds to hours
    }

    /**
     * Check for late arrival
     * @param Staff_attendance_model $attendance
     */
    protected function checkLateArrival(Staff_attendance_model $attendance): void
    {
        // TODO: Implement late arrival logic based on schedule
        // For now, simplified version
        $schedule = $this->getStaffSchedule($attendance->staff_id);
        
        if ($schedule && isset($schedule['time_in'])) {
            $scheduledTime = strtotime(date('Y-m-d') . ' ' . $schedule['time_in']);
            $actualTime = strtotime($attendance->check_in_time);
            
            $gracePeriod = 5 * 60; // 5 minutes grace period
            $lateSeconds = $actualTime - $scheduledTime - $gracePeriod;
            
            if ($lateSeconds > 0) {
                $attendance->is_late = true;
                $attendance->late_minutes = ceil($lateSeconds / 60);
                $attendance->save();
            }
        }
    }

    /**
     * Check for overtime
     * @param Staff_attendance_model $attendance
     */
    protected function checkOvertime(Staff_attendance_model $attendance): void
    {
        // TODO: Implement overtime logic based on schedule
        $schedule = $this->getStaffSchedule($attendance->staff_id);
        
        if ($schedule && isset($schedule['time_out'])) {
            $scheduledOutTime = strtotime(date('Y-m-d', strtotime($attendance->check_in_time)) . ' ' . $schedule['time_out']);
            $actualOutTime = strtotime($attendance->check_out_time);
            
            $overtimeSeconds = $actualOutTime - $scheduledOutTime;
            
            if ($overtimeSeconds > 900) { // More than 15 minutes
                $attendance->is_overtime = true;
                $attendance->overtime_minutes = ceil($overtimeSeconds / 60);
                $attendance->save();
            }
        }
    }

    /**
     * Get staff schedule
     * @param int $staffId
     * @return array|null
     */
    protected function getStaffSchedule(int $staffId): ?array
    {
        // TODO: Implement schedule lookup from staff_schedules table
        // Simplified version - return default schedule
        return [
            'time_in' => '09:00:00',
            'time_out' => '17:00:00',
        ];
    }

    /**
     * Map device verification type to human-readable type
     * @param int $state
     * @return string
     */
    protected function mapVerificationType(int $state): string
    {
        return match($state) {
            0 => 'pin',
            1 => 'fingerprint',
            3 => 'pin',
            4 => 'rfid',
            15 => 'face',
            default => 'fingerprint'
        };
    }
}

