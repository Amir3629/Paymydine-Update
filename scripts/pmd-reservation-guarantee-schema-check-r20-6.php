<?php

use App\Helpers\TenantContextHelper;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);

require $root.'/vendor/autoload.php';

$app = require $root.'/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$requiredColumns = [
    'guarantee_id',
    'reservation_id',
    'location_id',
    'provider',
    'status',
    'amount_per_guest_cents',
    'amount_cents',
    'currency',
    'customer_reference',
    'payment_method_reference',
    'setup_intent_reference',
    'terms_version',
    'terms_text',
    'consent_text',
    'consent_at',
    'cancellation_deadline_at',
    'charge_eligible_at',
    'loss_assessment_note',
    'loss_assessed_by_staff_id',
    'loss_assessed_at',
];

$databases = TenantContextHelper::getActiveTenantDatabases();
if (!$databases) {
    fwrite(STDERR, "ERROR: no active tenant databases found.\n");
    exit(2);
}

$failed = false;

foreach ($databases as $database) {
    TenantContextHelper::restoreTenantByDatabase($database);

    try {
        $schema = Schema::connection('tenant');
        $actualDatabase = (string)DB::connection('tenant')->getDatabaseName();

        if ($actualDatabase !== $database) {
            echo "FAIL {$database}: connected to {$actualDatabase}\n";
            $failed = true;
            continue;
        }

        if (!$schema->hasTable('reservation_guarantees')) {
            echo "FAIL {$database}: reservation_guarantees missing\n";
            $failed = true;
            continue;
        }

        $missing = [];
        foreach ($requiredColumns as $column) {
            if (!$schema->hasColumn('reservation_guarantees', $column)) {
                $missing[] = $column;
            }
        }

        if ($missing) {
            echo "FAIL {$database}: missing columns "
                .implode(',', $missing)."\n";
            $failed = true;
            continue;
        }

        echo "PASS {$database}: reservation guarantee storage ready\n";
    } catch (Throwable $error) {
        echo "FAIL {$database}: {$error->getMessage()}\n";
        $failed = true;
    } finally {
        TenantContextHelper::restoreMainConnection();
    }
}

exit($failed ? 1 : 0);
