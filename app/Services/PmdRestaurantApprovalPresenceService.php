<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * PMD_RESTAURANT_APPROVAL_PRESENCE_V1
 *
 * A short cache proof that an authorized PMD Owner/Cashier/Manager screen is
 * actively displaying the restaurant Workplace Code. This lets a remote Owner
 * (verified by personal TOTP) or an already-verified Manager act as the live
 * restaurant authority without turning that browser into a trusted hub.
 */
class PmdRestaurantApprovalPresenceService
{
    private const TTL_SECONDS = 45;

    public function touch(int $locationId): void
    {
        if ($locationId < 1) return;

        Cache::put(
            $this->key($locationId),
            time(),
            now()->addSeconds(self::TTL_SECONDS)
        );
    }

    public function recentlyVisible(int $locationId): bool
    {
        if ($locationId < 1) return false;

        $seenAt = (int)Cache::get($this->key($locationId), 0);
        return $seenAt > (time() - self::TTL_SECONDS);
    }

    private function key(int $locationId): string
    {
        return 'pmd:restaurant-approval:visible:'
            .$this->tenantKey().':'
            .$locationId;
    }

    private function tenantKey(): string
    {
        if (app()->bound('tenant')) {
            $tenant = app('tenant');
            $database = strtolower(trim((string)($tenant->database ?? '')));
            $domain = strtolower(trim((string)($tenant->domain ?? '')));
            if ($database !== '' || $domain !== '') {
                return hash('sha256', $database.'|'.$domain);
            }
        }

        try {
            return hash(
                'sha256',
                strtolower((string)DB::connection()->getDatabaseName())
            );
        } catch (\Throwable $error) {
            return hash(
                'sha256',
                strtolower((string)request()->getHost())
            );
        }
    }
}
