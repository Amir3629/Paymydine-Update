<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('terminal_provider_configs')) {
            Schema::create('terminal_provider_configs', function (Blueprint $table): void {
                $table->bigIncrements('terminal_provider_config_id');
                $table->string('provider_code', 50)->index();
                $table->string('environment', 20)->default('production')->index();
                $table->string('api_base_url', 191)->default('https://api.sumup.com');
                $table->longText('access_token_encrypted')->nullable();
                $table->longText('affiliate_key_encrypted')->nullable();
                $table->string('merchant_code', 191)->nullable();
                $table->string('app_id', 191)->nullable();
                $table->boolean('is_active')->default(false)->index();
                $table->string('connection_status', 30)->default('not_configured');
                $table->timestamp('last_tested_at')->nullable();
                $table->text('last_error')->nullable();
                $table->longText('metadata')->nullable();
                $table->timestamps();

                $table->unique(['provider_code', 'environment'], 'terminal_provider_env_unique');
            });
        }

        if (Schema::hasTable('terminal_devices') && !Schema::hasColumn('terminal_devices', 'environment')) {
            Schema::table('terminal_devices', function (Blueprint $table): void {
                $table->string('environment', 20)->nullable()->index()->after('provider_code');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('terminal_devices') && Schema::hasColumn('terminal_devices', 'environment')) {
            Schema::table('terminal_devices', function (Blueprint $table): void {
                $table->dropColumn('environment');
            });
        }

        Schema::dropIfExists('terminal_provider_configs');
    }
};
