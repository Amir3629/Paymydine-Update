<?php

$provider = strtolower(trim((string)env('PMD_AI_PROVIDER', 'openai')));
$defaultModel = $provider === 'gemini'
    ? 'gemini-3.7-flash'
    : 'gpt-5.6-luna';
$guestTenantAllowlist = array_values(array_filter(array_map(
    static fn ($value) => trim((string)$value),
    explode(',', (string)env('PMD_AI_GUEST_TENANT_ALLOWLIST', ''))
)));

return [
    'enabled' => (bool)env('PMD_AI_ENABLED', false),
    'provider' => $provider,
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

    'request_timeout_seconds' => (int)env('PMD_AI_TIMEOUT_SECONDS', 25),
    'max_output_tokens' => (int)env('PMD_AI_MAX_OUTPUT_TOKENS', 1400),
    'max_tool_calls' => (int)env('PMD_AI_MAX_TOOL_CALLS', 6),
    'daily_request_budget_per_tenant' => (int)env('PMD_AI_DAILY_REQUEST_BUDGET', 250),

    // Customer-facing Digital Menu concierge. It is fail-closed twice:
    // the feature flag must be on AND the current tenant must be allowlisted.
    'guest_enabled' => filter_var(
        env('PMD_AI_GUEST_ENABLED', false),
        FILTER_VALIDATE_BOOLEAN
    ),
    'guest_tenant_allowlist' => $guestTenantAllowlist,
    'guest_model' => env('PMD_AI_GUEST_MODEL', env('PMD_AI_MODEL', $defaultModel)),
    'guest_max_question_chars' => (int)env('PMD_AI_GUEST_MAX_QUESTION_CHARS', 800),
    'guest_max_output_tokens' => (int)env('PMD_AI_GUEST_MAX_OUTPUT_TOKENS', 500),
    'guest_max_menu_items' => (int)env('PMD_AI_GUEST_MAX_MENU_ITEMS', 60),
    'guest_requests_per_minute' => (int)env('PMD_AI_GUEST_REQUESTS_PER_MINUTE', 8),
    'guest_daily_requests_per_tenant' => (int)env('PMD_AI_GUEST_DAILY_REQUESTS', 500),

    'audit_log_channel' => env('PMD_AI_AUDIT_LOG_CHANNEL', null),
    'store_provider_response' => false,
    'read_only' => true,
];
