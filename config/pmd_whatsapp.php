<?php

// R30 central WhatsApp webhook. Disabled until an operator configures a
// dedicated HTTPS callback host, installs central tables and sets Meta secrets.
return [
    'enabled' => filter_var(env('PMD_WA_WEBHOOK_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'webhook_host' => strtolower(trim((string)env('PMD_WA_WEBHOOK_HOST', ''))),
    'verify_token' => (string)env('PMD_WA_VERIFY_TOKEN', ''),
    'app_secret' => (string)env('PMD_WA_APP_SECRET', ''),
    'max_body_bytes' => 131072,
    // R31 shared sender: one Meta App and PayMyDine-operated system user.
    // Each restaurant STILL owns/authorizes its WhatsApp business number.
    // No restaurant token or endpoint is entered in the owner-facing page.
    'managed_enabled' => filter_var(env('PMD_WA_MANAGED_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'system_user_token' => (string)env('PMD_WA_SYSTEM_USER_TOKEN', ''),
    'graph_version' => (string)env('PMD_WA_GRAPH_VERSION', 'v25.0'),
    'template_language' => (string)env('PMD_WA_TEMPLATE_LANGUAGE', 'en_US'),
    'templates' => [
        'created' => (string)env('PMD_WA_TEMPLATE_CREATED', ''),
        'updated' => (string)env('PMD_WA_TEMPLATE_UPDATED', ''),
        'canceled' => (string)env('PMD_WA_TEMPLATE_CANCELED', ''),
    ],
    // R33: one PayMyDine-owned business sender for all authorized tenants.
    // Both flags remain FALSE until the official Meta account and callback
    // are configured and the booking opt-in is explicitly enabled.
    'shared_enabled' => filter_var(env('PMD_WA_SHARED_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'shared_consent_form_enabled' => filter_var(env('PMD_WA_SHARED_CONSENT_FORM', false), FILTER_VALIDATE_BOOLEAN),
    // Explicit operator assertion; these locale variants must ALREADY be
    // approved in PayMyDine's Meta WABA. Empty by default: no shared sends.
    'shared_approved_template_locales' => trim((string)env('PMD_WA_SHARED_APPROVED_TEMPLATE_LOCALES', '')),
    // Quick reply buttons must exist on EVERY approved shared booking template
    // at positions 0 and 1 before enabling this. Kept OFF until Meta approval.
    'shared_quick_reply_enabled' => filter_var(env('PMD_WA_SHARED_QUICK_REPLIES', false), FILTER_VALIDATE_BOOLEAN),
    'retention_days' => 90,
];
