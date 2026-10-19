<?php

/**
 * Pure presentation regressions for shared Owner/Manager online-staff card.
 * php scripts/test-pmd-online-staff-card-v1.php
 */
$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Admin\Services\PmdOnlineStaffCardV1;
use Illuminate\Support\Carbon;

function checkStaffCard(bool $ok, string $message): void
{
    if (!$ok) {
        fwrite(STDERR, "FAIL: ".$message."\n");
        exit(1);
    }
}

$formatter = new PmdOnlineStaffCardV1();
$now = Carbon::parse('2026-10-19 12:00:00', 'Europe/Berlin');

$online = $formatter->format([
    'connected' => true,
    'source' => 'test session registry',
    'rows' => [[
        'staff_id' => 7,
        'user_id' => 9,
        'name' => 'Test Staff',
        'role' => 'Manager',
        'login_at' => '2026-10-19 09:30:00',
        'session_count' => 2,
    ]],
], 'en', $now);

checkStaffCard($online['connected'] === true, 'connected');
checkStaffCard($online['count'] === 1, 'one person, not two sessions');
checkStaffCard($online['rows'][0]['session_count'] === 2, 'session count');
checkStaffCard($online['rows'][0]['since'] === 'Since 09:30', 'since local time');
checkStaffCard($online['rows'][0]['duration'] === '2h 30m', 'duration');
checkStaffCard($online['as_of'] === 'As of 12:00', 'as-of local time');

$empty = $formatter->format(['connected' => true, 'rows' => []], 'en', $now);
checkStaffCard($empty['connected'] === true && $empty['count'] === 0, 'real empty');

$missing = $formatter->format([
    'connected' => false,
    'rows' => [['staff_id' => 1]],
    'source' => 'PMD admin presence table unavailable',
], 'en', $now);
checkStaffCard($missing['connected'] === false, 'not connected');
checkStaffCard($missing['rows'] === [], 'never invent connected rows');
checkStaffCard(str_contains(strtolower($missing['empty']), 'unavailable'), 'failure visible');

$de = $formatter->format(['connected' => true, 'rows' => []], 'de', $now);
checkStaffCard($de['title'] === 'Mitarbeiter online', 'German label');
echo "PASS: Owner/Manager shared staff-card contract (11 checks)\n";
