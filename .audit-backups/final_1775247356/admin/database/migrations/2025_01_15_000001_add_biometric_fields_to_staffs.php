<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBiometricFieldsToStaffs extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('staffs', function (Blueprint $table) {
            if (!Schema::hasColumn('staffs', 'card_id')) {
                $table->string('card_id', 255)->nullable()->unique()->after('staff_email');
            }
            if (!Schema::hasColumn('staffs', 'fingerprint_template')) {
                $table->text('fingerprint_template')->nullable()->after('card_id');
            }
            if (!Schema::hasColumn('staffs', 'biometric_enabled')) {
                $table->boolean('biometric_enabled')->default(0)->after('fingerprint_template');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('staffs', function (Blueprint $table) {
            if (Schema::hasColumn('staffs', 'card_id')) {
                $table->dropColumn('card_id');
            }
            if (Schema::hasColumn('staffs', 'fingerprint_template')) {
                $table->dropColumn('fingerprint_template');
            }
            if (Schema::hasColumn('staffs', 'biometric_enabled')) {
                $table->dropColumn('biometric_enabled');
            }
        });
    }
}

