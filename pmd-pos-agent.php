<?php

declare(strict_types=1);

use Admin\Controllers\Api\PosAgentR1Controller;
use App\Http\Middleware\DetectTenant;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/*
 * PMD_LOCAL_POS_DIRECT_GATEWAY_R27
 *
 * Canonical machine-to-machine bridge for the PayMyDine Windows Local POS
 * Agent. This intentionally does not depend on Laravel route registration.
 * Nginx already executes root *.php files through PHP-FPM on tenant hosts.
 *
 * Security contract:
 * - tenant context is resolved from the request Host by DetectTenant
 * - the Agent package contains no tenant secret and is served only for a
 *   recognized tenant host
 * - pair uses the one-time POS pairing token
 * - pull/ack use the per-device bearer token
 * - no tenant database name or secret is returned by the health endpoint
 */

require __DIR__.'/bootstrap/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(ConsoleKernel::class)->bootstrap();

$request = Request::capture();
$action = strtolower(trim((string)$request->query('action', '')));
$method = strtoupper((string)$request->getMethod());

/*
 * Some FastCGI stacks do not preserve Authorization consistently. The Agent
 * sends the same credential in X-PMD-Device-Token as a safe header fallback.
 */
if (!$request->headers->has('Authorization')) {
    $fallbackToken = trim((string)$request->header('X-PMD-Device-Token', ''));
    if ($fallbackToken !== '') {
        $request->headers->set('Authorization', 'Bearer '.$fallbackToken);
    }
}

$methodNotAllowed = static function (string $allow): SymfonyResponse {
    return response()->json([
        'success' => false,
        'message' => 'Method not allowed',
    ], 405)->header('Allow', $allow);
};

try {
    $tenantMiddleware = $app->make(DetectTenant::class);

    $response = $tenantMiddleware->handle(
        $request,
        static function (Request $request) use ($app, $action, $method, $methodNotAllowed) {
            if ($action === 'health') {
                if ($method !== 'GET') {
                    return $methodNotAllowed('GET');
                }

                return response()->json([
                    'ok' => true,
                    'bridge' => 'PayMyDine Local POS R2.7',
                ], 200);
            }

            if ($action === 'agent') {
                if ($method !== 'GET') {
                    return $methodNotAllowed('GET');
                }

                $agentPath = __DIR__.'/tools/local-pos-agent/agent.js';
                if (!is_file($agentPath)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Local POS Agent package is unavailable',
                    ], 404);
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
                    'X-PMD-Local-Agent' => 'R2.7-direct-gateway',
                ]);
            }

            /** @var PosAgentR1Controller $controller */
            $controller = $app->make(PosAgentR1Controller::class);

            if ($action === 'pair') {
                if ($method !== 'POST') {
                    return $methodNotAllowed('POST');
                }

                return $controller->pair($request);
            }

            if ($action === 'pull') {
                if ($method !== 'GET') {
                    return $methodNotAllowed('GET');
                }

                return $controller->pull($request);
            }

            if ($action === 'ack') {
                if ($method !== 'POST') {
                    return $methodNotAllowed('POST');
                }

                $commandId = (int)$request->query('id', 0);
                if ($commandId < 1) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Valid command id is required',
                    ], 422);
                }

                return $controller->ack($request, $commandId);
            }

            return response()->json([
                'success' => false,
                'message' => 'Unknown Local POS action',
            ], 404);
        }
    );
} catch (Throwable $error) {
    try {
        logger()->error('PMD Local POS direct gateway failed', [
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
$response->headers->set('X-PMD-Local-POS-Bridge', 'R2.7');
$response->send();
