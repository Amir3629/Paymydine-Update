<?php

namespace App\Services\RestaurantGroups;

use Illuminate\Support\Facades\DB;

/**
 * Request-local classification of tenant shadow identities.
 *
 * AdminAuth::check() can run many times while one Admin page is rendered.
 * Never repeat INFORMATION_SCHEMA/table lookups for the same user in the same
 * PHP request. Static state is request-scoped under PHP-FPM and is not a
 * cross-request authorization cache.
 */
final class ManagedIdentity
{
    private static array $managed = [];
    private static ?bool $tableAvailable = null;

    public static function isManaged(int $userId): bool
    {
        if ($userId < 1) {
            return false;
        }

        if (array_key_exists($userId, self::$managed)) {
            return self::$managed[$userId];
        }

        $db = DB::connection('tenant');

        if (self::$tableAvailable === null) {
            self::$tableAvailable = $db->getSchemaBuilder()->hasTable('pmd_group_identity');
        }

        if (!self::$tableAvailable) {
            return self::$managed[$userId] = false;
        }

        return self::$managed[$userId] = $db->table('pmd_group_identity')
            ->where('user_id', $userId)
            ->exists();
    }

    public static function forget(?int $userId = null): void
    {
        if ($userId === null) {
            self::$managed = [];
            self::$tableAvailable = null;
            return;
        }

        unset(self::$managed[$userId]);
    }
}
