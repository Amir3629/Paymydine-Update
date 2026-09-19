<?php

namespace App\Database;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\MySqlBuilder;

/**
 * PMD_PERF_R16_SCHEMA_CATALOG
 *
 * Request-local schema catalogue for the active tenant MySQL database.
 *
 * Older revisions cached hasTable()/getColumnListing() only on one builder
 * instance. PayMyDine can rebuild/resolve more than one connection/schema
 * builder during a single Admin request, so the same information_schema
 * probes still appeared 20+ times on hot pages.
 *
 * R16 loads all BASE TABLE columns once for the current database and shares
 * that immutable catalogue through the request container. Both logical names
 * ("orders") and prefixed physical names ("ti_orders") resolve from the same
 * map. No schema state crosses requests or tenants.
 */
class PmdCachedMySqlBuilder extends MySqlBuilder
{
    private array $pmdTableExists = [];
    private array $pmdColumns = [];
    private bool $pmdCatalogLoaded = false;
    private ?array $pmdCatalog = null;
    private ?string $pmdCatalogCacheKey = null;

    public function hasTable($table)
    {
        $keys = $this->pmdTableKeys($table);
        $catalog = $this->pmdSchemaCatalog();

        if ($catalog !== null) {
            foreach ($keys as $key) {
                if (isset($catalog['tables'][$key])) {
                    return true;
                }
            }

            return false;
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
        $catalog = $this->pmdSchemaCatalog();

        if ($catalog !== null) {
            foreach ($keys as $key) {
                if (array_key_exists($key, $catalog['columns'])) {
                    return $catalog['columns'][$key];
                }
            }

            return [];
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
        $this->pmdCatalogLoaded = false;
        $this->pmdCatalog = null;

        if (
            $this->pmdCatalogCacheKey
            && function_exists('app')
        ) {
            try {
                $container = app();

                if (method_exists($container, 'forgetInstance')) {
                    $container->forgetInstance(
                        $this->pmdCatalogCacheKey
                    );
                }
            } catch (\Throwable $e) {
                // DDL invalidation is best effort; local cache is already clear.
            }
        }

        $this->pmdCatalogCacheKey = null;
    }

    /**
     * @return array{tables: array<string,bool>, columns: array<string,array<int,string>>}|null
     */
    private function pmdSchemaCatalog(): ?array
    {
        if ($this->pmdCatalogLoaded) {
            return $this->pmdCatalog;
        }

        $this->pmdCatalogLoaded = true;

        $database = trim(
            (string)$this->connection->getDatabaseName()
        );

        if ($database === '') {
            return $this->pmdCatalog = null;
        }

        $prefix = (string)$this->connection->getTablePrefix();
        $connectionName = method_exists($this->connection, 'getName')
            ? (string)$this->connection->getName()
            : 'mysql';

        $cacheKey =
            'pmd.perf.r16.schema-catalog.'
            .sha1($connectionName.'|'.$database.'|'.$prefix);

        $this->pmdCatalogCacheKey = $cacheKey;

        try {
            if (
                function_exists('app')
                && app()->bound($cacheKey)
            ) {
                $cached = app($cacheKey);

                if (is_array($cached)) {
                    return $this->pmdCatalog = $cached;
                }
            }
        } catch (\Throwable $e) {
            // Fall through to a direct one-shot catalogue query.
        }

        try {
            $rows = $this->connection->select(
                'SELECT c.TABLE_NAME AS pmd_table, c.COLUMN_NAME AS pmd_column '
                .'FROM information_schema.COLUMNS c '
                .'INNER JOIN information_schema.TABLES t '
                .'ON t.TABLE_SCHEMA = c.TABLE_SCHEMA '
                .'AND t.TABLE_NAME = c.TABLE_NAME '
                .'WHERE c.TABLE_SCHEMA = ? '
                ."AND t.TABLE_TYPE = 'BASE TABLE' "
                .'ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION',
                [$database]
            );

            $tables = [];
            $columns = [];

            foreach ($rows as $row) {
                $table = strtolower(
                    trim((string)($row->pmd_table ?? ''))
                );
                $column = trim(
                    (string)($row->pmd_column ?? '')
                );

                if ($table === '' || $column === '') {
                    continue;
                }

                $keys = [$table];

                if (
                    $prefix !== ''
                    && strncmp($table, strtolower($prefix), strlen($prefix)) === 0
                ) {
                    $logical = substr($table, strlen($prefix));

                    if ($logical !== '') {
                        $keys[] = $logical;
                    }
                }

                foreach (array_unique($keys) as $key) {
                    $tables[$key] = true;

                    if (!isset($columns[$key])) {
                        $columns[$key] = [];
                    }

                    $columns[$key][] = $column;
                }
            }

            $catalog = [
                'tables' => $tables,
                'columns' => $columns,
            ];

            try {
                if (function_exists('app')) {
                    app()->instance($cacheKey, $catalog);
                }
            } catch (\Throwable $e) {
                // Local builder cache still provides the same request safety.
            }

            return $this->pmdCatalog = $catalog;
        } catch (\Throwable $e) {
            return $this->pmdCatalog = null;
        }
    }

    /**
     * Return physical and logical lookup aliases for one table name.
     *
     * @return array<int,string>
     */
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
        /*
         * Schema mutation must never leave stale metadata in the same request.
         * Flush before and after the actual DDL.
         */
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
