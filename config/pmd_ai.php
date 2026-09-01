<?php

return [
    'enabled' => (bool)env('PMD_AI_ENABLED', false),
    'provider' => env('PMD_AI_PROVIDER', 'openai'),
    'model' => env('PMD_AI_MODEL', 'gpt-5.6-luna'),
    'openai_api_key' => env('OPENAI_API_KEY'),
    'openai_base_url' => rtrim(env('OPENAI_BASE_URL', 'https://api.openai.com/v1'), '/'),
    'request_timeout_seconds' => (int)env('PMD_AI_TIMEOUT_SECONDS', 25),
    'max_output_tokens' => (int)env('PMD_AI_MAX_OUTPUT_TOKENS', 1400),
    'max_tool_calls' => (int)env('PMD_AI_MAX_TOOL_CALLS', 6),
    'daily_request_budget_per_tenant' => (int)env('PMD_AI_DAILY_REQUEST_BUDGET', 250),
    'audit_log_channel' => env('PMD_AI_AUDIT_LOG_CHANNEL', null),
    'store_provider_response' => false,
    'read_only' => true,
];
