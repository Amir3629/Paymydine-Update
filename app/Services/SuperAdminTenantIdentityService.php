<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SuperAdminTenantIdentityService
{
    public const DEFAULT_LOGO_PATH = '/brand/paymydine-logo.svg';

    public function apply(string $database, string $domain): array
    {
        $database = trim($database);
        $domain = strtolower(trim($domain));

        if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $database)) {
            throw new \InvalidArgumentException('Unsafe tenant database identifier.');
        }
        if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)) {
            throw new \InvalidArgumentException('Invalid PayMyDine tenant domain.');
        }

        $centralDatabase = (string)Config::get('database.connections.mysql.database');
        $domainLabel = explode('.', $domain)[0] ?? '';
        $displayName = $domainLabel !== '' ? $domainLabel : 'PayMyDine';
        $logoUrl = 'https://'.$domain.self::DEFAULT_LOGO_PATH;

        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');

            // Keep the framework settings authority and the physical settings
            // table in agreement. The second direct write deliberately runs
            // after setting()->save() so no stale template/cache value can put
            // TastyIgniter back into a freshly-created tenant.
            try {
                setting()->set([
                    'site_name' => $displayName,
                    'site_logo' => $logoUrl,
                ]);
                setting()->save();
            } catch (\Throwable $error) {
                Log::warning('pmd_superadmin_r2_identity_setting_manager_warning', [
                    'database' => $database,
                    'domain' => $domain,
                    'error' => $error->getMessage(),
                ]);
            }

            $this->writeSetting('site_name', $displayName);
            $this->writeSetting('site_logo', $logoUrl);

            if (
                Schema::connection('mysql')->hasTable('locations')
                && Schema::connection('mysql')->hasColumn('locations', 'location_name')
            ) {
                $location = DB::connection('mysql')->table('locations')->orderBy('location_id')->first();
                if ($location) {
                    $update = ['location_name' => $displayName];
                    if (Schema::connection('mysql')->hasColumn('locations', 'permalink_slug')) {
                        $update['permalink_slug'] = Str::slug($domainLabel);
                    }
                    DB::connection('mysql')->table('locations')
                        ->where('location_id', $location->location_id)
                        ->update($update);
                }
            }

            return [
                'name' => $displayName,
                'logo' => $logoUrl,
                'database' => $database,
                'domain' => $domain,
            ];
        } finally {
            Config::set('database.connections.mysql.database', $centralDatabase);
            DB::purge('mysql');
            DB::reconnect('mysql');
        }
    }

    private function writeSetting(string $key, string $value): void
    {
        if (!Schema::connection('mysql')->hasTable('settings')) {
            throw new \RuntimeException('Tenant settings table is missing.');
        }

        $query = DB::connection('mysql')->table('settings')->where('item', $key);
        if ($query->exists()) {
            $query->update(['value' => $value]);
            return;
        }

        // Most TastyIgniter settings schemas allow item/value insertion. If an
        // older schema has additional required columns, setting()->save() above
        // remains the insertion authority and this branch will simply surface a
        // precise error instead of silently leaving the tenant with defaults.
        DB::connection('mysql')->table('settings')->insert([
            'item' => $key,
            'value' => $value,
        ]);
    }
}
