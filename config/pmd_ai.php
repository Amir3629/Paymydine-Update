<?php

$provider = strtolower(trim((string)env('PMD_AI_PROVIDER', 'openai')));
$defaultModel = $provider === 'gemini'
    ? 'gemini-3.7-flash'
    : 'gpt-5.6-luna';

$csv = static function ($value): array {
    return array_values(array_unique(array_filter(array_map(
        static fn ($entry) => strtolower(trim((string)$entry)),
        explode(',', (string)$value)
    ), static fn ($entry) => $entry !== '')));
};

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
    'audit_log_channel' => env('PMD_AI_AUDIT_LOG_CHANNEL', null),
    'store_provider_response' => false,
    'read_only' => true,

    // Public Guest AI is an independent fail-closed canary. The global PMD AI
    // switch alone can never expose the concierge. Tenant + location must both
    // be explicitly allowlisted. Wildcards stay disabled by default.
    'guest_enabled' => filter_var(env('PMD_AI_GUEST_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'guest_tenant_allowlist' => $csv(env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')),
    'guest_location_allowlist' => $csv(env('PMD_AI_GUEST_LOCATION_ALLOWLIST', '')),
    'guest_allow_wildcard' => filter_var(env('PMD_AI_GUEST_ALLOW_WILDCARD', false), FILTER_VALIDATE_BOOLEAN),
    'guest_model' => env('PMD_AI_GUEST_MODEL', env('PMD_AI_MODEL', $defaultModel)),
    'guest_max_question_chars' => (int)env('PMD_AI_GUEST_MAX_QUESTION_CHARS', 600),
    // Gemini 3.x uses thinking before producing the visible answer. A very low
    // candidate budget can therefore end with MAX_TOKENS mid-sentence even for
    // a short menu reply. Keep enough headroom for a complete 35-110 word answer.
    'guest_max_output_tokens' => (int)env('PMD_AI_GUEST_MAX_OUTPUT_TOKENS', 1400),
    'guest_max_answer_chars' => (int)env('PMD_AI_GUEST_MAX_ANSWER_CHARS', 3200),
    'guest_max_menu_items' => (int)env('PMD_AI_GUEST_MAX_MENU_ITEMS', 80),
    'guest_requests_per_minute' => (int)env('PMD_AI_GUEST_REQUESTS_PER_MINUTE', 6),
    'guest_daily_requests_per_ip' => (int)env('PMD_AI_GUEST_DAILY_REQUESTS_PER_IP', 60),
    'guest_daily_requests_per_tenant' => (int)env('PMD_AI_GUEST_DAILY_REQUESTS_PER_TENANT', 250),
    'guest_prompt_guard_enabled' => filter_var(env('PMD_AI_GUEST_PROMPT_GUARD', true), FILTER_VALIDATE_BOOLEAN),
];
