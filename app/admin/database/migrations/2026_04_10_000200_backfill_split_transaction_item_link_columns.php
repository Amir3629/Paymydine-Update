<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_payment_transaction_items')) {
            return;
        }

        Schema::table('order_payment_transaction_items', function (Blueprint $table): void {
            if (!Schema::hasColumn('order_payment_transaction_items', 'order_menu_id')) {
                $table->unsignedBigInteger('order_menu_id')->nullable()->after('transaction_id');
            }
            if (!Schema::hasColumn('order_payment_transaction_items', 'menu_id')) {
                $table->unsignedBigInteger('menu_id')->nullable()->after('order_menu_id');
            }
        });

        // Keep legacy menu_id populated from order_menus where possible
        if (Schema::hasColumn('order_payment_transaction_items', 'order_menu_id')
            && Schema::hasColumn('order_payment_transaction_items', 'menu_id')) {
            DB::statement("
                UPDATE order_payment_transaction_items ti
                JOIN order_menus om ON om.order_menu_id = ti.order_menu_id
                SET ti.menu_id = om.menu_id
                WHERE ti.menu_id IS NULL
            ");
        }

        // Backfill missing order_menu_id safely only where a transaction's order has a single matching menu row
        if (Schema::hasColumn('order_payment_transaction_items', 'order_menu_id')
            && Schema::hasColumn('order_payment_transaction_items', 'menu_id')
            && Schema::hasTable('order_payment_transactions')) {
            DB::statement("
                UPDATE order_payment_transaction_items ti
                JOIN order_payment_transactions t ON t.id = ti.transaction_id
                JOIN (
                    SELECT order_id, menu_id, MIN(order_menu_id) AS order_menu_id, COUNT(*) AS cnt
                    FROM order_menus
                    GROUP BY order_id, menu_id
                ) map ON map.order_id = t.order_id AND map.menu_id = ti.menu_id
                SET ti.order_menu_id = map.order_menu_id
                WHERE ti.order_menu_id IS NULL
                  AND ti.menu_id IS NOT NULL
                  AND map.cnt = 1
            ");
        }
    }

    public function down(): void
    {
        // no-op: compatibility migration should be non-destructive
    }
};
