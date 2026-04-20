<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('vr_payment_sessions')) {
            return;
        }

        Schema::table('vr_payment_sessions', function (Blueprint $table): void {
            if (!Schema::hasColumn('vr_payment_sessions', 'tenant_host')) {
                $table->string('tenant_host', 191)->nullable()->index()->after('provider_code');
            }
            if (!Schema::hasColumn('vr_payment_sessions', 'tenant_database')) {
                $table->string('tenant_database', 191)->nullable()->index()->after('tenant_host');
            }
            if (!Schema::hasColumn('vr_payment_sessions', 'internal_correlation_id')) {
                $table->string('internal_correlation_id', 191)->nullable()->unique()->after('provider_reference');
            }
            if (!Schema::hasColumn('vr_payment_sessions', 'reserved_payment_reference')) {
                $table->string('reserved_payment_reference', 191)->nullable()->index()->after('internal_correlation_id');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('vr_payment_sessions')) {
            return;
        }

        Schema::table('vr_payment_sessions', function (Blueprint $table): void {
            if (Schema::hasColumn('vr_payment_sessions', 'reserved_payment_reference')) {
                $table->dropColumn('reserved_payment_reference');
            }
            if (Schema::hasColumn('vr_payment_sessions', 'internal_correlation_id')) {
                $table->dropUnique('vr_payment_sessions_internal_correlation_id_unique');
                $table->dropColumn('internal_correlation_id');
            }
            if (Schema::hasColumn('vr_payment_sessions', 'tenant_database')) {
                $table->dropColumn('tenant_database');
            }
            if (Schema::hasColumn('vr_payment_sessions', 'tenant_host')) {
                $table->dropColumn('tenant_host');
            }
        });
    }
};
