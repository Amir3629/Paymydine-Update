<?php

/*
|--------------------------------------------------------------------------
| PMD Tenant Media Ownership R3
|--------------------------------------------------------------------------
| Shared filesystem bytes are not tenant-owned merely because they exist.
| Resolve the tenant from the request host, open a dedicated tenant DB
| connection, and allow media only when that tenant DB references the file.
|
| IMPORTANT: this helper never changes database.default and never adds or
| invokes tenant middleware on legacy media routes.
|--------------------------------------------------------------------------
*/

if (!function_exists('pmd_media_r3_normalize')) {
    function pmd_media_r3_normalize($value): array
    {
        $raw = rawurldecode(explode('?', (string)$value)[0]);
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

if (!function_exists('pmd_media_r3_value_matches')) {
    function pmd_media_r3_value_matches($value, string $raw, string $filename): bool
    {
        $value = trim((string)$value);
        if ($value === '') {
            return false;
        }

        $path = parse_url($value, PHP_URL_PATH) ?: $value;
        $path = rawurldecode(str_replace('\\', '/', $path));
        $path = ltrim($path, '/');

        foreach ([
            'api/media/',
            'api/v1/frontend-media-v2/',
            'assets/media/attachments/public/',
            'assets/media/',
            'attachments/public/',
            'uploads/',
            'storage/',
        ] as $prefix) {
            if (strpos($path, $prefix) === 0) {
                $path = substr($path, strlen($prefix));
                break;
            }
        }

        return $path === $raw || basename($path) === $filename;
    }
}

if (!function_exists('pmd_media_r3_context')) {
    function pmd_media_r3_context(): ?array
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

            $central = \Illuminate\Support\Facades\DB::connection('mysql');
            $tenant = $central->table('tenants')->where('domain', $host)->first();

            if (!$tenant) {
                $parts = explode('.', $host);
                $label = count($parts) >= 3 ? trim((string)$parts[0]) : '';
                if ($label !== '') {
                    $tenant = $central->table('tenants')
                        ->where('domain', 'like', $label.'.%')
                        ->first();
                }
            }

            if (!$tenant || empty($tenant->database)) {
                return null;
            }

            $name = 'pmd_media_owner_r3_'.substr(sha1($host), 0, 12);
            $config = (array)config('database.connections.tenant', []);
            if (!$config) {
                $config = (array)config('database.connections.mysql', []);
            }

            $config['database'] = (string)$tenant->database;
            if (!empty($tenant->db_host)) $config['host'] = (string)$tenant->db_host;
            if (!empty($tenant->db_port)) $config['port'] = (string)$tenant->db_port;
            if (!empty($tenant->db_user)) $config['username'] = (string)$tenant->db_user;
            if (property_exists($tenant, 'db_pass') && $tenant->db_pass !== null && $tenant->db_pass !== '') {
                $config['password'] = (string)$tenant->db_pass;
            }

            \Illuminate\Support\Facades\Config::set('database.connections.'.$name, $config);
            \Illuminate\Support\Facades\DB::purge($name);
            $connection = \Illuminate\Support\Facades\DB::connection($name);
            $connection->getPdo();

            $context = [
                'host' => $host,
                'tenant' => $tenant,
                'connection' => $connection,
            ];

            return $context;
        } catch (\Throwable $error) {
            try {
                \Log::warning('PMD_MEDIA_R3_CONTEXT_DENY', [
                    'host' => request()->getHost(),
                    'message' => $error->getMessage(),
                ]);
            } catch (\Throwable $ignored) {
            }
            return null;
        }
    }
}

if (!function_exists('pmd_media_owned_by_request_tenant_r3')) {
    function pmd_media_owned_by_request_tenant_r3($value): bool
    {
        [$raw, $filename] = pmd_media_r3_normalize($value);
        if ($raw === '' || $filename === '') {
            return false;
        }

        $context = pmd_media_r3_context();
        if (!$context || empty($context['connection'])) {
            return false;
        }

        try {
            $conn = $context['connection'];
            $schema = $conn->getSchemaBuilder();

            // Any canonical Media Library row in this tenant may own the bytes.
            if ($schema->hasTable('media_attachments')) {
                $columns = $schema->getColumnListing('media_attachments');
                $query = $conn->table('media_attachments');

                $query->where(function ($q) use ($columns, $raw, $filename) {
                    $hasClause = false;
                    if (in_array('name', $columns, true)) {
                        $q->where('name', $raw)
                            ->orWhere('name', $filename)
                            ->orWhere('name', 'like', '%/'.$filename);
                        $hasClause = true;
                    }
                    if (in_array('file_name', $columns, true)) {
                        if ($hasClause) {
                            $q->orWhere('file_name', $raw)
                                ->orWhere('file_name', $filename)
                                ->orWhere('file_name', 'like', '%/'.$filename);
                        } else {
                            $q->where('file_name', $raw)
                                ->orWhere('file_name', $filename)
                                ->orWhere('file_name', 'like', '%/'.$filename);
                        }
                    }
                });

                $rows = $query->limit(25)->get();
                foreach ($rows as $row) {
                    foreach (['name', 'file_name'] as $column) {
                        if (isset($row->{$column}) && pmd_media_r3_value_matches($row->{$column}, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }

            // PMD compact gallery rows are also tenant business data.
            if ($schema->hasTable('menu_images') && $schema->hasColumn('menu_images', 'image_path')) {
                $rows = $conn->table('menu_images')
                    ->where(function ($q) use ($raw, $filename) {
                        $q->where('image_path', $raw)
                            ->orWhere('image_path', $filename)
                            ->orWhere('image_path', 'like', '%/'.$filename);
                    })
                    ->limit(25)
                    ->pluck('image_path');

                foreach ($rows as $row) {
                    if (pmd_media_r3_value_matches($row, $raw, $filename)) {
                        return true;
                    }
                }
            }

            // Restaurant-uploaded logos/favicon may be setting-backed.
            if ($schema->hasTable('settings')) {
                $columns = $schema->getColumnListing('settings');
                $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
                $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);

                if ($keyColumn && $valueColumn) {
                    $values = $conn->table('settings')
                        ->whereIn($keyColumn, [
                            'site_logo',
                            'favicon_logo',
                            'pmd_restaurant_identity_logo',
                        ])
                        ->pluck($valueColumn);

                    foreach ($values as $row) {
                        if (pmd_media_r3_value_matches($row, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }
        } catch (\Throwable $error) {
            try {
                \Log::warning('PMD_MEDIA_R3_OWNERSHIP_DENY', [
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
