<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFiskalyConfigsTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('fiskaly_configs')) {
            Schema::create('fiskaly_configs', function (Blueprint $table) {
                $table->bigIncrements('fiskaly_config_id');
                $table->unsignedInteger('location_id')->default(1)->index();
                $table->string('provider', 50)->default('fiskaly');
                $table->string('environment', 20)->default('test'); // test|live
                $table->string('api_key', 255)->nullable();
                $table->string('api_secret', 255)->nullable();
                $table->string('organization_id', 100)->nullable();
                $table->string('managed_organization_id', 100)->nullable();
                $table->string('tss_id', 100)->nullable();
                $table->string('client_id', 100)->nullable();
                $table->string('cash_register_id', 100)->nullable();
                $table->string('taxpayer_id', 100)->nullable();
                $table->string('establishment_id', 100)->nullable();
                $table->string('submission_id', 100)->nullable();
                $table->boolean('is_enabled')->default(false);
                $table->text('last_error')->nullable();
                $table->json('meta')->nullable();
                $table->timestamps();

                $table->unique(['location_id'], 'uq_fiskaly_configs_location');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('fiskaly_configs');
    }
}
