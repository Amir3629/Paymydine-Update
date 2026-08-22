<?php

namespace App\Http\Middleware;

use App\Services\PmdTenantProductBaselineR1;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_TENANT_RUNTIME_GUARD_R2
 *
 * Runtime bridge for tenant consistency:
 * - keeps the standalone Cashier favicon authoritative;
 * - runs the centralized product baseline on Finance/KDS/Devices when tenant
 *   context is available;
 * - finalizes newly-created Super Admin tenants after the legacy newtenantdb
 *   clone so stale template snapshots cannot omit newer product schema/defaults.
 */
class PmdTenantRuntimeGuardR1
{
    public function handle($request, Closure $next)
    {
        $path = trim((string)$request->path(), '/');
        $tenantReady = $this->tenantContextReady();

        if ($tenantReady && $path === 'admin/pmdfinance') {
            $this->runBaseline(['payments', 'orders']);
        }

        if (
            $tenantReady
            && (
                str_starts_with($path, 'admin/kitchendisplay')
                || str_starts_with($path, 'admin/kds_stations')
                || str_starts_with($path, 'admin/pmddevices')
            )
        ) {
            $this->clearLegacyKdsCache();
            $this->runBaseline(['kds', 'pos', 'payments', 'orders']);
        }

        $response = $next($request);

        if ($path === 'admin/cashierlab') {
            $this->applyStandaloneAdminFavicon($response);
        }

        // The existing SuperAdminController clones a static newtenantdb
        // snapshot. Finalize the successful DB after that clone so every new
        // tenant receives current KDS/POS/payment/table baseline capabilities.
        if ($request->isMethod('post') && $path === 'superadmin/new/store') {
            $this->finalizeCreatedTenant($request, $response);
        }

        return $response;
    }

    protected function runBaseline(array $scopes): void
    {
        try {
            $report = app(PmdTenantProductBaselineR1::class)
                ->repairCurrentTenant($scopes);

            if (!($report['ok'] ?? false)) {
                Log::warning('PMD tenant runtime baseline completed with warnings', [
                    'database' => $report['database'] ?? null,
                    'warnings' => $report['warnings'] ?? [],
                ]);
            }
        } catch (\Throwable $error) {
            Log::error('PMD tenant runtime baseline failed', [
                'host' => request()->getHost(),
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function finalizeCreatedTenant($request, $response): void
    {
        $database = trim((string)$request->input('database', ''));
        if ($database === '') return;

        try {
            $tenant = DB::connection('mysql')
                ->table('tenants')
                ->where('database', $database)
                ->first();

            if (!$tenant) return;

            $report = app(PmdTenantProductBaselineR1::class)
                ->repairTenantRecord($tenant);

            Log::info('PMD new tenant product baseline finalized', [
                'database' => $database,
                'ok' => $report['ok'] ?? false,
                'warnings' => $report['warnings'] ?? [],
                'version' => $report['version'] ?? null,
            ]);
        } catch (\Throwable $error) {
            // Tenant creation response must not be replaced by a baseline
            // diagnostic. Log it; the same baseline is safely re-runnable.
            Log::error('PMD new tenant product baseline finalize failed', [
                'database' => $database,
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function tenantContextReady(): bool
    {
        try {
            return app()->bound('tenant')
                && DB::getDefaultConnection() === 'tenant'
                && trim((string)DB::connection('tenant')->getDatabaseName()) !== '';
        } catch (\Throwable $error) {
            return false;
        }
    }

    protected function clearLegacyKdsCache(): void
    {
        // These historical keys were global. Clear them before KDS/device work;
        // current tenant DB is the only authority for the request that follows.
        foreach ([
            'pmd_kds_stations_table_exists_v82',
            'pmd_kds_all_stations_minimal_v1_1',
            'pmd_kds_visible_status_ids_v12',
            'pmd_kds_status_buttons_minimal_v1',
        ] as $key) {
            try {
                Cache::forget($key);
            } catch (\Throwable $ignored) {
            }
        }
    }

    protected function applyStandaloneAdminFavicon($response): void
    {
        if (
            !is_object($response)
            || !method_exists($response, 'getContent')
            || !method_exists($response, 'setContent')
        ) {
            return;
        }

        $content = (string)$response->getContent();
        if ($content === '' || stripos($content, '</head>') === false) {
            return;
        }

        $favicon = '/app/admin/assets/images/pmd-favicon-final-20260822.svg';
        if (str_contains($content, $favicon)) return;

        $version = 'pmd-cashier-r2';
        $localPath = base_path(ltrim($favicon, '/'));
        if (is_file($localPath)) {
            $version = (string)@filemtime($localPath);
        }

        $link = '<link id="pmd-cashier-standalone-favicon-r2" rel="icon" type="image/svg+xml" href="'
            .$favicon.'?v='.rawurlencode($version).'">';

        $updated = preg_replace('/<\/head>/i', $link."\n</head>", $content, 1);
        if (!is_string($updated) || $updated === $content) return;

        $response->setContent($updated);

        try {
            if (isset($response->headers)) {
                $response->headers->remove('Content-Length');
            }
        } catch (\Throwable $ignored) {
        }
    }
}
