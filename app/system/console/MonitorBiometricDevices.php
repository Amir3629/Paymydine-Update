<?php

namespace System\Console;

use Admin\Services\BiometricDeviceService\DeviceMonitoringService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Monitor health of all biometric devices
 * 
 * Usage: php artisan biometric:monitor
 * 
 * This command should run every 15 minutes via cron:
 * */15 * * * * php /path/to/artisan biometric:monitor >> /dev/null 2>&1
 */
class MonitorBiometricDevices extends Command
{
    protected $signature = 'biometric:monitor';

    protected $description = 'Monitor health status of all biometric devices';

    protected $monitoringService;

    public function __construct()
    {
        parent::__construct();
        $this->monitoringService = new DeviceMonitoringService();
    }

    public function handle()
    {
        $this->info('Starting device health monitoring...');

        try {
            $result = $this->monitoringService->monitorAllDevices();

            $this->info("Monitoring completed:");
            $this->line("  Total devices: {$result['monitored']}");
            $this->line("  Online: {$result['online']}");
            $this->line("  Offline: {$result['offline']}");
            $this->line("  Errors: {$result['errors']}");

            // Check for stale syncs
            $this->line("\nChecking for stale syncs...");
            $staleResult = $this->monitoringService->checkStaleSyncs(2);
            $this->line("  Stale devices: {$staleResult['stale_devices']}");
            $this->line("  Alerts sent: {$staleResult['alerts_sent']}");

            return 0;

        } catch (\Exception $e) {
            $this->error('Monitoring failed: ' . $e->getMessage());
            Log::error('Device monitoring failed', ['error' => $e->getMessage()]);
            return 1;
        }
    }
}

