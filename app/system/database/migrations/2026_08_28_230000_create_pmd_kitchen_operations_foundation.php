<?php

namespace System\Database\Migrations;

use App\Services\PmdKitchenOperationsSchemaService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

class CreatePmdKitchenOperationsFoundation extends Migration
{
    public function up()
    {
        app(PmdKitchenOperationsSchemaService::class)->ensure();
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
                Schema::table('orders', function ($table) use ($existing) {
                    $table->dropColumn($existing);
                });
            }
        }

        Schema::dropIfExists('pmd_operational_shift_people');
        Schema::dropIfExists('pmd_operational_shifts');
        Schema::dropIfExists('pmd_operational_people');
    }
}
