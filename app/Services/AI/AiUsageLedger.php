<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;

/**
 * Lightweight, provider-agnostic usage accounting.
 *
 * This is intentionally cache-backed first so rollout does not require a tenant
 * migration. It records per-tenant/day/surface totals for capacity, cost and
 * abuse monitoring while preserving zero raw prompts or provider payloads.
 */
final class AiUsageLedger
{
    public function record(
        ?AiContext $context,
        string $surface,
        string $provider,
        string $model,
        array $usage,
        int $latencyMs = 0,
        int $providerCalls = 1,
        bool $ok = true
    ): void {
        $surface = $this->surface($surface);
        $scope = $context ? $this->contextScope($context) : $this->runtimeScope();
        $timezone = $context && trim($context->timezone) !== '' ? $context->timezone : 'UTC';

        try {
            $day = now($timezone)->format('Y-m-d');
        } catch (\Throwable $error) {
            $day = now('UTC')->format('Y-m-d');
        }

        $normalized = $this->normalizeUsage($usage);
        $key = 'pmd_ai:usage:'.$scope.':'.$day.':'.$surface;
        $state = Cache::get($key, []);
        if (!is_array($state)) $state = [];

        $state['requests'] = (int)($state['requests'] ?? 0) + 1;
        $state['successful_requests'] = (int)($state['successful_requests'] ?? 0) + ($ok ? 1 : 0);
        $state['failed_requests'] = (int)($state['failed_requests'] ?? 0) + ($ok ? 0 : 1);
        $state['provider_calls'] = (int)($state['provider_calls'] ?? 0) + max(0, $providerCalls);
        $state['input_tokens'] = (int)($state['input_tokens'] ?? 0) + $normalized['input_tokens'];
        $state['output_tokens'] = (int)($state['output_tokens'] ?? 0) + $normalized['output_tokens'];
        $state['thinking_tokens'] = (int)($state['thinking_tokens'] ?? 0) + $normalized['thinking_tokens'];
        $state['total_tokens'] = (int)($state['total_tokens'] ?? 0) + $normalized['total_tokens'];
        $state['latency_ms'] = (int)($state['latency_ms'] ?? 0) + max(0, $latencyMs);
        $state['provider'] = strtolower(trim($provider));
        $state['model'] = trim($model);
        $state['surface'] = $surface;
        $state['updated_at'] = now()->toIso8601String();

        Cache::put($key, $state, now()->addDays(max(2, (int)config('pmd_ai.usage_cache_days', 35))));

        $this->incrementGlobal($day, $surface, $normalized, $latencyMs, $providerCalls, $ok, $provider, $model);
        $this->enforceSoftWarnings($state, $scope, $day, $surface);
    }

    public function snapshot(?AiContext $context = null, ?string $day = null): array
    {
        $scope = $context ? $this->contextScope($context) : $this->runtimeScope();
        if (!$day) {
            try {
                $day = now($context && trim($context->timezone) !== '' ? $context->timezone : 'UTC')->format('Y-m-d');
            } catch (\Throwable $error) {
                $day = now('UTC')->format('Y-m-d');
            }
        }

        $out = [];
        foreach (['admin', 'guest', 'other'] as $surface) {
            $state = Cache::get('pmd_ai:usage:'.$scope.':'.$day.':'.$surface, []);
            if (is_array($state) && $state) $out[$surface] = $state;
        }
        return $out;
    }

    public function normalizeUsage(array $usage): array
    {
        $input = $this->firstInt($usage, [
            'input_tokens', 'prompt_token_count', 'promptTokenCount',
            'inputTokenCount', 'input_token_count',
        ]);
        $output = $this->firstInt($usage, [
            'output_tokens', 'candidates_token_count', 'candidatesTokenCount',
            'outputTokenCount', 'output_token_count',
        ]);
        $thinking = $this->firstInt($usage, [
            'thoughts_token_count', 'thoughtsTokenCount', 'thinking_tokens',
        ]);
        $total = $this->firstInt($usage, [
            'total_tokens', 'total_token_count', 'totalTokenCount',
        ]);

        if ($total < 1) $total = max(0, $input + $output + $thinking);

        return [
            'input_tokens' => max(0, $input),
            'output_tokens' => max(0, $output),
            'thinking_tokens' => max(0, $thinking),
            'total_tokens' => max(0, $total),
        ];
    }

    private function incrementGlobal(
        string $day,
        string $surface,
        array $usage,
        int $latencyMs,
        int $providerCalls,
        bool $ok,
        string $provider,
        string $model
    ): void {
        $key = 'pmd_ai:usage:global:'.$day.':'.$surface;
        $state = Cache::get($key, []);
        if (!is_array($state)) $state = [];
        foreach (['input_tokens', 'output_tokens', 'thinking_tokens', 'total_tokens'] as $name) {
            $state[$name] = (int)($state[$name] ?? 0) + (int)$usage[$name];
        }
        $state['requests'] = (int)($state['requests'] ?? 0) + 1;
        $state['successful_requests'] = (int)($state['successful_requests'] ?? 0) + ($ok ? 1 : 0);
        $state['failed_requests'] = (int)($state['failed_requests'] ?? 0) + ($ok ? 0 : 1);
        $state['provider_calls'] = (int)($state['provider_calls'] ?? 0) + max(0, $providerCalls);
        $state['latency_ms'] = (int)($state['latency_ms'] ?? 0) + max(0, $latencyMs);
        $state['provider'] = strtolower(trim($provider));
        $state['model'] = trim($model);
        $state['surface'] = $surface;
        $state['updated_at'] = now()->toIso8601String();
        Cache::put($key, $state, now()->addDays(max(2, (int)config('pmd_ai.usage_cache_days', 35))));
    }

    private function enforceSoftWarnings(array $state, string $scope, string $day, string $surface): void
    {
        $requestWarn = max(0, (int)config('pmd_ai.usage_request_warning_per_tenant_day', 0));
        $tokenWarn = max(0, (int)config('pmd_ai.usage_token_warning_per_tenant_day', 0));
        if (($requestWarn > 0 && (int)($state['requests'] ?? 0) >= $requestWarn)
            || ($tokenWarn > 0 && (int)($state['total_tokens'] ?? 0) >= $tokenWarn)) {
            $once = 'pmd_ai:usage:warned:'.$scope.':'.$day.':'.$surface;
            if (!Cache::has($once)) {
                Cache::put($once, true, now()->addDays(2));
                logger()->warning('PMD AI tenant usage threshold reached', [
                    'scope_hash' => substr(hash('sha256', $scope), 0, 16),
                    'day' => $day,
                    'surface' => $surface,
                    'requests' => (int)($state['requests'] ?? 0),
                    'total_tokens' => (int)($state['total_tokens'] ?? 0),
                ]);
            }
        }
    }

    private function contextScope(AiContext $context): string
    {
        if ($context->tenantId) return 'tenant:'.$context->tenantId;
        return 'host:'.substr(hash('sha256', (string)$context->tenantDomain), 0, 20);
    }

    private function runtimeScope(): string
    {
        try {
            $db = (string)\Illuminate\Support\Facades\DB::connection()->getDatabaseName();
        } catch (\Throwable $error) {
            $db = request()->getHost();
        }
        return 'runtime:'.substr(hash('sha256', $db), 0, 20);
    }

    private function firstInt(array $usage, array $keys): int
    {
        foreach ($keys as $key) {
            if (isset($usage[$key]) && is_numeric($usage[$key])) return (int)$usage[$key];
        }
        return 0;
    }

    private function surface(string $surface): string
    {
        $surface = strtolower(trim($surface));
        return in_array($surface, ['admin', 'guest'], true) ? $surface : 'other';
    }
}
