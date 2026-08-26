<?php

namespace System\Translation\Drivers;

use Igniter\Flame\Translation\Contracts\Driver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD translation database authority.
 *
 * Platform translations live centrally on the mysql connection. When a tenant
 * connection is active, tenant rows are treated as sparse overrides. The merge
 * happens inside one driver so Flame's shallow multi-driver merge cannot drop
 * nested central keys.
 */
class PmdCentralTenantDatabase implements Driver
{
    public function load($locale, $group, $namespace = null)
    {
        $locale = strtolower(trim((string)$locale));
        $group = (string)$group;
        $namespace = $namespace === null ? null : (string)$namespace;

        $central = $this->loadConnection('mysql', $locale, $group, $namespace);

        $defaultConnection = DB::getDefaultConnection();
        if ($defaultConnection === 'mysql') {
            return $central;
        }

        try {
            $centralDatabase = DB::connection('mysql')->getDatabaseName();
            $defaultDatabase = DB::connection($defaultConnection)->getDatabaseName();
            if ($centralDatabase === $defaultDatabase) {
                return $central;
            }
        } catch (\Throwable $exception) {
            return $central;
        }

        $tenant = $this->loadConnection($defaultConnection, $locale, $group, $namespace);

        return array_replace_recursive($central, $tenant);
    }

    protected function loadConnection(string $connection, string $locale, string $group, ?string $namespace): array
    {
        try {
            if (!Schema::connection($connection)->hasTable('language_translations')) {
                return [];
            }

            $database = (string)DB::connection($connection)->getDatabaseName();
            $cacheKey = implode('.', [
                'pmd.translation.database.v1',
                sha1($connection.'|'.$database),
                $locale,
                $namespace ?? '*',
                $group,
            ]);

            return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($connection, $locale, $group, $namespace) {
                $rows = DB::connection($connection)->table('language_translations')
                    ->whereRaw('BINARY locale = ?', [$locale])
                    ->where('group', $group)
                    ->where('namespace', $namespace)
                    ->get(['item', 'text']);

                $lines = [];
                foreach ($rows as $row) {
                    array_set($lines, (string)$row->item, $row->text);
                }

                return $lines;
            });
        } catch (\Throwable $exception) {
            return [];
        }
    }
}
