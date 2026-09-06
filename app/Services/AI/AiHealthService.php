<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Throwable;

/**
 * Provider health memory and circuit breaker shared by every PMD AI surface.
 *
 * This deliberately does not make a paid health request on every page load.
 * Real provider calls feed success/failure state into this service and a short
 * circuit stops a broken credential/quota/provider from being hammered by every
 * restaurant request.
 */
final class AiHealthService
{
    public function assertCanAttempt(string $provider, string $model): void
    {
        $provider = $this->normalize($provider);
        $model = trim($model);

        if (!(bool)config('pmd_ai.enabled', false)) {
            throw new RuntimeException('PMD Intelligence is disabled on the server.');
        }

        if ((bool)config('pmd_ai.require_explicit_provider', true)
            && !(bool)config('pmd_ai.provider_explicit', false)) {
            throw new RuntimeException('PMD AI provider configuration is missing.');
        }

        if (!in_array($provider, ['gemini', 'openai'], true)) {
            throw new RuntimeException('Unsupported PMD AI provider.');
        }

        if ($model === '') {
            throw new RuntimeException('PMD AI model configuration is missing.');
        }

        $keyPresent = $provider === 'gemini'
            ? trim((string)config('pmd_ai.gemini_api_key', '')) !== ''
            : trim((string)config('pmd_ai.openai_api_key', '')) !== '';

        if (!$keyPresent) {
            throw new RuntimeException(strtoupper($provider).' API key is not configured on the server.');
        }

        $state = $this->state($provider, $model);
        $openUntil = (int)($state['circuit_open_until'] ?? 0);
        if ($openUntil > time()) {
            throw new RuntimeException('AI provider transport failed: health circuit is temporarily open.');
        }
    }

    public function markSuccess(string $provider, string $model, int $latencyMs = 0): void
    {
        $provider = $this->normalize($provider);
        $model = trim($model);
        $state = $this->state($provider, $model);

        $state['provider'] = $provider;
        $state['model'] = $model;
        $state['healthy'] = true;
        $state['failure_count'] = 0;
        $state['last_success_at'] = now()->toIso8601String();
        $state['last_latency_ms'] = max(0, $latencyMs);
        $state['last_error_class'] = null;
        $state['last_failure_at'] = $state['last_failure_at'] ?? null;
        $state['circuit_open_until'] = 0;

        Cache::put($this->key($provider, $model), $state, now()->addDays(2));
    }

    public function markFailure(string $provider, string $model, Throwable $error): array
    {
        $provider = $this->normalize($provider);
        $model = trim($model);
        $state = $this->state($provider, $model);
        $class = $this->classify($error);
        $failures = max(0, (int)($state['failure_count'] ?? 0)) + 1;

        $threshold = max(1, (int)config('pmd_ai.health_failure_threshold', 3));
        $hard = in_array($class, [
            'authentication', 'account_state', 'project_suspended',
            'configuration', 'model',
        ], true);
        $quota = in_array($class, ['quota', 'rate_limit'], true);

        $cooldown = 0;
        if ($hard) {
            $cooldown = max(30, (int)config('pmd_ai.health_hard_cooldown_seconds', 300));
        } elseif ($quota) {
            $cooldown = max(10, (int)config('pmd_ai.health_quota_cooldown_seconds', 60));
        } elseif ($failures >= $threshold) {
            $cooldown = max(10, (int)config('pmd_ai.health_transient_cooldown_seconds', 45));
        }

        $state['provider'] = $provider;
        $state['model'] = $model;
        $state['healthy'] = false;
        $state['failure_count'] = $failures;
        $state['last_failure_at'] = now()->toIso8601String();
        $state['last_error_class'] = $class;
        $state['circuit_open_until'] = $cooldown > 0 ? time() + $cooldown : 0;

        Cache::put($this->key($provider, $model), $state, now()->addDays(2));

        return $state;
    }

    public function status(?string $provider = null, ?string $model = null): array
    {
        $provider = $this->normalize($provider ?: (string)config('pmd_ai.provider', ''));
        $model = trim((string)($model ?: config('pmd_ai.model', '')));
        $state = $this->state($provider, $model);
        $openUntil = (int)($state['circuit_open_until'] ?? 0);

        return [
            'configured' => $this->configured($provider, $model),
            'provider' => $provider,
            'model' => $model,
            'healthy' => array_key_exists('healthy', $state) ? (bool)$state['healthy'] : null,
            'available_for_traffic' => $openUntil <= time(),
            'last_success_at' => $state['last_success_at'] ?? null,
            'last_failure_at' => $state['last_failure_at'] ?? null,
            'last_error_class' => $state['last_error_class'] ?? null,
            'failure_count' => (int)($state['failure_count'] ?? 0),
            'circuit_open_until' => $openUntil > time() ? date(DATE_ATOM, $openUntil) : null,
            'last_latency_ms' => isset($state['last_latency_ms']) ? (int)$state['last_latency_ms'] : null,
        ];
    }

    public function configured(string $provider, string $model): bool
    {
        if (!(bool)config('pmd_ai.enabled', false)) return false;
        if ((bool)config('pmd_ai.require_explicit_provider', true)
            && !(bool)config('pmd_ai.provider_explicit', false)) return false;
        if (!in_array($provider, ['gemini', 'openai'], true) || trim($model) === '') return false;

        return $provider === 'gemini'
            ? trim((string)config('pmd_ai.gemini_api_key', '')) !== ''
            : trim((string)config('pmd_ai.openai_api_key', '')) !== '';
    }

    public function classify(Throwable $error): string
    {
        $text = mb_strtolower($error->getMessage());

        if (str_contains($text, 'consumer') && str_contains($text, 'suspend')) return 'project_suspended';
        if (str_contains($text, 'bound service account') || str_contains($text, 'account_state_invalid')) return 'account_state';
        if (str_contains($text, 'api key') || str_contains($text, 'api_key')
            || str_contains($text, 'unauthenticated') || str_contains($text, 'authentication')) return 'authentication';
        if (str_contains($text, 'resource_exhausted') || str_contains($text, 'quota')) return 'quota';
        if (str_contains($text, 'rate limit') || str_contains($text, 'too many requests')) return 'rate_limit';
        if (str_contains($text, 'transport failed') || str_contains($text, 'timed out') || str_contains($text, 'timeout')) return 'transport';
        if (str_contains($text, 'model') && (str_contains($text, 'not found') || str_contains($text, 'unsupported') || str_contains($text, 'unavailable'))) return 'model';
        if (str_contains($text, 'configuration is missing') || str_contains($text, 'not configured')) return 'configuration';
        if (str_contains($text, 'temporarily unavailable') || str_contains($text, 'high demand')) return 'transient';

        return 'provider';
    }

    private function state(string $provider, string $model): array
    {
        $state = Cache::get($this->key($provider, $model), []);
        return is_array($state) ? $state : [];
    }

    private function key(string $provider, string $model): string
    {
        return 'pmd_ai:health:'.$this->normalize($provider).':'.substr(hash('sha256', trim($model)), 0, 16);
    }

    private function normalize(string $provider): string
    {
        return strtolower(trim($provider));
    }
}
