<?php

/**
 * PMD_RESTAURANT_SERVICE_CALENDAR_R1 pure regression tests.
 * Run: php scripts/test-pmd-restaurant-service-calendar-r1.php
 * Does not read/write tenant tables. Injects a fixture into the request cache.
 */
$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\Reservations\PmdRestaurantServiceCalendarR1 as Calendar;
use Carbon\Carbon;

function ensureCalendar(bool $condition, string $description): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL calendar: $description\n");
        exit(1);
    }
}
$c = new Calendar();
$hours = [];
for ($i = 0; $i < 7; $i++) $hours[$i] = ['enabled' => false];
$hours[0] = [
    'enabled' => 1,
    'windows' => [
        ['opening_time'=>'11:30','closing_time'=>'15:00'],
        ['opening_time'=>'18:00','closing_time'=>'23:00'],
    ],
];
$hours[1] = [
    'enabled' => 1,
    'windows' => [
        ['opening_time'=>'21:00','closing_time'=>'02:00'],
    ],
];
$policy = $c->validateSubmission($hours, [
    'advance_days' => '30',
    'closed_dates_json' => '["2026-10-21","2026-10-26"]',
]);

ensureCalendar($policy['advance_days'] === 30, '30 day horizon');
ensureCalendar(count($policy['weekly'][0]['windows']) === 2, 'lunch+dinner persisted');
ensureCalendar($policy['weekly'][2]['enabled'] === false, 'Wednesday closed');
ensureCalendar($policy['closed_dates'] === ['2026-10-21','2026-10-26'], 'explicit closures');

$ref = new ReflectionProperty(Calendar::class, 'cache');
$ref->setAccessible(true);
$ref->setValue($c, [777 => $policy]);
$berlin = 'Europe/Berlin';

$windows = $c->windowsForDate(777, Carbon::parse('2026-10-19', $berlin));
ensureCalendar(count($windows) === 2, 'Monday two service windows');
ensureCalendar($c->allows(777,'2026-10-19','12:00',60), 'Monday lunch');
ensureCalendar(!$c->allows(777,'2026-10-19','14:30',60), 'closing-edge duration rejected');
ensureCalendar(!$c->allows(777,'2026-10-19','16:00',45), 'lunch/dinner gap rejected');
ensureCalendar($c->allows(777,'2026-10-19','18:30',90), 'Monday dinner');
ensureCalendar(!$c->allows(777,'2026-10-26','12:00',60), 'special closed Monday');
ensureCalendar(!$c->allows(777,'2026-10-21','00:30',30), 'closed Wednesday suppresses overnight tail');
ensureCalendar($c->allows(777,'2026-10-20','21:30',60), 'Tuesday overnight dinner');
ensureCalendar(!$c->allows(777,'2026-10-20','23:30',90), 'crossing explicit next-day closure is blocked');

$overlap = $hours;
$overlap[0]['windows'][1] = ['opening_time'=>'14:00','closing_time'=>'17:00'];
$rejected = false;
try {
    $c->validateSubmission($overlap, ['advance_days'=>'30','closed_dates_json'=>'[]']);
} catch (\Illuminate\Validation\ValidationException $error) {
    $rejected = true;
}
ensureCalendar($rejected, 'overlapping service periods rejected');

$rejected = false;
try {
    $c->validateSubmission($hours, ['advance_days'=>'400','closed_dates_json'=>'[]']);
} catch (\Illuminate\Validation\ValidationException $error) {
    $rejected = true;
}
ensureCalendar($rejected, 'advance horizon over 365 rejected');

echo "PASS: restaurant multi-service/closures/horizon calendar (15 assertions; no DB changes)\n";
