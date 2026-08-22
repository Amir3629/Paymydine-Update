<?php

namespace App\Http\Middleware;

use App\Services\SuperAdminTenantIdentityService;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SuperAdminTenantIdentityBaseline
{
    public function handle($request, Closure $next)
    {
        $response = $next($request);

        if (!$request->isMethod('post') || trim($request->path(), '/') !== 'superadmin/new/store') {
            return $response;
        }

        $domain = $this->normalizeDomain((string)$request->input('domain', ''));
        if ($domain === '') return $response;

        $tenant = DB::connection('mysql')->table('tenants')
            ->whereRaw('LOWER(domain) = ?', [$domain])
            ->orderByDesc('id')
            ->first();

        if (!$tenant || empty($tenant->database)) return $response;

        try {
            $identity = app(SuperAdminTenantIdentityService::class)->apply(
                (string)$tenant->database,
                $domain
            );

            Log::info('PMD new tenant identity baseline applied', $identity);
        } catch (\Throwable $error) {
            Log::error('PMD new tenant identity baseline failed', [
                'tenant_id' => $tenant->id ?? null,
                'database' => $tenant->database ?? null,
                'domain' => $domain,
                'error' => $error->getMessage(),
            ]);

            // Identity/logo are part of readiness. Do not leave the tenant
            // marked active if the canonical baseline could not be persisted.
            DB::connection('mysql')->table('tenants')
                ->where('id', $tenant->id)
                ->update(['status' => 'disabled', 'updated_at' => now()]);

            return redirect('/superadmin/new')->with(
                'warning',
                'Restaurant infrastructure was created, but the default restaurant identity could not be finalized. The tenant was left disabled.'
            );
        }

        return $response;
    }

    private function normalizeDomain(string $input): string
    {
        $domain = strtolower(trim($input));
        if ($domain === '') return '';

        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $domain)) {
            $host = parse_url($domain, PHP_URL_HOST);
            $domain = is_string($host) ? strtolower(trim($host)) : '';
        } else {
            $domain = preg_replace('~[/?#].*$~', '', $domain) ?? '';
            $domain = preg_replace('/:\d+$/', '', $domain) ?? '';
        }

        $domain = rtrim(trim($domain), '.');
        if ($domain !== '' && !str_contains($domain, '.')) {
            $domain .= '.paymydine.com';
        }

        return preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain) ? $domain : '';
    }
}
