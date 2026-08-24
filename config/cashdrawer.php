<?php

return [
    /*
     * Local POS hardware is the authoritative path whenever a drawer is paired
     * with a restaurant workstation. The VPS must never try to open that local
     * USB/Windows printer directly.
     */
    'local_agent_enabled' => filter_var(
        env('CASHDRAWER_LOCAL_AGENT_ENABLED', true),
        FILTER_VALIDATE_BOOLEAN
    ),

    /*
     * Legacy bootstrap token is kept only for backward compatibility with old
     * connector experiments. R1 pairing does NOT distribute or require this
     * shared secret: each POS uses its own random, one-time pairing token and
     * receives a per-device credential after successful pairing.
     */
    'agent_token' => trim((string)env('POS_AGENT_TOKEN', '')),

    'poll_interval_ms' => max(1000, (int)env('POS_AGENT_POLL_INTERVAL_MS', 2000)),

    /* Short expiry prevents a stale cash-payment command opening the drawer later. */
    'cash_open_expiry_seconds' => max(5, (int)env('CASHDRAWER_CASH_OPEN_EXPIRY_SECONDS', 20)),
    'command_expiry_seconds' => max(15, (int)env('CASHDRAWER_COMMAND_EXPIRY_SECONDS', 120)),

    /* Auto-open is only queued while the paired workstation heartbeat is fresh. */
    'cash_agent_fresh_seconds' => max(5, (int)env('CASHDRAWER_AGENT_FRESH_SECONDS', 15)),
];
