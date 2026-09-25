<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Services\PmdShiftAttendanceSnapshotV134;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * PMD_SHIFT_ATTENDANCE_LIVE_V1
 * PMD_SHIFT_ATTENDANCE_SINGLE_AUTHORITY_V134
 *
 * Read-only Owner/Manager endpoint for the Shifts board. Planning remains
 * owned by the rota; actual presence is computed by the same attendance
 * snapshot service used by the server-rendered first paint.
 */
class PmdShiftAttendanceLiveController
{
    public function __invoke(Request $request)
    {
        if (!AdminAuth::isLogged()) {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Authentication required.',
                ],
                401
            );
        }

        $role = app(
            PmdDefaultStaffRoleService::class
        )->roleCodeForUser(
            AdminAuth::getUser()
        );

        if (
            !in_array(
                $role,
                [
                    PmdDefaultStaffRoleService::OWNER,
                    PmdDefaultStaffRoleService::MANAGER,
                ],
                true
            )
        ) {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Owner or Manager access required.',
                ],
                403
            );
        }

        $payload = app(
            PmdShiftAttendanceSnapshotV134::class
        )->payload(
            $this->locationId(),
            $this->selectedDay($request)
        );

        return response()
            ->json($payload)
            ->header(
                'Cache-Control',
                'no-store, private, max-age=0'
            );
    }

    private function locationId(): int
    {
        try {
            return max(
                1,
                (int)AdminLocation::getId()
            );
        } catch (\Throwable $error) {
            return 1;
        }
    }

    private function selectedDay(
        Request $request
    ): Carbon {
        $raw = trim(
            (string)$request->query(
                'day',
                ''
            )
        );

        if (
            preg_match(
                '/^\d{4}-\d{2}-\d{2}$/',
                $raw
            )
        ) {
            try {
                return Carbon::parse(
                    $raw
                )->startOfDay();
            } catch (\Throwable $error) {
            }
        }

        return now()->startOfDay();
    }
}
