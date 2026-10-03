<?php

namespace App\Services\Payments;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class TenantProviderSchemaService
{
    /**
     * Ensure the provider/terminal schema on one already configured database
     * connection. This method is additive and idempotent.
     */
    public function ensure(string $connection): array
    {
        $schema = Schema::connection($connection);
        $createdProviderConfigTable = false;
        $addedTerminalEnvironment = false;

        if (!$schema->hasTable('terminal_provider_configs')) {
            $schema->create('terminal_provider_configs', function (Blueprint $table): void {
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

                $table->unique(
                    ['provider_code', 'environment'],
                    'terminal_provider_env_unique'
                );
            });

            $createdProviderConfigTable = true;
        }

        if ($schema->hasTable('terminal_devices')
            && !$schema->hasColumn('terminal_devices', 'environment')) {
            $hasProviderCode = $schema->hasColumn('terminal_devices', 'provider_code');

            $schema->table('terminal_devices', function (Blueprint $table) use ($hasProviderCode): void {
                $column = $table->string('environment', 20)->nullable()->index();
                if ($hasProviderCode) {
                    $column->after('provider_code');
                }
            });

            $addedTerminalEnvironment = true;
        }

        return [
            'provider_config_table' => $schema->hasTable('terminal_provider_configs'),
            'terminal_devices_table' => $schema->hasTable('terminal_devices'),
            'terminal_environment_column' => !$schema->hasTable('terminal_devices')
                || $schema->hasColumn('terminal_devices', 'environment'),
            'created_provider_config_table' => $createdProviderConfigTable,
            'added_terminal_environment' => $addedTerminalEnvironment,
        ];
    }
}
