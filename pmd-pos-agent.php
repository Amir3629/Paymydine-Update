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
