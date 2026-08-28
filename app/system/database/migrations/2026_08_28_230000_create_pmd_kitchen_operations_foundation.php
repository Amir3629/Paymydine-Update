<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdKitchenOperationsFoundation extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_operational_people')) {
            Schema::create('pmd_operational_people', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->default(1);
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('display_name', 128);
                $table->string('department', 32)->default('kitchen');
                $table->string('job_role', 64)->nullable();
                $table->string('station_slug', 80)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['location_id', 'department', 'is_active'], 'pmd_people_location_department_active_idx');
                $table->index(['location_id', 'staff_id'], 'pmd_people_location_staff_idx');
            });
        }

        if (!Schema::hasTable('pmd_operational_shifts')) {
            Schema::create('pmd_operational_shifts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->default(1);
                $table->date('shift_date');
                $table->string('label', 64)->default('Shift');
                $table->time('starts_at')->nullable();
                $table->time('ends_at')->nullable();
                $table->string('status', 20)->default('planned');
                $table->json('quick_counts_json')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->unsignedBigInteger('confirmed_by_staff_id')->nullable();
                $table->timestamps();

                $table->index(['location_id', 'shift_date', 'status'], 'pmd_ops_shift_location_date_status_idx');
                $table->index(['location_id', 'confirmed_at'], 'pmd_ops_shift_confirmed_idx');
            });
        }

        if (!Schema::hasTable('pmd_operational_shift_people')) {
            Schema::create('pmd_operational_shift_people', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('shift_id');
                $table->unsignedBigInteger('person_id')->nullable();
                $table->string('display_name_snapshot', 128);
                $table->string('department_snapshot', 32)->default('kitchen');
                $table->string('job_role_snapshot', 64)->nullable();
                $table->string('attendance_status', 20)->default('planned');
                $table->boolean('is_replacement')->default(false);
                $table->timestamps();

                $table->index(['shift_id', 'department_snapshot', 'attendance_status'], 'pmd_ops_shift_people_state_idx');
                $table->unique(['shift_id', 'person_id'], 'pmd_ops_shift_person_unique');
            });
        }

        if (Schema::hasTable('orders')) {
            $missing = [
                'kitchen_released_at' => !Schema::hasColumn('orders', 'kitchen_released_at'),
                'kitchen_preparing_at' => !Schema::hasColumn('orders', 'kitchen_preparing_at'),
                'kitchen_ready_at' => !Schema::hasColumn('orders', 'kitchen_ready_at'),
                'eta_initial_minutes' => !Schema::hasColumn('orders', 'eta_initial_minutes'),
                'eta_due_at' => !Schema::hasColumn('orders', 'eta_due_at'),
                'eta_extension_count' => !Schema::hasColumn('orders', 'eta_extension_count'),
                'eta_last_extended_at' => !Schema::hasColumn('orders', 'eta_last_extended_at'),
            ];

            Schema::table('orders', function (Blueprint $table) use ($missing) {
                if ($missing['kitchen_released_at']) $table->timestamp('kitchen_released_at')->nullable()->index();
                if ($missing['kitchen_preparing_at']) $table->timestamp('kitchen_preparing_at')->nullable()->index();
                if ($missing['kitchen_ready_at']) $table->timestamp('kitchen_ready_at')->nullable()->index();
                if ($missing['eta_initial_minutes']) $table->unsignedSmallInteger('eta_initial_minutes')->nullable();
                if ($missing['eta_due_at']) $table->timestamp('eta_due_at')->nullable()->index();
                if ($missing['eta_extension_count']) $table->unsignedTinyInteger('eta_extension_count')->default(0);
                if ($missing['eta_last_extended_at']) $table->timestamp('eta_last_extended_at')->nullable();
            });
        }

        if (!Schema::hasTable('pmd_order_eta_events')) {
            Schema::create('pmd_order_eta_events', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('location_id')->default(1);
                $table->string('event_type', 32);
                $table->string('reason', 96)->nullable();
                $table->unsignedSmallInteger('previous_eta_minutes')->nullable();
                $table->unsignedSmallInteger('new_eta_minutes')->nullable();
                $table->unsignedSmallInteger('extension_minutes')->default(0);
                $table->json('snapshot_json')->nullable();
                $table->timestamps();

                $table->index(['order_id', 'created_at'], 'pmd_eta_event_order_time_idx');
                $table->index(['location_id', 'event_type', 'created_at'], 'pmd_eta_event_location_type_time_idx');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pmd_order_eta_events');

        if (Schema::hasTable('orders')) {
            $existing = array_values(array_filter([
                Schema::hasColumn('orders', 'kitchen_released_at') ? 'kitchen_released_at' : null,
                Schema::hasColumn('orders', 'kitchen_preparing_at') ? 'kitchen_preparing_at' : null,
                Schema::hasColumn('orders', 'kitchen_ready_at') ? 'kitchen_ready_at' : null,
                Schema::hasColumn('orders', 'eta_initial_minutes') ? 'eta_initial_minutes' : null,
                Schema::hasColumn('orders', 'eta_due_at') ? 'eta_due_at' : null,
                Schema::hasColumn('orders', 'eta_extension_count') ? 'eta_extension_count' : null,
                Schema::hasColumn('orders', 'eta_last_extended_at') ? 'eta_last_extended_at' : null,
            ]));
            if ($existing) {
                Schema::table('orders', function (Blueprint $table) use ($existing) {
                    $table->dropColumn($existing);
                });
            }
        }

        Schema::dropIfExists('pmd_operational_shift_people');
        Schema::dropIfExists('pmd_operational_shifts');
        Schema::dropIfExists('pmd_operational_people');
    }
}
