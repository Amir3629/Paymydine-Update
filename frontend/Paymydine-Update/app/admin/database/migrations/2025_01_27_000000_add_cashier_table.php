<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('cashiers')) {
            Schema::create('cashiers', function (Blueprint $table) {
                $table->bigIncrements('cashier_id');
                $table->string('name')->nullable();
                $table->unsignedBigInteger('location_id')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('locationables') && Schema::hasColumn('cashiers', 'cashier_id')) {
            $cashierId = DB::table('cashiers')->value('cashier_id');

            if ($cashierId) {
                $exists = DB::table('locationables')
                    ->where('location_id', 1)
                    ->where('locationable_id', $cashierId)
                    ->where('locationable_type', 'cashiers')
                    ->exists();

                if (!$exists) {
                    $data = [
                        'location_id' => 1,
                        'locationable_id' => $cashierId,
                        'locationable_type' => 'cashiers',
                    ];

                    if (Schema::hasColumn('locationables', 'created_at')) {
                        $data['created_at'] = now();
                    }

                    if (Schema::hasColumn('locationables', 'updated_at')) {
                        $data['updated_at'] = now();
                    }

                    DB::table('locationables')->insert($data);
                }
            }
        }
    }

    public function down()
    {
        if (Schema::hasTable('cashiers')) {
            Schema::dropIfExists('cashiers');
        }
    }
};
