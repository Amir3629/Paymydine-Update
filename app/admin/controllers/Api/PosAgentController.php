<?php

namespace Admin\Controllers\Api;

use Admin\Models\Pos_devices_model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class PosAgentController extends Controller
{
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
        if (!$this->isAuthorized($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $deviceCode = trim((string)$request->query('device_code', ''));
        if ($deviceCode === '') {
            return response()->json(['success' => false, 'message' => 'device_code is required'], 400);
        }

        $device = Pos_devices_model::where('device_code', $deviceCode)->orWhere('code', $deviceCode)->first();
        if (!$device) {
            return response()->json(['success' => false, 'message' => 'POS device not found'], 404);
        }

        if (isset($device->is_local_terminal) && !$device->is_local_terminal) {
            return response()->json(['success' => false, 'message' => 'Device is not configured as local POS terminal'], 422);
        }

        $device->device_status = 'online';
        $device->last_seen_at = now();
        $device->save();

        $command = DB::table('pos_hardware_commands')
            ->where('pos_device_id', $device->device_id)
            ->where('status', 'pending')
            ->orderBy('id', 'asc')
            ->first();

        if (!$command) {
            return response()->json(['success' => true, 'command' => null], 200);
        }

        DB::table('pos_hardware_commands')
            ->where('id', $command->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'processing',
                'picked_at' => now(),
                'updated_at' => now(),
            ]);

        $fresh = DB::table('pos_hardware_commands')->where('id', $command->id)->first();

        return response()->json([
            'success' => true,
            'command' => [
                'id' => $fresh->id,
                'command_type' => $fresh->command_type,
                'payload' => json_decode($fresh->payload, true) ?: [],
                'queued_at' => $fresh->queued_at,
            ],
        ], 200);
    }

    public function ack(Request $request, $commandId)
    {
        if (!$this->isAuthorized($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $status = $request->input('status');
        if (!in_array($status, ['success', 'failed'], true)) {
            return response()->json(['success' => false, 'message' => 'Invalid status'], 422);
        }

        $updated = DB::table('pos_hardware_commands')
            ->where('id', $commandId)
            ->whereIn('status', ['processing', 'pending'])
            ->update([
                'status' => $request->input('status'),
                'result_message' => $request->input('message'),
                'result_payload' => json_encode($request->input('result', [])),
                'completed_at' => now(),
                'updated_at' => now(),
            ]);

        if (!$updated) {
            return response()->json(['success' => false, 'message' => 'Command not found or already finalized'], 404);
        }

        return response()->json(['success' => true], 200);
    }

    public function pair(Request $request)
    {
        if (!$this->isAuthorized($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $pairingToken = trim((string)$request->input('pairing_token', ''));
        $deviceCode = trim((string)$request->input('device_code', ''));
        $displayName = trim((string)$request->input('display_name', ''));

        if ($pairingToken === '' || $deviceCode === '') {
            return response()->json(['success' => false, 'message' => 'pairing_token and device_code are required'], 422);
        }

        $device = Pos_devices_model::where('pairing_token', $pairingToken)
            ->where('is_local_terminal', true)
            ->first();

        if (!$device) {
            return response()->json(['success' => false, 'message' => 'Invalid pairing token'], 404);
        }

        $device->device_code = $deviceCode;
        if ($displayName !== '') {
            $device->name = $displayName;
        }
        $device->device_status = 'online';
        $device->last_seen_at = now();
        $device->save();

        return response()->json([
            'success' => true,
            'device' => [
                'device_id' => $device->device_id,
                'name' => $device->name,
                'device_code' => $device->device_code,
            ],
        ], 200);
    }
}
