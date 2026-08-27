<?php

namespace App\Http\Middleware;

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\SuperAdminTenantMarketService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_SUPERADMIN_COUNTRY_PROFILE_MIDDLEWARE_R2
 *
 * Makes /superadmin/new Country a real provisioning input instead of a label.
 * The canonical country is written centrally by the existing controller, then
 * this middleware applies the matching platform profile inside the tenant DB.
 */
final class ApplySuperAdminTenantCountryProfile
{
    public function handle(Request $request, Closure $next)
    {
        $profiles = new CountryPlatformProfileRegistry();
        $countryInput = trim((string)$request->input('country', ''));
        $profile = $profiles->profile($countryInput);

        if (!$profile) {
            return redirect('/superadmin/new')
                ->withErrors(['country' => 'Choose a supported PayMyDine country profile.'])
                ->withInput();
        }

        // Existing controllers persist the human-readable central tenants.country.
        $request->merge(['country' => (string)$profile['country_name']]);

        $response = $next($request);

        // Critical safety gate: create/update validation failures use withErrors().
        // Never resolve by submitted DB/domain after that, because a duplicate input
        // could point at an EXISTING tenant and accidentally change its market.
        if (session()->has('errors')) {
            return $response;
        }

        try {
            $tenant = $this->resolvePersistedTenant($request);
            if (!$tenant) return $response;

            DB::connection('mysql')->table('tenants')->where('id', $tenant->id)->update([
                'country' => (string)$profile['country_name'],
                'updated_at' => now(),
            ]);
            $tenant->country = (string)$profile['country_name'];

            $result = (new SuperAdminTenantMarketService())->applyToTenant($tenant, (string)$profile['country_code']);

            $warningCount = count((array)($result['warnings'] ?? []));
            if ($warningCount > 0) {
                session()->flash(
                    'warning',
                    $profile['country_name'].' profile applied with '.$warningCount.' readiness warning(s). Check language/provider readiness before launch.'
                );
            }

            Log::info('PMD_SUPERADMIN_COUNTRY_PROFILE_APPLIED', [
                'tenant_id' => (int)$tenant->id,
                'database' => (string)$tenant->database,
                'country_code' => (string)$profile['country_code'],
                'foundation' => (array)($result['foundation'] ?? []),
                'warnings' => (array)($result['warnings'] ?? []),
            ]);
        } catch (\Throwable $error) {
            Log::error('PMD_SUPERADMIN_COUNTRY_PROFILE_FAILED', [
                'country' => (string)$profile['country_code'],
                'id' => $request->input('id'),
                'database' => $request->input('database'),
                'error' => $error->getMessage(),
            ]);

            session()->flash(
                'warning',
                'Restaurant data was saved, but its regional platform profile needs attention: '.$error->getMessage()
            );
        }

        return $response;
    }

    private function resolvePersistedTenant(Request $request)
    {
        // Update path: controller validation succeeded, so this ID was persisted.
        if ($request->filled('id')) {
            return DB::connection('mysql')->table('tenants')->where('id', (int)$request->input('id'))->first();
        }

        // Create path: lifecycle owns database uniqueness. Only resolve the exact
        // canonical DB name after successful controller execution.
        $database = trim(str_replace([' ', '-'], '_', (string)$request->input('database', '')));
        if ($database === '') return null;

        return DB::connection('mysql')->table('tenants')->where('database', $database)->first();
    }
}
