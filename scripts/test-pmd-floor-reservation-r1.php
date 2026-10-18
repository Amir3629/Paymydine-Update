<?php
/**
 * PMD_FLOOR_RESERVATION_R1_PURE_TESTS
 * Read-only PHP regression tests. No Laravel boot, database or tenant secrets.
 *
 * php scripts/test-pmd-floor-reservation-r1.php
 */
require __DIR__.'/../app/admin/services/PmdFloorReservationWindowsV1.php';

use Admin\Services\PmdFloorReservationWindowsV1 as Floor;

function assertPhase($actual, $expected, $message): void
{
    if ($actual !== $expected) {
        fwrite(STDERR, $message.': expected '.$expected.', got '.$actual.PHP_EOL);
        exit(1);
    }
}

$now = 2000000000000;
$start = $now + 10 * 60000;
$windows = [
    ['table_id' => 42, 'table_no' => '7',
     'start_ms' => $start, 'end_ms' => $start + 60 * 60000],
];

assertPhase(Floor::phase($windows, 42, '7', $now, 15), 'upcoming', '15-minute blue notice');
assertPhase(Floor::phase($windows, 42, '7', $now, 5), 'free', '5-minute alert not yet started');
assertPhase(Floor::phase($windows, 42, '7', $now, 0), 'free', 'notice disabled');
assertPhase(Floor::phase($windows, 43, '7', $now, 15), 'free', 'exact DB table ID priority');
assertPhase(Floor::phase($windows, 0, '7', $now, 15), 'upcoming', 'legacy number fallback');
assertPhase(Floor::phase($windows, 42, '7', $start, 15), 'busy', 'reservation starts red');
assertPhase(Floor::phase($windows, 42, '7', $start + 60 * 60000, 15), 'free', 'reservation end exclusive');
assertPhase(Floor::phase($windows, 42, '7', $now, 15), 'upcoming', 'no false busy before start');
assertPhase(Floor::phase([], 42, '7', $now, 15), 'free', 'no active reservation');
assertPhase(Floor::normalizeNoticeMinutes('15'), 15, 'numeric settings value');
assertPhase(Floor::normalizeNoticeMinutes(500), 120, 'lead maximum enforced');
assertPhase(Floor::normalizeNoticeMinutes(null), 15, 'default lead');

echo "PASS: Floor reservation PHP contract (12 checks)\n";
