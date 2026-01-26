<?php

namespace System\Console;

use Admin\Models\Device_health_logs_model;
use Admin\Models\Device_sync_logs_model;
use Admin\Services\BiometricDeviceService\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Cleanup old biometric device logs
 * 
 * Usage: php artisan biometric:cleanup
 * 
 * This command should run once per week via cron:
 * 0 0 * * 0 php /path/to/artisan biometric:cleanup >> /dev/null 2>&1
 */
class CleanupBiometricLogs extends Command
{
    protected $signature = 'biometric:cleanup 
                            {--health-days=90 : Keep health logs for this many days}
                            {--sync-days=90 : Keep sync logs for this many days}
                            {--notification-days=90 : Keep notifications for this many days}';

    protected $description = 'Cleanup old device health logs, sync logs, and notifications';

    protected $notificationService;

    public function __construct()
    {
        parent::__construct();
        $this->notificationService = new NotificationService();
    }

    public function handle()
    {
        $this->info('Starting cleanup of old biometric logs...');

        try {
            $healthDays = (int) $this->option('health-days');
            $syncDays = (int) $this->option('sync-days');
            $notificationDays = (int) $this->option('notification-days');

            // Cleanup health logs
            $healthDeleted = Device_health_logs_model::where('checked_at', '<', now()->subDays($healthDays))
                ->delete();
            $this->info("Deleted {$healthDeleted} old health logs (>{$healthDays} days)");

            // Cleanup sync logs
            $syncDeleted = Device_sync_logs_model::where('created_at', '<', now()->subDays($syncDays))
                ->delete();
            $this->info("Deleted {$syncDeleted} old sync logs (>{$syncDays} days)");

            // Cleanup notifications
            $notifDeleted = $this->notificationService->cleanupOldNotifications($notificationDays);
            $this->info("Deleted {$notifDeleted} old notifications (>{$notificationDays} days)");

            $this->info("\nCleanup completed successfully!");

            return 0;

        } catch (\Exception $e) {
            $this->error('Cleanup failed: ' . $e->getMessage());
            Log::error('Biometric logs cleanup failed', ['error' => $e->getMessage()]);
            return 1;
        }
    }
}

