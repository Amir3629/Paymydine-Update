<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tables')) {
            Schema::table('tables', function (Blueprint $table): void {
                if (!Schema::hasColumn('tables', 'operational_status')) {
                    $table->string('operational_status', 32)->default('available')->after('table_status');
                }
                if (!Schema::hasColumn('tables', 'operational_status_updated_at')) {
                    $table->timestamp('operational_status_updated_at')->nullable()->after('operational_status');
                }
                if (!Schema::hasColumn('tables', 'operational_status_updated_by')) {
                    $table->unsignedBigInteger('operational_status_updated_by')->nullable()->after('operational_status_updated_at');
                }
            });

            try {
                Schema::table('tables', function (Blueprint $table): void {
                    $table->index('operational_status', 'tables_operational_status_index');
                });
            } catch (\Throwable $ignored) {
                // Existing installations may already have the index.
            }
        }

        if (!Schema::hasTable('pmd_table_status_history')) {
            Schema::create('pmd_table_status_history', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('table_id')->index();
                $table->string('old_status', 32)->nullable();
                $table->string('new_status', 32);
                $table->string('reason', 100)->nullable();
                $table->unsignedBigInteger('actor_id')->nullable()->index();
                $table->unsignedBigInteger('order_id')->nullable()->index();
                $table->json('context')->nullable();
                $table->timestamps();

                $table->index(['table_id', 'created_at'], 'pmd_table_status_history_table_time');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pmd_table_status_history')) {
            Schema::drop('pmd_table_status_history');
        }

        if (Schema::hasTable('tables')) {
            try {
                Schema::table('tables', function (Blueprint $table): void {
                    $table->dropIndex('tables_operational_status_index');
                });
            } catch (\Throwable $ignored) {
            }

            Schema::table('tables', function (Blueprint $table): void {
                foreach ([
                    'operational_status_updated_by',
                    'operational_status_updated_at',
                    'operational_status',
                ] as $column) {
                    if (Schema::hasColumn('tables', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
