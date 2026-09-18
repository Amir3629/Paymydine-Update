<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * PMD_PERF_R6_REQUEST_SCHEMA_CACHE
 *
 * Laravel's Schema facade normally forwards every hasTable/hasColumn/
 * getColumnListing call to MySQL. The Admin workspaces ask the same metadata
 * questions from several controllers/services during one HTTP request, which
 * produced >100 information_schema queries on Orders/Cashier.
 *
 * This proxy is bound to db.schema only for Admin HTTP requests. It keeps
 * metadata for the lifetime of that request and always resolves the underlying
 * builder from the CURRENT default connection, so the tenant switch performed
 * by TenantDatabaseMiddleware remains authoritative.
 *
 * Unknown operations are forwarded to the real schema builder. Mutating schema
 * operations invalidate the request cache before and after execution.
 */
class PmdRequestSchemaCache
{
    private array $tableExists = [];
    private array $columns = [];
    private array $columnTypes = [];

    public function hasTable($table): bool
    {
        $key = $this->namespaceKey().'|table|'.strtolower((string)$table);

        if (!array_key_exists($key, $this->tableExists)) {
            $this->tableExists[$key] = (bool)$this->builder()->hasTable($table);
        }

        return $this->tableExists[$key];
    }

    public function getColumnListing($table): array
    {
        $key = $this->namespaceKey().'|columns|'.strtolower((string)$table);

        if (!array_key_exists($key, $this->columns)) {
            $this->columns[$key] = array_values(
                (array)$this->builder()->getColumnListing($table)
            );
        }

        return $this->columns[$key];
    }

    public function hasColumn($table, $column): bool
    {
        $needle = strtolower((string)$column);

        foreach ($this->getColumnListing($table) as $candidate) {
            if (strtolower((string)$candidate) === $needle) {
                return true;
            }
        }

        return false;
    }

    public function hasColumns($table, array $columns): bool
    {
        $available = array_map(
            static fn($column) => strtolower((string)$column),
            $this->getColumnListing($table)
        );

        foreach ($columns as $column) {
            if (!in_array(strtolower((string)$column), $available, true)) {
                return false;
            }
        }

        return true;
    }

    public function getColumnType($table, $column)
    {
        $key = $this->namespaceKey()
            .'|type|'.strtolower((string)$table)
            .'|'.strtolower((string)$column);

        if (!array_key_exists($key, $this->columnTypes)) {
            $this->columnTypes[$key] = $this->builder()->getColumnType(
                $table,
                $column
            );
        }

        return $this->columnTypes[$key];
    }

    public function clear(): void
    {
        $this->tableExists = [];
        $this->columns = [];
        $this->columnTypes = [];
    }

    public function __call(string $method, array $arguments)
    {
        $mutates = in_array(
            $method,
            ['create', 'table', 'rename', 'drop', 'dropIfExists', 'dropAllTables', 'dropAllViews'],
            true
        ) || strncmp($method, 'drop', 4) === 0;

        if ($mutates) {
            $this->clear();
        }

        $result = $this->builder()->{$method}(...$arguments);

        if ($mutates) {
            $this->clear();
        }

        return $result;
    }

    private function builder()
    {
        return DB::connection()->getSchemaBuilder();
    }

    private function namespaceKey(): string
    {
        $connection = DB::connection();
        $name = (string)DB::getDefaultConnection();
        $database = '';

        try {
            if (method_exists($connection, 'getDatabaseName')) {
                $database = (string)$connection->getDatabaseName();
            }
        } catch (\Throwable $ignored) {
        }

        return $name
            .'|'.$database
            .'|'.spl_object_id($connection);
    }
}
