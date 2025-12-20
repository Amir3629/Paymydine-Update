<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddCashierTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        // Insert a default Cashier table
        $cashierTableId = DB::table('tables')->insertGetId([
            'table_name' => 'Cashier',
            'min_capacity' => 1,
            'max_capacity' => 1,
            'table_status' => 1,
            'extra_capacity' => 0,
            'is_joinable' => 0,
            'priority' => 999, // High priority to appear at the end
            'created_at' => now(),
            'updated_at' => now(),
            'qr_code' => 'cashier',
        ]);

        // Link the cashier table to the default location (location_id = 1)
        DB::table('locationables')->insert([
            'location_id' => 1,
            'locationable_id' => $cashierTableId,
            'locationable_type' => 'tables',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        // Find and remove the cashier table
        $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
        if ($cashierTable) {
            // Remove location relationship
            DB::table('locationables')
                ->where('locationable_id', $cashierTable->table_id)
                ->where('locationable_type', 'tables')
                ->delete();
            
            // Remove the table
            DB::table('tables')->where('table_id', $cashierTable->table_id)->delete();
        }
    }
}