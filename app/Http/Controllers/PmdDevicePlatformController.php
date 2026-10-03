<?php

namespace App\Http\Controllers;

use App\Services\PmdDevicePlatformAuthService;
use App\Services\PmdDevicePlatformService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class PmdDevicePlatformController extends Controller
{
    public function heartbeat(
        Request $request,
        PmdDevicePlatformAuthService $auth,
        PmdDevicePlatformService $platform
    ): JsonResponse {
        $device = $auth->authenticate($request);

        $input = $request->validate([
            'device_mode' => ['nullable', 'string', 'max:40'],
            'app_version' => ['nullable', 'string', 'max:80'],
            'os_version' => ['nullable', 'string', 'max:80'],
            'manufacturer' => ['nullable', 'string', 'max:120'],
            'model' => ['nullable', 'string', 'max:160'],
            'screen_state' => ['nullable', 'string', 'in:awake,closed,sleep,identify'],
            'brightness' => ['nullable', 'integer', 'min:0', 'max:100'],
            'battery_level' => ['nullable', 'integer', 'min:0', 'max:100'],
            'is_charging' => ['nullable', 'boolean'],
            'network_type' => ['nullable', 'string', 'max:32'],
            'booted_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ]);

        return response()->json(
            $platform->heartbeat($device, $input),
            200,
            ['Cache-Control' => 'no-store, private']
        );
    }

    public function log(
        Request $request,
        PmdDevicePlatformAuthService $auth,
        PmdDevicePlatformService $platform
    ): JsonResponse {
        $device = $auth->authenticate($request);

        $data = $request->validate([
            'level' => ['nullable', 'string', 'in:debug,info,warning,error'],
            'event' => ['required', 'string', 'max:80'],
            'message' => ['nullable', 'string', 'max:1000'],
            'context' => ['nullable', 'array'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        return response()->json(
            $platform->recordLog($device, $data),
            200,
            ['Cache-Control' => 'no-store, private']
        );
    }

    public function acknowledge(
        Request $request,
        PmdDevicePlatformAuthService $auth,
        PmdDevicePlatformService $platform
    ): JsonResponse {
        $device = $auth->authenticate($request);

        $data = $request->validate([
            'command_id' => ['required', 'uuid'],
            'status' => ['required', 'string', 'in:acknowledged,completed,failed'],
            'result' => ['nullable', 'array'],
        ]);

        return response()->json(
            $platform->acknowledge(
                $device,
                (string)$data['command_id'],
                (string)$data['status'],
                (array)($data['result'] ?? [])
            ),
            200,
            ['Cache-Control' => 'no-store, private']
        );
    }
}
