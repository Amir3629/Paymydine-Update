<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Models\Device_health_logs_model;
use Illuminate\Support\Facades\Log;

/**
 * Real-Time Connection Monitor
 * Continuously monitors device connections with 30-second ping intervals
 * Provides real-time status updates for network devices
 */
class RealTimeConnectionMonitor
{
    protected $notificationService;

    public function __construct()
    {
        $this->notificationService = new NotificationService();
    }

    /**
     * Ping all network devices with 30-second intervals
     * 
     * @return array Results of ping operations
     */
    public function pingAllNetworkDevices(): array
    {
        $networkDevices = FingerDevices_model::where('status', 1)
            ->whereIn('connection_type', ['ethernet', 'wifi'])
            ->get();

        $results = [
            'total' => $networkDevices->count(),
            'online' => 0,
            'offline' => 0,
            'devices' => []
        ];

        foreach ($networkDevices as $device) {
            $pingResult = $this->pingDevice($device);
            $results['devices'][] = $pingResult;
            
            if ($pingResult['is_online']) {
                $results['online']++;
            } else {
                $results['offline']++;
            }
        }

        return $results;
    }

    /**
     * Ping a specific device
     * 
     * @param FingerDevices_model $device
     * @return array Ping result with status and response time
     */
    public function pingDevice(FingerDevices_model $device): array
    {
        $startTime = microtime(true);
        
        try {
            // First ping attempt
            $isOnline = $this->tcpPing($device->ip, $device->port, 2);
            
            // If failed, retry after 30 seconds
            if (!$isOnline) {
                sleep(30);
                $isOnline = $this->tcpPing($device->ip, $device->port, 2);
            }
            
            $responseTime = round((microtime(true) - $startTime) * 1000, 2);
            
            // Update device status
            $this->updateDeviceStatus($device, $isOnline, $responseTime);
            
            return [
                'device_id' => $device->device_id,
                'name' => $device->name,
                'ip' => $device->ip,
                'port' => $device->port,
                'is_online' => $isOnline,
                'response_time_ms' => $responseTime,
                'checked_at' => now()->toDateTimeString()
            ];
            
        } catch (\Exception $e) {
            Log::error('Ping failed for device', [
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);
            
            return [
                'device_id' => $device->device_id,
                'name' => $device->name,
                'is_online' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * TCP ping to check if device is reachable
     * 
     * @param string $ip
     * @param int $port
     * @param int $timeout
     * @return bool True if device responds
     */
    protected function tcpPing(string $ip, int $port, int $timeout = 2): bool
    {
        $connection = @fsockopen($ip, $port, $errno, $errstr, $timeout);
        
        if ($connection) {
            fclose($connection);
            return true;
        }
        
        return false;
    }

    /**
     * ICMP ping (requires root on Linux)
     * Alternative method if TCP ping fails
     * 
     * @param string $ip
     * @param int $timeout
     * @return bool
     */
    protected function icmpPing(string $ip, int $timeout = 2): bool
    {
        $command = PHP_OS_FAMILY === 'Windows' 
            ? "ping -n 1 -w " . ($timeout * 1000) . " {$ip}"
            : "ping -c 1 -W {$timeout} {$ip}";
        
        exec($command, $output, $returnCode);
        
        return $returnCode === 0;
    }

    /**
     * Update device connection status in database
     * 
     * @param FingerDevices_model $device
     * @param bool $isOnline
     * @param float|null $responseTime
     */
    protected function updateDeviceStatus(
        FingerDevices_model $device, 
        bool $isOnline, 
        ?float $responseTime = null
    ): void {
        $previousStatus = $device->connection_status;
        
        if ($isOnline) {
            // Device is online
            $device->connection_status = 'online';
            $device->last_connected_at = now();
            $device->failed_connection_attempts = 0;
            
            // If was offline, send notification
            if ($previousStatus === 'offline') {
                $this->notificationService->create(
                    'device_online',
                    'Device Back Online',
                    "Device '{$device->name}' is back online",
                    'success',
                    ['device_id' => $device->device_id]
                );
            }
            
        } else {
            // Device is offline
            $device->increment('failed_connection_attempts');
            
            // Only mark as offline after 2 failed attempts
            if ($device->failed_connection_attempts >= 2) {
                $device->connection_status = 'offline';
                
                // If status changed, send notification
                if ($previousStatus === 'online') {
                    $this->notificationService->create(
                        'device_offline',
                        'Device Offline',
                        "Device '{$device->name}' is offline. Please check connection.",
                        'error',
                        ['device_id' => $device->device_id]
                    );
                }
            }
        }
        
        $device->save();
        
        // Log health check
        $this->logHealthCheck($device, $isOnline, $responseTime);
    }

    /**
     * Log device health check
     * 
     * @param FingerDevices_model $device
     * @param bool $isOnline
     * @param float|null $responseTime
     */
    protected function logHealthCheck(
        FingerDevices_model $device, 
        bool $isOnline, 
        ?float $responseTime = null
    ): void {
        Device_health_logs_model::create([
            'device_id' => $device->device_id,
            'status' => $isOnline ? 'online' : 'offline',
            'response_time_ms' => $responseTime,
            'memory_usage' => null,
            'cpu_usage' => null,
            'error_message' => !$isOnline ? 'Device not responding to ping' : null,
            'checked_at' => now()
        ]);
    }

    /**
     * Monitor a single device continuously
     * Used for critical devices that need constant monitoring
     * 
     * @param int $deviceId
     * @param int $intervalSeconds Default 30 seconds
     */
    public function monitorDeviceContinuously(int $deviceId, int $intervalSeconds = 30): void
    {
        $device = FingerDevices_model::find($deviceId);
        
        if (!$device) {
            Log::error('Device not found for continuous monitoring', ['device_id' => $deviceId]);
            return;
        }
        
        Log::info('Starting continuous monitoring', [
            'device_id' => $deviceId,
            'interval' => $intervalSeconds
        ]);
        
        while (true) {
            $this->pingDevice($device);
            sleep($intervalSeconds);
            
            // Reload device to get updated status
            $device = $device->fresh();
        }
    }

    /**
     * Get real-time status of all devices
     * 
     * @return array
     */
    public function getRealTimeStatus(): array
    {
        $devices = FingerDevices_model::where('status', 1)->get();
        
        $status = [
            'timestamp' => now()->toDateTimeString(),
            'total_devices' => $devices->count(),
            'online' => 0,
            'offline' => 0,
            'checking' => 0,
            'devices' => []
        ];
        
        foreach ($devices as $device) {
            $deviceStatus = [
                'id' => $device->device_id,
                'name' => $device->name,
                'type' => $device->device_type,
                'connection_type' => $device->connection_type,
                'status' => $device->connection_status,
                'ip' => $device->ip,
                'last_connected' => $device->last_connected_at?->diffForHumans(),
                'failed_attempts' => $device->failed_connection_attempts
            ];
            
            if ($device->connection_status === 'online') {
                $status['online']++;
            } elseif ($device->connection_status === 'offline') {
                $status['offline']++;
            } else {
                $status['checking']++;
            }
            
            $status['devices'][] = $deviceStatus;
        }
        
        return $status;
    }

    /**
     * Force reconnect a device
     * Attempts to re-establish connection with a device
     * 
     * @param int $deviceId
     * @return array Result of reconnection attempt
     */
    public function forceReconnect(int $deviceId): array
    {
        $device = FingerDevices_model::find($deviceId);
        
        if (!$device) {
            return [
                'success' => false,
                'message' => 'Device not found'
            ];
        }
        
        Log::info('Force reconnect attempt', ['device_id' => $deviceId]);
        
        // Reset failed attempts
        $device->failed_connection_attempts = 0;
        $device->save();
        
        // Attempt multiple pings
        $attempts = 3;
        $success = false;
        
        for ($i = 0; $i < $attempts; $i++) {
            if ($this->tcpPing($device->ip, $device->port, 5)) {
                $success = true;
                break;
            }
            
            if ($i < $attempts - 1) {
                sleep(10); // Wait 10 seconds between attempts
            }
        }
        
        $this->updateDeviceStatus($device, $success);
        
        return [
            'success' => $success,
            'message' => $success 
                ? 'Device reconnected successfully' 
                : 'Failed to reconnect device after ' . $attempts . ' attempts',
            'device' => [
                'id' => $device->device_id,
                'name' => $device->name,
                'status' => $device->connection_status
            ]
        ];
    }

    /**
     * Get device uptime statistics
     * 
     * @param int $deviceId
     * @param int $hours Number of hours to check (default 24)
     * @return array Uptime statistics
     */
    public function getDeviceUptime(int $deviceId, int $hours = 24): array
    {
        $since = now()->subHours($hours);
        
        $healthLogs = Device_health_logs_model::where('device_id', $deviceId)
            ->where('checked_at', '>=', $since)
            ->orderBy('checked_at')
            ->get();
        
        $totalChecks = $healthLogs->count();
        $onlineChecks = $healthLogs->where('status', 'online')->count();
        
        $uptime = $totalChecks > 0 ? round(($onlineChecks / $totalChecks) * 100, 2) : 0;
        
        return [
            'device_id' => $deviceId,
            'period_hours' => $hours,
            'uptime_percentage' => $uptime,
            'total_checks' => $totalChecks,
            'online_checks' => $onlineChecks,
            'offline_checks' => $totalChecks - $onlineChecks,
            'average_response_time_ms' => $healthLogs->where('status', 'online')
                ->avg('response_time_ms')
        ];
    }
}

