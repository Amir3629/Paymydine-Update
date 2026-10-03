<?php

/** Read-only preflight for TOMO PMD AI challenge fixtures. */
if (PHP_SAPI !== 'cli') exit(2);

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$options = getopt('', ['tenant:','location:']);
$tenant = (string)($options['tenant'] ?? '');
$locationId = (int)($options['location'] ?? 0);
if ($tenant !== 'tomo' || $locationId !== 1) {
    fwrite(STDERR, "PREFLIGHT_RESULT=STOP_WRONG_SCOPE\n");
    exit(3);
}

config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => 'tomo',
]);
DB::purge('tenant');
DB::setDefaultConnection('tenant');
DB::reconnect('tenant');

$db = DB::connection('tenant');
$schema = Schema::connection('tenant');
if ((string)$db->getDatabaseName() !== 'tomo') {
    fwrite(STDERR, "PREFLIGHT_RESULT=STOP_WRONG_DATABASE\n");
    exit(4);
}

$required = [
    'orders','order_menus','order_totals','menus','categories',
    'menu_categories','reservations',
];
$missing = array_values(array_filter($required, fn($table) => !$schema->hasTable($table)));

$existingFixtures = 0;
if ($schema->hasTable('orders')) {
    $columns = $schema->getColumnListing('orders');
    if (in_array('comment',$columns,true)) {
        $existingFixtures += $db->table('orders')->where('comment','like','%PMD_AI_CHALLENGE_V1%')->count();
    }
    if (in_array('email',$columns,true)) {
        $existingFixtures += $db->table('orders')->where('email','like','%@pmd-ai-fixture.invalid')->count();
    }
}

$now = Carbon::now('Europe/Berlin');
$lastMonth = $now->copy()->subMonthNoOverflow()->startOfMonth();
$tipDates = [
    $now->toDateString(),
    $lastMonth->copy()->day(min(24, $lastMonth->daysInMonth))->toDateString(),
];
$tipShiftCollisions = 0;
if ($schema->hasTable('tips_shifts')) {
    $tipColumns = $schema->getColumnListing('tips_shifts');
    if (in_array('shift_date',$tipColumns,true)) {
        $q = $db->table('tips_shifts')->whereIn('shift_date',$tipDates);
        if (in_array('location_id',$tipColumns,true)) $q->where('location_id',1);
        $tipShiftCollisions = $q->count();
    }
}

$summary = [
    'database' => (string)$db->getDatabaseName(),
    'location_id' => 1,
    'missing_required_tables' => $missing,
    'existing_fixture_matches' => $existingFixtures,
    'tips_shift_dates' => $tipDates,
    'tips_shift_collisions' => $tipShiftCollisions,
    'operational_roster_tables' => [
        'people' => $schema->hasTable('pmd_operational_people'),
        'shifts' => $schema->hasTable('pmd_operational_shifts'),
        'shift_people' => $schema->hasTable('pmd_operational_shift_people'),
    ],
    'reviews' => $schema->hasTable('reviews'),
    'status_history' => $schema->hasTable('status_history'),
    'eta_events' => $schema->hasTable('pmd_order_eta_events'),
];

echo json_encode($summary, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";

if ($missing) {
    echo "PREFLIGHT_RESULT=STOP_MISSING_TABLES\n";
    exit(10);
}
if ($existingFixtures > 0) {
    echo "PREFLIGHT_RESULT=STOP_FIXTURES_ALREADY_EXIST\n";
    exit(11);
}
if ($tipShiftCollisions > 0) {
    echo "PREFLIGHT_RESULT=STOP_TIPS_SHIFT_COLLISION\n";
    echo "NOTE=No data was changed. Existing real tips shift rows must not be overwritten.\n";
    exit(12);
}

echo "PREFLIGHT_RESULT=PASS\n";
