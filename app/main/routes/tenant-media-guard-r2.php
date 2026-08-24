<?php

/*
|--------------------------------------------------------------------------
| PMD Tenant Media Isolation R2
|--------------------------------------------------------------------------
| Resolve the tenant from the request host using the central `mysql`
| connection, then inspect media ownership through a dedicated temporary
| connection. This helper never changes the application's default DB
| connection and does not require tenant middleware on legacy media routes.
|--------------------------------------------------------------------------
*/

if (!function_exists('pmd_tenant_media_normalize_r2')) {
    function pmd_tenant_media_normalize_r2($path): array
    {
        $raw = rawurldecode(explode('?', (string)$path)[0]);
        $raw = str_replace('\\', '/', trim($raw));
        $raw = preg_replace('#^/+#', '', $raw);

        if ($raw === '' || strpos($raw, "\0") !== false) {
            return ['', ''];
        }

        foreach (array_values(array_filter(explode('/', $raw), 'strlen')) as $part) {
            if ($part === '.' || $part === '..') {
                return ['', ''];
            }
        }

        $filename = basename($raw);
        if ($filename === '' || $filename === '.' || $filename === '..') {
            return ['', ''];
        }

        return [$raw, $filename];
    }
}

if (!function_exists('pmd_tenant_media_value_matches_r2')) {
    function pmd_tenant_media_value_matches_r2($value, string $raw, string $filename): bool
    {
        $value = trim((string)$value);
        if ($value === '') {
            return false;
        }

        $valuePath = parse_url($value, PHP_URL_PATH) ?: $value;
        $valuePath = rawurldecode(str_replace('\\', '/', $valuePath));
        $valuePath = ltrim($valuePath, '/');

        foreach ([
            'api/media/',
            'api/images/',
            'assets/media/attachments/public/',
            'assets/media/',
            'attachments/public/',
            'uploads/',
            'storage/',
        ] as $prefix) {
            if (strpos($valuePath, $prefix) === 0) {
                $valuePath = substr($valuePath, strlen($prefix));
                break;
            }
        }

        return $valuePath === $raw || basename($valuePath) === $filename;
    }
}

if (!function_exists('pmd_tenant_media_context_r2')) {
    function pmd_tenant_media_context_r2(): ?array
    {
        static $resolved = false;
        static $context = null;

        if ($resolved) {
            return $context;
        }
        $resolved = true;

        try {
            $host = strtolower(trim((string)request()->getHost()));
            if ($host === '') {
                return null;
            }

            $tenant = \Illuminate\Support\Facades\DB::connection('mysql')
                ->table('tenants')
                ->where('domain', $host)
                ->first();

            if (!$tenant) {
                $parts = explode('.', $host);
                $subdomain = count($parts) >= 3 ? (string)$parts[0] : '';
                if ($subdomain !== '') {
                    $tenant = \Illuminate\Support\Facades\DB::connection('mysql')
                        ->table('tenants')
                        ->where('domain', 'like', $subdomain.'.%')
                        ->first();
                }
            }

            if (!$tenant || empty($tenant->database)) {
                return null;
            }

            $connectionName = 'pmd_media_tenant_guard_r2';
            $cfg = (array)config('database.connections.tenant', []);
            if (!$cfg) {
                $cfg = (array)config('database.connections.mysql', []);
            }

            $cfg['database'] = (string)$tenant->database;
            if (!empty($tenant->db_host)) $cfg['host'] = (string)$tenant->db_host;
            if (!empty($tenant->db_port)) $cfg['port'] = (string)$tenant->db_port;
            if (!empty($tenant->db_user)) $cfg['username'] = (string)$tenant->db_user;
            if (property_exists($tenant, 'db_pass') && $tenant->db_pass !== null && $tenant->db_pass !== '') {
                $cfg['password'] = (string)$tenant->db_pass;
            }

            \Illuminate\Support\Facades\Config::set('database.connections.'.$connectionName, $cfg);
            \Illuminate\Support\Facades\DB::purge($connectionName);
            $conn = \Illuminate\Support\Facades\DB::connection($connectionName);
            $conn->getPdo();

            $context = [
                'host' => $host,
                'tenant' => $tenant,
                'connection_name' => $connectionName,
                'connection' => $conn,
            ];
            return $context;
        } catch (\Throwable $error) {
            try {
                \Log::warning('PMD_TENANT_MEDIA_R2_CONTEXT_DENY', [
                    'host' => request()->getHost(),
                    'message' => $error->getMessage(),
                ]);
            } catch (\Throwable $ignored) {
            }
            return null;
        }
    }
}

if (!function_exists('pmd_tenant_media_owned_r2')) {
    function pmd_tenant_media_owned_r2($path): bool
    {
        [$raw, $filename] = pmd_tenant_media_normalize_r2($path);
        if ($raw === '' || $filename === '') {
            return false;
        }

        $context = pmd_tenant_media_context_r2();
        if (!$context || empty($context['connection'])) {
            return false;
        }

        try {
            $conn = $context['connection'];
            $schema = $conn->getSchemaBuilder();

            if ($schema->hasTable('settings')) {
                $columns = $schema->getColumnListing('settings');
                $keyColumn = in_array('item', $columns, true)
                    ? 'item'
                    : (in_array('key', $columns, true) ? 'key' : null);
                $valueColumn = in_array('value', $columns, true)
                    ? 'value'
                    : (in_array('data', $columns, true) ? 'data' : null);

                if ($keyColumn && $valueColumn) {
                    $values = $conn->table('settings')
                        ->whereIn($keyColumn, [
                            'site_logo',
                            'favicon_logo',
                            'pmd_restaurant_identity_logo',
                        ])
                        ->pluck($valueColumn);

                    foreach ($values as $value) {
                        if (pmd_tenant_media_value_matches_r2($value, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }

            if ($schema->hasTable('media_attachments')) {
                $columns = $schema->getColumnListing('media_attachments');
                if (in_array('name', $columns, true)) {
                    $rows = $conn->table('media_attachments')
                        ->where(function ($query) use ($raw, $filename) {
                            $query->where('name', $raw)
                                ->orWhere('name', $filename)
                                ->orWhere('name', 'like', '%/'.$filename);
                        })
                        ->limit(20)
                        ->pluck('name');

                    foreach ($rows as $value) {
                        if (pmd_tenant_media_value_matches_r2($value, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }

            if ($schema->hasTable('menu_images')) {
                $columns = $schema->getColumnListing('menu_images');
                if (in_array('image_path', $columns, true)) {
                    $rows = $conn->table('menu_images')
                        ->where(function ($query) use ($raw, $filename) {
                            $query->where('image_path', $raw)
                                ->orWhere('image_path', $filename)
                                ->orWhere('image_path', 'like', '%/'.$filename);
                        })
                        ->limit(20)
                        ->pluck('image_path');

                    foreach ($rows as $value) {
                        if (pmd_tenant_media_value_matches_r2($value, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }
        } catch (\Throwable $error) {
            try {
                \Log::warning('PMD_TENANT_MEDIA_R2_OWNERSHIP_DENY', [
                    'host' => $context['host'] ?? request()->getHost(),
                    'filename' => $filename,
                    'message' => $error->getMessage(),
                ]);
            } catch (\Throwable $ignored) {
            }
        }

        return false;
    }
}
