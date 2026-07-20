<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add MAC Address to Devices
 * MAC address helps identify network devices uniquely
 */
class AddMacAddressToDevices extends Migration
{
    public function up()
    {
        Schema::table('finger_devices', function (Blueprint $table) {
            $table->string('mac_address', 17)->nullable()->after('ip')
                ->comment('MAC address for network device identification');
            
            $table->index('mac_address');
        });
    }

    public function down()
    {
        Schema::table('finger_devices', function (Blueprint $table) {
            $table->dropColumn('mac_address');
        });
    }
}

