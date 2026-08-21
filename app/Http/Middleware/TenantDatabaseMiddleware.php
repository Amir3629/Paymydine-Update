<?php

namespace App\Http\Middleware;

use App\Services\Financial\BillingGroupService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class TenantDatabaseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $subdomain = $this->extractTenantFromDomain($request);

        if (!$subdomain) {
            return response()->json(['error' => 'Invalid domain'], 400);
        }

        $tenantInfo = DB::connection('mysql')->table('tenants')
            ->where('domain', $subdomain . '.paymydine.com')
            ->where('status', 'active')
            ->first();

        if (!$tenantInfo || empty($tenantInfo->database)) {
            return response()->json(['error' => 'Restaurant not found or inactive'], 404);
        }

        Config::set('database.connections.tenant.database', $tenantInfo->database);
        Config::set('database.connections.tenant.host', $tenantInfo->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', $tenantInfo->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
        Config::set('database.connections.tenant.username', $tenantInfo->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenantInfo->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));

        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');

        $request->attributes->set('tenant', $tenantInfo);
        app()->instance('tenant', $tenantInfo);

        Log::info('[TenantDatabaseMiddleware] switched tenant connection', [
            'host' => $request->getHost(),
            'subdomain' => $subdomain,
            'tenant_domain' => $tenantInfo->domain ?? null,
            'tenant_db' => $tenantInfo->database ?? null,
        ]);

        // PMD_R36_CHILD_SETTLEMENT_GUARD
        // A new Final Bill can only settle through its Billing Group payment ID.
        // Keep /orders/pay-existing available for legacy_passthrough/non-R36 visits.
        if ($request->isMethod('post')
            && str_ends_with(trim($request->path(), '/'), 'orders/pay-existing')
            && BillingGroupService::schemaReady()) {
            $orderId = (int)$request->input('order_id', 0);
            if ($orderId > 0) {
                $link = DB::table('pmd_billing_group_orders')->where('order_id', $orderId)->first();
                if ($link) {
                    $group = DB::table('pmd_billing_groups')->where('id', (int)$link->billing_group_id)->first();
                    if ($group && (string)$group->mode === 'r36') {
                        return response()->json([
                            'success' => false,
                            'error' => 'This order belongs to an R36 Final Bill. Use the Billing Group payment reservation/settlement authority.',
                            'billing_group_public_id' => (string)$group->public_id,
                        ], 409);
                    }
                }
            }
        }

        $response = $next($request);

        // PMD_PAY_EXISTING_CANONICAL_PERSISTENCE_V2
        // Run while the tenant connection is certainly active. The canonical
        // middleware is idempotent, so its outer web-group pass becomes a no-op.
        if ($request->isMethod('post') && str_ends_with(trim($request->path(), '/'), 'orders/pay-existing')) {
            app(PmdCanonicalPayExistingPersistence::class)
                ->persistSuccessfulResponse($request, $response);
        }

        return $response;
    }

    private function extractTenantFromDomain(Request $request): ?string
    {
        $hostname = $request->getHost();
        if (!$hostname) {
            return null;
        }

        $parts = explode('.', $hostname);

        if (count($parts) >= 3 && $parts[1] === 'paymydine') {
            return $parts[0];
        }

        if (count($parts) >= 2 && $parts[0] !== 'www') {
            return $parts[0];
        }

        return null;
    }
}