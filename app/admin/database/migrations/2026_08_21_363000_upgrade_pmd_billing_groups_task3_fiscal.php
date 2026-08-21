<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pmd_billing_groups')) return;

        Schema::table('pmd_billing_groups', function (Blueprint $table): void {
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_revision')) {
                $table->unsignedSmallInteger('fiscal_revision')->default(0)->after('fiskaly_receipt');
            }
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_attempts')) {
                $table->unsignedInteger('fiscal_attempts')->default(0)->after('fiscal_revision');
            }
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_error')) {
                $table->text('fiscal_error')->nullable()->after('fiscal_attempts');
            }
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_policy_snapshot')) {
                $table->json('fiscal_policy_snapshot')->nullable()->after('fiscal_error');
            }
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscalized_at')) {
                $table->dateTime('fiscalized_at')->nullable()->after('fiscal_policy_snapshot');
            }
        });
    }

    public function down(): void
    {
        // Non-destructive. Fiscal evidence/retry metadata must survive code rollback.
    }
};
