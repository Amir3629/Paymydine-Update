<?php

namespace Admin\Controllers\Api;

use Admin\Models\Pos_devices_model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PosAgentController extends Controller
{
    protected function jsonError(string $message, int $status = 500, array $extra = [])
    {
        return response()->json(array_merge([
            'success' => false,
            'message' => $message,
        ], $extra), $status);
    }

    protected function hasPosDeviceColumn(string $column): bool
    {
        return Schema::hasTable('pos_devices') && Schema::hasColumn('pos_devices', $column);
    }

    protected function findDeviceByCode(string $deviceCode): ?Pos_devices_model
    {
        $query = Pos_devices_model::query();

        if ($this->hasPosDeviceColumn('device_code')) {
            $query->where('device_code', $deviceCode);
            if ($this->hasPosDeviceColumn('code')) {
                $query->orWhere('code', $deviceCode);
            }
        } elseif ($this->hasPosDeviceColumn('code')) {
            $query->where('code', $deviceCode);
        } else {
            return null;
        }

        return $query->first();
    }

    protected function touchDeviceHeartbeat(Pos_devices_model $device): void
    {
        $dirty = false;

        if ($this->hasPosDeviceColumn('device_status')) {
            $device->device_status = 'online';
            $dirty = true;
        }

        if ($this->hasPosDeviceColumn('last_seen_at')) {
            $device->last_seen_at = now();
            $dirty = true;
        }

        if ($dirty) {
            $device->save();
        }
    }

    protected function isAuthorized(Request $request): bool
    {
        $token = trim((string)config('cashdrawer.agent_token', ''));
        if ($token === '') {
            return false;
        }

        $header = (string)$request->header('Authorization', '');
        if (stripos($header, 'Bearer ') !== 0) {
            return false;
        }

        return hash_equals($token, trim(substr($header, 7)));
    }

    public function pull(Request $request)
    {
        try {
            if (!$this->isAuthorized($request)) {
                return $this->jsonError('Unauthorized', 401);
            }

            $deviceCode = trim((string)$request->query('device_code', ''));
            if ($deviceCode === '') {
                return $this->jsonError('device_code is required', 400);
            }

            if (!Schema::hasTable('pos_hardware_commands')) {
                return $this->jsonError('pos_hardware_commands table is missing', 500);
            }

            $device = $this->findDeviceByCode($deviceCode);
            if (!$device) {
                return $this->jsonError('POS device not found', 404);
            }

            if ($this->hasPosDeviceColumn('is_local_terminal') && !$device->is_local_terminal) {
                return $this->jsonError('Device is not configured as local POS terminal', 422);
            }

            $this->touchDeviceHeartbeat($device);

            $fresh = DB::transaction(function () use ($device) {
                $command = DB::table('pos_hardware_commands')
                    ->where('pos_device_id', $device->device_id)
                    ->where('status', 'pending')
                    ->orderBy('id', 'asc')
                    ->lockForUpdate()
                    ->first();

                if (!$command) {
                    return null;
                }

                DB::table('pos_hardware_commands')
                    ->where('id', $command->id)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'processing',
                        'picked_at' => now(),
                        'updated_at' => now(),
                    ]);

                return DB::table('pos_hardware_commands')->where('id', $command->id)->first();
            });

            if (!$fresh) {
                return response()->json(['success' => true, 'command' => null], 200);
            }

            return response()->json([
                'success' => true,
                'command' => [
                    'id' => $fresh->id,
                    'command_type' => $fresh->command_type,
                    'payload' => json_decode($fresh->payload, true) ?: [],
                    'queued_at' => $fresh->queued_at,
                ],
            ], 200);
        } catch (\Throwable $e) {
            Log::error('POS Agent pull failed', [
                'message' => $e->getMessage(),
                'device_code' => $request->query('device_code'),
            ]);

            return $this->jsonError('Pull failed: '.$e->getMessage(), 500);
        }
    }

    public function ack(Request $request, $commandId)
    {
        try {
            if (!$this->isAuthorized($request)) {
                return $this->jsonError('Unauthorized', 401);
            }

            if (!Schema::hasTable('pos_hardware_commands')) {
                return $this->jsonError('pos_hardware_commands table is missing', 500);
            }

            $status = $request->input('status');
            if (!in_array($status, ['success', 'failed'], true)) {
                return $this->jsonError('Invalid status', 422);
            }

            $updated = DB::table('pos_hardware_commands')
                ->where('id', $commandId)
                ->whereIn('status', ['processing', 'pending'])
                ->update([
                    'status' => $status,
                    'result_message' => $request->input('message'),
                    'result_payload' => json_encode($request->input('result', [])),
                    'completed_at' => now(),
                    'updated_at' => now(),
                ]);

            if (!$updated) {
                return $this->jsonError('Command not found or already finalized', 404);
            }

            $command = DB::table('pos_hardware_commands')->where('id', $commandId)->first();
            if ($command && !empty($command->drawer_id) && Schema::hasTable('cash_drawers')) {
                $update = ['updated_at' => now()];
                if (Schema::hasColumn('cash_drawers', 'last_command_status')) {
                    $update['last_command_status'] = $status;
                }
                if (Schema::hasColumn('cash_drawers', 'last_command_message')) {
                    $update['last_command_message'] = (string)$request->input('message', '');
                }
                DB::table('cash_drawers')->where('drawer_id', $command->drawer_id)->update($update);
            }

            return response()->json(['success' => true], 200);
        } catch (\Throwable $e) {
            Log::error('POS Agent ack failed', [
                'message' => $e->getMessage(),
                'command_id' => $commandId,
            ]);

            return $this->jsonError('Ack failed: '.$e->getMessage(), 500);
        }
    }

    public function pair(Request $request)
    {
        try {
            if (!$this->isAuthorized($request)) {
                return $this->jsonError('Unauthorized', 401);
            }

            $pairingToken = trim((string)$request->input('pairing_token', ''));
            $deviceCode = trim((string)$request->input('device_code', ''));
            $displayName = trim((string)$request->input('display_name', ''));

            if ($pairingToken === '' || $deviceCode === '') {
                return $this->jsonError('pairing_token and device_code are required', 422);
            }

            if (!$this->hasPosDeviceColumn('pairing_token')) {
                return $this->jsonError('pairing_token column is missing on pos_devices', 500);
            }

            $query = Pos_devices_model::where('pairing_token', $pairingToken);
            if ($this->hasPosDeviceColumn('is_local_terminal')) {
                $query->where('is_local_terminal', true);
            }
            $device = $query->first();

            if (!$device) {
                return $this->jsonError('Invalid pairing token', 404);
            }

            if ($this->hasPosDeviceColumn('device_code')) {
                $device->device_code = $deviceCode;
            } elseif ($this->hasPosDeviceColumn('code')) {
                $device->code = $deviceCode;
            }
            if ($displayName !== '') {
                $device->name = $displayName;
            }
            $this->touchDeviceHeartbeat($device);

            return response()->json([
                'success' => true,
                'device' => [
                    'device_id' => $device->device_id,
                    'name' => $device->name,
                    'device_code' => $this->hasPosDeviceColumn('device_code') ? $device->device_code : ($device->code ?? null),
                ],
            ], 200);
        } catch (\Throwable $e) {
            Log::error('POS Agent pair failed', [
                'message' => $e->getMessage(),
                'device_code' => $request->input('device_code'),
            ]);

            return $this->jsonError('Pair failed: '.$e->getMessage(), 500);
        }
    }
}
