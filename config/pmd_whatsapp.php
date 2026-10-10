<?php

// R30 central WhatsApp webhook. Disabled until an operator configures a
// dedicated HTTPS callback host, installs central tables and sets Meta secrets.
return [
    'enabled' => filter_var(env('PMD_WA_WEBHOOK_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'webhook_host' => strtolower(trim((string)env('PMD_WA_WEBHOOK_HOST', ''))),
    'verify_token' => (string)env('PMD_WA_VERIFY_TOKEN', ''),
    'app_secret' => (string)env('PMD_WA_APP_SECRET', ''),
    'max_body_bytes' => 131072,
    'retention_days' => 90,
];
