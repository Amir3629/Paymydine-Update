<?php

namespace App\Http\Controllers;

use App\Services\PmdMobileSync\PmdMobileCommandProcessor;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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

    public function commands(
        Request $request,
        PmdMobileDeviceAuthService $auth,
        PmdMobileCommandProcessor $processor
    ) {
        try {
            $identity = $auth->authenticate($request);
            $result = $processor->execute(
                $identity,
                (array)$request->json()->all()
            );

            return response()->json($result, 200, [
                'Cache-Control' => 'no-store, private',
            ]);
        } catch (ValidationException $error) {
            return response()->json([
                'ok' => false,
                'error' => 'mobile_command_invalid',
                'message' => collect($error->errors())->flatten()->first()
                    ?: 'The PayMyDine mobile command is invalid.',
                'errors' => $error->errors(),
            ], 422);
        } catch (HttpExceptionInterface $error) {
            return response()->json([
                'ok' => false,
                'error' => $error->getStatusCode() === 409
                    ? 'mobile_command_conflict'
                    : 'mobile_command_rejected',
                'message' => $error->getMessage()
                    ?: 'The PayMyDine mobile command was rejected.',
            ], $error->getStatusCode());
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'error' => 'mobile_command_failed',
                'message' => 'The PayMyDine mobile command could not be applied.',
            ], 500);
        }
    }
}
