<?php

namespace App\Http\Middleware;

use App\Services\PmdTenantMenuBaselineR25;
use App\Services\PmdTenantProductBaselineR1;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_TENANT_RUNTIME_GUARD_R25
 *
 * Runtime bridge for tenant consistency:
 * - keeps the standalone Cashier favicon authoritative;
 * - runs centralized Finance/KDS/Devices product baseline work;
 * - runs the Menu baseline before Menu/Category/Combo routes;
 * - requires every Menu food save to own at least one real regular category;
 * - finalizes newly-created Super Admin tenants after the legacy newtenantdb
 *   clone so stale template snapshots cannot omit current product schema.
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

        if ($tenantReady && $this->isMenuProductPath($path)) {
            $this->runMenuBaseline();
        }

        if (
            $tenantReady
            && $path === 'admin/menus'
            && $request->isMethod('post')
            && $this->requestHandler($request) === 'onPmdMenuManagerSaveV1'
        ) {
            if ($invalid = $this->validateFoodCategoryMembership($request)) {
                return $invalid;
            }
        }

        $response = $next($request);

        if ($path === 'admin/cashierlab') {
            $this->applyStandaloneAdminFavicon($response);
        }

        // The existing SuperAdminController clones a static newtenantdb
        // snapshot. Finalize the successful DB after that clone so every new
        // tenant receives both infrastructure and current Menu capabilities.
        if ($request->isMethod('post') && $path === 'superadmin/new/store') {
            $this->finalizeCreatedTenant($request, $response);
        }

        return $response;
    }

    protected function isMenuProductPath(string $path): bool
    {
        return in_array($path, [
            'admin/pmdmenus',
            'admin/pmdsmartcategories',
            'admin/menus',
            'admin/combos',
        ], true);
    }

    protected function requestHandler($request): string
    {
        return trim((string)(
            $request->header('X-IGNITER-REQUEST-HANDLER')
            ?: $request->input('_handler', '')
        ));
    }

    protected function validateFoodCategoryMembership($request)
    {
        $categoryIds = array_values(array_unique(array_filter(array_map(
            static fn ($value): int => (int)$value,
            (array)$request->input('category_ids', [])
        ), static fn (int $value): bool => $value > 0)));

        if (!$categoryIds) {
            $legacyCategoryId = (int)$request->input('category_id', 0);
            if ($legacyCategoryId > 0) {
                $categoryIds = [$legacyCategoryId];
            }
        }

        if (!$categoryIds) {
            return response()->json([
                'ok' => false,
                'message' => 'Choose at least one menu category before saving this food.',
                'errors' => [
                    'category_ids' => ['A menu category is required.'],
                ],
            ], 422);
        }

        try {
            $schema = DB::connection()->getSchemaBuilder();

            if (!$schema->hasTable('categories')) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Menu categories are not ready on this restaurant yet.',
                ], 422);
            }

            $query = DB::table('categories')
                ->whereIn('category_id', $categoryIds);

            if ($schema->hasColumn('categories', 'status')) {
                $query->where('status', 1);
            }

            // All Foods is not a stored category. Chef/Bestseller/Combination
            // categories are smart views and must not own normal food membership.
            if ($schema->hasColumn('categories', 'pmd_kind')) {
                $query->where(function ($builder) {
                    $builder
                        ->where('pmd_kind', 'regular')
                        ->orWhereNull('pmd_kind')
                        ->orWhere('pmd_kind', '');
                });
            }

            $validIds = $query
                ->pluck('category_id')
                ->map(static fn ($id): int => (int)$id)
                ->all();

            sort($validIds);
            $expectedIds = $categoryIds;
            sort($expectedIds);

            if ($validIds !== $expectedIds) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Choose at least one active menu category. All Foods is only a view.',
                    'errors' => [
                        'category_ids' => ['One or more selected categories cannot own food items.'],
                    ],
                ], 422);
            }
        } catch (\Throwable $error) {
            Log::warning('PMD Menu category validation failed', [
                'host' => request()->getHost(),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Menu categories could not be validated. Please try again.',
            ], 422);
        }

        return null;
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

    protected function runMenuBaseline(): void
    {
        try {
            $report = app(PmdTenantMenuBaselineR25::class)
                ->repairCurrentTenant();

            if (!($report['ok'] ?? false)) {
                Log::warning('PMD tenant Menu baseline completed with warnings', [
                    'database' => $report['database'] ?? null,
                    'warnings' => $report['warnings'] ?? [],
                ]);
            }
        } catch (\Throwable $error) {
            Log::error('PMD tenant Menu baseline failed', [
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

            try {
                $report = app(PmdTenantProductBaselineR1::class)
                    ->repairTenantRecord($tenant);

                Log::info('PMD new tenant product baseline finalized', [
                    'database' => $database,
                    'ok' => $report['ok'] ?? false,
                    'warnings' => $report['warnings'] ?? [],
                    'version' => $report['version'] ?? null,
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD new tenant product baseline finalize failed', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            }

            try {
                $menuReport = app(PmdTenantMenuBaselineR25::class)
                    ->repairTenantRecord($tenant);

                Log::info('PMD new tenant Menu baseline finalized', [
                    'database' => $database,
                    'ok' => $menuReport['ok'] ?? false,
                    'warnings' => $menuReport['warnings'] ?? [],
                    'version' => $menuReport['version'] ?? null,
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD new tenant Menu baseline finalize failed', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            }
        } catch (\Throwable $error) {
            // Tenant creation response must not be replaced by a baseline
            // diagnostic. Both baselines are safely re-runnable.
            Log::error('PMD new tenant baseline lookup failed', [
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
