<?php

declare(strict_types=1);

require dirname(__DIR__).'/app/Services/AI/PmdWorkforceToolFactCompactor.php';

use App\Services\AI\PmdWorkforceToolFactCompactor;

$guard = new PmdWorkforceToolFactCompactor();
$question = "PMD_RUNTIME_CONTEXT:\nrestaurant_local_date=2026-09-05\n\nCURRENT_USER_QUESTION:\nHow many hours has Mohsen actually worked this year?\n\nPMD_RULE: use fresh PMD facts.";

$basePerson = [
    'person_id' => 7,
    'name' => 'Mohsen',
    'scheduled_hours' => 50.0,
    'scheduled_shift_count' => 6,
    'worked_days' => 5,
    'completed_attendance_sessions' => 5,
    'open_attendance_sessions' => 0,
    'anomalous_attendance_sessions' => 0,
    'attendance_source_available' => true,
    'attendance_identity_linked' => true,
    'attendance_coverage_complete_for_range' => true,
    'attendance_coverage_start' => '2025-12-01 08:00:00',
];

$evidence = [[
    'available' => true,
    'range' => ['start_date' => '2026-01-01', 'end_date' => '2026-09-05'],
    'people_metrics' => [array_merge($basePerson, [
        'actual_hours_authoritative' => true,
        'actual_worked_hours' => 42.5,
    ])],
]];

$answer = $guard->guardAnswer(
    "I don't have access to cumulative attendance logs. Check your payroll software.",
    $evidence,
    $question
);
if (!str_contains($answer, '42.5 actual worked hours') || str_contains(strtolower($answer), 'payroll')) {
    fwrite(STDERR, "FAIL authoritative worked-hours refusal guard\n");
    exit(1);
}

$alreadyPlausibleButWrong = $guard->guardAnswer(
    'I checked the record. There are no clock-in sessions to sum up, so check somewhere else.',
    $evidence,
    $question
);
if (
    !str_contains($alreadyPlausibleButWrong, '42.5 actual worked hours')
    || str_contains(strtolower($alreadyPlausibleButWrong), 'sum up')
    || str_contains(strtolower($alreadyPlausibleButWrong), 'somewhere else')
) {
    fwrite(STDERR, "FAIL provider-plausible wording replacement\n");
    exit(1);
}

$zeroEvidence = [[
    'available' => true,
    'range' => ['start_date' => '2026-01-01', 'end_date' => '2026-09-05'],
    'people_metrics' => [array_merge($basePerson, [
        'actual_hours_authoritative' => true,
        'actual_worked_hours' => 0.0,
        'worked_days' => 0,
        'completed_attendance_sessions' => 0,
    ])],
]];
$zeroAnswer = $guard->guardAnswer(
    "For 2026 I don't have access to annual attendance totals.",
    $zeroEvidence,
    $question
);
if (!str_contains($zeroAnswer, '0 actual worked hours')) {
    fwrite(STDERR, "FAIL zero-hours numeric-boundary guard\n");
    exit(1);
}

$partialEvidence = [[
    'available' => true,
    'range' => ['start_date' => '2026-01-01', 'end_date' => '2026-09-05'],
    'people_metrics' => [array_merge($basePerson, [
        'actual_hours_authoritative' => false,
        'actual_worked_hours' => 5.25,
        'attendance_coverage_complete_for_range' => false,
        'attendance_coverage_start' => '2026-09-01 08:00:00',
    ])],
]];
$partialAnswer = $guard->guardAnswer(
    "I don't have access to historical attendance. Check your payroll software.",
    $partialEvidence,
    $question
);
if (
    !str_contains($partialAnswer, '5.25 recorded actual hours')
    || !str_contains($partialAnswer, 'coverage does not reach the start')
    || str_contains(strtolower($partialAnswer), 'payroll')
) {
    fwrite(STDERR, "FAIL partial attendance coverage guard\n");
    exit(1);
}

$unlinkedEvidence = [[
    'available' => true,
    'range' => ['start_date' => '2026-01-01', 'end_date' => '2026-09-05'],
    'people_metrics' => [array_merge($basePerson, [
        'actual_hours_authoritative' => false,
        'actual_worked_hours' => 0.0,
        'attendance_identity_linked' => false,
        'attendance_coverage_complete_for_range' => false,
        'attendance_coverage_start' => null,
    ])],
]];
$unlinkedAnswer = $guard->guardAnswer(
    "I checked the records for Mohsen, and I don't have a total for his hours worked this year. While I have access to your operational schedule, the system shows that attendance-based tracking is not linked for him in PMD. Because of this, there are no recorded clock-in or clock-out sessions to sum up. If you are tracking his hours elsewhere, that would be the best place to check.",
    $unlinkedEvidence,
    $question
);
if (
    !str_contains($unlinkedAnswer, 'not linked to a PMD Team attendance record')
    || !str_contains($unlinkedAnswer, '50 scheduled hours across 6 shifts')
    || str_contains(strtolower($unlinkedAnswer), 'sum up')
    || str_contains(strtolower($unlinkedAnswer), 'elsewhere')
    || str_contains(strtolower($unlinkedAnswer), 'payroll')
) {
    fwrite(STDERR, "FAIL unlinked screenshot wording replacement\n");
    exit(1);
}

fwrite(STDOUT, "PMD workforce fact guard runtime test: PASS\n");
