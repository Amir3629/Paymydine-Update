<?php

namespace App\Http\Controllers;

use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class PmdMobileSyncController extends Controller
{
    public function events(Request $request, PmdMobileDeviceAuthService $auth)
    {
        $identity = $auth->authenticate($request);

        if (!Schema::hasTable('pmd_sync_events')) {
            return response()->json([
                'ok' => false,
                'error' => 'sync_schema_not_ready',
            ], 503);
        }

        $after = max(0, (int)$request->query('after', 0));
        $limit = max(1, min(500, (int)$request->query('limit', 250)));

        $rows = DB::table('pmd_sync_events')
            ->where('location_id', (int)$identity['location_id'])
            ->where('sequence', '>', $after)
            ->orderBy('sequence')
            ->limit($limit)
            ->get()
            ->map(function ($row) {
                $payload = json_decode((string)$row->payload, true);

                return [
                    'sequence' => (int)$row->sequence,
                    'event_id' => (string)$row->event_id,
                    'location_id' => (int)$row->location_id,
                    'aggregate' => (string)$row->aggregate,
                    'aggregate_id' => (string)$row->aggregate_id,
                    'aggregate_version' => (int)$row->aggregate_version,
                    'event_type' => (string)$row->event_type,
                    'payload' => is_array($payload) ? $payload : [],
                    'occurred_at' => (string)($row->occurred_at ?? $row->created_at ?? ''),
                ];
            })
            ->values();

        $cursor = $after;
        if ($rows->isNotEmpty()) {
            $cursor = (int)$rows->last()['sequence'];
        }

        return response()->json([
            'ok' => true,
            'protocol' => 'pmd-sync-v1',
            'events' => $rows,
            'cursor' => $cursor,
            'has_more' => $rows->count() === $limit,
        ], 200, [
            'Cache-Control' => 'no-store, private',
        ]);
    }

    /**
     * Intentionally fail closed until command processors are individually
     * certified idempotent. Exposing a generic "save order" replay endpoint
     * here would be unsafe.
     */
    public function commands(Request $request, PmdMobileDeviceAuthService $auth)
    {
        $auth->authenticate($request);

        return response()->json([
            'ok' => false,
            'error' => 'mobile_commands_not_enabled',
            'message' => 'Offline command replay is not enabled yet.',
        ], 503);
    }
}
