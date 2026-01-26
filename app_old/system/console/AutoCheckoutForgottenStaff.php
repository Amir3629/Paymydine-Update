<?php

namespace System\Console;

use Admin\Services\BiometricDeviceService\AttendanceTrackingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Auto-checkout staff who forgot to check out
 * 
 * Usage: php artisan biometric:auto-checkout
 * 
 * This command should run once per day via cron (at 11:59 PM or midnight):
 * 59 23 * * * php /path/to/artisan biometric:auto-checkout >> /dev/null 2>&1
 */
class AutoCheckoutForgottenStaff extends Command
{
    protected $signature = 'biometric:auto-checkout {--hours=12 : Hours threshold for auto-checkout}';

    protected $description = 'Automatically checkout staff who forgot to check out';

    protected $attendanceService;

    public function __construct()
    {
        parent::__construct();
        $this->attendanceService = new AttendanceTrackingService();
    }

    public function handle()
    {
        $hoursThreshold = (int) $this->option('hours');

        $this->info("Auto-checkout for staff checked in > {$hoursThreshold} hours...");

        try {
            $result = $this->attendanceService->autoCheckoutForgottenStaff($hoursThreshold);

            if ($result['success']) {
                $this->info("Auto-checkout completed: {$result['checked_out']} staff members checked out");
            } else {
                $this->warn('No staff members needed auto-checkout');
            }

            return 0;

        } catch (\Exception $e) {
            $this->error('Auto-checkout failed: ' . $e->getMessage());
            Log::error('Auto-checkout failed', ['error' => $e->getMessage()]);
            return 1;
        }
    }
}

