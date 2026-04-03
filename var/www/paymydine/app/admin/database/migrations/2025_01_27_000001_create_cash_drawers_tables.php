<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('cash_drawers')) {
            Schema::create('cash_drawers', function (Blueprint $table) {
                $table->bigIncrements('drawer_id');
                $table->string('name', 128);
                $table->unsignedBigInteger('location_id')->nullable();
                $table->unsignedBigInteger('pos_device_id')->nullable();
                $table->enum('connection_type', ['rj11_printer', 'usb', 'serial', 'network', 'integrated'])->default('rj11_printer');
                $table->string('device_path', 255)->nullable();
                $table->unsignedBigInteger('printer_id')->nullable();
                $table->string('esc_pos_command', 50)->default('27,112,0,60,120');
                $table->enum('voltage', ['12V', '24V'])->default('12V');
                $table->string('network_ip', 45)->nullable();
                $table->integer('network_port')->nullable()->default(9100);
                $table->string('serial_port', 50)->nullable();
                $table->integer('serial_baud_rate')->nullable()->default(9600);
                $table->string('usb_vendor_id', 10)->nullable();
                $table->string('usb_product_id', 10)->nullable();
                $table->text('connection_config')->nullable();
                $table->boolean('status')->default(1);
                $table->boolean('auto_open_on_cash')->default(1);
                $table->boolean('test_on_save')->default(1);
                $table->text('description')->nullable();
                $table->timestamps();

                $table->index('location_id');
                $table->index('pos_device_id');
                $table->index('printer_id');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('cash_drawer_logs')) {
            Schema::create('cash_drawer_logs', function (Blueprint $table) {
                $table->bigIncrements('log_id');
                $table->unsignedBigInteger('drawer_id');
                $table->unsignedBigInteger('order_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('action', 50)->nullable();
                $table->string('status', 50)->nullable();
                $table->text('message')->nullable();
                $table->text('request_payload')->nullable();
                $table->text('response_payload')->nullable();
                $table->timestamps();

                $table->index('drawer_id');
                $table->index('order_id');
                $table->index('staff_id');
                $table->index('action');
                $table->index('status');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('cash_drawer_logs');
        Schema::dropIfExists('cash_drawers');
    }
};
