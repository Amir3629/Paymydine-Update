<?php

namespace App\Http\Controllers;

use App\Services\PmdTableDisplayPairingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** PMD_TABLE_DISPLAY_PAIRING_V1 */
final class PmdTableDisplayPublicController
{
    public function pair(Request $request): JsonResponse
    {
        $code = trim((string)$request->input('code', ''));
        $deviceName = trim((string)$request->input('device_name', ''));
        $installationId = trim((string)$request->input('installation_id', ''));
        $platform = (array)$request->input('platform', []);

        if ($installationId === '') {
            abort(422, 'installation_id is required.');
        }

        return response()->json(
            app(PmdTableDisplayPairingService::class)->exchange(
                $code,
                $deviceName,
                $installationId,
                $platform,
                $request
            )
        );
    }

    public function tables(Request $request): JsonResponse
    {
        return response()->json(
            app(PmdTableDisplayPairingService::class)->tablesForDevice($request)
        );
    }

    public function bind(Request $request): JsonResponse
    {
        $tableId = (int)$request->input('table_id', 0);
        if ($tableId < 1) {
            abort(422, 'table_id is required.');
        }

        return response()->json(
            app(PmdTableDisplayPairingService::class)->bindTable(
                $request,
                $tableId
            )
        );
    }

    public function state(Request $request): JsonResponse
    {
        $payload = app(PmdTableDisplayPairingService::class)
            ->stateForDevice($request);

        return response()->json(
            $payload,
            ($payload['ok'] ?? false) ? 200 : 409
        );
    }
}
