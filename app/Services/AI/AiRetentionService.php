<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Best-effort tenant-local AI retention cleanup.
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
            'usage_deleted' => $this->purgeUsage(),
        ];
    }

    public function purgeAdmin(): int
    {
        $days = max(1, min(3650, (int)config('pmd_ai.admin_chat_retention_days', 90)));
        return $this->purgeCreatedAtTable('pmd_admin_ai_conversations', $days);
    }

    public function purgeGuest(): int
    {
        $days = max(1, min(365, (int)config('pmd_ai.guest_chat_retention_days', 7)));
        return $this->purgeCreatedAtTable('pmd_guest_ai_conversations', $days);
    }

    public function purgeUsage(): int
    {
        $days = max(30, min(3650, (int)config('pmd_ai.usage_retention_days', 400)));
        try {
            if (!Schema::hasTable('pmd_ai_usage_daily')) return 0;
            $columns = Schema::getColumnListing('pmd_ai_usage_daily');
            if (!in_array('usage_date', $columns, true)) return 0;

            return (int)DB::table('pmd_ai_usage_daily')
                ->where('usage_date', '<', now()->subDays($days)->toDateString())
                ->delete();
        } catch (Throwable $error) {
            logger()->warning('PMD AI usage retention cleanup skipped', [
                'error_type' => get_class($error),
            ]);
            return 0;
        }
    }

    private function purgeCreatedAtTable(string $table, int $days): int
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
