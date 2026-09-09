<?php

declare(strict_types=1);

$root = dirname(__DIR__);

$read = static function (string $path) use ($root): string {
    $full = $root.'/'.$path;
    if (!is_file($full)) {
        fwrite(STDERR, "FAIL missing {$path}\n");
        exit(1);
    }
    $source = file_get_contents($full);
    if (!is_string($source)) {
        fwrite(STDERR, "FAIL unreadable {$path}\n");
        exit(1);
    }
    return $source;
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

$schema = $read('app/Services/Workforce/PmdStaffAttendanceSchemaService.php');
$canary = $read('scripts/pmd-staff-attendance-canary.php');
$rollout = $read('scripts/pmd-staff-attendance-rollout.sh');
$hours = $read('app/Services/AI/PmdWorkforcePersonHoursService.php');
$portal = $read('app/Http/Controllers/PmdStaffPortalV6Controller.php');
$guest = $read('app/Services/AI/GuestMenuAiService.php');
$lifecycle = $read('app/Services/SuperAdminTenantLifecycleService.php');

foreach ([
    'attendance_id',
    'staff_id',
    'location_id',
    'check_in_time',
    'check_out_time',
    'hours_worked',
    'status',
    'is_late',
    'late_minutes',
    'is_overtime',
    'overtime_minutes',
    'is_edited',
    'edited_by',
    'edited_at',
    'timezone',
    'device_type',
    'verification_method',
    'device_id',
    'notes',
    'metadata',
    'ip_address',
    'user_agent',
    'created_at',
    'updated_at',
] as $column) {
    $expect($schema, "'{$column}'", "canonical attendance column {$column}");
}

$expect($schema, "private const TABLE = 'staff_attendance'", 'single canonical attendance relation');
$expect($schema, 'Schema::connection($connection)->create', 'connection-pinned schema create');
$expect($schema, "in_array(\$connection, ['tenant', 'mysql'], true)", 'schema connection allowlist');
$expect($schema, 'Existing rows are never modified', 'non-destructive repair contract');
$reject($schema, 'truncate(', 'attendance schema must not truncate rows');
$reject($schema, '->delete(', 'attendance schema must not delete rows');
$reject($schema, '->insert(', 'attendance schema must not fabricate rows');
$reject($schema, 'pmd_operational_shift_people', 'schema authority must not backfill rota attendance');

$expect($canary, "getopt('', ['tenant-host:', 'apply'])", 'explicit tenant/apply CLI contract');
$expect($canary, "MODE: '.(\$apply ? 'APPLY' : 'READ-ONLY')", 'dry-run default');
$expect($canary, 'Connected tenant database does not match the registry tenant.', 'cross-tenant database guard');
$expect($canary, "\$schema->ensure('tenant')", 'tenant-pinned schema apply');
$expect($canary, 'HISTORICAL BACKFILL: NONE', 'no historical attendance fabrication');
$reject($canary, "'tomo.paymydine.com'", 'canary must not hard-code TOMO');
$reject($canary, 'UPDATE pmd_operational_shift_people', 'canary must not mutate rota');

$expect($rollout, 'pmd-staff-attendance-canary.php --tenant-host="$HOST"', 'rollout runs read-only preflight');
$expect($rollout, 'pmd-staff-attendance-canary.php --tenant-host="$HOST" --apply', 'rollout applies only explicit tenant');
$expect($rollout, 'No historical attendance rows were fabricated.', 'rollout preserves history boundary');
$reject($rollout, 'git reset', 'rollout must not reset production git');
$reject($rollout, 'git checkout', 'rollout must not overwrite production tree');
$reject($rollout, 'DROP TABLE', 'rollout must not drop tables');

$expect($lifecycle, 'use App\\Services\\Workforce\\PmdStaffAttendanceSchemaService;', 'new-tenant attendance authority import');
$expect($lifecycle, '$this->ensureStaffAttendanceSchema();', 'new-tenant attendance provisioning call');
$expect($lifecycle, "app(PmdStaffAttendanceSchemaService::class)->ensure('mysql')", 'new-tenant canonical attendance ensure');
foreach (['staff_attendance', 'staff_latetimes', 'staff_overtimes', 'attendance_audit_logs'] as $table) {
    $expect($lifecycle, "'{$table}'", "new-tenant attendance history isolation {$table}");
}
$expect($lifecycle, 'New tenant attendance schema is not ready.', 'new-tenant attendance fail-closed guard');

$expect($hours, "table('staff_attendance')", 'AI reads canonical attendance authority');
$expect($hours, 'actual_hours_authoritative', 'AI coverage-gated actual hours');
$expect($portal, "DB::table('staff_attendance')", 'staff portal time clock writer');
$expect($portal, 'attendanceReady()', 'staff portal attendance capability gate');
$reject($guest, 'PmdStaffAttendanceSchemaService', 'Guest AI cannot manage attendance schema');
$reject($guest, 'staff_attendance', 'Guest AI cannot read staff attendance');

fwrite(STDOUT, "PMD staff attendance contract audit: PASS\n");
