<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Models\Device_health_logs_model;
use Admin\Models\Device_notifications_model;
use Illuminate\Support\Facades\Log;

/**
 * Device Monitoring Service
 * Continuously monitors device health, connection status, and operational metrics
 * Generates alerts for device issues
 */
class DeviceMonitoringService
{
    protected $notificationService;

    public function __construct()
    {
        $this->notificationService = new NotificationService();
    }

    /**
     * Monitor all active devices
     * @return array ['monitored' => int, 'online' => int, 'offline' => int, 'errors' => int]
     */
    public function monitorAllDevices(): array
    {
        $devices = FingerDevices_model::where('status', 1)->get();

        $monitored = 0;
        $online = 0;
        $offline = 0;
        $errors = 0;

        foreach ($devices as $device) {
            try {
                $health = $this->checkDeviceHealth($device);
                $monitored++;

                if ($health['status'] === 'online') {
                    $online++;
                } elseif ($health['status'] === 'offline') {
                    $offline++;
                } else {
                    $errors++;
                }
            } catch (\Exception $e) {
                $errors++;
                Log::error('Device monitoring failed', [
                    'device_id' => $device->device_id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'monitored' => $monitored,
            'online' => $online,
            'offline' => $offline,
            'errors' => $errors
        ];
    }

    /**
     * Check health of a specific device
     * @param FingerDevices_model $device
     * @return array
     */
    public function checkDeviceHealth(FingerDevices_model $device): array
    {
        $startTime = microtime(true);

        try {
            $driver = DeviceFactory::createDriver($device);
            
            if (!$driver) {
                return $this->recordHealthStatus($device, 'error', null, 'Could not create driver');
            }

            // Try to connect
            if (!$driver->connect()) {
                return $this->recordHealthStatus($device, 'offline', null, 'Connection failed');
            }

            $responseTime = (microtime(true) - $startTime) * 1000; // milliseconds

            // Get health status from device
            $healthData = $driver->getHealthStatus();
            $deviceInfo = $driver->getDeviceInfo();

            $driver->disconnect();

            // Record health status
            $result = $this->recordHealthStatus(
                $device,
                'online',
                $responseTime,
                null,
                $healthData,
                $deviceInfo
            );

            // Update device connection status
            $this->updateDeviceConnectionStatus($device, 'online');

            // Check for alerts
            $this->checkHealthAlerts($device, $healthData, $responseTime);

            return $result;

        } catch (\Exception $e) {
            Log::error('Device health check failed', [
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);

            $result = $this->recordHealthStatus($device, 'error', null, $e->getMessage());
            $this->updateDeviceConnectionStatus($device, 'error');

            return $result;
        }
    }

    /**
     * Record health status to database
     * @param FingerDevices_model $device
     * @param string $status
     * @param float|null $responseTime
     * @param string|null $error
     * @param array $healthData
     * @param array $deviceInfo
     * @return array
     */
    protected function recordHealthStatus(
        FingerDevices_model $device,
        string $status,
        ?float $responseTime,
        ?string $error,
        array $healthData = [],
        array $deviceInfo = []
    ): array {
        $healthLog = Device_health_logs_model::create([
            'device_id' => $device->device_id,
            'status' => $status,
            'response_time' => $responseTime ? (int)$responseTime : null,
            'users_count' => $healthData['users_count'] ?? null,
            'attendance_count' => $healthData['attendance_count'] ?? null,
            'memory_usage' => $healthData['memory_usage'] ?? null,
            'disk_usage' => $healthData['disk_usage'] ?? null,
            'firmware_version' => $deviceInfo['firmware'] ?? $device->firmware_version,
            'error_details' => $error,
            'device_info' => array_merge($deviceInfo, $healthData),
            'checked_at' => now(),
        ]);

        return array_merge([
            'health_log_id' => $healthLog->health_log_id,
            'status' => $status,
            'response_time' => $responseTime,
            'error' => $error,
        ], $healthData);
    }

    /**
     * Update device connection status
     * @param FingerDevices_model $device
     * @param string $status
     */
    protected function updateDeviceConnectionStatus(FingerDevices_model $device, string $status): void
    {
        $oldStatus = $device->connection_status;

        $updates = [
            'connection_status' => $status,
            'last_connected_at' => $status === 'online' ? now() : $device->last_connected_at,
        ];

        if ($status === 'online') {
            $updates['failed_connection_attempts'] = 0;
        } else {
            $device->increment('failed_connection_attempts');
        }

        $device->update($updates);

        // Send notification if status changed
        if ($oldStatus !== $status) {
            $this->notificationService->deviceStatusChanged($device, $oldStatus, $status);
        }
    }

    /**
     * Check for health-related alerts
     * @param FingerDevices_model $device
     * @param array $healthData
     * @param float $responseTime
     */
    protected function checkHealthAlerts(FingerDevices_model $device, array $healthData, float $responseTime): void
    {
        // Slow response time alert
        if ($responseTime > 5000) { // 5 seconds
            $this->notificationService->createNotification($device, 'device_error', [
                'title' => 'Slow Device Response',
                'message' => "Device {$device->name} is responding slowly ({$responseTime}ms)",
                'severity' => 'warning',
            ]);
        }

        // High memory usage alert
        if (isset($healthData['memory_usage']) && $healthData['memory_usage'] > 90) {
            $this->notificationService->createNotification($device, 'device_error', [
                'title' => 'High Memory Usage',
                'message' => "Device {$device->name} memory usage is at {$healthData['memory_usage']}%",
                'severity' => 'warning',
            ]);
        }

        // High disk usage alert
        if (isset($healthData['disk_usage']) && $healthData['disk_usage'] > 90) {
            $this->notificationService->createNotification($device, 'low_storage', [
                'title' => 'Low Storage Space',
                'message' => "Device {$device->name} disk usage is at {$healthData['disk_usage']}%",
                'severity' => 'warning',
            ]);
        }

        // Too many users alert (approaching device limit)
        if (isset($healthData['users_count']) && $device->max_users) {
            $usagePercentage = ($healthData['users_count'] / $device->max_users) * 100;
            if ($usagePercentage > 90) {
                $this->notificationService->createNotification($device, 'device_error', [
                    'title' => 'Device User Capacity Warning',
                    'message' => "Device {$device->name} has {$healthData['users_count']} users (limit: {$device->max_users})",
                    'severity' => 'warning',
                ]);
            }
        }
    }

    /**
     * Check devices that haven't synced recently
     * @param int $hoursThreshold
     * @return array
     */
    public function checkStaleSyncs(int $hoursThreshold = 2): array
    {
        $cutoffTime = now()->subHours($hoursThreshold);

        $staleDevices = FingerDevices_model::where('status', 1)
            ->where('auto_sync_enabled', true)
            ->where(function($q) use ($cutoffTime) {
                $q->whereNull('last_sync_at')
                  ->orWhere('last_sync_at', '<', $cutoffTime);
            })
            ->get();

        $alerts = 0;

        foreach ($staleDevices as $device) {
            $this->notificationService->createNotification($device, 'sync_failed', [
                'title' => 'Device Sync Overdue',
                'message' => "Device {$device->name} hasn't synced in over {$hoursThreshold} hours",
                'severity' => 'warning',
            ]);
            $alerts++;
        }

        return [
            'stale_devices' => $staleDevices->count(),
            'alerts_sent' => $alerts
        ];
    }

    /**
     * Get device uptime statistics
     * @param FingerDevices_model $device
     * @param int $days
     * @return array
     */
    public function getDeviceUptime(FingerDevices_model $device, int $days = 30): array
    {
        $since = now()->subDays($days);

        $healthLogs = Device_health_logs_model::where('device_id', $device->device_id)
            ->where('checked_at', '>=', $since)
            ->orderBy('checked_at')
            ->get();

        if ($healthLogs->isEmpty()) {
            return [
                'uptime_percentage' => 0,
                'online_hours' => 0,
                'offline_hours' => 0,
                'total_hours' => 0,
                'checks' => 0,
            ];
        }

        $onlineCount = $healthLogs->where('status', 'online')->count();
        $totalChecks = $healthLogs->count();

        $uptimePercentage = ($onlineCount / $totalChecks) * 100;

        // Calculate approximate hours (assumes checks every 15 minutes)
        $checkInterval = 0.25; // 15 minutes = 0.25 hours
        $onlineHours = $onlineCount * $checkInterval;
        $totalHours = $totalChecks * $checkInterval;
        $offlineHours = $totalHours - $onlineHours;

        return [
            'uptime_percentage' => round($uptimePercentage, 2),
            'online_hours' => round($onlineHours, 2),
            'offline_hours' => round($offlineHours, 2),
            'total_hours' => round($totalHours, 2),
            'checks' => $totalChecks,
            'period_days' => $days,
        ];
    }

    /**
     * Get device performance metrics
     * @param FingerDevices_model $device
     * @param int $days
     * @return array
     */
    public function getDevicePerformanceMetrics(FingerDevices_model $device, int $days = 7): array
    {
        $since = now()->subDays($days);

        $healthLogs = Device_health_logs_model::where('device_id', $device->device_id)
            ->where('checked_at', '>=', $since)
            ->where('status', 'online')
            ->get();

        if ($healthLogs->isEmpty()) {
            return [
                'avg_response_time' => 0,
                'min_response_time' => 0,
                'max_response_time' => 0,
                'avg_memory_usage' => 0,
                'avg_disk_usage' => 0,
            ];
        }

        $responseTimes = $healthLogs->pluck('response_time')->filter();
        $memoryUsage = $healthLogs->pluck('memory_usage')->filter();
        $diskUsage = $healthLogs->pluck('disk_usage')->filter();

        return [
            'avg_response_time' => $responseTimes->avg() ?? 0,
            'min_response_time' => $responseTimes->min() ?? 0,
            'max_response_time' => $responseTimes->max() ?? 0,
            'avg_memory_usage' => $memoryUsage->avg() ?? 0,
            'avg_disk_usage' => $diskUsage->avg() ?? 0,
            'samples' => $healthLogs->count(),
            'period_days' => $days,
        ];
    }
}

