<?php

$provider = strtolower(trim((string)env('PMD_AI_PROVIDER', 'openai')));
$defaultModel = $provider === 'gemini'
    ? 'gemini-3.7-flash'
    : 'gpt-5.6-luna';

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

    'request_timeout_seconds' => (int)env('PMD_AI_TIMEOUT_SECONDS', 25),
    'max_output_tokens' => (int)env('PMD_AI_MAX_OUTPUT_TOKENS', 1400),
    'max_tool_calls' => (int)env('PMD_AI_MAX_TOOL_CALLS', 6),
    'daily_request_budget_per_tenant' => (int)env('PMD_AI_DAILY_REQUEST_BUDGET', 250),
    'audit_log_channel' => env('PMD_AI_AUDIT_LOG_CHANNEL', null),
    'store_provider_response' => false,
    'read_only' => true,
];
