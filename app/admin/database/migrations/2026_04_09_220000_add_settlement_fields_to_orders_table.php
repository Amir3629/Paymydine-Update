<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'settlement_status')) {
                $table->string('settlement_status', 20)
                    ->default('unpaid')
                    ->after('payment');
            }

            if (!Schema::hasColumn('orders', 'settled_amount')) {
                $table->decimal('settled_amount', 15, 4)
                    ->default(0)
                    ->after('settlement_status');
            }

            if (!Schema::hasColumn('orders', 'settlement_method')) {
                $table->string('settlement_method', 50)
                    ->nullable()
                    ->after('settled_amount');
            }

            if (!Schema::hasColumn('orders', 'settlement_reference')) {
                $table->string('settlement_reference', 255)
                    ->nullable()
                    ->after('settlement_method');
            }

            if (!Schema::hasColumn('orders', 'settled_at')) {
                $table->dateTime('settled_at')
                    ->nullable()
                    ->after('settlement_reference');
            }
        });

        // Backfill existing records with safe defaults.
        DB::table('orders')
            ->whereNull('settlement_status')
            ->update([
                'settlement_status' => DB::raw("CASE WHEN processed = 1 THEN 'paid' ELSE 'unpaid' END"),
            ]);

        DB::table('orders')
            ->where('processed', 1)
            ->where(function ($q) {
                $q->whereNull('settled_amount')->orWhere('settled_amount', '<=', 0);
            })
            ->update([
                'settled_amount' => DB::raw('COALESCE(order_total, 0)'),
            ]);

        DB::table('orders')
            ->where('processed', 1)
            ->whereNull('settled_at')
            ->update([
                'settled_at' => DB::raw('updated_at'),
            ]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $dropColumns = [];
            foreach ([
                'settlement_status',
                'settled_amount',
                'settlement_method',
                'settlement_reference',
                'settled_at',
            ] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    $dropColumns[] = $column;
                }
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};

