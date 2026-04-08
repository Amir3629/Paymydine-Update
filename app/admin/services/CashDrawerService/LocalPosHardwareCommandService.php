<?php

namespace Admin\Services\CashDrawerService;

use Admin\Models\Cash_drawers_model;
use Admin\Models\Pos_devices_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

    protected static function queueCommand(Cash_drawers_model $drawer, string $commandType, array $meta = []): array
    {
        if (empty($drawer->pos_device_id)) {
            return [
                'success' => false,
                'message' => 'No POS device linked to drawer. Set pos_device_id to use local agent.',
            ];
        }

        $payload = [
            'drawer_id' => $drawer->drawer_id,
            'drawer_name' => $drawer->name,
            'connection_type' => $drawer->connection_type,
            'esc_pos_command' => $drawer->esc_pos_command ?? '27,112,0,60,120',
            'resolved_target' => self::resolveTargetPath($drawer),
            'meta' => $meta,
        ];

        $commandId = DB::table('pos_hardware_commands')->insertGetId([
            'drawer_id' => $drawer->drawer_id,
            'pos_device_id' => $drawer->pos_device_id,
            'location_id' => $drawer->location_id,
            'command_type' => $commandType,
            'payload' => json_encode($payload),
            'status' => 'pending',
            'queued_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Log::info('Cash Drawer: Queued local POS hardware command', [
            'command_id' => $commandId,
            'drawer_id' => $drawer->drawer_id,
            'pos_device_id' => $drawer->pos_device_id,
            'command_type' => $commandType,
            'target' => $payload['resolved_target'],
        ]);

        return [
            'success' => true,
            'queued' => true,
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
                foreach (['device_path', 'printer_path', 'path', 'port', 'printer_name', 'name', 'ip_address', 'host'] as $field) {
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

