<?php

namespace App\Services\AI;

use Illuminate\Cache\RateLimiter;
use RuntimeException;

/**
 * Primary Guest AI abuse budget for a real table visit.
 *
 * Restaurant Wi-Fi often puts many guests behind one public IP, so IP limits
 * remain a secondary guard. This limit keys on the existing table + hashed
 * guest session and never stores the raw guest session identifier.
 */
final class GuestAiVisitBudgetService
{
    public function consume(int $locationId): void
    {
        $tableId = request()->input('table_id');
        $guestSessionId = trim((string)request()->input('guest_session_id', ''));

        if (!is_numeric($tableId) || (int)$tableId < 1 || mb_strlen($guestSessionId) < 8) {
            // Public non-persistent queries still use IP/tenant/global guards.
            return;
        }

        $hash = substr(hash('sha256', $guestSessionId), 0, 24);
        $key = implode(':', [
            'pmd', 'guest-ai', 'visit-day',
            max(1, $locationId),
            (int)$tableId,
            $hash,
            now('UTC')->format('Ymd'),
        ]);
        $configured = max(1, (int)config('pmd_ai.guest_daily_requests_per_visit', 40));
        $limit = app(PmdAiTenantPolicyService::class)->guestVisitDailyRequestBudget($configured);
        $limiter = app(RateLimiter::class);

        if ($limiter->tooManyAttempts($key, $limit)) {
            throw new RuntimeException('Guest menu AI rate limit reached.');
        }

        $limiter->hit($key, 86400);
    }
}
