<?php

namespace App\Services;

use Admin\Models\Payments_model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * PMD_TENANT_PRODUCT_BASELINE_R1
 *
 * Idempotent product baseline for cloned/new/existing tenant databases.
 *
 * It repairs product schema/catalog drift only. It NEVER copies credentials
 * between tenants and NEVER enables a newly-created payment provider.
 */
class PmdTenantProductBaselineR1
{
    public const VERSION = '1.0.1';

    public function repairCurrentTenant(array $scopes = []): array
    {
        $scopes = $this->normalizeScopes($scopes);
        $report = [
            'ok' => true,
            'version' => self::VERSION,
            'database' => $this->currentDatabaseName(),
            'scopes' => $scopes,
            'steps' => [],
            'warnings' => [],
        ];

        if (in_array('payments', $scopes, true)) {
            $this->step($report, 'payment_catalog', fn () => $this->ensurePaymentCatalog());
            $this->step($report, 'payment_runtime', fn () => $this->ensurePaymentRuntime());
        }
        if (in_array('kds', $scopes, true)) {
            $this->step($report, 'order_notes', fn () => $this->ensureOrderNotes());
            $this->step($report, 'kds_stations', fn () => $this->ensureKdsStations());
        }
        if (in_array('pos', $scopes, true)) {
            $this->step($report, 'cash_drawers', fn () => $this->ensureCashDrawers());
            $this->step($report, 'pos_hardware_commands', fn () => $this->ensurePosHardwareCommands());
            $this->step($report, 'pos_device_fields', fn () => $this->ensurePosDeviceFields());
            $this->step($report, 'terminal_devices', fn () => $this->ensureTerminalDevices());
            $this->step($report, 'sumup_pos_config', fn () => $this->ensureSumupPosConfigFields());
        }
        if (in_array('orders', $scopes, true)) {
            $this->step($report, 'order_settlement', fn () => $this->ensureOrderSettlementFields());
            $this->step($report, 'order_guest_count', fn () => $this->ensureGuestCount());
            $this->step($report, 'table_lifecycle', fn () => $this->ensureTableLifecycle());
        }

        $report['ok'] = count($report['warnings']) === 0;
        return $report;
    }

    public function repairTenantRecord($tenant, array $scopes = []): array
    {
        $value = static function ($row, string $key, $default = null) {
            if (is_array($row)) return $row[$key] ?? $default;
            if (is_object($row)) return $row->{$key} ?? $default;
            return $default;
        };

        $database = trim((string)$value($tenant, 'database', ''));
        if ($database === '') throw new \InvalidArgumentException('Tenant database is required.');

        $originalDefault = DB::getDefaultConnection();
        $originalTenantConfig = (array)Config::get('database.connections.tenant', []);
        $tenantConfig = $originalTenantConfig;
        $tenantConfig['database'] = $database;

        foreach (['host' => 'db_host', 'port' => 'db_port', 'username' => 'db_user', 'password' => 'db_pass'] as $configKey => $tenantKey) {
            $candidate = $value($tenant, $tenantKey);
            if ($candidate !== null && $candidate !== '') $tenantConfig[$configKey] = $candidate;
        }

        try {
            Config::set('database.connections.tenant', $tenantConfig);
            DB::purge('tenant');
            DB::reconnect('tenant');
            DB::setDefaultConnection('tenant');
            return $this->repairCurrentTenant($scopes);
        } finally {
            try { DB::purge('tenant'); } catch (\Throwable $ignored) {}
            Config::set('database.connections.tenant', $originalTenantConfig);
            DB::setDefaultConnection($originalDefault);
        }
    }

    protected function normalizeScopes(array $scopes): array
    {
        $allowed = ['payments', 'kds', 'pos', 'orders'];
        if (!$scopes) return $allowed;
        $scopes = array_values(array_unique(array_map(static fn ($scope) => strtolower(trim((string)$scope)), $scopes)));
        return array_values(array_intersect($allowed, $scopes));
    }

    protected function step(array &$report, string $name, callable $callback): void
    {
        try {
            $report['steps'][$name] = ['ok' => true, 'result' => $callback()];
        } catch (\Throwable $error) {
            $report['warnings'][] = $name.': '.$error->getMessage();
            $report['steps'][$name] = ['ok' => false, 'error' => $error->getMessage()];
            Log::warning('PMD tenant baseline step failed', [
                'database' => $report['database'] ?? null,
                'step' => $name,
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function currentDatabaseName(): ?string
    {
        try { return trim((string)DB::connection()->getDatabaseName()) ?: null; }
        catch (\Throwable $error) { return null; }
    }

    protected function schema()
    {
        return DB::connection()->getSchemaBuilder();
    }

    protected function ensurePaymentCatalog(): array
    {
        $model = new Payments_model();
        $connection = $model->getConnection();
        $schema = $connection->getSchemaBuilder();
        $table = $model->getTable();
        if (!$schema->hasTable($table)) throw new \RuntimeException('Payment catalog base table is missing: '.$table);

        $columns = $schema->getColumnListing($table);
        if (!in_array('code', $columns, true) || !in_array('name', $columns, true)) {
            throw new \RuntimeException('Payment catalog table lacks required code/name columns: '.$table);
        }

        $created = [];
        $methods = [
            'card' => ['name' => 'Card', 'priority' => 10, 'provider_code' => 'stripe'],
            'apple_pay' => ['name' => 'Apple Pay', 'priority' => 20, 'provider_code' => 'stripe'],
            'google_pay' => ['name' => 'Google Pay', 'priority' => 30, 'provider_code' => 'stripe'],
            'wero' => ['name' => 'Wero', 'priority' => 40, 'provider_code' => 'worldline'],
            'paypal' => ['name' => 'PayPal', 'priority' => 50, 'provider_code' => 'paypal'],
        ];
        if (!$connection->table($table)->whereIn('code', ['cash', 'cod'])->exists()) {
            $methods['cod'] = ['name' => 'Cash', 'priority' => 60, 'provider_code' => null];
        }
        $providers = [
            'stripe' => ['name' => 'Stripe', 'priority' => 110, 'supported_methods' => ['card', 'apple_pay', 'google_pay']],
            'paypal' => ['name' => 'PayPal', 'priority' => 120, 'supported_methods' => ['paypal']],
            'worldline' => ['name' => 'Worldline', 'priority' => 130, 'supported_methods' => ['card', 'wero']],
            'sumup' => ['name' => 'SumUp', 'priority' => 140, 'supported_methods' => ['card']],
            'square' => ['name' => 'Square', 'priority' => 150, 'supported_methods' => ['card']],
            'vr_payment' => ['name' => 'VR Payment', 'priority' => 160, 'supported_methods' => ['card', 'apple_pay', 'google_pay', 'paypal', 'wero']],
        ];

        foreach ($methods as $code => $cfg) {
            if ($connection->table($table)->where('code', $code)->exists()) continue;
            $connection->table($table)->insert($this->paymentInsertPayload($columns, $code, $cfg['name'], (int)$cfg['priority'], $cfg['provider_code'], ['provider_code' => $cfg['provider_code'], 'kind' => 'method']));
            $created[] = $code;
        }
        foreach ($providers as $code => $cfg) {
            if ($connection->table($table)->where('code', $code)->exists()) continue;
            $connection->table($table)->insert($this->paymentInsertPayload($columns, $code, $cfg['name'], (int)$cfg['priority'], null, ['supported_methods' => array_values($cfg['supported_methods']), 'kind' => 'provider']));
            $created[] = $code;
        }

        return ['table' => $table, 'created' => $created, 'created_count' => count($created), 'new_rows_enabled' => false];
    }

    protected function paymentInsertPayload(array $columns, string $code, string $name, int $priority, ?string $providerCode, array $meta): array
    {
        $payload = ['code' => $code, 'name' => $name];
        if (in_array('status', $columns, true)) $payload['status'] = 0;
        if (in_array('is_default', $columns, true)) $payload['is_default'] = 0;
        if (in_array('priority', $columns, true)) $payload['priority'] = $priority;
        if (in_array('sort_order', $columns, true)) $payload['sort_order'] = $priority;
        if (in_array('provider_code', $columns, true)) $payload['provider_code'] = $providerCode;
        if (in_array('description', $columns, true)) $payload['description'] = $name.' configuration';
        if (in_array('class_name', $columns, true)) $payload['class_name'] = '';
        $encoded = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        if (in_array('meta', $columns, true)) $payload['meta'] = $encoded;
        if (in_array('data', $columns, true)) $payload['data'] = $encoded;
        $now = now();
        if (in_array('created_at', $columns, true)) $payload['created_at'] = $now;
        if (in_array('updated_at', $columns, true)) $payload['updated_at'] = $now;
        if (in_array('date_added', $columns, true)) $payload['date_added'] = $now;
        if (in_array('date_updated', $columns, true)) $payload['date_updated'] = $now;
        return $payload;
    }

    protected function ensureOrderNotes(): array
    {
        $schema = $this->schema();
        if ($schema->hasTable('order_notes')) return ['created' => false];
        $schema->create('order_notes', function (Blueprint $table): void {
            $table->increments('note_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('staff_id')->nullable();
            $table->text('note');
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamps();
            $table->index(['order_id', 'status']);
            $table->index('created_at');
        });
        return ['created' => true];
    }

    protected function ensureKdsStations(): array
    {
        $schema = $this->schema();
        $created = false;
        if (!$schema->hasTable('kds_stations')) {
            $schema->create('kds_stations', function (Blueprint $table): void {
                $table->bigIncrements('station_id');
                $table->string('name', 255);
                $table->string('slug', 191)->nullable();
                $table->text('description')->nullable();
                $table->text('category_ids')->nullable();
                $table->text('status_ids')->nullable();
                $table->boolean('can_change_status')->default(true);
                $table->boolean('is_active')->default(true);
                $table->string('notification_sound', 50)->default('doorbell');
                $table->integer('refresh_interval')->default(5);
                $table->string('theme_color', 20)->default('#4CAF50');
                $table->unsignedBigInteger('location_id')->nullable();
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
                $table->index('location_id');
                $table->index('is_active');
            });
            $created = true;
        }

        $columns = $schema->getColumnListing('kds_stations');
        $missing = array_values(array_diff(['slug', 'category_ids', 'status_ids', 'can_change_status', 'notification_sound', 'refresh_interval', 'theme_color', 'priority', 'station_type', 'sound_enabled', 'display_density', 'show_reservations', 'reservation_window_minutes', 'ready_pickup_timeout_minutes', 'auto_hide_completed_minutes', 'order_limit', 'sort_order'], $columns));
        if ($missing) {
            $schema->table('kds_stations', function (Blueprint $table) use ($missing): void {
                if (in_array('slug', $missing, true)) $table->string('slug', 191)->nullable();
                if (in_array('category_ids', $missing, true)) $table->text('category_ids')->nullable();
                if (in_array('status_ids', $missing, true)) $table->text('status_ids')->nullable();
                if (in_array('can_change_status', $missing, true)) $table->boolean('can_change_status')->default(true);
                if (in_array('notification_sound', $missing, true)) $table->string('notification_sound', 50)->default('doorbell');
                if (in_array('refresh_interval', $missing, true)) $table->integer('refresh_interval')->default(5);
                if (in_array('theme_color', $missing, true)) $table->string('theme_color', 20)->default('#4CAF50');
                if (in_array('priority', $missing, true)) $table->integer('priority')->default(0);
                if (in_array('station_type', $missing, true)) $table->string('station_type', 32)->default('kitchen');
                if (in_array('sound_enabled', $missing, true)) $table->boolean('sound_enabled')->default(true);
                if (in_array('display_density', $missing, true)) $table->string('display_density', 32)->default('normal');
                if (in_array('show_reservations', $missing, true)) $table->boolean('show_reservations')->default(false);
                if (in_array('reservation_window_minutes', $missing, true)) $table->integer('reservation_window_minutes')->default(90);
                if (in_array('ready_pickup_timeout_minutes', $missing, true)) $table->integer('ready_pickup_timeout_minutes')->default(8);
                if (in_array('auto_hide_completed_minutes', $missing, true)) $table->integer('auto_hide_completed_minutes')->default(5);
                if (in_array('order_limit', $missing, true)) $table->integer('order_limit')->default(50);
                if (in_array('sort_order', $missing, true)) $table->integer('sort_order')->default(0);
            });
        }
        $this->backfillKdsSlugs();
        return ['created' => $created, 'columns_added' => $missing];
    }

    protected function backfillKdsSlugs(): void
    {
        $schema = $this->schema();
        if (!$schema->hasTable('kds_stations') || !$schema->hasColumn('kds_stations', 'slug')) return;
        $rows = DB::table('kds_stations')->select('station_id', 'name', 'slug')->get();
        foreach ($rows as $row) {
            if (trim((string)($row->slug ?? '')) !== '') continue;
            $base = Str::slug((string)($row->name ?? 'station')) ?: 'station';
            $slug = $base;
            $counter = 1;
            while (DB::table('kds_stations')->where('slug', $slug)->where('station_id', '!=', $row->station_id)->exists()) $slug = $base.'-'.$counter++;
            DB::table('kds_stations')->where('station_id', $row->station_id)->update(['slug' => $slug]);
        }
    }

    protected function ensureCashDrawers(): array
    {
        $schema = $this->schema();
        $created = [];
        if (!$schema->hasTable('cash_drawers')) {
            $schema->create('cash_drawers', function (Blueprint $table): void {
                $table->bigIncrements('drawer_id');
                $table->string('name', 128);
                $table->unsignedBigInteger('location_id')->nullable();
                $table->unsignedBigInteger('pos_device_id')->nullable();
                $table->enum('connection_type', ['rj11_printer', 'usb', 'serial', 'network', 'integrated'])->default('rj11_printer');
                $table->string('device_path', 255)->nullable();
                $table->unsignedBigInteger('printer_id')->nullable();
                $table->string('esc_pos_command', 50)->default('27,112,0,60,120');
                $table->enum('voltage', ['12V', '24V'])->default('12V');
                $table->string('network_ip', 45)->nullable();
                $table->integer('network_port')->nullable()->default(9100);
                $table->string('serial_port', 50)->nullable();
                $table->integer('serial_baud_rate')->nullable()->default(9600);
                $table->string('usb_vendor_id', 10)->nullable();
                $table->string('usb_product_id', 10)->nullable();
                $table->text('connection_config')->nullable();
                $table->boolean('status')->default(true);
                $table->boolean('auto_open_on_cash')->default(true);
                $table->boolean('test_on_save')->default(true);
                $table->text('description')->nullable();
                $table->timestamps();
                $table->index('location_id');
                $table->index('pos_device_id');
                $table->index('printer_id');
                $table->index('status');
            });
            $created[] = 'cash_drawers';
        }
        if (!$schema->hasTable('cash_drawer_logs')) {
            $schema->create('cash_drawer_logs', function (Blueprint $table): void {
                $table->bigIncrements('log_id');
                $table->unsignedBigInteger('drawer_id');
                $table->unsignedBigInteger('order_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('action', 50)->nullable();
                $table->string('status', 50)->nullable();
                $table->text('message')->nullable();
                $table->text('request_payload')->nullable();
                $table->text('response_payload')->nullable();
                $table->timestamps();
                $table->index('drawer_id');
                $table->index('order_id');
                $table->index('staff_id');
                $table->index('action');
                $table->index('status');
            });
            $created[] = 'cash_drawer_logs';
        }
        return ['created' => $created];
    }

    protected function ensurePosHardwareCommands(): array
    {
        $schema = $this->schema();
        if ($schema->hasTable('pos_hardware_commands')) return ['created' => false];
        $schema->create('pos_hardware_commands', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('drawer_id')->nullable();
            $table->unsignedBigInteger('pos_device_id')->nullable();
            $table->unsignedBigInteger('location_id')->nullable();
            $table->string('command_type', 50);
            $table->text('payload')->nullable();
            $table->enum('status', ['pending', 'processing', 'success', 'failed', 'cancelled'])->default('pending');
            $table->text('result_message')->nullable();
            $table->text('result_payload')->nullable();
            $table->timestamp('queued_at')->nullable();
            $table->timestamp('picked_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'pos_device_id']);
            $table->index('queued_at');
        });
        return ['created' => true];
    }

    protected function ensurePosDeviceFields(): array
    {
        $schema = $this->schema();
        if (!$schema->hasTable('pos_devices')) throw new \RuntimeException('POS device base table is missing; stale tenant template requires repair.');
        $added = [];
        $columns = $schema->getColumnListing('pos_devices');
        $missing = array_values(array_diff(['is_local_terminal', 'device_code', 'pairing_token', 'device_status', 'last_seen_at', 'capabilities', 'platform_info'], $columns));
        if ($missing) {
            $schema->table('pos_devices', function (Blueprint $table) use ($missing): void {
                if (in_array('is_local_terminal', $missing, true)) $table->boolean('is_local_terminal')->default(false);
                if (in_array('device_code', $missing, true)) $table->string('device_code', 100)->nullable();
                if (in_array('pairing_token', $missing, true)) $table->string('pairing_token', 191)->nullable();
                if (in_array('device_status', $missing, true)) $table->string('device_status', 20)->nullable();
                if (in_array('last_seen_at', $missing, true)) $table->timestamp('last_seen_at')->nullable();
                if (in_array('capabilities', $missing, true)) $table->text('capabilities')->nullable();
                if (in_array('platform_info', $missing, true)) $table->text('platform_info')->nullable();
            });
            $added = array_merge($added, array_map(fn ($c) => 'pos_devices.'.$c, $missing));
        }
        if ($schema->hasTable('cash_drawers')) {
            $columns = $schema->getColumnListing('cash_drawers');
            $missing = array_values(array_diff(['local_pos_device_id', 'local_mapping_invalid', 'last_command_status', 'last_command_message'], $columns));
            if ($missing) {
                $schema->table('cash_drawers', function (Blueprint $table) use ($missing): void {
                    if (in_array('local_pos_device_id', $missing, true)) $table->unsignedBigInteger('local_pos_device_id')->nullable();
                    if (in_array('local_mapping_invalid', $missing, true)) $table->boolean('local_mapping_invalid')->default(false);
                    if (in_array('last_command_status', $missing, true)) $table->string('last_command_status', 20)->nullable();
                    if (in_array('last_command_message', $missing, true)) $table->text('last_command_message')->nullable();
                });
                $added = array_merge($added, array_map(fn ($c) => 'cash_drawers.'.$c, $missing));
            }
        }
        return ['added' => $added];
    }

    protected function ensureTerminalDevices(): array
    {
        $schema = $this->schema();
        if ($schema->hasTable('terminal_devices')) return ['created' => false];
        $schema->create('terminal_devices', function (Blueprint $table): void {
            $table->bigIncrements('terminal_device_id');
            $table->string('provider_code', 50)->index();
            $table->unsignedInteger('location_id')->nullable()->index();
            $table->string('affiliate_key', 191)->nullable();
            $table->string('reader_id', 191)->nullable()->index();
            $table->string('reader_label', 191)->nullable();
            $table->string('pairing_state', 50)->nullable();
            $table->string('terminal_status', 191)->nullable();
            $table->longText('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        return ['created' => true];
    }

    protected function ensureSumupPosConfigFields(): array
    {
        $schema = $this->schema();
        if (!$schema->hasTable('pos_configs')) return ['skipped' => true, 'reason' => 'pos_configs missing'];
        $columns = $schema->getColumnListing('pos_configs');
        $missing = array_values(array_diff(['sumup_affiliate_key', 'sumup_reader_id', 'sumup_pairing_code', 'sumup_pairing_state', 'sumup_reader_label'], $columns));
        if ($missing) {
            $schema->table('pos_configs', function (Blueprint $table) use ($missing): void {
                if (in_array('sumup_affiliate_key', $missing, true)) $table->string('sumup_affiliate_key', 191)->nullable();
                if (in_array('sumup_reader_id', $missing, true)) $table->string('sumup_reader_id', 191)->nullable();
                if (in_array('sumup_pairing_code', $missing, true)) $table->string('sumup_pairing_code', 191)->nullable();
                if (in_array('sumup_pairing_state', $missing, true)) $table->string('sumup_pairing_state', 50)->nullable();
                if (in_array('sumup_reader_label', $missing, true)) $table->string('sumup_reader_label', 191)->nullable();
            });
        }
        return ['columns_added' => $missing];
    }

    protected function ensurePaymentRuntime(): array
    {
        $schema = $this->schema();
        $created = [];
        $added = [];
        if (!$schema->hasTable('order_payment_transactions')) {
            $schema->create('order_payment_transactions', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id');
                $table->string('payment_method', 50);
                $table->string('payment_reference')->nullable();
                $table->decimal('amount', 15, 4);
                $table->string('settlement_status', 20)->default('partial');
                $table->string('payer_label', 191)->nullable();
                $table->unsignedBigInteger('invoice_id')->nullable();
                $table->dateTime('paid_at')->nullable();
                $table->timestamps();
                $table->index(['order_id', 'created_at'], 'opt_order_created_idx');
                $table->index(['order_id', 'settlement_status'], 'opt_order_status_idx');
            });
            $created[] = 'order_payment_transactions';
        }
        if (!$schema->hasTable('order_payment_transaction_items')) {
            $schema->create('order_payment_transaction_items', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('transaction_id');
                $table->unsignedBigInteger('order_menu_id')->nullable();
                $table->unsignedBigInteger('menu_id')->nullable();
                $table->decimal('quantity_paid', 10, 3);
                $table->decimal('unit_price', 15, 4);
                $table->decimal('line_total', 15, 4);
                $table->timestamps();
                $table->index(['transaction_id', 'order_menu_id'], 'opti_txn_menu_idx');
                $table->index(['order_menu_id'], 'opti_menu_idx');
            });
            $created[] = 'order_payment_transaction_items';
        } else {
            $columns = $schema->getColumnListing('order_payment_transaction_items');
            $missingItems = array_values(array_diff(['order_menu_id', 'menu_id'], $columns));
            if ($missingItems) {
                $schema->table('order_payment_transaction_items', function (Blueprint $table) use ($missingItems): void {
                    if (in_array('order_menu_id', $missingItems, true)) $table->unsignedBigInteger('order_menu_id')->nullable();
                    if (in_array('menu_id', $missingItems, true)) $table->unsignedBigInteger('menu_id')->nullable();
                });
                $added = array_merge($added, array_map(fn ($c) => 'order_payment_transaction_items.'.$c, $missingItems));
            }
        }
        $columns = $schema->getColumnListing('order_payment_transactions');
        $missing = array_values(array_diff(['tip_amount', 'coupon_discount', 'coupon_code', 'provider_code', 'created_by', 'notes', 'cash_received', 'change_due', 'idempotency_key'], $columns));
        if ($missing) {
            $schema->table('order_payment_transactions', function (Blueprint $table) use ($missing): void {
                if (in_array('tip_amount', $missing, true)) $table->decimal('tip_amount', 15, 4)->default(0);
                if (in_array('coupon_discount', $missing, true)) $table->decimal('coupon_discount', 15, 4)->default(0);
                if (in_array('coupon_code', $missing, true)) $table->string('coupon_code', 191)->nullable();
                if (in_array('provider_code', $missing, true)) $table->string('provider_code', 50)->nullable();
                if (in_array('created_by', $missing, true)) $table->unsignedBigInteger('created_by')->nullable();
                if (in_array('notes', $missing, true)) $table->text('notes')->nullable();
                if (in_array('cash_received', $missing, true)) $table->decimal('cash_received', 15, 4)->nullable();
                if (in_array('change_due', $missing, true)) $table->decimal('change_due', 15, 4)->default(0);
                if (in_array('idempotency_key', $missing, true)) $table->string('idempotency_key', 100)->nullable();
            });
            $added = array_merge($added, array_map(fn ($c) => 'order_payment_transactions.'.$c, $missing));
        }
        if (!$schema->hasTable('payment_attempts')) {
            $schema->create('payment_attempts', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id')->index();
                $table->string('provider_code', 50)->index();
                $table->string('terminal_id', 120)->nullable();
                $table->decimal('amount', 14, 4)->default(0);
                $table->string('currency', 3)->default('EUR');
                $table->string('status', 30)->default('pending')->index();
                $table->string('provider_reference', 190)->nullable()->index();
                $table->json('request_payload')->nullable();
                $table->json('response_payload')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamps();
            });
            $created[] = 'payment_attempts';
        }
        return ['created' => $created, 'columns_added' => $added];
    }

    protected function ensureOrderSettlementFields(): array
    {
        $schema = $this->schema();
        if (!$schema->hasTable('orders')) return ['skipped' => true, 'reason' => 'orders missing'];
        $columns = $schema->getColumnListing('orders');
        $missing = array_values(array_diff(['settlement_status', 'settled_amount', 'settlement_method', 'settlement_reference', 'settled_at'], $columns));
        if ($missing) {
            $schema->table('orders', function (Blueprint $table) use ($missing): void {
                if (in_array('settlement_status', $missing, true)) $table->string('settlement_status', 20)->default('unpaid');
                if (in_array('settled_amount', $missing, true)) $table->decimal('settled_amount', 15, 4)->default(0);
                if (in_array('settlement_method', $missing, true)) $table->string('settlement_method', 50)->nullable();
                if (in_array('settlement_reference', $missing, true)) $table->string('settlement_reference', 255)->nullable();
                if (in_array('settled_at', $missing, true)) $table->dateTime('settled_at')->nullable();
            });
        }
        return ['columns_added' => $missing];
    }

    protected function ensureGuestCount(): array
    {
        $schema = $this->schema();
        if (!$schema->hasTable('orders') || $schema->hasColumn('orders', 'guest_count')) return ['created' => false];
        $schema->table('orders', function (Blueprint $table): void { $table->unsignedTinyInteger('guest_count')->nullable(); });
        return ['created' => true];
    }

    protected function ensureTableLifecycle(): array
    {
        $schema = $this->schema();
        $added = [];
        $created = [];
        if ($schema->hasTable('tables')) {
            $columns = $schema->getColumnListing('tables');
            $missing = array_values(array_diff(['operational_status', 'operational_status_updated_at', 'operational_status_updated_by'], $columns));
            if ($missing) {
                $schema->table('tables', function (Blueprint $table) use ($missing): void {
                    if (in_array('operational_status', $missing, true)) $table->string('operational_status', 32)->default('available');
                    if (in_array('operational_status_updated_at', $missing, true)) $table->timestamp('operational_status_updated_at')->nullable();
                    if (in_array('operational_status_updated_by', $missing, true)) $table->unsignedBigInteger('operational_status_updated_by')->nullable();
                });
                $added = array_merge($added, array_map(fn ($c) => 'tables.'.$c, $missing));
            }
        }
        if (!$schema->hasTable('pmd_table_status_history')) {
            $schema->create('pmd_table_status_history', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('table_id')->index();
                $table->string('old_status', 32)->nullable();
                $table->string('new_status', 32);
                $table->string('reason', 100)->nullable();
                $table->unsignedBigInteger('actor_id')->nullable()->index();
                $table->unsignedBigInteger('order_id')->nullable()->index();
                $table->json('context')->nullable();
                $table->timestamps();
                $table->index(['table_id', 'created_at'], 'pmd_table_status_history_table_time');
            });
            $created[] = 'pmd_table_status_history';
        }
        return ['created' => $created, 'columns_added' => $added];
    }
}
