<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use RuntimeException;

final class AiBudgetService
{
    public function consume(AiContext $context): void
    {
        $tenantKey = $context->tenantId
            ? 'id:'.$context->tenantId
            : 'host:'.sha1((string)$context->tenantDomain);

        $day = now($context->timezone)->format('Y-m-d');
        $dailyKey = 'pmd_ai:daily:'.$tenantKey.':'.$day;
        $dailyLimit = max(1, (int)config('pmd_ai.daily_request_budget_per_tenant', 250));
        $daily = (int)Cache::get($dailyKey, 0);
        if ($daily >= $dailyLimit) {
            throw new RuntimeException('PMD Intelligence daily tenant request budget reached.');
        }
        Cache::put($dailyKey, $daily + 1, now()->addDays(2));

        $userKey = 'pmd_ai:minute:'.$tenantKey.':user:'.((int)$context->userId).':'.now()->format('YmdHi');
        $perMinute = 12;
        $userCount = (int)Cache::get($userKey, 0);
        if ($userCount >= $perMinute) {
            throw new RuntimeException('PMD Intelligence rate limit reached. Try again shortly.');
        }
        Cache::put($userKey, $userCount + 1, now()->addMinutes(2));
    }
}
