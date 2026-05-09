<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CreateTerminalDevicesPlatformTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('terminal_devices_platform')) {
            Schema::create('terminal_devices_platform', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('ip_address')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('inactive');
                $table->string('model')->nullable();
                $table->timestamp('last_active')->nullable();
                $table->enum('connection_type', ['SumUp', 'Worldline', 'Other']);
                $table->string('location')->nullable();
                $table->timestamp('last_sync')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('terminal_devices_platform') && DB::table('terminal_devices_platform')->count() === 0) {
            DB::table('terminal_devices_platform')->insert([
                [
                    'name' => 'Front Counter SumUp 01',
                    'ip_address' => '192.168.10.21',
                    'status' => 'active',
                    'model' => 'SumUp Solo',
                    'last_active' => now()->subMinutes(12),
                    'connection_type' => 'SumUp',
                    'location' => 'Front Counter',
                    'last_sync' => now()->subMinutes(20),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Patio Worldline 02',
                    'ip_address' => '192.168.10.34',
                    'status' => 'inactive',
                    'model' => 'Worldline Valina',
                    'last_active' => now()->subHours(5),
                    'connection_type' => 'Worldline',
                    'location' => 'Outdoor Patio',
                    'last_sync' => now()->subHours(6),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Backup Terminal 03',
                    'ip_address' => null,
                    'status' => 'inactive',
                    'model' => 'Generic POS Reader',
                    'last_active' => null,
                    'connection_type' => 'Other',
                    'location' => 'Office Safe',
                    'last_sync' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    public function down()
    {
        Schema::dropIfExists('terminal_devices_platform');
    }
}
