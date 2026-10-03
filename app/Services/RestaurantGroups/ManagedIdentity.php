<?php

namespace App\Services\RestaurantGroups;

use Illuminate\Support\Facades\DB;

/** A storage error is not evidence that an identity is a legacy identity. */
final class ManagedIdentity
{
    public static function isManaged(int $userId): bool
    {
        if ($userId < 1) return false;
        $db = DB::connection('tenant');
        if (!$db->getSchemaBuilder()->hasTable('pmd_group_identity')) {
            return false;
        }
        return $db->table('pmd_group_identity')->where('user_id', $userId)->exists();
    }
}
