<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdKitchenWorkforceService;
use Closure;
use Illuminate\Http\Request;

/**
 * Adds the Kitchen Operations R1 presentation layer only to current PMD HTML
 * surfaces. It does not replace or intercept existing KDS/Cashier actions.
 */
class PmdKitchenOperationsUiMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (!in_array(strtoupper((string)$request->method()), ['GET', 'HEAD'], true)) return $response;
        if (!method_exists($response, 'getContent') || !method_exists($response, 'setContent')) return $response;
        if (method_exists($response, 'getStatusCode') && (int)$response->getStatusCode() !== 200) return $response;

        $contentType = strtolower((string)$response->headers->get('Content-Type', ''));
        if ($contentType !== '' && strpos($contentType, 'text/html') === false) return $response;

        $path = strtolower(trim((string)$request->path(), '/'));
        if (!$this->isTargetPath($path)) return $response;

        $html = (string)$response->getContent();
        if ($html === '' || stripos($html, '</head>') === false) return $response;
        if (strpos($html, 'pmd-kitchen-operations-ui-v1.js') !== false) return $response;

        $bootstrap = $this->dashboardBootstrap($path);
        $bootstrapScript = $bootstrap
            ? '<script>window.PMDKitchenOperationsR1='.json_encode($bootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).';</script>'
            : '';

        $assets = '<link rel="stylesheet" href="/app/admin/assets/css/pmd-kitchen-operations-ui-v1.css">'
            .$bootstrapScript
            .'<script defer src="/app/admin/assets/js/pmd-kitchen-operations-ui-v1.js"></script>';

        $response->setContent(preg_replace('/<\/head>/i', $assets.'</head>', $html, 1));
        return $response;
    }

    protected function isTargetPath(string $path): bool
    {
        if (in_array($path, [
            'admin/ownerdashboard', 'admin/dashboardlab',
            'admin/managerdashboard', 'admin/managerlab',
            'admin/orders', 'admin/cashierlab',
            'admin/menu', 'admin/pmdmenus',
            'admin/settings/advanced', 'admin/pmdadvanced',
        ], true)) return true;

        return str_starts_with($path, 'admin/kitchendisplay/');
    }

    protected function dashboardBootstrap(string $path): ?array
    {
        if (!in_array($path, ['admin/ownerdashboard', 'admin/dashboardlab', 'admin/managerdashboard', 'admin/managerlab'], true)) return null;

        try {
            $user = AdminAuth::getUser();
            if (!$user) return null;
            $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($user);
            if (!in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) return null;
            $locationId = max(1, (int)AdminLocation::getId());
            $today = app(PmdKitchenWorkforceService::class)->todayCard($locationId);
            $snapshot = $today['snapshot'] ?? [];
            $people = collect($today['people'] ?? [])->map(function ($person) {
                return [
                    'name' => (string)($person['name'] ?? ''),
                    'job_role' => (string)($person['job_role'] ?? ''),
                    'attendance_status' => (string)($person['attendance_status'] ?? 'planned'),
                ];
            })->values()->all();

            return [
                'today' => [
                    'ready' => (bool)($today['ready'] ?? false),
                    'confirmed' => (bool)($snapshot['confirmed'] ?? false),
                    'needs_confirmation' => (bool)($today['needs_confirmation'] ?? true),
                    'source' => (string)($snapshot['source'] ?? 'unknown'),
                    'shift_label' => (string)($snapshot['shift_label'] ?? ''),
                    'expected_count' => $snapshot['expected_count'] ?? null,
                    'actual_count' => $snapshot['actual_count'] ?? null,
                    'missing_count' => (int)($snapshot['missing_count'] ?? 0),
                    'has_plan' => (bool)($snapshot['has_plan'] ?? false),
                    'people' => $people,
                ],
                'shifts_url' => admin_url('shifts'),
            ];
        } catch (\Throwable $error) {
            \Log::warning('PMD_KITCHEN_DASHBOARD_BOOTSTRAP_FAILED', ['message' => $error->getMessage()]);
            return null;
        }
    }
}
