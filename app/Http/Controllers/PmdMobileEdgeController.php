<?php

namespace App\Http\Controllers;

use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

final class PmdMobileEdgeController extends Controller
{
    public function register(
        Request $request,
        PmdMobileDeviceAuthService $auth
    ) {
        try {
            $identity = $auth->authenticate($request);
            $role = (string)($identity['role_code'] ?? '');

            if (!in_array($role, [
                PmdDefaultStaffRoleService::OWNER,
                PmdDefaultStaffRoleService::MANAGER,
            ], true)) {
                abort(
                    403,
                    'Only a PayMyDine Owner or Manager can promote a device to restaurant Edge.'
                );
            }

            if (!Schema::hasTable('pmd_mobile_edges')) {
                abort(503, 'PayMyDine Edge registry is not ready.');
            }

            $data = $request->validate([
                'fingerprint_sha256' => [
                    'required',
                    'string',
                    'regex:/^[a-fA-F0-9]{64}$/',
                ],
                'port' => ['required', 'integer', 'min:1024', 'max:65535'],
                'protocol' => ['nullable', 'string', 'in:pmd-edge-v1'],
            ]);

            $locationId = (int)$identity['location_id'];
            $deviceId = (int)$identity['device_id'];
            $fingerprint = strtolower(
                trim((string)$data['fingerprint_sha256'])
            );
            $port = (int)$data['port'];

            DB::table('pmd_mobile_edges')->updateOrInsert(
                ['location_id' => $locationId],
                [
                    'device_id' => $deviceId,
                    'fingerprint_sha256' => $fingerprint,
                    'port' => $port,
                    'protocol' => 'pmd-edge-v1',
                    'is_active' => 1,
                    'last_seen_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            return response()->json([
                'ok' => true,
                'edge' => [
                    'location_id' => $locationId,
                    'device_id' => $deviceId,
                    'fingerprint_sha256' => $fingerprint,
                    'port' => $port,
                    'protocol' => 'pmd-edge-v1',
                ],
            ], 200, [
                'Cache-Control' => 'no-store, private',
            ]);
        } catch (ValidationException $error) {
            return response()->json([
                'ok' => false,
                'error' => 'edge_registration_invalid',
                'message' => collect($error->errors())->flatten()->first()
                    ?: 'Invalid PayMyDine Edge registration.',
                'errors' => $error->errors(),
            ], 422);
        } catch (HttpExceptionInterface $error) {
            return response()->json([
                'ok' => false,
                'error' => 'edge_registration_rejected',
                'message' => $error->getMessage(),
            ], $error->getStatusCode());
        }
    }

    public function heartbeat(
        Request $request,
        PmdMobileDeviceAuthService $auth
    ) {
        $identity = $auth->authenticate($request);

        if (!Schema::hasTable('pmd_mobile_edges')) {
            abort(503, 'PayMyDine Edge registry is not ready.');
        }

        $updated = DB::table('pmd_mobile_edges')
            ->where('location_id', (int)$identity['location_id'])
            ->where('device_id', (int)$identity['device_id'])
            ->where('is_active', 1)
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        if (!$updated) {
            abort(404, 'This device is not the active PayMyDine Edge.');
        }

        return response()->json(['ok' => true]);
    }

    public function disable(
        Request $request,
        PmdMobileDeviceAuthService $auth
    ) {
        $identity = $auth->authenticate($request);
        $role = (string)($identity['role_code'] ?? '');

        if (!in_array($role, [
            PmdDefaultStaffRoleService::OWNER,
            PmdDefaultStaffRoleService::MANAGER,
        ], true)) {
            abort(403, 'Only a PayMyDine Owner or Manager can disable restaurant Edge.');
        }

        if (Schema::hasTable('pmd_mobile_edges')) {
            DB::table('pmd_mobile_edges')
                ->where('location_id', (int)$identity['location_id'])
                ->where('device_id', (int)$identity['device_id'])
                ->update([
                    'is_active' => 0,
                    'updated_at' => now(),
                ]);
        }

        return response()->json(['ok' => true]);
    }
}
