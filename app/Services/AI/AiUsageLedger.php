<?php

namespace App\Services\AI;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Provider-agnostic AI usage accounting.
 *
 * Usage is persisted tenant-locally for pricing/capacity analysis and mirrored
 * to cache for cheap warnings/operational reads. No raw prompt, answer, guest
 * identity, API key or provider payload is stored in this ledger.
 */
final class AiUsageLedger
{
    private const TABLE = 'pmd_ai_usage_daily';

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
        } catch (Throwable $error) {
            $day = now('UTC')->format('Y-m-d');
        }

        $normalized = $this->normalizeUsage($usage);
        $key = 'pmd_ai:usage:'.$scope.':'.$day.':'.$surface;
        $state = Cache::get($key, []);
        if (!is_array($state)) $state = [];

        $state = $this->incrementState(
            $state,
            $normalized,
            $latencyMs,
            $providerCalls,
            $ok,
            $provider,
            $model,
            $surface
        );

        Cache::put($key, $state, now()->addDays(max(2, (int)config('pmd_ai.usage_cache_days', 35))));

        $this->persist(
            $context,
            $day,
            $surface,
            $provider,
            $model,
            $normalized,
            $latencyMs,
            $providerCalls,
            $ok
        );
        $this->incrementGlobal($day, $surface, $normalized, $latencyMs, $providerCalls, $ok, $provider, $model);
        $this->enforceSoftWarnings($state, $scope, $day, $surface);
    }

    public function snapshot(?AiContext $context = null, ?string $day = null): array
    {
        if (!$day) {
            try {
                $day = now($context && trim($context->timezone) !== '' ? $context->timezone : 'UTC')->format('Y-m-d');
            } catch (Throwable $error) {
                $day = now('UTC')->format('Y-m-d');
            }
        }

        $persistent = $this->persistentSnapshot($day);
        if ($persistent) return $persistent;

        $scope = $context ? $this->contextScope($context) : $this->runtimeScope();
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

    private function persist(
        ?AiContext $context,
        string $day,
        string $surface,
        string $provider,
        string $model,
        array $usage,
        int $latencyMs,
        int $providerCalls,
        bool $ok
    ): void {
        try {
            if (!$this->ensureTable()) return;

            $locationId = $context && $context->locationId
                ? (int)$context->locationId
                : (is_numeric(request()->input('location_id')) ? (int)request()->input('location_id') : 0);
            $provider = mb_substr(strtolower(trim($provider)), 0, 32);
            $model = mb_substr(trim($model), 0, 120);

            DB::transaction(function () use (
                $day,
                $surface,
                $provider,
                $model,
                $locationId,
                $usage,
                $latencyMs,
                $providerCalls,
                $ok
            ): void {
                $query = DB::table(self::TABLE)
                    ->where('usage_date', $day)
                    ->where('surface', $surface)
                    ->where('provider', $provider)
                    ->where('model', $model)
                    ->where('location_id', $locationId);

                $row = (clone $query)->lockForUpdate()->first();
                $delta = [
                    'requests' => 1,
                    'successful_requests' => $ok ? 1 : 0,
                    'failed_requests' => $ok ? 0 : 1,
                    'provider_calls' => max(0, $providerCalls),
                    'input_tokens' => (int)$usage['input_tokens'],
                    'output_tokens' => (int)$usage['output_tokens'],
                    'thinking_tokens' => (int)$usage['thinking_tokens'],
                    'total_tokens' => (int)$usage['total_tokens'],
                    'latency_ms' => max(0, $latencyMs),
                ];

                if ($row) {
                    $updates = ['updated_at' => now()];
                    foreach ($delta as $column => $value) {
                        $updates[$column] = DB::raw('`'.$column.'` + '.max(0, (int)$value));
                    }
                    $query->update($updates);
                    return;
                }

                DB::table(self::TABLE)->insert(array_merge([
                    'usage_date' => $day,
                    'location_id' => $locationId,
                    'surface' => $surface,
                    'provider' => $provider,
                    'model' => $model,
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $delta));
            });
        } catch (Throwable $error) {
            // Accounting must never break restaurant AI traffic.
            logger()->warning('PMD AI usage persistence skipped', [
                'error_type' => get_class($error),
                'surface' => $surface,
            ]);
        }
    }

    private function persistentSnapshot(string $day): array
    {
        try {
            if (!Schema::hasTable(self::TABLE)) return [];
            $rows = DB::table(self::TABLE)
                ->where('usage_date', $day)
                ->selectRaw('surface, SUM(requests) AS requests, SUM(successful_requests) AS successful_requests, SUM(failed_requests) AS failed_requests, SUM(provider_calls) AS provider_calls, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens, SUM(thinking_tokens) AS thinking_tokens, SUM(total_tokens) AS total_tokens, SUM(latency_ms) AS latency_ms')
                ->groupBy('surface')
                ->get();

            $out = [];
            foreach ($rows as $row) {
                $surface = $this->surface((string)$row->surface);
                $out[$surface] = [
                    'requests' => (int)$row->requests,
                    'successful_requests' => (int)$row->successful_requests,
                    'failed_requests' => (int)$row->failed_requests,
                    'provider_calls' => (int)$row->provider_calls,
                    'input_tokens' => (int)$row->input_tokens,
                    'output_tokens' => (int)$row->output_tokens,
                    'thinking_tokens' => (int)$row->thinking_tokens,
                    'total_tokens' => (int)$row->total_tokens,
                    'latency_ms' => (int)$row->latency_ms,
                    'source' => 'tenant_usage_ledger',
                ];
            }
            return $out;
        } catch (Throwable $error) {
            return [];
        }
    }

    private function ensureTable(): bool
    {
        if (Schema::hasTable(self::TABLE)) return true;

        try {
            Schema::create(self::TABLE, function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->date('usage_date');
                $table->unsignedBigInteger('location_id')->default(0);
                $table->string('surface', 20);
                $table->string('provider', 32);
                $table->string('model', 120);
                $table->unsignedBigInteger('requests')->default(0);
                $table->unsignedBigInteger('successful_requests')->default(0);
                $table->unsignedBigInteger('failed_requests')->default(0);
                $table->unsignedBigInteger('provider_calls')->default(0);
                $table->unsignedBigInteger('input_tokens')->default(0);
                $table->unsignedBigInteger('output_tokens')->default(0);
                $table->unsignedBigInteger('thinking_tokens')->default(0);
                $table->unsignedBigInteger('total_tokens')->default(0);
                $table->unsignedBigInteger('latency_ms')->default(0);
                $table->timestamps();
                $table->unique(
                    ['usage_date', 'location_id', 'surface', 'provider', 'model'],
                    'pmd_ai_usage_daily_scope_uq'
                );
                $table->index(['usage_date', 'surface'], 'pmd_ai_usage_daily_day_surface_idx');
            });
        } catch (Throwable $error) {
            if (!Schema::hasTable(self::TABLE)) return false;
        }

        return Schema::hasTable(self::TABLE);
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
        $state = $this->incrementState(
            $state,
            $usage,
            $latencyMs,
            $providerCalls,
            $ok,
            $provider,
            $model,
            $surface
        );
        Cache::put($key, $state, now()->addDays(max(2, (int)config('pmd_ai.usage_cache_days', 35))));
    }

    private function incrementState(
        array $state,
        array $usage,
        int $latencyMs,
        int $providerCalls,
        bool $ok,
        string $provider,
        string $model,
        string $surface
    ): array {
        $state['requests'] = (int)($state['requests'] ?? 0) + 1;
        $state['successful_requests'] = (int)($state['successful_requests'] ?? 0) + ($ok ? 1 : 0);
        $state['failed_requests'] = (int)($state['failed_requests'] ?? 0) + ($ok ? 0 : 1);
        $state['provider_calls'] = (int)($state['provider_calls'] ?? 0) + max(0, $providerCalls);
        foreach (['input_tokens', 'output_tokens', 'thinking_tokens', 'total_tokens'] as $name) {
            $state[$name] = (int)($state[$name] ?? 0) + (int)$usage[$name];
        }
        $state['latency_ms'] = (int)($state['latency_ms'] ?? 0) + max(0, $latencyMs);
        $state['provider'] = strtolower(trim($provider));
        $state['model'] = trim($model);
        $state['surface'] = $surface;
        $state['updated_at'] = now()->toIso8601String();
        return $state;
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
            $db = (string)DB::connection()->getDatabaseName();
        } catch (Throwable $error) {
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
