<?php
return [
    'enabled' => (bool)env('PMD_RESTAURANT_GROUPS_ENABLED', true),
    'session_seconds' => (int)env('PMD_RESTAURANT_GROUP_SESSION_SECONDS', 43200),
    'max_publish_targets' => (int)env('PMD_RESTAURANT_GROUP_MAX_TARGETS', 20),
    'reporting_storage_timezone' => env('PMD_GROUPS_REPORTING_STORAGE_TIMEZONE'),
];
