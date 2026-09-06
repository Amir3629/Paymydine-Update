<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Tenant-local AI rollout/policy overlay.
 *
 * Global environment variables remain the emergency kill switch and initial
 * canary fallback. Once a tenant has explicit `pmd_ai_*` settings, those settings
 * can control its entitlement and budgets without growing a server .env allowlist
 * for every restaurant.
 */
final class PmdAiTenantPolicyService
{
    public function adminEnabled(): bool
    {
        if (!(bool)config('pmd_ai.enabled', false)) return false;

        $value = $this->setting('pmd_ai_admin_enabled');
        if ($value !== null) {
            return $this->bool($value);
        }

        return $this->environmentTenantAllowlisted(
            (array)config('pmd_ai.admin_tenant_allowlist', [])
        );
    }

    public function guestTenantEnabled(): bool
    {
        if (!(bool)config('pmd_ai.enabled', false) || !(bool)config('pmd_ai.guest_enabled', false)) {
            return false;
        }

        $explicit = $this->setting('pmd_ai_guest_enabled');
        if ($explicit !== null) {
            return $this->bool($explicit);
        }

        return $this->environmentTenantAllowlisted(
            (array)config('pmd_ai.guest_tenant_allowlist', [])
        );
    }

    public function guestLocationEnabled(int $locationId): bool
    {
        if ($locationId < 1) return false;

        $explicit = $this->setting('pmd_ai_guest_location_allowlist');
        if ($explicit !== null) {
            $values = $this->csv($explicit);
            return in_array((string)$locationId, $values, true);
        }

        $allowlist = array_map('strval', (array)config('pmd_ai.guest_location_allowlist', []));
        if ((bool)config('pmd_ai.guest_allow_wildcard', false) && in_array('*', $allowlist, true)) {
            return true;
        }
        return in_array((string)$locationId, $allowlist, true);
    }

    public function adminDailyRequestBudget(int $fallback): int
    {
        return $this->boundedInt('pmd_ai_admin_daily_request_budget', $fallback, 1, 100000);
    }

    public function guestDailyRequestBudget(int $fallback): int
    {
        return $this->boundedInt('pmd_ai_guest_daily_request_budget', $fallback, 1, 100000);
    }

    public function guestVisitDailyRequestBudget(int $fallback): int
    {
        return $this->boundedInt('pmd_ai_guest_visit_daily_request_budget', $fallback, 1, 1000);
    }

    public function snapshot(): array
    {
        return [
            'admin_enabled' => $this->adminEnabled(),
            'guest_enabled' => $this->guestTenantEnabled(),
            'guest_locations' => $this->csv((string)($this->setting('pmd_ai_guest_location_allowlist') ?? '')),
            'admin_daily_request_budget' => $this->adminDailyRequestBudget(
                max(1, (int)config('pmd_ai.daily_request_budget_per_tenant', 250))
            ),
            'guest_daily_request_budget' => $this->guestDailyRequestBudget(
                max(1, (int)config('pmd_ai.guest_daily_requests_per_tenant', 250))
            ),
            'source' => $this->hasExplicitPolicy() ? 'tenant_settings' : 'server_canary_fallback',
        ];
    }

    public function hasExplicitPolicy(): bool
    {
        foreach ([
            'pmd_ai_admin_enabled',
            'pmd_ai_guest_enabled',
            'pmd_ai_guest_location_allowlist',
            'pmd_ai_admin_daily_request_budget',
            'pmd_ai_guest_daily_request_budget',
            'pmd_ai_guest_visit_daily_request_budget',
        ] as $key) {
            if ($this->setting($key) !== null) return true;
        }
        return false;
    }

    private function environmentTenantAllowlisted(array $configured): bool
    {
        $allowlist = array_values(array_unique(array_filter(array_map(
            static fn ($value) => strtolower(trim((string)$value)),
            $configured
        ))));
        if (!$allowlist) return false;

        // Wildcard remains supported only for the Guest canary config where the
        // separate guest_allow_wildcard flag is explicitly enabled. Admin has no
        // wildcard escape hatch and therefore stays fail-closed.
        if (
            (bool)config('pmd_ai.guest_allow_wildcard', false)
            && $configured === (array)config('pmd_ai.guest_tenant_allowlist', [])
            && in_array('*', $allowlist, true)
        ) {
            return true;
        }

        $database = strtolower($this->databaseName());
        $host = strtolower(trim((string)request()->getHost()));
        $subdomain = strtolower((string)strtok($host, '.'));
        foreach ([$database, $host, $subdomain] as $candidate) {
            if ($candidate !== '' && $candidate !== '*' && in_array($candidate, $allowlist, true)) {
                return true;
            }
        }
        return false;
    }

    private function setting(string $key): ?string
    {
        try {
            if (!Schema::hasTable('settings')) return null;
            $columns = array_map('strtolower', Schema::getColumnListing('settings'));
            if (!in_array('item', $columns, true) || !in_array('value', $columns, true)) return null;

            $query = DB::table('settings')->where('item', $key);
            if (in_array('setting_id', $columns, true)) $query->orderByDesc('setting_id');
            $row = $query->first(['value']);
            if (!$row) return null;
            return trim((string)($row->value ?? ''));
        } catch (Throwable $error) {
            return null;
        }
    }

    private function boundedInt(string $key, int $fallback, int $min, int $max): int
    {
        $value = $this->setting($key);
        if ($value === null || !is_numeric($value)) return max($min, min($max, $fallback));
        return max($min, min($max, (int)$value));
    }

    private function bool(string $value): bool
    {
        $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        return $parsed ?? false;
    }

    private function csv(string $value): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($entry) => strtolower(trim((string)$entry)),
            explode(',', $value)
        ), static fn ($entry) => $entry !== '')));
    }

    private function databaseName(): string
    {
        try {
            return (string)DB::connection()->getDatabaseName();
        } catch (Throwable $error) {
            return '';
        }
    }
}
