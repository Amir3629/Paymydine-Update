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
        // Repair migration only. Never drop reservation-guarantee evidence.
    }

    private function ensureOnActiveTenants(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set(
                'database.connections.pmd_reservation_guarantee_schema_central',
                $centralConfig
            );
            DB::purge('pmd_reservation_guarantee_schema_central');
            DB::reconnect('pmd_reservation_guarantee_schema_central');

            $central = DB::connection(
                'pmd_reservation_guarantee_schema_central'
            );

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
                        'host' => $row->db_host
                            ?? $centralConfig['host']
                            ?? null,
                        'port' => $row->db_port
                            ?? $centralConfig['port']
                            ?? null,
                        'username' => $row->db_user
                            ?? $centralConfig['username']
                            ?? null,
                        'password' => $row->db_pass
                            ?? $centralConfig['password']
                            ?? null,
                    ]);
                }
            }

            $templateExists = (bool)$central->selectOne(
                'SELECT COUNT(*) AS aggregate
                 FROM INFORMATION_SCHEMA.SCHEMATA
                 WHERE SCHEMA_NAME = ?',
                ['newtenantdb']
            )->aggregate;

            if ($templateExists) {
                $databases->push(array_merge(
                    $centralConfig,
                    ['database' => 'newtenantdb']
                ));
            }
        } catch (\Throwable $error) {
            logger()->error(
                'Reservation guarantee schema repair could not enumerate tenants',
                ['message' => $error->getMessage()]
            );

            throw $error;
        }

        $seen = [];

        try {
            foreach ($databases as $config) {
                $database = trim((string)($config['database'] ?? ''));
                if ($database === '' || isset($seen[$database])) {
                    continue;
                }
                $seen[$database] = true;

                $runtime = $centralConfig;
                foreach (
                    ['database', 'host', 'port', 'username', 'password']
                    as $key
                ) {
                    if (
                        array_key_exists($key, $config)
                        && $config[$key] !== null
                    ) {
                        $runtime[$key] = $config[$key];
                    }
                }

                Config::set(
                    'database.connections.pmd_reservation_guarantee_schema_tenant',
                    $runtime
                );
                DB::purge('pmd_reservation_guarantee_schema_tenant');
                DB::reconnect('pmd_reservation_guarantee_schema_tenant');

                try {
                    $this->ensureTable(
                        'pmd_reservation_guarantee_schema_tenant'
                    );
                } catch (\Throwable $error) {
                    logger()->error(
                        'Reservation guarantee schema repair failed for tenant',
                        [
                            'database' => $database,
                            'message' => $error->getMessage(),
                        ]
                    );

                    throw $error;
                } finally {
                    DB::disconnect(
                        'pmd_reservation_guarantee_schema_tenant'
                    );
                }
            }
        } finally {
            DB::setDefaultConnection($originalDefault ?: 'mysql');
        }
    }

    private function ensureTable(string $connection): void
    {
        $schema = Schema::connection($connection);

        if (!$schema->hasTable('reservation_guarantees')) {
            $schema->create(
                'reservation_guarantees',
                function (Blueprint $table): void {
                    $table->bigIncrements('guarantee_id');
                    $table->unsignedInteger('reservation_id')->unique();
                    $table->unsignedInteger('location_id')->index();
                    $table->string('provider', 32)->default('stripe');
                    $table->string('provider_mode', 16)->nullable();
                    $table->string('status', 32)
                        ->default('active')
                        ->index();
                    $table->unsignedInteger('amount_per_guest_cents')
                        ->default(0);
                    $table->unsignedInteger('amount_cents')->default(0);
                    $table->unsignedInteger('charged_amount_cents')
                        ->nullable();
                    $table->string('currency', 3)->default('EUR');
                    $table->string('customer_reference', 191)->nullable();
                    $table->string('payment_method_reference', 191)
                        ->nullable();
                    $table->string('setup_intent_reference', 191)
                        ->nullable();
                    $table->string('charge_intent_reference', 191)
                        ->nullable();
                    $table->string('terms_version', 64)->nullable();
                    $table->string('locale', 8)->nullable();
                    $table->text('terms_text')->nullable();
                    $table->string('terms_hash', 64)->nullable();
                    $table->text('consent_text')->nullable();
                    $table->string('consent_text_hash', 64)->nullable();
                    $table->dateTime('consent_at')->nullable();
                    $table->dateTime('cancellation_deadline_at')
                        ->nullable()
                        ->index();
                    $table->dateTime('charge_eligible_at')
                        ->nullable()
                        ->index();
                    $table->dateTime('charged_at')->nullable();
                    $table->dateTime('released_at')->nullable();
                    $table->text('last_error')->nullable();
                    $table->text('loss_assessment_note')->nullable();
                    $table->unsignedInteger(
                        'loss_assessed_by_staff_id'
                    )->nullable();
                    $table->dateTime('loss_assessed_at')->nullable();
                    $table->timestamps();

                    $table->index([
                        'status',
                        'charge_eligible_at',
                    ]);
                }
            );

            return;
        }

        $addNote = !$schema->hasColumn(
            'reservation_guarantees',
            'loss_assessment_note'
        );
        $addStaff = !$schema->hasColumn(
            'reservation_guarantees',
            'loss_assessed_by_staff_id'
        );
        $addAt = !$schema->hasColumn(
            'reservation_guarantees',
            'loss_assessed_at'
        );

        if (!$addNote && !$addStaff && !$addAt) {
            return;
        }

        $schema->table(
            'reservation_guarantees',
            function (Blueprint $table) use (
                $addNote,
                $addStaff,
                $addAt
            ): void {
                if ($addNote) {
                    $table->text('loss_assessment_note')->nullable();
                }
                if ($addStaff) {
                    $table->unsignedInteger(
                        'loss_assessed_by_staff_id'
                    )->nullable();
                }
                if ($addAt) {
                    $table->dateTime('loss_assessed_at')->nullable();
                }
            }
        );
    }
};
