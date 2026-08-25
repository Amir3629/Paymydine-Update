<?php

namespace Admin\Services\CashDrawerService;

use Admin\Models\Cash_drawers_model;
use Admin\Models\Pos_devices_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class LocalPosHardwareCommandService
{
    public static function queueOpenDrawer(Cash_drawers_model $drawer, array $meta = []): array
    {
        return self::queueCommand($drawer, 'open_drawer', $meta);
    }

    public static function queueTestConnection(Cash_drawers_model $drawer, array $meta = []): array
    {
        return self::queueCommand($drawer, 'test_connection', $meta);
    }

    public static function queueListPrinters(Cash_drawers_model $drawer, array $meta = []): array
    {
        return self::queueCommand($drawer, 'list_printers', $meta);
    }

    public static function queueTestPrint(Cash_drawers_model $drawer, array $meta = []): array
    {
        return self::queueCommand($drawer, 'test_print', $meta);
    }

    public static function queueDiagnoseDrawer(Cash_drawers_model $drawer, array $meta = []): array
    {
        if (empty($meta['candidate_commands']) || !is_array($meta['candidate_commands'])) {
            $meta['candidate_commands'] = [
                '27,112,0,25,250',
                '27,112,0,60,120',
                '27,112,1,60,120',
                '16,20,1,0,5',
            ];
        }

        return self::queueCommand($drawer, 'diagnose_drawer', $meta);
    }

    public static function queueCustom(Cash_drawers_model $drawer, string $commandType, array $meta = []): array
    {
        return self::queueCommand($drawer, $commandType, $meta);
    }

    protected static function queueCommand(Cash_drawers_model $drawer, string $commandType, array $meta = []): array
    {
        if (!Schema::hasTable('pos_devices')) {
            return [
                'success' => false,
                'message' => 'Local POS device table is missing. Run the PayMyDine hardware foundation update.',
            ];
        }

        $targetDeviceId = (int)($drawer->local_pos_device_id ?: $drawer->pos_device_id);
        if ($targetDeviceId < 1) {
            return [
                'success' => false,
                'message' => 'No local POS terminal is paired with this cash drawer.',
            ];
        }

        $device = Pos_devices_model::find($targetDeviceId);
        if (!$device || (isset($device->is_local_terminal) && !$device->is_local_terminal)) {
            return [
                'success' => false,
                'message' => 'Selected POS device is not a local POS terminal.',
            ];
        }

        if (method_exists($device, 'isOnline') && !$device->isOnline()) {
            return [
                'success' => false,
                'message' => 'The PayMyDine hardware connector is offline on the selected POS terminal.',
            ];
        }

        if (!Schema::hasTable('pos_hardware_commands')) {
            Log::error('Cash Drawer: pos_hardware_commands table is missing on current tenant connection', [
                'drawer_id' => $drawer->drawer_id,
                'pos_device_id' => $targetDeviceId,
            ]);

            return [
                'success' => false,
                'message' => 'Local hardware queue table is missing. Run the PayMyDine hardware foundation update.',
            ];
        }

        $dedupeKey = trim((string)($meta['dedupe_key'] ?? ''));
        if ($dedupeKey !== '' && Schema::hasColumn('pos_hardware_commands', 'dedupe_key')) {
            $existing = DB::table('pos_hardware_commands')->where('dedupe_key', $dedupeKey)->first();
            if ($existing) {
                return [
                    'success' => true,
                    'queued' => true,
                    'duplicate' => true,
                    'command_id' => (int)$existing->id,
                    'message' => 'Command was already queued.',
                ];
            }
        }

        $printerDevice = null;
        if (!empty($drawer->printer_id)) {
            $printerDevice = Pos_devices_model::find($drawer->printer_id);
        }
        $drawerConfig = (array)($drawer->connection_config ?? []);
        $configuredPrinterName = trim((string)($drawerConfig['windows_printer_name'] ?? ''));
        $printerName = trim((string)($meta['printer_name'] ?? ''));
        if ($printerName === '' && $configuredPrinterName !== '') {
            $printerName = $configuredPrinterName;
        }
        if (
            $printerName === ''
            && $printerDevice
            && !empty($printerDevice->name)
            && (int)$printerDevice->device_id !== $targetDeviceId
        ) {
            $printerName = $printerDevice->name;
        }

        $payload = [
            'drawer_id' => $drawer->drawer_id,
            'drawer_name' => $drawer->name,
            'connection_type' => $drawer->connection_type,
            'esc_pos_command' => $drawer->esc_pos_command ?? '27,112,0,60,120',
            'resolved_target' => self::resolveTargetPath($drawer),
            'pos_device' => [
                'device_id' => $device->device_id,
                'device_code' => $device->device_code ?: $device->code,
                'display_name' => $device->name,
                'status' => $device->device_status,
                'last_seen_at' => $device->last_seen_at,
            ],
            'meta' => $meta,
            'printer_name' => $printerName !== '' ? $printerName : null,
            'test_print_text' => $meta['test_print_text'] ?? null,
            'candidate_commands' => $meta['candidate_commands'] ?? null,
        ];

        $defaultExpiry = max(15, (int)config('cashdrawer.command_expiry_seconds', 120));
        $expiresIn = max(5, (int)($meta['expires_in_seconds'] ?? $defaultExpiry));
        $now = now();

        $row = [
            'drawer_id' => $drawer->drawer_id,
            'pos_device_id' => $targetDeviceId,
            'location_id' => $drawer->location_id,
            'command_type' => $commandType,
            'payload' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'status' => 'pending',
            'queued_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if (Schema::hasColumn('pos_hardware_commands', 'dedupe_key')) {
            $row['dedupe_key'] = $dedupeKey !== '' ? $dedupeKey : null;
        }
        if (Schema::hasColumn('pos_hardware_commands', 'expires_at')) {
            $row['expires_at'] = $now->copy()->addSeconds($expiresIn);
        }

        try {
            $commandId = DB::table('pos_hardware_commands')->insertGetId($row);
        } catch (\Throwable $e) {
            if ($dedupeKey !== '' && Schema::hasColumn('pos_hardware_commands', 'dedupe_key')) {
                $existing = DB::table('pos_hardware_commands')->where('dedupe_key', $dedupeKey)->first();
                if ($existing) {
                    return [
                        'success' => true,
                        'queued' => true,
                        'duplicate' => true,
                        'command_id' => (int)$existing->id,
                        'message' => 'Command was already queued.',
                    ];
                }
            }

            Log::error('Cash Drawer: Failed writing to pos_hardware_commands table', [
                'drawer_id' => $drawer->drawer_id,
                'pos_device_id' => $targetDeviceId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Unable to queue local hardware command: '.$e->getMessage(),
            ];
        }

        Log::info('Cash Drawer: Queued local POS hardware command', [
            'command_id' => $commandId,
            'drawer_id' => $drawer->drawer_id,
            'pos_device_id' => $targetDeviceId,
            'command_type' => $commandType,
            'dedupe_key' => $dedupeKey !== '' ? $dedupeKey : null,
            'target' => $payload['resolved_target'],
        ]);

        return [
            'success' => true,
            'queued' => true,
            'duplicate' => false,
            'command_id' => $commandId,
            'message' => 'Command queued for local POS agent',
        ];
    }

    protected static function resolveTargetPath(Cash_drawers_model $drawer): ?string
    {
        $printerPath = $drawer->device_path ?? null;
        if (!empty($printerPath)) {
            return $printerPath;
        }

        if (!empty($drawer->printer_id)) {
            $printerDevice = Pos_devices_model::find($drawer->printer_id);
            if ($printerDevice) {
                foreach (['device_path', 'printer_path', 'path', 'port', 'printer_name', 'ip_address', 'host'] as $field) {
                    $value = $printerDevice->{$field} ?? null;
                    if (!empty($value)) {
                        return $value;
                    }
                }
            }
        }

        if ($drawer->connection_type === 'network' && !empty($drawer->network_ip)) {
            return $drawer->network_ip.':'.($drawer->network_port ?? 9100);
        }

        if ($drawer->connection_type === 'serial' && !empty($drawer->serial_port)) {
            return $drawer->serial_port;
        }

        return null;
    }
}
