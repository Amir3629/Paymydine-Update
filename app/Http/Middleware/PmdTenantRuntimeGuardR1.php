<?php

namespace App\Http\Middleware;

use Admin\Models\Payments_model;
use Closure;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TENANT_RUNTIME_GUARD_R1
 *
 * Focused multi-tenant runtime guard for three production issues:
 * - standalone Cashier Quick responses bypass the normal Admin favicon head;
 * - Finance renders only payment rows physically present in each tenant DB;
 * - legacy KDS cache keys are not tenant-scoped and can leak schema/data state
 *   between tenant requests.
 *
 * This middleware never copies credentials between tenants and never enables a
 * newly-created provider automatically.
 */
class PmdTenantRuntimeGuardR1
{
    public function handle($request, Closure $next)
    {
        $path = trim((string)$request->path(), '/');

        if ($path === 'admin/pmdfinance') {
            $this->ensureFinanceCatalog();
        }

        if (
            str_starts_with($path, 'admin/kitchendisplay')
            || str_starts_with($path, 'admin/kds_stations')
            || str_starts_with($path, 'admin/pmddevices')
        ) {
            $this->prepareKdsTenantRuntime();
        }

        $response = $next($request);

        if ($path === 'admin/cashierlab') {
            $this->applyStandaloneAdminFavicon($response);
        }

        return $response;
    }

    protected function applyStandaloneAdminFavicon($response): void
    {
        if (!is_object($response) || !method_exists($response, 'getContent') || !method_exists($response, 'setContent')) {
            return;
        }

        $content = (string)$response->getContent();
        if ($content === '' || stripos($content, '</head>') === false) {
            return;
        }

        $favicon = '/app/admin/assets/images/pmd-favicon-final-20260822.svg';
        if (str_contains($content, $favicon)) {
            return;
        }

        $version = 'pmd-cashier-r1';
        $localPath = base_path(ltrim($favicon, '/'));
        if (is_file($localPath)) {
            $version = (string)@filemtime($localPath);
        }

        $link = '<link id="pmd-cashier-standalone-favicon-r1" rel="icon" type="image/svg+xml" href="'
            .$favicon.'?v='.rawurlencode($version).'">';

        $updated = preg_replace('/<\/head>/i', $link."\n</head>", $content, 1);
        if (!is_string($updated) || $updated === $content) {
            return;
        }

        $response->setContent($updated);
        if (method_exists($response, 'headers')) {
            try {
                $response->headers->remove('Content-Length');
            } catch (\Throwable $ignored) {
            }
        }
    }

    protected function ensureFinanceCatalog(): void
    {
        try {
            $model = new Payments_model();
            $connection = $model->getConnection();
            $schema = $connection->getSchemaBuilder();
            $table = $model->getTable();

            if (!$schema->hasTable($table)) {
                return;
            }

            $columns = $schema->getColumnListing($table);
            if (!in_array('code', $columns, true) || !in_array('name', $columns, true)) {
                return;
            }

            $methodDefaults = [
                'card' => ['name' => 'Card', 'priority' => 10, 'provider_code' => 'stripe'],
                'apple_pay' => ['name' => 'Apple Pay', 'priority' => 20, 'provider_code' => 'stripe'],
                'google_pay' => ['name' => 'Google Pay', 'priority' => 30, 'provider_code' => 'stripe'],
                'wero' => ['name' => 'Wero', 'priority' => 40, 'provider_code' => 'worldline'],
                'paypal' => ['name' => 'PayPal', 'priority' => 50, 'provider_code' => 'paypal'],
            ];

            // Cash/COD are aliases in different generations. Never create a
            // duplicate if either form already exists in this tenant.
            $hasCashAlias = $connection->table($table)
                ->whereIn('code', ['cash', 'cod'])
                ->exists();
            if (!$hasCashAlias) {
                $methodDefaults['cod'] = ['name' => 'Cash', 'priority' => 60, 'provider_code' => null];
            }

            $providerDefaults = [
                'stripe' => ['name' => 'Stripe', 'priority' => 110, 'supported_methods' => ['card', 'apple_pay', 'google_pay']],
                'paypal' => ['name' => 'PayPal', 'priority' => 120, 'supported_methods' => ['paypal']],
                'worldline' => ['name' => 'Worldline', 'priority' => 130, 'supported_methods' => ['card', 'wero']],
                'sumup' => ['name' => 'SumUp', 'priority' => 140, 'supported_methods' => ['card']],
                'square' => ['name' => 'Square', 'priority' => 150, 'supported_methods' => ['card']],
                'vr_payment' => ['name' => 'VR Payment', 'priority' => 160, 'supported_methods' => ['card', 'apple_pay', 'google_pay', 'paypal', 'wero']],
            ];

            foreach ($methodDefaults as $code => $cfg) {
                if ($connection->table($table)->where('code', $code)->exists()) {
                    continue;
                }

                $payload = $this->paymentCatalogInsertPayload(
                    $columns,
                    $code,
                    $cfg['name'],
                    (int)$cfg['priority'],
                    $cfg['provider_code'],
                    ['provider_code' => $cfg['provider_code']],
                    false
                );
                $connection->table($table)->insert($payload);
            }

            foreach ($providerDefaults as $code => $cfg) {
                if ($connection->table($table)->where('code', $code)->exists()) {
                    continue;
                }

                $payload = $this->paymentCatalogInsertPayload(
                    $columns,
                    $code,
                    $cfg['name'],
                    (int)$cfg['priority'],
                    null,
                    ['supported_methods' => array_values($cfg['supported_methods'])],
                    false
                );
                $connection->table($table)->insert($payload);
            }
        } catch (\Throwable $error) {
            Log::warning('PMD finance tenant catalog guard skipped', [
                'host' => request()->getHost(),
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function paymentCatalogInsertPayload(
        array $columns,
        string $code,
        string $name,
        int $priority,
        ?string $providerCode,
        array $meta,
        bool $enabled
    ): array {
        $payload = [
            'code' => $code,
            'name' => $name,
        ];

        if (in_array('status', $columns, true)) $payload['status'] = $enabled ? 1 : 0;
        if (in_array('is_default', $columns, true)) $payload['is_default'] = 0;
        if (in_array('priority', $columns, true)) $payload['priority'] = $priority;
        if (in_array('sort_order', $columns, true)) $payload['sort_order'] = $priority;
        if (in_array('provider_code', $columns, true)) $payload['provider_code'] = $providerCode;
        if (in_array('description', $columns, true)) $payload['description'] = $name.' configuration';
        if (in_array('class_name', $columns, true)) $payload['class_name'] = '';

        $encoded = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (in_array('meta', $columns, true)) $payload['meta'] = $encoded ?: '{}';
        if (in_array('data', $columns, true)) $payload['data'] = $encoded ?: '{}';

        $now = now();
        if (in_array('created_at', $columns, true)) $payload['created_at'] = $now;
        if (in_array('updated_at', $columns, true)) $payload['updated_at'] = $now;
        if (in_array('date_added', $columns, true)) $payload['date_added'] = $now;
        if (in_array('date_updated', $columns, true)) $payload['date_updated'] = $now;

        return $payload;
    }

    protected function prepareKdsTenantRuntime(): void
    {
        // Legacy KDS cache keys were global. Clearing them before a KDS/device
        // request prevents one tenant's schema/stations/status IDs from being
        // reused by another tenant while the core is migrated to scoped keys.
        foreach ([
            'pmd_kds_stations_table_exists_v82',
            'pmd_kds_all_stations_minimal_v1_1',
            'pmd_kds_visible_status_ids_v12',
            'pmd_kds_status_buttons_minimal_v1',
        ] as $key) {
            try {
                Cache::forget($key);
            } catch (\Throwable $ignored) {
            }
        }

        try {
            $this->ensureKdsStationsTable();
            $this->ensureOrderNotesTable();
        } catch (\Throwable $error) {
            Log::error('PMD KDS tenant runtime self-heal failed', [
                'host' => request()->getHost(),
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function ensureKdsStationsTable(): void
    {
        if (Schema::hasTable('kds_stations')) {
            return;
        }

        Schema::create('kds_stations', function (Blueprint $table) {
            $table->bigIncrements('station_id');
            $table->string('name', 128);
            $table->string('slug', 128)->unique();
            $table->text('description')->nullable();
            $table->json('category_ids')->nullable();
            $table->json('status_ids')->nullable();
            $table->boolean('can_change_status')->default(true);
            $table->boolean('is_active')->default(true);
            $table->string('notification_sound', 50)->default('doorbell');
            $table->integer('refresh_interval')->default(5);
            $table->string('theme_color', 20)->default('#4CAF50');
            $table->unsignedInteger('location_id')->nullable()->index();
            $table->integer('priority')->default(0);
            $table->string('station_type', 32)->default('kitchen');
            $table->boolean('sound_enabled')->default(true);
            $table->string('display_density', 32)->default('normal');
            $table->boolean('show_reservations')->default(false);
            $table->integer('reservation_window_minutes')->default(90);
            $table->integer('ready_pickup_timeout_minutes')->default(8);
            $table->integer('auto_hide_completed_minutes')->default(5);
            $table->integer('order_limit')->default(50);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    protected function ensureOrderNotesTable(): void
    {
        if (Schema::hasTable('order_notes')) {
            return;
        }

        // This exactly mirrors the existing Admin migration contract. The KDS
        // eagerly loads order_notes, so a tenant missing this historical
        // migration otherwise fails before it can render any ticket.
        Schema::create('order_notes', function (Blueprint $table) {
            $table->increments('note_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('staff_id')->nullable();
            $table->text('note');
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamps();
            $table->index(['order_id', 'status']);
            $table->index('created_at');
        });
    }
}
