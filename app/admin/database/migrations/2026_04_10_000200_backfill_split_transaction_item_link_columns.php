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

        $requiredItemsColumns = ['transaction_id', 'order_menu_id', 'menu_id'];
        foreach ($requiredItemsColumns as $column) {
            if (!Schema::hasColumn('order_payment_transaction_items', $column)) {
                return;
            }
        }

        $prefix = DB::getTablePrefix();
        $itemsTable = $prefix.'order_payment_transaction_items';
        $transactionsTable = $prefix.'order_payment_transactions';
        $orderMenusTable = $prefix.'order_menus';

        if (Schema::hasTable('order_menus')
            && Schema::hasColumn('order_menus', 'order_menu_id')
            && Schema::hasColumn('order_menus', 'menu_id')) {
            DB::statement("\n                UPDATE `{$itemsTable}` opti\n                JOIN `{$orderMenusTable}` om ON om.order_menu_id = opti.order_menu_id\n                SET opti.menu_id = om.menu_id\n                WHERE opti.menu_id IS NULL\n                  AND opti.order_menu_id IS NOT NULL\n            ");
        }

        if (!Schema::hasTable('order_payment_transactions')
            || !Schema::hasTable('order_menus')
            || !Schema::hasColumn('order_payment_transactions', 'id')
            || !Schema::hasColumn('order_payment_transactions', 'order_id')
            || !Schema::hasColumn('order_menus', 'order_id')
            || !Schema::hasColumn('order_menus', 'menu_id')
            || !Schema::hasColumn('order_menus', 'order_menu_id')) {
            return;
        }

        DB::statement("\n            UPDATE `{$itemsTable}` opti\n            JOIN `{$transactionsTable}` opt ON opt.id = opti.transaction_id\n            JOIN (\n                SELECT order_id, menu_id, MIN(order_menu_id) AS order_menu_id, COUNT(*) AS cnt\n                FROM `{$orderMenusTable}`\n                GROUP BY order_id, menu_id\n            ) map ON map.order_id = opt.order_id AND map.menu_id = opti.menu_id\n            SET opti.order_menu_id = map.order_menu_id\n            WHERE opti.order_menu_id IS NULL\n              AND opti.menu_id IS NOT NULL\n              AND map.cnt = 1\n        ");
    }

    public function down(): void
    {
        // no-op: compatibility migration should be non-destructive
    }
};
