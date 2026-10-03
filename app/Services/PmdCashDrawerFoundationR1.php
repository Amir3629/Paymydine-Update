<?php

namespace App\Services;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

/**
 * Additive, idempotent schema foundation for PayMyDine Local POS hardware.
 * It never removes a column or row. Optional bootstrap creates one unconfigured
 * printer-driven drawer only when the tenant has exactly one active location
 * and currently has no drawer at all.
 */
class PmdCashDrawerFoundationR1
{
    public const VERSION = '1.0.0';

    public function repairCurrentTenant(bool $bootstrapDefaultDrawer = false): array
    {
        $connection = DB::connection();
        $schema = $connection->getSchemaBuilder();
        $report = [
            'version' => self::VERSION,
            'database' => $connection->getDatabaseName(),
            'created' => [],
            'columns_added' => [],
            'indexes_added' => [],
            'bootstrap' => null,
        ];

        $this->ensurePosDevices($schema, $report);
        $this->ensureCashDrawers($schema, $report);
        $this->ensureCashDrawerLogs($schema, $report);
        $this->ensureHardwareCommands($connection, $schema, $report);

        if ($bootstrapDefaultDrawer) {
            $report['bootstrap'] = $this->bootstrapDefaultDrawer($connection, $schema);
        }

        return $report;
    }

    protected function ensurePosDevices($schema, array &$report): void
    {
        if (!$schema->hasTable('pos_devices')) {
            $schema->create('pos_devices', function (Blueprint $table): void {
                $table->bigIncrements('device_id');
                $table->string('name', 191);
                $table->string('code', 191)->nullable();
                $table->string('device_type', 50)->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_local_terminal')->default(false);
                $table->string('device_code', 100)->nullable();
                $table->string('pairing_token', 191)->nullable();
                $table->string('agent_token_hash', 64)->nullable();
                $table->timestamp('agent_token_issued_at')->nullable();
                $table->string('device_status', 20)->default('offline');
                $table->timestamp('last_seen_at')->nullable();
                $table->text('capabilities')->nullable();
                $table->text('platform_info')->nullable();
                $table->timestamps();
                $table->index('device_code', 'pos_device_code_idx');
                $table->index('is_local_terminal', 'pos_local_terminal_idx');
            });
            $report['created'][] = 'pos_devices';
            return;
        }

        $columns = $schema->getColumnListing('pos_devices');
        $missing = array_values(array_diff([
            'name', 'code', 'device_type', 'description', 'is_local_terminal',
            'device_code', 'pairing_token', 'agent_token_hash', 'agent_token_issued_at',
            'device_status', 'last_seen_at', 'capabilities', 'platform_info',
        ], $columns));

        if ($missing) {
            $schema->table('pos_devices', function (Blueprint $table) use ($missing): void {
                if (in_array('name', $missing, true)) $table->string('name', 191)->default('POS');
                if (in_array('code', $missing, true)) $table->string('code', 191)->nullable();
                if (in_array('device_type', $missing, true)) $table->string('device_type', 50)->nullable();
                if (in_array('description', $missing, true)) $table->text('description')->nullable();
                if (in_array('is_local_terminal', $missing, true)) $table->boolean('is_local_terminal')->default(false);
                if (in_array('device_code', $missing, true)) $table->string('device_code', 100)->nullable();
                if (in_array('pairing_token', $missing, true)) $table->string('pairing_token', 191)->nullable();
                if (in_array('agent_token_hash', $missing, true)) $table->string('agent_token_hash', 64)->nullable();
                if (in_array('agent_token_issued_at', $missing, true)) $table->timestamp('agent_token_issued_at')->nullable();
                if (in_array('device_status', $missing, true)) $table->string('device_status', 20)->default('offline');
                if (in_array('last_seen_at', $missing, true)) $table->timestamp('last_seen_at')->nullable();
                if (in_array('capabilities', $missing, true)) $table->text('capabilities')->nullable();
                if (in_array('platform_info', $missing, true)) $table->text('platform_info')->nullable();
            });
            $report['columns_added'] = array_merge($report['columns_added'], array_map(fn ($c) => 'pos_devices.'.$c, $missing));
        }
    }

    protected function ensureCashDrawers($schema, array &$report): void
    {
        if (!$schema->hasTable('cash_drawers')) {
            $schema->create('cash_drawers', function (Blueprint $table): void {
                $table->bigIncrements('drawer_id');
                $table->string('name', 128);
                $table->unsignedBigInteger('location_id')->nullable();
                $table->unsignedBigInteger('pos_device_id')->nullable();
                $table->unsignedBigInteger('local_pos_device_id')->nullable();
                $table->boolean('local_mapping_invalid')->default(false);
                $table->string('last_command_status', 20)->nullable();
                $table->text('last_command_message')->nullable();
                $table->string('setup_state', 30)->nullable();
                $table->text('setup_message')->nullable();
                $table->timestamp('setup_completed_at')->nullable();
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
                $table->boolean('test_on_save')->default(false);
                $table->text('description')->nullable();
                $table->timestamps();
                $table->index('location_id');
                $table->index('local_pos_device_id', 'cash_drawer_local_pos_idx');
                $table->index('status');
            });
            $report['created'][] = 'cash_drawers';
            return;
        }

        $columns = $schema->getColumnListing('cash_drawers');
        $missing = array_values(array_diff([
            'local_pos_device_id', 'local_mapping_invalid', 'last_command_status',
            'last_command_message', 'setup_state', 'setup_message', 'setup_completed_at',
        ], $columns));
        if ($missing) {
            $schema->table('cash_drawers', function (Blueprint $table) use ($missing): void {
                if (in_array('local_pos_device_id', $missing, true)) $table->unsignedBigInteger('local_pos_device_id')->nullable();
                if (in_array('local_mapping_invalid', $missing, true)) $table->boolean('local_mapping_invalid')->default(false);
                if (in_array('last_command_status', $missing, true)) $table->string('last_command_status', 20)->nullable();
                if (in_array('last_command_message', $missing, true)) $table->text('last_command_message')->nullable();
                if (in_array('setup_state', $missing, true)) $table->string('setup_state', 30)->nullable();
                if (in_array('setup_message', $missing, true)) $table->text('setup_message')->nullable();
                if (in_array('setup_completed_at', $missing, true)) $table->timestamp('setup_completed_at')->nullable();
            });
            $report['columns_added'] = array_merge($report['columns_added'], array_map(fn ($c) => 'cash_drawers.'.$c, $missing));
        }
    }

    protected function ensureCashDrawerLogs($schema, array &$report): void
    {
        if (!$schema->hasTable('cash_drawer_logs')) {
            $schema->create('cash_drawer_logs', function (Blueprint $table): void {
                $table->bigIncrements('log_id');
                $table->unsignedBigInteger('drawer_id');
                $table->unsignedBigInteger('order_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->unsignedBigInteger('location_id')->nullable();
                $table->string('action', 50)->nullable();
                $table->string('status', 50)->nullable();
                $table->string('trigger_method', 50)->nullable();
                $table->boolean('success')->default(true);
                $table->text('message')->nullable();
                $table->text('error_message')->nullable();
                $table->text('request_payload')->nullable();
                $table->text('response_payload')->nullable();
                $table->text('response_data')->nullable();
                $table->timestamps();
                $table->index('drawer_id');
                $table->index('order_id');
                $table->index('action');
            });
            $report['created'][] = 'cash_drawer_logs';
            return;
        }

        $columns = $schema->getColumnListing('cash_drawer_logs');
        $missing = array_values(array_diff([
            'staff_id', 'location_id', 'status', 'trigger_method', 'success', 'message',
            'error_message', 'request_payload', 'response_payload', 'response_data',
        ], $columns));
        if ($missing) {
            $schema->table('cash_drawer_logs', function (Blueprint $table) use ($missing): void {
                if (in_array('staff_id', $missing, true)) $table->unsignedBigInteger('staff_id')->nullable();
                if (in_array('location_id', $missing, true)) $table->unsignedBigInteger('location_id')->nullable();
                if (in_array('status', $missing, true)) $table->string('status', 50)->nullable();
                if (in_array('trigger_method', $missing, true)) $table->string('trigger_method', 50)->nullable();
                if (in_array('success', $missing, true)) $table->boolean('success')->default(true);
                if (in_array('message', $missing, true)) $table->text('message')->nullable();
                if (in_array('error_message', $missing, true)) $table->text('error_message')->nullable();
                if (in_array('request_payload', $missing, true)) $table->text('request_payload')->nullable();
                if (in_array('response_payload', $missing, true)) $table->text('response_payload')->nullable();
                if (in_array('response_data', $missing, true)) $table->text('response_data')->nullable();
            });
            $report['columns_added'] = array_merge($report['columns_added'], array_map(fn ($c) => 'cash_drawer_logs.'.$c, $missing));
        }
    }

    protected function ensureHardwareCommands($connection, $schema, array &$report): void
    {
        if (!$schema->hasTable('pos_hardware_commands')) {
            $schema->create('pos_hardware_commands', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('drawer_id')->nullable();
                $table->unsignedBigInteger('pos_device_id')->nullable();
                $table->unsignedBigInteger('location_id')->nullable();
                $table->string('command_type', 50);
                $table->string('dedupe_key', 191)->nullable();
                $table->text('payload')->nullable();
                $table->enum('status', ['pending', 'processing', 'success', 'failed', 'cancelled'])->default('pending');
                $table->text('result_message')->nullable();
                $table->text('result_payload')->nullable();
                $table->timestamp('queued_at')->nullable();
                $table->timestamp('picked_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                $table->index(['status', 'pos_device_id']);
                $table->index('queued_at');
                $table->unique('dedupe_key', 'phc_dedupe_unique');
            });
            $report['created'][] = 'pos_hardware_commands';
            return;
        }

        $columns = $schema->getColumnListing('pos_hardware_commands');
        $missing = array_values(array_diff(['dedupe_key', 'expires_at'], $columns));
        if ($missing) {
            $schema->table('pos_hardware_commands', function (Blueprint $table) use ($missing): void {
                if (in_array('dedupe_key', $missing, true)) $table->string('dedupe_key', 191)->nullable();
                if (in_array('expires_at', $missing, true)) $table->timestamp('expires_at')->nullable();
            });
            $report['columns_added'] = array_merge($report['columns_added'], array_map(fn ($c) => 'pos_hardware_commands.'.$c, $missing));
        }

        if ($schema->hasColumn('pos_hardware_commands', 'dedupe_key')) {
            $prefix = $connection->getTablePrefix();
            $table = $prefix.'pos_hardware_commands';
            try {
                $existing = $connection->select("SHOW INDEX FROM `{$table}` WHERE Key_name = 'phc_dedupe_unique'");
                if (!$existing) {
                    $connection->statement("CREATE UNIQUE INDEX `phc_dedupe_unique` ON `{$table}` (`dedupe_key`)");
                    $report['indexes_added'][] = 'pos_hardware_commands.phc_dedupe_unique';
                }
            } catch (\Throwable $ignored) {
                // Application-level dedupe remains active; report stays additive/non-fatal.
            }
        }
    }

    protected function bootstrapDefaultDrawer($connection, $schema): array
    {
        if (!$schema->hasTable('locations') || !$schema->hasTable('cash_drawers') || !$schema->hasTable('pos_devices')) {
            return ['created' => false, 'reason' => 'required_tables_missing'];
        }

        if ($connection->table('cash_drawers')->count() > 0) {
            return ['created' => false, 'reason' => 'drawer_already_exists'];
        }

        $locations = $connection->table('locations')
            ->where('location_status', 1)
            ->orderBy('location_id')
            ->get(['location_id', 'location_name']);
        if ($locations->count() !== 1) {
            return ['created' => false, 'reason' => 'requires_exactly_one_active_location', 'active_locations' => $locations->count()];
        }

        $location = $locations->first();
        return $connection->transaction(function () use ($connection, $location) {
            $now = now();
            $pairingToken = bin2hex(random_bytes(24));
            $deviceId = $connection->table('pos_devices')->insertGetId([
                'name' => 'Main Cashier POS',
                'code' => 'local-pos-main',
                'device_type' => 'local_terminal',
                'description' => 'PayMyDine local hardware workstation',
                'is_local_terminal' => 1,
                'device_code' => null,
                'pairing_token' => $pairingToken,
                'device_status' => 'offline',
                'capabilities' => json_encode(['cash_drawer' => true, 'printer' => true]),
                'platform_info' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $deviceCode = 'PMD-POS-'.$deviceId;
            $connection->table('pos_devices')->where('device_id', $deviceId)->update([
                'device_code' => $deviceCode,
                'updated_at' => now(),
            ]);

            $drawerId = $connection->table('cash_drawers')->insertGetId([
                'name' => 'Main Cash Drawer',
                'location_id' => (int)$location->location_id,
                'pos_device_id' => null,
                'local_pos_device_id' => $deviceId,
                'local_mapping_invalid' => 0,
                'connection_type' => 'rj11_printer',
                'device_path' => null,
                'printer_id' => null,
                'esc_pos_command' => '27,112,0,60,120',
                'voltage' => '12V',
                'connection_config' => json_encode([]),
                'status' => 1,
                'auto_open_on_cash' => 1,
                'test_on_save' => 0,
                'setup_state' => 'needs_connector',
                'setup_message' => 'Install the PayMyDine connector on this cashier PC, then test the receipt printer and drawer.',
                'description' => 'Printer-driven cash drawer via PayMyDine Local POS Agent',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'created' => true,
                'drawer_id' => (int)$drawerId,
                'device_id' => (int)$deviceId,
                'device_code' => $deviceCode,
                'location_id' => (int)$location->location_id,
                'location_name' => (string)$location->location_name,
            ];
        });
    }
}
