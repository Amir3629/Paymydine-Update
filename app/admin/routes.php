<?php

/*
 * Admin route orchestrator. Helper functions and route definitions live in focused modules under routes/.
 */
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
require_once base_path('routes/helpers.php');
require_once base_path('routes/admin-app-before.php');
require_once base_path('routes/admin-app-notifications.php');
require_once base_path('routes/fiskaly.php');
require_once base_path('routes/debug.php');
require_once base_path('routes/pos-receipts.php');
require_once base_path('routes/worldline-probe.php');
require_once base_path('routes/qr-pay.php');
require_once base_path('routes/review-social.php');
require_once base_path('routes/terminal-payments.php');

// PMD_ADMIN_QUICK_MODE_PREVIEW_20260616
if (file_exists(base_path('routes/admin-quick-mode.php'))) {
    require base_path('routes/admin-quick-mode.php');
}
