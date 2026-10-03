<?php

namespace App\Services\Workforce;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Canonical, additive schema authority for PMD staff clock-in/check-out storage.
 *
 * This service is intentionally schema-only. It never fabricates attendance
 * rows, never backfills scheduled rota time as actual time, and never deletes
 * tenant data. It can be used by an explicit tenant canary or by new-tenant
 * provisioning after the tenant database connection has already been selected.
 */
final class PmdStaffAttendanceSchemaService
{
    private const TABLE = 'staff_attendance';

    private const CORE_COLUMNS = [
        'attendance_id',
        'staff_id',
        'check_in_time',
        'check_out_time',
    ];

    private const REQUIRED_COLUMNS = [
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
    ];

    public function status(string $connection = 'tenant'): array
    {
        $this->assertConnectionName($connection);

        $db = DB::connection($connection);
        $db->getPdo();
        $database = trim((string)$db->getDatabaseName());
        if ($database === '') {
            throw new RuntimeException('PMD attendance schema connection has no active database.');
        }

        $schema = Schema::connection($connection);
        $exists = $schema->hasTable(self::TABLE);
        $missing = [];

        if ($exists) {
            foreach (self::REQUIRED_COLUMNS as $column) {
                if (!$schema->hasColumn(self::TABLE, $column)) {
                    $missing[] = $column;
                }
            }
        } else {
            $missing = self::REQUIRED_COLUMNS;
        }

        return [
            'connection' => $connection,
            'database' => $database,
            'table' => self::TABLE,
            'physical_table' => (string)$db->getTablePrefix().self::TABLE,
            'exists' => $exists,
            'ready' => $exists && $missing === [],
            'missing_columns' => $missing,
        ];
    }

    /**
     * Ensure the canonical PMD attendance contract on the selected connection.
     * Existing rows are never modified. Existing tables with a broken core
     * identity/timestamp contract fail closed instead of being guessed at.
     */
    public function ensure(string $connection = 'tenant'): array
    {
        $before = $this->status($connection);
        $schema = Schema::connection($connection);
        $created = false;
        $added = [];

        if (!$before['exists']) {
            $this->createTable($connection);
            $created = true;
        } else {
            $missingCore = array_values(array_intersect(
                self::CORE_COLUMNS,
                (array)$before['missing_columns']
            ));

            if ($missingCore !== []) {
                throw new RuntimeException(
                    'PMD attendance table exists but its core contract is incomplete: '.
                    implode(', ', $missingCore)
                );
            }

            foreach ((array)$before['missing_columns'] as $column) {
                $this->addOptionalColumn($connection, (string)$column);
                $added[] = (string)$column;
            }
        }

        $after = $this->status($connection);
        if (!$after['ready']) {
            throw new RuntimeException(
                'PMD attendance schema did not reach the canonical contract: '.
                implode(', ', (array)$after['missing_columns'])
            );
        }

        return $after + [
            'created' => $created,
            'added_columns' => $added,
            'changed' => $created || $added !== [],
        ];
    }

    private function createTable(string $connection): void
    {
        Schema::connection($connection)->create(self::TABLE, function (Blueprint $table): void {
            $table->bigIncrements('attendance_id');
            $table->unsignedBigInteger('staff_id');
            $table->integer('location_id')->nullable();
            $table->dateTime('check_in_time');
            $table->dateTime('check_out_time')->nullable();
            $table->decimal('hours_worked', 8, 2)->nullable();
            $table->enum('status', [
                'checked_in',
                'checked_out',
                'abandoned',
                'corrected',
                'auto_checkout',
            ])->default('checked_in');
            $table->boolean('is_late')->default(false);
            $table->integer('late_minutes')->default(0);
            $table->boolean('is_overtime')->default(false);
            $table->integer('overtime_minutes')->default(0);
            $table->boolean('is_edited')->default(false);
            $table->unsignedBigInteger('edited_by')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->string('timezone', 50)->default('UTC');
            $table->enum('device_type', [
                'card',
                'fingerprint',
                'manual',
                'zkteco',
            ])->default('manual');
            $table->enum('verification_method', [
                'fingerprint',
                'rfid',
                'face',
                'pin',
                'manual',
                'mobile',
            ])->default('manual');
            $table->unsignedBigInteger('device_id')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index('staff_id', 'pmd_staff_attendance_staff_idx');
            $table->index('check_in_time', 'pmd_staff_attendance_checkin_idx');
            $table->index('location_id', 'pmd_staff_attendance_location_idx');
            $table->index(
                ['staff_id', 'check_in_time'],
                'pmd_staff_attendance_staff_checkin_idx'
            );
            $table->index(
                ['staff_id', 'check_out_time'],
                'pmd_staff_attendance_staff_open_idx'
            );
            $table->index(
                ['location_id', 'check_in_time'],
                'pmd_staff_attendance_location_checkin_idx'
            );
            $table->index('status', 'pmd_staff_attendance_status_idx');
            $table->index(
                'verification_method',
                'pmd_staff_attendance_verification_idx'
            );
        });
    }

    /**
     * Repair only non-core columns on a pre-existing attendance table. Keeping
     * one column per ALTER makes failures explicit and avoids hiding partial DDL.
     */
    private function addOptionalColumn(string $connection, string $column): void
    {
        Schema::connection($connection)->table(self::TABLE, function (Blueprint $table) use ($column): void {
            switch ($column) {
                case 'location_id':
                    $table->integer('location_id')->nullable();
                    break;
                case 'hours_worked':
                    $table->decimal('hours_worked', 8, 2)->nullable();
                    break;
                case 'status':
                    $table->enum('status', [
                        'checked_in',
                        'checked_out',
                        'abandoned',
                        'corrected',
                        'auto_checkout',
                    ])->default('checked_in');
                    break;
                case 'is_late':
                    $table->boolean('is_late')->default(false);
                    break;
                case 'late_minutes':
                    $table->integer('late_minutes')->default(0);
                    break;
                case 'is_overtime':
                    $table->boolean('is_overtime')->default(false);
                    break;
                case 'overtime_minutes':
                    $table->integer('overtime_minutes')->default(0);
                    break;
                case 'is_edited':
                    $table->boolean('is_edited')->default(false);
                    break;
                case 'edited_by':
                    $table->unsignedBigInteger('edited_by')->nullable();
                    break;
                case 'edited_at':
                    $table->timestamp('edited_at')->nullable();
                    break;
                case 'timezone':
                    $table->string('timezone', 50)->default('UTC');
                    break;
                case 'device_type':
                    $table->enum('device_type', [
                        'card',
                        'fingerprint',
                        'manual',
                        'zkteco',
                    ])->default('manual');
                    break;
                case 'verification_method':
                    $table->enum('verification_method', [
                        'fingerprint',
                        'rfid',
                        'face',
                        'pin',
                        'manual',
                        'mobile',
                    ])->default('manual');
                    break;
                case 'device_id':
                    $table->unsignedBigInteger('device_id')->nullable();
                    break;
                case 'notes':
                    $table->text('notes')->nullable();
                    break;
                case 'metadata':
                    $table->json('metadata')->nullable();
                    break;
                case 'ip_address':
                    $table->string('ip_address', 45)->nullable();
                    break;
                case 'user_agent':
                    $table->text('user_agent')->nullable();
                    break;
                case 'created_at':
                    $table->timestamp('created_at')->nullable();
                    break;
                case 'updated_at':
                    $table->timestamp('updated_at')->nullable();
                    break;
                default:
                    throw new RuntimeException(
                        'PMD attendance optional column is not allowlisted: '.$column
                    );
            }
        });
    }

    private function assertConnectionName(string $connection): void
    {
        if (!in_array($connection, ['tenant', 'mysql'], true)) {
            throw new RuntimeException('PMD attendance schema connection is not allowlisted.');
        }
    }
}
