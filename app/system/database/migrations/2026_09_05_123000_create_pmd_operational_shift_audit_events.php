<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TRIGGERS = [
        'pmd_shift_audit_shift_ai_v1',
        'pmd_shift_audit_shift_au_v1',
        'pmd_shift_audit_person_ai_v1',
        'pmd_shift_audit_person_au_v1',
        'pmd_shift_audit_person_ad_v1',
    ];

    public function up(): void
    {
        if (!Schema::hasTable('pmd_operational_shift_audit_events')) {
            Schema::create('pmd_operational_shift_audit_events', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->default(0);
                $table->unsignedBigInteger('shift_id')->nullable();
                $table->unsignedBigInteger('person_id')->nullable();
                $table->string('event_type', 48);
                $table->string('source', 191)->nullable();
                $table->unsignedBigInteger('actor_admin_user_id')->nullable();
                $table->unsignedBigInteger('actor_staff_id')->nullable();
                $table->string('actor_name_snapshot', 128)->nullable();
                $table->string('actor_role_snapshot', 64)->nullable();
                $table->string('target_name_snapshot', 128)->nullable();
                $table->longText('before_json')->nullable();
                $table->longText('after_json')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['location_id', 'created_at'], 'pmd_shift_audit_location_time_idx');
                $table->index(['location_id', 'person_id', 'created_at'], 'pmd_shift_audit_person_time_idx');
                $table->index(['shift_id', 'created_at'], 'pmd_shift_audit_shift_time_idx');
                $table->index(['event_type', 'created_at'], 'pmd_shift_audit_type_time_idx');
            });
        }

        $connection = DB::connection();
        if ($connection->getDriverName() !== 'mysql') return;
        if (!Schema::hasTable('pmd_operational_shifts') || !Schema::hasTable('pmd_operational_shift_people')) return;

        foreach (self::TRIGGERS as $trigger) {
            DB::unprepared('DROP TRIGGER IF EXISTS '.$this->identifier($trigger));
        }

        $prefix = (string)$connection->getTablePrefix();
        $shifts = $this->identifier($prefix.'pmd_operational_shifts');
        $people = $this->identifier($prefix.'pmd_operational_shift_people');
        $audit = $this->identifier($prefix.'pmd_operational_shift_audit_events');

        DB::unprepared("CREATE TRIGGER {$this->identifier('pmd_shift_audit_shift_ai_v1')}
AFTER INSERT ON {$shifts}
FOR EACH ROW
BEGIN
    INSERT INTO {$audit}
        (location_id, shift_id, person_id, event_type, source,
         actor_admin_user_id, actor_staff_id, actor_name_snapshot, actor_role_snapshot,
         target_name_snapshot, before_json, after_json, created_at)
    VALUES
        (NEW.location_id, NEW.id, NULL, 'shift_created',
         COALESCE(NULLIF(@pmd_audit_source, ''), 'system'),
         @pmd_actor_admin_user_id, @pmd_actor_staff_id,
         NULLIF(@pmd_actor_name, ''), NULLIF(@pmd_actor_role, ''),
         NULL, NULL,
         JSON_OBJECT(
             'shift_date', NEW.shift_date,
             'label', NEW.label,
             'starts_at', NEW.starts_at,
             'ends_at', NEW.ends_at,
             'status', NEW.status,
             'confirmed_at', NEW.confirmed_at,
             'confirmed_by_staff_id', NEW.confirmed_by_staff_id
         ),
         CURRENT_TIMESTAMP);
END");

        DB::unprepared("CREATE TRIGGER {$this->identifier('pmd_shift_audit_shift_au_v1')}
AFTER UPDATE ON {$shifts}
FOR EACH ROW
BEGIN
    IF NOT (OLD.shift_date <=> NEW.shift_date)
       OR NOT (OLD.label <=> NEW.label)
       OR NOT (OLD.starts_at <=> NEW.starts_at)
       OR NOT (OLD.ends_at <=> NEW.ends_at)
       OR NOT (OLD.status <=> NEW.status)
       OR NOT (OLD.confirmed_at <=> NEW.confirmed_at)
       OR NOT (OLD.confirmed_by_staff_id <=> NEW.confirmed_by_staff_id) THEN
        INSERT INTO {$audit}
            (location_id, shift_id, person_id, event_type, source,
             actor_admin_user_id, actor_staff_id, actor_name_snapshot, actor_role_snapshot,
             target_name_snapshot, before_json, after_json, created_at)
        VALUES
            (NEW.location_id, NEW.id, NULL,
             CASE
                 WHEN LOWER(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled')
                      AND LOWER(COALESCE(OLD.status, '')) NOT IN ('cancelled', 'canceled')
                     THEN 'shift_cancelled'
                 WHEN NEW.confirmed_at IS NOT NULL AND NOT (OLD.confirmed_at <=> NEW.confirmed_at)
                     THEN 'shift_confirmed'
                 ELSE 'shift_updated'
             END,
             COALESCE(NULLIF(@pmd_audit_source, ''), 'system'),
             @pmd_actor_admin_user_id, @pmd_actor_staff_id,
             NULLIF(@pmd_actor_name, ''), NULLIF(@pmd_actor_role, ''),
             NULL,
             JSON_OBJECT(
                 'shift_date', OLD.shift_date,
                 'label', OLD.label,
                 'starts_at', OLD.starts_at,
                 'ends_at', OLD.ends_at,
                 'status', OLD.status,
                 'confirmed_at', OLD.confirmed_at,
                 'confirmed_by_staff_id', OLD.confirmed_by_staff_id
             ),
             JSON_OBJECT(
                 'shift_date', NEW.shift_date,
                 'label', NEW.label,
                 'starts_at', NEW.starts_at,
                 'ends_at', NEW.ends_at,
                 'status', NEW.status,
                 'confirmed_at', NEW.confirmed_at,
                 'confirmed_by_staff_id', NEW.confirmed_by_staff_id
             ),
             CURRENT_TIMESTAMP);
    END IF;
END");

        DB::unprepared("CREATE TRIGGER {$this->identifier('pmd_shift_audit_person_ai_v1')}
AFTER INSERT ON {$people}
FOR EACH ROW
BEGIN
    INSERT INTO {$audit}
        (location_id, shift_id, person_id, event_type, source,
         actor_admin_user_id, actor_staff_id, actor_name_snapshot, actor_role_snapshot,
         target_name_snapshot, before_json, after_json, created_at)
    VALUES
        (COALESCE((SELECT s.location_id FROM {$shifts} s WHERE s.id = NEW.shift_id LIMIT 1), 0),
         NEW.shift_id, NEW.person_id,
         CASE WHEN COALESCE(NEW.is_replacement, 0) = 1 THEN 'replacement_added' ELSE 'assignment_added' END,
         COALESCE(NULLIF(@pmd_audit_source, ''), 'system'),
         @pmd_actor_admin_user_id, @pmd_actor_staff_id,
         NULLIF(@pmd_actor_name, ''), NULLIF(@pmd_actor_role, ''),
         NEW.display_name_snapshot,
         NULL,
         JSON_OBJECT(
             'name', NEW.display_name_snapshot,
             'department', NEW.department_snapshot,
             'job_role', NEW.job_role_snapshot,
             'attendance_status', NEW.attendance_status,
             'is_replacement', NEW.is_replacement
         ),
         CURRENT_TIMESTAMP);
END");

        DB::unprepared("CREATE TRIGGER {$this->identifier('pmd_shift_audit_person_au_v1')}
AFTER UPDATE ON {$people}
FOR EACH ROW
BEGIN
    IF NOT (OLD.person_id <=> NEW.person_id)
       OR NOT (OLD.display_name_snapshot <=> NEW.display_name_snapshot)
       OR NOT (OLD.department_snapshot <=> NEW.department_snapshot)
       OR NOT (OLD.job_role_snapshot <=> NEW.job_role_snapshot)
       OR NOT (OLD.attendance_status <=> NEW.attendance_status)
       OR NOT (OLD.is_replacement <=> NEW.is_replacement) THEN
        INSERT INTO {$audit}
            (location_id, shift_id, person_id, event_type, source,
             actor_admin_user_id, actor_staff_id, actor_name_snapshot, actor_role_snapshot,
             target_name_snapshot, before_json, after_json, created_at)
        VALUES
            (COALESCE((SELECT s.location_id FROM {$shifts} s WHERE s.id = NEW.shift_id LIMIT 1), 0),
             NEW.shift_id, NEW.person_id,
             CASE
                 WHEN NOT (OLD.attendance_status <=> NEW.attendance_status) THEN 'attendance_changed'
                 ELSE 'assignment_updated'
             END,
             COALESCE(NULLIF(@pmd_audit_source, ''), 'system'),
             @pmd_actor_admin_user_id, @pmd_actor_staff_id,
             NULLIF(@pmd_actor_name, ''), NULLIF(@pmd_actor_role, ''),
             NEW.display_name_snapshot,
             JSON_OBJECT(
                 'name', OLD.display_name_snapshot,
                 'department', OLD.department_snapshot,
                 'job_role', OLD.job_role_snapshot,
                 'attendance_status', OLD.attendance_status,
                 'is_replacement', OLD.is_replacement
             ),
             JSON_OBJECT(
                 'name', NEW.display_name_snapshot,
                 'department', NEW.department_snapshot,
                 'job_role', NEW.job_role_snapshot,
                 'attendance_status', NEW.attendance_status,
                 'is_replacement', NEW.is_replacement
             ),
             CURRENT_TIMESTAMP);
    END IF;
END");

        DB::unprepared("CREATE TRIGGER {$this->identifier('pmd_shift_audit_person_ad_v1')}
AFTER DELETE ON {$people}
FOR EACH ROW
BEGIN
    INSERT INTO {$audit}
        (location_id, shift_id, person_id, event_type, source,
         actor_admin_user_id, actor_staff_id, actor_name_snapshot, actor_role_snapshot,
         target_name_snapshot, before_json, after_json, created_at)
    VALUES
        (COALESCE((SELECT s.location_id FROM {$shifts} s WHERE s.id = OLD.shift_id LIMIT 1), 0),
         OLD.shift_id, OLD.person_id, 'assignment_removed',
         COALESCE(NULLIF(@pmd_audit_source, ''), 'system'),
         @pmd_actor_admin_user_id, @pmd_actor_staff_id,
         NULLIF(@pmd_actor_name, ''), NULLIF(@pmd_actor_role, ''),
         OLD.display_name_snapshot,
         JSON_OBJECT(
             'name', OLD.display_name_snapshot,
             'department', OLD.department_snapshot,
             'job_role', OLD.job_role_snapshot,
             'attendance_status', OLD.attendance_status,
             'is_replacement', OLD.is_replacement
         ),
         NULL,
         CURRENT_TIMESTAMP);
END");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            foreach (self::TRIGGERS as $trigger) {
                DB::unprepared('DROP TRIGGER IF EXISTS '.$this->identifier($trigger));
            }
        }

        Schema::dropIfExists('pmd_operational_shift_audit_events');
    }

    private function identifier(string $value): string
    {
        return '`'.str_replace('`', '``', $value).'`';
    }
};
