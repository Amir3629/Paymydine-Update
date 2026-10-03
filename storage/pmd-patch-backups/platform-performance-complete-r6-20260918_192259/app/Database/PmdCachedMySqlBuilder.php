<?php

namespace App\Database;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\MySqlBuilder;

/**
 * PMD_PERF_R6_1_SCHEMA_BUILDER_CACHE
 *
 * Request-local metadata cache for the active MySQL connection.
 * MySqlConnection instances are rebuilt per PHP request / tenant reconnect,
 * so this never crosses tenants or requests.
 */
class PmdCachedMySqlBuilder extends MySqlBuilder
{
    private array $pmdTableExists = [];
    private array $pmdColumns = [];

    public function hasTable($table)
    {
        $key = strtolower((string)$table);

        if (!array_key_exists($key, $this->pmdTableExists)) {
            $this->pmdTableExists[$key] = parent::hasTable($table);
        }

        return $this->pmdTableExists[$key];
    }

    public function getColumnListing($table)
    {
        $key = strtolower((string)$table);

        if (!array_key_exists($key, $this->pmdColumns)) {
            $this->pmdColumns[$key] = parent::getColumnListing($table);
        }

        return $this->pmdColumns[$key];
    }

    public function flushPmdMetadataCache(): void
    {
        $this->pmdTableExists = [];
        $this->pmdColumns = [];
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
