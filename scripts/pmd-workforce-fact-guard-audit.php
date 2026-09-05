<?php

declare(strict_types=1);

$root = dirname(__DIR__);

$read = static function (string $path) use ($root): string {
    $full = $root.'/'.$path;
    if (!is_file($full)) {
        fwrite(STDERR, "FAIL missing {$path}\n");
        exit(1);
    }
    $value = file_get_contents($full);
    if (!is_string($value)) {
        fwrite(STDERR, "FAIL unreadable {$path}\n");
        exit(1);
    }
    return $value;
};

$expect = static function (string $source, string $needle, string $label): void {
    if (!str_contains($source, $needle)) {
        fwrite(STDERR, "FAIL {$label}: missing {$needle}\n");
        exit(1);
    }
};

$reject = static function (string $source, string $needle, string $label): void {
    if (str_contains($source, $needle)) {
        fwrite(STDERR, "FAIL {$label}: forbidden {$needle}\n");
        exit(1);
    }
};

$orchestrator = $read('app/Services/AI/AiOrchestrator.php');
$compactor = $read('app/Services/AI/PmdWorkforceToolFactCompactor.php');
$personHours = $read('app/Services/AI/PmdWorkforcePersonHoursService.php');
$guestService = $read('app/Services/AI/GuestMenuAiService.php');
$guestRoute = $read('app/main/routes/api-v1-guest-ai.php');

$expect($orchestrator, 'PmdWorkforceToolFactCompactor::class', 'orchestrator workforce fact guard');
$expect($orchestrator, "\$name === 'workforce_schedule_range'", 'workforce result compaction');
$expect($orchestrator, 'actual_hours_authoritative=true', 'provider attendance instruction');
$expect($orchestrator, 'never claim annual/cumulative attendance is unavailable', 'no generic staff-hours refusal');
$expect($orchestrator, 'guardAnswer(', 'server-side final answer guard');

$expect($compactor, 'PmdWorkforcePersonHoursService::class', 'direct named person attendance authority');
$expect($compactor, 'attendance_coverage_complete_for_range', 'attendance coverage truth');
$expect($compactor, 'attendance_fact_contract', 'structured workforce fact contract');
$expect($compactor, 'actual_hours_authoritative', 'authoritative actual-hours marker');
$expect($compactor, 'attendance_read_ok', 'explicit attendance read state');
$expect($compactor, 'attendance_rows_found=0', 'explicit no-attendance-row state');
$expect($compactor, 'no clock-in/clock-out attendance records', 'PMD-owned no-records wording');
$expect($compactor, 'This roster entry is not linked to a PMD Team attendance identity yet', 'PMD-owned identity gap wording');
$expect($compactor, 'I won\'t label the partial attendance total as a full-period total.', 'partial coverage honesty');
$reject($compactor, 'check your payroll', 'no external payroll redirect');
$reject($compactor, 'payroll software', 'no payroll software wording');
$reject($compactor, 'to sum up', 'no SumUp-ambiguous workforce wording');

$expect($personHours, "private const BASE_CONNECTION = 'tenant'", 'canonical live tenant source');
$expect($personHours, "private const RUNTIME_CONNECTION = 'pmd_ai_workforce_tenant'", 'dedicated workforce tenant connection');
$expect($personHours, "app()->bound('tenant')", 'request tenant authority');
$expect($personHours, '$base->getConfig()', 'clone verified live tenant connection config');
$expect($personHours, "$config['url'] = null;", 'disable URL reparse on private clone');
$expect($personHours, "$config['prefix'] = (string)$base->getTablePrefix();", 'preserve live request prefix');
$expect($personHours, "Config::set('database.connections.'.self::RUNTIME_CONNECTION", 'private runtime tenant config');
$expect($personHours, 'DB::purge(self::RUNTIME_CONNECTION)', 'fresh runtime tenant connection');
$expect($personHours, 'DB::connection(self::RUNTIME_CONNECTION)', 'isolated tenant database connection');
$expect($personHours, 'getDatabaseName()', 'runtime database identity verification');
$expect($personHours, 'strcasecmp($baseDatabase, $database)', 'base request tenant mismatch guard');
$expect($personHours, 'strcasecmp($actualDatabase, $database)', 'runtime cross-tenant mismatch guard');
$expect($personHours, "information_schema.TABLES", 'physical relation discovery');
$expect($personHours, 'physicalTable(', 'physical tenant table resolver');
$expect($personHours, '$connection->raw($this->quoteIdentifier($physical))', 'exact physical relation query');
$expect($personHours, "table('staff_attendance')", 'attendance relation helper usage');
$expect($personHours, "table('pmd_operational_people')", 'operational person relation helper usage');
$expect($personHours, "table('staffs')", 'safe exact-name staff relation helper usage');
$expect($personHours, "->select(['staff_id', 'location_id', 'check_in_time', 'check_out_time'])", 'direct attendance contract probe');
$expect($personHours, 'attendance_read_ok', 'separate attendance read state');
$expect($personHours, 'attendance_coverage_start', 'coverage start evidence');
$expect($personHours, 'actual_hours_authoritative', 'coverage-gated actual hours');
$expect($personHours, "->where('staff_id', \$staffId)", 'staff-scoped attendance query');
$expect($personHours, 'applyLocationScope', 'location-scoped attendance query');
$expect($personHours, '24 * 60', 'implausible attendance session guard');
$expect($personHours, "'error_code' => (string)\$error->getCode()", 'safe live failure classification');
$reject($personHours, 'use Illuminate\\Support\\Facades\\Schema;', 'no Schema facade dependency');
$reject($personHours, 'private function schema(', 'no schema helper dependency');
$reject($personHours, "DB::table('staff_attendance')", 'no drifting default attendance connection');
$reject($personHours, "->table('staff_attendance')", 'no connection-prefix-dependent attendance query');
$reject($personHours, 'DB::setDefaultConnection(', 'do not mutate request default connection');
$reject($personHours, '->insert(', 'read-only person-hours service');
$reject($personHours, '->update(', 'read-only person-hours service');
$reject($personHours, '->delete(', 'read-only person-hours service');
$reject($personHours, 'salary', 'no salary data');
$reject($personHours, 'api_key', 'no provider secrets');

$reject($guestService, 'PmdWorkforcePersonHoursService', 'Guest AI workforce isolation');
$reject($guestService, 'PmdWorkforceToolFactCompactor', 'Guest AI compactor isolation');
$reject($guestRoute, 'PmdWorkforcePersonHoursService', 'Guest route workforce isolation');
$reject($guestRoute, 'PmdWorkforceToolFactCompactor', 'Guest route compactor isolation');

fwrite(STDOUT, "PMD workforce fact guard audit: PASS\n");
