<?php

namespace System\Console;

use Admin\Services\BiometricDeviceService\DeviceDetectionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Auto-detect and register new biometric devices
 * 
 * Usage: php artisan biometric:auto-detect
 * 
 * This command can run periodically (e.g., every hour) to detect new devices:
 * 0 * * * * php /path/to/artisan biometric:auto-detect >> /dev/null 2>&1
 */
class AutoDetectDevices extends Command
{
    protected $signature = 'biometric:auto-detect 
                            {--network= : Network range to scan (e.g., 192.168.1.0/24)}
                            {--usb : Scan for USB devices}';

    protected $description = 'Automatically detect and register new biometric devices';

    protected $detectionService;

    public function __construct()
    {
        parent::__construct();
        $this->detectionService = new DeviceDetectionService();
    }

    public function handle()
    {
        $this->info('Starting automatic device detection...');

        try {
            $result = $this->detectionService->autoDetectAndRegister();

            $this->info("Detection completed:");
            $this->line("  Devices found: {$result['found']}");
            $this->line("  Devices registered: {$result['registered']}");

            if (!empty($result['devices'])) {
                $this->line("\nNewly registered devices:");
                foreach ($result['devices'] as $device) {
                    $this->line("  - {$device->name} ({$device->device_type}) at {$device->ip}:{$device->port}");
                }
            }

            return 0;

        } catch (\Exception $e) {
            $this->error('Device detection failed: ' . $e->getMessage());
            Log::error('Device detection failed', ['error' => $e->getMessage()]);
            return 1;
        }
    }
}

