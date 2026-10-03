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

    protected function bearerToken(Request $request): string
    {
        $header = trim((string)$request->header('Authorization', ''));
        if (stripos($header, 'Bearer ') !== 0) {
            return '';
        }
        return trim(substr($header, 7));
    }

    protected function isBootstrapAuthorized(Request $request): bool
    {
        $expected = trim((string)config('cashdrawer.agent_token', ''));
        $provided = $this->bearerToken($request);
        return $expected !== '' && $provided !== '' && hash_equals($expected, $provided);
    }

    protected function findDeviceByCode(string $deviceCode): ?Pos_devices_model
    {
        if (!Schema::hasTable('pos_devices')) {
            return null;
        }

        $query = Pos_devices_model::query();
        $hasDeviceCode = $this->hasPosDeviceColumn('device_code');
        $hasCode = $this->hasPosDeviceColumn('code');

        if ($hasDeviceCode && $hasCode) {
            $query->where(function ($q) use ($deviceCode) {
                $q->where('device_code', $deviceCode)->orWhere('code', $deviceCode);
            });
        } elseif ($hasDeviceCode) {
            $query->where('device_code', $deviceCode);
        } elseif ($hasCode) {
            $query->where('code', $deviceCode);
        } else {
            return null;
        }

        return $query->first();
    }

    protected function authorizeDevice(Request $request, string $deviceCode): ?Pos_devices_model
    {
        $provided = $this->bearerToken($request);
        if ($provided === '' || !$this->hasPosDeviceColumn('agent_token_hash')) {
            return null;
        }

        $device = $this->findDeviceByCode($deviceCode);
        if (!$device) {
            return null;
        }

        if ($this->hasPosDeviceColumn('is_local_terminal') && !$device->is_local_terminal) {
            return null;
        }

        $expectedHash = trim((string)($device->agent_token_hash ?? ''));
        if ($expectedHash === '') {
            return null;
        }

        $providedHash = hash('sha256', $provided);
        return hash_equals($expectedHash, $providedHash) ? $device : null;
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

    public function pull(Request $request)
    {
        try {
            $deviceCode = trim((string)$request->query('device_code', ''));
            if ($deviceCode === '') {
                return $this->jsonError('device_code is required', 400);
            }

            if (!Schema::hasTable('pos_hardware_commands')) {
                return $this->jsonError('pos_hardware_commands table is missing', 500);
            }

            $device = $this->authorizeDevice($request, $deviceCode);
            if (!$device) {
                return $this->jsonError('Unauthorized device', 401);
            }

            $this->touchDeviceHeartbeat($device);

            $fresh = DB::transaction(function () use ($device) {
                if (Schema::hasColumn('pos_hardware_commands', 'expires_at')) {
                    $expired = DB::table('pos_hardware_commands')
                        ->where('pos_device_id', $device->device_id)
                        ->where('status', 'pending')
                        ->whereNotNull('expires_at')
                        ->where('expires_at', '<=', now());
                    $expired->update(array_filter([
                        'status' => 'cancelled',
                        'result_message' => Schema::hasColumn('pos_hardware_commands', 'result_message')
                            ? 'Expired before POS pickup'
                            : null,
                        'completed_at' => Schema::hasColumn('pos_hardware_commands', 'completed_at')
                            ? now()
                            : null,
                        'updated_at' => now(),
                    ], static fn ($value) => $value !== null));
                }

                $query = DB::table('pos_hardware_commands')
                    ->where('pos_device_id', $device->device_id)
                    ->where('status', 'pending');

                if (Schema::hasColumn('pos_hardware_commands', 'expires_at')) {
                    $query->where(function ($q) {
                        $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                    });
                }

                $command = $query->orderBy('id', 'asc')->lockForUpdate()->first();
                if (!$command) {
                    return null;
                }

                $update = [
                    'status' => 'processing',
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('pos_hardware_commands', 'picked_at')) {
                    $update['picked_at'] = now();
                }

                $updated = DB::table('pos_hardware_commands')
                    ->where('id', $command->id)
                    ->where('status', 'pending')
                    ->update($update);

                if (!$updated) {
                    return null;
                }

                return DB::table('pos_hardware_commands')->where('id', $command->id)->first();
            });

            if (!$fresh) {
                return response()->json(['success' => true, 'command' => null], 200);
            }

            return response()->json([
                'success' => true,
                'command' => [
                    'id' => (int)$fresh->id,
                    'command_type' => (string)$fresh->command_type,
                    'payload' => json_decode((string)$fresh->payload, true) ?: [],
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
            if (!Schema::hasTable('pos_hardware_commands')) {
                return $this->jsonError('pos_hardware_commands table is missing', 500);
            }

            $deviceCode = trim((string)$request->input('device_code', ''));
            if ($deviceCode === '') {
                return $this->jsonError('device_code is required', 400);
            }

            $device = $this->authorizeDevice($request, $deviceCode);
            if (!$device) {
                return $this->jsonError('Unauthorized device', 401);
            }
            $this->touchDeviceHeartbeat($device);

            $status = strtolower(trim((string)$request->input('status', '')));
            if (!in_array($status, ['success', 'failed'], true)) {
                return $this->jsonError('Invalid status', 422);
            }

            $command = DB::table('pos_hardware_commands')
                ->where('id', $commandId)
                ->where('pos_device_id', $device->device_id)
                ->first();
            if (!$command) {
                return $this->jsonError('Command not found for this POS device', 404);
            }
            if (!in_array((string)$command->status, ['processing', 'pending'], true)) {
                return $this->jsonError('Command already finalized', 404);
            }

            $result = $request->input('result', []);
            if (!is_array($result)) {
                $result = [];
            }
            $message = trim((string)$request->input('message', ''));

            $update = [
                'status' => $status,
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('pos_hardware_commands', 'result_message')) {
                $update['result_message'] = $message;
            }
            if (Schema::hasColumn('pos_hardware_commands', 'result_payload')) {
                $update['result_payload'] = json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            }
            if (Schema::hasColumn('pos_hardware_commands', 'completed_at')) {
                $update['completed_at'] = now();
            }

            DB::table('pos_hardware_commands')
                ->where('id', $commandId)
                ->where('pos_device_id', $device->device_id)
                ->update($update);

            // Keep legacy UI snapshots working while canonical result_* fields remain authoritative.
            $payload = json_decode((string)($command->payload ?? '{}'), true);
            if (!is_array($payload)) {
                $payload = [];
            }
            $payload['ack_result'] = $result;
            $payload['ack_status'] = $status;
            $payload['ack_message'] = $message;
            $payload['acknowledged_at'] = now()->toDateTimeString();
            DB::table('pos_hardware_commands')->where('id', $commandId)->update([
                'payload' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

            if (!empty($command->drawer_id) && Schema::hasTable('cash_drawers')) {
                $drawerUpdate = ['updated_at' => now()];
                if (Schema::hasColumn('cash_drawers', 'last_command_status')) {
                    $drawerUpdate['last_command_status'] = $status;
                }
                if (Schema::hasColumn('cash_drawers', 'last_command_message')) {
                    $drawerUpdate['last_command_message'] = $message;
                }

                if (
                    $status === 'success'
                    && (string)$command->command_type === 'test_connection'
                    && !empty($result['printer_name'])
                ) {
                    $drawer = DB::table('cash_drawers')->where('drawer_id', $command->drawer_id)->first();
                    if ($drawer) {
                        $config = json_decode((string)($drawer->connection_config ?? '{}'), true);
                        if (!is_array($config)) {
                            $config = [];
                        }
                        if (empty($config['windows_printer_name'])) {
                            $config['windows_printer_name'] = trim((string)$result['printer_name']);
                            $drawerUpdate['connection_config'] = json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                            if (empty($drawer->device_path)) {
                                $drawerUpdate['device_path'] = trim((string)$result['printer_name']);
                            }
                        }
                    }
                }

                if ((string)$command->command_type === 'test_connection') {
                    if (Schema::hasColumn('cash_drawers', 'setup_state')) {
                        $drawerUpdate['setup_state'] = $status === 'success' ? 'ready' : 'test_failed';
                    }
                    if (Schema::hasColumn('cash_drawers', 'setup_message')) {
                        $drawerUpdate['setup_message'] = $status === 'success'
                            ? 'Local POS connector and cash drawer test succeeded.'
                            : ($message !== '' ? $message : 'Local POS hardware test failed.');
                    }
                    if ($status === 'success' && Schema::hasColumn('cash_drawers', 'setup_completed_at')) {
                        $drawerUpdate['setup_completed_at'] = now();
                    }
                }

                DB::table('cash_drawers')->where('drawer_id', $command->drawer_id)->update($drawerUpdate);
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
            if (!$this->isBootstrapAuthorized($request)) {
                return $this->jsonError('Unauthorized bootstrap token', 401);
            }

            if (!Schema::hasTable('pos_devices')) {
                return $this->jsonError('pos_devices table is missing', 500);
            }
            if (!$this->hasPosDeviceColumn('pairing_token') || !$this->hasPosDeviceColumn('agent_token_hash')) {
                return $this->jsonError('Local POS credential schema is incomplete', 500);
            }

            $pairingToken = trim((string)$request->input('pairing_token', ''));
            $deviceCode = trim((string)$request->input('device_code', ''));
            $displayName = trim((string)$request->input('display_name', ''));

            if ($pairingToken === '' || $deviceCode === '') {
                return $this->jsonError('pairing_token and device_code are required', 422);
            }

            $query = Pos_devices_model::where('pairing_token', $pairingToken);
            if ($this->hasPosDeviceColumn('is_local_terminal')) {
                $query->where('is_local_terminal', true);
            }
            $device = $query->first();
            if (!$device) {
                return $this->jsonError('Invalid or already-consumed pairing token', 404);
            }

            if ($this->hasPosDeviceColumn('device_code')) {
                $device->device_code = $deviceCode;
            } elseif ($this->hasPosDeviceColumn('code')) {
                $device->code = $deviceCode;
            }
            if ($displayName !== '') {
                $device->name = $displayName;
            }
            if ($this->hasPosDeviceColumn('platform_info')) {
                $platformInfo = $request->input('platform_info', []);
                $device->platform_info = is_array($platformInfo) ? $platformInfo : [];
            }

            $deviceToken = bin2hex(random_bytes(32));
            $device->agent_token_hash = hash('sha256', $deviceToken);
            if ($this->hasPosDeviceColumn('agent_token_issued_at')) {
                $device->agent_token_issued_at = now();
            }
            // One-time pairing secret. A fresh connector download creates a new one if re-pairing is required.
            $device->pairing_token = null;
            $device->save();
            $this->touchDeviceHeartbeat($device);

            return response()->json([
                'success' => true,
                'device_token' => $deviceToken,
                'device' => [
                    'device_id' => (int)$device->device_id,
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
