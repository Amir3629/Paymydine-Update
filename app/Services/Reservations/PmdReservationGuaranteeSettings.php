<?php

namespace App\Services\Reservations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Single tenant-aware settings reader for reservation guarantee policy.
 *
 * Finance persists these values directly into the active tenant settings table.
 * Public /book requests must read from the same tenant authority rather than
 * relying only on the generic setting() helper, which may resolve a different
 * connection/cache in multi-tenant runtime.
 */
final class PmdReservationGuaranteeSettings
{
    public function get(string $key, $default = null)
    {
        try {
            $connection = $this->connection();

            if (Schema::connection($connection)->hasTable('settings')) {
                $columns = Schema::connection($connection)->getColumnListing('settings');
                $keyColumn = in_array('item', $columns, true)
                    ? 'item'
                    : (in_array('key', $columns, true) ? 'key' : null);
                $valueColumn = in_array('value', $columns, true)
                    ? 'value'
                    : (in_array('data', $columns, true) ? 'data' : null);

                if ($keyColumn && $valueColumn) {
                    $query = DB::connection($connection)
                        ->table('settings')
                        ->where($keyColumn, $key);

                    if (in_array('sort', $columns, true)) {
                        $query->where('sort', 'config');
                    }

                    $row = $query->first([$valueColumn]);

                    if ($row && property_exists($row, $valueColumn)) {
                        return $row->{$valueColumn};
                    }
                }
            }
        } catch (Throwable $error) {
            logger()->warning('PMD reservation guarantee tenant setting read failed', [
                'key' => $key,
                'message' => $error->getMessage(),
            ]);
        }

        try {
            return setting($key, $default);
        } catch (Throwable $error) {
            return $default;
        }
    }

    public function string(string $key, string $default = ''): string
    {
        $value = $this->get($key, $default);

        return is_scalar($value) || $value === null
            ? (string)$value
            : $default;
    }

    public function int(string $key, int $default = 0): int
    {
        $value = $this->get($key, $default);

        return is_scalar($value) || $value === null
            ? (int)$value
            : $default;
    }

    public function bool(string $key, bool $default = false): bool
    {
        $value = $this->get($key, $default ? 1 : 0);

        if (is_bool($value)) {
            return $value;
        }

        return in_array(
            strtolower(trim((string)$value)),
            ['1', 'true', 'yes', 'on'],
            true
        );
    }

    private function connection(): string
    {
        return app()->bound('tenant')
            ? 'tenant'
            : DB::getDefaultConnection();
    }
}
