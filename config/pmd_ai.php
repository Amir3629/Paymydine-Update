<?php

$providerEnv = env('PMD_AI_PROVIDER');
$provider = strtolower(trim((string)($providerEnv ?? '')));
$providerExplicit = $provider !== '';
$defaultModel = $provider === 'gemini'
    ? 'gemini-3.7-flash'
    : ($provider === 'openai' ? 'gpt-5.6-luna' : '');

$csv = static function ($value): array {
    return array_values(array_unique(array_filter(array_map(
        static fn ($entry) => strtolower(trim((string)$entry)),
        explode(',', (string)$value)
    ), static fn ($entry) => $entry !== '')));
};

return [
    'enabled' => (bool)env('PMD_AI_ENABLED', false),
    'provider' => $provider,
    'provider_explicit' => $providerExplicit,
    'require_explicit_provider' => filter_var(
        env('PMD_AI_REQUIRE_EXPLICIT_PROVIDER', true),
        FILTER_VALIDATE_BOOLEAN
    ),
    'model' => env('PMD_AI_MODEL', $defaultModel),

    'openai_api_key' => env('OPENAI_API_KEY'),
    'openai_base_url' => rtrim(
        env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        '/'
    ),

    'gemini_api_key' => env('GEMINI_API_KEY'),
    'gemini_base_url' => rtrim(
        env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com'),
        '/'
    ),
    'gemini_thinking_level' => env('PMD_AI_GEMINI_THINKING_LEVEL', 'low'),
    'gemini_force_ipv4' => filter_var(
        env('PMD_AI_GEMINI_FORCE_IPV4', true),
        FILTER_VALIDATE_BOOLEAN
    ),
    'gemini_transient_retries' => max(
        0,
        min(1, (int)env('PMD_AI_GEMINI_TRANSIENT_RETRIES', 1))
    ),
    'gemini_retry_delay_ms' => max(
        0,
        min(1500, (int)env('PMD_AI_GEMINI_RETRY_DELAY_MS', 350))
    ),

    'request_timeout_seconds' => (int)env('PMD_AI_TIMEOUT_SECONDS', 25),
    'max_output_tokens' => (int)env('PMD_AI_MAX_OUTPUT_TOKENS', 1400),
    'max_tool_calls' => (int)env('PMD_AI_MAX_TOOL_CALLS', 6),
    'daily_request_budget_per_tenant' => (int)env('PMD_AI_DAILY_REQUEST_BUDGET', 250),
    'global_requests_per_minute' => max(1, (int)env('PMD_AI_GLOBAL_REQUESTS_PER_MINUTE', 120)),
    'global_requests_per_day' => max(1, (int)env('PMD_AI_GLOBAL_REQUESTS_PER_DAY', 20000)),
    'audit_log_channel' => env('PMD_AI_AUDIT_LOG_CHANNEL', null),
    'store_provider_response' => false,
    'read_only' => true,

    // Admin rollout is fail-closed per tenant until tenant settings take over.
    // This prevents PMD_AI_ENABLED=true from silently enabling every restaurant.
    'admin_tenant_allowlist' => $csv(env('PMD_AI_ADMIN_TENANT_ALLOWLIST', '')),

    // Provider health/circuit breaker. Health is learned from real traffic so a
    // status page never burns provider quota merely to paint a green dot.
    'health_failure_threshold' => max(1, (int)env('PMD_AI_HEALTH_FAILURE_THRESHOLD', 3)),
    'health_transient_cooldown_seconds' => max(10, (int)env('PMD_AI_HEALTH_TRANSIENT_COOLDOWN_SECONDS', 45)),
    'health_quota_cooldown_seconds' => max(10, (int)env('PMD_AI_HEALTH_QUOTA_COOLDOWN_SECONDS', 60)),
    'health_hard_cooldown_seconds' => max(30, (int)env('PMD_AI_HEALTH_HARD_COOLDOWN_SECONDS', 300)),

    // Usage observability. These are warning thresholds, not billing prices.
    'usage_cache_days' => max(2, (int)env('PMD_AI_USAGE_CACHE_DAYS', 35)),
    'usage_retention_days' => max(30, min(3650, (int)env('PMD_AI_USAGE_RETENTION_DAYS', 400))),
    'usage_request_warning_per_tenant_day' => max(0, (int)env('PMD_AI_USAGE_REQUEST_WARNING_PER_TENANT_DAY', 220)),
    'usage_token_warning_per_tenant_day' => max(0, (int)env('PMD_AI_USAGE_TOKEN_WARNING_PER_TENANT_DAY', 0)),

    // Conversation retention remains tenant-local. Maintenance can be run by
    // cron with scripts/pmd-ai-maintenance.php without touching operational data.
    'admin_chat_retention_days' => max(1, (int)env('PMD_AI_ADMIN_CHAT_RETENTION_DAYS', 90)),
    'guest_chat_retention_days' => max(1, (int)env('PMD_AI_GUEST_CHAT_RETENTION_DAYS', 7)),

    // Public Guest AI is an independent fail-closed canary. The global PMD AI
    // switch alone can never expose the concierge. Tenant + location must both
    // be explicitly allowlisted. Wildcards stay disabled by default.
    'guest_enabled' => filter_var(env('PMD_AI_GUEST_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'guest_tenant_allowlist' => $csv(env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')),
    'guest_location_allowlist' => $csv(env('PMD_AI_GUEST_LOCATION_ALLOWLIST', '')),
    'guest_allow_wildcard' => filter_var(env('PMD_AI_GUEST_ALLOW_WILDCARD', false), FILTER_VALIDATE_BOOLEAN),
    'guest_model' => env('PMD_AI_GUEST_MODEL', env('PMD_AI_MODEL', $defaultModel)),
    'guest_max_question_chars' => max(
        1600,
        (int)env('PMD_AI_GUEST_MAX_QUESTION_CHARS', 1600)
    ),
    'guest_max_output_tokens' => (int)env('PMD_AI_GUEST_MAX_OUTPUT_TOKENS', 1400),
    'guest_max_answer_chars' => (int)env('PMD_AI_GUEST_MAX_ANSWER_CHARS', 3200),
    'guest_max_menu_items' => (int)env('PMD_AI_GUEST_MAX_MENU_ITEMS', 80),
    'guest_context_menu_items' => max(8, min(50, (int)env('PMD_AI_GUEST_CONTEXT_MENU_ITEMS', 28))),
    'guest_requests_per_minute' => (int)env('PMD_AI_GUEST_REQUESTS_PER_MINUTE', 6),
    'guest_daily_requests_per_ip' => (int)env('PMD_AI_GUEST_DAILY_REQUESTS_PER_IP', 60),
    'guest_daily_requests_per_visit' => max(1, (int)env('PMD_AI_GUEST_DAILY_REQUESTS_PER_VISIT', 40)),
    'guest_daily_requests_per_tenant' => (int)env('PMD_AI_GUEST_DAILY_REQUESTS_PER_TENANT', 250),
    'guest_prompt_guard_enabled' => filter_var(env('PMD_AI_GUEST_PROMPT_GUARD', true), FILTER_VALIDATE_BOOLEAN),
];
