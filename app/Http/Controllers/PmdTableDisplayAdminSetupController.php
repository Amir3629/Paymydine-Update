<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use App\Services\PmdTableDisplayPairingService;
use App\Services\PmdTableDisplayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** PMD_TABLE_DISPLAY_PAIRING_V1 */
final class PmdTableDisplayAdminSetupController
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = AdminAuth::getUser();
        if (!$user) {
            abort(401, 'Authentication required.');
        }
        if (!$user->hasPermission('Site.Settings')) {
            abort(403, 'Settings permission required.');
        }

        $locationId = 0;
        try {
            $locationId = (int)AdminLocation::getId();
        } catch (\Throwable $ignored) {
        }

        $tableId = (int)$request->input('table_id', 0);
        if ($tableId > 0) {
            $table = collect(app(PmdTableDisplayService::class)->tables())
                ->first(static fn (array $row) =>
                    (int)($row['id'] ?? 0) === $tableId
                );
            if ($table) {
                $locationId = (int)($table['location_id'] ?? $locationId);
            }
        }

        return response()->json(
            app(PmdTableDisplayPairingService::class)->createSetupCode(
                $user,
                $locationId,
                $request
            )
        );
    }
}
