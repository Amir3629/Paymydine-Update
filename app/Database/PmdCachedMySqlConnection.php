<?php

namespace App\Database;

use Igniter\Flame\Database\Connections\MySqlConnection;

/**
 * PMD_PERF_R6_1_CACHED_MYSQL_CONNECTION
 *
 * TastyIgniter's Flame MySqlConnection provides the custom query builder
 * required by Flame relations (including flushDuplicateCache()). Extend that
 * connection, not Laravel's raw MySqlConnection, while reusing one cached
 * schema builder for the lifetime of this tenant/request connection.
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
