<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pos_configs')) {
            return;
        }

        Schema::table('pos_configs', function (Blueprint $table): void {
            if (!Schema::hasColumn('pos_configs', 'sumup_affiliate_key')) {
                $table->string('sumup_affiliate_key', 191)->nullable()->after('id_application');
            }
            if (!Schema::hasColumn('pos_configs', 'sumup_reader_id')) {
                $table->string('sumup_reader_id', 191)->nullable()->after('sumup_affiliate_key');
            }
            if (!Schema::hasColumn('pos_configs', 'sumup_pairing_code')) {
                $table->string('sumup_pairing_code', 191)->nullable()->after('sumup_reader_id');
            }
            if (!Schema::hasColumn('pos_configs', 'sumup_pairing_state')) {
                $table->string('sumup_pairing_state', 50)->nullable()->after('sumup_pairing_code');
            }
            if (!Schema::hasColumn('pos_configs', 'sumup_reader_label')) {
                $table->string('sumup_reader_label', 191)->nullable()->after('sumup_pairing_state');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('pos_configs')) {
            return;
        }

        Schema::table('pos_configs', function (Blueprint $table): void {
            foreach (['sumup_reader_label', 'sumup_pairing_state', 'sumup_pairing_code', 'sumup_reader_id', 'sumup_affiliate_key'] as $column) {
                if (Schema::hasColumn('pos_configs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
