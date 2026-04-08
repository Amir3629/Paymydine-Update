<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Local POS Agent toggle
    |--------------------------------------------------------------------------
    |
    | When enabled, manual admin actions (test/open drawer) are queued for a
    | local POS agent instead of executing hardware drivers on the VPS.
    |
    */
    'local_agent_enabled' => env('CASHDRAWER_LOCAL_AGENT_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Shared token for local POS agent API access
    |--------------------------------------------------------------------------
    */
    'agent_token' => env('POS_AGENT_TOKEN'),
];

