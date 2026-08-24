<?php

/*
|--------------------------------------------------------------------------
| PMD Tenant Media Isolation R1
|--------------------------------------------------------------------------
| Public restaurant media may live on the shared application filesystem, but
| it is never public merely because the filename exists there. A tenant host
| may serve a media filename only when the current tenant database owns a
| reference to it (media_attachments/menu_images/settings logo).
|--------------------------------------------------------------------------
*/

if (!function_exists('pmd_tenant_media_normalize_r1')) {
    function pmd_tenant_media_normalize_r1($path): array
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

if (!function_exists('pmd_tenant_media_value_matches_r1')) {
    function pmd_tenant_media_value_matches_r1($value, string $raw, string $filename): bool
    {
        $value = trim((string)$value);
        if ($value === '') return false;

        $valuePath = parse_url($value, PHP_URL_PATH) ?: $value;
        $valuePath = rawurldecode(str_replace('\\', '/', $valuePath));
        $valuePath = ltrim($valuePath, '/');

        foreach ([
            'api/media/',
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

if (!function_exists('pmd_tenant_media_owned_r1')) {
    function pmd_tenant_media_owned_r1($path): bool
    {
        [$raw, $filename] = pmd_tenant_media_normalize_r1($path);
        if ($raw === '' || $filename === '') return false;

        try {
            $conn = \Illuminate\Support\Facades\DB::connection('tenant');
            $schema = $conn->getSchemaBuilder();

            // Restaurant logo/favicon are tenant settings, not food media rows.
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
                        if (pmd_tenant_media_value_matches_r1($value, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }

            // Canonical TastyIgniter media attachment ownership.
            if ($schema->hasTable('media_attachments')) {
                $columns = $schema->getColumnListing('media_attachments');
                if (in_array('name', $columns, true)) {
                    $rows = $conn->table('media_attachments')
                        ->where(function ($query) use ($raw, $filename) {
                            $query->where('name', $raw)
                                ->orWhere('name', $filename)
                                ->orWhere('name', 'like', '%/'.$filename);
                        })
                        ->limit(10)
                        ->pluck('name');

                    foreach ($rows as $value) {
                        if (pmd_tenant_media_value_matches_r1($value, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }

            // PMD compact menu gallery ownership.
            if ($schema->hasTable('menu_images')) {
                $columns = $schema->getColumnListing('menu_images');
                if (in_array('image_path', $columns, true)) {
                    $rows = $conn->table('menu_images')
                        ->where(function ($query) use ($raw, $filename) {
                            $query->where('image_path', $raw)
                                ->orWhere('image_path', $filename)
                                ->orWhere('image_path', 'like', '%/'.$filename);
                        })
                        ->limit(10)
                        ->pluck('image_path');

                    foreach ($rows as $value) {
                        if (pmd_tenant_media_value_matches_r1($value, $raw, $filename)) {
                            return true;
                        }
                    }
                }
            }
        } catch (\Throwable $error) {
            try {
                \Log::warning('PMD_TENANT_MEDIA_ISOLATION_R1_DENY', [
                    'host' => request()->getHost(),
                    'filename' => $filename,
                    'message' => $error->getMessage(),
                ]);
            } catch (\Throwable $ignored) {
            }
        }

        return false;
    }
}
