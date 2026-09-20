<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureOnActiveTenants();
    }

    public function down(): void
    {
        // Repair migration only. Do not remove live integration/review data.
    }

    private function ensureOnActiveTenants(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_google_schema_central', $centralConfig);
            DB::purge('pmd_google_schema_central');
            DB::reconnect('pmd_google_schema_central');

            $central = DB::connection('pmd_google_schema_central');
            if ($central->getSchemaBuilder()->hasTable('tenants')) {
                $rows = $central->table('tenants')
                    ->whereNotNull('database')
                    ->where('database', '<>', '')
                    ->where(function ($query): void {
                        $query->where('status', 'active')
                            ->orWhere('status', 'enabled')
                            ->orWhere('status', 1);
                    })
                    ->get();

                foreach ($rows as $row) {
                    $databases->push([
                        'database' => (string)$row->database,
                        'host' => $row->db_host ?? $centralConfig['host'] ?? null,
                        'port' => $row->db_port ?? $centralConfig['port'] ?? null,
                        'username' => $row->db_user ?? $centralConfig['username'] ?? null,
                        'password' => $row->db_pass ?? $centralConfig['password'] ?? null,
                    ]);
                }
            }

            $templateExists = (bool)$central->selectOne(
                'SELECT COUNT(*) AS aggregate FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                ['newtenantdb']
            )->aggregate;

            if ($templateExists) {
                $databases->push(array_merge($centralConfig, ['database' => 'newtenantdb']));
            }
        } catch (\Throwable $error) {
            logger()->warning('Google Business schema repair could not enumerate tenants', [
                'message' => $error->getMessage(),
            ]);
        }

        $seen = [];

        foreach ($databases as $config) {
            $database = trim((string)($config['database'] ?? ''));
            if ($database === '' || isset($seen[$database])) continue;
            $seen[$database] = true;

            $runtime = $centralConfig;
            foreach (['database', 'host', 'port', 'username', 'password'] as $key) {
                if (array_key_exists($key, $config) && $config[$key] !== null) {
                    $runtime[$key] = $config[$key];
                }
            }

            try {
                Config::set('database.connections.pmd_google_schema_tenant', $runtime);
                DB::purge('pmd_google_schema_tenant');
                DB::reconnect('pmd_google_schema_tenant');
                $this->ensureTables('pmd_google_schema_tenant');
            } catch (\Throwable $error) {
                logger()->error('Google Business schema repair failed for tenant', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_google_schema_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    private function ensureTables(string $connection): void
    {
        $schema = Schema::connection($connection);

        if (!$schema->hasTable('pmd_google_business_connections')) {
            $schema->create('pmd_google_business_connections', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->unique();
                $table->string('tenant_host', 191)->nullable()->index();
                $table->text('oauth_client_id_encrypted')->nullable();
                $table->text('oauth_client_secret_encrypted')->nullable();
                $table->text('places_api_key_encrypted')->nullable();
                $table->string('pubsub_topic', 500)->nullable();
                $table->text('pubsub_token_encrypted')->nullable();
                $table->timestamp('credentials_updated_at')->nullable();
                $table->string('google_account_name', 191)->nullable()->index();
                $table->string('google_account_display_name', 191)->nullable();
                $table->string('google_location_name', 191)->nullable()->index();
                $table->string('google_location_title', 191)->nullable();
                $table->string('google_place_id', 191)->nullable()->index();
                $table->text('google_maps_uri')->nullable();
                $table->text('google_write_review_uri')->nullable();
                $table->text('google_reviews_uri')->nullable();
                $table->text('access_token_encrypted')->nullable();
                $table->text('refresh_token_encrypted')->nullable();
                $table->timestamp('token_expires_at')->nullable();
                $table->text('scopes')->nullable();
                $table->string('status', 30)->default('disconnected')->index();
                $table->decimal('google_average_rating', 3, 2)->nullable();
                $table->unsignedInteger('google_total_review_count')->default(0);
                $table->boolean('notifications_enabled')->default(false);
                $table->timestamp('last_synced_at')->nullable()->index();
                $table->text('last_error')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_external_reviews')) {
            $schema->create('pmd_external_reviews', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->string('provider', 30)->default('google')->index();
                $table->string('provider_review_id', 128);
                $table->string('google_location_name', 191)->nullable()->index();
                $table->string('reviewer_name', 191)->nullable();
                $table->text('reviewer_photo_url')->nullable();
                $table->unsignedTinyInteger('rating')->default(0)->index();
                $table->text('comment')->nullable();
                $table->timestamp('review_created_at')->nullable()->index();
                $table->timestamp('review_updated_at')->nullable()->index();
                $table->text('owner_reply')->nullable();
                $table->timestamp('owner_reply_updated_at')->nullable();
                $table->longText('raw_payload')->nullable();
                $table->timestamp('synced_at')->nullable()->index();
                $table->timestamps();

                $table->unique(
                    ['provider', 'location_id', 'provider_review_id'],
                    'pmd_external_reviews_provider_location_review_unique'
                );
            });
        }
    }
};
