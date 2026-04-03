<?php

namespace System\Console;

use Admin\Models\FingerDevices_model;
use Admin\Services\BiometricDeviceService\AttendanceTrackingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Auto-sync attendance from all enabled biometric devices
 * 
 * Usage: php artisan biometric:auto-sync
 * 
 * This command should run every 15 minutes via cron:
 * */15 * * * * php /path/to/artisan biometric:auto-sync >> /dev/null 2>&1
 */
class AutoSyncBiometricDevices extends Command
{
    protected $signature = 'biometric:auto-sync {--device= : Specific device ID to sync}';

    protected $description = 'Automatically sync attendance from all auto-sync enabled biometric devices';

    protected $attendanceService;

    public function __construct()
    {
        parent::__construct();
        $this->attendanceService = new AttendanceTrackingService();
    }

    public function handle()
    {
        $this->info('Starting automatic attendance sync...');

        $deviceId = $this->option('device');

        if ($deviceId) {
            $devices = FingerDevices_model::where('device_id', $deviceId)
                ->where('status', 1)
                ->get();
        } else {
            $devices = FingerDevices_model::where('status', 1)
                ->where('auto_sync_enabled', true)
                ->get();
        }

        if ($devices->isEmpty()) {
            $this->warn('No devices found for auto-sync.');
            return 0;
        }

        $totalSynced = 0;
        $totalFailed = 0;

        foreach ($devices as $device) {
            $this->line("Syncing device: {$device->name} ({$device->ip})");

            try {
                // Only sync records from the last sync time
                $since = $device->last_sync_at ? 
                    new \DateTime($device->last_sync_at->toDateTimeString()) : 
                    new \DateTime('-1 day');

                $result = $this->attendanceService->syncAttendanceFromDevice($device, $since);

                if ($result['success']) {
                    $this->info("  ✓ Synced {$result['synced']} records");
                    $totalSynced += $result['synced'];
                    $totalFailed += $result['failed'];
                } else {
                    $this->error("  ✗ Sync failed: {$result['message']}");
                    $totalFailed++;
                }

            } catch (\Exception $e) {
                $this->error("  ✗ Error: {$e->getMessage()}");
                $totalFailed++;
                
                Log::error('Auto-sync failed for device', [
                    'device_id' => $device->device_id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("\nSync completed: {$totalSynced} records synced, {$totalFailed} failed");

        return 0;
    }
}

