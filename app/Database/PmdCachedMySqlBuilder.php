<?php

namespace App\Database;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\MySqlBuilder;

/**
 * PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA
 *
 * Request-local metadata cache for the active tenant database.
 *
 * R16 proved that replacing many tiny metadata probes with one full
 * information_schema.COLUMNS catalogue was the wrong trade-off on production:
 * that full catalogue can run during Admin bootstrap, before the live profiler
 * middleware starts, and turn otherwise ~200ms requests into multi-second
 * requests.
 *
 * R17 keeps request-wide sharing across multiple schema builder instances but
 * uses cheap MySQL primitives:
 * - SHOW FULL TABLES once per tenant/request
 * - SHOW COLUMNS lazily once per table/request
 *
 * Nothing is cached across requests or tenants.
 */
class PmdCachedMySqlBuilder extends MySqlBuilder
{
    private array $pmdTableExists = [];
    private array $pmdColumns = [];
    private ?\ArrayObject $pmdSharedStore = null;
    private ?string $pmdSharedStoreKey = null;

    public function hasTable($table)
    {
        $store = $this->pmdSharedStore();
        $keys = $this->pmdTableKeys($table);

        if ($store !== null) {
            if (!(bool)($store['tables_loaded'] ?? false)) {
                try {
                    $rows = $this->connection->select(
                        "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'"
                    );

                    $tables = [];
                    $prefix = strtolower(
                        (string)$this->connection->getTablePrefix()
                    );

                    foreach ($rows as $row) {
                        $values = array_values((array)$row);
                        $physical = strtolower(
                            trim((string)($values[0] ?? ''))
                        );

                        if ($physical === '') {
                            continue;
                        }

                        $tables[$physical] = true;

                        if (
                            $prefix !== ''
                            && strncmp(
                                $physical,
                                $prefix,
                                strlen($prefix)
                            ) === 0
                        ) {
                            $logical = substr(
                                $physical,
                                strlen($prefix)
                            );

                            if ($logical !== '') {
                                $tables[$logical] = true;
                            }
                        }
                    }

                    $store['tables'] = $tables;
                    $store['tables_loaded'] = true;
                } catch (\Throwable $e) {
                    $store['tables_failed'] = true;
                }
            }

            if (!(bool)($store['tables_failed'] ?? false)) {
                $tables = (array)($store['tables'] ?? []);

                foreach ($keys as $key) {
                    if (isset($tables[$key])) {
                        return true;
                    }
                }

                return false;
            }
        }

        $key = $keys[0] ?? strtolower((string)$table);

        if (!array_key_exists($key, $this->pmdTableExists)) {
            $this->pmdTableExists[$key] = parent::hasTable($table);
        }

        return $this->pmdTableExists[$key];
    }

    public function getColumnListing($table)
    {
        $keys = $this->pmdTableKeys($table);
        $store = $this->pmdSharedStore();

        if ($store !== null) {
            $columns = (array)($store['columns'] ?? []);

            foreach ($keys as $key) {
                if (array_key_exists($key, $columns)) {
                    return $columns[$key];
                }
            }

            try {
                $physical = $this->pmdPhysicalTableName($table);

                if ($physical !== '') {
                    $quoted = '`'.str_replace('`', '``', $physical).'`';
                    $rows = $this->connection->select(
                        'SHOW COLUMNS FROM '.$quoted
                    );

                    $listing = [];

                    foreach ($rows as $row) {
                        $field = trim(
                            (string)($row->Field ?? $row->field ?? '')
                        );

                        if ($field !== '') {
                            $listing[] = $field;
                        }
                    }

                    foreach ($keys as $key) {
                        $columns[$key] = $listing;
                    }

                    $store['columns'] = $columns;

                    return $listing;
                }
            } catch (\Throwable $e) {
                // Fall back to Laravel's builder below.
            }
        }

        $key = $keys[0] ?? strtolower((string)$table);

        if (!array_key_exists($key, $this->pmdColumns)) {
            $this->pmdColumns[$key] = parent::getColumnListing($table);
        }

        return $this->pmdColumns[$key];
    }

    public function flushPmdMetadataCache(): void
    {
        $this->pmdTableExists = [];
        $this->pmdColumns = [];

        if ($this->pmdSharedStore !== null) {
            $this->pmdSharedStore->exchangeArray(
                $this->pmdEmptyStore()
            );
        }

        $this->pmdSharedStore = null;
        $this->pmdSharedStoreKey = null;
    }

    private function pmdSharedStore(): ?\ArrayObject
    {
        if ($this->pmdSharedStore !== null) {
            return $this->pmdSharedStore;
        }

        $database = trim(
            (string)$this->connection->getDatabaseName()
        );

        if ($database === '') {
            return null;
        }

        $prefix = (string)$this->connection->getTablePrefix();
        $connectionName = method_exists($this->connection, 'getName')
            ? (string)$this->connection->getName()
            : 'mysql';

        $key =
            'pmd.perf.r17.schema-store.'
            .sha1($connectionName.'|'.$database.'|'.$prefix);

        $this->pmdSharedStoreKey = $key;

        try {
            if (function_exists('app') && app()->bound($key)) {
                $existing = app($key);

                if ($existing instanceof \ArrayObject) {
                    return $this->pmdSharedStore = $existing;
                }
            }

            $store = new \ArrayObject(
                $this->pmdEmptyStore()
            );

            if (function_exists('app')) {
                app()->instance($key, $store);
            }

            return $this->pmdSharedStore = $store;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function pmdEmptyStore(): array
    {
        return [
            'tables_loaded' => false,
            'tables_failed' => false,
            'tables' => [],
            'columns' => [],
        ];
    }

    private function pmdPhysicalTableName($table): string
    {
        $name = trim(
            (string)$table,
            " \t\n\r\0\x0B`"
        );

        if (strpos($name, '.') !== false) {
            $parts = explode('.', $name);
            $name = trim(
                (string)end($parts),
                "` "
            );
        }

        if ($name === '') {
            return '';
        }

        $prefix = (string)$this->connection->getTablePrefix();

        if (
            $prefix !== ''
            && strncmp($name, $prefix, strlen($prefix)) !== 0
        ) {
            return $prefix.$name;
        }

        return $name;
    }

    private function pmdTableKeys($table): array
    {
        $name = strtolower(
            trim((string)$table, " \t\n\r\0\x0B`")
        );

        if (strpos($name, '.') !== false) {
            $parts = explode('.', $name);
            $name = trim((string)end($parts), "` ");
        }

        if ($name === '') {
            return [];
        }

        $prefix = strtolower(
            (string)$this->connection->getTablePrefix()
        );

        $keys = [$name];

        if ($prefix !== '') {
            if (strncmp($name, $prefix, strlen($prefix)) === 0) {
                $logical = substr($name, strlen($prefix));

                if ($logical !== '') {
                    $keys[] = $logical;
                }
            } else {
                $keys[] = $prefix.$name;
            }
        }

        return array_values(array_unique($keys));
    }

    protected function build(Blueprint $blueprint)
    {
        $this->flushPmdMetadataCache();

        try {
            parent::build($blueprint);
        } finally {
            $this->flushPmdMetadataCache();
        }
    }

    public function dropAllTables()
    {
        $this->flushPmdMetadataCache();

        try {
            parent::dropAllTables();
        } finally {
            $this->flushPmdMetadataCache();
        }
    }

    public function createDatabase($name)
    {
        $this->flushPmdMetadataCache();

        try {
            return parent::createDatabase($name);
        } finally {
            $this->flushPmdMetadataCache();
        }
    }

    public function dropDatabaseIfExists($name)
    {
        $this->flushPmdMetadataCache();

        try {
            return parent::dropDatabaseIfExists($name);
        } finally {
            $this->flushPmdMetadataCache();
        }
    }
}
