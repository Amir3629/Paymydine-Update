<?php

namespace App\Services\Integrations;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive schema used by every PMD tenant, independent of country.
 */
final class TenantIntegrationSecretSchemaService
{
    public function ensure(string $connection): array
    {
        $schema = Schema::connection($connection);
        $created = false;

        if (!$schema->hasTable('pmd_integration_secret_references')) {
            $schema->create('pmd_integration_secret_references', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->nullable()->index();
                $table->string('country_code', 8)->nullable()->index();
                $table->string('provider_code', 80)->index();
                $table->string('environment', 24)->default('production')->index();
                $table->string('secret_name', 100);
                $table->string('secret_reference', 500);
                $table->boolean('enabled')->default(true)->index();
                $table->timestamp('last_resolved_at')->nullable();
                $table->text('last_error')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'provider_code', 'environment', 'secret_name'],
                    'pmd_integration_secret_ref_uq'
                );
            });
            $created = true;
        }

        return [
            'table' => $schema->hasTable('pmd_integration_secret_references'),
            'created' => $created,
        ];
    }
}
