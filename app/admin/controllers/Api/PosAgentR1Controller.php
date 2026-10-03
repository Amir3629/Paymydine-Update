<?php

namespace Admin\Controllers\Api;

use Admin\Models\Pos_devices_model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * R1 public pairing endpoint uses only a strong, random, one-time device
 * pairing token. After pairing, pull/ack are inherited from PosAgentController
 * and require the generated per-device credential.
 */
class PosAgentR1Controller extends PosAgentController
{
    public function pair(Request $request)
    {
        try {
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

            // Consume the installation secret immediately. Re-pairing requires
            // an authenticated user to download a fresh connector package.
            $device->pairing_token = null;
            $device->save();
            $this->touchDeviceHeartbeat($device);

            return response()->json([
                'success' => true,
                'device_token' => $deviceToken,
                'device' => [
                    'device_id' => (int)$device->device_id,
                    'name' => $device->name,
                    'device_code' => $this->hasPosDeviceColumn('device_code')
                        ? $device->device_code
                        : ($device->code ?? null),
                ],
            ], 200);
        } catch (\Throwable $e) {
            Log::error('POS Agent R1 pair failed', [
                'message' => $e->getMessage(),
                'device_code' => $request->input('device_code'),
            ]);

            return $this->jsonError('Pair failed: '.$e->getMessage(), 500);
        }
    }
}
