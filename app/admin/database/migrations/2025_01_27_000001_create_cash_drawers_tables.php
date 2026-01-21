<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCashDrawersTables extends Migration
{
    public function up()
    {
        // Cash Drawers Table
        Schema::create('cash_drawers', function (Blueprint $table) {
            $table->bigIncrements('drawer_id');
            $table->string('name', 128);
            $table->unsignedBigInteger('location_id')->nullable();
            $table->unsignedBigInteger('pos_device_id')->nullable();
            $table->enum('connection_type', ['rj11_printer', 'usb', 'serial', 'network', 'integrated'])->default('rj11_printer');
            $table->string('device_path', 255)->nullable()->comment('COM port, USB path, IP address, or printer name');
            $table->unsignedBigInteger('printer_id')->nullable()->comment('If RJ11, link to printer device');
            $table->string('esc_pos_command', 50)->default('27,112,0,60,120')->comment('ESC/POS command for drawer open');
            $table->enum('voltage', ['12V', '24V'])->default('12V');
            $table->string('network_ip', 45)->nullable()->comment('IP address for network drawers');
            $table->integer('network_port')->nullable()->default(9100)->comment('Port for network drawers');
            $table->string('serial_port', 50)->nullable()->comment('COM port for serial drawers');
            $table->integer('serial_baud_rate')->nullable()->default(9600)->comment('Baud rate for serial');
            $table->string('usb_vendor_id', 10)->nullable()->comment('USB vendor ID');
            $table->string('usb_product_id', 10)->nullable()->comment('USB product ID');
            $table->text('connection_config')->nullable()->comment('JSON config for advanced settings');
            $table->boolean('status')->default(true);
            $table->boolean('auto_open_on_cash')->default(true)->comment('Auto-open when cash payment is processed');
            $table->boolean('test_on_save')->default(true)->comment('Test connection when saving');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('location_id');
            $table->index('pos_device_id');
            $table->index('connection_type');
            $table->index('status');
        });

        // Cash Drawer Logs Table
        Schema::create('cash_drawer_logs', function (Blueprint $table) {
            $table->bigIncrements('log_id');
            $table->unsignedBigInteger('drawer_id');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('location_id')->nullable();
            $table->enum('action', ['open', 'close', 'test', 'error', 'manual'])->default('open');
            $table->string('trigger_method', 50)->nullable()->comment('cash_payment, manual, test, scheduled');
            $table->boolean('success')->default(true);
            $table->text('error_message')->nullable();
            $table->text('response_data')->nullable()->comment('JSON response from drawer');
            $table->timestamps();

            $table->index('drawer_id');
            $table->index('order_id');
            $table->index('location_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cash_drawer_logs');
        Schema::dropIfExists('cash_drawers');
    }
}
