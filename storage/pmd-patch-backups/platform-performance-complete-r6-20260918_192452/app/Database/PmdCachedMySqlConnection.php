<?php

namespace App\Database;

use Illuminate\Database\MySqlConnection;

/**
 * PMD_PERF_R6_1_CACHED_MYSQL_CONNECTION
 *
 * Laravel 8 creates a fresh MySqlBuilder on every getSchemaBuilder() call.
 * Keep one builder on this connection for the lifetime of the connection so
 * all Schema facade and direct getSchemaBuilder() calls share metadata.
 */
class PmdCachedMySqlConnection extends MySqlConnection
{
    private ?PmdCachedMySqlBuilder $pmdSchemaBuilder = null;

    public function getSchemaBuilder()
    {
        if (is_null($this->schemaGrammar)) {
            $this->useDefaultSchemaGrammar();
        }

        if ($this->pmdSchemaBuilder === null) {
            $this->pmdSchemaBuilder = new PmdCachedMySqlBuilder($this);
        }

        return $this->pmdSchemaBuilder;
    }
}
