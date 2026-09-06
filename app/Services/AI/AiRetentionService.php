<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Best-effort tenant-local AI chat retention cleanup.
 *
 * It never touches operational restaurant data. Missing tables/columns are a
 * no-op so mixed-version tenants can be upgraded safely.
 */
final class AiRetentionService
{
    public function purge(): array
    {
        return [
            'admin_deleted' => $this->purgeAdmin(),
            'guest_deleted' => $this->purgeGuest(),
        ];
    }

    public function purgeAdmin(): int
    {
        $days = max(1, min(3650, (int)config('pmd_ai.admin_chat_retention_days', 90)));
        return $this->purgeTable('pmd_admin_ai_conversations', $days);
    }

    public function purgeGuest(): int
    {
        $days = max(1, min(365, (int)config('pmd_ai.guest_chat_retention_days', 7)));
        return $this->purgeTable('pmd_guest_ai_conversations', $days);
    }

    private function purgeTable(string $table, int $days): int
    {
        try {
            if (!Schema::hasTable($table)) return 0;
            $columns = Schema::getColumnListing($table);
            if (!in_array('created_at', $columns, true)) return 0;

            return (int)DB::table($table)
                ->where('created_at', '<', now()->subDays($days))
                ->delete();
        } catch (Throwable $error) {
            logger()->warning('PMD AI retention cleanup skipped', [
                'table' => $table,
                'error_type' => get_class($error),
            ]);
            return 0;
        }
    }
}
