<?php

namespace System\Console;

use Admin\Models\FingerDevices_model;
use Admin\Models\Staff_attendance_model;
use Admin\Models\Staffs_model;
use App\Helpers\FingerHelper;
use Rats\Zkteco\Lib\ZKTeco;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sync attendance from all biometric devices
 * 
 * Usage: php artisan biometric:sync-attendance
 */
class SyncBiometricAttendance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'biometric:sync-attendance {--device= : Sync from specific device ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync attendance data from ZKTeco biometric devices';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting attendance sync from biometric devices...');

        $deviceId = $this->option('device');

        if ($deviceId) {
            $devices = FingerDevices_model::where('device_id', $deviceId)
                ->where('status', 1)
                ->get();
        } else {
            $devices = FingerDevices_model::isActive()->get();
        }

        if ($devices->isEmpty()) {
            $this->warn('No active biometric devices found.');
            return 0;
        }

        $totalSynced = 0;
        $totalErrors = 0;

        foreach ($devices as $device) {
            $this->info("Syncing from device: {$device->name} ({$device->ip})");

            try {
                $zk = new ZKTeco($device->ip, $device->port ?? 4370);

                if (!$zk->connect()) {
                    $this->error("Failed to connect to device: {$device->name}");
                    $totalErrors++;
                    continue;
                }

                $attendanceData = $zk->getAttendance();

                if (empty($attendanceData)) {
                    $this->info("No new attendance records from {$device->name}");
                    continue;
                }

                $synced = 0;
                $errors = 0;

                DB::beginTransaction();

                foreach ($attendanceData as $record) {
                    try {
                        $staffId = $record['id'] ?? null;
                        $timestamp = $record['timestamp'] ?? null;
                        $type = $record['type'] ?? 0; // 0 = check-in, 1 = check-out

                        if (!$staffId || !$timestamp) {
                            continue;
                        }

                        $staff = Staffs_model::find($staffId);
                        if (!$staff) {
                            continue;
                        }

                        $attendanceDate = date('Y-m-d', strtotime($timestamp));

                        if ($type == 0) {
                            // Check-in
                            $existing = Staff_attendance_model::where('staff_id', $staffId)
                                ->whereDate('check_in_time', $attendanceDate)
                                ->whereNull('check_out_time')
                                ->first();

                            if (!$existing) {
                                Staff_attendance_model::create([
                                    'staff_id' => $staffId,
                                    'check_in_time' => $timestamp,
                                    'location_id' => $device->location_id,
                                    'device_id' => $device->device_id,
                                    'device_type' => 'zkteco',
                                ]);
                                $synced++;
                            }
                        } else {
                            // Check-out
                            $attendance = Staff_attendance_model::where('staff_id', $staffId)
                                ->whereDate('check_in_time', $attendanceDate)
                                ->whereNull('check_out_time')
                                ->first();

                            if ($attendance) {
                                $attendance->update([
                                    'check_out_time' => $timestamp,
                                    'updated_at' => now(),
                                ]);
                                $synced++;
                            }
                        }
                    } catch (\Exception $e) {
                        $errors++;
                        Log::warning('Failed to sync attendance record', [
                            'device' => $device->name,
                            'record' => $record,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                DB::commit();

                $this->info("Synced {$synced} records from {$device->name}");
                if ($errors > 0) {
                    $this->warn("{$errors} errors occurred while syncing {$device->name}");
                }

                $totalSynced += $synced;
                $totalErrors += $errors;

            } catch (\Exception $e) {
                DB::rollBack();
                
                $this->error("Error syncing device {$device->name}: " . $e->getMessage());
                Log::error('Failed to sync attendance from device', [
                    'device_id' => $device->device_id,
                    'device_name' => $device->name,
                    'error' => $e->getMessage(),
                ]);
                
                $totalErrors++;
            }
        }

        $this->info("Sync completed. Total synced: {$totalSynced}, Total errors: {$totalErrors}");

        return 0;
    }
}

