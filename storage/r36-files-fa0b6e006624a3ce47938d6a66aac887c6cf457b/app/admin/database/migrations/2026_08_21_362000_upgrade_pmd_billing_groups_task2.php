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
            if (!Schema::hasColumn('pmd_billing_groups', 'closed_at')) {
                $table->dateTime('closed_at')->nullable()->after('invoiced_at');
            }
            if (!Schema::hasColumn('pmd_billing_groups', 'closed_by')) {
                $table->unsignedBigInteger('closed_by')->nullable()->after('closed_at');
            }
        });
    }

    public function down(): void
    {
        // Non-destructive: visit/invoice evidence must survive application rollback.
    }
};
