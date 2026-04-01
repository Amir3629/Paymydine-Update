<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFiskalyColumnsToOrdersTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'fiskaly_status')) {
                    $table->string('fiskaly_status', 50)->nullable()->after('stripe_payment_intent_id');
                }
                if (!Schema::hasColumn('orders', 'fiskaly_transaction_id_ref')) {
                    $table->unsignedBigInteger('fiskaly_transaction_id_ref')->nullable()->after('fiskaly_status');
                }
                if (!Schema::hasColumn('orders', 'fiskaly_qr_code_data')) {
                    $table->text('fiskaly_qr_code_data')->nullable()->after('fiskaly_transaction_id_ref');
                }
                if (!Schema::hasColumn('orders', 'fiskaly_signature_counter')) {
                    $table->string('fiskaly_signature_counter', 100)->nullable()->after('fiskaly_qr_code_data');
                }
                if (!Schema::hasColumn('orders', 'fiskaly_tx_number')) {
                    $table->string('fiskaly_tx_number', 100)->nullable()->after('fiskaly_signature_counter');
                }
                if (!Schema::hasColumn('orders', 'fiskaly_serial_number')) {
                    $table->string('fiskaly_serial_number', 191)->nullable()->after('fiskaly_tx_number');
                }
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                foreach ([
                    'fiskaly_status',
                    'fiskaly_transaction_id_ref',
                    'fiskaly_qr_code_data',
                    'fiskaly_signature_counter',
                    'fiskaly_tx_number',
                    'fiskaly_serial_number',
                ] as $col) {
                    if (Schema::hasColumn('orders', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
}
