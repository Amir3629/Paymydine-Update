<?php

return [
    /*
     * Code may be deployed before the group schema is installed. The runtime
     * still stays dormant until pmd_group_schema exists and is current.
     */
    'enabled' => (bool)env('PMD_RESTAURANT_GROUPS_ENABLED', true),

    // Central owner password sessions require a fresh sign-in twice per day.
    'session_seconds' => (int)env('PMD_RESTAURANT_GROUP_SESSION_SECONDS', 43200),

    // Cross-tenant write fan-out is deliberately bounded.
    'max_publish_targets' => (int)env('PMD_RESTAURANT_GROUP_MAX_TARGETS', 20),
];
