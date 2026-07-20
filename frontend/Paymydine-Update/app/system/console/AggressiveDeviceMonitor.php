<?php

namespace System\Console;

use Admin\Models\FingerDevices_model;
use Admin\Services\BiometricDeviceService\DeviceMonitoringService;
use Admin\Services\BiometricDeviceService\DeviceDetectionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Aggressive Device Monitor
 * Runs every minute for real-time device detection and health monitoring
 * Detects USB, WiFi, and Ethernet devices
 * Pings network devices every 30 seconds for connectivity
 * 
 * Usage: php artisan biometric:aggressive-monitor
 */
class AggressiveDeviceMonitor extends Command
{
    protected $signature = 'biometric:aggressive-monitor';

    protected $description = 'Aggressively monitor devices every minute - detects new devices and pings network devices';

    protected $detectionService;
    protected $monitoringService;

    public function __construct()
    {
        parent::__construct();
        $this->detectionService = new DeviceDetectionService();
        $this->monitoringService = new DeviceMonitoringService();
    }

    public function handle()
    {
        $this->info('Starting aggressive device monitoring...');

        // Step 1: Auto-detect new devices (USB, WiFi, Ethernet)
        $this->detectNewDevices();

        // Step 2: Ping all network devices for connectivity
        $this->pingNetworkDevices();

        // Step 3: Quick health check on all devices
        $this->quickHealthCheck();

        $this->info('Aggressive monitoring completed.');

        return 0;
    }

    /**
     * Detect new devices every minute
     */
    protected function detectNewDevices()
    {
        $this->line('Scanning for new devices...');

        try {
            $result = $this->detectionService->autoDetectAndRegister();

            if ($result['registered'] > 0) {
                $this->info("✓ Registered {$result['registered']} new device(s)");
                
                foreach ($result['devices'] as $device) {
                    $this->line("  - {$device->name} ({$device->device_type}) at {$device->ip}");
                }
            } else {
                $this->line("  No new devices detected");
            }

        } catch (\Exception $e) {
            $this->error('Device detection failed: ' . $e->getMessage());
            Log::error('Aggressive detection failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Ping all network devices every 30 seconds (run twice per minute)
     */
    protected function pingNetworkDevices()
    {
        $this->line('Checking network device connectivity...');

        $networkDevices = FingerDevices_model::where('status', 1)
            ->whereIn('connection_type', ['ethernet', 'wifi'])
            ->get();

        if ($networkDevices->isEmpty()) {
            $this->line('  No network devices to ping');
            return;
        }

        $online = 0;
        $offline = 0;

        foreach ($networkDevices as $device) {
            // First ping
            $isOnline = $this->pingDevice($device->ip, $device->port);
            
            if (!$isOnline) {
                // Second attempt after 30 seconds
                sleep(30);
                $isOnline = $this->pingDevice($device->ip, $device->port);
            }

            if ($isOnline) {
                if ($device->connection_status !== 'online') {
                    $device->update([
                        'connection_status' => 'online',
                        'last_connected_at' => now(),
                        'failed_connection_attempts' => 0,
                    ]);
                    $this->info("  ✓ {$device->name} came back ONLINE");
                }
                $online++;
            } else {
                $device->increment('failed_connection_attempts');
                
                if ($device->failed_connection_attempts >= 2) {
                    $device->update(['connection_status' => 'offline']);
                    $this->error("  ✗ {$device->name} is OFFLINE");
                }
                $offline++;
            }
        }

        $this->line("  Network status: {$online} online, {$offline} offline");
    }

    /**
     * Quick health check on all devices
     */
    protected function quickHealthCheck()
    {
        $this->line('Quick health check...');

        $devices = FingerDevices_model::where('status', 1)->get();

        $healthy = 0;
        $issues = 0;

        foreach ($devices as $device) {
            try {
                // Quick connection test
                if ($device->connection_type === 'usb') {
                    $healthy++;
                } else {
                    if ($this->pingDevice($device->ip, $device->port, 1)) {
                        $healthy++;
                    } else {
                        $issues++;
                    }
                }
            } catch (\Exception $e) {
                $issues++;
            }
        }

        $this->line("  Health: {$healthy} healthy, {$issues} with issues");
    }

    /**
     * Ping a network device
     */
    protected function pingDevice(string $ip, int $port, int $timeout = 2): bool
    {
        $connection = @fsockopen($ip, $port, $errno, $errstr, $timeout);
        
        if ($connection) {
            fclose($connection);
            return true;
        }

        return false;
    }
}

