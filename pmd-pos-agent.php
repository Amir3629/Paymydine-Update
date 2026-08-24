<?php

declare(strict_types=1);

use App\Http\Middleware\DetectTenant;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/*
 * PMD_LOCAL_POS_DIRECT_GATEWAY_R27
 * PMD_LOCAL_POS_DIRECT_DB_AUTHORITY_R27_HOTFIX
 *
 * Canonical machine-to-machine bridge for the PayMyDine Windows Local POS
 * Agent. This intentionally does not depend on Laravel route registration OR
 * TastyIgniter Admin namespace autoloading.
 *
 * Security contract:
 * - tenant context is resolved from the request Host by DetectTenant
 * - Agent package contains no tenant/device secret
 * - pair uses a strong one-time POS pairing token
 * - pull/ack use the generated per-device bearer token
 * - all device/command queries execute only after tenant context is active
 */

require __DIR__.'/bootstrap/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(ConsoleKernel::class)->bootstrap();

$request = Request::capture();
$action = strtolower(trim((string)$request->query('action', '')));
$method = strtoupper((string)$request->getMethod());

/* FastCGI may omit Authorization. Agent mirrors the token in this header. */
if (!$request->headers->has('Authorization')) {
    $fallbackToken = trim((string)$request->header('X-PMD-Device-Token', ''));
    if ($fallbackToken !== '') {
        $request->headers->set('Authorization', 'Bearer '.$fallbackToken);
    }
}

$pmdJsonError = static function (string $message, int $status = 500, array $extra = []): SymfonyResponse {
    return response()->json(array_merge([
        'success' => false,
        'message' => $message,
    ], $extra), $status);
};

$pmdMethodNotAllowed = static function (string $allow) use ($pmdJsonError): SymfonyResponse {
    return $pmdJsonError('Method not allowed', 405)->header('Allow', $allow);
};

$pmdHasColumn = static function (string $table, string $column): bool {
    return Schema::hasTable($table) && Schema::hasColumn($table, $column);
};

$pmdBearerToken = static function (Request $request): string {
    $header = trim((string)$request->header('Authorization', ''));
    if (stripos($header, 'Bearer ') !== 0) {
        return '';
    }
    return trim(substr($header, 7));
};

$pmdFindDeviceByCode = static function (string $deviceCode) use ($pmdHasColumn) {
    if (!Schema::hasTable('pos_devices')) {
        return null;
    }

    $hasDeviceCode = $pmdHasColumn('pos_devices', 'device_code');
    $hasCode = $pmdHasColumn('pos_devices', 'code');
    if (!$hasDeviceCode && !$hasCode) {
        return null;
    }

    $query = DB::table('pos_devices');
    if ($hasDeviceCode && $hasCode) {
        $query->where(static function ($q) use ($deviceCode): void {
            $q->where('device_code', $deviceCode)->orWhere('code', $deviceCode);
        });
    } elseif ($hasDeviceCode) {
        $query->where('device_code', $deviceCode);
    } else {
        $query->where('code', $deviceCode);
    }

    return $query->first();
};

$pmdAuthorizeDevice = static function (Request $request, string $deviceCode) use (
    $pmdBearerToken,
    $pmdHasColumn,
    $pmdFindDeviceByCode
) {
    $provided = $pmdBearerToken($request);
    if ($provided === '' || !$pmdHasColumn('pos_devices', 'agent_token_hash')) {
        return null;
    }

    $device = $pmdFindDeviceByCode($deviceCode);
    if (!$device) {
        return null;
    }

    if ($pmdHasColumn('pos_devices', 'is_local_terminal') && empty($device->is_local_terminal)) {
        return null;
    }

    $expectedHash = trim((string)($device->agent_token_hash ?? ''));
    if ($expectedHash === '') {
        return null;
    }

    return hash_equals($expectedHash, hash('sha256', $provided)) ? $device : null;
};

$pmdTouchDevice = static function ($device) use ($pmdHasColumn): void {
    if (!$device || empty($device->device_id)) {
        return;
    }

    $update = [];
    if ($pmdHasColumn('pos_devices', 'device_status')) {
        $update['device_status'] = 'online';
    }
    if ($pmdHasColumn('pos_devices', 'last_seen_at')) {
        $update['last_seen_at'] = now();
    }
    if ($pmdHasColumn('pos_devices', 'updated_at')) {
        $update['updated_at'] = now();
    }
    if ($update) {
        DB::table('pos_devices')->where('device_id', $device->device_id)->update($update);
    }
};

$pmdPair = static function (Request $request) use ($pmdJsonError, $pmdHasColumn, $pmdTouchDevice): SymfonyResponse {
    try {
        if (!Schema::hasTable('pos_devices')) {
            return $pmdJsonError('pos_devices table is missing', 500);
        }
        if (!$pmdHasColumn('pos_devices', 'pairing_token') || !$pmdHasColumn('pos_devices', 'agent_token_hash')) {
            return $pmdJsonError('Local POS credential schema is incomplete', 500);
        }

        $pairingToken = trim((string)$request->input('pairing_token', ''));
        $deviceCode = trim((string)$request->input('device_code', ''));
        $displayName = trim((string)$request->input('display_name', ''));
        if ($pairingToken === '' || $deviceCode === '') {
            return $pmdJsonError('pairing_token and device_code are required', 422);
        }

        $query = DB::table('pos_devices')->where('pairing_token', $pairingToken);
        if ($pmdHasColumn('pos_devices', 'is_local_terminal')) {
            $query->where('is_local_terminal', 1);
        }
        $device = $query->first();
        if (!$device) {
            return $pmdJsonError('Invalid or already-consumed pairing token', 404);
        }

        $deviceToken = bin2hex(random_bytes(32));
        $update = [
            'agent_token_hash' => hash('sha256', $deviceToken),
            'pairing_token' => null,
        ];

        if ($pmdHasColumn('pos_devices', 'device_code')) {
            $update['device_code'] = $deviceCode;
        } elseif ($pmdHasColumn('pos_devices', 'code')) {
            $update['code'] = $deviceCode;
        }
        if ($displayName !== '' && $pmdHasColumn('pos_devices', 'name')) {
            $update['name'] = $displayName;
        }
        if ($pmdHasColumn('pos_devices', 'platform_info')) {
            $platformInfo = $request->input('platform_info', []);
            $update['platform_info'] = json_encode(
                is_array($platformInfo) ? $platformInfo : [],
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
        }
        if ($pmdHasColumn('pos_devices', 'agent_token_issued_at')) {
            $update['agent_token_issued_at'] = now();
        }
        if ($pmdHasColumn('pos_devices', 'updated_at')) {
            $update['updated_at'] = now();
        }

        DB::table('pos_devices')->where('device_id', $device->device_id)->update($update);
        $device = DB::table('pos_devices')->where('device_id', $device->device_id)->first();
        $pmdTouchDevice($device);

        return response()->json([
            'success' => true,
            'device_token' => $deviceToken,
            'device' => [
                'device_id' => (int)$device->device_id,
                'name' => $device->name ?? $displayName,
                'device_code' => $pmdHasColumn('pos_devices', 'device_code')
                    ? ($device->device_code ?? $deviceCode)
                    : ($device->code ?? $deviceCode),
            ],
        ], 200);
    } catch (Throwable $error) {
        Log::error('PMD direct POS pair failed', [
            'message' => $error->getMessage(),
            'device_code' => $request->input('device_code'),
        ]);
        return $pmdJsonError('Pair failed', 500);
    }
};

$pmdPull = static function (Request $request) use (
    $pmdJsonError,
    $pmdAuthorizeDevice,
    $pmdTouchDevice,
    $pmdHasColumn
): SymfonyResponse {
    try {
        $deviceCode = trim((string)$request->query('device_code', ''));
        if ($deviceCode === '') {
            return $pmdJsonError('device_code is required', 400);
        }
        if (!Schema::hasTable('pos_hardware_commands')) {
            return $pmdJsonError('pos_hardware_commands table is missing', 500);
        }

        $device = $pmdAuthorizeDevice($request, $deviceCode);
        if (!$device) {
            return $pmdJsonError('Unauthorized device', 401);
        }
        $pmdTouchDevice($device);

        $fresh = DB::transaction(static function () use ($device, $pmdHasColumn) {
            if ($pmdHasColumn('pos_hardware_commands', 'expires_at')) {
                $expiredUpdate = ['status' => 'cancelled'];
                if ($pmdHasColumn('pos_hardware_commands', 'result_message')) {
                    $expiredUpdate['result_message'] = 'Expired before POS pickup';
                }
                if ($pmdHasColumn('pos_hardware_commands', 'completed_at')) {
                    $expiredUpdate['completed_at'] = now();
                }
                if ($pmdHasColumn('pos_hardware_commands', 'updated_at')) {
                    $expiredUpdate['updated_at'] = now();
                }

                DB::table('pos_hardware_commands')
                    ->where('pos_device_id', $device->device_id)
                    ->where('status', 'pending')
                    ->whereNotNull('expires_at')
                    ->where('expires_at', '<=', now())
                    ->update($expiredUpdate);
            }

            $query = DB::table('pos_hardware_commands')
                ->where('pos_device_id', $device->device_id)
                ->where('status', 'pending');

            if ($pmdHasColumn('pos_hardware_commands', 'expires_at')) {
                $query->where(static function ($q): void {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                });
            }

            $command = $query->orderBy('id', 'asc')->lockForUpdate()->first();
            if (!$command) {
                return null;
            }

            $update = ['status' => 'processing'];
            if ($pmdHasColumn('pos_hardware_commands', 'picked_at')) {
                $update['picked_at'] = now();
            }
            if ($pmdHasColumn('pos_hardware_commands', 'updated_at')) {
                $update['updated_at'] = now();
            }

            $updated = DB::table('pos_hardware_commands')
                ->where('id', $command->id)
                ->where('status', 'pending')
                ->update($update);

            return $updated
                ? DB::table('pos_hardware_commands')->where('id', $command->id)->first()
                : null;
        });

        if (!$fresh) {
            return response()->json(['success' => true, 'command' => null], 200);
        }

        return response()->json([
            'success' => true,
            'command' => [
                'id' => (int)$fresh->id,
                'command_type' => (string)$fresh->command_type,
                'payload' => json_decode((string)($fresh->payload ?? '{}'), true) ?: [],
                'queued_at' => $fresh->queued_at ?? null,
            ],
        ], 200);
    } catch (Throwable $error) {
        Log::error('PMD direct POS pull failed', [
            'message' => $error->getMessage(),
            'device_code' => $request->query('device_code'),
        ]);
        return $pmdJsonError('Pull failed', 500);
    }
};

$pmdAck = static function (Request $request, int $commandId) use (
    $pmdJsonError,
    $pmdAuthorizeDevice,
    $pmdTouchDevice,
    $pmdHasColumn
): SymfonyResponse {
    try {
        if (!Schema::hasTable('pos_hardware_commands')) {
            return $pmdJsonError('pos_hardware_commands table is missing', 500);
        }

        $deviceCode = trim((string)$request->input('device_code', ''));
        if ($deviceCode === '') {
            return $pmdJsonError('device_code is required', 400);
        }

        $device = $pmdAuthorizeDevice($request, $deviceCode);
        if (!$device) {
            return $pmdJsonError('Unauthorized device', 401);
        }
        $pmdTouchDevice($device);

        $status = strtolower(trim((string)$request->input('status', '')));
        if (!in_array($status, ['success', 'failed'], true)) {
            return $pmdJsonError('Invalid status', 422);
        }

        $command = DB::table('pos_hardware_commands')
            ->where('id', $commandId)
            ->where('pos_device_id', $device->device_id)
            ->first();
        if (!$command) {
            return $pmdJsonError('Command not found for this POS device', 404);
        }
        if (!in_array((string)$command->status, ['processing', 'pending'], true)) {
            return $pmdJsonError('Command already finalized', 404);
        }

        $result = $request->input('result', []);
        if (!is_array($result)) {
            $result = [];
        }
        $message = trim((string)$request->input('message', ''));

        $update = ['status' => $status];
        if ($pmdHasColumn('pos_hardware_commands', 'result_message')) {
            $update['result_message'] = $message;
        }
        if ($pmdHasColumn('pos_hardware_commands', 'result_payload')) {
            $update['result_payload'] = json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        if ($pmdHasColumn('pos_hardware_commands', 'completed_at')) {
            $update['completed_at'] = now();
        }
        if ($pmdHasColumn('pos_hardware_commands', 'updated_at')) {
            $update['updated_at'] = now();
        }

        DB::table('pos_hardware_commands')
            ->where('id', $commandId)
            ->where('pos_device_id', $device->device_id)
            ->update($update);

        if ($pmdHasColumn('pos_hardware_commands', 'payload')) {
            $payload = json_decode((string)($command->payload ?? '{}'), true);
            if (!is_array($payload)) {
                $payload = [];
            }
            $payload['ack_result'] = $result;
            $payload['ack_status'] = $status;
            $payload['ack_message'] = $message;
            $payload['acknowledged_at'] = now()->toDateTimeString();
            $payloadUpdate = [
                'payload' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ];
            if ($pmdHasColumn('pos_hardware_commands', 'updated_at')) {
                $payloadUpdate['updated_at'] = now();
            }
            DB::table('pos_hardware_commands')->where('id', $commandId)->update($payloadUpdate);
        }

        if (!empty($command->drawer_id) && Schema::hasTable('cash_drawers')) {
            $drawerUpdate = [];
            if ($pmdHasColumn('cash_drawers', 'last_command_status')) {
                $drawerUpdate['last_command_status'] = $status;
            }
            if ($pmdHasColumn('cash_drawers', 'last_command_message')) {
                $drawerUpdate['last_command_message'] = $message;
            }
            if ($pmdHasColumn('cash_drawers', 'updated_at')) {
                $drawerUpdate['updated_at'] = now();
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
                        if ($pmdHasColumn('cash_drawers', 'connection_config')) {
                            $drawerUpdate['connection_config'] = json_encode(
                                $config,
                                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                            );
                        }
                        if (empty($drawer->device_path) && $pmdHasColumn('cash_drawers', 'device_path')) {
                            $drawerUpdate['device_path'] = trim((string)$result['printer_name']);
                        }
                    }
                }
            }

            if ((string)$command->command_type === 'test_connection') {
                if ($pmdHasColumn('cash_drawers', 'setup_state')) {
                    $drawerUpdate['setup_state'] = $status === 'success' ? 'ready' : 'test_failed';
                }
                if ($pmdHasColumn('cash_drawers', 'setup_message')) {
                    $drawerUpdate['setup_message'] = $status === 'success'
                        ? 'Local POS connector and cash drawer test succeeded.'
                        : ($message !== '' ? $message : 'Local POS hardware test failed.');
                }
                if ($status === 'success' && $pmdHasColumn('cash_drawers', 'setup_completed_at')) {
                    $drawerUpdate['setup_completed_at'] = now();
                }
            }

            if ($drawerUpdate) {
                DB::table('cash_drawers')->where('drawer_id', $command->drawer_id)->update($drawerUpdate);
            }
        }

        return response()->json(['success' => true], 200);
    } catch (Throwable $error) {
        Log::error('PMD direct POS ack failed', [
            'message' => $error->getMessage(),
            'command_id' => $commandId,
        ]);
        return $pmdJsonError('Ack failed', 500);
    }
};

try {
    $tenantMiddleware = $app->make(DetectTenant::class);

    $response = $tenantMiddleware->handle(
        $request,
        static function (Request $request) use (
            $action,
            $method,
            $pmdMethodNotAllowed,
            $pmdJsonError,
            $pmdPair,
            $pmdPull,
            $pmdAck
        ) {
            if ($action === 'health') {
                if ($method !== 'GET') {
                    return $pmdMethodNotAllowed('GET');
                }
                return response()->json([
                    'ok' => true,
                    'bridge' => 'PayMyDine Local POS R2.7 DB Hotfix',
                ], 200);
            }

            if ($action === 'agent') {
                if ($method !== 'GET') {
                    return $pmdMethodNotAllowed('GET');
                }

                $agentPath = __DIR__.'/tools/local-pos-agent/agent.js';
                if (!is_file($agentPath)) {
                    return $pmdJsonError('Local POS Agent package is unavailable', 404);
                }

                $source = (string)file_get_contents($agentPath);
                $source = str_replace(
                    "cfg.backendBase + '/api/pos-agent/pair'",
                    "cfg.backendBase + '/pmd-pos-agent.php?action=pair'",
                    $source
                );
                $source = str_replace(
                    "cfg.backendBase + '/api/pos-agent/commands/pull?device_code='",
                    "cfg.backendBase + '/pmd-pos-agent.php?action=pull&device_code='",
                    $source
                );
                $source = str_replace(
                    "cfg.backendBase + '/api/pos-agent/commands/' + encodeURIComponent(String(commandId)) + '/ack'",
                    "cfg.backendBase + '/pmd-pos-agent.php?action=ack&id=' + encodeURIComponent(String(commandId))",
                    $source
                );
                $source = str_replace(
                    "if (token) headers.Authorization = 'Bearer ' + token;",
                    "if (token) { headers.Authorization = 'Bearer ' + token; headers['X-PMD-Device-Token'] = token; }",
                    $source
                );

                return response($source, 200, [
                    'Content-Type' => 'application/javascript; charset=UTF-8',
                    'Cache-Control' => 'no-store, max-age=0',
                    'X-PMD-Local-Agent' => 'R2.7-direct-db-hotfix',
                ]);
            }

            if ($action === 'pair') {
                if ($method !== 'POST') {
                    return $pmdMethodNotAllowed('POST');
                }
                return $pmdPair($request);
            }

            if ($action === 'pull') {
                if ($method !== 'GET') {
                    return $pmdMethodNotAllowed('GET');
                }
                return $pmdPull($request);
            }

            if ($action === 'ack') {
                if ($method !== 'POST') {
                    return $pmdMethodNotAllowed('POST');
                }
                $commandId = (int)$request->query('id', 0);
                if ($commandId < 1) {
                    return $pmdJsonError('Valid command id is required', 422);
                }
                return $pmdAck($request, $commandId);
            }

            return $pmdJsonError('Unknown Local POS action', 404);
        }
    );
} catch (Throwable $error) {
    try {
        Log::error('PMD Local POS direct gateway failed', [
            'action' => $action,
            'message' => $error->getMessage(),
        ]);
    } catch (Throwable $ignored) {
    }

    $response = response()->json([
        'success' => false,
        'message' => 'Local POS bridge error',
    ], 500);
}

if (!$response instanceof SymfonyResponse) {
    $response = response()->json([
        'success' => false,
        'message' => 'Invalid Local POS bridge response',
    ], 500);
}

$response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
$response->headers->set('Pragma', 'no-cache');
$response->headers->set('X-PMD-Local-POS-Bridge', 'R2.7-db-hotfix');
$response->send();
